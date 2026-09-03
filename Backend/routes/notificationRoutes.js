import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";

const router = Router();
router.use(requireAuth);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

export default router;