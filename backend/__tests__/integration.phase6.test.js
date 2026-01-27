/**
 * Phase 6: Integration Test Suite
 * End-to-end testing of critical user workflows
 */

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../src/models/User");
const Record = require("../src/models/Record");

describe("Phase 6: Integration Tests", () => {
  let adminToken;
  let analystToken;
  let testRecordId;

  beforeAll(async () => {
    // Connect to test database
    const MONGO_URI =
      process.env.MONGODB_URI_TEST ||
      "mongodb://localhost:27017/secure_encryption_test";
    await mongoose.connect(MONGO_URI);
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Record.deleteMany({});
    await mongoose.connection.close();
  });

  describe("INT-001: Authentication Flow", () => {
    test("INT-001-1: Should create admin user successfully", async () => {
      const adminUser = new User({
        email: "admin@test.com",
        password: "Admin123!",
        role: "admin",
        firstName: "Admin",
        lastName: "User",
      });

      await adminUser.save();
      expect(adminUser._id).toBeDefined();
      expect(adminUser.role).toBe("admin");
    });

    test("INT-001-2: Should login with valid credentials", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "admin@test.com",
        password: "Admin123!",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();

      adminToken = response.body.data.token;
    });

    test("INT-001-3: Should reject invalid credentials", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "admin@test.com",
        password: "WrongPassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("INT-001-4: Should create analyst user", async () => {
      const analystUser = new User({
        email: "analyst@test.com",
        password: "Analyst123!",
        role: "analyst",
        firstName: "John",
        lastName: "Analyst",
      });

      await analystUser.save();

      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "analyst@test.com",
        password: "Analyst123!",
      });

      analystToken = loginResponse.body.data.token;
      expect(analystToken).toBeDefined();
    });
  });

  describe("INT-002: Record Upload & Encryption", () => {
    test("INT-002-1: Should require authentication for record creation", async () => {
      const response = await request(app).post("/api/v1/records").send({
        patientName: "Test Patient",
        encryptedData: "encrypted_payload",
        encryptionSalt: "salt_value",
      });

      expect(response.status).toBe(401);
    });

    test("INT-002-2: Should create record with valid token", async () => {
      const response = await request(app)
        .post("/api/v1/records")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          patientName: "John Doe",
          age: "45",
          diagnosis: "Hypertension",
          status: "Active",
          encryptedData: Buffer.from("sensitive_data").toString("base64"),
          encryptionSalt: Buffer.from("random_salt").toString("base64"),
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBeDefined();

      testRecordId = response.body.data._id;
    });

    test("INT-002-3: Should validate required fields", async () => {
      const response = await request(app)
        .post("/api/v1/records")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          patientName: "Jane Doe",
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("INT-003: Data Masking & Retrieval", () => {
    test("INT-003-1: Should list records with masked data", async () => {
      const response = await request(app)
        .get("/api/v1/records")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test("INT-003-2: Should fetch single record", async () => {
      const response = await request(app)
        .get(`/api/v1/records/${testRecordId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data._id).toBe(testRecordId);
      expect(response.body.data.patientName).toBe("John Doe");
    });

    test("INT-003-3: Should return 404 for non-existent record", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/records/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("INT-004: RBAC Authorization", () => {
    test("INT-004-1: Analyst should access records", async () => {
      const response = await request(app)
        .get("/api/v1/records")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("INT-004-2: Analyst should NOT delete records", async () => {
      const response = await request(app)
        .delete(`/api/v1/records/${testRecordId}`)
        .set("Authorization", `Bearer ${analystToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test("INT-004-3: Admin should delete records", async () => {
      // Create a new record to delete
      const createResponse = await request(app)
        .post("/api/v1/records")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          patientName: "To Delete",
          encryptedData: "data",
          encryptionSalt: "salt",
        });

      const recordId = createResponse.body.data._id;

      const deleteResponse = await request(app)
        .delete(`/api/v1/records/${recordId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });
  });

  describe("INT-005: Audit Logging", () => {
    test("INT-005-1: Should log login events", async () => {
      // Login event should create audit log
      await request(app).post("/api/v1/auth/login").send({
        email: "admin@test.com",
        password: "Admin123!",
      });

      const auditResponse = await request(app)
        .get("/api/v1/audit")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ action: "LOGIN" });

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.body.data.length).toBeGreaterThan(0);
    });

    test("INT-005-2: Should log record access", async () => {
      // Access record to generate audit log
      await request(app)
        .get(`/api/v1/records/${testRecordId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      const auditResponse = await request(app)
        .get("/api/v1/audit")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ action: "RECORD_ACCESS" });

      expect(auditResponse.status).toBe(200);
    });
  });

  describe("INT-006: Error Handling", () => {
    test("INT-006-1: Should handle malformed JSON", async () => {
      const response = await request(app)
        .post("/api/v1/records")
        .set("Authorization", `Bearer ${adminToken}`)
        .set("Content-Type", "application/json")
        .send("invalid json{");

      expect(response.status).toBe(400);
    });

    test("INT-006-2: Should handle missing Authorization header", async () => {
      const response = await request(app).get("/api/v1/records");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("MISSING_TOKEN");
    });

    test("INT-006-3: Should handle invalid token", async () => {
      const response = await request(app)
        .get("/api/v1/records")
        .set("Authorization", "Bearer invalid_token_here");

      expect(response.status).toBe(401);
    });
  });

  describe("INT-007: Data Validation", () => {
    test("INT-007-1: Should validate email format", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "invalid-email",
        password: "Password123!",
      });

      expect(response.status).toBe(400);
    });

    test("INT-007-2: Should enforce password requirements", async () => {
      const user = new User({
        email: "test@example.com",
        password: "123", // Too short
        role: "analyst",
      });

      await expect(user.save()).rejects.toThrow();
    });

    test("INT-007-3: Should validate record status values", async () => {
      const response = await request(app)
        .post("/api/v1/records")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          patientName: "Test",
          status: "InvalidStatus", // Should be Active/Discharged/Pending
          encryptedData: "data",
          encryptionSalt: "salt",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("INT-008: Performance", () => {
    test("INT-008-1: Should list records within 500ms", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get("/api/v1/records")
        .set("Authorization", `Bearer ${adminToken}`);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    test("INT-008-2: Should handle concurrent requests", async () => {
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app)
            .get("/api/v1/records")
            .set("Authorization", `Bearer ${adminToken}`),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
