/**
 * Audit Logs Page - Phase 4.5
 * Comprehensive audit logging and compliance viewer
 */

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";
import {
  exportToCSV,
  exportToPDF,
  generateComplianceReport,
} from "../utils/exportUtils";
import "./AuditLogs.css";

const AuditLogsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");
  const [expandedRow, setExpandedRow] = useState(null);

  const logsPerPage = 25;

  // Fetch audit logs
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "auditLogs",
      filterAction,
      filterStatus,
      filterUser,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const res = await apiClient.get("/audit-logs", {
        params: {
          page: 1,
          pageSize: 200,
          action: filterAction !== "all" ? filterAction : undefined,
          status: filterStatus !== "all" ? filterStatus : undefined,
          userEmail: filterUser !== "all" ? filterUser : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      // Backend responds with { success, data: { logs, pagination } }
      return res.data?.data || res.data;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const auditLogs = response?.logs || response?.data?.logs || [];

  // Get unique values for filters
  const uniqueUsers = useMemo(() => {
    return [...new Set(auditLogs.map((log) => log.userEmail))];
  }, [auditLogs]);

  const uniqueActions = useMemo(() => {
    return [...new Set(auditLogs.map((log) => log.action))];
  }, [auditLogs]);

  // Filter and sort logs
  const filteredAndSortedLogs = useMemo(() => {
    let filtered = auditLogs.filter((log) => {
      // Date filter
      if (startDate && new Date(log.timestamp) < new Date(startDate)) {
        return false;
      }
      if (endDate && new Date(log.timestamp) > new Date(endDate)) {
        return false;
      }

      // Action filter
      if (filterAction !== "all" && log.action !== filterAction) {
        return false;
      }

      // Status filter
      if (filterStatus !== "all" && log.status !== filterStatus) {
        return false;
      }

      // User filter
      if (filterUser !== "all" && log.userEmail !== filterUser) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          log.userEmail?.toLowerCase().includes(searchLower) ||
          log.action?.toLowerCase().includes(searchLower) ||
          log.recordId?.toLowerCase().includes(searchLower) ||
          log.id?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "timestamp") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    auditLogs,
    searchTerm,
    filterAction,
    filterStatus,
    filterUser,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  ]);

  // Paginate
  const totalPages = Math.ceil(filteredAndSortedLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredAndSortedLogs.slice(
    startIndex,
    startIndex + logsPerPage,
  );

  // Calculate statistics
  const statistics = useMemo(() => {
    return {
      total: auditLogs.length,
      reveals: auditLogs.filter((log) => log.action === "REVEAL").length,
      users: new Set(auditLogs.map((log) => log.userEmail)).size,
      records: new Set(auditLogs.map((log) => log.recordId)).size,
    };
  }, [auditLogs]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleExport = async (format) => {
    try {
      if (format === "csv") {
        exportToCSV(filteredAndSortedLogs, "audit-logs.csv");
      } else if (format === "pdf") {
        await exportToPDF(filteredAndSortedLogs, {
          title: "Audit Logs Report",
        });
      } else if (format === "json") {
        const dataStr = JSON.stringify(filteredAndSortedLogs, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "audit-logs.json";
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterAction("all");
    setFilterStatus("all");
    setFilterUser("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  return (
    <div className="audit-logs-container">
      <div className="audit-header">
        <h1>📊 Audit Logs & Compliance</h1>
        <p>Monitor all data access and reveal activities</p>
      </div>

      {/* Statistics */}
      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-value">{statistics.total}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.reveals}</div>
          <div className="stat-label">Reveals</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.users}</div>
          <div className="stat-label">Unique Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.records}</div>
          <div className="stat-label">Records Accessed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by user, action, or record ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label>Action</label>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>User</label>
            <select
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="SUSPICIOUS">Suspicious</option>
            </select>
          </div>

          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-input"
            />
          </div>

          <div className="filter-actions">
            <button onClick={handleClearFilters} className="btn-clear-filters">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="export-section">
        <span className="export-label">Export:</span>
        <button
          onClick={() => handleExport("csv")}
          className="export-btn csv"
          title="Export as CSV"
        >
          📄 CSV
        </button>
        <button
          onClick={() => handleExport("pdf")}
          className="export-btn pdf"
          title="Export as PDF"
        >
          📋 PDF
        </button>
        <button
          onClick={() => handleExport("json")}
          className="export-btn json"
          title="Export as JSON"
        >
          {"{}"} JSON
        </button>
        <button onClick={() => refetch()} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading audit logs...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <p className="error-message">
            Failed to load audit logs: {error.message}
          </p>
          <button onClick={() => refetch()} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && auditLogs.length === 0 && (
        <div className="empty-state">
          <p>No audit logs found</p>
          <p className="empty-subtitle">
            Audit logs will appear here as users interact with records
          </p>
        </div>
      )}

      {/* Logs Table */}
      {!isLoading && !error && paginatedLogs.length > 0 && (
        <>
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>
                    <button
                      onClick={() => handleSort("id")}
                      className="sort-btn"
                    >
                      ID {sortBy === "id" && (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleSort("userEmail")}
                      className="sort-btn"
                    >
                      User{" "}
                      {sortBy === "userEmail" &&
                        (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleSort("action")}
                      className="sort-btn"
                    >
                      Action{" "}
                      {sortBy === "action" && (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th>Record ID</th>
                  <th>
                    <button
                      onClick={() => handleSort("timestamp")}
                      className="sort-btn"
                    >
                      Timestamp{" "}
                      {sortBy === "timestamp" &&
                        (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleSort("status")}
                      className="sort-btn"
                    >
                      Status{" "}
                      {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                    </button>
                  </th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className="log-row"
                      onClick={() =>
                        setExpandedRow(expandedRow === log.id ? null : log.id)
                      }
                    >
                      <td className="log-id">{log.id?.slice(0, 8)}</td>
                      <td className="log-user">{log.userEmail}</td>
                      <td>
                        <span className={`action-badge action-${log.action}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="log-record-id">
                        {log.recordId?.slice(0, 8)}
                      </td>
                      <td className="log-timestamp">
                        {formatDate(log.timestamp)}
                      </td>
                      <td>
                        <span className={`status-badge status-${log.status}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="expand-btn">
                        {expandedRow === log.id ? "▼" : "▶"}
                      </td>
                    </tr>
                    {expandedRow === log.id && (
                      <tr className="expanded-row">
                        <td colSpan="7">
                          <div className="expanded-content">
                            <div className="detail-item">
                              <strong>IP Address:</strong>{" "}
                              {log.ipAddress || "-"}
                            </div>
                            <div className="detail-item">
                              <strong>Details:</strong> {log.details || "-"}
                            </div>
                            {log.errorMessage && (
                              <div className="detail-item error">
                                <strong>Error:</strong> {log.errorMessage}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>

              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`page-btn ${
                        page === currentPage ? "active" : ""
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}

          {/* Results Info */}
          <div className="results-info">
            <p>
              Showing {startIndex + 1}-
              {Math.min(startIndex + logsPerPage, filteredAndSortedLogs.length)}{" "}
              of {filteredAndSortedLogs.length} logs
            </p>
          </div>
        </>
      )}

      {/* No Results */}
      {!isLoading &&
        !error &&
        auditLogs.length > 0 &&
        paginatedLogs.length === 0 && (
          <div className="empty-state">
            <p>No logs match your filters</p>
            <button onClick={handleClearFilters} className="btn-clear-filters">
              Clear filters
            </button>
          </div>
        )}
    </div>
  );
};

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export default AuditLogsPage;
