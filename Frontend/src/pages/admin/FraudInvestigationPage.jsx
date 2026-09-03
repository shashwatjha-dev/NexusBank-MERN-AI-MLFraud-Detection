import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Activity,
  Brain,
  Clock3,
  User,
  CreditCard,
} from "lucide-react";

import { adminService } from "../../services/adminService.js";
import { useApi } from "../../hooks/useApi.js";
import { Card, CardHeader } from "../../components/common/Card.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { ExplainPanel } from "../../components/fraud/ExplainPanel.jsx";
import { RiskChip } from "../../components/common/RiskChip.jsx";
import { formatPaise } from "../../utils/money.js";
import { formatDateTime } from "../../utils/date.js";
import { useToast } from "../../hooks/useToast.js";

/**
 * Admin fraud investigation page.
 *
 * Shows:
 * - Transaction information
 * - Risk level
 * - Final risk score
 * - Rule score
 * - Behavioural score
 * - ML probability
 * - Triggered fraud rules
 * - ML service status
 * - Complete fraud explanation
 * - Admin review actions
 */

function normalizePercentage(value) {
  if (!Number.isFinite(Number(value))) return "0%";

  const number = Number(value);

  // ML probability normally arrives as 0..1.
  if (number >= 0 && number <= 1) {
    return `${Math.round(number * 100)}%`;
  }

  return `${Math.round(number)}%`;
}

function ScoreCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "",
}) {
  return (
    <div className={`fraud-score-card fraud-score-card--${tone}`}>
      <div className="row-flex between gap-3">
        <span className="eyebrow">{label}</span>

        {Icon ? <Icon size={18} /> : null}
      </div>

      <strong className="fraud-score-card__value">
        {value}
      </strong>

      {helper ? (
        <span className="muted">
          {helper}
        </span>
      ) : null}
    </div>
  );
}

function RuleItem({ rule, index }) {
  const label =
    rule?.label ||
    rule?.code ||
    `Rule ${index + 1}`;

  return (
    <li className="dense-list__item">
      <div className="stack" style={{ gap: 3 }}>
        <strong>{label}</strong>

        {rule?.evidence ? (
          <span className="subtle" style={{ fontSize: 12 }}>
            {rule.evidence}
          </span>
        ) : null}
      </div>

      {Number.isFinite(Number(rule?.contribution)) ? (
        <strong>
          +{rule.contribution}
        </strong>
      ) : null}
    </li>
  );
}

