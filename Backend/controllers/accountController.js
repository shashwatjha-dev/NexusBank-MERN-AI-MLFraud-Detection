import crypto from "node:crypto";
import Account from "../models/Account.js";
import { AppError } from "../utils/errors.js";
import { ok, created } from "../middleware/response.js";
import {
  ACCOUNT_STATUS,
  ACCOUNT_TYPE,
  SECURITY_EVENTS,
  AUDIT_ACTIONS,
} from "../utils/enums.js";
import { recordAudit, recordSecurityEvent } from "../services/auditService.js";
import {
  getCustomerOverview,
  getSpendingByCategory,
  getMonthlyCashFlow,
} from "../services/analyticsService.js";

/**
 * Account controller — read-only for balances (mutations happen only inside
 * transferService / fixedDepositController) plus additive Phase 5 endpoints
 * for multi-account: create + set-primary.
 */

const DEFAULT_IFSC = "NEXB0000001";
const DEFAULT_BRANCH = "NexusBank — Bengaluru Central";

async function generateUniqueAccountNumber() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = crypto.randomInt(10_000_000, 100_000_000).toString();
    const candidate = `4829${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Account.exists({ accountNumber: candidate });
    if (!exists) return candidate;
  }
  throw new AppError(
    "Could not allocate a fresh account number. Please retry.",
    "ACCOUNT_NUMBER_ALLOCATION_FAILED",
    500
  );
}

export async function listAccounts(req, res, next) {
  try {
    const accounts = await Account.find({ user: req.user.userId })
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean();
    return ok(res, accounts);
  } catch (error) {
    return next(error);
  }
}

export async function getAccount(req, res, next) {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user.userId,
    }).lean();
    if (!account) {
      throw new AppError("Account not found.", "RESOURCE_NOT_FOUND", 404);
    }
    return ok(res, account);
  } catch (error) {
    return next(error);
  }
}

/**
 * Dashboard overview. Optional `?accountId=` scopes the aggregations to a
 * single account; if omitted the primary account is used (preserving the
 * previous single-account behaviour for older frontends).
 */
export async function getOverview(req, res, next) {
  try {
    const userId = req.user.userId;
    const accountId = req.query.accountId || null;

    const [overview, spending, cashflow, accounts] = await Promise.all([
      getCustomerOverview(userId, { accountId }),
      getSpendingByCategory(userId, { accountId }),
      getMonthlyCashFlow(userId, { accountId }),
      Account.find({ user: userId })
        .sort({ isPrimary: -1, createdAt: 1 })
        .lean(),
    ]);

    const totalBalancePaise = accounts.reduce(
      (sum, a) => sum + (a.balancePaise || 0),
      0
    );
    const totalAvailablePaise = accounts.reduce(
      (sum, a) => sum + (a.availableBalancePaise || 0),
      0
    );

    return ok(res, {
      overview,
      spending,
      cashflow,
      accounts,
      totals: { balancePaise: totalBalancePaise, availableBalancePaise: totalAvailablePaise },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/accounts — open a new banking account for the authenticated user.
 * The first account for a user is always marked primary automatically; any
 * subsequent account starts non-primary and can be promoted later.
 */
export async function createAccount(req, res, next) {
  try {
    const userId = req.user.userId;
    const { accountType, label } = req.body;

    if (!Object.values(ACCOUNT_TYPE).includes(accountType)) {
      throw new AppError("Unsupported account type.", "VALIDATION_ERROR", 400);
    }

    const existingCount = await Account.countDocuments({ user: userId });
    const accountNumber = await generateUniqueAccountNumber();

    const account = await Account.create({
      user: userId,
      accountNumber,
      accountType,
      label: label?.trim() || null,
      ifsc: DEFAULT_IFSC,
      branch: DEFAULT_BRANCH,
      balancePaise: 66766000,
availableBalancePaise: 66766000,
      currency: "INR",
      status: ACCOUNT_STATUS.ACTIVE,
      isPrimary: existingCount === 0, // first account of a user is primary
    });

    await recordSecurityEvent({
      user: userId,
      eventType: SECURITY_EVENTS.ACCOUNT_OPENED,
      ipAddress: req.ip,
      metadata: { accountId: String(account._id), accountType },
    });
    await recordAudit({
      actor: userId,
      targetUser: userId,
      action: AUDIT_ACTIONS.ACCOUNT_OPENED,
      metadata: { accountId: String(account._id), accountType, accountNumber },
      requestId: req.requestId,
      ipAddress: req.ip,
    });

    return created(res, account.toObject(), "Account opened.");
  } catch (error) {
    return next(error);
  }
}

/**
 * PUT /api/accounts/:id/primary — promote an account to primary.
 * Uses a two-step update (demote current primary, then promote target) so
 * the partial unique index on `{ user, isPrimary }` never conflicts.
 */
export async function setPrimaryAccount(req, res, next) {
  try {
    const userId = req.user.userId;
    const target = await Account.findOne({
      _id: req.params.id,
      user: userId,
      status: ACCOUNT_STATUS.ACTIVE,
    });
    if (!target) {
      throw new AppError("Account not found.", "RESOURCE_NOT_FOUND", 404);
    }
    if (target.isPrimary) {
      return ok(res, target.toObject(), "Account is already primary.");
    }

    // Two-step to satisfy the partial unique index.
    await Account.updateMany(
      { user: userId, isPrimary: true },
      { $set: { isPrimary: false } }
    );
    target.isPrimary = true;
    await target.save();

    await recordSecurityEvent({
      user: userId,
      eventType: SECURITY_EVENTS.ACCOUNT_PRIMARY_CHANGED,
      ipAddress: req.ip,
      metadata: { accountId: String(target._id) },
    });
    await recordAudit({
      actor: userId,
      targetUser: userId,
      action: AUDIT_ACTIONS.ACCOUNT_PRIMARY_CHANGED,
      metadata: { accountId: String(target._id) },
      requestId: req.requestId,
      ipAddress: req.ip,
    });

    return ok(res, target.toObject(), "Primary account updated.");
  } catch (error) {
    return next(error);
  }
}