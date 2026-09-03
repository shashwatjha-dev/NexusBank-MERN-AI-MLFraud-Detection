import { riskConfig } from "../../config/riskConfig.js";
import {
  RISK_LEVEL,
  ML_SERVICE_STATUS,
} from "../../utils/enums.js";

/**
 * NexusBank Final Risk Scorer
 *
 * ==========================================================
 * SCORE COMPOSITION
 * ==========================================================
 *
 * Rule        → 55%
 * Behaviour   → 30%
 * ML          → 15%
 *
 * Calculated score:
 *
 *   Rule × 0.55
 *   + Behaviour × 0.30
 *   + ML × 0.15
 *
 *
 * ==========================================================
 * RISK LEVELS
 * ==========================================================
 *
 *   0..29   → LOW
 *   30..59  → MEDIUM
 *   60..100 → HIGH
 *
 *
 * ==========================================================
 * PROGRESSIVE AMOUNT RISK
 * ==========================================================
 *
 *   <= ₹5,000
 *       No amount pressure.
 *
 *   ₹5,001 – ₹49,999
 *       Small progressive amount influence.
 *
 *   ₹50,000
 *       Minimum MEDIUM.
 *
 *   ₹50,000 – ₹99,999
 *       Amount pressure progressively increases.
 *
 *   ₹1,00,000
 *       Minimum HIGH.
 *
 *   ₹1,00,000+
 *       Amount pressure continues increasing with amount.
 *
 * This is intentionally NOT a fixed floor such as:
 *
 *   ₹50k → 30
 *   ₹60k → 30
 *   ₹90k → 30
 *
 * Instead:
 *
 *   ₹50k  → ~30
 *   ₹60k  → higher
 *   ₹75k  → higher
 *   ₹90k  → higher
 *   ₹1L   → 60+
 *   ₹1.5L → higher
 *   ₹2L   → higher
 *   ₹3L   → higher
 *
 * The amount component is combined with the genuine
 * Rule / Behaviour / ML calculation.
 *
 * IMPORTANT:
 * Rule, Behaviour and ML scores are NOT modified.
 * The progressive amount component only affects the final
 * risk score.
 */

