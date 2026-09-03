import { randomUUID } from "node:crypto";
import { assessTransaction } from "./fraudOrchestrator.js";

/**
 * NexusBank Fraud Detection Demo Scenarios
 *
 * IMPORTANT
 * ------------------------------------------------------------
 * Demo mode uses the REAL fraud detection pipeline.
 *
 * Scenario
 *    ↓
 * Feature Snapshot
 *    ↓
 * Rule Engine
 *    ↓
 * Behaviour Engine
 *    ↓
 * ML Model
 *    ↓
 * Risk Scorer
 *    ↓
 * Decision Engine
 *
 * Final LOW / MEDIUM / HIGH classification is never hardcoded.
 *
 *
 * DEMO RISK PROFILES
 * ------------------------------------------------------------
 *
 * LOW
 *   - Below ₹5,000
 *   - Trusted beneficiary
 *   - Known device
 *   - Normal activity time
 *   - Very low velocity
 *   - No suspicious history
 *
 *
 * MEDIUM
 *   - ₹50,000 – ₹99,999
 *   - New beneficiary
 *   - Known device
 *   - Normal activity time
 *   - Low/moderate velocity
 *   - Moderate amount deviation
 *   - No suspicious history
 *
 *   Amount floor guarantees minimum MEDIUM.
 *
 *
 * HIGH
 *   - ₹1,00,000 – ₹3,00,000
 *   - Very high amount ratio
 *   - New beneficiary
 *   - New device
 *   - Unusual time
 *   - High velocity
 *   - Previous suspicious activity
 *
 *   Amount floor guarantees minimum HIGH.
 */


/* ============================================================
   RANDOM HELPERS
   ============================================================ */

/**
 * Random integer between min and max, inclusive.
 */
function randomInt(min, max) {
  return (
    Math.floor(
      Math.random() *
        (max - min + 1)
    ) + min
  );
}


/**
 * Random floating-point number between min and max.
 */
function randomFloat(min, max) {
  return (
    Math.random() *
      (max - min) +
    min
  );
}


/* ============================================================
   DEMO REQUEST IDS
   ============================================================ */

function createDemoRequestIds(scenario) {
  const runId = randomUUID();

  return {
    requestId:
      `demo-${scenario}-${runId}`,

    transactionId:
      `demo-${scenario}-${runId}`,
  };
}


/* ============================================================
   SCENARIO RUNNER
   ============================================================ */

async function runScenario({
  userId,
  scenarioInput,
}) {
  const {
    requestId,
    transactionId,
  } = createDemoRequestIds(
    scenarioInput.key
  );

  return assessTransaction({
    userId,

    amountPaise:
      scenarioInput.amountPaise,

    beneficiary:
      scenarioInput.beneficiary,

    deviceIdentifier:
      scenarioInput.deviceIdentifier,

    isNewDeviceHint:
      scenarioInput.isNewDeviceHint,

    requestId,

    transactionId,

    demoFeatureOverrides:
      scenarioInput.demoFeatureOverrides,
  });
}


/* ============================================================
   LOW RISK
   ============================================================ */

/**
 * LOW RISK
 *
 * Normal everyday banking behaviour.
 *
 * Amount:
 *   ₹2,000 – ₹5,000
 *
 * Signals:
 *   Trusted beneficiary
 *   Known device
 *   Normal time
 *   Very low velocity
 *   No suspicious history
 *
 * The small variations prevent the Fraud Meter from showing
 * exactly the same score every time.
 */
export function lowRiskScenario({
  userId,
  beneficiary,
  deviceIdentifier,
}) {
  const amountRupees =
    randomInt(
      2000,
      5000
    );

  const amountRatio =
    Number(
      randomFloat(
        0.85,
        1.30
      ).toFixed(2)
    );

  const amountDeviationPercent =
    randomInt(
      5,
      30
    );

  const normalHour =
    randomInt(
      11,
      18
    );

  const velocity =
    randomInt(
      0,
      1
    );

  return runScenario({
    userId,

    scenarioInput: {
      key: "low",

      /*
       * --------------------------------------------------------
       * AMOUNT
       * --------------------------------------------------------
       */

      amountPaise:
        amountRupees * 100,


      /*
       * --------------------------------------------------------
       * BENEFICIARY
       * --------------------------------------------------------
       */

      beneficiary:
        beneficiary
          ? {
              ...beneficiary,

              trusted:
                true,

              createdAt:
                new Date(
                  Date.now() -
                    90 *
                      86400000
                ),
            }
          : {
              _id:
                null,

              trusted:
                true,

              createdAt:
                new Date(
                  Date.now() -
                    90 *
                      86400000
                ),
            },


      /*
       * --------------------------------------------------------
       * DEVICE
       * --------------------------------------------------------
       */

      deviceIdentifier:
        deviceIdentifier ||
        "demo-known-device-low",

      isNewDeviceHint:
        false,


      /*
       * --------------------------------------------------------
       * FEATURES
       * --------------------------------------------------------
       */

      demoFeatureOverrides: {
        /*
         * Amount
         */

        amountRatio,

        amountDeviationPercent,


        /*
         * Beneficiary
         */

        isNewBeneficiary:
          false,

        knownBeneficiary:
          true,


        /*
         * Device
         */

        isNewDevice:
          false,

        knownDevice:
          true,


        /*
         * Time
         *
         * Normal customer activity.
         */

        hourDeviation:
          randomInt(
            0,
            2
          ),

        hourOfDay:
          normalHour,

        typicalHour:
          normalHour,


        /*
         * Velocity
         */

        transactionsLast5Minutes:
          velocity,


        /*
         * History
         */

        previousSuspiciousCount:
          0,
      },
    },
  });
}


