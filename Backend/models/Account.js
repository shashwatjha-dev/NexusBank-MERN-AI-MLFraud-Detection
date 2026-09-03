import mongoose from "mongoose";

/**
 * Bank account owned by a User. Phase 5: multi-account.
 *
 * A user may now own multiple accounts (SAVINGS / CURRENT). Exactly one
 * account per user is flagged `isPrimary: true`. All existing balance
 * mutation paths still work — they simply target the account chosen by
 * the caller (defaulting to the primary account when not specified).
 *
 * Money is stored as *integer paise* everywhere.
 *   ₹1,234.56  →  123456 paise
 *
 * `balancePaise` is the settled balance.
 * `availableBalancePaise` is the balance not held by pending verifications.
 *
 * NexusBank uses its own IFSC namespace so internal transfers can be
 * detected by prefix. Any account whose IFSC starts with `NEXB0` belongs
 * to NexusBank and qualifies for the internal ledger's credit leg.
 */
const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: ["SAVINGS", "CURRENT"],
      default: "SAVINGS",
    },
    label: {
      type: String,
      trim: true,
      maxlength: 60,
      default: null,
    },
    ifsc: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      default: "NEXB0000001",
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code."],
    },
    branch: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "NexusBank — Bengaluru Central",
    },
    balancePaise: { type: Number, min: 0, default: 0 },
    availableBalancePaise: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["ACTIVE", "FROZEN", "CLOSED"],
      default: "ACTIVE",
      index: true,
    },
    isPrimary: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// A user may have many accounts, but only one primary account.
// Sparse partial unique index enforces "one primary per user" at the DB level.
accountSchema.index(
  { user: 1, isPrimary: 1 },
  { unique: true, partialFilterExpression: { isPrimary: true } }
);
accountSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Account", accountSchema);