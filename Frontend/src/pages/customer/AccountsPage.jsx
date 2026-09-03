import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Plus,
  X,
  Check,
  ArrowRight,
  Loader2,
  WalletCards,
  BriefcaseBusiness,
  ShieldCheck,
  Landmark,
  CreditCard,
  TrendingUp,
  Star,
  Send,
  Download,
  Receipt,
  UserPlus,
  FileText,
  MoreHorizontal,
  ShoppingBag,
  Zap,
  Tv,
  ChevronRight,
  PiggyBank,
  LockKeyhole,
  BarChart3,
  Gift,
  Headphones,
  CircleDollarSign,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Coins,
  Gem,
} from "lucide-react";

import { useApi } from "../../hooks/useApi.js";

import { useToast } from "../../hooks/useToast.js";

import { accountService } from "../../services/accountService.js";

import { premiumService } from "../../services/premiumService.js";
import { ppfService } from "../../services/ppfService.js";
import { rewardService } from "../../services/rewardService.js";
import { apiClient } from "../../services/apiClient.js";

import { Button } from "../../components/common/Button.jsx";

import { ErrorState } from "../../components/common/ErrorState.jsx";

import "./AccountsPage.css";


/* =========================================================
   ACCOUNT TYPES
========================================================= */

const ACCOUNT_TYPES = {
  SAVINGS: {
    title: "Savings",
    subtitle: "Personal banking",
    icon: WalletCards,
    description:
      "For everyday banking, salary credits and secure savings.",
    features: [
      "Daily banking",
      "Interest earning",
      "Easy transfers",
    ],
  },

  CURRENT: {
    title: "Current",
    subtitle: "Business banking",
    icon: BriefcaseBusiness,
    description:
      "For higher transaction volume and business banking.",
    features: [
      "High transactions",
      "Business friendly",
      "Flexible banking",
    ],
  },
};


/* =========================================================
   PREMIUM PLAN
========================================================= */

const PREMIUM_PRICE_PAISE =
  49900;

const PREMIUM_FEATURES = [
  {
    icon: TrendingUp,
    title: "Higher transfer limits",
    description:
      "More flexibility for larger everyday transfers.",
  },

  {
    icon: BarChart3,
    title: "Advanced analytics",
    description:
      "Get deeper insights into your spending behaviour.",
  },

  {
    icon: CreditCard,
    title: "Enhanced card controls",
    description:
      "More control over your NexusBank cards.",
  },

  {
    icon: Headphones,
    title: "Priority support",
    description:
      "Dedicated support when you need assistance.",
  },

  {
    icon: Gift,
    title: "Premium rewards",
    description:
      "Unlock additional rewards and exclusive offers.",
  },

  {
    icon: ShieldCheck,
    title: "Enhanced protection",
    description:
      "Additional security-focused banking controls.",
  },
];


/* =========================================================
   HELPERS
========================================================= */

const formatBalance = (
  paise = 0
) =>
  new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(
    Number(paise || 0) /
      100
  );


const formatNumber = (
  value = 0
) =>
  new Intl.NumberFormat(
    "en-IN"
  ).format(
    Number(value || 0)
  );


const maskAccount = (
  value = ""
) => {
  const digits =
    String(value).replace(
      /\D/g,
      ""
    );

  if (!digits) {
    return "•••• •••• 0000";
  }

  return `•••• •••• ${digits.slice(
    -4
  )}`;
};


const getAccountType = (
  account
) =>
  String(
    account?.accountType ||
      ""
  )
    .trim()
    .toUpperCase();


const getAccountTitle = (
  account,
  index
) => {
  const type =
    getAccountType(account);

  if (account?.label) {
    return account.label;
  }

  if (type === "CURRENT") {
    return "Current Account";
  }

  if (type === "FD") {
    return "Fixed Deposit";
  }

  if (type === "PPF") {
    return "PPF Account";
  }

  return index === 0
    ? "Primary Savings"
    : index === 1
      ? "Salary Account"
      : "Savings Account";
};


const getGradient = (
  index,
  isPrimary
) => {
  if (isPrimary) {
    return "green";
  }

  const tones = [
    "blue",
    "purple",
    "orange",
  ];

  return tones[
    index % tones.length
  ];
};


const transactionAmountPaise = (
  transaction
) =>
  Number(
    transaction?.amountPaise ??
      transaction?.amount ??
      0
  );


const isCreditTransaction = (
  transaction
) =>
  transaction?.type ===
    "DEPOSIT" ||
  transaction?.direction ===
    "CREDIT" ||
  Boolean(
    transaction?.creditLegAccountId
  );


const transactionTitle = (
  transaction
) =>
  transaction?.beneficiary
    ?.name ||
  transaction?.description ||
  (transaction?.type ===
  "DEPOSIT"
    ? "Account credit"
    : transaction?.type ===
        "WITHDRAWAL"
      ? "Cash withdrawal"
      : "Bank transfer");


const transactionCategory = (
  transaction
) =>
  transaction?.category ||
  (transaction?.type ===
  "DEPOSIT"
    ? "Income"
    : transaction?.type ===
        "WITHDRAWAL"
      ? "Cash"
      : "Transfer");


const transactionDate = (
  transaction
) => {
  if (
    !transaction?.createdAt
  ) {
    return "—";
  }

  return new Date(
    transaction.createdAt
  ).toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};


const transactionIcon = (
  transaction
) => {
  const category =
    String(
      transactionCategory(
        transaction
      )
    ).toLowerCase();

  if (
    category.includes(
      "shop"
    ) ||
    category.includes(
      "purchase"
    )
  ) {
    return ShoppingBag;
  }

  if (
    category.includes(
      "food"
    ) ||
    category.includes(
      "dining"
    )
  ) {
    return CircleDollarSign;
  }

  if (
    category.includes(
      "bill"
    ) ||
    category.includes(
      "util"
    )
  ) {
    return Zap;
  }

  if (
    category.includes(
      "entertain"
    )
  ) {
    return Tv;
  }

  if (
    category.includes(
      "transfer"
    )
  ) {
    return Send;
  }

  if (
    category.includes(
      "income"
    ) ||
    transaction?.type ===
      "DEPOSIT"
  ) {
    return Landmark;
  }

  return Receipt;
};


const getSpendingCategory = (
  transaction
) => {
  const raw =
    String(
      transaction?.category ||
        ""
    ).trim();

  if (raw) {
    return raw;
  }

  switch (
    transaction?.type
  ) {
    case "WITHDRAWAL":
      return "Cash";

    case "PAYMENT":
      return "Payments";

    case "TRANSFER":
      return "Transfers";

    default:
      return "Other";
  }
};


/* =========================================================
   SUMMARY ITEM
========================================================= */

function SummaryItem({
  icon,
  tone,
  label,
  value,
  change,
  action,
  onClick,
}) {
  return (
    <motion.div
      className={`summary-item summary-item--${tone}`}
      whileHover={{
        y: -3,
      }}
      onClick={onClick}
    >
      <div
        className={`summary-item__icon summary-item__icon--${tone}`}
      >
        {icon}
      </div>

      <div className="summary-item__content">
        <div className="summary-item__label">
          <span>
            {label}
          </span>

          {action}
        </div>

        <strong>
          {value}
        </strong>

        <small>
          <TrendingUp
            size={11}
          />

          {change}
        </small>
      </div>
    </motion.div>
  );
}


/* =========================================================
   ACCOUNT CARD
========================================================= */

