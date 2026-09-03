import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  Globe2,
  Lock,
  LockKeyhole,
  MonitorSmartphone,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Smartphone,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Unlock,
  WalletCards,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./CardManagementPage.css";

const STORAGE_KEY = "nexusbank_card_management_v2";

const DEFAULT_CARD = {
  holder: "SHASHWAT JHA",
  lastFour: "4829",
  fullNumber: "5284 7612 3948 4829",
  expiry: "09/29",
  cvv: "428",
  type: "VISA DEBIT",
  status: "ACTIVE",

  dailyLimit: 50000,
  onlineLimit: 25000,
  contactlessLimit: 10000,
  atmLimit: 20000,
  internationalLimit: 15000,

  creditLimit: 100000,
  amountUsed: 24560,

  online: true,
  contactless: true,
  international: true,
  atm: true,

  pinSet: true,

  application: null,

  referralCode: "NEXUS5284",
  referrals: 0,
  referralPoints: 0,

  activity: [
    {
      id: 1,
      title: "Amazon Pay",
      subtitle: "Online Payment",
      amount: -1249,
      time: "Today · 10:30 AM",
      icon: "online",
    },
    {
      id: 2,
      title: "Zomato",
      subtitle: "Food & Dining",
      amount: -568,
      time: "Yesterday · 08:45 PM",
      icon: "contactless",
    },
    {
      id: 3,
      title: "Blinkit",
      subtitle: "Groceries",
      amount: -842,
      time: "Yesterday · 06:20 PM",
      icon: "card",
    },
    {
      id: 4,
      title: "Netflix",
      subtitle: "Entertainment",
      amount: -649,
      time: "28 May 2026 · 09:15 PM",
      icon: "card",
    },
  ],
};

const formatMoney = (value, decimals = 0) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

const formatDateTime = () =>
  new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function loadCard() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return DEFAULT_CARD;
    }

    const parsed = JSON.parse(stored);

    return {
      ...DEFAULT_CARD,
      ...parsed,
      activity: Array.isArray(parsed.activity)
        ? parsed.activity
        : DEFAULT_CARD.activity,
    };
  } catch {
    return DEFAULT_CARD;
  }
}

function saveCard(card) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(card)
    );
  } catch {
    // Local persistence is optional.
  }
}

function addActivity(card, activity) {
  return {
    ...card,
    activity: [
      {
        id: Date.now(),
        ...activity,
      },
      ...(card.activity || []),
    ].slice(0, 8),
  };
}

