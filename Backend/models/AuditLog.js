import mongoose from "mongoose";

/**
 * Append-only audit trail of platform actions. Every state-changing operation
 * (user transfer, admin block/unblock, fraud review) writes exactly one AuditLog.
 *
 * `actor`      = who performed the action (customer or admin)
 * `targetUser` = who the action was performed on (may equal actor)
 * `action`     = enum-like string ("TRANSFER_COMPLETED", "USER_BLOCKED", ...)
 * `transaction`= linked transaction if the action concerned one
 * `requestId`  = correlation id for request-tracing across services
 */
const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    action: { type: String, required: true, index: true },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    requestId: { type: String, default: null },
    ipAddress: { type: String, default: null, select: false },
  },
  { timestamps: true }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ targetUser: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

auditLogSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.ipAddress;
    return ret;
  },
});

export default mongoose.model("AuditLog", auditLogSchema);