import mongoose from "mongoose";

/**
 * Non-sensitive device fingerprint used for security/anomaly analysis.
 * A device becomes "known" the first time it is seen for a given user.
 * The fraud rule `NEW_DEVICE` fires when a transaction originates from a
 * device that has not been seen before for this user.
 */
const deviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceIdentifier: { type: String, required: true, trim: true },
    browser: { type: String, trim: true, default: null },
    operatingSystem: { type: String, trim: true, default: null },
    trusted: { type: Boolean, default: false },
    firstSeenAt: { type: Date, default: () => new Date() },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

deviceSchema.index({ user: 1, deviceIdentifier: 1 }, { unique: true });

export default mongoose.model("Device", deviceSchema);