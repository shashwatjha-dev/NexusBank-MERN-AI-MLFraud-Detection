import Joi from "joi";

/**
 * Joi schemas for the customer banking endpoints (accounts, beneficiaries,
 * transfers, fixed deposits, alerts).
 *
 * Monetary rules:
 *   - All amounts arrive as integer *paise* (never floats, never rupees).
 *   - Minimum 1 paise, maximum ₹1 crore (1_00_00_00_000 paise).
 *
 * IFSC rules:
 *   - Standard RBI IFSC format: 4 letters, 0, 6 alphanumerics.
 */
const objectId = Joi.string().length(24).hex();
const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const bankAccountPattern = /^[0-9]{6,20}$/;
const MAX_TRANSFER_PAISE = 1_00_00_00_000; // ₹1 crore

// ---------- Accounts (Phase 5 additive) ----------

export const createAccountSchema = Joi.object({
  accountType: Joi.string().valid("SAVINGS", "CURRENT").required(),
  label: Joi.string().trim().min(2).max(60).allow(null, ""),
});

export const setPrimaryAccountParamSchema = Joi.object({
  id: objectId.required(),
});

// ---------- Beneficiaries ----------

export const createBeneficiarySchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  nickname: Joi.string().trim().max(40).allow(null, ""),
  accountNumber: Joi.string().trim().pattern(bankAccountPattern).required().messages({
    "string.pattern.base": "Beneficiary account number must be 6–20 digits.",
  }),
  ifsc: Joi.string().trim().uppercase().pattern(ifscPattern).required().messages({
    "string.pattern.base": "IFSC must be 4 letters + 0 + 6 alphanumerics (e.g. HDFC0001234).",
  }),
  bankName: Joi.string().trim().min(2).max(80).required(),
});

export const updateBeneficiarySchema = Joi.object({
  name: Joi.string().trim().min(2).max(80),
  nickname: Joi.string().trim().max(40).allow(null, ""),
  bankName: Joi.string().trim().min(2).max(80),
})
  .min(1)
  .messages({ "object.min": "At least one field must be provided for update." });

export const beneficiaryIdParamSchema = Joi.object({
  id: objectId.required(),
});

// ---------- Transfers ----------

export const transferSchema = Joi.object({
  beneficiaryId: objectId.required(),
  // Phase 5: optional source account. Falls back to user's primary account
  // when not supplied, so existing frontend clients keep working unchanged.
  sourceAccountId: objectId.optional(),
  amountPaise: Joi.number()
    .integer()
    .min(1)
    .max(MAX_TRANSFER_PAISE)
    .required()
    .messages({
      "number.integer": "Amount must be an integer number of paise.",
      "number.min": "Amount must be at least 1 paise.",
      "number.max": "Amount exceeds the maximum transfer limit.",
    }),
  description: Joi.string().trim().max(140).allow(null, ""),
  category: Joi.string()
    .valid("Shopping", "Food", "Bills", "Travel", "Entertainment", "Transfer", "Other")
    .default("Transfer"),
  idempotencyKey: Joi.string().trim().min(8).max(80).required(),
  deviceIdentifier: Joi.string().trim().max(120).default("demo-browser"),
  browser: Joi.string().trim().max(60).allow(null, ""),
  operatingSystem: Joi.string().trim().max(60).allow(null, ""),
});

export const verifyTransferOtpSchema = Joi.object({
  otp: Joi.string().trim().length(6).pattern(/^\d{6}$/).required().messages({
    "string.pattern.base": "OTP must be exactly 6 digits.",
  }),
});

export const transactionIdParamSchema = Joi.object({
  id: objectId.required(),
});

export const listTransactionsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  skip: Joi.number().integer().min(0).default(0),
  riskLevel: Joi.string().valid("LOW", "MEDIUM", "HIGH"),
  status: Joi.string().valid("PENDING", "COMPLETED", "FAILED", "BLOCKED"),
  accountId: objectId.optional(),
});

// ---------- Fixed Deposits ----------

export const createFixedDepositSchema = Joi.object({
  principalPaise: Joi.number()
    .integer()
    .min(100_000) // ₹1000 minimum
    .max(MAX_TRANSFER_PAISE)
    .required(),
  interestRate: Joi.number().min(1).max(15).required(),
  durationMonths: Joi.number().integer().min(1).max(120).required(),
  // Phase 5: optional source account (Batch 6 wires this in the controller).
  sourceAccountId: objectId.optional(),
});

// ---------- Alerts ----------

export const alertIdParamSchema = Joi.object({
  id: objectId.required(),
});