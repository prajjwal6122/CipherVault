/**
 * P2-1.1.4: Encryption Configuration Schema
 * JSON schema definitions and validation for encryption metadata and configuration
 */

const SUPPORTED_ALGORITHMS = [
  "aes-256-gcm",
  "aes-256-cbc",
  "aes-192-gcm",
  "aes-192-cbc",
];

const SUPPORTED_KEY_DERIVATIONS = [
  "pbkdf2-hmac-sha256",
  "pbkdf2-hmac-sha512",
  "argon2i",
  "argon2id",
];

/**
 * JSON Schema for encryption configuration
 * Defines supported algorithms, key derivation methods, and parameters
 */
const ENCRYPTION_SCHEMA = {
  type: "object",
  properties: {
    algorithm: {
      type: "string",
      enum: SUPPORTED_ALGORITHMS,
      description: "Encryption algorithm to use (AES-256-GCM recommended)",
    },
    keyDerivation: {
      type: "string",
      enum: SUPPORTED_KEY_DERIVATIONS,
      description: "Key derivation function (PBKDF2-HMAC-SHA256 recommended)",
      default: "pbkdf2-hmac-sha256",
    },
    iterations: {
      type: "integer",
      minimum: 100000,
      default: 100000,
      description:
        "Number of PBKDF2 iterations (minimum: 100000 per NIST 2024)",
    },
    saltLength: {
      type: "integer",
      minimum: 16,
      maximum: 32,
      default: 16,
      description: "Salt length in bytes for key derivation",
    },
    ivLength: {
      type: "integer",
      minimum: 12,
      maximum: 16,
      default: 12,
      description: "Initialization vector length in bytes",
    },
    authTagLength: {
      type: "integer",
      minimum: 12,
      maximum: 16,
      default: 16,
      description: "Authentication tag length in bytes (GCM mode only)",
    },
  },
  required: ["algorithm"],
  additionalProperties: false,
};

/**
 * JSON Schema for encryption metadata
 * Metadata attached to encrypted payloads for decryption context
 */
const ENCRYPTION_METADATA_SCHEMA = {
  type: "object",
  properties: {
    algorithm: {
      type: "string",
      enum: SUPPORTED_ALGORITHMS,
      description: "Algorithm used for encryption",
    },
    keyDerivation: {
      type: "string",
      enum: SUPPORTED_KEY_DERIVATIONS,
      description: "Key derivation method used",
    },
    version: {
      type: "string",
      pattern: "^\\d+\\.\\d+(\\.\\d+)?$",
      description: 'Schema version (e.g., "1.0", "1.0.0")',
    },
    timestamp: {
      type: "string",
      format: "date-time",
      description: "ISO 8601 timestamp of encryption",
    },
    keyId: {
      type: "string",
      minLength: 1,
      description: "Optional key identifier for key rotation",
    },
  },
  required: ["algorithm", "version"],
  additionalProperties: false,
};

/**
 * JSON Schema for encrypted payload structure
 * Complete encrypted data package with all required decryption information
 */
const PAYLOAD_SCHEMA = {
  type: "object",
  properties: {
    data: {
      type: "string",
      minLength: 1,
      description: "Base64 or hex-encoded ciphertext",
    },
    iv: {
      type: "string",
      minLength: 1,
      description: "Base64 or hex-encoded initialization vector",
    },
    authTag: {
      type: "string",
      minLength: 1,
      description: "Base64 or hex-encoded authentication tag (GCM mode)",
    },
    salt: {
      type: "string",
      minLength: 1,
      description: "Base64 or hex-encoded salt (if password-derived key)",
    },
    algorithm: {
      type: "string",
      enum: SUPPORTED_ALGORITHMS,
      description: "Encryption algorithm used",
    },
    version: {
      type: "string",
      pattern: "^\\d+\\.\\d+(\\.\\d+)?$",
      description: "Schema version",
    },
    keyId: {
      type: "string",
      description: "Optional key identifier",
    },
    keyDerivation: {
      type: "string",
      enum: SUPPORTED_KEY_DERIVATIONS,
      description: "Key derivation method (if applicable)",
    },
    timestamp: {
      type: "string",
      format: "date-time",
      description: "Optional encryption timestamp",
    },
  },
  required: ["data", "iv", "authTag", "algorithm", "version"],
  additionalProperties: false,
};

/**
 * EncryptionConfigValidator
 * Validates encryption configurations against schema
 */
