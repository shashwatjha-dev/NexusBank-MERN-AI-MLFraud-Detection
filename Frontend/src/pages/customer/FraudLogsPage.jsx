import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock3,
  UserRound,
  WalletCards,
  Activity,
  Smartphone,
  Monitor,
  Fingerprint,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  X,
  BrainCircuit,
  Zap,
  CircleCheck,
  CircleAlert,
  CircleX,
  LockKeyhole,
  Database,
  Gauge,
  Target,
} from "lucide-react";

import { fraudService } from "../../services/fraudService.js";
import { useApi } from "../../hooks/useApi.js";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { formatPaise } from "../../utils/money.js";
import { formatDateTime } from "../../utils/date.js";

import "./FraudLogsPage.css";

/* =========================================================
   HELPERS
========================================================= */

function riskTone(level) {
  switch (String(level || "").toUpperCase()) {
    case "HIGH":
      return {
        accent: "#ff536b",
        text: "#ff7082",
        soft: "rgba(255,83,107,.11)",
        border: "rgba(255,83,107,.34)",
        glow: "rgba(255,83,107,.18)",
      };

    case "MEDIUM":
      return {
        accent: "#ffb52e",
        text: "#ffc653",
        soft: "rgba(255,181,46,.10)",
        border: "rgba(255,181,46,.32)",
        glow: "rgba(255,181,46,.16)",
      };

    default:
      return {
        accent: "#20dc8d",
        text: "#42e59f",
        soft: "rgba(32,220,141,.09)",
        border: "rgba(32,220,141,.30)",
        glow: "rgba(32,220,141,.15)",
      };
  }
}

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function decisionLabel(decision) {
  switch (normalize(decision)) {
    case "VERIFICATION_REQUIRED":
      return "Verification Required";

    case "BLOCKED":
      return "Blocked";

    case "COMPLETED":
      return "Completed";

    default:
      return decision || "Open";
  }
}

function decisionTone(decision) {
  switch (normalize(decision)) {
    case "BLOCKED":
      return {
        color: "#ff6478",
        bg: "rgba(255,82,102,.10)",
        border: "rgba(255,82,102,.30)",
      };

    case "VERIFICATION_REQUIRED":
      return {
        color: "#ffc34d",
        bg: "rgba(255,181,46,.10)",
        border: "rgba(255,181,46,.30)",
      };

    case "COMPLETED":
      return {
        color: "#35df95",
        bg: "rgba(32,220,141,.09)",
        border: "rgba(32,220,141,.28)",
      };

    default:
      return {
        color: "#8ea0ba",
        bg: "rgba(120,145,180,.08)",
        border: "rgba(120,145,180,.18)",
      };
  }
}

function formatAmount(value) {
  return formatPaise(Number(value || 0));
}