export function scoreRisk({
  ruleScore,
  behaviouralScore,
  mlRisk,
  mlServiceStatus,
  amountPaise,
}) {
  // ==========================================================
  // NORMALIZE RULE SCORE
  // ==========================================================

  const safeRule = clamp(
    Number(ruleScore),
    0,
    100
  );

  // ==========================================================
  // NORMALIZE BEHAVIOURAL SCORE
  // ==========================================================

  const safeBehavioural = clamp(
    Number(behaviouralScore),
    0,
    100
  );

  // ==========================================================
  // NORMALIZE AMOUNT
  // ==========================================================

  const numericAmount =
    Number(amountPaise);

  const safeAmountPaise =
    Number.isFinite(numericAmount)
      ? Math.max(0, numericAmount)
      : 0;

  // ==========================================================
  // ML SCORE
  // ==========================================================
  //
  // ML contributes only when the service is genuinely
  // available and mlRisk is valid.
  //
  // If ML is unavailable:
  //
  //     ML contribution = 0
  //
  // No synthetic probability is generated.
  // ==========================================================

  const mlAvailable =
    mlServiceStatus ===
    ML_SERVICE_STATUS.AVAILABLE;

  const usableMlRisk =
    mlAvailable &&
    Number.isFinite(Number(mlRisk))
      ? clamp(
          Number(mlRisk),
          0,
          100
        )
      : 0;

  // ==========================================================
  // WEIGHTS
  // ==========================================================

  const ruleWeight =
    riskConfig.weights.rule;

  const behaviouralWeight =
    riskConfig.weights.behavioural;

  const mlWeight =
    riskConfig.weights.ml;

  // ==========================================================
  // INDIVIDUAL WEIGHTED CONTRIBUTIONS
  // ==========================================================

  const weightedRule =
    safeRule *
    ruleWeight;

  const weightedBehavioural =
    safeBehavioural *
    behaviouralWeight;

  const weightedMl =
    usableMlRisk *
    mlWeight;

  // ==========================================================
  // BASE CALCULATED SCORE
  // ==========================================================
  //
  // This remains the genuine fraud-engine calculation.
  //
  // Rule + Behaviour + ML
  //
  // Amount does NOT replace these values.
  // ==========================================================

  const weightedScore =
    weightedRule +
    weightedBehavioural +
    weightedMl;

  const calculatedWeightedScore =
    clamp(
      Math.round(weightedScore),
      0,
      100
    );

  // ==========================================================
  // PROGRESSIVE AMOUNT RISK
  // ==========================================================
  //
  // Instead of a simple fixed floor, calculate a smooth
  // amount-risk pressure.
  //
  // This solves:
  //
  // ₹50k  = 43
  // ₹60k  = 43
  // ₹75k  = 43
  //
  // because the amount component itself changes continuously.
  // ==========================================================

  const amountRiskScore =
    calculateProgressiveAmountRisk(
      safeAmountPaise
    );

  // ==========================================================
  // FINAL SCORE
  // ==========================================================
  //
  // The progressive amount score is used as a safety influence.
  //
  // We DO NOT simply replace the calculated score with the
  // amount score.
  //
  // Instead:
  //
  //   final = max(calculated score, amount risk score)
  //
  // This means the transaction's actual fraud signals can
  // still push the score much higher.
  //
  // Example:
  //
  // ₹2L
  // amount pressure = 72
  //
  // Rule/Behaviour/ML = 84
  //
  // final = 84
  //
  // If Rule/Behaviour/ML = 45
  //
  // final = 72
  // ==========================================================

  let finalRiskScore =
    Math.max(
      calculatedWeightedScore,
      amountRiskScore
    );

  finalRiskScore =
    clamp(
      Math.round(finalRiskScore),
      0,
      100
    );

  // ==========================================================
  // FINAL RISK LEVEL
  // ==========================================================

  let riskLevel =
    RISK_LEVEL.LOW;

  if (
    finalRiskScore >=
    riskConfig.thresholds.highMin
  ) {
    riskLevel =
      RISK_LEVEL.HIGH;
  } else if (
    finalRiskScore >=
    riskConfig.thresholds.mediumMin
  ) {
    riskLevel =
      RISK_LEVEL.MEDIUM;
  }

  // ==========================================================
  // AMOUNT RISK FLOOR / BAND
  // ==========================================================
  //
  // Keep the existing API field because the UI may already
  // consume amountRiskFloor.
  //
  // It now represents the amount's minimum risk band rather
  // than a fixed numeric score.
  // ==========================================================

  const amountRiskFloor =
    getAmountRiskFloor(
      safeAmountPaise
    );

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    // --------------------------------------------------------
    // Final result
    // --------------------------------------------------------

    finalRiskScore,

    riskLevel,

    // --------------------------------------------------------
    // Original weighting
    // --------------------------------------------------------

    weightingApplied: {
      ...riskConfig.weights,
    },

    // --------------------------------------------------------
    // ML status
    // --------------------------------------------------------

    mlServiceStatus,

    // --------------------------------------------------------
    // Amount information
    // --------------------------------------------------------

    amountRiskFloor,

    // Progressive amount score used in final calculation.
    amountRiskScore,

    // --------------------------------------------------------
    // Individual weighted contributions
    // --------------------------------------------------------

    weightedRule:
      roundScore(weightedRule),

    weightedBehavioural:
      roundScore(weightedBehavioural),

    weightedMl:
      roundScore(weightedMl),

    // --------------------------------------------------------
    // ML contribution before weighting
    // --------------------------------------------------------

    mlContribution:
      usableMlRisk,

    // --------------------------------------------------------
    // Genuine score before amount influence
    // --------------------------------------------------------

    calculatedWeightedScore,

    // Useful for debugging / Fraud Meter.
    amountInfluence:
      Math.max(
        0,
        Math.round(
          amountRiskScore -
          calculatedWeightedScore
        )
      ),
  };
}

// ============================================================
// PROGRESSIVE AMOUNT RISK
// ============================================================
/**
 * Converts transaction amount into a smooth 0..100 risk
 * pressure.
 *
 * IMPORTANT:
 *
 * This does not say that every large transaction is fraud.
 *
 * It says that larger transfers deserve progressively more
 * scrutiny.
 *
 * Boundaries:
 *
 *   <= ₹5k       → 0
 *   ₹5k–₹50k     → gradual 0..30
 *   ₹50k         → 30
 *   ₹50k–₹100k   → 30..60
 *   ₹100k        → 60
 *   ₹100k–₹500k  → 60..95
 *   ₹500k+       → 95..100
 */

