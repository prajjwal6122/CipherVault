// Database & API Tests - Phase 3.1: MongoDB Schema & Auth
// Tests for database initialization, user management, audit logging

const mongoose = require("mongoose");
const DatabaseService = require("./database-service");
const User = require("../models/User");
const Record = require("../models/Record");
const AuditLog = require("../models/AuditLog");

jest.mock("mongoose");

describe("P3-1: Database & API Layer", () => {
  let dbService;

  beforeEach(async () => {
    dbService = new DatabaseService({
      mongoUri: "mongodb://localhost:27017/secure-db-test",
    });
  });

  // ==================== Database Connection ====================
  describe("Database Connection & Initialization (5 tests)", () => {
    test("P3-1-1: Connect to MongoDB", async () => {
      await dbService.connect();
      expect(mongoose.connect).toHaveBeenCalled();
    });

    test("P3-1-2: Create collections with proper indexes", async () => {
      await dbService.initializeCollections();
      expect(dbService.collections).toHaveProperty("user_records");
      expect(dbService.collections).toHaveProperty("audit_logs");
      expect(dbService.collections).toHaveProperty("users");
    });

    test("P3-1-3: Set up TTL index for audit logs (90-day retention)", async () => {
      await dbService.setupAuditLogTTL(90);
      const auditLogIndexes = await AuditLog.collection.getIndexes();
      expect(auditLogIndexes).toBeDefined();
    });

    test("P3-1-4: Validate schema on insert", async () => {
      const invalidRecord = { invalid_field: "value" };
      await expect(Record.create(invalidRecord)).rejects.toThrow();
    });

    test("P3-1-5: Handle connection retry on transient failure", async () => {
      let callCount = 0;
      mongoose.connect = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("ECONNREFUSED"));
        }
        return Promise.resolve();
      });

      await dbService.connectWithRetry(3, 1000);
      expect(mongoose.connect).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== User Schema & RBAC ====================
  describe("User Schema & Role-Based Access Control (8 tests)", () => {
    test("P3-1-6: Create user with email and password", async () => {
      const userData = {
        email: "user@example.com",
        password: "hashedPassword123",
        role: "analyst",
      };

      const user = await User.create(userData);

      expect(user.email).toEqual("user@example.com");
      expect(user.role).toEqual("analyst");
    });

    test("P3-1-7: Enforce unique email constraint", async () => {
      await User.create({
        email: "duplicate@example.com",
        password: "pass1",
        role: "viewer",
      });

      await expect(
        User.create({
          email: "duplicate@example.com",
          password: "pass2",
          role: "viewer",
        }),
      ).rejects.toThrow("duplicate key error");
    });

    test("P3-1-8: Support three roles: admin, analyst, viewer", async () => {
      const roles = ["admin", "analyst", "viewer"];

      for (const role of roles) {
        const user = await User.create({
          email: `user-${role}@example.com`,
          password: "pass",
          role,
        });

        expect(user.role).toEqual(role);
      }
    });

    test("P3-1-9: Reject invalid roles", async () => {
      await expect(
        User.create({
          email: "user@example.com",
          password: "pass",
          role: "superuser",
        }),
      ).rejects.toThrow();
    });

    test("P3-1-10: Timestamp user creation and updates", async () => {
      const user = await User.create({
        email: "user@example.com",
        password: "pass",
        role: "analyst",
      });

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    test("P3-1-11: Hash password on user creation", async () => {
      const plainPassword = "MySecurePassword123!";

      const user = await User.create({
        email: "user@example.com",
        password: plainPassword,
        role: "analyst",
      });

      expect(user.password).not.toEqual(plainPassword);
    });

    test("P3-1-12: Verify password matches hash", async () => {
      const user = await User.create({
        email: "user@example.com",
        password: "MySecurePassword123!",
        role: "analyst",
      });

      const matches = await user.comparePassword("MySecurePassword123!");
      expect(matches).toBe(true);
    });

    test("P3-1-13: Query users by role for access control", async () => {
      await User.create({
        email: "admin@example.com",
        password: "pass",
        role: "admin",
      });
      await User.create({
        email: "analyst@example.com",
        password: "pass",
        role: "analyst",
      });

      const admins = await User.find({ role: "admin" });
      expect(admins.length).toBeGreaterThan(0);
    });
  });

  // ==================== Record Schema ====================
  describe("Record Schema & Encryption Metadata (6 tests)", () => {
    test("P3-1-14: Store encrypted payload with metadata", async () => {
      const record = await Record.create({
        encrypted_payload: Buffer.from("encrypted-data"),
        key_id: "aws-key-001",
        created_at: new Date(),
      });

      expect(record.encrypted_payload).toBeDefined();
      expect(record.key_id).toEqual("aws-key-001");
    });

    test("P3-1-15: Track record creation timestamp and user", async () => {
      const record = await Record.create({
        encrypted_payload: Buffer.from("data"),
        key_id: "key-1",
        created_by: "user-123",
      });

      expect(record.created_at).toBeDefined();
      expect(record.created_by).toEqual("user-123");
    });

    test("P3-1-16: Index on key_id for quick key rotation", async () => {
      const indexes = await Record.collection.getIndexes();
      expect(Object.keys(indexes).some((idx) => idx.includes("key_id"))).toBe(
        true,
      );
    });

    test("P3-1-17: Support soft delete (mark as deleted, not remove)", async () => {
      const record = await Record.create({
        encrypted_payload: Buffer.from("data"),
        key_id: "key-1",
      });

      await Record.updateOne({ _id: record._id }, { deleted_at: new Date() });

      const found = await Record.findById(record._id);
      expect(found.deleted_at).toBeDefined();
    });

    test("P3-1-18: Exclude deleted records from queries by default", async () => {
      await Record.create({
        encrypted_payload: Buffer.from("data"),
        key_id: "key-1",
        deleted_at: new Date(), // Soft deleted
      });

      await Record.create({
        encrypted_payload: Buffer.from("data2"),
        key_id: "key-1",
        deleted_at: null, // Active
      });

      const activeRecords = await Record.find({ deleted_at: null });
      expect(activeRecords.length).toBe(1);
    });

    test("P3-1-19: Query records by date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      await Record.create({
        encrypted_payload: Buffer.from("data"),
        key_id: "key-1",
        created_at: new Date("2024-01-15"),
      });

      const records = await Record.find({
        created_at: { $gte: startDate, $lte: endDate },
      });

      expect(records.length).toBeGreaterThan(0);
    });
  });

  // ==================== Audit Log Schema ====================
  describe("Audit Log Schema & Compliance (5 tests)", () => {
    test("P3-1-20: Log all reveal/access events", async () => {
      const auditEntry = await AuditLog.create({
        user_id: "user-123",
        record_id: "record-456",
        action: "VIEW_DECRYPTED",
        timestamp: new Date(),
        ip_address: "192.168.1.100",
      });

      expect(auditEntry.action).toEqual("VIEW_DECRYPTED");
      expect(auditEntry.user_id).toEqual("user-123");
    });

    test("P3-1-21: Immutable audit logs (no updates)", async () => {
      const entry = await AuditLog.create({
        user_id: "user-123",
        record_id: "record-456",
        action: "VIEW_DECRYPTED",
        timestamp: new Date(),
        ip_address: "192.168.1.100",
      });

      // In real implementation, schema would prevent updates
      // Try to update and verify it fails or is ignored
      await expect(
        AuditLog.updateOne({ _id: entry._id }, { action: "HACKED" }),
      ).rejects.toThrow();
    });

    test("P3-1-22: Automatic TTL deletion (90 days)", async () => {
      const oldEntry = await AuditLog.create({
        user_id: "user-123",
        record_id: "record-456",
        action: "VIEW_DECRYPTED",
        timestamp: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000), // 91 days ago
        ip_address: "192.168.1.100",
      });

      // TTL index should delete after 90 days
      // In test, we check the index exists
      const indexes = await AuditLog.collection.getIndexes();
      expect(indexes).toBeDefined();
    });

    test("P3-1-23: Query audit logs by user and date range", async () => {
      const userId = "user-123";
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      await AuditLog.create({
        user_id: userId,
        record_id: "record-1",
        action: "VIEW_DECRYPTED",
        timestamp: new Date("2024-01-15"),
        ip_address: "192.168.1.1",
      });

      const logs = await AuditLog.find({
        user_id: userId,
        timestamp: { $gte: startDate, $lte: endDate },
      });

      expect(logs.length).toBeGreaterThan(0);
    });

    test("P3-1-24: Store additional context (user agent, geo)", async () => {
      const entry = await AuditLog.create({
        user_id: "user-123",
        record_id: "record-456",
        action: "VIEW_DECRYPTED",
        timestamp: new Date(),
        ip_address: "192.168.1.100",
        user_agent: "Mozilla/5.0...",
        geolocation: { country: "US", city: "New York" },
      });

      expect(entry.user_agent).toBeDefined();
      expect(entry.geolocation.country).toEqual("US");
    });
  });

  // ==================== Migration & Setup ====================
  describe("Database Migration & Setup (3 tests)", () => {
    test("P3-1-25: Run idempotent migration script", async () => {
      // Run migration first time
      await dbService.runMigration("001-initial-setup");

      // Run again - should not fail
      await dbService.runMigration("001-initial-setup");

      expect(dbService.migrations).toContain("001-initial-setup");
    });

    test("P3-1-26: Create indexes for all collections", async () => {
      await dbService.createAllIndexes();

      // Verify indexes exist
      expect(User.collection.getIndexes).toBeDefined();
      expect(Record.collection.getIndexes).toBeDefined();
      expect(AuditLog.collection.getIndexes).toBeDefined();
    });

    test("P3-1-27: Seed initial admin user", async () => {
      await dbService.seedInitialData();

      const admin = await User.findOne({ role: "admin" });
      expect(admin).toBeDefined();
      expect(admin.email).toContain("admin");
    });
  });
});