/* ============================================================
   MEDIUM RISK
   ============================================================ */

/**
 * MEDIUM RISK
 *
 * This scenario is intentionally designed to sit in the
 * MEDIUM band without stacking HIGH-risk behavioural signals.
 *
 * Amount:
 *
 *   ₹50,000 – ₹99,999
 *
 * Deterministic signals:
 *
 *   ✓ ELEVATED_AMOUNT
 *   ✓ NEW_BENEFICIARY
 *   ✗ HIGH_VALUE_TRANSACTION
 *   ✗ NEW_DEVICE
 *   ✗ UNUSUAL_TIME
 *   ✗ HIGH_VELOCITY
 *   ✗ PREVIOUS_SUSPICIOUS_ACTIVITY
 *
 * Behaviour:
 *
 *   Small/moderate amount deviation
 *   Normal transaction time
 *   Low recent velocity
 *
 * This avoids the previous problem where:
 *
 *   ELEVATED_AMOUNT  +30
 *   NEW_BENEFICIARY +25
 *   UNUSUAL_TIME    +15
 *
 * produced Rule Score = 70 and pushed the scenario into HIGH.
 */
export function mediumRiskScenario({
  userId,
  beneficiary,
  deviceIdentifier,
}) {
  /*
   * ₹50,000 – ₹99,999
   *
   * This remains inside the MEDIUM amount band.
   */
  const amountRupees =
    randomInt(
      50000,
      99999
    );


  /*
   * Keep historical ratio below 5.
   *
   * Therefore HIGH_AMOUNT does not trigger.
   */
  const amountRatio =
    Number(
      randomFloat(
        2.0,
        3.8
      ).toFixed(2)
    );


  /*
   * Keep amount deviation modest.
   *
   * It can produce a small behavioural signal,
   * but we don't want an extreme behavioural score.
   */
  const amountDeviationPercent =
    randomInt(
      20,
      48
    );


  /*
   * Normal daytime activity.
   *
   * This intentionally prevents:
   *
   *   UNUSUAL_TIME
   *   TIME_DEVIATION
   *
   * from triggering.
   */
  const typicalHour =
    randomInt(
      12,
      15
    );

  const hourOfDay =
    typicalHour;


  /*
   * One recent transaction is enough to make the
   * behavioural panel informative without triggering
   * HIGH_VELOCITY.
   */
  const transactionsLast5Minutes =
    randomInt(
      0,
      1
    );


  return runScenario({
    userId,

    scenarioInput: {
      key: "medium",

      /*
       * --------------------------------------------------------
       * AMOUNT
       * --------------------------------------------------------
       *
       * ₹50k – ₹99,999
       *
       * Risk scorer applies:
       *
       *   minimum MEDIUM
       */

      amountPaise:
        amountRupees * 100,


      /*
       * --------------------------------------------------------
       * BENEFICIARY
       * --------------------------------------------------------
       *
       * New / unfamiliar beneficiary.
       */

      beneficiary:
        beneficiary
          ? {
              ...beneficiary,

              trusted:
                false,

              createdAt:
                new Date(
                  Date.now() -
                    randomInt(
                      1,
                      7
                    ) *
                      86400000
                ),
            }
          : {
              _id:
                null,

              trusted:
                false,

              createdAt:
                new Date(
                  Date.now() -
                    randomInt(
                      1,
                      7
                    ) *
                      86400000
                ),
            },


      /*
       * --------------------------------------------------------
       * DEVICE
       * --------------------------------------------------------
       *
       * Known device.
       *
       * New device is reserved for HIGH.
       */

      deviceIdentifier:
        deviceIdentifier ||
        "demo-known-device-medium",

      isNewDeviceHint:
        false,


      /*
       * --------------------------------------------------------
       * FEATURES
       * --------------------------------------------------------
       */

      demoFeatureOverrides: {
        /*
         * Amount
         */

        amountRatio,

        amountDeviationPercent,


        /*
         * Beneficiary
         */

        isNewBeneficiary:
          true,

        knownBeneficiary:
          false,


        /*
         * Device
         */

        isNewDevice:
          false,

        knownDevice:
          true,


        /*
         * Time
         *
         * NORMAL.
         *
         * This is important:
         * don't trigger UNUSUAL_TIME in MEDIUM.
         */

        hourDeviation:
          0,

        hourOfDay,

        typicalHour,


        /*
         * Velocity
         *
         * 0–1 means:
         *
         *   no HIGH_VELOCITY rule
         *   tiny behavioural contribution
         */

        transactionsLast5Minutes:
          transactionsLast5Minutes,


        /*
         * History
         *
         * No previous fraud history.
         */

        previousSuspiciousCount:
          0,
      },
    },
  });
}


