import Joi from "joi";

/**
 * Joi schemas for admin endpoints (user management, fraud monitoring,
 * fraud review, audit logs).
 */
const objectId = Joi.string().length(24).hex();

export const userIdParamSchema = Joi.object({
  id: objectId.required(),
});

export const listUsersQuerySchema = Joi.object({
  search: Joi.string().trim().max(80),
  role: Joi.string().valid("CUSTOMER", "ADMIN"),
  blocked: Joi.boolean(),
  limit: Joi.number().integer().min(1).max(200).default(50),
  skip: Joi.number().integer().min(0).default(0),
});

export const listFraudLogsQuerySchema = Joi.object({
  riskLevel: Joi.string().valid("LOW", "MEDIUM", "HIGH"),
  decision: Joi.string().valid("COMPLETED", "VERIFICATION_REQUIRED", "BLOCKED"),
  reviewStatus: Joi.string().valid("OPEN", "REVIEWED", "DISMISSED"),
  userId: objectId,
  limit: Joi.number().integer().min(1).max(200).default(50),
  skip: Joi.number().integer().min(0).default(0),
});

export const fraudLogIdParamSchema = Joi.object({
  id: objectId.required(),
});

export const reviewFraudLogSchema = Joi.object({
  reviewStatus: Joi.string().valid("REVIEWED", "DISMISSED").required(),
  reviewNotes: Joi.string().trim().max(500).allow(null, ""),
});

export const listAuditLogsQuerySchema = Joi.object({
  action: Joi.string().trim().max(60),
  actorId: objectId,
  targetUserId: objectId,
  limit: Joi.number().integer().min(1).max(300).default(100),
  skip: Joi.number().integer().min(0).default(0),
});

export const listTransactionsAdminQuerySchema = Joi.object({
  userId: objectId,
  riskLevel: Joi.string().valid("LOW", "MEDIUM", "HIGH"),
  status: Joi.string().valid("PENDING", "COMPLETED", "FAILED", "BLOCKED"),
  fraudDecision: Joi.string().valid("COMPLETED", "VERIFICATION_REQUIRED", "BLOCKED"),
  limit: Joi.number().integer().min(1).max(200).default(50),
  skip: Joi.number().integer().min(0).default(0),
});
