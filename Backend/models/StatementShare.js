
import mongoose from "mongoose";

/**
 * Audit trail for statement share events.
 * One row per share attempt (success or failure). Enables:
 *   • Customer transparency ("who did I share my statement with?")
 *   • Admin/security review (unusual sharing volumes)
 *   • Legal/regulatory record-keeping
 */
const statementShareSchema = new mongoose.Schema(
  {
    user:           { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    account:        { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    recipientEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    subject:        { type: String, default: "", maxlength: 200 },
    message:        { type: String, default: "", maxlength: 2000 },
    dateRange: {
      from: { type: Date, default: null },
      to:   { type: Date, default: null },
    },
    entryCount:     { type: Number, default: 0, min: 0 },
    fileSizeBytes:  { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["SENT", "FAILED"],
      required: true,
      index: true,
    },
    errorMessage:   { type: String, default: null, maxlength: 500 },
    ipAddress:      { type: String, default: null, select: false },
    requestId:      { type: String, default: null },
  },
  { timestamps: true }
);

statementShareSchema.index({ user: 1, createdAt: -1 });

statementShareSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.ipAddress;
    return ret;
  },
});

export default mongoose.model("StatementShare", statementShareSchema);