import { useMemo, useState } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  BrainCircuit,
  Zap,
  TrendingUp,
  AlertTriangle,
  Clock3,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  UserRound,
  WalletCards,
  Fingerprint,
  CircleDollarSign,
  MapPin,
  Gauge,
} from "lucide-react";
import { motion } from "framer-motion";

import { RiskChip } from "../common/RiskChip.jsx";
import { formatPaise } from "../../utils/money.js";
import { formatDateTime } from "../../utils/date.js";

function clamp(value, min = 0, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

function getRiskTheme(level, score) {
  const normalized = String(level || "").toUpperCase();

  if (normalized === "HIGH" || score >= 70) return "high";
  if (normalized === "MEDIUM" || score >= 35) return "medium";
  return "low";
}

function getRiskLabel(level, score) {
  const normalized = String(level || "").toUpperCase();

  if (normalized === "HIGH" || score >= 70) return "HIGH RISK";
  if (normalized === "MEDIUM" || score >= 35) return "MEDIUM RISK";
  return "LOW RISK";
}

function getDecisionLabel(decision) {
  switch (String(decision || "").toUpperCase()) {
    case "VERIFICATION_REQUIRED":
      return "VERIFICATION REQUIRED";
    case "BLOCKED":
      return "TRANSACTION BLOCKED";
    case "COMPLETED":
      return "TRANSACTION COMPLETED";
    default:
      return "ANALYSIS COMPLETE";
  }
}

function getDecisionClass(decision) {
  switch (String(decision || "").toUpperCase()) {
    case "BLOCKED":
      return "blocked";
    case "COMPLETED":
      return "completed";
    default:
      return "verification";
  }
}

function signalTitle(signal) {
  return (
    signal?.title ||
    signal?.name ||
    signal?.rule ||
    signal?.label ||
    signal?.type ||
    "Security signal"
  );
}

function signalDescription(signal) {
  return (
    signal?.description ||
    signal?.message ||
    signal?.reason ||
    signal?.detail ||
    "This signal contributed to the fraud engine's decision."
  );
}

function signalScore(signal) {
  const raw =
    signal?.score ??
    signal?.points ??
    signal?.contribution ??
    signal?.impact ??
    null;

  if (raw === null || raw === undefined || raw === "") return null;

  const number = Number(raw);

  if (!Number.isFinite(number)) return String(raw);

  return number > 0 ? `+${number}` : String(number);
}

function maskAccount(accountNumber) {
  if (!accountNumber) return "—";

  const value = String(accountNumber);

  if (value.length <= 4) return `•••• ${value}`;

  return `•••• ${value.slice(-4)}`;
}

function formatMlRisk(mlRisk, mlProbability) {
  if (mlRisk !== null && mlRisk !== undefined && Number.isFinite(Number(mlRisk))) {
    return {
      value: Math.round(Number(mlRisk)),
      suffix: "/100",
      status:
        Number(mlRisk) >= 70
          ? "High"
          : Number(mlRisk) >= 35
            ? "Moderate"
            : "Low",
    };
  }

  if (
    mlProbability !== null &&
    mlProbability !== undefined &&
    Number.isFinite(Number(mlProbability))
  ) {
    const score = Math.round(Number(mlProbability) * 100);

    return {
      value: score,
      suffix: "/100",
      status:
        score >= 70 ? "High" : score >= 35 ? "Moderate" : "Low",
    };
  }

  return {
    value: "—",
    suffix: "",
    status: "Unavailable",
  };
}

function RiskMeter({ score, theme }) {
  const safeScore = clamp(score);

  const radius = 78;
  const circumference = 2 * Math.PI * radius;

  const progress = (safeScore / 100) * circumference;

  return (
    <div className={`explain__meter explain__meter--${theme}`}>
      <svg
        viewBox="0 0 190 190"
        className="explain__meter-svg"
        aria-label={`Fraud score ${safeScore} out of 100`}
      >
        <circle
          className="explain__meter-track"
          cx="95"
          cy="95"
          r={radius}
        />

        <motion.circle
          className="explain__meter-progress"
          cx="95"
          cy="95"
          r={radius}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference - progress,
          }}
          transition={{
            duration: 1.2,
            ease: "easeOut",
          }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>

      <div className="explain__meter-center">
        <span className="explain__meter-caption">FRAUD SCORE</span>

        <strong>{safeScore}</strong>

        <span className="explain__meter-outof">/100</span>

        <span className="explain__meter-risk">
          {getRiskLabel(theme.toUpperCase(), safeScore)}
        </span>
      </div>

      <div className="explain__meter-scale">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}

function ScoreCard({
  icon: Icon,
  label,
  value,
  suffix = "/100",
  status,
  accent = "default",
}) {
  return (
    <motion.div
      className={`explain__stat explain__stat--${accent}`}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="explain__stat-top">
        <span className="explain__stat-icon">
          <Icon size={15} strokeWidth={2} />
        </span>

        <span className="explain__stat-label">{label}</span>
      </div>

      <div className="explain__stat-value">
        {value}
        {suffix && <em>{suffix}</em>}
      </div>

      <span className="explain__stat-status">
        {status || "Analysis complete"}
      </span>
    </motion.div>
  );
}

function SignalColumn({
  title,
  icon: Icon,
  items = [],
  emptyText,
}) {
  return (
    <section className="explain__column">
      <div className="explain__section-heading">
        <span className="explain__section-icon">
          <Icon size={16} />
        </span>

        <div>
          <strong>{title}</strong>
          <span className="explain__count">{items.length}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="explain__empty">
          <ShieldCheck size={15} />
          <span>{emptyText}</span>
        </div>
      ) : (
        <motion.ul className="explain__signal-list">
          {items.map((signal, index) => {
            const score = signalScore(signal);

            return (
              <motion.li
                key={`${title}-${index}`}
                className="explain__signal-row"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.06,
                  duration: 0.25,
                }}
              >
                <span className="explain__signal-icon">
                  {signal?.icon === "velocity" ? (
                    <Activity size={15} />
                  ) : signal?.icon === "amount" ? (
                    <CircleDollarSign size={15} />
                  ) : (
                    <TrendingUp size={15} />
                  )}
                </span>

                <div className="explain__signal-body">
                  <div className="explain__signal-title">
                    <strong>{signalTitle(signal)}</strong>

                    {score !== null && (
                      <span>{score}</span>
                    )}
                  </div>

                  <p>{signalDescription(signal)}</p>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </section>
  );
}

function DetailItem({ icon: Icon, label, value, highlight = false }) {
  return (
    <div className="explain__detail">
      <div className="explain__detail-icon">
        <Icon size={14} />
      </div>

      <div className="explain__detail-content">
        <span>{label}</span>
        <strong className={highlight ? "is-highlight" : ""}>
          {value || "—"}
        </strong>
      </div>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  title,
  description,
  time,
  state = "done",
}) {
  return (
    <div className={`explain__timeline-item explain__timeline-item--${state}`}>
      <div className="explain__timeline-node">
        <Icon size={14} />
      </div>

      <div className="explain__timeline-content">
        <strong>{title}</strong>
        <span>{description}</span>

        {time && <small>{time}</small>}
      </div>
    </div>
  );
}

export function ExplainPanel({ analysis }) {
  const [copied, setCopied] = useState(false);

  const data = analysis || {};

  const score = clamp(data.finalRiskScore ?? data.riskScore);

  const theme = getRiskTheme(data.riskLevel, score);

  const riskLabel = getRiskLabel(data.riskLevel, score);

  const decision = getDecisionLabel(data.decision);

  const decisionClass = getDecisionClass(data.decision);

  const ml = formatMlRisk(
    data.mlRisk,
    data.mlProbability
  );

  const transaction = data.transaction || {};

  const beneficiary = transaction.beneficiary || {};

  const triggeredRules = Array.isArray(data.triggeredRules)
    ? data.triggeredRules
    : [];

  const behaviouralSignals = Array.isArray(data.behaviouralSignals)
    ? data.behaviouralSignals
    : [];

  const mlAvailable =
    String(data.mlServiceStatus || "").toUpperCase() ===
      "AVAILABLE" &&
    ml.value !== "—";

  const eventId = data._id || data.id || "—";

  const transactionId =
    transaction._id ||
    transaction.id ||
    transaction.referenceId ||
    data.transactionId ||
    "—";

  const amount = formatPaise(transaction.amountPaise);

  const transactionType =
    transaction.type ||
    transaction.transactionType ||
    data.entryType ||
    "—";

  const transactionStatus =
    transaction.status ||
    data.decision ||
    "—";

  const account =
    beneficiary.accountNumber ||
    transaction.accountNumber ||
    "";

  const accountDisplay = maskAccount(account);

  const beneficiaryName =
    beneficiary.name ||
    transaction.beneficiaryName ||
    data.beneficiaryName ||
    "Unknown Beneficiary";

  const channel =
    transaction.channel ||
    transaction.source ||
    "Mobile Banking";

  const createdAt =
    data.createdAt ||
    transaction.createdAt ||
    null;

  const modelStatus =
    data.mlServiceStatus || "UNAVAILABLE";

  const modelVersion =
    data.modelVersion || "—";

  const copyEventId = async () => {
    if (!eventId || eventId === "—") return;

    try {
      await navigator.clipboard.writeText(String(eventId));

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  };

  const explanationText = useMemo(() => {
    if (decisionClass === "blocked") {
      return "Our fraud engine detected multiple high-risk signals in this transaction and blocked it for your protection.";
    }

    if (decisionClass === "completed") {
      return "Our fraud engine reviewed this transaction and did not detect a blocking security concern.";
    }

    return "Our fraud engine detected multiple risk signals in this transaction. Please review the details below.";
  }, [decisionClass]);

  return (
    <motion.div
      className={`explain explain--${theme}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: "easeOut",
      }}
      data-testid="fraud-explanation-panel"
    >
      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <div className="explain__topbar">
        <div className="explain__topbar-title">
          <div className="explain__topbar-icon">
            {theme === "high" ? (
              <ShieldAlert size={20} />
            ) : theme === "medium" ? (
              <Shield size={20} />
            ) : (
              <ShieldCheck size={20} />
            )}
          </div>

          <div>
            <span className="eyebrow">FRAUD ENGINE</span>

            <h3>AI-powered security analysis</h3>

            <p>
              Multiple security signals were evaluated before this
              transaction decision.
            </p>
          </div>
        </div>

        <div
          className={`explain__decision-badge explain__decision-badge--${decisionClass}`}
        >
          <span />
          {decision}
        </div>
      </div>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="explain__hero">
        <div className="explain__meter-wrap">
          <div className="explain__meter-pulse" />

          <RiskMeter
            score={score}
            theme={theme}
          />
        </div>

        <div className="explain__hero-content">
          <div className="explain__risk-heading">
            <span className="explain__risk-icon">
              {decisionClass === "blocked" ? (
                <ShieldAlert size={17} />
              ) : (
                <Shield size={17} />
              )}
            </span>

            <div>
              <span className="eyebrow">SECURITY DECISION</span>
              <h3>Why this decision?</h3>
            </div>
          </div>

          <p className="explain__decision">
            {explanationText}
          </p>

          <div className="explain__stats">
            <ScoreCard
              icon={Shield}
              label="RULE SCORE"
              value={
                data.ruleScore !== undefined &&
                data.ruleScore !== null
                  ? Math.round(data.ruleScore)
                  : "—"
              }
              status={
                data.ruleScore >= 70
                  ? "Critical"
                  : data.ruleScore >= 35
                    ? "Elevated"
                    : "Normal"
              }
              accent="rule"
            />

            <ScoreCard
              icon={Activity}
              label="BEHAVIOUR SCORE"
              value={
                data.behaviouralScore !== undefined &&
                data.behaviouralScore !== null
                  ? Math.round(data.behaviouralScore)
                  : "—"
              }
              status={
                data.behaviouralScore >= 70
                  ? "Unusual"
                  : data.behaviouralScore >= 35
                    ? "Elevated"
                    : "Normal"
              }
              accent="behaviour"
            />

            <ScoreCard
              icon={BrainCircuit}
              label="ML RISK"
              value={ml.value}
              suffix={ml.suffix}
              status={
                mlAvailable
                  ? ml.status
                  : "Unavailable"
              }
              accent="ml"
            />
          </div>

          <div className="explain__model-row">
            <span>
              <BrainCircuit size={13} />
              ML probability
            </span>

            <strong>
              {data.mlProbability !== null &&
              data.mlProbability !== undefined
                ? `${Math.round(
                    Number(data.mlProbability) * 100
                  )}%`
                : "—"}
            </strong>

            <span className="explain__model-status">
              {modelStatus}
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          SIGNALS
      ===================================================== */}

      <div className="explain__grid">
        <SignalColumn
          title="Triggered Rules"
          icon={Zap}
          items={triggeredRules}
          emptyText="No rule-based signals were triggered."
        />

        <SignalColumn
          title="Behavioural Signals"
          icon={Activity}
          items={behaviouralSignals}
          emptyText="No behavioural anomalies detected."
        />
      </div>

      {/* =====================================================
          RISK SIGNALS SUMMARY
      ===================================================== */}

      <section className="explain__signals-summary">
        <div className="explain__signals-summary-head">
          <div>
            <span className="eyebrow">ENGINE INDICATORS</span>
            <h4>Risk Signals</h4>
          </div>

          <span className="explain__signals-summary-status">
            {riskLabel}
          </span>
        </div>

        <div className="explain__risk-signal-grid">
          <div className="explain__risk-signal">
            <span className="explain__risk-signal-icon explain__risk-signal-icon--red">
              <Activity size={16} />
            </span>

            <div>
              <span>Transaction Risk</span>
              <strong>
                {score >= 70
                  ? "High"
                  : score >= 35
                    ? "Moderate"
                    : "Normal"}
              </strong>
            </div>
          </div>

          <div className="explain__risk-signal">
            <span className="explain__risk-signal-icon explain__risk-signal-icon--amber">
              <CircleDollarSign size={16} />
            </span>

            <div>
              <span>Amount Risk</span>
              <strong>
                {data.ruleScore >= 50
                  ? "Elevated"
                  : "Normal"}
              </strong>
            </div>
          </div>

          <div className="explain__risk-signal">
            <span className="explain__risk-signal-icon explain__risk-signal-icon--green">
              <Gauge size={16} />
            </span>

            <div>
              <span>Velocity Risk</span>
              <strong>Normal</strong>
            </div>
          </div>

          <div className="explain__risk-signal">
            <span className="explain__risk-signal-icon explain__risk-signal-icon--red">
              <UserRound size={16} />
            </span>

            <div>
              <span>Beneficiary Risk</span>
              <strong>
                {beneficiaryName === "Unknown Beneficiary"
                  ? "Elevated"
                  : "Normal"}
              </strong>
            </div>
          </div>

          <div className="explain__risk-signal">
            <span className="explain__risk-signal-icon explain__risk-signal-icon--green">
              <Smartphone size={16} />
            </span>

            <div>
              <span>Device Risk</span>
              <strong>Normal</strong>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          TRANSACTION DETAILS
      ===================================================== */}

      <section className="explain__details">
        <div className="explain__details-head">
          <div>
            <span className="eyebrow">EVENT INFORMATION</span>
            <h4>Transaction Details</h4>
          </div>

          <button
            type="button"
            className="explain__copy"
            onClick={copyEventId}
            title="Copy event ID"
          >
            {copied ? (
              <>
                <Check size={13} />
                Copied
              </>
            ) : (
              <>
                <Copy size={13} />
                Copy event ID
              </>
            )}
          </button>
        </div>

        <div className="explain__details-grid">
          <DetailItem
            icon={CircleDollarSign}
            label="Amount"
            value={amount}
            highlight
          />

          <DetailItem
            icon={UserRound}
            label="Beneficiary"
            value={beneficiaryName}
          />

          <DetailItem
            icon={WalletCards}
            label="Type"
            value={transactionType}
          />

          <DetailItem
            icon={Fingerprint}
            label="Account"
            value={accountDisplay}
          />

          <DetailItem
            icon={Shield}
            label="Status"
            value={transactionStatus}
            highlight
          />

          <DetailItem
            icon={Fingerprint}
            label="Reference ID"
            value={transactionId}
          />

          <DetailItem
            icon={Clock3}
            label="Date & Time"
            value={
              createdAt
                ? formatDateTime(createdAt)
                : "—"
            }
          />

          <DetailItem
            icon={Smartphone}
            label="Channel"
            value={channel}
          />
        </div>

        <div className="explain__event-meta">
          <span>
            Event ID
            <strong>{eventId}</strong>
          </span>

          <span>
            Model
            <strong>{modelVersion}</strong>
          </span>

          <span>
            ML service
            <strong>{modelStatus}</strong>
          </span>
        </div>
      </section>

      {/* =====================================================
          INVESTIGATION TIMELINE
      ===================================================== */}

      <section className="explain__timeline">
        <div className="explain__timeline-head">
          <div>
            <span className="eyebrow">SECURITY HISTORY</span>
            <h4>Investigation Timeline</h4>
          </div>

          <span className="explain__timeline-live">
            <span />
            Live record
          </span>
        </div>

        <div className="explain__timeline-track">
          <TimelineItem
            icon={ArrowUpRight}
            title="Transaction detected"
            description="Transaction entered the fraud monitoring pipeline."
            time={createdAt ? formatDateTime(createdAt) : null}
            state="done"
          />

          <TimelineItem
            icon={BrainCircuit}
            title="Fraud engine analyzed"
            description="Available security signals were evaluated."
            time={createdAt ? formatDateTime(createdAt) : null}
            state="done"
          />

          <TimelineItem
            icon={AlertTriangle}
            title="Risk signals detected"
            description={`${triggeredRules.length + behaviouralSignals.length} security signal(s) contributed to the analysis.`}
            time={createdAt ? formatDateTime(createdAt) : null}
            state={
              score >= 70
                ? "danger"
                : "warning"
            }
          />

          <TimelineItem
            icon={ShieldAlert}
            title={decision}
            description={
              decisionClass === "blocked"
                ? "Transaction was blocked for your protection."
                : decisionClass === "completed"
                  ? "Transaction passed the security checks."
                  : "Additional verification is required."
            }
            time={createdAt ? formatDateTime(createdAt) : null}
            state={
              decisionClass === "blocked"
                ? "danger"
                : decisionClass === "completed"
                  ? "done"
                  : "warning"
            }
          />

          <TimelineItem
            icon={Clock3}
            title={
              data.reviewStatus === "REVIEWED"
                ? "Review completed"
                : data.reviewStatus === "DISMISSED"
                  ? "Review dismissed"
                  : "Pending review"
            }
            description={
              data.reviewStatus === "REVIEWED"
                ? "This fraud event has been reviewed."
                : data.reviewStatus === "DISMISSED"
                  ? "This event was dismissed after review."
                  : "This event remains available for review."
            }
            state={
              data.reviewStatus === "REVIEWED" ||
              data.reviewStatus === "DISMISSED"
                ? "done"
                : "pending"
            }
          />
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="explain__decision-footer">
        <div className="explain__decision-footer-icon">
          {decisionClass === "blocked" ? (
            <ShieldAlert size={17} />
          ) : decisionClass === "completed" ? (
            <ShieldCheck size={17} />
          ) : (
            <Shield size={17} />
          )}
        </div>

        <div>
          <strong>{decision}</strong>

          <span>
            Fraud engine decision is based on the combined
            security score of this transaction.
          </span>
        </div>

        <div className="explain__decision-footer-score">
          <small>FINAL SCORE</small>
          <strong>{score}/100</strong>
        </div>
      </div>
    </motion.div>
  );
}

export default ExplainPanel;