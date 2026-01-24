/**
 * Backend Environment Configuration
 * Loads and validates all backend environment variables
 */

require("dotenv").config();
const EnvironmentValidator = require("./env-validator");

const validator = new EnvironmentValidator("Backend");

// Server Configuration
const PORT = validator.require("PORT", 3000, { type: "number" });

const NODE_ENV = validator.require("NODE_ENV", "development", {
  enum: ["development", "staging", "production"],
});

const API_VERSION = validator.optional("API_VERSION", "v1");

// Database Configuration
const DB_HOST = validator.require("DB_HOST", "localhost", { minLength: 1 });

const DB_PORT = validator.optional("DB_PORT", 27017, { type: "number" });

const DB_NAME = validator.require("DB_NAME", "secure_encryption_db", {
  minLength: 1,
});

const DB_USER = validator.optional("DB_USER", null);

const DB_PASSWORD = validator.optional("DB_PASSWORD", null);

// JWT Configuration
const JWT_SECRET = validator.require("JWT_SECRET", null, { minLength: 32 });

const JWT_EXPIRATION = validator.optional("JWT_EXPIRATION", "24h");

// Encryption Configuration
const ENCRYPTION_ALGORITHM = validator.optional(
  "ENCRYPTION_ALGORITHM",
  "aes-256-gcm",
  { enum: ["aes-256-gcm", "aes-256-cbc"] },
);

const PBKDF2_ITERATIONS = validator.optional("PBKDF2_ITERATIONS", 100000, {
  type: "number",
});

// KMS Configuration (optional for production)
const KMS_PROVIDER = validator.optional("KMS_PROVIDER", null, {
  enum: ["aws", "gcp", "azure", null],
});

const KMS_KEY_ID = validator.optional("KMS_KEY_ID", null);

// API Keys Configuration
const SFTP_HOST = validator.optional("SFTP_HOST", null);

const SFTP_PORT = validator.optional("SFTP_PORT", 22, { type: "number" });

const SFTP_USER = validator.optional("SFTP_USER", null);

// Logging Configuration
const LOG_LEVEL = validator.optional("LOG_LEVEL", "info", {
  enum: ["error", "warn", "info", "debug", "trace"],
});

const LOG_FORMAT = validator.optional("LOG_FORMAT", "json", {
  enum: ["json", "simple", "pretty"],
});

// CORS Configuration
const CORS_ORIGIN = validator.optional("CORS_ORIGIN", "http://localhost:3001");

// Validate all configuration
validator.validate(NODE_ENV === "production");

// Export configuration object
module.exports = {
  // Server
  port: PORT,
  nodeEnv: NODE_ENV,
  apiVersion: API_VERSION,

  // Database
  database: {
    host: DB_HOST,
    port: DB_PORT,
    name: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    url: `mongodb://${DB_USER ? `${DB_USER}:${DB_PASSWORD}@` : ""}${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  },

  // JWT
  jwt: {
    secret: JWT_SECRET,
    expiresIn: JWT_EXPIRATION,
  },

  // Encryption
  encryption: {
    algorithm: ENCRYPTION_ALGORITHM,
    pbkdf2Iterations: PBKDF2_ITERATIONS,
  },

  // KMS
  kms: {
    provider: KMS_PROVIDER,
    keyId: KMS_KEY_ID,
  },

  // SFTP
  sftp: {
    host: SFTP_HOST,
    port: SFTP_PORT,
    user: SFTP_USER,
  },

  // Logging
  logging: {
    level: LOG_LEVEL,
    format: LOG_FORMAT,
  },

  // CORS
  cors: {
    origin: CORS_ORIGIN,
  },

  // Utility
  isDevelopment: NODE_ENV === "development",
  isProduction: NODE_ENV === "production",
  isStaging: NODE_ENV === "staging",
};
