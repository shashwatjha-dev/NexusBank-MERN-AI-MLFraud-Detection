import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export function ProtectedRoute({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <div className="page">Loading NexusBank…</div>;
  if (status !== "authenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}