import Transaction from "../../models/Transaction.js";
import FraudLog from "../../models/FraudLog.js";
import Device from "../../models/Device.js";
import { TRANSACTION_STATUS } from "../../utils/enums.js";

/**
 * Builds the feature snapshot consumed by:
 *   - ruleEngine
 *   - behaviouralAnalyzer
 *   - mlClient
 *
 * Production transactions use real database-derived features.
 *
 * Fraud Demo Mode can optionally provide `demoFeatureOverrides`
 * to make LOW / MEDIUM / HIGH scenarios deterministic.
 *
 * IMPORTANT:
 * `demoFeatureOverrides` is only supplied by demoScenarios.js.
 * Normal production transfers do not use it.
 */

const HISTORY_WINDOW = 100;
const VELOCITY_WINDOW_MS = 5 * 60 * 1000;

export async function buildFeatures({
  userId,
  amountPaise,
  beneficiary,
  deviceIdentifier,
  isNewDeviceHint,
  now = new Date(),
  demoFeatureOverrides = {},
}) {
  /* ==========================================================
     DATABASE HISTORY
     ========================================================== */

  const [
    history,
    previousFraudCount,
    knownDevice,
    beneficiaryUseCount,
  ] = await Promise.all([
    Transaction.find({
      user: userId,
      status: TRANSACTION_STATUS.COMPLETED,
    })
      .sort({ createdAt: -1 })
      .limit(HISTORY_WINDOW)
      .lean(),

    FraudLog.countDocuments({
      user: userId,
    }),

    isNewDeviceHint === undefined
      ? Device.findOne({
          user: userId,
          deviceIdentifier,
        }).lean()
      : Promise.resolve(
          !isNewDeviceHint
            ? { placeholder: true }
            : null
        ),

    beneficiary?._id
      ? Transaction.countDocuments({
          user: userId,
          beneficiary: beneficiary._id,
          status: TRANSACTION_STATUS.COMPLETED,
        })
      : Promise.resolve(0),
  ]);

  /* ==========================================================
     AMOUNT HISTORY
     ========================================================== */

  const amounts = history
    .map((transaction) => transaction.amountPaise)
    .filter(Number.isFinite);

  const averageAmountPaise =
    amounts.length > 0
      ? Math.round(
          amounts.reduce(
            (sum, value) => sum + value,
            0
          ) / amounts.length
        )
      : amountPaise;

  const maxHistoricalAmountPaise =
    amounts.length > 0
      ? Math.max(...amounts)
      : amountPaise;

  const minHistoricalAmountPaise =
    amounts.length > 0
      ? Math.min(...amounts)
      : amountPaise;

  /* ==========================================================
     VELOCITY
     ========================================================== */

  const fiveMinutesAgo = new Date(
    now.getTime() - VELOCITY_WINDOW_MS
  );

  const transactionsLast5Minutes =
    history.filter(
      (transaction) =>
        new Date(transaction.createdAt) >=
        fiveMinutesAgo
    ).length;

  /* ==========================================================
     TIME BEHAVIOUR
     ========================================================== */

  const hourOfDay = now.getHours();

  const observedHours =
    history.length > 0
      ? history.map(
          (transaction) =>
            new Date(
              transaction.createdAt
            ).getHours()
        )
      : [hourOfDay];

  const sortedHours = [
    ...observedHours,
  ].sort((a, b) => a - b);

  const typicalHour =
    sortedHours[
      Math.floor(
        sortedHours.length / 2
      )
    ] ?? hourOfDay;

  /* ==========================================================
     BENEFICIARY
     ========================================================== */

  const knownBeneficiary = Boolean(
    beneficiary?.trusted ||
      beneficiaryUseCount > 0
  );

  const beneficiaryAgeDays =
    beneficiary?.createdAt
      ? Math.max(
          0,
          (now.getTime() -
            new Date(
              beneficiary.createdAt
            ).getTime()) /
            86400000
        )
      : 0;

  /* ==========================================================
     AMOUNT DEVIATION
     ========================================================== */

  const amountRatio =
    averageAmountPaise > 0
      ? amountPaise /
        averageAmountPaise
      : 1;

  const amountDeviationPercent =
    averageAmountPaise > 0
      ? ((amountPaise -
          averageAmountPaise) /
          averageAmountPaise) *
        100
      : 0;

  /* ==========================================================
     BASE FEATURES
     ========================================================== */

  const features = {
    /* Amount */
    amountPaise,
    averageAmountPaise,
    maxHistoricalAmountPaise,
    minHistoricalAmountPaise,
    amountRatio,
    amountDeviationPercent,

    /* Beneficiary */
    beneficiaryUseCount,
    beneficiaryAgeDays,
    isNewBeneficiary:
      !knownBeneficiary,
    knownBeneficiary,

    /* Device */
    isNewDevice:
      !knownDevice,
    knownDevice:
      Boolean(knownDevice),

    /* Time */
    hourOfDay,
    typicalHour,

    /*
     * IMPORTANT:
     *
     * Use circular 24-hour distance instead of a plain
     * Math.abs(current - typical) calculation.
     *
     * Example:
     *
     * 23:00 -> 01:00
     *
     * Normal difference:
     *   |1 - 23| = 22
     *
     * Actual clock difference:
     *   2 hours
     */
    hourDeviation:
      calculateHourDeviation(
        hourOfDay,
        typicalHour
      ),

    /* Velocity */
    transactionsLast5Minutes,

    /* Historical risk */
    previousSuspiciousCount:
      previousFraudCount,

    historyCount:
      history.length,
  };

  /* ==========================================================
     DEMO FEATURE OVERRIDES
     ==========================================================

     ONLY Fraud Demo Mode supplies these values.

     This is important because otherwise the demo would depend
     on whatever data happens to exist in MongoDB.

     Production transfers:
       demoFeatureOverrides = {}
       → real database values remain untouched.

     Demo:
       demoFeatureOverrides contains controlled values
       → those values are used by the real rule/behaviour
          engines.
  */

  if (
    demoFeatureOverrides &&
    typeof demoFeatureOverrides === "object"
  ) {
    const allowedOverrides = [
      /*
       * Amount
       *
       * amountPaise is included so Demo Mode can explicitly
       * control the transaction amount when required.
       *
       * The value must be supplied in paise, matching the
       * production transaction model.
       */
      "amountPaise",

      "amountRatio",
      "amountDeviationPercent",

      /* Beneficiary */
      "isNewBeneficiary",
      "knownBeneficiary",

      /* Device */
      "isNewDevice",
      "knownDevice",

      /* Time */
      "hourDeviation",
      "hourOfDay",
      "typicalHour",

      /* Velocity */
      "transactionsLast5Minutes",

      /* Historical risk */
      "previousSuspiciousCount",

      /* Beneficiary metadata */
      "beneficiaryUseCount",
      "beneficiaryAgeDays",

      /* History */
      "historyCount",
    ];

    for (const key of allowedOverrides) {
      if (
        Object.prototype.hasOwnProperty.call(
          demoFeatureOverrides,
          key
        )
      ) {
        features[key] =
          demoFeatureOverrides[key];
      }
    }
  }

  /* ==========================================================
     NORMALIZE VALUES
     ========================================================== */

  /*
   * amountPaise
   *
   * Keep the actual transaction amount numeric.
   * This is especially important when Demo Mode supplies
   * an amount override.
   */
  features.amountPaise =
    Number.isFinite(
      Number(features.amountPaise)
    )
      ? Number(features.amountPaise)
      : 0;

  features.amountRatio =
    Number.isFinite(
      features.amountRatio
    )
      ? features.amountRatio
      : 1;

  features.amountDeviationPercent =
    Number.isFinite(
      features.amountDeviationPercent
    )
      ? features.amountDeviationPercent
      : (
          (features.amountRatio - 1) *
          100
        );

  features.hourDeviation =
    Number.isFinite(
      features.hourDeviation
    )
      ? features.hourDeviation
      : calculateHourDeviation(
          Number.isFinite(
            features.hourOfDay
          )
            ? features.hourOfDay
            : hourOfDay,

          Number.isFinite(
            features.typicalHour
          )
            ? features.typicalHour
            : typicalHour
        );

  features.transactionsLast5Minutes =
    Number.isFinite(
      features.transactionsLast5Minutes
    )
      ? features.transactionsLast5Minutes
      : 0;

  features.previousSuspiciousCount =
    Number.isFinite(
      features.previousSuspiciousCount
    )
      ? features.previousSuspiciousCount
      : 0;

  features.isNewBeneficiary =
    Boolean(
      features.isNewBeneficiary
    );

  features.knownBeneficiary =
    Boolean(
      features.knownBeneficiary
    );

  features.isNewDevice =
    Boolean(
      features.isNewDevice
    );

  features.knownDevice =
    Boolean(
      features.knownDevice
    );

  return features;
}

/* ============================================================
   24-HOUR CIRCULAR TIME DISTANCE
   ============================================================

   Calculates the shortest distance between two clock hours.

   Examples:

     23 -> 01 = 2 hours
     01 -> 23 = 2 hours
     10 -> 14 = 4 hours
     10 -> 20 = 10 hours

   This prevents midnight-crossing transactions from being
   incorrectly classified as extremely unusual.
*/

function calculateHourDeviation(
  currentHour,
  typicalHour
) {
  const current =
    Number(currentHour);

  const typical =
    Number(typicalHour);

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(typical)
  ) {
    return 0;
  }

  const normalizedCurrent =
    ((current % 24) + 24) % 24;

  const normalizedTypical =
    ((typical % 24) + 24) % 24;

  const directDifference =
    Math.abs(
      normalizedCurrent -
        normalizedTypical
    );

  const circularDifference =
    24 -
    directDifference;

  return Math.min(
    directDifference,
    circularDifference
  );
}