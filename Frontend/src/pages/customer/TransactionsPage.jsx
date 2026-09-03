import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  WalletCards,
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  ShieldCheck,
  Download,
  ChevronRight,
  X,
  RotateCcw,
  CalendarDays,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Activity,
  CreditCard,
} from "lucide-react";

import { apiClient } from "../../services/apiClient.js";
import { receiptsApi } from "../../services/notificationsApi.js";
import "./TransactionsPage.css";

function formatINR(paise) {
  if (typeof paise !== "number") return "₹0.00";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

function formatShortINR(paise) {
  if (!Number.isFinite(paise)) return "₹0";

  const amount = paise / 100;

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }

  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }

  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

const STATUS_COLOR = {
  COMPLETED: "success",
  PENDING: "warning",
  BLOCKED: "danger",
  FAILED: "danger",
};

const STATUS_LABEL = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  BLOCKED: "Blocked",
  FAILED: "Failed",
};

function getInitial(name = "") {
  return String(name).trim().charAt(0).toUpperCase() || "N";
}

function getBeneficiaryName(transaction) {
  return transaction?.beneficiary?.name || "Unknown beneficiary";
}

function getDescription(transaction) {
  return transaction?.description || "No description";
}

function getDate(transaction) {
  if (!transaction?.createdAt) return "—";

  return new Date(transaction.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTime(transaction) {
  if (!transaction?.createdAt) return "";

  return new Date(transaction.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function riskClass(risk) {
  return String(risk || "LOW").toLowerCase();
}

export default function TransactionsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const [status, setStatus] = useState("");
  const [risk, setRisk] = useState("");
  const [search, setSearch] = useState("");

  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        const params = { limit: 50 };

        if (status) params.status = status;
        if (risk) params.riskLevel = risk;

        const { data } = await apiClient.get("/transactions", {
          params,
        });

        if (!cancelled) {
          setItems(data?.data?.items || []);
          setTotal(data?.data?.total || 0);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load transactions:", error);
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, risk]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter((transaction) => {
      const beneficiary = getBeneficiaryName(transaction).toLowerCase();
      const description = getDescription(transaction).toLowerCase();
      const transactionStatus = String(
        transaction?.status || ""
      ).toLowerCase();
      const transactionRisk = String(
        transaction?.riskLevel || ""
      ).toLowerCase();

      return (
        beneficiary.includes(query) ||
        description.includes(query) ||
        transactionStatus.includes(query) ||
        transactionRisk.includes(query)
      );
    });
  }, [items, search]);

  const stats = useMemo(() => {
    const totalValue = items.reduce(
      (sum, transaction) =>
        sum + Number(transaction?.amountPaise || 0),
      0
    );

    const completed = items.filter(
      (transaction) => transaction.status === "COMPLETED"
    ).length;

    const pending = items.filter(
      (transaction) => transaction.status === "PENDING"
    ).length;

    const highRisk = items.filter(
      (transaction) => transaction.riskLevel === "HIGH"
    ).length;

    return {
      totalValue,
      completed,
      pending,
      highRisk,
    };
  }, [items]);

  const downloadReceipt = async (id) => {
    try {
      setDownloadingId(id);
      await receiptsApi.transactionPdf(id);
    } catch (error) {
      console.error("Receipt download failed:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setRisk("");
  };

  const handleStatus = (value) => {
    setStatus(value);
    setSelectedTransaction(null);
  };

  return (
    <div
      className="nexus-tx-page"
      data-testid="transactions-page"
    >
      {/* HEADER */}
      <motion.header
        className="nexus-tx-header"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <div className="nexus-tx-eyebrow">
            <Activity size={14} />
            MONEY MOVEMENT
          </div>

          <h1>Transactions</h1>

          <p>
            Your complete banking activity, payments and fraud
            verification history.
          </p>
        </div>

        <button className="nexus-tx-export">
          <Download size={17} />
          Export
          <ChevronRight size={15} />
        </button>
      </motion.header>

      {/* STAT CARDS */}
      <section className="nexus-tx-stats">
        <StatCard
          icon={WalletCards}
          tone="green"
          title="Transaction Value"
          value={formatShortINR(stats.totalValue)}
          subtitle={`${total} total transactions`}
          delay={0}
        />

        <StatCard
          icon={CheckCircle2}
          tone="blue"
          title="Completed"
          value={stats.completed}
          subtitle="Successful transactions"
          delay={0.08}
        />

        <StatCard
          icon={Clock3}
          tone="amber"
          title="Pending"
          value={stats.pending}
          subtitle={
            stats.pending
              ? "Needs attention"
              : "Nothing waiting"
          }
          delay={0.16}
        />

        <StatCard
          icon={ShieldCheck}
          tone="purple"
          title="High Risk"
          value={stats.highRisk}
          subtitle={
            stats.highRisk
              ? "Review recommended"
              : "No high-risk activity"
          }
          delay={0.24}
        />
      </section>

      {/* MAIN CONTENT */}
      <section className="nexus-tx-layout">
        {/* LEFT */}
        <div className="nexus-tx-main">
          {/* TOOLBAR */}
          <motion.div
            className="nexus-tx-toolbar"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="nexus-tx-search">
              <Search size={18} />

              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="nexus-tx-filter-tabs">
              <button
                className={!status ? "active" : ""}
                onClick={() => handleStatus("")}
              >
                All
              </button>

              <button
                className={status === "COMPLETED" ? "active" : ""}
                onClick={() => handleStatus("COMPLETED")}
              >
                Completed
              </button>

              <button
                className={status === "PENDING" ? "active" : ""}
                onClick={() => handleStatus("PENDING")}
              >
                Pending
              </button>

              <button
                className={status === "FAILED" ? "active" : ""}
                onClick={() => handleStatus("FAILED")}
              >
                Failed
              </button>
            </div>

            <div className="nexus-tx-filter-row">
              <div className="nexus-tx-select">
                <CalendarDays size={15} />
                <span>Last 30 days</span>
              </div>

              <select
                value={risk}
                onChange={(event) =>
                  setRisk(event.target.value)
                }
              >
                <option value="">All risks</option>
                <option value="LOW">Low risk</option>
                <option value="MEDIUM">Medium risk</option>
                <option value="HIGH">High risk</option>
              </select>

              <button
                className="nexus-tx-clear"
                onClick={resetFilters}
              >
                <RotateCcw size={14} />
                Clear filters
              </button>
            </div>
          </motion.div>

          {/* TABLE */}
          <motion.div
            className="nexus-tx-history"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
          >
            <div className="nexus-tx-history-head">
              <div>
                <span className="nexus-tx-mini-label">
                  ACCOUNT ACTIVITY
                </span>
                <h2>Transaction history</h2>
              </div>

              <span className="nexus-tx-count">
                {filteredItems.length} shown
              </span>
            </div>

            <div className="nexus-tx-table-head">
              <span>Date</span>
              <span>Beneficiary</span>
              <span>Description</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Risk</span>
              <span></span>
            </div>

            <div className="nexus-tx-list">
              {loading && (
                <>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div
                      className="nexus-tx-skeleton"
                      key={item}
                    />
                  ))}
                </>
              )}

              {!loading &&
                filteredItems.length === 0 && (
                  <div className="nexus-tx-empty">
                    <div className="nexus-tx-empty-icon">
                      <FileText size={24} />
                    </div>

                    <h3>No transactions found</h3>

                    <p>
                      Try changing your filters or search
                      query.
                    </p>

                    <button onClick={resetFilters}>
                      Reset filters
                    </button>
                  </div>
                )}

              {!loading &&
                filteredItems.map((transaction, index) => {
                  const name =
                    getBeneficiaryName(transaction);

                  const isSelected =
                    selectedTransaction?._id ===
                    transaction._id;

                  const statusTone =
                    STATUS_COLOR[transaction.status] ||
                    "neutral";

                  return (
                    <motion.button
                      type="button"
                      key={transaction._id}
                      className={`nexus-tx-row ${
                        isSelected ? "selected" : ""
                      }`}
                      onClick={() =>
                        setSelectedTransaction(transaction)
                      }
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.04 * index,
                        duration: 0.3,
                      }}
                    >
                      <div className="nexus-tx-date">
                        <strong>{getDate(transaction)}</strong>
                        <span>{getTime(transaction)}</span>
                      </div>

                      <div className="nexus-tx-person">
                        <span className="nexus-tx-avatar">
                          {getInitial(name)}
                        </span>

                        <div>
                          <strong>{name}</strong>
                          <span>
                            {transaction?.beneficiary
                              ? "Beneficiary"
                              : "Bank transfer"}
                          </span>
                        </div>
                      </div>

                      <div className="nexus-tx-description">
                        {getDescription(transaction)}
                      </div>

                      <div className="nexus-tx-amount">
                        {formatINR(
                          transaction.amountPaise
                        )}
                      </div>

                      <div>
                        <span
                          className={`nexus-tx-status ${statusTone}`}
                        >
                          <i />
                          {STATUS_LABEL[
                            transaction.status
                          ] || transaction.status}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`nexus-tx-risk ${riskClass(
                            transaction.riskLevel
                          )}`}
                        >
                          {transaction.riskLevel ||
                            "LOW"}
                        </span>
                      </div>

                      <ChevronRight
                        className="nexus-tx-chevron"
                        size={17}
                      />
                    </motion.button>
                  );
                })}
            </div>

            <div className="nexus-tx-pagination">
              <span>
                Showing <strong>{filteredItems.length}</strong>{" "}
                of <strong>{total}</strong> transactions
              </span>

              <div>
                <button disabled>←</button>
                <button className="current">1</button>
                <button>2</button>
                <button>3</button>
                <span>...</span>
                <button>→</button>
              </div>
            </div>
          </motion.div>

          {/* FRAUD SHIELD */}
          <motion.div
            className="nexus-tx-fraud"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="nexus-tx-fraud-shield">
              <div className="nexus-tx-fraud-orbit" />

              <ShieldCheck size={28} />

              <span>FRAUD<br />SHIELD</span>
            </div>

            <div className="nexus-tx-fraud-copy">
              <span>FRAUD PROTECTION</span>
              <h3>Your recent activity is safe</h3>
              <p>
                NexusBank continuously monitors your
                transactions for suspicious activity.
              </p>
            </div>

            <div className="nexus-tx-risk-score">
              <span>Risk Score</span>

              <div>
                <strong>
                  {stats.highRisk > 0 ? 68 : 12}
                </strong>
                <small>/ 100</small>
              </div>

              <div className="nexus-tx-risk-bar">
                <i
                  style={{
                    width: `${
                      stats.highRisk > 0 ? 68 : 12
                    }%`,
                  }}
                />
              </div>

              <label>
                <ShieldCheck size={14} />
                {stats.highRisk > 0
                  ? "REVIEW REQUIRED"
                  : "LOW RISK"}
              </label>
            </div>
          </motion.div>
        </div>

        {/* RIGHT DETAILS */}
        <aside className="nexus-tx-sidebar">
          <AnimatePresence mode="wait">
            {selectedTransaction ? (
              <TransactionDetails
                key={selectedTransaction._id}
                transaction={selectedTransaction}
                downloadingId={downloadingId}
                onClose={() =>
                  setSelectedTransaction(null)
                }
                onDownload={downloadReceipt}
              />
            ) : (
              <DefaultInsights
                key="insights"
                totalValue={stats.totalValue}
                pending={stats.pending}
                highRisk={stats.highRisk}
              />
            )}
          </AnimatePresence>
        </aside>
      </section>
    </div>
  );
}

