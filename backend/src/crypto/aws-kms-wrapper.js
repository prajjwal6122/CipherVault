// AWS KMS Wrapper Implementation
// Integrates AWS Key Management Service for master key encryption, key rotation, and key versioning

const AWS = require("aws-sdk");

class AWSKMSWrapper {
  constructor(options = {}) {
    if (!options.region) {
      throw new Error("AWS region is required");
    }
    if (!options.keyId) {
      throw new Error("KMS key ID is required");
    }

    this.region = options.region;
    this.keyId = options.keyId;
    this.kmsClient = new AWS.KMS({ region: this.region });
    this.auditLogger = null;
    this.metrics = {
      encryptCount: 0,
      decryptCount: 0,
      keyGenCount: 0,
    };
  }

  /**
   * Encrypt plaintext using AWS KMS
   * @param {string|Buffer} plaintext - Data to encrypt
   * @param {object} context - Optional encryption context for audit trail
   * @returns {Promise<Buffer>} Encrypted ciphertext
   */
  async encryptData(plaintext, context = {}) {
    const params = {
      KeyId: this.keyId,
      Plaintext: plaintext,
    };

    if (Object.keys(context).length > 0) {
      params.EncryptionContext = context;
    }

    this._log("ENCRYPT", { keyId: this.keyId, context });

    try {
      const response = await this.kmsClient.encrypt(params).promise();
      this.metrics.encryptCount++;
      return response.CiphertextBlob;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Decrypt ciphertext using AWS KMS
   * @param {Buffer} ciphertext - Encrypted data
   * @param {object} context - Optional encryption context for validation
   * @returns {Promise<string|Buffer>} Decrypted plaintext
   */
  async decryptData(ciphertext, context = {}) {
    const params = {
      CiphertextBlob: ciphertext,
    };

    if (Object.keys(context).length > 0) {
      params.EncryptionContext = context;
    }

    this._log("DECRYPT", { context });

    try {
      const response = await this.kmsClient.decrypt(params).promise();
      this.metrics.decryptCount++;
      return response.Plaintext;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Generate a plaintext and encrypted data key
   * Plaintext key used for local encryption; encrypted key stored with data
   * @param {string} keySpec - 'AES_256' or 'AES_128'
   * @returns {Promise<{plaintext: Buffer, encrypted: Buffer}>}
   */
  async generateDataKey(keySpec = "AES_256") {
    const params = {
      KeyId: this.keyId,
      KeySpec: keySpec,
    };

    this._log("GENERATE_DATA_KEY", { keySpec });

    try {
      const response = await this.kmsClient.generateDataKey(params).promise();
      this.metrics.keyGenCount++;

      return {
        plaintext: response.Plaintext,
        encrypted: response.CiphertextBlob,
      };
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Reencrypt a data key encrypted with one KMS key using a different KMS key
   * Used for key rotation migrations
   * @param {Buffer} sourceEncryptedKey - Data key encrypted with old master key
   * @param {string} targetKeyId - New master key ARN or alias
   * @returns {Promise<Buffer>} Data key encrypted with new master key
   */
  async reencryptDataKey(sourceEncryptedKey, targetKeyId) {
    try {
      // First decrypt with source key (old)
      const decryptResponse = await this.kmsClient
        .decrypt({
          CiphertextBlob: sourceEncryptedKey,
        })
        .promise();

      // Then encrypt with target key (new)
      const encryptResponse = await this.kmsClient
        .encrypt({
          KeyId: targetKeyId,
          Plaintext: decryptResponse.Plaintext,
        })
        .promise();

      this._log("REENCRYPT_DATA_KEY", {
        targetKeyId,
      });

      return encryptResponse.CiphertextBlob;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Check if automatic annual key rotation is enabled
   * @returns {Promise<boolean>} True if rotation enabled
   */
  async getKeyRotationStatus() {
    try {
      const response = await this.kmsClient
        .getKeyRotationStatus({
          KeyId: this.keyId,
        })
        .promise();

      return response.KeyRotationEnabled;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Enable automatic annual key rotation on this key
   * @returns {Promise<void>}
   */
  async enableKeyRotation() {
    try {
      await this.kmsClient
        .enableKeyRotation({
          KeyId: this.keyId,
        })
        .promise();

      this._log("ENABLE_KEY_ROTATION", {});
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Create a new KMS key (manual rotation)
   * Creates new CMK with same configuration for explicit key versioning
   * @returns {Promise<string>} New key ARN
   */
  async rotateKey() {
    try {
      const keyMetadata = await this.getKeyMetadata();

      const createResponse = await this.kmsClient
        .createKey({
          Description: keyMetadata.Description + " (rotated)",
          KeyUsage: "ENCRYPT_DECRYPT",
          Origin: "AWS_KMS",
        })
        .promise();

      this._log("ROTATE_KEY", {
        newKeyId: createResponse.KeyMetadata.KeyId,
      });

      return createResponse.KeyMetadata.Arn;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Get key metadata including rotation status and creation date
   * @returns {Promise<object>} Key metadata
   */
  async getKeyMetadata() {
    try {
      const response = await this.kmsClient
        .describeKey({
          KeyId: this.keyId,
        })
        .promise();

      return response.KeyMetadata;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Schedule key deletion (grace period: 7-30 days)
   * @param {number} gracePeriodDays - Days before deletion (default 7)
   * @returns {Promise<object>} Deletion details
   */
  async scheduleKeyDeletion(gracePeriodDays = 7) {
    if (gracePeriodDays < 7 || gracePeriodDays > 30) {
      throw new Error("Grace period must be between 7 and 30 days");
    }

    try {
      const response = await this.kmsClient
        .scheduleKeyDeletion({
          KeyId: this.keyId,
          PendingWindowInDays: gracePeriodDays,
        })
        .promise();

      this._log("SCHEDULE_KEY_DELETION", {
        gracePeriodDays,
        deletionDate: response.DeletionDate,
      });

      return response;
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * List all grants (delegated permissions) on this key
   * @returns {Promise<Array>} List of grants
   */
  async listKeyGrants() {
    try {
      const response = await this.kmsClient
        .listGrants({
          KeyId: this.keyId,
        })
        .promise();

      return response.Grants || [];
    } catch (error) {
      throw this._handleKmsError(error);
    }
  }

  /**
   * Create a grant (delegated permission) for a service principal
   * Allows cross-account or cross-service access to key operations
   * @param {string} principal - IAM principal ARN
   * @param {Array<string>} operations - Allowed operations (Encrypt, Decrypt, etc)
   * @returns {Promise<{GrantId, GrantToken}>}
   */
  async createGrant(principal, operations = ["Decrypt", "GenerateDataKey"]) {
    try {
      const response = await this.kmsClient
        .createGrant({
          KeyId: this.keyId,
          GranteePrincipal: principal,
          Operations: operations,
        })
        .promise();

      this._log("CREATE_GRANT", {
        principal,
        operations,
        grantId: response.GrantId,
      });

      return {
        GrantId: response.GrantId,
        GrantToken: response.GrantToken,
      };
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
   * Get usage metrics for this wrapper instance
   * @returns {object} Usage statistics
   */
  getUsageMetrics() {
    return {
      ...this.metrics,
      region: this.region,
      keyId: this.keyId,
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
        keyId: this.keyId,
        ...details,
      });
    }
  }

  /**
   * Handle KMS-specific errors with descriptive messages
   * @private
   */
  _handleKmsError(error) {
    const message = error.message || "";

    if (message.includes("InvalidCiphertextException")) {
      return new Error(
        `InvalidCiphertextException: Invalid or corrupted ciphertext`,
      );
    }
    if (message.includes("NotFoundException")) {
      return new Error(`NotFoundException: Key not found or access denied`);
    }
    if (message.includes("InvalidKeyId")) {
      return new Error(`InvalidKeyId: Key ID format invalid`);
    }
    if (message.includes("DisabledException")) {
      return new Error(`DisabledException: Key is disabled`);
    }
    if (message.includes("ThrottlingException")) {
      return new Error(`ThrottlingException: KMS rate limit exceeded`);
    }
    if (message.includes("not authorized")) {
      return new Error(`Unauthorized: IAM principal lacks permission`);
    }

    return error;
  }
}

module.exports = AWSKMSWrapper;
