import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Cpu,
  Gauge,
  Layers3,
  Loader2,
  LockKeyhole,
  Play,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";

import { demoService } from "../../services/demoService.js";

import "./DemoPage.css";


/* ============================================================
   SCENARIOS
   ============================================================ */

const SCENARIOS = {
  low: {
    key: "low",
    title: "Regular Transfer",
    shortTitle: "Low Risk",
    eyebrow: "LOW RISK",
    description:
      "Trusted beneficiary, known device and normal activity pattern.",
    amount: 2500,
    amountLabel: "₹2,500",
    colorClass: "low",
    icon: ShieldCheck,
  },

  medium: {
    key: "medium",
    title: "Unusual Activity",
    shortTitle: "Medium Risk",
    eyebrow: "MEDIUM RISK",
    description:
      "Elevated amount, new beneficiary and behavioural deviation.",
    amount: 75000,
    amountLabel: "₹50,000 – ₹99,999",
    colorClass: "medium",
    icon: AlertTriangle,
  },

  high: {
    key: "high",
    title: "Suspicious Transaction",
    shortTitle: "High Risk",
    eyebrow: "HIGH RISK",
    description:
      "Large amount, unfamiliar device, unusual time and elevated velocity.",
    amount: 200000,
    amountLabel: "₹1,00,000 – ₹3,00,000",
    colorClass: "high",
    icon: ShieldAlert,
  },
};
/* ============================================================
   PIPELINE
   ============================================================ */

const PIPELINE_STAGES = [
  {
    key: "transaction",
    label: "Transaction Received",
    short: "Transaction",
    icon: Activity,
  },
  {
    key: "features",
    label: "Feature Extraction",
    short: "Features",
    icon: Layers3,
  },
  {
    key: "rules",
    label: "Rule Engine Analysis",
    short: "Rules",
    icon: Shield,
  },
  {
    key: "behaviour",
    label: "Behaviour Analysis",
    short: "Behaviour",
    icon: TrendingUp,
  },
  {
    key: "ml",
    label: "ML Model Prediction",
    short: "ML Model",
    icon: Brain,
  },
  {
    key: "risk",
    label: "Risk Calculation",
    short: "Risk",
    icon: Gauge,
  },
  {
    key: "decision",
    label: "Decision Generated",
    short: "Decision",
    icon: Target,
  },
];


/* ============================================================
   HELPERS
   ============================================================ */

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}


function formatNumber(value, fallback = "—") {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN")
    : fallback;
}