/* -----------------------------------------
   STAT CARD
----------------------------------------- */

function StatCard({
  icon: Icon,
  tone,
  title,
  value,
  subtitle,
  delay,
}) {
  return (
    <motion.article
      className={`nexus-tx-stat nexus-tx-stat--${tone}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      whileHover={{ y: -5 }}
    >
      <div className="nexus-tx-stat-icon">
        <Icon size={23} />
      </div>

      <div className="nexus-tx-stat-copy">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>

      <div className="nexus-tx-spark">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </motion.article>
  );
}

/* -----------------------------------------
   DETAILS
----------------------------------------- */

function TransactionDetails({
  transaction,
  downloadingId,
  onClose,
  onDownload,
}) {
  const name = getBeneficiaryName(transaction);
  const statusTone =
    STATUS_COLOR[transaction.status] || "neutral";

  return (
    <motion.div
      className="nexus-tx-detail-card"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="nexus-tx-detail-head">
        <div>
          <span className="nexus-tx-mini-label">
            TRANSACTION DETAILS
          </span>
          <h2>Transaction details</h2>
        </div>

        <button onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="nexus-tx-detail-hero">
        <div className="nexus-tx-detail-icon">
          <ArrowUpRight size={25} />
        </div>

        <div>
          <strong>
            {formatINR(transaction.amountPaise)}
          </strong>
          <span>{name}</span>
          <small>{getDescription(transaction)}</small>
        </div>
      </div>

      <span className={`nexus-tx-status ${statusTone}`}>
        <i />
        {STATUS_LABEL[transaction.status] ||
          transaction.status}
      </span>

      <div className="nexus-tx-detail-list">
        <DetailRow
          label="Date"
          value={`${getDate(transaction)} · ${getTime(
            transaction
          )}`}
        />

        <DetailRow
          label="Beneficiary"
          value={name}
        />

        <DetailRow
          label="Risk level"
          value={transaction.riskLevel || "LOW"}
          highlight={
            transaction.riskLevel === "HIGH"
          }
        />

        <DetailRow
          label="Transaction ID"
          value={
            transaction._id
              ? String(transaction._id).slice(-12)
              : "—"
          }
          mono
        />

        <DetailRow
          label="Description"
          value={getDescription(transaction)}
        />
      </div>

      <button
        className="nexus-tx-download"
        disabled={
          transaction.status !== "COMPLETED" ||
          downloadingId === transaction._id
        }
        onClick={() => onDownload(transaction._id)}
      >
        <Download size={17} />

        {downloadingId === transaction._id
          ? "Downloading..."
          : transaction.status === "COMPLETED"
          ? "Download Receipt"
          : "Receipt unavailable"}
      </button>
    </motion.div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
  highlight = false,
}) {
  return (
    <div className="nexus-tx-detail-row">
      <span>{label}</span>
      <strong
        className={`${mono ? "mono" : ""} ${
          highlight ? "danger" : ""
        }`}
      >
        {value}
      </strong>
    </div>
  );
}

/* -----------------------------------------
   DEFAULT SIDEBAR
----------------------------------------- */

function DefaultInsights({
  totalValue,
  pending,
  highRisk,
}) {
  return (
    <>
      <motion.div
        className="nexus-tx-insight-card"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="nexus-tx-insight-head">
          <div>
            <span className="nexus-tx-mini-label">
              FRAUD MONITOR
            </span>
            <h2>Protection status</h2>
          </div>

          <ShieldCheck size={21} />
        </div>

        <div className="nexus-tx-protection">
          <div className="nexus-tx-protection-ring">
            <motion.div
              initial={{ rotate: -80 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.8 }}
            >
              <ShieldCheck size={32} />
            </motion.div>
          </div>

          <strong>
            {highRisk > 0
              ? "Review activity"
              : "You're protected"}
          </strong>

          <p>
            NexusBank's fraud detection engine is
            monitoring your transaction activity.
          </p>
        </div>

        <div className="nexus-tx-monitor-grid">
          <div>
            <span>Transactions</span>
            <strong>{formatShortINR(totalValue)}</strong>
          </div>

          <div>
            <span>Pending</span>
            <strong>{pending}</strong>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="nexus-tx-tip-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="nexus-tx-tip-icon">
          <AlertTriangle size={19} />
        </div>

        <div>
          <span>SECURITY TIP</span>
          <h3>Stay protected</h3>
          <p>
            Never share your OTP, PIN or banking
            credentials with anyone.
          </p>
        </div>
      </motion.div>

      <motion.div
        className="nexus-tx-quick-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="nexus-tx-insight-head">
          <div>
            <span className="nexus-tx-mini-label">
              ACCOUNT
            </span>
            <h2>Transaction health</h2>
          </div>

          <CreditCard size={20} />
        </div>

        <div className="nexus-tx-health-line">
          <span>Safe activity</span>
          <strong>
            {highRisk > 0 ? "Needs review" : "Excellent"}
          </strong>
        </div>

        <div className="nexus-tx-health-bar">
          <i
            style={{
              width: `${highRisk > 0 ? 72 : 94}%`,
            }}
          />
        </div>
      </motion.div>
    </>
  );
}