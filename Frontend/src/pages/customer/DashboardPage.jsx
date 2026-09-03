import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  ChevronRight,
  Copy,
  FileText,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { apiClient } from "../../services/apiClient.js";
import { useAuth } from "../../hooks/useAuth.js";

import "./DashboardPage.css";

function formatINR(paise) {
  const amount = Number(paise);

  if (!Number.isFinite(amount)) {
    return "₹0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

async function getData(path, params) {
  const response = await apiClient.get(path, { params });
  return response?.data?.data ?? null;
}

function getAccountIcon(type) {
  if (String(type || "").toUpperCase() === "CURRENT") {
    return Wallet;
  }

  return PiggyBank;
}

function getNotificationClass(priority) {
  const value = String(priority || "").toUpperCase();

  if (value === "SUCCESS") return "success";
  if (value === "WARNING") return "warning";
  if (value === "DANGER") return "danger";

  return "info";
}

function getNotificationIcon(type, priority) {
  const normalizedType = String(type || "").toUpperCase();
  const normalizedPriority = String(priority || "").toUpperCase();

  if (normalizedType.includes("BLOCKED")) {
    return ShieldCheck;
  }

  if (normalizedType.includes("COMPLETED")) {
    return ArrowUpRight;
  }

  if (
    normalizedPriority === "DANGER" ||
    normalizedPriority === "WARNING"
  ) {
    return AlertCircle;
  }

  if (normalizedType.includes("REWARD")) {
    return Sparkles;
  }

  return Bell;
}

function extractList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
}

function extractPpf(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return payload;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [ppf, setPpf] = useState(null);
  const [fds, setFds] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError(null);

      const results = await Promise.allSettled([
        getData("/accounts"),
        getData("/ppf"),
        getData("/fd"),
        getData("/notifications", {
          limit: 5,
          skip: 0,
        }),
      ]);

      const [accountsResult, ppfResult, fdResult, notificationResult] =
        results;

      let successfulRequests = 0;

      if (accountsResult.status === "fulfilled") {
        setAccounts(extractList(accountsResult.value));
        successfulRequests += 1;
      }

      if (ppfResult.status === "fulfilled") {
        setPpf(extractPpf(ppfResult.value));
        successfulRequests += 1;
      }

      if (fdResult.status === "fulfilled") {
        setFds(extractList(fdResult.value));
        successfulRequests += 1;
      }

      if (notificationResult.status === "fulfilled") {
        setNotifications(extractList(notificationResult.value));
        successfulRequests += 1;
      }

      if (accountsResult.status === "rejected") {
        setLoadError(
          accountsResult.reason?.message ||
            "Unable to load your banking accounts."
        );
      } else if (successfulRequests === 0) {
        setLoadError("Unable to load dashboard data.");
      }

      setLoading(false);
      setRefreshing(false);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      if (cancelled) return;
      await loadDashboard();
    }

    initialLoad();

    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  const totalBalance = useMemo(
    () =>
      accounts.reduce(
        (sum, account) =>
          sum +
          Number(
            account.availableBalancePaise ??
              account.balancePaise ??
              0
          ),
        0
      ),
    [accounts]
  );

  const activeAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          String(account.status || "ACTIVE").toUpperCase() ===
          "ACTIVE"
      ),
    [accounts]
  );

  const activeFds = useMemo(
    () =>
      fds.filter(
        (fd) =>
          String(fd.status || "").toUpperCase() === "ACTIVE"
      ),
    [fds]
  );

  const totalFdPrincipal = useMemo(
    () =>
      activeFds.reduce(
        (sum, fd) =>
          sum +
          Number(
            fd.principalPaise ??
              fd.amountPaise ??
              0
          ),
        0
      ),
    [activeFds]
  );

  const totalFdMaturity = useMemo(
    () =>
      activeFds.reduce(
        (sum, fd) =>
          sum + Number(fd.maturityAmountPaise ?? 0),
        0
      ),
    [activeFds]
  );

  const ppfAccount = ppf?.ppf || null;

  const ppfBalance = Number(
    ppfAccount?.balancePaise ??
      ppf?.balancePaise ??
      0
  );

  const ppfThisYear = Number(
    ppf?.contributedThisYearPaise ??
      ppf?.currentFyContributedPaise ??
      ppfAccount?.currentFyContributedPaise ??
      0
  );

  const totalPortfolio =
    totalBalance +
    totalFdPrincipal +
    ppfBalance;

  const primaryAccount =
    activeAccounts.find((account) => account.isPrimary) ||
    activeAccounts[0] ||
    accounts.find((account) => account.isPrimary) ||
    accounts[0];

  const firstThreeAccounts = activeAccounts.slice(0, 3);

  const unreadNotifications = notifications.filter(
    (notification) => !notification.read
  );

  const notificationCount = unreadNotifications.length;

  const refreshDashboard = () => {
    loadDashboard({ silent: true });
  };

  return (
    <div
      className="nb-dashboard"
      data-testid="dashboard-page"
    >
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="nb-dashboard__orb nb-dashboard__orb--one" />
      <div className="nb-dashboard__orb nb-dashboard__orb--two" />
      <div className="nb-dashboard__stars" />

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="nb-dashboard__welcome">
        <div>
          <div className="nb-dashboard__eyebrow">
            <span className="nb-live-dot" />
            Personal banking
          </div>

          <h1>
            Welcome back,
            <span>
              {user?.name || "NexusBank Customer"}{" "}
              <span className="nb-wave">👋</span>
            </span>
          </h1>

          <p>
            Here's what's happening with your money today.
          </p>
        </div>

        <div className="nb-dashboard__welcome-actions">
          <button
            type="button"
            className="nb-icon-action"
            title="Refresh dashboard"
            onClick={refreshDashboard}
            disabled={refreshing}
            aria-label="Refresh dashboard"
          >
            <RefreshCw
              size={18}
              className={refreshing ? "nb-refresh-spin" : ""}
            />
          </button>

          <Link
            to="/app/alerts"
            className="nb-icon-action"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={19} />

            {notificationCount > 0 && (
              <span
                className="nb-notification-dot"
                title={`${notificationCount} unread notification${
                  notificationCount === 1 ? "" : "s"
                }`}
              />
            )}
          </Link>

          <div className="nb-profile-chip">
            <div className="nb-profile-avatar">
              {(user?.name || "A")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user?.name || "Customer"}
              </strong>

              <span>Premium Customer</span>
            </div>

            <ChevronRight size={16} />
          </div>
        </div>
      </header>

      {/* =====================================================
          GLOBAL CORE ERROR
      ====================================================== */}

      {loadError && (
        <section className="nb-dashboard-error">
          <div>
            <AlertCircle size={18} />
            <span>{loadError}</span>
          </div>

          <button
            type="button"
            onClick={() => loadDashboard()}
          >
            Try again
          </button>
        </section>
      )}

      {/* =====================================================
          TOP STAT CARDS
      ====================================================== */}

      <section className="nb-dashboard__stats">
        {/* Total Balance */}

        <article className="nb-balance-card">
          <div className="nb-balance-card__glow" />

          <div className="nb-card-top">
            <div>
              <span className="nb-card-label">
                Total Balance
              </span>

              <h2>
                {loading
                  ? "Loading..."
                  : formatINR(totalBalance)}
              </h2>

              <div className="nb-balance-growth">
                <TrendingUp size={16} />

                <span>
                  Available across your active accounts
                </span>
              </div>
            </div>

            <div className="nb-balance-icon">
              <Wallet size={28} />
            </div>
          </div>

          <div className="nb-balance-line">
            <span />
          </div>

          <div className="nb-balance-footer">
            <span>
              {activeAccounts.length} active account
              {activeAccounts.length === 1 ? "" : "s"}
            </span>

            {primaryAccount && (
              <span>
                Primary ••••{" "}
                {primaryAccount.accountNumber?.slice(-4) ||
                  "0000"}
              </span>
            )}
          </div>
        </article>

        {/* Accounts */}

        <article className="nb-mini-stat nb-mini-stat--purple">
          <div className="nb-mini-stat__icon">
            <Wallet size={20} />
          </div>

          <span className="nb-card-label">
            Accounts
          </span>

          <strong>
            {loading ? "—" : activeAccounts.length}
          </strong>

          <span className="nb-mini-stat__sub">
            Active accounts
          </span>

          <div className="nb-mini-wave nb-mini-wave--purple">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </article>

        {/* FD */}

        <article className="nb-mini-stat nb-mini-stat--blue">
          <div className="nb-mini-stat__icon">
            <Wallet size={20} />
          </div>

          <span className="nb-card-label">
            Fixed Deposits
          </span>

          <strong>
            {loading ? "—" : activeFds.length}
          </strong>

          <span className="nb-mini-stat__sub">
            {formatINR(totalFdMaturity)} maturity
          </span>

          <div className="nb-mini-wave nb-mini-wave--blue">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </article>

        {/* PPF */}

        <article className="nb-mini-stat nb-mini-stat--gold">
          <div className="nb-mini-stat__icon">
            <PiggyBank size={20} />
          </div>

          <span className="nb-card-label">
            PPF
          </span>

          <strong>
            {loading ? "—" : formatINR(ppfBalance)}
          </strong>

          <span className="nb-mini-stat__sub">
            {ppf?.exists
              ? "Current balance"
              : "Not opened yet"}
          </span>

          <div className="nb-mini-wave nb-mini-wave--gold">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </article>
      </section>

      {/* =====================================================
          MAIN GRID
      ====================================================== */}

      <div className="nb-dashboard__main-grid">
        <main className="nb-dashboard__main">

          {/* =================================================
              ACCOUNTS
          ================================================== */}

          <section className="nb-section">
            <div className="nb-section-head">
              <div>
                <span className="nb-section-kicker">
                  Banking
                </span>

                <h2>My Accounts</h2>
              </div>

              <Link
                to="/app/accounts"
                className="nb-view-link"
              >
                View all accounts
                <ArrowUpRight size={15} />
              </Link>
            </div>

            {loading ? (
              <div className="nb-account-grid">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="nb-account-skeleton"
                  />
                ))}
              </div>
            ) : firstThreeAccounts.length === 0 ? (
              <div className="nb-empty-card">
                <Wallet size={32} />

                <h3>No active accounts</h3>

                <p>
                  Your NexusBank accounts will appear here.
                </p>

                <Link
                  to="/app/accounts"
                  className="nb-primary-btn"
                >
                  <Plus size={16} />
                  View accounts
                </Link>
              </div>
            ) : (
              <div className="nb-account-grid">
                {firstThreeAccounts.map(
                  (account, index) => {
                    const Icon = getAccountIcon(
                      account.accountType
                    );

                    const availableBalance = Number(
                      account.availableBalancePaise ??
                        account.balancePaise ??
                        0
                    );

                    return (
                      <article
                        key={account._id}
                        className={`nb-account-card ${
                          account.isPrimary
                            ? "is-primary"
                            : ""
                        }`}
                        style={{
                          "--card-delay": `${index * 100}ms`,
                        }}
                      >
                        {account.isPrimary && (
                          <div className="nb-primary-badge">
                            PRIMARY
                          </div>
                        )}

                        <div className="nb-account-card__icon">
                          <Icon size={25} />
                        </div>

                        <div className="nb-account-card__type">
                          {account.accountType ||
                            "SAVINGS"}{" "}
                          Account
                        </div>

                        <h3>
                          {account.label ||
                            `${
                              account.accountType ||
                              "Savings"
                            } Account`}
                        </h3>

                        <div className="nb-account-number">
                          ••••{" "}
                          {account.accountNumber?.slice(
                            -4
                          ) || "0000"}
                        </div>

                        <strong className="nb-account-balance">
                          {formatINR(
                            availableBalance
                          )}
                        </strong>

                        <span className="nb-account-available">
                          Available Balance
                        </span>

                        <div className="nb-account-actions">
                          <Link
                            to="/app/transfer"
                            className="nb-small-primary"
                          >
                            <ArrowUpRight size={14} />
                            Transfer
                          </Link>

                          <Link
                            to="/app/transactions"
                            className="nb-small-link"
                          >
                            Statement
                          </Link>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* =================================================
              FINANCIAL PULSE
          ================================================== */}

          <section className="nb-lower-grid">
            <section className="nb-insight-card nb-financial-pulse">
              <div className="nb-section-head">
                <div>
                  <span className="nb-section-kicker">
                    Overview
                  </span>

                  <h2>Financial Pulse</h2>
                </div>

                <div className="nb-financial-pulse__live">
                  <span />
                  LIVE
                </div>
              </div>

              <div className="nb-financial-pulse__content">

                {/* Animated Financial Orb */}

                <div className="nb-financial-orb">
                  <div className="nb-financial-orb__ring nb-financial-orb__ring--one" />

                  <div className="nb-financial-orb__ring nb-financial-orb__ring--two" />

                  <div className="nb-financial-orb__ring nb-financial-orb__ring--three" />

                  <div className="nb-financial-orb__glow" />

                  <div className="nb-financial-orb__core">
                    <Sparkles size={17} />

                    <strong>
                      {loading
                        ? "—"
                        : activeAccounts.length}
                    </strong>

                    <span>
                      Accounts
                    </span>
                  </div>

                  <span className="nb-financial-orb__particle nb-financial-orb__particle--one" />

                  <span className="nb-financial-orb__particle nb-financial-orb__particle--two" />

                  <span className="nb-financial-orb__particle nb-financial-orb__particle--three" />
                </div>

                {/* Financial Metrics */}

                <div className="nb-financial-metrics">

                  <div className="nb-financial-total">
                    <span>
                      Total portfolio
                    </span>

                    <strong>
                      {loading
                        ? "Loading..."
                        : formatINR(totalPortfolio)}
                    </strong>

                    <small>
                      Across banking + investments
                    </small>
                  </div>

                  <div className="nb-insight-list">

                    <div className="nb-financial-metric">
                      <span className="nb-dot nb-dot--green" />

                      <span>
                        Available balance
                      </span>

                      <strong>
                        {formatINR(totalBalance)}
                      </strong>
                    </div>

                    <div className="nb-financial-metric">
                      <span className="nb-dot nb-dot--blue" />

                      <span>
                        FD investment
                      </span>

                      <strong>
                        {formatINR(totalFdPrincipal)}
                      </strong>
                    </div>

                    <div className="nb-financial-metric">
                      <span className="nb-dot nb-dot--gold" />

                      <span>
                        PPF balance
                      </span>

                      <strong>
                        {formatINR(ppfBalance)}
                      </strong>
                    </div>

                  </div>
                </div>
              </div>

              {/* Animated Portfolio Pulse */}

              <div className="nb-financial-pulse__bar">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </section>

            {/* Financial Health */}

            <section className="nb-health-card">
              <div className="nb-health-orbit">
                <div className="nb-health-ring">
                  <ShieldCheck size={27} />
                </div>
              </div>

              <span className="nb-section-kicker">
                Security
              </span>

              <h2>Financial Health</h2>

              <p>
                Your NexusBank account is protected with
                smart security and fraud monitoring.
              </p>

              <Link
                to="/app/security"
                className="nb-health-btn"
              >
                Open Security Center
                <ArrowUpRight size={13} />
              </Link>
            </section>
          </section>

          {/* =================================================
              INVESTMENTS
          ================================================== */}

          <section className="nb-investments-card">
            <div className="nb-section-head">
              <div>
                <span className="nb-section-kicker">
                  Wealth
                </span>

                <h2>Savings & Investments</h2>
              </div>

              <Link
                to="/app/fd"
                className="nb-view-link"
              >
                Manage
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="nb-investment-grid">
              <Link
                to="/app/fd"
                className="nb-investment-item nb-investment-item--fd"
              >
                <div className="nb-investment-icon">
                  <Wallet size={21} />
                </div>

                <div>
                  <span>Fixed Deposits</span>

                  <strong>
                    {formatINR(totalFdPrincipal)}
                  </strong>

                  <small>
                    {activeFds.length} active FD
                    {activeFds.length === 1
                      ? ""
                      : "s"}
                  </small>
                </div>
              </Link>

              <Link
                to="/app/ppf"
                className="nb-investment-item nb-investment-item--ppf"
              >
                <div className="nb-investment-icon">
                  <PiggyBank size={21} />
                </div>

                <div>
                  <span>PPF Account</span>

                  <strong>
                    {formatINR(ppfBalance)}
                  </strong>

                  <small>
                    {ppf?.exists
                      ? "Current balance"
                      : "Open PPF account"}
                  </small>
                </div>
              </Link>

              <div className="nb-investment-extra">
                <div>
                  <strong>
                    {activeFds.length}
                  </strong>

                  <span>Active FD</span>
                </div>

                <div>
                  <strong>
                    {formatINR(totalFdMaturity)}
                  </strong>

                  <span>Maturity Amount</span>
                </div>

                <div>
                  <strong>
                    {formatINR(ppfThisYear)}
                  </strong>

                  <span>This FY Deposit</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* =================================================
            RIGHT SIDEBAR
        ================================================== */}

        <aside className="nb-dashboard__side">

          {/* Quick Actions */}

          <section className="nb-quick-card">
            <div className="nb-section-head">
              <div>
                <span className="nb-section-kicker">
                  Shortcuts
                </span>

                <h2>Quick Actions</h2>
              </div>

              <Zap size={18} />
            </div>

            <div className="nb-quick-grid">
              <Link
                to="/app/transfer"
                className="nb-quick-action nb-quick-action--green"
              >
                <div>
                  <ArrowUpRight size={22} />
                </div>

                <span>Transfer</span>
                <small>Money</small>
              </Link>

              <Link
                to="/app/beneficiaries"
                className="nb-quick-action nb-quick-action--blue"
              >
                <div>
                  <Plus size={22} />
                </div>

                <span>Add</span>
                <small>Beneficiary</small>
              </Link>

              <Link
                to="/app/transactions"
                className="nb-quick-action nb-quick-action--purple"
              >
                <div>
                  <FileText size={22} />
                </div>

                <span>View</span>
                <small>Transactions</small>
              </Link>

              <Link
                to="/app/accounts"
                className="nb-quick-action nb-quick-action--gold"
              >
                <div>
                  <Copy size={22} />
                </div>

                <span>Account</span>
                <small>Details</small>
              </Link>
            </div>
          </section>

          {/* =================================================
              RECENT ACTIVITY
          ================================================== */}

          <section className="nb-activity-card">
            <div className="nb-section-head">
              <div>
                <span className="nb-section-kicker">
                  Activity
                </span>

                <h2>Recent Activity</h2>
              </div>

              <Link
                to="/app/alerts"
                className="nb-view-link"
              >
                View all
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="nb-activity-list">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="nb-activity-item nb-activity-skeleton"
                  >
                    <div className="nb-activity-icon" />

                    <div className="nb-activity-info">
                      <strong>
                        Loading activity...
                      </strong>

                      <p>
                        Please wait
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="nb-no-activity">
                <div>
                  <Bell size={20} />
                </div>

                <strong>
                  Nothing new yet
                </strong>

                <p>
                  Your recent banking alerts will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="nb-activity-list">
                {notifications
                  .slice(0, 5)
                  .map((notification) => {
                    const className =
                      getNotificationClass(
                        notification.priority
                      );

                    const Icon =
                      getNotificationIcon(
                        notification.type,
                        notification.priority
                      );

                    return (
                      <div
                        key={notification._id}
                        className="nb-activity-item"
                      >
                        <div
                          className={`nb-activity-icon nb-activity-icon--${className}`}
                        >
                          <Icon size={16} />
                        </div>

                        <div className="nb-activity-info">
                          <strong>
                            {notification.title ||
                              "Banking notification"}
                          </strong>

                          <p>
                            {notification.body ||
                              notification.message ||
                              "You have a new NexusBank update."}
                          </p>

                          <small>
                            {notification.createdAt
                              ? new Date(
                                  notification.createdAt
                                ).toLocaleString(
                                  "en-IN",
                                  {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }
                                )
                              : "Recently"}
                          </small>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* =================================================
              SECURITY CARD
          ================================================== */}

          <section className="nb-security-card">
            <div className="nb-security-glow" />

            <div className="nb-security-icon">
              <ShieldCheck size={27} />
            </div>

            <span className="nb-section-kicker">
              NexusBank Protection
            </span>

            <h2>
              Smart security is watching your account.
            </h2>

            <p>
              Fraud detection, transaction monitoring and
              security alerts work together to protect
              your banking activity.
            </p>

            <Link
              to="/app/security"
              className="nb-security-link"
            >
              Review security
              <ArrowUpRight size={13} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}