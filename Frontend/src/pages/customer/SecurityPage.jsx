import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Monitor,
  Activity,
  LockKeyhole,
  Smartphone,
  Fingerprint,
  Radar,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Eye,
  Search,
  Zap,
  CircleDot,
  BellRing,
  Settings2,
  ArrowUpRight,
  MapPin,
  X,
} from "lucide-react";

import { fraudService } from "../../services/fraudService.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useApi } from "../../hooks/useApi.js";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { formatDateTime, relativeFromNow } from "../../utils/date.js";

import "./SecurityPage.css";

const EVENT_FILTERS = [
  { id: "all", label: "All activity" },
  { id: "security", label: "Security" },
  { id: "warning", label: "Warnings" },
];

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function formatEventName(value) {
  return String(value || "Security activity")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isWarningEvent(event) {
  const name = String(event?.eventType || "").toLowerCase();

  return (
    name.includes("fraud") ||
    name.includes("risk") ||
    name.includes("verification") ||
    name.includes("failed") ||
    name.includes("blocked") ||
    name.includes("suspicious") ||
    name.includes("alert")
  );
}

function isSuccessEvent(event) {
  const name = String(event?.eventType || "").toLowerCase();

  return (
    name.includes("login") ||
    name.includes("verified") ||
    name.includes("completed") ||
    name.includes("success") ||
    name.includes("trusted")
  );
}

function getEventTone(event) {
  if (isWarningEvent(event)) return "warning";
  if (isSuccessEvent(event)) return "success";
  return "info";
}

function getDeviceName(device) {
  const browser = device?.browser || "Unknown browser";
  const os = device?.operatingSystem || "Unknown device";

  return `${browser} · ${os}`;
}

function getSecurityStatus(score) {
  if (score >= 90) {
    return {
      label: "Excellent protection",
      description: "Your account is strongly protected.",
      tone: "excellent",
    };
  }

  if (score >= 75) {
    return {
      label: "Good protection",
      description: "Your account is protected with room to improve.",
      tone: "good",
    };
  }

  if (score >= 50) {
    return {
      label: "Needs attention",
      description: "Review your security settings and recent activity.",
      tone: "attention",
    };
  }

  return {
    label: "Action recommended",
    description: "Some security settings need your attention.",
    tone: "critical",
  };
}

function buildActivityData(events) {
  const days = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);

    days.push({
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      count: 0,
      warnings: 0,
    });
  }

  events.forEach((event) => {
    const date = new Date(event?.createdAt);

    if (Number.isNaN(date.getTime())) return;

    const key = date.toISOString().slice(0, 10);
    const bucket = days.find((item) => item.key === key);

    if (!bucket) return;

    bucket.count += 1;

    if (isWarningEvent(event)) {
      bucket.warnings += 1;
    }
  });

  return days;
}

function getInitials(value = "") {
  return String(value)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "NB";
}

