import { Router } from "express";

import { requireAuth } from "../middleware/authMiddleware.js";

import {
  listRewards,
  redeemRewards,
} from "../controllers/rewardController.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  listRewards
);

router.post(
  "/redeem",
  redeemRewards
);

export default router;