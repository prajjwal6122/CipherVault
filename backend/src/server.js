/**
 * Backend Server Entry Point
 * Secure Client-Side Encryption & Controlled Data Reveal Platform
 *
 * Main Express.js server configuration and initialization
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config();

// ============================================
// MongoDB Connection
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/secure_encryption_db";

mongoose.connect(MONGODB_URI)
  .then(() => {})
  .catch((err) => {});

mongoose.connection.on("error", (err) => {
  // MongoDB error handler
});

mongoose.connection.on("disconnected", () => {
  // MongoDB disconnected
});

const app = express();

// ============================================
// Middleware Configuration
// ============================================

// Security middleware
app.use(helmet());

// CORS Configuration
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL;
const allowedOrigins = allowedOriginsEnv
  ? allowedOriginsEnv.split(",").map((o) => o.trim()).filter(Boolean)
  : ["https://cipher-zk57.onrender.com", "http://localhost:3001"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser middleware for JSON and URL-encoded requests
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting for login/auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many login attempts, please try again later",
});

// Request logging middleware
app.use((req, res, next) => {
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

/**
 * Root API endpoint
 * GET /
 */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Secure Encryption API Server",
    version: "1.0.0",
    status: "running",
    endpoints: "/api/v1",
    health: "/health",
  });
});

// ============================================
// Route Mounting
// ============================================

// Import route handlers
const authRoutes = require("./routes/authRoutes");
const recordRoutes = require("./routes/recordRoutes");
const auditRoutes = require("./routes/auditRoutes");
const kmsRoutes = require("./routes/kmsRoutes");
const sftpRoutes = require("./routes/sftpRoutes");
const cliRoutes = require("./routes/cliRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

// Mount routes
// Auth routes (with rate limiting on login)
app.use("/api/v1/auth", authRoutes);

// Record routes (CRUD operations)
app.use("/api/v1/records", recordRoutes);

// Audit routes (read-only)
app.use("/api/v1/audit-logs", auditRoutes);

// KMS routes (key management)
app.use("/api/v1/kms", kmsRoutes);

// Phase 4.6 Routes
// SFTP integration
app.use("/api/v1/sftp", sftpRoutes);

// CLI tool
app.use("/api/v1/cli", cliRoutes);

// Analytics
app.use("/api/v1/analytics", analyticsRoutes);

// ============================================
// Placeholder Routes (API overview)
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
      auditLogs: "/api/v1/audit-logs",
      kms: "/api/v1/kms",
      sftp: "/api/v1/sftp",
      cli: "/api/v1/cli",
      analytics: "/api/v1/analytics",
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
    // Server started
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    server.close(() => {
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

module.exports = app;
