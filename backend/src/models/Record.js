// Record Model - Encrypted Data Storage
const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => require("crypto").randomUUID(),
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    recordType: {
      type: String,
      enum: ["PII", "Financial", "Medical", "Legal", "Other"],
      default: "Other",
    },
    // Encrypted data payload
    encryptedData: {
      type: String,
      required: true,
    },
    // Encryption metadata
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
    dataHash: {
      type: String,
      required: true,
    },
    // Field metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // KMS information
    kmsProvider: {
      type: String,
      enum: ["aws", "gcp", "local"],
      default: "local",
    },
    kmsKeyId: String,
    kmsRegion: String,
    // Encryption metadata for client-side derivation
    encryption: {
      algorithm: {
        type: String,
        default: "AES-256-GCM",
      },
      keyDerivation: {
        type: String,
        default: "PBKDF2",
      },
      salt: {
        type: String,
        required: true,
      },
      iterations: {
        type: Number,
        default: 100000,
      },
      version: {
        type: String,
        default: "v1",
      },
    },
    // Summary/mask info
    summary: String, // Brief unencrypted summary for display
    maskPattern: String, // Pattern for display masking
    // Record lifecycle
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: String,
    // Reveal tracking
    revealCount: {
      type: Number,
      default: 0,
    },
    lastRevealedAt: Date,
    lastRevealedBy: String,
    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    tags: [String],
    description: String,
  },
  {
    collection: "records",
    timestamps: true,
  },
);

// Indexes for performance
recordSchema.index({ userId: 1, createdAt: -1 });
recordSchema.index({ userId: 1, isDeleted: 1 });
recordSchema.index({ ownerEmail: 1, createdAt: -1 });
recordSchema.index({ kmsProvider: 1 });
recordSchema.index({ recordType: 1 });
recordSchema.index({ tags: 1 });
// TTL index - automatically delete records after expiresAt + 30 days
recordSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 2592000 }, // 30 days
);

// Before save hook
recordSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("encryptedData") && !this.isNew) {
      this.updatedAt = Date.now();
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Get masked version of record
recordSchema.methods.getMasked = function () {
  return {
    id: this.id,
    userId: this.userId,
    recordType: this.recordType,
    summary: this.summary,
    maskPattern: this.maskPattern,
    createdAt: this.createdAt,
    revealCount: this.revealCount,
    tags: this.tags,
    description: this.description,
    lastRevealedAt: this.lastRevealedAt,
  };
};

// Verify data integrity
recordSchema.methods.verifyIntegrity = function (dataHash) {
  return this.dataHash === dataHash;
};

// Mark as revealed
recordSchema.methods.markAsRevealed = async function (revealedBy) {
  return this.updateOne({
    $inc: { revealCount: 1 },
    $set: {
      lastRevealedAt: Date.now(),
      lastRevealedBy: revealedBy,
    },
  });
};

// Soft delete
recordSchema.methods.softDelete = async function (deletedBy) {
  return this.updateOne({
    $set: {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: deletedBy,
    },
  });
};

// Restore soft deleted record
recordSchema.methods.restore = async function () {
  return this.updateOne({
    $set: { isDeleted: false },
    $unset: {
      deletedAt: 1,
      deletedBy: 1,
    },
  });
};

// Get unencrypted record (used during reveal flow)
recordSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static method to find active records
recordSchema.statics.findActive = function (userId, filters = {}) {
  const query = {
    userId,
    isDeleted: false,
    ...filters,
  };
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find deleted records
recordSchema.statics.findDeleted = function (userId) {
  return this.find({
    userId,
    isDeleted: true,
  }).sort({ deletedAt: -1 });
};

// Static method for paginated records
recordSchema.statics.findPaginated = async function (
  userId,
  page = 1,
  limit = 20,
  filters = {},
) {
  const skip = (page - 1) * limit;
  const query = {
    userId,
    isDeleted: false,
    ...filters,
  };

  const total = await this.countDocuments(query);
  const records = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    records,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = mongoose.model("Record", recordSchema);
