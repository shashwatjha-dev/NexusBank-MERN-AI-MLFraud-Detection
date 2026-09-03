import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Card, CardHeader } from "../common/Card.jsx";
import { RiskChip } from "../common/RiskChip.jsx";
import { Skeleton } from "../common/Skeleton.jsx";
import { EmptyState } from "../common/EmptyState.jsx";
import { formatPaise } from "../../utils/money.js";
import { formatDateTime } from "../../utils/date.js";
import "./RecentTransactions.css";

export function RecentTransactions({ items = [], loading, limit = 6 }) {
  return (
    <Card>
      <CardHeader
        eyebrow="History"
        title="Recent transactions"
        action={
          <Link to="/app/transactions" className="row-flex gap-2 subtle" data-testid="see-all-transactions">
            See all <ArrowUpRight size={14} />
          </Link>
        }
      />
      {loading ? (
        <div className="stack stack-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={44} radius={12} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No transactions yet" description="Once you make a transfer it will appear here with its risk analysis." />
      ) : (
        <ul className="tx-list" data-testid="recent-transactions">
          {items.slice(0, limit).map((tx) => (
            <li key={tx._id || tx.id} className="tx-list__row">
              <div className="tx-list__left">
                <div className="tx-list__avatar" aria-hidden>
                  {(tx.beneficiary?.name || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="stack" style={{ gap: 2 }}>
                  <strong>{tx.beneficiary?.name || "Unknown payee"}</strong>
                  <span className="subtle" style={{ fontSize: 12 }}>
                    {tx.category || "Transfer"} · {formatDateTime(tx.createdAt)}
                  </span>
                </div>
              </div>
              <div className="tx-list__right">
                <span className="tx-list__amount number-display">− {formatPaise(tx.amountPaise)}</span>
                <RiskChip level={tx.riskLevel || "LOW"} size="sm">
                  {tx.status === "BLOCKED" ? "BLOCKED" : (tx.riskLevel || "LOW")}
                </RiskChip>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}