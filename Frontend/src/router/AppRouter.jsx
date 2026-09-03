import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { RoleRoute } from "./RoleRoute.jsx";
import { AppLayout } from "../components/layout/AppLayout.jsx";

// Auth
import { LoginPage } from "../components/auth/LoginPage.jsx";
import { RegisterPage } from "../components/auth/RegisterPage.jsx";
import { OtpPage } from "../components/auth/OtpPage.jsx";
import { ForgotPasswordPage } from "../components/auth/ForgotPasswordPage.jsx";

// Customer pages
import DashboardPage from "../pages/customer/DashboardPage.jsx";
import { AccountsPage } from "../pages/customer/AccountsPage.jsx";
import { TransferPage } from "../pages/customer/TransferPage.jsx";
import { TransferVerifyPage } from "../pages/customer/TransferVerifyPage.jsx";
import { DemoPage } from "../pages/customer/DemoPage.jsx";
import { BeneficiariesPage } from "../pages/customer/BeneficiariesPage.jsx";
import TransactionsPage from "../pages/customer/TransactionsPage.jsx";
import FixedDepositsPage from "../pages/customer/FixedDepositsPage.jsx";
import { PpfPage } from "../pages/customer/PpfPage.jsx";
import { RewardsPage } from "../pages/customer/RewardsPage.jsx";
import { AlertsPage } from "../pages/customer/AlertsPage.jsx";
import { SecurityPage } from "../pages/customer/SecurityPage.jsx";
import { FraudLogsPage } from "../pages/customer/FraudLogsPage.jsx";
import { SettingsPage } from "../pages/customer/SettingsPage.jsx";
import StatementsPage from "../pages/customer/StatementsPage.jsx";
import CardManagementPage from "../pages/customer/CardManagementPage.jsx";

// Admin pages
import { AdminOverviewPage } from "../pages/admin/AdminOverviewPage.jsx";
import { UsersPage } from "../pages/admin/UsersPage.jsx";
import { UserDetailPage } from "../pages/admin/UserDetailPage.jsx";
import { AdminTransactionsPage } from "../pages/admin/AdminTransactionsPage.jsx";
import { FraudMonitoringPage } from "../pages/admin/FraudMonitoringPage.jsx";
import { FraudInvestigationPage } from "../pages/admin/FraudInvestigationPage.jsx";
import { AuditLogsPage } from "../pages/admin/AuditLogsPage.jsx";

const NotFound = () => (
  <div className="stack stack-3">
    <span className="eyebrow">404</span>

    <h1>Page not found</h1>

    <p className="muted">
      The address you tried does not exist in NexusBank.
    </p>
  </div>
);

export function AppRouter() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <div className="page">
        Loading NexusBank…
      </div>
    );
  }

  const isAuthed = status === "authenticated";

  const home =
    user?.role === "ADMIN"
      ? "/admin/overview"
      : "/app/dashboard";

  return (
    <Routes>
      {/* =====================================================
          PUBLIC ROUTES
          ===================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to={isAuthed ? home : "/login"}
            replace
          />
        }
      />

      <Route
        path="/login"
        element={
          isAuthed ? (
            <Navigate
              to={home}
              replace
            />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="/register"
        element={
          isAuthed ? (
            <Navigate
              to={home}
              replace
            />
          ) : (
            <RegisterPage />
          )
        }
      />

      <Route
        path="/otp"
        element={
          isAuthed ? (
            <Navigate
              to={home}
              replace
            />
          ) : (
            <OtpPage />
          )
        }
      />

      {/* Forgot Password */}
      <Route
        path="/forgot-password"
        element={
          isAuthed ? (
            <Navigate
              to={home}
              replace
            />
          ) : (
            <ForgotPasswordPage />
          )
        }
      />

      {/* =====================================================
          CUSTOMER APPLICATION
          ===================================================== */}

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout scope="customer" />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Navigate
              to="dashboard"
              replace
            />
          }
        />

        {/* Dashboard */}
        <Route
          path="dashboard"
          element={
            <DashboardPage />
          }
        />

        {/* Accounts */}
        <Route
          path="accounts"
          element={
            <AccountsPage />
          }
        />

        {/* Card Management */}
        <Route
          path="cards"
          element={
            <CardManagementPage />
          }
        />

        {/* Transfer */}
        <Route
          path="transfer"
          element={
            <TransferPage />
          }
        />

        {/* Transfer Verification */}
        <Route
          path="transfer/:id/verify"
          element={
            <TransferVerifyPage />
          }
        />

        {/* Beneficiaries */}
        <Route
          path="beneficiaries"
          element={
            <BeneficiariesPage />
          }
        />

        {/* Transactions */}
        <Route
          path="transactions"
          element={
            <TransactionsPage />
          }
        />

        {/* Statements */}
        <Route
          path="statements"
          element={
            <StatementsPage />
          }
        />

        {/* Fixed Deposits */}
        <Route
          path="fd"
          element={
            <FixedDepositsPage />
          }
        />

        {/* PPF */}
        <Route
          path="ppf"
          element={
            <PpfPage />
          }
        />

        {/* Rewards */}
        <Route
          path="rewards"
          element={
            <RewardsPage />
          }
        />

        {/* Alerts */}
        <Route
          path="alerts"
          element={
            <AlertsPage />
          }
        />

        {/* Security */}
        <Route
          path="security"
          element={
            <SecurityPage />
          }
        />

        {/* Fraud Logs */}
        <Route
          path="fraud"
          element={
            <FraudLogsPage />
          }
        />

        {/* Settings */}
        <Route
          path="settings"
          element={
            <SettingsPage />
          }
        />

        {/* Demo */}
        <Route
          path="demo"
          element={
            <DemoPage />
          }
        />
      </Route>

      {/* =====================================================
          ADMIN APPLICATION
          ===================================================== */}

      <Route
        path="/admin"
        element={
          <RoleRoute role="ADMIN">
            <AppLayout scope="admin" />
          </RoleRoute>
        }
      >
        <Route
          index
          element={
            <Navigate
              to="overview"
              replace
            />
          }
        />

        {/* Admin Overview */}
        <Route
          path="overview"
          element={
            <AdminOverviewPage />
          }
        />

        {/* Users */}
        <Route
          path="users"
          element={
            <UsersPage />
          }
        />

        {/* User Details */}
        <Route
          path="users/:id"
          element={
            <UserDetailPage />
          }
        />

        {/* Admin Transactions */}
        <Route
          path="transactions"
          element={
            <AdminTransactionsPage />
          }
        />

        {/* Fraud Monitoring */}
        <Route
          path="fraud"
          element={
            <FraudMonitoringPage />
          }
        />

        {/* Fraud Investigation */}
        <Route
          path="fraud/:id"
          element={
            <FraudInvestigationPage />
          }
        />

        {/* Audit Logs */}
        <Route
          path="audit"
          element={
            <AuditLogsPage />
          }
        />
      </Route>

      {/* =====================================================
          CATCH ALL
          ===================================================== */}

      <Route
        path="*"
        element={
          <NotFound />
        }
      />
    </Routes>
  );
}