/* ============================================================
   HIGH RISK
   ============================================================ */

/**
 * HIGH RISK
 *
 * Strong multi-signal suspicious transaction.
 *
 * Amount:
 *
 *   ₹1,00,000 – ₹3,00,000
 *
 * Deterministic signals:
 *
 *   ✓ HIGH_VALUE_TRANSACTION
 *   ✓ HIGH_AMOUNT
 *   ✓ NEW_BENEFICIARY
 *   ✓ NEW_DEVICE
 *   ✓ UNUSUAL_TIME
 *   ✓ HIGH_VELOCITY
 *   ✓ PREVIOUS_SUSPICIOUS_ACTIVITY
 *
 * Behavioural signals:
 *
 *   ✓ Strong amount deviation
 *   ✓ Unusual time
 *   ✓ High recent velocity
 *
 * ML receives the same strong feature pattern and produces
 * its own genuine probability.
 */
export function highRiskScenario({
  userId,
  beneficiary,
  deviceIdentifier,
}) {
  /*
   * ₹1,00,000 – ₹3,00,000
   */
  const amountRupees =
    randomInt(
      100000,
      300000
    );


  /*
   * Strong historical deviation.
   *
   * HIGH_AMOUNT triggers.
   */
  const amountRatio =
    Number(
      randomFloat(
        7,
        16
      ).toFixed(2)
    );


  /*
   * Strong behavioural deviation.
   */
  const amountDeviationPercent =
    randomInt(
      650,
      1400
    );


  /*
   * Typical customer activity.
   */
  const typicalHour =
    14;


  /*
   * Early morning / late night activity.
   */
  const hourOfDay =
    Math.random() < 0.5
      ? randomInt(
          1,
          4
        )
      : randomInt(
          22,
          23
        );


  /*
   * Circular hour distance.
   *
   * Example:
   *
   * 23 → 14
   *
   * is treated as 9 hours rather than 15 hours.
   */
  const directDeviation =
    Math.abs(
      hourOfDay -
        typicalHour
    );

  const hourDeviation =
    Math.min(
      directDeviation,
      24 -
        directDeviation
    );


  /*
   * 4–7 transactions.
   *
   * 4+ triggers HIGH_VELOCITY.
   */
  const transactionsLast5Minutes =
    randomInt(
      4,
      7
    );


  /*
   * Previous suspicious activity.
   */
  const previousSuspiciousCount =
    randomInt(
      1,
      3
    );


  return runScenario({
    userId,

    scenarioInput: {
      key: "high",

      /*
       * --------------------------------------------------------
       * AMOUNT
       * --------------------------------------------------------
       *
       * ₹1L – ₹3L
       *
       * Risk scorer:
       *
       *   minimum HIGH
       */

      amountPaise:
        amountRupees * 100,


      /*
       * --------------------------------------------------------
       * BENEFICIARY
       * --------------------------------------------------------
       */

      beneficiary:
        beneficiary
          ? {
              ...beneficiary,

              trusted:
                false,

              createdAt:
                new Date(
                  Date.now() -
                    randomInt(
                      1,
                      6
                    ) *
                      3600000
                ),
            }
          : {
              _id:
                null,

              trusted:
                false,

              createdAt:
                new Date(
                  Date.now() -
                    randomInt(
                      1,
                      6
                    ) *
                      3600000
                ),
            },


      /*
       * --------------------------------------------------------
       * DEVICE
       * --------------------------------------------------------
       */

      deviceIdentifier:
        deviceIdentifier ||
        "demo-new-device-high",

      isNewDeviceHint:
        true,


      /*
       * --------------------------------------------------------
       * FEATURES
       * --------------------------------------------------------
       */

      demoFeatureOverrides: {
        /*
         * Amount
         */

        amountRatio,

        amountDeviationPercent,


        /*
         * Beneficiary
         */

        isNewBeneficiary:
          true,

        knownBeneficiary:
          false,


        /*
         * Device
         */

        isNewDevice:
          true,

        knownDevice:
          false,


        /*
         * Time
         */

        hourDeviation,

        hourOfDay,

        typicalHour,


        /*
         * Velocity
         */

        transactionsLast5Minutes:
          transactionsLast5Minutes,


        /*
         * History
         */

        previousSuspiciousCount:
          previousSuspiciousCount,
      },
    },
  });
}


/* ============================================================
   EXPORT
   ============================================================ */

export const demoScenarios = {
  low:
    lowRiskScenario,

  medium:
    mediumRiskScenario,

  high:
    highRiskScenario,
};