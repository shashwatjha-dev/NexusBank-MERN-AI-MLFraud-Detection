import mongoose from "mongoose";

/**
 * Money transfer record. Every transfer request produces exactly one Transaction
 * document, even if the fraud engine decides to BLOCK or require verification.
 *
 * `status` is the operational state of the transaction (PENDING → COMPLETED / FAILED / BLOCKED).
 * `fraudDecision` is the fraud-engine verdict (COMPLETED / VERIFICATION_REQUIRED / BLOCKED).
 * They are stored separately so the two axes never conflict.
 *
 * Monetary field `amountPaise` is an integer in paise.
 *
 * `idempotencyKey` enforces "one deduction per intent" — duplicate submissions
 * with the same key return the original result rather than debiting twice.
 * The (user, idempotencyKey) unique index makes this atomic at the DB level.
 *
 * Phase 5 additive fields:
 *   - sourceAccountId    → the debited account. Optional for backwards
 *                          compatibility with Phase 4 rows (which are all
 *                          against the user's single/primary account).
 *   - creditLegAccountId → set only for internal NexusBank transfers; the
 *                          account credited on the recipient side.
 *   - isInternal         → true when the beneficiary IFSC belongs to the
 *                          NexusBank namespace (NEXB0…).
 */
const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sourceAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },
    creditLegAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    isInternal: { type: Boolean, default: false, index: true },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Beneficiary",
      required: true,
      index: true,
    },
    amountPaise: { type: Number, required: true, min: 1 },
    description: { type: String, trim: true, maxlength: 140 },
    category: { type: String, trim: true, maxlength: 40 },
    type: {
      type: String,
      enum: ["TRANSFER", "PAYMENT", "DEPOSIT", "WITHDRAWAL"],
      default: "TRANSFER",
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "BLOCKED"],
      default: "PENDING",
      index: true,
    },
    fraudDecision: {
      type: String,
      enum: ["COMPLETED", "VERIFICATION_REQUIRED", "BLOCKED"],
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true,
      index: true,
    },
    finalRiskScore: { type: Number, min: 0, max: 100 },
    ruleScore: { type: Number, min: 0, max: 100 },
    behaviouralScore: { type: Number, min: 0, max: 100 },
    mlProbability: { type: Number, min: 0, max: 1, default: null },
    mlRisk: { type: Number, min: 0, max: 100, default: null },
    triggeredRules: { type: [mongoose.Schema.Types.Mixed], default: [] },
    behaviouralSignals: { type: [mongoose.Schema.Types.Mixed], default: [] },
    featureSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    modelVersion: { type: String, default: null },
    riskConfigurationVersion: { type: String, default: null },
    mlServiceStatus: {
      type: String,
      enum: ["AVAILABLE", "UNAVAILABLE", "INVALID_RESPONSE"],
      default: "UNAVAILABLE",
    },
    decisionReason: { type: String, default: null },
    device: { type: String, default: null },
    ipAddress: { type: String, default: null, select: false },
    sessionId: { type: String, default: null, select: false },
    idempotencyKey: { type: String, required: true },
    otpVerifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Recent transactions per user
transactionSchema.index({ user: 1, createdAt: -1 });
// Per-account transaction lists (Phase 5)
transactionSchema.index({ sourceAccountId: 1, createdAt: -1 });
// Enforce idempotency
transactionSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
// Admin dashboards
transactionSchema.index({ fraudDecision: 1, createdAt: -1 });
transactionSchema.index({ status: 1, riskLevel: 1, createdAt: -1 });

transactionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.ipAddress;
    delete ret.sessionId;
    return ret;
  },
});

export default mongoose.model("Transaction", transactionSchema);