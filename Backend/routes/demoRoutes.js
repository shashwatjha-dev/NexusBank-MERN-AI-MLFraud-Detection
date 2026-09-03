import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/authMiddleware.js";
import { runDemoScenario } from "../controllers/demoController.js";

const router = Router();
router.use(requireAuth);

/**
 * The demo endpoint runs the *real* fraud engine (including a DB read for
 * history) — rate-limit it so a demo isn't accidentally weaponised.
 */
const demoLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.post("/fraud/:scenario", demoLimiter, runDemoScenario);
router.get("/fraud/:scenario", demoLimiter, runDemoScenario);

export default router;