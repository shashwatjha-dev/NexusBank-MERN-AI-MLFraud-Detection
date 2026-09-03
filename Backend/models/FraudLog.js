import mongoose from "mongoose";

/**
 * Immutable fraud-analysis record. Written whenever the fraud engine returns a
 * non-LOW verdict (VERIFICATION_REQUIRED or BLOCKED). Used by the admin
 * investigation UI.
 *
 * One FraudLog per Transaction (enforced by the unique index on `transaction`).
 */
const fraudLogSchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    riskScore: { type: Number, min: 0, max: 100 },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      index: true,
    },
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
    decision: {
      type: String,
      enum: ["COMPLETED", "VERIFICATION_REQUIRED", "BLOCKED"],
      required: true,
    },
    reviewStatus: {
      type: String,
      enum: ["OPEN", "REVIEWED", "DISMISSED"],
      default: "OPEN",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true }
);

fraudLogSchema.index({ createdAt: -1 });
fraudLogSchema.index({ reviewStatus: 1, riskLevel: 1, createdAt: -1 });

export default mongoose.model("FraudLog", fraudLogSchema);