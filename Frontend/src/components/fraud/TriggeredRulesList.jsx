import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import "./TriggeredRulesList.css";

export function TriggeredRulesList({ rules = [], emptyMessage = "No fraud rules were triggered." }) {
  if (!rules.length) {
    return <p className="trigger-list__empty muted">{emptyMessage}</p>;
  }
  return (
    <ul className="trigger-list" data-testid="triggered-rules-list">
      {rules.map((rule, index) => (
        <motion.li
          key={rule.code || index}
          className="trigger-list__row"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <CheckCircle2 size={16} className="trigger-list__icon" />
          <div className="trigger-list__body">
            <div className="row-flex between">
              <strong>{rule.label || rule.code}</strong>
              <span className="trigger-list__contribution">+{rule.contribution}</span>
            </div>
            {rule.evidence && <p className="muted" style={{ fontSize: 13 }}>{rule.evidence}</p>}
          </div>
        </motion.li>
      ))}
    </ul>
  );
}