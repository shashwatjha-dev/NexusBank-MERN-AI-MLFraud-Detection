import mongoose from "mongoose";

/**
 * Immutable double-entry ledger row.
 *
 * Every completed money movement writes at least one LedgerEntry.
 *   - External transfer  →  one DEBIT row on the sender's account.
 *   - Internal transfer  →  one DEBIT row on the sender + one CREDIT row on
 *                            the recipient. Both share the same `reference`.
 *   - Refund/reversal    →  a compensating CREDIT (with entryType REVERSAL).
 *
 * Amounts are integer paise. `balanceBeforePaise` and `balanceAfterPaise`
 * capture the account balance immediately around the entry so account
 * statements can render a running balance from the ledger alone.
 */
const ledgerEntrySchema = new mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      index: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ["DEBIT", "CREDIT"],
      required: true,
    },
    entryType: {
      type: String,
      enum: [
        "TRANSFER_OUT",
        "TRANSFER_IN",
        "FD_DEBIT",
        "FD_MATURITY",
        "PPF_DEBIT",
        "PPF_CREDIT",
        "REVERSAL",
      ],
      required: true,
    },
    amountPaise: { type: Number, min: 1, required: true },
    balanceBeforePaise: { type: Number, min: 0, required: true },
    balanceAfterPaise: { type: Number, min: 0, required: true },
    reference: {
      type: String,
      required: true,
      index: true,
      trim: true,
      maxlength: 80,
    },
    counterpartyAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    counterpartyName: { type: String, trim: true, maxlength: 120, default: null },
    counterpartyIfsc: { type: String, trim: true, maxlength: 20, default: null },
    counterpartyAccountNumber: { type: String, trim: true, maxlength: 40, default: null },
    description: { type: String, trim: true, maxlength: 200, default: null },
    category: { type: String, trim: true, maxlength: 40, default: null },
  },
  { timestamps: true }
);

// Statement queries: "give me all entries for this account, newest first".
ledgerEntrySchema.index({ account: 1, createdAt: -1 });
// Pair lookup: "find the sibling leg for this transaction".
ledgerEntrySchema.index({ transaction: 1, direction: 1 });

export default mongoose.model("LedgerEntry", ledgerEntrySchema);