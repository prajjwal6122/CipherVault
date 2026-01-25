/**
 * Router Configuration
 * Setup React Router with all routes
 */

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import MainLayout from "../components/layouts/MainLayout";

// Pages - Import as lazy loaded components for better performance
const LoginPage = React.lazy(() => import("../pages/LoginPage"));
const RegistrationPage = React.lazy(() => import("../pages/RegistrationPage"));
const DashboardPage = React.lazy(() => import("../pages/DashboardPage"));
const RecordsPage = React.lazy(() => import("../pages/RecordsPage"));
const AuditLogsPage = React.lazy(() => import("../pages/AuditLogsPage"));
const SettingsPage = React.lazy(() => import("../pages/SettingsPage"));
const NotFoundPage = React.lazy(() => import("../pages/NotFoundPage"));

const AppRouter = () => {
  return (
    <Router>
      <React.Suspense fallback={<div className="loading">Loading...</div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="records" element={<RecordsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Alternative paths for direct access */}
          <Route
            path="/records"
            element={<Navigate to="/dashboard/records" replace />}
          />
          <Route
            path="/audit-logs"
            element={<Navigate to="/dashboard/audit-logs" replace />}
          />
          <Route
            path="/settings"
            element={<Navigate to="/dashboard/settings" replace />}
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
};

export default AppRouter;
