import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { paiseToRupees, formatCompact } from "../../utils/money.js";
import { Card, CardHeader } from "../common/Card.jsx";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function CashFlowChart({ series = [] }) {
  const data = series.map((row) => ({
    name: `${MONTH_LABELS[row.month - 1]} ${String(row.year).slice(-2)}`,
    spent: paiseToRupees(row.spentPaise),
    count: row.count,
  }));

  return (
    <Card>
      <CardHeader eyebrow="Analytics" title="Cash flow" />
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="cash-flow-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" stroke="var(--color-text-subtle)" fontSize={12} axisLine={false} tickLine={false} />
            <YAxis
              stroke="var(--color-text-subtle)"
              fontSize={12}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCompact(v * 100)}
              width={64}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                fontSize: 12,
              }}
              formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Spent"]}
            />
            <Area type="monotone" dataKey="spent" stroke="var(--color-accent)" strokeWidth={2} fill="url(#cash-flow-fill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}