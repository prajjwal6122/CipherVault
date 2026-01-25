// Database Service Implementation
const mongoose = require("mongoose");
// Models are auto-registered when imported
const User = require("../models/User");
const Record = require("../models/Record");
const AuditLog = require("../models/AuditLog");

class DatabaseService {
  constructor(options = {}) {
    this.mongoUri = options.mongoUri || process.env.MONGODB_URI;
    this.collections = {};
    this.migrations = [];
  }

  async connect() {
    try {
      await mongoose.connect(this.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    } catch (error) {
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
  }

  async connectWithRetry(maxRetries = 3, delayMs = 5000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.connect();
        return;
      } catch (error) {
        if (i < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          throw error;
        }
      }
    }
  }

  async initializeCollections() {
    // Models are already registered from imports, just reference them
    this.collections.users = User;
    this.collections.user_records = Record;
    this.collections.audit_logs = AuditLog;
  }

  async setupAuditLogTTL(dayRetention = 90) {
    const AuditLog = this.collections.audit_logs;
    await AuditLog.collection.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: dayRetention * 24 * 60 * 60 },
    );
  }

  async createAllIndexes() {
    await Promise.all([
      this.collections.users.collection.createIndex(
        { email: 1 },
        { unique: true },
      ),
      this.collections.users.collection.createIndex({ role: 1 }),
      this.collections.user_records.collection.createIndex({ key_id: 1 }),
      this.collections.user_records.collection.createIndex({ created_at: 1 }),
      this.collections.audit_logs.collection.createIndex({
        user_id: 1,
        timestamp: 1,
      }),
    ]);
  }

  async runMigration(migrationName) {
    if (!this.migrations.includes(migrationName)) {
      this.migrations.push(migrationName);
    }
  }

  async seedInitialData() {
    const User = this.collections.users;
    const adminExists = await User.findOne({ role: "admin" });

    if (!adminExists) {
      await User.create({
        email: "admin@platform.local",
        password: "ChangeMe123!",
        role: "admin",
      });
    }
  }
}

module.exports = DatabaseService;
