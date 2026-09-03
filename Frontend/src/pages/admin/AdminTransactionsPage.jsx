import { useState } from "react";
import { adminService } from "../../services/adminService.js";
import { useApi } from "../../hooks/useApi.js";
import { Card, CardHeader } from "../../components/common/Card.jsx";
import { RiskChip } from "../../components/common/RiskChip.jsx";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { formatPaise } from "../../utils/money.js";
import { formatDateTime } from "../../utils/date.js";

const DECISIONS = ["ALL", "COMPLETED", "VERIFICATION_REQUIRED", "BLOCKED"];

export function AdminTransactionsPage() {
  const [decision, setDecision] = useState("ALL");
  const params = decision === "ALL" ? { limit: 100 } : { limit: 100, fraudDecision: decision };
  const { data, loading, error, refetch } = useApi(() => adminService.transactions(params), [decision]);
  if (error) return <ErrorState description={error.message} onRetry={refetch} />;

  return (
    <div className="stack stack-6">
      <header className="row-flex between wrap gap-3">
        <div className="stack stack-2">
          <span className="eyebrow">Ledger</span>
          <h1>All transactions</h1>
          <p className="muted">Every transfer across every customer, with the fraud engine's decision.</p>
        </div>
        <div className="row-flex gap-2 wrap">
          {DECISIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDecision(d)}
              className="btn btn--sm"
              style={{
                background: decision === d ? "var(--color-brand)" : "transparent",
                color: decision === d ? "var(--color-brand-ink)" : "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
              data-testid={`admin-tx-filter-${d.toLowerCase()}`}
            >
              {d.replace("_", " ")}
            </button>
          ))}
        </div>
      </header>

      <Card>
        <CardHeader eyebrow="Records" title={`${data?.total ?? 0} shown`} />
        {loading ? (
          <div className="stack stack-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={54} radius={12} />)}
          </div>
        ) : (data?.items || []).length === 0 ? (
          <EmptyState title="No transactions match this filter" />
        ) : (
          <div className="stack" style={{ gap: 0 }} data-testid="admin-tx-list">
            {data.items.map((tx) => (
              <div key={tx._id} className="row-flex between" style={{ padding: "12px 6px", borderBottom: "1px solid var(--color-border)" }}>
                <div className="stack" style={{ gap: 2 }}>
                  <strong style={{ fontSize: 14 }}>
                    {tx.user?.name || "?"} → {tx.beneficiary?.name || "?"}
                  </strong>
                  <span className="subtle" style={{ fontSize: 11 }}>
                    {tx.user?.email} · {formatDateTime(tx.createdAt)}
                  </span>
                </div>
                <div className="row-flex gap-3">
                  <span className="number-display" style={{ fontWeight: 600 }}>{formatPaise(tx.amountPaise)}</span>
                  <RiskChip level={tx.riskLevel} size="sm">
                    {tx.fraudDecision.replace("_", " ")}
                  </RiskChip>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}