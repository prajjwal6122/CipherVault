/**
 * Integration Tests for Audit Routes
 * Tests: GET /audit-logs, filtering, pagination, export, statistics
 */

const request = require("supertest");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.development" });

describe("Audit Routes", () => {
  let app;
  let server;
  let adminToken;
  let analystToken;

  beforeAll(() => {
    app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Import routes
    const authRoutes = require("../src/routes/authRoutes");
    const auditRoutes = require("../src/routes/auditRoutes");
    const { errorHandler } = require("../src/middleware/error-handler");

    app.use("/auth", authRoutes);
    app.use("/audit-logs", auditRoutes);
    app.use(errorHandler);

    server = app.listen(3003);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(async () => {
    // Create admin user
    try {
      await request(app).post("/auth/register").send({
        email: "admin@example.com",
        password: "AdminPassword123!",
        role: "admin",
      });
    } catch (error) {
      // User might already exist
    }

    // Create analyst user
    try {
      await request(app).post("/auth/register").send({
        email: "analyst@example.com",
        password: "AnalystPassword123!",
        role: "analyst",
      });
    } catch (error) {
      // User might already exist
    }

    // Login as admin
    const adminLoginResponse = await request(app).post("/auth/login").send({
      email: "admin@example.com",
      password: "AdminPassword123!",
    });
    adminToken = adminLoginResponse.body.accessToken;

    // Login as analyst
    const analystLoginResponse = await request(app).post("/auth/login").send({
      email: "analyst@example.com",
      password: "AnalystPassword123!",
    });
    analystToken = analystLoginResponse.body.accessToken;
  });

  describe("GET /audit-logs", () => {
    it("should list audit logs for admin user", async () => {
      const response = await request(app)
        .get("/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("logs");
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/audit-logs?page=1&pageSize=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("logs");
      expect(response.body).toHaveProperty("pagination");
    });

    it("should support filtering by action", async () => {
      const response = await request(app)
        .get("/audit-logs?action=LOGIN")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("logs");
    });

    it("should support filtering by date range", async () => {
      const startDate = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/audit-logs?startDate=${startDate}&endDate=${endDate}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("logs");
    });

    it("should reject non-admin users", async () => {
      const response = await request(app)
        .get("/audit-logs")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app).get("/audit-logs");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /audit-logs/user/:userId", () => {
    it("should list audit logs for specific user", async () => {
      const response = await request(app)
        .get("/audit-logs/user/analyst@example.com")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("logs");
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it("should support pagination for user logs", async () => {
      const response = await request(app)
        .get("/audit-logs/user/analyst@example.com?page=1&pageSize=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("logs");
      expect(response.body).toHaveProperty("pagination");
    });

    it("should reject non-admin access", async () => {
      const response = await request(app)
        .get("/audit-logs/user/analyst@example.com")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /audit-logs/record/:recordId", () => {
    it("should list audit logs for specific record", async () => {
      const response = await request(app)
        .get("/audit-logs/record/test-record-id")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("logs");
    });

    it("should support pagination for record logs", async () => {
      const response = await request(app)
        .get("/audit-logs/record/test-record-id?page=1&pageSize=10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("logs");
    });
  });

  describe("GET /audit-logs/export", () => {
    it("should export audit logs as CSV for admin", async () => {
      const response = await request(app)
        .get("/audit-logs/export")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.headers["content-type"]).toContain("text/csv");
    });

    it("should support filtering in export", async () => {
      const response = await request(app)
        .get("/audit-logs/export?action=LOGIN")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.headers["content-type"]).toContain("text/csv");
    });

    it("should reject non-admin export", async () => {
      const response = await request(app)
        .get("/audit-logs/export")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /audit-logs/statistics", () => {
    it("should return audit statistics for admin", async () => {
      const response = await request(app)
        .get("/audit-logs/statistics")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("statistics");
      expect(response.body.statistics).toHaveProperty("totalEvents");
      expect(response.body.statistics).toHaveProperty("eventsByType");
      expect(response.body.statistics).toHaveProperty("eventsByStatus");
    });

    it("should support date range filtering in statistics", async () => {
      const startDate = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/audit-logs/statistics?startDate=${startDate}&endDate=${endDate}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("statistics");
    });

    it("should reject non-admin access to statistics", async () => {
      const response = await request(app)
        .get("/audit-logs/statistics")
        .set("Authorization", `Bearer ${analystToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject unauthenticated statistics request", async () => {
      const response = await request(app).get("/audit-logs/statistics");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });
});
