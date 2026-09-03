import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../services/apiClient";

/**
 * NexusBank Admin Control Centre
 *
 * Dashboard sections:
 * - Customer / account KPIs
 * - Account distribution
 * - PPF metrics
 * - FD metrics
 * - Fraud engine overview
 * - Risk distribution
 * - Fraud decisions
 * - ML service health
 * - Top triggered fraud rules
 */

function formatINR(paise) {
  if (typeof paise !== "number") return "₹0.00";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

async function safeGet(path) {
  try {
    const { data } = await apiClient.get(path);
    return data?.data ?? null;
  } catch {
    return null;
  }
}

function Metric({ label, value, tone = "", helper = null }) {
  return (
    <div className={`metric metric--${tone}`}>
      <span className="metric__label">{label}</span>

      <strong className="metric__value">
        {value}
      </strong>

      {helper ? (
        <small className="muted">
          {helper}
        </small>
      ) : null}
    </div>
  );
}

function RiskBadge({ level }) {
  const normalized = String(level || "UNKNOWN").toUpperCase();

  const tone =
    normalized === "HIGH"
      ? "danger"
      : normalized === "MEDIUM"
        ? "warning"
        : normalized === "LOW"
          ? "success"
          : "";

  return (
    <span className={`risk-badge risk-badge--${tone}`}>
      {normalized}
    </span>
  );
}

function DecisionBadge({ decision }) {
  const normalized = String(
    decision || "UNKNOWN"
  ).toUpperCase();

  let tone = "";

  if (normalized === "COMPLETED") {
    tone = "success";
  } else if (
    normalized === "VERIFICATION_REQUIRED"
  ) {
    tone = "warning";
  } else if (normalized === "BLOCKED") {
    tone = "danger";
  }

  return (
    <span className={`risk-badge risk-badge--${tone}`}>
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function RiskBar({ label, count, total, tone }) {
  const safeTotal = Math.max(total || 0, 1);

  const percentage = Math.min(
    100,
    Math.round((count / safeTotal) * 100)
  );

  return (
    <div className="risk-bar">
      <div className="risk-bar__head">
        <span>{label}</span>

        <strong>
          {count}{" "}
          <small className="muted">
            ({percentage}%)
          </small>
        </strong>
      </div>

      <div className="risk-bar__track">
        <div
          className={`risk-bar__fill risk-bar__fill--${tone}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
}) {
  return (
    <header className="admin-card__head">
      <div>
        {eyebrow ? (
          <p className="eyebrow">
            {eyebrow}
          </p>
        ) : null}

        <h2>{title}</h2>

        {description ? (
          <p className="muted">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
}

function EmptyState({ message }) {
  return (
    <div className="admin-empty">
      <span>—</span>
      <p className="muted">
        {message}
      </p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [ppf, setPpf] = useState(null);
  const [fd, setFd] = useState(null);
  const [fraud, setFraud] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [lastUpdated, setLastUpdated] =
    useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      const [
        overviewData,
        accountsData,
        ppfData,
        fdData,
        fraudData,
      ] = await Promise.all([
        safeGet("/admin/overview"),
        safeGet("/admin/accounts-overview"),
        safeGet("/admin/ppf-metrics"),
        safeGet("/admin/fd-metrics"),
        safeGet("/admin/fraud-stats?days=30"),
      ]);

      if (!mounted) return;

      setOverview(overviewData);
      setAccounts(accountsData);
      setPpf(ppfData);
      setFd(fdData);
      setFraud(fraudData);

      setLastUpdated(new Date());

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * FRAUD SUMMARY
   * ------------------------------------------------------------
   */

  const riskSummary = useMemo(() => {
    const rows = fraud?.byRisk || [];

    const find = (name) =>
      rows.find(
        (item) =>
          String(item?._id).toUpperCase() ===
          name
      )?.count || 0;

    const low = find("LOW");
    const medium = find("MEDIUM");
    const high = find("HIGH");

    const total =
      low +
      medium +
      high;

    return {
      low,
      medium,
      high,
      total,
    };
  }, [fraud]);

  const decisionSummary = useMemo(() => {
    const rows =
      fraud?.byDecision || [];

    const find = (name) =>
      rows.find(
        (item) =>
          String(item?._id).toUpperCase() ===
          name
      )?.count || 0;

    return {
      completed:
        find("COMPLETED"),

      verification:
        find("VERIFICATION_REQUIRED"),

      blocked:
        find("BLOCKED"),
    };
  }, [fraud]);

  const mlSummary = useMemo(() => {
    const rows =
      fraud?.mlServiceStatus || [];

    const available =
      rows.find(
        (item) =>
          String(item?._id).toUpperCase() ===
          "AVAILABLE"
      )?.count || 0;

    const unavailable =
      rows.find(
        (item) =>
          String(item?._id).toUpperCase() ===
          "UNAVAILABLE"
      )?.count || 0;

    const invalid =
      rows.find(
        (item) =>
          String(item?._id).toUpperCase() ===
          "INVALID_RESPONSE"
      )?.count || 0;

    return {
      available,
      unavailable,
      invalid,
    };
  }, [fraud]);

  const fraudHealth = useMemo(() => {
    if (!fraud) return "UNKNOWN";

    if (
      mlSummary.unavailable > 0 ||
      mlSummary.invalid > 0
    ) {
      return "DEGRADED";
    }

    return "HEALTHY";
  }, [
    fraud,
    mlSummary,
  ]);

  return (
    <div
      className="admin-dashboard"
      data-testid="admin-dashboard"
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="admin-dashboard__head">
        <div>
          <p className="eyebrow">
            Admin Control Centre
          </p>

          <h1>
            NexusBank Control Centre
          </h1>

          <p className="muted">
            Monitor customers, accounts,
            deposits and the fraud detection
            engine from one place.
          </p>
        </div>

        <div>
          <span
            className={`risk-badge ${
              fraudHealth === "HEALTHY"
                ? "risk-badge--success"
                : fraudHealth ===
                    "DEGRADED"
                  ? "risk-badge--warning"
                  : ""
            }`}
          >
            Fraud engine:{" "}
            {fraudHealth}
          </span>

          {lastUpdated ? (
            <small className="muted">
              Updated{" "}
              {lastUpdated.toLocaleTimeString(
                "en-IN"
              )}
            </small>
          ) : null}
        </div>
      </header>

      {/* ======================================================
          TOP KPIs
      ====================================================== */}

      <section
        className="metric-grid"
        data-testid="admin-kpi-grid"
      >
        <Metric
          label="Customers"
          value={
            overview?.snapshot?.userCount ??
            (loading ? "…" : "0")
          }
          helper="Registered users"
        />

        <Metric
          label="Total accounts"
          value={
            accounts?.totals
              ?.totalAccounts ??
            (loading ? "…" : "0")
          }
          helper="Active banking accounts"
        />

        <Metric
          label="Total AUM"
          value={
            accounts?.totals
              ? formatINR(
                  accounts.totals
                    .totalBalancePaise
                )
              : "…"
          }
          tone="primary"
          helper="Assets under management"
        />

        <Metric
          label="Blocked users"
          value={
            overview?.snapshot
              ?.blockedCount ?? "0"
          }
          tone={
            overview?.snapshot
              ?.blockedCount
              ? "danger"
              : ""
          }
          helper="Account-level restrictions"
        />

        <Metric
          label="High-risk cases"
          value={
            fraud
              ? riskSummary.high
              : loading
                ? "…"
                : "0"
          }
          tone={
            riskSummary.high > 0
              ? "danger"
              : ""
          }
          helper="Last 30 days"
        />

        <Metric
          label="OTP verifications"
          value={
            fraud
              ? decisionSummary.verification
              : loading
                ? "…"
                : "0"
          }
          tone={
            decisionSummary.verification >
            0
              ? "warning"
              : ""
          }
          helper="Additional verification"
        />
      </section>

      {/* ======================================================
          FRAUD ENGINE SUMMARY
      ====================================================== */}

      <section
        className="admin-card"
        data-testid="admin-fraud-summary"
      >
        <PanelHeader
          eyebrow="Security"
          title="Fraud engine overview"
          description="Risk distribution and transaction security decisions from the last 30 days."
        />

        {fraud ? (
          <>
            <div className="metric-grid">
              <Metric
                label="Transactions analysed"
                value={
                  riskSummary.total
                }
              />

              <Metric
                label="Low risk"
                value={
                  riskSummary.low
                }
                tone="success"
              />

              <Metric
                label="Medium risk"
                value={
                  riskSummary.medium
                }
                tone="warning"
              />

              <Metric
                label="High risk"
                value={
                  riskSummary.high
                }
                tone="danger"
              />
            </div>

            <div className="split">
              <div>
                <h3 className="muted">
                  Risk distribution
                </h3>

                <div className="stack stack-3">
                  <RiskBar
                    label="Low risk"
                    count={
                      riskSummary.low
                    }
                    total={
                      riskSummary.total
                    }
                    tone="success"
                  />

                  <RiskBar
                    label="Medium risk"
                    count={
                      riskSummary.medium
                    }
                    total={
                      riskSummary.total
                    }
                    tone="warning"
                  />

                  <RiskBar
                    label="High risk"
                    count={
                      riskSummary.high
                    }
                    total={
                      riskSummary.total
                    }
                    tone="danger"
                  />
                </div>
              </div>

              <div>
                <h3 className="muted">
                  Transaction decisions
                </h3>

                <ul className="dense-list">
                  <li>
                    <span>
                      <DecisionBadge decision="COMPLETED" />
                    </span>

                    <strong>
                      {
                        decisionSummary.completed
                      }
                    </strong>
                  </li>

                  <li>
                    <span>
                      <DecisionBadge
                        decision="VERIFICATION_REQUIRED"
                      />
                    </span>

                    <strong>
                      {
                        decisionSummary.verification
                      }
                    </strong>
                  </li>

                  <li>
                    <span>
                      <DecisionBadge decision="BLOCKED" />
                    </span>

                    <strong>
                      {
                        decisionSummary.blocked
                      }
                    </strong>
                  </li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            message={
              loading
                ? "Loading fraud metrics…"
                : "Fraud metrics are unavailable."
            }
          />
        )}
      </section>

      {/* ======================================================
          ACCOUNTS
      ====================================================== */}

      <section
        className="admin-card"
        data-testid="admin-accounts-panel"
      >
        <PanelHeader
          eyebrow="Banking"
          title="Accounts breakdown"
          description="Distribution of customer accounts by type and status."
        />

        {accounts ? (
          <div className="split">
            <div>
              <h3 className="muted">
                By type
              </h3>

              {(accounts.byType || [])
                .length > 0 ? (
                <ul className="dense-list">
                  {(
                    accounts.byType ||
                    []
                  ).map((r) => (
                    <li key={r._id}>
                      <span>
                        {r._id}
                      </span>

                      <strong>
                        {r.count} ·{" "}
                        {formatINR(
                          r.totalPaise
                        )}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message="No account type data." />
              )}
            </div>

            <div>
              <h3 className="muted">
                By status
              </h3>

              {(accounts.byStatus || [])
                .length > 0 ? (
                <ul className="dense-list">
                  {(
                    accounts.byStatus ||
                    []
                  ).map((r) => (
                    <li key={r._id}>
                      <span>
                        {r._id}
                      </span>

                      <strong>
                        {r.count}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message="No account status data." />
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            message={
              loading
                ? "Loading accounts…"
                : "No accounts data."
            }
          />
        )}
      </section>

      {/* ======================================================
          PPF + FD
      ====================================================== */}

      <section className="admin-grid-2col">
        {/* PPF */}

        <div
          className="admin-card"
          data-testid="admin-ppf-panel"
        >
          <PanelHeader
            eyebrow="Investments"
            title="PPF"
            description="Public Provident Fund portfolio overview."
          />

          {ppf?.enabled === false ? (
            <EmptyState message="PPF module not loaded." />
          ) : ppf ? (
            <div className="stack stack-3">
              <Metric
                label="PPF accounts"
                value={
                  ppf.accounts ?? 0
                }
              />

              <Metric
                label="Total PPF balance"
                value={formatINR(
                  ppf.totalBalancePaise ||
                    0
                )}
                tone="primary"
              />

              <Metric
                label="Total contributions"
                value={formatINR(
                  ppf.totalContributedPaise ||
                    0
                )}
              />
            </div>
          ) : (
            <EmptyState message="Loading PPF metrics…" />
          )}
        </div>

        {/* FD */}

        <div
          className="admin-card"
          data-testid="admin-fd-panel"
        >
          <PanelHeader
            eyebrow="Investments"
            title="Fixed Deposits"
            description="FD portfolio, principal and maturity overview."
          />

          {fd ? (
            <div className="stack stack-3">
              <Metric
                label="Total FDs"
                value={
                  fd.totals
                    ?.totalCount || 0
                }
              />

              <Metric
                label="Principal booked"
                value={formatINR(
                  fd.totals
                    ?.totalPrincipalPaise ||
                    0
                )}
              />

              <Metric
                label="Maturity value"
                value={formatINR(
                  fd.totals
                    ?.totalMaturityPaise ||
                    0
                )}
                tone="primary"
              />

              <div>
                <h3 className="muted">
                  By status
                </h3>

                {(fd.byStatus || [])
                  .length > 0 ? (
                  <ul className="dense-list">
                    {(
                      fd.byStatus ||
                      []
                    ).map((r) => (
                      <li key={r._id}>
                        <span>
                          {r._id}
                        </span>

                        <strong>
                          {r.count} ·{" "}
                          {formatINR(
                            r.maturityPaise
                          )}
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="No FD status data." />
                )}
              </div>
            </div>
          ) : (
            <EmptyState message="Loading FD metrics…" />
          )}
        </div>
      </section>

      {/* ======================================================
          ML SERVICE
      ====================================================== */}

      <section
        className="admin-card"
        data-testid="admin-ml-panel"
      >
        <PanelHeader
          eyebrow="Machine Learning"
          title="ML fraud service"
          description="Health of the ML prediction layer used by the fraud engine."
        />

        {fraud ? (
          <div className="metric-grid">
            <Metric
              label="Predictions available"
              value={
                mlSummary.available
              }
              tone="success"
            />

            <Metric
              label="Unavailable"
              value={
                mlSummary.unavailable
              }
              tone={
                mlSummary.unavailable >
                0
                  ? "warning"
                  : ""
              }
            />

            <Metric
              label="Invalid responses"
              value={
                mlSummary.invalid
              }
              tone={
                mlSummary.invalid > 0
                  ? "danger"
                  : ""
              }
            />

            <Metric
              label="Service health"
              value={
                fraudHealth
              }
              tone={
                fraudHealth ===
                "HEALTHY"
                  ? "success"
                  : "warning"
              }
            />
          </div>
        ) : (
          <EmptyState message="Loading ML service metrics…" />
        )}
      </section>

      {/* ======================================================
          TOP FRAUD RULES
      ====================================================== */}

      <section
        className="admin-card"
        data-testid="admin-fraud-rules-panel"
      >
        <PanelHeader
          eyebrow="Detection"
          title="Top triggered fraud rules"
          description="Rules that contributed most frequently to suspicious activity."
        />

        {fraud ? (
          (fraud.topRules || [])
            .length > 0 ? (
            <ol className="dense-list">
              {(
                fraud.topRules || []
              ).map((rule, index) => (
                <li
                  key={
                    rule._id ||
                    index
                  }
                >
                  <span>
                    <strong>
                      #{index + 1}
                    </strong>{" "}
                    {rule.label ||
                      rule._id}
                  </span>

                  <strong>
                    {rule.count} triggers
                  </strong>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState message="No fraud rules have been triggered in this period." />
          )
        ) : (
          <EmptyState message="Loading fraud rules…" />
        )}
      </section>
    </div>
  );
}