function Toggle({ checked, onClick, disabled, label }) {
  return (
    <button
      type="button"
      className={`card-toggle ${
        checked ? "is-on" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {checked ? (
        <ToggleRight size={31} />
      ) : (
        <ToggleLeft size={31} />
      )}
    </button>
  );
}

function ActivityIcon({ type }) {
  if (type === "online") {
    return <MonitorSmartphone size={17} />;
  }

  if (type === "contactless") {
    return <Wifi size={17} />;
  }

  if (type === "referral") {
    return <Gift size={17} />;
  }

  if (type === "limit") {
    return <WalletCards size={17} />;
  }

  return <CreditCard size={17} />;
}

export function CardManagementPage() {
  const navigate = useNavigate();

  const [card, setCard] = useState(loadCard);
  const [showDetails, setShowDetails] = useState(false);
  const [showCvv, setShowCvv] = useState(false);

  const [notice, setNotice] = useState(null);

  const [showPinModal, setShowPinModal] =
    useState(false);

  const [showLimitsModal, setShowLimitsModal] =
    useState(false);

  const [showApplyModal, setShowApplyModal] =
    useState(false);

  const [showReferModal, setShowReferModal] =
    useState(false);

  const [showBlockModal, setShowBlockModal] =
    useState(false);

  const [showCardMenu, setShowCardMenu] =
    useState(false);

  const [pinForm, setPinForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [pinError, setPinError] = useState("");

  const [limitDraft, setLimitDraft] = useState({
    dailyLimit: card.dailyLimit,
    onlineLimit: card.onlineLimit,
    contactlessLimit:
      card.contactlessLimit,
    atmLimit: card.atmLimit,
    internationalLimit:
      card.internationalLimit,
  });

  const [newCardType, setNewCardType] =
    useState("VISA DEBIT");

  const [newCardVariant, setNewCardVariant] =
    useState("Physical");

  const [copied, setCopied] = useState(false);

  const maskedNumber = useMemo(
    () =>
      `••••  ••••  ••••  ${card.lastFour}`,
    [card.lastFour]
  );

  const availableLimit = Math.max(
    0,
    Number(card.creditLimit || 0) -
      Number(card.amountUsed || 0)
  );

  const usedPercentage = Math.min(
    100,
    Math.round(
      (Number(card.amountUsed || 0) /
        Number(card.creditLimit || 1)) *
        100
    )
  );

  const statusLabel =
    card.status === "ACTIVE"
      ? "Active"
      : card.status === "FROZEN"
      ? "Temporarily Frozen"
      : "Blocked";

  const notify = (
    message,
    type = "success"
  ) => {
    setNotice({
      message,
      type,
    });

    window.clearTimeout(
      window.__nexusCardNoticeTimer
    );

    window.__nexusCardNoticeTimer =
      window.setTimeout(() => {
        setNotice(null);
      }, 3400);
  };

  const updateCard = (updater) => {
    setCard((current) => {
      const next =
        typeof updater === "function"
          ? updater(current)
          : updater;

      saveCard(next);

      return next;
    });
  };

  const toggleFreeze = () => {
    if (card.status === "BLOCKED") {
      return;
    }

    const nextStatus =
      card.status === "FROZEN"
        ? "ACTIVE"
        : "FROZEN";

    updateCard((current) => ({
      ...current,
      status: nextStatus,
    }));

    notify(
      nextStatus === "FROZEN"
        ? "Card frozen successfully. All card transactions are paused."
        : "Card unfrozen. Your card is active again."
    );
  };

  const toggleSetting = (
    key,
    label
  ) => {
    if (card.status === "BLOCKED") {
      return;
    }

    const nextValue = !card[key];

    updateCard((current) => ({
      ...current,
      [key]: nextValue,
    }));

    notify(
      `${label} ${
        nextValue
          ? "enabled"
          : "disabled"
      }.`
    );
  };

  const saveDailyLimit = () => {
    const value = Number(
      limitDraft.dailyLimit
    );

    if (
      !Number.isFinite(value) ||
      value < 5000 ||
      value > 200000
    ) {
      notify(
        "Daily spending limit must be between ₹5,000 and ₹2,00,000.",
        "warning"
      );
      return;
    }

    updateCard((current) => ({
      ...current,
      dailyLimit: value,
    }));

    notify(
      `Daily spending limit saved at ${formatMoney(
        value
      )}.`
    );
  };

  const openLimits = () => {
    setLimitDraft({
      dailyLimit: card.dailyLimit,
      onlineLimit: card.onlineLimit,
      contactlessLimit:
        card.contactlessLimit,
      atmLimit: card.atmLimit,
      internationalLimit:
        card.internationalLimit,
    });

    setShowLimitsModal(true);
  };

  const saveAllLimits = () => {
    const values = {
      dailyLimit: Number(
        limitDraft.dailyLimit
      ),
      onlineLimit: Number(
        limitDraft.onlineLimit
      ),
      contactlessLimit: Number(
        limitDraft.contactlessLimit
      ),
      atmLimit: Number(
        limitDraft.atmLimit
      ),
      internationalLimit: Number(
        limitDraft.internationalLimit
      ),
    };

    const invalid = Object.values(
      values
    ).some(
      (value) =>
        !Number.isFinite(value) ||
        value < 1000 ||
        value > 200000
    );

    if (invalid) {
      notify(
        "Each card limit must be between ₹1,000 and ₹2,00,000.",
        "warning"
      );
      return;
    }

    updateCard((current) => ({
      ...current,
      ...values,
    }));

    setShowLimitsModal(false);

    notify(
      "All card limits have been updated successfully."
    );
  };

  const handlePinSave = () => {
    setPinError("");

    if (!/^\d{4}$/.test(pinForm.current)) {
      setPinError(
        "Enter your current 4-digit PIN."
      );
      return;
    }

    if (!/^\d{4}$/.test(pinForm.next)) {
      setPinError(
        "New PIN must contain exactly 4 digits."
      );
      return;
    }

    if (
      pinForm.next !==
      pinForm.confirm
    ) {
      setPinError(
        "New PIN and confirmation PIN do not match."
      );
      return;
    }

    if (
      pinForm.next ===
      pinForm.current
    ) {
      setPinError(
        "New PIN must be different from your current PIN."
      );
      return;
    }

    updateCard((current) => ({
      ...current,
      pinSet: true,
    }));

    setPinForm({
      current: "",
      next: "",
      confirm: "",
    });

    setShowPinModal(false);

    notify(
      "Card PIN updated securely."
    );
  };

  const submitCardApplication = () => {
    const application = {
      id: `CARD-${Date.now()}`,
      type: newCardType,
      variant: newCardVariant,
      status: "PROCESSING",
      submittedAt: new Date().toISOString(),
    };

    updateCard((current) => ({
      ...current,
      application,
    }));

    setShowApplyModal(false);

    notify(
      `${newCardVariant} ${newCardType} application submitted successfully.`
    );
  };

  const blockCard = () => {
    updateCard((current) => ({
      ...current,
      status: "BLOCKED",
      online: false,
      contactless: false,
      international: false,
      atm: false,
    }));

    setShowBlockModal(false);

    notify(
      "Card blocked permanently. Card transactions are disabled.",
      "warning"
    );
  };

  const copyReferralCode =
    async () => {
      try {
        await navigator.clipboard.writeText(
          card.referralCode
        );

        setCopied(true);

        window.setTimeout(
          () => setCopied(false),
          1800
        );

        notify(
          "Referral code copied."
        );
      } catch {
        notify(
          `Your referral code is ${card.referralCode}.`,
          "warning"
        );
      }
    };

  const simulateReferral = () => {
    updateCard((current) => {
      const points =
        Number(current.referralPoints || 0) +
        500;

      return addActivity(
        {
          ...current,
          referrals:
            Number(
              current.referrals || 0
            ) + 1,
          referralPoints:
            points,
        },
        {
          title: "Referral reward",
          subtitle:
            "Friend joined NexusBank",
          amount: 500,
          time: formatDateTime(),
          icon: "referral",
        }
      );
    });

    setShowReferModal(false);

    notify(
      "Referral completed. 500 reward points added."
    );
  };

  const resetDemoData = () => {
    localStorage.removeItem(
      STORAGE_KEY
    );

    setCard(DEFAULT_CARD);

    notify(
      "Card management demo has been reset."
    );
  };

  return (
    <div className="card-management-page">
      {/* =====================================================
          TOP ACTION BAR
          ===================================================== */}

      <div className="card-management-topbar">
        <button
          type="button"
          className="card-back-button"
          onClick={() =>
            navigate("/app/accounts")
          }
        >
          <ArrowLeft size={15} />
          Back to My Accounts
        </button>

        <div className="card-topbar-actions">
          <div className="card-security-badge">
            <ShieldCheck size={15} />
            Protected by NexusBank Security
          </div>
        </div>
      </div>

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="card-management-header">
        <div>
          <span className="eyebrow">
            CARD MANAGEMENT
          </span>

          <h1>
            Manage your cards
          </h1>

          <p>
            Control your card usage, limits,
            security and payment preferences
            from one secure place.
          </p>
        </div>

        <div className="card-header-status">
          <div
            className={`card-status-pill card-status-pill--${card.status.toLowerCase()}`}
          >
            <span className="card-status-dot" />
            {statusLabel}
          </div>
        </div>
      </header>

      {/* =====================================================
          NOTICE
          ===================================================== */}

      {notice && (
        <div
          className={`card-notice card-notice--${notice.type}`}
        >
          {notice.type === "warning" ? (
            <CircleAlert size={17} />
          ) : (
            <CheckCircle2 size={17} />
          )}

          <span>
            {notice.message}
          </span>

          <button
            type="button"
            onClick={() =>
              setNotice(null)
            }
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* =====================================================
          PRIMARY GRID
          ===================================================== */}

      <section className="card-management-grid">
        {/* ===================================================
            YOUR CARD
            =================================================== */}

        <div className="card-preview-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                YOUR CARDS
              </span>

              <h2>
                Debit Card
              </h2>
            </div>

            <div className="card-menu-wrap">
              <button
                type="button"
                className="icon-only-button"
                onClick={() =>
                  setShowCardMenu(
                    (value) => !value
                  )
                }
                aria-label="Card options"
              >
                <MoreHorizontal size={18} />
              </button>

              {showCardMenu && (
                <div className="card-mini-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCardMenu(
                        false
                      );
                      setShowApplyModal(
                        true
                      );
                    }}
                  >
                    <Plus size={14} />
                    Apply for new card
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCardMenu(
                        false
                      );
                      openLimits();
                    }}
                  >
                    <WalletCards size={14} />
                    Manage all limits
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCardMenu(
                        false
                      );
                      resetDemoData();
                    }}
                  >
                    <RefreshCw size={14} />
                    Reset demo data
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CARD */}

          <div
            className={`bank-card bank-card--${card.status.toLowerCase()}`}
          >
            <div className="bank-card-glow" />
            <div className="bank-card-shine" />

            <div className="bank-card-top">
              <span className="bank-card-brand">
                NEXUS<span>BANK</span>
              </span>

              <div className="bank-card-network">
                <strong>
                  VISA
                </strong>

                <span>
                  Debit
                </span>
              </div>
            </div>

            <div className="bank-card-chip">
              <span />
              <span />
              <span />
            </div>

            <div className="bank-card-number">
              {showDetails
                ? card.fullNumber
                : maskedNumber}
            </div>

            <div className="bank-card-bottom">
              <div>
                <span>
                  CARD HOLDER
                </span>

                <strong>
                  {card.holder}
                </strong>
              </div>

              <div>
                <span>
                  VALID THRU
                </span>

                <strong>
                  {card.expiry}
                </strong>
              </div>

              <div className="bank-card-contactless">
                <Wifi size={21} />
              </div>
            </div>

            {card.status !==
              "ACTIVE" && (
              <div className="bank-card-overlay">
                <LockKeyhole size={24} />

                <strong>
                  {card.status ===
                  "FROZEN"
                    ? "CARD FROZEN"
                    : "CARD BLOCKED"}
                </strong>

                <span>
                  {card.status ===
                  "FROZEN"
                    ? "Transactions are temporarily paused"
                    : "This card can no longer be used"}
                </span>
              </div>
            )}
          </div>

          {/* CARD ACTIONS */}

          <div className="card-preview-actions">
            <button
              type="button"
              onClick={() =>
                setShowDetails(
                  (value) => !value
                )
              }
            >
              {showDetails ? (
                <EyeOff size={15} />
              ) : (
                <Eye size={15} />
              )}

              {showDetails
                ? "Hide card number"
                : "Show card number"}
            </button>

            <button
              type="button"
              onClick={() =>
                setShowCvv(
                  (value) => !value
                )
              }
            >
              {showCvv ? (
                <EyeOff size={15} />
              ) : (
                <Eye size={15} />
              )}

              CVV{" "}
              {showCvv
                ? card.cvv
                : "•••"}
            </button>
          </div>

          {/* META */}

          <div className="card-meta-row">
            <div>
              <span>
                Card status
              </span>

              <strong>
                {statusLabel}
              </strong>
            </div>

            <div>
              <span>
                Network
              </span>

              <strong>
                Visa
              </strong>
            </div>

            <div>
              <span>
                Card ending
              </span>

              <strong>
                {card.lastFour}
              </strong>
            </div>
          </div>

          {/* APPLY CARD */}

          <button
            type="button"
            className="apply-card-row"
            onClick={() =>
              setShowApplyModal(true)
            }
          >
            <div className="apply-card-icon">
              <Plus size={17} />
            </div>

            <div>
              <strong>
                Apply for a new card
              </strong>

              <span>
                Get a new card instantly
              </span>
            </div>

            <ChevronRight size={17} />
          </button>

          {card.application && (
            <div className="card-application-status">
              <div className="application-status-icon">
                <Clock3 size={16} />
              </div>

              <div>
                <strong>
                  New card application
                </strong>

                <span>
                  {card.application.type} ·{" "}
                  {card.application.variant}
                </span>
              </div>

              <small>
                Processing
              </small>
            </div>
          )}
        </div>

        {/* ===================================================
            QUICK CONTROLS
            =================================================== */}

        <div className="card-controls-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                QUICK CONTROLS
              </span>

              <h2>
                Card controls
              </h2>
            </div>

            <Sparkles size={18} />
          </div>

          {/* FREEZE */}

          <div className="control-card control-card--highlight">
            <div className="control-icon control-icon--blue">
              <Snowflake size={19} />
            </div>

            <div className="control-copy">
              <strong>
                Freeze / Unfreeze card
              </strong>

              <span>
                Temporarily stop all card
                transactions.
              </span>
            </div>

            <Toggle
              checked={
                card.status ===
                "FROZEN"
              }
              onClick={toggleFreeze}
              disabled={
                card.status ===
                "BLOCKED"
              }
              label="Freeze card"
            />
          </div>

          {/* ONLINE */}

          <div className="control-card">
            <div className="control-icon control-icon--purple">
              <MonitorSmartphone size={19} />
            </div>

            <div className="control-copy">
              <strong>
                Online payments
              </strong>

              <span>
                Allow purchases on websites
                and apps.
              </span>
            </div>

            <Toggle
              checked={card.online}
              onClick={() =>
                toggleSetting(
                  "online",
                  "Online payments"
                )
              }
              disabled={
                card.status ===
                "BLOCKED"
              }
              label="Online payments"
            />
          </div>

          {/* CONTACTLESS */}

          <div className="control-card">
            <div className="control-icon control-icon--cyan">
              <Wifi size={19} />
            </div>

            <div className="control-copy">
              <strong>
                Contactless payments
              </strong>

              <span>
                Tap and pay at supported
                stores.
              </span>
            </div>

            <Toggle
              checked={
                card.contactless
              }
              onClick={() =>
                toggleSetting(
                  "contactless",
                  "Contactless payments"
                )
              }
              disabled={
                card.status ===
                "BLOCKED"
              }
              label="Contactless payments"
            />
          </div>

          {/* INTERNATIONAL */}

          <div className="control-card">
            <div className="control-icon control-icon--orange">
              <Globe2 size={19} />
            </div>

            <div className="control-copy">
              <strong>
                International payments
              </strong>

              <span>
                Allow transactions outside
                India.
              </span>
            </div>

            <Toggle
              checked={
                card.international
              }
              onClick={() =>
                toggleSetting(
                  "international",
                  "International payments"
                )
              }
              disabled={
                card.status ===
                "BLOCKED"
              }
              label="International payments"
            />
          </div>

          {/* ATM */}

          <div className="control-card">
            <div className="control-icon control-icon--violet">
              <CircleDollarSign size={19} />
            </div>

            <div className="control-copy">
              <strong>
                ATM withdrawals
              </strong>

              <span>
                Allow cash withdrawals.
              </span>
            </div>

            <Toggle
              checked={card.atm}
              onClick={() =>
                toggleSetting(
                  "atm",
                  "ATM withdrawals"
                )
              }
              disabled={
                card.status ===
                "BLOCKED"
              }
              label="ATM withdrawals"
            />
          </div>

          {/* MANAGE LIMITS */}

          <button
            type="button"
            className="manage-limits-row"
            onClick={openLimits}
          >
            <div className="control-icon control-icon--purple">
              <WalletCards size={18} />
            </div>

            <div>
              <strong>
                Manage all limits
              </strong>

              <span>
                Set spending and withdrawal
                limits.
              </span>
            </div>

            <ChevronRight size={17} />
          </button>
        </div>
      </section>

      {/* =====================================================
          STATS ROW
          ===================================================== */}

      <section className="card-stat-grid">
        {/* SPENDING */}

        <div className="card-stat-panel">
          <div className="stat-panel-heading">
            <div>
              <span className="eyebrow">
                CARD SPENDING
              </span>

              <h3>
                Spending overview
              </h3>
            </div>

            <span className="stat-period">
              This Month
            </span>
          </div>

          <strong className="big-stat">
            {formatMoney(
              card.amountUsed,
              2
            )}
          </strong>

          <span className="stat-caption">
            Total card usage
          </span>

          <div className="spending-visual">
            <div
              className="spending-donut"
              style={{
                "--progress": `${usedPercentage * 3.6}deg`,
              }}
            >
              <div>
                <strong>
                  {usedPercentage}%
                </strong>

                <span>
                  used
                </span>
              </div>
            </div>

            <div className="spending-legend">
              <span>
                <i className="dot dot-purple" />
                Shopping
                <strong>
                  35%
                </strong>
              </span>

              <span>
                <i className="dot dot-red" />
                Bills
                <strong>
                  25%
                </strong>
              </span>

              <span>
                <i className="dot dot-orange" />
                Food
                <strong>
                  20%
                </strong>
              </span>

              <span>
                <i className="dot dot-blue" />
                Others
                <strong>
                  20%
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* AVAILABLE LIMIT */}

        <div className="card-stat-panel">
          <div className="stat-panel-heading">
            <div>
              <span className="eyebrow">
                AVAILABLE CARD LIMIT
              </span>

              <h3>
                Available credit limit
              </h3>
            </div>

            <CreditCard size={18} />
          </div>

          <div className="available-limit-value">
            <strong>
              {formatMoney(
                availableLimit,
                2
              )}
            </strong>

            <span>
              of{" "}
              {formatMoney(
                card.creditLimit,
                0
              )}
            </span>
          </div>

          <div className="limit-progress">
            <span
              style={{
                width: `${usedPercentage}%`,
              }}
            />
          </div>

          <div className="limit-progress-meta">
            <span>
              {usedPercentage}% used
            </span>

            <span>
              {formatMoney(
                card.amountUsed,
                0
              )}{" "}
              spent
            </span>
          </div>

          <div className="limit-mini-grid">
            <button
              type="button"
              onClick={openLimits}
            >
              <span>
                Daily limit
              </span>

              <strong>
                {formatMoney(
                  card.dailyLimit
                )}
              </strong>

              <ChevronRight
                size={14}
              />
            </button>

            <button
              type="button"
              onClick={openLimits}
            >
              <span>
                ATM limit
              </span>

              <strong>
                {formatMoney(
                  card.atmLimit
                )}
              </strong>

              <ChevronRight
                size={14}
              />
            </button>
          </div>
        </div>

        {/* STATUS */}

        <div className="card-stat-panel card-status-panel">
          <div className="stat-panel-heading">
            <div>
              <span className="eyebrow">
                CARD STATUS
              </span>

              <h3>
                Security status
              </h3>
            </div>

            <span className="active-status">
              <span />
              {statusLabel}
            </span>
          </div>

          <div className="status-shield">
            <ShieldCheck size={42} />
          </div>

          <strong>
            {card.status ===
            "ACTIVE"
              ? "Your card is active and secure"
              : card.status ===
                "FROZEN"
              ? "Your card is temporarily frozen"
              : "Your card is blocked"}
          </strong>

          <span>
            {card.status ===
            "ACTIVE"
              ? "No issues detected with your card."
              : "Review your card settings to continue using it."}
          </span>

          <div className="status-details">
            <div>
              <Clock3 size={14} />
              <span>
                Last used
              </span>
              <strong>
                Today, 10:30 AM
              </strong>
            </div>

            <div>
              <CreditCard size={14} />
              <span>
                Card type
              </span>
              <strong>
                Visa Debit
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECURITY + PIN
          ===================================================== */}

      <section className="card-action-grid">
        <div className="card-action-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                SECURITY
              </span>

              <h2>
                Card security
              </h2>
            </div>

            <ShieldCheck size={18} />
          </div>

          <button
            type="button"
            className="security-action-row"
            onClick={() =>
              setShowPinModal(true)
            }
          >
            <div className="security-action-icon">
              <CreditCard size={17} />
            </div>

            <div>
              <strong>
                Manage card PIN
              </strong>

              <span>
                Change your card PIN securely.
              </span>
            </div>

            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            className="security-action-row"
            onClick={openLimits}
          >
            <div className="security-action-icon">
              <WalletCards size={17} />
            </div>

            <div>
              <strong>
                Manage all limits
              </strong>

              <span>
                Control spending and withdrawal
                limits.
              </span>
            </div>

            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            className="security-action-row security-action-row--danger"
            onClick={() =>
              setShowBlockModal(true)
            }
            disabled={
              card.status ===
              "BLOCKED"
            }
          >
            <div className="security-action-icon">
              <LockKeyhole size={17} />
            </div>

            <div>
              <strong>
                Block card permanently
              </strong>

              <span>
                Use this if your card is lost
                or stolen.
              </span>
            </div>

            <ChevronRight size={16} />
          </button>
        </div>

        {/* REFER */}

        <div className="refer-panel">
          <div className="refer-decoration">
            <Gift size={58} />
          </div>

          <div className="refer-copy">
            <span className="eyebrow">
              NEXUSBANK REWARDS
            </span>

            <h2>
              Refer & Earn
            </h2>

            <p>
              Invite friends to NexusBank and
              earn{" "}
              <strong>
                500 points
              </strong>{" "}
              for every successful referral.
            </p>

            <div className="refer-code-box">
              <div>
                <span>
                  YOUR REFERRAL CODE
                </span>

                <strong>
                  {card.referralCode}
                </strong>
              </div>

              <button
                type="button"
                onClick={
                  copyReferralCode
                }
              >
                {copied ? (
                  <Check size={15} />
                ) : (
                  <Copy size={15} />
                )}

                {copied
                  ? "Copied"
                  : "Copy"}
              </button>
            </div>

            <button
              type="button"
              className="refer-primary-button"
              onClick={() =>
                setShowReferModal(true)
              }
            >
              <Gift size={16} />
              Refer a friend
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="refer-stats">
            <div>
              <strong>
                {card.referrals || 0}
              </strong>

              <span>
                Referrals
              </span>
            </div>

            <div>
              <strong>
                {card.referralPoints ||
                  0}
              </strong>

              <span>
                Points earned
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          RECENT ACTIVITY
          ===================================================== */}

      <section className="card-activity-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              CARD ACTIVITY
            </span>

            <h2>
              Recent card activity
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/app/transactions"
              )
            }
            className="view-all-button"
          >
            View all
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="card-activity-list">
          {card.activity?.length ? (
            card.activity.map(
              (activity) => (
                <div
                  className="card-activity-item"
                  key={activity.id}
                >
                  <div className="activity-brand">
                    <ActivityIcon
                      type={
                        activity.icon
                      }
                    />
                  </div>

                  <div className="activity-copy">
                    <strong>
                      {
                        activity.title
                      }
                    </strong>

                    <span>
                      {
                        activity.subtitle
                      }{" "}
                      ·{" "}
                      {
                        activity.time
                      }
                    </span>
                  </div>

                  <strong
                    className={
                      activity.amount >
                      0
                        ? "activity-positive"
                        : ""
                    }
                  >
                    {activity.amount >
                    0
                      ? "+"
                      : "−"}
                    {formatMoney(
                      Math.abs(
                        activity.amount
                      ),
                      2
                    )}
                  </strong>
                </div>
              )
            )
          ) : (
            <div className="empty-activity">
              <CreditCard size={22} />
              <span>
                No card activity yet.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          PIN MODAL
          ===================================================== */}

      {showPinModal && (
        <div className="card-modal-backdrop">
          <div className="card-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() =>
                setShowPinModal(false)
              }
            >
              <X size={18} />
            </button>

            <div className="modal-icon modal-icon--purple">
              <Lock size={22} />
            </div>

            <span className="eyebrow">
              CARD SECURITY
            </span>

            <h3>
              Manage card PIN
            </h3>

            <p>
              Change your 4-digit card PIN.
              Your PIN is never displayed or
              stored in plain text.
            </p>

            <div className="pin-form">
              <label>
                Current PIN
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={
                    pinForm.current
                  }
                  onChange={(event) =>
                    setPinForm(
                      (current) => ({
                        ...current,
                        current:
                          event.target.value.replace(
                            /\D/g,
                            ""
                          ),
                      })
                    )
                  }
                  placeholder="••••"
                />
              </label>

              <label>
                New PIN
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={
                    pinForm.next
                  }
                  onChange={(event) =>
                    setPinForm(
                      (current) => ({
                        ...current,
                        next:
                          event.target.value.replace(
                            /\D/g,
                            ""
                          ),
                      })
                    )
                  }
                  placeholder="••••"
                />
              </label>

              <label>
                Confirm new PIN
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={
                    pinForm.confirm
                  }
                  onChange={(event) =>
                    setPinForm(
                      (current) => ({
                        ...current,
                        confirm:
                          event.target.value.replace(
                            /\D/g,
                            ""
                          ),
                      })
                    )
                  }
                  placeholder="••••"
                />
              </label>

              {pinError && (
                <div className="form-error">
                  <CircleAlert
                    size={15}
                  />
                  {pinError}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-secondary-button"
                onClick={() =>
                  setShowPinModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-primary-button"
                onClick={
                  handlePinSave
                }
              >
                <Check size={15} />
                Update PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          LIMIT MODAL
          ===================================================== */}

      {showLimitsModal && (
        <div className="card-modal-backdrop">
          <div className="card-modal card-modal--wide">
            <button
              type="button"
              className="modal-close"
              onClick={() =>
                setShowLimitsModal(
                  false
                )
              }
            >
              <X size={18} />
            </button>

            <div className="modal-icon modal-icon--blue">
              <WalletCards size={22} />
            </div>

            <span className="eyebrow">
              SPENDING CONTROL
            </span>

            <h3>
              Manage all card limits
            </h3>

            <p>
              Configure individual limits for
              different transaction types.
            </p>

            <div className="limits-form-grid">
              <label>
                Daily spending limit
                <div className="limit-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="5000"
                    max="200000"
                    step="1000"
                    value={
                      limitDraft.dailyLimit
                    }
                    onChange={(event) =>
                      setLimitDraft(
                        (current) => ({
                          ...current,
                          dailyLimit:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </div>
                <small>
                  ₹5,000 – ₹2,00,000
                </small>
              </label>

              <label>
                Online payments
                <div className="limit-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="1000"
                    max="200000"
                    step="1000"
                    value={
                      limitDraft.onlineLimit
                    }
                    onChange={(event) =>
                      setLimitDraft(
                        (current) => ({
                          ...current,
                          onlineLimit:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </div>
                <small>
                  Per-day online transaction
                  limit
                </small>
              </label>

              <label>
                Contactless payments
                <div className="limit-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="1000"
                    max="200000"
                    step="1000"
                    value={
                      limitDraft.contactlessLimit
                    }
                    onChange={(event) =>
                      setLimitDraft(
                        (current) => ({
                          ...current,
                          contactlessLimit:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </div>
                <small>
                  Contactless spending limit
                </small>
              </label>

              <label>
                ATM withdrawal limit
                <div className="limit-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="1000"
                    max="200000"
                    step="1000"
                    value={
                      limitDraft.atmLimit
                    }
                    onChange={(event) =>
                      setLimitDraft(
                        (current) => ({
                          ...current,
                          atmLimit:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </div>
                <small>
                  Daily cash withdrawal limit
                </small>
              </label>

              <label>
                International payments
                <div className="limit-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="1000"
                    max="200000"
                    step="1000"
                    value={
                      limitDraft.internationalLimit
                    }
                    onChange={(event) =>
                      setLimitDraft(
                        (current) => ({
                          ...current,
                          internationalLimit:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </div>
                <small>
                  International transaction
                  limit
                </small>
              </label>
            </div>

            <div className="pending-limit-notice">
              <Sparkles size={15} />

              <div>
                <strong>
                  Pending changes
                </strong>

                <span>
                  Your new limits will be
                  applied immediately in this
                  demo.
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-secondary-button"
                onClick={() =>
                  setShowLimitsModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-primary-button"
                onClick={
                  saveAllLimits
                }
              >
                <Check size={15} />
                Save all limits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          APPLY CARD MODAL
          ===================================================== */}

      {showApplyModal && (
        <div className="card-modal-backdrop">
          <div className="card-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() =>
                setShowApplyModal(
                  false
                )
              }
            >
              <X size={18} />
            </button>

            <div className="modal-icon modal-icon--purple">
              <CreditCard size={22} />
            </div>

            <span className="eyebrow">
              NEW CARD
            </span>

            <h3>
              Apply for a new card
            </h3>

            <p>
              Choose your preferred card type
              and delivery format.
            </p>

            <div className="choice-group">
              <span>
                Card type
              </span>

              <div className="choice-grid">
                {[
                  "VISA DEBIT",
                  "VISA PREMIUM",
                ].map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={
                      newCardType ===
                      type
                        ? "choice-card is-selected"
                        : "choice-card"
                    }
                    onClick={() =>
                      setNewCardType(
                        type
                      )
                    }
                  >
                    <CreditCard
                      size={17}
                    />

                    <strong>
                      {type}
                    </strong>

                    {newCardType ===
                      type && (
                      <CheckCircle2
                        size={15}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="choice-group">
              <span>
                Delivery
              </span>

              <div className="choice-grid">
                {[
                  "Physical",
                  "Virtual",
                ].map(
                  (variant) => (
                    <button
                      type="button"
                      key={variant}
                      className={
                        newCardVariant ===
                        variant
                          ? "choice-card is-selected"
                          : "choice-card"
                      }
                      onClick={() =>
                        setNewCardVariant(
                          variant
                        )
                      }
                    >
                      {variant ===
                      "Physical" ? (
                        <CreditCard
                          size={17}
                        />
                      ) : (
                        <Smartphone
                          size={17}
                        />
                      )}

                      <strong>
                        {variant}
                      </strong>

                      {newCardVariant ===
                        variant && (
                        <CheckCircle2
                          size={15}
                        />
                      )}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="application-info">
              <ShieldCheck size={16} />

              <span>
                Your existing card will remain
                active while the new card
                application is processed.
              </span>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-secondary-button"
                onClick={() =>
                  setShowApplyModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-primary-button"
                onClick={
                  submitCardApplication
                }
              >
                <Sparkles size={15} />
                Submit application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          REFER MODAL
          ===================================================== */}

      {showReferModal && (
        <div className="card-modal-backdrop">
          <div className="card-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() =>
                setShowReferModal(
                  false
                )
              }
            >
              <X size={18} />
            </button>

            <div className="modal-icon modal-icon--gold">
              <Gift size={22} />
            </div>

            <span className="eyebrow">
              REFER & EARN
            </span>

            <h3>
              Invite your friends
            </h3>

            <p>
              Share your referral code and earn
              500 points when your friend
              successfully joins NexusBank.
            </p>

            <div className="large-referral-code">
              <span>
                YOUR CODE
              </span>

              <strong>
                {card.referralCode}
              </strong>

              <button
                type="button"
                onClick={
                  copyReferralCode
                }
              >
                <Copy size={15} />
                {copied
                  ? "Copied"
                  : "Copy code"}
              </button>
            </div>

            <div className="referral-benefits">
              <div>
                <CheckCircle2
                  size={15}
                />
                <span>
                  500 points per successful
                  referral
                </span>
              </div>

              <div>
                <CheckCircle2
                  size={15}
                />
                <span>
                  No limit on referrals
                </span>
              </div>

              <div>
                <CheckCircle2
                  size={15}
                />
                <span>
                  Rewards added instantly
                </span>
              </div>
            </div>

            <div className="demo-referral-note">
              <Sparkles size={14} />
              <span>
                Demo mode: use the button below
                to simulate a successful referral
                and test the reward flow.
              </span>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-secondary-button"
                onClick={() =>
                  setShowReferModal(
                    false
                  )
                }
              >
                Close
              </button>

              <button
                type="button"
                className="modal-primary-button"
                onClick={
                  simulateReferral
                }
              >
                <Gift size={15} />
                Simulate successful referral
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          BLOCK MODAL
          ===================================================== */}

      {showBlockModal && (
        <div className="card-modal-backdrop">
          <div className="card-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() =>
                setShowBlockModal(
                  false
                )
              }
            >
              <X size={18} />
            </button>

            <div className="modal-icon modal-icon--red">
              <LockKeyhole size={22} />
            </div>

            <span className="eyebrow">
              CARD SECURITY
            </span>

            <h3>
              Block this card?
            </h3>

            <p>
              This action permanently blocks
              the current card. You won't be
              able to use it for future
              transactions.
            </p>

            <div className="danger-warning">
              <CircleAlert size={17} />

              <span>
                This is a permanent action. A
                replacement card may be required.
              </span>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-secondary-button"
                onClick={() =>
                  setShowBlockModal(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-danger-button"
                onClick={blockCard}
              >
                <LockKeyhole
                  size={15}
                />
                Block card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <div className="card-management-footer">
        <div>
          <ShieldCheck size={15} />
          <span>
            Secure card management
          </span>
        </div>

        <div>
          <Lock size={14} />
          <span>
            Your card details are protected
          </span>
        </div>
      </div>
    </div>
  );
}

export default CardManagementPage;