class EncryptionConfigValidator {
  constructor() {
    this.schema = ENCRYPTION_SCHEMA;
    this.metadataSchema = ENCRYPTION_METADATA_SCHEMA;
    this.payloadSchema = PAYLOAD_SCHEMA;
  }

  /**
   * Validate encryption configuration
   * @param {object} config - Configuration object
   * @returns {object} { valid: boolean, errors: string[] }
   */
  validate(config) {
    const errors = [];

    if (!config || typeof config !== "object") {
      return {
        valid: false,
        errors: ["Configuration must be an object"],
      };
    }

    // Validate algorithm
    if (!config.algorithm) {
      errors.push("algorithm is required");
    } else if (!SUPPORTED_ALGORITHMS.includes(config.algorithm)) {
      errors.push(
        `algorithm must be one of: ${SUPPORTED_ALGORITHMS.join(", ")}`,
      );
    }

    // Validate keyDerivation
    if (
      config.keyDerivation &&
      !SUPPORTED_KEY_DERIVATIONS.includes(config.keyDerivation)
    ) {
      errors.push(
        `keyDerivation must be one of: ${SUPPORTED_KEY_DERIVATIONS.join(", ")}`,
      );
    }

    // Validate iterations
    if (config.iterations !== undefined) {
      if (!Number.isInteger(config.iterations)) {
        errors.push("iterations must be an integer");
      } else if (config.iterations < 100000) {
        errors.push("iterations must be at least 100000 (NIST 2024 standard)");
      }
    }

    // Validate saltLength
    if (config.saltLength !== undefined) {
      if (!Number.isInteger(config.saltLength)) {
        errors.push("saltLength must be an integer");
      } else if (config.saltLength < 16) {
        errors.push("saltLength must be at least 16 bytes");
      } else if (config.saltLength > 32) {
        errors.push("saltLength must not exceed 32 bytes");
      }
    }

    // Validate ivLength
    if (config.ivLength !== undefined) {
      if (!Number.isInteger(config.ivLength)) {
        errors.push("ivLength must be an integer");
      } else if (config.ivLength < 12 || config.ivLength > 16) {
        errors.push("ivLength must be between 12 and 16 bytes");
      }
    }

    // Validate authTagLength
    if (config.authTagLength !== undefined) {
      if (!Number.isInteger(config.authTagLength)) {
        errors.push("authTagLength must be an integer");
      } else if (config.authTagLength < 12 || config.authTagLength > 16) {
        errors.push("authTagLength must be between 12 and 16 bytes");
      }
    }

    // Check for unexpected properties
    const allowedKeys = Object.keys(this.schema.properties);
    Object.keys(config).forEach((key) => {
      if (!allowedKeys.includes(key)) {
        errors.push(`unexpected property: ${key}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate encryption metadata
   * @param {object} metadata - Metadata object
   * @returns {object} { valid: boolean, errors: string[] }
   */
  validateMetadata(metadata) {
    const errors = [];

    if (!metadata || typeof metadata !== "object") {
      return {
        valid: false,
        errors: ["Metadata must be an object"],
      };
    }

    // Validate algorithm
    if (!metadata.algorithm) {
      errors.push("algorithm is required");
    } else if (!SUPPORTED_ALGORITHMS.includes(metadata.algorithm)) {
      errors.push(
        `algorithm must be one of: ${SUPPORTED_ALGORITHMS.join(", ")}`,
      );
    }

    // Validate version
    if (!metadata.version) {
      errors.push("version is required");
    } else if (!/^\d+\.\d+(\.\d+)?$/.test(metadata.version)) {
      errors.push(
        'version must follow semantic versioning (e.g., "1.0" or "1.0.0")',
      );
    }

    // Validate keyDerivation if provided
    if (
      metadata.keyDerivation &&
      !SUPPORTED_KEY_DERIVATIONS.includes(metadata.keyDerivation)
    ) {
      errors.push(
        `keyDerivation must be one of: ${SUPPORTED_KEY_DERIVATIONS.join(", ")}`,
      );
    }

    // Validate timestamp if provided
    if (metadata.timestamp) {
      try {
        const date = new Date(metadata.timestamp);
        if (Number.isNaN(date.getTime())) {
          errors.push("timestamp must be valid ISO 8601 format");
        }
      } catch (e) {
        errors.push("timestamp must be valid ISO 8601 format");
      }
    }

    // Validate keyId if provided
    if (
      metadata.keyId &&
      (typeof metadata.keyId !== "string" || metadata.keyId.length === 0)
    ) {
      errors.push("keyId must be a non-empty string");
    }

    // Check for unexpected properties
    const allowedKeys = Object.keys(this.metadataSchema.properties);
    Object.keys(metadata).forEach((key) => {
      if (!allowedKeys.includes(key)) {
        errors.push(`unexpected property: ${key}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate encrypted payload
   * @param {object} payload - Payload object
   * @returns {object} { valid: boolean, errors: string[] }
   */
  validatePayload(payload) {
    const errors = [];

    if (!payload || typeof payload !== "object") {
      return {
        valid: false,
        errors: ["Payload must be an object"],
      };
    }

    // Validate data
    if (!payload.data) {
      errors.push("data is required");
    } else if (typeof payload.data !== "string" || payload.data.length === 0) {
      errors.push("data must be a non-empty string");
    }

    // Validate iv
    if (!payload.iv) {
      errors.push("iv is required");
    } else if (typeof payload.iv !== "string" || payload.iv.length === 0) {
      errors.push("iv must be a non-empty string");
    }

    // Validate authTag
    if (!payload.authTag) {
      errors.push("authTag is required");
    } else if (
      typeof payload.authTag !== "string" ||
      payload.authTag.length === 0
    ) {
      errors.push("authTag must be a non-empty string");
    }

    // Validate algorithm
    if (!payload.algorithm) {
      errors.push("algorithm is required");
    } else if (!SUPPORTED_ALGORITHMS.includes(payload.algorithm)) {
      errors.push(
        `algorithm must be one of: ${SUPPORTED_ALGORITHMS.join(", ")}`,
      );
    }

    // Validate version
    if (!payload.version) {
      errors.push("version is required");
    } else if (!/^\d+\.\d+(\.\d+)?$/.test(payload.version)) {
      errors.push("version must follow semantic versioning");
    }

    // Validate optional salt if provided
    if (
      payload.salt &&
      (typeof payload.salt !== "string" || payload.salt.length === 0)
    ) {
      errors.push("salt must be a non-empty string if provided");
    }

    // Validate optional keyDerivation
    if (
      payload.keyDerivation &&
      !SUPPORTED_KEY_DERIVATIONS.includes(payload.keyDerivation)
    ) {
      errors.push(
        `keyDerivation must be one of: ${SUPPORTED_KEY_DERIVATIONS.join(", ")}`,
      );
    }

    // Validate optional timestamp
    if (payload.timestamp) {
      try {
        const date = new Date(payload.timestamp);
        if (Number.isNaN(date.getTime())) {
          errors.push("timestamp must be valid ISO 8601 format");
        }
      } catch (e) {
        errors.push("timestamp must be valid ISO 8601 format");
      }
    }

    // Check for unexpected properties
    const allowedKeys = Object.keys(this.payloadSchema.properties);
    Object.keys(payload).forEach((key) => {
      if (!allowedKeys.includes(key)) {
        errors.push(`unexpected property: ${key}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Validate encryption configuration
 * @param {object} config - Configuration object
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateEncryptionConfig(config) {
  const validator = new EncryptionConfigValidator();
  return validator.validate(config);
}

/**
 * Validate encryption metadata
 * @param {object} metadata - Metadata object
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateEncryptionMetadata(metadata) {
  const validator = new EncryptionConfigValidator();
  return validator.validateMetadata(metadata);
}

/**
 * Validate encrypted payload
 * @param {object} payload - Payload object
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validatePayloadSchema(payload) {
  const validator = new EncryptionConfigValidator();
  return validator.validatePayload(payload);
}

/**
 * Create encryption metadata object
 * @param {string} algorithm - Encryption algorithm
 * @param {string} version - Schema version
 * @param {string} keyId - Optional key identifier
 * @param {string} keyDerivation - Optional key derivation method
 * @returns {object} Metadata object
 */
function createEncryptionMetadata(algorithm, version, keyId, keyDerivation) {
  const metadata = {
    algorithm,
    version,
    timestamp: new Date().toISOString(),
  };

  if (keyId) {
    metadata.keyId = keyId;
  }

  if (keyDerivation) {
    metadata.keyDerivation = keyDerivation;
  }

  return metadata;
}

module.exports = {
  EncryptionConfigValidator,
  SUPPORTED_ALGORITHMS,
  SUPPORTED_KEY_DERIVATIONS,
  ENCRYPTION_SCHEMA,
  ENCRYPTION_METADATA_SCHEMA,
  PAYLOAD_SCHEMA,
  validateEncryptionConfig,
  validateEncryptionMetadata,
  validatePayloadSchema,
  createEncryptionMetadata,
};
