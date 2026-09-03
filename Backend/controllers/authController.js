import crypto from "node:crypto";

import User from "../models/User.js";
import Account from "../models/Account.js";

import {
  hashPassword,
  comparePassword,
} from "../utils/password.js";

import { signToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";

import {
  issueOtp,
  verifyOtp,
} from "../services/otpService.js";

import {
  recordAudit,
  recordSecurityEvent,
} from "../services/auditService.js";

import { upsertDevice } from "../services/deviceService.js";

import {
  createSession,
  newJti,
  revokeSession,
  revokeSessionById,
  revokeAllOtherSessions,
  listUserSessions,
} from "../services/sessionService.js";

import {
  createNotification,
} from "../services/notificationService.js";

import {
  ok,
  created,
} from "../middleware/response.js";

import {
  AUDIT_ACTIONS,
  SECURITY_EVENTS,
  ROLES,
  NOTIFICATION_PRIORITY,
} from "../utils/enums.js";

/* =========================================================
   PASSWORD RESET TOKENS
   ========================================================= */

/*
 * Password reset tokens are intentionally kept in memory to
 * remain consistent with the existing in-memory OTP service.
 *
 * Token lifetime: 10 minutes.
 *
 * Map:
 * resetToken -> {
 *   userId,
 *   expiresAt
 * }
 */
const passwordResetTokens = new Map();

const PASSWORD_RESET_TOKEN_TTL_MS =
  10 * 60 * 1000;

/* =========================================================
   PUBLIC USER
   ========================================================= */

const publicUser = (user) => ({
  id: user._id || user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  accountNumber: user.accountNumber,
  securityScore: user.securityScore,
  blocked: user.blocked,
  lastLoginAt: user.lastLoginAt,

  /*
   * Support both the old field and the current schema field.
   */
  profilePhoto:
    user.profilePhotoUrl ||
    user.profilePhoto ||
    "",

  profilePhotoUrl:
    user.profilePhotoUrl ||
    user.profilePhoto ||
    "",

  address: user.address || null,
  preferences:
    user.preferences || null,

  createdAt: user.createdAt,
});

/* =========================================================
   NOTIFICATION HELPER
   ========================================================= */

async function notifyUser({
  user,
  type,
  title,
  body,
  priority =
    NOTIFICATION_PRIORITY.INFO,
  meta = {},
  dedupeKey,
}) {
  try {
    await createNotification({
      user,
      type,
      title,
      body,
      priority,
      meta,
      dedupeKey,
    });
  } catch (error) {
    /*
     * Notification failure must never break authentication
     * or another important account operation.
     */
    console.error(
      JSON.stringify({
        event:
          "AUTH_NOTIFICATION_FAILED",
        type,
        message:
          error?.message,
      })
    );
  }
}

/* =========================================================
   ACCOUNT NUMBER
   ========================================================= */

async function generateUniqueAccountNumber() {
  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    const suffix =
      crypto
        .randomInt(
          10_000_000,
          100_000_000
        )
        .toString();

    const candidate =
      `4829${suffix}`;

    const exists =
      await User.exists({
        accountNumber:
          candidate,
      });

    if (!exists) {
      return candidate;
    }
  }

  throw new AppError(
    "Could not allocate an account number. Please retry.",
    "ACCOUNT_NUMBER_ALLOCATION_FAILED",
    500
  );
}

/* =========================================================
   REGISTER
   ========================================================= */