export function SecurityPage() {
  const { user } = useAuth();

  const {
    data,
    loading,
    error,
    refetch,
  } = useApi(() => fraudService.overview(), []);

  const [eventFilter, setEventFilter] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showAllEvents, setShowAllEvents] = useState(false);

  if (error) {
    return (
      <ErrorState
        description={error.message}
        onRetry={refetch}
      />
    );
  }

  const score = clamp(user?.securityScore ?? 92, 0, 100);

  const devices = data?.devices || [];
  const events = data?.recentEvents || [];
  const openFraudCount = Number(data?.openFraudCount || 0);

  const trustedDevices = devices.filter(
    (device) => Boolean(device?.trusted)
  ).length;

  const newDevices = devices.length - trustedDevices;

  const status = getSecurityStatus(score);

  const filteredEvents = useMemo(() => {
    if (eventFilter === "warning") {
      return events.filter(isWarningEvent);
    }

    if (eventFilter === "security") {
      return events.filter((event) => !isWarningEvent(event));
    }

    return events;
  }, [events, eventFilter]);

  const visibleEvents = showAllEvents
    ? filteredEvents
    : filteredEvents.slice(0, 6);

  const activity = useMemo(
    () => buildActivityData(events),
    [events]
  );

  const maxActivity = Math.max(
    ...activity.map((item) => item.count),
    1
  );

  const lastFraud = data?.lastFraud;

  return (
    <div
      className="security-page"
      data-testid="security-page"
    >
      {/* =====================================================
          AMBIENT BACKGROUND
      ====================================================== */}

      <div className="security-page__ambient security-page__ambient--one" />
      <div className="security-page__ambient security-page__ambient--two" />
      <div className="security-page__grid-bg" />

      {/* =====================================================
          HEADER
      ====================================================== */}

      <motion.header
        className="security-page__header"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="security-page__header-main">
          <div className="security-page__eyebrow-row">
            <span className="security-page__eyebrow">
              Trust & Protection
            </span>

            <span className="security-page__status-pill">
              <span />
              Protection active
            </span>
          </div>

          <h1>Security Center</h1>

          <p>
            Your security, devices and fraud protection are
            continuously monitored from one place.
          </p>
        </div>

        <div className="security-page__header-actions">
          <motion.button
            type="button"
            className="security-action-btn"
            onClick={() => refetch()}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "security-spin" : ""}
            />
            Refresh
          </motion.button>

          <Link
            to="/app/settings"
            className="security-action-btn security-action-btn--primary"
          >
            <Settings2 size={15} />
            Security settings
          </Link>
        </div>
      </motion.header>

      {/* =====================================================
          OVERVIEW CARDS
      ====================================================== */}

      <motion.section
        className="security-metrics"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.07,
            },
          },
        }}
      >
        <MetricCard
          icon={<ShieldCheck size={20} />}
          label="Security score"
          value={score}
          suffix="/100"
          description={status.label}
          tone="green"
          progress={score}
        />

        <MetricCard
          icon={<Monitor size={20} />}
          label="Tracked devices"
          value={devices.length}
          description={
            trustedDevices > 0
              ? `${trustedDevices} trusted`
              : "No trusted devices"
          }
          tone="blue"
        />

        <MetricCard
          icon={<Activity size={20} />}
          label="Security events"
          value={events.length}
          description="Recent activity detected"
          tone="purple"
        />

        <MetricCard
          icon={<ShieldAlert size={20} />}
          label="Fraud protection"
          value={openFraudCount}
          description={
            openFraudCount > 0
              ? "Events require attention"
              : "No active fraud alerts"
          }
          tone={openFraudCount > 0 ? "amber" : "green"}
        />

        <MetricCard
          icon={<Fingerprint size={20} />}
          label="Protection engine"
          value="ACTIVE"
          description="Real-time monitoring"
          tone="cyan"
          compact
        />
      </motion.section>

      {/* =====================================================
          MAIN PROTECTION GRID
      ====================================================== */}

      <section className="security-main-grid">
        {/* SECURITY SCORE */}
        <motion.article
          className={`security-card security-score-card security-score-card--${status.tone}`}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="security-card__shine" />

          <div className="security-card__header">
            <div>
              <span className="security-label">
                Account protection
              </span>
              <h2>Security Score</h2>
            </div>

            <div className="security-card__icon security-card__icon--green">
              <ShieldCheck size={21} />
            </div>
          </div>

          <div className="security-score">
            <svg
              viewBox="0 0 160 160"
              className="security-score__svg"
              aria-hidden="true"
            >
              <circle
                cx="80"
                cy="80"
                r="67"
                className="security-score__track"
              />

              <motion.circle
                cx="80"
                cy="80"
                r="67"
                className="security-score__progress"
                initial={{
                  strokeDashoffset: 421,
                }}
                animate={{
                  strokeDashoffset:
                    421 - (421 * score) / 100,
                }}
                transition={{
                  duration: 1.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </svg>

            <div className="security-score__value">
              <motion.strong
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45, duration: 0.45 }}
              >
                {score}
              </motion.strong>

              <span>/100</span>
            </div>

            <div className="security-score__orbit security-score__orbit--one" />
            <div className="security-score__orbit security-score__orbit--two" />
          </div>

          <div className="security-score__status">
            <div className="security-score__status-icon">
              <CheckCircle2 size={17} />
            </div>

            <div>
              <strong>{status.label}</strong>
              <span>{status.description}</span>
            </div>
          </div>

          <div className="security-score__breakdown">
            <ScoreBar
              label="Account security"
              value={score}
            />

            <ScoreBar
              label="Device trust"
              value={
                devices.length
                  ? Math.round(
                      (trustedDevices / devices.length) * 100
                    )
                  : 0
              }
            />

            <ScoreBar
              label="Fraud protection"
              value={openFraudCount > 0 ? 70 : 100}
            />
          </div>

          <div className="security-score__footer">
            <div>
              <LockKeyhole size={14} />
              <span>Password</span>
              <strong>
                {score >= 75 ? "Strong" : "Review"}
              </strong>
            </div>

            <div>
              <Smartphone size={14} />
              <span>Devices</span>
              <strong>{trustedDevices} trusted</strong>
            </div>

            <div>
              <Fingerprint size={14} />
              <span>Fraud detection</span>
              <strong>Active</strong>
            </div>
          </div>
        </motion.article>

        {/* NEXUS SHIELD */}
        <motion.article
          className="security-card nexus-shield-card"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
        >
          <div className="nexus-shield-card__particles">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="security-card__header">
            <div>
              <span className="security-label">
                Intelligent fraud protection
              </span>

              <h2>NexusShield™</h2>
            </div>

            <span className="security-live-badge">
              <span />
              ACTIVE
            </span>
          </div>

          <div className="nexus-shield">
            <div className="nexus-shield__radar">
              <div className="nexus-shield__radar-ring nexus-shield__radar-ring--one" />
              <div className="nexus-shield__radar-ring nexus-shield__radar-ring--two" />
              <div className="nexus-shield__radar-ring nexus-shield__radar-ring--three" />

              <motion.div
                className="nexus-shield__scan"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />

              <motion.div
                className="nexus-shield__core"
                animate={{
                  scale: [1, 1.06, 1],
                  boxShadow: [
                    "0 0 20px rgba(52,211,153,.16)",
                    "0 0 48px rgba(52,211,153,.38)",
                    "0 0 20px rgba(52,211,153,.16)",
                  ],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                }}
              >
                <ShieldCheck size={40} />
              </motion.div>

              <span className="nexus-shield__signal nexus-shield__signal--one" />
              <span className="nexus-shield__signal nexus-shield__signal--two" />
              <span className="nexus-shield__signal nexus-shield__signal--three" />
            </div>

            <div className="nexus-shield__content">
              <div className="nexus-shield__headline">
                <div>
                  <span>Protection status</span>
                  <strong>Real-time monitoring</strong>
                </div>

                <div className="nexus-shield__pulse">
                  <span />
                  LIVE
                </div>
              </div>

              <p>
                NexusShield continuously evaluates transaction
                behaviour, device intelligence and fraud signals
                across your account.
              </p>

              <div className="nexus-shield__checks">
                <ProtectionCheck label="Transaction monitoring" />
                <ProtectionCheck label="Device intelligence" />
                <ProtectionCheck label="Risk analysis" />
                <ProtectionCheck label="Behaviour detection" />
              </div>

              {lastFraud && (
                <div className="nexus-shield__last-event">
                  <div className="nexus-shield__last-icon">
                    <AlertTriangle size={15} />
                  </div>

                  <div>
                    <span>Latest fraud analysis</span>
                    <strong>
                      {lastFraud.riskLevel || "Flagged"} ·{" "}
                      {lastFraud.decision || "Review required"}
                    </strong>
                  </div>

                  <Link to="/app/fraud">
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="nexus-shield__footer">
            <div>
              <Radar size={15} />
              <span>
                Fraud Detection Engine is scanning your account
                in real time
              </span>
            </div>

            <span className="nexus-shield__live-dot" />
          </div>
        </motion.article>
      </section>

      {/* =====================================================
          ACTIVITY / DEVICES
      ====================================================== */}

      <section className="security-content-grid">
        {/* ACTIVITY */}
        <motion.article
          className="security-card security-activity-card"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
        >
          <div className="security-card__header">
            <div>
              <span className="security-label">
                Activity monitoring
              </span>

              <h2>Security activity</h2>

              <p className="security-card__description">
                Account security events over the last 7 days.
              </p>
            </div>

            <div className="security-card__header-stat">
              <Activity size={15} />
              <strong>{events.length}</strong>
              <span>events</span>
            </div>
          </div>

          <div className="security-activity-chart">
            <div className="security-activity-chart__guide">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="security-activity-bars">
              {activity.map((item, index) => {
                const height =
                  item.count === 0
                    ? 8
                    : Math.max(
                        14,
                        (item.count / maxActivity) * 100
                      );

                return (
                  <div
                    key={item.key}
                    className="security-activity-bar"
                  >
                    <div className="security-activity-bar__value">
                      {item.count > 0 && item.count}
                    </div>

                    <motion.div
                      className={`security-activity-bar__fill ${
                        item.warnings > 0
                          ? "security-activity-bar__fill--warning"
                          : ""
                      }`}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{
                        duration: 0.65,
                        delay: 0.25 + index * 0.06,
                        ease: "easeOut",
                      }}
                    />

                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="security-chart-legend">
            <span>
              <i className="security-legend-dot security-legend-dot--success" />
              Normal activity
            </span>

            <span>
              <i className="security-legend-dot security-legend-dot--warning" />
              Security warning
            </span>
          </div>
        </motion.article>

        {/* DEVICES */}
        <motion.article
          className="security-card security-devices-card"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
        >
          <div className="security-card__header">
            <div>
              <span className="security-label">
                Device intelligence
              </span>

              <h2>Known devices</h2>

              <p className="security-card__description">
                Devices that recently accessed your account.
              </p>
            </div>

            <div className="security-device-summary">
              <span>
                <strong>{trustedDevices}</strong>
                trusted
              </span>

              <span>
                <strong>{newDevices}</strong>
                new
              </span>
            </div>
          </div>

          {loading ? (
            <div className="security-device-list">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton
                  key={index}
                  height={88}
                  radius={16}
                />
              ))}
            </div>
          ) : devices.length === 0 ? (
            <EmptyState
              icon={Monitor}
              title="No devices yet"
              description="Your sign-in devices will appear here."
            />
          ) : (
            <div
              className="security-device-list"
              data-testid="devices-list"
            >
              {devices.slice(0, 3).map((device, index) => {
                const trusted = Boolean(device?.trusted);

                return (
                  <motion.button
                    type="button"
                    key={device?._id || index}
                    className={`security-device ${
                      trusted
                        ? "security-device--trusted"
                        : "security-device--new"
                    }`}
                    onClick={() => setSelectedDevice(device)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.32 + index * 0.08,
                    }}
                    whileHover={{
                      y: -3,
                    }}
                    whileTap={{
                      scale: 0.99,
                    }}
                  >
                    <div className="security-device__icon">
                      {trusted ? (
                        <Monitor size={20} />
                      ) : (
                        <Smartphone size={20} />
                      )}
                    </div>

                    <div className="security-device__info">
                      <strong>
                        {getDeviceName(device)}
                      </strong>

                      <span>
                        {device?.deviceIdentifier ||
                          "Device identifier unavailable"}
                      </span>

                      <small>
                        <Clock3 size={12} />
                        Last active{" "}
                        {relativeFromNow(
                          device?.lastSeenAt
                        )}
                      </small>
                    </div>

                    <div className="security-device__right">
                      <span
                        className={`security-device__badge ${
                          trusted
                            ? "security-device__badge--trusted"
                            : "security-device__badge--new"
                        }`}
                      >
                        {trusted ? "Trusted" : "New"}
                      </span>

                      <ChevronRight size={16} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {devices.length > 3 && (
            <div className="security-devices-footer">
              <span>
                +{devices.length - 3} more device
                {devices.length - 3 === 1 ? "" : "s"}
              </span>

              <Link to="/app/settings">
                Manage devices
                <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </motion.article>
      </section>

      {/* =====================================================
          RECENT EVENTS + RECOMMENDATIONS
      ====================================================== */}

      <section className="security-bottom-grid">
        {/* EVENTS */}
        <motion.article
          className="security-card security-events-card"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.34 }}
        >
          <div className="security-card__header security-events-card__header">
            <div>
              <span className="security-label">
                Security timeline
              </span>

              <h2>Recent security events</h2>

              <p className="security-card__description">
                Important activity detected on your account.
              </p>
            </div>

            <Link
              to="/app/fraud"
              className="security-small-link"
            >
              Fraud events
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="security-event-filters">
            {EVENT_FILTERS.map((filter) => (
              <button
                type="button"
                key={filter.id}
                className={
                  eventFilter === filter.id
                    ? "security-event-filter security-event-filter--active"
                    : "security-event-filter"
                }
                onClick={() => {
                  setEventFilter(filter.id);
                  setShowAllEvents(false);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="security-event-list">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  height={66}
                  radius={12}
                />
              ))}
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="security-events-empty">
              <div>
                <ShieldCheck size={22} />
              </div>

              <strong>No matching security activity</strong>

              <span>
                Your account has no events in this filter.
              </span>
            </div>
          ) : (
            <div
              className="security-event-list"
              data-testid="security-events"
            >
              <AnimatePresence initial={false}>
                {visibleEvents.map((event, index) => {
                  const tone = getEventTone(event);

                  return (
                    <motion.div
                      key={event?._id || `${event?.createdAt}-${index}`}
                      className={`security-event security-event--${tone}`}
                      initial={{
                        opacity: 0,
                        x: -12,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      exit={{
                        opacity: 0,
                        x: -8,
                      }}
                      transition={{
                        duration: 0.25,
                        delay: index * 0.035,
                      }}
                    >
                      <div className="security-event__timeline">
                        <div className="security-event__icon">
                          {tone === "warning" ? (
                            <AlertTriangle size={15} />
                          ) : tone === "success" ? (
                            <ShieldCheck size={15} />
                          ) : (
                            <CircleDot size={15} />
                          )}
                        </div>

                        {index !== visibleEvents.length - 1 && (
                          <span />
                        )}
                      </div>

                      <div className="security-event__content">
                        <div className="security-event__title-row">
                          <strong>
                            {formatEventName(
                              event?.eventType
                            )}
                          </strong>

                          <span
                            className={`security-event__tag security-event__tag--${tone}`}
                          >
                            {tone === "warning"
                              ? "Attention"
                              : tone === "success"
                                ? "Protected"
                                : "Info"}
                          </span>
                        </div>

                        <span>
                          Security activity recorded on your
                          account.
                        </span>
                      </div>

                      <time>
                        {formatDateTime(
                          event?.createdAt
                        )}
                      </time>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {filteredEvents.length > 6 && (
            <button
              type="button"
              className="security-events-toggle"
              onClick={() =>
                setShowAllEvents((current) => !current)
              }
            >
              {showAllEvents
                ? "Show less"
                : `View all ${filteredEvents.length} events`}
              <ChevronRight size={14} />
            </button>
          )}
        </motion.article>

        {/* RECOMMENDATIONS */}
        <motion.article
          className="security-card security-recommendations-card"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="security-card__header">
            <div>
              <span className="security-label">
                Protection controls
              </span>

              <h2>Security actions</h2>

              <p className="security-card__description">
                Quick access to important account protection
                areas.
              </p>
            </div>
          </div>

          <SecurityAction
            icon={<ShieldAlert size={19} />}
            tone="green"
            title="Review fraud events"
            description={
              openFraudCount > 0
                ? `${openFraudCount} flagged event${
                    openFraudCount === 1 ? "" : "s"
                  } require attention`
                : "No active fraud events require attention"
            }
            to="/app/fraud"
          />

          <SecurityAction
            icon={<Settings2 size={19} />}
            tone="blue"
            title="Account security"
            description="Review your account protection settings"
            to="/app/settings"
          />

          <SecurityAction
            icon={<Fingerprint size={19} />}
            tone="purple"
            title="Security monitoring"
            description="Fraud detection is actively protecting your account"
            to="/app/fraud"
          />

          <SecurityAction
            icon={<BellRing size={19} />}
            tone="amber"
            title="Security alerts"
            description="Review notifications and suspicious activity"
            to="/app/alerts"
          />

          <div className="security-recommendations__footer">
            <Zap size={15} />
            <span>
              NexusShield protection remains active while you
              use NexusBank.
            </span>
          </div>
        </motion.article>
      </section>

      {/* =====================================================
          BOTTOM PROTECTION STRIP
      ====================================================== */}

      <motion.div
        className="security-protection-strip"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.46 }}
      >
        <div className="security-protection-strip__icon">
          <ShieldCheck size={22} />
        </div>

        <div>
          <strong>Your security is our priority</strong>

          <p>
            Never share your OTP, PIN, password or banking
            credentials with anyone.
          </p>
        </div>

        <div className="security-protection-strip__status">
          <span />
          NexusBank Protected
        </div>
      </motion.div>

      {/* =====================================================
          DEVICE DETAIL MODAL
      ====================================================== */}

      <AnimatePresence>
        {selectedDevice && (
          <motion.div
            className="security-device-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDevice(null)}
          >
            <motion.div
              className="security-device-modal"
              initial={{
                opacity: 0,
                scale: 0.96,
                y: 12,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.96,
                y: 12,
              }}
              transition={{
                duration: 0.22,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="security-device-modal__header">
                <div>
                  <span className="security-label">
                    Device intelligence
                  </span>

                  <h3>Device details</h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDevice(null)}
                  aria-label="Close device details"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="security-device-modal__hero">
                <div className="security-device-modal__icon">
                  {selectedDevice.trusted ? (
                    <Monitor size={25} />
                  ) : (
                    <Smartphone size={25} />
                  )}
                </div>

                <div>
                  <strong>
                    {getDeviceName(selectedDevice)}
                  </strong>

                  <span>
                    {selectedDevice.trusted
                      ? "Trusted device"
                      : "New device"}
                  </span>
                </div>
              </div>

              <div className="security-device-modal__details">
                <DeviceDetail
                  icon={<Monitor size={15} />}
                  label="Device"
                  value={
                    selectedDevice.deviceIdentifier ||
                    "Unavailable"
                  }
                />

                <DeviceDetail
                  icon={<Clock3 size={15} />}
                  label="Last active"
                  value={
                    selectedDevice.lastSeenAt
                      ? relativeFromNow(
                          selectedDevice.lastSeenAt
                        )
                      : "Unavailable"
                  }
                />

                <DeviceDetail
                  icon={<Eye size={15} />}
                  label="Status"
                  value={
                    selectedDevice.trusted
                      ? "Trusted"
                      : "New / untrusted"
                  }
                />

                <DeviceDetail
                  icon={<MapPin size={15} />}
                  label="Account access"
                  value="NexusBank account"
                />
              </div>

              <div className="security-device-modal__footer">
                <ShieldCheck size={15} />
                <span>
                  Device information is supplied by your
                  account security service.
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   METRIC CARD
============================================================ */

function MetricCard({
  icon,
  label,
  value,
  suffix,
  description,
  tone = "green",
  progress,
  compact = false,
}) {
  return (
    <motion.article
      className={`security-metric security-metric--${tone}`}
      variants={{
        hidden: {
          opacity: 0,
          y: 15,
        },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
          },
        },
      }}
      whileHover={{
        y: -4,
      }}
    >
      <div className="security-metric__top">
        <div className="security-metric__label">
          {label}
        </div>

        <div className="security-metric__icon">
          {icon}
        </div>
      </div>

      <div
        className={`security-metric__value ${
          compact ? "security-metric__value--compact" : ""
        }`}
      >
        <strong>{value}</strong>

        {suffix && <span>{suffix}</span>}
      </div>

      <div className="security-metric__description">
        {description}
      </div>

      {typeof progress === "number" && (
        <div className="security-metric__progress">
          <motion.span
            initial={{ width: 0 }}
            animate={{
              width: `${progress}%`,
            }}
            transition={{
              duration: 1,
              delay: 0.4,
            }}
          />
        </div>
      )}
    </motion.article>
  );
}

/* ============================================================
   SCORE BAR
============================================================ */

function ScoreBar({ label, value }) {
  return (
    <div className="security-score-bar">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>

      <div className="security-score-bar__track">
        <motion.span
          initial={{ width: 0 }}
          animate={{
            width: `${clamp(value, 0, 100)}%`,
          }}
          transition={{
            duration: 0.9,
            ease: "easeOut",
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   PROTECTION CHECK
============================================================ */

function ProtectionCheck({ label }) {
  return (
    <div className="nexus-shield__check">
      <span>
        <CheckCircle2 size={14} />
      </span>

      <strong>{label}</strong>

      <em>Active</em>
    </div>
  );
}

/* ============================================================
   SECURITY ACTION
============================================================ */

function SecurityAction({
  icon,
  tone,
  title,
  description,
  to,
}) {
  return (
    <Link
      to={to}
      className={`security-action security-action--${tone}`}
    >
      <div className="security-action__icon">
        {icon}
      </div>

      <div className="security-action__content">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <ChevronRight
        size={17}
        className="security-action__arrow"
      />
    </Link>
  );
}

/* ============================================================
   DEVICE DETAIL
============================================================ */

function DeviceDetail({ icon, label, value }) {
  return (
    <div className="security-device-modal__detail">
      <div>{icon}</div>

      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}