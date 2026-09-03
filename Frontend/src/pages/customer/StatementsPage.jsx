import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
  ArrowUpDown,
  Clock3,
  AlertTriangle,
} from "lucide-react";

import { apiClient } from "../../services/apiClient.js";
import { downloadAuthenticatedFile } from "../../services/notificationsApi.js";

import {
  applyFiltersAndSearch,
  classifyEntry,
  CATEGORY_META,
  FILTER_CHIPS,
} from "../../services/statementsService.js";

import SmartFilters from "../../components/statements/SmartFilters.jsx";
import CategoryInsights from "../../components/statements/CategoryInsights.jsx";
import ShareStatementModal from "../../components/statements/ShareStatementModal.jsx";

import "./StatementsPage.css";

/* =========================================================
   Formatting helpers
========================================================= */

function formatINR(paise) {
  if (typeof paise !== "number" || !Number.isFinite(paise)) {
    return "₹0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function formatCompactINR(paise) {
  if (!Number.isFinite(paise)) return "₹0";

  const rupees = Math.abs(paise) / 100;

  if (rupees >= 10000000) {
    return `₹${(rupees / 10000000).toFixed(1)}Cr`;
  }

  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(1)}L`;
  }

  if (rupees >= 1000) {
    return `₹${(rupees / 1000).toFixed(1)}K`;
  }

  return formatINR(paise);
}

function maskAccount(number = "") {
  if (!number) return "•••• 0000";
  return `•••• ${String(number).slice(-4)}`;
}

function labelForAccountType(type) {
  return (
    {
      SAVINGS: "Savings Account",
      CURRENT: "Current Account",
    }[type] ||
    type ||
    "Account"
  );
}

function getEntryDate(entry) {
  const date = new Date(entry?.createdAt);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatus(entry) {
  return (
    entry?.transaction?.status ||
    entry?.status ||
    "COMPLETED"
  ).toUpperCase();
}

function getRisk(entry) {
  return (
    entry?.transaction?.riskLevel ||
    entry?.riskLevel ||
    "LOW"
  ).toUpperCase();
}

function getTransactionDescription(entry) {
  const tx = entry?.transaction || {};

  return (
    entry?.description ||
    tx.description ||
    entry?.reference?.kind ||
    "Transaction"
  );
}

/* =========================================================
   Animated number
========================================================= */

function AnimatedNumber({
  value,
  formatter = null,
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const start = display;
    const delta = target - start;

    if (Math.abs(delta) < 1) {
      setDisplay(target);
      return undefined;
    }

    const duration = 650;
    const startTime = performance.now();

    let frame;

    const tick = (time) => {
      const progress = Math.min(
        (time - startTime) / duration,
        1
      );

      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(
        start + delta * eased
      );

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };

    // Intentionally depends only on target value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (formatter) {
    return <span>{formatter(display)}</span>;
  }

  return (
    <span>
      {new Intl.NumberFormat("en-IN").format(
        Math.round(display)
      )}
    </span>
  );
}

/* =========================================================
   Motion presets
========================================================= */

const pageMotion = {
  initial: {
    opacity: 0,
  },

  animate: {
    opacity: 1,
  },

  transition: {
    duration: 0.35,
  },
};

const sectionMotion = {
  initial: {
    opacity: 0,
    y: 18,
  },

  animate: {
    opacity: 1,
    y: 0,
  },

  transition: {
    duration: 0.42,
    ease: "easeOut",
  },
};

const staggerMotion = {
  animate: {
    transition: {
      staggerChildren: 0.055,
    },
  },
};

const itemMotion = {
  initial: {
    opacity: 0,
    y: 12,
  },

  animate: {
    opacity: 1,
    y: 0,
  },
};

/* =========================================================
   Main page
========================================================= */

export default function StatementsPage() {
  const [params, setParams] = useSearchParams();

  const initialAccountId =
    params.get("accountId") || "";

  /* -------------------------------------------------------
     Account state
  ------------------------------------------------------- */

  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] =
    useState(initialAccountId);

  /* -------------------------------------------------------
     Filter state
  ------------------------------------------------------- */

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [chips, setChips] = useState([]);
  const [search, setSearch] = useState("");

  /* -------------------------------------------------------
     Data state
  ------------------------------------------------------- */

  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState(null);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(null);

  const [error, setError] = useState("");

  /* -------------------------------------------------------
     UI state
  ------------------------------------------------------- */

  const [expandedId, setExpandedId] =
    useState(null);

  const [shareOpen, setShareOpen] =
    useState(false);

  const [showInsights, setShowInsights] =
    useState(true);

  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });

  /* =======================================================
     Load accounts
  ======================================================= */

  const loadAccounts = useCallback(async () => {
    try {
      setError("");

      const { data } =
        await apiClient.get("/accounts");

      const list = Array.isArray(data?.data)
        ? data.data
        : data?.data?.items || [];

      setAccounts(list);

      if (!list.length) {
        setAccountId("");
        return;
      }

      const requestedExists = list.some(
        (account) =>
          String(account._id) ===
          String(initialAccountId)
      );

      if (requestedExists) {
        setAccountId(initialAccountId);
        return;
      }

      const primary =
        list.find(
          (account) => account.isPrimary
        ) || list[0];

      setAccountId(primary._id);

      setParams(
        {
          accountId: primary._id,
        },
        {
          replace: true,
        }
      );
    } catch {
      setError(
        "Could not load your accounts."
      );
    }
  }, [
    initialAccountId,
    setParams,
  ]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  /* =======================================================
     Query
  ======================================================= */

  const query = useMemo(() => {
    const q = {};

    if (from) {
      q.from = from;
    }

    if (to) {
      q.to = to;
    }

    return q;
  }, [from, to]);

  /* =======================================================
     Load statement
  ======================================================= */

  const loadStatement = useCallback(
    async ({
      silent = false,
    } = {}) => {
      if (!accountId) return;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setExpandedId(null);

      try {
        const { data } =
          await apiClient.get(
            `/statements/${accountId}`,
            {
              params: {
                ...query,
                limit: 200,
              },
            }
          );

        setEntries(
          data?.data?.items || []
        );

        setMeta(
          data?.data || null
        );
      } catch {
        setEntries([]);
        setMeta(null);

        setError(
          "Could not load statement data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accountId, query]
  );

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  /* =======================================================
     Filtering
  ======================================================= */

  const filteredEntries = useMemo(
    () =>
      applyFiltersAndSearch(entries, {
        chips,
        search,
      }),
    [
      entries,
      chips,
      search,
    ]
  );

  /* =======================================================
     Selected account
  ======================================================= */

  const selected = useMemo(
    () =>
      accounts.find(
        (account) =>
          String(account._id) ===
          String(accountId)
      ),
    [
      accounts,
      accountId,
    ]
  );

  /* =======================================================
     Sort transactions
  ======================================================= */

  const sortedEntries = useMemo(() => {
    const list = [...filteredEntries];

    const direction =
      sortConfig.direction === "asc"
        ? 1
        : -1;

    list.sort((a, b) => {
      switch (sortConfig.key) {
        case "amount": {
          const amountA =
            Number(a?.amountPaise) || 0;

          const amountB =
            Number(b?.amountPaise) || 0;

          return (
            (amountA - amountB) *
            direction
          );
        }

        case "balance": {
          const balanceA =
            Number(
              a?.balanceAfterPaise
            ) || 0;

          const balanceB =
            Number(
              b?.balanceAfterPaise
            ) || 0;

          return (
            (balanceA - balanceB) *
            direction
          );
        }

        case "description": {
          const aText =
            getTransactionDescription(
              a
            ).toLowerCase();

          const bText =
            getTransactionDescription(
              b
            ).toLowerCase();

          return (
            aText.localeCompare(
              bText
            ) * direction
          );
        }

        case "date":
        default: {
          const dateA =
            new Date(
              a?.createdAt
            ).getTime() || 0;

          const dateB =
            new Date(
              b?.createdAt
            ).getTime() || 0;

          return (
            (dateA - dateB) *
            direction
          );
        }
      }
    });

    return list;
  }, [
    filteredEntries,
    sortConfig,
  ]);

  /* =======================================================
     Summary
  ======================================================= */

  const summary = useMemo(() => {
    const result = {
      credit: 0,
      debit: 0,
      count: filteredEntries.length,

      largestDebit: null,
      largestCredit: null,

      categorySpend: {},

      risk: {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
      },

      status: {
        COMPLETED: 0,
        PENDING: 0,
        FAILED: 0,
        BLOCKED: 0,
      },
    };

    for (const entry of filteredEntries) {
      const amount =
        Number(entry?.amountPaise) || 0;

      const isCredit =
        entry?.direction === "CREDIT";

      if (isCredit) {
        result.credit += amount;

        if (
          !result.largestCredit ||
          amount >
            result.largestCredit.amountPaise
        ) {
          result.largestCredit =
            entry;
        }
      } else {
        result.debit += amount;

        if (
          !result.largestDebit ||
          amount >
            result.largestDebit.amountPaise
        ) {
          result.largestDebit =
            entry;
        }

        const category =
          classifyEntry(entry);

        result.categorySpend[
          category
        ] =
          (result.categorySpend[
            category
          ] || 0) + amount;
      }

      const risk =
        getRisk(entry);

      if (
        result.risk[risk] !== undefined
      ) {
        result.risk[risk] += 1;
      }

      const status =
        getStatus(entry);

      if (
        result.status[status] !==
        undefined
      ) {
        result.status[status] += 1;
      }
    }

    return result;
  }, [filteredEntries]);

  /* =======================================================
     Smart insight
  ======================================================= */

  const insight = useMemo(() => {
    const categories =
      Object.entries(
        summary.categorySpend
      ).sort(
        (a, b) => b[1] - a[1]
      );

    const [
      topCategory,
      topAmount,
    ] =
      categories[0] || [
        "Other",
        0,
      ];

    const spend =
      summary.debit;

    const net =
      summary.credit -
      summary.debit;

    const average =
      summary.count > 0
        ? Math.round(
            (summary.credit +
              summary.debit) /
              summary.count
          )
        : 0;

    const topPct =
      spend > 0
        ? Math.round(
            (topAmount /
              spend) *
              100
          )
        : 0;

    return {
      topCategory,
      topAmount,
      topPct,
      spend,
      net,
      average,
      highRisk:
        summary.risk.HIGH,
      pending:
        summary.status.PENDING,
      failed:
        summary.status.FAILED +
        summary.status.BLOCKED,
    };
  }, [summary]);

  /* =======================================================
     Account label
  ======================================================= */

  const accountLabel = selected
    ? `${labelForAccountType(
        selected.accountType
      )} · ${maskAccount(
        selected.accountNumber
      )}`
    : "";

  /* =======================================================
     Account change
  ======================================================= */

  const onAccountChange = (
    id
  ) => {
    setAccountId(id);

    setParams(
      {
        accountId: id,
      },
      {
        replace: true,
      }
    );

    setChips([]);
    setSearch("");
    setFrom("");
    setTo("");

    setSortConfig({
      key: "date",
      direction: "desc",
    });
  };

  /* =======================================================
     Filters
  ======================================================= */

  const clearAllFilters =
    useCallback(() => {
      setChips([]);
      setSearch("");
      setFrom("");
      setTo("");
    }, []);

  const resetDates = () => {
    setFrom("");
    setTo("");
  };

  const toggleChip = useCallback(
    (chip) => {
      setChips((previous) => {
        const active =
          new Set(previous);

        if (
          chip.group === "time"
        ) {
          FILTER_CHIPS
            .filter(
              (item) =>
                item.group ===
                "time"
            )
            .forEach((item) =>
              active.delete(
                item.id
              )
            );

          if (
            !previous.includes(
              chip.id
            )
          ) {
            active.add(chip.id);
          }
        } else if (
          active.has(chip.id)
        ) {
          active.delete(
            chip.id
          );
        } else {
          active.add(
            chip.id
          );
        }

        return Array.from(
          active
        );
      });
    },
    []
  );

  const activeFilterCount =
    chips.length +
    (search.trim()
      ? 1
      : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  /* =======================================================
     Sorting
  ======================================================= */

  const changeSort = (
    key
  ) => {
    setSortConfig(
      (previous) => {
        if (
          previous.key !== key
        ) {
          return {
            key,
            direction:
              key === "amount"
                ? "desc"
                : "desc",
          };
        }

        return {
          key,
          direction:
            previous.direction ===
            "asc"
              ? "desc"
              : "asc",
        };
      }
    );
  };

  /* =======================================================
     Export
  ======================================================= */

  const download = async (
    kind
  ) => {
    if (!accountId) return;

    try {
      setExporting(kind);
      setError("");

      const qs =
        new URLSearchParams(
          query
        ).toString();

      const path =
        `/statements/${accountId}/export.${kind}` +
        (qs
          ? `?${qs}`
          : "");

      const acctSlug =
        selected?.accountNumber?.slice(
          -4
        ) ||
        "account";

      await downloadAuthenticatedFile(
        path,
        `nexusbank-statement-${acctSlug}.${kind}`
      );
    } catch {
      setError(
        `Could not download ${kind.toUpperCase()} statement.`
      );
    } finally {
      setExporting(null);
    }
  };

  /* =======================================================
     Status helper
  ======================================================= */

  const statusClass = (
    status
  ) => {
    switch (
      String(status).toUpperCase()
    ) {
      case "COMPLETED":
        return "completed";

      case "PENDING":
        return "pending";

      case "FAILED":
        return "failed";

      case "BLOCKED":
        return "blocked";

      default:
        return "neutral";
    }
  };

  /* =======================================================
     Render
  ======================================================= */

  return (
    <motion.div
      className="stmt-page"
      data-testid="statements-page"
      {...pageMotion}
    >
      {/* =================================================
          HERO
      ================================================= */}

      <motion.header
        className="stmt-hero"
        variants={sectionMotion}
        initial="initial"
        animate="animate"
      >
        <div className="stmt-hero__orb stmt-hero__orb--one" />
        <div className="stmt-hero__orb stmt-hero__orb--two" />

        <div className="stmt-hero__content">
          <div className="stmt-hero__eyebrow">
            <span className="stmt-live-dot" />

            <span>
              Personal banking · Financial overview
            </span>
          </div>

          <div className="stmt-title-row">
            <div>
              <h1 className="stmt-title">
                Statements
              </h1>

              <p className="stmt-subtitle">
                Your complete financial story —
                transactions, spending patterns,
                risk signals and account activity
                in one intelligent workspace.
              </p>
            </div>

            <motion.button
              type="button"
              className="stmt-refresh-btn"
              onClick={() =>
                loadStatement({
                  silent: true,
                })
              }
              disabled={
                !accountId ||
                loading ||
                refreshing
              }
              whileHover={{
                scale: 1.04,
              }}
              whileTap={{
                scale: 0.95,
              }}
              title="Refresh statement"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "stmt-refresh-spin"
                    : ""
                }
              />

              <span>
                {refreshing
                  ? "Refreshing"
                  : "Refresh"}
              </span>
            </motion.button>
          </div>

          {selected && (
            <motion.div
              className="stmt-account-pill"
              initial={{
                opacity: 0,
                x: -8,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.2,
              }}
            >
              <WalletCards
                size={16}
              />

              <span>
                {labelForAccountType(
                  selected.accountType
                )}{" "}
                {maskAccount(
                  selected.accountNumber
                )}
              </span>

              {selected.isPrimary && (
                <span className="stmt-primary-badge">
                  Primary
                </span>
              )}

              <span className="stmt-account-status">
                <span />
                Active
              </span>
            </motion.div>
          )}
        </div>

        <div className="stmt-header__actions">
          <motion.button
            type="button"
            className="stmt-btn stmt-btn--ghost"
            disabled={
              !accountId ||
              exporting !== null
            }
            onClick={() =>
              download("csv")
            }
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.97,
            }}
          >
            <Download size={16} />

            {exporting === "csv"
              ? "Preparing…"
              : "CSV"}
          </motion.button>

          <motion.button
            type="button"
            className="stmt-btn stmt-btn--ghost"
            disabled={
              !accountId ||
              exporting !== null
            }
            onClick={() =>
              download("pdf")
            }
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.97,
            }}
          >
            <FileText size={16} />

            {exporting === "pdf"
              ? "Preparing…"
              : "PDF"}
          </motion.button>

          <motion.button
            type="button"
            className="stmt-btn stmt-btn--primary"
            disabled={!accountId}
            onClick={() =>
              setShareOpen(true)
            }
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.97,
            }}
          >
            <Share2 size={16} />

            Share statement
          </motion.button>
        </div>
      </motion.header>

      {/* =================================================
          FILTERS
      ================================================= */}

      <motion.section
        className="stmt-card stmt-filters"
        variants={sectionMotion}
        initial="initial"
        animate="animate"
      >
        <div className="stmt-filter-heading">
          <div>
            <span className="stmt-section-kicker">
              Explore your money
            </span>

            <h2>
              Find exactly what you need
            </h2>
          </div>

          {activeFilterCount >
            0 && (
            <motion.button
              type="button"
              className="stmt-clear-all"
              onClick={
                clearAllFilters
              }
              initial={{
                opacity: 0,
                scale: 0.9,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              whileTap={{
                scale: 0.95,
              }}
            >
              <X size={13} />

              Clear{" "}
              {
                activeFilterCount
              }
            </motion.button>
          )}
        </div>

        <div className="stmt-filter-grid">
          {/* Account */}

          <label className="stmt-field">
            <span>
              Account
            </span>

            <div className="stmt-input-icon">
              <CreditCard
                size={16}
              />

              <select
                value={
                  accountId
                }
                onChange={(
                  event
                ) =>
                  onAccountChange(
                    event.target
                      .value
                  )
                }
              >
                {accounts.length ===
                  0 && (
                  <option value="">
                    No accounts
                  </option>
                )}

                {accounts.map(
                  (
                    account
                  ) => (
                    <option
                      key={
                        account._id
                      }
                      value={
                        account._id
                      }
                    >
                      {labelForAccountType(
                        account.accountType
                      )}{" "}
                      ·{" "}
                      {maskAccount(
                        account.accountNumber
                      )}
                      {account.isPrimary
                        ? " · Primary"
                        : ""}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={15}
                className="stmt-select-chevron"
              />
            </div>
          </label>

          {/* From */}

          <label className="stmt-field">
            <span>
              From
            </span>

            <input
              type="date"
              value={from}
              max={
                to ||
                undefined
              }
              onChange={(
                event
              ) =>
                setFrom(
                  event.target
                    .value
                )
              }
            />
          </label>

          {/* To */}

          <label className="stmt-field">
            <span>
              To
            </span>

            <input
              type="date"
              value={to}
              min={
                from ||
                undefined
              }
              onChange={(
                event
              ) =>
                setTo(
                  event.target
                    .value
                )
              }
            />
          </label>

          {/* Search */}

          <label className="stmt-field stmt-field--search">
            <span>
              Search transactions
            </span>

            <div className="stmt-input-icon">
              <Search
                size={16}
              />

              <input
                type="search"
                placeholder="Name, description, amount, account, Txn ID…"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
              />

              {search && (
                <button
                  type="button"
                  className="stmt-search-clear"
                  onClick={() =>
                    setSearch(
                      ""
                    )
                  }
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </label>
        </div>

        <div className="stmt-filter-footer">
          <div className="stmt-filter-status">
            <Filter size={14} />

            <span>
              {activeFilterCount
                ? `${activeFilterCount} filter${
                    activeFilterCount >
                    1
                      ? "s"
                      : ""
                  } active`
                : "Showing all available activity"}
            </span>

            {filteredEntries.length >
              0 && (
              <span className="stmt-result-pill">
                {
                  filteredEntries.length
                }{" "}
                results
              </span>
            )}
          </div>

          {(from || to) && (
            <button
              type="button"
              className="stmt-reset-date"
              onClick={
                resetDates
              }
            >
              Reset dates
            </button>
          )}
        </div>
      </motion.section>

      {/* =================================================
          SMART FILTER CHIPS
      ================================================= */}

      <motion.div
        variants={sectionMotion}
        initial="initial"
        animate="animate"
      >
        <SmartFilters
          active={chips}
          onToggle={
            toggleChip
          }
          onClear={
            clearAllFilters
          }
        />
      </motion.div>

      {/* =================================================
          ERROR
      ================================================= */}

      <AnimatePresence>
        {error && (
          <motion.div
            className="stmt-alert"
            role="alert"
            initial={{
              opacity: 0,
              y: -10,
              height: 0,
            }}
            animate={{
              opacity: 1,
              y: 0,
              height: "auto",
            }}
            exit={{
              opacity: 0,
              y: -10,
              height: 0,
            }}
          >
            <span className="stmt-alert__icon">
              <AlertTriangle
                size={16}
              />
            </span>

            <span>
              {error}
            </span>

            <button
              type="button"
              className="stmt-alert__close"
              onClick={() =>
                setError("")
              }
              aria-label="Dismiss error"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <motion.section
        className="stmt-summary"
        variants={staggerMotion}
        initial="initial"
        animate="animate"
      >
        {[
          {
            label: "Closing balance",
            icon: WalletCards,
            value:
              selected?.balancePaise ||
              0,
            money: true,
            tone: "blue",
            meta: selected
              ? `Available ${formatCompactINR(
                  selected.availableBalancePaise ??
                    selected.balancePaise
                )}`
              : "—",
          },

          {
            label: "Total credits",
            icon: ArrowDownLeft,
            value:
              summary.credit,
            money: true,
            tone: "green",
            meta: summary.credit
              ? "Money received"
              : "No credits",
          },

          {
            label: "Total spend",
            icon: ArrowUpRight,
            value:
              summary.debit,
            money: true,
            tone: "red",
            meta: summary.debit
              ? "Money spent"
              : "No spending",
          },

          {
            label: "Transactions",
            icon: BarChart3,
            value:
              summary.count,
            money: false,
            tone: "purple",
            meta: `${entries.length} loaded`,
          },

          {
            label: "Net cash flow",
            icon:
              summary.credit >=
              summary.debit
                ? TrendingUp
                : TrendingDown,
            value: Math.abs(
              summary.credit -
                summary.debit
            ),
            money: true,
            tone:
              summary.credit >=
              summary.debit
                ? "green"
                : "red",
            meta:
              summary.credit >=
              summary.debit
                ? "Positive movement"
                : "More out than in",
          },
        ].map(
          (card) => {
            const Icon =
              card.icon;

            return (
              <motion.div
                key={
                  card.label
                }
                className={`stmt-card stmt-summary__card stmt-summary__card--${card.tone}`}
                variants={
                  itemMotion
                }
                whileHover={{
                  y: -5,
                  transition: {
                    duration:
                      0.2,
                  },
                }}
              >
                <div className="stmt-summary__top">
                  <span className="stmt-summary__label">
                    {
                      card.label
                    }
                  </span>

                  <span className="stmt-summary__icon">
                    <Icon
                      size={16}
                    />
                  </span>
                </div>

                <p className="stmt-summary__value">
                  {card.money ? (
                    formatINR(
                      card.value
                    )
                  ) : (
                    <AnimatedNumber
                      value={
                        card.value
                      }
                    />
                  )}
                </p>

                <p className="stmt-summary__meta">
                  {card.meta}
                </p>
              </motion.div>
            );
          }
        )}
      </motion.section>

      {/* =================================================
          SMART INSIGHT
      ================================================= */}

      <motion.section
        className="stmt-smart-insights"
        variants={sectionMotion}
        initial="initial"
        animate="animate"
      >
        <div className="stmt-smart-insights__main">
          <motion.div
            className="stmt-smart-insights__icon"
            animate={{
              rotate: [
                0,
                -3,
                3,
                0,
              ],
              scale: [
                1,
                1.04,
                1,
              ],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Sparkles
              size={20}
            />
          </motion.div>

          <div>
            <span className="stmt-section-kicker">
              Smart financial insight
            </span>

            <h2>
              {summary.count
                ? `${insight.topCategory} is your biggest spending category`
                : "Your statement insights will appear here"}
            </h2>

            <p>
              {summary.count
                ? `${insight.topPct}% of your spending in this view is in ${insight.topCategory}, totalling ${formatINR(
                    insight.topAmount
                  )}. Your average transaction is ${formatINR(
                    insight.average
                  )}.`
                : "Make transactions or widen the selected period to generate personalised insights."}
            </p>
          </div>
        </div>

        <div className="stmt-smart-insights__stats">
          <div>
            <span>
              Largest debit
            </span>

            <strong>
              {summary.largestDebit
                ? formatINR(
                    summary
                      .largestDebit
                      .amountPaise
                  )
                : "—"}
            </strong>
          </div>

          <div>
            <span>
              High-risk activity
            </span>

            <strong
              className={
                insight.highRisk
                  ? "danger"
                  : "success"
              }
            >
              {
                insight.highRisk
              }
            </strong>
          </div>

          <div>
            <span>
              Pending
            </span>

            <strong
              className={
                insight.pending
                  ? "warning"
                  : "success"
              }
            >
              {
                insight.pending
              }
            </strong>
          </div>

          <div>
            <span>
              Failed / blocked
            </span>

            <strong
              className={
                insight.failed
                  ? "danger"
                  : "success"
              }
            >
              {
                insight.failed
              }
            </strong>
          </div>
        </div>
      </motion.section>

      {/* =================================================
          INSIGHTS TOGGLE
      ================================================= */}

      <motion.button
        type="button"
        className="stmt-insights-toggle"
        variants={sectionMotion}
        initial="initial"
        animate="animate"
        onClick={() =>
          setShowInsights(
            (value) =>
              !value
          )
        }
        whileTap={{
          scale: 0.995,
        }}
      >
        <div>
          <span className="stmt-insights-toggle__icon">
            <BarChart3
              size={17}
            />
          </span>

          <div>
            <strong>
              Category insights & trends
            </strong>

            <span>
              Spending breakdown, total
              spend and monthly movement
            </span>
          </div>
        </div>

        <motion.span
          animate={{
            rotate:
              showInsights
                ? 180
                : 0,
          }}
          transition={{
            duration: 0.25,
          }}
        >
          <ChevronDown
            size={18}
          />
        </motion.span>
      </motion.button>

      {/* =================================================
          CATEGORY INSIGHTS
      ================================================= */}

      <AnimatePresence
        initial={false}
      >
        {showInsights && (
          <motion.div
            className="stmt-insights-animated"
            initial={{
              opacity: 0,
              height: 0,
              y: -8,
            }}
            animate={{
              opacity: 1,
              height: "auto",
              y: 0,
            }}
            exit={{
              opacity: 0,
              height: 0,
              y: -8,
            }}
            transition={{
              duration: 0.32,
              ease: "easeInOut",
            }}
          >
            <CategoryInsights
              entries={
                filteredEntries
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================
          LEDGER
      ================================================= */}

      <motion.section
        className="stmt-card stmt-ledger"
        variants={sectionMotion}
        initial="initial"
        animate="animate"
      >
        <div className="stmt-ledger__head">
          <div>
            <span className="stmt-section-kicker">
              Account activity
            </span>

            <h2>
              Statement ledger
            </h2>

            <p>
              Click any transaction to
              reveal complete details.
            </p>
          </div>

          <div className="stmt-ledger__head-right">
            <div className="stmt-ledger__count">
              <strong>
                {
                  filteredEntries.length
                }
              </strong>

              <span>
                {activeFilterCount
                  ? ` of ${entries.length} loaded`
                  : ` of ${
                      meta?.total ||
                      entries.length
                    } total`}
              </span>
            </div>
          </div>
        </div>

        {/* =================================================
            Desktop table
        ================================================= */}

        <div className="stmt-table-wrap">
          <table
            className="stmt-table"
            data-testid="statement-table"
          >
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    className="stmt-sort-btn"
                    onClick={() =>
                      changeSort(
                        "date"
                      )
                    }
                  >
                    Date
                    <ArrowUpDown
                      size={12}
                    />
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    className="stmt-sort-btn"
                    onClick={() =>
                      changeSort(
                        "description"
                      )
                    }
                  >
                    Transaction
                    <ArrowUpDown
                      size={12}
                    />
                  </button>
                </th>

                <th>
                  Category
                </th>

                <th>
                  Status
                </th>

                <th className="right">
                  <button
                    type="button"
                    className="stmt-sort-btn stmt-sort-btn--right"
                    onClick={() =>
                      changeSort(
                        "amount"
                      )
                    }
                  >
                    Amount
                    <ArrowUpDown
                      size={12}
                    />
                  </button>
                </th>

                <th className="right">
                  Balance
                </th>
              </tr>
            </thead>

            <tbody>
              <AnimatePresence
                initial={false}
              >
                {/* Skeleton */}

                {loading &&
                  Array.from(
                    {
                      length: 7,
                    }
                  ).map(
                    (
                      _,
                      index
                    ) => (
                      <motion.tr
                        key={`sk-${index}`}
                        className="stmt-skeleton-row"
                        initial={{
                          opacity: 0,
                        }}
                        animate={{
                          opacity: 1,
                        }}
                        exit={{
                          opacity: 0,
                        }}
                      >
                        {Array.from(
                          {
                            length: 6,
                          }
                        ).map(
                          (
                            __,
                            column
                          ) => (
                            <td
                              key={
                                column
                              }
                            >
                              <span className="stmt-skeleton" />
                            </td>
                          )
                        )}
                      </motion.tr>
                    )
                  )}

                {/* Data */}

                {!loading &&
                  sortedEntries.map(
                    (
                      entry,
                      index
                    ) => {
                      const category =
                        classifyEntry(
                          entry
                        );

                      const categoryColor =
                        CATEGORY_META[
                          category
                        ]?.color ||
                        "#6B7280";

                      const entryId =
                        entry._id ||
                        `${entry.createdAt}-${index}`;

                      const isOpen =
                        expandedId ===
                        entryId;

                      const transaction =
                        entry.transaction ||
                        {};

                      const beneficiary =
                        transaction.beneficiary;

                      const isCredit =
                        entry.direction ===
                        "CREDIT";

                      const amount =
                        Number(
                          entry.amountPaise
                        ) || 0;

                      const status =
                        getStatus(
                          entry
                        );

                      const risk =
                        getRisk(
                          entry
                        );

                      return (
                        <motion.tr
                          key={`${entryId}-row`}
                          className={`stmt-row ${
                            isOpen
                              ? "stmt-row--open"
                              : ""
                          }`}
                          initial={{
                            opacity: 0,
                            y: 8,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            y: -5,
                          }}
                          transition={{
                            duration:
                              0.25,
                            delay:
                              Math.min(
                                index,
                                12
                              ) *
                              0.025,
                          }}
                          onClick={() =>
                            setExpandedId(
                              isOpen
                                ? null
                                : entryId
                            )
                          }
                        >
                          {/* Date */}

                          <td className="stmt-row__date">
                            <span>
                              {formatDate(
                                getEntryDate(
                                  entry
                                )
                              )}
                            </span>

                            <small>
                              {formatDateTime(
                                entry.createdAt
                              )
                                .split(
                                  ", "
                                )
                                .pop()}
                            </small>
                          </td>

                          {/* Transaction */}

                          <td className="stmt-row__desc">
                            <div className="stmt-row__title">
                              <span
                                className={`stmt-direction ${
                                  isCredit
                                    ? "credit"
                                    : "debit"
                                }`}
                              >
                                {isCredit ? (
                                  <ArrowDownLeft
                                    size={
                                      14
                                    }
                                  />
                                ) : (
                                  <ArrowUpRight
                                    size={
                                      14
                                    }
                                  />
                                )}
                              </span>

                              <span>
                                {getTransactionDescription(
                                  entry
                                )}
                              </span>
                            </div>

                            {beneficiary?.name && (
                              <span className="stmt-row__sub">
                                {
                                  beneficiary.name
                                }{" "}
                                ·{" "}
                                {maskAccount(
                                  beneficiary.accountNumber
                                )}
                              </span>
                            )}
                          </td>

                          {/* Category */}

                          <td>
                            <span
                              className="stmt-cat"
                              style={{
                                background: `${categoryColor}18`,
                                color:
                                  categoryColor,
                                borderColor: `${categoryColor}55`,
                              }}
                            >
                              <i
                                style={{
                                  background:
                                    categoryColor,
                                }}
                              />

                              {
                                category
                              }
                            </span>
                          </td>

                          {/* Status */}

                          <td>
                            <span
                              className={`stmt-status stmt-status--${statusClass(
                                status
                              )}`}
                            >
                              {status ===
                                "COMPLETED" && (
                                <CheckCircle2
                                  size={
                                    12
                                  }
                                />
                              )}

                              {status ===
                                "PENDING" && (
                                <Clock3
                                  size={
                                    12
                                  }
                                />
                              )}

                              {(status ===
                                "FAILED" ||
                                status ===
                                  "BLOCKED") && (
                                <AlertTriangle
                                  size={
                                    12
                                  }
                                />
                              )}

                              {
                                status
                              }
                            </span>
                          </td>

                          {/* Amount */}

                          <td className="right stmt-row__amount">
                            <span
                              className={
                                isCredit
                                  ? "stmt-row__credit"
                                  : "stmt-row__debit"
                              }
                            >
                              {isCredit
                                ? "+"
                                : "−"}{" "}
                              {
                                formatINR(
                                  amount
                                )
                              }
                            </span>
                          </td>

                          {/* Balance */}

                          <td className="right stmt-row__balance">
                            <strong>
                              {formatINR(
                                entry.balanceAfterPaise ??
                                  0
                              )}
                            </strong>

                            <ChevronDown
                              size={
                                15
                              }
                              className={`stmt-row-chevron ${
                                isOpen
                                  ? "open"
                                  : ""
                              }`}
                            />
                          </td>
                        </motion.tr>
                      );
                    }
                  )}
              </AnimatePresence>
            </tbody>
          </table>

          {/* =================================================
              Mobile
          ================================================= */}

          <div className="stmt-mobile-list">
            <AnimatePresence
              initial={false}
            >
              {!loading &&
                sortedEntries.map(
                  (
                    entry,
                    index
                  ) => {
                    const category =
                      classifyEntry(
                        entry
                      );

                    const color =
                      CATEGORY_META[
                        category
                      ]?.color ||
                      "#6B7280";

                    const entryId =
                      entry._id ||
                      `${entry.createdAt}-${index}`;

                    const isOpen =
                      expandedId ===
                      entryId;

                    const tx =
                      entry.transaction ||
                      {};

                    const beneficiary =
                      tx.beneficiary;

                    const credit =
                      entry.direction ===
                      "CREDIT";

                    const status =
                      getStatus(
                        entry
                      );

                    const risk =
                      getRisk(
                        entry
                      );

                    return (
                      <motion.article
                        key={`mobile-${entryId}`}
                        className={`stmt-mobile-card ${
                          isOpen
                            ? "open"
                            : ""
                        }`}
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          y: -5,
                        }}
                        transition={{
                          delay:
                            Math.min(
                              index,
                              8
                            ) *
                            0.025,
                        }}
                        onClick={() =>
                          setExpandedId(
                            isOpen
                              ? null
                              : entryId
                          )
                        }
                      >
                        <div className="stmt-mobile-card__top">
                          <span className="stmt-mobile-card__date">
                            {formatDate(
                              getEntryDate(
                                entry
                              )
                            )}
                          </span>

                          <span
                            className={`stmt-mobile-amount ${
                              credit
                                ? "credit"
                                : "debit"
                            }`}
                          >
                            {credit
                              ? "+"
                              : "−"}{" "}
                            {formatINR(
                              entry.amountPaise ||
                                0
                            )}
                          </span>
                        </div>

                        <div className="stmt-mobile-card__main">
                          <span
                            className={`stmt-direction ${
                              credit
                                ? "credit"
                                : "debit"
                            }`}
                          >
                            {credit ? (
                              <ArrowDownLeft
                                size={
                                  16
                                }
                              />
                            ) : (
                              <ArrowUpRight
                                size={
                                  16
                                }
                              />
                            )}
                          </span>

                          <div>
                            <strong>
                              {getTransactionDescription(
                                entry
                              )}
                            </strong>

                            <span>
                              {beneficiary?.name ||
                                entry.entryType ||
                                "Account activity"}
                            </span>
                          </div>

                          <ChevronDown
                            size={
                              17
                            }
                            className={`stmt-row-chevron ${
                              isOpen
                                ? "open"
                                : ""
                            }`}
                          />
                        </div>

                        <div className="stmt-mobile-card__tags">
                          <span
                            className="stmt-cat"
                            style={{
                              background: `${color}18`,
                              color,
                              borderColor: `${color}55`,
                            }}
                          >
                            <i
                              style={{
                                background:
                                  color,
                              }}
                            />

                            {
                              category
                            }
                          </span>

                          <span
                            className={`stmt-status stmt-status--${statusClass(
                              status
                            )}`}
                          >
                            {
                              status
                            }
                          </span>

                          {risk ===
                            "HIGH" && (
                            <span className="stmt-risk-pill">
                              <AlertTriangle
                                size={
                                  11
                                }
                              />
                              High risk
                            </span>
                          )}
                        </div>

                        <AnimatePresence
                          initial={
                            false
                          }
                        >
                          {isOpen && (
                            <motion.div
                              className="stmt-mobile-details"
                              initial={{
                                opacity: 0,
                                height: 0,
                              }}
                              animate={{
                                opacity: 1,
                                height:
                                  "auto",
                              }}
                              exit={{
                                opacity: 0,
                                height: 0,
                              }}
                            >
                              <div>
                                <span>
                                  Balance
                                  after
                                </span>

                                <strong>
                                  {formatINR(
                                    entry.balanceAfterPaise ??
                                      0
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Risk
                                </span>

                                <strong
                                  className={
                                    risk ===
                                    "HIGH"
                                      ? "danger"
                                      : risk ===
                                        "MEDIUM"
                                      ? "warning"
                                      : "success"
                                  }
                                >
                                  {
                                    risk
                                  }
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Status
                                </span>

                                <strong>
                                  {
                                    status
                                  }
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Entry type
                                </span>

                                <strong>
                                  {entry.entryType ||
                                    "—"}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Beneficiary
                                </span>

                                <strong>
                                  {beneficiary?.name
                                    ? `${beneficiary.name} ${maskAccount(
                                        beneficiary.accountNumber
                                      )}`
                                    : "—"}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Transaction ID
                                </span>

                                <strong className="mono">
                                  {tx._id
                                    ? String(
                                        tx._id
                                      ).slice(
                                        -12
                                      )
                                    : "—"}
                                </strong>
                              </div>

                              <div className="stmt-mobile-details__full">
                                <span>
                                  Transaction time
                                </span>

                                <strong>
                                  {formatDateTime(
                                    entry.createdAt
                                  )}
                                </strong>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.article>
                    );
                  }
                )}
            </AnimatePresence>
          </div>
        </div>

        {/* =================================================
            Empty
        ================================================= */}

        {!loading &&
          filteredEntries.length ===
            0 &&
          !error && (
            <motion.div
              className="stmt-empty"
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
            >
              <div className="stmt-empty__glow" />

              <div className="stmt-empty__icon">
                <FileText
                  size={30}
                />
              </div>

              <h3>
                {entries.length ===
                0
                  ? "No entries in this period"
                  : "No results match your filters"}
              </h3>

              <p>
                {entries.length ===
                0
                  ? "Try widening the date range, or make a transaction to populate your ledger."
                  : "Clear a filter or search term to see more activity."}
              </p>

              {activeFilterCount >
                0 && (
                <button
                  type="button"
                  className="stmt-btn stmt-btn--ghost stmt-btn--sm"
                  onClick={
                    clearAllFilters
                  }
                >
                  <X
                    size={14}
                  />
                  Clear filters
                </button>
              )}
            </motion.div>
          )}
      </motion.section>

      {/* =================================================
          SECURITY FOOTER
      ================================================= */}

      <motion.div
        className="stmt-security-note"
        variants={sectionMotion}
        initial="initial"
        animate="animate"
      >
        <ShieldCheck
          size={17}
        />

        <span>
          Your statement is private and
          available only to your authenticated
          account.
        </span>

        <CheckCircle2
          size={15}
        />
      </motion.div>

      {/* =================================================
          SHARE MODAL
      ================================================= */}

      <ShareStatementModal
        open={shareOpen}
        onClose={() =>
          setShareOpen(false)
        }
        accountId={
          accountId
        }
        accountLabel={
          accountLabel
        }
        dateRange={{
          from,
          to,
        }}
      />
    </motion.div>
  );
}