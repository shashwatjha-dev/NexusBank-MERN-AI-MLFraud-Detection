import mongoose from "mongoose";
import crypto from "node:crypto";
import PPF from "../models/PPF.js";
import PPFContribution from "../models/PPFContribution.js";
import Account from "../models/Account.js";
import LedgerEntry from "../models/LedgerEntry.js";
import { AppError } from "../utils/errors.js";
import { assertPaise } from "../utils/money.js";
import { ACCOUNT_STATUS } from "../utils/enums.js";
/**
 * PPF business rules (portfolio simulation).
 *
 * Env-driven configuration:
 *   PPF_INTEREST_RATE                       default 7.1
 *   PPF_ANNUAL_LIMIT_PAISE                  default 15000000 (₹1.5 lakh)
 *   PPF_MIN_CONTRIBUTION_PAISE              default 50000    (₹500)
 *   PPF_DEMO_TIME_SCALE_MONTHS_PER_YEAR     default 12  (real time)
 *
 * The time-scale env lets the demo compress maturity: setting it to 1 means
 * "1 real month == 1 simulated year", so a 15-year PPF matures in 15 months.
 */

const DEFAULT_RATE = 7.1;
const DEFAULT_ANNUAL_LIMIT = 15_000_000;
const DEFAULT_MIN = 50_000;
const DEFAULT_SCALE_MONTHS = 12;

function config() {
  const rate = parseFloat(process.env.PPF_INTEREST_RATE);
  const limit = parseInt(process.env.PPF_ANNUAL_LIMIT_PAISE, 10);
  const min = parseInt(process.env.PPF_MIN_CONTRIBUTION_PAISE, 10);
  const scale = parseInt(process.env.PPF_DEMO_TIME_SCALE_MONTHS_PER_YEAR, 10);
  return {
    interestRate: Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_RATE,
    annualLimitPaise: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_ANNUAL_LIMIT,
    minContributionPaise: Number.isFinite(min) && min > 0 ? min : DEFAULT_MIN,
    scaleMonthsPerYear:
      Number.isFinite(scale) && scale > 0 && scale <= 12 ? scale : DEFAULT_SCALE_MONTHS,
  };
}

