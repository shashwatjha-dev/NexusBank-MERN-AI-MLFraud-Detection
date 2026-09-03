import { Router } from "express";
import Joi from "joi";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  changePasswordSchema,
  updateProfileSchema,
  updatePreferencesSchema,
  sessionIdParamSchema,
} from "../validators/authValidators.js";

import {
  register,
  login,
  verifyLoginOtp,
  resendLoginOtp,

  // Password reset
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,

  logout,
  me,
  changePassword,
  updateProfile,
  updateProfilePhoto,
  updatePreferences,
  listSessions,
  revokeSessionEndpoint,
  revokeAllOtherSessionsEndpoint,
} from "../controllers/authController.js";

const router = Router();

/* =========================================================
   VALIDATION SCHEMAS
   ========================================================= */

const resendOtpSchema = Joi.object({
  userId: Joi.string()
    .length(24)
    .hex()
    .required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required(),
});

const verifyPasswordResetOtpSchema =
  Joi.object({
    userId: Joi.string()
      .length(24)
      .hex()
      .required(),

    otp: Joi.string()
      .trim()
      .length(6)
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        "string.pattern.base":
          "OTP must be exactly 6 digits.",
      }),
  });

const resetPasswordSchema = Joi.object({
  userId: Joi.string()
    .length(24)
    .hex()
    .required(),

  resetToken: Joi.string()
    .trim()
    .min(20)
    .required(),

  newPassword: Joi.string()
    .pattern(
      /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/
    )
    .required()
    .messages({
      "string.pattern.base":
        "New password must be 8+ characters and include at least one letter and one number.",
    }),
});

/* =========================================================
   PROFILE PHOTO UPLOAD
   ========================================================= */

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const profileUploadDirectory =
  path.resolve(
    __dirname,
    "../uploads/profile"
  );

fs.mkdirSync(
  profileUploadDirectory,
  {
    recursive: true,
  }
);

const storage =
  multer.diskStorage({
    destination: (
      _req,
      _file,
      cb
    ) => {
      cb(
        null,
        profileUploadDirectory
      );
    },

    filename: (
      _req,
      file,
      cb
    ) => {
      const extension =
        path.extname(
          file.originalname
        ).toLowerCase();

      const safeExtension = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
      ].includes(extension)
        ? extension
        : ".jpg";

      const filename =
        `profile-${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}${safeExtension}`;

      cb(
        null,
        filename
      );
    },
  });

const profilePhotoUpload =
  multer({
    storage,

    limits: {
      fileSize:
        5 * 1024 * 1024,
      files: 1,
    },

    fileFilter: (
      _req,
      file,
      cb
    ) => {
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];

      if (
        !allowedMimeTypes.includes(
          file.mimetype
        )
      ) {
        return cb(
          new Error(
            "Only JPG, JPEG, PNG, WEBP and GIF images are allowed."
          )
        );
      }

      cb(null, true);
    },
  });

/* =========================================================
   PUBLIC AUTH ROUTES
   ========================================================= */

/* -------------------------
   REGISTER
   ------------------------- */

router.post(
  "/register",
  validate({
    body: registerSchema,
  }),
  register
);

/* -------------------------
   LOGIN
   ------------------------- */

router.post(
  "/login",
  validate({
    body: loginSchema,
  }),
  login
);

/* -------------------------
   LOGIN OTP
   ------------------------- */

router.post(
  "/verify-otp",
  validate({
    body: verifyOtpSchema,
  }),
  verifyLoginOtp
);

router.post(
  "/resend-otp",
  validate({
    body: resendOtpSchema,
  }),
  resendLoginOtp
);

/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

/*
 * Step 1:
 * User enters email.
 *
 * POST /api/auth/forgot-password
 */
router.post(
  "/forgot-password",
  validate({
    body:
      forgotPasswordSchema,
  }),
  forgotPassword
);

/*
 * Step 2:
 * User enters the 6-digit OTP.
 *
 * POST /api/auth/verify-password-reset-otp
 */
router.post(
  "/verify-password-reset-otp",
  validate({
    body:
      verifyPasswordResetOtpSchema,
  }),
  verifyPasswordResetOtp
);

/*
 * Step 3:
 * User creates the new password.
 *
 * POST /api/auth/reset-password
 */
router.post(
  "/reset-password",
  validate({
    body:
      resetPasswordSchema,
  }),
  resetPassword
);

/* =========================================================
   AUTHENTICATED ROUTES
   ========================================================= */

router.get(
  "/me",
  requireAuth,
  me
);

router.post(
  "/logout",
  requireAuth,
  logout
);

router.post(
  "/change-password",
  requireAuth,
  validate({
    body:
      changePasswordSchema,
  }),
  changePassword
);

/* =========================================================
   PROFILE
   ========================================================= */

router.put(
  "/profile",
  requireAuth,
  validate({
    body:
      updateProfileSchema,
  }),
  updateProfile
);

/*
 * Profile photo upload.
 *
 * POST /api/auth/profile/photo
 *
 * multipart/form-data:
 * photo
 */
router.post(
  "/profile/photo",
  requireAuth,
  profilePhotoUpload.single(
    "photo"
  ),
  updateProfilePhoto
);

/* =========================================================
   PREFERENCES
   ========================================================= */

router.put(
  "/preferences",
  requireAuth,
  validate({
    body:
      updatePreferencesSchema,
  }),
  updatePreferences
);

/* =========================================================
   SESSIONS
   ========================================================= */

router.get(
  "/sessions",
  requireAuth,
  listSessions
);

router.delete(
  "/sessions/:id",
  requireAuth,
  validate({
    params:
      sessionIdParamSchema,
  }),
  revokeSessionEndpoint
);

router.delete(
  "/sessions",
  requireAuth,
  revokeAllOtherSessionsEndpoint
);

export default router;