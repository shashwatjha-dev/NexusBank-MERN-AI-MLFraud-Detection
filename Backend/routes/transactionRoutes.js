import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  transactionIdParamSchema,
  listTransactionsQuerySchema,
} from "../validators/bankingValidators.js";
import {
  listTransactions,
  getTransaction,
} from "../controllers/transactionController.js";

const router = Router();
router.use(requireAuth);

router.get("/", validate({ query: listTransactionsQuerySchema }), listTransactions);
router.get(
  "/:id",
  validate({ params: transactionIdParamSchema }),
  getTransaction
);

export default router;