export function FraudInvestigationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const {
    data,
    loading,
    error,
    refetch,
  } = useApi(
    () => adminService.fraudLog(id),
    [id]
  );

  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  if (error) {
    return (
      <ErrorState
        description={error.message}
        onRetry={refetch}
      />
    );
  }

  if (loading || !data) {
    return <Skeleton height={620} />;
  }

  const tx = data.transaction || {};

  /*
   * ExplainPanel expects finalRiskScore.
   * Fraud logs store the score as riskScore.
   */
  const analysis = {
    ...data,
    finalRiskScore:
      data.finalRiskScore ??
      data.riskScore ??
      0,
  };

  const riskScore = Number(
    data.finalRiskScore ??
      data.riskScore ??
      0
  );

  const ruleScore = Number(
    data.ruleScore ?? 0
  );

  const behaviouralScore = Number(
    data.behaviouralScore ?? 0
  );

  const mlProbability =
    data.mlProbability ??
    data.mlRisk ??
    null;

  const triggeredRules =
    data.triggeredRules ||
    data.rules ||
    [];

  const behaviouralSignals =
    data.behaviouralSignals ||
    [];

  const mlStatus =
    data.mlServiceStatus ||
    "UNKNOWN";

  const decision =
    data.decision ||
    data.fraudDecision ||
    "UNKNOWN";

  const riskLevel =
    data.riskLevel ||
    "UNKNOWN";

  const reviewStatus =
    data.reviewStatus ||
    "OPEN";

  const review = async (reviewStatusValue) => {
    setBusy(true);

    try {
      await adminService.reviewFraud(id, {
        reviewStatus: reviewStatusValue,
        reviewNotes:
          notes.trim() || undefined,
      });

      toast.success(
        `Marked ${reviewStatusValue.toLowerCase()}.`
      );

      navigate("/admin/fraud");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack stack-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="stack stack-2">
        <span className="eyebrow">
          Fraud investigation
        </span>

        <div className="row-flex between wrap gap-3">
          <div>
            <h1 className="row-flex gap-3">
              Investigation
              <RiskChip level={riskLevel} />
            </h1>

            <p className="muted">
              Review the exact evidence captured by
              the fraud engine at decision time.
            </p>
          </div>

          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">
              Review status
            </span>

            <strong>
              {reviewStatus}
            </strong>
          </div>
        </div>
      </header>

      {/* =====================================================
          TRANSACTION SUMMARY
      ===================================================== */}

      <Card>
        <CardHeader
          eyebrow="Transaction"
          title={formatPaise(
            tx.amountPaise
          )}
        />

        <div className="row-flex between wrap gap-4">

          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">
              <User
                size={13}
                style={{
                  verticalAlign: "middle",
                }}
              />{" "}
              User
            </span>

            <strong>
              {data.user?.name || "Unknown user"}
            </strong>

            <span
              className="subtle"
              style={{ fontSize: 12 }}
            >
              {data.user?.email || "—"}
            </span>
          </div>

          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">
              <CreditCard
                size={13}
                style={{
                  verticalAlign: "middle",
                }}
              />{" "}
              Beneficiary
            </span>

            <strong>
              {tx.beneficiary || "—"}
            </strong>
          </div>

          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">
              <Clock3
                size={13}
                style={{
                  verticalAlign: "middle",
                }}
              />{" "}
              When
            </span>

            <strong>
              {formatDateTime(
                tx.createdAt ||
                  data.createdAt
              )}
            </strong>
          </div>

          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">
              Decision
            </span>

            <strong>
              {String(decision).replaceAll(
                "_",
                " "
              )}
            </strong>
          </div>
        </div>
      </Card>

      {/* =====================================================
          RISK SCORE
      ===================================================== */}

      <Card>
        <CardHeader
          eyebrow="Risk analysis"
          title="Fraud risk breakdown"
        />

        <div className="metric-grid">

          <ScoreCard
            label="Final risk score"
            value={`${riskScore}/100`}
            helper={`Risk level: ${riskLevel}`}
            icon={ShieldAlert}
            tone={
              riskLevel === "HIGH"
                ? "danger"
                : riskLevel === "MEDIUM"
                  ? "warning"
                  : "success"
            }
          />

          <ScoreCard
            label="Rule score"
            value={`${ruleScore}/100`}
            helper="Categorical fraud rules"
            icon={Activity}
          />

          <ScoreCard
            label="Behavioural score"
            value={`${behaviouralScore}/100`}
            helper="User behaviour deviation"
            icon={Activity}
          />

          <ScoreCard
            label="ML probability"
            value={
              mlProbability === null
                ? "Unavailable"
                : normalizePercentage(
                    mlProbability
                  )
            }
            helper={`ML service: ${mlStatus}`}
            icon={Brain}
            tone={
              mlStatus === "AVAILABLE"
                ? "success"
                : "warning"
            }
          />

        </div>
      </Card>

      {/* =====================================================
          TRIGGERED RULES
      ===================================================== */}

      <Card>
        <CardHeader
          eyebrow="Evidence"
          title="Triggered fraud rules"
        />

        {triggeredRules.length > 0 ? (
          <ol className="dense-list">

            {triggeredRules.map(
              (rule, index) => (
                <RuleItem
                  key={
                    rule?.code ||
                    rule?._id ||
                    index
                  }
                  rule={rule}
                  index={index}
                />
              )
            )}

          </ol>
        ) : (
          <p className="muted">
            No categorical fraud rules were
            triggered for this transaction.
          </p>
        )}
      </Card>

      {/* =====================================================
          BEHAVIOURAL SIGNALS
      ===================================================== */}

      <Card>
        <CardHeader
          eyebrow="Behaviour"
          title="Behavioural signals"
        />

        {behaviouralSignals.length > 0 ? (
          <ul className="dense-list">

            {behaviouralSignals.map(
              (signal, index) => {

                if (
                  typeof signal ===
                  "string"
                ) {
                  return (
                    <li key={index}>
                      <span>
                        {signal}
                      </span>
                    </li>
                  );
                }

                return (
                  <li
                    key={
                      signal?.code ||
                      signal?.label ||
                      index
                    }
                  >
                    <span>
                      {signal?.label ||
                        signal?.code ||
                        "Behavioural signal"}
                    </span>

                    <span className="subtle">
                      {signal?.evidence ||
                        signal?.value ||
                        "Detected"}
                    </span>
                  </li>
                );
              }
            )}

          </ul>
        ) : (
          <p className="muted">
            No additional behavioural signals
            were recorded.
          </p>
        )}
      </Card>

      {/* =====================================================
          FULL EXPLANATION
      ===================================================== */}

      <Card>
        <CardHeader
          eyebrow="Fraud engine"
          title="Complete engine explanation"
        />

        <ExplainPanel
          analysis={analysis}
        />
      </Card>

      {/* =====================================================
          ADMIN REVIEW
      ===================================================== */}

      <Card>
        <CardHeader
          eyebrow="Admin review"
          title="Resolve this case"
        />

        <div className="stack stack-4">

          <div className="row-flex between wrap gap-3">
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow">
                Current decision
              </span>

              <strong>
                {String(decision).replaceAll(
                  "_",
                  " "
                )}
              </strong>
            </div>

            <RiskChip
              level={riskLevel}
            />
          </div>

          <label className="field">
            <span className="field__label">
              Review notes
            </span>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              rows={4}
              className="field__control"
              style={{
                padding: "10px 14px",
              }}
              placeholder="Add context, investigation findings, next steps, or customer contact notes…"
              data-testid="fraud-review-notes"
            />
          </label>

          <div className="row-flex gap-3 wrap">

            <Button
              variant="primary"
              icon={CheckCircle2}
              onClick={() =>
                review("REVIEWED")
              }
              loading={busy}
              data-testid="fraud-mark-reviewed"
            >
              Mark reviewed
            </Button>

            <Button
              variant="outline"
              icon={XCircle}
              onClick={() =>
                review("DISMISSED")
              }
              loading={busy}
              data-testid="fraud-mark-dismissed"
            >
              Dismiss (false positive)
            </Button>

          </div>
        </div>
      </Card>

    </div>
  );
}