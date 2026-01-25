/**
 * Export Utilities
 * CSV and PDF export functionality for audit logs
 */

/**
 * Export audit logs to CSV
 * @param {array} auditLogs - Array of audit log objects
 * @param {string} filename - Output filename
 */
export function exportToCSV(auditLogs, filename = "audit-logs.csv") {
  if (!auditLogs || auditLogs.length === 0) {
    throw new Error("No data to export");
  }

  // CSV Headers
  const headers = [
    "ID",
    "User Email",
    "Action",
    "Record ID",
    "Timestamp",
    "IP Address",
    "Status",
    "Details",
  ];

  // CSV Rows
  const rows = auditLogs.map((log) => [
    escapeCSVField(log.id || ""),
    escapeCSVField(log.userEmail || ""),
    escapeCSVField(log.action || ""),
    escapeCSVField(log.recordId || ""),
    escapeCSVField(formatDate(log.timestamp)),
    escapeCSVField(log.ipAddress || ""),
    escapeCSVField(log.status || ""),
    escapeCSVField(log.details || ""),
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  // Download file
  downloadFile(csvContent, filename, "text/csv");
}

/**
 * Export audit logs to PDF
 * @param {array} auditLogs - Array of audit log objects
 * @param {object} options - Export options
 */
export async function exportToPDF(auditLogs, options = {}) {
  const {
    filename = "audit-logs.pdf",
    title = "Audit Logs Report",
    includeStats = true,
  } = options;

  if (!auditLogs || auditLogs.length === 0) {
    throw new Error("No data to export");
  }

  try {
    // Check if jsPDF is available (would need to be installed separately)
    // For now, we'll create a simple text-based PDF alternative
    let pdfContent = createPDFContent(auditLogs, title, includeStats);
    downloadFile(pdfContent, filename, "text/plain");
  } catch (error) {
    console.error("PDF export error:", error);
    throw new Error("PDF export failed: " + error.message);
  }
}

/**
 * Generate compliance report
 * @param {array} auditLogs - Array of audit log objects
 * @param {object} options - Report options
 * @returns {object} Report data
 */
export function generateComplianceReport(auditLogs, options = {}) {
  const { startDate, endDate, format = "json" } = options;

  if (!auditLogs || auditLogs.length === 0) {
    return null;
  }

  // Filter by date range if provided
  let filteredLogs = auditLogs;
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    filteredLogs = auditLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      if (start && logDate < start) return false;
      if (end && logDate > end) return false;
      return true;
    });
  }

  // Calculate statistics
  const stats = {
    totalRecords: filteredLogs.length,
    uniqueUsers: new Set(filteredLogs.map((log) => log.userEmail)).size,
    uniqueRecords: new Set(filteredLogs.map((log) => log.recordId)).size,
    actionCounts: {},
    statusCounts: {},
  };

  // Count actions and statuses
  filteredLogs.forEach((log) => {
    const action = log.action || "unknown";
    const status = log.status || "unknown";

    stats.actionCounts[action] = (stats.actionCounts[action] || 0) + 1;
    stats.statusCounts[status] = (stats.statusCounts[status] || 0) + 1;
  });

  // Build report object
  const report = {
    title: "Audit Log Compliance Report",
    generatedAt: new Date().toISOString(),
    dateRange: {
      start: startDate || null,
      end: endDate || null,
    },
    statistics: stats,
    logs: filteredLogs,
    summary: {
      period: `${formatDate(startDate || new Date(filteredLogs[0]?.timestamp))} to ${formatDate(endDate || new Date(filteredLogs[filteredLogs.length - 1]?.timestamp))}`,
      description: `This report contains ${filteredLogs.length} audit log entries, involving ${stats.uniqueUsers} unique users and ${stats.uniqueRecords} unique records.`,
    },
  };

  if (format === "csv") {
    return exportToCSV(filteredLogs, "compliance-report.csv");
  } else if (format === "pdf") {
    return exportToPDF(filteredLogs, { title: "Compliance Report" });
  }

  return report;
}

