import { Router } from "express";

import Joi from "joi";

import {
  requireAuth,
  attachFreshUser,
} from "../middleware/authMiddleware.js";

import { validate } from "../middleware/validate.js";

import {
  getSummary,
  listContributions,
  open,
  makeContribution,
} from "../controllers/ppfController.js";

const router = Router();

router.use(requireAuth);

const contributionSchema = Joi.object({
  sourceAccountId: Joi.string()
    .length(24)
    .hex()
    .optional(),

  amountPaise: Joi.number()
    .integer()
    .min(1)
    .max(1_00_00_00_000)
    .required(),

  note: Joi.string()
    .trim()
    .max(200)
    .allow("", null),
});


/* =========================================================
   PPF SUMMARY
   ========================================================= */

/*
 * Primary frontend endpoint:
 *
 * GET /api/ppf/summary
 */
router.get(
  "/summary",
  getSummary
);

/*
 * Backward-compatible endpoint:
 *
 * GET /api/ppf
 */
router.get(
  "/",
  getSummary
);


/* =========================================================
   CONTRIBUTIONS
   ========================================================= */

router.get(
  "/contributions",
  listContributions
);


/* =========================================================
   OPEN PPF
   ========================================================= */

router.post(
  "/open",
  attachFreshUser,
  open
);


/* =========================================================
   MAKE CONTRIBUTION
   ========================================================= */

router.post(
  "/contributions",
  attachFreshUser,
  validate({
    body: contributionSchema,
  }),
  makeContribution
);


export default router;