function currentFinancialYear(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based; Apr = 3
  const startYear = month >= 3 ? year : year - 1;
  const endYearSuffix = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYearSuffix}`;
}

async function generateUniquePpfNumber() {
  for (let i = 0; i < 6; i += 1) {
    const suffix = crypto.randomInt(10_000_000, 100_000_000).toString();
    const candidate = `PPF-${suffix}`;
    const exists = await PPF.exists({ accountNumber: candidate });
    if (!exists) return candidate;
  }
  throw new AppError("Could not allocate PPF account number.", "PPF_ALLOC_FAILED", 500);
}

// ---------- public API ----------

export async function getPpfSummary(userId) {
  const ppf = await PPF.findOne({ user: userId }).lean();
  const cfg = config();
  if (!ppf) return { exists: false, config: cfg };

  const fy = currentFinancialYear();
  const contributionsThisFy = await PPFContribution.aggregate([
    { $match: { user: ppf.user, financialYear: fy } },
    { $group: { _id: null, total: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
  ]);
  const contributedThisYearPaise = contributionsThisFy[0]?.total || 0;

  return {
    exists: true,
    ppf,
    config: cfg,
    financialYear: fy,
    contributedThisYearPaise,
    remainingThisYearPaise: Math.max(0, cfg.annualLimitPaise - contributedThisYearPaise),
    contributionCountThisYear: contributionsThisFy[0]?.count || 0,
  };
}

export async function listPpfContributions(userId, { limit = 100 } = {}) {
  const ppf = await PPF.findOne({ user: userId }).lean();
  if (!ppf) return [];
  return PPFContribution.find({ ppf: ppf._id })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 500))
    .lean();
}

/**
 * Opens a PPF certificate for the user. Idempotent: returns the existing
 * PPF if one already exists (no duplicate).
 */
export async function openPpf({ userId }) {
  const existing = await PPF.findOne({ user: userId });
  if (existing) return existing.toObject();

  const cfg = config();
  const now = new Date();
  const scaleFactor = cfg.scaleMonthsPerYear / 12; // e.g. 1/12 for demo
  const maturityMonths = Math.round(15 * 12 * scaleFactor);
  const maturityDate = new Date(now);
  maturityDate.setMonth(maturityDate.getMonth() + maturityMonths);

  const created = await PPF.create({
    user: userId,
    accountNumber: await generateUniquePpfNumber(),
    balancePaise: 0,
    totalContributedPaise: 0,
    totalInterestPaise: 0,
    interestRate: cfg.interestRate,
    openedAt: now,
    maturityDate,
    status: "ACTIVE",
  });
  return created.toObject();
}

/**
 * Records a fresh contribution. The debit on the source account and the
 * matching ledger entries are atomic: if the debit fails, no PPF state
 * changes; if the PPF update fails, the source is compensated back.
 */
export async function contribute({ userId, sourceAccountId, amountPaise, note }) {
  assertPaise(amountPaise);
  const cfg = config();

  if (amountPaise < cfg.minContributionPaise) {
    throw new AppError(
      `Minimum PPF contribution is ${cfg.minContributionPaise / 100} rupees.`,
      "PPF_MIN_CONTRIBUTION",
      400
    );
  }

  const ppf = await PPF.findOne({ user: userId });
  if (!ppf) throw new AppError("Open a PPF account first.", "PPF_NOT_OPENED", 404);
  if (ppf.status !== "ACTIVE") {
    throw new AppError("This PPF account is not active.", "PPF_NOT_ACTIVE", 409);
  }

  // Annual limit check.
  const fy = currentFinancialYear();
  const priorFyAgg = await PPFContribution.aggregate([
    { $match: { user: ppf.user, financialYear: fy } },
    { $group: { _id: null, total: { $sum: "$amountPaise" } } },
  ]);
  const priorThisFy = priorFyAgg[0]?.total || 0;
  if (priorThisFy + amountPaise > cfg.annualLimitPaise) {
    const remaining = Math.max(0, cfg.annualLimitPaise - priorThisFy);
    throw new AppError(
      `Annual PPF limit exceeded. You may still contribute ${(remaining / 100).toFixed(2)} this year.`,
      "PPF_ANNUAL_LIMIT",
      400
    );
  }

  // Resolve source account (defaults to primary).
  const source = sourceAccountId
    ? await Account.findOne({ _id: sourceAccountId, user: userId })
    : await Account.findOne({ user: userId, isPrimary: true })
      || (await Account.findOne({ user: userId }).sort({ createdAt: 1 }));

  if (!source) throw new AppError("Source account not found.", "ACCOUNT_NOT_FOUND", 404);
  if (source.status !== ACCOUNT_STATUS.ACTIVE) {
    throw new AppError("Source account is not active.", "ACCOUNT_FROZEN", 403);
  }
  if (source.availableBalancePaise < amountPaise) {
    throw new AppError("Available balance is insufficient.", "INSUFFICIENT_BALANCE", 400);
  }

  // 1. Atomic debit on source.
  const debited = await Account.findOneAndUpdate(
    {
      _id: source._id,
      user: userId,
      status: ACCOUNT_STATUS.ACTIVE,
      availableBalancePaise: { $gte: amountPaise },
    },
    { $inc: { balancePaise: -amountPaise, availableBalancePaise: -amountPaise } },
    { new: true }
  );
  if (!debited) {
    throw new AppError("Balance changed before completion.", "INSUFFICIENT_BALANCE", 409);
  }
  const sourceBalanceAfter = debited.balancePaise;
  const sourceBalanceBefore = sourceBalanceAfter + amountPaise;

  // 2. Increment PPF balance + contribution total.
  let updatedPpf;
  try {
    updatedPpf = await PPF.findOneAndUpdate(
      { _id: ppf._id, status: "ACTIVE" },
      { $inc: { balancePaise: amountPaise, totalContributedPaise: amountPaise } },
      { new: true }
    );
    if (!updatedPpf) throw new Error("PPF update returned null.");
  } catch (error) {
    // Compensate the debit.
    await Account.updateOne(
      { _id: source._id },
      { $inc: { balancePaise: amountPaise, availableBalancePaise: amountPaise } }
    );
    throw new AppError(
      "Could not credit the PPF account. Source was refunded.",
      "PPF_CREDIT_FAILED",
      500
    );
  }

  // 3. Ledger + contribution ledger row.
  const reference = `ppf-${new mongoose.Types.ObjectId().toString()}`;
  const contribution = await PPFContribution.create({
    ppf: ppf._id,
    user: userId,
    sourceAccountId: source._id,
    amountPaise,
    financialYear: fy,
    balanceAfterPaise: updatedPpf.balancePaise,
    ledgerReference: reference,
    note: note || null,
  });

  await LedgerEntry.create({
    transaction: contribution._id, // placeholder — LedgerEntry.transaction is required
    account: source._id,
    user: userId,
    direction: "DEBIT",
    entryType: "PPF_DEBIT",
    amountPaise,
    balanceBeforePaise: sourceBalanceBefore,
    balanceAfterPaise: sourceBalanceAfter,
    reference,
    counterpartyAccount: null,
    counterpartyName: `PPF · ${updatedPpf.accountNumber}`,
    counterpartyIfsc: "NEXB0000001",
    counterpartyAccountNumber: updatedPpf.accountNumber,
    description: note || "PPF contribution",
    category: "PPF",
  });

  return {
    contribution: contribution.toObject(),
    ppf: updatedPpf.toObject(),
    source: {
      _id: source._id,
      balancePaise: sourceBalanceAfter,
      availableBalancePaise: debited.availableBalancePaise,
    },
  };
}