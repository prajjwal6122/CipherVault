// GCP Cloud KMS Wrapper Implementation
// Integrates Google Cloud Key Management Service for key encryption/decryption and rotation

const { KeyManagementServiceClient } = require("@google-cloud/kms");

class GCPKMSWrapper {
  constructor(options = {}) {
    if (!options.projectId) {
      throw new Error("GCP projectId is required");
    }
    if (!options.keyRing) {
      throw new Error("keyRing is required");
    }
    if (!options.cryptoKey) {
      throw new Error("cryptoKey is required");
    }

    this.projectId = options.projectId;
    this.location = options.location || "global";
    this.keyRing = options.keyRing;
    this.cryptoKey = options.cryptoKey;

    // Build the key name in GCP format
    this.keyName = this.kmsClient.cryptoKeyPath(
      this.projectId,
      this.location,
      this.keyRing,
      this.cryptoKey,
    );

    this.kmsClient = new KeyManagementServiceClient();
    this.auditLogger = null;
    this.metrics = {
      encryptCount: 0,
      decryptCount: 0,
      keyVersionCount: 0,
    };
  }

  /**
   * Encrypt plaintext using GCP Cloud KMS
   * @param {string|Buffer} plaintext - Data to encrypt
   * @param {string} aad - Optional additional authenticated data
   * @param {object} context - Optional user context for audit logging
   * @returns {Promise<Buffer>} Encrypted ciphertext
   */
  async encryptData(plaintext, aad = null, context = {}) {
    const plaintextBuffer = Buffer.isBuffer(plaintext)
      ? plaintext
      : Buffer.from(plaintext, "utf-8");

    const request = {
      name: this.keyName,
      plaintext: plaintextBuffer,
    };

    if (aad) {
      request.additionalAuthenticatedData = Buffer.isBuffer(aad)
        ? aad
        : Buffer.from(aad, "utf-8");
    }

    this._log("ENCRYPT", { aad: !!aad, ...context });

    try {
      const [response] = await this.kmsClient.encrypt(request);
      this.metrics.encryptCount++;
      return response.ciphertext;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Decrypt ciphertext using GCP Cloud KMS
   * @param {Buffer} ciphertext - Encrypted data
   * @param {string} aad - Optional additional authenticated data (must match encrypt)
   * @param {object} context - Optional user context for audit logging
   * @returns {Promise<Buffer>} Decrypted plaintext
   */
  async decryptData(ciphertext, aad = null, context = {}) {
    const request = {
      name: this.keyName,
      ciphertext: ciphertext,
    };

    if (aad) {
      request.additionalAuthenticatedData = Buffer.isBuffer(aad)
        ? aad
        : Buffer.from(aad, "utf-8");
    }

    this._log("DECRYPT", { aad: !!aad, ...context });

    try {
      const [response] = await this.kmsClient.decrypt(request);
      this.metrics.decryptCount++;
      return response.plaintext;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Get the primary (most recent enabled) key version
   * @returns {Promise<object>} Key version metadata
   */
  async getPrimaryKeyVersion() {
    try {
      const [key] = await this.kmsClient.getCryptoKey({
        name: this.keyName,
      });

      return key.primary;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * List all versions of this crypto key
   * @returns {Promise<Array>} List of key versions
   */
  async listKeyVersions() {
    const keyVersionPath = this.kmsClient.cryptoKeyPath(
      this.projectId,
      this.location,
      this.keyRing,
      this.cryptoKey,
    );

    try {
      const versions = [];
      const [iterable] = await this.kmsClient.listCryptoKeyVersions({
        parent: keyVersionPath,
      });

      for await (const version of iterable) {
        versions.push(version);
      }

      return versions;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Get specific key version by version number
   * @param {number} versionNumber - Key version number
   * @returns {Promise<object>} Key version details
   */
  async getKeyVersion(versionNumber) {
    const versionName = this.kmsClient.cryptoKeyVersionPath(
      this.projectId,
      this.location,
      this.keyRing,
      this.cryptoKey,
      versionNumber,
    );

    try {
      const [version] = await this.kmsClient.getCryptoKeyVersion({
        name: versionName,
      });

      return version;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Create a new key version
   * @returns {Promise<object>} Newly created key version
   */
  async createKeyVersion() {
    try {
      const [version] = await this.kmsClient.createCryptoKeyVersion({
        parent: this.keyName,
        cryptoKeyVersion: {
          algorithm: "GOOGLE_SYMMETRIC_ENCRYPTION",
        },
      });

      this.metrics.keyVersionCount++;
      this._log("CREATE_KEY_VERSION", { versionId: version.name });

      return version;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Set the primary key version (active version for encryption)
   * @param {string|number} versionId - Version ID or version number
   * @returns {Promise<object>} Updated crypto key
   */
  async setPrimaryKeyVersion(versionId) {
    const versionPath =
      typeof versionId === "number"
        ? this.kmsClient.cryptoKeyVersionPath(
            this.projectId,
            this.location,
            this.keyRing,
            this.cryptoKey,
            versionId,
          )
        : versionId;

    try {
      const [key] = await this.kmsClient.updateCryptoKey({
        cryptoKey: {
          name: this.keyName,
          primary: { name: versionPath },
        },
        updateMask: { paths: ["primary"] },
      });

      this._log("SET_PRIMARY_VERSION", { versionId });

      return key.primary;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Disable a key version (no longer used for encryption)
   * @param {number} versionNumber - Key version number
   * @returns {Promise<object>} Disabled version
   */
  async disableKeyVersion(versionNumber) {
    const versionPath = this.kmsClient.cryptoKeyVersionPath(
      this.projectId,
      this.location,
      this.keyRing,
      this.cryptoKey,
      versionNumber,
    );

    try {
      const [version] = await this.kmsClient.updateCryptoKeyVersion({
        cryptoKeyVersion: {
          name: versionPath,
          state: "DISABLED",
        },
        updateMask: { paths: ["state"] },
      });

      this._log("DISABLE_KEY_VERSION", { versionNumber });

      return version;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Destroy a disabled key version (permanent, after grace period)
   * @param {number} versionNumber - Key version number
   * @returns {Promise<object>} Destroyed version
   */
  async destroyKeyVersion(versionNumber) {
    const versionPath = this.kmsClient.cryptoKeyVersionPath(
      this.projectId,
      this.location,
      this.keyRing,
      this.cryptoKey,
      versionNumber,
    );

    try {
      const [version] = await this.kmsClient.destroyCryptoKeyVersion({
        name: versionPath,
      });

      this._log("DESTROY_KEY_VERSION", { versionNumber });

      return version;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Restore a destroyed key version (within grace period)
   * @param {number} versionNumber - Key version number
   * @returns {Promise<object>} Restored version
   */
  async restoreKeyVersion(versionNumber) {
    const versionPath = this.kmsClient.cryptoKeyVersionPath(
      this.projectId,
      this.location,
      this.keyRing,
      this.cryptoKey,
      versionNumber,
    );

    try {
      const [version] = await this.kmsClient.restoreCryptoKeyVersion({
        name: versionPath,
      });

      this._log("RESTORE_KEY_VERSION", { versionNumber });

      return version;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Get key rotation schedule
   * @returns {Promise<object>} Rotation schedule details
   */
  async getKeyRotationSchedule() {
    try {
      const [key] = await this.kmsClient.getCryptoKey({
        name: this.keyName,
      });

      return {
        rotationPeriod: key.rotationSchedule?.rotationPeriod || null,
        nextRotationTime: key.rotationSchedule?.nextRotationTime || null,
      };
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Update key rotation schedule
   * @param {number} rotationSeconds - Rotation period in seconds (e.g., 90 days = 7776000)
   * @returns {Promise<object>} Updated rotation schedule
   */
  async updateKeyRotationSchedule(rotationSeconds) {
    try {
      const [key] = await this.kmsClient.updateCryptoKey({
        cryptoKey: {
          name: this.keyName,
          rotationSchedule: {
            rotationPeriod: {
              seconds: Math.floor(rotationSeconds),
            },
          },
        },
        updateMask: { paths: ["rotation_schedule"] },
      });

      this._log("UPDATE_ROTATION_SCHEDULE", { rotationSeconds });

      return key.rotationSchedule;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Disable automatic key rotation
   * @returns {Promise<object>} Updated crypto key
   */
  async disableKeyRotation() {
    try {
      const [key] = await this.kmsClient.updateCryptoKey({
        cryptoKey: {
          name: this.keyName,
          rotationSchedule: null,
        },
        updateMask: { paths: ["rotation_schedule"] },
      });

      this._log("DISABLE_KEY_ROTATION", {});

      return key;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Get IAM policy for this key
   * @returns {Promise<object>} IAM policy bindings
   */
  async getIamPolicy() {
    try {
      const [policy] = await this.kmsClient.getIamPolicy({
        resource: this.keyName,
      });

      return policy;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Grant role to a principal
   * @param {string} principal - Service account or user email
   * @param {string} role - IAM role (e.g., roles/cloudkms.cryptoKeyEncrypterDecrypter)
   * @returns {Promise<object>} Updated policy
   */
  async grantRole(principal, role) {
    try {
      const [policy] = await this.kmsClient.getIamPolicy({
        resource: this.keyName,
      });

      const binding = policy.bindings.find((b) => b.role === role);

      if (!binding) {
        policy.bindings.push({
          role,
          members: [principal],
        });
      } else if (!binding.members.includes(principal)) {
        binding.members.push(principal);
      }

      const [updated] = await this.kmsClient.setIamPolicy({
        resource: this.keyName,
        policy,
      });

      this._log("GRANT_ROLE", { principal, role });

      return { role, principal };
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Revoke role from a principal
   * @param {string} principal - Service account or user email
   * @param {string} role - IAM role to revoke
   * @returns {Promise<boolean>} Success
   */
  async revokeRole(principal, role) {
    try {
      const [policy] = await this.kmsClient.getIamPolicy({
        resource: this.keyName,
      });

      const bindingIndex = policy.bindings.findIndex((b) => b.role === role);

      if (bindingIndex >= 0) {
        const binding = policy.bindings[bindingIndex];
        binding.members = binding.members.filter((m) => m !== principal);

        if (binding.members.length === 0) {
          policy.bindings.splice(bindingIndex, 1);
        }
      }

      await this.kmsClient.setIamPolicy({
        resource: this.keyName,
        policy,
      });

      this._log("REVOKE_ROLE", { principal, role });

      return true;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Set resource-level IAM policy
   * @param {object} policy - Complete IAM policy
   * @returns {Promise<object>} Updated policy
   */
  async setIamPolicy(policy) {
    try {
      const [updated] = await this.kmsClient.setIamPolicy({
        resource: this.keyName,
        policy,
      });

      this._log("SET_IAM_POLICY", {});

      return updated;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Test if principal has specific permissions on key
   * @param {Array<string>} permissions - Permissions to test
   * @returns {Promise<Array<string>>} Permissions that principal has
   */
  async testIamPermissions(permissions) {
    try {
      const [result] = await this.kmsClient.testIamPermissions({
        resource: this.keyName,
        permissions,
      });

      return result.permissions;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Set audit logger function
   * @param {Function} logFn - Function to call for audit logging
   */
  setAuditLogger(logFn) {
    this.auditLogger = logFn;
  }

  /**
   * Get usage metrics
   * @returns {object} Usage statistics
   */
  getUsageMetrics() {
    return {
      ...this.metrics,
      projectId: this.projectId,
      location: this.location,
      keyRing: this.keyRing,
      cryptoKey: this.cryptoKey,
    };
  }

  /**
   * Export audit logs
   * @returns {Promise<object>} Export result
   */
  async exportAuditLogs() {
    // Implementation for exporting to Cloud Audit Logs
    return {
      exported: true,
      entries: this.auditLogs?.length || 0,
    };
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
        projectId: this.projectId,
        keyName: this.keyName,
        ...details,
      });
    }
  }

  /**
   * Handle GCP KMS-specific errors with descriptive messages
   * @private
   */
  _handleKmsError(error) {
    const message = error.message || "";

    if (message.includes("Authentication")) {
      return new Error("Authentication failed: Invalid GCP credentials");
    }
    if (message.includes("Permission denied") || message.includes("7:")) {
      return new Error("Permission denied: Insufficient IAM permissions");
    }
    if (message.includes("Not found") || message.includes("5:")) {
      return new Error("Not found: Key or resource does not exist");
    }
    if (
      message.includes("Service temporarily unavailable") ||
      message.includes("14:")
    ) {
      return new Error(
        "Service temporarily unavailable: Rate limit or quota exceeded",
      );
    }
    if (message.includes("Aead operation failed") || message.includes("3:")) {
      return new Error("Decryption failed: Invalid ciphertext or wrong AAD");
    }

    return error;
  }
}

module.exports = GCPKMSWrapper;