/**
 * Helper: Escape CSV field values
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return "";
  }

  const stringField = String(field);

  // Check if field contains special characters
  if (
    stringField.includes(",") ||
    stringField.includes('"') ||
    stringField.includes("\n")
  ) {
    // Escape quotes and wrap in quotes
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
}

/**
 * Helper: Download file to browser
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

/**
 * Helper: Create PDF-like content (text format)
 */
function createPDFContent(auditLogs, title, includeStats) {
  const lines = [];

  // Header
  lines.push("=".repeat(80));
  lines.push(title);
  lines.push("=".repeat(80));
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  // Statistics
  if (includeStats) {
    const stats = calculateStats(auditLogs);
    lines.push("STATISTICS");
    lines.push("-".repeat(40));
    lines.push(`Total Records: ${stats.totalRecords}`);
    lines.push(`Unique Users: ${stats.uniqueUsers}`);
    lines.push(`Unique Records: ${stats.uniqueRecords}`);
    lines.push("");
    lines.push("Action Breakdown:");
    Object.entries(stats.actionCounts).forEach(([action, count]) => {
      lines.push(`  ${action}: ${count}`);
    });
    lines.push("");
    lines.push("Status Breakdown:");
    Object.entries(stats.statusCounts).forEach(([status, count]) => {
      lines.push(`  ${status}: ${count}`);
    });
    lines.push("");
  }

  // Audit logs table
  lines.push("AUDIT LOGS");
  lines.push("-".repeat(80));
  lines.push(
    formatTableRow([
      "ID",
      "User",
      "Action",
      "Record ID",
      "Timestamp",
      "Status",
    ]),
  );
  lines.push("-".repeat(80));

  auditLogs.forEach((log) => {
    lines.push(
      formatTableRow([
        log.id ? log.id.slice(0, 8) : "-",
        log.userEmail || "-",
        log.action || "-",
        log.recordId ? log.recordId.slice(0, 8) : "-",
        formatDate(log.timestamp),
        log.status || "-",
      ]),
    );
  });

  lines.push("");
  lines.push("=".repeat(80));
  lines.push("End of Report");
  lines.push("=".repeat(80));

  return lines.join("\n");
}

/**
 * Helper: Calculate statistics from audit logs
 */
function calculateStats(auditLogs) {
  const stats = {
    totalRecords: auditLogs.length,
    uniqueUsers: new Set(auditLogs.map((log) => log.userEmail)).size,
    uniqueRecords: new Set(auditLogs.map((log) => log.recordId)).size,
    actionCounts: {},
    statusCounts: {},
  };

  auditLogs.forEach((log) => {
    const action = log.action || "unknown";
    const status = log.status || "unknown";

    stats.actionCounts[action] = (stats.actionCounts[action] || 0) + 1;
    stats.statusCounts[status] = (stats.statusCounts[status] || 0) + 1;
  });

  return stats;
}

/**
 * Helper: Format table row with fixed widths
 */
function formatTableRow(fields) {
  const widths = [10, 20, 12, 12, 20, 10];
  return fields
    .map((field, i) => {
      const width = widths[i] || 10;
      return String(field || "-").padEnd(width);
    })
    .join(" ");
}

/**
 * Helper: Format date for display
 */
function formatDate(dateValue) {
  if (!dateValue) return "-";
  try {
    const date = new Date(dateValue);
    return date.toLocaleString();
  } catch {
    return String(dateValue);
  }
}

/**
 * Get export formats available
 */
export function getAvailableExportFormats() {
  return [
    { id: "csv", label: "CSV File", icon: "📄" },
    { id: "pdf", label: "PDF Report", icon: "📋" },
    { id: "json", label: "JSON Data", icon: "{ }" },
  ];
}
