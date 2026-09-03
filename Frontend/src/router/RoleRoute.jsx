import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export function RoleRoute({ role, children }) {
  const { user, status } = useAuth();
  if (status === "loading") return <div className="page">Loading NexusBank…</div>;
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  if (user?.role !== role) return <Navigate to="/app/dashboard" replace />;
  return children;
}