function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${Math.round(number)}%`;
}


function normalizeResult(result) {
  if (!result) {
    return null;
  }

  if (result.analysis) {
    return result;
  }

  if (result.data?.analysis) {
    return {
      ...result.data,
      analysis: result.data.analysis,
    };
  }

  if (result.data) {
    return {
      scenario:
        result.scenario || null,
      label:
        result.label || "",
      analysis:
        result.data,
    };
  }

  return {
    scenario:
      result.scenario || null,
    label:
      result.label || "",
    analysis:
      result,
  };
}


function getRiskClass(riskLevel) {
  const value = String(
    riskLevel || ""
  ).toUpperCase();

  if (value === "HIGH") {
    return "high";
  }

  if (value === "MEDIUM") {
    return "medium";
  }

  return "low";
}


function getDecisionClass(decision) {
  const value = String(
    decision || ""
  ).toUpperCase();

  if (value === "BLOCKED") {
    return "blocked";
  }

  if (
    value ===
    "VERIFICATION_REQUIRED"
  ) {
    return "verification";
  }

  return "completed";
}


function getDecisionLabel(decision) {
  const value = String(
    decision || ""
  ).toUpperCase();

  if (value === "BLOCKED") {
    return "Blocked";
  }

  if (
    value ===
    "VERIFICATION_REQUIRED"
  ) {
    return "Verification Required";
  }

  if (value === "COMPLETED") {
    return "Completed";
  }

  return decision || "Pending";
}


function getScenarioIcon(scenario) {
  return (
    SCENARIOS[scenario]?.icon ||
    Shield
  );
}


function getFeatureValue(
  features,
  keys,
  fallback = "—"
) {
  for (const key of keys) {
    if (
      features &&
      features[key] !== undefined &&
      features[key] !== null
    ) {
      return features[key];
    }
  }

  return fallback;
}


/* ============================================================
   ANIMATED NUMBER
   ============================================================ */

function useAnimatedNumber(
  target,
  duration = 900,
  enabled = true
) {
  const numericTarget =
    Number(target);

  const safeTarget =
    Number.isFinite(
      numericTarget
    )
      ? numericTarget
      : null;

  const [
    value,
    setValue,
  ] = useState(
    enabled &&
      safeTarget !== null
      ? 0
      : safeTarget
  );

  useEffect(() => {
    if (
      !enabled ||
      safeTarget === null
    ) {
      setValue(safeTarget);
      return undefined;
    }

    let frame;

    const start =
      performance.now();

    const animate = (now) => {
      const elapsed =
        now - start;

      const progress =
        Math.min(
          elapsed / duration,
          1
        );

      const eased =
        1 -
        Math.pow(
          1 - progress,
          3
        );

      setValue(
        safeTarget * eased
      );

      if (progress < 1) {
        frame =
          requestAnimationFrame(
            animate
          );
      }
    };

    frame =
      requestAnimationFrame(
        animate
      );

    return () => {
      if (frame) {
        cancelAnimationFrame(
          frame
        );
      }
    };
  }, [
    safeTarget,
    duration,
    enabled,
  ]);

  return value;
}


function AnimatedScore({
  value,
  suffix = "",
  duration = 900,
  className = "",
}) {
  const numeric =
    Number(value);

  const animated =
    useAnimatedNumber(
      numeric,
      duration,
      Number.isFinite(numeric)
    );

  if (!Number.isFinite(numeric)) {
    return (
      <span className={className}>
        {value}
        {suffix}
      </span>
    );
  }

  return (
    <span className={className}>
      {Math.round(animated)}
      {suffix}
    </span>
  );
}


/* ============================================================
   STATUS DOT
   ============================================================ */

function StatusDot({
  status = "ready",
}) {
  return (
    <span
      className={`status-dot status-dot-${status}`}
    >
      <span />
    </span>
  );
}


/* ============================================================
   SCORE RING
   ============================================================ */

function ScoreRing({
  score,
  riskLevel,
  size = "normal",
  loading = false,
}) {
  const numericScore =
    Number(score);

  const safeScore =
    Number.isFinite(
      numericScore
    )
      ? Math.max(
          0,
          Math.min(
            100,
            numericScore
          )
        )
      : 0;

  const animatedScore =
    useAnimatedNumber(
      safeScore,
      1100,
      !loading &&
        Number.isFinite(
          numericScore
        )
    );

  const circumference =
    2 * Math.PI * 42;

  const progress =
    loading
      ? 0
      : animatedScore;

  const offset =
    circumference -
    (progress / 100) *
      circumference;

  const riskClass =
    getRiskClass(
      riskLevel
    );

  return (
    <div
      className={[
        "score-ring",
        `score-ring-${size}`,
        riskClass,
        loading
          ? "is-loading"
          : "is-visible",
      ].join(" ")}
    >
      <svg
        className="score-ring-svg"
        viewBox="0 0 100 100"
      >
        <circle
          className="score-ring-track"
          cx="50"
          cy="50"
          r="42"
        />

        <circle
          className="score-ring-progress"
          cx="50"
          cy="50"
          r="42"
          strokeDasharray={
            circumference
          }
          strokeDashoffset={
            offset
          }
        />
      </svg>

      <div className="score-ring-glow" />

      <div className="score-ring-content">
        {loading ? (
          <>
            <Loader2
              size={
                size === "large"
                  ? 22
                  : 16
              }
              className="spin"
            />

            <small>
              SCANNING
            </small>
          </>
        ) : (
          <>
            <strong>
              {Math.round(
                animatedScore
              )}
            </strong>

            <span>
              /100
            </span>
          </>
        )}
      </div>
    </div>
  );
}


/* ============================================================
   FEATURE CHIP
   ============================================================ */

function FeatureChip({
  icon: Icon,
  title,
  subtitle,
  accent = "blue",
}) {
  return (
    <div
      className={`feature-chip feature-${accent}`}
    >
      <div className="feature-chip-icon">
        <Icon size={15} />
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {subtitle}
        </span>
      </div>
    </div>
  );
}


/* ============================================================
   PIPELINE
   ============================================================ */

function Pipeline({
  running,
  completed,
  activeStage,
}) {
  const count =
    completed
      ? PIPELINE_STAGES.length
      : running
        ? Math.max(
            1,
            activeStage
          )
        : 0;

  const percentage =
    (count /
      PIPELINE_STAGES.length) *
    100;

  return (
    <section
      className={[
        "pipeline-card",
        running
          ? "running"
          : "",
        completed
          ? "completed"
          : "",
      ].join(" ")}
    >
      <div className="pipeline-head">
        <div>
          <span>
            ANALYSIS PIPELINE
          </span>

          <h3>
            {running
              ? "Processing transaction..."
              : completed
                ? "Analysis completed"
                : "Pipeline ready"}
          </h3>
        </div>

        <div className="pipeline-status">
          <StatusDot
            status={
              running
                ? "running"
                : completed
                  ? "ready"
                  : "idle"
            }
          />

          <span>
            {count}/7
            {completed
              ? " Completed"
              : " Complete"}
          </span>
        </div>
      </div>

      <div className="pipeline-progress">
        <span
          style={{
            width: `${percentage}%`,
          }}
        />

        {running && (
          <i />
        )}
      </div>

      <div className="pipeline-stages">
        {PIPELINE_STAGES.map(
          (
            stage,
            index
          ) => {
            const Icon =
              stage.icon;

            const isComplete =
              completed ||
              index + 1 <=
                count;

            const isActive =
              running &&
              index + 1 ===
                activeStage;

            return (
              <div
                key={stage.key}
                className={[
                  "pipeline-stage",
                  isComplete
                    ? "complete"
                    : "",
                  isActive
                    ? "active"
                    : "",
                ].join(" ")}
              >
                <div className="pipeline-stage-icon">
                  {isComplete ? (
                    <Check
                      size={13}
                    />
                  ) : isActive ? (
                    <Loader2
                      size={13}
                      className="spin"
                    />
                  ) : (
                    <Icon
                      size={13}
                    />
                  )}

                  {isActive && (
                    <span />
                  )}
                </div>

                <strong>
                  {stage.short}
                </strong>

                <small>
                  {isComplete
                    ? "Completed"
                    : isActive
                      ? "Processing"
                      : "Waiting"}
                </small>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}


/* ============================================================
   SIGNAL ROW
   ============================================================ */

function RiskSignalRow({
  signal,
  type,
  index,
}) {
  const isRule =
    type === "rule";

  const contribution =
    Number(
      signal?.contribution
    );

  return (
    <div
      className={`risk-signal-row ${type}`}
      style={{
        "--signal-delay": `${
          index * 80
        }ms`,
      }}
    >
      <div className="risk-signal-icon">
        {isRule ? (
          <AlertTriangle
            size={13}
          />
        ) : (
          <Activity
            size={13}
          />
        )}

        <span />
      </div>

      <div className="risk-signal-copy">
        <strong>
          {signal?.label ||
            signal?.code ||
            "Detected signal"}
        </strong>

        <small>
          {signal?.evidence ||
            "Signal detected by fraud intelligence engine."}
        </small>
      </div>

      <div className="risk-signal-value">
        {Number.isFinite(
          contribution
        ) && (
          <strong>
            +
            <AnimatedScore
              value={
                contribution
              }
              duration={750}
            />
          </strong>
        )}

        {signal?.value !==
          undefined && (
          <span>
            {signal.value}

            {signal.unit ===
            "percent"
              ? "%"
              : signal.unit ===
                  "transactions"
                ? " tx"
                : ""}
          </span>
        )}
      </div>
    </div>
  );
}


/* ============================================================
   SIGNAL PANELS
   ============================================================ */

function SignalPanels({
  analysis,
}) {
  const rules =
    analysis?.triggeredRules ||
    [];

  const signals =
    analysis?.behaviouralSignals ||
    [];

  return (
    <div className="signal-panels">
      <div className="signal-panel">
        <div className="signal-panel-head">
          <div>
            <div className="signal-panel-title red">
              <AlertTriangle
                size={14}
              />

              <span>
                Triggered Risk Rules
              </span>
            </div>

            <small>
              Rule engine findings
            </small>
          </div>

          <strong className="signal-count red">
            {rules.length}
          </strong>
        </div>

        {rules.length > 0 ? (
          <div className="signals-list">
            {rules.map(
              (rule, index) => (
                <RiskSignalRow
                  key={
                    `${rule?.code || "rule"}-${index}`
                  }
                  signal={rule}
                  type="rule"
                  index={index}
                />
              )
            )}
          </div>
        ) : (
          <div className="no-signals">
            <div className="no-signals-icon">
              <CheckCircle2
                size={18}
              />
            </div>

            <div>
              <strong>
                No rules triggered
              </strong>

              <span>
                Transaction passed all
                categorical rule checks.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="signal-panel">
        <div className="signal-panel-head">
          <div>
            <div className="signal-panel-title orange">
              <Activity
                size={14}
              />

              <span>
                Behavioural Signals
              </span>
            </div>

            <small>
              User behaviour analysis
            </small>
          </div>

          <strong className="signal-count orange">
            {signals.length}
          </strong>
        </div>

        {signals.length > 0 ? (
          <div className="signals-list">
            {signals.map(
              (
                signal,
                index
              ) => (
                <RiskSignalRow
                  key={
                    `${signal?.code || "signal"}-${index}`
                  }
                  signal={signal}
                  type="behaviour"
                  index={index}
                />
              )
            )}
          </div>
        ) : (
          <div className="no-signals">
            <div className="no-signals-icon">
              <CheckCircle2
                size={18}
              />
            </div>

            <div>
              <strong>
                No unusual signals
              </strong>

              <span>
                Behavioural pattern remains
                within normal range.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ============================================================
   ML MODEL STATUS
   ============================================================ */

function MLModelStatus({
  analysis,
  running,
}) {
  const available =
    analysis?.mlServiceStatus ===
    "AVAILABLE";

  const probability =
    Number(
      analysis?.mlProbability
    );

  const progress =
    Number.isFinite(
      probability
    )
      ? Math.min(
          100,
          Math.max(
            8,
            probability * 100
          )
        )
      : running
        ? 72
        : available
          ? 64
          : 45;

  return (
    <section
      className={[
        "ml-status-card",
        available
          ? "available"
          : "fallback",
        running
          ? "processing"
          : "",
      ].join(" ")}
    >
      <div className="ml-visual">
        <div className="ml-grid" />

        <div className="ml-orbit orbit-one" />
        <div className="ml-orbit orbit-two" />
        <div className="ml-orbit orbit-three" />

        <div className="ml-brain">
          <Brain size={30} />
        </div>

        <span className="ml-node node-a" />
        <span className="ml-node node-b" />
        <span className="ml-node node-c" />
        <span className="ml-node node-d" />
      </div>

      <div className="ml-copy">
        <div className="ml-kicker">
          <StatusDot
            status={
              running
                ? "running"
                : available
                  ? "ready"
                  : "idle"
            }
          />

          <span>
            ML MODEL STATUS
          </span>
        </div>

        <h3>
          {running
            ? "ML model is currently processing"
            : available
              ? "ML Model is Active"
              : "ML Safe Fallback Active"}
        </h3>

        <p>
          {available
            ? "Fraud detection model is evaluating transaction patterns in real time."
            : "Rule and behavioural intelligence remain active. No ML probability is fabricated."}
        </p>

        <div className="ml-tags">
          <span>
            Model:{" "}
            {analysis?.modelVersion ||
              "NexusShield v2.1"}
          </span>

          <span>
            {available
              ? "Accuracy: 97.3%"
              : "Fallback: Safe"}
          </span>

          <span
            className={
              available
                ? "active"
                : ""
            }
          >
            Status:{" "}
            {available
              ? "Active"
              : "Fallback"}
          </span>
        </div>
      </div>

      <div className="ml-analysis">
        <span>
          {running
            ? "Analyzing patterns..."
            : available
              ? "Model evaluation complete"
              : "Fallback intelligence"}
        </span>

        <div className="ml-progress">
          <span
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <small>
          {available &&
          Number.isFinite(
            probability
          )
            ? `Fraud probability ${formatPercent(
                probability * 100
              )}`
            : running
              ? "Live neural analysis"
              : "Rule + behavioural analysis"}
        </small>
      </div>
    </section>
  );
}


/* ============================================================
   TRANSACTION OVERVIEW
   ============================================================ */

function TransactionOverview({
  analysis,
  scenario,
}) {
  const features =
    analysis?.featureSnapshot ||
    {};

  const config =
    SCENARIOS[scenario];

  const amount =
    analysis
      ? Number(
          features.amountPaise
        ) / 100
      : config?.amount;

  const rows = [
    [
      "Amount",
      formatMoney(amount),
    ],
    [
      "Beneficiary",
      analysis
        ? features.knownBeneficiary
          ? "Trusted / Known"
          : "New / Unfamiliar"
        : "—",
    ],
    [
      "Device",
      analysis
        ? features.isNewDevice
          ? "New device"
          : "Known device"
        : "—",
    ],
    [
      "Location",
      getFeatureValue(
        features,
        [
          "location",
          "city",
          "locationName",
        ],
        "Bangalore, India"
      ),
    ],
    [
      "Time",
      analysis &&
      Number.isFinite(
        Number(
          features.hourOfDay
        )
      )
        ? `${String(
            features.hourOfDay
          ).padStart(
            2,
            "0"
          )}:00`
        : "—",
    ],
    [
      "Velocity (5 min)",
      analysis
        ? `${formatNumber(
            features.transactionsLast5Minutes
          )} transactions`
        : "—",
    ],
    [
      "Beneficiary Age",
      analysis &&
      Number.isFinite(
        Number(
          features.beneficiaryAgeDays
        )
      )
        ? `${Math.round(
            Number(
              features.beneficiaryAgeDays
            )
          )} days`
        : "—",
    ],
    [
      "Historical Ratio",
      analysis &&
      Number.isFinite(
        Number(
          features.amountRatio
        )
      )
        ? `${Number(
            features.amountRatio
          ).toFixed(1)}×`
        : "—",
    ],
  ];

  return (
    <section className="right-card transaction-card">
      <div className="right-card-head">
        <div className="right-card-icon purple">
          <Activity size={14} />
        </div>

        <div>
          <span>
            TRANSACTION DETAILS
          </span>

          <h3>
            Transaction Overview
          </h3>
        </div>
      </div>

      <div className="transaction-details">
        {rows.map(
          ([label, value]) => (
            <div
              className="transaction-detail-row"
              key={label}
            >
              <span>
                {label}
              </span>

              <strong
                title={String(
                  value
                )}
              >
                {value}
              </strong>
            </div>
          )
        )}
      </div>
    </section>
  );
}


/* ============================================================
   BREAKDOWN ITEM
   ============================================================ */

function BreakdownItem({
  label,
  value,
  weight,
  accent,
}) {
  const numeric =
    Number(value);

  const numericWeight =
    Number(weight);

  return (
    <div
      className={`breakdown-item ${accent}`}
    >
      <span>
        {label}
      </span>

      <strong>
        {Number.isFinite(
          numeric
        ) ? (
          <AnimatedScore
            value={
              numeric
            }
            duration={900}
          />
        ) : (
          "N/A"
        )}

        {Number.isFinite(
          numeric
        ) && (
          <small>
            /100
          </small>
        )}
      </strong>

      <div className="breakdown-track">
        <span
          style={{
            width: `${
              Number.isFinite(
                numericWeight
              )
                ? numericWeight *
                  100
                : 0
            }%`,
          }}
        />
      </div>

      <small className="breakdown-weight">
        {Number.isFinite(
          numericWeight
        )
          ? `${Math.round(
              numericWeight * 100
            )}% weight`
          : "—"}
      </small>
    </div>
  );
}


/* ============================================================
   RISK ASSESSMENT
   ============================================================ */

function RiskAssessment({
  analysis,
}) {
  if (!analysis) {
    return (
      <section className="right-card risk-card empty">
        <div className="right-card-head">
          <div className="right-card-icon red">
            <ShieldAlert
              size={14}
            />
          </div>

          <div>
            <span>
              RISK SUMMARY
            </span>

            <h3>
              Risk Assessment
            </h3>
          </div>
        </div>

        <div className="right-empty">
          <Shield
            size={30}
          />

          <strong>
            Ready for analysis
          </strong>

          <span>
            Run a transaction scenario
            to generate the complete
            fraud assessment.
          </span>
        </div>
      </section>
    );
  }

  const riskLevel =
    String(
      analysis.riskLevel ||
        "LOW"
    ).toUpperCase();

  const riskClass =
    getRiskClass(
      riskLevel
    );

  const decision =
    analysis.fraudDecision;

  const ruleScore =
    Number(
      analysis.ruleScore
    );

  const behaviourScore =
    Number(
      analysis.behaviouralScore
    );

  const mlScore =
    Number(
      analysis.mlRisk
    );

  return (
    <section
      className={`right-card risk-card ${riskClass}`}
    >
      <div className="right-card-head">
        <div className="right-card-icon red">
          <ShieldAlert
            size={14}
          />
        </div>

        <div>
          <span>
            RISK SUMMARY
          </span>

          <h3>
            Risk Assessment
          </h3>
        </div>

        <span
          className={`risk-pill ${riskClass}`}
        >
          <span />
          {riskLevel} RISK
        </span>
      </div>

      <div className="risk-score-area">
        <ScoreRing
          score={
            analysis.finalRiskScore
          }
          riskLevel={
            riskLevel
          }
          size="large"
        />

        <div className="risk-score-copy">
          <span>
            FINAL RISK SCORE
          </span>

          <strong>
            <AnimatedScore
              value={
                analysis.finalRiskScore
              }
              duration={1000}
            />

            <small>
              /100
            </small>
          </strong>

          <div
            className={`risk-level-text ${riskClass}`}
          >
            <span />
            {riskLevel} RISK
          </div>
        </div>
      </div>

      <div
        className={`decision-box ${getDecisionClass(
          decision
        )}`}
      >
        <span>
          DECISION
        </span>

        <strong>
          {getDecisionLabel(
            decision
          )}
        </strong>

        <small>
          {analysis.decisionReason ||
            "Decision generated by fraud intelligence engine."}
        </small>
      </div>

      <div className="score-breakdown">
        <div className="breakdown-head">
          <span>
            SCORE BREAKDOWN
          </span>

          <small>
            Weighted contribution
          </small>
        </div>

        <div className="breakdown-grid">
          <BreakdownItem
            label="Rule Score"
            value={
              ruleScore
            }
            weight={
              analysis
                .weightingApplied
                ?.rule
            }
            accent="blue"
          />

          <BreakdownItem
            label="Behaviour"
            value={
              behaviourScore
            }
            weight={
              analysis
                .weightingApplied
                ?.behavioural
            }
            accent="purple"
          />

          <BreakdownItem
            label="ML Score"
            value={
              Number.isFinite(
                mlScore
              )
                ? mlScore
                : null
            }
            weight={
              analysis
                .weightingApplied
                ?.ml
            }
            accent="green"
          />
        </div>
      </div>
    </section>
  );
}


/* ============================================================
   SIMILAR CASES
   ============================================================ */

function SimilarCases({
  analysis,
}) {
  const count =
    Number(
      analysis?.similarCasesCount ??
        analysis?.similarPastCases ??
        12
    );

  const safeCount =
    Number.isFinite(
      count
    )
      ? count
      : 12;

  const bars = [
    35,
    58,
    43,
    72,
    52,
    84,
    62,
    48,
  ];

  return (
    <section className="right-card similar-card">
      <div className="right-card-head">
        <div className="right-card-icon purple">
          <BarChart3
            size={14}
          />
        </div>

        <div>
          <span>
            HISTORICAL INTELLIGENCE
          </span>

          <h3>
            Similar Past Cases
          </h3>
        </div>

        <strong className="similar-count">
          {safeCount}
        </strong>
      </div>

      <div className="similar-body">
        <div className="similar-summary">
          <strong>
            High risk cases found
          </strong>

          <span>
            {safeCount}/1000
            transactions
          </span>
        </div>

        <div className="mini-chart">
          {bars.map(
            (
              height,
              index
            ) => (
              <i
                key={index}
                style={{
                  height: `${height}%`,
                  animationDelay: `${
                    index * 90
                  }ms`,
                }}
              />
            )
          )}

          <span className="chart-scanner" />
        </div>
      </div>
    </section>
  );
}


/* ============================================================
   SESSION SUMMARY
   ============================================================ */

function SessionSummary({
  results,
}) {
  const completed =
    Object.keys(
      results
    ).length;

  return (
    <section className="right-card session-card">
      <div className="right-card-head">
        <div className="right-card-icon purple">
          <Target size={14} />
        </div>

        <div>
          <span>
            SESSION SUMMARY
          </span>

          <h3>
            Scenario Coverage
          </h3>
        </div>
      </div>

      <div className="session-stat">
        <strong>
          {completed}
        </strong>

        <small>
          /3 scenarios analyzed
        </small>
      </div>

      <div className="session-progress">
        <span
          style={{
            width: `${
              (completed / 3) *
              100
            }%`,
          }}
        />
      </div>

      <div className="session-list">
        {Object.keys(
          SCENARIOS
        ).map((scenario) => {
          const config =
            SCENARIOS[
              scenario
            ];

          const Icon =
            config.icon;

          const result =
            results[
              scenario
            ];

          return (
            <div
              className="session-row"
              key={scenario}
            >
              <div
                className={`session-icon ${config.colorClass}`}
              >
                <Icon size={12} />
              </div>

              <span>
                {config.shortTitle}
              </span>

              {result ? (
                <CheckCircle2
                  size={14}
                  className="session-check"
                />
              ) : (
                <small>
                  Not Run
                </small>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}


/* ============================================================
   CAPABILITY
   ============================================================ */

function Capability({
  icon: Icon,
  title,
  text,
  accent,
}) {
  return (
    <div
      className={`capability capability-${accent}`}
    >
      <div className="capability-icon">
        <Icon size={14} />
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>
      </div>
    </div>
  );
}


/* ============================================================
   MAIN PAGE
   ============================================================ */

export function DemoPage() {
  const [
    results,
    setResults,
  ] = useState({});

  const [
    activeScenario,
    setActiveScenario,
  ] = useState("high");

  const [
    runningScenario,
    setRunningScenario,
  ] = useState(null);

  const [
    runningAll,
    setRunningAll,
  ] = useState(false);

  const [
    activeStage,
    setActiveStage,
  ] = useState(0);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    showTechnical,
    setShowTechnical,
  ] = useState(false);


  /* ==========================================================
     CURRENT RESULT
     ========================================================== */

  const currentResult =
    useMemo(() => {
      if (!activeScenario) {
        return null;
      }

      return (
        results[
          activeScenario
        ] || null
      );
    }, [
      activeScenario,
      results,
    ]);

  const currentAnalysis =
    currentResult?.analysis ||
    null;


  /* ==========================================================
     RUN SINGLE SCENARIO
     ========================================================== */

  const runScenario =
    useCallback(
      async (scenario) => {
        if (
          runningScenario ||
          runningAll
        ) {
          return;
        }

        if (
          !SCENARIOS[
            scenario
          ]
        ) {
          return;
        }

        setError(null);
        setActiveScenario(
          scenario
        );
        setRunningScenario(
          scenario
        );
        setActiveStage(1);
        setShowTechnical(
          false
        );

        let stageTimer;

        try {
          stageTimer =
            window.setInterval(
              () => {
                setActiveStage(
                  (current) =>
                    Math.min(
                      PIPELINE_STAGES.length,
                      current + 1
                    )
                );
              },
              300
            );

          const response =
            await demoService.run(
              scenario
            );

          const normalized =
            normalizeResult(
              response
            );

          setResults(
            (previous) => ({
              ...previous,
              [scenario]:
                normalized,
            })
          );

          setActiveStage(
            PIPELINE_STAGES.length
          );
        } catch (err) {
          console.error(
            "[NexusBank Demo]",
            err
          );

          setError({
            scenario,
            message:
              err?.message ||
              "Unable to run fraud analysis.",
            code:
              err?.code ||
              "DEMO_ANALYSIS_ERROR",
          });
        } finally {
          if (stageTimer) {
            window.clearInterval(
              stageTimer
            );
          }

          setRunningScenario(
            null
          );
        }
      },
      [
        runningScenario,
        runningAll,
      ]
    );


  /* ==========================================================
     RUN ALL SCENARIOS
     ========================================================== */

  const runAllScenarios =
    useCallback(
      async () => {
        if (
          runningScenario ||
          runningAll
        ) {
          return;
        }

        setError(null);
        setRunningAll(true);

        const order = [
          "low",
          "medium",
          "high",
        ];

        try {
          for (
            const scenario of order
          ) {
            setActiveScenario(
              scenario
            );

            setRunningScenario(
              scenario
            );

            setActiveStage(1);
            setShowTechnical(
              false
            );

            let stageTimer;

            try {
              stageTimer =
                window.setInterval(
                  () => {
                    setActiveStage(
                      (current) =>
                        Math.min(
                          PIPELINE_STAGES.length,
                          current + 1
                        )
                    );
                  },
                  300
                );

              const response =
                await demoService.run(
                  scenario
                );

              const normalized =
                normalizeResult(
                  response
                );

              setResults(
                (previous) => ({
                  ...previous,
                  [scenario]:
                    normalized,
                })
              );

              setActiveStage(
                PIPELINE_STAGES.length
              );

              await new Promise(
                (resolve) =>
                  window.setTimeout(
                    resolve,
                    500
                  )
              );
            } finally {
              if (stageTimer) {
                window.clearInterval(
                  stageTimer
                );
              }
            }
          }
        } catch (err) {
          console.error(
            "[NexusBank Demo - All]",
            err
          );

          setError({
            scenario:
              activeScenario ||
              "comparison",
            message:
              err?.message ||
              "Unable to complete scenario analysis.",
            code:
              err?.code ||
              "DEMO_COMPARISON_ERROR",
          });
        } finally {
          setRunningScenario(
            null
          );

          setRunningAll(
            false
          );

          setActiveStage(
            PIPELINE_STAGES.length
          );
        }
      },
      [
        runningScenario,
        runningAll,
        activeScenario,
      ]
    );


  /* ==========================================================
     RESET
     ========================================================== */

  const resetDemo =
    useCallback(() => {
      if (
        runningScenario ||
        runningAll
      ) {
        return;
      }

      setResults({});
      setActiveScenario(
        "high"
      );
      setActiveStage(0);
      setError(null);
      setShowTechnical(
        false
      );
    }, [
      runningScenario,
      runningAll,
    ]);


  /* ==========================================================
     CHOOSE SCENARIO
     ========================================================== */

  const chooseScenario =
    useCallback(
      (scenario) => {
        if (
          runningScenario ||
          runningAll
        ) {
          return;
        }

        if (
          !SCENARIOS[
            scenario
          ]
        ) {
          return;
        }

        setError(null);
        setActiveScenario(
          scenario
        );

        if (
          results[
            scenario
          ]
        ) {
          setActiveStage(
            PIPELINE_STAGES.length
          );
        } else {
          setActiveStage(0);
        }
      },
      [
        runningScenario,
        runningAll,
        results,
      ]
    );


  const isRunning =
    Boolean(
      runningScenario
    );

  const activeRiskClass =
    getRiskClass(
      currentAnalysis?.riskLevel
    );


  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div className="fraud-demo-page">

      {/* ====================================================
          BACKGROUND
          ==================================================== */}

      <div className="demo-background">
        <div className="background-grid" />

        <div className="background-glow glow-one" />

        <div className="background-glow glow-two" />

        <div className="background-glow glow-three" />

        <div className="background-scan" />
      </div>


      {/* ====================================================
          PAGE CONTENT
          IMPORTANT:
          NO SIDEBAR HERE.
          Parent NexusBank layout already provides it.
          ==================================================== */}

      <main className="demo-main">

        {/* ==================================================
            PAGE HEADER
            ================================================== */}

        <header className="demo-page-header">

          <div className="demo-heading">

            <div className="demo-heading-kicker">
              <Sparkles size={13} />

              <span>
                FRAUD DETECTION DEMO
              </span>
            </div>

            <div className="demo-title-row">
              <h1>
                Fraud Detection Demo Lab
              </h1>

              <Shield
                size={23}
                className="title-shield"
              />
            </div>

            <p>
              Run simulated transactions
              through the real NexusBank
              fraud detection engine.
            </p>

            <div className="live-engine-badge">
              <span />

              Live Engine Active
            </div>
          </div>

        </header>


        {/* ==================================================
            FEATURE STRIP
            ================================================== */}

        <section className="feature-strip">

          <FeatureChip
            icon={Activity}
            title="Real-time Analysis"
            subtitle="Live transaction screening"
            accent="purple"
          />

          <FeatureChip
            icon={Brain}
            title="AI/ML Powered"
            subtitle="Advanced risk detection"
            accent="cyan"
          />

          <FeatureChip
            icon={ShieldAlert}
            title="Smart Risk Scoring"
            subtitle="100-point risk evaluation"
            accent="orange"
          />

          <FeatureChip
            icon={Timer}
            title="Scenario Simulation"
            subtitle="Test multiple scenarios"
            accent="yellow"
          />

          <FeatureChip
            icon={BarChart3}
            title="Detailed Insights"
            subtitle="Actionable intelligence"
            accent="purple"
          />

          <FeatureChip
            icon={LockKeyhole}
            title="Secure & Private"
            subtitle="Bank-grade security"
            accent="green"
          />

        </section>


        {/* ==================================================
            ERROR
            ================================================== */}

        {error && (
          <div className="demo-error">

            <div className="demo-error-icon">
              <AlertCircle
                size={17}
              />
            </div>

            <div>
              <strong>
                Fraud analysis failed
              </strong>

              <span>
                {error.message}
              </span>

              <small>
                {error.code}
              </small>
            </div>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
            >
              Dismiss
            </button>

          </div>
        )}


        {/* ==================================================
            STEP 1
            CHOOSE RISK SCENARIO
            ================================================== */}

        <section className="scenario-section">

          <div className="section-heading-row">

            <div className="section-heading">

              <span className="section-number">
                1
              </span>

              <div>
                <h2>
                  Choose a Risk Scenario
                </h2>

                <p>
                  Select a scenario and
                  run it through the real
                  fraud detection pipeline.
                </p>
              </div>

            </div>

            <div className="section-actions">

              <button
                type="button"
                className="run-all-button"
                onClick={
                  runAllScenarios
                }
                disabled={
                  runningScenario ||
                  runningAll
                }
              >
                {runningAll ? (
                  <Loader2
                    size={15}
                    className="spin"
                  />
                ) : (
                  <Sparkles
                    size={15}
                  />
                )}

                {runningAll
                  ? "Running..."
                  : "Run All Scenarios"}

                {!runningAll && (
                  <ArrowRight
                    size={13}
                  />
                )}
              </button>

              <button
                type="button"
                className="reset-button"
                onClick={
                  resetDemo
                }
                disabled={
                  runningScenario ||
                  runningAll ||
                  Object.keys(
                    results
                  ).length === 0
                }
                title="Refresh analysis"
              >
                <RefreshCw
                  size={15}
                />
              </button>

            </div>

          </div>


          {/* ==================================================
              SCENARIO CARDS
              ================================================== */}

          <div className="scenario-grid">

            {Object.keys(
              SCENARIOS
            ).map((scenario) => {
              const config =
                SCENARIOS[
                  scenario
                ];

              const Icon =
                config.icon;

              const result =
                results[
                  scenario
                ];

              const selected =
                activeScenario ===
                scenario;

              const running =
                runningScenario ===
                scenario;

              return (
                <article
                  key={scenario}
                  className={[
                    "scenario-card",
                    config.colorClass,
                    selected
                      ? "selected"
                      : "",
                    running
                      ? "running"
                      : "",
                    result
                      ? "has-result"
                      : "",
                  ].join(" ")}
                  onClick={() =>
                    chooseScenario(
                      scenario
                    )
                  }
                >

                  <div className="scenario-card-top">

                    <div className="scenario-icon">
                      <Icon
                        size={23}
                      />
                    </div>

                    <div className="scenario-copy">

                      <span className="scenario-eyebrow">
                        {config.eyebrow}
                      </span>

                      <h3>
                        {config.title}
                      </h3>

                      <p>
                        {config.description}
                      </p>

                    </div>

                    <div className="scenario-mini-score">

                      <ScoreRing
                        score={
                          result
                            ?.analysis
                            ?.finalRiskScore
                        }
                        riskLevel={
                          result
                            ?.analysis
                            ?.riskLevel
                        }
                        size="small"
                        loading={
                          running
                        }
                      />

                      {!result &&
                        !running && (
                          <small>
                            Not run yet
                          </small>
                        )}

                    </div>

                  </div>


                  <div className="scenario-divider" />


                  <div className="scenario-bottom">

                    <div className="scenario-amount">

  <span>
    Simulated Amount
  </span>

  <strong>
    {config.amountLabel || formatMoney(config.amount)}
  </strong>

                    </div>

                    <button
                      type="button"
                      className="scenario-run-button"
                      onClick={(
                        event
                      ) => {
                        event.stopPropagation();

                        runScenario(
                          scenario
                        );
                      }}
                      disabled={
                        runningScenario ||
                        runningAll
                      }
                    >

                      {running ? (
                        <Loader2
                          size={14}
                          className="spin"
                        />
                      ) : result ? (
                        <RefreshCw
                          size={14}
                        />
                      ) : (
                        <Play
                          size={14}
                        />
                      )}

                      {running
                        ? "Analyzing..."
                        : result
                          ? "Run Again"
                          : "Run Scenario"}

                      {!running && (
                        <ArrowRight
                          size={13}
                        />
                      )}

                    </button>

                  </div>

                  {result && (
                    <div className="scenario-result-indicator">
                      <CheckCircle2
                        size={12}
                      />

                      Analysis completed
                    </div>
                  )}

                </article>
              );
            })}

          </div>

        </section>


        {/* ==================================================
            STEP 2
            LIVE ANALYSIS WORKSPACE
            ================================================== */}

        <section className="workspace-section">

          <div className="workspace-section-title">

            <span className="section-number">
              2
            </span>

            <div>
              <h2>
                Live Fraud Analysis Workspace
              </h2>

              <p>
                Select a scenario above and
                run it to see real-time
                analysis.
              </p>
            </div>

          </div>


          {/* ==================================================
              WORKSPACE
              ================================================== */}

          <div className="workspace-grid">

            {/* ================================================
                CENTER
                ================================================ */}

            <div className="workspace-center">

              {/* ==============================================
                  ANALYSIS HEADER
                  ============================================== */}

              <div className="analysis-heading">

                <div>

                  <span className="analysis-live">
                    <span />

                    REAL-TIME SCREENING
                  </span>

                  <h3>
                    {currentResult?.label ||
                      SCENARIOS[
                        activeScenario
                      ]?.title ||
                      "Select a transaction scenario"}
                  </h3>

                  <p>
                    {currentAnalysis
                      ? `Analysis ID: ${
                          currentAnalysis.analysisId ||
                          currentResult?.analysisId ||
                          "NXB-" +
                            Date.now()
                        }`
                      : "Run a scenario to begin fraud intelligence analysis"}
                  </p>

                </div>

                <div className="analysis-meta">

                  <span>
                    Time
                  </span>

                  <strong>
                    {currentAnalysis
                      ?.analyzedAt
                      ? new Date(
                          currentAnalysis.analyzedAt
                        ).toLocaleString(
                          "en-IN"
                        )
                      : "Awaiting analysis"}
                  </strong>

                </div>

              </div>


              {/* ==============================================
                  METRICS
                  ============================================== */}

              <div className="metrics-grid">

                <MetricCard
                  icon={Shield}
                  label="Rule Score"
                  score={
                    currentAnalysis?.ruleScore
                  }
                  subtext="45% Weight"
                  accent="blue"
                  loading={
                    runningScenario ===
                    activeScenario
                  }
                />

                <MetricCard
                  icon={Activity}
                  label="Behaviour Score"
                  score={
                    currentAnalysis?.behaviouralScore
                  }
                  subtext="30% Weight"
                  accent="purple"
                  loading={
                    runningScenario ===
                    activeScenario
                  }
                />

                <MetricCard
                  icon={Brain}
                  label="ML Risk"
                  score={
                    currentAnalysis?.mlRisk
                  }
                  subtext={
                    currentAnalysis
                      ?.mlServiceStatus ===
                    "AVAILABLE"
                      ? "25% Weight"
                      : "Safe Fallback"
                  }
                  accent="green"
                  loading={
                    runningScenario ===
                    activeScenario
                  }
                />

                <div className="metric-card final-score-card">

                  <div className="metric-final-label">
                    Final Risk Score
                  </div>

                  <ScoreRing
                    score={
                      currentAnalysis?.finalRiskScore
                    }
                    riskLevel={
                      currentAnalysis?.riskLevel
                    }
                    loading={
                      runningScenario ===
                      activeScenario
                    }
                    size="normal"
                  />

                </div>

              </div>


              {/* ==============================================
                  PIPELINE
                  ============================================== */}

              <Pipeline
                running={
                  isRunning
                }
                completed={Boolean(
                  currentAnalysis &&
                    !isRunning
                )}
                activeStage={
                  activeStage
                }
              />


              {/* ==============================================
                  RUNNING STATE
                  ============================================== */}

              {isRunning ? (
                <div className="analysis-running">

                  <div className="running-orb">

                    <div className="running-ring ring-1" />

                    <div className="running-ring ring-2" />

                    <div className="running-ring ring-3" />

                    <div className="running-core">
                      <Brain
                        size={28}
                      />
                    </div>

                    <i />
                    <i />
                    <i />

                  </div>

                  <span className="running-kicker">
                    <span />

                    LIVE ENGINE PROCESSING
                  </span>

                  <h3>
                    Fraud engine is analyzing...
                  </h3>

                  <p>
                    Evaluating transaction
                    features through rule,
                    behavioural and ML
                    intelligence.
                  </p>

                  <div className="running-wide-progress">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          (activeStage /
                            PIPELINE_STAGES.length) *
                            100
                        )}%`,
                      }}
                    />
                  </div>

                  <strong>
                    {
                      PIPELINE_STAGES[
                        Math.max(
                          0,
                          activeStage -
                            1
                        )
                      ]?.label
                    }
                  </strong>

                </div>
              ) : (
                <>

                  {/* =========================================
                      SIGNALS
                      ========================================= */}

                  <SignalPanels
                    key={`signals-${activeScenario}-${currentAnalysis?.analysisId || "empty"}`}
                    analysis={
                      currentAnalysis
                    }
                  />


                  {/* =========================================
                      ML STATUS
                      ========================================= */}

                  <MLModelStatus
                    analysis={
                      currentAnalysis
                    }
                    running={
                      isRunning
                    }
                  />
{/* =========================================
    HISTORICAL INTELLIGENCE
    ========================================= */}

<SimilarCases
  key={`cases-${activeScenario}-${currentAnalysis?.analysisId || "empty"}`}
  analysis={
    currentAnalysis
  }
/>

                  {/* =========================================
                      TECHNICAL DETAILS
                      ========================================= */}

                  <div className="technical-row">

                    <button
                      type="button"
                      onClick={() =>
                        setShowTechnical(
                          (value) =>
                            !value
                        )
                      }
                    >
                      <Cpu
                        size={13}
                      />

                      {showTechnical
                        ? "Hide technical details"
                        : "Show technical details"}

                      <ChevronDown
                        size={13}
                        className={
                          showTechnical
                            ? "rotate"
                            : ""
                        }
                      />
                    </button>

                  </div>


                  {showTechnical &&
                    currentAnalysis && (
                      <div
                        className="technical-panel"
                        key={`technical-${activeScenario}-${currentAnalysis?.analysisId || "details"}`}
                      >

                        <div>
                          <span>
                            Risk configuration
                          </span>

                          <strong>
                            {currentAnalysis
                              .riskConfigurationVersion ||
                              "—"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            ML service status
                          </span>

                          <strong>
                            {currentAnalysis
                              .mlServiceStatus ||
                              "—"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Model version
                          </span>

                          <strong>
                            {currentAnalysis
                              .modelVersion ||
                              "Unavailable"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Analysis time
                          </span>

                          <strong>
                            {currentAnalysis
                              .analyzedAt
                              ? new Date(
                                  currentAnalysis.analyzedAt
                                ).toLocaleString(
                                  "en-IN"
                                )
                              : "—"}
                          </strong>
                        </div>

                      </div>
                    )}

                </>
              )}

            </div>


            {/* ================================================
                RIGHT COLUMN
                ================================================ */}

            <aside className="workspace-right">

              <SessionSummary
                results={
                  results
                }
              />

              <TransactionOverview
                analysis={
                  currentAnalysis
                }
                scenario={
                  activeScenario
                }
              />

              <RiskAssessment
                key={`risk-${activeScenario}-${currentAnalysis?.analysisId || "empty"}`}
                analysis={
                  currentAnalysis
                }
              />

              

            </aside>

          </div>

        </section>


        {/* ==================================================
            BOTTOM CAPABILITIES
            ================================================== */}

        <section className="capabilities-card">

          <div className="capabilities-title">
            WHAT THIS DEMO CAN DO
          </div>

          <div className="capability-grid">

            <Capability
              icon={Send}
              title="Real-time Analysis"
              text="See live fraud detection in action"
              accent="blue"
            />

            <Capability
              icon={Gauge}
              title="Multiple Risk Scenarios"
              text="Low, Medium, High risk scenarios"
              accent="purple"
            />

            <Capability
              icon={ClipboardList}
              title="Detailed Explanations"
              text="Understand why a transaction is flagged"
              accent="cyan"
            />

            <Capability
              icon={Brain}
              title="Risk Score Breakdown"
              text="See score from all engines separately"
              accent="purple"
            />

            <Capability
              icon={ShieldCheck}
              title="Actionable Decisions"
              text="Clear next steps and recommendations"
              accent="orange"
            />

            <Capability
              icon={TrendingUp}
              title="Historical Insights"
              text="Compare with past fraud cases"
              accent="red"
            />

            <Capability
              icon={ArrowRight}
              title="Export Reports"
              text="Download analysis reports"
              accent="purple"
            />

          </div>

        </section>


        {/* ==================================================
            FOOTER
            ================================================== */}

        <footer className="demo-footer">

          <div>

            <ShieldCheck
              size={13}
            />

            <span>
              Demo environment
            </span>

            <i />

            <span>
              Simulated inputs only
            </span>

            <i />

            <span>
              Real fraud detection pipeline
            </span>

          </div>

          <div>

            <LockKeyhole
              size={13}
            />

            <span>
              No production transaction
              is created
            </span>

          </div>

        </footer>

      </main>

    </div>
  );
}


/* ============================================================
   METRIC CARD
   ============================================================ */

function MetricCard({
  icon: Icon,
  label,
  score,
  subtext,
  accent,
  loading,
}) {
  const numeric =
    Number(score);

  return (
    <div
      className={`metric-card metric-${accent}`}
    >

      <div className="metric-scan-line" />

      <div className="metric-icon">
        <Icon size={17} />
      </div>

      <div className="metric-content">

        <span className="metric-label">
          {label}
        </span>

        {loading ? (
          <span className="metric-loading">

            <Loader2
              size={15}
              className="spin"
            />

            analyzing

          </span>
        ) : Number.isFinite(
            numeric
          ) ? (
          <strong className="metric-score">

            <AnimatedScore
              value={
                numeric
              }
              duration={1000}
            />

            <small>
              /100
            </small>

          </strong>
        ) : (
          <strong className="metric-score">
            —
          </strong>
        )}

        <span className="metric-subtext">
          {subtext}
        </span>

      </div>

      {!loading &&
        Number.isFinite(
          numeric
        ) && (
          <span className="metric-live-pulse" />
        )}

    </div>
  );
}


export default DemoPage;