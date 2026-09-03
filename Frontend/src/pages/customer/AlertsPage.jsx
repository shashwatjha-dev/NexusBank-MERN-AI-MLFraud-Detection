import { useMemo, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  ShieldAlert,
  ArrowLeftRight,
  Gift,
  Info,
  Search,
  Filter,
  Sparkles,
  Clock3,
  CheckCheck,
} from "lucide-react";

import { alertService } from "../../services/alertService.js";
import { useApi } from "../../hooks/useApi.js";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { formatDateTime } from "../../utils/date.js";
import { useToast } from "../../hooks/useToast.js";

import "./AlertsPage.css";


/* =========================================================
   ALERT CONFIGURATION
   ========================================================= */

const ALERT_CONFIG = {
  SECURITY: {
    label: "Security",
    icon: ShieldAlert,
    className: "alert-tone--security",
  },

  TRANSACTION: {
    label: "Transaction",
    icon: ArrowLeftRight,
    className: "alert-tone--transaction",
  },

  REWARD: {
    label: "Reward",
    icon: Gift,
    className: "alert-tone--reward",
  },

  SYSTEM: {
    label: "System",
    icon: Info,
    className: "alert-tone--system",
  },
};


const getConfig = (type) =>
  ALERT_CONFIG[type] ||
  ALERT_CONFIG.SYSTEM;


/* =========================================================
   NORMALIZE ALERT
   ========================================================= */

function normalizeAlert(alert) {
  if (!alert) return null;

  let type = String(
    alert.type || "SYSTEM"
  ).toUpperCase();

  const title = String(
    alert.title || ""
  ).toLowerCase();

  const message = String(
    alert.message || ""
  ).toLowerCase();


  /*
   * -------------------------------------------------------
   * Transaction alerts
   * -------------------------------------------------------
   */

  if (
    type === "TRANSACTION"
  ) {
    type = "TRANSACTION";
  }

  if (
    title.includes(
      "transfer completed"
    ) ||
    title.includes(
      "transfer successful"
    ) ||
    message.includes(
      "transfer was completed"
    ) ||
    message.includes(
      "transfer completed"
    )
  ) {
    type = "TRANSACTION";
  }


  /*
   * -------------------------------------------------------
   * Reward alerts
   * -------------------------------------------------------
   */

  if (
    type === "REWARD" ||
    title.includes("reward") ||
    title.includes(
      "points earned"
    ) ||
    message.includes(
      "reward points"
    ) ||
    (
      message.includes(
        "earned"
      ) &&
      message.includes(
        "points"
      )
    )
  ) {
    type = "REWARD";
  }


  /*
   * -------------------------------------------------------
   * Security alerts
   * -------------------------------------------------------
   */

  if (
    type === "SECURITY" ||
    title.includes(
      "security"
    ) ||
    title.includes(
      "otp"
    ) ||
    title.includes(
      "login"
    ) ||
    title.includes(
      "password"
    ) ||
    title.includes(
      "device"
    ) ||
    title.includes(
      "blocked"
    ) ||
    title.includes(
      "verification required"
    ) ||
    message.includes(
      "otp"
    ) ||
    message.includes(
      "fraud"
    )
  ) {
    type = "SECURITY";
  }


  /*
   * -------------------------------------------------------
   * Only valid UI categories
   * -------------------------------------------------------
   */

  if (
    ![
      "SECURITY",
      "TRANSACTION",
      "REWARD",
      "SYSTEM",
    ].includes(type)
  ) {
    type = "SYSTEM";
  }


  return {
    ...alert,

    type,

    message:
      alert.message ||
      alert.body ||
      "",

    _id:
      alert._id ||
      alert.id,

    createdAt:
      alert.createdAt ||
      alert.updatedAt ||
      new Date().toISOString(),
  };
}


/* =========================================================
   LOAD ALERTS
   ========================================================= */

async function loadAllAlerts() {
  /*
   * IMPORTANT:
   *
   * Alerts page uses ONLY:
   *
   * GET /api/alerts
   *
   * Do not use /api/notifications here.
   */

  const response =
    await alertService.list();

  const items =
    response?.items || [];


  const normalized =
    items
      .map(normalizeAlert)
      .filter(Boolean);


  /*
   * Newest first.
   */

  normalized.sort(
    (a, b) =>
      new Date(b.createdAt) -
      new Date(a.createdAt)
  );


  const unread =
    normalized.filter(
      (item) =>
        !item.read
    ).length;


  return {
    items: normalized,
    unread,
  };
}


/* =========================================================
   PAGE
   ========================================================= */

