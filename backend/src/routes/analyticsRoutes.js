/**
 * Analytics Routes - Phase 4.6
 * Provides data for analytics dashboard and reporting
 */

const express = require("express");
const { authenticateToken } = require("../middleware/auth-middleware");
const AnalyticsService = require("../services/analytics-service");

const router = express.Router();
const analyticsService = new AnalyticsService();

/**
 * GET /api/v1/analytics/summary
 * Get dashboard summary metrics
 */
router.get("/summary", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { period = "month" } = req.query;

    // Validate period
    if (!["day", "week", "month", "year"].includes(period)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PERIOD",
          message: "Period must be: day, week, month, or year",
        },
      });
    }

    const summary = await analyticsService.getDashboardSummary(userId, period);

    res.status(200).json({
      success: true,
      data: summary,
      period,
      message: "Dashboard summary retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "SUMMARY_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/analytics/timeline
 * Get activity timeline for charts
 */
router.get("/timeline", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { period = "month", granularity = "day" } = req.query;

    const timeline = await analyticsService.getActivityTimeline(
      userId,
      period,
      granularity,
    );

    res.status(200).json({
      success: true,
      data: timeline,
      period,
      granularity,
      message: "Activity timeline retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "TIMELINE_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/analytics/encryption-stats
 * Get encryption operation statistics
 */
router.get("/encryption-stats", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { period = "month" } = req.query;

    const stats = await analyticsService.getEncryptionStats(userId, period);

    res.status(200).json({
      success: true,
      data: stats,
      period,
      message: "Encryption statistics retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "STATS_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/analytics/record-types
 * Get breakdown by record type
 */
router.get("/record-types", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user._id;

    const Record = require("../models/Record");
    const breakdown = await Record.aggregate([
      { $match: { userId } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: breakdown,
      total: breakdown.reduce((sum, item) => sum + item.count, 0),
      message: "Record type breakdown retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "BREAKDOWN_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/analytics/audit-summary
 * Get audit log summary
 */
router.get("/audit-summary", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { period = "month" } = req.query;

    const AuditLog = require("../models/AuditLog");
    const startDate = analyticsService.getStartDate(period);

    const [totalActions, actionBreakdown, topActions] = await Promise.all([
      AuditLog.countDocuments({ userId, timestamp: { $gte: startDate } }),
      AuditLog.aggregate([
        {
          $match: { userId, timestamp: { $gte: startDate } },
        },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.find({ userId })
        .sort({ timestamp: -1 })
        .limit(10)
        .select("action timestamp ipAddress"),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalActions,
        actionBreakdown,
        recentActions: topActions,
      },
      period,
      message: "Audit summary retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "AUDIT_SUMMARY_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/analytics/key-usage
 * Get encryption key usage statistics
 */
router.get("/key-usage", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user._id;

    const Record = require("../models/Record");
    const keyUsage = await Record.aggregate([
      { $match: { userId } },
      { $group: { _id: "$keyId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: keyUsage,
      message: "Key usage statistics retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "KEY_USAGE_FAILED",
        message: error.message,
      },
    });
  }
});

module.exports = router;
