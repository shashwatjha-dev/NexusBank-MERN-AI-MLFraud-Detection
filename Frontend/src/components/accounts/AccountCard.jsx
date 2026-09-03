import { motion } from "framer-motion";
import {
  Star,
  ShieldCheck,
  Copy,
  ArrowUpRight,
  FileText,
  Landmark,
  MoreVertical,
  Sparkles,
  Wifi,
  CreditCard,
} from "lucide-react";

import { formatPaise } from "../../utils/money.js";
import { Button } from "../common/Button.jsx";

import "./AccountCard.css";

const mask = (num = "") => {
  const digits = String(num).replace(/[^0-9]/g, "");

  if (digits.length <= 4) {
    return `•••• ${digits}`;
  }

  return `•••• •••• ${digits.slice(-4)}`;
};

const cardNumber = (num = "") => {
  const digits = String(num).replace(/[^0-9]/g, "");

  if (!digits) {
    return "5284  ••••  ••••  0002";
  }

  const lastFour = digits.slice(-4);

  return `5284  ••••  ••••  ${lastFour}`;
};

const typeCopy = {
  SAVINGS: {
    title: "Savings",
    subtitle: "Personal banking",
    gradient: "green",
  },

  CURRENT: {
    title: "Current",
    subtitle: "Business banking",
    gradient: "blue",
  },
};

export function AccountCard({
  account,
  onMakePrimary,
  onTransfer,
  onCopy,
  onStatement,
  primaryBusy,
}) {
  const badge =
    typeCopy[account.accountType] || typeCopy.SAVINGS;

  const isFrozen = account.status !== "ACTIVE";

  const balance =
    account.availableBalancePaise ??
    account.balancePaise ??
    0;

  return (
    <motion.article
      className={`acct-card acct-card--${badge.gradient} ${
        account.isPrimary ? "is-primary" : ""
      } ${isFrozen ? "is-frozen" : ""}`}
      data-testid={`account-card-${account._id}`}
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        y: -7,
        transition: { duration: 0.25 },
      }}
    >
      {/* Background atmosphere */}
      <div className="acct-card__ambient acct-card__ambient--one" />
      <div className="acct-card__ambient acct-card__ambient--two" />

      <div className="acct-card__grid" />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="acct-card__header">
        <div className="acct-card__identity">
          <motion.div
            className="acct-card__bank-icon"
            whileHover={{ rotate: 8, scale: 1.08 }}
          >
            <Landmark size={21} />
          </motion.div>

          <div>
            <span className="acct-card__eyebrow">
              {badge.title} Account
            </span>

            <h3 className="acct-card__label">
              {account.label || `${badge.title} Account`}
            </h3>

            <span className="acct-card__subtitle">
              {badge.subtitle}
            </span>
          </div>
        </div>

        <div className="acct-card__top-actions">
          {account.isPrimary && (
            <motion.span
              className="acct-card__pill"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <Star size={11} fill="currentColor" />
              PRIMARY
            </motion.span>
          )}

          <button
            type="button"
            className="acct-card__menu"
            aria-label="Account options"
          >
            <MoreVertical size={17} />
          </button>
        </div>
      </header>

      {/* =====================================================
          BALANCE
      ===================================================== */}

      <section className="acct-card__balance">
        <span>Available balance</span>

        <strong>{formatPaise(balance)}</strong>

        <div className="acct-card__balance-status">
          <span className="acct-card__live-dot" />
          {isFrozen
            ? "Account restricted"
            : "Available for transactions"}
        </div>
      </section>

      {/* =====================================================
          NEXUSBANK DEBIT CARD
      ===================================================== */}

      <section className="acct-card__debit-area">
        <div className="acct-card__card-caption">
          <span>
            <CreditCard size={12} />
            NEXUSBANK DEBIT
          </span>

          <span className="acct-card__active-status">
            <i />
            ACTIVE
          </span>
        </div>

        <motion.div
          className="nb-debit-card"
          whileHover={{
            rotateX: 5,
            rotateY: -7,
            scale: 1.025,
          }}
          transition={{
            type: "spring",
            stiffness: 180,
            damping: 16,
          }}
        >
          {/* Moving shine */}
          <motion.div
            className="nb-debit-card__shine"
            animate={{
              x: ["-120%", "180%"],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              repeatDelay: 2,
              ease: "easeInOut",
            }}
          />

          {/* Card glow */}
          <div className="nb-debit-card__glow" />

          {/* Decorative lines */}
          <div className="nb-debit-card__orbit nb-debit-card__orbit--one" />
          <div className="nb-debit-card__orbit nb-debit-card__orbit--two" />

          <div className="nb-debit-card__top">
            <div className="nb-debit-card__brand">
              <span className="nb-debit-card__brand-mark">
                N
              </span>

              <div>
                <strong>NexusBank</strong>
                <small>SMART BANKING</small>
              </div>
            </div>

            <div className="nb-debit-card__contactless">
              <Wifi size={22} />
            </div>
          </div>

          <div className="nb-debit-card__chip">
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="nb-debit-card__number">
            {cardNumber(account.accountNumber)}
          </div>

          <div className="nb-debit-card__bottom">
            <div className="nb-card-field">
              <small>CARD HOLDER</small>
              <strong>AISHA VERMA</strong>
            </div>

            <div className="nb-card-field">
              <small>VALID THRU</small>
              <strong>12/29</strong>
            </div>

            <div className="nb-card-network">
              <span />
              <span />
              <small>DEBIT</small>
            </div>
          </div>

          <div className="nb-debit-card__spark">
            <Sparkles size={14} />
          </div>
        </motion.div>
      </section>

      {/* =====================================================
          ACCOUNT INFORMATION
      ===================================================== */}

      <dl className="acct-card__meta">
        <div>
          <dt>Account number</dt>

          <dd className="mono">
            {mask(account.accountNumber)}

            <button
              type="button"
              aria-label="Copy account number"
              className="acct-card__icon-btn"
              onClick={() =>
                onCopy?.(account.accountNumber)
              }
              data-testid={`copy-acct-${account._id}`}
            >
              <Copy size={12} />
            </button>
          </dd>
        </div>

        <div>
          <dt>IFSC</dt>

          <dd className="mono">
            {account.ifsc || "NEXB0000001"}
          </dd>
        </div>

        <div>
          <dt>Branch</dt>

          <dd>
            {account.branch || "NexusBank"}
          </dd>
        </div>

        <div>
          <dt>Status</dt>

          <dd
            className={`acct-card__status ${
              isFrozen ? "is-frozen" : "is-active"
            }`}
          >
            <ShieldCheck size={12} />

            {account.status || "ACTIVE"}
          </dd>
        </div>
      </dl>

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="acct-card__actions">
        <Button
          size="sm"
          variant="primary"
          onClick={() => onTransfer?.(account)}
          data-testid={`account-transfer-${account._id}`}
        >
          <ArrowUpRight size={14} />
          Transfer
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onStatement?.(account)}
          data-testid={`account-statement-${account._id}`}
        >
          <FileText size={13} />
          Statement
        </Button>

        {!account.isPrimary && !isFrozen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onMakePrimary?.(account)
            }
            disabled={primaryBusy}
            data-testid={`account-make-primary-${account._id}`}
          >
            <Star size={13} />

            {primaryBusy
              ? "Updating…"
              : "Make primary"}
          </Button>
        )}
      </div>
    </motion.article>
  );
}