function CompactAccountCard({
  account,
  index,
  onTransfer,
  onStatement,
  onCopy,
  onMakePrimary,
  primaryBusy,
  hideBalance,
}) {
  const gradient =
    getGradient(
      index,
      account.isPrimary
    );

  const balance =
    Number(
      account.availableBalancePaise ??
        account.balancePaise ??
        0
    );

  const title =
    getAccountTitle(
      account,
      index
    );

  const type =
    getAccountType(
      account
    );

  const isFrozen =
    account.status !==
    "ACTIVE";

  let AccountIcon =
    WalletCards;

  if (
    type === "CURRENT"
  ) {
    AccountIcon =
      BriefcaseBusiness;
  }

  if (type === "FD") {
    AccountIcon =
      PiggyBank;
  }

  if (type === "PPF") {
    AccountIcon =
      Gem;
  }

  return (
    <motion.article
      className={`compact-account-card compact-account-card--${gradient} ${
        account.isPrimary
          ? "is-primary"
          : ""
      }`}
      layout
      initial={{
        opacity: 0,
        y: 18,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        scale: 0.96,
      }}
      transition={{
        duration: 0.35,
        delay:
          index * 0.04,
      }}
      whileHover={{
        y: -7,
        scale: 1.012,
      }}
    >
      <div className="compact-account-card__glow" />

      <div className="compact-account-card__top">
        <div>
          <span className="compact-account-card__type">
            {type ||
              "ACCOUNT"}{" "}
            ACCOUNT
          </span>

          <h3>
            {title}
          </h3>
        </div>

        {account.isPrimary ? (
          <span className="compact-primary">
            <Star
              size={11}
              fill="currentColor"
            />

            PRIMARY
          </span>
        ) : (
          <motion.div
            className="compact-account-card__type-icon"
            whileHover={{
              rotate: 8,
              scale: 1.08,
            }}
          >
            <AccountIcon
              size={16}
            />
          </motion.div>
        )}
      </div>

      <div className="compact-account-number">
        {maskAccount(
          account.accountNumber
        )}
      </div>

      <div className="compact-account-card__balance">
        <span>
          {type === "FD"
            ? "Current Value"
            : type === "PPF"
              ? "Current Value"
              : "Available Balance"}
        </span>

        <strong>
          {hideBalance
            ? "••••••"
            : formatBalance(
                balance
              )}
        </strong>
      </div>

      <motion.div
        className="account-card-live-line"
        initial={{
          scaleX: 0.25,
          opacity: 0.25,
        }}
        animate={{
          scaleX: [
            0.25,
            1,
            0.45,
          ],
          opacity: [
            0.25,
            0.8,
            0.3,
          ],
        }}
        transition={{
          duration: 3.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="compact-account-card__bottom">
        <div className="compact-status">
          <i
            className={
              isFrozen
                ? "is-frozen"
                : ""
            }
          />

          {isFrozen
            ? "Restricted"
            : "Active"}
        </div>

        <button
          type="button"
          onClick={() =>
            onTransfer?.(
              account
            )
          }
        >
          View Details

          <ArrowRight
            size={14}
          />
        </button>
      </div>

      <div className="compact-account-card__hover-actions">
        <button
          type="button"
          onClick={() =>
            onTransfer?.(
              account
            )
          }
        >
          Transfer
        </button>

        <button
          type="button"
          onClick={() =>
            onStatement?.(
              account
            )
          }
        >
          Statement
        </button>

        <button
          type="button"
          onClick={() =>
            onCopy?.(
              account.accountNumber
            )
          }
        >
          Copy
        </button>

        {!account.isPrimary &&
          !isFrozen && (
            <button
              type="button"
              disabled={
                primaryBusy
              }
              onClick={() =>
                onMakePrimary?.(
                  account
                )
              }
            >
              {primaryBusy
                ? "Updating..."
                : "Make Primary"}
            </button>
          )}
      </div>
    </motion.article>
  );
}


/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  icon,
  title,
  tone,
  onClick,
}) {
  return (
    <motion.button
      type="button"
      className={`quick-action quick-action--${tone}`}
      onClick={onClick}
      whileHover={{
        y: -5,
        scale: 1.015,
      }}
      whileTap={{
        scale: 0.97,
      }}
    >
      <span
        className={`quick-action__icon ${tone}`}
      >
        {icon}
      </span>

      <strong>
        {title}
      </strong>

      <ArrowRight
        size={13}
        className="quick-action__arrow"
      />
    </motion.button>
  );
}


/* =========================================================
   RECENT TRANSACTIONS
========================================================= */