function calculateProgressiveAmountRisk(
  amountPaise
) {
  const amount =
    Math.max(
      0,
      Number(amountPaise) || 0
    );

  const NORMAL_MAX =
    500_000; // ₹5,000

  const MEDIUM_MIN =
    5_000_000; // ₹50,000

  const HIGH_MIN =
    10_000_000; // ₹1,00,000

  const EXTREME_AMOUNT =
    50_000_000; // ₹5,00,000

  // ----------------------------------------------------------
  // <= ₹5,000
  // ----------------------------------------------------------
  //
  // No amount pressure.
  // Other fraud signals can still create risk.
  // ----------------------------------------------------------

  if (
    amount <= NORMAL_MAX
  ) {
    return 0;
  }

  // ----------------------------------------------------------
  // ₹5,000 – ₹50,000
  // ----------------------------------------------------------
  //
  // Gradually increase from 0 to 30.
  //
  // This keeps ordinary transfers capable of remaining LOW.
  // ----------------------------------------------------------

  if (
    amount < MEDIUM_MIN
  ) {
    const progress =
      (amount - NORMAL_MAX) /
      (MEDIUM_MIN - NORMAL_MAX);

    return Math.round(
      1 +
      progress * 29
    );
  }

  // ----------------------------------------------------------
  // ₹50,000 – ₹1,00,000
  // ----------------------------------------------------------
  //
  // Starts at 30 and rises smoothly to 60.
  //
  // Examples approximately:
  //
  // ₹50k → 30
  // ₹60k → 36
  // ₹75k → 45
  // ₹90k → 54
  // ₹1L  → 60
  // ----------------------------------------------------------

  if (
    amount < HIGH_MIN
  ) {
    const progress =
      (amount - MEDIUM_MIN) /
      (HIGH_MIN - MEDIUM_MIN);

    return Math.round(
      30 +
      progress * 30
    );
  }

  // ----------------------------------------------------------
  // ₹1,00,000 – ₹5,00,000
  // ----------------------------------------------------------
  //
  // HIGH begins at 60.
  //
  // Continue increasing rather than getting stuck at 60.
  //
  // ₹1L → 60
  // ₹1.5L → ~64
  // ₹2L → ~69
  // ₹3L → ~78
  // ₹4L → ~87
  // ₹5L → 95
  // ----------------------------------------------------------

  if (
    amount < EXTREME_AMOUNT
  ) {
    const progress =
      (amount - HIGH_MIN) /
      (EXTREME_AMOUNT - HIGH_MIN);

    return Math.round(
      60 +
      progress * 35
    );
  }

  // ----------------------------------------------------------
  // ₹5,00,000+
  // ----------------------------------------------------------
  //
  // Very high transaction amount.
  //
  // Continue approaching 100 without exceeding it.
  // ----------------------------------------------------------

  const extra =
    Math.log10(
      amount /
      EXTREME_AMOUNT
    );

  return Math.round(
    Math.min(
      100,
      95 +
      extra * 5
    )
  );
}

// ============================================================
// AMOUNT RISK BAND
// ============================================================

function getAmountRiskFloor(
  amountPaise
) {
  const mediumMin =
    Number(
      riskConfig.amountRisk
        .mediumMinPaise
    );

  const highMin =
    Number(
      riskConfig.amountRisk
        .highMinPaise
    );

  if (
    Number.isFinite(highMin) &&
    amountPaise >= highMin
  ) {
    return RISK_LEVEL.HIGH;
  }

  if (
    Number.isFinite(mediumMin) &&
    amountPaise >= mediumMin
  ) {
    return RISK_LEVEL.MEDIUM;
  }

  return RISK_LEVEL.LOW;
}

// ============================================================
// ROUND SCORE
// ============================================================

function roundScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(
    value * 100
  ) / 100;
}

// ============================================================
// SAFE CLAMP
// ============================================================

function clamp(
  value,
  min,
  max
) {
  if (
    !Number.isFinite(value)
  ) {
    return min;
  }

  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}