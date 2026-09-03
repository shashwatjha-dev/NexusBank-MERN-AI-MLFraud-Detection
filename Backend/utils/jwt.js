import jwt from "jsonwebtoken";
import { env } from "../config/environment.js";
import { AppError } from "./errors.js";

/**
 * Signs a compact user token. Contains only what auth needs — never PII.
 *
 *   payload: { userId, role, name, jti }
 *
 * `jti` correlates with the persisted Session row (Phase 5) so revocation
 * can be enforced by the auth middleware.
 *
 * Expiry is driven by `env.jwtExpiresIn` (defaults to "2h").
 */
export function signToken(payload) {
  const { jti, ...rest } = payload;
  const options = {
    expiresIn: env.jwtExpiresIn,
    issuer: "nexusbank-api",
    audience: "nexusbank-client",
  };
  if (jti) options.jwtid = jti;
  return jwt.sign(rest, env.jwtSecret, options);
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret, {
      issuer: "nexusbank-api",
      audience: "nexusbank-client",
    });
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      throw new AppError("Your session has expired. Please sign in again.", "TOKEN_EXPIRED", 401);
    }
    throw new AppError("Invalid authentication token.", "TOKEN_INVALID", 401);
  }
}