import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { downloadTransactionReceipt } from "../controllers/receiptController.js";

const router = Router();
router.use(requireAuth);

// /api/receipts/transactions/:id.pdf
router.get("/transactions/:id.pdf", downloadTransactionReceipt);

export default router;