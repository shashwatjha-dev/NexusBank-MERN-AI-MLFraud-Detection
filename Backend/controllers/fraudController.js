import FraudLog from "../models/FraudLog.js";
import Transaction from "../models/Transaction.js";
import SecurityEvent from "../models/SecurityEvent.js";
import Device from "../models/Device.js";
import { AppError } from "../utils/errors.js";
import { ok } from "../middleware/response.js";
import { RISK_LEVEL } from "../utils/enums.js";

/**
 * Customer-facing fraud & security views.
 *
 *   GET /api/fraud/overview      → security summary (score, devices, events)
 *   GET /api/fraud/logs          → the user's own fraud events
 *   GET /api/fraud/logs/:id      → single fraud event with full explanation
 */

export async function overview(req, res, next) {
  try {
    const userId = req.user.userId;
    const [devices, recentEvents, openFraudCount, lastFraud] = await Promise.all([
      Device.find({ user: userId }).sort({ lastSeenAt: -1 }).limit(10).lean(),
      SecurityEvent.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      FraudLog.countDocuments({ user: userId, riskLevel: { $ne: RISK_LEVEL.LOW } }),
      FraudLog.findOne({ user: userId }).sort({ createdAt: -1 }).lean(),
    ]);

    return ok(res, {
      devices,
      recentEvents,
      openFraudCount,
      lastFraud,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listFraudLogs(req, res, next) {
  try {
    const items = await FraudLog.find({ user: req.user.userId })
      .populate("transaction", "amountPaise createdAt beneficiary")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return ok(res, items);
  } catch (error) {
    return next(error);
  }
}

export async function getFraudLog(req, res, next) {
  try {
    const log = await FraudLog.findOne({
      _id: req.params.id,
      user: req.user.userId,
    })
      .populate("transaction")
      .lean();

    if (!log) {
      throw new AppError("Fraud record not found.", "RESOURCE_NOT_FOUND", 404);
    }
    return ok(res, log);
  } catch (error) {
    return next(error);
  }
}