function scoreLabel(score) {
  const number = Number(score);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function getBeneficiary(log) {
  const beneficiary = log?.transaction?.beneficiary;

  if (!beneficiary) {
    return "Unknown Beneficiary";
  }

  if (typeof beneficiary === "string") {
    return beneficiary;
  }

  return (
    beneficiary.name ||
    beneficiary.accountHolderName ||
    beneficiary.bankName ||
    beneficiary.accountName ||
    "Unknown Beneficiary"
  );
}

function getAccountNumber(log) {
  return (
    log?.transaction?.beneficiary?.accountNumber ||
    log?.transaction?.accountNumber ||
    ""
  );
}

function getAccountSuffix(log) {
  const account = getAccountNumber(log);

  if (!account) {
    return "";
  }

  return `•••• ${String(account).slice(-4)}`;
}

function getDirection(log) {
  const type = normalize(
    log?.transaction?.type || log?.transaction?.entryType
  );

  if (
    type.includes("IN") ||
    type === "CREDIT" ||
    type === "TRANSFER_IN"
  ) {
    return "IN";
  }

  return "OUT";
}

function getTransactionType(log) {
  return (
    log?.transaction?.type ||
    log?.transaction?.entryType ||
    "TRANSFER"
  );
}

function getTransactionStatus(log) {
  return (
    log?.transaction?.status ||
    log?.decision ||
    "OPEN"
  );
}

function getReferenceId(log) {
  return (
    log?.transaction?.referenceId ||
    log?.transaction?._id ||
    log?._id ||
    "—"
  );
}

function getDeviceInfo(log) {
  const snapshot = log?.featureSnapshot;

  return {
    device:
      snapshot?.device ||
      snapshot?.deviceIdentifier ||
      snapshot?.deviceId ||
      "Device information unavailable",

    browser:
      snapshot?.browser ||
      snapshot?.browserName ||
      "Unknown browser",

    operatingSystem:
      snapshot?.operatingSystem ||
      snapshot?.os ||
      "Unknown OS",

    location:
      snapshot?.location ||
      snapshot?.city ||
      "Location unavailable",
  };
}

function getSignals(log) {
  const rules = Array.isArray(log?.triggeredRules)
    ? log.triggeredRules
    : [];

  const behavioural = Array.isArray(log?.behaviouralSignals)
    ? log.behaviouralSignals
    : [];

  return {
    rules,
    behavioural,
  };
}

function signalTitle(signal) {
  if (typeof signal === "string") {
    return signal;
  }

  return (
    signal?.title ||
    signal?.name ||
    signal?.rule ||
    signal?.code ||
    signal?.type ||
    "Security signal detected"
  );
}

function signalDescription(signal) {
  if (typeof signal === "string") {
    return "";
  }

  return (
    signal?.description ||
    signal?.evidence ||
    signal?.reason ||
    signal?.message ||
    ""
  );
}

function signalContribution(signal) {
  if (typeof signal === "string") {
    return null;
  }

  const value =
    signal?.contribution ??
    signal?.score ??
    signal?.points ??
    signal?.weight;

  if (value == null || value === "") {
    return null;
  }

  return Number.isFinite(Number(value))
    ? Number(value)
    : String(value);
}

/* =========================================================
   RISK BADGE
========================================================= */

function RiskBadge({ level, compact = false }) {
  const tone = riskTone(level);

  return (
    <span
      className={`fraud-risk-badge ${
        compact ? "fraud-risk-badge--compact" : ""
      }`}
      style={{
        "--risk-accent": tone.accent,
        "--risk-text": tone.text,
        "--risk-soft": tone.soft,
        "--risk-border": tone.border,
      }}
    >
      <span className="fraud-risk-badge__dot" />
      {String(level || "LOW").toLowerCase()} risk
    </span>
  );
}

/* =========================================================
   SCORE RING
========================================================= */

function ScoreRing({ score, level, size = "large" }) {
  const value = Number(score);

  const safe = Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;

  const tone = riskTone(level);

  const radius = size === "small" ? 34 : 68;
  const diameter = size === "small" ? 92 : 176;
  const center = diameter / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (safe / 100);

  return (
    <div
      className={`fraud-score-ring fraud-score-ring--${size}`}
      style={{
        "--ring-color": tone.accent,
        "--ring-glow": tone.glow,
      }}
    >
      <svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(126,151,181,.13)"
          strokeWidth={size === "small" ? 7 : 9}
        />

        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={tone.accent}
          strokeWidth={size === "small" ? 7 : 9}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          initial={{
            strokeDasharray: `0 ${circumference}`,
          }}
          animate={{
            strokeDasharray: `${dash} ${circumference}`,
          }}
          transition={{
            duration: 1,
            ease: "easeOut",
          }}
          style={{
            filter: `drop-shadow(0 0 8px ${tone.accent})`,
          }}
        />
      </svg>

      <div className="fraud-score-ring__center">
        <strong>{scoreLabel(score)}</strong>

        <span>/100</span>
      </div>
    </div>
  );
}

/* =========================================================
   OVERVIEW CARD
========================================================= */

function OverviewCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accent,
}) {
  return (
    <motion.article
      className="fraud-overview-card"
      style={{
        "--card-accent": accent,
      }}
      whileHover={{
        y: -3,
      }}
      transition={{
        duration: 0.18,
      }}
    >
      <div className="fraud-overview-card__glow" />

      <div className="fraud-overview-card__top">
        <span>{label}</span>

        <div className="fraud-overview-card__icon">
          <Icon size={18} />
        </div>
      </div>

      <strong>{value}</strong>

      <small>{subtitle}</small>

      <div className="fraud-overview-card__line">
        <span />
      </div>
    </motion.article>
  );
}

/* =========================================================
   METRIC CARD
========================================================= */

function AnalysisMetric({
  icon: Icon,
  label,
  value,
  suffix = "/100",
  note,
  accent,
}) {
  return (
    <div
      className="fraud-analysis-metric"
      style={{
        "--metric-accent": accent,
      }}
    >
      <div className="fraud-analysis-metric__icon">
        <Icon size={15} />
      </div>

      <div className="fraud-analysis-metric__body">
        <span>{label}</span>

        <strong>
          {value == null || value === ""
            ? "—"
            : value}

          {value != null &&
            value !== "" &&
            value !== "—" && (
              <small>{suffix}</small>
            )}
        </strong>

        <em>{note}</em>
      </div>
    </div>
  );
}

/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({
  icon: Icon,
  label,
  value,
  accent,
  mono = false,
}) {
  return (
    <div
      className="fraud-detail-item"
      style={{
        "--detail-accent": accent || "#71839c",
      }}
    >
      <div className="fraud-detail-item__icon">
        <Icon size={14} />
      </div>

      <div className="fraud-detail-item__body">
        <span>{label}</span>

        <strong
          className={mono ? "is-mono" : ""}
          title={String(value || "")}
        >
          {value || "—"}
        </strong>
      </div>
    </div>
  );
}

/* =========================================================
   SIGNAL CARD
========================================================= */

function SignalCard({
  signal,
  type = "rule",
}) {
  const contribution = signalContribution(signal);

  const Icon =
    type === "behavioural"
      ? Activity
      : ShieldAlert;

  return (
    <motion.div
      className={`fraud-signal-card fraud-signal-card--${type}`}
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
    >
      <div className="fraud-signal-card__icon">
        <Icon size={16} />
      </div>

      <div className="fraud-signal-card__body">
        <div className="fraud-signal-card__title">
          <strong>{signalTitle(signal)}</strong>

          {contribution != null && (
            <span>
              {typeof contribution === "number"
                ? `${contribution > 0 ? "+" : ""}${contribution}`
                : contribution}
            </span>
          )}
        </div>

        {signalDescription(signal) && (
          <p>{signalDescription(signal)}</p>
        )}
      </div>
    </motion.div>
  );
}

