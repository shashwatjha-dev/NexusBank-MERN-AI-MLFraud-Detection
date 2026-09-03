/**
 * Central risk configuration for NexusBank Fraud Engine.
 *
 * ==========================================================
 * FINAL RISK CALCULATION
 * ==========================================================
 *
 * Rule Score        → 55%
 * Behaviour Score   → 30%
 * ML Risk           → 15%
 *
 * Calculated Risk:
 *
 *   0–29   → LOW
 *   30–59  → MEDIUM
 *   60–100 → HIGH
 *
 *
 * ==========================================================
 * TRANSACTION AMOUNT POLICY
 * ==========================================================
 *
 * <= ₹5,000
 *     Normal calculated risk.
 *
 * ₹5,001 – ₹49,999
 *     Normal calculated risk.
 *
 * ₹50,000 – ₹99,999
 *     Minimum MEDIUM risk.
 *
 * ₹1,00,000+
 *     Minimum HIGH risk.
 *
 *
 * IMPORTANT
 * ----------------------------------------------------------
 * Amount thresholds are risk floors.
 *
 * They do NOT replace:
 *
 *     Rule Engine
 *     Behaviour Engine
 *     ML Model
 *
 * The actual Rule / Behaviour / ML scores are still calculated
 * independently and remain visible to the fraud meter.
 *
 * The amount policy only prevents a large transaction from
 * incorrectly being classified as LOW/MEDIUM when the
 * transaction amount itself requires elevated scrutiny.
 *
 *
 * OTP / step-up verification is handled separately by the
 * transaction decision flow.
 */

export const riskConfig = Object.freeze({

  // ==========================================================
  // CONFIGURATION VERSION
  // ==========================================================

  version: "risk-v4.1",


  // ==========================================================
  // FINAL RISK WEIGHTS
  // ==========================================================
  //
  // Deterministic rules have the highest weight.
  //
  // Behavioural analysis provides deviation-based intelligence.
  //
  // ML provides additional model-based intelligence.
  //
  // The system remains functional even when ML is unavailable.
  // ==========================================================

  weights: Object.freeze({
    rule: 0.55,
    behavioural: 0.30,
    ml: 0.15,
  }),


  // ==========================================================
  // FINAL RISK THRESHOLDS
  // ==========================================================
  //
  // LOW:
  //     0–29
  //
  // MEDIUM:
  //     30–59
  //
  // HIGH:
  //     60–100
  //
  // Both min and max values are exposed because different
  // parts of the fraud engine use them for clarity.
  // ==========================================================

  thresholds: Object.freeze({

    lowMin: 0,
    lowMax: 29,

    mediumMin: 30,
    mediumMax: 59,

    highMin: 60,
    highMax: 100,
  }),


  // ==========================================================
  // TRANSACTION AMOUNT RISK POLICY
  // ==========================================================
  //
  // All monetary values are stored in paise.
  //
  // ₹5,000
  //     = 500,000 paise
  //
  // ₹50,000
  //     = 5,000,000 paise
  //
  // ₹1,00,000
  //     = 10,000,000 paise
  //
  // These thresholds are used by riskScorer.js to enforce
  // minimum final risk levels.
  // ==========================================================

  amountRisk: Object.freeze({

    // --------------------------------------------------------
    // Normal transaction boundary
    // --------------------------------------------------------

    normalMaxPaise: 500_000,


    // --------------------------------------------------------
    // MEDIUM risk boundary
    //
    // ₹50,000+
    // --------------------------------------------------------

    mediumMinPaise: 5_000_000,

    mediumFloorScore: 30,


    // --------------------------------------------------------
    // HIGH risk boundary
    //
    // ₹1,00,000+
    // --------------------------------------------------------

    highMinPaise: 10_000_000,

    highFloorScore: 60,
  }),


  // ==========================================================
  // FRAUD RULE CONTRIBUTIONS
  // ==========================================================
  //
  // These values contribute to the Rule Score.
  //
  // Rule score is calculated independently and capped at 100
  // by ruleEngine.js.
  // ==========================================================

  rules: Object.freeze({

    // --------------------------------------------------------
    // Relative amount risk
    //
    // Current amount >= 5x historical average.
    // --------------------------------------------------------

    HIGH_AMOUNT: 35,


    // --------------------------------------------------------
    // Absolute amount risk
    //
    // ₹50,000 – ₹99,999
    // --------------------------------------------------------

    ELEVATED_AMOUNT: 30,


    // --------------------------------------------------------
    // Absolute high-value transaction
    //
    // ₹1,00,000+
    // --------------------------------------------------------

    HIGH_VALUE_TRANSACTION: 40,


    // --------------------------------------------------------
    // Beneficiary
    // --------------------------------------------------------

    NEW_BENEFICIARY: 25,


    // --------------------------------------------------------
    // Device
    // --------------------------------------------------------

    NEW_DEVICE: 20,


    // --------------------------------------------------------
    // Time
    // --------------------------------------------------------

    UNUSUAL_TIME: 15,


    // --------------------------------------------------------
    // Velocity
    // --------------------------------------------------------

    HIGH_VELOCITY: 25,


    // --------------------------------------------------------
    // Historical suspicious activity
    // --------------------------------------------------------

    PREVIOUS_SUSPICIOUS_ACTIVITY: 20,
  }),


  // ==========================================================
  // BEHAVIOURAL ANALYZER CONFIGURATION
  // ==========================================================
  //
  // Behavioural score is based on deviation from the user's
  // normal activity pattern.
  // ==========================================================

  behaviour: Object.freeze({

    // --------------------------------------------------------
    // Amount deviation
    // --------------------------------------------------------
    //
    // Example:
    //
    // 50% deviation  → starts producing a visible signal
    // 100% deviation → approximately 10 points
    // 300% deviation → approximately 30 points
    //
    // Maximum amount-deviation contribution = 45.
    // --------------------------------------------------------

    amountDeviationTriggerPercent: 50,

    amountDeviationPointsPer10Percent: 1,

    amountDeviationCap: 45,


    // --------------------------------------------------------
    // Time deviation
    // --------------------------------------------------------
    //
    // 5+ hours away from typical activity time.
    // --------------------------------------------------------

    timeDeviationTriggerHours: 5,

    timeDeviationScore: 20,


    // --------------------------------------------------------
    // Velocity
    // --------------------------------------------------------
    //
    // Each recent transaction contributes 5 points.
    //
    // Maximum velocity contribution = 25.
    // --------------------------------------------------------

    velocityPointsPerTransaction: 5,

    velocityCap: 25,
  }),
});