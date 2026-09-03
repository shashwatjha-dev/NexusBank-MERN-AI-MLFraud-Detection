import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreRisk } from "../services/fraud/riskScorer.js";
import { ML_SERVICE_STATUS, RISK_LEVEL } from "../utils/enums.js";

/**
 * riskScorer combines the three fraud sub-scores using the approved
 * 45% / 30% / 25% weighting and maps the final score to a RISK_LEVEL.
 *
 * These tests lock the weighting math and the LOW/MEDIUM/HIGH bands.
 */

describe("riskScorer", () => {
  it("returns LOW when every sub-score is 0", () => {
    const result = scoreRisk({
      ruleScore: 0,
      behaviouralScore: 0,
      mlRisk: 0,
      mlServiceStatus: ML_SERVICE_STATUS.AVAILABLE,
    });
    assert.equal(result.finalRiskScore, 0);
    assert.equal(result.riskLevel, RISK_LEVEL.LOW);
  });

  it("applies the approved 45/30/25 weighting", () => {
    // 100*0.45 + 100*0.30 + 100*0.25 = 100
    const result = scoreRisk({
      ruleScore: 100,
      behaviouralScore: 100,
      mlRisk: 100,
      mlServiceStatus: ML_SERVICE_STATUS.AVAILABLE,
    });
    assert.equal(result.finalRiskScore, 100);
    assert.equal(result.riskLevel, RISK_LEVEL.HIGH);
  });

  it("lands in MEDIUM band between 30 and 59", () => {
    // 40*0.45 + 40*0.30 + 40*0.25 = 40
    const result = scoreRisk({
      ruleScore: 40,
      behaviouralScore: 40,
      mlRisk: 40,
      mlServiceStatus: ML_SERVICE_STATUS.AVAILABLE,
    });
    assert.equal(result.finalRiskScore, 40);
    assert.equal(result.riskLevel, RISK_LEVEL.MEDIUM);
  });

  it("crosses into HIGH at score 60", () => {
    // 60*0.45 + 60*0.30 + 60*0.25 = 60
    const result = scoreRisk({
      ruleScore: 60,
      behaviouralScore: 60,
      mlRisk: 60,
      mlServiceStatus: ML_SERVICE_STATUS.AVAILABLE,
    });
    assert.equal(result.finalRiskScore, 60);
    assert.equal(result.riskLevel, RISK_LEVEL.HIGH);
  });

  it("treats null mlRisk as 0 contribution when ML is UNAVAILABLE", () => {
    // rule 50 * 0.45 + behav 50 * 0.30 = 37.5 → rounded to 38
    const result = scoreRisk({
      ruleScore: 50,
      behaviouralScore: 50,
      mlRisk: null,
      mlServiceStatus: ML_SERVICE_STATUS.UNAVAILABLE,
    });
    assert.equal(result.finalRiskScore, 38);
    assert.equal(result.riskLevel, RISK_LEVEL.MEDIUM);
    assert.equal(result.mlServiceStatus, ML_SERVICE_STATUS.UNAVAILABLE);
  });

  it("never invents a probability when ML says INVALID_RESPONSE", () => {
    const result = scoreRisk({
      ruleScore: 20,
      behaviouralScore: 20,
      mlRisk: 99,
      mlServiceStatus: ML_SERVICE_STATUS.INVALID_RESPONSE,
    });
    // ML contribution must be zero because the status is not AVAILABLE.
    // 20 * 0.45 + 20 * 0.30 = 15
    assert.equal(result.finalRiskScore, 15);
    assert.equal(result.riskLevel, RISK_LEVEL.LOW);
  });

  it("clamps out-of-range and non-finite sub-scores", () => {
    const result = scoreRisk({
      ruleScore: 500,
      behaviouralScore: -10,
      mlRisk: NaN,
      mlServiceStatus: ML_SERVICE_STATUS.AVAILABLE,
    });
    // 100*0.45 + 0*0.30 + 0*0.25 = 45
    assert.equal(result.finalRiskScore, 45);
    assert.equal(result.riskLevel, RISK_LEVEL.MEDIUM);
  });

  it("returns the weighting applied for auditing", () => {
    const result = scoreRisk({
      ruleScore: 10,
      behaviouralScore: 10,
      mlRisk: 10,
      mlServiceStatus: ML_SERVICE_STATUS.AVAILABLE,
    });
    assert.deepEqual(result.weightingApplied, { rule: 0.45, behavioural: 0.3, ml: 0.25 });
  });
});