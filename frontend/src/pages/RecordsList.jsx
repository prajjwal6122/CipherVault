/**
 * Records List Component
 * Displays all records with masking and pagination
 */

import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";
import DecryptionModal from "../components/DecryptionModal";
import CreateRecordForm from "../components/CreateRecordForm";
import "./RecordsList.css";

const RecordsList = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [decryptedData, setDecryptedData] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();

  const recordsPerPage = 20;

  // Fetch records from backend
  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["records"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/records", {
          params: {
            page: 1,
            pageSize: 50,
          },
        });
        // Backend responds with { success, data: { records, pagination } }
        return res.data?.data || res.data || { records: [] };
      } catch (err) {
        // Return empty records on error instead of throwing
        console.error("Failed to fetch records:", err);
        return { records: [] };
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: false, // Don't retry - show empty state instead
    refetchOnWindowFocus: false,
  });

  const records = response?.records || [];
  const isLoadingRecords = isLoading && !response;

  const deleteMutation = useMutation({
    mutationFn: async (recordId) => {
      await apiClient.delete(`/records/${recordId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["records"]);
    },
  });

  // Filter and sort records
  const filteredAndSortedRecords = useMemo(() => {
    let filtered = records.filter((record) => {
      // Filter by type
      if (filterType !== "all" && record.recordType !== filterType) {
        return false;
      }

      // Search in masked data
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const recordString = JSON.stringify(record).toLowerCase();
        return recordString.includes(searchLower);
      }

      return true;
    });

    // Sort records
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date sorting
      if (sortBy === "createdAt") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [records, searchTerm, filterType, sortBy, sortOrder]);

  // Paginate records
  const totalPages = Math.ceil(
    filteredAndSortedRecords.length / recordsPerPage,
  );
  const startIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRecords = filteredAndSortedRecords.slice(
    startIndex,
    startIndex + recordsPerPage,
  );

  const maskedRecords = paginatedRecords;

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleDelete = async (recordId) => {
    const confirmed = window.confirm("Delete this record?");
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(recordId);
    } catch (err) {
      alert(
        err.response?.data?.error?.message || err.message || "Delete failed",
      );
    }
  };

  return (
    <div className="records-list-container">
      <div className="records-header">
        <div>
          <h1>📋 Records Management</h1>
          <p>View and manage your encrypted records</p>
        </div>
        <button
          className="create-record-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? "✖ Cancel" : "➕ Create Record"}
        </button>
      </div>

      {/* Create Record Form */}
      {showCreateForm && (
        <CreateRecordForm
          onSuccess={() => {
            setShowCreateForm(false);
            refetch();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Controls */}
      <div className="records-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>

        <div className="control-group">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="PII">PII</option>
            <option value="Financial">Financial</option>
            <option value="Medical">Medical</option>
            <option value="Legal">Legal</option>
            <option value="Other">Other</option>
          </select>

          <button
            onClick={() => refetch()}
            className="refresh-btn"
            disabled={isFetching}
          >
            {isFetching ? "🔄 Loading..." : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* Loading State - only on initial load */}
      {isLoadingRecords && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading records...</p>
        </div>
      )}

      {/* Empty State - show when no records and not loading */}
      {!isLoadingRecords && records.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No Records Found</h3>
          <p className="empty-subtitle">
            Click the "➕ Create Record" button above to create your first
            encrypted record
          </p>
        </div>
      )}

      {/* Records Table */}
      {!isLoadingRecords && maskedRecords.length > 0 && (
        <>
          <div className="records-table-wrapper">
            <table className="records-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("id")}>
                    ID {sortBy === "id" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("type")}>
                    Type{" "}
                    {sortBy === "type" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Masked Data</th>
                  <th onClick={() => handleSort("createdAt")}>
                    Created{" "}
                    {sortBy === "createdAt" &&
                      (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {maskedRecords.map((record, index) => (
                  <tr key={record.id || index}>
                    <td className="record-id">
                      {record.id?.slice(0, 8) || record._id?.slice(0, 8) || "-"}
                    </td>
                    <td>
                      <span
                        className={`type-badge type-${(record.recordType || "OTHER").toLowerCase()}`}
                      >
                        {record.recordType || "OTHER"}
                      </span>
                    </td>
                    <td className="masked-data">
                      <span className="masked-indicator">●●●●</span>
                      {formatMaskedDataDisplay(record)}
                    </td>
                    <td className="created-date">
                      {formatDate(record.createdAt)}
                    </td>
                    <td className="actions">
                      <button className="action-btn view-btn">View</button>
                      <button
                        className="action-btn reveal-btn"
                        onClick={() =>
                          setSelectedRecordId(record.id || record._id)
                        }
                      >
                        Reveal
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(record.id || record._id)}
                        disabled={deleteMutation.isLoading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
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
                      onClick={() => handlePageChange(page)}
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
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}

          {/* Results info */}
          <div className="results-info">
            <p>
              Showing {startIndex + 1}-
              {Math.min(
                startIndex + recordsPerPage,
                filteredAndSortedRecords.length,
              )}{" "}
              of {filteredAndSortedRecords.length} records
            </p>
          </div>
        </>
      )}

      {/* No results state */}
      {!isLoadingRecords &&
        records.length > 0 &&
        maskedRecords.length === 0 && (
          <div className="empty-state">
            <p>No records match your search</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterType("all");
                setCurrentPage(1);
              }}
              className="clear-filters-btn"
            >
              Clear filters
            </button>
          </div>
        )}

      <DecryptionModal
        isOpen={!!selectedRecordId}
        recordId={selectedRecordId}
        onClose={() => setSelectedRecordId(null)}
        onDecryptSuccess={(data) =>
          setDecryptedData({ recordId: selectedRecordId, data })
        }
      />

      {decryptedData && (
        <div className="decrypted-panel">
          <div className="panel-header">
            <h3>Decrypted Record</h3>
            <button
              className="close-btn"
              onClick={() => setDecryptedData(null)}
            >
              ✕
            </button>
          </div>
          <pre className="decrypted-content">
            {JSON.stringify(decryptedData.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

/**
 * Format masked data for display
 */
function formatMaskedDataDisplay(record) {
  if (record.maskPattern) {
    return record.maskPattern;
  }

  if (record.summary) {
    return record.summary;
  }

  return "Masked data";
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export default RecordsList;
