/**
 * Backend Server Entry Point
 * Secure Client-Side Encryption & Controlled Data Reveal Platform
 *
 * Main Express.js server configuration and initialization
 */

const express = require("express");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();

// ============================================
// Middleware Configuration
// ============================================

// Body parser middleware for JSON and URL-encoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// Health Check Endpoints
// ============================================

/**
 * Health check endpoint for monitoring
 * GET /health
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * API health check endpoint
 * GET /api/v1/health
 */
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    message: "Server is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// Placeholder Routes (will be implemented in subsequent phases)
// ============================================

/**
 * Root API endpoint
 */
app.get("/api/v1", (req, res) => {
  res.json({
    name: "Secure Encryption & Data Reveal Platform API",
    version: "1.0.0",
    endpoints: {
      health: "/api/v1/health",
      auth: "/api/v1/auth",
      records: "/api/v1/records",
      audit: "/api/v1/audit",
    },
  });
});

// ============================================
// Error Handling Middleware
// ============================================

/**
 * 404 Not Found handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// Server Startup
// ============================================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Only start server if this module is run directly (not imported for testing)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`
  ════════════════════════════════════════════════════════
  🔐 Secure Encryption Backend Server
  ════════════════════════════════════════════════════════
  Environment: ${NODE_ENV}
  Port: ${PORT}
  Timestamp: ${new Date().toISOString()}
  ════════════════════════════════════════════════════════
  `);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully...");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
}

module.exports = app;
