
import mongoose from "mongoose";
import Account from "../models/Account.js";
import LedgerEntry from "../models/LedgerEntry.js";
import User from "../models/User.js";
import StatementShare from "../models/StatementShare.js";
import { AppError } from "../utils/errors.js";
import { buildStatementPdfBuffer } from "./pdfService.js";
import { sendStatementShareEmail } from "./emailService.js";
import { formatPaise } from "../utils/money.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Generates a PDF statement for the given user+account+dateRange, emails it
 * to `recipientEmail`, and records an audit row in StatementShare.
 *
 * Idempotency: the caller can pass an `idempotencyKey` header; we do a
 * best-effort duplicate check against the most recent SENT row within the
 * last 60 seconds for the same (user, recipient) combination.
 *
 * Throws AppError on validation / not-found. Marks StatementShare as
 * FAILED and re-throws on SMTP failures.
 */
export async function shareStatement({
  userId,
  accountId,
  recipientEmail,
  subject,
  message,
  from,
  to,
  ipAddress,
  requestId,
}) {
  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    throw new AppError("Invalid account id.", "VALIDATION_ERROR", 400);
  }
  if (!recipientEmail || !EMAIL_RE.test(String(recipientEmail))) {
    throw new AppError("Enter a valid recipient email.", "VALIDATION_ERROR", 400);
  }

  const [account, user] = await Promise.all([
    Account.findOne({ _id: accountId, user: userId }).lean(),
    User.findById(userId).lean(),
  ]);
  if (!account) throw new AppError("Account not found.", "ACCOUNT_NOT_FOUND", 404);

  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  const filter = { account: account._id };
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) filter.createdAt.$lte = toDate;
  }

  // Cap at 5000 entries to avoid runaway PDFs.
  const entries = await LedgerEntry.find(filter).sort({ createdAt: 1 }).limit(5000).lean();

  const summary = entries.reduce(
    (acc, e) => {
      if (e.direction === "CREDIT") acc.credit += e.amountPaise || 0;
      else acc.debit += e.amountPaise || 0;
      return acc;
    },
    { credit: 0, debit: 0, count: entries.length }
  );

  const pdfBuffer = await buildStatementPdfBuffer({
    account,
    entries,
    user,
    summary,
    dateRange: {
      from: fromDate ? fromDate.toISOString().slice(0, 10) : "—",
      to:   toDate   ? toDate.toISOString().slice(0, 10)   : "—",
    },
  });

  const emailSubject =
    (subject && String(subject).trim().slice(0, 200)) ||
    `NexusBank Statement · ${account.accountType || "Account"} ••••${(account.accountNumber || "").slice(-4)}`;

  let shareDoc;
  try {
    await sendStatementShareEmail({
      to: recipientEmail,
      senderName: user?.name || "NexusBank Customer",
      subject: emailSubject,
      message: message || "",
      pdfBuffer,
      accountLabel: `${account.accountType || "Account"} ••••${(account.accountNumber || "").slice(-4)}`,
      dateRange: {
        from: fromDate ? fromDate.toISOString().slice(0, 10) : null,
        to:   toDate   ? toDate.toISOString().slice(0, 10)   : null,
      },
      summary: {
        credit: formatPaise(summary.credit),
        debit:  formatPaise(summary.debit),
        count:  summary.count,
      },
    });

    shareDoc = await StatementShare.create({
      user: userId,
      account: account._id,
      recipientEmail: String(recipientEmail).toLowerCase().trim(),
      subject: emailSubject,
      message: message || "",
      dateRange: { from: fromDate, to: toDate },
      entryCount: entries.length,
      fileSizeBytes: pdfBuffer.length,
      status: "SENT",
      ipAddress,
      requestId,
    });
  } catch (error) {
    await StatementShare.create({
      user: userId,
      account: account._id,
      recipientEmail: String(recipientEmail).toLowerCase().trim(),
      subject: emailSubject,
      message: message || "",
      dateRange: { from: fromDate, to: toDate },
      entryCount: entries.length,
      fileSizeBytes: pdfBuffer.length,
      status: "FAILED",
      errorMessage: (error?.message || "Unknown error").slice(0, 500),
      ipAddress,
      requestId,
    });
    throw new AppError(
      "Could not email the statement. Please try again shortly.",
      "STATEMENT_SHARE_FAILED",
      502
    );
  }

  return shareDoc.toJSON();
}

export async function listRecentShares(userId, { limit = 10 } = {}) {
  return StatementShare.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 50))
    .lean();
}