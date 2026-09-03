import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import FraudLog from "../models/FraudLog.js";
import AuditLog from "../models/AuditLog.js";
import Account from "../models/Account.js";
import FixedDeposit from "../models/FixedDeposit.js";
import mongoose from "mongoose";
import { AppError } from "../utils/errors.js";
import { ok } from "../middleware/response.js";
import { recordAudit } from "../services/auditService.js";
import { AUDIT_ACTIONS } from "../utils/enums.js";
import {
  getAdminOverview,
  getFraudTrend,
} from "../services/analyticsService.js";

/**
 * Admin controller. All admin routes are gated by `requireAuth + requireAdmin`
 * in the routes layer, so this controller does not re-check roles.
 *
 * Batch 7 additions:
 *   • accountsOverview — aggregate balances across all customers
 *   • ppfMetrics       — PPF adoption + total AUM
 *   • fdMetrics        — FD portfolio (active / matured, principal, maturity)
 *   • fraudStats       — decision counts + weekly trend + top rules
 */

/* ─────────────────────────  EXISTING ENDPOINTS  ───────────────────────── */

export async function overview(_req, res, next) {
  try {
    const [snapshot, trend] = await Promise.all([
      getAdminOverview(),
      getFraudTrend({ days: 14 }),
    ]);
    return ok(res, { snapshot, trend });
  } catch (error) {
    return next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const { search, role, blocked, limit, skip } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (typeof blocked === "boolean") filter.blocked = blocked;
    if (search) {
      const needle = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: needle }, { email: needle }, { accountNumber: needle }];
    }
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    return ok(res, { items, total, limit, skip });
  } catch (error) {
    return next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) throw new AppError("User not found.", "RESOURCE_NOT_FOUND", 404);
    const [transactions, fraudLogs, accounts, deposits] = await Promise.all([
      Transaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      FraudLog.find({ user: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      Account.find({ user: user._id }).lean(),
      FixedDeposit.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    return ok(res, { user, transactions, fraudLogs, accounts, deposits });
  } catch (error) {
    return next(error);
  }
}

async function setUserBlocked(req, res, next, blocked) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { blocked }, { new: true });
    if (!user) throw new AppError("User not found.", "RESOURCE_NOT_FOUND", 404);
    await recordAudit({
      actor: req.user.userId,
      targetUser: user._id,
      action: blocked ? AUDIT_ACTIONS.ADMIN_BLOCKED_USER : AUDIT_ACTIONS.ADMIN_UNBLOCKED_USER,
      requestId: req.requestId,
      ipAddress: req.ip,
    });
    return ok(res, user, blocked ? "User has been blocked." : "User has been unblocked.");
  } catch (error) {
    return next(error);
  }
}
export const blockUser = (req, res, next) => setUserBlocked(req, res, next, true);
export const unblockUser = (req, res, next) => setUserBlocked(req, res, next, false);

export async function listTransactionsAdmin(req, res, next) {
  try {
    const { userId, riskLevel, status, fraudDecision, limit, skip } = req.query;
    const filter = {};
    if (userId) filter.user = userId;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (status) filter.status = status;
    if (fraudDecision) filter.fraudDecision = fraudDecision;
    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .populate("user", "name email accountNumber")
        .populate("beneficiary", "name bankName")
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(filter),
    ]);
    return ok(res, { items, total, limit, skip });
  } catch (error) {
    return next(error);
  }
}

export async function listFraudLogsAdmin(req, res, next) {
  try {
    const { riskLevel, decision, reviewStatus, userId, limit, skip } = req.query;
    const filter = {};
    if (riskLevel) filter.riskLevel = riskLevel;
    if (decision) filter.decision = decision;
    if (reviewStatus) filter.reviewStatus = reviewStatus;
    if (userId) filter.user = userId;
    const [items, total] = await Promise.all([
      FraudLog.find(filter)
        .populate("user", "name email accountNumber")
        .populate("transaction")
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      FraudLog.countDocuments(filter),
    ]);
    return ok(res, { items, total, limit, skip });
  } catch (error) {
    return next(error);
  }
}

export async function getFraudLogAdmin(req, res, next) {
  try {
    const log = await FraudLog.findById(req.params.id)
      .populate("user", "name email accountNumber")
      .populate("transaction").lean();
    if (!log) throw new AppError("Fraud record not found.", "RESOURCE_NOT_FOUND", 404);
    return ok(res, log);
  } catch (error) {
    return next(error);
  }
}

