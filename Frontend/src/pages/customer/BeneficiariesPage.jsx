import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Building2,
  Trash2,
  Search,
  ShieldCheck,
  Users,
  UserCheck,
  UserPlus,
  ArrowUpRight,
  X,
  Copy,
  CheckCircle2,
  Landmark,
} from "lucide-react";

import { beneficiaryService } from "../../services/beneficiaryService.js";
import { useApi } from "../../hooks/useApi.js";
import { Card } from "../../components/common/Card.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Input } from "../../components/common/Input.jsx";
import { RiskChip } from "../../components/common/RiskChip.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { useToast } from "../../hooks/useToast.js";

import "./BeneficiariesPage.css";

export function BeneficiariesPage() {
  const list = useApi(() => beneficiaryService.list(), []);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const beneficiaries = list.data || [];

  const stats = useMemo(() => {
    const trusted = beneficiaries.filter((b) => b.trusted).length;
    const newCount = beneficiaries.filter((b) => !b.trusted).length;

    return {
      total: beneficiaries.length,
      trusted,
      newCount,
    };
  }, [beneficiaries]);

  const filteredBeneficiaries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return beneficiaries.filter((b) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "TRUSTED" && b.trusted) ||
        (filter === "NEW" && !b.trusted);

      if (!matchesFilter) return false;

      if (!query) return true;

      return [
        b.name,
        b.nickname,
        b.bankName,
        b.ifsc,
        b.accountNumber,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });
  }, [beneficiaries, search, filter]);

  if (list.error) {
    return (
      <ErrorState
        description={list.error.message}
        onRetry={list.refetch}
      />
    );
  }

  return (
    <div className="beneficiaries-page" data-testid="beneficiaries-page">
      {/* HERO */}
      <motion.header
        className="beneficiaries__hero"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="beneficiaries__hero-content">
          <div className="beneficiaries__eyebrow">
            <span className="beneficiaries__eyebrow-dot" />
            PAYMENTS
          </div>

          <h1>Beneficiaries</h1>

          <p>
            Manage your trusted recipients and transfer money
            securely in seconds.
          </p>
        </div>

        <motion.button
          type="button"
          className="beneficiaries__add-button"
          onClick={() => setShowForm(true)}
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          data-testid="add-beneficiary-toggle"
        >
          <span className="beneficiaries__add-icon">
            <Plus size={19} />
          </span>
          <span>Add beneficiary</span>
        </motion.button>
      </motion.header>

      {/* STATS */}
      <motion.section
        className="beneficiaries__stats"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.45 }}
      >
        <StatCard
          icon={Users}
          label="Total beneficiaries"
          value={stats.total}
          tone="blue"
        />

        <StatCard
          icon={UserCheck}
          label="Trusted contacts"
          value={stats.trusted}
          tone="green"
        />

        <StatCard
          icon={UserPlus}
          label="New contacts"
          value={stats.newCount}
          tone="purple"
        />

        <StatCard
          icon={ShieldCheck}
          label="Security status"
          value="Protected"
          tone="gold"
          textValue
        />
      </motion.section>

      {/* SECURITY BANNER */}
      <motion.section
        className="beneficiaries__security"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.14 }}
      >
        <div className="beneficiaries__security-orb">
          <ShieldCheck size={25} />
        </div>

        <div className="beneficiaries__security-content">
          <div className="beneficiaries__security-title">
            Beneficiary protection is active
            <span className="beneficiaries__live">
              <span />
              ACTIVE
            </span>
          </div>

          <p>
            New recipients are monitored by NexusBank fraud protection.
            High-risk transfers may require additional verification.
          </p>
        </div>

        <div className="beneficiaries__security-score">
          <span>SECURITY</span>
          <strong>24/7</strong>
          <small>Monitoring</small>
        </div>
      </motion.section>

      {/* MAIN CARD */}
      <Card>
        <div className="beneficiaries__toolbar">
          <div>
            <span className="beneficiaries__section-label">
              YOUR CONTACTS
            </span>

            <h2>Saved beneficiaries</h2>

            <p>
              {filteredBeneficiaries.length} of{" "}
              {beneficiaries.length} contacts
            </p>
          </div>

          <div className="beneficiaries__toolbar-right">
            <div className="beneficiaries__search">
              <Search size={17} />

              <input
                type="text"
                placeholder="Search name, bank or IFSC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search beneficiaries"
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
          </div>
        </div>

        {/* FILTERS */}
        <div className="beneficiaries__filters">
          {[
            ["ALL", "All contacts"],
            ["TRUSTED", "Trusted"],
            ["NEW", "New"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`beneficiaries__filter ${
                filter === value ? "is-active" : ""
              }`}
              onClick={() => setFilter(value)}
            >
              {label}

              <span>
                {value === "ALL"
                  ? stats.total
                  : value === "TRUSTED"
                  ? stats.trusted
                  : stats.newCount}
              </span>
            </button>
          ))}
        </div>

        {/* LIST */}
        {list.loading ? (
          <div className="beneficiaries__loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                height={92}
                radius={18}
              />
            ))}
          </div>
        ) : filteredBeneficiaries.length === 0 ? (
          <div className="beneficiaries__empty">
            <EmptyState
              icon={search ? Search : Building2}
              title={
                search
                  ? "No beneficiaries found"
                  : "No beneficiaries yet"
              }
              description={
                search
                  ? "Try another name, bank or IFSC."
                  : "Add a beneficiary to start sending money."
              }
              action={
                !search ? (
                  <Button
                    onClick={() => setShowForm(true)}
                  >
                    <Plus size={16} />
                    Add beneficiary
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div
            className="beneficiaries__list"
            data-testid="beneficiaries-list"
          >
            <AnimatePresence mode="popLayout">
              {filteredBeneficiaries.map((beneficiary, index) => (
                <BeneficiaryRow
                  key={beneficiary._id}
                  beneficiary={beneficiary}
                  onDeleted={list.refetch}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* BOTTOM INFORMATION */}
      <motion.section
        className="beneficiaries__tips"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="beneficiaries__tip-icon">
          <Landmark size={20} />
        </div>

        <div>
          <strong>Transfer safely with NexusBank</strong>
          <p>
            Always verify the beneficiary name and account details
            before making a transfer.
          </p>
        </div>

        <div className="beneficiaries__tip-badge">
          <CheckCircle2 size={15} />
          Secure banking
        </div>
      </motion.section>

      {/* MODAL */}
      <AnimatePresence>
        {showForm && (
          <BeneficiaryModal
            onClose={() => setShowForm(false)}
            onDone={() => {
              setShowForm(false);
              list.refetch();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------
   STAT CARD
------------------------------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  textValue = false,
}) {
  return (
    <motion.div
      className={`beneficiary-stat beneficiary-stat--${tone}`}
      whileHover={{
        y: -5,
        transition: { duration: 0.2 },
      }}
    >
      <div className="beneficiary-stat__icon">
        <Icon size={19} />
      </div>

      <div className="beneficiary-stat__body">
        <span>{label}</span>
        <strong className={textValue ? "is-text" : ""}>
          {value}
        </strong>
      </div>

      <div className="beneficiary-stat__glow" />
    </motion.div>
  );
}

/* -------------------------------------------------------
   BENEFICIARY ROW
------------------------------------------------------- */

function BeneficiaryRow({
  beneficiary,
  onDeleted,
  index,
}) {
  const toast = useToast();
  const [removing, setRemoving] = useState(false);

  const accountNumber = String(
    beneficiary.accountNumber || ""
  );

  const maskedAccount =
    accountNumber.length > 4
      ? `•••• •••• ${accountNumber.slice(-4)}`
      : `•••• ${accountNumber}`;

  const initials = String(beneficiary.name || "B")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const remove = async () => {
    if (
      !window.confirm(
        `Remove ${beneficiary.name}?`
      )
    ) {
      return;
    }

    try {
      setRemoving(true);

      await beneficiaryService.remove(
        beneficiary._id
      );

      toast.success("Beneficiary removed.");
      onDeleted();
    } catch (err) {
      toast.error(err.message);
      setRemoving(false);
    }
  };

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(
        accountNumber
      );
      toast.success("Account number copied.");
    } catch {
      toast.error("Couldn't access clipboard.");
    }
  };

  return (
    <motion.article
      className={`beneficiary-row ${
        beneficiary.trusted
          ? "is-trusted"
          : "is-new"
      }`}
      layout
      initial={{
        opacity: 0,
        y: 18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        x: -30,
        height: 0,
        marginBottom: 0,
      }}
      transition={{
        delay: index * 0.04,
        duration: 0.32,
      }}
      whileHover={{
        y: -2,
        transition: { duration: 0.18 },
      }}
      data-testid={`beneficiary-${beneficiary._id}`}
    >
      <div className="beneficiary-row__main">
        <div className="beneficiary-avatar">
          {initials}

          <span
            className={`beneficiary-avatar__status ${
              beneficiary.trusted
                ? "is-trusted"
                : "is-new"
            }`}
          />
        </div>

        <div className="beneficiary-row__info">
          <div className="beneficiary-row__name">
            <strong>
              {beneficiary.nickname ||
                beneficiary.name}
            </strong>

            {beneficiary.nickname &&
              beneficiary.name !==
                beneficiary.nickname && (
                <span>
                  {beneficiary.name}
                </span>
              )}
          </div>

          <div className="beneficiary-row__bank">
            <Building2 size={13} />
            <span>
              {beneficiary.bankName ||
                "Bank account"}
            </span>
            <i />
            <span>{maskedAccount}</span>
            <i />
            <span>
              {beneficiary.ifsc}
            </span>
          </div>
        </div>
      </div>

      <div className="beneficiary-row__meta">
        <RiskChip
          level={
            beneficiary.trusted
              ? "LOW"
              : "MEDIUM"
          }
          size="sm"
        >
          {beneficiary.trusted
            ? "Trusted"
            : "New"}
        </RiskChip>
      </div>

      <div className="beneficiary-row__actions">
        <motion.button
          type="button"
          className="beneficiary-action beneficiary-action--copy"
          onClick={copyAccount}
          whileTap={{ scale: 0.9 }}
          title="Copy account number"
        >
          <Copy size={15} />
        </motion.button>

        <motion.button
          type="button"
          className="beneficiary-action beneficiary-action--transfer"
          onClick={() => {
            window.location.href =
              "/app/transfer";
          }}
          whileHover={{
            scale: 1.04,
          }}
          whileTap={{
            scale: 0.96,
          }}
        >
          <ArrowUpRight size={15} />
          Transfer
        </motion.button>

        <motion.button
          type="button"
          className="beneficiary-action beneficiary-action--delete"
          onClick={remove}
          disabled={removing}
          whileTap={{ scale: 0.9 }}
          data-testid={`delete-beneficiary-${beneficiary._id}`}
          aria-label="Remove beneficiary"
          title="Remove beneficiary"
        >
          <Trash2 size={16} />
        </motion.button>
      </div>
    </motion.article>
  );
}

/* -------------------------------------------------------
   MODAL
------------------------------------------------------- */

function BeneficiaryModal({
  onClose,
  onDone,
}) {
  const [values, setValues] = useState({
    name: "",
    accountNumber: "",
    ifsc: "",
    bankName: "",
    nickname: "",
  });

  const [loading, setLoading] =
    useState(false);

  const [errors, setErrors] =
    useState({});

  const toast = useToast();

  const update = (field, value) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    const next = {};

    if (!values.name.trim()) {
      next.name = "Required";
    }

    if (
      !/^[0-9]{6,20}$/.test(
        values.accountNumber
      )
    ) {
      next.accountNumber =
        "Enter 6–20 digits";
    }

    if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(
        values.ifsc
      )
    ) {
      next.ifsc =
        "Example: HDFC0001234";
    }

    if (!values.bankName.trim()) {
      next.bankName = "Required";
    }

    setErrors(next);

    if (Object.keys(next).length) {
      return;
    }

    setLoading(true);

    try {
      await beneficiaryService.create({
        ...values,
        name: values.name.trim(),
        bankName: values.bankName.trim(),
        nickname:
          values.nickname.trim() || "",
        ifsc: values.ifsc.toUpperCase(),
      });

      toast.success(
        "Beneficiary added successfully."
      );

      onDone();
    } catch (err) {
      toast.error(
        err.message ||
          "Could not add beneficiary."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="beneficiary-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
    >
      <motion.div
        className="beneficiary-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="beneficiary-modal-title"
        initial={{
          opacity: 0,
          y: 35,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: 20,
          scale: 0.97,
        }}
        transition={{
          duration: 0.28,
        }}
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >
        <button
          type="button"
          className="beneficiary-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="beneficiary-modal__top">
          <div className="beneficiary-modal__icon">
            <UserPlus size={22} />
          </div>

          <div>
            <span className="beneficiary-modal__eyebrow">
              NEW PAYEE
            </span>

            <h2 id="beneficiary-modal-title">
              Add beneficiary
            </h2>

            <p>
              Add a trusted recipient for
              future transfers.
            </p>
          </div>
        </div>

        <div className="beneficiary-modal__security">
          <ShieldCheck size={17} />

          <span>
            Your beneficiary details are
            protected by NexusBank security.
          </span>
        </div>

        <form
          onSubmit={submit}
          className="beneficiary-form"
          data-testid="beneficiary-form"
        >
          <div className="beneficiary-form__grid">
            <Input
              label="Full name"
              value={values.name}
              onChange={(e) =>
                update(
                  "name",
                  e.target.value
                )
              }
              error={errors.name}
              data-testid="bene-name"
            />

            <Input
              label="Nickname"
              placeholder="Optional"
              value={values.nickname}
              onChange={(e) =>
                update(
                  "nickname",
                  e.target.value
                )
              }
              data-testid="bene-nickname"
            />

            <Input
              label="Account number"
              value={
                values.accountNumber
              }
              onChange={(e) =>
                update(
                  "accountNumber",
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              error={
                errors.accountNumber
              }
              data-testid="bene-account"
            />

            <Input
              label="IFSC code"
              value={values.ifsc}
              onChange={(e) =>
                update(
                  "ifsc",
                  e.target.value.toUpperCase()
                )
              }
              error={errors.ifsc}
              data-testid="bene-ifsc"
            />
          </div>

          <Input
            label="Bank name"
            value={values.bankName}
            onChange={(e) =>
              update(
                "bankName",
                e.target.value
              )
            }
            error={errors.bankName}
            data-testid="bene-bank"
          />

          <div className="beneficiary-form__actions">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={loading}
              data-testid="bene-submit"
            >
              <CheckCircle2 size={16} />
              Save beneficiary
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}