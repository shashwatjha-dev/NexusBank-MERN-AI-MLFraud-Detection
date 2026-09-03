import { useState } from "react";
import { Search } from "lucide-react";
import { adminService } from "../../services/adminService.js";
import { useApi } from "../../hooks/useApi.js";
import { Card, CardHeader } from "../../components/common/Card.jsx";
import { Input } from "../../components/common/Input.jsx";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { formatDateTime } from "../../utils/date.js";

export function AuditLogsPage() {
  const [action, setAction] = useState("");
  const params = { limit: 200, ...(action && { action }) };
  const { data, loading, error, refetch } = useApi(() => adminService.audit(params), [action]);
  if (error) return <ErrorState description={error.message} onRetry={refetch} />;

  return (
    <div className="stack stack-6">
      <header className="stack stack-2">
        <span className="eyebrow">Trail</span>
        <h1>Audit logs</h1>
        <p className="muted">Every state-changing action across the platform, immutable and timestamped.</p>
      </header>

      <Input
        placeholder="Filter by action (e.g. TRANSFER_COMPLETED, ADMIN_BLOCKED_USER)"
        iconLeft={Search}
        value={action}
        onChange={(e) => setAction(e.target.value.toUpperCase())}
        data-testid="audit-search"
      />

      <Card>
        <CardHeader eyebrow="Events" title={`${data?.total ?? 0} entries`} />
        {loading ? (
          <div className="stack stack-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={44} radius={10} />)}
          </div>
        ) : (data?.items || []).length === 0 ? (
          <EmptyState title="No audit entries match this filter" />
        ) : (
          <div className="stack" style={{ gap: 0 }} data-testid="audit-list">
            {data.items.map((row) => (
              <div key={row._id} className="row-flex between" style={{ padding: "12px 6px", borderBottom: "1px solid var(--color-border)" }}>
                <div className="stack" style={{ gap: 2 }}>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{row.action}</strong>
                  <span className="subtle" style={{ fontSize: 11 }}>
                    {row.actor?.name || "system"} → {row.targetUser?.name || "—"} · {formatDateTime(row.createdAt)}
                  </span>
                </div>
                {row.requestId && (
                  <span className="subtle" style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
                    {row.requestId.slice(0, 8)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}