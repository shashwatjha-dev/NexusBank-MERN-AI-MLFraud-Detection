import { Router } from "express";
import { requireAuth, attachFreshUser } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  createFixedDepositSchema,
  transactionIdParamSchema, // generic { id } ObjectId param
} from "../validators/bankingValidators.js";
import {
  listFixedDeposits,
  getFixedDeposit,
  createFixedDeposit,
} from "../controllers/fixedDepositController.js";

const router = Router();
router.use(requireAuth);

router.get("/", listFixedDeposits);
router.get(
  "/:id",
  validate({ params: transactionIdParamSchema }),
  getFixedDeposit
);
router.post(
  "/",
  attachFreshUser,
  validate({ body: createFixedDepositSchema }),
  createFixedDeposit
);

export default router;