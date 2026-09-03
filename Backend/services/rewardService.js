import Reward from "../models/Reward.js";
import Alert from "../models/Alert.js";

/**
 * Award reward points after a successful transfer.
 *
 * ₹100 = 1 point
 * Minimum = 1 point
 */
export async function awardTransferReward({
  userId,
  amountPaise,
}) {
  const amount = Number(amountPaise);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const points = Math.max(
    1,
    Math.floor(amount / 10_000)
  );

  const reward = await Reward.create({
    user: userId,
    points,
    type: "EARNED",
    reason: `Transfer reward · ₹${(
      amount / 100
    ).toFixed(2)} transfer`,
  });

  try {
    await Alert.create({
      user: userId,
      title: "Reward points earned",
      message: `You earned ${points} reward ${
        points === 1 ? "point" : "points"
      } for your ₹${(amount / 100).toFixed(2)} transfer.`,
      type: "REWARD",
      severity: "INFO",
      read: false,
      metadata: {
        rewardId: String(reward._id),
        points,
        amountPaise: amount,
        amountRupees: amount / 100,
        event: "TRANSFER_REWARD",
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "REWARD_ALERT_CREATE_FAILED",
        user: String(userId),
        message: error?.message,
      })
    );
  }

  return reward.toObject();
}

/**
 * Redeem all available reward points.
 *
 * 1 point = ₹1
 *
 * The available reward balance is calculated from the reward ledger.
 * The money is credited to the authenticated user's primary ACTIVE
 * account.
 */
export async function redeemRewardPoints({
  userId,
}) {
  const Account =
    (await import("../models/Account.js")).default;

  const userObjectId = userId;

  const entries = await Reward.find({
    user: userObjectId,
  })
    .select("points type")
    .lean();

  const availablePoints = entries.reduce(
    (sum, entry) => {
      if (entry.type === "REDEEMED") {
        return sum - Math.abs(Number(entry.points) || 0);
      }

      return (
        sum +
        Math.max(
          Number(entry.points) || 0,
          0
        )
      );
    },
    0
  );

  if (availablePoints <= 0) {
    throw new Error(
      "No reward points are available for redemption."
    );
  }

  const account =
    await Account.findOne({
      user: userObjectId,
      isPrimary: true,
      status: "ACTIVE",
    });

  if (!account) {
    throw new Error(
      "No active primary account is available for reward credit."
    );
  }

  const amountPaise =
    availablePoints * 100;

  const creditedAccount =
    await Account.findOneAndUpdate(
      {
        _id: account._id,
        user: userObjectId,
        isPrimary: true,
        status: "ACTIVE",
      },
      {
        $inc: {
          balancePaise: amountPaise,
          availableBalancePaise: amountPaise,
        },
      },
      {
        new: true,
      }
    );

  if (!creditedAccount) {
    throw new Error(
      "Unable to credit the primary account."
    );
  }

  let reward;

  try {
    reward = await Reward.create({
      user: userObjectId,
      points: availablePoints,
      type: "REDEEMED",
      reason: `Redeemed ${availablePoints} points · ₹${(
        amountPaise / 100
      ).toFixed(2)} account credit`,
    });
  } catch (error) {
    await Account.updateOne(
      {
        _id: account._id,
        user: userObjectId,
      },
      {
        $inc: {
          balancePaise: -amountPaise,
          availableBalancePaise: -amountPaise,
        },
      }
    );

    throw error;
  }

  try {
    await Alert.create({
      user: userObjectId,
      title: "Reward redeemed",
      message: `${availablePoints} reward points were redeemed and ₹${(
        amountPaise / 100
      ).toFixed(2)} was credited to your primary account.`,
      type: "REWARD",
      severity: "INFO",
      read: false,
      metadata: {
        rewardId: String(reward._id),
        accountId: String(account._id),
        points: availablePoints,
        amountPaise,
        amountRupees:
          amountPaise / 100,
        event: "REWARD_REDEMPTION",
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event:
          "REDEEM_REWARD_ALERT_CREATE_FAILED",
        user: String(userId),
        rewardId: String(reward._id),
        message: error?.message,
      })
    );
  }

  return {
    reward: reward.toObject(),
    pointsRedeemed: availablePoints,
    amountPaise,
    amountRupees:
      amountPaise / 100,
    account: {
      _id: creditedAccount._id,
      accountNumber:
        creditedAccount.accountNumber,
      balancePaise:
        creditedAccount.balancePaise,
      availableBalancePaise:
        creditedAccount.availableBalancePaise,
    },
  };
}