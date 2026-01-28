/**
 * Main Layout Component
 * Provides header, sidebar, and main content area
 * Purple monochromatic theme inspired by HealthWorks AI
 */

import React from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./MainLayout.css";

// Material UI Icons
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";

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
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <DashboardOutlinedIcon fontSize="small" />,
    },
    {
      label: "Records",
      path: "/dashboard/records",
      icon: <DescriptionOutlinedIcon fontSize="small" />,
    },
    {
      label: "Audit Logs",
      path: "/dashboard/audit-logs",
      icon: <SecurityOutlinedIcon fontSize="small" />,
    },
    {
      label: "Settings",
      path: "/dashboard/settings",
      icon: <SettingsOutlinedIcon fontSize="small" />,
    },
  ];

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <aside className={`layout-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo-container">
            <img 
              src="/HWAI-logo-1.png" 
              alt="HWAI" 
              className="logo-img"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            {sidebarOpen && (
              <div className="logo-text">
                <h1>CipherVault</h1>
                <p>Healthcare Analytics</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogoutOutlinedIcon fontSize="small" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="layout-content">
        {/* Header */}
        <header className="layout-header">
          <div className="header-left">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <MenuOutlinedIcon fontSize="small" />
            </button>
            <div className="header-title">
              <h2>Dashboard</h2>
              <p>Welcome back, {user?.email?.split("@")[0] || "User"}</p>
            </div>
          </div>

          <div className="header-right">
            <div className="security-badge">
              <SecurityOutlinedIcon fontSize="inherit" />
              <span>AES-256</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
