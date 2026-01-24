/**
 * P2-1.1.5: JSON Payload Field-Level Encryption
 * Selective encryption/decryption of specific fields in JSON objects
 */

const {
  encryptAES256GCM,
  decryptAES256GCM,
  generateRandomIV,
} = require("./aes-256-gcm");

/**
 * FieldLevelEncryption
 * Handles selective encryption/decryption of JSON object fields
 */
class FieldLevelEncryption {
  constructor(config = {}) {
    this.config = {
      algorithm: config.algorithm || "aes-256-gcm",
      keyDerivation: config.keyDerivation || "pbkdf2-hmac-sha256",
      version: config.version || "1.0",
    };
  }

  /**
   * Encrypt a single field in JSON object
   * @param {object} payload - JSON object containing field to encrypt
   * @param {string} fieldPath - Path to field (e.g., "ssn" or "patient.ssn")
   * @param {Buffer} key - Encryption key (32 bytes for AES-256)
   * @param {Buffer} iv - Initialization vector (12 bytes)
   * @returns {object} { encrypted: { [fieldPath]: {...} }, plaintext: {...} }
   */
  encryptField(payload, fieldPath, key, iv) {
    if (!payload || typeof payload !== "object") {
      throw new Error("Payload must be a valid object");
    }

    if (!fieldPath || typeof fieldPath !== "string") {
      throw new Error("Field path must be a non-empty string");
    }

    if (!Buffer.isBuffer(key) || key.length !== 32) {
      throw new Error("Key must be a 32-byte Buffer (256-bit)");
    }

    if (!Buffer.isBuffer(iv) || iv.length !== 12) {
      throw new Error("IV must be a 12-byte Buffer (96-bit)");
    }

    // Validate field exists
    if (!validateFieldPath(payload, fieldPath)) {
      throw new Error(`Field path "${fieldPath}" does not exist in payload`);
    }

    // Get field value
    const fieldValue = getFieldValue(payload, fieldPath);
    const stringValue =
      typeof fieldValue === "string" ? fieldValue : JSON.stringify(fieldValue);

    // Encrypt
    const encrypted = encryptAES256GCM(stringValue, key, iv);

    // Build encrypted field object
    const encryptedField = {
      data: encrypted.ciphertext,
      iv: encrypted.iv.toString("hex"),
      authTag: encrypted.authTag.toString("hex"),
      algorithm: this.config.algorithm,
      version: this.config.version,
      timestamp: new Date().toISOString(),
    };

    return {
      encrypted: {
        [fieldPath]: encryptedField,
      },
      plaintext: payload,
    };
  }

  /**
   * Decrypt a single encrypted field
   * @param {object} encryptedField - Encrypted field object with data, iv, authTag
   * @param {string} fieldPath - Field path (for reference)
   * @param {Buffer} key - Decryption key
   * @returns {string} Decrypted field value
   */
  decryptField(encryptedField, fieldPath, key) {
    if (!encryptedField || typeof encryptedField !== "object") {
      throw new Error("Encrypted field must be a valid object");
    }

    if (!encryptedField.data || !encryptedField.iv || !encryptedField.authTag) {
      throw new Error(
        "Encrypted field missing required properties (data, iv, authTag)",
      );
    }

    if (!Buffer.isBuffer(key) || key.length !== 32) {
      throw new Error("Key must be a 32-byte Buffer (256-bit)");
    }

    try {
      const decrypted = decryptAES256GCM(
        encryptedField.data,
        key,
        Buffer.from(encryptedField.iv, "hex"),
        Buffer.from(encryptedField.authTag, "hex"),
      );

      return decrypted;
    } catch (error) {
      if (
        error.message.includes(
          "Unsupported state or unable to authenticate data",
        )
      ) {
        throw new Error(
          `Decryption failed for field "${fieldPath}": Authentication tag validation failed. Data may be tampered or wrong key used.`,
        );
      }
      throw error;
    }
  }

