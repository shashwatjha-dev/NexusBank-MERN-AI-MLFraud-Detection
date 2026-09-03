import crypto from "node:crypto";

import Account from "../models/Account.js";
import PremiumPayment from "../models/PremiumPayment.js";
import PremiumSubscription from "../models/PremiumSubscription.js";

import { AppError } from "../utils/errors.js";
import { ACCOUNT_STATUS } from "../utils/enums.js";

const PREMIUM_PRICE_PAISE = 49900; // ₹499
const PREMIUM_DURATION_DAYS = 365;

function makeIdempotencyKey(value) {
  return String(value || "").trim();
}

function generateReference() {
  return `NBP-${Date.now()}-${crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase()}`;
}

function getExpiryDate() {
  return new Date(
    Date.now() +
      PREMIUM_DURATION_DAYS *
        24 *
        60 *
        60 *
        1000
  );
}

export async function getPremiumStatus(userId) {
  const subscription =
    await PremiumSubscription.findOne({
      user: userId,
      status: "ACTIVE",
    })
      .populate(
        "sourceAccount",
        "accountNumber accountType label"
      )
      .populate(
        "payment",
        "reference amountPaise createdAt status"
      )
      .lean();

  if (!subscription) {
    return {
      active: false,
      plan: "PREMIUM",
      pricePaise: PREMIUM_PRICE_PAISE,
    };
  }

  if (
    subscription.expiresAt &&
    subscription.expiresAt <= new Date()
  ) {
    await PremiumSubscription.updateOne(
      {
        _id: subscription._id,
        status: "ACTIVE",
      },
      {
        $set: {
          status: "EXPIRED",
        },
      }
    );

    return {
      active: false,
      plan: "PREMIUM",
      pricePaise: PREMIUM_PRICE_PAISE,
    };
  }

  return {
    active: true,
    plan: subscription.plan,
    status: subscription.status,
    pricePaise: subscription.pricePaise,
    startedAt: subscription.startedAt,
    expiresAt: subscription.expiresAt,
    sourceAccount: subscription.sourceAccount,
    payment: subscription.payment,
  };
}

