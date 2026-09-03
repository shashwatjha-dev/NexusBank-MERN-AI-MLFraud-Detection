import mongoose from "mongoose";

/**
 * Rewards/loyalty point ledger. Points are earned on completed transactions
 * and bonuses, and consumed on redemptions.
 */
const rewardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    points: { type: Number, required: true },
    reason: { type: String, trim: true, maxlength: 120 },
    type: {
      type: String,
      enum: ["EARNED", "REDEEMED", "BONUS"],
      required: true,
    },
  },
  { timestamps: true }
);

rewardSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Reward", rewardSchema);