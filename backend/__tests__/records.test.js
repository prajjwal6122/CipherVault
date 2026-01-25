/**
 * Integration Tests for Record Routes
 * Tests: GET /records, POST /records, GET /records/:id, DELETE /records/:id, mask, reveal
 */

const request = require("supertest");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.development" });

describe("Records Routes", () => {
  let app;
  let server;
  let authToken;
  let recordId;

  beforeAll(() => {
    app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Import routes
    const authRoutes = require("../src/routes/authRoutes");
    const recordRoutes = require("../src/routes/recordRoutes");
    const { errorHandler } = require("../src/middleware/error-handler");

    app.use("/auth", authRoutes);
    app.use("/records", recordRoutes);
    app.use(errorHandler);

    server = app.listen(3002);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(async () => {
    // Register and login a test user
    try {
      await request(app).post("/auth/register").send({
        email: "recordtester@example.com",
        password: "TestPassword123!",
        role: "analyst",
      });
    } catch (error) {
      // User might already exist
    }

    const loginResponse = await request(app).post("/auth/login").send({
      email: "recordtester@example.com",
      password: "TestPassword123!",
    });

    authToken = loginResponse.body.accessToken;
  });

  describe("POST /records", () => {
    it("should create a new record with valid data", async () => {
      const response = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          encryptedData: "encrypted-test-data",
          iv: "initialization-vector",
          authTag: "auth-tag",
          metadata: {
            fileName: "test-file.txt",
            fileSize: 1024,
            mimeType: "text/plain",
          },
          recordType: "document",
          tags: ["test", "document"],
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("record");
      expect(response.body.record).toHaveProperty("_id");

      // Store recordId for later tests
      recordId = response.body.record._id;
    });

    it("should reject record without authentication", async () => {
      const response = await request(app)
        .post("/records")
        .send({
          encryptedData: "encrypted-test-data",
          iv: "initialization-vector",
          authTag: "auth-tag",
          metadata: {
            fileName: "test-file.txt",
          },
          recordType: "document",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject record with missing required fields", async () => {
      const response = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          // Missing encryptedData
          iv: "initialization-vector",
          authTag: "auth-tag",
          metadata: {},
        });

      expect([400, 422]).toContain(response.status);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /records", () => {
    it("should list all records for authenticated user", async () => {
      const response = await request(app)
        .get("/records")
        .set("Authorization", `Bearer ${authToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("records");
      expect(Array.isArray(response.body.records)).toBe(true);
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/records?page=1&pageSize=10")
        .set("Authorization", `Bearer ${authToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("records");
      expect(response.body).toHaveProperty("pagination");
      expect(response.body.pagination).toHaveProperty("page");
      expect(response.body.pagination).toHaveProperty("pageSize");
    });

    it("should support filtering by recordType", async () => {
      const response = await request(app)
        .get("/records?recordType=document")
        .set("Authorization", `Bearer ${authToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("records");
    });

    it("should support filtering by tags", async () => {
      const response = await request(app)
        .get("/records?tags=test")
        .set("Authorization", `Bearer ${authToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("records");
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app).get("/records");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /records/:recordId", () => {
    it("should retrieve specific record with valid ID", async () => {
      // First create a record
      const createResponse = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          encryptedData: "encrypted-test-data",
          iv: "initialization-vector",
          authTag: "auth-tag",
          metadata: {
            fileName: "test-file.txt",
          },
          recordType: "document",
          tags: ["test"],
        });

      const testRecordId = createResponse.body.record._id;

      const response = await request(app)
        .get(`/records/${testRecordId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("record");
      expect(response.body.record._id).toBe(testRecordId);
    });

    it("should return 404 for non-existent record", async () => {
      const response = await request(app)
        .get("/records/invalid-record-id-12345")
        .set("Authorization", `Bearer ${authToken}`);

      expect([404, 400]).toContain(response.status);
    });

    it("should reject request without authentication", async () => {
      const response = await request(app).get("/records/some-id");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /records/:recordId", () => {
    it("should soft delete a record", async () => {
      // Create a record first
      const createResponse = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          encryptedData: "encrypted-test-data",
          iv: "initialization-vector",
          authTag: "auth-tag",
          metadata: {
            fileName: "test-file.txt",
          },
          recordType: "document",
          tags: ["test"],
        });

      const testRecordId = createResponse.body.record._id;

      const response = await request(app)
        .delete(`/records/${testRecordId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("deleted");
    });

    it("should reject delete without authentication", async () => {
      const response = await request(app).delete("/records/some-id");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /records/:recordId/mask", () => {
    it("should return masked record data", async () => {
      // Create a record
      const createResponse = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          encryptedData: "encrypted-test-data",
          iv: "initialization-vector",
          authTag: "auth-tag",
          metadata: {
            fileName: "test-file.txt",
          },
          recordType: "document",
          tags: ["test"],
        });

      const testRecordId = createResponse.body.record._id;

      const response = await request(app)
        .get(`/records/${testRecordId}/mask`)
        .set("Authorization", `Bearer ${authToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("record");
      // Masked data should not contain encryptedData
      expect(response.body.record.encryptedData).toBeUndefined();
    });
  });

  describe("POST /records/:recordId/reveal", () => {
    it("should reveal record with correct password", async () => {
      // Create a record
      const createResponse = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          encryptedData: "encrypted-test-data",
          iv: "initialization-vector",
          authTag: "auth-tag",
          metadata: {
            fileName: "test-file.txt",
          },
          recordType: "document",
          tags: ["test"],
        });

      const testRecordId = createResponse.body.record._id;

      const response = await request(app)
        .post(`/records/${testRecordId}/reveal`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          password: "reveal-password",
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("decryptionToken");
    });

    it("should reject reveal without password", async () => {
      const response = await request(app)
        .post("/records/some-id/reveal")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect([400, 422]).toContain(response.status);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject reveal without authentication", async () => {
      const response = await request(app).post("/records/some-id/reveal").send({
        password: "password",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });
});
