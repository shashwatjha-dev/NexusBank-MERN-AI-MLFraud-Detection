import { riskConfig } from "../../config/riskConfig.js";

/**
 * NexusBank Rule Engine
 *
 * Produces explainable, deterministic fraud signals.
 *
 * Every triggered rule contains:
 *
 *   code
 *   label
 *   contribution
 *   evidence
 *
 * Rule score:
 *
 *   0..100
 *
 * Amount policy:
 *
 *   <= ₹5,000
 *       No amount-based risk rule.
 *
 *   ₹5,001 – ₹49,999
 *       Historical amount rule may trigger.
 *
 *   ₹50,000 – ₹99,999
 *       ELEVATED_AMOUNT triggers.
 *
 *   ₹1,00,000+
 *       HIGH_VALUE_TRANSACTION triggers.
 *
 * Other independent signals:
 *
 *   NEW_BENEFICIARY
 *   NEW_DEVICE
 *   UNUSUAL_TIME
 *   HIGH_VELOCITY
 *   PREVIOUS_SUSPICIOUS_ACTIVITY
 */

export function analyzeRules(features) {
  const triggered = [];

  const add = (
    code,
    label,
    contribution,
    evidence
  ) => {
    triggered.push({
      code,
      label,
      contribution,
      evidence,
    });
  };

  // ==========================================================
  // NORMALIZE AMOUNT
  // ==========================================================

  const amountPaise = Number(features?.amountPaise);

  const safeAmountPaise = Number.isFinite(amountPaise)
    ? Math.max(0, amountPaise)
    : 0;

  const amountRiskConfig = riskConfig.amountRisk;

  // ==========================================================
  // HIGH AMOUNT — HISTORICAL DEVIATION
  // ==========================================================
  //
  // Trigger:
  //
  //     amount >= 5 × historical average
  //
  // This is a relative risk signal.
  //
  // It is intentionally separate from the absolute amount
  // rules below.
  //
  // Example:
  //
  // Average = ₹10,000
  // Current = ₹60,000
  //
  // Ratio = 6×
  //
  // HIGH_AMOUNT triggers.
  // ==========================================================

  const amountRatio = Number(features?.amountRatio);

  if (
    Number.isFinite(amountRatio) &&
    amountRatio >= 5
  ) {
    add(
      "HIGH_AMOUNT",

      "High transaction amount",

      riskConfig.rules.HIGH_AMOUNT,

      `Amount is ${amountRatio.toFixed(
        1
      )}× the user's historical average.`
    );
  }

  // ==========================================================
  // ELEVATED AMOUNT — ₹50,000+
  // ==========================================================
  //
  // This is the first absolute-value risk boundary.
  //
  // ₹50,000 to ₹99,999:
  //
  //     MEDIUM minimum final risk is handled by riskScorer.
  //
  // The rule itself contributes to the deterministic score.
  // ==========================================================

  if (
    safeAmountPaise >=
      amountRiskConfig.mediumMinPaise &&
    safeAmountPaise <
      amountRiskConfig.highMinPaise
  ) {
    add(
      "ELEVATED_AMOUNT",

      "Elevated transaction amount",

      riskConfig.rules.ELEVATED_AMOUNT,

      `Transaction amount is ₹${(
        safeAmountPaise / 100
      ).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}, which is at or above the ₹50,000 elevated-amount threshold.`
    );
  }

  // ==========================================================
  // HIGH VALUE TRANSACTION — ₹1,00,000+
  // ==========================================================
  //
  // ₹1 lakh and above is an explicit high-value signal.
  //
  // Final HIGH classification is additionally enforced by the
  // amount floor in riskScorer.js.
  // ==========================================================

  if (
    safeAmountPaise >=
    amountRiskConfig.highMinPaise
  ) {
    add(
      "HIGH_VALUE_TRANSACTION",

      "High-value transaction",

      riskConfig.rules.HIGH_VALUE_TRANSACTION,

      `Transaction amount is ₹${(
        safeAmountPaise / 100
      ).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}, which meets or exceeds the ₹1,00,000 high-value threshold.`
    );
  }

  // ==========================================================
  // NEW BENEFICIARY
  // ==========================================================

  if (features?.isNewBeneficiary === true) {
    add(
      "NEW_BENEFICIARY",

      "New beneficiary",

      riskConfig.rules.NEW_BENEFICIARY,

      "Beneficiary is not yet trusted or has not been used previously."
    );
  }

  // ==========================================================
  // NEW DEVICE
  // ==========================================================

  if (features?.isNewDevice === true) {
    add(
      "NEW_DEVICE",

      "New device",

      riskConfig.rules.NEW_DEVICE,

      "Device has not been seen in the user's transaction history."
    );
  }

  // ==========================================================
  // UNUSUAL TIME
  // ==========================================================

  const hourDeviation = Number(
    features?.hourDeviation
  );

  if (
    Number.isFinite(hourDeviation) &&
    hourDeviation >= 5
  ) {
    add(
      "UNUSUAL_TIME",

      "Unusual transaction time",

      riskConfig.rules.UNUSUAL_TIME,

      `Current hour ${features?.hourOfDay}:00 is ${hourDeviation} hour(s) away from the typical activity hour of ${features?.typicalHour}:00.`
    );
  }

  // ==========================================================
  // HIGH VELOCITY
  // ==========================================================

  const transactionsLast5Minutes = Number(
    features?.transactionsLast5Minutes
  );

  if (
    Number.isFinite(transactionsLast5Minutes) &&
    transactionsLast5Minutes >= 4
  ) {
    add(
      "HIGH_VELOCITY",

      "High transaction velocity",

      riskConfig.rules.HIGH_VELOCITY,

      `${transactionsLast5Minutes} transactions were detected in the last 5 minutes.`
    );
  }

  // ==========================================================
  // PREVIOUS SUSPICIOUS ACTIVITY
  // ==========================================================

  const previousSuspiciousCount = Number(
    features?.previousSuspiciousCount
  );

  if (
    Number.isFinite(previousSuspiciousCount) &&
    previousSuspiciousCount > 0
  ) {
    add(
      "PREVIOUS_SUSPICIOUS_ACTIVITY",

      "Previous suspicious activity",

      riskConfig.rules.PREVIOUS_SUSPICIOUS_ACTIVITY,

      `${previousSuspiciousCount} previous fraud record(s) were associated with this user.`
    );
  }

  // ==========================================================
  // FINAL RULE SCORE
  // ==========================================================

  const rawScore = triggered.reduce(
    (sum, rule) =>
      sum + Number(rule.contribution || 0),
    0
  );

  const ruleScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(rawScore)
    )
  );

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    ruleScore,
    triggeredRules: triggered,
  };
}