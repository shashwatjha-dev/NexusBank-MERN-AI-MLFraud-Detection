import { Router } from "express";

import {
  requireAuth,
  attachFreshUser,
} from "../middleware/authMiddleware.js";

import { validate } from "../middleware/validate.js";

import {
  listAccounts,
  getAccount,
  getOverview,
  createAccount,
  setPrimaryAccount,
} from "../controllers/accountController.js";

import {
  premiumStatus,
  premiumUpgrade,
} from "../controllers/premiumController.js";

import {
  beneficiaryIdParamSchema,
  createAccountSchema,
  setPrimaryAccountParamSchema,
} from "../validators/bankingValidators.js";

/*
 * `beneficiaryIdParamSchema` is a generic { id } validator.
 * It is reused here for account IDs.
 */

const router = Router();

router.use(requireAuth);

/* =========================================================
   ACCOUNTS
   ========================================================= */

router.get(
  "/",
  listAccounts
);

router.get(
  "/overview",
  getOverview
);

router.get(
  "/:id",
  validate({
    params: beneficiaryIdParamSchema,
  }),
  getAccount
);

/* =========================================================
   OPEN NEW ACCOUNT
   ========================================================= */

router.post(
  "/",
  attachFreshUser,
  validate({
    body: createAccountSchema,
  }),
  createAccount
);

/* =========================================================
   SET PRIMARY ACCOUNT
   ========================================================= */

router.put(
  "/:id/primary",
  attachFreshUser,
  validate({
    params: setPrimaryAccountParamSchema,
  }),
  setPrimaryAccount
);

/* =========================================================
   NEXUSBANK PREMIUM
   =========================================================
 *
 * Premium is intentionally protected by authentication.
 *
 * GET:
 *   /api/accounts/premium/status
 *
 * POST:
 *   /api/accounts/premium/upgrade
 *
 * The upgrade endpoint performs the actual ₹499 debit
 * through premiumService.
 */

router.get(
  "/premium/status",
  premiumStatus
);

router.post(
  "/premium/upgrade",
  premiumUpgrade
);

export default router;