import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeBehaviour } from "../services/fraud/behaviouralAnalyzer.js";

/**
 * behaviouralAnalyzer measures statistical deviation. Each signal must carry
 * { code, label, value, unit, evidence } and the aggregate score must sit
 * in [0, 100].
 */

const baseFeatures = {
  amountDeviationPercent: 0,
  hourOfDay: 12,
  typicalHour: 12,
  hourDeviation: 0,
  transactionsLast5Minutes: 0,
};

function signalShape(signal) {
  return (
    typeof signal.code === "string" &&
    typeof signal.label === "string" &&
    "value" in signal &&
    typeof signal.unit === "string" &&
    typeof signal.evidence === "string"
  );
}

describe("behaviouralAnalyzer", () => {
  it("emits no signals when behaviour is normal", () => {
    const result = analyzeBehaviour(baseFeatures);
    assert.equal(result.behaviouralScore, 0);
    assert.deepEqual(result.behaviouralSignals, []);
  });

  it("does not emit AMOUNT_DEVIATION at or below 50%", () => {
    const result = analyzeBehaviour({ ...baseFeatures, amountDeviationPercent: 40 });
    assert.ok(!result.behaviouralSignals.some((s) => s.code === "AMOUNT_DEVIATION"));
  });

  it("emits AMOUNT_DEVIATION above 50%", () => {
    const result = analyzeBehaviour({ ...baseFeatures, amountDeviationPercent: 120 });
    const signal = result.behaviouralSignals.find((s) => s.code === "AMOUNT_DEVIATION");
    assert.ok(signal, "expected AMOUNT_DEVIATION signal");
    assert.ok(signalShape(signal));
    assert.ok(result.behaviouralScore > 0);
  });

  it("emits TIME_DEVIATION when hourDeviation ≥ 5", () => {
    const result = analyzeBehaviour({ ...baseFeatures, hourOfDay: 3, typicalHour: 14, hourDeviation: 11 });
    const signal = result.behaviouralSignals.find((s) => s.code === "TIME_DEVIATION");
    assert.ok(signal, "expected TIME_DEVIATION signal");
    assert.ok(signalShape(signal));
  });

  it("does NOT emit TIME_DEVIATION below the 5-hour threshold", () => {
    const result = analyzeBehaviour({ ...baseFeatures, hourDeviation: 4 });
    assert.ok(!result.behaviouralSignals.some((s) => s.code === "TIME_DEVIATION"));
  });

  it("emits VELOCITY_DEVIATION scaled at 5 per tx, capped at 25", () => {
    const two = analyzeBehaviour({ ...baseFeatures, transactionsLast5Minutes: 2 });
    const ten = analyzeBehaviour({ ...baseFeatures, transactionsLast5Minutes: 10 });
    const twoVelocity = two.behaviouralSignals.find((s) => s.code === "VELOCITY_DEVIATION");
    const tenVelocity = ten.behaviouralSignals.find((s) => s.code === "VELOCITY_DEVIATION");
    assert.ok(twoVelocity);
    assert.ok(tenVelocity);
    // 2 tx → +10; 10 tx → capped at +25
    assert.equal(two.behaviouralScore, 10);
    assert.equal(ten.behaviouralScore, 25);
  });

  it("clamps the aggregate behavioural score to 100", () => {
    const result = analyzeBehaviour({
      ...baseFeatures,
      amountDeviationPercent: 5000, // huge deviation
      hourDeviation: 12,
      transactionsLast5Minutes: 20,
    });
    assert.ok(result.behaviouralScore >= 0);
    assert.ok(result.behaviouralScore <= 100);
  });
});