function RecentTransactions({
  transactions = [],
  loading,
  error,
  onViewAll,
}) {
  return (
    <motion.div
      className="dashboard-panel transactions-panel accounts-real-panel"
      initial={{
        opacity: 0,
        x: -15,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      viewport={{
        once: true,
      }}
    >
      <div className="panel-heading accounts-real-heading">
        <div>
          <span className="accounts-panel-kicker">
            LIVE ACCOUNT ACTIVITY
          </span>

          <h3>
            Recent Transactions
          </h3>
        </div>

        <button
          type="button"
          onClick={
            onViewAll
          }
        >
          View All

          <ArrowRight
            size={13}
          />
        </button>
      </div>

      {error && (
        <div className="accounts-real-error">
          <RefreshCw
            size={17}
          />

          <span>
            {error}
          </span>
        </div>
      )}

      <div className="transaction-list accounts-real-transactions">
        {loading ? (
          Array.from({
            length: 5,
          }).map(
            (_, index) => (
              <motion.div
                className="accounts-tx-skeleton"
                key={index}
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                transition={{
                  delay:
                    index * 0.05,
                }}
              />
            )
          )
        ) : transactions.length ===
          0 ? (
          <div className="accounts-real-empty">
            <div className="accounts-real-empty__icon">
              <Receipt
                size={21}
              />
            </div>

            <strong>
              No transactions yet
            </strong>

            <span>
              Your latest banking
              activity will appear
              here after you make
              a transaction.
            </span>

            <button
              type="button"
              onClick={
                onViewAll
              }
            >
              Open transaction history

              <ArrowRight
                size={13}
              />
            </button>
          </div>
        ) : (
          transactions.map(
            (
              transaction,
              index
            ) => {
              const credit =
                isCreditTransaction(
                  transaction
                );

              const Icon =
                transactionIcon(
                  transaction
                );

              const amount =
                transactionAmountPaise(
                  transaction
                );

              return (
                <motion.div
                  className="transaction-row accounts-real-transaction"
                  key={
                    transaction?._id ||
                    `${transaction?.createdAt}-${index}`
                  }
                  initial={{
                    opacity: 0,
                    x: -8,
                  }}
                  whileInView={{
                    opacity: 1,
                    x: 0,
                  }}
                  viewport={{
                    once: true,
                  }}
                  transition={{
                    delay:
                      index *
                      0.055,
                  }}
                  whileHover={{
                    x: 4,
                  }}
                >
                  <div
                    className={`transaction-icon ${
                      credit
                        ? "green"
                        : "blue"
                    }`}
                  >
                    <Icon
                      size={16}
                    />
                  </div>

                  <div className="transaction-info">
                    <strong>
                      {transactionTitle(
                        transaction
                      )}
                    </strong>

                    <span>
                      {transactionCategory(
                        transaction
                      )}
                    </span>
                  </div>

                  <div className="transaction-amount">
                    <strong
                      className={
                        credit
                          ? "positive"
                          : ""
                      }
                    >
                      {credit
                        ? "+ "
                        : "- "}

                      {formatBalance(
                        amount
                      )}
                    </strong>

                    <span>
                      {transactionDate(
                        transaction
                      )}
                    </span>
                  </div>

                  <ChevronRight
                    size={15}
                    className="transaction-chevron"
                  />
                </motion.div>
              );
            }
          )
        )}
      </div>

      <button
        className="panel-bottom-button"
        type="button"
        onClick={
          onViewAll
        }
      >
        View All Transactions

        <ArrowRight
          size={14}
        />
      </button>
    </motion.div>
  );
}


/* =========================================================
   SPENDING OVERVIEW
========================================================= */

function SpendingOverview({
  spending,
  loading,
  period,
  onPeriodChange,
  onReport,
}) {
  const maxPercentage =
    Math.max(
      ...(spending.items ||
        []).map(
        (item) =>
          item.percentage
      ),
      1
    );

  return (
    <motion.div
      className="dashboard-panel spending-panel accounts-real-panel accounts-spending-premium"
      initial={{
        opacity: 0,
        x: 15,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      viewport={{
        once: true,
      }}
    >
      <div className="panel-heading accounts-real-heading">
        <div>
          <h3>
            Spending Overview
          </h3>
        </div>

        <select
          className="accounts-spending-select"
          value={period}
          onChange={(
            event
          ) =>
            onPeriodChange(
              event.target
                .value
            )
          }
        >
          <option value="7">
            7 Days
          </option>

          <option value="30">
            30 Days
          </option>

          <option value="90">
            90 Days
          </option>
        </select>
      </div>

      {loading ? (
        <div className="accounts-spending-loading">
          <motion.div
            className="accounts-spending-ring-skeleton"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          <div className="accounts-spending-lines">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      ) : spending.total ===
        0 ? (
        <div className="accounts-spending-empty">
          <motion.div
            className="accounts-spending-empty-icon"
            animate={{
              y: [
                0,
                -5,
                0,
              ],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
            }}
          >
            <PiggyBank
              size={22}
            />
          </motion.div>

          <strong>
            No completed spending yet
          </strong>

          <span>
            Once you make completed
            payments, your real
            spending breakdown will
            appear here.
          </span>
        </div>
      ) : (
        <>
          <div className="accounts-spending-total">
            <motion.div
              className="accounts-spending-ring"
              initial={{
                rotate: -90,
                scale: 0.8,
              }}
              animate={{
                rotate: 0,
                scale: 1,
              }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
              }}
            >
              <motion.div
                className="accounts-spending-ring-inner"
                initial={{
                  scale: 0.7,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                transition={{
                  delay: 0.25,
                }}
              >
                <strong>
                  {formatBalance(
                    spending.total
                  )}
                </strong>

                <span>
                  spent
                </span>
              </motion.div>
            </motion.div>

            <div className="accounts-spending-total-copy">
              <span>
                COMPLETED EXPENSES
              </span>

              <strong>
                {spending.count}
              </strong>

              <small>
                transactions in selected
                period
              </small>
            </div>
          </div>

          <div className="accounts-spending-list">
            {spending.items.map(
              (
                item,
                index
              ) => {
                const normalized =
                  Math.max(
                    5,
                    Math.round(
                      (item.percentage /
                        maxPercentage) *
                        100
                    )
                  );

                return (
                  <motion.div
                    className="accounts-spending-item"
                    key={
                      item.label
                    }
                    initial={{
                      opacity: 0,
                      x: 12,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay:
                        index *
                        0.08,
                    }}
                  >
                    <div className="accounts-spending-item__top">
                      <span>
                        <i
                          className={`spending-dot spending-dot--${index}`}
                        />

                        {item.label}
                      </span>

                      <strong>
                        {item.percentage}%
                      </strong>

                      <small>
                        {formatBalance(
                          item.amount
                        )}
                      </small>
                    </div>

                    <div className="accounts-spending-bar">
                      <motion.i
                        initial={{
                          width: 0,
                        }}
                        animate={{
                          width: `${normalized}%`,
                        }}
                        transition={{
                          duration: 0.85,
                          delay:
                            index *
                            0.08,
                          ease:
                            "easeOut",
                        }}
                      />
                    </div>
                  </motion.div>
                );
              }
            )}
          </div>
        </>
      )}

      <button
        className="panel-bottom-button"
        type="button"
        onClick={
          onReport
        }
      >
        View Full Report

        <ArrowRight
          size={14}
        />
      </button>
    </motion.div>
  );
}


/* =========================================================
   SMART INSIGHTS
========================================================= */

function SmartInsights({
  cashFlow,
  spending,
  onView,
}) {
  const net =
    cashFlow.income -
    cashFlow.expense;

  const topCategory =
    spending.items?.[0];

  return (
    <motion.div
      className="smart-insight-card"
      initial={{
        opacity: 0,
        y: 14,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
      }}
      whileHover={{
        y: -3,
      }}
    >
      <motion.div
        className="smart-insight-card__orb"
        animate={{
          y: [
            0,
            -5,
            0,
          ],
          rotate: [
            0,
            4,
            0,
          ],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
        }}
      >
        <TrendingUp
          size={22}
        />
      </motion.div>

      <div className="smart-insight-card__copy">
        <span>
          SMART INSIGHT
        </span>

        <h3>
          {net >= 0
            ? "Your cash flow is positive."
            : "Your expenses are ahead this month."}
        </h3>

        <p>
          {topCategory
            ? `${topCategory.label} is your largest spending category at ${formatBalance(
                topCategory.amount
              )}.`
            : "Complete a few transactions and NexusBank will generate personalised spending insights."}
        </p>
      </div>

      <div className="smart-insight-card__metric">
        <span>
          NET THIS MONTH
        </span>

        <strong
          className={
            net >= 0
              ? "is-positive"
              : "is-negative"
          }
        >
          {net >= 0
            ? "+ "
            : "- "}

          {formatBalance(
            Math.abs(net)
          )}
        </strong>
      </div>

      <button
        type="button"
        onClick={
          onView
        }
      >
        View Insights

        <ArrowRight
          size={14}
        />
      </button>
    </motion.div>
  );
}


/* =========================================================
   PREMIUM BENEFITS GRID
========================================================= */

function PremiumBenefitsGrid() {
  return (
    <div className="premium-benefits-grid">
      {PREMIUM_FEATURES.map(
        ({
          icon: Icon,
          title,
          description,
        }) => (
          <motion.div
            key={title}
            className="premium-benefit-card"
            whileHover={{
              y: -3,
              scale: 1.01,
            }}
          >
            <div className="premium-benefit-card__icon">
              <Icon
                size={17}
              />
            </div>

            <div>
              <strong>
                {title}
              </strong>

              <span>
                {description}
              </span>
            </div>
          </motion.div>
        )
      )}
    </div>
  );
}


/* =========================================================
   PREMIUM UPGRADE
========================================================= */

function PremiumUpgrade({
  active,
  loading,
  open,
  onOpen,
  onClose,
}) {
  return (
    <>
      <motion.section
        className={`accounts-upgrade ${
          active
            ? "is-active"
            : ""
        }`}
        initial={{
          opacity: 0,
          y: 20,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        viewport={{
          once: true,
        }}
        whileHover={{
          y: -3,
        }}
      >
        <div className="accounts-upgrade__glow" />

        <div className="accounts-upgrade__visual">
          <motion.div
            className="premium-diamond"
            animate={{
              y: [
                0,
                -5,
                0,
              ],
              rotate: [
                0,
                4,
                0,
              ],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
            }}
          >
            <span />
            <span />
            <span />
            <span />
          </motion.div>

          <motion.div
            className="premium-spark premium-spark--one"
            animate={{
              opacity: [
                0.3,
                1,
                0.3,
              ],
              scale: [
                0.8,
                1.2,
                0.8,
              ],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
            }}
          >
            ✦
          </motion.div>

          <motion.div
            className="premium-spark premium-spark--two"
            animate={{
              opacity: [
                1,
                0.3,
                1,
              ],
              scale: [
                1,
                0.8,
                1,
              ],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
            }}
          >
            ✧
          </motion.div>
        </div>

        <div className="accounts-upgrade__copy">
          <span className="accounts-upgrade__eyebrow">
            {active
              ? "PREMIUM ACTIVE"
              : "NEXUSBANK PREMIUM"}
          </span>

          <h2>
            {active
              ? "Premium is already unlocked."
              : "Upgrade your banking experience."}
          </h2>

          <p>
            {active
              ? "Your premium membership is active. Enjoy your enhanced NexusBank benefits."
              : "Unlock higher limits, advanced analytics, premium rewards and priority support."}
          </p>

          <div className="accounts-upgrade__chips">
            {[
              "Higher limits",
              "Advanced analytics",
              "Priority support",
              "Premium rewards",
            ].map(
              (feature) => (
                <span
                  key={feature}
                >
                  <Check
                    size={12}
                  />

                  {feature}
                </span>
              )
            )}
          </div>
        </div>

        <div className="accounts-upgrade__price">
          <span>
            {active
              ? "MEMBERSHIP"
              : "ANNUAL PLAN"}
          </span>

          <strong>
            {active
              ? "ACTIVE"
              : "₹499"}
          </strong>

          {!active && (
            <small>
              / year
            </small>
          )}
        </div>

        <motion.button
          type="button"
          className="accounts-upgrade__button"
          onClick={
            onOpen
          }
          disabled={
            loading
          }
          whileHover={{
            scale: 1.04,
          }}
          whileTap={{
            scale: 0.97,
          }}
        >
          {active
            ? "View Benefits"
            : "Upgrade Now"}

          <ArrowRight
            size={16}
          />
        </motion.button>
      </motion.section>

      <AnimatePresence>
        {open && (
          <PremiumCheckoutModal
            active={active}
            onClose={
              onClose
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}


/* =========================================================
   PREMIUM CHECKOUT MODAL
   PORTALED TO BODY
   BENEFITS ALWAYS VISIBLE
========================================================= */

function PremiumCheckoutModal({
  active,
  onClose,
}) {
  const accounts =
    useApi(
      () =>
        accountService.list(),
      []
    );

  const toast =
    useToast();

  const [
    selectedAccountId,
    setSelectedAccountId,
  ] = useState("");

  const [
    paying,
    setPaying,
  ] = useState(false);

  const accountList =
    Array.isArray(
      accounts.data
    )
      ? accounts.data
      : [];

  useEffect(() => {
    if (
      selectedAccountId ||
      !accountList.length
    ) {
      return;
    }

    const primary =
      accountList.find(
        (account) =>
          account.isPrimary &&
          account.status ===
            "ACTIVE"
      ) ||
      accountList.find(
        (account) =>
          account.status ===
          "ACTIVE"
      );

    if (primary) {
      setSelectedAccountId(
        primary._id
      );
    }
  }, [
    accountList,
    selectedAccountId,
  ]);

  const selectedAccount =
    accountList.find(
      (account) =>
        account._id ===
        selectedAccountId
    );

  const balance =
    Number(
      selectedAccount?.availableBalancePaise ??
        selectedAccount?.balancePaise ??
        0
    );

  const after =
    balance -
    PREMIUM_PRICE_PAISE;

  const sufficient =
    balance >=
    PREMIUM_PRICE_PAISE;

  const handlePay =
    async () => {
      if (
        !selectedAccountId
      ) {
        toast.error(
          "Select a payment account."
        );

        return;
      }

      if (!sufficient) {
        toast.error(
          "Insufficient available balance."
        );

        return;
      }

      setPaying(true);

      try {
        const result =
          await premiumService.upgrade(
            selectedAccountId
          );

        toast.success(
          result?.message ||
            "Premium activated successfully."
        );

        onClose();

        window.setTimeout(
          () =>
            window.location.reload(),
          250
        );
      } catch (error) {
        toast.error(
          error?.message ||
            "Premium payment failed."
        );
      } finally {
        setPaying(false);
      }
    };


  const modalContent = (
    <motion.div
      className="premium-checkout-backdrop"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      onClick={
        onClose
      }
    >
      <motion.div
        className="premium-checkout-modal"
        initial={{
          opacity: 0,
          y: 25,
          scale: 0.97,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 15,
          scale: 0.98,
        }}
        transition={{
          duration: 0.3,
        }}
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="nexus-premium-title"
      >
        <div className="premium-checkout__ambient" />

        <button
          type="button"
          className="premium-checkout__close"
          onClick={
            onClose
          }
          aria-label="Close premium dialog"
        >
          <X size={18} />
        </button>

        <div className="premium-checkout__hero">
          <div className="premium-checkout__icon">
            <Gift
              size={25}
            />
          </div>

          <div>
            <span>
              NEXUSBANK PREMIUM
            </span>

            <h2 id="nexus-premium-title">
              {active
                ? "Your Premium Benefits"
                : "Upgrade to Premium"}
            </h2>

            <p>
              {active
                ? "Your membership is already active. Everything below is unlocked for you."
                : "Review everything you get before confirming your payment."}
            </p>
          </div>
        </div>


        {/* =====================================================
            PREMIUM BENEFITS — ALWAYS VISIBLE
        ====================================================== */}

        <PremiumBenefitsGrid />


        {/* =====================================================
            ACTIVE PREMIUM
        ====================================================== */}

        {active ? (
          <div className="premium-active-state">
            <div className="premium-active-state__icon">
              <Check
                size={26}
              />
            </div>

            <strong>
              Premium membership active
            </strong>

            <span>
              You already have access to
              all the premium banking
              benefits shown above.
            </span>

            <button
              type="button"
              onClick={
                onClose
              }
            >
              Done

              <ArrowRight
                size={14}
              />
            </button>
          </div>
        ) : (
          <>
            {/* =================================================
                PAYMENT ACCOUNT
            ================================================== */}

            <div className="premium-payment-section">
              <div className="premium-payment-section__heading">
                <div>
                  <span>
                    PAYMENT ACCOUNT
                  </span>

                  <strong>
                    Choose where ₹499 will
                    be debited
                  </strong>
                </div>

                <LockKeyhole
                  size={18}
                />
              </div>

              <div className="premium-account-options">
                {accountList
                  .filter(
                    (account) =>
                      account.status ===
                      "ACTIVE"
                  )
                  .map(
                    (account) => {
                      const available =
                        Number(
                          account.availableBalancePaise ??
                            account.balancePaise ??
                            0
                        );

                      const selected =
                        selectedAccountId ===
                        account._id;

                      return (
                        <button
                          key={
                            account._id
                          }
                          type="button"
                          className={`premium-account-option ${
                            selected
                              ? "is-selected"
                              : ""
                          }`}
                          onClick={() =>
                            setSelectedAccountId(
                              account._id
                            )
                          }
                        >
                          <div className="premium-account-option__radio">
                            {selected && (
                              <span />
                            )}
                          </div>

                          <div className="premium-account-option__icon">
                            {getAccountType(
                              account
                            ) ===
                            "CURRENT" ? (
                              <BriefcaseBusiness
                                size={17}
                              />
                            ) : (
                              <WalletCards
                                size={17}
                              />
                            )}
                          </div>

                          <div className="premium-account-option__copy">
                            <strong>
                              {account.label ||
                                (getAccountType(
                                  account
                                ) ===
                                "CURRENT"
                                  ? "Current Account"
                                  : "Savings Account")}
                            </strong>

                            <span>
                              {maskAccount(
                                account.accountNumber
                              )}
                            </span>
                          </div>

                          <div className="premium-account-option__balance">
                            <span>
                              Available
                            </span>

                            <strong>
                              {formatBalance(
                                available
                              )}
                            </strong>
                          </div>
                        </button>
                      );
                    }
                  )}
              </div>
            </div>


            {/* =================================================
                PAYMENT SUMMARY
            ================================================== */}

            <div className="premium-payment-summary">
              <div>
                <span>
                  Current balance
                </span>

                <strong>
                  {formatBalance(
                    balance
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Premium membership
                </span>

                <strong>
                  ₹499.00
                </strong>
              </div>

              <div className="premium-payment-summary__after">
                <span>
                  Balance after payment
                </span>

                <strong
                  className={
                    after >= 0
                      ? ""
                      : "is-danger"
                  }
                >
                  {after >= 0
                    ? formatBalance(
                        after
                      )
                    : "Insufficient balance"}
                </strong>
              </div>
            </div>


            {!sufficient &&
              selectedAccount && (
                <div className="premium-payment-error">
                  <ShieldCheck
                    size={16}
                  />

                  <span>
                    You need at least
                    ₹499 available in
                    this account to
                    continue.
                  </span>
                </div>
              )}


            <div className="premium-secure-note">
              <ShieldCheck
                size={15}
              />

              <span>
                Secure bank payment ·
                ₹499 is debited only after
                you confirm the upgrade.
              </span>
            </div>


            {/* =================================================
                PAYMENT ACTIONS
            ================================================== */}

            <div className="premium-checkout__actions">
              <button
                type="button"
                className="premium-checkout__cancel"
                onClick={
                  onClose
                }
                disabled={
                  paying
                }
              >
                Cancel
              </button>

              <motion.button
                type="button"
                className="premium-checkout__pay"
                onClick={
                  handlePay
                }
                disabled={
                  paying ||
                  !selectedAccountId ||
                  !sufficient
                }
                whileHover={
                  !paying &&
                  sufficient
                    ? {
                        y: -2,
                      }
                    : {}
                }
                whileTap={
                  !paying &&
                  sufficient
                    ? {
                        scale: 0.98,
                      }
                    : {}
                }
              >
                {paying ? (
                  <>
                    <Loader2
                      size={17}
                      className="accounts-spin"
                    />

                    Processing payment...
                  </>
                ) : (
                  <>
                    Confirm & Upgrade

                    <ArrowRight
                      size={17}
                    />
                  </>
                )}
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );


  /*
    IMPORTANT:
    accounts-page is intentionally kept on the portal wrapper.
    Existing AccountsPage.css is scoped like:

      .accounts-page .account-modal
      .accounts-page .account-modal__header
      .accounts-page .account-type-card
      .accounts-page .premium-checkout-modal

    Therefore the existing modal design remains intact.
  */

  return createPortal(
    <div
      className="accounts-modal-portal accounts-page"
      data-modal="premium"
    >
      {modalContent}
    </div>,
    document.body
  );
}


/* =========================================================
   OPEN ACCOUNT MODAL
   PORTALED TO BODY
========================================================= */

function OpenAccountModal({
  onClose,
  onCreated,
}) {
  const toast =
    useToast();

  const [
    accountType,
    setAccountType,
  ] = useState(
    "SAVINGS"
  );

  const [
    label,
    setLabel,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    success,
    setSuccess,
  ] = useState(null);

  const selected =
    ACCOUNT_TYPES[
      accountType
    ];

  const SelectedIcon =
    selected.icon;

  const submit =
    async (event) => {
      event.preventDefault();

      setLoading(true);

      try {
        const result =
          await accountService.create(
            {
              accountType,
              label:
                label.trim() ||
                null,
            }
          );

        setSuccess(
          result?.data ||
            result
        );
      } catch (error) {
        toast.error(
          error?.message ||
            "Unable to open account."
        );
      } finally {
        setLoading(false);
      }
    };


  const modalContent = (
    <motion.div
      className="account-modal__backdrop"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      onClick={
        onClose
      }
      role="presentation"
    >
      <motion.div
        className="account-modal"
        initial={{
          opacity: 0,
          y: 25,
          scale: 0.97,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 15,
          scale: 0.98,
        }}
        transition={{
          duration: 0.3,
        }}
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-account-title"
      >
        <div className="account-modal__glow" />

        <button
          type="button"
          className="account-modal__close"
          onClick={
            onClose
          }
          disabled={
            loading
          }
          aria-label="Close account dialog"
        >
          <X size={19} />
        </button>

        {!success ? (
          <>
            <header className="account-modal__header">
              <div className="account-modal__icon">
                <SelectedIcon
                  size={23}
                />
              </div>

              <div>
                <span className="account-modal__eyebrow">
                  <Sparkles
                    size={12}
                  />

                  NEW ACCOUNT
                </span>

                <h2 id="open-account-title">
                  Open an account
                </h2>

                <p>
                  Choose the account that
                  fits your banking needs.
                </p>
              </div>
            </header>


            <form
              onSubmit={
                submit
              }
              className="account-modal__form"
            >
              {/* =============================================
                  ACCOUNT TYPE
              ============================================== */}

              <div className="account-modal__section">
                <div className="account-modal__section-heading">
                  <span>
                    01
                  </span>

                  <div>
                    <strong>
                      Choose account type
                    </strong>

                    <small>
                      Select the account
                      you want to open.
                    </small>
                  </div>
                </div>

                <div className="account-type-grid">
                  {Object.entries(
                    ACCOUNT_TYPES
                  ).map(
                    ([
                      type,
                      config,
                    ]) => {
                      const Icon =
                        config.icon;

                      const active =
                        accountType ===
                        type;

                      return (
                        <motion.button
                          key={type}
                          type="button"
                          className={`account-type-card ${
                            active
                              ? "is-selected"
                              : ""
                          }`}
                          onClick={() =>
                            setAccountType(
                              type
                            )
                          }
                          whileHover={{
                            y: -3,
                          }}
                          whileTap={{
                            scale: 0.985,
                          }}
                        >
                          {active && (
                            <motion.div
                              className="account-type-card__check"
                              initial={{
                                scale: 0,
                                rotate:
                                  -30,
                              }}
                              animate={{
                                scale: 1,
                                rotate: 0,
                              }}
                            >
                              <Check
                                size={13}
                              />
                            </motion.div>
                          )}

                          <div className="account-type-card__icon">
                            <Icon
                              size={22}
                            />
                          </div>

                          <strong>
                            {
                              config.title
                            }
                          </strong>

                          <span>
                            {
                              config.subtitle
                            }
                          </span>

                          <small>
                            {
                              config.description
                            }
                          </small>
                        </motion.button>
                      );
                    }
                  )}
                </div>
              </div>


              {/* =============================================
                  ACCOUNT NAME
              ============================================== */}

              <div className="account-modal__section">
                <div className="account-modal__section-heading">
                  <span>
                    02
                  </span>

                  <div>
                    <strong>
                      Give it a name
                    </strong>

                    <small>
                      Optional nickname
                      for your account.
                    </small>
                  </div>
                </div>

                <div className="account-label-input">
                  <input
                    value={
                      label
                    }
                    onChange={(
                      event
                    ) =>
                      setLabel(
                        event.target
                          .value
                      )
                    }
                    maxLength={60}
                    placeholder={
                      accountType ===
                      "SAVINGS"
                        ? "e.g. Salary Savings"
                        : "e.g. Business Account"
                    }
                    disabled={
                      loading
                    }
                  />

                  <span>
                    {label.length}
                    /60
                  </span>
                </div>
              </div>


              {/* =============================================
                  PREVIEW CARD
              ============================================== */}

              <div className="account-preview">
                <div className="account-preview__glow" />

                <div className="account-preview__top">
                  <div className="account-preview__brand">
                    <div className="account-preview__logo">
                      N
                    </div>

                    <div>
                      <small>
                        NEXUSBANK
                      </small>

                      <strong>
                        {label.trim() ||
                          selected.title}
                      </strong>
                    </div>
                  </div>

                  <ShieldCheck
                    size={19}
                  />
                </div>

                <div className="account-preview__bottom">
                  <div>
                    <small>
                      ACCOUNT NUMBER
                    </small>

                    <strong>
                      •••• •••• ••••
                      XXXX
                    </strong>
                  </div>

                  <div>
                    <small>
                      BALANCE
                    </small>

                    <strong>
                      ₹0.00
                    </strong>
                  </div>
                </div>
              </div>


              {/* =============================================
                  SECURITY
              ============================================== */}

              <div className="account-modal__security">
                <ShieldCheck
                  size={17}
                />

                <div>
                  <strong>
                    Your account is
                    protected
                  </strong>

                  <span>
                    Secure authentication
                    and audit logging
                    protect your banking
                    activity.
                  </span>
                </div>
              </div>


              {/* =============================================
                  FOOTER
              ============================================== */}

              <div className="account-modal__footer">
                <button
                  type="button"
                  onClick={
                    onClose
                  }
                  disabled={
                    loading
                  }
                >
                  Cancel
                </button>

                <motion.button
                  type="submit"
                  disabled={
                    loading
                  }
                  whileHover={
                    !loading
                      ? {
                          y: -2,
                        }
                      : {}
                  }
                  whileTap={
                    !loading
                      ? {
                          scale: 0.98,
                        }
                      : {}
                  }
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={16}
                        className="accounts-spin"
                      />

                      Opening account...
                    </>
                  ) : (
                    <>
                      Open{" "}
                      {
                        selected.title
                      }{" "}
                      account

                      <ArrowRight
                        size={16}
                      />
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </>
        ) : (
          /* ===============================================
             SUCCESS STATE
          ================================================ */

          <div className="account-success">
            <motion.div
              className="account-success__icon"
              initial={{
                scale: 0,
              }}
              animate={{
                scale: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 220,
              }}
            >
              <Check
                size={30}
              />
            </motion.div>

            <span className="account-modal__eyebrow">
              ACCOUNT CREATED
            </span>

            <h2>
              Your account is ready.
            </h2>

            <p>
              Your new NexusBank{" "}
              {selected.title.toLowerCase()}{" "}
              account has been created
              successfully.
            </p>

            <div className="account-success__details">
              <div>
                <span>
                  Account type
                </span>

                <strong>
                  {selected.title}
                </strong>
              </div>

              <div>
                <span>
                  Account number
                </span>

                <strong>
                  {maskAccount(
                    success?.accountNumber
                  )}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={
                onCreated
              }
              className="account-success__button"
            >
              Continue to My Accounts

              <ArrowRight
                size={16}
              />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );


  /*
    IMPORTANT:
    Keep accounts-page on the portal wrapper so all
    existing AccountsPage.css scoped selectors continue
    working after the modal moves to document.body.
  */

  return createPortal(
    <div
      className="accounts-modal-portal accounts-page"
      data-modal="open-account"
    >
      {modalContent}
    </div>,
    document.body
  );
}


/* =========================================================
   SERVICE MODAL
========================================================= */

function ServiceModal({
  title,
  icon,
  description,
  actions = [],
  serviceGrid = [],
}) {
  return (
    <motion.div
      className="accounts-service-backdrop"
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
      <motion.div
        className="accounts-service-modal"
        initial={{
          opacity: 0,
          y: 20,
          scale: 0.97,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 10,
        }}
      >
        <div className="accounts-service-modal__icon">
          {icon}
        </div>

        <span className="accounts-panel-kicker">
          NEXUSBANK SERVICE
        </span>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

        {serviceGrid.length >
          0 && (
          <div className="accounts-service-grid">
            {serviceGrid.map(
              (service) => (
                <button
                  type="button"
                  key={
                    service.title
                  }
                  onClick={
                    service.onClick
                  }
                >
                  <span>
                    {
                      service.icon
                    }
                  </span>

                  <strong>
                    {
                      service.title
                    }
                  </strong>

                  <ArrowRight
                    size={13}
                  />
                </button>
              )
            )}
          </div>
        )}

        <div className="accounts-service-actions">
          {actions.map(
            (action) => (
              <button
                key={
                  action.label
                }
                type="button"
                className={
                  action.secondary
                    ? "is-secondary"
                    : ""
                }
                onClick={
                  action.onClick
                }
              >
                {action.icon}

                {action.label}
              </button>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}


/* =========================================================
   QUICK ACTIONS ROCKET VISUAL
========================================================= */

function QuickActionsRocket() {
  return (
    <motion.div
      className="quick-rocket"
      animate={{
        y: [
          0,
          -8,
          0,
        ],
        rotate: [
          -2,
          2,
          -2,
        ],
      }}
      transition={{
        duration: 3.8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.span
        className="quick-rocket__coin quick-rocket__coin--one"
        animate={{
          y: [
            0,
            -13,
            0,
          ],
          x: [
            0,
            5,
            0,
          ],
          rotate: [
            0,
            180,
            360,
          ],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        ₹
      </motion.span>

      <motion.span
        className="quick-rocket__coin quick-rocket__coin--two"
        animate={{
          y: [
            0,
            10,
            0,
          ],
          x: [
            0,
            -4,
            0,
          ],
          rotate: [
            0,
            -180,
            -360,
          ],
        }}
        transition={{
          duration: 4.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Coins
          size={12}
        />
      </motion.span>

      <div className="quick-rocket__body">
        <span className="quick-rocket__window" />

        <span className="quick-rocket__fin quick-rocket__fin--left" />

        <span className="quick-rocket__fin quick-rocket__fin--right" />
      </div>

      <motion.div
        className="quick-rocket__flame"
        animate={{
          scaleY: [
            0.7,
            1.25,
            0.8,
          ],
          opacity: [
            0.55,
            1,
            0.6,
          ],
        }}
        transition={{
          duration: 0.65,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <span className="quick-rocket__spark quick-rocket__spark--one">
        ✦
      </span>

      <span className="quick-rocket__spark quick-rocket__spark--two">
        ✧
      </span>

      <span className="quick-rocket__spark quick-rocket__spark--three">
        •
      </span>
    </motion.div>
  );
}


/* =========================================================
   ANIMATED MONEY WALLET VISUAL
========================================================= */

function AnimatedMoneyWallet() {
  return (
    <motion.div
      className="money-wallet"
      animate={{
        y: [
          0,
          -8,
          0,
        ],
      }}
      transition={{
        duration: 4.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.div
        className="money-wallet__coin money-wallet__coin--one"
        animate={{
          y: [
            0,
            -24,
            0,
          ],
          rotate: [
            0,
            240,
            360,
          ],
        }}
        transition={{
          duration: 3.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        ₹
      </motion.div>

      <motion.div
        className="money-wallet__coin money-wallet__coin--two"
        animate={{
          y: [
            0,
            17,
            0,
          ],
          x: [
            0,
            7,
            0,
          ],
          rotate: [
            0,
            -180,
            -360,
          ],
        }}
        transition={{
          duration: 4.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        ₹
      </motion.div>

      <motion.div
        className="money-wallet__coin money-wallet__coin--three"
        animate={{
          y: [
            0,
            -13,
            0,
          ],
          x: [
            0,
            -8,
            0,
          ],
          rotate: [
            0,
            180,
            360,
          ],
        }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Coins
          size={13}
        />
      </motion.div>

      <div className="money-wallet__glow" />

      <div className="money-wallet__card money-wallet__card--back" />

      <div className="money-wallet__note">
        <span>
          ₹
        </span>
      </div>

      <div className="money-wallet__body">
        <div className="money-wallet__clasp" />

        <div className="money-wallet__shine" />
      </div>

      <motion.span
        className="money-wallet__spark money-wallet__spark--one"
        animate={{
          opacity: [
            0.2,
            1,
            0.2,
          ],
          scale: [
            0.8,
            1.25,
            0.8,
          ],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
        }}
      >
        ✦
      </motion.span>

      <motion.span
        className="money-wallet__spark money-wallet__spark--two"
        animate={{
          opacity: [
            1,
            0.25,
            1,
          ],
          scale: [
            1,
            0.75,
            1,
          ],
        }}
        transition={{
          duration: 2.7,
          repeat: Infinity,
        }}
      >
        ✧
      </motion.span>
    </motion.div>
  );
}


/* =========================================================
   MAIN PAGE
========================================================= */

export function AccountsPage() {
 
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const toast =
    useToast();

  const accounts =
    useApi(
      () =>
        accountService.list(),
      []
    );
    const ppfSummary =
    useApi(
      () =>
        ppfService.summary(),
      []
    );
    const rewards =
  useApi(
    () =>
      rewardService.list(),
    []
  );

  const [
    transactions,
    setTransactions,
  ] = useState([]);

  const [
    transactionsLoading,
    setTransactionsLoading,
  ] = useState(true);

  const [
    transactionsError,
    setTransactionsError,
  ] = useState("");

  const [
    spendingPeriod,
    setSpendingPeriod,
  ] = useState("30");

  const [
    openForm,
    setOpenForm,
  ] = useState(false);

  const [
    primaryBusy,
    setPrimaryBusy,
  ] = useState(null);

  const [
    activeQuickAction,
    setActiveQuickAction,
  ] = useState(null);

  const [
    premiumStatus,
    setPremiumStatus,
  ] = useState(null);

  const [
    premiumLoading,
    setPremiumLoading,
  ] = useState(true);

  const [
    upgradeOpen,
    setUpgradeOpen,
  ] = useState(false);
    /* =========================================================
     OPEN PREMIUM UPGRADE FROM SIDEBAR
     /app/accounts?premium=upgrade
  ========================================================= */

  useEffect(() => {
    const params =
      new URLSearchParams(
        location.search
      );

    if (
      params.get("premium") ===
      "upgrade"
    ) {
      setUpgradeOpen(true);
    }
  }, [
    location.search,
  ]);

  const [
    hideBalance,
    setHideBalance,
  ] = useState(false);
const [
  fixedDeposits,
  setFixedDeposits,
] = useState([]);

const [
  fixedDepositsLoading,
  setFixedDepositsLoading,
] = useState(true);

  /* =========================================================
     ACCOUNT DATA
  ========================================================= */

  const accountList =
    Array.isArray(
      accounts.data
    )
      ? accounts.data
      : [];
/* =========================================================
   REAL FIXED DEPOSITS
========================================================= */

useEffect(() => {
  let cancelled = false;

  const loadFixedDeposits = async () => {
    setFixedDepositsLoading(true);

    try {
      const response =
        await apiClient.get("/fd");

      const responseData =
        response?.data?.data ??
        response?.data ??
        [];

      const deposits =
        Array.isArray(responseData)
          ? responseData
          : Array.isArray(
              responseData?.items
            )
            ? responseData.items
            : [];

      if (!cancelled) {
        setFixedDeposits(
          deposits
        );
      }
    } catch (error) {
      if (!cancelled) {
        console.error(
          "Fixed deposits load error:",
          error
        );

        setFixedDeposits([]);
      }
    } finally {
      if (!cancelled) {
        setFixedDepositsLoading(
          false
        );
      }
    }
  };

  loadFixedDeposits();

  return () => {
    cancelled = true;
  };
}, []);

  /* =========================================================
     REAL TRANSACTIONS
  ========================================================= */

  useEffect(() => {
    let cancelled =
      false;

    const loadTransactions =
      async () => {
        setTransactionsLoading(
          true
        );

        setTransactionsError(
          ""
        );

        try {
          const response =
            await apiClient.get(
              "/transactions",
              {
                params: {
                  limit: 50,
                  skip: 0,
                },
              }
            );

          const responseData =
            response?.data?.data ||
            response?.data ||
            {};

          const items =
            Array.isArray(
              responseData
            )
              ? responseData
              : Array.isArray(
                    responseData.items
                  )
                ? responseData.items
                : [];

          if (
            !cancelled
          ) {
            setTransactions(
              items
            );
          }
        } catch (error) {
          if (
            !cancelled
          ) {
            setTransactions(
              []
            );

            setTransactionsError(
              error?.message ||
                "Unable to load transaction activity."
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setTransactionsLoading(
              false
            );
          }
        }
      };

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);


  /* =========================================================
     PREMIUM STATUS
  ========================================================= */

  const loadPremiumStatus =
    async () => {
      try {
        setPremiumLoading(
          true
        );

        const result =
          await premiumService.status();

        setPremiumStatus(
          result || null
        );
      } catch (error) {
        console.error(
          "Premium status error:",
          error
        );

        setPremiumStatus(
          null
        );
      } finally {
        setPremiumLoading(
          false
        );
      }
    };


  useEffect(() => {
    loadPremiumStatus();
  }, []);


  /* =========================================================
     ACCOUNT STATS
  ========================================================= */

  const totalBalance =
    useMemo(
      () =>
        accountList.reduce(
          (
            total,
            account
          ) =>
            total +
            Number(
              account.availableBalancePaise ??
                account.balancePaise ??
                0
            ),
          0
        ),
      [accountList]
    );


  const activeAccounts =
    accountList.filter(
      (account) =>
        account.status ===
        "ACTIVE"
    ).length;


  const primaryAccount =
    accountList.find(
      (account) =>
        account.isPrimary
    ) ||
    accountList[0] ||
    null;


  /* =========================================================
     REAL FD + PPF VALUES
  ========================================================= */

  const fdAccounts =
  fixedDeposits.filter(
    (deposit) =>
      String(
        deposit?.status || ""
      ).toUpperCase() ===
      "ACTIVE"
  );


const totalFdValue =
  fdAccounts.reduce(
    (
      sum,
      deposit
    ) =>
      sum +
      Number(
        deposit?.principalPaise ||
          0
      ),
    0
  );


const ppfExists =
  Boolean(
    ppfSummary.data?.exists
  );

const ppfAccount =
  ppfExists
    ? ppfSummary.data?.ppf
    : null;

const ppfAccounts =
  ppfAccount
    ? [ppfAccount]
    : [];

const totalPpfValue =
  Number(
    ppfAccount?.balancePaise ??
      0
  );
  /* =========================================================
     REAL SPENDING
  ========================================================= */

  const spending =
    useMemo(() => {
      const days =
        Number(
          spendingPeriod
        );

      const cutoff =
        Date.now() -
        days *
          24 *
          60 *
          60 *
          1000;

      const completedExpenses =
        transactions.filter(
          (transaction) => {
            const created =
              new Date(
                transaction?.createdAt
              ).getTime();

            const completed =
              transaction?.status ===
              "COMPLETED";

            const debit =
              !isCreditTransaction(
                transaction
              );

            return (
              completed &&
              debit &&
              Number.isFinite(
                created
              ) &&
              created >= cutoff
            );
          }
        );

      const categoryMap =
        new Map();

      let total = 0;

      for (
        const transaction of
        completedExpenses
      ) {
        const amount =
          transactionAmountPaise(
            transaction
          );

        if (amount <= 0) {
          continue;
        }

        total += amount;

        const category =
          getSpendingCategory(
            transaction
          );

        categoryMap.set(
          category,
          (categoryMap.get(
            category
          ) || 0) +
            amount
        );
      }

      const items =
        Array.from(
          categoryMap.entries()
        )
          .sort(
            (a, b) =>
              b[1] - a[1]
          )
          .slice(0, 5)
          .map(
            ([
              label,
              amount,
            ]) => ({
              label,
              amount,
              percentage:
                total > 0
                  ? Math.round(
                      (amount /
                        total) *
                        100
                    )
                  : 0,
            })
          );

      return {
        total,
        count:
          completedExpenses.length,
        items,
      };
    }, [
      transactions,
      spendingPeriod,
    ]);


  /* =========================================================
     RECENT TRANSACTIONS
  ========================================================= */

  const recentTransactions =
    useMemo(
      () =>
        [
          ...transactions,
        ]
          .sort(
            (a, b) =>
              new Date(
                b?.createdAt ||
                  0
              ) -
              new Date(
                a?.createdAt ||
                  0
              )
          )
          .slice(0, 5),
      [transactions]
    );


  /* =========================================================
     MONTHLY CASH FLOW
  ========================================================= */

  const cashFlow =
    useMemo(() => {
      const now =
        new Date();

      const month =
        now.getMonth();

      const year =
        now.getFullYear();

      return transactions.reduce(
        (
          result,
          transaction
        ) => {
          const date =
            new Date(
              transaction?.createdAt ||
                0
            );

          if (
            date.getMonth() !==
              month ||
            date.getFullYear() !==
              year
          ) {
            return result;
          }

          const amount =
            transactionAmountPaise(
              transaction
            );

          if (
            isCreditTransaction(
              transaction
            )
          ) {
            result.income +=
              amount;
          } else {
            result.expense +=
              amount;
          }

          return result;
        },
        {
          income: 0,
          expense: 0,
        }
      );
    }, [transactions]);


  /* =========================================================
     ACTIONS
  ========================================================= */

  const handleMakePrimary =
    async (account) => {
      setPrimaryBusy(
        account._id
      );

      try {
        const result =
          await accountService.setPrimary(
            account._id
          );

        toast.success(
          result.message ||
            "Primary account updated."
        );

        await accounts.refetch();
      } catch (error) {
        toast.error(
          error?.message ||
            "Unable to update primary account."
        );
      } finally {
        setPrimaryBusy(
          null
        );
      }
    };


  const handleCopy =
    async (value) => {
      try {
        await navigator.clipboard.writeText(
          String(value)
        );

        toast.success(
          "Account number copied."
        );
      } catch {
        toast.error(
          "Unable to copy account number."
        );
      }
    };


  const handleTransfer =
    (account) => {
      navigate(
        `/app/transfer?accountId=${encodeURIComponent(
          account._id
        )}`
      );
    };


  const handleStatement =
    (account) => {
      navigate(
        `/app/statements?accountId=${encodeURIComponent(
          account._id
        )}`
      );
    };


  const handleQuickAction =
    (action) => {
      switch (action) {
        case "send":
          navigate(
            "/app/transfer"
          );
          break;

        case "request":
          navigate(
            "/app/transfer?mode=request"
          );
          break;

        case "beneficiary":
          navigate(
            "/app/beneficiaries"
          );
          break;

        case "statement":
          navigate(
            "/app/statements"
          );
          break;

        case "card":
          navigate(
            "/app/cards"
          );
          break;

        case "services":
          setActiveQuickAction(
            "services"
          );
          break;

        default:
          break;
      }
    };


  /* =========================================================
     PREMIUM
  ========================================================= */

  const handlePremiumOpen =
    () => {
      setUpgradeOpen(
        true
      );
    };


  /* =========================================================
     NAVIGATION — FD / PPF
  ========================================================= */

  const openFdSection =
    () => {
      navigate(
        "/app/fd"
      );
    };


  const openPpfSection =
    () => {
      navigate(
        "/app/ppf"
      );
    };


  /* =========================================================
     ERROR
  ========================================================= */

  if (accounts.error) {
    return (
      <ErrorState
        description={
          accounts.error.message
        }
        onRetry={
          accounts.refetch
        }
      />
    );
  }


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="accounts-page"
      data-testid="accounts-page"
    >
      {/* =====================================================
          AMBIENT BACKGROUND
      ====================================================== */}

      <div className="accounts-page__ambient accounts-page__ambient--one" />

      <div className="accounts-page__ambient accounts-page__ambient--two" />

      <div className="accounts-page__grid-bg" />


      {/* =====================================================
          HEADER
      ====================================================== */}

      <motion.header
        className="accounts-header"
        initial={{
          opacity: 0,
          y: -16,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
        }}
      >
        <div className="accounts-header__copy">
          <div className="accounts-header__eyebrow">
            <span />
            PERSONAL BANKING
          </div>

          <div className="accounts-title-wrap">
            <motion.div
              className="accounts-title-orbit accounts-title-orbit--one"
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            <motion.div
              className="accounts-title-orbit accounts-title-orbit--two"
              animate={{
                rotate: -360,
              }}
              transition={{
                duration: 13,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            <h1>
              My Accounts

              <Sparkles
                size={19}
                className="accounts-title-spark"
              />
            </h1>

            <motion.span
              className="accounts-title-glint"
              animate={{
                x: [
                  0,
                  42,
                  0,
                ],
                opacity: [
                  0.2,
                  1,
                  0.2,
                ],
              }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          <p>
            Everything you own, spend and
            manage — in one secure place.
          </p>
        </div>


        <div className="accounts-header__actions">
          <motion.button
            type="button"
            className="accounts-header__primary"
            onClick={() =>
              setOpenForm(
                true
              )
            }
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.97,
            }}
          >
            <Plus size={16} />

            Open New Account
          </motion.button>

          <motion.button
            type="button"
            className="accounts-header__secondary"
            onClick={() =>
              primaryAccount
                ? handleStatement(
                    primaryAccount
                  )
                : setOpenForm(
                    true
                  )
            }
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.97,
            }}
          >
            <CreditCard
              size={15}
            />

            Account Summary
          </motion.button>
        </div>
      </motion.header>


      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <motion.section
        className="accounts-summary"
        initial={{
          opacity: 0,
          y: 18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.08,
          duration: 0.5,
        }}
      >
        <SummaryItem
          icon={
            <Landmark size={18} />
          }
          tone="green"
          label="Total Balance"
          value={
            hideBalance
              ? "••••••"
              : formatBalance(
                  totalBalance
                )
          }
          change="Across all accounts"
          action={
            <button
              type="button"
              className="summary-eye"
              onClick={(event) => {
                event.stopPropagation();

                setHideBalance(
                  (value) =>
                    !value
                );
              }}
              aria-label={
                hideBalance
                  ? "Show balance"
                  : "Hide balance"
              }
            >
              {hideBalance ? (
                <Eye size={13} />
              ) : (
                <EyeOff size={13} />
              )}
            </button>
          }
        />

        <SummaryItem
          icon={
            <CreditCard
              size={18}
            />
          }
          tone="blue"
          label="Active Accounts"
          value={
            activeAccounts
          }
          change={`${accountList.length} total account${
            accountList.length ===
            1
              ? ""
              : "s"
          }`}
        />


        <motion.div
          className="summary-item summary-item--purple summary-investment-card"
          whileHover={{
            y: -3,
          }}
        >
          <div className="summary-investment-card__header">
            <div className="summary-item__icon summary-item__icon--purple">
              <PiggyBank
                size={18}
              />
            </div>

            <span>
              INVESTMENTS
            </span>
          </div>

          <div className="summary-investment-values">
            <button
              type="button"
              className="summary-investment-value"
              onClick={
                openFdSection
              }
            >
              <div>
                <PiggyBank
                  size={11}
                />

                FD
              </div>

              <strong>
                {hideBalance
  ? "••••"
  : fixedDepositsLoading
    ? "Loading..."
    : totalFdValue >
        0
      ? formatBalance(
          totalFdValue
        )
      : "₹0.00"}
              </strong>

              <small>
                {fdAccounts.length}{" "}
                account
                {fdAccounts.length ===
                1
                  ? ""
                  : "s"}

                <ArrowRight
                  size={11}
                />
              </small>
            </button>


            <button
              type="button"
              className="summary-investment-value summary-investment-value--ppf"
              onClick={
                openPpfSection
              }
            >
              <div>
                <Gem size={11} />

                PPF
              </div>

              <strong>
  {hideBalance
    ? "••••"
    : ppfSummary.loading
      ? "Loading..."
      : ppfExists
        ? formatBalance(
            totalPpfValue
          )
        : "₹0.00"}
</strong>

              <small>
  {ppfSummary.loading
    ? "Loading..."
    : `${ppfAccounts.length} account${
        ppfAccounts.length ===
        1
          ? ""
          : "s"
      }`}

  <ArrowRight
    size={11}
  />
</small>
            </button>
          </div>
        </motion.div>


        <SummaryItem
          icon={
            <Star
              size={18}
              fill="currentColor"
            />
          }
          tone="orange"
          label="Reward Points"
          value={
  rewards.loading
    ? "..."
    : rewards.data?.balance ?? 0
}
          change="View rewards"
          onClick={() =>
            navigate(
              "/app/rewards"
            )
          }
        />
      </motion.section>


      {/* =====================================================
          ACCOUNTS
      ====================================================== */}

      <section className="accounts-section">
        <div className="accounts-section__heading">
          <div>
            <h2>
              Your Accounts

              <span>
                {accountList.length}
              </span>
            </h2>
          </div>

          <button
            type="button"
            className="accounts-view-all"
            onClick={() =>
              primaryAccount
                ? handleStatement(
                    primaryAccount
                  )
                : setOpenForm(
                    true
                  )
            }
          >
            View All Accounts

            <ArrowRight
              size={14}
            />
          </button>
        </div>


        {accounts.loading ? (
          <div className="compact-account-grid">
            {Array.from({
              length: 3,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="accounts-card-skeleton"
                />
              )
            )}
          </div>
        ) : accountList.length ===
          0 ? (
          <motion.div
            className="accounts-empty-card"
            initial={{
              opacity: 0,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
          >
            <div className="accounts-empty-card__icon">
              <WalletCards
                size={28}
              />
            </div>

            <div>
              <strong>
                No bank accounts yet
              </strong>

              <span>
                Open your first NexusBank
                account to start banking.
              </span>
            </div>

            <Button
              onClick={() =>
                setOpenForm(
                  true
                )
              }
            >
              <Plus size={16} />

              Open Account
            </Button>
          </motion.div>
        ) : (
          <div className="compact-account-grid">
            <AnimatePresence
              mode="popLayout"
            >
              {accountList.map(
                (
                  account,
                  index
                ) => (
                  <CompactAccountCard
                    key={
                      account._id
                    }
                    account={
                      account
                    }
                    index={
                      index
                    }
                    onTransfer={
                      handleTransfer
                    }
                    onStatement={
                      handleStatement
                    }
                    onCopy={
                      handleCopy
                    }
                    onMakePrimary={
                      handleMakePrimary
                    }
                    primaryBusy={
                      primaryBusy ===
                      account._id
                    }
                    hideBalance={
                      hideBalance
                    }
                  />
                )
              )}
            </AnimatePresence>


            <motion.button
              type="button"
              className="accounts-add-card"
              onClick={() =>
                setOpenForm(
                  true
                )
              }
              whileHover={{
                y: -4,
              }}
              whileTap={{
                scale: 0.985,
              }}
            >
              <div className="accounts-add-card__icon">
                <Plus
                  size={22}
                />
              </div>

              <strong>
                Open another account
              </strong>

              <span>
                Add a Savings or Current
                account to your NexusBank
                profile.
              </span>

              <div className="accounts-add-card__link">
                Create account

                <ArrowRight
                  size={14}
                />
              </div>
            </motion.button>
          </div>
        )}
      </section>


      {/* =====================================================
          QUICK ACTIONS
          BILL PAYMENT + MOBILE RECHARGE REMOVED
      ====================================================== */}

      {!accounts.loading &&
        accountList.length > 0 && (
          <section className="quick-actions">
            <div className="quick-actions__heading">
              <div>
                <h2>
                  Quick Actions
                </h2>
              </div>

              <span>
                Everyday banking,
                one tap away
              </span>
            </div>

            <div
              className="quick-actions__visual"
              aria-hidden="true"
            >
              <QuickActionsRocket />
            </div>

            <div className="quick-actions__grid">
              <QuickAction
                icon={
                  <Send size={18} />
                }
                title="Send Money"
                tone="green"
                onClick={() =>
                  handleQuickAction(
                    "send"
                  )
                }
              />

              <QuickAction
                icon={
                  <Download
                    size={18}
                  />
                }
                title="Request Money"
                tone="blue"
                onClick={() =>
                  handleQuickAction(
                    "request"
                  )
                }
              />

              <QuickAction
                icon={
                  <UserPlus
                    size={18}
                  />
                }
                title="Beneficiary"
                tone="purple"
                onClick={() =>
                  handleQuickAction(
                    "beneficiary"
                  )
                }
              />

              <QuickAction
                icon={
                  <CreditCard
                    size={18}
                  />
                }
                title="Manage Cards"
                tone="green"
                onClick={() =>
                  handleQuickAction(
                    "card"
                  )
                }
              />

              <QuickAction
                icon={
                  <FileText
                    size={18}
                  />
                }
                title="Account Statement"
                tone="orange"
                onClick={() =>
                  handleQuickAction(
                    "statement"
                  )
                }
              />

              <QuickAction
                icon={
                  <MoreHorizontal
                    size={18}
                  />
                }
                title="More Services"
                tone="gray"
                onClick={() =>
                  handleQuickAction(
                    "services"
                  )
                }
              />
            </div>

            <div
              className="quick-actions__side-visual"
              aria-hidden="true"
            >
              <AnimatedMoneyWallet />
            </div>
          </section>
        )}


      {/* =====================================================
          LOWER CONTENT
      ====================================================== */}

      <section className="accounts-lower-grid">
        <RecentTransactions
          transactions={
            recentTransactions
          }
          loading={
            transactionsLoading
          }
          error={
            transactionsError
          }
          onViewAll={() =>
            navigate(
              "/app/transactions"
            )
          }
        />

        <div className="accounts-right-column">
          <SpendingOverview
            spending={
              spending
            }
            loading={
              transactionsLoading
            }
            period={
              spendingPeriod
            }
            onPeriodChange={
              setSpendingPeriod
            }
            onReport={() =>
              navigate(
                "/app/transactions"
              )
            }
          />

          <SmartInsights
            cashFlow={
              cashFlow
            }
            spending={
              spending
            }
            onView={() =>
              navigate(
                "/app/transactions"
              )
            }
          />
        </div>
      </section>


      {/* =====================================================
          PREMIUM
      ====================================================== */}

      <PremiumUpgrade
  active={Boolean(
    premiumStatus?.active
  )}
  loading={
    premiumLoading
  }
  open={
    upgradeOpen
  }
  onOpen={
    handlePremiumOpen
  }
  onClose={() => {
    setUpgradeOpen(
      false
    );

    if (
      new URLSearchParams(
        location.search
      ).get("premium") ===
      "upgrade"
    ) {
      navigate(
        "/app/accounts",
        {
          replace: true,
        }
      );
    }
  }}
/>

      {/* =====================================================
          OPEN ACCOUNT MODAL
          OpenAccountModal itself uses createPortal().
      ====================================================== */}

      <AnimatePresence>
        {openForm && (
          <OpenAccountModal
            onClose={() =>
              setOpenForm(
                false
              )
            }
            onCreated={async () => {
              setOpenForm(
                false
              );

              await accounts.refetch();
            }}
          />
        )}
      </AnimatePresence>


      {/* =====================================================
          SERVICES MODAL
      ====================================================== */}

      <AnimatePresence>
        {activeQuickAction ===
          "services" && (
          <ServiceModal
            title="NexusBank Services"
            icon={
              <Zap size={24} />
            }
            description="Access the services currently available in your NexusBank application."
            serviceGrid={[
              {
                icon: (
                  <PiggyBank
                    size={18}
                  />
                ),
                title:
                  "Fixed Deposits",
                onClick: () => {
                  setActiveQuickAction(
                    null
                  );

                  openFdSection();
                },
              },

              {
                icon: (
                  <Gem size={18} />
                ),
                title: "PPF",
                onClick: () => {
                  setActiveQuickAction(
                    null
                  );

                  openPpfSection();
                },
              },

              {
                icon: (
                  <Gift size={18} />
                ),
                title: "Rewards",
                onClick: () => {
                  setActiveQuickAction(
                    null
                  );

                  navigate(
                    "/app/rewards"
                  );
                },
              },

              {
                icon: (
                  <ShieldCheck
                    size={18}
                  />
                ),
                title: "Security",
                onClick: () => {
                  setActiveQuickAction(
                    null
                  );

                  navigate(
                    "/app/security"
                  );
                },
              },

              {
                icon: (
                  <FileText
                    size={18}
                  />
                ),
                title:
                  "Statements",
                onClick: () => {
                  setActiveQuickAction(
                    null
                  );

                  navigate(
                    "/app/statements"
                  );
                },
              },
            ]}
            actions={[
              {
                label: "Close",
                secondary: true,
                onClick: () =>
                  setActiveQuickAction(
                    null
                  ),
              },
            ]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


export default AccountsPage;