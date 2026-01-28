/**
 * Audit Service
 * Handles all audit logging and compliance tracking
 */

const AuditLog = require("../models/AuditLog");

class AuditService {
  /**
   * Log an action to the audit log (fire-and-forget, non-blocking)
   */
  static async logAction(auditData) {
    try {
      const normalizedStatus = (auditData.status || "SUCCESS").toUpperCase();
      let normalizedResult = auditData.result;
      if (!normalizedResult) {
        normalizedResult =
          normalizedStatus === "SUCCESS"
            ? "success"
            : normalizedStatus === "FAILED"
              ? "failure"
              : normalizedStatus.toLowerCase();
      }

      const log = new AuditLog({
        action: auditData.action || "OTHER",
        userId: auditData.userId || null,
        userEmail: auditData.userEmail || null,
        recordId: auditData.recordId || null,
        resourceType: auditData.resourceType || "system",
        resourceId: auditData.resourceId || auditData.recordId || null,
        ipAddress: auditData.ipAddress || "unknown",
        userAgent: auditData.userAgent || null,
        reason: auditData.reason || null,
        status: normalizedStatus,
        result: normalizedResult.toLowerCase(),
        details: auditData.details || {},
        errorMessage: auditData.errorMessage,
        timestamp: auditData.timestamp || new Date(),
      });

      // Fire-and-forget: Don't await the save, let it happen in background
      log.save().catch((err) => {
        // Silent error handling
      });
      
      // Return immediately without waiting
      return log;
    } catch (error) {
      // Don't throw - audit logging should never break main flow
      return null;
    }
  }

  /**
   * Get audit logs with pagination
   */
  static async getAuditLogs(page = 1, pageSize = 50, filters = {}) {
    try {
      const skip = (page - 1) * pageSize;

      const logs = await AuditLog.find(filters)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(pageSize);

      const total = await AuditLog.countDocuments(filters);

      return {
        logs,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get audit actions for a specific user
   */
  static async getUserActions(userEmail, page = 1, pageSize = 50) {
    try {
      const skip = (page - 1) * pageSize;

      const actions = await AuditLog.find({ userEmail })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(pageSize);

      const total = await AuditLog.countDocuments({ userEmail });

      return {
        actions,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get audit history for a specific record
   */
  static async getRecordAuditLog(recordId) {
    try {
      const logs = await AuditLog.find({ recordId }).sort({ timestamp: -1 });

      return logs;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get suspicious activities
   */
  static async getSuspiciousActivities(filters = {}) {
    try {
      const suspiciousFilters = {
        status: "SUSPICIOUS",
        ...filters,
      };

      const logs = await AuditLog.find(suspiciousFilters).sort({
        timestamp: -1,
      });

      return logs;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get statistics for a date range
   */
  static async getStatistics(startDate, endDate) {
    try {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      const timestampFilter =
        Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {};

      const totalActions = await AuditLog.countDocuments(timestampFilter);

      const actionBreakdown = await AuditLog.aggregate([
        { $match: timestampFilter },
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const statusBreakdown = await AuditLog.aggregate([
        { $match: timestampFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const topUsers = await AuditLog.aggregate([
        { $match: timestampFilter },
        {
          $group: {
            _id: "$userEmail",
            actionCount: { $sum: 1 },
          },
        },
        { $sort: { actionCount: -1 } },
        { $limit: 10 },
      ]);

      return {
        totalActions,
        actionBreakdown,
        statusBreakdown,
        topUsers,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Log reveal request with reason
   */
  static async logReveal(userId, userEmail, recordId, reason, ipAddress) {
    return this.logAction({
      action: "REVEAL_RECORD",
      userId,
      userEmail,
      recordId,
      ipAddress,
      reason,
      status: "SUCCESS",
      resourceType: "record",
      resourceId: recordId,
    });
  }

  /**
   * Log failed login attempt
   */
  static async logFailedLogin(userEmail, ipAddress) {
    return this.logAction({
      action: "FAILED_LOGIN",
      userEmail,
      ipAddress,
      status: "FAILED",
    });
  }

  /**
   * Log suspicious activity
   */
  static async logSuspicious(userEmail, action, reason, ipAddress) {
    return this.logAction({
      action,
      userEmail,
      ipAddress,
      reason,
      status: "SUSPICIOUS",
      resourceType: "system",
    });
  }
}

module.exports = AuditService;
