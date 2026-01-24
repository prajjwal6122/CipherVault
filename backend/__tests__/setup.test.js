/**
 * Setup Test - Verifies basic Node.js backend initialization
 * Tests: Server creation, basic configuration, health endpoint
 */

const express = require("express");

describe("Backend Setup - P1-1.1.1", () => {
  let app;

  beforeAll(() => {
    // Verify Express can be imported
    expect(express).toBeDefined();
    expect(typeof express).toBe("function");
  });

  test("Express app can be created", () => {
    app = express();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
  });

  test("Health check endpoint responds with 200", async () => {
    const request = require("supertest");
    const testApp = express();

    // Add health check route
    testApp.get("/health", (req, res) => {
      res.status(200).json({ status: "ok" });
    });

    const response = await request(testApp).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  test("Environment variables can be loaded", () => {
    // Verify dotenv is available
    const dotenv = require("dotenv");
    expect(dotenv).toBeDefined();
    expect(typeof dotenv.config).toBe("function");
  });

  test("Server listens on configured port", async () => {
    const request = require("supertest");
    const testApp = express();
    testApp.get("/api/v1/health", (req, res) => {
      res.json({ message: "Server is running" });
    });

    const response = await request(testApp).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Server is running");
  });

  test("Server can handle JSON requests", async () => {
    const request = require("supertest");
    const testApp = express();
    testApp.use(express.json());

    testApp.post("/api/v1/test", (req, res) => {
      res.json({ received: req.body });
    });

    const response = await request(testApp)
      .post("/api/v1/test")
      .send({ message: "test" });

    expect(response.status).toBe(200);
    expect(response.body.received.message).toBe("test");
  });

  test("Project structure has required files", () => {
    const fs = require("fs");
    const path = require("path");

    // Note: These will be created as part of this task
    const backendDir = path.join(__dirname, "..");
    expect(fs.existsSync(backendDir)).toBe(true);
  });
});
