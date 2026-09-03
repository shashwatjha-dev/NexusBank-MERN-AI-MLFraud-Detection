import mongoose from "mongoose";

/**
 * NexusBank PPF simulation — one PPF certificate per user.
 * NOT a real Government of India PPF account. Portfolio demo only.
 *
 * Money stored as integer paise. `balancePaise` includes principal +
 * accrued interest. Interest is credited by ppfService (never inline).
 */
const ppfSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    accountNumber: { type: String, required: true, unique: true, index: true },
    balancePaise: { type: Number, min: 0, default: 0 },
    totalContributedPaise: { type: Number, min: 0, default: 0 },
    totalInterestPaise: { type: Number, min: 0, default: 0 },
    interestRate: { type: Number, min: 0, max: 15, required: true }, // e.g. 7.1
    openedAt: { type: Date, default: () => new Date() },
    maturityDate: { type: Date, required: true },
    lastInterestCreditedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["ACTIVE", "MATURED", "CLOSED"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PPF", ppfSchema);