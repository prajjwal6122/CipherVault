/**
 * Integration Tests for Authentication Routes
 * Tests: /auth/login, /auth/register, /auth/refresh, /auth/logout, /auth/me
 */

const request = require("supertest");
const express = require("express");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: ".env.development" });

describe("Authentication Routes", () => {
  let app;
  let server;
  let authToken;
  let refreshToken;

  beforeAll(() => {
    // Create a test Express app with routes
    app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Import and use routes
    const authRoutes = require("../src/routes/authRoutes");
    const { errorHandler } = require("../src/middleware/error-handler");

    app.use("/auth", authRoutes);
    app.use(errorHandler);

    server = app.listen(3001);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe("POST /auth/register", () => {
    it("should register a new user with valid credentials", async () => {
      const response = await request(app).post("/auth/register").send({
        email: "testuser@example.com",
        password: "TestPassword123!",
        role: "analyst",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("registered successfully");
    });

    it("should reject invalid email", async () => {
      const response = await request(app).post("/auth/register").send({
        email: "invalidemail",
        password: "TestPassword123!",
        role: "analyst",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject weak password", async () => {
      const response = await request(app).post("/auth/register").send({
        email: "newuser@example.com",
        password: "123",
        role: "analyst",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject missing email", async () => {
      const response = await request(app).post("/auth/register").send({
        password: "TestPassword123!",
        role: "analyst",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/login", () => {
    it("should login user with valid credentials", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "testuser@example.com",
        password: "TestPassword123!",
      });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");

      // Store tokens for subsequent tests
      authToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it("should reject login with invalid email", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "nonexistent@example.com",
        password: "TestPassword123!",
      });

      expect([401, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with wrong password", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "testuser@example.com",
        password: "WrongPassword123!",
      });

      expect([401, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with missing credentials", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "testuser@example.com",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      // First login to get tokens
      const loginResponse = await request(app).post("/auth/login").send({
        email: "testuser@example.com",
        password: "TestPassword123!",
      });

      const refreshToken = loginResponse.body.refreshToken;

      const response = await request(app).post("/auth/refresh").send({
        refreshToken: refreshToken,
      });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("accessToken");
    });

    it("should reject invalid refresh token", async () => {
      const response = await request(app).post("/auth/refresh").send({
        refreshToken: "invalid.token.here",
      });

      expect([401, 400]).toContain(response.status);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject missing refresh token", async () => {
      const response = await request(app).post("/auth/refresh").send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /auth/me", () => {
    it("should return current user profile with valid token", async () => {
      // Login first to get valid token
      const loginResponse = await request(app).post("/auth/login").send({
        email: "testuser@example.com",
        password: "TestPassword123!",
      });

      const token = loginResponse.body.accessToken;

      const response = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("email");
      expect(response.body.user.email).toBe("testuser@example.com");
    });

    it("should reject request without authorization header", async () => {
      const response = await request(app).get("/auth/me");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject request with invalid token", async () => {
      const response = await request(app)
        .get("/auth/me")
        .set("Authorization", "Bearer invalid.token.here");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/logout", () => {
    it("should logout user with valid token", async () => {
      // Login first
      const loginResponse = await request(app).post("/auth/login").send({
        email: "testuser@example.com",
        password: "TestPassword123!",
      });

      const token = loginResponse.body.accessToken;

      const response = await request(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${token}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("logged out");
    });

    it("should reject logout without authorization", async () => {
      const response = await request(app).post("/auth/logout");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });
});
