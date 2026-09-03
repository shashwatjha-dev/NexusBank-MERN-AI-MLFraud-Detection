import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { transactionIdParamSchema } from "../validators/bankingValidators.js";
import {
  overview,
  listFraudLogs,
  getFraudLog,
} from "../controllers/fraudController.js";

const router = Router();
router.use(requireAuth);

router.get("/overview", overview);
router.get("/logs", listFraudLogs);
router.get(
  "/logs/:id",
  validate({ params: transactionIdParamSchema }),
  getFraudLog
);

export default router;