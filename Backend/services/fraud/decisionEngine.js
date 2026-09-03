import {
  FRAUD_DECISION,
  RISK_LEVEL,
  ML_SERVICE_STATUS,
} from "../../utils/enums.js";

/**
 * Maps the final risk assessment to a transaction/fraud decision.
 *
 * LOW
 *   → COMPLETED
 *
 * MEDIUM
 *   → VERIFICATION_REQUIRED
 *
 * HIGH
 *   → VERIFICATION_REQUIRED
 *
 * HIGH risk is still recorded in FraudLog as HIGH, but the customer
 * gets a chance to authenticate the transaction through OTP.
 *
 * This makes the demo behave like a real banking security flow:
 *
 *     suspicious transaction
 *              ↓
 *          HIGH RISK
 *              ↓
 *         OTP REQUIRED
 *              ↓
 *        correct OTP
 *              ↓
 *        TRANSFER COMPLETE
 *
 * SAFETY OVERRIDE
 * ---------------
 * When the ML service is unavailable and either the rule score or
 * behavioural score is elevated (>= 30), additional verification
 * is required even if the combined score falls into LOW.
 */
export function decide({
  riskLevel,
  ruleScore,
  behaviouralScore,
  mlServiceStatus,
}) {
  const mlDown =
    mlServiceStatus !== ML_SERVICE_STATUS.AVAILABLE;

  const hasElevatedSignal =
    ruleScore >= 30 ||
    behaviouralScore >= 30;

  // ----------------------------------------------------------
  // ML SERVICE SAFETY OVERRIDE
  // ----------------------------------------------------------

  if (
    mlDown &&
    hasElevatedSignal &&
    riskLevel === RISK_LEVEL.LOW
  ) {
    return {
      fraudDecision:
        FRAUD_DECISION.VERIFICATION_REQUIRED,

      decisionReason:
        "ML risk service unavailable; additional verification required for elevated rule/behavioural signals.",
    };
  }

  // ----------------------------------------------------------
  // HIGH RISK
  // ----------------------------------------------------------
  //
  // HIGH remains HIGH in the risk assessment and FraudLog.
  // Instead of blocking the customer immediately, require OTP.
  //

  if (riskLevel === RISK_LEVEL.HIGH) {
    return {
      fraudDecision:
        FRAUD_DECISION.VERIFICATION_REQUIRED,

      decisionReason:
        "High fraud risk detected. Additional OTP verification is required before completing the transaction.",
    };
  }

  // ----------------------------------------------------------
  // MEDIUM RISK
  // ----------------------------------------------------------

  if (riskLevel === RISK_LEVEL.MEDIUM) {
    return {
      fraudDecision:
        FRAUD_DECISION.VERIFICATION_REQUIRED,

      decisionReason:
        "Medium risk detected. Additional OTP verification is required.",
    };
  }

  // ----------------------------------------------------------
  // LOW RISK
  // ----------------------------------------------------------

  return {
    fraudDecision:
      FRAUD_DECISION.COMPLETED,

    decisionReason:
      "Risk within the low-risk threshold. Transaction proceeding.",
  };
}