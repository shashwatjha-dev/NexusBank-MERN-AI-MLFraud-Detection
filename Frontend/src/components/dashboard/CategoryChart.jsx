import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { paiseToRupees } from "../../utils/money.js";
import { Card, CardHeader } from "../common/Card.jsx";

const COLORS = ["#1f7a4d", "#b8500e", "#0b1220", "#5ee3a1", "#8a8d87", "#c1352c"];

export function CategoryChart({ items = [] }) {
  const data = items.slice(0, 6).map((row) => ({
    name: row._id || "Other",
    value: paiseToRupees(row.totalPaise),
  }));
  const total = data.reduce((sum, row) => sum + row.value, 0);

  return (
    <Card>
      <CardHeader eyebrow="Spending" title="By category" />
      <div style={{ width: "100%", height: 240 }}>
        {total === 0 ? (
          <p className="muted" style={{ textAlign: "center", padding: "48px 0" }}>
            No completed transactions yet.
          </p>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={54}
                outerRadius={90}
                paddingAngle={3}
                stroke="var(--color-surface)"
                strokeWidth={2}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  fontSize: 12,
                }}
                formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`]}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: "var(--color-text-muted)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}