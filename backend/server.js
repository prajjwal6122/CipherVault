// Backend: Main Express Server Setup
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const DatabaseService = require("./src/database/database-service");
const KeyManagementService = require("./src/crypto/key-management-service");
const swaggerSpec = require("./src/swagger/api-specs");

// Import route handlers
const authRoutes = require("./src/routes/authRoutes");
const recordRoutes = require("./src/routes/recordRoutes");
const auditRoutes = require("./src/routes/auditRoutes");
const kmsRoutes = require("./src/routes/kmsRoutes");

// Import middleware
const {
  errorHandler,
  notFoundHandler,
} = require("./src/middleware/error-handler");

dotenv.config();

const app = express();
// Render sets PORT dynamically; fall back to BACKEND_PORT or 3000 locally
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3000;

// ==================== Security Middleware ====================
app.use(helmet()); // XSS, CSP, CORS headers

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later",
});
app.use(limiter);

// CORS Configuration
const allowedOriginsEnv =
  process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL;
const allowedOrigins = allowedOriginsEnv
  ? allowedOriginsEnv
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
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
  }),
);

// Body Parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ==================== Global Variables ====================
let database;
let keyManagementService;

// ==================== Initialization ====================
async function initializeApp() {
  try {
    // Database Connection
    database = new DatabaseService({
      mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/secure_encryption_db",
      dbName: process.env.DB_NAME || "secure_data_db",
    });

    try {
      await database.connectWithRetry(2, 3000);

      // Initialize Collections & Indexes
      await database.initializeCollections();

      // Seed initial data
      await database.seedInitialData();
    } catch (dbError) {
      // Database unavailable, running in development mode
    }

    // KMS Setup
    keyManagementService = new KeyManagementService({
      primaryProvider: process.env.PRIMARY_KMS_PROVIDER || "aws",
      fallbackProvider: process.env.FALLBACK_KMS_PROVIDER || "gcp",
    });
    try {
      await keyManagementService.storeCredentials("aws", {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dev",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dev",
        region: process.env.AWS_REGION || "us-east-1",
      });

      await keyManagementService.storeCredentials("gcp", {
        projectId: process.env.GCP_PROJECT_ID || "dev",
        keyRing: process.env.GCP_KMS_KEY_RING || "dev",
        keyName: process.env.GCP_KMS_KEY_NAME || "dev",
      });
    } catch (kmsError) {
      // KMS unavailable, using mock implementation
    }
  } catch (err) {
    process.exit(1);
  }
}

// ==================== Logging ====================
app.use(morgan("combined"));

// ==================== API Documentation ====================
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==================== Route Registration ====================
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/records", recordRoutes);
app.use("/api/v1/audit-logs", auditRoutes);
app.use("/api/v1/kms", kmsRoutes);

// ==================== Health Check ====================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: database?.isConnected ? "connected" : "disconnected",
    uptime: process.uptime(),
  });
});

// ==================== 404 Handler ====================
app.use(notFoundHandler);

// ==================== Error Handling ====================
app.use(errorHandler);

// ==================== Start Server ====================
initializeApp().then(() => {
  // Bind to all interfaces (required for Render/Vercel/containers)
  app.listen(PORT, "0.0.0.0", () => {
    // Server started
  });
});

module.exports = app;