export async function upgradeToPremium({
  userId,
  sourceAccountId,
  idempotencyKey,
  ipAddress,
  requestId,
}) {
  const safeKey =
    makeIdempotencyKey(idempotencyKey);

  if (!safeKey) {
    throw new AppError(
      "A payment idempotency key is required.",
      "IDEMPOTENCY_KEY_REQUIRED",
      400
    );
  }

  /*
   * ----------------------------------------------------------
   * IDEMPOTENCY
   * ----------------------------------------------------------
   *
   * Same request must never debit twice.
   */

  const existingPayment =
    await PremiumPayment.findOne({
      user: userId,
      idempotencyKey: safeKey,
    })
      .populate(
        "sourceAccount",
        "accountNumber accountType label balancePaise availableBalancePaise"
      )
      .lean();

  if (existingPayment) {
    const existingSubscription =
      await PremiumSubscription.findOne({
        user: userId,
      }).lean();

    return {
      duplicated: true,
      payment: existingPayment,
      subscription:
        existingSubscription,
    };
  }

  /*
   * ----------------------------------------------------------
   * EXISTING PREMIUM CHECK
   * ----------------------------------------------------------
   */

  const current =
    await PremiumSubscription.findOne({
      user: userId,
      status: "ACTIVE",
      expiresAt: {
        $gt: new Date(),
      },
    });

  if (current) {
    throw new AppError(
      "Your NexusBank Premium membership is already active.",
      "PREMIUM_ALREADY_ACTIVE",
      409
    );
  }

  /*
   * ----------------------------------------------------------
   * SOURCE ACCOUNT
   * ----------------------------------------------------------
   */

  let sourceAccount = null;

  if (sourceAccountId) {
    sourceAccount =
      await Account.findOne({
        _id: sourceAccountId,
        user: userId,
        status: ACCOUNT_STATUS.ACTIVE,
      });
  } else {
    sourceAccount =
      await Account.findOne({
        user: userId,
        status: ACCOUNT_STATUS.ACTIVE,
        isPrimary: true,
      });

    if (!sourceAccount) {
      sourceAccount =
        await Account.findOne({
          user: userId,
          status: ACCOUNT_STATUS.ACTIVE,
        }).sort({
          createdAt: 1,
        });
    }
  }

  if (!sourceAccount) {
    throw new AppError(
      "No active bank account is available for this payment.",
      "SOURCE_ACCOUNT_NOT_FOUND",
      404
    );
  }

  /*
   * ----------------------------------------------------------
   * ATOMIC DEBIT
   * ----------------------------------------------------------
   *
   * This is the important part.
   *
   * MongoDB only performs the debit if the current available
   * balance is still >= ₹499.
   *
   * Therefore two simultaneous requests cannot both spend
   * the same ₹499.
   */

  const debitedAccount =
    await Account.findOneAndUpdate(
      {
        _id: sourceAccount._id,
        user: userId,
        status: ACCOUNT_STATUS.ACTIVE,
        availableBalancePaise: {
          $gte: PREMIUM_PRICE_PAISE,
        },
      },
      {
        $inc: {
          balancePaise:
            -PREMIUM_PRICE_PAISE,

          availableBalancePaise:
            -PREMIUM_PRICE_PAISE,
        },
      },
      {
        new: true,
      }
    );

  if (!debitedAccount) {
    throw new AppError(
      "Insufficient available balance for the ₹499 Premium upgrade.",
      "INSUFFICIENT_BALANCE",
      409
    );
  }

  const balanceAfter =
    debitedAccount.balancePaise;

  const balanceBefore =
    balanceAfter +
    PREMIUM_PRICE_PAISE;

  const reference =
    generateReference();

  let payment;

  try {
    payment =
      await PremiumPayment.create({
        user: userId,
        sourceAccount:
          debitedAccount._id,
        amountPaise:
          PREMIUM_PRICE_PAISE,
        balanceBeforePaise:
          balanceBefore,
        balanceAfterPaise:
          balanceAfter,
        status: "COMPLETED",
        reference,
        idempotencyKey: safeKey,
      });

    const subscription =
      await PremiumSubscription.create({
        user: userId,
        plan: "PREMIUM",
        status: "ACTIVE",
        pricePaise:
          PREMIUM_PRICE_PAISE,
        startedAt: new Date(),
        expiresAt: getExpiryDate(),
        sourceAccount:
          debitedAccount._id,
        payment: payment._id,
      });

    return {
      duplicated: false,

      payment:
        payment.toJSON(),

      subscription:
        subscription.toJSON(),

      account: {
        _id:
          debitedAccount._id,

        accountNumber:
          debitedAccount.accountNumber,

        accountType:
          debitedAccount.accountType,

        balanceBeforePaise:
          balanceBefore,

        balanceAfterPaise:
          balanceAfter,
      },
    };
  } catch (error) {
    /*
     * --------------------------------------------------------
     * COMPENSATING REFUND
     * --------------------------------------------------------
     *
     * If the payment/subscription records cannot be created
     * after the debit, restore the exact ₹499.
     */

    await Account.updateOne(
      {
        _id: debitedAccount._id,
        user: userId,
      },
      {
        $inc: {
          balancePaise:
            PREMIUM_PRICE_PAISE,

          availableBalancePaise:
            PREMIUM_PRICE_PAISE,
        },
      }
    );

    /*
     * Unique idempotency collision can happen under a race.
     * In that case return the already-created payment instead
     * of treating it as another purchase.
     */

    if (
      error?.code === 11000
    ) {
      const racePayment =
        await PremiumPayment.findOne({
          user: userId,
          idempotencyKey: safeKey,
        }).lean();

      if (racePayment) {
        const raceSubscription =
          await PremiumSubscription.findOne({
            user: userId,
          }).lean();

        return {
          duplicated: true,
          payment: racePayment,
          subscription:
            raceSubscription,
        };
      }
    }

    throw new AppError(
      "Premium payment could not be completed. Your ₹499 has been restored.",
      "PREMIUM_PAYMENT_FAILED",
      502
    );
  }
}

export const PREMIUM_PLAN = {
  name: "NexusBank Premium",
  pricePaise: PREMIUM_PRICE_PAISE,
  durationDays:
    PREMIUM_DURATION_DAYS,

  features: [
    "Higher transfer limits",
    "Advanced spending insights",
    "Enhanced card controls",
    "Priority customer support",
    "Premium rewards",
    "Extended account controls",
  ],
};