/* =========================================================
   STATUS PILL
========================================================= */

function DecisionPill({ decision }) {
  const tone = decisionTone(decision);

  return (
    <span
      className="fraud-decision-pill"
      style={{
        color: tone.color,
        background: tone.bg,
        borderColor: tone.border,
      }}
    >
      {normalize(decision) === "BLOCKED" ? (
        <CircleX size={13} />
      ) : normalize(decision) ===
        "VERIFICATION_REQUIRED" ? (
        <CircleAlert size={13} />
      ) : (
        <CircleCheck size={13} />
      )}

      {decisionLabel(decision)}
    </span>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export function FraudLogsPage() {
  const list = useApi(() => fraudService.logs(), []);

  const [selected, setSelected] = useState(null);

  const [search, setSearch] = useState("");

  const [riskFilter, setRiskFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [sort, setSort] =
    useState("NEWEST");

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] =
    useState(10);

  const [copied, setCopied] =
    useState(false);

  const [mobileDetails, setMobileDetails] =
    useState(false);

  const items = Array.isArray(list.data)
    ? list.data
    : [];

  /* =======================================================
     METRICS
  ======================================================= */

  const metrics = useMemo(() => {
    const high = items.filter(
      (item) =>
        normalize(item.riskLevel) ===
        "HIGH"
    ).length;

    const medium = items.filter(
      (item) =>
        normalize(item.riskLevel) ===
        "MEDIUM"
    ).length;

    const low = items.filter(
      (item) =>
        normalize(item.riskLevel) ===
        "LOW"
    ).length;

    const verification = items.filter(
      (item) =>
        normalize(item.decision) ===
        "VERIFICATION_REQUIRED"
    ).length;

    const blocked = items.filter(
      (item) =>
        normalize(item.decision) ===
        "BLOCKED"
    ).length;

    const amount = items.reduce(
      (sum, item) =>
        sum +
        Number(
          item?.transaction?.amountPaise ||
            0
        ),
      0
    );

    return {
      total: items.length,
      high,
      medium,
      low,
      verification,
      blocked,
      amount,
    };
  }, [items]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredItems = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    let result = items.filter((log) => {
      const risk = normalize(
        log.riskLevel
      );

      if (
        riskFilter !== "ALL" &&
        risk !== riskFilter
      ) {
        return false;
      }

      const decision = normalize(
        log.decision
      );

      const review = normalize(
        log.reviewStatus
      );

      if (statusFilter === "OPEN") {
        if (review !== "OPEN") {
          return false;
        }
      }

      if (
        statusFilter ===
        "VERIFICATION_REQUIRED"
      ) {
        if (
          decision !==
          "VERIFICATION_REQUIRED"
        ) {
          return false;
        }
      }

      if (statusFilter === "BLOCKED") {
        if (decision !== "BLOCKED") {
          return false;
        }
      }

      if (statusFilter === "REVIEWED") {
        if (review !== "REVIEWED") {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const beneficiary =
        getBeneficiary(log);

      const haystack = [
        beneficiary,
        log._id,
        log.transaction?._id,
        log.transaction?.referenceId,
        log.transaction?.type,
        log.transaction?.status,
        log.decision,
        log.reviewStatus,
        log.riskLevel,
        getAccountSuffix(log),
        String(
          log.transaction
            ?.amountPaise || ""
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    result = [...result].sort(
      (a, b) => {
        if (sort === "OLDEST") {
          return (
            new Date(
              a.createdAt
            ).getTime() -
            new Date(
              b.createdAt
            ).getTime()
          );
        }

        if (sort === "HIGHEST") {
          return (
            Number(
              b.riskScore || 0
            ) -
            Number(
              a.riskScore || 0
            )
          );
        }

        if (sort === "AMOUNT") {
          return (
            Number(
              b.transaction
                ?.amountPaise || 0
            ) -
            Number(
              a.transaction
                ?.amountPaise || 0
            )
          );
        }

        return (
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
        );
      }
    );

    return result;
  }, [
    items,
    search,
    riskFilter,
    statusFilter,
    sort,
  ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredItems.length / pageSize
    )
  );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    riskFilter,
    statusFilter,
    sort,
    pageSize,
  ]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start =
      (page - 1) * pageSize;

    return filteredItems.slice(
      start,
      start + pageSize
    );
  }, [
    filteredItems,
    page,
    pageSize,
  ]);

  /* =======================================================
     DEFAULT SELECTION
  ======================================================= */

  useEffect(() => {
    if (
      paginatedItems.length > 0 &&
      !paginatedItems.some(
        (item) =>
          item._id === selected?._id
      )
    ) {
      setSelected(
        paginatedItems[0]
      );
    }
  }, [
    paginatedItems,
    selected,
  ]);

  /* =======================================================
     SELECT
  ======================================================= */

  const selectEvent = (log) => {
    setSelected(log);
    setMobileDetails(true);
    setCopied(false);
  };

  /* =======================================================
     COPY
  ======================================================= */

  const copyEventId = async () => {
    if (!selected?._id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        String(selected._id)
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      // Clipboard unavailable.
    }
  };

  /* =======================================================
     RENDER ERROR
  ======================================================= */

  if (list.error) {
    return (
      <ErrorState
        description={
          list.error.message
        }
        onRetry={list.refetch}
      />
    );
  }

  const selectedSignals =
    getSignals(selected);

  const selectedDevice =
    getDeviceInfo(selected);

  const selectedDecisionTone =
    decisionTone(
      selected?.decision
    );

  const selectedRiskTone =
    riskTone(
      selected?.riskLevel
    );

  return (
    <div
      className="fraud-page"
      data-testid="fraud-page"
    >
      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <motion.header
        className="fraud-page__header"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.45,
        }}
      >
        <div>
          <div className="fraud-page__eyebrow">
            <span />
            Security & Transparency
          </div>

          <h1>Fraud Events</h1>

          <p>
            AI-powered fraud detection and
            protection for your account.
          </p>
        </div>

        <motion.button
          type="button"
          className="fraud-refresh-button"
          onClick={() =>
            list.refetch()
          }
          whileTap={{
            scale: 0.96,
          }}
          data-testid="fraud-refresh"
        >
          <RefreshCw
            size={15}
            className={
              list.loading
                ? "fraud-spin"
                : ""
            }
          />
          Refresh
        </motion.button>
      </motion.header>

      {/* ===================================================
          OVERVIEW
      =================================================== */}

      <section
        className="fraud-overview-grid"
        aria-label="Fraud event overview"
      >
        <OverviewCard
          label="Total fraud events"
          value={metrics.total}
          subtitle="All flagged activity"
          icon={Shield}
          accent="#48a8ff"
        />

        <OverviewCard
          label="High risk"
          value={metrics.high}
          subtitle="Requires attention"
          icon={ShieldAlert}
          accent="#ff536b"
        />

        <OverviewCard
          label="Medium risk"
          value={metrics.medium}
          subtitle="Under monitoring"
          icon={AlertTriangle}
          accent="#ffb52e"
        />

        <OverviewCard
          label="Low risk"
          value={metrics.low}
          subtitle="Lower priority"
          icon={ShieldCheck}
          accent="#20dc8d"
        />

        <OverviewCard
          label="Verification required"
          value={metrics.verification}
          subtitle="Security confirmation"
          icon={UserRound}
          accent="#d9a52b"
        />

        <OverviewCard
          label="Amount at risk"
          value={formatAmount(
            metrics.amount
          )}
          subtitle="Across flagged events"
          icon={WalletCards}
          accent="#9b70ff"
        />
      </section>

      {/* ===================================================
          TOOLBAR
      =================================================== */}

      <section className="fraud-toolbar">
        <div className="fraud-search">
          <Search size={16} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search transactions, ID, beneficiary..."
            aria-label="Search fraud events"
            data-testid="fraud-search"
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
              data-testid="fraud-search-clear"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="fraud-filter-tabs">
          {[
            ["ALL", "All Events"],
            ["HIGH", "High Risk"],
            ["MEDIUM", "Medium Risk"],
            ["LOW", "Low Risk"],
          ].map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  riskFilter === value
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  setRiskFilter(value)
                }
                data-testid={`risk-filter-${value.toLowerCase()}`}
              >
                {label}
              </button>
            )
          )}
        </div>

        <div className="fraud-toolbar-selects">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            aria-label="Filter status"
            data-testid="fraud-status-filter"
          >
            <option value="ALL">
              All Status
            </option>

            <option value="OPEN">
              Open
            </option>

            <option value="VERIFICATION_REQUIRED">
              Verification Required
            </option>

            <option value="BLOCKED">
              Blocked
            </option>

            <option value="REVIEWED">
              Reviewed
            </option>
          </select>

          <select
            value={sort}
            onChange={(event) =>
              setSort(
                event.target.value
              )
            }
            aria-label="Sort fraud events"
            data-testid="fraud-sort"
          >
            <option value="NEWEST">
              Newest
            </option>

            <option value="OLDEST">
              Oldest
            </option>

            <option value="HIGHEST">
              Highest Risk
            </option>

            <option value="AMOUNT">
              Highest Amount
            </option>
          </select>

          <button
            type="button"
            className="fraud-reset-button"
            onClick={() => {
              setSearch("");
              setRiskFilter("ALL");
              setStatusFilter("ALL");
              setSort("NEWEST");
            }}
            data-testid="fraud-reset"
          >
            <SlidersHorizontal
              size={14}
            />
            Reset
          </button>
        </div>
      </section>

      {/* ===================================================
          MAIN
      =================================================== */}

      <div className="fraud-main-grid">
        {/* =================================================
            EVENT LIST
        ================================================= */}

        <section
          className="fraud-list-panel"
          data-testid="fraud-list-panel"
        >
          <div className="fraud-list-panel__header">
            <div>
              <span>Fraud log</span>

              <h2>
                Fraud Events{" "}
                <small>
                  ({filteredItems.length})
                </small>
              </h2>
            </div>

            <div className="fraud-protected-badge">
              <ShieldCheck size={13} />
              Protected
            </div>
          </div>

          {list.loading ? (
            <div className="fraud-loading-list">
              {Array.from({
                length: 7,
              }).map((_, index) => (
                <Skeleton
                  key={index}
                  height={82}
                  radius={13}
                />
              ))}
            </div>
          ) : paginatedItems.length ===
            0 ? (
            <div className="fraud-empty">
              <EmptyState
                icon={ShieldCheck}
                title="No fraud events found"
                description={
                  search ||
                  riskFilter !== "ALL" ||
                  statusFilter !== "ALL"
                    ? "Try changing your search or filters."
                    : "The fraud engine has not flagged any activity."
                }
              />
            </div>
          ) : (
            <>
              <div
                className="fraud-events-list"
                data-testid="fraud-logs-list"
              >
                <AnimatePresence
                  initial={false}
                >
                  {paginatedItems.map(
                    (log) => {
                      const active =
                        selected?._id ===
                        log._id;

                      const tone =
                        riskTone(
                          log.riskLevel
                        );

                      const direction =
                        getDirection(log);

                      return (
                        <motion.button
                          key={log._id}
                          type="button"
                          className={`fraud-event-row ${
                            active
                              ? "is-active"
                              : ""
                          }`}
                          onClick={() =>
                            selectEvent(log)
                          }
                          whileHover={{
                            y: -1,
                          }}
                          whileTap={{
                            scale: 0.995,
                          }}
                          style={{
                            "--row-accent":
                              tone.accent,
                          }}
                          data-testid={`fraud-log-${log._id}`}
                        >
                          <span className="fraud-event-row__accent" />

                          <div className="fraud-event-row__direction">
                            {direction ===
                            "IN" ? (
                              <ArrowDownLeft
                                size={18}
                              />
                            ) : (
                              <ArrowUpRight
                                size={18}
                              />
                            )}
                          </div>

                          <div className="fraud-event-row__main">
                            <div className="fraud-event-row__amount-line">
                              <strong>
                                {formatAmount(
                                  log
                                    .transaction
                                    ?.amountPaise
                                )}
                              </strong>

                              <span>
                                {getBeneficiary(
                                  log
                                )}
                              </span>
                            </div>

                            <div className="fraud-event-row__meta">
                              <span>
                                {direction ===
                                "IN"
                                  ? "Transfer In"
                                  : "Transfer Out"}
                              </span>

                              <i>•</i>

                              <span>
                                {formatDateTime(
                                  log.createdAt
                                )}
                              </span>

                              {getAccountSuffix(
                                log
                              ) && (
                                <>
                                  <i>
                                    •
                                  </i>

                                  <span>
                                    {getAccountSuffix(
                                      log
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="fraud-event-row__risk">
                            <RiskBadge
                              level={
                                log.riskLevel
                              }
                              compact
                            />

                            <strong
                              style={{
                                color:
                                  tone.accent,
                              }}
                            >
                              {scoreLabel(
                                log.riskScore
                              )}
                              <small>
                                /100
                              </small>
                            </strong>
                          </div>

                          <ChevronRight
                            size={17}
                            className="fraud-event-row__arrow"
                          />
                        </motion.button>
                      );
                    }
                  )}
                </AnimatePresence>
              </div>

              {/* PAGINATION */}

              <div className="fraud-pagination">
                <div className="fraud-pagination__buttons">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1
                          )
                      )
                    }
                    aria-label="Previous page"
                    data-testid="fraud-page-prev"
                  >
                    <ChevronLeft
                      size={15}
                    />
                  </button>

                  {Array.from({
                    length: Math.min(
                      totalPages,
                      5
                    ),
                  }).map(
                    (_, index) => {
                      const number =
                        index + 1;

                      return (
                        <button
                          key={number}
                          type="button"
                          className={
                            page === number
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            setPage(number)
                          }
                          data-testid={`fraud-page-${number}`}
                        >
                          {number}
                        </button>
                      );
                    }
                  )}

                  <button
                    type="button"
                    disabled={
                      page >= totalPages
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.min(
                            totalPages,
                            current + 1
                          )
                      )
                    }
                    aria-label="Next page"
                    data-testid="fraud-page-next"
                  >
                    <ChevronRight
                      size={15}
                    />
                  </button>
                </div>

                <select
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  aria-label="Rows per page"
                  data-testid="fraud-page-size"
                >
                  <option value={6}>
                    6 / page
                  </option>

                  <option value={10}>
                    10 / page
                  </option>

                  <option value={20}>
                    20 / page
                  </option>
                </select>
              </div>
            </>
          )}
        </section>

        {/* =================================================
            DETAILS PANEL
        ================================================= */}

        <AnimatePresence>
          {selected && (
            <motion.aside
              className={`fraud-details-panel ${
                mobileDetails
                  ? "is-mobile-open"
                  : ""
              }`}
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                duration: 0.3,
              }}
              data-testid="fraud-details-panel"
            >
              {/* DETAILS HEADER */}

              <div className="fraud-details-header">
                <div>
                  <span>
                    Selected Event
                  </span>

                  <h2>
                    Fraud Intelligence
                  </h2>
                </div>

                <div className="fraud-details-header__actions">
                  <div className="fraud-event-id">
                    Event ID:{" "}
                    <strong>
                      {String(
                        selected._id
                      ).slice(-12)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={
                      copyEventId
                    }
                    title="Copy event ID"
                    data-testid="copy-fraud-event-id"
                  >
                    {copied ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>

                  <button
                    type="button"
                    className="fraud-mobile-close"
                    onClick={() =>
                      setMobileDetails(
                        false
                      )
                    }
                    aria-label="Close details"
                    data-testid="fraud-details-close"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* =================================================
                  HERO INTELLIGENCE
              ================================================= */}

              <section
                className="fraud-intelligence-card"
                style={{
                  "--detail-risk":
                    selectedRiskTone.accent,
                  "--detail-risk-glow":
                    selectedRiskTone.glow,
                }}
              >
                <div className="fraud-intelligence-card__top">
                  <div>
                    <div className="fraud-intelligence-eyebrow">
                      <BrainCircuit
                        size={15}
                      />

                      AI FRAUD ENGINE

                      <span>
                        <i />
                        ANALYSIS COMPLETE
                      </span>
                    </div>

                    <h3>
                      Why was this transaction flagged?
                    </h3>

                    <p>
                      NexusBank evaluated
                      transaction rules,
                      behavioural patterns and
                      available machine-learning
                      signals before making this
                      security decision.
                    </p>
                  </div>

                  <DecisionPill
                    decision={
                      selected.decision
                    }
                  />
                </div>

                <div className="fraud-intelligence-main">
                  <div className="fraud-score-block">
                    <ScoreRing
                      score={
                        selected.riskScore
                      }
                      level={
                        selected.riskLevel
                      }
                    />

                    <RiskBadge
                      level={
                        selected.riskLevel
                      }
                    />

                    <span className="fraud-score-caption">
                      Overall fraud risk
                    </span>
                  </div>

                  <div className="fraud-analysis-summary">
                    <div className="fraud-analysis-summary__heading">
                      <div>
                        <span>
                          Risk assessment
                        </span>

                        <strong>
                          {selected.riskLevel ||
                            "LOW"}{" "}
                          risk activity
                        </strong>
                      </div>

                      <Gauge
                        size={19}
                        style={{
                          color:
                            selectedRiskTone.accent,
                        }}
                      />
                    </div>

                    <div className="fraud-analysis-metrics">
                      <AnalysisMetric
                        icon={ShieldCheck}
                        label="Rule Score"
                        value={
                          selected.ruleScore
                        }
                        note={
                          Number(
                            selected.ruleScore
                          ) >= 50
                            ? "Elevated"
                            : "Normal"
                        }
                        accent="#ffb52e"
                      />

                      <AnalysisMetric
                        icon={Activity}
                        label="Behaviour"
                        value={
                          selected.behaviouralScore
                        }
                        note={
                          Number(
                            selected.behaviouralScore
                          ) >= 50
                            ? "Unusual pattern"
                            : "Normal pattern"
                        }
                        accent="#b77cff"
                      />

                      <AnalysisMetric
                        icon={BrainCircuit}
                        label="ML Risk"
                        value={
                          selected.mlRisk
                        }
                        note={
                          selected.mlRisk ==
                          null
                            ? selected.mlServiceStatus ===
                              "INVALID_RESPONSE"
                              ? "Invalid response"
                              : "Unavailable"
                            : Number(
                                selected.mlRisk
                              ) >= 70
                            ? "High"
                            : Number(
                                selected.mlRisk
                              ) >= 40
                            ? "Moderate"
                            : "Low"
                        }
                        accent="#4ca8ff"
                      />
                    </div>

                    <div className="fraud-ml-status">
                      <div>
                        <Database
                          size={14}
                        />

                        <span>
                          ML service
                        </span>
                      </div>

                      <strong>
                        {selected.mlServiceStatus ||
                          "UNAVAILABLE"}
                      </strong>

                      <div className="fraud-ml-probability">
                        <span>
                          Probability
                        </span>

                        <strong>
                          {selected.mlProbability !=
                          null
                            ? `${Math.round(
                                Number(
                                  selected.mlProbability
                                ) * 100
                              )}%`
                            : "Unavailable"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  DECISION BANNER
              ================================================= */}

              <section
                className="fraud-decision-banner"
                style={{
                  "--decision-color":
                    selectedDecisionTone.color,
                  "--decision-bg":
                    selectedDecisionTone.bg,
                  "--decision-border":
                    selectedDecisionTone.border,
                }}
              >
                <div className="fraud-decision-banner__icon">
                  {normalize(
                    selected.decision
                  ) === "BLOCKED" ? (
                    <ShieldAlert
                      size={19}
                    />
                  ) : normalize(
                      selected.decision
                    ) ===
                    "VERIFICATION_REQUIRED" ? (
                    <LockKeyhole
                      size={19}
                    />
                  ) : (
                    <ShieldCheck
                      size={19}
                    />
                  )}
                </div>

                <div>
                  <strong>
                    {decisionLabel(
                      selected.decision
                    )}
                  </strong>

                  <p>
                    {normalize(
                      selected.decision
                    ) === "BLOCKED"
                      ? "The fraud engine determined that this transaction should not proceed."
                      : normalize(
                          selected.decision
                        ) ===
                        "VERIFICATION_REQUIRED"
                      ? "Additional verification is required before this transaction can be completed."
                      : "The transaction passed the available security checks."}
                  </p>
                </div>
              </section>

              {/* =================================================
                  RISK SIGNALS
              ================================================= */}

              <section className="fraud-details-section">
                <div className="fraud-section-heading">
                  <div>
                    <span>
                      Security intelligence
                    </span>

                    <h3>
                      Risk Signals
                    </h3>
                  </div>

                  <div className="fraud-section-count">
                    {selectedSignals
                      .rules.length +
                      selectedSignals
                        .behavioural
                        .length}{" "}
                    signals
                  </div>
                </div>

                <div className="fraud-signal-summary">
                  <div>
                    <ShieldAlert
                      size={16}
                    />

                    <span>
                      Transaction Risk
                    </span>

                    <strong
                      style={{
                        color:
                          selectedRiskTone.accent,
                      }}
                    >
                      {selected.riskLevel ||
                        "LOW"}
                    </strong>
                  </div>

                  <div>
                    <WalletCards
                      size={16}
                    />

                    <span>
                      Amount Risk
                    </span>

                    <strong>
                      {Number(
                        selected
                          .transaction
                          ?.amountPaise ||
                          0
                      ) >= 5000000
                        ? "Elevated"
                        : "Normal"}
                    </strong>
                  </div>

                  <div>
                    <Activity
                      size={16}
                    />

                    <span>
                      Velocity Risk
                    </span>

                    <strong>
                      {Number(
                        selected.behaviouralScore ||
                          0
                      ) >= 65
                        ? "Elevated"
                        : "Normal"}
                    </strong>
                  </div>

                  <div>
                    <UserRound
                      size={16}
                    />

                    <span>
                      Beneficiary
                    </span>

                    <strong>
                      {getBeneficiary(
                        selected
                      ) ===
                      "Unknown Beneficiary"
                        ? "Unknown"
                        : "Known"}
                    </strong>
                  </div>

                  <div>
                    <Smartphone
                      size={16}
                    />

                    <span>
                      Device
                    </span>

                    <strong>
                      {selectedDevice.device !==
                      "Device information unavailable"
                        ? "Detected"
                        : "Unavailable"}
                    </strong>
                  </div>
                </div>
              </section>

              {/* =================================================
                  TRIGGERED RULES + BEHAVIOURAL
              ================================================= */}

              <div className="fraud-signal-columns">
                <section className="fraud-details-section">
                  <div className="fraud-section-heading">
                    <div>
                      <span>
                        Rule engine
                      </span>

                      <h3>
                        Triggered Rules
                      </h3>
                    </div>

                    <div className="fraud-section-count">
                      {
                        selectedSignals
                          .rules.length
                      }
                    </div>
                  </div>

                  {selectedSignals
                    .rules.length ===
                  0 ? (
                    <div className="fraud-no-signals">
                      <ShieldCheck
                        size={17}
                      />

                      <span>
                        No specific rules recorded.
                      </span>
                    </div>
                  ) : (
                    <div className="fraud-signals-list">
                      {selectedSignals.rules.map(
                        (
                          signal,
                          index
                        ) => (
                          <SignalCard
                            key={`rule-${index}`}
                            signal={
                              signal
                            }
                            type="rule"
                          />
                        )
                      )}
                    </div>
                  )}
                </section>

                <section className="fraud-details-section">
                  <div className="fraud-section-heading">
                    <div>
                      <span>
                        Behaviour engine
                      </span>

                      <h3>
                        Behavioural Signals
                      </h3>
                    </div>

                    <div className="fraud-section-count">
                      {
                        selectedSignals
                          .behavioural
                          .length
                      }
                    </div>
                  </div>

                  {selectedSignals
                    .behavioural
                    .length ===
                  0 ? (
                    <div className="fraud-no-signals">
                      <Activity
                        size={17}
                      />

                      <span>
                        No behavioural signals recorded.
                      </span>
                    </div>
                  ) : (
                    <div className="fraud-signals-list">
                      {selectedSignals.behavioural.map(
                        (
                          signal,
                          index
                        ) => (
                          <SignalCard
                            key={`behaviour-${index}`}
                            signal={
                              signal
                            }
                            type="behavioural"
                          />
                        )
                      )}
                    </div>
                  )}
                </section>
              </div>

              {/* =================================================
                  TRANSACTION DETAILS
              ================================================= */}

              <section className="fraud-details-section">
                <div className="fraud-section-heading">
                  <div>
                    <span>
                      Transaction context
                    </span>

                    <h3>
                      Transaction Details
                    </h3>
                  </div>

                  <Target
                    size={17}
                    className="fraud-section-heading__icon"
                  />
                </div>

                <div className="fraud-detail-grid">
                  <DetailItem
                    icon={WalletCards}
                    label="Amount"
                    value={formatAmount(
                      selected
                        .transaction
                        ?.amountPaise
                    )}
                    accent="#48a8ff"
                  />

                  <DetailItem
                    icon={UserRound}
                    label="Beneficiary"
                    value={getBeneficiary(
                      selected
                    )}
                    accent="#b77cff"
                  />

                  <DetailItem
                    icon={ArrowUpRight}
                    label="Transaction Type"
                    value={getTransactionType(
                      selected
                    )}
                    accent="#20dc8d"
                  />

                  <DetailItem
                    icon={Smartphone}
                    label="Account"
                    value={
                      getAccountSuffix(
                        selected
                      ) || "Unavailable"
                    }
                    accent="#4ca8ff"
                  />

                  <DetailItem
                    icon={CircleAlert}
                    label="Transaction Status"
                    value={getTransactionStatus(
                      selected
                    )}
                    accent="#ffb52e"
                  />

                  <DetailItem
                    icon={Fingerprint}
                    label="Reference ID"
                    value={getReferenceId(
                      selected
                    )}
                    accent="#9b70ff"
                    mono
                  />

                  <DetailItem
                    icon={Clock3}
                    label="Date & Time"
                    value={formatDateTime(
                      selected.createdAt
                    )}
                    accent="#20dc8d"
                  />

                  <DetailItem
                    icon={ShieldCheck}
                    label="Fraud Decision"
                    value={decisionLabel(
                      selected.decision
                    )}
                    accent={
                      selectedDecisionTone.color
                    }
                  />
                </div>
              </section>

              {/* =================================================
                  DEVICE INTELLIGENCE
              ================================================= */}

              <section className="fraud-details-section">
                <div className="fraud-section-heading">
                  <div>
                    <span>
                      Device intelligence
                    </span>

                    <h3>
                      Security Context
                    </h3>
                  </div>

                  <Monitor
                    size={17}
                    className="fraud-section-heading__icon"
                  />
                </div>

                <div className="fraud-device-card">
                  <div className="fraud-device-card__icon">
                    <Smartphone
                      size={22}
                    />
                  </div>

                  <div className="fraud-device-card__body">
                    <strong>
                      {selectedDevice.device}
                    </strong>

                    <span>
                      {selectedDevice.browser}{" "}
                      •{" "}
                      {
                        selectedDevice.operatingSystem
                      }
                    </span>

                    <small>
                      Location:{" "}
                      {
                        selectedDevice.location
                      }
                    </small>
                  </div>

                  <div className="fraud-device-status">
                    <span />

                    Device evaluated
                  </div>
                </div>
              </section>

              {/* =================================================
                  INVESTIGATION TIMELINE
              ================================================= */}

              <section className="fraud-details-section fraud-timeline-section">
                <div className="fraud-section-heading">
                  <div>
                    <span>
                      Investigation
                    </span>

                    <h3>
                      Security Timeline
                    </h3>
                  </div>

                  <Zap
                    size={17}
                    className="fraud-section-heading__icon"
                  />
                </div>

                <div className="fraud-timeline">
                  <TimelineStep
                    icon={Activity}
                    title="Transaction"
                    subtitle="Initiated"
                    tone="#20dc8d"
                    active
                    time={formatDateTime(
                      selected.createdAt
                    )}
                  />

                  <TimelineStep
                    icon={BrainCircuit}
                    title="Fraud Engine"
                    subtitle="Analyzed"
                    tone="#48a8ff"
                    active
                    time={formatDateTime(
                      selected.createdAt
                    )}
                  />

                  <TimelineStep
                    icon={AlertTriangle}
                    title="Risk Signals"
                    subtitle="Detected"
                    tone="#ffb52e"
                    active
                    time={formatDateTime(
                      selected.createdAt
                    )}
                  />

                  <TimelineStep
                    icon={
                      normalize(
                        selected.decision
                      ) === "BLOCKED"
                        ? ShieldAlert
                        : LockKeyhole
                    }
                    title={
                      normalize(
                        selected.decision
                      ) === "BLOCKED"
                        ? "Transaction"
                        : "Verification"
                    }
                    subtitle={
                      normalize(
                        selected.decision
                      ) === "BLOCKED"
                        ? "Blocked"
                        : "Required"
                    }
                    tone={
                      normalize(
                        selected.decision
                      ) === "BLOCKED"
                        ? "#ff536b"
                        : "#d9a52b"
                    }
                    active
                    time={formatDateTime(
                      selected.createdAt
                    )}
                  />

                  <TimelineStep
                    icon={Clock3}
                    title="Review"
                    subtitle={
                      normalize(
                        selected.reviewStatus
                      ) === "REVIEWED"
                        ? "Completed"
                        : "Pending"
                    }
                    tone="#9b70ff"
                    active={
                      normalize(
                        selected.reviewStatus
                      ) === "REVIEWED"
                    }
                    time={
                      normalize(
                        selected.reviewStatus
                      ) === "REVIEWED" &&
                      selected.reviewedAt
                        ? formatDateTime(
                            selected.reviewedAt
                          )
                        : "In progress"
                    }
                  />
                </div>
              </section>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* =========================================================
   TIMELINE STEP
========================================================= */

function TimelineStep({
  icon: Icon,
  title,
  subtitle,
  tone,
  active,
  time,
}) {
  return (
    <div
      className={`fraud-timeline-step ${
        active
          ? "is-active"
          : ""
      }`}
      style={{
        "--timeline-color":
          tone,
      }}
    >
      <div className="fraud-timeline-step__node">
        <Icon size={15} />
      </div>

      <strong>{title}</strong>

      <span>{subtitle}</span>

      <small>{time}</small>
    </div>
  );
}

export default FraudLogsPage;