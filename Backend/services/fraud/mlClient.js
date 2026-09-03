import { env } from "../../config/environment.js";
import { ML_SERVICE_STATUS } from "../../utils/enums.js";

/**
 * Client for the Phase 3 Python FastAPI ML service.
 *
 * CONTRACT (Phase 3 will implement this):
 *   POST  {ML_SERVICE_URL}/predict
 *   Body  (JSON, single-transaction feature vector):
 *     {
 *       "amount": number,                         // rupees (float ok — display only)
 *       "amount_to_average_ratio": number,
 *       "beneficiary_age_days": number,
 *       "is_new_beneficiary": 0 | 1,
 *       "is_new_device": 0 | 1,
 *       "hour_of_day": integer 0..23,
 *       "transactions_last_5_minutes": integer,
 *       "previous_suspicious_count": integer,
 *       "behavioural_deviation": number           // amountDeviationPercent
 *     }
 *   Response 200:
 *     {
 *       "fraud_probability": number in [0, 1],
 *       "model_version": string,
 *       "prediction": "suspicious" | "normal"
 *     }
 *
 * SAFE FALLBACK POLICY
 * --------------------
 * If the ML service is not configured, times out, returns a non-2xx, or
 * returns an ill-formed body, this client returns:
 *   {
 *     serviceStatus: UNAVAILABLE | INVALID_RESPONSE,
 *     mlProbability: null,
 *     mlRisk:        null,
 *     modelVersion:  null,
 *   }
 *
 * The riskScorer treats a null mlRisk as 0 contribution (no fake probability).
 * The decisionEngine may still upgrade an elevated rule/behavioural score to
 * VERIFICATION_REQUIRED when ML is unavailable — see decisionEngine.js.
 */

const TIMEOUT_MS = 2500;

export async function predict(features, requestId, transactionId = "unassigned") {
  if (!env.mlServiceUrl) {
    return {
      serviceStatus: ML_SERVICE_STATUS.UNAVAILABLE,
      mlProbability: null,
      mlRisk: null,
      modelVersion: null,
    };
  }

  const payload = {
    amount: features.amountPaise / 100,
    amount_to_average_ratio: features.amountRatio,
    beneficiary_age_days: features.beneficiaryAgeDays,
    is_new_beneficiary: features.isNewBeneficiary ? 1 : 0,
    is_new_device: features.isNewDevice ? 1 : 0,
    hour_of_day: features.hourOfDay,
    transactions_last_5_minutes: features.transactionsLast5Minutes,
    previous_suspicious_count: features.previousSuspiciousCount,
    behavioural_deviation: features.amountDeviationPercent,
  };

  try {
    const response = await fetch(`${env.mlServiceUrl}/predict`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId || "unknown",
        "x-transaction-id": String(transactionId),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        serviceStatus: ML_SERVICE_STATUS.UNAVAILABLE,
        mlProbability: null,
        mlRisk: null,
        modelVersion: null,
      };
    }

    const result = await response.json();
    const prob = result?.fraud_probability;
    if (typeof prob !== "number" || Number.isNaN(prob) || prob < 0 || prob > 1) {
      return {
        serviceStatus: ML_SERVICE_STATUS.INVALID_RESPONSE,
        mlProbability: null,
        mlRisk: null,
        modelVersion: result?.model_version || null,
      };
    }

    return {
      serviceStatus: ML_SERVICE_STATUS.AVAILABLE,
      mlProbability: prob,
      mlRisk: Math.round(prob * 100),
      modelVersion: result?.model_version || null,
    };
  } catch (_error) {
    return {
      serviceStatus: ML_SERVICE_STATUS.UNAVAILABLE,
      mlProbability: null,
      mlRisk: null,
      modelVersion: null,
    };
  }
}