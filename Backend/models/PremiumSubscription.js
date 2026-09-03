import mongoose from "mongoose";

const premiumSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["PREMIUM"],
      default: "PREMIUM",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },

    pricePaise: {
      type: Number,
      required: true,
      min: 1,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    sourceAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PremiumPayment",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

premiumSubscriptionSchema.index({
  user: 1,
  status: 1,
});

export default mongoose.model(
  "PremiumSubscription",
  premiumSubscriptionSchema
);