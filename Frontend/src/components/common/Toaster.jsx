import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { useToast } from "../../hooks/useToast.js";
import "./Toaster.css";

const iconFor = {
  info: Info,
  success: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="toaster" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconFor[toast.tone] || Info;
          return (
            <motion.div
              key={toast.id}
              className={`toast toast--${toast.tone}`}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <Icon size={18} className="toast__icon" />
              <div className="toast__body">
                {toast.title && <strong>{toast.title}</strong>}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="toast__close"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}