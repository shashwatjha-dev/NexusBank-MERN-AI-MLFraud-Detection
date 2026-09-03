import { createContext, useCallback, useMemo, useState } from "react";

export const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = nextId++;
    const entry = { id, tone: "info", timeout: 4000, ...toast };
    setToasts((list) => [...list, entry]);
    if (entry.timeout > 0) setTimeout(() => dismiss(id), entry.timeout);
    return id;
  }, [dismiss]);

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      info: (message, opts) => push({ tone: "info", message, ...opts }),
      success: (message, opts) => push({ tone: "success", message, ...opts }),
      warn: (message, opts) => push({ tone: "warn", message, ...opts }),
      error: (message, opts) => push({ tone: "error", message, ...opts }),
    }),
    [toasts, dismiss, push]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}