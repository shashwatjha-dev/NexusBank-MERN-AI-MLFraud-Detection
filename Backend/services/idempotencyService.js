import Transaction from "../models/Transaction.js";

/**
 * Idempotency helpers for the transfer flow.
 *
 * The (user, idempotencyKey) unique index on the Transaction collection is the
 * *authoritative* enforcement point — even if two requests race past this
 * pre-check, only one INSERT will succeed and the other will surface a
 * duplicate-key error (11000) which the controller maps to a 409.
 *
 * This module is a fast pre-check + a shape-friendly duplicate response so
 * clients that retry get back the same result as their original request.
 */

export async function findPriorTransaction({ userId, idempotencyKey }) {
  if (!idempotencyKey) return null;
  return Transaction.findOne({ user: userId, idempotencyKey })
    .populate("beneficiary", "name bankName accountNumber")
    .lean();
}

export function isDuplicateKeyError(error) {
  return error?.code === 11000 && error?.keyPattern?.idempotencyKey;
}