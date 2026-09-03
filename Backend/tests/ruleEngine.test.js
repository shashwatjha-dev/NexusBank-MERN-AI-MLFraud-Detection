import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeRules } from "../services/fraud/ruleEngine.js";
import { riskConfig } from "../config/riskConfig.js";

/**
 * ruleEngine emits explainable, categorical fraud rules.
 * Each triggered rule must carry { code, label, contribution, evidence }.
 */

const baseFeatures = {
  amountPaise: 100_000,
  amountRatio: 1,
  amountDeviationPercent: 0,
  isNewBeneficiary: false,
  isNewDevice: false,
  hourOfDay: 12,
  typicalHour: 12,
  hourDeviation: 0,
  transactionsLast5Minutes: 0,
  previousSuspiciousCount: 0,
};

function ruleShape(rule) {
  return (
    typeof rule.code === "string" &&
    typeof rule.label === "string" &&
    typeof rule.contribution === "number" &&
    typeof rule.evidence === "string"
  );
}

describe("ruleEngine", () => {
  it("returns zero when no rule condition is met", () => {
    const result = analyzeRules(baseFeatures);
    assert.equal(result.ruleScore, 0);
    assert.deepEqual(result.triggeredRules, []);
  });

  it("triggers HIGH_AMOUNT when amountRatio ≥ 5", () => {
    const result = analyzeRules({ ...baseFeatures, amountRatio: 5.5 });
    const codes = result.triggeredRules.map((r) => r.code);
    assert.ok(codes.includes("HIGH_AMOUNT"));
    const rule = result.triggeredRules.find((r) => r.code === "HIGH_AMOUNT");
    assert.equal(rule.contribution, riskConfig.rules.HIGH_AMOUNT);
    assert.ok(ruleShape(rule));
  });

  it("does NOT trigger HIGH_AMOUNT when amountRatio < 5", () => {
    const result = analyzeRules({ ...baseFeatures, amountRatio: 4.9 });
    const codes = result.triggeredRules.map((r) => r.code);
    assert.ok(!codes.includes("HIGH_AMOUNT"));
  });

  it("triggers NEW_BENEFICIARY when isNewBeneficiary is true", () => {
    const result = analyzeRules({ ...baseFeatures, isNewBeneficiary: true });
    assert.ok(result.triggeredRules.some((r) => r.code === "NEW_BENEFICIARY"));
  });

  it("triggers NEW_DEVICE when isNewDevice is true", () => {
    const result = analyzeRules({ ...baseFeatures, isNewDevice: true });
    assert.ok(result.triggeredRules.some((r) => r.code === "NEW_DEVICE"));
  });

  it("triggers UNUSUAL_TIME when hourDeviation ≥ 5", () => {
    const result = analyzeRules({ ...baseFeatures, hourOfDay: 3, typicalHour: 14, hourDeviation: 11 });
    assert.ok(result.triggeredRules.some((r) => r.code === "UNUSUAL_TIME"));
  });

  it("triggers HIGH_VELOCITY at 4+ recent transactions", () => {
    const result = analyzeRules({ ...baseFeatures, transactionsLast5Minutes: 4 });
    assert.ok(result.triggeredRules.some((r) => r.code === "HIGH_VELOCITY"));
  });

  it("triggers PREVIOUS_SUSPICIOUS_ACTIVITY when count > 0", () => {
    const result = analyzeRules({ ...baseFeatures, previousSuspiciousCount: 1 });
    assert.ok(result.triggeredRules.some((r) => r.code === "PREVIOUS_SUSPICIOUS_ACTIVITY"));
  });

  it("caps the aggregate rule score at 100", () => {
    // All six rules → 25 + 20 + 20 + 10 + 20 + 15 = 110 → cap to 100
    const result = analyzeRules({
      ...baseFeatures,
      amountRatio: 10,
      isNewBeneficiary: true,
      isNewDevice: true,
      hourDeviation: 8,
      transactionsLast5Minutes: 10,
      previousSuspiciousCount: 2,
    });
    assert.equal(result.ruleScore, 100);
    assert.equal(result.triggeredRules.length, 6);
    for (const rule of result.triggeredRules) {
      assert.ok(ruleShape(rule), `rule ${rule?.code} missing required fields`);
    }
  });

  it("uses contributions sourced from riskConfig (auditable)", () => {
    const result = analyzeRules({ ...baseFeatures, isNewBeneficiary: true, isNewDevice: true });
    const contributions = Object.fromEntries(
      result.triggeredRules.map((r) => [r.code, r.contribution])
    );
    assert.equal(contributions.NEW_BENEFICIARY, riskConfig.rules.NEW_BENEFICIARY);
    assert.equal(contributions.NEW_DEVICE, riskConfig.rules.NEW_DEVICE);
  });
});