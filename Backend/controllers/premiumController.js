import {
  getPremiumStatus,
  upgradeToPremium,
  PREMIUM_PLAN,
} from "../services/premiumService.js";

import { ok } from "../middleware/response.js";

export async function premiumStatus(
  req,
  res,
  next
) {
  try {
    const status =
      await getPremiumStatus(
        req.user.userId
      );

    return ok(res, {
      ...status,
      plan: PREMIUM_PLAN,
    });
  } catch (error) {
    return next(error);
  }
}

export async function premiumUpgrade(
  req,
  res,
  next
) {
  try {
    const {
      sourceAccountId,
      idempotencyKey,
    } = req.body || {};

    const result =
      await upgradeToPremium({
        userId:
          req.user.userId,

        sourceAccountId,

        idempotencyKey,

        ipAddress:
          req.ip,

        requestId:
          req.requestId,
      });

    return ok(
      res,
      result,
      result.duplicated
        ? "Premium payment request already completed."
        : "NexusBank Premium activated successfully."
    );
  } catch (error) {
    return next(error);
  }
}