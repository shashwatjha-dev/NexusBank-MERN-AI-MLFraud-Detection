import { motion } from "framer-motion";
import "./Button.css";

const variants = {
  primary: "btn--primary",
  ghost: "btn--ghost",
  outline: "btn--outline",
  danger: "btn--danger",
};

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  children,
  type = "button",
  ...rest
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -1 }}
      className={`btn ${variants[variant]} btn--${size}`}
      disabled={disabled || loading}
      data-testid={rest["data-testid"]}
      {...rest}
    >
      {Icon && <Icon size={16} strokeWidth={2} />}
      <span>{loading ? "Please wait…" : children}</span>
      {IconRight && <IconRight size={16} strokeWidth={2} />}
    </motion.button>
  );
}