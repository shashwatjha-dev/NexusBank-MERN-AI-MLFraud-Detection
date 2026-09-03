/**
 * NexusBank Behavioural Risk Analyzer
 *
 * Behavioural risk measures how different the current transaction is
 * from the user's normal activity pattern.
 *
 * Signals:
 *
 *   AMOUNT_DEVIATION
 *       Current amount compared with historical average.
 *
 *   TIME_DEVIATION
 *       Current transaction time compared with typical activity time.
 *
 *   VELOCITY_DEVIATION
 *       Recent transaction frequency.
 *
 * Behavioural score:
 *
 *   0..100
 *
 * Important:
 *
 *   This layer does NOT directly force LOW / MEDIUM / HIGH.
 *   Final amount-based risk floors are handled by riskScorer.js.
 *
 * This keeps:
 *
 *   Rule Engine
 *       ↓
 *   Behaviour Engine
 *       ↓
 *   ML
 *       ↓
 *   Risk Scorer
 *
 * independent and explainable.
 */

import { riskConfig } from "../../config/riskConfig.js";

export function analyzeBehaviour(features) {
  const signals = [];

  // ==========================================================
  // SAFE FEATURE VALUES
  // ==========================================================

  const amountDeviationPercent = Number(
    features?.amountDeviationPercent
  );

  const hourDeviation = Number(
    features?.hourDeviation
  );

  const transactionsLast5Minutes = Number(
    features?.transactionsLast5Minutes
  );

  const amountPaise = Number(
    features?.amountPaise
  );

  // ==========================================================
  // AMOUNT DEVIATION
  // ==========================================================
  //
  // We calculate a bounded score based on how far the current
  // transaction is from the user's historical average.
  //
  // Examples:
  //
  //   +10% deviation → ~1 point
  //   +50% deviation → ~5 points
  //   +100% deviation → ~10 points
  //   +300% deviation → ~30 points
  //
  // Maximum = configured cap.
  //
  // Negative deviation is not treated as suspicious.
  // ==========================================================

  let amountScore = 0;

  if (
    Number.isFinite(amountDeviationPercent) &&
    amountDeviationPercent > 0
  ) {
    amountScore = Math.min(
      riskConfig.behaviour.amountDeviationCap,
      Math.max(
        0,
        Math.round(
          amountDeviationPercent /
            10
        )
      )
    );
  }

  if (
    Number.isFinite(amountDeviationPercent) &&
    amountDeviationPercent >=
      riskConfig.behaviour
        .amountDeviationTriggerPercent
  ) {
    signals.push({
      code: "AMOUNT_DEVIATION",

      label:
        "Amount deviates from historical average",

      value:
        Math.round(
          amountDeviationPercent
        ),

      unit: "percent",

      evidence:
        `Current transaction amount is ${Math.round(
          amountDeviationPercent
        )}% above the user's historical average.`,
    });
  }

  // ==========================================================
  // SMALL / NORMAL TRANSACTION BASELINE
  // ==========================================================
  //
  // We intentionally do NOT add a risk penalty merely because
  // a transaction exists.
  //
  // A normal ₹500 / ₹2,000 / ₹5,000 transaction should remain
  // low-risk when behaviour is otherwise normal.
  //
  // However, if a small transaction is already behaviourally
  // unusual (time / velocity), those signals still contribute.
  // ==========================================================

  const isSmallOrNormalAmount =
    Number.isFinite(amountPaise) &&
    amountPaise <=
      riskConfig.amountRisk.normalMaxPaise;

  // ==========================================================
  // TIME DEVIATION
  // ==========================================================
  //
  // Significant deviation from the user's normal activity
  // window produces a fixed behavioural contribution.
  //
  // Example:
  //
  // Typical → 14:00
  // Current → 02:00
  //
  // deviation = 12 hours
  //
  // TIME_DEVIATION triggers.
  // ==========================================================

  let timeScore = 0;

  if (
    Number.isFinite(hourDeviation) &&
    hourDeviation >=
      riskConfig.behaviour
        .timeDeviationTriggerHours
  ) {
    timeScore =
      riskConfig.behaviour
        .timeDeviationScore;

    signals.push({
      code: "TIME_DEVIATION",

      label:
        "Activity is outside typical hours",

      value:
        Number.isFinite(
          Number(features?.hourOfDay)
        )
          ? Number(features.hourOfDay)
          : null,

      unit: "hour",

      evidence:
        `Typical activity is around ${
          features?.typicalHour ?? "unknown"
        }:00; current activity is around ${
          features?.hourOfDay ?? "unknown"
        }:00.`,
    });
  }

  // ==========================================================
  // VELOCITY DEVIATION
  // ==========================================================
  //
  // Recent activity contributes gradually.
  //
  // 1 transaction → 5 points
  // 2 transactions → 10 points
  // 3 transactions → 15 points
  // 4 transactions → 20 points
  // 5+ transactions → capped
  //
  // This is intentionally separate from the deterministic
  // HIGH_VELOCITY rule.
  // ==========================================================

  let velocityScore = 0;

  if (
    Number.isFinite(
      transactionsLast5Minutes
    ) &&
    transactionsLast5Minutes > 0
  ) {
    velocityScore = Math.min(
      riskConfig.behaviour
        .velocityCap,

      transactionsLast5Minutes *
        riskConfig.behaviour
          .velocityPointsPerTransaction
    );

    signals.push({
      code: "VELOCITY_DEVIATION",

      label:
        "Elevated recent activity",

      value:
        transactionsLast5Minutes,

      unit:
        "transactions",

      evidence:
        `${transactionsLast5Minutes} transaction(s) detected in the last five minutes.`,
    });
  }

  // ==========================================================
  // OPTIONAL SMALL-AMOUNT GUARD
  // ==========================================================
  //
  // A normal small transaction should not receive artificial
  // behavioural inflation.
  //
  // We therefore only keep amount deviation for small amounts
  // when the deviation is genuinely meaningful.
  //
  // Time and velocity remain valid independently.
  // ==========================================================

  if (
    isSmallOrNormalAmount &&
    amountScore > 0 &&
    amountDeviationPercent <
      riskConfig.behaviour
        .amountDeviationTriggerPercent
  ) {
    amountScore = Math.min(
      amountScore,
      3
    );
  }

  // ==========================================================
  // FINAL BEHAVIOURAL SCORE
  // ==========================================================

  const rawBehaviouralScore =
    amountScore +
    timeScore +
    velocityScore;

  const behaviouralScore =
    Math.min(
      100,
      Math.max(
        0,
        Math.round(
          rawBehaviouralScore
        )
      )
    );

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    behaviouralScore,

    behaviouralSignals:
      signals,
  };
}