import crypto from "node:crypto";

import { AppError } from "../utils/errors.js";

import {
  sendLoginOtpEmail,
  sendTransferOtpEmail,
  sendPasswordResetOtpEmail,
} from "./emailService.js";

/**
 * ============================================================
 * NEXUSBANK OTP SERVICE
 * ============================================================
 *
 * Supported purposes:
 *
 * LOGIN
 * TRANSFER_VERIFY
 * PASSWORD_RESET
 *
 * OTP rules:
 * - 6 digit cryptographically generated OTP
 * - 5 minute expiry
 * - maximum 5 verification attempts
 * - resend cooldown
 * - OTP is stored only as SHA-256 hash
 *
 * IMPORTANT:
 * The raw OTP is NEVER returned to the frontend.
 *
 * The OTP is generated on the backend and delivered to the
 * user's registered email address through NexusBank's sender
 * email configuration.
 */

const OTP_TTL_MS = 5 * 60 * 1000;

const OTP_MAX_ATTEMPTS = 5;

const DEFAULT_COOLDOWN_MS = 60_000;

const cooldownMs = () => {
  const raw = parseInt(
    process.env.OTP_RESEND_COOLDOWN_SECONDS,
    10
  );

  if (!Number.isFinite(raw) || raw < 0) {
    return DEFAULT_COOLDOWN_MS;
  }

  return raw * 1000;
};

/*
 * In-memory OTP store.
 *
 * Key:
 * PURPOSE:SUBJECT_ID
 *
 * Example:
 * LOGIN:64f...
 * TRANSFER_VERIFY:64f...
 * PASSWORD_RESET:64f...
 */
const store = new Map();

/* ============================================================
   HELPERS
   ============================================================ */

