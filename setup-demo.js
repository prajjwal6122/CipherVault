#!/usr/bin/env node
/**
 * Quick Setup - Initialize Demo Users via API
 * Since MongoDB might not be running, this script will register users via the API
 */

const http = require("http");

const API_URL = "http://localhost:3000/api/v1";

async function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_URL}${endpoint}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers["Content-Length"] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(responseData),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function setupDemo() {
  console.log("🚀 Setting up demo users...\n");

  const users = [
    {
      email: "admin@example.com",
      password: "password123",
      role: "admin",
      firstName: "Admin",
      lastName: "User",
    },
    {
      email: "analyst@example.com",
      password: "password123",
      role: "analyst",
      firstName: "John",
      lastName: "Analyst",
    },
    {
      email: "viewer@example.com",
      password: "password123",
      role: "viewer",
      firstName: "Jane",
      lastName: "Viewer",
    },
  ];

  for (const user of users) {
    try {
      console.log(`Registering ${user.email}...`);
      const response = await makeRequest("POST", "/auth/register", user);

      if (response.status === 201) {
        console.log(`✅ ${user.email} created successfully\n`);
      } else if (response.status === 409) {
        console.log(`⚠️  ${user.email} already exists\n`);
      } else {
        console.log(`❌ Failed to create ${user.email}: ${response.status}`);
        console.log(JSON.stringify(response.data, null, 2));
        console.log("");
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }

  console.log("✅ Setup complete!\n");
  console.log("Demo credentials:");
  console.log("  admin@example.com / password123 (role: admin)");
  console.log("  analyst@example.com / password123 (role: analyst)");
  console.log("  viewer@example.com / password123 (role: viewer)");
}

// Wait for backend to be ready
setTimeout(() => {
  setupDemo().catch(console.error);
}, 2000);
