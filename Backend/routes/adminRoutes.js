import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  userIdParamSchema,
  listUsersQuerySchema,
  listFraudLogsQuerySchema,
  fraudLogIdParamSchema,
  reviewFraudLogSchema,
  listAuditLogsQuerySchema,
  listTransactionsAdminQuerySchema,
} from "../validators/adminValidators.js";
import {
  overview,
  listUsers,
  getUser,
  blockUser,
  unblockUser,
  listTransactionsAdmin,
  listFraudLogsAdmin,
  getFraudLogAdmin,
  reviewFraudLog,
  listAuditLogs,
  accountsOverview,
  ppfMetrics,
  fdMetrics,
  fraudStats,
} from "../controllers/adminController.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/overview", overview);

// Batch 7 additions
router.get("/accounts-overview", accountsOverview);
router.get("/ppf-metrics", ppfMetrics);
router.get("/fd-metrics", fdMetrics);
router.get("/fraud-stats", fraudStats);

router.get("/users", validate({ query: listUsersQuerySchema }), listUsers);
router.get("/users/:id", validate({ params: userIdParamSchema }), getUser);
router.put("/users/:id/block", validate({ params: userIdParamSchema }), blockUser);
router.put("/users/:id/unblock", validate({ params: userIdParamSchema }), unblockUser);

router.get("/transactions", validate({ query: listTransactionsAdminQuerySchema }), listTransactionsAdmin);
router.get("/fraud", validate({ query: listFraudLogsQuerySchema }), listFraudLogsAdmin);
router.get("/fraud/:id", validate({ params: fraudLogIdParamSchema }), getFraudLogAdmin);
router.put(
  "/fraud/:id/review",
  validate({ params: fraudLogIdParamSchema, body: reviewFraudLogSchema }),
  reviewFraudLog
);
router.get("/audit-logs", validate({ query: listAuditLogsQuerySchema }), listAuditLogs);

export default router;