function key(purpose, subjectId) {
  return `${purpose}:${subjectId}`;
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function generateOtp() {
  const digits = crypto.randomInt(
    0,
    1_000_000
  );

  return digits
    .toString()
    .padStart(6, "0");
}

/* ============================================================
   ISSUE OTP
   ============================================================ */

export async function issueOtp({
  purpose,
  subjectId,
  email = null,
  name = null,
  transferContext = null,
  enforceCooldown = true,
}) {
  /*
   * ----------------------------------------------------------
   * VALIDATE OTP CONTEXT
   * ----------------------------------------------------------
   */

  if (!purpose || !subjectId) {
    throw new AppError(
      "OTP purpose and subject are required.",
      "OTP_CONTEXT_INVALID",
      500
    );
  }

  /*
   * Email is mandatory for the current NexusBank OTP flow.
   *
   * The OTP must go to the user's registered email.
   */
  if (!email) {
    throw new AppError(
      "No registered email address is available for OTP delivery.",
      "OTP_EMAIL_RECIPIENT_MISSING",
      400
    );
  }

  const storeKey = key(
    purpose,
    subjectId
  );

  /*
   * ----------------------------------------------------------
   * RESEND COOLDOWN
   * ----------------------------------------------------------
   */

  const existing = store.get(
    storeKey
  );

  if (
    existing &&
    enforceCooldown
  ) {
    const waited =
      Date.now() -
      existing.createdAt;

    const cool =
      cooldownMs();

    if (waited < cool) {
      const retryInSeconds =
        Math.ceil(
          (cool - waited) /
            1000
        );

      throw new AppError(
        `Please wait ${retryInSeconds}s before requesting another code.`,
        "OTP_RESEND_COOLDOWN",
        429
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * GENERATE OTP
   * ----------------------------------------------------------
   */

  const otp =
    generateOtp();

  const now =
    Date.now();

  const entry = {
    hash: sha256(otp),

    expiresAt:
      now + OTP_TTL_MS,

    attempts: 0,

    createdAt: now,
  };

  /*
   * Store hashed OTP.
   */
  store.set(
    storeKey,
    entry
  );

  /*
   * ----------------------------------------------------------
   * SERVER LOG
   * ----------------------------------------------------------
   *
   * We intentionally DO NOT print the raw OTP here.
   *
   * The OTP belongs in the user's email, not in the browser
   * response or server logs.
   */

  console.info(
    JSON.stringify({
      event:
        "OTP_ISSUED",

      purpose,

      subjectId:
        String(subjectId),

      email,

      expiresInSeconds:
        Math.round(
          OTP_TTL_MS / 1000
        ),
    })
  );

  /*
   * ----------------------------------------------------------
   * EMAIL DELIVERY
   * ----------------------------------------------------------
   *
   * Every OTP type is awaited.
   *
   * This is important because the previous LOGIN implementation
   * used fire-and-forget:
   *
   * sendLoginOtpEmail(...).catch(...)
   *
   * That made email failures invisible to the login flow.
   */

  try {
    const expiresInSeconds =
      Math.round(
        OTP_TTL_MS / 1000
      );

    let emailResult;

    /*
     * LOGIN OTP
     */
    if (
      purpose === "LOGIN"
    ) {
      emailResult =
        await sendLoginOtpEmail({
          to: email,
          name,
          otp,
          expiresInSeconds,
        });
    }

    /*
     * TRANSFER VERIFICATION OTP
     */
    else if (
      purpose ===
      "TRANSFER_VERIFY"
    ) {
      emailResult =
        await sendTransferOtpEmail({
          to: email,
          name,
          otp,
          expiresInSeconds,

          amountPaise:
            transferContext?.amountPaise,

          beneficiaryName:
            transferContext?.beneficiaryName,

          transactionId:
            transferContext?.transactionId,
        });
    }

    /*
     * PASSWORD RESET OTP
     */
    else if (
      purpose ===
      "PASSWORD_RESET"
    ) {
      emailResult =
        await sendPasswordResetOtpEmail({
          to: email,
          name,
          otp,
          expiresInSeconds,
        });
    }

    /*
     * Unknown purpose
     */
    else {
      store.delete(
        storeKey
      );

      throw new AppError(
        `Unsupported OTP purpose: ${purpose}`,
        "OTP_PURPOSE_UNSUPPORTED",
        500
      );
    }

    /*
     * --------------------------------------------------------
     * CHECK EMAIL RESULT
     * --------------------------------------------------------
     *
     * emailService returns:
     *
     * { sent: true, ... }
     *
     * or
     *
     * { sent: false, ... }
     */

    if (
      !emailResult ||
      emailResult.sent !== true
    ) {
      /*
       * The user did not receive a usable OTP.
       *
       * Remove the stored OTP so it cannot be used later.
       */
      store.delete(
        storeKey
      );

      console.error(
        JSON.stringify({
          event:
            "OTP_EMAIL_DELIVERY_FAILED",

          purpose,

          subjectId:
            String(subjectId),

          email,

          mode:
            emailResult?.mode ||
            "unknown",

          error:
            emailResult?.error ||
            "Email service did not confirm delivery.",
        })
      );

      throw new AppError(
        "We could not send the verification code to your registered email. Please try again.",
        "OTP_EMAIL_DELIVERY_FAILED",
        503
      );
    }

    /*
     * --------------------------------------------------------
     * EMAIL SUCCESS
     * --------------------------------------------------------
     */

    console.info(
      JSON.stringify({
        event:
          "OTP_EMAIL_DELIVERED",

        purpose,

        subjectId:
          String(subjectId),

        email,

        messageId:
          emailResult.messageId ||
          null,
      })
    );
  } catch (error) {
    /*
     * Do not leave an OTP alive when email delivery failed.
     */
    store.delete(
      storeKey
    );

    /*
     * Preserve our own AppError.
     */
    if (
      error instanceof AppError
    ) {
      throw error;
    }

    /*
     * Convert unexpected email-service failures into a
     * controlled application error.
     */

    console.error(
      JSON.stringify({
        event:
          "OTP_EMAIL_EXCEPTION",

        purpose,

        subjectId:
          String(subjectId),

        email,

        error:
          error?.message ||
          "Unknown email error.",
      })
    );

    throw new AppError(
      "We could not send the verification code to your registered email. Please try again.",
      "OTP_EMAIL_DELIVERY_FAILED",
      503
    );
  }

  /*
   * ----------------------------------------------------------
   * RESPONSE
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   *
   * NO demoOtp.
   *
   * The frontend should never receive the actual OTP.
   */

  return {
    expiresInSeconds:
      Math.round(
        OTP_TTL_MS / 1000
      ),

    resendAvailableInSeconds:
      Math.round(
        cooldownMs() / 1000
      ),

    /*
     * Deliberately omitted:
     *
     * demoOtp
     *
     * The actual OTP exists only:
     *
     * Backend → Email → User
     */
  };
}

/* ============================================================
   VERIFY OTP
   ============================================================ */

export function verifyOtp({
  purpose,
  subjectId,
  otp,
}) {
  const storeKey =
    key(
      purpose,
      subjectId
    );

  const entry =
    store.get(
      storeKey
    );

  /*
   * OTP does not exist.
   */
  if (!entry) {
    return {
      valid: false,
      code:
        "OTP_NOT_ISSUED",
    };
  }

  /*
   * OTP expired.
   */
  if (
    entry.expiresAt <
    Date.now()
  ) {
    store.delete(
      storeKey
    );

    return {
      valid: false,
      code:
        "OTP_EXPIRED",
    };
  }

  /*
   * Too many attempts.
   */
  if (
    entry.attempts >=
    OTP_MAX_ATTEMPTS
  ) {
    store.delete(
      storeKey
    );

    return {
      valid: false,
      code:
        "OTP_ATTEMPTS_EXCEEDED",
    };
  }

  /*
   * Count verification attempt.
   */
  entry.attempts += 1;

  /*
   * Compare hashes.
   */
  const isMatch =
    entry.hash ===
    sha256(otp);

  /*
   * Correct OTP.
   */
  if (isMatch) {
    store.delete(
      storeKey
    );

    return {
      valid: true,
    };
  }

  /*
   * Last failed attempt.
   */
  if (
    entry.attempts >=
    OTP_MAX_ATTEMPTS
  ) {
    store.delete(
      storeKey
    );

    return {
      valid: false,
      code:
        "OTP_ATTEMPTS_EXCEEDED",
    };
  }

  /*
   * Wrong OTP.
   */
  return {
    valid: false,
    code:
      "OTP_INVALID",
  };
}

/* ============================================================
   DEVELOPMENT / TEST HELPER
   ============================================================ */

export function _clearAllOtps() {
  store.clear();
}