export function AlertsPage() {
  const {
    data,
    loading,
    error,
    refetch,
  } = useApi(
    loadAllAlerts,
    []
  );


  const toast =
    useToast();


  const [filter, setFilter] =
    useState("ALL");


  const [search, setSearch] =
    useState("");


  const items =
    data?.items || [];


  const unreadCount =
    data?.unread ??
    items.filter(
      (alert) =>
        !alert.read
    ).length;


  const securityCount =
    items.filter(
      (alert) =>
        alert.type ===
        "SECURITY"
    ).length;


  const transactionCount =
    items.filter(
      (alert) =>
        alert.type ===
        "TRANSACTION"
    ).length;


  const rewardCount =
    items.filter(
      (alert) =>
        alert.type ===
        "REWARD"
    ).length;


  /* =======================================================
     FILTERED ALERTS
     ======================================================= */

  const filteredAlerts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();


      return items.filter(
        (alert) => {
          const matchesFilter =
            filter === "ALL"
              ? true
              : filter ===
                "UNREAD"
              ? !alert.read
              : alert.type ===
                filter;


          const matchesSearch =
            !query ||
            alert.title
              ?.toLowerCase()
              .includes(query) ||
            alert.message
              ?.toLowerCase()
              .includes(query) ||
            alert.type
              ?.toLowerCase()
              .includes(query);


          return (
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [
      items,
      filter,
      search,
    ]);


  /* =======================================================
     MARK READ
     ======================================================= */

  const markRead =
    async (alert) => {
      try {
        await alertService.markRead(
          alert._id
        );

        toast.success(
          "Alert marked as read."
        );

        await refetch();
      } catch (err) {
        toast.error(
          err?.message ||
            "Could not mark alert as read."
        );
      }
    };


  /* =======================================================
     ERROR
     ======================================================= */

  if (error) {
    return (
      <div className="alerts-page">
        <ErrorState
          description={
            error.message
          }
          onRetry={
            refetch
          }
        />
      </div>
    );
  }


  return (
    <div
      className="alerts-page"
      data-testid="alerts-page"
    >

      {/* ===================================================
          HEADER
      =================================================== */}

      <motion.header
        className="alerts__hero"
        initial={{
          opacity: 0,
          y: 18,
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

          <div className="alerts__eyebrow">
            <span className="alerts__eyebrow-dot" />
            Notifications
          </div>

          <h1>
            Alerts
          </h1>

          <p>
            Stay informed about your
            account, security,
            transactions and
            NexusBank activity.
          </p>

        </div>


        <div
          className={`alerts__unread-badge ${
            unreadCount > 0
              ? "has-unread"
              : ""
          }`}
        >
          <Bell size={17} />

          <span>
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "All caught up"}
          </span>
        </div>

      </motion.header>


      {/* ===================================================
          SUMMARY
      =================================================== */}

      <motion.section
        className="alerts__summary"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},

          show: {
            transition: {
              staggerChildren:
                0.08,
            },
          },
        }}
      >

        <SummaryCard
          icon={Bell}
          label="Total alerts"
          value={
            items.length
          }
          className="summary--blue"
        />


        <SummaryCard
          icon={Clock3}
          label="Unread"
          value={
            unreadCount
          }
          className="summary--green"
          active={
            unreadCount > 0
          }
        />


        <SummaryCard
          icon={ShieldAlert}
          label="Security"
          value={
            securityCount
          }
          className="summary--red"
        />


        <SummaryCard
          icon={Sparkles}
          label="Rewards"
          value={
            rewardCount
          }
          className="summary--purple"
        />


        <SummaryCard
          icon={ArrowLeftRight}
          label="Transactions"
          value={
            transactionCount
          }
          className="summary--orange"
        />

      </motion.section>


      {/* ===================================================
          MAIN PANEL
      =================================================== */}

      <motion.section
        className="alerts__panel"
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.25,
          duration: 0.45,
        }}
      >

        <div className="alerts__panel-head">

          <div>

            <span className="alerts__section-label">
              Inbox
            </span>

            <h2>
              All alerts
            </h2>

            <p>
              Important updates from
              your NexusBank account.
            </p>

          </div>


          {unreadCount === 0 && (
            <div className="alerts__caught-up">

              <CheckCheck
                size={15}
              />

              All caught up

            </div>
          )}

        </div>


        {/* =================================================
            TOOLBAR
        ================================================= */}

        <div className="alerts__toolbar">

          <div className="alerts__filters">

            <div className="alerts__filter-icon">
              <Filter size={15} />
            </div>


            {[
              ["ALL", "All"],
              ["UNREAD", "Unread"],
              [
                "SECURITY",
                "Security",
              ],
              [
                "TRANSACTION",
                "Transactions",
              ],
              [
                "REWARD",
                "Rewards",
              ],
              [
                "SYSTEM",
                "System",
              ],
            ].map(
              ([
                value,
                label,
              ]) => (
                <button
                  key={value}
                  type="button"
                  className={`alerts__filter ${
                    filter === value
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    setFilter(
                      value
                    )
                  }
                >

                  {label}

                  {value ===
                    "UNREAD" &&
                    unreadCount >
                      0 && (
                      <span className="alerts__filter-count">
                        {
                          unreadCount
                        }
                      </span>
                    )}

                </button>
              )
            )}

          </div>


          <div className="alerts__search">

            <Search size={16} />

            <input
              type="search"
              placeholder="Search alerts..."
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              aria-label="Search alerts"
            />

          </div>

        </div>


        {/* =================================================
            CONTENT
        ================================================= */}

        {loading ? (

          <div className="alerts__loading">

            {Array.from({
              length: 4,
            }).map(
              (_, index) => (
                <Skeleton
                  key={index}
                  height={105}
                  radius={18}
                />
              )
            )}

          </div>

        ) : filteredAlerts.length ===
          0 ? (

          <div className="alerts__empty">

            <div className="alerts__empty-icon">
              <Bell size={25} />
            </div>

            <h3>
              {search ||
              filter !== "ALL"
                ? "No matching alerts"
                : "You're all caught up"}
            </h3>

            <p>
              {search ||
              filter !== "ALL"
                ? "Try changing the filter or search term."
                : "New security and account notifications will appear here."}
            </p>


            {(search ||
              filter !==
                "ALL") && (

              <button
                type="button"
                onClick={() => {
                  setSearch(
                    ""
                  );

                  setFilter(
                    "ALL"
                  );
                }}
              >
                Clear filters
              </button>

            )}

          </div>

        ) : (

          <motion.div
            className="alerts__list"
            layout
          >

            {/*
             * IMPORTANT:
             *
             * No mode="popLayout" here.
             * This also removes the React ref warning
             * you were seeing in the console.
             */}

            <AnimatePresence>

              {filteredAlerts.map(
                (
                  alert,
                  index
                ) => (

                  <AlertItem
                    key={
                      alert._id ||
                      `${alert.type}-${index}`
                    }
                    alert={
                      alert
                    }
                    index={
                      index
                    }
                    onMarkRead={
                      markRead
                    }
                  />

                )
              )}

            </AnimatePresence>

          </motion.div>

        )}

      </motion.section>


      {/* ===================================================
          SECURITY FOOTER
      =================================================== */}

      <motion.div
        className="alerts__security-note"
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.4,
        }}
      >

        <div className="alerts__security-icon">
          <ShieldAlert
            size={20}
          />
        </div>


        <div>

          <strong>
            Your security is our
            priority
          </strong>

          <p>
            Never share your OTP,
            PIN or banking
            credentials with
            anyone. NexusBank will
            never ask for them.
          </p>

        </div>


        <span className="alerts__secure-badge">
          Protected
        </span>

      </motion.div>

    </div>
  );
}


/* =========================================================
   SUMMARY CARD
   ========================================================= */

function SummaryCard({
  icon: Icon,
  label,
  value,
  className = "",
  active = false,
}) {
  return (
    <motion.div
      className={`alerts__summary-card ${className} ${
        active
          ? "is-active"
          : ""
      }`}
      variants={{
        hidden: {
          opacity: 0,
          y: 15,
        },

        show: {
          opacity: 1,
          y: 0,
        },
      }}
      whileHover={{
        y: -4,

        transition: {
          duration: 0.2,
        },
      }}
    >

      <div className="alerts__summary-icon">
        <Icon size={18} />
      </div>


      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </motion.div>
  );
}


/* =========================================================
   ALERT ITEM
   ========================================================= */

function AlertItem({
  alert,
  index,
  onMarkRead,
}) {
  const config =
    getConfig(
      alert.type
    );

  const Icon =
    config.icon;


  return (
    <motion.article
      layout
      className={`alert-item ${config.className} ${
        alert.read
          ? "is-read"
          : "is-unread"
      }`}
      data-testid={`alert-${alert._id}`}
      initial={{
        opacity: 0,
        y: 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        x: -20,
      }}
      transition={{
        duration: 0.3,
        delay: Math.min(
          index * 0.04,
          0.2
        ),
      }}
      whileHover={{
        y: -2,

        transition: {
          duration: 0.18,
        },
      }}
    >

      <div className="alert-item__glow" />


      <div className="alert-item__icon">
        <Icon size={20} />
      </div>


      <div className="alert-item__content">

        <div className="alert-item__top">

          <div className="alert-item__category">

            <span>
              {
                config.label
              }
            </span>


            {!alert.read && (
              <span className="alert-item__unread">
                <i />
                UNREAD
              </span>
            )}

          </div>


          <time>
            {formatDateTime(
              alert.createdAt
            )}
          </time>

        </div>


        <h3>
          {alert.title}
        </h3>


        <p>
          {alert.message}
        </p>


        <div className="alert-item__bottom">

          <span className="alert-item__timestamp">

            <Clock3 size={12} />

            {formatDateTime(
              alert.createdAt
            )}

          </span>


          {!alert.read && (
            <button
              type="button"
              onClick={() =>
                onMarkRead(
                  alert
                )
              }
              className="alert-item__mark-read"
              data-testid={`alert-mark-read-${alert._id}`}
            >

              <CheckCircle2
                size={14}
              />

              Mark as read

            </button>
          )}


          {alert.read && (
            <span className="alert-item__read">

              <CheckCircle2
                size={14}
              />

              Read

            </span>
          )}

        </div>

      </div>

    </motion.article>
  );
}