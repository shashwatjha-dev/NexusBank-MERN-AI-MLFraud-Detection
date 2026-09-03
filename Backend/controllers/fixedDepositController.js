import mongoose from "mongoose";
import FixedDeposit from "../models/FixedDeposit.js";
import Account from "../models/Account.js";
import { AppError } from "../utils/errors.js";
import { ok, created } from "../middleware/response.js";
import { ACCOUNT_STATUS } from "../utils/enums.js";
import { assertPaise } from "../utils/money.js";

/**
 * Fixed Deposit controller — Batch 6.
 *
 * Change vs. Batch 4:
 *   • Accepts optional `sourceAccountId` in the create payload. The FD is
 *     funded from that account. If omitted, the user's primary account is
 *     used (isPrimary=true), matching the legacy behaviour.
 *   • The atomic debit is now scoped to the chosen account.
 *   • On successful creation, a notification is emitted automatically via
 *     the Mongoose post('save') hook registered in notificationService.
 *
 * Maturity uses simple interest:
 *   maturity = principal * (1 + rate/100 * durationMonths/12)
 * All math stays in integer paise.
 */

async function resolveFundingAccount(userId, sourceAccountId) {
  if (sourceAccountId) {
    if (!mongoose.Types.ObjectId.isValid(sourceAccountId)) {
      throw new AppError("Invalid source account id.", "VALIDATION_ERROR", 400);
    }
    const account = await Account.findOne({ _id: sourceAccountId, user: userId });
    if (!account) {
      throw new AppError("Source account not found.", "ACCOUNT_NOT_FOUND", 404);
    }
    return account;
  }
  // Primary account fallback (Batch 1 introduced isPrimary).
  const primary = await Account.findOne({ user: userId, isPrimary: true });
  if (primary) return primary;
  const anyAccount = await Account.findOne({ user: userId });
  if (!anyAccount) {
    throw new AppError("Bank account not found.", "ACCOUNT_NOT_FOUND", 404);
  }
  return anyAccount;
}

export async function listFixedDeposits(req, res, next) {
  try {
    const deposits = await FixedDeposit.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    return ok(res, deposits);
  } catch (error) {
    return next(error);
  }
}

export async function getFixedDeposit(req, res, next) {
  try {
    const deposit = await FixedDeposit.findOne({
      _id: req.params.id,
      user: req.user.userId,
    }).lean();
    if (!deposit) {
      throw new AppError("Fixed deposit not found.", "RESOURCE_NOT_FOUND", 404);
    }
    return ok(res, deposit);
  } catch (error) {
    return next(error);
  }
}

export async function createFixedDeposit(req, res, next) {
  try {
    const { principalPaise, interestRate, durationMonths, sourceAccountId } = req.body;
    assertPaise(principalPaise);

    const account = await resolveFundingAccount(req.user.userId, sourceAccountId);
    if (account.status !== ACCOUNT_STATUS.ACTIVE) {
      throw new AppError(
        "Selected account is not available for creating deposits.",
        "ACCOUNT_FROZEN",
        403
      );
    }
    if ((account.availableBalancePaise ?? account.balancePaise) < principalPaise) {
      throw new AppError(
        "Available balance is insufficient for this deposit.",
        "INSUFFICIENT_BALANCE",
        400
      );
    }

    const maturityAmountPaise = Math.round(
      principalPaise * (1 + (interestRate / 100) * (durationMonths / 12))
    );
    const startDate = new Date();
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + durationMonths);

    // Atomic debit on the CHOSEN account.
    const updated = await Account.findOneAndUpdate(
      {
        _id: account._id,
        user: req.user.userId,
        status: ACCOUNT_STATUS.ACTIVE,
        availableBalancePaise: { $gte: principalPaise },
      },
      { $inc: { balancePaise: -principalPaise, availableBalancePaise: -principalPaise } },
      { new: true }
    );
    if (!updated) {
      throw new AppError(
        "Balance changed before completion.",
        "INSUFFICIENT_BALANCE",
        409
      );
    }

    const deposit = await FixedDeposit.create({
      user: req.user.userId,
      sourceAccountId: account._id,
      principalPaise,
      interestRate,
      durationMonths,
      maturityAmountPaise,
      startDate,
      maturityDate,
    });

    return created(res, deposit, "Fixed deposit created.");
  } catch (error) {
    return next(error);
  }
}