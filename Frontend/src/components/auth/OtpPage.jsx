import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  LockKeyhole,
  Mail,
  CheckCircle2,
  Pencil,
} from "lucide-react";

import { OtpForm } from "../../components/auth/OtpForm.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";

import "./OtpPage.css";

export function OtpPage() {
  const { pendingLogin, completeLogin, resendOtp } = useAuth();
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  if (!pendingLogin) {
    return (
      <div className="otp-page">
        <div className="otp-expired-page">
          <div className="otp-expired-card">
            <div className="otp-expired-icon">
              <ShieldCheck size={30} />
            </div>

            <span className="otp-page-eyebrow">SECURE LOGIN</span>

            <h2>OTP session expired</h2>

            <p>
              Please sign in again to receive a fresh verification code.
            </p>

            <button
              type="button"
              className="otp-back-button"
              onClick={() => navigate("/login")}
              data-testid="otp-return-login"
            >
              <ArrowLeft size={17} />
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (otp) => {
    setLoading(true);

    try {
      const user = await completeLogin({
        userId: pendingLogin.userId,
        otp,
      });

      toast.success(`Welcome back, ${user.name.split(" ")[0]}.`);

      navigate(
        user.role === "ADMIN"
          ? "/admin/overview"
          : "/app/dashboard",
        { replace: true }
      );
    } catch (err) {
      toast.error(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const result = await resendOtp();

    toast.success("A fresh code has been sent to your inbox.");

    return result;
  };

  return (
    <div className="otp-page">
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="otp-background-grid" />
      <div className="otp-background-glow otp-background-glow--one" />
      <div className="otp-background-glow otp-background-glow--two" />

      {/* =====================================================
          LEFT SIDE
      ====================================================== */}

      <motion.section
        className="otp-hero"
        initial={{ opacity: 0, x: -35 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          className="otp-back-login"
          onClick={() => navigate("/login")}
        >
          <ArrowLeft size={18} />
          <span>Back to login</span>
        </button>

        {/* Brand */}
        <div className="otp-brand">
          <div className="otp-brand-logo">N</div>

          <div>
            <div className="otp-brand-name">
              NEXUS<span>BANK</span>
            </div>

            <div className="otp-brand-subtitle">
              Smart Banking. Intelligent Security.
            </div>
          </div>
        </div>

        {/* Hero copy */}
        <div className="otp-hero-copy">
          <div className="otp-hero-eyebrow">
            <ShieldCheck size={17} />
            SECURE LOGIN
          </div>

          <h1>
            Verify your
            <span> identity.</span>
          </h1>

          <p>
            One final step to securely access your NexusBank account.
            Your verification code keeps your account protected from
            unauthorized access.
          </p>
        </div>

        {/* Shield */}
        <div className="otp-shield-scene">
          <div className="otp-shield-orbit otp-shield-orbit--one" />
          <div className="otp-shield-orbit otp-shield-orbit--two" />

          <span className="otp-particle otp-particle--one" />
          <span className="otp-particle otp-particle--two" />
          <span className="otp-particle otp-particle--three" />
          <span className="otp-particle otp-particle--four" />

          <motion.div
            className="otp-shield-platform"
            animate={{
              boxShadow: [
                "0 0 25px rgba(34,214,111,.18)",
                "0 0 55px rgba(34,214,111,.38)",
                "0 0 25px rgba(34,214,111,.18)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="otp-platform-ring otp-platform-ring--one" />
            <div className="otp-platform-ring otp-platform-ring--two" />
          </motion.div>

          <motion.div
            className="otp-shield"
            animate={{
              y: [0, -9, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="otp-shield-inner">
              <ShieldCheck size={92} strokeWidth={1.7} />
            </div>
          </motion.div>
        </div>

        {/* Benefits */}
        <div className="otp-benefits">
          <div className="otp-benefit">
            <div className="otp-benefit-icon">
              <CheckCircle2 size={22} />
            </div>

            <div>
              <strong>One-time verification</strong>
              <span>Your code can only be used once.</span>
            </div>
          </div>

          <div className="otp-benefit">
            <div className="otp-benefit-icon">
              <LockKeyhole size={22} />
            </div>

            <div>
              <strong>Bank-grade protection</strong>
              <span>Your session is securely encrypted.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="otp-hero-footer">
          <div className="otp-footer-security">
            <LockKeyhole size={24} />

            <div>
              <strong>Your security is our priority.</strong>
              <span>NexusBank never shares your OTP.</span>
            </div>
          </div>

          <div className="otp-footer-divider" />

          <div className="otp-copyright">
            <strong>© 2026 NexusBank</strong>
            <span>All rights reserved.</span>
          </div>
        </div>
      </motion.section>

      {/* =====================================================
          RIGHT SIDE
      ====================================================== */}

      <motion.main
        className="otp-content"
        initial={{ opacity: 0, x: 35 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.7,
          delay: 0.08,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className="otp-card">
          {/* Step */}
          <div className="otp-stepper">
            <span className="otp-step-label">STEP 2 OF 2</span>

            <div className="otp-step-line">
              <span className="otp-step-number active">2</span>
              <span className="otp-step-dash" />
              <span className="otp-step-number">2</span>
            </div>
          </div>

          {/* Icon */}
          <motion.div
            className="otp-mail-icon"
            animate={{
              boxShadow: [
                "0 0 0 rgba(34,214,111,0)",
                "0 0 28px rgba(34,214,111,.18)",
                "0 0 0 rgba(34,214,111,0)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
          >
            <Mail size={31} />
          </motion.div>

          {/* Header */}
          <div className="otp-card-header">
            <h2>Enter your OTP</h2>

            <p>
              We emailed a 6-digit code to your inbox.
              <br />
              It's valid for a few minutes and works only once.
            </p>
          </div>

          {/* Form */}
          <OtpForm
            onSubmit={submit}
            loading={loading}
            expiresInSeconds={pendingLogin.expiresInSeconds}
            resendAvailableInSeconds={
              pendingLogin.resendAvailableInSeconds
            }
            onResend={handleResend}
            maskedEmail={pendingLogin.maskedEmail}
            hint={
              pendingLogin.demoOtp
                ? `Development mode — code: ${pendingLogin.demoOtp}`
                : null
            }
          />

          {/* Change email */}
          <button
            type="button"
            className="otp-change-email"
            onClick={() => navigate("/login")}
            data-testid="otp-back"
          >
            <ArrowLeft size={16} />
            <span>Change email</span>
            <Pencil size={15} />
          </button>
        </div>
      </motion.main>
    </div>
  );
}