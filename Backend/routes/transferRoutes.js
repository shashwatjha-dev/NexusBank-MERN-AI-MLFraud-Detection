import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, attachFreshUser } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  transferSchema,
  verifyTransferOtpSchema,
  transactionIdParamSchema,
  listTransactionsQuerySchema,
} from "../validators/bankingValidators.js";
import {
  createTransfer,
  verifyTransferOtp,
  resendTransferVerificationOtp,
} from "../controllers/transferController.js";
import { listTransactions } from "../controllers/transactionController.js";

const router = Router();
router.use(requireAuth);

const transferWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.post(
  "/",
  attachFreshUser,
  transferWriteLimiter,
  validate({ body: transferSchema }),
  createTransfer
);

router.post(
  "/:id/verify",
  attachFreshUser,
  transferWriteLimiter,
  validate({
    params: transactionIdParamSchema,
    body: verifyTransferOtpSchema,
  }),
  verifyTransferOtp
);

// Phase 5, Batch 3: request a fresh OTP for a PENDING verification.
router.post(
  "/:id/resend-otp",
  attachFreshUser,
  transferWriteLimiter,
  validate({ params: transactionIdParamSchema }),
  resendTransferVerificationOtp
);

router.get("/", validate({ query: listTransactionsQuerySchema }), listTransactions);

export default router;