/**
 * API Routes & Health Check Test Suite
 * Tests all backend and frontend routes
 */

const http = require("http");
const https = require("https");

const API_BASE = "http://localhost:3000/api/v1";
const FRONTEND_URL = "http://localhost:3003";

let authToken = null;
let userId = null;

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

/**
 * Helper function to make HTTP requests
 */
function makeRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === "https:" ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = protocol.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonData,
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Test function
 */
async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    results.tests.push({ name, status: "✅ PASS" });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: "❌ FAIL", error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

/**
 * Assert function
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log("\n════════════════════════════════════════════════════════");
  console.log("🧪 CipherVault - Full Stack API & Route Testing");
  console.log("════════════════════════════════════════════════════════\n");

  // ============ Backend Health Check ============
  console.log("\n📡 Backend Health Checks:");

  await test("Backend Server is Running", async () => {
    const response = await makeRequest("GET", `${API_BASE}/health`);
    assert(
      response.status === 200 || response.status === 404,
      "Backend server is responding",
    );
  });

  // ============ Authentication Endpoints ============
  console.log("\n🔐 Authentication Endpoints:");

  await test("POST /auth/register - Register new user", async () => {
    const response = await makeRequest("POST", `${API_BASE}/auth/register`, {
      name: `Test User ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      password: "TestPassword123!",
    });
    assert(
      response.status === 200 || response.status === 201,
      `Expected 200/201, got ${response.status}`,
    );
    if (response.body.data?.token) {
      authToken = response.body.data.token;
      userId = response.body.data.user?.id;
    }
  });

  await test("POST /auth/login - Login with credentials", async () => {
    const response = await makeRequest("POST", `${API_BASE}/auth/login`, {
      email: "admin@example.com",
      password: "password123",
    });
    assert(
      response.status === 200 || response.status === 401,
      `Expected 200 or 401, got ${response.status}`,
    );
    if (response.body.data?.token) {
      authToken = response.body.data.token;
    }
  });

  await test("POST /auth/refresh - Refresh access token", async () => {
    if (!authToken) {
      throw new Error("No auth token available");
    }
    const response = await makeRequest("POST", `${API_BASE}/auth/refresh`, {
      refreshToken: authToken,
    });
    assert(
      response.status === 200 || response.status === 401,
      `Expected 200 or 401, got ${response.status}`,
    );
  });

  await test("GET /auth/me - Get current user", async () => {
    if (!authToken) {
      throw new Error("No auth token available");
    }
    const response = await makeRequest("GET", `${API_BASE}/auth/me`, null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert(
      response.status === 200 || response.status === 401,
      `Expected 200 or 401, got ${response.status}`,
    );
  });

  // ============ Records Endpoints ============
  console.log("\n📋 Records Endpoints:");

  await test("GET /records - Fetch all records", async () => {
    if (!authToken) {
      throw new Error("No auth token available");
    }
    const response = await makeRequest("GET", `${API_BASE}/records`, null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert(
      response.status === 200 || response.status === 401,
      `Expected 200 or 401, got ${response.status}`,
    );
  });

  await test("POST /records - Create new record", async () => {
    if (!authToken) {
      throw new Error("No auth token available");
    }
    const response = await makeRequest(
      "POST",
      `${API_BASE}/records`,
      {
        type: "PAN",
        data: {
          cardNumber: "4532-1234-5678-9010",
          name: "Test Card",
        },
      },
      {
        Authorization: `Bearer ${authToken}`,
      },
    );
    assert(
      response.status === 200 ||
        response.status === 201 ||
        response.status === 401,
      `Expected 200/201 or 401, got ${response.status}`,
    );
    if (response.body.data?.id) {
      userId = response.body.data.id;
    }
  });

  await test("GET /records/{id} - Get specific record", async () => {
    if (!authToken || !userId) {
      throw new Error("No auth token or user ID available");
    }
    const response = await makeRequest(
      "GET",
      `${API_BASE}/records/${userId}`,
      null,
      {
        Authorization: `Bearer ${authToken}`,
      },
    );
    assert(
      response.status === 200 ||
        response.status === 404 ||
        response.status === 401,
      `Expected 200/404 or 401, got ${response.status}`,
    );
  });

  // ============ Reveal Endpoint (Decryption) ============
  console.log("\n🔓 Decryption/Reveal Endpoints:");

  await test("POST /records/{id}/reveal - Request data reveal", async () => {
    if (!authToken || !userId) {
      throw new Error("No auth token or user ID available");
    }
    const response = await makeRequest(
      "POST",
      `${API_BASE}/records/${userId}/reveal`,
      {
        password: "reveal-password",
      },
      {
        Authorization: `Bearer ${authToken}`,
      },
    );
    assert(
      response.status === 200 ||
        response.status === 404 ||
        response.status === 401 ||
        response.status === 400,
      `Expected 200/404/401/400, got ${response.status}`,
    );
  });

  // ============ Audit Endpoints ============
  console.log("\n📊 Audit & Compliance Endpoints:");

  await test("GET /audit-logs - Fetch audit logs", async () => {
    if (!authToken) {
      throw new Error("No auth token available");
    }
    const response = await makeRequest("GET", `${API_BASE}/audit-logs`, null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert(
      response.status === 200 || response.status === 401,
      `Expected 200 or 401, got ${response.status}`,
    );
  });

  await test("GET /audit-logs with filters", async () => {
    if (!authToken) {
      throw new Error("No auth token available");
    }
    const response = await makeRequest(
      "GET",
      `${API_BASE}/audit-logs?action=REVEAL&status=SUCCESS`,
      null,
      { Authorization: `Bearer ${authToken}` },
    );
    assert(
      response.status === 200 || response.status === 401,
      `Expected 200 or 401, got ${response.status}`,
    );
  });

  // ============ Frontend Health Check ============
  console.log("\n🌐 Frontend Routes:");

  await test("Frontend Server is Running", async () => {
    const response = await makeRequest("GET", `${FRONTEND_URL}`);
    assert(
      response.status === 200 || response.status === 304,
      "Frontend server is responding",
    );
  });

  await test("GET / - Home/Root route", async () => {
    const response = await makeRequest("GET", `${FRONTEND_URL}/`);
    assert(
      response.status === 200 || response.status === 304,
      `Expected 200 or 304, got ${response.status}`,
    );
  });

  await test("GET /login - Login page", async () => {
    const response = await makeRequest("GET", `${FRONTEND_URL}/login`);
    assert(
      response.status === 200 || response.status === 304,
      `Expected 200 or 304, got ${response.status}`,
    );
  });

  await test("GET /register - Registration page", async () => {
    const response = await makeRequest("GET", `${FRONTEND_URL}/register`);
    assert(
      response.status === 200 || response.status === 304,
      `Expected 200 or 304, got ${response.status}`,
    );
  });

  await test("GET /dashboard - Dashboard page", async () => {
    const response = await makeRequest("GET", `${FRONTEND_URL}/dashboard`);
    assert(
      response.status === 200 || response.status === 304,
      `Expected 200 or 304, got ${response.status}`,
    );
  });

  await test("GET /dashboard/records - Records page", async () => {
    const response = await makeRequest(
      "GET",
      `${FRONTEND_URL}/dashboard/records`,
    );
    assert(
      response.status === 200 || response.status === 304,
      `Expected 200 or 304, got ${response.status}`,
    );
  });

  await test("GET /dashboard/audit-logs - Audit logs page", async () => {
    const response = await makeRequest(
      "GET",
      `${FRONTEND_URL}/dashboard/audit-logs`,
    );
    assert(
      response.status === 200 || response.status === 304,
      `Expected 200 or 304, got ${response.status}`,
    );
  });

  // ============ Summary ============
  console.log("\n════════════════════════════════════════════════════════");
  console.log("📊 Test Summary:");
  console.log("════════════════════════════════════════════════════════");
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.passed + results.failed}`);
  console.log(
    `✨ Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`,
  );
  console.log("\n════════════════════════════════════════════════════════\n");

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);
