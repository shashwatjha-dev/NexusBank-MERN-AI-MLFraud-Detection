import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  UserPlus,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Input } from "../common/Input.jsx";
import { Button } from "../common/Button.jsx";

export function LoginForm({ onSubmit, loading }) {
  const navigate = useNavigate();

  const [values, setValues] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const update = (field, value) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: "",
      }));
    }
  };

  const submit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = "Enter your email.";
    }

    if (!values.password || values.password.length < 8) {
      nextErrors.password =
        "Password must be at least 8 characters.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) return;

    await onSubmit(values);
  };

  const fillDemo = () => {
    setValues({
      email: "aisha@nexusbank.dev",
      password: "Aisha@12345",
    });

    setErrors({});
  };

  return (
    <form
      className="nexus-login-form"
      onSubmit={submit}
      noValidate
      data-testid="login-form"
    >
      {/* Email */}
      <div className="nexus-field">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@nexusbank.dev"
          iconLeft={Mail}
          value={values.email}
          onChange={(e) =>
            update("email", e.target.value)
          }
          error={errors.email}
          data-testid="login-email"
        />

        {values.email && !errors.email && (
          <CheckCircle2
            size={17}
            className="nexus-field__valid"
          />
        )}
      </div>

      {/* Password */}
      <div className="nexus-field">
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="At least 8 characters"
          iconLeft={Lock}
          value={values.password}
          onChange={(e) =>
            update("password", e.target.value)
          }
          error={errors.password}
          data-testid="login-password"
        />

        <button
          type="button"
          className="nexus-password-toggle"
          onClick={() =>
            setShowPassword((current) => !current)
          }
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
        >
          {showPassword ? (
            <EyeOff size={17} />
          ) : (
            <Eye size={17} />
          )}
        </button>
      </div>

      {/* Options */}
      <div className="nexus-login-options">
        <label className="nexus-remember">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) =>
              setRememberMe(e.target.checked)
            }
          />

          <span className="nexus-checkbox">
            {rememberMe && <CheckCircle2 size={12} />}
          </span>

          Remember me
        </label>

        <button
          type="button"
          className="nexus-forgot"
          onClick={() => navigate("/forgot-password")}
        >
          Forgot password?
        </button>
      </div>

      {/* Continue */}
      <Button
        type="submit"
        size="lg"
        loading={loading}
        iconRight={ArrowRight}
        data-testid="login-submit"
      >
        Continue
      </Button>

      {/* Divider */}
      <div className="nexus-divider">
        <span />
        <small>OR</small>
        <span />
      </div>

      {/* Demo */}
      <button
        type="button"
        className="nexus-demo-button"
        onClick={fillDemo}
      >
        <span className="nexus-demo-button__icon">
          <Sparkles size={17} />
        </span>

        <strong>Login with Demo</strong>

        <ArrowRight size={16} />
      </button>

      {/* Demo accounts */}
      <div className="nexus-demo-accounts">
        <div className="nexus-demo-accounts__title">
          <Sparkles size={14} />
          Demo accounts
        </div>

        <div className="nexus-demo-grid">
          <DemoAccount
            title="Customer"
            email="aisha@nexusbank.dev"
            password="Aisha@12345"
          />

          <DemoAccount
            title="Admin"
            email="admin@nexusbank.dev"
            password="Admin@12345"
          />
        </div>
      </div>

      {/* Create account */}
      <div className="nexus-create-account">
        <span>
          Don't have a NexusBank account?
        </span>

        <button
          type="button"
          onClick={() => navigate("/register")}
        >
          <UserPlus size={15} />
          Create new account
          <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
}

function DemoAccount({
  title,
  email,
  password,
}) {
  return (
    <div className="nexus-demo-account">
      <div className="nexus-demo-account__avatar">
        <UserPlus size={15} />
      </div>

      <div>
        <span>{title}</span>
        <strong>{email}</strong>
        <small>{password}</small>
      </div>
    </div>
  );
}