import mongoose from "mongoose";

/**
 * Persisted session row for a JWT. Used to enable revocation ("log out this
 * device", "log out everywhere else"). The JWT's `jti` claim points here.
 *
 * We only *check* revocation on each request — we never regenerate the JWT.
 * When `revoked` flips to true, subsequent requests carrying that jti are
 * rejected with 401. Rows are auto-deleted after `expiresAt` via TTL index.
 */
const sessionSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true, index: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceIdentifier: { type: String, trim: true, default: null },
    browser: { type: String, trim: true, default: null },
    operatingSystem: { type: String, trim: true, default: null },
    ipAddress: { type: String, trim: true, default: null, select: false },
    lastSeenAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false, index: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, revoked: 1, lastSeenAt: -1 });
// TTL — Mongo automatically removes expired rows.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

sessionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.ipAddress;
    return ret;
  },
});

export default mongoose.model("Session", sessionSchema);