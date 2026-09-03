import Alert from "../models/Alert.js";
import { AppError } from "../utils/errors.js";
import { ok } from "../middleware/response.js";

export async function listAlerts(req, res, next) {
  try {
    const [items, unread] = await Promise.all([
      Alert.find({ user: req.user.userId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Alert.countDocuments({ user: req.user.userId, read: false }),
    ]);
    return ok(res, { items, unread });
  } catch (error) {
    return next(error);
  }
}

export async function markAlertRead(req, res, next) {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { $set: { read: true } },
      { new: true }
    );
    if (!alert) {
      throw new AppError("Alert not found.", "RESOURCE_NOT_FOUND", 404);
    }
    return ok(res, alert, "Alert marked as read.");
  } catch (error) {
    return next(error);
  }
}