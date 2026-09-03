import mongoose from "mongoose";

const premiumPaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sourceAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },

    balanceBeforePaise: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceAfterPaise: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["COMPLETED", "FAILED"],
      default: "COMPLETED",
      index: true,
    },

    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    description: {
      type: String,
      default: "NexusBank Premium annual membership",
    },
  },
  {
    timestamps: true,
  }
);

premiumPaymentSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model(
  "PremiumPayment",
  premiumPaymentSchema
);