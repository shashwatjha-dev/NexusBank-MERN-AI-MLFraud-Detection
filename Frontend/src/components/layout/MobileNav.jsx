import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Send, Receipt, ShieldCheck, Sparkles,
  BarChart3, ShieldAlert, ScrollText,
} from "lucide-react";
import "./MobileNav.css";

const CUSTOMER = [
  { to: "/app/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/app/transfer", label: "Send", icon: Send },
  { to: "/app/transactions", label: "History", icon: Receipt },
  { to: "/app/security", label: "Security", icon: ShieldCheck },
  { to: "/app/demo", label: "Demo", icon: Sparkles },
];

const ADMIN = [
  { to: "/admin/overview", label: "Overview", icon: BarChart3 },
  { to: "/admin/fraud", label: "Fraud", icon: ShieldAlert },
  { to: "/admin/audit", label: "Audit", icon: ScrollText },
];

export function MobileNav({ scope = "customer" }) {
  const links = scope === "admin" ? ADMIN : CUSTOMER;
  return (
    <nav className="mnav" aria-label="Primary (mobile)">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `mnav__link ${isActive ? "is-active" : ""}`}
          data-testid={`mobile-nav-${label.toLowerCase()}`}
        >
          <Icon size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}