export async function register(
  req,
  res,
  next
) {
  try {
    const {
      name,
      email,
      phone,
      password,
    } = req.body;

    if (
      await User.exists({
        email,
      })
    ) {
      throw new AppError(
        "An account with this email already exists.",
        "EMAIL_ALREADY_EXISTS",
        409
      );
    }

    const accountNumber =
      await generateUniqueAccountNumber();

    const user =
      await User.create({
        name,
        email,
        phone,
        passwordHash:
          await hashPassword(
            password
          ),
        accountNumber,
        role: ROLES.CUSTOMER,
      });

    await Account.create({
      user: user._id,
      accountNumber,
      label:
        "Primary Savings",
      ifsc: "NEXB0000001",
      branch:
        "NexusBank — Bengaluru Central",
      balancePaise: 66766000,
      availableBalancePaise:
        66766000,
      isPrimary: true,
    });

    await recordAudit({
      actor: user._id,
      targetUser: user._id,
      action:
        AUDIT_ACTIONS.USER_REGISTERED,
      requestId:
        req.requestId,
      ipAddress: req.ip,
    });

    await notifyUser({
      user: user._id,
      type:
        "ACCOUNT_CREATED",
      title:
        "Welcome to NexusBank",
      body:
        "Your NexusBank account has been created successfully.",
      priority:
        NOTIFICATION_PRIORITY.SUCCESS,
      meta: {
        accountNumber,
      },
      dedupeKey:
        `user:${user._id}:account-created`,
    });

    return created(
      res,
      {
        user:
          publicUser(user),
      },
      "Registration completed."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   LOGIN
   ========================================================= */

export async function login(
  req,
  res,
  next
) {
  try {
    const {
      email,
      password,
      deviceIdentifier,
      browser,
      operatingSystem,
    } = req.body;

    const user =
      await User.findOne({
        email,
      }).select(
        "+passwordHash"
      );

    const isMatch = user
      ? await comparePassword(
          password,
          user.passwordHash
        )
      : false;

    /* -------------------------------------------------------
       FAILED LOGIN
       ------------------------------------------------------- */

    if (!user || !isMatch) {
      if (user) {
        user.failedLoginAttempts += 1;
        user.lastFailedLoginAt =
          new Date();

        await user.save();

        await recordSecurityEvent({
          user: user._id,
          eventType:
            SECURITY_EVENTS.LOGIN_FAILED,
          device:
            deviceIdentifier,
          ipAddress: req.ip,
        });

        await notifyUser({
          user: user._id,
          type:
            "LOGIN_FAILED",
          title:
            "Failed sign-in attempt",
          body:
            "A sign-in attempt using incorrect credentials was detected on your NexusBank account.",
          priority:
            NOTIFICATION_PRIORITY.WARNING,
          meta: {
            deviceIdentifier:
              deviceIdentifier ||
              null,
            ipAddress:
              req.ip,
          },
          dedupeKey:
            `login-failed:${user._id}:${new Date().toISOString().slice(0, 13)}`,
        });
      }

      throw new AppError(
        "Email or password is incorrect.",
        "INVALID_CREDENTIALS",
        401
      );
    }

    if (user.blocked) {
      throw new AppError(
        "This account is blocked.",
        "ACCOUNT_BLOCKED",
        403
      );
    }

    user.failedLoginAttempts = 0;

    await user.save();

    await upsertDevice({
      userId: user._id,
      deviceIdentifier,
      browser,
      operatingSystem,
    });

    const otpResult =
      await issueOtp({
        purpose: "LOGIN",
        subjectId: user._id,
        email: user.email,
        name: user.name,
        enforceCooldown:
          false,
      });

    await recordSecurityEvent({
      user: user._id,
      eventType:
        SECURITY_EVENTS.OTP_ISSUED,
      device:
        deviceIdentifier,
      ipAddress: req.ip,
    });

    return ok(
      res,
      {
        requiresOtp: true,
        userId: user._id,
        expiresInSeconds:
          otpResult.expiresInSeconds,
        resendAvailableInSeconds:
          otpResult.resendAvailableInSeconds,
        demoOtp:
          otpResult.demoOtp,
        maskedEmail:
          maskEmail(user.email),
      },
      "OTP sent to your email. Please verify to complete sign-in."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   RESEND LOGIN OTP
   ========================================================= */

export async function resendLoginOtp(
  req,
  res,
  next
) {
  try {
    const {
      userId,
    } = req.body;

    if (!userId) {
      throw new AppError(
        "userId is required.",
        "VALIDATION_ERROR",
        400
      );
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      throw new AppError(
        "User not found.",
        "RESOURCE_NOT_FOUND",
        404
      );
    }

    if (user.blocked) {
      throw new AppError(
        "This account is blocked.",
        "ACCOUNT_BLOCKED",
        403
      );
    }

    const otpResult =
      await issueOtp({
        purpose: "LOGIN",
        subjectId: user._id,
        email: user.email,
        name: user.name,
        enforceCooldown:
          true,
      });

    await recordSecurityEvent({
      user: user._id,
      eventType:
        SECURITY_EVENTS.OTP_ISSUED,
      ipAddress: req.ip,
      metadata: {
        reason: "resend",
      },
    });

    return ok(
      res,
      {
        expiresInSeconds:
          otpResult.expiresInSeconds,
        resendAvailableInSeconds:
          otpResult.resendAvailableInSeconds,
        demoOtp:
          otpResult.demoOtp,
        maskedEmail:
          maskEmail(user.email),
      },
      "A fresh OTP has been sent."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   VERIFY LOGIN OTP
   ========================================================= */

export async function verifyLoginOtp(
  req,
  res,
  next
) {
  try {
    const {
      userId,
      otp,
      deviceIdentifier,
    } = req.body;

    const result =
      verifyOtp({
        purpose: "LOGIN",
        subjectId: userId,
        otp,
      });

    if (!result.valid) {
      await recordSecurityEvent({
        user: userId,
        eventType:
          SECURITY_EVENTS.OTP_FAILED,
        device:
          deviceIdentifier,
        ipAddress: req.ip,
        metadata: {
          code:
            result.code,
        },
      });

      await notifyUser({
        user: userId,
        type:
          "OTP_FAILED",
        title:
          "Security verification failed",
        body:
          "An incorrect or expired OTP was entered during sign-in.",
        priority:
          NOTIFICATION_PRIORITY.WARNING,
        meta: {
          deviceIdentifier:
            deviceIdentifier ||
            null,
        },
      });

      throw new AppError(
        "The OTP is invalid or expired.",
        result.code ||
          "OTP_INVALID",
        401
      );
    }

    const user =
      await User.findByIdAndUpdate(
        userId,
        {
          lastLoginAt:
            new Date(),
        },
        {
          new: true,
        }
      );

    if (!user) {
      throw new AppError(
        "User not found.",
        "RESOURCE_NOT_FOUND",
        404
      );
    }

    if (user.blocked) {
      throw new AppError(
        "This account is blocked.",
        "ACCOUNT_BLOCKED",
        403
      );
    }

    const jti = newJti();

    await createSession({
      jti,
      userId:
        user._id,
      deviceIdentifier,
      browser:
        req.header(
          "x-client-browser"
        ) || null,
      operatingSystem:
        req.header(
          "x-client-os"
        ) || null,
      ipAddress:
        req.ip,
    });

    await recordSecurityEvent({
      user: user._id,
      eventType:
        SECURITY_EVENTS.OTP_VERIFIED,
      device:
        deviceIdentifier,
      ipAddress:
        req.ip,
    });

    await recordSecurityEvent({
      user: user._id,
      eventType:
        SECURITY_EVENTS.LOGIN,
      device:
        deviceIdentifier,
      ipAddress:
        req.ip,
    });

    await recordAudit({
      actor: user._id,
      targetUser: user._id,
      action:
        AUDIT_ACTIONS.USER_LOGIN,
      requestId:
        req.requestId,
      ipAddress:
        req.ip,
    });

    await notifyUser({
      user: user._id,
      type:
        "LOGIN_SUCCESS",
      title:
        "New sign-in detected",
      body:
        "Your NexusBank account was successfully signed in from a verified device.",
      priority:
        NOTIFICATION_PRIORITY.SUCCESS,
      meta: {
        deviceIdentifier:
          deviceIdentifier ||
          null,
        ipAddress:
          req.ip,
      },
    });

    const token =
      signToken({
        userId:
          user._id.toString(),
        role:
          user.role,
        name:
          user.name,
        jti,
      });

    return ok(
      res,
      {
        token,
        user:
          publicUser(user),
      },
      "Authentication successful."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

/**
 * POST /api/auth/forgot-password
 *
 * Starts the password reset flow.
 */
export async function forgotPassword(
  req,
  res,
  next
) {
  try {
    const email =
      req.body.email
        .trim()
        .toLowerCase();

    const user =
      await User.findOne({
        email,
      });

    /*
     * Keep the response generic when the account does not exist.
     */
    if (!user) {
      return ok(res, {
        accepted: true,
        exists: false,
        message:
          "If an account exists for this email, a verification code has been issued.",
      });
    }

    if (user.blocked) {
      throw new AppError(
        "This account is blocked.",
        "ACCOUNT_BLOCKED",
        403
      );
    }

    const otpResult =
      await issueOtp({
        purpose:
          "PASSWORD_RESET",

        subjectId:
          user._id,

        email:
          user.email,

        name:
          user.name,

        enforceCooldown:
          true,
      });

    return ok(
      res,
      {
        accepted: true,

        exists: true,

        userId:
          String(user._id),

        maskedEmail:
          maskEmail(
            user.email
          ),

        expiresInSeconds:
          otpResult.expiresInSeconds,

        resendAvailableInSeconds:
          otpResult.resendAvailableInSeconds,

        demoOtp:
          otpResult.demoOtp,
      },
      "Verification code sent."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   VERIFY PASSWORD RESET OTP
   ========================================================= */

/**
 * POST /api/auth/verify-password-reset-otp
 */
export async function verifyPasswordResetOtp(
  req,
  res,
  next
) {
  try {
    const {
      userId,
      otp,
    } = req.body;

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      throw new AppError(
        "Invalid password reset request.",
        "PASSWORD_RESET_INVALID",
        400
      );
    }

    if (user.blocked) {
      throw new AppError(
        "This account is blocked.",
        "ACCOUNT_BLOCKED",
        403
      );
    }

    const result =
      verifyOtp({
        purpose:
          "PASSWORD_RESET",

        subjectId:
          userId,

        otp,
      });

    if (!result.valid) {
      const messages = {
        OTP_NOT_ISSUED:
          "No password reset code was issued. Please request a new code.",

        OTP_EXPIRED:
          "Your verification code has expired. Please request a new code.",

        OTP_ATTEMPTS_EXCEEDED:
          "Too many incorrect attempts. Please request a new code.",

        OTP_INVALID:
          "The verification code is incorrect.",
      };

      throw new AppError(
        messages[result.code] ||
          "Invalid verification code.",
        result.code ||
          "OTP_INVALID",
        400
      );
    }

    /*
     * OTP has now been verified.
     *
     * Generate a short-lived reset token so that the password
     * cannot be changed without completing OTP verification.
     */
    const resetToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    passwordResetTokens.set(
      resetToken,
      {
        userId:
          String(user._id),

        expiresAt:
          Date.now() +
          PASSWORD_RESET_TOKEN_TTL_MS,
      }
    );

    return ok(
      res,
      {
        verified: true,

        resetToken,

        expiresInSeconds:
          PASSWORD_RESET_TOKEN_TTL_MS /
          1000,
      },
      "Identity verified. You can now create a new password."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   RESET PASSWORD
   ========================================================= */

/**
 * POST /api/auth/reset-password
 */
export async function resetPassword(
  req,
  res,
  next
) {
  try {
    const {
      userId,
      resetToken,
      newPassword,
    } = req.body;

    if (
      !resetToken ||
      !userId ||
      !newPassword
    ) {
      throw new AppError(
        "Password reset details are incomplete.",
        "VALIDATION_ERROR",
        400
      );
    }

    const resetEntry =
      passwordResetTokens.get(
        resetToken
      );

    if (
      !resetEntry ||
      resetEntry.userId !==
        String(userId)
    ) {
      throw new AppError(
        "Password reset session is invalid or expired.",
        "PASSWORD_RESET_TOKEN_INVALID",
        400
      );
    }

    if (
      resetEntry.expiresAt <
      Date.now()
    ) {
      passwordResetTokens.delete(
        resetToken
      );

      throw new AppError(
        "Password reset session has expired. Please start again.",
        "PASSWORD_RESET_TOKEN_EXPIRED",
        400
      );
    }

    const user =
      await User.findById(
        userId
      ).select(
        "+passwordHash"
      );

    if (!user) {
      throw new AppError(
        "User account not found.",
        "RESOURCE_NOT_FOUND",
        404
      );
    }

    if (user.blocked) {
      throw new AppError(
        "This account is blocked.",
        "ACCOUNT_BLOCKED",
        403
      );
    }

    /*
     * IMPORTANT:
     *
     * NexusBank stores the hashed password in passwordHash.
     * Do NOT assign to user.password.
     */
    user.passwordHash =
      await hashPassword(
        newPassword
      );

    /*
     * Reset failed-login state as well because the user has
     * successfully regained control of the account.
     */
    user.failedLoginAttempts = 0;

    await user.save();

    /*
     * One-time reset token.
     */
    passwordResetTokens.delete(
      resetToken
    );

    /*
     * Revoke all active sessions so the newly reset credential
     * becomes the only valid authentication path.
     */
    try {
      await revokeAllOtherSessions({
        userId:
          user._id,
        currentJti:
          null,
      });
    } catch (sessionError) {
      /*
       * Session cleanup must not make an otherwise successful
       * password reset fail.
       */
      console.error(
        JSON.stringify({
          event:
            "PASSWORD_RESET_SESSION_REVOKE_FAILED",
          user:
            String(user._id),
          message:
            sessionError?.message,
        })
      );
    }

    await recordSecurityEvent({
      user:
        user._id,
      eventType:
        SECURITY_EVENTS.PASSWORD_CHANGED,
      ipAddress:
        req.ip,
      metadata: {
        source:
          "PASSWORD_RESET",
      },
    });

    await recordAudit({
      actor:
        user._id,
      targetUser:
        user._id,
      action:
        AUDIT_ACTIONS.PASSWORD_CHANGED,
      metadata: {
        source:
          "PASSWORD_RESET",
      },
      requestId:
        req.requestId,
      ipAddress:
        req.ip,
    });

    await notifyUser({
      user:
        user._id,
      type:
        "PASSWORD_CHANGED",
      title:
        "Password reset successful",
      body:
        "Your NexusBank password was reset successfully. Please sign in again with your new password.",
      priority:
        NOTIFICATION_PRIORITY.SUCCESS,
      meta: {
        source:
          "PASSWORD_RESET",
      },
    });

    return ok(
      res,
      {
        reset: true,
      },
      "Password reset successfully."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

export async function logout(
  req,
  res,
  next
) {
  try {
    if (req.user?.jti) {
      await revokeSession({
        jti:
          req.user.jti,
        userId:
          req.user.userId,
      });
    }

    await recordSecurityEvent({
      user:
        req.user.userId,
      eventType:
        SECURITY_EVENTS.LOGOUT,
      ipAddress:
        req.ip,
    });

    await recordAudit({
      actor:
        req.user.userId,
      targetUser:
        req.user.userId,
      action:
        AUDIT_ACTIONS.USER_LOGOUT,
      requestId:
        req.requestId,
      ipAddress:
        req.ip,
    });

    await notifyUser({
      user:
        req.user.userId,
      type:
        "LOGOUT",
      title:
        "Signed out",
      body:
        "Your NexusBank session was signed out successfully.",
      priority:
        NOTIFICATION_PRIORITY.INFO,
    });

    return ok(
      res,
      null,
      "You have been signed out."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   ME
   ========================================================= */

export async function me(
  req,
  res,
  next
) {
  try {
    const user =
      await User.findById(
        req.user.userId
      ).lean();

    if (!user) {
      throw new AppError(
        "User not found.",
        "RESOURCE_NOT_FOUND",
        404
      );
    }

    return ok(res, {
      user:
        publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   CHANGE PASSWORD
   ========================================================= */

export async function changePassword(
  req,
  res,
  next
) {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    const user =
      await User.findById(
        req.user.userId
      ).select(
        "+passwordHash"
      );

    if (!user) {
      throw new AppError(
        "User not found.",
        "RESOURCE_NOT_FOUND",
        404
      );
    }

    const isMatch =
      await comparePassword(
        currentPassword,
        user.passwordHash
      );

    if (!isMatch) {
      throw new AppError(
        "Current password is incorrect.",
        "INVALID_CREDENTIALS",
        401
      );
    }

    user.passwordHash =
      await hashPassword(
        newPassword
      );

    await user.save();

    await revokeAllOtherSessions({
      userId:
        user._id,
      currentJti:
        req.user.jti,
    });

    await recordSecurityEvent({
      user:
        user._id,
      eventType:
        SECURITY_EVENTS.PASSWORD_CHANGED,
      ipAddress:
        req.ip,
    });

    await recordAudit({
      actor:
        user._id,
      targetUser:
        user._id,
      action:
        AUDIT_ACTIONS.PASSWORD_CHANGED,
      requestId:
        req.requestId,
      ipAddress:
        req.ip,
    });

    await notifyUser({
      user:
        user._id,
      type:
        "PASSWORD_CHANGED",
      title:
        "Password changed",
      body:
        "Your NexusBank password was changed successfully. Other active sessions were signed out.",
      priority:
        NOTIFICATION_PRIORITY.SUCCESS,
    });

    return ok(
      res,
      null,
      "Password updated. Other devices have been signed out."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   UPDATE PROFILE
   ========================================================= */

export async function updateProfile(
  req,
  res,
  next
) {
  try {
    const {
      name,
      phone,
      address,
    } = req.body;

    const $set = {};

    if (name !== undefined) {
      $set.name = name;
    }

    if (phone !== undefined) {
      $set.phone = phone;
    }

    if (address !== undefined) {
      const current =
        (
          await User.findById(
            req.user.userId
          )
            .select("address")
            .lean()
        )?.address || {};

      $set.address = {
        ...current,
        ...address,
      };
    }

    const user =
      await User.findByIdAndUpdate(
        req.user.userId,
        {
          $set,
        },
        {
          new: true,
          runValidators:
            true,
        }
      ).lean();

    if (!user) {
      throw new AppError(
        "User not found.",
        "RESOURCE_NOT_FOUND",
        404
      );
    }

    await recordAudit({
      actor:
        req.user.userId,
      targetUser:
        req.user.userId,
      action:
        "PROFILE_UPDATED",
      metadata: {
        fields:
          Object.keys($set),
      },
      requestId:
        req.requestId,
      ipAddress:
        req.ip,
    });

    await notifyUser({
      user:
        req.user.userId,
      type:
        "PROFILE_UPDATED",
      title:
        "Profile updated",
      body:
        "Your NexusBank personal information was updated successfully.",
      priority:
        NOTIFICATION_PRIORITY.SUCCESS,
      meta: {
        fields:
          Object.keys($set),
      },
    });

    return ok(
      res,
      {
        user:
          publicUser(user),
      },
      "Profile updated."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   PROFILE PHOTO
   ========================================================= */

export async function updateProfilePhoto(
  req,
  res,
  next
) {
  try {
    if (!req.file) {
      throw new AppError(
        "Please select a profile image.",
        "PROFILE_PHOTO_REQUIRED",
        400
      );
    }

    const photoUrl =
      `/uploads/profile/${req.file.filename}`;

    const user =
      await User.findByIdAndUpdate(
        req.user.userId,
        {
          $set: {
            profilePhoto:
              photoUrl,

            profilePhotoUrl:
              photoUrl,
          },
        },
        {
          new: true,
          runValidators:
            true,
        }
      ).lean();

    if (!user) {
      throw new AppError(
        "User not found.",
        "RESOURCE_NOT_FOUND",
        404
      );
    }

    await recordAudit({
      actor:
        req.user.userId,
      targetUser:
        req.user.userId,
      action:
        "PROFILE_PHOTO_UPDATED",
      metadata: {
        filename:
          req.file.filename,
        mimeType:
          req.file.mimetype,
        size:
          req.file.size,
      },
      requestId:
        req.requestId,
      ipAddress:
        req.ip,
    });

    await notifyUser({
      user:
        req.user.userId,
      type:
        "PROFILE_PHOTO_UPDATED",
      title:
        "Profile picture updated",
      body:
        "Your NexusBank profile picture was updated successfully.",
      priority:
        NOTIFICATION_PRIORITY.SUCCESS,
    });

    return ok(
      res,
      {
        user:
          publicUser(user),
        profilePhoto:
          photoUrl,
        profilePhotoUrl:
          photoUrl,
      },
      "Profile photo updated."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   PREFERENCES
   ========================================================= */

export async function updatePreferences(
  req,
  res,
  next
) {
  try {
    const current =
      (
        await User.findById(
          req.user.userId
        )
          .select(
            "preferences"
          )
          .lean()
      )?.preferences || {};

    const merged = {
      ...current,
      ...req.body,
    };

    const user =
      await User.findByIdAndUpdate(
        req.user.userId,
        {
          $set: {
            preferences:
              merged,
          },
        },
        {
          new: true,
          runValidators:
            true,
        }
      ).lean();

    if (!user) {
      throw new AppError(
        "User not found.",
        "RESOURCE_NOT_FOUND",
        404
      );
    }

    await recordAudit({
      actor:
        req.user.userId,
      targetUser:
        req.user.userId,
      action:
        "PREFERENCES_UPDATED",
      metadata: {
        fields:
          Object.keys(
            req.body
          ),
      },
      requestId:
        req.requestId,
      ipAddress:
        req.ip,
    });

    await notifyUser({
      user:
        req.user.userId,
      type:
        "PREFERENCES_UPDATED",
      title:
        "Preferences updated",
      body:
        "Your NexusBank notification and account preferences were updated.",
      priority:
        NOTIFICATION_PRIORITY.SUCCESS,
    });

    return ok(
      res,
      {
        user:
          publicUser(user),
      },
      "Preferences saved."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   SESSIONS
   ========================================================= */

export async function listSessions(
  req,
  res,
  next
) {
  try {
    const rows =
      await listUserSessions(
        req.user.userId
      );

    const items =
      rows.map(
        (s) => ({
          _id:
            s._id,

          jti:
            s.jti,

          deviceIdentifier:
            s.deviceIdentifier,

          browser:
            s.browser,

          operatingSystem:
            s.operatingSystem,

          createdAt:
            s.createdAt,

          lastSeenAt:
            s.lastSeenAt,

          expiresAt:
            s.expiresAt,

          current:
            req.user.jti &&
            s.jti ===
              req.user.jti,
        })
      );

    return ok(
      res,
      items
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   REVOKE SESSION
   ========================================================= */

export async function revokeSessionEndpoint(
  req,
  res,
  next
) {
  try {
    const result =
      await revokeSessionById({
        sessionId:
          req.params.id,
        userId:
          req.user.userId,
      });

    if (
      result.matchedCount ===
      0
    ) {
      throw new AppError(
        "Session not found.",
        "RESOURCE_NOT_FOUND",
        404
      );
    }

    await recordSecurityEvent({
      user:
        req.user.userId,
      eventType:
        SECURITY_EVENTS.LOGOUT,
      ipAddress:
        req.ip,
      metadata: {
        reason:
          "session_revoked",
        sessionId:
          req.params.id,
      },
    });

    await notifyUser({
      user:
        req.user.userId,
      type:
        "SESSION_REVOKED",
      title:
        "Device signed out",
      body:
        "An active NexusBank session was signed out from your account.",
      priority:
        NOTIFICATION_PRIORITY.INFO,
      meta: {
        sessionId:
          req.params.id,
      },
    });

    return ok(
      res,
      null,
      "Session signed out."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   REVOKE ALL OTHER SESSIONS
   ========================================================= */

export async function revokeAllOtherSessionsEndpoint(
  req,
  res,
  next
) {
  try {
    const result =
      await revokeAllOtherSessions({
        userId:
          req.user.userId,
        currentJti:
          req.user.jti,
      });

    await recordSecurityEvent({
      user:
        req.user.userId,
      eventType:
        SECURITY_EVENTS.LOGOUT,
      ipAddress:
        req.ip,
      metadata: {
        reason:
          "all_other_sessions_revoked",
      },
    });

    await notifyUser({
      user:
        req.user.userId,
      type:
        "SESSIONS_REVOKED",
      title:
        "Other devices signed out",
      body:
        "All other active NexusBank sessions were signed out successfully.",
      priority:
        NOTIFICATION_PRIORITY.SUCCESS,
      meta: {
        revokedCount:
          result.modifiedCount ||
          0,
      },
    });

    return ok(
      res,
      {
        revokedCount:
          result.modifiedCount,
      },
      "Signed out from all other devices."
    );
  } catch (error) {
    return next(error);
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

function maskEmail(email) {
  if (
    !email ||
    !email.includes("@")
  ) {
    return email;
  }

  const [
    local,
    domain,
  ] = email.split("@");

  if (
    !local ||
    !domain
  ) {
    return email;
  }

  if (
    local.length <= 2
  ) {
    return `${
      local[0] || "•"
    }•@${domain}`;
  }

  return `${local[0]}${"•".repeat(
    Math.max(
      1,
      local.length - 2
    )
  )}${local[local.length - 1]}@${domain}`;
}