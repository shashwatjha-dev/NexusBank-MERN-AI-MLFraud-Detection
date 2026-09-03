import crypto from "node:crypto";
import Session from "../models/Session.js";
import { env } from "../config/environment.js";

/**
 * Session management. One Session row per issued JWT (via `jti`).
 *
 * Expiry is derived from env.jwtExpiresIn. We accept either a plain seconds
 * number or the standard "2h" / "30m" shorthand. Anything unparseable falls
 * back to 2 hours, matching the JWT default.
 */

function parseTtlMs(spec) {
  if (typeof spec === "number") return spec * 1000;
  const raw = String(spec || "2h").trim();
  const match = raw.match(/^(\d+)([smhd])?$/i);
  if (!match) return 2 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = (match[2] || "s").toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (multipliers[unit] || 1000);
}

export function newJti() {
  return crypto.randomUUID();
}

export async function createSession({
  jti,
  userId,
  deviceIdentifier,
  browser,
  operatingSystem,
  ipAddress,
}) {
  const ttlMs = parseTtlMs(env.jwtExpiresIn);
  const expiresAt = new Date(Date.now() + ttlMs);
  return Session.create({
    jti,
    user: userId,
    deviceIdentifier: deviceIdentifier || null,
    browser: browser || null,
    operatingSystem: operatingSystem || null,
    ipAddress: ipAddress || null,
    lastSeenAt: new Date(),
    expiresAt,
    revoked: false,
  });
}

/**
 * Fast lookup used by requireAuth. Returns null when the session is unknown
 * (older Phase 4 token) — the caller decides whether to fail closed or open.
 */
export async function findActiveSession(jti) {
  if (!jti) return null;
  return Session.findOne({ jti, revoked: false }).lean();
}

export async function touchSession(jti) {
  if (!jti) return;
  await Session.updateOne({ jti, revoked: false }, { $set: { lastSeenAt: new Date() } });
}

export async function revokeSession({ jti, userId }) {
  return Session.updateOne(
    { jti, user: userId, revoked: false },
    { $set: { revoked: true, revokedAt: new Date() } }
  );
}

export async function revokeSessionById({ sessionId, userId }) {
  return Session.updateOne(
    { _id: sessionId, user: userId, revoked: false },
    { $set: { revoked: true, revokedAt: new Date() } }
  );
}

export async function revokeAllOtherSessions({ userId, currentJti }) {
  const filter = { user: userId, revoked: false };
  if (currentJti) filter.jti = { $ne: currentJti };
  return Session.updateMany(filter, { $set: { revoked: true, revokedAt: new Date() } });
}

export async function listUserSessions(userId) {
  return Session.find({ user: userId, revoked: false })
    .sort({ lastSeenAt: -1 })
    .lean();
}