  /**
   * Encrypt multiple fields in JSON object
   * @param {object} payload - JSON object
   * @param {string[]} fieldPaths - Array of field paths to encrypt
   * @param {Buffer} key - Encryption key
   * @param {Buffer} iv - Initialization vector
   * @returns {object} { encrypted: {...}, plaintext: {...}, metadata: {...} }
   */
  encryptFields(payload, fieldPaths, key, iv) {
    if (!Array.isArray(fieldPaths)) {
      throw new Error("Field paths must be an array");
    }

    const encrypted = {};
    const plaintext = {};

    // Copy all non-encrypted fields to plaintext
    for (const [key, value] of Object.entries(payload)) {
      if (!fieldPaths.includes(key)) {
        plaintext[key] = value;
      }
    }

    for (const fieldPath of fieldPaths) {
      const result = this.encryptField(payload, fieldPath, key, iv);
      encrypted[fieldPath] = result.encrypted[fieldPath];
    }

    return {
      encrypted,
      plaintext, // Keep non-encrypted fields for merging during decryption
      metadata: {
        algorithm: this.config.algorithm,
        keyDerivation: this.config.keyDerivation,
        version: this.config.version,
        encryptedFields: fieldPaths,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Decrypt multiple encrypted fields
   * @param {object} encryptedPayload - Payload with encrypted and plaintext fields
   * @param {Buffer} key - Decryption key
   * @returns {object} Complete decrypted object with all fields
   */
  decryptFields(encryptedPayload, key) {
    if (!encryptedPayload || typeof encryptedPayload !== "object") {
      throw new Error("Encrypted payload must be a valid object");
    }

    const { encrypted = {}, plaintext = {}, metadata = {} } = encryptedPayload;
    const decrypted = { ...plaintext };

    // Decrypt each field
    for (const fieldPath of metadata.encryptedFields ||
      Object.keys(encrypted)) {
      if (encrypted[fieldPath]) {
        const decryptedValue = this.decryptField(
          encrypted[fieldPath],
          fieldPath,
          key,
        );
        decrypted[fieldPath] = decryptedValue;
      }
    }

    return decrypted;
  }

  /**
   * Mask a field value for display (e.g., SSN: 123-45-6789 -> ***-**-****)
   * @param {object} payload - Object containing field to mask
   * @param {string} fieldPath - Field path to mask
   * @param {object} options - Masking options
   * @returns {object} { masked: { [fieldPath]: maskedValue }, original: payload }
   */
  maskField(payload, fieldPath, options = {}) {
    if (!validateFieldPath(payload, fieldPath)) {
      throw new Error(`Field path "${fieldPath}" does not exist in payload`);
    }

    const fieldValue = getFieldValue(payload, fieldPath);
    const stringValue = String(fieldValue);
    const { keepFirst = 0, keepLast = 0, maskChar = "*" } = options;

    // Mask preserving structure: replace alphanumeric with mask char, keep hyphens/special chars
    let maskedValue;
    if (keepFirst === 0 && keepLast === 0) {
      // Mask only alphanumeric characters, preserve special chars like hyphens
      maskedValue = stringValue.replace(/[a-zA-Z0-9]/g, maskChar);
    } else {
      // Keep first/last chars, mask middle (preserve special chars)
      const chars = stringValue.split("");
      for (let i = keepFirst; i < chars.length - keepLast; i++) {
        if (/[a-zA-Z0-9]/.test(chars[i])) {
          chars[i] = maskChar;
        }
      }
      maskedValue = chars.join("");
    }

    return {
      masked: {
        [fieldPath]: maskedValue,
      },
      original: payload,
    };
  }
}

/**
 * Validate field path exists in payload
 * @param {object} payload - Object to check
 * @param {string} fieldPath - Field path (dot-separated)
 * @returns {boolean} True if field exists
 */
function validateFieldPath(payload, fieldPath) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (!fieldPath || typeof fieldPath !== "string") {
    return false;
  }

  const parts = fieldPath.split(".");
  let current = payload;

  for (const part of parts) {
    if (current === null || typeof current !== "object") {
      return false;
    }
    if (!(part in current)) {
      return false;
    }
    current = current[part];
  }

  return true;
}

/**
 * Get field value from payload using dot notation
 * @param {object} payload - Object
 * @param {string} fieldPath - Field path (dot-separated)
 * @returns {*} Field value
 */
function getFieldValue(payload, fieldPath) {
  const parts = fieldPath.split(".");
  let current = payload;

  for (const part of parts) {
    current = current[part];
  }

  return current;
}

/**
 * Get list of encrypted fields from payload
 * @param {object} encryptedPayload - Encrypted payload object
 * @returns {string[]} Array of encrypted field paths
 */
function getEncryptedFields(encryptedPayload) {
  if (!encryptedPayload || !encryptedPayload.encrypted) {
    return [];
  }

  return Object.keys(encryptedPayload.encrypted);
}

/**
 * Merge plaintext and encrypted fields
 * @param {object} plaintext - Plaintext fields
 * @param {object} encrypted - Encrypted field objects
 * @returns {object} Merged object (plaintext takes priority on conflicts)
 */
function mergeEncryptedPayload(plaintext, encrypted) {
  const merged = { ...plaintext };

  for (const [fieldPath, encryptedField] of Object.entries(encrypted)) {
    if (!(fieldPath in merged)) {
      merged[fieldPath] = encryptedField;
    }
  }

  return merged;
}

/**
 * Extract encrypted fields from payload
 * Identifies fields with encryption metadata structure
 * @param {object} payload - Payload object
 * @returns {object} Object containing only encrypted fields
 */
function extractEncryptedFields(payload) {
  const encrypted = {};

  for (const [key, value] of Object.entries(payload)) {
    if (
      value &&
      typeof value === "object" &&
      "data" in value &&
      "iv" in value &&
      "authTag" in value &&
      "algorithm" in value
    ) {
      encrypted[key] = value;
    }
  }

  return encrypted;
}

/**
 * Create encrypted field metadata
 * @param {string} fieldPath - Field path
 * @param {object} encryptedField - Encrypted field object
 * @returns {object} Metadata object
 */
function createFieldMetadata(fieldPath, encryptedField) {
  return {
    fieldPath,
    algorithm: encryptedField.algorithm,
    version: encryptedField.version,
    timestamp: encryptedField.timestamp,
    encrypted: true,
  };
}

module.exports = {
  FieldLevelEncryption,
  validateFieldPath,
  getFieldValue,
  getEncryptedFields,
  mergeEncryptedPayload,
  extractEncryptedFields,
  createFieldMetadata,
  // Helper functions
  encryptField: (payload, fieldPath, key, iv) => {
    const encryptor = new FieldLevelEncryption();
    return encryptor.encryptField(payload, fieldPath, key, iv);
  },
  decryptField: (encryptedField, fieldPath, key) => {
    const encryptor = new FieldLevelEncryption();
    return encryptor.decryptField(encryptedField, fieldPath, key);
  },
  encryptFields: (payload, fieldPaths, key, iv) => {
    const encryptor = new FieldLevelEncryption();
    return encryptor.encryptFields(payload, fieldPaths, key, iv);
  },
  decryptFields: (encryptedPayload, key) => {
    const encryptor = new FieldLevelEncryption();
    return encryptor.decryptFields(encryptedPayload, key);
  },
  maskField: (payload, fieldPath, options) => {
    const encryptor = new FieldLevelEncryption();
    return encryptor.maskField(payload, fieldPath, options);
  },
};
