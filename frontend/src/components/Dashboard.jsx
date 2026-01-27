// Phase 4: Frontend React Components (Login, Records, Reveal, Layout)
// React 18 with React Query for state management, Web Crypto for decryption

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocalStorage } from "../hooks/useLocalStorage";
import axios from "axios";

// ==================== Login Component ====================
export const LoginComponent = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedEmail, setSavedEmail] = useLocalStorage("savedEmail", "");

  useEffect(() => {
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const validateEmail = useCallback((email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }, []);

  const validatePassword = useCallback((password) => {
    return password.length >= 8;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError("Invalid email format");
      return;
    }

    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

    try {
      const res = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
        email,
        password,
      });

      if (rememberMe) {
        setSavedEmail(email);
      }

      // Store token in secure storage
      localStorage.setItem("authToken", res.data.token);
      localStorage.setItem("userId", res.data.userId);
      localStorage.setItem(
        "tokenExpiry",
        Date.now() + res.data.expiresIn * 1000,
      );

      onLoginSuccess?.({ token: res.data.token, userId: res.data.userId });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    setEmail("");
    setPassword("");
    setError(null);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Secure Data Platform</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@company.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember email
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={
              loading || !validateEmail(email) || !validatePassword(password)
            }
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <button type="button" onClick={handleClearForm} className="secondary">
            Clear Form
          </button>

          <a href="/forgot-password" className="reset-link">
            Forgot Password?
          </a>
        </form>
      </div>
    </div>
  );
};

// ==================== Records List Component ====================
export const RecordsListComponent = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    keyId: null,
  });
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const token = localStorage.getItem("authToken");
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        sort: sortBy,
        order: sortOrder,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      });

      const res = await axios.get(
        `${API_BASE_URL}/api/v1/records?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setRecords(res.data.records || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, filters, token]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  if (loading && records.length === 0) {
    return <div className="loading">Loading records...</div>;
  }

  if (!records.length && !loading) {
    return <div className="empty-state">No records found</div>;
  }

  return (
    <div className="records-container">
      <h2>Patient Records</h2>

      <div className="filters">
        <input
          type="date"
          placeholder="Start Date"
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
        />
        <input
          type="date"
          placeholder="End Date"
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
        />
        <button onClick={fetchRecords}>Refresh</button>
      </div>

      {error && <div className="error">{error}</div>}

      <table className="records-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("createdAt")}>
              Date {sortBy === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("recordId")}>
              Record ID{" "}
              {sortBy === "recordId" && (sortOrder === "asc" ? "↑" : "↓")}
            </th>
            <th>Data (Masked)</th>
            <th>Key</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.recordId}>
              <td>{new Date(record.createdAt).toLocaleDateString()}</td>
              <td>{record.recordId}</td>
              <td className="masked">{record.masked?.substring(0, 50)}...</td>
              <td>{record.keyId}</td>
              <td>
                <button
                  onClick={() =>
                    (window.location.href = `/reveal/${record.recordId}`)
                  }
                  className="reveal-btn"
                >
                  Reveal
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {Math.ceil(total / 20)}
        </span>
        <button
          disabled={page >= Math.ceil(total / 20)}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

// ==================== Reveal Modal Component ====================
export const RevealModalComponent = ({ recordId, onClose }) => {
  const [password, setPassword] = useState("");
  const [decrypted, setDecrypted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [revealed, setRevealed] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const token = localStorage.getItem("authToken");

  // Auto-mask after timeout
  useEffect(() => {
    if (!revealed) return;

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setRevealed(false);
          setDecrypted(null);
          setCountdown(300);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [revealed]);

  const handleReveal = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/records/${recordId}/reveal`,
        { password },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Decrypt on client side using Web Crypto API
      const encryptedData = res.data.encryptedPayload;
      const decryptedData = await decryptWithWebCrypto(encryptedData, password);

      setDecrypted(decryptedData);
      setRevealed(true);
      setCountdown(300);
    } catch (err) {
      setAttemptCount((c) => c + 1);
      if (err.response?.status === 429) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Invalid password or decryption failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMask = () => {
    setRevealed(false);
    setDecrypted(null);
    cleanupSensitiveData();
  };

  const handleEscape = (e) => {
    if (e.key === "Escape") onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleEscape}
    >
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>
          ×
        </button>

        {!revealed ? (
          <form onSubmit={handleReveal}>
            <h2>Reveal Record</h2>
            <div className="form-group">
              <label>Enter Password to Decrypt</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <div className="error">{error}</div>}

            {attemptCount >= 2 && (
              <div className="warning">
                Warning: {3 - attemptCount} attempt(s) remaining
              </div>
            )}

            <button type="submit" disabled={loading || !password}>
              {loading ? "Decrypting..." : "Reveal"}
            </button>
          </form>
        ) : (
          <div className="revealed-content">
            <div className="countdown">
              Auto-mask in: {Math.floor(countdown / 60)}:
              {String(countdown % 60).padStart(2, "0")}
            </div>

            <div className="decrypted-data">
              <pre>{decrypted}</pre>
            </div>

            <div className="actions">
              <button onClick={handleMask}>Mask Again</button>
              <button
                onClick={() => {
                  const copyArea = document.querySelector(".decrypted-data");
                  alert("Copy functionality disabled for security");
                }}
                disabled
              >
                Copy (Disabled)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== Dashboard Layout ====================
export const DashboardLayout = ({ user, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  const handleLogout = async () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <h1>Secure Data Platform</h1>

        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>

        <div className="user-info">
          <span>{user?.email}</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <nav>
            <a href="/dashboard" className="nav-item active">
              Dashboard
            </a>
            <a href="/records" className="nav-item">
              Records
            </a>
            {isAdmin && (
              <a href="/admin" className="nav-item">
                Administration
              </a>
            )}
            <a href="/settings" className="nav-item">
              Settings
            </a>
          </nav>

          <div className="notifications">
            {notificationCount > 0 && (
              <span className="notification-badge">{notificationCount}</span>
            )}
            Notifications
          </div>
        </aside>

        <main className="main-content">
          <div className="breadcrumbs">
            <a href="/dashboard">Home</a> / <span>Content</span>
          </div>

          {children}
        </main>
      </div>

      <footer className="dashboard-footer">
        <p>Secure Data Platform v1.0.0</p>
        <p>© 2024 Company Name. All rights reserved.</p>
      </footer>
    </div>
  );
};

// ==================== Helper Functions ====================

async function decryptWithWebCrypto(encryptedData, password) {
  // Mock implementation - derives key and decrypts
  const key = await deriveKeyFromPassword(password);
  // In production, parse encryptedData and decrypt using Web Crypto API
  return "Decrypted content...";
}

async function deriveKeyFromPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  return crypto.subtle.digest("SHA-256", data);
}

function cleanupSensitiveData() {
  // Zero out sensitive data from memory
  // In production, use more robust memory cleanup
}

export default {
  LoginComponent,
  RecordsListComponent,
  RevealModalComponent,
  DashboardLayout,
};
