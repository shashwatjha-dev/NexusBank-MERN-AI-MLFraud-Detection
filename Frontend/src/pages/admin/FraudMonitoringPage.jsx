import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Filter,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { adminService } from "../../services/adminService.js";
import { useApi } from "../../hooks/useApi.js";
import { Card } from "../../components/common/Card.jsx";
import { RiskChip } from "../../components/common/RiskChip.jsx";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { formatDateTime } from "../../utils/date.js";
import { formatPaise } from "../../utils/money.js";

const RISKS = ["ALL", "LOW", "MEDIUM", "HIGH"];
const REVIEW = ["ALL", "OPEN", "REVIEWED", "DISMISSED"];

const PAGE_SIZE_OPTIONS = [8, 16, 24];

export function FraudMonitoringPage() {
  const [risk, setRisk] = useState("ALL");
  const [review, setReview] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [showFilters, setShowFilters] = useState(false);

  const params = {
    limit: 100,
    ...(risk !== "ALL" && { riskLevel: risk }),
    ...(review !== "ALL" && { reviewStatus: review }),
  };

  const { data, loading, error, refetch } = useApi(
    () => adminService.fraud(params),
    [risk, review]
  );

  const allItems = data?.items || [];

  /*
   * Search is intentionally client-side because the existing fraud API
   * contract only exposes risk/review filters.
   */
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = allItems.filter((log) => {
      if (!query) return true;

      const haystack = [
        log._id,
        log.user?.name,
        log.user?.email,
        log.riskLevel,
        log.decision,
        log.reviewStatus,
        log.transaction?.type,
        log.transaction?.status,
        log.transaction?.description,
        log.transaction?.beneficiary?.name,
        log.transaction?.beneficiary?.bankName,
        String(log.transaction?.amountPaise || ""),
        String(log.riskScore || ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "risk") {
        return (b.riskScore || 0) - (a.riskScore || 0);
      }

      if (sortBy === "amount") {
        return (
          (b.transaction?.amountPaise || 0) -
          (a.transaction?.amountPaise || 0)
        );
      }

      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    return result;
  }, [allItems, search, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / pageSize)
  );

  const safePage = Math.min(page, totalPages);

  const visibleItems = filteredItems.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const stats = useMemo(() => {
    const total = allItems.length;

    const high = allItems.filter(
      (x) => x.riskLevel === "HIGH"
    ).length;

    const medium = allItems.filter(
      (x) => x.riskLevel === "MEDIUM"
    ).length;

    const low = allItems.filter(
      (x) => x.riskLevel === "LOW"
    ).length;

    const open = allItems.filter(
      (x) => !x.reviewStatus || x.reviewStatus === "OPEN"
    ).length;

    const amountAtRisk = allItems.reduce(
      (sum, x) =>
        sum + Number(x.transaction?.amountPaise || 0),
      0
    );

    return {
      total,
      high,
      medium,
      low,
      open,
      amountAtRisk,
    };
  }, [allItems]);

  const resetPage = () => setPage(1);

  const handleRiskChange = (value) => {
    setRisk(value);
    resetPage();
  };

  const handleReviewChange = (value) => {
    setReview(value);
    resetPage();
  };

  const handleSearch = (event) => {
    setSearch(event.target.value);
    resetPage();
  };

  const clearSearch = () => {
    setSearch("");
    resetPage();
  };

  if (error) {
    return (
      <div className="fraud-page">
        <ErrorState
          description={error.message}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="fraud-page">
      {/* =====================================================
          HEADER
         ===================================================== */}

      <motion.header
        className="fraud-page__header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <div className="fraud-page__eyebrow">
            <span className="fraud-live-dot" />
            FRAUD INTELLIGENCE
          </div>

          <h1>Fraud Events</h1>

          <p>
            Monitor suspicious activity, review risk signals,
            and protect your accounts from fraudulent activity.
          </p>
        </div>

        <button
          type="button"
          className="fraud-refresh-btn"
          onClick={refetch}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? "fraud-refresh-btn__spin"
                : ""
            }
          />
          Refresh
        </button>
      </motion.header>

      {/* =====================================================
          STAT CARDS
         ===================================================== */}

      <section className="fraud-stats">
        <FraudStatCard
          label="Total Events"
          value={stats.total}
          icon={ShieldAlert}
          tone="blue"
          helper="Flagged transactions"
          loading={loading}
        />

        <FraudStatCard
          label="High Risk"
          value={stats.high}
          icon={AlertTriangle}
          tone="red"
          helper="Requires attention"
          loading={loading}
        />

        <FraudStatCard
          label="Medium Risk"
          value={stats.medium}
          icon={Clock3}
          tone="amber"
          helper="Under monitoring"
          loading={loading}
        />

        <FraudStatCard
          label="Low Risk"
          value={stats.low}
          icon={ShieldCheck}
          tone="green"
          helper="Lower priority"
          loading={loading}
        />

        <FraudStatCard
          label="Open Reviews"
          value={stats.open}
          icon={Zap}
          tone="purple"
          helper="Awaiting review"
          loading={loading}
        />

        <FraudStatCard
          label="Amount at Risk"
          value={formatPaise(stats.amountAtRisk)}
          icon={Shield}
          tone="cyan"
          helper="Across loaded events"
          loading={loading}
          isAmount
        />
      </section>

      {/* =====================================================
          MAIN WORKSPACE
         ===================================================== */}

      <Card className="fraud-workspace">
        {/* Toolbar */}

        <div className="fraud-toolbar">
          <div className="fraud-search">
            <Search size={16} />

            <input
              type="search"
              value={search}
              onChange={handleSearch}
              placeholder="Search transactions, users, IDs..."
              aria-label="Search fraud events"
            />

            {search && (
              <button
                type="button"
                className="fraud-search__clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <XCircle size={14} />
              </button>
            )}
          </div>

          <div className="fraud-toolbar__actions">
            <div className="fraud-sort">
              <SlidersHorizontal size={14} />

              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  resetPage();
                }}
                aria-label="Sort fraud events"
              >
                <option value="newest">
                  Newest first
                </option>
                <option value="risk">
                  Highest risk
                </option>
                <option value="amount">
                  Largest amount
                </option>
              </select>

              <ChevronDown size={13} />
            </div>

            <button
              type="button"
              className={
                "fraud-filter-toggle" +
                (showFilters
                  ? " fraud-filter-toggle--active"
                  : "")
              }
              onClick={() =>
                setShowFilters((value) => !value)
              }
            >
              <Filter size={14} />
              Filters
              {(risk !== "ALL" ||
                review !== "ALL") && (
                <span>
                  {(risk !== "ALL" ? 1 : 0) +
                    (review !== "ALL" ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter panel */}

        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              className="fraud-filter-panel"
              initial={{
                opacity: 0,
                height: 0,
                y: -5,
              }}
              animate={{
                opacity: 1,
                height: "auto",
                y: 0,
              }}
              exit={{
                opacity: 0,
                height: 0,
                y: -5,
              }}
            >
              <FilterGroup
                label="Risk level"
                options={RISKS}
                value={risk}
                onChange={handleRiskChange}
                testid="fraud-filter-risk"
              />

              <FilterGroup
                label="Review status"
                options={REVIEW}
                value={review}
                onChange={handleReviewChange}
                testid="fraud-filter-review"
              />

              {(risk !== "ALL" ||
                review !== "ALL" ||
                search) && (
                <button
                  type="button"
                  className="fraud-clear-filters"
                  onClick={() => {
                    setRisk("ALL");
                    setReview("ALL");
                    setSearch("");
                    resetPage();
                  }}
                >
                  Clear all
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results heading */}

        <div className="fraud-results-head">
          <div>
            <span className="fraud-results-head__eyebrow">
              SECURITY LOG
            </span>

            <h2>
              Fraud events
              <span>
                {loading
                  ? "..."
                  : filteredItems.length}
              </span>
            </h2>
          </div>

          <div className="fraud-results-head__meta">
            {search
              ? `Results for "${search}"`
              : "Live fraud monitoring"}
          </div>
        </div>

        {/* Loading */}

        {loading ? (
          <div className="fraud-list fraud-list--loading">
            {Array.from({ length: 6 }).map(
              (_, index) => (
                <div
                  className="fraud-skeleton-row"
                  key={index}
                >
                  <Skeleton
                    height={58}
                    radius={12}
                  />
                </div>
              )
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="fraud-empty">
            <EmptyState
              icon={ShieldAlert}
              title="No fraud events found"
              description={
                search
                  ? "Try a different search term or clear your filters."
                  : "All flagged events under these filters are resolved."
              }
            />

            {(search ||
              risk !== "ALL" ||
              review !== "ALL") && (
              <button
                type="button"
                className="fraud-empty__reset"
                onClick={() => {
                  setSearch("");
                  setRisk("ALL");
                  setReview("ALL");
                  resetPage();
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* =================================================
                EVENT LIST
               ================================================= */}

            <div
              className="fraud-list"
              data-testid="fraud-monitoring-list"
            >
              <AnimatePresence mode="popLayout">
                {visibleItems.map(
                  (log, index) => (
                    <FraudEventRow
                      key={log._id}
                      log={log}
                      index={index}
                    />
                  )
                )}
              </AnimatePresence>
            </div>

            {/* =================================================
                PAGINATION
               ================================================= */}

            <FraudPagination
              page={safePage}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}


/* ============================================================
   STAT CARD
   ============================================================ */

function FraudStatCard({
  label,
  value,
  icon: Icon,
  tone,
  helper,
  loading,
  isAmount,
}) {
  if (loading) {
    return (
      <div className="fraud-stat-card fraud-stat-card--loading">
        <Skeleton height={96} radius={15} />
      </div>
    );
  }

  return (
    <motion.div
      className={`fraud-stat-card fraud-stat-card--${tone}`}
      initial={{
        opacity: 0,
        y: 14,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      whileHover={{
        y: -3,
      }}
      transition={{
        duration: 0.3,
      }}
    >
      <div className="fraud-stat-card__top">
        <span>{label}</span>

        <div className="fraud-stat-card__icon">
          <Icon size={17} />
        </div>
      </div>

      <strong
        className={
          isAmount
            ? "fraud-stat-card__amount"
            : ""
        }
      >
        {value}
      </strong>

      <small>{helper}</small>

      <div className="fraud-stat-card__line" />
    </motion.div>
  );
}


/* ============================================================
   FILTER GROUP
   ============================================================ */

function FilterGroup({
  label,
  options,
  value,
  onChange,
  testid,
}) {
  return (
    <div className="fraud-filter-group">
      <span>{label}</span>

      <div className="fraud-filter-options">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => onChange(option)}
            className={
              "fraud-filter-option" +
              (value === option
                ? " fraud-filter-option--active"
                : "")
            }
            data-testid={`${testid}-${option.toLowerCase()}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}


/* ============================================================
   EVENT ROW
   ============================================================ */

function FraudEventRow({ log, index }) {
  const amount =
    log.transaction?.amountPaise || 0;

  const riskLevel =
    log.riskLevel || "LOW";

  const score = Number(log.riskScore || 0);

  const reviewStatus =
    log.reviewStatus || "OPEN";

  const isHigh = riskLevel === "HIGH";

  const isCredit =
    String(log.transaction?.type || "")
      .toUpperCase()
      .includes("IN");

  const beneficiary =
    log.transaction?.beneficiary?.name ||
    log.user?.name ||
    "Unknown user";

  return (
    <motion.div
      className={
        "fraud-event-row" +
        (isHigh
          ? " fraud-event-row--high"
          : "")
      }
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
        duration: 0.24,
        delay: index * 0.025,
      }}
      whileHover={{
        y: -2,
      }}
      data-testid={`fraud-log-row-${log._id}`}
    >
      <Link
        to={`/admin/fraud/${log._id}`}
        className="fraud-event-row__link"
      >
        {/* Risk marker */}

        <div
          className={`fraud-event-row__marker fraud-event-row__marker--${riskLevel.toLowerCase()}`}
        />

        {/* Icon */}

        <div
          className={
            "fraud-event-row__icon " +
            (isCredit
              ? "fraud-event-row__icon--credit"
              : "fraud-event-row__icon--debit")
          }
        >
          {isCredit ? (
            <ArrowDownRight size={17} />
          ) : (
            <ArrowUpRight size={17} />
          )}
        </div>

        {/* Main */}

        <div className="fraud-event-row__main">
          <div className="fraud-event-row__amount">
            {formatPaise(amount)}
          </div>

          <div className="fraud-event-row__identity">
            {beneficiary}

            {log.user?.email && (
              <>
                <span>•</span>
                {log.user.email}
              </>
            )}
          </div>

          <div className="fraud-event-row__meta">
            <span>
              {log.transaction?.type ||
                "Transaction"}
            </span>

            <i>•</i>

            <span>
              {formatDateTime(log.createdAt)}
            </span>

            {log._id && (
              <>
                <i>•</i>
                <span className="fraud-event-row__id">
                  {String(log._id).slice(-10)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Score */}

        <div className="fraud-event-score">
          <div
            className={`fraud-event-score__ring fraud-event-score__ring--${riskLevel.toLowerCase()}`}
            style={{
              "--score": `${Math.min(
                100,
                Math.max(0, score)
              ) * 3.6}deg`,
            }}
          >
            <strong>{score}</strong>
            <span>/100</span>
          </div>
        </div>

        {/* Risk */}

        <div className="fraud-event-row__risk">
          <RiskChip
            level={riskLevel}
            size="sm"
          />

          <span
            className={
              "fraud-review-status " +
              `fraud-review-status--${reviewStatus.toLowerCase()}`
            }
          >
            {reviewStatus}
          </span>
        </div>

        <div className="fraud-event-row__arrow">
          <ChevronRight size={17} />
        </div>
      </Link>
    </motion.div>
  );
}


/* ============================================================
   PAGINATION
   ============================================================ */

function FraudPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}) {
  const pages = buildPages(page, totalPages);

  const start =
    totalItems === 0
      ? 0
      : (page - 1) * pageSize + 1;

  const end = Math.min(
    page * pageSize,
    totalItems
  );

  return (
    <div className="fraud-pagination">
      <div className="fraud-pagination__info">
        Showing{" "}
        <strong>
          {start}–{end}
        </strong>{" "}
        of{" "}
        <strong>{totalItems}</strong>
      </div>

      <div className="fraud-pagination__controls">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() =>
            onPageChange(Math.max(1, page - 1))
          }
          aria-label="Previous page"
        >
          <ChevronRight
            size={14}
            style={{
              transform: "rotate(180deg)",
            }}
          />
        </button>

        {pages.map((item, index) =>
          item === "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="fraud-pagination__ellipsis"
            >
              …
            </span>
          ) : (
            <button
              type="button"
              key={item}
              className={
                item === page
                  ? "fraud-pagination__active"
                  : ""
              }
              onClick={() =>
                onPageChange(item)
              }
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() =>
            onPageChange(
              Math.min(totalPages, page + 1)
            )
          }
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <label className="fraud-page-size">
        <span>Rows</span>

        <select
          value={pageSize}
          onChange={(event) =>
            onPageSizeChange(
              Number(event.target.value)
            )
          }
        >
          {pageSizeOptions.map((size) => (
            <option
              key={size}
              value={size}
            >
              {size}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}


/* ============================================================
   PAGINATION HELPER
   ============================================================ */

function buildPages(current, total) {
  if (total <= 6) {
    return Array.from(
      { length: total },
      (_, index) => index + 1
    );
  }

  if (current <= 3) {
    return [1, 2, 3, 4, "...", total];
  }

  if (current >= total - 2) {
    return [
      1,
      "...",
      total - 3,
      total - 2,
      total - 1,
      total,
    ];
  }

  return [
    1,
    "...",
    current - 1,
    current,
    current + 1,
    "...",
    total,
  ];
}