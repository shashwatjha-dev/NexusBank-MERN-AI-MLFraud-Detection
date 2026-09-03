import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  UserRound,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  UsersRound,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService.js";
import { useToast } from "../../hooks/useToast.js";
import "./RegisterPage.css";

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const updateValue = (field, value) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!values.name.trim()) {
      nextErrors.name = "Enter your full name.";
    }

    if (!values.email.trim()) {
      nextErrors.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.phone.trim()) {
      nextErrors.phone = "Enter your phone number.";
    } else if (!/^\d{10}$/.test(values.phone.replace(/\s/g, ""))) {
      nextErrors.phone = "Enter a valid 10-digit mobile number.";
    }

    if (!values.password) {
      nextErrors.password = "Create a password.";
    } else if (values.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (!values.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      await authService.register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.replace(/\s/g, ""),
        password: values.password,
      });

      toast.success("Your NexusBank account has been created.", {
        title: "Welcome to NexusBank",
      });

      navigate("/login");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      {/* LEFT SIDE */}
      <motion.section
        className="register-hero"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="register-grid" />
        <div className="register-glow register-glow-one" />
        <div className="register-glow register-glow-two" />

        <button
          type="button"
          className="register-back"
          onClick={() => navigate("/login")}
        >
          <ArrowLeft size={18} />
          Back to login
        </button>

        <div className="register-brand">
          <motion.div
            className="register-logo"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            N
          </motion.div>

          <div>
            <div className="register-brand-name">
              NEXUS<span>BANK</span>
            </div>

            <div className="register-brand-subtitle">
              Smart Banking. Intelligent Security.
            </div>
          </div>
        </div>

        <div className="register-trust-card">
          <UsersRound size={22} />
          <div>
            <span>Trusted by</span>
            <strong>10M+</strong>
            <small>customers</small>
          </div>

          <TrendingUp className="trust-chart" size={58} />
        </div>

        <div className="register-copy">
          <div className="register-eyebrow">
            <span />
            WELCOME TO NEXUSBANK
          </div>

          <h1>
            Banking built
            <br />
            for <span>your future.</span>
          </h1>

          <p>
            Create your NexusBank profile and get access to intelligent
            banking, real-time security and powerful financial insights.
          </p>
        </div>

        <div className="register-benefits">
          <div className="register-benefit">
            <div className="benefit-icon">
              <ShieldCheck size={21} />
            </div>

            <div>
              <strong>Bank-grade security</strong>
              <span>
                Multi-layer authentication and fraud protection.
              </span>
            </div>
          </div>

          <div className="register-benefit">
            <div className="benefit-icon">
              <CheckCircle2 size={21} />
            </div>

            <div>
              <strong>Instant account setup</strong>
              <span>
                Your primary Savings account is created automatically.
              </span>
            </div>
          </div>
        </div>

        {/* SECURITY VISUAL */}
        <motion.div
          className="register-security-visual"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="security-orbit orbit-one" />
          <div className="security-orbit orbit-two" />

          <div className="security-platform">
            <div className="security-shield">
              <ShieldCheck size={64} strokeWidth={1.7} />
            </div>
          </div>

          <div className="security-particle particle-one" />
          <div className="security-particle particle-two" />
          <div className="security-particle particle-three" />
        </motion.div>

        <div className="register-footer">
          <div>
            <ShieldCheck size={16} />
            <span>
              Your data is protected with
              <br />
              NexusBank's secure authentication system.
            </span>
          </div>

          <div className="footer-divider" />

          <div className="copyright">
            © 2026 NexusBank
            <br />
            All rights reserved.
          </div>
        </div>
      </motion.section>

      {/* RIGHT SIDE */}
      <motion.section
        className="register-panel"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.7,
          delay: 0.1,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className="register-panel-glow" />

        <motion.div
          className="register-form-shell"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
        >
          <div className="form-header">
            <div className="form-eyebrow">
              CREATE YOUR PROFILE
            </div>

            <h2>Open your NexusBank account</h2>

            <p>
              Enter your details below to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            {/* NAME */}
            <div className="field-group">
              <label>Full name</label>

              <div
                className={`register-input ${
                  errors.name ? "has-error" : ""
                }`}
              >
                <UserRound size={19} />

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={values.name}
                  onChange={(e) =>
                    updateValue("name", e.target.value)
                  }
                  autoComplete="name"
                />
              </div>

              {errors.name && (
                <span className="field-error">{errors.name}</span>
              )}
            </div>

            {/* EMAIL */}
            <div className="field-group">
              <label>Email address</label>

              <div
                className={`register-input ${
                  errors.email ? "has-error" : ""
                }`}
              >
                <Mail size={19} />

                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={values.email}
                  onChange={(e) =>
                    updateValue("email", e.target.value)
                  }
                  autoComplete="email"
                />
              </div>

              {errors.email && (
                <span className="field-error">{errors.email}</span>
              )}
            </div>

            {/* PHONE */}
            <div className="field-group">
              <label>Phone number</label>

              <div
                className={`register-input ${
                  errors.phone ? "has-error" : ""
                }`}
              >
                <Phone size={19} />

                <span className="country-code">+91</span>

                <span className="phone-divider" />

                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={values.phone}
                  maxLength={10}
                  onChange={(e) =>
                    updateValue(
                      "phone",
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  autoComplete="tel"
                />
              </div>

              {errors.phone && (
                <span className="field-error">{errors.phone}</span>
              )}
            </div>

            {/* PASSWORDS */}
            <div className="password-row">
              <div className="field-group">
                <label>Password</label>

                <div
                  className={`register-input ${
                    errors.password ? "has-error" : ""
                  }`}
                >
                  <Lock size={19} />

                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={values.password}
                    onChange={(e) =>
                      updateValue("password", e.target.value)
                    }
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <span className="field-error">
                    {errors.password}
                  </span>
                )}
              </div>

              <div className="field-group">
                <label>Confirm password</label>

                <div
                  className={`register-input ${
                    errors.confirmPassword ? "has-error" : ""
                  }`}
                >
                  <Lock size={19} />

                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={values.confirmPassword}
                    onChange={(e) =>
                      updateValue(
                        "confirmPassword",
                        e.target.value
                      )
                    }
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirm((value) => !value)
                    }
                    aria-label="Toggle password visibility"
                  >
                    {showConfirm ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {errors.confirmPassword && (
                  <span className="field-error">
                    {errors.confirmPassword}
                  </span>
                )}
              </div>
            </div>

            {/* SECURITY MESSAGE */}
            <div className="security-message">
              <ShieldCheck size={19} />

              <span>
                Your information is protected with NexusBank's
                secure authentication system.
              </span>
            </div>

            {/* BUTTON */}
            <motion.button
              type="submit"
              className="create-account-button"
              disabled={loading}
              whileHover={!loading ? { scale: 1.01 } : {}}
              whileTap={!loading ? { scale: 0.985 } : {}}
            >
              {loading ? (
                <>
                  <span className="button-spinner" />
                  Creating account...
                </>
              ) : (
                <>
                  Create new account
                  <ArrowRight size={21} />
                </>
              )}
            </motion.button>

            <div className="login-prompt">
              Already have a NexusBank account?
              <button
                type="button"
                onClick={() => navigate("/login")}
              >
                Sign in
              </button>
            </div>
          </form>
        </motion.div>
      </motion.section>
    </div>
  );
}

export default RegisterPage;