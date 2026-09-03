import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decide } from "../services/fraud/decisionEngine.js";
import { FRAUD_DECISION, RISK_LEVEL, ML_SERVICE_STATUS } from "../utils/enums.js";

/**
 * decisionEngine maps a computed risk level to the final fraud decision and
 * applies the ML-down safety override.
 */

describe("decisionEngine", () => {
  it("LOW risk → COMPLETED (when ML is AVAILABLE)", () => {
    const result = decide({
      riskLevel: RISK_LEVEL.LOW,
      ruleScore: 10,
      behaviouralScore: 10,
      mlServiceStatus: ML_SERVICE_STATUS.AVAILABLE,
    });
    assert.equal(result.fraudDecision, FRAUD_DECISION.COMPLETED);
    assert.ok(typeof result.decisionReason === "string" && result.decisionReason.length > 0);
  });

  it("MEDIUM risk → VERIFICATION_REQUIRED", () => {
    const result = decide({
      riskLevel: RISK_LEVEL.MEDIUM,
      ruleScore: 40,
      behaviouralScore: 40,
      mlServiceStatus: ML_SERVICE_STATUS.AVAILABLE,
    });
    assert.equal(result.fraudDecision, FRAUD_DECISION.VERIFICATION_REQUIRED);
  });

  it("HIGH risk → BLOCKED", () => {
    const result = decide({
      riskLevel: RISK_LEVEL.HIGH,
      ruleScore: 90,
      behaviouralScore: 90,
      mlServiceStatus: ML_SERVICE_STATUS.AVAILABLE,
    });
    assert.equal(result.fraudDecision, FRAUD_DECISION.BLOCKED);
  });

  it("ML-down safety override upgrades LOW to VERIFICATION_REQUIRED when ruleScore ≥ 30", () => {
    const result = decide({
      riskLevel: RISK_LEVEL.LOW,
      ruleScore: 40,
      behaviouralScore: 0,
      mlServiceStatus: ML_SERVICE_STATUS.UNAVAILABLE,
    });
    assert.equal(result.fraudDecision, FRAUD_DECISION.VERIFICATION_REQUIRED);
    assert.match(result.decisionReason, /verification/i);
  });

  it("ML-down safety override upgrades LOW to VERIFICATION_REQUIRED when behaviouralScore ≥ 30", () => {
    const result = decide({
      riskLevel: RISK_LEVEL.LOW,
      ruleScore: 0,
      behaviouralScore: 45,
      mlServiceStatus: ML_SERVICE_STATUS.UNAVAILABLE,
    });
    assert.equal(result.fraudDecision, FRAUD_DECISION.VERIFICATION_REQUIRED);
  });

  it("ML-down without elevated signals leaves LOW as COMPLETED", () => {
    const result = decide({
      riskLevel: RISK_LEVEL.LOW,
      ruleScore: 10,
      behaviouralScore: 10,
      mlServiceStatus: ML_SERVICE_STATUS.UNAVAILABLE,
    });
    assert.equal(result.fraudDecision, FRAUD_DECISION.COMPLETED);
  });

  it("ML-down does not downgrade HIGH → BLOCKED remains BLOCKED", () => {
    const result = decide({
      riskLevel: RISK_LEVEL.HIGH,
      ruleScore: 80,
      behaviouralScore: 80,
      mlServiceStatus: ML_SERVICE_STATUS.UNAVAILABLE,
    });
    assert.equal(result.fraudDecision, FRAUD_DECISION.BLOCKED);
  });
});