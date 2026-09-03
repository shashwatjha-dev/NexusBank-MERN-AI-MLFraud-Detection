
import mongoose from "mongoose";
import LedgerEntry from "../models/LedgerEntry.js";
import Account from "../models/Account.js";
import User from "../models/User.js";
import { AppError } from "../utils/errors.js";
import { ok, created } from "../middleware/response.js";
import { writeStatementCsv } from "../services/csvService.js";
import { streamStatementPdf } from "../services/pdfService.js";
import { shareStatement, listRecentShares } from "../services/statementShareService.js";

/**
 * Batch 6/8 — Statement controller.
 *
 *   GET  /api/statements/:accountId               → JSON (populated with tx)
 *   GET  /api/statements/:accountId/export.csv    → CSV
 *   GET  /api/statements/:accountId/export.pdf    → PDF
 *   POST /api/statements/:accountId/share         → Email PDF to CA/accountant
 *   GET  /api/statements/shares/recent            → Recent share audit
 */

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function loadAccountForUser(userId, accountId) {
  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    throw new AppError("Invalid account id.", "VALIDATION_ERROR", 400);
  }
  const account = await Account.findOne({ _id: accountId, user: userId }).lean();
  if (!account) throw new AppError("Account not found.", "ACCOUNT_NOT_FOUND", 404);
  return account;
}

function buildEntryFilter(accountId, { from, to }) {
  const filter = { account: accountId };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to)   filter.createdAt.$lte = to;
  }
  return filter;
}

export async function listStatement(req, res, next) {
  try {
    const account = await loadAccountForUser(req.user.userId, req.params.accountId);
    const from = parseDate(req.query.from);
    const to   = parseDate(req.query.to);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const skip  = Math.max(Number(req.query.skip) || 0, 0);

    const filter = buildEntryFilter(account._id, { from, to });

    const [items, total] = await Promise.all([
      LedgerEntry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "transaction",
          select: "category description status riskLevel beneficiary amountPaise idempotencyKey",
          populate: { path: "beneficiary", select: "name bankName accountNumber" },
        })
        .lean(),
      LedgerEntry.countDocuments(filter),
    ]);

    return ok(res, {
      account: {
        id: account._id,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        balancePaise: account.balancePaise,
        availableBalancePaise: account.availableBalancePaise,
        isPrimary: account.isPrimary,
      },
      items,
      total,
      limit,
      skip,
      dateRange: { from: from?.toISOString() || null, to: to?.toISOString() || null },
    });
  } catch (error) {
    return next(error);
  }
}

export async function exportStatementCsv(req, res, next) {
  try {
    const account = await loadAccountForUser(req.user.userId, req.params.accountId);
    const from = parseDate(req.query.from);
    const to   = parseDate(req.query.to);

    const filter = buildEntryFilter(account._id, { from, to });
    const entries = await LedgerEntry.find(filter).sort({ createdAt: 1 }).lean();

    writeStatementCsv(res, {
      account, entries,
      dateRange: {
        from: from ? from.toISOString().slice(0, 10) : "",
        to:   to   ? to.toISOString().slice(0, 10)   : "",
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function exportStatementPdf(req, res, next) {
  try {
    const account = await loadAccountForUser(req.user.userId, req.params.accountId);
    const user = await User.findById(req.user.userId).lean();
    const from = parseDate(req.query.from);
    const to   = parseDate(req.query.to);

    const filter = buildEntryFilter(account._id, { from, to });
    const entries = await LedgerEntry.find(filter).sort({ createdAt: 1 }).lean();

    streamStatementPdf(res, {
      account, entries, user,
      dateRange: {
        from: from ? from.toISOString().slice(0, 10) : "—",
        to:   to   ? to.toISOString().slice(0, 10)   : "—",
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/statements/:accountId/share
 * Body: { recipientEmail, subject?, message?, from?, to? }
 */
export async function shareStatementController(req, res, next) {
  try {
    const { recipientEmail, subject, message, from, to } = req.body || {};
    const record = await shareStatement({
      userId: req.user.userId,
      accountId: req.params.accountId,
      recipientEmail,
      subject,
      message,
      from,
      to,
      ipAddress: req.ip,
      requestId: req.requestId,
    });
    return created(res, record, "Statement emailed successfully.");
  } catch (error) {
    return next(error);
  }
}

export async function listShareHistory(req, res, next) {
  try {
    const items = await listRecentShares(req.user.userId, {
      limit: Number(req.query.limit) || 10,
    });
    return ok(res, { items, total: items.length });
  } catch (error) {
    return next(error);
  }
}