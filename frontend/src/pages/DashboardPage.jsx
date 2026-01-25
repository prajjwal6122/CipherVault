/**
 * Dashboard Page Component
 * Main dashboard showing overview
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import apiClient from "../api/client";
import "./DashboardPage.css";

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    recordsCount: 0,
    revealsCount: 0,
    auditsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [recordsRes, auditsRes] = await Promise.all([
          apiClient.get("/records", { params: { page: 1, pageSize: 1 } }),
          apiClient.get("/audit-logs", { params: { page: 1, pageSize: 1 } }),
        ]);

        const recordsTotal = recordsRes.data?.data?.pagination?.total || 0;
        const auditsTotal = auditsRes.data?.data?.pagination?.total || 0;

        // Count reveals from audit logs
        const revealsRes = await apiClient.get("/audit-logs", {
          params: { action: "REVEAL_RECORD", page: 1, pageSize: 1 },
        });
        const revealsCount = revealsRes.data?.data?.pagination?.total || 0;

        setStats({
          recordsCount: recordsTotal,
          revealsCount,
          auditsCount: auditsTotal,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Welcome to CipherVault</h1>
        <p>Secure Data Management Platform</p>
      </div>

      <div className="dashboard-grid">
        {/* Stats Cards */}
        <div className="stats-section">
          <h2>Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📄</div>
              <div className="stat-content">
                <h3>Records</h3>
                <p className="stat-value">
                  {loading ? "..." : stats.recordsCount}
                </p>
                <p className="stat-label">Total encrypted records</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔓</div>
              <div className="stat-content">
                <h3>Reveals</h3>
                <p className="stat-value">
                  {loading ? "..." : stats.revealsCount}
                </p>
                <p className="stat-label">Data reveals this month</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <h3>Audits</h3>
                <p className="stat-value">
                  {loading ? "..." : stats.auditsCount}
                </p>
                <p className="stat-label">Audit log entries</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👤</div>
              <div className="stat-content">
                <h3>User Role</h3>
                <p className="stat-value">{user?.role || "User"}</p>
                <p className="stat-label">Your access level</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="actions-section">
          <h2>Quick Actions</h2>
          <div className="actions-list">
            <div
              className="action-item"
              onClick={() => navigate("/dashboard/records")}
              style={{ cursor: "pointer" }}
            >
              <span className="action-icon">📤</span>
              <div className="action-content">
                <h3>Upload Records</h3>
                <p>Encrypt and upload sensitive data</p>
              </div>
              <span className="action-arrow">→</span>
            </div>

            <div
              className="action-item"
              onClick={() => navigate("/dashboard/records")}
              style={{ cursor: "pointer" }}
            >
              <span className="action-icon">🔍</span>
              <div className="action-content">
                <h3>View Records</h3>
                <p>Browse your encrypted records</p>
              </div>
              <span className="action-arrow">→</span>
            </div>

            <div
              className="action-item"
              onClick={() => navigate("/dashboard/audit-logs")}
              style={{ cursor: "pointer" }}
            >
              <span className="action-icon">📊</span>
              <div className="action-content">
                <h3>View Audit Logs</h3>
                <p>Monitor data access and reveals</p>
              </div>
              <span className="action-arrow">→</span>
            </div>

            <div
              className="action-item"
              onClick={() => navigate("/dashboard/settings")}
              style={{ cursor: "pointer" }}
            >
              <span className="action-icon">⚙️</span>
              <div className="action-content">
                <h3>Manage Settings</h3>
                <p>Update your profile and preferences</p>
              </div>
              <span className="action-arrow">→</span>
            </div>
          </div>
        </div>

        {/* Security Status */}
        <div className="security-section">
          <h2>Security Status</h2>
          <div className="security-checks">
            <div className="check-item success">
              <span className="check-icon">✅</span>
              <div className="check-content">
                <h4>Authentication</h4>
                <p>You are securely authenticated</p>
              </div>
            </div>

            <div className="check-item success">
              <span className="check-icon">✅</span>
              <div className="check-content">
                <h4>Encryption</h4>
                <p>AES-256-GCM encryption enabled</p>
              </div>
            </div>

            <div className="check-item success">
              <span className="check-icon">✅</span>
              <div className="check-content">
                <h4>Audit Logging</h4>
                <p>All data access is being logged</p>
              </div>
            </div>

            <div className="check-item success">
              <span className="check-icon">✅</span>
              <div className="check-content">
                <h4>Session</h4>
                <p>Your session is secure and active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
