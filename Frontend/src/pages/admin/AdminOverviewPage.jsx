import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Users, Activity, ShieldAlert, Ban } from "lucide-react";
import { adminService } from "../../services/adminService.js";
import { useApi } from "../../hooks/useApi.js";
import { Card, CardHeader } from "../../components/common/Card.jsx";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { formatCompact } from "../../utils/money.js";

const KPIS = [
  { key: "users", label: "Users", icon: Users, get: (s) => s.users?.total ?? 0 },
  { key: "tx",    label: "Transactions", icon: Activity, get: (s) => s.transactions?.count ?? 0 },
  { key: "vol",   label: "Volume", icon: Activity, get: (s) => formatCompact(s.transactions?.volumePaise ?? 0) },
  { key: "high",  label: "High-risk", icon: ShieldAlert, get: (s) => s.risk?.HIGH ?? 0 },
  { key: "block", label: "Blocked", icon: Ban, get: (s) => s.decisions?.BLOCKED ?? 0 },
  { key: "open",  label: "Open cases", icon: ShieldAlert, get: (s) => s.openFraudCases ?? 0 },
];

export function AdminOverviewPage() {
  const { data, loading, error, refetch } = useApi(() => adminService.overview(), []);
  if (error) return <ErrorState description={error.message} onRetry={refetch} />;

  const snapshot = data?.snapshot || {};
  const trend = data?.trend || [];

  // Pivot trend into daily total series
  const daily = trend.reduce((acc, row) => {
    const key = `${row.month}/${row.day}`;
    const existing = acc.find((r) => r.name === key);
    if (existing) existing[row.riskLevel] = row.count;
    else acc.push({ name: key, [row.riskLevel]: row.count });
    return acc;
  }, []);

  return (
    <div className="stack stack-6">
      <header className="stack stack-2">
        <span className="eyebrow">Command center</span>
        <h1>Admin overview</h1>
        <p className="muted">Live snapshot of users, transactions, and fraud activity across NexusBank.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {KPIS.map(({ key, label, icon: Icon, get }) => (
          <Card key={key} data-testid={`kpi-${key}`}>
            <div className="row-flex between">
              <span className="eyebrow">{label}</span>
              <Icon size={16} className="subtle" />
            </div>
            <div className="number-display" style={{ fontFamily: "var(--font-display)", fontSize: 32, marginTop: 8, fontWeight: 600 }}>
              {loading ? <Skeleton width={80} height={32} /> : get(snapshot)}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader eyebrow="Trend" title="Fraud events (last 14 days)" />
        <div style={{ width: "100%", height: 260 }}>
          {loading ? <Skeleton height={240} /> : (
            <ResponsiveContainer>
              <LineChart data={daily}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-subtle)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-subtle)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="MEDIUM" stroke="var(--risk-medium)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="HIGH" stroke="var(--risk-high)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}