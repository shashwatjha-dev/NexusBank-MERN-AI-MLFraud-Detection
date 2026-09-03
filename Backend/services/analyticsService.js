import mongoose from "mongoose";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import FraudLog from "../models/FraudLog.js";
import User from "../models/User.js";
import { TRANSACTION_STATUS } from "../utils/enums.js";

/**
 * Dashboard aggregations. Every function returns integer paise where money is
 * involved — the controller layer converts to display strings if needed.
 *
 * Phase 5: every customer-scoped aggregation accepts an optional `accountId`.
 * When supplied and belonging to the user, aggregations are scoped to that
 * single account (via Transaction.sourceAccountId). When omitted the primary
 * account is used, preserving the previous single-account behaviour for
 * older frontend clients.
 */

const { Types } = mongoose;

async function resolveAccount(userId, accountId) {
  if (accountId) {
    const chosen = await Account.findOne({ _id: accountId, user: userId }).lean();
    if (chosen) return chosen;
  }
  const primary = await Account.findOne({ user: userId, isPrimary: true }).lean();
  if (primary) return primary;
  // Legacy fallback: first account for this user.
  return Account.findOne({ user: userId }).lean();
}

/**
 * Adds a `sourceAccountId` clause to a Transaction $match block, but only
 * when the schema is known to store it. Old (Phase 4) transactions have no
 * `sourceAccountId`, so we OR with { sourceAccountId: { $exists: false } }
 * when the target account is the user's primary — this keeps historical
 * dashboards populated even before Batch 2 backfills the field.
 */
function scopeToAccount(baseMatch, { accountId, isPrimaryAccount }) {
  if (!accountId) return baseMatch;
  if (isPrimaryAccount) {
    return {
      ...baseMatch,
      $or: [
        { sourceAccountId: new Types.ObjectId(accountId) },
        { sourceAccountId: { $exists: false } },
        { sourceAccountId: null },
      ],
    };
  }
  return { ...baseMatch, sourceAccountId: new Types.ObjectId(accountId) };
}

/**
 * Customer dashboard summary.
 */
export async function getCustomerOverview(userId, { accountId = null } = {}) {
  const account = await resolveAccount(userId, accountId);

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const scope = {
    accountId: account?._id,
    isPrimaryAccount: !!account?.isPrimary,
  };
  const baseMatch = { user: new Types.ObjectId(userId) };

  const [thisMonthAgg, lastMonthAgg, riskCountsAgg] = await Promise.all([
    Transaction.aggregate([
      {
        $match: scopeToAccount(
          {
            ...baseMatch,
            status: TRANSACTION_STATUS.COMPLETED,
            createdAt: { $gte: startOfThisMonth },
          },
          scope
        ),
      },
      { $group: { _id: null, spent: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      {
        $match: scopeToAccount(
          {
            ...baseMatch,
            status: TRANSACTION_STATUS.COMPLETED,
            createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth },
          },
          scope
        ),
      },
      { $group: { _id: null, spent: { $sum: "$amountPaise" } } },
    ]),
    Transaction.aggregate([
      { $match: scopeToAccount(baseMatch, scope) },
      { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
    ]),
  ]);

  const thisMonthSpentPaise = thisMonthAgg[0]?.spent || 0;
  const lastMonthSpentPaise = lastMonthAgg[0]?.spent || 0;
  const monthOverMonthPercent = lastMonthSpentPaise
    ? Math.round(
        ((thisMonthSpentPaise - lastMonthSpentPaise) / lastMonthSpentPaise) * 100
      )
    : null;

  const riskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const bucket of riskCountsAgg) {
    if (bucket._id && Object.prototype.hasOwnProperty.call(riskCounts, bucket._id)) {
      riskCounts[bucket._id] = bucket.count;
    }
  }

  return {
    account,
    thisMonthSpentPaise,
    lastMonthSpentPaise,
    monthOverMonthPercent,
    thisMonthTransactionCount: thisMonthAgg[0]?.count || 0,
    riskCounts,
  };
}

export async function getSpendingByCategory(
  userId,
  { months = 6, accountId = null } = {}
) {
  const account = await resolveAccount(userId, accountId);
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  return Transaction.aggregate([
    {
      $match: scopeToAccount(
        {
          user: new Types.ObjectId(userId),
          status: TRANSACTION_STATUS.COMPLETED,
          createdAt: { $gte: start },
        },
        { accountId: account?._id, isPrimaryAccount: !!account?.isPrimary }
      ),
    },
    {
      $group: {
        _id: { $ifNull: ["$category", "Other"] },
        totalPaise: { $sum: "$amountPaise" },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalPaise: -1 } },
  ]);
}

export async function getMonthlyCashFlow(
  userId,
  { months = 6, accountId = null } = {}
) {
  const account = await resolveAccount(userId, accountId);
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const rows = await Transaction.aggregate([
    {
      $match: scopeToAccount(
        {
          user: new Types.ObjectId(userId),
          status: TRANSACTION_STATUS.COMPLETED,
          createdAt: { $gte: start },
        },
        { accountId: account?._id, isPrimaryAccount: !!account?.isPrimary }
      ),
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        spentPaise: { $sum: "$amountPaise" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  return rows.map((row) => ({
    year: row._id.year,
    month: row._id.month,
    spentPaise: row.spentPaise,
    count: row.count,
  }));
}

export async function getAdminOverview() {
  const [totalUsers, activeUsers, blockedUsers, txAgg, riskAgg, decisionAgg] =
    await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ blocked: false }),
      User.countDocuments({ blocked: true }),
      Transaction.aggregate([
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            volumePaise: { $sum: "$amountPaise" },
          },
        },
      ]),
      Transaction.aggregate([{ $group: { _id: "$riskLevel", count: { $sum: 1 } } }]),
      Transaction.aggregate([
        { $group: { _id: "$fraudDecision", count: { $sum: 1 } } },
      ]),
    ]);

  const risk = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const b of riskAgg) if (b._id && risk[b._id] !== undefined) risk[b._id] = b.count;

  const decisions = { COMPLETED: 0, VERIFICATION_REQUIRED: 0, BLOCKED: 0 };
  for (const b of decisionAgg)
    if (b._id && decisions[b._id] !== undefined) decisions[b._id] = b.count;

  return {
    users: { total: totalUsers, active: activeUsers, blocked: blockedUsers },
    transactions: {
      count: txAgg[0]?.count || 0,
      volumePaise: txAgg[0]?.volumePaise || 0,
    },
    risk,
    decisions,
    openFraudCases: await FraudLog.countDocuments({ reviewStatus: "OPEN" }),
  };
}

export async function getFraudTrend({ days = 14 } = {}) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const rows = await FraudLog.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
          riskLevel: "$riskLevel",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  return rows.map((row) => ({
    year: row._id.year,
    month: row._id.month,
    day: row._id.day,
    riskLevel: row._id.riskLevel,
    count: row.count,
  }));
}