import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import User from "../models/User.js";
import Beneficiary from "../models/Beneficiary.js";
import { AppError } from "../utils/errors.js";
import { generateReceiptPdf } from "../services/pdfService.js";

/**
 * GET /api/receipts/transactions/:id.pdf
 *
 * Streams a NexusBank PDF receipt for a single transaction owned by the
 * signed-in customer. Never exposes another user's transactions.
 */
export async function downloadTransactionReceipt(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid transaction id.", "VALIDATION_ERROR", 400);
    }

    const transaction = await Transaction.findOne({
      _id: id,
      user: req.user.userId,
    }).lean();
    if (!transaction) {
      throw new AppError("Transaction not found.", "RESOURCE_NOT_FOUND", 404);
    }

    const [user, beneficiary, account] = await Promise.all([
      User.findById(req.user.userId).lean(),
      transaction.beneficiary
        ? Beneficiary.findById(transaction.beneficiary).lean()
        : null,
      transaction.sourceAccountId
        ? Account.findById(transaction.sourceAccountId).lean()
        : Account.findOne({ user: req.user.userId }).lean(),
    ]);

    return generateReceiptPdf(res, { transaction, user, account, beneficiary });
  } catch (error) {
    return next(error);
  }
}