/**
 * Audit Log Routes
 * Handles audit log queries and compliance reporting
 *
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Get audit logs (admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 *
 * /audit-logs/my-actions:
 *   get:
 *     summary: Get current user's audit actions
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: User's audit actions retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /audit-logs/record/{recordId}:
 *   get:
 *     summary: Get audit log for specific record
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record audit history retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Record not found
 *
 * /audit-logs/export:
 *   get:
 *     summary: Export audit logs as CSV/PDF (admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, pdf]
 *           default: csv
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Audit logs exported successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */

const express = require("express");
const AuditService = require("../services/audit-service");
const { authenticateToken } = require("../middleware/auth-middleware");
const { checkAdminRole } = require("../middleware/authorization-middleware");
const { paginate } = require("../middleware/query-middleware");

const router = express.Router();

/**
 * GET /audit-logs
 * Get all audit logs (admin only)
 */
router.get(
  "/",
  authenticateToken,
  checkAdminRole,
  paginate,
  async (req, res, next) => {
    try {
      const { page, pageSize } = req.query;
      const { action, userId, userEmail, status, startDate, endDate } =
        req.query;

      // Build query filters
      const filters = {};
      if (action) filters.action = action.toUpperCase();
      if (userId) filters.userId = userId;
      if (userEmail) filters.userEmail = userEmail;
      if (status) filters.status = status.toUpperCase();
      if (startDate || endDate) {
        filters.timestamp = {};
        if (startDate) filters.timestamp.$gte = new Date(startDate);
        if (endDate) filters.timestamp.$lte = new Date(endDate);
      }

      // Get audit logs
      const logs = await AuditService.getAuditLogs(page, pageSize, filters);

      res.status(200).json({
        success: true,
        data: logs,
        message: "Audit logs retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /audit-logs/my-actions
 * Get current user's actions from audit log
 */
router.get(
  "/my-actions",
  authenticateToken,
  paginate,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const userEmail = req.user.email;
      const { page, pageSize } = req.query;

      // Get user's audit actions
      const logs = await AuditService.getUserActions(userEmail, page, pageSize);

      res.status(200).json({
        success: true,
        data: logs,
        message: "Your actions retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /audit-logs/record/:recordId
 * Get audit history for a specific record
 */
router.get("/record/:recordId", authenticateToken, async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get record to check permissions
    const RecordModel = require("../models/Record");
    const record = await RecordModel.findById(recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: "RECORD_NOT_FOUND",
          message: "Record not found",
        },
      });
    }

    // Check permissions - only owner or admin can view record's audit log
    if (userRole !== "admin" && record.ownerEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to view this record's audit log",
        },
      });
    }

    // Get record audit history
    const logs = await AuditService.getRecordAuditLog(recordId);

    res.status(200).json({
      success: true,
      data: {
        recordId,
        auditHistory: logs,
      },
      message: "Record audit history retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /audit-logs/export
 * Export audit logs as CSV or PDF
 */
router.get(
  "/export",
  authenticateToken,
  checkAdminRole,
  async (req, res, next) => {
    try {
      const { format = "csv", startDate, endDate } = req.query;
      const userEmail = req.user.email;

      // Build filters
      const filters = {};
      if (startDate || endDate) {
        filters.timestamp = {};
        if (startDate) filters.timestamp.$gte = new Date(startDate);
        if (endDate) filters.timestamp.$lte = new Date(endDate);
      }

      // Get all logs for export
      const AuditLog = require("../models/AuditLog");
      const logs = await AuditLog.find(filters).sort({ timestamp: -1 });

      let fileContent;
      let contentType;
      let filename;

      if (format === "csv") {
        // Convert to CSV
        fileContent = convertToCSV(logs);
        contentType = "text/csv";
        filename = `audit-logs-${new Date().getTime()}.csv`;
      } else if (format === "pdf") {
        // Convert to PDF (requires pdf library - placeholder)
        fileContent = convertToPDF(logs);
        contentType = "application/pdf";
        filename = `audit-logs-${new Date().getTime()}.pdf`;
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_FORMAT",
            message: "Format must be csv or pdf",
          },
        });
      }

      // Log export action
      await AuditService.logAction({
        action: "EXPORT_DATA",
        userEmail,
        ipAddress: req.ip,
        status: "SUCCESS",
        reason: `Exported audit logs in ${format} format`,
        details: {
          format,
          recordCount: logs.length,
        },
      });

      // Send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Type", contentType);
      res.send(fileContent);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /audit-logs/stats
 * Get audit statistics (admin only)
 */
router.get(
  "/stats",
  authenticateToken,
  checkAdminRole,
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      // Build date filter
      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.timestamp = {};
        if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
        if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
      }

      // Get statistics
      const AuditLog = require("../models/AuditLog");

      const totalActions = await AuditLog.countDocuments(dateFilter);
      const actionBreakdown = await AuditLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const statusBreakdown = await AuditLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const topUsers = await AuditLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$userEmail",
            actionCount: { $sum: 1 },
          },
        },
        { $sort: { actionCount: -1 } },
        { $limit: 10 },
      ]);

      const suspiciousActivities = await AuditLog.countDocuments({
        ...dateFilter,
        status: "SUSPICIOUS",
      });

      res.status(200).json({
        success: true,
        data: {
          period: {
            startDate,
            endDate,
          },
          totalActions,
          actionBreakdown,
          statusBreakdown,
          topUsers,
          suspiciousActivities,
        },
        message: "Audit statistics retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Helper function to convert logs to CSV
 */
function convertToCSV(logs) {
  const headers = [
    "Timestamp",
    "Action",
    "User Email",
    "IP Address",
    "Status",
    "Reason",
    "Record ID",
  ];
  const rows = logs.map((log) => [
    log.createdAt.toISOString(),
    log.action,
    log.userEmail || "",
    log.ipAddress || "",
    log.status,
    log.reason || "",
    log.recordId || "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csv;
}

/**
 * Helper function to convert logs to PDF
 * Note: Requires pdf-lib or similar library
 */
function convertToPDF(logs) {
  // Placeholder - actual PDF generation requires pdf-lib
  // For now, return JSON as placeholder
  return JSON.stringify(logs, null, 2);
}

module.exports = router;
