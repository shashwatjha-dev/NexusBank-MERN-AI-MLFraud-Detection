import { verifyToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import User from "../models/User.js";
import { findActiveSession, touchSession } from "../services/sessionService.js";

/**
 * Verifies the JWT in the `Authorization: Bearer <token>` header and attaches
 * a lightweight `req.user` object:
 *
 *   { userId, role, name, jti, tokenIssuedAt, tokenExpiresAt }
 *
 * Session revocation (Phase 5, Batch 4):
 *   - When the token carries a `jti`, we look up the matching Session row.
 *   - If the Session is missing (revoked or never created), the request is
 *     rejected with 401 SESSION_REVOKED.
 *   - Tokens without a `jti` (older pre-Batch-4 sessions) fall through and
 *     keep working until they expire — no data loss on upgrade.
 *
 * We keep the DB round-trip lean (single .lean() lookup on a unique-indexed
 * field) and refresh `lastSeenAt` opportunistically without awaiting.
 */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.header("authorization");
    if (!header || !header.startsWith("Bearer ")) {
      throw new AppError("Authentication required.", "AUTHENTICATION_REQUIRED", 401);
    }

    const token = header.slice(7).trim();
    if (!token) {
      throw new AppError("Authentication required.", "AUTHENTICATION_REQUIRED", 401);
    }

    const payload = verifyToken(token);
    const jti = payload.jti || null;

    if (jti) {
      const session = await findActiveSession(jti);
      if (!session) {
        throw new AppError(
          "This session has been signed out. Please sign in again.",
          "SESSION_REVOKED",
          401
        );
      }
      // Fire-and-forget "last seen" bump.
      touchSession(jti).catch(() => { /* ignore */ });
    }

    req.user = {
      userId: payload.userId,
      role: payload.role,
      name: payload.name,
      jti,
      tokenIssuedAt: payload.iat,
      tokenExpiresAt: payload.exp,
    };
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("Authentication required.", "AUTHENTICATION_REQUIRED", 401));
  }
}

/**
 * Optional add-on middleware. Loads the full User document and enforces
 * `blocked=false`. Attach only to sensitive routes.
 */
export async function attachFreshUser(req, _res, next) {
  try {
    if (!req.user?.userId) {
      throw new AppError("Authentication required.", "AUTHENTICATION_REQUIRED", 401);
    }
    const user = await User.findById(req.user.userId).lean();
    if (!user) {
      throw new AppError("User not found.", "RESOURCE_NOT_FOUND", 404);
    }
    if (user.blocked) {
      throw new AppError("This account is blocked.", "ACCOUNT_BLOCKED", 403);
    }
    req.currentUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}