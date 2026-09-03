import { RISK_COLOR_VAR } from "../../utils/enums.js";
import "./RiskChip.css";

export function RiskChip({ level = "LOW", size = "md", children }) {
  return (
    <span
      className={`risk-chip risk-chip--${size}`}
      style={{ "--risk-color": RISK_COLOR_VAR[level] }}
      data-level={level}
    >
      <span className="risk-chip__dot" />
      {children || level}
    </span>
  );
}