export async function reviewFraudLog(req, res, next) {
  try {
    const { reviewStatus, reviewNotes } = req.body;
    const log = await FraudLog.findByIdAndUpdate(
      req.params.id,
      { reviewStatus, reviewNotes: reviewNotes || null, reviewedBy: req.user.userId, reviewedAt: new Date() },
      { new: true }
    );
    if (!log) throw new AppError("Fraud record not found.", "RESOURCE_NOT_FOUND", 404);
    await recordAudit({
      actor: req.user.userId,
      targetUser: log.user,
      action: AUDIT_ACTIONS.ADMIN_REVIEWED_FRAUD,
      metadata: { reviewStatus, fraudLogId: String(log._id) },
      requestId: req.requestId,
      ipAddress: req.ip,
    });
    return ok(res, log, "Fraud record reviewed.");
  } catch (error) {
    return next(error);
  }
}

export async function listAuditLogs(req, res, next) {
  try {
    const { action, actorId, targetUserId, limit, skip } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (actorId) filter.actor = actorId;
    if (targetUserId) filter.targetUser = targetUserId;
    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "name email role")
        .populate("targetUser", "name email")
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);
    return ok(res, { items, total, limit, skip });
  } catch (error) {
    return next(error);
  }
}

/* ─────────────────────────  BATCH 7 ADDITIONS  ───────────────────────── */

/**
 * GET /api/admin/accounts-overview
 * Aggregate of every customer account. Used by the admin dashboard.
 */
export async function accountsOverview(_req, res, next) {
  try {
    const [byType, byStatus, totals] = await Promise.all([
      Account.aggregate([
        { $group: { _id: "$accountType", count: { $sum: 1 }, totalPaise: { $sum: "$balancePaise" } } },
      ]),
      Account.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Account.aggregate([
        {
          $group: {
            _id: null,
            totalAccounts: { $sum: 1 },
            totalBalancePaise: { $sum: "$balancePaise" },
            totalAvailablePaise: { $sum: "$availableBalancePaise" },
          },
        },
      ]),
    ]);
    return ok(res, {
      totals: totals[0] || { totalAccounts: 0, totalBalancePaise: 0, totalAvailablePaise: 0 },
      byType,
      byStatus,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/ppf-metrics
 * PPF adoption (unique users) + AUM.
 */
export async function ppfMetrics(_req, res, next) {
  try {
    let PPF;
    try {
      PPF = mongoose.model("PPF");
    } catch {
      return ok(res, { enabled: false, message: "PPF module not loaded." });
    }
    const [totals] = await PPF.aggregate([
      {
        $group: {
          _id: null,
          accounts: { $sum: 1 },
          totalBalancePaise: { $sum: "$balancePaise" },
          totalContributedPaise: { $sum: "$totalContributedPaise" },
        },
      },
    ]);
    return ok(res, {
      enabled: true,
      accounts: totals?.accounts || 0,
      totalBalancePaise: totals?.totalBalancePaise || 0,
      totalContributedPaise: totals?.totalContributedPaise || 0,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/fd-metrics
 * FD portfolio.
 */
export async function fdMetrics(_req, res, next) {
  try {
    const [byStatus, totals] = await Promise.all([
      FixedDeposit.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            principalPaise: { $sum: "$principalPaise" },
            maturityPaise: { $sum: "$maturityAmountPaise" },
          },
        },
      ]),
      FixedDeposit.aggregate([
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalPrincipalPaise: { $sum: "$principalPaise" },
            totalMaturityPaise: { $sum: "$maturityAmountPaise" },
          },
        },
      ]),
    ]);
    return ok(res, {
      totals: totals[0] || { totalCount: 0, totalPrincipalPaise: 0, totalMaturityPaise: 0 },
      byStatus,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/admin/fraud-stats
 * Extended fraud-engine metrics for the admin dashboard.
 */
export async function fraudStats(req, res, next) {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 180);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [byDecision, byRisk, topRules, mlStatus] = await Promise.all([
      Transaction.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$fraudDecision", count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $unwind: "$triggeredRules" },
        {
          $group: {
            _id: "$triggeredRules.id",
            count: { $sum: 1 },
            label: { $first: "$triggeredRules.label" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$mlServiceStatus", count: { $sum: 1 } } },
      ]),
    ]);

    return ok(res, {
      windowDays: days,
      byDecision,
      byRisk,
      topRules,
      mlServiceStatus: mlStatus,
    });
  } catch (error) {
    return next(error);
  }
}