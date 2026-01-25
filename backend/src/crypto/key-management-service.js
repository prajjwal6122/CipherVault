// Key Management & Rotation Service Implementation
// Manages multi-cloud encryption, key rotation, credential storage, and provider failover

const AWSKMSWrapper = require("./aws-kms-wrapper");
const GCPKMSWrapper = require("./gcp-kms-wrapper");

class KeyManagementService {
  constructor(options = {}) {
    const validProviders = ["aws", "gcp"];

    if (
      !options.primaryProvider ||
      !validProviders.includes(options.primaryProvider)
    ) {
      throw new Error("Invalid primary provider");
    }

    this.primaryProvider = options.primaryProvider;
    this.fallbackProvider = options.fallbackProvider || null;
    this.providers = {};
    this.credentials = {};
    this.rotationHistory = {};
    this.auditLogger = null;
    this.errorLogger = null;

    // Initialize providers
    if (options.aws) {
      this.providers.aws = new AWSKMSWrapper(options.aws);
      this.rotationHistory.aws = [];
    }

    if (options.gcp) {
      this.providers.gcp = new GCPKMSWrapper(options.gcp);
      this.rotationHistory.gcp = [];
    }

    this.metrics = {
      aws: { encryptCount: 0, decryptCount: 0, failovers: 0 },
      gcp: { encryptCount: 0, decryptCount: 0, failovers: 0 },
    };

    this.providerHealth = {
      aws: { status: "healthy", lastCheck: null, latency: 0 },
      gcp: { status: "healthy", lastCheck: null, latency: 0 },
    };
  }

  /**
   * Store credentials for a provider
   * @param {string} provider - 'aws' or 'gcp'
   * @param {object} credentials - Provider-specific credentials
   */
  storeCredentials(provider, credentials) {
    if (provider === "aws") {
      if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        throw new Error("Invalid AWS credentials");
      }
    }

    if (provider === "gcp") {
      if (!credentials.project_id || !credentials.private_key) {
        throw new Error("Invalid GCP credentials");
      }
    }

