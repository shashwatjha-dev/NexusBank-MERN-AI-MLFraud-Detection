import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatPaise, formatCompact } from "../../utils/money.js";
import "./BalanceCard.css";

export function BalanceCard({ account, monthOverMonthPercent, thisMonthSpentPaise }) {
  const trending = (monthOverMonthPercent ?? 0) >= 0;
  const last4 = (account?.accountNumber || "").slice(-4);

  return (
    <motion.div
      className="balance-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      data-testid="balance-card"
    >
      <div className="balance-card__grain" aria-hidden />
      <span className="balance-card__eyebrow">Total balance</span>
      <div className="balance-card__amount number-display">
        {account ? formatPaise(account.balancePaise) : "—"}
      </div>
      <div className="balance-card__meta">
        <div className="balance-card__pill">
          <span aria-hidden>••••</span>
          <strong>{last4 || "----"}</strong>
        </div>
        {monthOverMonthPercent !== null && monthOverMonthPercent !== undefined && (
          <div className={`balance-card__pill balance-card__pill--${trending ? "up" : "down"}`}>
            {trending ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <strong>{Math.abs(monthOverMonthPercent)}%</strong>
            <span>this month</span>
          </div>
        )}
      </div>
      <div className="balance-card__footer">
        <div>
          <span className="eyebrow">Spent this month</span>
          <strong className="number-display">{formatCompact(thisMonthSpentPaise || 0)}</strong>
        </div>
        <div>
          <span className="eyebrow">Available</span>
          <strong className="number-display">
            {account ? formatCompact(account.availableBalancePaise) : "—"}
          </strong>
        </div>
      </div>
    </motion.div>
  );
}