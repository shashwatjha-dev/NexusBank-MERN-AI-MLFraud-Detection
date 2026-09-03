import { buildFeatures } from "./featureBuilder.js";
import { analyzeRules } from "./ruleEngine.js";
import { analyzeBehaviour } from "./behaviouralAnalyzer.js";
import { predict } from "./mlClient.js";
import { scoreRisk } from "./riskScorer.js";
import { decide } from "./decisionEngine.js";
import { riskConfig } from "../../config/riskConfig.js";

/**
 * NexusBank Fraud Orchestrator
 *
 * Complete fraud pipeline:
 *
 *   Transaction
 *        ↓
 *   Feature Builder
 *        ↓
 *   Rule Engine
 *        ↓
 *   Behaviour Engine
 *        ↓
 *   ML Service
 *        ↓
 *   Risk Scorer
 *        ↓
 *   Decision Engine
 *        ↓
 *   Final Fraud Assessment
 *
 * IMPORTANT:
 *
 * demoFeatureOverrides are ONLY used when explicitly supplied
 * by Fraud Demo Mode.
 *
 * Normal production transfers continue to use real database-
 * derived features.
 */

export async function assessTransaction(input) {
  // ==========================================================
  // BUILD FEATURES
  // ==========================================================

  const baseFeatures =
    await buildFeatures(input);

  // ==========================================================
  // DEMO OVERRIDES
  // ==========================================================
  //
  // Demo mode may provide deterministic feature values.
  //
  // Production transactions:
  //
  //     demoFeatureOverrides = undefined
  //
  // Therefore no override is applied.
  // ==========================================================

  const featureSnapshot =
    input.demoFeatureOverrides &&
    typeof input.demoFeatureOverrides === "object"
      ? {
          ...baseFeatures,
          ...input.demoFeatureOverrides,
        }
      : baseFeatures;

  // ==========================================================
  // RULE ANALYSIS
  // ==========================================================

  const rules =
    analyzeRules(
      featureSnapshot
    );

  // ==========================================================
  // BEHAVIOURAL ANALYSIS
  // ==========================================================

  const behavioural =
    analyzeBehaviour(
      featureSnapshot
    );

  // ==========================================================
  // ML ANALYSIS
  // ==========================================================
  //
  // ML client returns:
  //
  //   mlProbability
  //   mlRisk
  //   modelVersion
  //   serviceStatus
  //
  // If ML is unavailable, the deterministic fraud engines
  // continue to work.
  // ==========================================================

  const ml =
    await predict(
      featureSnapshot,
      input.requestId,
      input.transactionId
    );

  // ==========================================================
  // FINAL RISK SCORE
  // ==========================================================
  //
  // IMPORTANT CHANGE:
  //
  // amountPaise is explicitly passed into scoreRisk().
  //
  // This activates the amount-risk floors:
  //
  //   ₹50,000+ → MEDIUM minimum
  //   ₹1,00,000+ → HIGH minimum
  //
  // Rule / Behaviour / ML scores are still calculated normally.
  // ==========================================================

  const risk =
    scoreRisk({
      ruleScore:
        rules.ruleScore,

      behaviouralScore:
        behavioural.behaviouralScore,

      mlRisk:
        ml.mlRisk,

      mlServiceStatus:
        ml.serviceStatus,

      amountPaise:
        input.amountPaise,
    });

  // ==========================================================
  // DECISION ENGINE
  // ==========================================================

  const decision =
    decide({
      riskLevel:
        risk.riskLevel,

      ruleScore:
        rules.ruleScore,

      behaviouralScore:
        behavioural.behaviouralScore,

      mlServiceStatus:
        ml.serviceStatus,
    });

  // ==========================================================
  // TRANSACTION AMOUNT / OTP POLICY
  // ==========================================================
  //
  // ₹5,000 or below:
  //     Direct transfer unless fraud engine blocks it.
  //
  // Above ₹5,000:
  //     OTP verification.
  //
  // IMPORTANT:
  //
  // OTP is authentication.
  // It does NOT change the fraud risk score.
  //
  // Therefore:
  //
  // ₹10,000 + LOW
  //     → LOW risk
  //     → OTP
  //
  // ₹75,000 + MEDIUM
  //     → MEDIUM risk
  //     → OTP
  //
  // ₹1,00,000 + HIGH
  //     → HIGH risk
  //     → OTP / step-up flow
  //
  // If a separate fraud decision is BLOCKED,
  // BLOCKED always wins.
  // ==========================================================

  const OTP_THRESHOLD_PAISE =
    500_000;

  const amountPaise =
    Number(input.amountPaise);

  let fraudDecision =
    decision.fraudDecision;

  let decisionReason =
    decision.decisionReason;

  // ==========================================================
  // BLOCKED
  // ==========================================================

  if (
    fraudDecision ===
    "BLOCKED"
  ) {
    fraudDecision =
      "BLOCKED";

    decisionReason =
      decisionReason ||
      "Transfer blocked by fraud engine.";
  }

  // ==========================================================
  // <= ₹5,000
  // ==========================================================

  else if (
    Number.isFinite(amountPaise) &&
    amountPaise <=
      OTP_THRESHOLD_PAISE
  ) {
    fraudDecision =
      "COMPLETED";

    decisionReason =
      "Transfer amount is within the normal ₹5,000 limit.";
  }

  // ==========================================================
  // > ₹5,000
  // ==========================================================

  else {
    fraudDecision =
      "VERIFICATION_REQUIRED";

    decisionReason =
      "Transfer amount exceeds ₹5,000 and requires OTP verification.";
  }

  // ==========================================================
  // RETURN COMPLETE FRAUD ASSESSMENT
  // ==========================================================

  return {
    // ========================================================
    // RULE LAYER
    // ========================================================

    ruleScore:
      rules.ruleScore,

    triggeredRules:
      rules.triggeredRules,

    // ========================================================
    // BEHAVIOURAL LAYER
    // ========================================================

    behaviouralScore:
      behavioural.behaviouralScore,

    behaviouralSignals:
      behavioural.behaviouralSignals,

    // ========================================================
    // ML LAYER
    // ========================================================

    mlProbability:
      ml.mlProbability,

    mlRisk:
      ml.mlRisk,

    modelVersion:
      ml.modelVersion,

    mlServiceStatus:
      ml.serviceStatus,

    // ========================================================
    // FINAL RISK
    // ========================================================

    finalRiskScore:
      risk.finalRiskScore,

    riskLevel:
      risk.riskLevel,

    // ========================================================
    // RISK SCORING DETAILS
    // ========================================================

    weightingApplied:
      risk.weightingApplied,

    amountRiskFloor:
      risk.amountRiskFloor,

    calculatedWeightedScore:
      risk.calculatedWeightedScore,

    mlContribution:
      risk.mlContribution,

    // ========================================================
    // FINAL DECISION
    // ========================================================

    fraudDecision,

    decisionReason,

    // ========================================================
    // TRANSACTION CONTEXT
    // ========================================================

    amountPaise,

    // ========================================================
    // FEATURE SNAPSHOT
    // ========================================================

    featureSnapshot,

    // ========================================================
    // CONFIGURATION PROVENANCE
    // ========================================================

    riskConfigurationVersion:
      riskConfig.version,

    // ========================================================
    // TIMESTAMP
    // ========================================================

    analyzedAt:
      new Date(),
  };
}