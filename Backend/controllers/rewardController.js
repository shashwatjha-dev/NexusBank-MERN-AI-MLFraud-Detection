import Reward from "../models/Reward.js";
import { ok } from "../middleware/response.js";
import { AppError } from "../utils/errors.js";
import {
  redeemRewardPoints,
} from "../services/rewardService.js";

export async function listRewards(
  req,
  res,
  next
) {
  try {
    const entries =
      await Reward.find({
        user: req.user.userId,
      })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

    const balance =
      entries.reduce(
        (sum, entry) => {
          if (
            entry.type ===
            "REDEEMED"
          ) {
            return (
              sum -
              Math.abs(
                entry.points
              )
            );
          }

          return (
            sum +
            Math.max(
              entry.points || 0,
              0
            )
          );
        },
        0
      );

    return ok(res, {
      balance,
      entries,
    });
  } catch (error) {
    return next(error);
  }
}

export async function redeemRewards(
  req,
  res,
  next
) {
  try {
    const result =
      await redeemRewardPoints({
        userId:
          req.user.userId,
      });

    return ok(
      res,
      result,
      `Successfully redeemed ${result.pointsRedeemed} points and credited ₹${result.amountRupees.toFixed(
        2
      )} to your account.`
    );
  } catch (error) {
    if (
      error?.message ===
      "No reward points are available for redemption."
    ) {
      return next(
        new AppError(
          error.message,
          "NO_REWARD_POINTS",
          400
        )
      );
    }

    if (
      error?.message ===
      "No active primary account is available for reward credit."
    ) {
      return next(
        new AppError(
          error.message,
          "PRIMARY_ACCOUNT_NOT_AVAILABLE",
          409
        )
      );
    }

    if (
      error?.message ===
      "Unable to credit the primary account."
    ) {
      return next(
        new AppError(
          error.message,
          "REWARD_CREDIT_FAILED",
          409
        )
      );
    }

    return next(error);
  }
}