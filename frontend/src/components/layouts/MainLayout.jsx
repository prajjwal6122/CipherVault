/**
 * Main Layout Component
 * Provides header, sidebar, and main content area
 */

import React from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./MainLayout.css";

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navigationItems = [
    { label: "Dashboard", path: "/dashboard", icon: "📊" },
    { label: "Records", path: "/dashboard/records", icon: "📄" },
    { label: "Audit Logs", path: "/dashboard/audit-logs", icon: "📋" },
    { label: "Settings", path: "/dashboard/settings", icon: "⚙️" },
  ];

  return (
    <div className="main-layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <h1 className="header-title">🔒 CipherVault</h1>
        </div>

        <div className="header-right">
          <span className="user-info">{user?.email || "Guest"}</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="layout-container">
        {/* Sidebar */}
        <aside className={`layout-sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <nav className="sidebar-nav">
            {navigationItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="layout-main">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <footer className="layout-footer">
        <p>
          &copy; 2026 CipherVault. All rights reserved. Secure Data Management
          Platform.
        </p>
        <p className="build-info">Version 1.0.0 | Built with React 18 + Vite</p>
      </footer>
    </div>
  );
};

export default MainLayout;
