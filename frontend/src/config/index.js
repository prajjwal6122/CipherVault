/**
 * Frontend Environment Configuration
 * Loads and validates all frontend environment variables
 */

const EnvironmentValidator = require("../../env-validator");

const validator = new EnvironmentValidator("Frontend");

// Server Configuration
const VITE_API_URL = validator.require(
  "VITE_API_URL",
  "http://localhost:3000/api/v1",
  { minLength: 10 },
);

const VITE_APP_TITLE = validator.optional(
  "VITE_APP_TITLE",
  "CipherVault - Secure Data Platform",
);

const VITE_API_TIMEOUT = validator.optional("VITE_API_TIMEOUT", 30000, {
  type: "number",
});

// Authentication Configuration
const VITE_AUTH_TOKEN_KEY = validator.optional(
  "VITE_AUTH_TOKEN_KEY",
  "auth_token",
);

const VITE_AUTH_REFRESH_TOKEN_KEY = validator.optional(
  "VITE_AUTH_REFRESH_TOKEN_KEY",
  "refresh_token",
);

// Feature Flags
const VITE_ENABLE_DEBUG_MODE = validator.optional(
  "VITE_ENABLE_DEBUG_MODE",
  false,
  { type: "boolean" },
);

const VITE_ENABLE_ANALYTICS = validator.optional(
  "VITE_ENABLE_ANALYTICS",
  false,
  { type: "boolean" },
);

// Encryption Configuration
const VITE_ENCRYPTION_ALGORITHM = validator.optional(
  "VITE_ENCRYPTION_ALGORITHM",
  "aes-256-gcm",
  { enum: ["aes-256-gcm", "aes-256-cbc"] },
);

// File Configuration
const VITE_MAX_FILE_SIZE = validator.optional(
  "VITE_MAX_FILE_SIZE",
  104857600, // 100MB
  { type: "number" },
);

const VITE_ALLOWED_FILE_TYPES = validator.optional(
  "VITE_ALLOWED_FILE_TYPES",
  "csv,json,xlsx,txt",
);

// UI Configuration
const VITE_THEME = validator.optional("VITE_THEME", "light", {
  enum: ["light", "dark", "auto"],
});

const VITE_ITEMS_PER_PAGE = validator.optional("VITE_ITEMS_PER_PAGE", 20, {
  type: "number",
});

// Validate configuration
validator.validate(false); // Don't exit on error for frontend (non-blocking)

// Export configuration object
module.exports = {
  // API
  api: {
    url: VITE_API_URL,
    timeout: VITE_API_TIMEOUT,
  },

  // App
  app: {
    title: VITE_APP_TITLE,
    debugMode: VITE_ENABLE_DEBUG_MODE,
    analytics: VITE_ENABLE_ANALYTICS,
  },

  // Auth
  auth: {
    tokenKey: VITE_AUTH_TOKEN_KEY,
    refreshTokenKey: VITE_AUTH_REFRESH_TOKEN_KEY,
  },

  // Encryption
  encryption: {
    algorithm: VITE_ENCRYPTION_ALGORITHM,
  },

  // File Handling
  file: {
    maxSize: VITE_MAX_FILE_SIZE,
    allowedTypes: VITE_ALLOWED_FILE_TYPES.split(","),
  },

  // UI
  ui: {
    theme: VITE_THEME,
    itemsPerPage: VITE_ITEMS_PER_PAGE,
  },
};
