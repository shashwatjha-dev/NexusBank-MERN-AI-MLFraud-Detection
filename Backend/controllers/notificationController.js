import {
  listForUser,
  unreadCount,
  markRead,
  markAllRead,
} from "../services/notificationService.js";
import { AppError } from "../utils/errors.js";
import { ok } from "../middleware/response.js";

/**
 * Notification controller — thin HTTP layer over notificationService.
 * All routes are user-scoped (req.user.userId) and read-only except the two
 * mark-read endpoints.
 */

export async function listNotifications(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const unreadOnly = req.query.unreadOnly === "true";
    const payload = await listForUser(req.user.userId, { limit, skip, unreadOnly });
    return ok(res, payload);
  } catch (error) {
    return next(error);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const count = await unreadCount(req.user.userId);
    return ok(res, { unread: count });
  } catch (error) {
    return next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const doc = await markRead(req.user.userId, req.params.id);
    if (!doc) {
      throw new AppError("Notification not found.", "RESOURCE_NOT_FOUND", 404);
    }
    return ok(res, doc, "Notification marked as read.");
  } catch (error) {
    return next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await markAllRead(req.user.userId);
    return ok(res, result, "All notifications marked as read.");
  } catch (error) {
    return next(error);
  }
}