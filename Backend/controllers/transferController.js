import {
  processTransferRequest,
  verifyPendingTransfer,
  resendTransferOtp,
} from "../services/transferService.js";
import { ok, created } from "../middleware/response.js";
import { recordAudit } from "../services/auditService.js";
import { AUDIT_ACTIONS } from "../utils/enums.js";

/**
 * Transfer controller — extremely thin. All money math, fraud analysis,
 * idempotency, atomic debits, ledger writes, and FraudLog writes happen
 * inside transferService.
 */

export async function createTransfer(req, res, next) {
  try {
    const {
      beneficiaryId,
      sourceAccountId,
      amountPaise,
      description,
      category,
      idempotencyKey,
      deviceIdentifier,
      browser,
      operatingSystem,
    } = req.body;

    const { transaction, duplicated } = await processTransferRequest({
      userId: req.user.userId,
      beneficiaryId,
      sourceAccountId,
      amountPaise,
      description,
      category,
      idempotencyKey,
      deviceIdentifier,
      browser,
      operatingSystem,
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    if (duplicated) {
      return ok(res, transaction, "Duplicate request returned the original result.");
    }

    await recordAudit({
      actor: req.user.userId,
      targetUser: req.user.userId,
      action: AUDIT_ACTIONS.TRANSFER_INITIATED,
      transaction: transaction.id || transaction._id,
      metadata: {
        amountPaise: transaction.amountPaise,
        riskLevel: transaction.riskLevel,
        isInternal: transaction.isInternal || false,
      },
      requestId: req.requestId,
      ipAddress: req.ip,
    });

    return created(
      res,
      transaction,
      transaction.decisionReason || "Transfer request accepted."
    );
  } catch (error) {
    return next(error);
  }
}

export async function verifyTransferOtp(req, res, next) {
  try {
    const transaction = await verifyPendingTransfer({
      userId: req.user.userId,
      transactionId: req.params.id,
      otp: req.body.otp,
      deviceIdentifier: req.body.deviceIdentifier || null,
      ipAddress: req.ip,
    });
    return ok(res, transaction, "Transfer completed after verification.");
  } catch (error) {
    return next(error);
  }
}

export async function resendTransferVerificationOtp(req, res, next) {
  try {
    const payload = await resendTransferOtp({
      userId: req.user.userId,
      transactionId: req.params.id,
      ipAddress: req.ip,
    });
    return ok(res, payload, "A fresh OTP has been sent.");
  } catch (error) {
    return next(error);
  }
}