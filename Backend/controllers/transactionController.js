import Transaction from "../models/Transaction.js";
import { AppError } from "../utils/errors.js";
import { ok } from "../middleware/response.js";

/**
 * Read-only listing / detail for the signed-in customer's transactions.
 * Filters and pagination come from validated query parameters (Batch 2).
 */

export async function listTransactions(req, res, next) {
  try {
    const { limit, skip, riskLevel, status } = req.query;

    const filter = { user: req.user.userId };
    if (riskLevel) filter.riskLevel = riskLevel;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Transaction.find(filter)
        .populate("beneficiary", "name bankName accountNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    return ok(res, { items, total, limit, skip });
  } catch (error) {
    return next(error);
  }
}

export async function getTransaction(req, res, next) {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.userId,
    })
      .populate("beneficiary", "name bankName accountNumber")
      .lean();

    if (!transaction) {
      throw new AppError("Transaction not found.", "RESOURCE_NOT_FOUND", 404);
    }
    return ok(res, transaction);
  } catch (error) {
    return next(error);
  }
}