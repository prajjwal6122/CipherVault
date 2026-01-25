/**
 * Analytics Service - Phase 4.6
 * Provides analytics data for dashboard
 */

class AnalyticsService {
  /**
   * Get dashboard summary metrics
   */
  async getDashboardSummary(userId, period = "month") {
    const Record = require("../models/Record");
    const AuditLog = require("../models/AuditLog");

    const startDate = this.getStartDate(period);

    const [totalRecords, reveals, audits, activeKeys] = await Promise.all([
      Record.countDocuments({ userId }),
      AuditLog.countDocuments({
        userId,
        action: "REVEAL",
        timestamp: { $gte: startDate },
      }),
      AuditLog.countDocuments({ userId, timestamp: { $gte: startDate } }),
      Record.distinct("keyId", { userId }),
    ]);

    return {
      totalRecords,
      revealsThisPeriod: reveals,
      auditEntriesThisPeriod: audits,
      activeEncryptionKeys: activeKeys.length,
      period,
    };
  }

  /**
   * Get activity timeline
   */
  async getActivityTimeline(userId, period = "month", granularity = "day") {
    const AuditLog = require("../models/AuditLog");
    const startDate = this.getStartDate(period);

    const timeline = await AuditLog.aggregate([
      {
        $match: { userId, timestamp: { $gte: startDate } },
      },
      {
        $group: {
          _id: this.getGroupByDate(granularity),
          count: { $sum: 1 },
          timestamp: { $first: "$timestamp" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return timeline.map((item) => ({
      date: item._id,
      activities: item.count,
      timestamp: item.timestamp,
    }));
  }

  /**
   * Get encryption statistics
   */
  async getEncryptionStats(userId, period = "month") {
    const Record = require("../models/Record");
    const startDate = this.getStartDate(period);

    const [encrypted, decrypted, byType] = await Promise.all([
      Record.countDocuments({
        userId,
        createdAt: { $gte: startDate },
      }),
      Record.aggregate([
        {
          $match: { userId, decryptedAt: { $gte: startDate } },
        },
        { $count: "total" },
      ]),
      Record.aggregate([
        { $match: { userId } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      encrypted,
      decrypted: decrypted[0]?.total || 0,
      byType,
      encryptionRate: `${encrypted > 0 ? (((encrypted - (decrypted[0]?.total || 0)) / encrypted) * 100).toFixed(2) : 0}%`,
      period,
    };
  }

  /**
   * Get start date based on period
   */
  getStartDate(period) {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case "day":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    return startDate;
  }

  /**
   * Get MongoDB aggregation grouping by date
   */
  getGroupByDate(granularity) {
    switch (granularity) {
      case "hour":
        return {
          $dateToString: {
            format: "%Y-%m-%d %H:00",
            date: "$timestamp",
          },
        };
      case "day":
        return {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$timestamp",
          },
        };
      case "week":
        return {
          $week: "$timestamp",
        };
      case "month":
        return {
          $dateToString: {
            format: "%Y-%m",
            date: "$timestamp",
          },
        };
      default:
        return {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$timestamp",
          },
        };
    }
  }
}

module.exports = AnalyticsService;
