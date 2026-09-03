import Beneficiary from "../models/Beneficiary.js";
import { AppError } from "../utils/errors.js";
import { ok, created } from "../middleware/response.js";
import { recordAudit, recordSecurityEvent } from "../services/auditService.js";
import { AUDIT_ACTIONS, SECURITY_EVENTS } from "../utils/enums.js";

export async function listBeneficiaries(req, res, next) {
  try {
    const beneficiaries = await Beneficiary.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    return ok(res, beneficiaries);
  } catch (error) {
    return next(error);
  }
}

export async function createBeneficiary(req, res, next) {
  try {
    const { name, nickname, accountNumber, ifsc, bankName } = req.body;
    let beneficiary;
    try {
      beneficiary = await Beneficiary.create({
        user: req.user.userId,
        name,
        nickname,
        accountNumber,
        ifsc,
        bankName,
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError(
          "This beneficiary is already registered on your account.",
          "BENEFICIARY_ALREADY_EXISTS",
          409
        );
      }
      throw error;
    }

    await recordSecurityEvent({
      user: req.user.userId,
      eventType: SECURITY_EVENTS.BENEFICIARY_ADDED,
      metadata: { beneficiaryId: String(beneficiary._id) },
      ipAddress: req.ip,
    });
    await recordAudit({
      actor: req.user.userId,
      targetUser: req.user.userId,
      action: AUDIT_ACTIONS.BENEFICIARY_ADDED,
      metadata: { beneficiaryId: String(beneficiary._id) },
      requestId: req.requestId,
      ipAddress: req.ip,
    });

    return created(res, beneficiary, "Beneficiary added.");
  } catch (error) {
    return next(error);
  }
}

export async function updateBeneficiary(req, res, next) {
  try {
    const beneficiary = await Beneficiary.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!beneficiary) {
      throw new AppError("Beneficiary not found.", "RESOURCE_NOT_FOUND", 404);
    }
    await recordAudit({
      actor: req.user.userId,
      targetUser: req.user.userId,
      action: AUDIT_ACTIONS.BENEFICIARY_UPDATED,
      metadata: { beneficiaryId: String(beneficiary._id) },
      requestId: req.requestId,
      ipAddress: req.ip,
    });
    return ok(res, beneficiary, "Beneficiary updated.");
  } catch (error) {
    return next(error);
  }
}

export async function deleteBeneficiary(req, res, next) {
  try {
    const beneficiary = await Beneficiary.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });
    if (!beneficiary) {
      throw new AppError("Beneficiary not found.", "RESOURCE_NOT_FOUND", 404);
    }
    await recordSecurityEvent({
      user: req.user.userId,
      eventType: SECURITY_EVENTS.BENEFICIARY_REMOVED,
      metadata: { beneficiaryId: String(beneficiary._id) },
      ipAddress: req.ip,
    });
    await recordAudit({
      actor: req.user.userId,
      targetUser: req.user.userId,
      action: AUDIT_ACTIONS.BENEFICIARY_REMOVED,
      metadata: { beneficiaryId: String(beneficiary._id) },
      requestId: req.requestId,
      ipAddress: req.ip,
    });
    return ok(res, null, "Beneficiary removed.");
  } catch (error) {
    return next(error);
  }
}