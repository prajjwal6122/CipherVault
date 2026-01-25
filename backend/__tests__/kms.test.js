/**
 * Integration Tests for KMS Routes
 * Tests: encrypt, decrypt, key generation, key rotation, health check
 */

const request = require("supertest");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.development" });

describe("KMS Routes", () => {
  let app;
  let server;
  let adminToken;

  beforeAll(() => {
    app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Import routes
    const authRoutes = require("../src/routes/authRoutes");
    const kmsRoutes = require("../src/routes/kmsRoutes");
    const { errorHandler } = require("../src/middleware/error-handler");

    app.use("/auth", authRoutes);
    app.use("/kms", kmsRoutes);
    app.use(errorHandler);

    server = app.listen(3004);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(async () => {
    // Create admin user
    try {
      await request(app).post("/auth/register").send({
        email: "kmsadmin@example.com",
        password: "AdminPassword123!",
        role: "admin",
      });
    } catch (error) {
      // User might already exist
    }

    // Login as admin
    const loginResponse = await request(app).post("/auth/login").send({
      email: "kmsadmin@example.com",
      password: "AdminPassword123!",
    });
    adminToken = loginResponse.body.accessToken;
  });

  describe("GET /kms/health", () => {
    it("should return KMS health status", async () => {
      const response = await request(app)
        .get("/kms/health")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("status");
      expect(["operational", "degraded", "unavailable"]).toContain(
        response.body.status,
      );
    });

    it("should include provider information", async () => {
      const response = await request(app)
        .get("/kms/health")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("provider");
    });
  });

  describe("POST /kms/encrypt", () => {
    it("should encrypt plaintext data", async () => {
      const response = await request(app)
        .post("/kms/encrypt")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          plaintext: "sensitive data to encrypt",
          keyId: "default-key",
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("encryptedData");
      expect(response.body).toHaveProperty("iv");
      expect(response.body).toHaveProperty("authTag");
    });

    it("should handle large data", async () => {
      const largeData = "x".repeat(10000);

      const response = await request(app)
        .post("/kms/encrypt")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          plaintext: largeData,
          keyId: "default-key",
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("encryptedData");
    });

    it("should reject encryption without plaintext", async () => {
      const response = await request(app)
        .post("/kms/encrypt")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          keyId: "default-key",
        });

      expect([400, 422]).toContain(response.status);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject unauthenticated encryption", async () => {
      const response = await request(app).post("/kms/encrypt").send({
        plaintext: "data",
        keyId: "default-key",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /kms/decrypt", () => {
    it("should decrypt encrypted data", async () => {
      // First encrypt data
      const encryptResponse = await request(app)
        .post("/kms/encrypt")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          plaintext: "data to decrypt",
          keyId: "default-key",
        });

      const encrypted = encryptResponse.body;

      // Then decrypt
      const response = await request(app)
        .post("/kms/decrypt")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          encryptedData: encrypted.encryptedData,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          keyId: "default-key",
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("plaintext");
      expect(response.body.plaintext).toBe("data to decrypt");
    });

    it("should reject decryption with invalid auth tag", async () => {
      const response = await request(app)
        .post("/kms/decrypt")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          encryptedData: "invalid-data",
          iv: "invalid-iv",
          authTag: "invalid-tag",
          keyId: "default-key",
        });

      expect([400, 401]).toContain(response.status);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject decryption without required fields", async () => {
      const response = await request(app)
        .post("/kms/decrypt")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          encryptedData: "data",
          // Missing iv and authTag
          keyId: "default-key",
        });

      expect([400, 422]).toContain(response.status);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /kms/generate-data-key", () => {
    it("should generate a new data key", async () => {
      const response = await request(app)
        .post("/kms/generate-data-key")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          keyId: "default-key",
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("dataKey");
      expect(response.body).toHaveProperty("encryptedDataKey");
    });

    it("should generate unique keys on each call", async () => {
      const response1 = await request(app)
        .post("/kms/generate-data-key")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          keyId: "default-key",
        });

      const response2 = await request(app)
        .post("/kms/generate-data-key")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          keyId: "default-key",
        });

      expect([200, 201]).toContain(response1.status);
      expect([200, 201]).toContain(response2.status);
      expect(response1.body.dataKey).not.toBe(response2.body.dataKey);
    });

    it("should reject unauthenticated key generation", async () => {
      const response = await request(app).post("/kms/generate-data-key").send({
        keyId: "default-key",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /kms/keys", () => {
    it("should list all KMS keys", async () => {
      const response = await request(app)
        .get("/kms/keys")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("keys");
      expect(Array.isArray(response.body.keys)).toBe(true);
    });

    it("should include key metadata", async () => {
      const response = await request(app)
        .get("/kms/keys")
        .set("Authorization", `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      if (response.body.keys.length > 0) {
        expect(response.body.keys[0]).toHaveProperty("keyId");
        expect(response.body.keys[0]).toHaveProperty("createdAt");
      }
    });

    it("should reject unauthenticated access", async () => {
      const response = await request(app).get("/kms/keys");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /kms/keys/rotate", () => {
    it("should rotate encryption keys", async () => {
      const response = await request(app)
        .post("/kms/keys/rotate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          keyId: "default-key",
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("rotated");
    });

    it("should reject key rotation without authentication", async () => {
      const response = await request(app).post("/kms/keys/rotate").send({
        keyId: "default-key",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /kms/verify-key", () => {
    it("should verify key integrity", async () => {
      const response = await request(app)
        .post("/kms/verify-key")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          keyId: "default-key",
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("isValid");
      expect(typeof response.body.isValid).toBe("boolean");
    });

    it("should reject key verification without authentication", async () => {
      const response = await request(app).post("/kms/verify-key").send({
        keyId: "default-key",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });
});
