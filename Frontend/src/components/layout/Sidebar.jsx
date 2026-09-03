import { useState } from "react";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  Send,
  Users,
  Receipt,
  PiggyBank,
  Landmark,
  Gift,
  Bell,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Settings,
  BarChart3,
  UserSearch,
  ScrollText,
  Search,
  Crown,
  ArrowUpRight,
  X,
  Check,
  Zap,
  Headphones,
  Star,
} from "lucide-react";
import "./Sidebar.css";

const CUSTOMER_LINKS = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/accounts", label: "My Accounts", icon: Wallet },
  { to: "/app/transfer", label: "Transfer", icon: Send },
  { to: "/app/beneficiaries", label: "Beneficiaries", icon: Users },
  { to: "/app/transactions", label: "Transactions", icon: Receipt },
  { to: "/app/fd", label: "Fixed Deposits", icon: PiggyBank },
  { to: "/app/ppf", label: "PPF", icon: Landmark },
  { to: "/app/rewards", label: "Rewards", icon: Gift },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
  { to: "/app/security", label: "Security", icon: ShieldCheck },
  { to: "/app/fraud", label: "Fraud events", icon: ShieldAlert },
  { to: "/app/settings", label: "Settings", icon: Settings },
  { to: "/app/demo", label: "Fraud Demo", icon: Sparkles },
];

const ADMIN_LINKS = [
  { to: "/admin/overview", label: "Overview", icon: BarChart3 },
  { to: "/admin/users", label: "Users", icon: UserSearch },
  { to: "/admin/transactions", label: "Transactions", icon: Receipt },
  { to: "/admin/fraud", label: "Fraud monitoring", icon: ShieldAlert },
  { to: "/admin/audit", label: "Audit logs", icon: ScrollText },
];

export function Sidebar({ scope = "customer" }) {
  const navigate = useNavigate();

  const links =
    scope === "admin"
      ? ADMIN_LINKS
      : CUSTOMER_LINKS;

  const [showPrime, setShowPrime] = useState(false);

  const closePrime = () => {
    setShowPrime(false);
  };

  const handlePrimeContinue = () => {
    closePrime();
    navigate("/app/accounts?premium=upgrade");
  };

  return (
    <>
      <aside
        className="sidebar"
        data-testid="sidebar"
      >
        {/* BRAND */}
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            N
          </div>

          <div
            className="stack"
            style={{ gap: 2 }}
          >
            <strong>NexusBank</strong>

            <span
              className="eyebrow"
              style={{
                letterSpacing: "0.08em",
              }}
            >
              {scope === "admin"
                ? "Admin console"
                : "Smart Banking"}
            </span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav
          className="sidebar__nav"
          aria-label="Primary"
        >
          {links.map(
            ({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `sidebar__link ${
                    isActive ? "is-active" : ""
                  }`
                }
                data-testid={`nav-${label
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                <Icon
                  size={18}
                  strokeWidth={1.8}
                />
                <span>{label}</span>
              </NavLink>
            )
          )}
        </nav>

        {/* NEXUS PRIME */}
        {scope === "customer" && (
          <button
            type="button"
            className="sidebar__premium"
            data-testid="sidebar-premium"
            onClick={() => setShowPrime(true)}
            aria-label="Open Nexus Prime benefits"
          >
            <div className="sidebar__premium-glow" />
            <div className="sidebar__premium-shine" />

            <div className="sidebar__premium-header">
              <div className="sidebar__premium-icon">
                <Crown
                  size={15}
                  strokeWidth={1.9}
                />
              </div>

              <span className="sidebar__premium-label">
                PREMIUM
              </span>
            </div>

            <div className="sidebar__premium-title">
              Nexus Prime
            </div>

            <div className="sidebar__premium-subtitle">
              Priority Banking
            </div>

            <div className="sidebar__premium-line">
              <span />
              <span />
              <span />
            </div>

            <div className="sidebar__premium-bottom">
              <span>
                Exclusive benefits
              </span>

              <div className="sidebar__premium-arrow">
                <ArrowUpRight
                  size={13}
                  strokeWidth={2}
                />
              </div>
            </div>
          </button>
        )}

        {/* FOOTER */}
        <div className="sidebar__foot">
          <Search size={14} />

          <span className="subtle">
            v1.0 · Portfolio demo
          </span>
        </div>
      </aside>

      {/* =====================================================
          NEXUS PRIME MODAL
          ===================================================== */}
      {showPrime &&
        scope === "customer" && (
          <div
            className="prime-modal-backdrop"
            onClick={closePrime}
            role="presentation"
          >
            <div
              className="prime-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="prime-modal-title"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              {/* CLOSE */}
              <button
                type="button"
                className="prime-modal__close"
                onClick={closePrime}
                aria-label="Close Nexus Prime"
              >
                <X size={17} />
              </button>

              <div className="prime-modal__ambient" />

              {/* HERO */}
              <div className="prime-modal__hero">
                <div className="prime-modal__crown">
                  <Crown
                    size={27}
                    strokeWidth={1.6}
                  />
                </div>

                <div>
                  <span className="prime-modal__eyebrow">
                    NEXUSBANK
                  </span>

                  <h2 id="prime-modal-title">
                    Nexus Prime
                  </h2>

                  <p>
                    Your priority banking
                    experience
                  </p>
                </div>
              </div>

              {/* STATUS */}
              <div className="prime-modal__status">
                <span className="prime-modal__status-dot" />
                Premium experience
              </div>

              <div className="prime-modal__divider" />

              {/* FEATURES */}
              <div className="prime-modal__features">
                <div className="prime-modal__feature">
                  <div className="prime-modal__feature-icon">
                    <Headphones size={17} />
                  </div>

                  <div>
                    <strong>
                      Priority Support
                    </strong>

                    <span>
                      Faster assistance whenever
                      you need it
                    </span>
                  </div>

                  <Check size={15} />
                </div>

                <div className="prime-modal__feature">
                  <div className="prime-modal__feature-icon">
                    <Star size={17} />
                  </div>

                  <div>
                    <strong>
                      Exclusive Rewards
                    </strong>

                    <span>
                      Access to premium banking
                      benefits
                    </span>
                  </div>

                  <Check size={15} />
                </div>

                <div className="prime-modal__feature">
                  <div className="prime-modal__feature-icon">
                    <Zap size={17} />
                  </div>

                  <div>
                    <strong>
                      Priority Transactions
                    </strong>

                    <span>
                      A smoother premium banking
                      experience
                    </span>
                  </div>

                  <Check size={15} />
                </div>
              </div>

              {/* FOOTER */}
              <div className="prime-modal__footer">
                <div>
                  <span className="prime-modal__footer-label">
                    MEMBERSHIP
                  </span>

                  <strong>
                    Nexus Prime
                  </strong>
                </div>

                {/* ONLY ONE CONTINUE BUTTON */}
                <button
                  type="button"
                  className="prime-modal__continue"
                  onClick={handlePrimeContinue}
                >
                  Continue
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}