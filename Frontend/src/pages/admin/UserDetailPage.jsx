import { useParams } from "react-router-dom";
import { Ban, ShieldCheck } from "lucide-react";
import { adminService } from "../../services/adminService.js";
import { useApi } from "../../hooks/useApi.js";
import { Card, CardHeader } from "../../components/common/Card.jsx";
import { Button } from "../../components/common/Button.jsx";
import { RiskChip } from "../../components/common/RiskChip.jsx";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { formatPaise } from "../../utils/money.js";
import { formatDateTime } from "../../utils/date.js";
import { useToast } from "../../hooks/useToast.js";

export function UserDetailPage() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useApi(() => adminService.user(id), [id]);
  const toast = useToast();
  if (error) return <ErrorState description={error.message} onRetry={refetch} />;
  if (loading || !data) return <Skeleton height={400} />;

  const { user, transactions = [], fraudLogs = [] } = data;

  const toggle = async () => {
    try {
      if (user.blocked) await adminService.unblock(user._id);
      else await adminService.block(user._id);
      toast.success(user.blocked ? "User unblocked." : "User blocked.");
      refetch();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="stack stack-6">
      <header className="row-flex between wrap gap-3">
        <div className="stack stack-2">
          <span className="eyebrow">Customer</span>
          <h1>{user.name}</h1>
          <p className="muted">{user.email} · {user.accountNumber} · {user.role}</p>
        </div>
        <Button
          variant={user.blocked ? "primary" : "danger"}
          icon={user.blocked ? ShieldCheck : Ban}
          onClick={toggle}
          data-testid="admin-user-toggle-block"
        >
          {user.blocked ? "Unblock user" : "Block user"}
        </Button>
      </header>

      <Card>
        <CardHeader eyebrow="Activity" title={`Recent transactions (${transactions.length})`} />
        {transactions.length === 0 ? (
          <p className="muted">No transactions recorded.</p>
        ) : (
          <div className="stack" style={{ gap: 0 }} data-testid="user-transactions">
            {transactions.slice(0, 20).map((tx) => (
              <div key={tx._id} className="row-flex between" style={{ padding: "10px 6px", borderBottom: "1px solid var(--color-border)" }}>
                <div className="stack" style={{ gap: 2 }}>
                  <strong style={{ fontSize: 14 }}>{formatPaise(tx.amountPaise)}</strong>
                  <span className="subtle" style={{ fontSize: 11 }}>{tx.description || "Transfer"} · {formatDateTime(tx.createdAt)}</span>
                </div>
                <RiskChip level={tx.riskLevel} size="sm" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader eyebrow="Fraud history" title={`${fraudLogs.length} event(s)`} />
        {fraudLogs.length === 0 ? (
          <p className="muted">No fraud events on record.</p>
        ) : (
          <div className="stack" style={{ gap: 0 }} data-testid="user-fraud-logs">
            {fraudLogs.map((log) => (
              <div key={log._id} className="row-flex between" style={{ padding: "10px 6px", borderBottom: "1px solid var(--color-border)" }}>
                <div className="stack" style={{ gap: 2 }}>
                  <strong style={{ fontSize: 14 }}>Score {log.riskScore} · {log.decision}</strong>
                  <span className="subtle" style={{ fontSize: 11 }}>{formatDateTime(log.createdAt)}</span>
                </div>
                <RiskChip level={log.riskLevel} size="sm" />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}