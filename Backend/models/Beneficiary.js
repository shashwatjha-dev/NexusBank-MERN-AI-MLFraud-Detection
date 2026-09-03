import mongoose from "mongoose";

/**
 * Beneficiary (payee) added by a user. A single beneficiary is uniquely
 * identified by (user, accountNumber, ifsc).
 *
 * `trusted` is set to true only after the user has completed at least one
 * successful transfer to this beneficiary.
 */
const beneficiarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    nickname: { type: String, trim: true, maxlength: 40 },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{6,20}$/, "Invalid beneficiary account number."],
    },
    ifsc: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code."],
    },
    bankName: { type: String, required: true, trim: true, maxlength: 80 },
    trusted: { type: Boolean, default: false },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
  },
  { timestamps: true }
);

beneficiarySchema.index(
  { user: 1, accountNumber: 1, ifsc: 1 },
  { unique: true }
);

export default mongoose.model("Beneficiary", beneficiarySchema);