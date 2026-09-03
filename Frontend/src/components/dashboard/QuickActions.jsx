import { Link } from "react-router-dom";
import { Send, UserPlus, Receipt, PiggyBank, Sparkles } from "lucide-react";
import "./QuickActions.css";

const ITEMS = [
  { to: "/app/transfer",      label: "Transfer",      icon: Send },
  { to: "/app/beneficiaries", label: "Beneficiary",   icon: UserPlus },
  { to: "/app/transactions",  label: "Transactions",  icon: Receipt },
  { to: "/app/fd",            label: "Create FD",     icon: PiggyBank },
  { to: "/app/demo",          label: "Fraud Demo",    icon: Sparkles },
];

export function QuickActions() {
  return (
    <div className="quick" data-testid="quick-actions">
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} className="quick__item" data-testid={`quick-${label.toLowerCase().replace(/\s+/g, "-")}`}>
          <span className="quick__icon"><Icon size={18} strokeWidth={1.8} /></span>
          <span className="quick__label">{label}</span>
        </Link>
      ))}
    </div>
  );
}