import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { alertIdParamSchema } from "../validators/bankingValidators.js";
import {
  listAlerts,
  markAlertRead,
} from "../controllers/alertController.js";

const router = Router();
router.use(requireAuth);

router.get("/", listAlerts);
router.put(
  "/:id/read",
  validate({ params: alertIdParamSchema }),
  markAlertRead
);

export default router;