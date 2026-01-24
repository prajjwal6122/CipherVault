/**
 * P2-1.1.4: Encryption Configuration Schema Tests
 * Tests for JSON schema validation of encryption metadata and configuration
 */

const {
  EncryptionConfigValidator,
  SUPPORTED_ALGORITHMS,
  SUPPORTED_KEY_DERIVATIONS,
  validateEncryptionMetadata,
  validateEncryptionConfig,
  validatePayloadSchema,
  createEncryptionMetadata,
  ENCRYPTION_SCHEMA,
  PAYLOAD_SCHEMA,
} = require("../src/crypto/encryption-config");

describe("P2-1.1.4: Encryption Configuration Schema", () => {
  describe("EncryptionConfigValidator", () => {
    let validator;

    beforeEach(() => {
      validator = new EncryptionConfigValidator();
    });

    it("should instantiate validator", () => {
      expect(validator).toBeDefined();
      expect(typeof validator.validate).toBe("function");
      expect(typeof validator.validateMetadata).toBe("function");
    });

    it("should validate valid encryption config", () => {
      const config = {
        algorithm: "aes-256-gcm",
        keyDerivation: "pbkdf2-hmac-sha256",
        iterations: 100000,
        saltLength: 16,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject config with invalid algorithm", () => {
      const config = {
        algorithm: "invalid-algo",
        keyDerivation: "pbkdf2-hmac-sha256",
        iterations: 100000,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/algorithm/i);
    });

    it("should reject config with invalid key derivation", () => {
      const config = {
        algorithm: "aes-256-gcm",
        keyDerivation: "invalid-derivation",
        iterations: 100000,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/keyDerivation|key derivation/i);
    });

    it("should reject config with low iteration count", () => {
      const config = {
        algorithm: "aes-256-gcm",
        keyDerivation: "pbkdf2-hmac-sha256",
        iterations: 50000, // Below minimum
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject config with invalid salt length", () => {
      const config = {
        algorithm: "aes-256-gcm",
        keyDerivation: "pbkdf2-hmac-sha256",
        iterations: 100000,
        saltLength: 8, // Below minimum of 16
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/salt|Salt/);
    });
  });

  describe("validateEncryptionMetadata", () => {
    it("should validate correct metadata", () => {
      const metadata = {
        algorithm: "aes-256-gcm",
        keyDerivation: "pbkdf2-hmac-sha256",
        version: "1.0",
        timestamp: new Date().toISOString(),
        keyId: "key-123",
      };

      const result = validateEncryptionMetadata(metadata);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate metadata with minimal required fields", () => {
      const metadata = {
        algorithm: "aes-256-gcm",
        version: "1.0",
      };

      const result = validateEncryptionMetadata(metadata);

      expect(result.valid).toBe(true);
    });

    it("should reject metadata without algorithm", () => {
      const metadata = {
        keyDerivation: "pbkdf2-hmac-sha256",
        version: "1.0",
      };

      const result = validateEncryptionMetadata(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject metadata with unsupported algorithm", () => {
      const metadata = {
        algorithm: "des-64", // Insecure
        version: "1.0",
      };

      const result = validateEncryptionMetadata(metadata);

      expect(result.valid).toBe(false);
    });

    it("should reject metadata without version", () => {
      const metadata = {
        algorithm: "aes-256-gcm",
      };

      const result = validateEncryptionMetadata(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/version/i);
    });

    it("should validate timestamp format if provided", () => {
      const metadata = {
        algorithm: "aes-256-gcm",
        version: "1.0",
        timestamp: "invalid-timestamp",
      };

      const result = validateEncryptionMetadata(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/timestamp/i);
    });

    it("should validate keyId format if provided", () => {
      const metadata = {
        algorithm: "aes-256-gcm",
        version: "1.0",
        keyId: "valid-key-id-123",
      };

      const result = validateEncryptionMetadata(metadata);

      expect(result.valid).toBe(true);
    });
  });

  describe("validateEncryptionConfig", () => {
    it("should validate complete encryption config", () => {
      const config = {
        algorithm: "aes-256-gcm",
        keyDerivation: "pbkdf2-hmac-sha256",
        iterations: 100000,
        saltLength: 16,
        ivLength: 12,
        authTagLength: 16,
      };

      const result = validateEncryptionConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate config with defaults", () => {
      const config = {
        algorithm: "aes-256-gcm",
      };

      const result = validateEncryptionConfig(config);

      expect(result.valid).toBe(true);
    });

    it("should reject invalid algorithm", () => {
      const config = {
        algorithm: "rc4", // Broken algorithm
      };

      const result = validateEncryptionConfig(config);

      expect(result.valid).toBe(false);
    });

    it("should enforce minimum iterations", () => {
      const config = {
        algorithm: "aes-256-gcm",
        keyDerivation: "pbkdf2-hmac-sha256",
        iterations: 1000,
      };

      const result = validateEncryptionConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/iteration/i);
    });

    it("should validate all supported algorithms", () => {
      SUPPORTED_ALGORITHMS.forEach((algo) => {
        const config = { algorithm: algo };
        const result = validateEncryptionConfig(config);
        expect(result.valid).toBe(true);
      });
    });

    it("should validate all supported key derivations", () => {
      SUPPORTED_KEY_DERIVATIONS.forEach((keyder) => {
        const config = {
          algorithm: "aes-256-gcm",
          keyDerivation: keyder,
        };
        const result = validateEncryptionConfig(config);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("validatePayloadSchema", () => {
    it("should validate encrypted payload structure", () => {
      const payload = {
        data: "a1b2c3d4",
        iv: "e5f6g7h8i9j0",
        authTag: "k1l2m3n4o5p6q7r8",
        salt: "s1t2u3v4w5x6y7z8",
        algorithm: "aes-256-gcm",
        version: "1.0",
      };

      const result = validatePayloadSchema(payload);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate payload with optional keyId", () => {
      const payload = {
        data: "ciphertext",
        iv: "initialization-vector",
        authTag: "auth-tag",
        algorithm: "aes-256-gcm",
        version: "1.0",
        keyId: "key-abc-123",
      };

      const result = validatePayloadSchema(payload);

      expect(result.valid).toBe(true);
    });

    it("should reject payload without data", () => {
      const payload = {
        iv: "ivvalue",
        authTag: "tagvalue",
        algorithm: "aes-256-gcm",
        version: "1.0",
      };

      const result = validatePayloadSchema(payload);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/data/i);
    });

    it("should reject payload without IV", () => {
      const payload = {
        data: "ciphertext",
        authTag: "tagvalue",
        algorithm: "aes-256-gcm",
        version: "1.0",
      };

      const result = validatePayloadSchema(payload);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/iv|IV/);
    });

    it("should reject payload without auth tag", () => {
      const payload = {
        data: "ciphertext",
        iv: "ivvalue",
        algorithm: "aes-256-gcm",
        version: "1.0",
      };

      const result = validatePayloadSchema(payload);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/auth|tag/i);
    });

    it("should reject payload with invalid algorithm", () => {
      const payload = {
        data: "ciphertext",
        iv: "ivvalue",
        authTag: "tagvalue",
        algorithm: "unknown-algo",
        version: "1.0",
      };

      const result = validatePayloadSchema(payload);

      expect(result.valid).toBe(false);
    });

    it("should reject payload with empty data", () => {
      const payload = {
        data: "",
        iv: "ivvalue",
        authTag: "tagvalue",
        algorithm: "aes-256-gcm",
        version: "1.0",
      };

      const result = validatePayloadSchema(payload);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/data/i);
    });
  });

  describe("createEncryptionMetadata", () => {
    it("should create valid metadata object", () => {
      const metadata = createEncryptionMetadata("aes-256-gcm", "1.0");

      expect(metadata).toBeDefined();
      expect(metadata.algorithm).toBe("aes-256-gcm");
      expect(metadata.version).toBe("1.0");
      expect(metadata.timestamp).toBeDefined();
    });

    it("should include timestamp in ISO format", () => {
      const metadata = createEncryptionMetadata("aes-256-gcm", "1.0");

      expect(metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should optionally include keyId", () => {
      const metadata = createEncryptionMetadata(
        "aes-256-gcm",
        "1.0",
        "key-123",
      );

      expect(metadata.keyId).toBe("key-123");
    });

    it("should optionally include key derivation", () => {
      const metadata = createEncryptionMetadata(
        "aes-256-gcm",
        "1.0",
        "key-456",
        "pbkdf2-hmac-sha256",
      );

      expect(metadata.keyDerivation).toBe("pbkdf2-hmac-sha256");
    });

    it("should validate created metadata", () => {
      const metadata = createEncryptionMetadata("aes-256-gcm", "1.0");
      const validation = validateEncryptionMetadata(metadata);

      expect(validation.valid).toBe(true);
    });
  });

  describe("Schema Constants", () => {
    it("should export ENCRYPTION_SCHEMA", () => {
      expect(ENCRYPTION_SCHEMA).toBeDefined();
      expect(typeof ENCRYPTION_SCHEMA).toBe("object");
      expect(ENCRYPTION_SCHEMA.type).toBe("object");
    });

    it("should export PAYLOAD_SCHEMA", () => {
      expect(PAYLOAD_SCHEMA).toBeDefined();
      expect(typeof PAYLOAD_SCHEMA).toBe("object");
      expect(PAYLOAD_SCHEMA.type).toBe("object");
    });

    it("should export SUPPORTED_ALGORITHMS", () => {
      expect(SUPPORTED_ALGORITHMS).toBeDefined();
      expect(Array.isArray(SUPPORTED_ALGORITHMS)).toBe(true);
      expect(SUPPORTED_ALGORITHMS.includes("aes-256-gcm")).toBe(true);
      expect(SUPPORTED_ALGORITHMS.length).toBeGreaterThan(0);
    });

    it("should export SUPPORTED_KEY_DERIVATIONS", () => {
      expect(SUPPORTED_KEY_DERIVATIONS).toBeDefined();
      expect(Array.isArray(SUPPORTED_KEY_DERIVATIONS)).toBe(true);
      expect(SUPPORTED_KEY_DERIVATIONS.includes("pbkdf2-hmac-sha256")).toBe(
        true,
      );
      expect(SUPPORTED_KEY_DERIVATIONS.length).toBeGreaterThan(0);
    });
  });

  describe("End-to-End Schema Validation", () => {
    it("should validate complete encryption flow schema", () => {
      const config = validateEncryptionConfig({
        algorithm: "aes-256-gcm",
        keyDerivation: "pbkdf2-hmac-sha256",
        iterations: 100000,
      });

      const metadata = createEncryptionMetadata(
        "aes-256-gcm",
        "1.0",
        "key-123",
        "pbkdf2-hmac-sha256",
      );

      const payload = {
        data: "encrypted-ciphertext",
        iv: "initialization-vector",
        authTag: "authentication-tag",
        salt: "random-salt-value",
        algorithm: "aes-256-gcm",
        version: "1.0",
        keyId: "key-123",
        keyDerivation: "pbkdf2-hmac-sha256",
      };

      expect(config.valid).toBe(true);
      expect(validateEncryptionMetadata(metadata).valid).toBe(true);
      expect(validatePayloadSchema(payload).valid).toBe(true);
    });

    it("should support config variations", () => {
      const configs = [
        {
          algorithm: "aes-256-gcm",
          keyDerivation: "pbkdf2-hmac-sha256",
          iterations: 100000,
        },
        {
          algorithm: "aes-256-cbc",
          keyDerivation: "pbkdf2-hmac-sha256",
        },
        {
          algorithm: "aes-256-gcm",
          // Use default key derivation
        },
      ];

      configs.forEach((cfg) => {
        const result = validateEncryptionConfig(cfg);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("Error Handling", () => {
    it("should provide clear error messages", () => {
      const config = {
        algorithm: "invalid",
      };

      const result = validateEncryptionConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(typeof result.errors[0]).toBe("string");
      expect(result.errors[0].length).toBeGreaterThan(0);
    });

    it("should collect multiple errors", () => {
      const config = {
        algorithm: "invalid",
        iterations: 100,
        saltLength: 8,
      };

      const result = validateEncryptionConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle null/undefined configs gracefully", () => {
      expect(() => {
        validateEncryptionConfig(null);
      }).not.toThrow();

      expect(() => {
        validateEncryptionConfig(undefined);
      }).not.toThrow();
    });
  });
});
