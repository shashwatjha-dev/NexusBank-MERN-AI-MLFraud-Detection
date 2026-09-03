import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

// Batch 1 stub — real pages arrive in later batches.
// Rendering plain placeholders here lets you run `npm run dev` today and
// confirm routing + auth + layout are wired correctly.

function Bootstrapping() {
  return <div className="page">Loading NexusBank…</div>;
}

function Placeholder({ label }) {
  return (
    <div className="page stack stack-4">
      <span className="eyebrow">Coming in a later batch</span>
      <h1>{label}</h1>
      <p className="muted">
        This route will be populated in the next Phase 4 batch. Auth, styles,
        and the API layer are already wired.
      </p>
    </div>
  );
}

export function AppRouter() {
  const { status, user } = useAuth();

  if (status === "loading") return <Bootstrapping />;

  const isAuthed = status === "authenticated";
  const isAdmin = isAuthed && user?.role === "ADMIN";

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthed ? "/app/dashboard" : "/login"} replace />} />
      <Route path="/login" element={isAuthed ? <Navigate to="/app/dashboard" replace /> : <Placeholder label="Login" />} />
      <Route path="/otp" element={<Placeholder label="OTP verification" />} />

      <Route path="/app/*" element={isAuthed ? <Placeholder label="Customer area" /> : <Navigate to="/login" replace />} />
      <Route path="/admin/*" element={isAdmin ? <Placeholder label="Admin area" /> : <Navigate to="/" replace />} />

      <Route path="*" element={<Placeholder label="Not found" />} />
    </Routes>
  );
}