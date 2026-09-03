import mongoose from "mongoose";

/**
 * Individual PPF contribution row. Immutable — one document per deposit.
 * `financialYear` is a string like "2025-26" so the annual limit check is
 * a simple aggregation.
 */
const ppfContributionSchema = new mongoose.Schema(
  {
    ppf: { type: mongoose.Schema.Types.ObjectId, ref: "PPF", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sourceAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    amountPaise: { type: Number, min: 1, required: true },
    financialYear: { type: String, required: true, index: true },
    balanceAfterPaise: { type: Number, min: 0, required: true },
    ledgerReference: { type: String, required: true, index: true },
    note: { type: String, trim: true, maxlength: 200, default: null },
  },
  { timestamps: true }
);

ppfContributionSchema.index({ ppf: 1, createdAt: -1 });
ppfContributionSchema.index({ user: 1, financialYear: 1 });

export default mongoose.model("PPFContribution", ppfContributionSchema);