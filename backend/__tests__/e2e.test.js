/**
 * End-to-End Integration Tests
 * Complete user workflows: register -> login -> create record -> reveal
 */

const request = require("supertest");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.development" });

describe("End-to-End Workflows", () => {
  let app;
  let server;

  beforeAll(() => {
    app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Import all routes
    const authRoutes = require("../src/routes/authRoutes");
    const recordRoutes = require("../src/routes/recordRoutes");
    const auditRoutes = require("../src/routes/auditRoutes");
    const kmsRoutes = require("../src/routes/kmsRoutes");
    const { errorHandler } = require("../src/middleware/error-handler");

    app.use("/auth", authRoutes);
    app.use("/records", recordRoutes);
    app.use("/audit-logs", auditRoutes);
    app.use("/kms", kmsRoutes);
    app.use(errorHandler);

    server = app.listen(3005);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe("User Registration & Login Flow", () => {
    it("should complete full user registration and login workflow", async () => {
      const testEmail = `e2etest-${Date.now()}@example.com`;

      // Step 1: Register
      const registerResponse = await request(app).post("/auth/register").send({
        email: testEmail,
        password: "E2ETestPassword123!",
        role: "analyst",
      });

      expect([200, 201]).toContain(registerResponse.status);
      expect(registerResponse.body).toHaveProperty("message");

      // Step 2: Login
      const loginResponse = await request(app).post("/auth/login").send({
        email: testEmail,
        password: "E2ETestPassword123!",
      });

      expect([200, 201]).toContain(loginResponse.status);
      expect(loginResponse.body).toHaveProperty("accessToken");
      expect(loginResponse.body).toHaveProperty("refreshToken");

      // Step 3: Get user profile
      const token = loginResponse.body.accessToken;
      const profileResponse = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect([200, 201]).toContain(profileResponse.status);
      expect(profileResponse.body.user.email).toBe(testEmail);
      expect(profileResponse.body.user.role).toBe("analyst");
    });
  });

  describe("Data Encryption & Reveal Workflow", () => {
    let authToken;
    let recordId;
    const testEmail = `e2edata-${Date.now()}@example.com`;

    beforeAll(async () => {
      // Register and login
      try {
        await request(app).post("/auth/register").send({
          email: testEmail,
          password: "E2EDataPassword123!",
          role: "analyst",
        });
      } catch (error) {
        // User might already exist
      }

      const loginResponse = await request(app).post("/auth/login").send({
        email: testEmail,
        password: "E2EDataPassword123!",
      });

      authToken = loginResponse.body.accessToken;
    });

    it("should encrypt data and create record", async () => {
      const response = await request(app)
        .post("/kms/encrypt")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          plaintext: "sensitive data to protect",
          keyId: "default-key",
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("encryptedData");
      expect(response.body).toHaveProperty("iv");
      expect(response.body).toHaveProperty("authTag");
    });

    it("should create record with encrypted data", async () => {
      // First encrypt the data
      const encryptResponse = await request(app)
        .post("/kms/encrypt")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          plaintext: "sensitive data to protect",
          keyId: "default-key",
        });

      const encrypted = encryptResponse.body;

      // Create record with encrypted data
      const recordResponse = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          encryptedData: encrypted.encryptedData,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          metadata: {
            fileName: "e2e-test-file.txt",
            fileSize: 1024,
            mimeType: "text/plain",
          },
          recordType: "document",
          tags: ["e2e-test", "sensitive"],
        });

      expect([200, 201]).toContain(recordResponse.status);
      expect(recordResponse.body).toHaveProperty("record");
      expect(recordResponse.body.record).toHaveProperty("_id");

      recordId = recordResponse.body.record._id;
    });

    it("should list records with pagination", async () => {
      const response = await request(app)
        .get("/records?page=1&pageSize=10")
        .set("Authorization", `Bearer ${authToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("records");
      expect(response.body).toHaveProperty("pagination");
    });

    it("should retrieve and mask record", async () => {
      if (!recordId) {
        // Create record if not exists
        const encryptResponse = await request(app)
          .post("/kms/encrypt")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            plaintext: "test data",
            keyId: "default-key",
          });

        const recordResponse = await request(app)
          .post("/records")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            encryptedData: encryptResponse.body.encryptedData,
            iv: encryptResponse.body.iv,
            authTag: encryptResponse.body.authTag,
            metadata: { fileName: "test.txt" },
            recordType: "document",
          });

        recordId = recordResponse.body.record._id;
      }

      // Get masked version
      const maskResponse = await request(app)
        .get(`/records/${recordId}/mask`)
        .set("Authorization", `Bearer ${authToken}`);

      expect([200, 201]).toContain(maskResponse.status);
      expect(maskResponse.body).toHaveProperty("record");
      // Masked record should not contain encryptedData
      expect(maskResponse.body.record.encryptedData).toBeUndefined();
    });

    it("should reveal record with password", async () => {
      if (!recordId) {
        // Create record if not exists
        const encryptResponse = await request(app)
          .post("/kms/encrypt")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            plaintext: "test data",
            keyId: "default-key",
          });

        const recordResponse = await request(app)
          .post("/records")
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            encryptedData: encryptResponse.body.encryptedData,
            iv: encryptResponse.body.iv,
            authTag: encryptResponse.body.authTag,
            metadata: { fileName: "test.txt" },
            recordType: "document",
          });

        recordId = recordResponse.body.record._id;
      }

      // Reveal record
      const revealResponse = await request(app)
        .post(`/records/${recordId}/reveal`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          password: "reveal-password",
        });

      expect([200, 201]).toContain(revealResponse.status);
      expect(revealResponse.body).toHaveProperty("decryptionToken");
    });
  });

  describe("Multi-User Workflow with Admin Audit", () => {
    const analystEmail = `e2eanalyst-${Date.now()}@example.com`;
    const adminEmail = `e2eadmin-${Date.now()}@example.com`;
    let analystToken;
    let adminToken;

    beforeAll(async () => {
      // Create analyst
      try {
        await request(app).post("/auth/register").send({
          email: analystEmail,
          password: "AnalystPass123!",
          role: "analyst",
        });
      } catch (error) {
        // User might already exist
      }

      // Create admin
      try {
        await request(app).post("/auth/register").send({
          email: adminEmail,
          password: "AdminPass123!",
          role: "admin",
        });
      } catch (error) {
        // User might already exist
      }

      // Login analyst
      const analystLogin = await request(app).post("/auth/login").send({
        email: analystEmail,
        password: "AnalystPass123!",
      });
      analystToken = analystLogin.body.accessToken;

      // Login admin
      const adminLogin = await request(app).post("/auth/login").send({
        email: adminEmail,
        password: "AdminPass123!",
      });
      adminToken = adminLogin.body.accessToken;
    });

    it("analyst should create record and admin should see in audit log", async () => {
      // Analyst creates record
      const encryptResponse = await request(app)
        .post("/kms/encrypt")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({
          plaintext: "analyst created data",
          keyId: "default-key",
        });

      const createResponse = await request(app)
        .post("/records")
        .set("Authorization", `Bearer ${analystToken}`)
        .send({
          encryptedData: encryptResponse.body.encryptedData,
          iv: encryptResponse.body.iv,
          authTag: encryptResponse.body.authTag,
          metadata: { fileName: "analyst-file.txt" },
          recordType: "document",
          tags: ["analyst-created"],
        });

      expect([200, 201]).toContain(createResponse.status);

      // Admin views audit logs
      const auditResponse = await request(app)
        .get("/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(auditResponse.status);
      expect(auditResponse.body).toHaveProperty("logs");
    });

    it("admin should export audit logs", async () => {
      const response = await request(app)
        .get("/audit-logs/export")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.headers["content-type"]).toContain("text/csv");
    });

    it("admin should view audit statistics", async () => {
      const response = await request(app)
        .get("/audit-logs/statistics")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("statistics");
      expect(response.body.statistics).toHaveProperty("totalEvents");
    });
  });

  describe("Token Refresh Workflow", () => {
    let refreshToken;

    beforeAll(async () => {
      const testEmail = `e2etoken-${Date.now()}@example.com`;

      try {
        await request(app).post("/auth/register").send({
          email: testEmail,
          password: "TokenPass123!",
          role: "analyst",
        });
      } catch (error) {
        // User might already exist
      }

      const loginResponse = await request(app).post("/auth/login").send({
        email: testEmail,
        password: "TokenPass123!",
      });

      refreshToken = loginResponse.body.refreshToken;
    });

    it("should refresh access token using refresh token", async () => {
      const refreshResponse = await request(app).post("/auth/refresh").send({
        refreshToken: refreshToken,
      });

      expect([200, 201]).toContain(refreshResponse.status);
      expect(refreshResponse.body).toHaveProperty("accessToken");

      // Use new access token to access protected route
      const newToken = refreshResponse.body.accessToken;
      const profileResponse = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${newToken}`);

      expect([200, 201]).toContain(profileResponse.status);
      expect(profileResponse.body).toHaveProperty("user");
    });
  });

  describe("Complete Security Workflow", () => {
    const userEmail = `e2esecurity-${Date.now()}@example.com`;
    let userToken;

    beforeAll(async () => {
      try {
        await request(app).post("/auth/register").send({
          email: userEmail,
          password: "SecurityPass123!",
          role: "analyst",
        });
      } catch (error) {
        // User might already exist
      }

      const loginResponse = await request(app).post("/auth/login").send({
        email: userEmail,
        password: "SecurityPass123!",
      });

      userToken = loginResponse.body.accessToken;
    });

    it("should verify KMS health before encryption", async () => {
      const healthResponse = await request(app)
        .get("/kms/health")
        .set("Authorization", `Bearer ${userToken}`);

      expect([200, 201]).toContain(healthResponse.status);
      expect(["operational", "degraded", "unavailable"]).toContain(
        healthResponse.body.status,
      );
    });

    it("should generate data key, encrypt, and verify integrity", async () => {
      // Generate key
      const keyResponse = await request(app)
        .post("/kms/generate-data-key")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          keyId: "default-key",
        });

      expect([200, 201]).toContain(keyResponse.status);
      expect(keyResponse.body).toHaveProperty("dataKey");

      // Encrypt with generated key
      const encryptResponse = await request(app)
        .post("/kms/encrypt")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          plaintext: "data to encrypt and verify",
          keyId: "default-key",
        });

      expect([200, 201]).toContain(encryptResponse.status);

      // Verify key
      const verifyResponse = await request(app)
        .post("/kms/verify-key")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          keyId: "default-key",
        });

      expect([200, 201]).toContain(verifyResponse.status);
      expect(verifyResponse.body).toHaveProperty("isValid");
    });
  });
});