    // Store encrypted at rest (in production, use Vault/Secret Manager)
    this.credentials[provider] = this._encryptCredentials(credentials);
    this._log("STORE_CREDENTIALS", { provider });
  }

  /**
   * Retrieve credentials for a provider
   * @param {string} provider - 'aws' or 'gcp'
   * @returns {object} Decrypted credentials
   */
  getCredentials(provider) {
    if (!this.credentials[provider]) {
      throw new Error("Credentials not found");
    }

    return this._decryptCredentials(this.credentials[provider]);
  }

  /**
   * Rotate credentials (update with new ones)
   * @param {string} provider - 'aws' or 'gcp'
   * @param {object} newCredentials - New provider credentials
   */
  rotateCredentials(provider, newCredentials) {
    this.storeCredentials(provider, newCredentials);
    this._log("ROTATE_CREDENTIALS", { provider });
  }

  /**
   * Encrypt data using primary provider (with failover)
   * @param {string|Buffer} plaintext - Data to encrypt
   * @param {object} options - {provider, enableFailover, context}
   * @returns {Promise<Buffer>} Encrypted ciphertext
   */
  async encryptData(plaintext, options = {}) {
    const provider = options.provider || this.primaryProvider;
    const enableFailover = options.enableFailover !== false;
    const context = options.context || {};

    try {
      const wrapper = this.providers[provider];
      if (!wrapper) {
        throw new Error(`Provider ${provider} not configured`);
      }

      const encrypted = await wrapper.encryptData(plaintext, context);
      this.metrics[provider].encryptCount++;
      this._log("ENCRYPT", { provider });

      return encrypted;
    } catch (error) {
      this._logError("ENCRYPT", error, { provider });

      if (
        enableFailover &&
        this.fallbackProvider &&
        provider !== this.fallbackProvider
      ) {
        this.metrics[provider].failovers++;
        this._log("FAILOVER", {
          from: provider,
          to: this.fallbackProvider,
          reason: error.message,
        });

        return this.encryptData(plaintext, {
          ...options,
          provider: this.fallbackProvider,
          enableFailover: false,
        });
      }

      throw error;
    }
  }

  /**
   * Decrypt data using provider metadata (with failover)
   * @param {Buffer} ciphertext - Encrypted data
   * @param {object} providerMetadata - {provider, enableFailover}
   * @returns {Promise<Buffer>} Decrypted plaintext
   */
  async decryptData(ciphertext, providerMetadata = {}) {
    const provider = providerMetadata.provider || this.primaryProvider;
    const enableFailover = providerMetadata.enableFailover !== false;

    try {
      const wrapper = this.providers[provider];
      if (!wrapper) {
        throw new Error(`Provider ${provider} not configured`);
      }

      const decrypted = await wrapper.decryptData(ciphertext);
      this.metrics[provider].decryptCount++;
      this._log("DECRYPT", { provider });

      return decrypted;
    } catch (error) {
      this._logError("DECRYPT", error, { provider });

      if (
        enableFailover &&
        this.fallbackProvider &&
        provider !== this.fallbackProvider
      ) {
        this.metrics[provider].failovers++;
        this._log("FAILOVER", {
          from: provider,
          to: this.fallbackProvider,
          reason: error.message,
        });

        return this.decryptData(ciphertext, {
          ...providerMetadata,
          provider: this.fallbackProvider,
          enableFailover: false,
        });
      }

      throw error;
    }
  }

  /**
   * Rotate key on specified provider
   * @param {string} provider - 'aws' or 'gcp'
   * @returns {Promise<string>} New key ID
   */
  async rotateKey(provider) {
    const wrapper = this.providers[provider];
    if (!wrapper) {
      throw new Error(`Provider ${provider} not configured`);
    }

    try {
      let newKeyId;

      if (provider === "aws") {
        newKeyId = await wrapper.rotateKey();
      } else if (provider === "gcp") {
        const newVersion = await wrapper.createKeyVersion();
        await wrapper.setPrimaryKeyVersion(newVersion.name);
        newKeyId = newVersion.name;
      }

      this.rotationHistory[provider].push({
        timestamp: new Date().toISOString(),
        newKeyId,
      });

      this._log("ROTATE_KEY", { provider, newKeyId });

      return newKeyId;
    } catch (error) {
      this._logError("ROTATE_KEY", error, { provider });
      throw error;
    }
  }

  /**
   * Schedule automatic key rotation
   * @param {string} provider - 'aws' or 'gcp'
   * @param {string} schedule - 'automatic' or 'manual'
   */
  async scheduleKeyRotation(provider, schedule = "automatic") {
    const wrapper = this.providers[provider];
    if (!wrapper) {
      throw new Error(`Provider ${provider} not configured`);
    }

    try {
      if (schedule === "automatic") {
        if (provider === "aws") {
          await wrapper.enableKeyRotation();
        } else if (provider === "gcp") {
          // Default 90 days rotation
          await wrapper.updateKeyRotationSchedule(90 * 24 * 60 * 60);
        }
      }

      this._log("SCHEDULE_KEY_ROTATION", { provider, schedule });
    } catch (error) {
      this._logError("SCHEDULE_KEY_ROTATION", error, { provider });
      throw error;
    }
  }

  /**
   * Get key rotation status
   * @param {string} provider - 'aws' or 'gcp'
   * @returns {Promise<boolean>} Rotation enabled status
   */
  async getKeyRotationStatus(provider) {
    const wrapper = this.providers[provider];
    if (!wrapper) {
      throw new Error(`Provider ${provider} not configured`);
    }

    return wrapper.getKeyRotationStatus();
  }

  /**
   * Reencrypt data with new key (key migration)
   * @param {Buffer} oldCiphertext - Data encrypted with old key
   * @param {string} provider - 'aws' or 'gcp'
   * @returns {Promise<Buffer>} Data encrypted with new key
   */
  async reencryptDataWithNewKey(oldCiphertext, provider) {
    const wrapper = this.providers[provider];
    if (!wrapper) {
      throw new Error(`Provider ${provider} not configured`);
    }

    try {
      // Decrypt with old key
      const plaintext = await wrapper.decryptData(oldCiphertext);

      // Encrypt with new key (automatically uses new primary version)
      const newCiphertext = await wrapper.encryptData(plaintext);

      this._log("REENCRYPT_WITH_NEW_KEY", { provider });

      return newCiphertext;
    } catch (error) {
      this._logError("REENCRYPT_WITH_NEW_KEY", error, { provider });
      throw error;
    }
  }

  /**
   * Get rotation history for a provider
   * @param {string} provider - 'aws' or 'gcp'
   * @returns {Array} Rotation history entries
   */
  getRotationHistory(provider) {
    return this.rotationHistory[provider] || [];
  }

  /**
   * Health check a provider
   * @param {string} provider - 'aws' or 'gcp'
   * @returns {Promise<object>} Health status
   */
  async healthCheckProvider(provider) {
    const startTime = Date.now();

    try {
      const wrapper = this.providers[provider];
      if (!wrapper) {
        throw new Error(`Provider ${provider} not configured`);
      }

      // Light health check (get key metadata)
      if (provider === "aws") {
        await wrapper.getKeyMetadata();
      } else if (provider === "gcp") {
        await wrapper.getPrimaryKeyVersion();
      }

      const latency = Date.now() - startTime;

      this.providerHealth[provider] = {
        status: "healthy",
        lastCheck: new Date().toISOString(),
        latency,
      };

      return this.providerHealth[provider];
    } catch (error) {
      this.providerHealth[provider] = {
        status: "unhealthy",
        lastCheck: new Date().toISOString(),
        error: error.message,
      };

      this._logError("HEALTH_CHECK", error, { provider });

      return this.providerHealth[provider];
    }
  }

  /**
   * Get provider health status
   * @returns {object} Health status for all providers
   */
  getProviderHealth() {
    return { ...this.providerHealth };
  }

  /**
   * Migrate encrypted data between providers
   * @param {Buffer} ciphertext - Data encrypted with source provider
   * @param {string} sourceProvider - Source provider
   * @param {string} targetProvider - Target provider
   * @returns {Promise<Buffer>} Data encrypted with target provider
   */
  async migrateEncryptedData(ciphertext, sourceProvider, targetProvider) {
    const sourceWrapper = this.providers[sourceProvider];
    const targetWrapper = this.providers[targetProvider];

    if (!sourceWrapper || !targetWrapper) {
      throw new Error("Invalid source or target provider");
    }

    try {
      // Decrypt with source
      const plaintext = await sourceWrapper.decryptData(ciphertext);

      // Encrypt with target
      const newCiphertext = await targetWrapper.encryptData(plaintext);

      this._log("MIGRATE_DATA", { from: sourceProvider, to: targetProvider });

      return newCiphertext;
    } catch (error) {
      this._logError("MIGRATE_DATA", error, { sourceProvider, targetProvider });
      throw error;
    }
  }

  /**
   * List all available keys across providers
   * @returns {object} Keys per provider
   */
  listAllKeys() {
    return {
      aws: this.providers.aws ? [{ id: this.providers.aws.keyId }] : [],
      gcp: this.providers.gcp ? [{ name: this.providers.gcp.keyName }] : [],
    };
  }

  /**
   * Get key information including metadata
   * @param {string} provider - 'aws' or 'gcp'
   * @returns {object} Key metadata
   */
  getKeyInfo(provider) {
    const wrapper = this.providers[provider];
    if (!wrapper) {
      return null;
    }

    return {
      provider,
      keyId: wrapper.keyId || wrapper.keyName,
      region: wrapper.region || wrapper.location,
    };
  }

  /**
   * Get usage metrics
   * @returns {object} Usage statistics per provider
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get key rotation audit trail
   * @returns {Array} Combined audit trail from all providers
   */
  getKeyRotationAuditTrail() {
    const trail = [];

    for (const [provider, history] of Object.entries(this.rotationHistory)) {
      for (const entry of history) {
        trail.push({
          provider,
          ...entry,
        });
      }
    }

    return trail.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Encrypt data with retry policy
   * @param {string|Buffer} plaintext - Data to encrypt
   * @param {object} options - {retryPolicy, maxRetries, provider}
   * @returns {Promise<Buffer>} Encrypted ciphertext
   */
  async encryptDataWithRetry(plaintext, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryPolicy = options.retryPolicy || "exponential";
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.encryptData(plaintext, options);
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries - 1) {
          const delay =
            retryPolicy === "exponential" ? Math.pow(2, attempt) * 1000 : 1000;

          await this._delay(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Set audit logger
   * @param {Function} logFn - Audit logger function
   */
  setAuditLogger(logFn) {
    this.auditLogger = logFn;
  }

  /**
   * Set error logger
   * @param {Function} logFn - Error logger function
   */
  setErrorLogger(logFn) {
    this.errorLogger = logFn;
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
        ...details,
      });
    }
  }

  /**
   * Log error
   * @private
   */
  _logError(operation, error, context = {}) {
    if (this.errorLogger) {
      this.errorLogger({
        operation,
        error: error.message,
        ...context,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Encrypt credentials for storage
   * @private
   */
  _encryptCredentials(credentials) {
    // In production, use actual encryption or store in Vault
    return Buffer.from(JSON.stringify(credentials)).toString("base64");
  }

  /**
   * Decrypt credentials from storage
   * @private
   */
  _decryptCredentials(encrypted) {
    // In production, use actual decryption or retrieve from Vault
    return JSON.parse(Buffer.from(encrypted, "base64").toString());
  }

  /**
   * Delay utility for retry logic
   * @private
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = KeyManagementService;
