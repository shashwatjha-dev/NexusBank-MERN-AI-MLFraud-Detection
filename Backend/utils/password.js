import bcrypt from "bcryptjs";

/**
 * bcryptjs is used per the approved architecture. Cost factor 12 is a good
 * trade-off between security and login latency (~250ms on a modern laptop).
 */
const BCRYPT_COST = 12;

export function hashPassword(plainText) {
  return bcrypt.hash(plainText, BCRYPT_COST);
}

export function comparePassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}