import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Wallet, Tag, Star } from "lucide-react";
import { Input } from "../common/Input.jsx";
import { Button } from "../common/Button.jsx";
import { formatPaise, rupeesToPaise } from "../../utils/money.js";
import { newIdempotencyKey } from "../../utils/idempotency.js";
import "./TransferForm.css";

const CATEGORIES = ["Transfer", "Bills", "Food", "Shopping", "Travel", "Entertainment"];

/**
 * TransferForm — Phase 5 aware.
 *
 * Accepts a list of accounts and lets the user pick the source. Falls back
 * to the primary account (or the first available active account) when the
 * caller passes a single account. Passes `sourceAccountId` on submit —
 * omitted only when the account list is empty, in which case the backend
 * defaults to the primary account.
 */
export function TransferForm({
  account,            // legacy: single account (still supported)
  accounts,           // Phase 5: array of accounts
  beneficiaries = [],
  onSubmit,
  loading,
}) {
  const accountList = useMemo(() => {
    if (Array.isArray(accounts) && accounts.length > 0) return accounts;
    if (account) return [account];
    return [];
  }, [accounts, account]);

  const defaultSourceId = useMemo(() => {
    const primary = accountList.find(
      (a) => a.isPrimary && a.status === "ACTIVE"
    );
    if (primary) return primary._id;
    const anyActive = accountList.find((a) => a.status === "ACTIVE");
    return anyActive?._id || accountList[0]?._id || "";
  }, [accountList]);

  const [values, setValues] = useState({
    beneficiaryId: "",
    sourceAccountId: defaultSourceId,
    amount: "",
    category: "Transfer",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [idempotencyKey] = useState(() => newIdempotencyKey());

  // Keep sourceAccountId in sync when the account list finishes loading.
  useEffect(() => {
    if (!values.sourceAccountId && defaultSourceId) {
      setValues((prev) => ({ ...prev, sourceAccountId: defaultSourceId }));
    }
  }, [defaultSourceId, values.sourceAccountId]);

  const selectedBeneficiary = useMemo(
    () => beneficiaries.find((b) => b._id === values.beneficiaryId),
    [beneficiaries, values.beneficiaryId]
  );

  const selectedAccount = useMemo(
    () => accountList.find((a) => a._id === values.sourceAccountId),
    [accountList, values.sourceAccountId]
  );

  const change = (field, value) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!values.beneficiaryId) nextErrors.beneficiaryId = "Select a beneficiary.";
    if (!values.sourceAccountId) nextErrors.sourceAccountId = "Select a source account.";
    const paise = rupeesToPaise(values.amount);
    if (!paise || paise <= 0) nextErrors.amount = "Enter a positive amount.";
    if (
      paise &&
      selectedAccount?.availableBalancePaise != null &&
      paise > selectedAccount.availableBalancePaise
    ) {
      nextErrors.amount = "Amount exceeds available balance.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit({
      beneficiaryId: values.beneficiaryId,
      sourceAccountId: values.sourceAccountId || undefined,
      amountPaise: paise,
      category: values.category,
      description: values.description || undefined,
      idempotencyKey,
    });
  };

  const mask = (num = "") => {
    const digits = String(num).replace(/\D/g, "");
    return digits.length > 4 ? `••••${digits.slice(-4)}` : digits;
  };

  return (
    <motion.form
      onSubmit={submit}
      className="transfer-form stack stack-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="transfer-form"
    >
      {accountList.length > 1 && (
        <label className="transfer-form__field">
          <span className="field__label">From account</span>
          <select
            className="transfer-form__select"
            value={values.sourceAccountId}
            onChange={(e) => change("sourceAccountId", e.target.value)}
            data-testid="transfer-source-account"
          >
            {accountList.map((a) => (
              <option key={a._id} value={a._id} disabled={a.status !== "ACTIVE"}>
                {(a.label || `${a.accountType} Account`)} · {mask(a.accountNumber)} · {formatPaise(a.availableBalancePaise)}
                {a.isPrimary ? " · Primary" : ""}
                {a.status !== "ACTIVE" ? " · Frozen" : ""}
              </option>
            ))}
          </select>
          {errors.sourceAccountId && (
            <span className="field__msg field__msg--error">{errors.sourceAccountId}</span>
          )}
        </label>
      )}

      {accountList.length === 1 && selectedAccount && (
        <div className="transfer-form__source-hint">
          <span className="eyebrow">From</span>
          <strong>
            {selectedAccount.isPrimary && (
              <Star size={12} fill="currentColor" style={{ verticalAlign: -1, marginRight: 4 }} />
            )}
            {selectedAccount.label || `${selectedAccount.accountType} Account`}
          </strong>
          <span className="subtle">
            {mask(selectedAccount.accountNumber)} · {formatPaise(selectedAccount.availableBalancePaise)}
          </span>
        </div>
      )}

      <label className="transfer-form__field">
        <span className="field__label">To beneficiary</span>
        <select
          className="transfer-form__select"
          value={values.beneficiaryId}
          onChange={(e) => change("beneficiaryId", e.target.value)}
          data-testid="transfer-beneficiary"
        >
          <option value="">Choose a beneficiary…</option>
          {beneficiaries.map((b) => {
            const isInternal = b.ifsc?.startsWith("NEXB0");
            return (
              <option key={b._id} value={b._id}>
                {b.name} · {b.bankName} · {isInternal ? "Internal" : b.trusted ? "Trusted" : "New"}
              </option>
            );
          })}
        </select>
        {errors.beneficiaryId && (
          <span className="field__msg field__msg--error">{errors.beneficiaryId}</span>
        )}
      </label>

      <Input
        label="Amount (₹)"
        type="number"
        min="1"
        step="0.01"
        placeholder="e.g. 2500"
        iconLeft={Wallet}
        value={values.amount}
        onChange={(e) => change("amount", e.target.value)}
        hint={
          selectedAccount
            ? `Available: ${formatPaise(selectedAccount.availableBalancePaise)}`
            : ""
        }
        error={errors.amount}
        data-testid="transfer-amount"
      />

      <label className="transfer-form__field">
        <span className="field__label">Category</span>
        <select
          className="transfer-form__select"
          value={values.category}
          onChange={(e) => change("category", e.target.value)}
          data-testid="transfer-category"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <Input
        label="Description (optional)"
        placeholder="e.g. Rent for February"
        iconLeft={Tag}
        value={values.description}
        onChange={(e) => change("description", e.target.value)}
        data-testid="transfer-description"
      />

      {selectedBeneficiary && (
        <div className="transfer-form__preview">
          <span className="eyebrow">Sending to</span>
          <strong>{selectedBeneficiary.name}</strong>
          <span className="subtle">
            {selectedBeneficiary.bankName} · ****{selectedBeneficiary.accountNumber?.slice(-4)}
            {selectedBeneficiary.ifsc?.startsWith("NEXB0") && " · NexusBank internal"}
          </span>
        </div>
      )}

      <Button type="submit" size="lg" icon={Send} loading={loading} data-testid="transfer-submit">
        Review &amp; send
      </Button>
    </motion.form>
  );
}