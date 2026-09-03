import { Router } from "express";
import rateLimit from "express-rate-limit";

import authRoutes from "./authRoutes.js";
import accountRoutes from "./accountRoutes.js";
import beneficiaryRoutes from "./beneficiaryRoutes.js";
import transferRoutes from "./transferRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import fixedDepositRoutes from "./fixedDepositRoutes.js";
import rewardRoutes from "./rewardRoutes.js";
import alertRoutes from "./alertRoutes.js";
import fraudRoutes from "./fraudRoutes.js";
import adminRoutes from "./adminRoutes.js";
import demoRoutes from "./demoRoutes.js";
import statementRoutes from "./statementRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import receiptRoutes from "./receiptRoutes.js";
import ppfRoutes from "./ppfRoutes.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.use("/auth", authLimiter, authRoutes);
router.use("/accounts", accountRoutes);
router.use("/beneficiaries", beneficiaryRoutes);
router.use("/transfers", transferRoutes);
router.use("/transactions", transactionRoutes);
router.use("/fd", fixedDepositRoutes);
router.use("/rewards", rewardRoutes);
router.use("/alerts", alertRoutes);
router.use("/fraud", fraudRoutes);
router.use("/admin", adminRoutes);
router.use("/demo", demoRoutes);
router.use("/statements", statementRoutes);
router.use("/notifications", notificationRoutes);
router.use("/receipts", receiptRoutes);
router.use("/ppf", ppfRoutes);

router.get("/health", (_req, res) =>
  res.json({
    success: true,
    data: {
      service: "nexusbank-backend",
      status: "ok",
    },
  })
);

export default router;