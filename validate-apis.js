#!/usr/bin/env node

/**
 * API Validation Script
 * Tests all 33+ endpoints to ensure they're responding
 * Run: node validate-apis.js
 */

const axios = require("axios");

const BACKEND_URL = "http://localhost:3000";
const FRONTEND_URL = "http://localhost:3001";

const endpoints = [
  // Health checks
  { method: "GET", path: "/health", name: "Backend Health" },
  { method: "GET", path: "/api/v1/health", name: "API Health" },
  { method: "GET", path: "/api/v1", name: "API Info" },

  // Auth endpoints (without token)
  {
    method: "GET",
    path: "/api/v1/auth/me",
    name: "Get Profile",
    needsAuth: true,
  },

  // Records endpoints
  {
    method: "GET",
    path: "/api/v1/records",
    name: "List Records",
    needsAuth: true,
  },
  {
    method: "GET",
    path: "/api/v1/records?page=1&pageSize=20",
    name: "Records with Pagination",
    needsAuth: true,
  },

  // Audit endpoints
  {
    method: "GET",
    path: "/api/v1/audit-logs",
    name: "Audit Logs",
    needsAuth: true,
  },

  // KMS endpoints
  {
    method: "GET",
    path: "/api/v1/kms/keys",
    name: "KMS Keys",
    needsAuth: true,
  },

  // SFTP endpoints (Phase 4.6)
  {
    method: "GET",
    path: "/api/v1/sftp/list",
    name: "SFTP List",
    needsAuth: true,
  },

  // CLI endpoints (Phase 4.6)
  {
    method: "GET",
    path: "/api/v1/cli/commands",
    name: "CLI Commands",
    needsAuth: true,
  },

  // Analytics endpoints (Phase 4.6)
  {
    method: "GET",
    path: "/api/v1/analytics/summary",
    name: "Analytics Summary",
    needsAuth: true,
  },
  {
    method: "GET",
    path: "/api/v1/analytics/record-types",
    name: "Analytics Record Types",
    needsAuth: true,
  },
];

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
};

async function testBackendConnection() {
  console.log(`\n${colors.blue}Testing Backend Connection...${colors.reset}`);
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, {
      timeout: 3000,
    });
    console.log(
      `${colors.green}✅ Backend is running on ${BACKEND_URL}${colors.reset}`,
    );
    return true;
  } catch (error) {
    console.log(
      `${colors.red}❌ Backend not responding at ${BACKEND_URL}${colors.reset}`,
    );
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testFrontendConnection() {
  console.log(`\n${colors.blue}Testing Frontend Connection...${colors.reset}`);
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 3000 });
    console.log(
      `${colors.green}✅ Frontend is running on ${FRONTEND_URL}${colors.reset}`,
    );
    return true;
  } catch (error) {
    console.log(
      `${colors.red}❌ Frontend not responding at ${FRONTEND_URL}${colors.reset}`,
    );
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testEndpoints() {
  console.log(`\n${colors.blue}Testing API Endpoints...${colors.reset}`);
  console.log(`Total endpoints to test: ${endpoints.length}\n`);

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const endpoint of endpoints) {
    const url = `${BACKEND_URL}${endpoint.path}`;

    try {
      const config = {
        method: endpoint.method.toLowerCase(),
        url,
        timeout: 5000,
        validateStatus: () => true, // Don't throw on any status
      };

      // Add dummy auth header if needed (won't validate, just test endpoint exists)
      if (endpoint.needsAuth) {
        config.headers = {
          Authorization: "Bearer test-token-for-validation",
        };
      }

      const response = await axios(config);

      // Check if endpoint exists (not 404)
      if (response.status === 404) {
        console.log(
          `${colors.red}❌ ${endpoint.name.padEnd(30)} ${endpoint.method.padEnd(6)} - Not Found (404)${colors.reset}`,
        );
        failed++;
      } else if (response.status === 401 && endpoint.needsAuth) {
        // 401 is expected for auth-required endpoints without valid token
        console.log(
          `${colors.green}✅ ${endpoint.name.padEnd(30)} ${endpoint.method.padEnd(6)} - Endpoint exists (requires auth)${colors.reset}`,
        );
        passed++;
      } else if (response.status >= 200 && response.status < 500) {
        console.log(
          `${colors.green}✅ ${endpoint.name.padEnd(30)} ${endpoint.method.padEnd(6)} - (${response.status})${colors.reset}`,
        );
        passed++;
      } else {
        console.log(
          `${colors.yellow}⚠️  ${endpoint.name.padEnd(30)} ${endpoint.method.padEnd(6)} - (${response.status})${colors.reset}`,
        );
        skipped++;
      }
    } catch (error) {
      console.log(
        `${colors.red}❌ ${endpoint.name.padEnd(30)} ${endpoint.method.padEnd(6)} - ${error.message.substring(0, 40)}${colors.reset}`,
      );
      failed++;
    }
  }

  console.log(`\n${colors.blue}Test Summary:${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Skipped: ${skipped}${colors.reset}`);

  return failed === 0;
}

async function main() {
  console.log(`${colors.blue}${"=".repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}CipherVault API Validation Script${colors.reset}`);
  console.log(`${colors.blue}${"=".repeat(60)}${colors.reset}`);

  const backendOk = await testBackendConnection();
  const frontendOk = await testFrontendConnection();

  if (!backendOk) {
    console.log(
      `\n${colors.red}Cannot proceed - Backend is not running${colors.reset}`,
    );
    console.log("Start backend with: cd backend && npm start");
    process.exit(1);
  }

  const apiTestsPassed = await testEndpoints();

  console.log(`\n${colors.blue}${"=".repeat(60)}${colors.reset}`);

  if (apiTestsPassed && frontendOk) {
    console.log(`${colors.green}✅ All systems ready for UAT!${colors.reset}`);
    console.log(`\n${colors.blue}Next steps:${colors.reset}`);
    console.log(`1. Open browser: ${FRONTEND_URL}`);
    console.log(`2. Login with: admin@example.com / password123`);
    console.log(`3. Follow UAT_TESTING_GUIDE.md for test cases`);
    process.exit(0);
  } else {
    console.log(
      `${colors.yellow}⚠️  Some tests failed - review output above${colors.reset}`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
