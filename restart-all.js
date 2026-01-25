#!/usr/bin/env node
/**
 * Fresh Start Script - Kills all processes and restarts backend
 */

const { spawn } = require("child_process");
const path = require("path");

console.log("🔄 Starting fresh restart sequence...\n");

// Kill all node processes
const killCmd =
  process.platform === "win32"
    ? "taskkill /F /IM node.exe /T"
    : "pkill -9 node";

console.log("1️⃣  Killing existing Node processes...");
require("child_process")
  .execSync(killCmd, { stdio: "inherit" })
  .catch(() => {});

// Wait 3 seconds
setTimeout(() => {
  console.log("\n2️⃣  Starting MongoDB...");
  const mongoProc = spawn("mongod", ["--dbpath", "C:\\data\\db"], {
    stdio: "inherit",
    detached: true,
  });
  mongoProc.unref();

  // Wait 2 seconds for MongoDB to start
  setTimeout(() => {
    console.log("\n3️⃣  Starting Backend...");
    const backendProc = spawn("node", ["server.js"], {
      cwd: path.join(__dirname, "backend"),
      stdio: "inherit",
      detached: true,
    });
    backendProc.unref();

    setTimeout(() => {
      console.log("\n4️⃣  Starting Frontend...");
      const frontendProc = spawn("npm", ["run", "dev"], {
        cwd: path.join(__dirname, "frontend"),
        stdio: "inherit",
        detached: true,
      });
      frontendProc.unref();

      console.log("\n✅ All services should be starting...");
      console.log("   Backend: http://localhost:3000");
      console.log("   Frontend: http://localhost:3001 or 3002");
      console.log("   MongoDB: localhost:27017\n");
    }, 2000);
  }, 2000);
}, 1000);
