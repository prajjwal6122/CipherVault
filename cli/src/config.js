/**
 * CLI Environment Configuration
 * Loads and validates all CLI environment variables
 */

require("dotenv").config();
const EnvironmentValidator = require("../src/env-validator");

const validator = new EnvironmentValidator("CLI");

// Server Configuration
const API_BASE_URL = validator.require(
  "API_BASE_URL",
  "http://localhost:3000/api/v1",
  { minLength: 10 },
);

const API_TIMEOUT = validator.optional("API_TIMEOUT", 30000, {
  type: "number",
});

// Authentication
const API_KEY = validator.optional("API_KEY", null);

const API_TOKEN = validator.optional("API_TOKEN", null);

// Encryption Configuration
const ENCRYPTION_ALGORITHM = validator.optional(
  "ENCRYPTION_ALGORITHM",
  "aes-256-gcm",
  { enum: ["aes-256-gcm", "aes-256-cbc"] },
);

const PBKDF2_ITERATIONS = validator.optional("PBKDF2_ITERATIONS", 100000, {
  type: "number",
});

// SFTP Configuration
const SFTP_HOST = validator.optional("SFTP_HOST", null);

const SFTP_PORT = validator.optional("SFTP_PORT", 22, { type: "number" });

const SFTP_USER = validator.optional("SFTP_USER", null);

const SFTP_PASSWORD = validator.optional("SFTP_PASSWORD", null);

const SFTP_KEY_PATH = validator.optional("SFTP_KEY_PATH", null);

const SFTP_REMOTE_DIR = validator.optional("SFTP_REMOTE_DIR", "/encrypted");

// File Handling
const OUTPUT_DIR = validator.optional("OUTPUT_DIR", "./output");

const TEMP_DIR = validator.optional("TEMP_DIR", "./temp");

const BACKUP_ENABLED = validator.optional("BACKUP_ENABLED", true, {
  type: "boolean",
});

// Logging
const LOG_LEVEL = validator.optional("LOG_LEVEL", "info", {
  enum: ["error", "warn", "info", "debug", "trace"],
});

const LOG_FILE = validator.optional("LOG_FILE", "./logs/cli.log");

// CLI Behavior
const VERBOSE_MODE = validator.optional("VERBOSE_MODE", false, {
  type: "boolean",
});

const DRY_RUN = validator.optional("DRY_RUN", false, { type: "boolean" });

const RETRY_ATTEMPTS = validator.optional("RETRY_ATTEMPTS", 3, {
  type: "number",
});

const RETRY_DELAY = validator.optional("RETRY_DELAY", 1000, { type: "number" });

// Validate configuration
validator.validate(false); // Non-blocking for CLI

// Export configuration object
module.exports = {
  // API
  api: {
    baseUrl: API_BASE_URL,
    timeout: API_TIMEOUT,
    key: API_KEY,
    token: API_TOKEN,
  },

  // Encryption
  encryption: {
    algorithm: ENCRYPTION_ALGORITHM,
    pbkdf2Iterations: PBKDF2_ITERATIONS,
  },

  // SFTP
  sftp: {
    host: SFTP_HOST,
    port: SFTP_PORT,
    user: SFTP_USER,
    password: SFTP_PASSWORD,
    keyPath: SFTP_KEY_PATH,
    remoteDir: SFTP_REMOTE_DIR,
  },

  // File Handling
  file: {
    outputDir: OUTPUT_DIR,
    tempDir: TEMP_DIR,
    backupEnabled: BACKUP_ENABLED,
  },

  // Logging
  logging: {
    level: LOG_LEVEL,
    file: LOG_FILE,
  },

  // CLI Behavior
  cli: {
    verbose: VERBOSE_MODE,
    dryRun: DRY_RUN,
    retryAttempts: RETRY_ATTEMPTS,
    retryDelay: RETRY_DELAY,
  },
};
