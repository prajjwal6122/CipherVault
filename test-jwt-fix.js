#!/usr/bin/env node
/**
 * Quick test of JWT fix
 * Tests login endpoint to verify JWT generation works
 */

const http = require("http");

async function testLogin() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: "admin@example.com",
      password: "password123",
    });

    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = http.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const result = JSON.parse(responseData);
          console.log("\n✅ Response Status:", res.statusCode);

          if (res.statusCode === 200) {
            console.log("✅ Login Successful!");
            console.log("✅ User:", result.data.user.email);
            console.log("✅ Token received:", result.data.token ? "YES" : "NO");
            console.log(
              "✅ Refresh token received:",
              result.data.refreshToken ? "YES" : "NO",
            );
            resolve(true);
          } else {
            console.log("❌ Login Failed");
            console.log("Error:", result.error?.message || result.message);
            resolve(false);
          }
        } catch (e) {
          console.log("❌ Invalid response:", responseData);
          resolve(false);
        }
      });
    });

    req.on("error", (err) => {
      console.error("❌ Request Error:", err.message);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

async function run() {
  console.log("🔍 Testing JWT Fix...");
  console.log("Attempting login with admin@example.com / password123\n");

  try {
    const success = await testLogin();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

run();
