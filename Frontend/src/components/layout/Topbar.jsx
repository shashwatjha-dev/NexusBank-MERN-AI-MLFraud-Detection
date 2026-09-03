
import {
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { useTheme } from "../../hooks/useTheme.js";
import { useToast } from "../../hooks/useToast.js";
import "./Topbar.css";

export function Topbar({ scope }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.info("You have been signed out.");
    navigate("/login", { replace: true });
  };

  const userName = user?.name || "Customer";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  const isDemo = scope === "demo";

  return (
    <header
      className={`topbar ${isDemo ? "topbar--demo" : ""}`}
      data-scope={scope || "customer"}
      data-testid="topbar"
    >
      {/* Premium ambient VFX */}
      <div
        className="topbar__ambient topbar__ambient--one"
        aria-hidden="true"
      />
      <div
        className="topbar__ambient topbar__ambient--two"
        aria-hidden="true"
      />
      <div
        className="topbar__ambient topbar__ambient--three"
        aria-hidden="true"
      />
      <div className="topbar__scanline" aria-hidden="true" />
      <div className="topbar__edge-glow" aria-hidden="true" />

      {/* =====================================================
          BANKING / DEMO SCOPE
          ===================================================== */}
      <div className="topbar__scope">
        <div className="topbar__scope-icon-wrap">
          {isDemo ? (
            <Zap
              size={16}
              strokeWidth={2}
              className="topbar__scope-icon topbar__scope-icon--demo"
            />
          ) : (
            <ShieldCheck
              size={15}
              strokeWidth={1.9}
              className="topbar__scope-icon"
            />
          )}
        </div>

        <div className="topbar__scope-copy">
          <span className="topbar__scope-label">
            {isDemo
              ? "Fraud Detection Demo"
              : scope === "admin"
                ? "Administrator"
                : "Personal Banking"}
          </span>

          <span className="topbar__scope-subtitle">
            {isDemo
              ? "AI-powered fraud analysis workspace"
              : scope === "admin"
                ? "Secure administration"
                : "Smart banking experience"}
          </span>
        </div>

        {isDemo ? (
          <span className="topbar__demo-live">
            <span className="topbar__demo-live-dot" aria-hidden="true" />
            <span>LIVE ENGINE ACTIVE</span>
          </span>
        ) : (
          <span className="topbar__live">
            <span className="topbar__live-dot" aria-hidden="true" />
            <span>SECURE</span>
          </span>
        )}
      </div>

      {/* =====================================================
          ACTIONS
          ===================================================== */}
      <div className="topbar__actions">
        <button
          className="topbar__icon-btn"
          onClick={toggle}
          type="button"
          aria-label={
            theme === "dark"
              ? "Switch to light theme"
              : "Switch to dark theme"
          }
          data-testid="theme-toggle"
        >
          <span className="topbar__icon-btn-glow" aria-hidden="true" />

          {theme === "dark" ? (
            <Sun size={17} strokeWidth={1.8} />
          ) : (
            <Moon size={17} strokeWidth={1.8} />
          )}
        </button>

        {isDemo && (
          <div className="topbar__premium-badge" aria-label="Premium Experience">
            <span className="topbar__premium-badge-icon">
              <Sparkles size={12} strokeWidth={2.2} />
            </span>
            <span>Premium Experience</span>
          </div>
        )}

        {/* =================================================
            USER PROFILE
            ================================================= */}
        <div className="topbar__user">
          <div className="topbar__user-glow" aria-hidden="true" />
          <div className="topbar__user-sweep" aria-hidden="true" />

          <div className="topbar__avatar" aria-hidden="true">
            <span>{userInitial}</span>
          </div>

          <div className="topbar__user-info">
            <div className="topbar__user-name-row">
              <strong>{userName}</strong>

              <Sparkles
                size={12}
                className="topbar__premium-spark"
                strokeWidth={2}
              />
            </div>

            <span className="topbar__premium-status">
              Premium Customer
            </span>

            <span
              className="topbar__email"
              title={userEmail}
            >
              {userEmail}
            </span>
          </div>

          <div className="topbar__user-arrow" aria-hidden="true">
            <span />
          </div>
        </div>

        {/* =================================================
            SIGN OUT
            ================================================= */}
        <button
          className="topbar__signout"
          type="button"
          onClick={handleSignOut}
          data-testid="signout-button"
        >
          <LogOut size={15} strokeWidth={1.9} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}