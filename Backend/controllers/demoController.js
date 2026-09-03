import Beneficiary from "../models/Beneficiary.js";
import { AppError } from "../utils/errors.js";
import { ok } from "../middleware/response.js";
import { demoScenarios } from "../services/fraud/demoScenarios.js";

/**
 * Fraud Demo Mode
 *
 * Routes:
 *   POST /api/demo/fraud/:scenario
 *   GET  /api/demo/fraud/:scenario
 *
 * Scenarios:
 *   low
 *   medium
 *   high
 *
 * IMPORTANT:
 * The controller does NOT calculate or hardcode any fraud result.
 *
 * It simply:
 *
 *   authenticated user
 *          ↓
 *   scenario selection
 *          ↓
 *   beneficiary lookup
 *          ↓
 *   REAL fraud engine
 *          ↓
 *   complete analysis response
 */

const SCENARIO_LABEL = {
  low:
    "Low-risk transaction — trusted beneficiary, known device and normal activity pattern.",

  medium:
    "Medium-risk transaction — elevated amount, new beneficiary and behavioural deviation.",

  high:
    "High-risk transaction — large amount, new beneficiary, new device, unusual time and elevated velocity.",
};

const VALID_SCENARIOS = new Set([
  "low",
  "medium",
  "high",
]);

export async function runDemoScenario(req, res, next) {
  try {
    // ==========================================================
    // AUTHENTICATED USER SAFETY CHECK
    // ==========================================================

    if (!req.user?.userId) {
      throw new AppError(
        "Authenticated user information is missing.",
        "AUTHENTICATION_REQUIRED",
        401
      );
    }

    const userId = req.user.userId;

    // ==========================================================
    // SCENARIO
    // ==========================================================

    const scenario = String(
      req.params.scenario || ""
    )
      .trim()
      .toLowerCase();

    if (!VALID_SCENARIOS.has(scenario)) {
      throw new AppError(
        "Unknown scenario. Use 'low', 'medium', or 'high'.",
        "UNKNOWN_SCENARIO",
        400
      );
    }

    const scenarioFn =
      demoScenarios[scenario];

    if (typeof scenarioFn !== "function") {
      throw new AppError(
        "Fraud demo scenario is not configured.",
        "SCENARIO_NOT_CONFIGURED",
        500
      );
    }

    // ==========================================================
    // BENEFICIARY
    // ==========================================================
    //
    // A real beneficiary is used when available so that the
    // fraud engine can still build a realistic feature snapshot.
    //
    // The scenario itself controls the relevant demo inputs.
    // ==========================================================

    const beneficiary =
      await Beneficiary.findOne({
        user: userId,
      }).lean();

    // ==========================================================
    // DEVICE
    // ==========================================================
    //
    // POST:
    //   body.deviceIdentifier
    //
    // GET:
    //   query.deviceIdentifier
    //
    // POST takes priority.
    // ==========================================================

    const bodyDeviceIdentifier =
      req.body?.deviceIdentifier;

    const queryDeviceIdentifier =
      req.query?.deviceIdentifier;

    const deviceIdentifier =
      bodyDeviceIdentifier ||
      queryDeviceIdentifier ||
      "demo-browser";

    // ==========================================================
    // RUN REAL FRAUD ENGINE
    // ==========================================================

    const analysis =
      await scenarioFn({
        userId,

        beneficiary,

        deviceIdentifier,
      });

    // ==========================================================
    // RESPONSE
    // ==========================================================

    return ok(
      res,
      {
        scenario,

        label:
          SCENARIO_LABEL[scenario],

        analysis,
      },
      "Fraud engine executed with the requested scenario."
    );
  } catch (error) {
    return next(error);
  }
}