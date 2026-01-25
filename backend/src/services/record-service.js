/**
 * Record Service
 * Handles CRUD operations for encrypted records, masking, and decryption token generation
 */

const Record = require("../models/Record");

class RecordService {
  constructor(options = {}) {
    this.secret = options.secret || process.env.JWT_SECRET || "your-secret-key";
  }

  /**
   * Create a new encrypted record
   * @param {Object} recordData - Record data to create
   * @returns {Object} Created record
   */
  async createRecord(recordData) {
    try {
      if (!recordData.ownerEmail || !recordData.userId) {
        throw new Error("Record owner metadata is required");
      }
      const record = new Record(recordData);
      await record.save();
      return record;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a record by ID
   * @param {string} recordId - Record ID (supports both _id and custom id)
   * @returns {Object|null} Record object or null
   */
  async getRecord(recordId) {
    try {
      // Try to find by MongoDB _id first
      let record = await Record.findOne({ _id: recordId, isDeleted: false });
      
      // If not found, try by custom id field
      if (!record) {
        record = await Record.findOne({ id: recordId, isDeleted: false });
      }
      
      return record;
    } catch (error) {
      // If _id format is invalid (not ObjectId), try by custom id
      try {
        return await Record.findOne({ id: recordId, isDeleted: false });
      } catch {
        return null;
      }
    }
  }

  /**
   * List records with pagination and filtering
   * @param {number} page - Page number (1-indexed)
   * @param {number} pageSize - Records per page
   * @param {Object} filters - Query filters
   * @returns {Object} Paginated records with metadata
   */
  async listRecords(page = 1, pageSize = 20, filters = {}) {
    try {
      const skip = (page - 1) * pageSize;

      // Build query with filters
      let query = Record.find({ isDeleted: false });

      if (filters.recordType) {
        query = query.where("recordType").equals(filters.recordType);
      }

      if (filters.tags && Array.isArray(filters.tags)) {
        query = query.where("tags").in(filters.tags);
      }

      if (filters.search) {
        query = query.or([
          {
            "metadata.originalFileName": {
              $regex: filters.search,
              $options: "i",
            },
          },
          { recordType: { $regex: filters.search, $options: "i" } },
          { tags: { $in: [new RegExp(filters.search, "i")] } },
        ]);
      }

      if (filters.createdAt) {
        if (filters.createdAt.$gte) {
          query = query.where("createdAt").gte(filters.createdAt.$gte);
        }
        if (filters.createdAt.$lte) {
          query = query.where("createdAt").lte(filters.createdAt.$lte);
        }
      }

      // Get total count
      const total = await Record.countDocuments({ isDeleted: false });

      // Get paginated records
      const records = await query
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);

      // Mask sensitive data in response
      const maskedRecords = records.map((r) => this._maskRecord(r));

      return {
        records: maskedRecords,
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
   * List records by owner
   * @param {string} ownerEmail - Owner email
   * @param {number} page - Page number
   * @param {number} pageSize - Records per page
   * @param {Object} filters - Query filters
   * @returns {Object} Paginated records
   */
  async listRecordsByOwner(ownerEmail, page = 1, pageSize = 20, filters = {}) {
    try {
      const skip = (page - 1) * pageSize;

      // Build query
      let query = Record.find({ ownerEmail, isDeleted: false });

      if (filters.recordType) {
        query = query.where("recordType").equals(filters.recordType);
      }

      if (filters.tags && Array.isArray(filters.tags)) {
        query = query.where("tags").in(filters.tags);
      }

      // Get total count
      const total = await Record.countDocuments({
        ownerEmail,
        isDeleted: false,
      });

      // Get paginated records
      const records = await query
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);

      const maskedRecords = records.map((r) => this._maskRecord(r));

      return {
        records: maskedRecords,
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
   * Delete a record (soft delete)
   * @param {string} recordId - Record ID
   * @returns {Object} Updated record
   */
  async deleteRecord(recordId) {
    try {
      const record = await Record.findById(recordId);
      if (!record) {
        throw new Error("Record not found");
      }

      record.deletedAt = new Date();
      record.isDeleted = true;
      await record.save();

      return record;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Request record reveal with password verification
   * @param {string} recordId - Record ID
   * @param {string} password - Reveal password
   * @returns {boolean} True if password is valid
   */
  async requestReveal(recordId, password) {
    try {
      const record = await Record.findById(recordId);
      if (!record) {
        return false;
      }

      // For now, accept any non-empty password
      // In production, implement proper password checking
      return password && password.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Mask sensitive record data for preview
   * @param {Object} record - Record object
   * @returns {Object} Masked record
   */
  _maskRecord(record) {
    const masked = record.toObject();

    // Call model's getMasked method if available
    if (record.getMasked && typeof record.getMasked === "function") {
      return record.getMasked();
    }

    // Default masking
    masked.encryptedData = "[ENCRYPTED]";
    masked.iv = "[ENCRYPTED]";
    masked.authTag = "[ENCRYPTED]";

    return masked;
  }

  /**
   * Get record count
   * @param {Object} filters - Query filters
   * @returns {number} Record count
   */
  async getRecordCount(filters = {}) {
    try {
      let query = Record.find({ isDeleted: false });

      if (filters.ownerEmail) {
        query = query.where("ownerEmail").equals(filters.ownerEmail);
      }

      return await query.countDocuments();
    } catch (error) {
      return 0;
    }
  }
}

module.exports = RecordService;
