
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  listStatement,
  exportStatementCsv,
  exportStatementPdf,
  shareStatementController,
  listShareHistory,
} from "../controllers/statementController.js";

const router = Router();
router.use(requireAuth);

// Limit statement sharing to prevent email-abuse (10 shares / hour / user).
const shareLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `share:${req.user?.userId || req.ip}`,
});

router.get("/shares/recent", listShareHistory);
router.get("/:accountId", listStatement);
router.get("/:accountId/export.csv", exportStatementCsv);
router.get("/:accountId/export.pdf", exportStatementPdf);
router.post("/:accountId/share", shareLimiter, shareStatementController);

export default router;
