import Joi from "joi";

/* =========================================================
   COMMON PATTERNS
   ========================================================= */

const passwordPattern =
  /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

const phonePattern =
  /^[0-9+\-\s()]{7,20}$/;

/* =========================================================
   REGISTER
   ========================================================= */

export const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(80)
    .required(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required(),

  phone: Joi.string()
    .trim()
    .pattern(phonePattern)
    .required()
    .messages({
      "string.pattern.base":
        "Phone must be 7–20 characters (digits, spaces, +, -, parentheses).",
    }),

  password: Joi.string()
    .pattern(passwordPattern)
    .required()
    .messages({
      "string.pattern.base":
        "Password must be 8+ characters and include at least one letter and one number.",
    }),
});

/* =========================================================
   LOGIN
   ========================================================= */

export const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required(),

  password: Joi.string()
    .min(1)
    .required(),

  deviceIdentifier: Joi.string()
    .trim()
    .max(120)
    .default("demo-browser"),

  browser: Joi.string()
    .trim()
    .max(60)
    .allow(null, ""),

  operatingSystem: Joi.string()
    .trim()
    .max(60)
    .allow(null, ""),
});

/* =========================================================
   LOGIN OTP
   ========================================================= */

export const verifyOtpSchema = Joi.object({
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

  deviceIdentifier: Joi.string()
    .trim()
    .max(120)
    .default("demo-browser"),
});

/* =========================================================
   CHANGE PASSWORD
   ========================================================= */

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .min(1)
    .required(),

  newPassword: Joi.string()
    .pattern(passwordPattern)
    .required()
    .messages({
      "string.pattern.base":
        "New password must be 8+ characters and include at least one letter and one number.",
    }),
});

/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

export const forgotPasswordSchema =
  Joi.object({
    email: Joi.string()
      .trim()
      .lowercase()
      .email()
      .required(),
  });

/* =========================================================
   FORGOT PASSWORD OTP
   ========================================================= */

export const verifyPasswordResetOtpSchema =
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

/* =========================================================
   RESET PASSWORD
   ========================================================= */

export const resetPasswordSchema =
  Joi.object({
    userId: Joi.string()
      .length(24)
      .hex()
      .required(),

    resetToken: Joi.string()
      .trim()
      .min(20)
      .required(),

    newPassword: Joi.string()
      .pattern(passwordPattern)
      .required()
      .messages({
        "string.pattern.base":
          "Password must be 8+ characters and include at least one letter and one number.",
      }),

    confirmPassword: Joi.any()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({
        "any.only":
          "Passwords do not match.",
      }),
  });

/* =========================================================
   PROFILE
   ========================================================= */

export const updateProfileSchema =
  Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(80),

    phone: Joi.string()
      .trim()
      .pattern(phonePattern)
      .messages({
        "string.pattern.base":
          "Phone must be 7–20 characters (digits, spaces, +, -, parentheses).",
      }),

    address: Joi.object({
      line1: Joi.string()
        .trim()
        .max(120)
        .allow("", null),

      line2: Joi.string()
        .trim()
        .max(120)
        .allow("", null),

      city: Joi.string()
        .trim()
        .max(60)
        .allow("", null),

      state: Joi.string()
        .trim()
        .max(60)
        .allow("", null),

      postalCode: Joi.string()
        .trim()
        .max(20)
        .allow("", null),

      country: Joi.string()
        .trim()
        .max(60)
        .allow("", null),
    }),
  })
    .min(1)
    .messages({
      "object.min":
        "At least one profile field must be provided.",
    });

/* =========================================================
   PREFERENCES
   ========================================================= */

export const updatePreferencesSchema =
  Joi.object({
    theme: Joi.string().valid(
      "light",
      "dark",
      "system"
    ),

    notifyOnLogin:
      Joi.boolean(),

    notifyOnTransfer:
      Joi.boolean(),

    notifyOnFraud:
      Joi.boolean(),

    notifyOnProducts:
      Joi.boolean(),

    emailNotifications:
      Joi.boolean(),
  })
    .min(1)
    .messages({
      "object.min":
        "At least one preference must be provided.",
    });

/* =========================================================
   SESSION
   ========================================================= */

export const sessionIdParamSchema =
  Joi.object({
    id: Joi.string()
      .length(24)
      .hex()
      .required(),
  });