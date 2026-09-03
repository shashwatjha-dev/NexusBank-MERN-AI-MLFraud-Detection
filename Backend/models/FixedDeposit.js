import mongoose from "mongoose";

/**
 * Fixed Deposit certificate.
 * Maturity amount uses simple-interest accrual:
 *   maturity = principal * (1 + rate/100 * durationMonths/12)
 * Storage: principalPaise and maturityAmountPaise as integer paise.
 */
const fixedDepositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    principalPaise: { type: Number, min: 1, required: true },
    interestRate: { type: Number, min: 0, max: 25, required: true },
    durationMonths: { type: Number, min: 1, max: 120, required: true },
    maturityAmountPaise: { type: Number, min: 1, required: true },
    startDate: { type: Date, default: () => new Date() },
    maturityDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["ACTIVE", "MATURED", "CLOSED"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true }
);

fixedDepositSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("FixedDeposit", fixedDepositSchema);
