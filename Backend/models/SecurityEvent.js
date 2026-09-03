import mongoose from "mongoose";

/**
 * Append-only stream of security-relevant user events, shown in the customer
 * Security Center and used by admins during fraud investigations.
 *
 * `eventType` values are defined in utils/enums.js (SECURITY_EVENTS).
 */
const securityEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventType: { type: String, required: true, index: true },
    device: { type: String, default: null },
    ipAddress: { type: String, default: null, select: false },
    sessionId: { type: String, default: null, select: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

securityEventSchema.index({ user: 1, createdAt: -1 });
securityEventSchema.index({ user: 1, eventType: 1, createdAt: -1 });

securityEventSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.ipAddress;
    delete ret.sessionId;
    return ret;
  },
});

export default mongoose.model("SecurityEvent", securityEventSchema);