// AuditLog Model - Immutable Audit Logging
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => require("crypto").randomUUID(),
      unique: true,
    },
    userId: {
      type: String,
      required: false,
      index: true,
    },
    userEmail: {
      type: String,
      required: false,
      lowercase: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "LOGIN",
        "LOGOUT",
        "FAILED_LOGIN",
        "REGISTER",
        "CREATE_RECORD",
        "READ_RECORD",
        "REVEAL_RECORD",
        "UPDATE_RECORD",
        "DELETE_RECORD",
        "EXPORT_RECORD",
        "MANAGE_USER",
        "MANAGE_ROLE",
        "KMS_ROTATE_KEY",
        "BACKUP_INITIATED",
        "RESTORE_COMPLETED",
        "SECURITY_ALERT",
        "ACCESS_DENIED",
        "UNAUTHORIZED_ACCESS",
        "ADMIN_ACTION",
        "OTHER",
      ],
      index: true,
    },
    resourceType: {
      type: String,
      enum: ["record", "user", "system", "kms", "backup", "audit"],
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    result: {
      type: String,
      enum: ["success", "failure", "warning"],
      default: "success",
    },
    errorMessage: String,
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "SUSPICIOUS", "PENDING"],
      default: "SUCCESS",
    },
    reason: String,
    recordId: {
      type: String,
      index: true,
    },
    // Security info
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: String,
    sessionId: String,
    // Timestamps
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      immutable: true,
    },
    // Immutability flag
    _immutable: {
      type: Boolean,
      default: true,
      immutable: true,
    },
  },
  {
    collection: "audit_logs",
    timestamps: false, // We use timestamp field instead
  },
);

// Compound indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ result: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });

// TTL index - automatically delete logs after 90 days
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 7776000 }, // 90 days in seconds
);

// Prevent updates to immutable fields
auditLogSchema.pre("findByIdAndUpdate", function (next) {
  if (this.getUpdate().$set) {
    delete this.getUpdate().$set._immutable;
  }
  next();
});

// Prevent direct updates
auditLogSchema.pre("updateOne", function (next) {
  throw new Error("Audit logs are immutable and cannot be updated");
});

auditLogSchema.pre("updateMany", function (next) {
  throw new Error("Audit logs are immutable and cannot be updated");
});

// Prevent deletes
auditLogSchema.pre("deleteOne", function (next) {
  throw new Error("Audit logs are immutable and cannot be deleted");
});

auditLogSchema.pre("deleteMany", function (next) {
  throw new Error("Audit logs are immutable and cannot be deleted");
});

// Static method to create audit log
auditLogSchema.statics.createLog = async function (auditData) {
  try {
    const log = new this({
      userId: auditData.userId,
      action: auditData.action,
      resourceType: auditData.resourceType,
      resourceId: auditData.resourceId,
      details: auditData.details || {},
      result: auditData.result || "success",
      errorMessage: auditData.errorMessage,
      ipAddress: auditData.ipAddress || "unknown",
      userAgent: auditData.userAgent,
      sessionId: auditData.sessionId,
    });

    return await log.save();
  } catch (error) {
    console.error("Failed to create audit log:", error);
    throw error;
  }
};

// Static method to get user audit history
auditLogSchema.statics.getUserHistory = function (userId, limit = 100) {
  return this.find({ userId }).sort({ timestamp: -1 }).limit(limit).lean();
};

// Static method to get action history
auditLogSchema.statics.getActionHistory = function (action, limit = 100) {
  return this.find({ action }).sort({ timestamp: -1 }).limit(limit).lean();
};

// Static method to get resource history
auditLogSchema.statics.getResourceHistory = function (
  resourceType,
  resourceId,
) {
  return this.find({ resourceType, resourceId }).sort({ timestamp: -1 }).lean();
};

// Static method to get security incidents
auditLogSchema.statics.getSecurityIncidents = function (hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    $or: [
      { result: "failure" },
      { action: "ACCESS_DENIED" },
      { action: "SECURITY_ALERT" },
    ],
    timestamp: { $gte: since },
  })
    .sort({ timestamp: -1 })
    .lean();
};

// Static method to generate audit report
auditLogSchema.statics.generateReport = async function (
  startDate,
  endDate,
  userId = null,
) {
  const query = { timestamp: { $gte: startDate, $lte: endDate } };
  if (userId) query.userId = userId;

  const logs = await this.find(query).sort({ timestamp: -1 }).lean();

  return {
    period: { startDate, endDate },
    totalEvents: logs.length,
    byAction: this._groupBy(logs, "action"),
    byResult: this._groupBy(logs, "result"),
    byResource: this._groupBy(logs, "resourceType"),
    events: logs,
  };
};

// Helper method to group logs
auditLogSchema.statics._groupBy = function (arr, key) {
  return arr.reduce((groups, item) => {
    const group = item[key];
    groups[group] = (groups[group] || 0) + 1;
    return groups;
  }, {});
};

// Soft query to exclude immutable flag
auditLogSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj._immutable;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
