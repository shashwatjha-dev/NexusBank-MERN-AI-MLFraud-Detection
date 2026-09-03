import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Zap,
  LineChart,
  LockKeyhole,
  Activity,
  Users,
  ArrowUpRight,
  Globe2,
} from "lucide-react";
import { LoginForm } from "../../components/auth/LoginForm.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import "./AuthPages.css";

export function LoginPage() {
  const { startLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (credentials) => {
    setLoading(true);

    try {
      const result = await startLogin(credentials);

      if (result?.demoOtp) {
        toast.info(`Demo OTP: ${result.demoOtp}`, {
          title: "OTP issued",
          timeout: 8000,
        });
      }

      navigate("/otp");
    } catch (err) {
      toast.error(err.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      {/* Ambient background */}
      <div className="auth-page__ambient auth-page__ambient--one" />
      <div className="auth-page__ambient auth-page__ambient--two" />
      <div className="auth-page__grid" />

      {/* =====================================================
          LEFT SIDE
      ====================================================== */}
      <motion.section
        className="auth-hero"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
      >
        <header className="auth-brand">
          <div className="auth-brand__mark">
            N
          </div>

          <div>
            <strong>NexusBank</strong>
            <span>Smart Banking</span>
          </div>
        </header>

        <div className="auth-trusted">
          <span className="auth-trusted__dot" />
          Trusted by <strong>1M+ users</strong>

          <div className="auth-trusted__avatars">
            <span>A</span>
            <span>R</span>
            <span>S</span>
          </div>

          <ArrowUpRight size={13} />
        </div>

        <div className="auth-hero__content">
          <span className="auth-kicker">
            NEXT-GENERATION BANKING
          </span>

          <h1>
            Smart banking.
            <br />
            <span>Intelligent security.</span>
          </h1>

          <p>
            NexusBank combines a modern banking experience
            with an explainable, real-time fraud detection
            engine — right down to the last rule that fired
            on your transfer.
          </p>

          <div className="auth-features">
            <Feature
              icon={ShieldCheck}
              title="Rule-based + behavioural + ML fraud engine"
              description="Multi-layered protection that adapts in real time."
            />

            <Feature
              icon={Zap}
              title="Instant OTP on risky activity"
              description="Step-up authentication when it matters most."
            />

            <Feature
              icon={LineChart}
              title="Real-time spending analytics"
              description="Smart insights to help you spend, save and grow."
            />
          </div>
        </div>

        {/* Animated security visual */}
        <div className="security-visual">
          <div className="security-visual__rings">
            <span />
            <span />
            <span />
          </div>

          <motion.div
            className="security-visual__shield"
            animate={{
              y: [0, -8, 0],
              rotate: [0, 1.5, 0, -1.5, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <ShieldCheck size={70} strokeWidth={1.4} />

            <div className="security-visual__lock">
              <LockKeyhole size={32} />
            </div>
          </motion.div>

          <div className="security-node security-node--left">
            <LockKeyhole size={15} />
            <span>
              Fraud Shield
              <strong>Active</strong>
            </span>
          </div>

          <div className="security-node security-node--right">
            <Activity size={15} />
            <span>
              Real-time
              <strong>Monitoring</strong>
            </span>
          </div>

          <div className="security-particles">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>

        {/* Bottom trust cards */}
        <div className="auth-trust-grid">
          <TrustItem
            icon={LockKeyhole}
            title="Bank-grade security"
            text="256-bit encryption"
          />

          <TrustItem
            icon={ShieldCheck}
            title="Protected banking"
            text="RBI-ready architecture"
          />

          <TrustItem
            icon={Globe2}
            title="Always protected"
            text="24/7 threat monitoring"
          />
        </div>
      </motion.section>

      {/* =====================================================
          RIGHT SIDE
      ====================================================== */}
      <motion.section
        className="auth-panel"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.7,
          delay: 0.08,
        }}
      >
        <div className="auth-login-card">
          <div className="auth-login-card__glow" />

          <div className="auth-step">
            <span className="auth-step__dot" />
            Step 1 of 2
          </div>

          <div className="auth-login-card__heading">
            <span className="auth-welcome">
              Welcome back 👋
            </span>

            <h2>
              Sign in to <span>NexusBank</span>
            </h2>

            <p>
              Use your demo credentials to explore
              the dashboard.
            </p>
          </div>

          <LoginForm
            onSubmit={handleSubmit}
            loading={loading}
          />

          <div className="auth-security-footer">
            <ShieldCheck size={17} />

            <div>
              <strong>
                NexusBank keeps your money and data safe
              </strong>
              <span>
                Advanced encryption · Secure infrastructure ·
                Your trust, our priority
              </span>
            </div>

            <LockKeyhole size={16} />
          </div>
        </div>
      </motion.section>
    </main>
  );
}

function Feature({ icon: Icon, title, description }) {
  return (
    <motion.div
      className="auth-feature"
      whileHover={{ x: 5 }}
    >
      <div className="auth-feature__icon">
        <Icon size={19} />
      </div>

      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </motion.div>
  );
}

function TrustItem({ icon: Icon, title, text }) {
  return (
    <div className="auth-trust-item">
      <Icon size={21} />

      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}