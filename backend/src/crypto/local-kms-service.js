/**
 * Local KMS Service
 * Fallback encryption service using local AES-256-GCM when cloud KMS is unavailable
 * Uses environment-based master keys for development/testing
 */

const crypto = require("crypto");
const {
  encryptAES256GCM,
  decryptAES256GCM,
  generateRandomIV,
  generateRandomBytes,
} = require("./aes-256-gcm");

class LocalKMSService {
  constructor(options = {}) {
    this.masterKey = options.masterKey || this._getMasterKeyFromEnv();
    this.keyId = options.keyId || "local-master-key-v1";
    this.region = "local";
    this.provider = "local";
    this.metrics = {
      encryptCount: 0,
      decryptCount: 0,
      keyGenCount: 0,
    };
    this.auditLogger = null;
  }

  /**
   * Get master key from environment or generate one
   * @private
   */
  _getMasterKeyFromEnv() {
    const envKey = process.env.LOCAL_MASTER_KEY;
    if (envKey) {
      // Decode from base64 or hex
      return Buffer.from(envKey, "base64");
    }

    // Generate a random key (WARNING: This is ephemeral and only for development)
    return crypto.randomBytes(32);
  }

  /**
   * Encrypt data using local AES-256-GCM
   * @param {string|Buffer} plaintext - Data to encrypt
   * @param {object} context - Optional encryption context (stored as metadata)
   * @returns {Promise<object>} Encrypted result with ciphertext, iv, authTag
   */
  async encryptData(plaintext, context = {}) {
    try {
      const iv = generateRandomIV();
      const plaintextBuffer =
        typeof plaintext === "string"
          ? Buffer.from(plaintext, "utf8")
          : plaintext;

      const result = encryptAES256GCM(plaintextBuffer, this.masterKey, iv);

      this.metrics.encryptCount++;
      this._log("ENCRYPT", { keyId: this.keyId, context });

      return {
        ciphertext: result.ciphertext,
        iv: result.iv.toString("hex"),
        authTag: result.authTag.toString("hex"),
        keyId: this.keyId,
        provider: this.provider,
        context: context,
      };
    } catch (error) {
      throw new Error(`Local encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using local AES-256-GCM
   * @param {string} ciphertext - Hex-encoded ciphertext
   * @param {string} iv - Hex-encoded IV
   * @param {string} authTag - Hex-encoded auth tag
   * @param {object} context - Optional encryption context for validation
   * @returns {Promise<string>} Decrypted plaintext
   */
  async decryptData(ciphertext, iv, authTag, context = {}) {
    try {
      const ivBuffer = Buffer.from(iv, "hex");
      const authTagBuffer = Buffer.from(authTag, "hex");

      const plaintext = decryptAES256GCM(
        ciphertext,
        this.masterKey,
        ivBuffer,
        authTagBuffer,
      );

      this.metrics.decryptCount++;
      this._log("DECRYPT", { keyId: this.keyId, context });

      return plaintext;
    } catch (error) {
      throw new Error(`Local decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a data encryption key (DEK)
   * Returns both plaintext and encrypted versions
   * @param {string} keySpec - Key specification (AES_256 or AES_128)
   * @returns {Promise<object>} Plain and encrypted data keys
   */
  async generateDataKey(keySpec = "AES_256") {
    try {
      const keySize = keySpec === "AES_256" ? 32 : 16;
      const plaintextKey = generateRandomBytes(keySize);

      // Encrypt the data key with master key
      const iv = generateRandomIV();
      const encrypted = encryptAES256GCM(plaintextKey, this.masterKey, iv);

      this.metrics.keyGenCount++;
      this._log("GENERATE_DATA_KEY", { keySpec, keyId: this.keyId });

      return {
        plaintext: plaintextKey.toString("base64"),
        plaintextBuffer: plaintextKey,
        encrypted: encrypted.ciphertext,
        iv: encrypted.iv.toString("hex"),
        authTag: encrypted.authTag.toString("hex"),
        keyId: this.keyId,
        keySpec,
      };
    } catch (error) {
      throw new Error(`Data key generation failed: ${error.message}`);
    }
  }

  /**
   * Re-encrypt a data key with a new master key
   * @param {string} encryptedKey - Hex-encoded encrypted key
   * @param {string} iv - Hex-encoded IV
   * @param {string} authTag - Hex-encoded auth tag
   * @param {string} targetKeyId - Target key ID (for local, same key)
   * @returns {Promise<object>} Re-encrypted key
   */
  async reencryptDataKey(encryptedKey, iv, authTag, targetKeyId) {
    try {
      // Decrypt with current key
      const plaintext = await this.decryptData(encryptedKey, iv, authTag);

      // Re-encrypt with target key (for local, same key)
      const newIv = generateRandomIV();
      const reencrypted = encryptAES256GCM(
        Buffer.from(plaintext, "utf8"),
        this.masterKey,
        newIv,
      );

      this._log("REENCRYPT_DATA_KEY", { targetKeyId });

      return {
        encrypted: reencrypted.ciphertext,
        iv: reencrypted.iv.toString("hex"),
        authTag: reencrypted.authTag.toString("hex"),
        keyId: targetKeyId || this.keyId,
      };
    } catch (error) {
      throw new Error(`Re-encryption failed: ${error.message}`);
    }
  }

  /**
   * Check if key rotation is enabled (always false for local)
   * @returns {Promise<boolean>}
   */
  async getKeyRotationStatus() {
    return false;
  }

  /**
   * Enable key rotation (no-op for local service)
   * @returns {Promise<void>}
   */
  async enableKeyRotation() {
    // Key rotation not supported for local KMS
  }

  /**
   * Create a new key version (manual rotation)
   * @returns {Promise<string>} New key ID
   */
  async rotateKey() {
    const newKeyId = `local-master-key-${Date.now()}`;
    this._log("ROTATE_KEY", { newKeyId, oldKeyId: this.keyId });

    return newKeyId;
  }

  /**
   * Get key metadata
   * @returns {Promise<object>} Key information
   */
  async getKeyMetadata() {
    return {
      KeyId: this.keyId,
      Description: "Local development master key",
      KeyState: "Enabled",
      KeyUsage: "ENCRYPT_DECRYPT",
      Origin: "LOCAL",
      CreationDate: new Date(),
      Provider: this.provider,
      Region: this.region,
    };
  }

  /**
   * List all keys
   * @returns {Promise<Array>} List of keys
   */
  async listKeys() {
    return [
      {
        KeyId: this.keyId,
        KeyArn: `local:kms:${this.region}:000000000000:key/${this.keyId}`,
        Provider: this.provider,
      },
    ];
  }

  /**
   * Health check
   * @returns {Promise<object>} Health status
   */
  async checkHealth() {
    try {
      // Test encryption/decryption
      const testData = "health-check";
      const encrypted = await this.encryptData(testData);
      const decrypted = await this.decryptData(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
      );

      if (decrypted !== testData) {
        throw new Error("Health check failed: decryption mismatch");
      }

      return {
        healthy: true,
        status: "operational",
        provider: this.provider,
        keyId: this.keyId,
        latency: 0,
      };
    } catch (error) {
      return {
        healthy: false,
        status: "error",
        provider: this.provider,
        error: error.message,
      };
    }
  }

  /**
   * Verify a key exists and is accessible
   * @returns {Promise<object>} Validation result
   */
  async verifyKey() {
    try {
      const metadata = await this.getKeyMetadata();
      return {
        valid: true,
        keyId: metadata.KeyId,
        state: metadata.KeyState,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Get usage metrics
   * @returns {object} Metrics
   */
  getUsageMetrics() {
    return {
      ...this.metrics,
      provider: this.provider,
      keyId: this.keyId,
      region: this.region,
    };
  }

  /**
   * Set audit logger
   * @param {Function} logFn - Audit logger function
   */
  setAuditLogger(logFn) {
    this.auditLogger = logFn;
  }

  /**
   * Log operation for audit trail
   * @private
   */
  _log(operation, details = {}) {
    if (this.auditLogger) {
      this.auditLogger({
        operation,
        timestamp: new Date().toISOString(),
        provider: this.provider,
        keyId: this.keyId,
        ...details,
      });
    }
  }

  /**
   * Encrypt a complete record payload
   * @param {object} record - Record with encrypted data
   * @returns {Promise<object>} Encryption metadata
   */
  async encryptRecord(recordData) {
    const plaintext =
      typeof recordData === "string" ? recordData : JSON.stringify(recordData);
    return await this.encryptData(plaintext);
  }

  /**
   * Decrypt a complete record payload
   * @param {object} record - Record with encrypted fields
   * @returns {Promise<string>} Decrypted data
   */
  async decryptRecord(record) {
    if (!record.encryptedData || !record.iv || !record.authTag) {
      throw new Error("Invalid record structure for decryption");
    }

    return await this.decryptData(
      record.encryptedData,
      record.iv,
      record.authTag,
    );
  }

  /**
   * Generate a reveal token (JWT-like token for time-limited access)
   * @param {string} userId - User ID
   * @param {string} recordId - Record ID
   * @param {number} expiresIn - Expiration in seconds
   * @returns {string} Reveal token
   */
  generateRevealToken(userId, recordId, expiresIn = 3600) {
    const payload = {
      userId,
      recordId,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
      iat: Math.floor(Date.now() / 1000),
    };

    // Simple base64 encoding (in production, use JWT)
    return Buffer.from(JSON.stringify(payload)).toString("base64");
  }

  /**
   * Verify a reveal token
   * @param {string} token - Reveal token to verify
   * @returns {object|null} Decoded payload or null if invalid
   */
  verifyRevealToken(token) {
    try {
      const payload = JSON.parse(Buffer.from(token, "base64").toString());
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp < now) {
        return null; // Expired
      }

      return payload;
    } catch (error) {
      return null;
    }
  }
}

module.exports = LocalKMSService;
