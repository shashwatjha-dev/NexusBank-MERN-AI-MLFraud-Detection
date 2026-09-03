import mongoose from "mongoose";

/**
 * In-app notification for the user. Used for security warnings, transaction
 * updates, reward events, and system announcements.
 */
const alertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    type: {
      type: String,
      enum: ["SECURITY", "TRANSACTION", "REWARD", "SYSTEM"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO",
    },
    read: { type: Boolean, default: false, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

alertSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model("Alert", alertSchema);