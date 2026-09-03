import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PiggyBank,
  Plus,
  Info,
  X,
  Send,
  ShieldCheck,
  CalendarDays,
  TrendingUp,
  LockKeyhole,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

import { useApi } from "../../hooks/useApi.js";
import { useToast } from "../../hooks/useToast.js";
import { accountService } from "../../services/accountService.js";
import { ppfService } from "../../services/ppfService.js";

import { Card, CardHeader } from "../../components/common/Card.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Input } from "../../components/common/Input.jsx";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";

import { formatPaise, rupeesToPaise } from "../../utils/money.js";
import { formatDateTime } from "../../utils/date.js";

import "./PpfPage.css";

const ease = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease,
    },
  },
};

export function PpfPage() {
  const summary = useApi(() => ppfService.summary(), []);
  const contributions = useApi(() => ppfService.contributions(), []);
  const accounts = useApi(() => accountService.list(), []);

  const [contributeOpen, setContributeOpen] = useState(false);
  const [openingBusy, setOpeningBusy] = useState(false);

  const toast = useToast();

  const refresh = () => {
    summary.refetch();
    contributions.refetch();
    accounts.refetch();
  };

  const openPpf = async () => {
    setOpeningBusy(true);

    try {
      await ppfService.open();
      toast.success("PPF account opened.");
      refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setOpeningBusy(false);
    }
  };

  if (summary.error) {
    return (
      <ErrorState
        description={summary.error.message}
        onRetry={summary.refetch}
      />
    );
  }

  const s = summary.data;
  const ppf = s?.ppf;
  const cfg = s?.config;

  const annualLimit = cfg?.annualLimitPaise || 15000000;
  const contributed = s?.contributedThisYearPaise || 0;

  const contributionPercent = Math.min(
    100,
    Math.max(0, (contributed / annualLimit) * 100)
  );

  const remainingPercent = Math.max(0, 100 - contributionPercent);

  const maturityProgress = useMemo(() => {
    if (!ppf?.openedAt || !ppf?.maturityDate) return 0;

    const start = new Date(ppf.openedAt).getTime();
    const end = new Date(ppf.maturityDate).getTime();
    const now = Date.now();

    if (!start || !end || end <= start) return 0;

    return Math.min(
      100,
      Math.max(0, ((now - start) / (end - start)) * 100)
    );
  }, [ppf?.openedAt, ppf?.maturityDate]);

  return (
    <motion.div
      className="ppf stack stack-6"
      data-testid="ppf-page"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* HERO */}
      <motion.header className="ppf__hero" variants={itemVariants}>
        <div className="ppf__hero-copy">
          <div className="ppf__hero-badge">
            <span className="ppf__live-dot" />
            LONG-TERM SAVINGS
          </div>

          <h1>
            Public Provident
            <span> Fund</span>
          </h1>

          <p className="muted">
            A NexusBank simulation of a 15-year locked-in savings account
            with compounding interest.
          </p>

          <div className="ppf__demo-note">
            <Info size={14} />
            <span>
              Portfolio demo — not a real Government of India PPF.
            </span>
          </div>
        </div>

        {s?.exists ? (
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button
              onClick={() => setContributeOpen(true)}
              data-testid="ppf-contribute-button"
            >
              <Plus size={16} />
              Contribute
              <ArrowUpRight size={15} />
            </Button>
          </motion.div>
        ) : null}
      </motion.header>

      {/* LOADING */}
      {summary.loading && (
        <motion.div variants={itemVariants}>
          <Skeleton height={300} radius={24} />
        </motion.div>
      )}

      {/* NO PPF */}
      {!summary.loading && !s?.exists && (
        <motion.div variants={itemVariants}>
          <Card>
            <div className="ppf__open-card">
              <div className="ppf__open-icon">
                <PiggyBank size={32} />
              </div>

              <div className="ppf__open-content">
                <span className="eyebrow">Start building</span>

                <h2>Open your PPF account</h2>

                <p className="muted">
                  Contribute up to ₹
                  {(cfg?.annualLimitPaise || 0) / 100 || 150000}
                  {" "}per financial year. Interest{" "}
                  {cfg?.interestRate || 7.1}% p.a. with a 15-year
                  maturity period.
                </p>
              </div>

              <Button
                onClick={openPpf}
                loading={openingBusy}
                data-testid="ppf-open-button"
              >
                Open PPF
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ACTIVE PPF */}
      {!summary.loading && s?.exists && (
        <>
          {/* MAIN BALANCE */}
          <motion.section
            className="ppf__balance-card"
            variants={itemVariants}
          >
            <div className="ppf__balance-glow ppf__balance-glow--one" />
            <div className="ppf__balance-glow ppf__balance-glow--two" />

            <div className="ppf__balance-top">
              <div>
                <div className="ppf__balance-label">
                  <span>PPF BALANCE</span>

                  <span className="ppf__secure-badge">
                    <ShieldCheck size={13} />
                    ACTIVE
                  </span>
                </div>

                <motion.div
                  className="ppf__balance-value"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.15 }}
                >
                  {formatPaise(ppf.balancePaise)}
                </motion.div>

                <div className="ppf__balance-sub">
                  <TrendingUp size={14} />
                  Growing with {ppf.interestRate}% annual interest
                </div>
              </div>

              <motion.div
                className="ppf__coin"
                animate={{
                  y: [0, -7, 0],
                  rotate: [0, 2, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <PiggyBank size={34} />
              </motion.div>
            </div>

            <div className="ppf__balance-footer">
              <div className="ppf__mini-stat">
                <span>Total contributed</span>
                <strong>
                  {formatPaise(ppf.totalContributedPaise)}
                </strong>
              </div>

              <div className="ppf__mini-divider" />

              <div className="ppf__mini-stat">
                <span>Interest earned</span>
                <strong className="is-green">
                  {formatPaise(ppf.totalInterestPaise)}
                </strong>
              </div>

              <div className="ppf__mini-divider" />

              <div className="ppf__mini-stat">
                <span>Interest rate</span>
                <strong>{ppf.interestRate}% p.a.</strong>
              </div>
            </div>
          </motion.section>

          {/* STATS */}
          <motion.div
            className="ppf__stats-grid"
            variants={containerVariants}
          >
            <motion.div
              className="ppf__stat ppf__stat--green"
              variants={itemVariants}
              whileHover={{ y: -5 }}
            >
              <div className="ppf__stat-icon">
                <PiggyBank size={18} />
              </div>

              <span className="eyebrow">Total contributed</span>

              <strong>
                {formatPaise(ppf.totalContributedPaise)}
              </strong>

              <span className="subtle">
                Principal invested
              </span>
            </motion.div>

            <motion.div
              className="ppf__stat ppf__stat--purple"
              variants={itemVariants}
              whileHover={{ y: -5 }}
            >
              <div className="ppf__stat-icon">
                <TrendingUp size={18} />
              </div>

              <span className="eyebrow">Interest earned</span>

              <strong>
                {formatPaise(ppf.totalInterestPaise)}
              </strong>

              <span className="subtle">
                Compounding growth
              </span>
            </motion.div>

            <motion.div
              className="ppf__stat ppf__stat--blue"
              variants={itemVariants}
              whileHover={{ y: -5 }}
            >
              <div className="ppf__stat-icon">
                <CalendarDays size={18} />
              </div>

              <span className="eyebrow">Maturity</span>

              <strong className="ppf__stat-date">
                {ppf.maturityDate
                  ? new Date(ppf.maturityDate).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )
                  : "—"}
              </strong>

              <span className="subtle">
                Long-term wealth goal
              </span>
            </motion.div>

            <motion.div
              className="ppf__stat ppf__stat--orange"
              variants={itemVariants}
              whileHover={{ y: -5 }}
            >
              <div className="ppf__stat-icon">
                <LockKeyhole size={18} />
              </div>

              <span className="eyebrow">This year</span>

              <strong>
                {formatPaise(contributed)}
              </strong>

              <span className="subtle">
                {formatPaise(s.remainingThisYearPaise)} remaining
              </span>
            </motion.div>
          </motion.div>

          {/* YEARLY CONTRIBUTION PROGRESS */}
          <motion.section
            className="ppf__progress-card"
            variants={itemVariants}
          >
            <div className="ppf__section-heading">
              <div>
                <span className="eyebrow">
                  Financial year {s.financialYear}
                </span>

                <h2>Annual contribution</h2>
              </div>

              <div className="ppf__progress-percent">
                {Math.round(contributionPercent)}%
              </div>
            </div>

            <div className="ppf__progress-track">
              <motion.div
                className="ppf__progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${contributionPercent}%` }}
                transition={{
                  duration: 1.2,
                  delay: 0.25,
                  ease,
                }}
              >
                <span className="ppf__progress-shine" />
              </motion.div>
            </div>

            <div className="ppf__progress-meta">
              <span>
                <strong>{formatPaise(contributed)}</strong> contributed
              </span>

              <span>
                {Math.round(remainingPercent)}% capacity remaining
              </span>

              <span>
                Limit: <strong>{formatPaise(annualLimit)}</strong>
              </span>
            </div>
          </motion.section>

          {/* MATURITY + ACCOUNT */}
          <div className="ppf__main-grid">
            <motion.section variants={itemVariants}>
              <Card>
                <div className="ppf__card-heading">
                  <div className="ppf__heading-icon ppf__heading-icon--green">
                    <ShieldCheck size={18} />
                  </div>

                  <div>
                    <span className="eyebrow">Certificate</span>
                    <h2>PPF account details</h2>
                  </div>
                </div>

                <dl className="ppf__meta">
                  <Row
                    k="PPF number"
                    v={ppf.accountNumber}
                    mono
                  />

                  <Row
                    k="Interest rate"
                    v={`${ppf.interestRate}% p.a.`}
                  />

                  <Row
                    k="Opened"
                    v={formatDateTime(ppf.openedAt)}
                  />

                  <Row
                    k="Maturity"
                    v={formatDateTime(ppf.maturityDate)}
                  />

                  <Row
                    k="Status"
                    v={ppf.status}
                    status
                  />

                  <Row
                    k="Financial year"
                    v={s.financialYear}
                  />

                  <Row
                    k="Remaining this year"
                    v={formatPaise(
                      s.remainingThisYearPaise
                    )}
                  />
                </dl>
              </Card>
            </motion.section>

            <motion.section
              className="ppf__timeline-card"
              variants={itemVariants}
            >
              <div className="ppf__card-heading">
                <div className="ppf__heading-icon ppf__heading-icon--blue">
                  <CalendarDays size={18} />
                </div>

                <div>
                  <span className="eyebrow">Long-term goal</span>
                  <h2>15-year journey</h2>
                </div>
              </div>

              <div className="ppf__timeline">
                <div className="ppf__timeline-line">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{
                      height: `${Math.max(
                        8,
                        maturityProgress
                      )}%`,
                    }}
                    transition={{
                      duration: 1.1,
                      delay: 0.3,
                    }}
                  />
                </div>

                <div className="ppf__timeline-item is-complete">
                  <div className="ppf__timeline-dot">
                    <ShieldCheck size={12} />
                  </div>

                  <div>
                    <strong>Account opened</strong>
                    <span>
                      {formatDateTime(ppf.openedAt)}
                    </span>
                  </div>
                </div>

                <div className="ppf__timeline-item is-active">
                  <div className="ppf__timeline-dot">
                    <TrendingUp size={12} />
                  </div>

                  <div>
                    <strong>Growing your savings</strong>
                    <span>
                      {maturityProgress < 100
                        ? `${Math.round(
                            maturityProgress
                          )}% of timeline elapsed`
                        : "Maturity reached"}
                    </span>
                  </div>
                </div>

                <div className="ppf__timeline-item">
                  <div className="ppf__timeline-dot">
                    <LockKeyhole size={12} />
                  </div>

                  <div>
                    <strong>Maturity</strong>
                    <span>
                      {formatDateTime(ppf.maturityDate)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          {/* CONTRIBUTIONS */}
          <motion.section variants={itemVariants}>
            <Card>
              <div className="ppf__history-header">
                <div className="ppf__card-heading">
                  <div className="ppf__heading-icon ppf__heading-icon--purple">
                    <TrendingUp size={18} />
                  </div>

                  <div>
                    <span className="eyebrow">Activity</span>
                    <h2>Contribution history</h2>
                  </div>
                </div>

                <div className="ppf__history-count">
                  {(contributions.data || []).length} entries
                </div>
              </div>

              {contributions.loading ? (
                <Skeleton height={150} radius={14} />
              ) : (contributions.data || []).length === 0 ? (
                <EmptyState
                  icon={PiggyBank}
                  title="No contributions yet"
                  description="Add your first contribution to start growing your PPF."
                />
              ) : (
                <motion.div
                  className="ppf__contribs"
                  data-testid="ppf-contributions"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {(contributions.data || []).map((c, index) => (
                    <motion.div
                      key={c._id}
                      className="ppf__contrib"
                      variants={itemVariants}
                    >
                      <div className="ppf__contrib-left">
                        <div className="ppf__contrib-number">
                          {index + 1}
                        </div>

                        <div className="stack" style={{ gap: 3 }}>
                          <strong>
                            {formatPaise(c.amountPaise)}
                          </strong>

                          <span className="subtle">
                            {formatDateTime(c.createdAt)}
                            {" · "}
                            FY {c.financialYear}
                            {c.note ? ` · ${c.note}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="ppf__contrib-right">
                        <span className="subtle">
                          Balance after contribution
                        </span>

                        <strong>
                          {formatPaise(c.balanceAfterPaise)}
                        </strong>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </Card>
          </motion.section>
        </>
      )}

      {contributeOpen && s?.exists && (
        <ContributeModal
          onClose={() => setContributeOpen(false)}
          onDone={() => {
            setContributeOpen(false);
            refresh();
          }}
          accounts={accounts.data || []}
          config={cfg}
          remainingThisYearPaise={s.remainingThisYearPaise}
        />
      )}
    </motion.div>
  );
}

const Row = ({ k, v, mono, status }) => (
  <div className="ppf__meta-row">
    <dt>{k}</dt>

    <dd
      className={`${mono ? "mono" : ""} ${
        status ? "ppf__status-value" : ""
      }`}
    >
      {status && <ShieldCheck size={13} />}
      {v}
    </dd>
  </div>
);

function ContributeModal({
  onClose,
  onDone,
  accounts,
  config,
  remainingThisYearPaise,
}) {
  const [sourceAccountId, setSourceAccountId] = useState(
    (accounts.find((a) => a.isPrimary) || accounts[0])?._id ||
      ""
  );

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const toast = useToast();

  const submit = async (event) => {
    event.preventDefault();
    setError(null);

    const paise = rupeesToPaise(amount);

    if (!paise || paise <= 0) {
      return setError("Enter a positive amount.");
    }

    if (
      paise <
      (config?.minContributionPaise || 50000)
    ) {
      return setError(
        `Minimum contribution is ${formatPaise(
          config?.minContributionPaise || 50000
        )}.`
      );
    }

    if (paise > remainingThisYearPaise) {
      return setError(
        `Only ${formatPaise(
          remainingThisYearPaise
        )} remaining in this financial year.`
      );
    }

    setBusy(true);

    try {
      const { message } = await ppfService.contribute({
        sourceAccountId:
          sourceAccountId || undefined,
        amountPaise: paise,
        note: note || undefined,
      });

      toast.success(
        message || "Contribution recorded."
      );

      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="ppf__modal-backdrop"
      onClick={onClose}
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.form
        className="ppf__modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        data-testid="ppf-contribute-modal"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease }}
      >
        <div className="ppf__modal-glow" />

        <button
          type="button"
          className="ppf__modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="ppf__modal-icon">
          <Sparkles size={22} />
        </div>

        <header className="stack stack-2">
          <span className="eyebrow">New contribution</span>

          <h2>Add to your PPF</h2>

          <p className="muted">
            You can still contribute{" "}
            <strong>
              {formatPaise(remainingThisYearPaise)}
            </strong>{" "}
            this financial year.
          </p>
        </header>

        <div className="ppf__modal-limit">
          <div>
            <span>Available contribution room</span>
            <strong>
              {formatPaise(remainingThisYearPaise)}
            </strong>
          </div>

          <LockKeyhole size={18} />
        </div>

        <div className="stack stack-4">
          <label className="stack" style={{ gap: 6 }}>
            <span className="field__label">
              From account
            </span>

            <select
              value={sourceAccountId}
              onChange={(e) =>
                setSourceAccountId(e.target.value)
              }
              className="ppf__select"
              data-testid="ppf-source-account"
            >
              {accounts.map((a) => (
                <option
                  key={a._id}
                  value={a._id}
                  disabled={a.status !== "ACTIVE"}
                >
                  {a.label || a.accountType} ·{" "}
                  {formatPaise(
                    a.availableBalancePaise
                  )}
                  {a.isPrimary ? " · Primary" : ""}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Amount (₹)"
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            hint={`Minimum ${formatPaise(
              config?.minContributionPaise || 50000
            )}`}
            data-testid="ppf-amount"
          />

          <Input
            label="Note (optional)"
            placeholder="e.g. Yearly deposit"
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
            data-testid="ppf-note"
          />

          {error && (
            <motion.div
              className="ppf__error"
              role="alert"
              data-testid="ppf-error"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {error}
            </motion.div>
          )}

          <div className="row-flex gap-2 ppf__modal-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={busy}
              icon={Send}
              data-testid="ppf-submit-contribution"
            >
              Contribute
            </Button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}