import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import { adminService } from "../../services/adminService.js";
import { useApi } from "../../hooks/useApi.js";
import { Card, CardHeader } from "../../components/common/Card.jsx";
import { Input } from "../../components/common/Input.jsx";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { RiskChip } from "../../components/common/RiskChip.jsx";
import { formatDateTime } from "../../utils/date.js";

export function UsersPage() {
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useApi(
    () => adminService.users({ search: search || undefined, limit: 100 }),
    [search]
  );
  if (error) return <ErrorState description={error.message} onRetry={refetch} />;

  return (
    <div className="stack stack-6">
      <header className="stack stack-2">
        <span className="eyebrow">Directory</span>
        <h1>Users</h1>
        <p className="muted">Search, inspect, block, or unblock any NexusBank customer.</p>
      </header>

      <Input
        placeholder="Search by name, email, or account number"
        iconLeft={Search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="admin-users-search"
      />

      <Card>
        <CardHeader eyebrow="List" title={`${data?.total ?? 0} users`} />
        {loading ? (
          <div className="stack stack-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={56} radius={12} />)}
          </div>
        ) : (data?.items || []).length === 0 ? (
          <EmptyState title="No users match" />
        ) : (
          <div className="stack" style={{ gap: 0 }} data-testid="admin-users-list">
            {data.items.map((u) => (
              <Link
                key={u._id}
                to={`/admin/users/${u._id}`}
                className="row-flex between"
                style={{ padding: "14px 6px", borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}
                data-testid={`admin-user-${u._id}`}
              >
                <div className="row-flex gap-3">
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "var(--color-brand)", color: "var(--color-brand-ink)",
                    display: "grid", placeItems: "center", fontWeight: 600, fontSize: 13,
                  }}>{u.name?.[0] || "?"}</div>
                  <div className="stack" style={{ gap: 2 }}>
                    <strong>{u.name}</strong>
                    <span className="subtle" style={{ fontSize: 12 }}>{u.email} · {u.accountNumber}</span>
                  </div>
                </div>
                <div className="row-flex gap-3">
                  <RiskChip level={u.blocked ? "HIGH" : "LOW"} size="sm">
                    {u.blocked ? "Blocked" : u.role}
                  </RiskChip>
                  <span className="subtle" style={{ fontSize: 11 }}>
                    {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}
                  </span>
                  <ChevronRight size={16} className="subtle" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}