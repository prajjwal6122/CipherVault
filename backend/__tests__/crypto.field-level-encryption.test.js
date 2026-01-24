/**
 * P2-1.1.5: JSON Payload Field-Level Encryption Tests
 * Tests for selective field encryption/decryption in JSON objects
 */

const {
  FieldLevelEncryption,
  encryptField,
  decryptField,
  encryptFields,
  decryptFields,
  maskField,
  getEncryptedFields,
  validateFieldPath,
  mergeEncryptedPayload,
  extractEncryptedFields,
} = require("../src/crypto/field-level-encryption");

const {
  deriveKeyFromPassword,
  generateSalt,
} = require("../src/crypto/pbkdf2-keyder");

const {
  encryptAES256GCM,
  decryptAES256GCM,
  generateRandomIV,
} = require("../src/crypto/aes-256-gcm");

describe("P2-1.1.5: JSON Payload Field-Level Encryption", () => {
  let encryptor;
  let testKey;
  let testIV;
  let testPassword;
  let testSalt;

  beforeEach(() => {
    encryptor = new FieldLevelEncryption();
    testPassword = "TestPassword123!@#";
    testSalt = generateSalt();
    testKey = deriveKeyFromPassword(testPassword, testSalt);
    testIV = generateRandomIV();
  });

  describe("FieldLevelEncryption Class", () => {
    it("should instantiate encryptor", () => {
      expect(encryptor).toBeDefined();
      expect(typeof encryptor.encryptField).toBe("function");
      expect(typeof encryptor.decryptField).toBe("function");
      expect(typeof encryptor.encryptFields).toBe("function");
      expect(typeof encryptor.decryptFields).toBe("function");
    });

    it("should have default configuration", () => {
      expect(encryptor.config).toBeDefined();
      expect(encryptor.config.algorithm).toBe("aes-256-gcm");
      expect(encryptor.config.keyDerivation).toBe("pbkdf2-hmac-sha256");
    });

    it("should allow custom configuration", () => {
      const config = {
        algorithm: "aes-256-cbc",
        keyDerivation: "pbkdf2-hmac-sha512",
      };
      const customEncryptor = new FieldLevelEncryption(config);
      expect(customEncryptor.config.algorithm).toBe("aes-256-cbc");
      expect(customEncryptor.config.keyDerivation).toBe("pbkdf2-hmac-sha512");
    });
  });

  describe("encryptField", () => {
    it("should encrypt a simple string field", () => {
      const payload = { ssn: "123-45-6789" };
      const result = encryptor.encryptField(payload, "ssn", testKey, testIV);

      expect(result).toBeDefined();
      expect(result.encrypted).toBeDefined();
      expect(result.encrypted.ssn).toBeDefined();
      expect(result.encrypted.ssn.data).toBeDefined();
      expect(result.encrypted.ssn.iv).toBeDefined();
      expect(result.encrypted.ssn.authTag).toBeDefined();
    });

    it("should encrypt numeric field", () => {
      const payload = { medicalId: 987654321 };
      const result = encryptor.encryptField(
        payload,
        "medicalId",
        testKey,
        testIV,
      );

      expect(result.encrypted.medicalId.data).toBeDefined();
    });

    it("should encrypt nested field with dot notation", () => {
      const payload = {
        patient: {
          ssn: "123-45-6789",
          name: "John Doe",
        },
      };

      const result = encryptor.encryptField(
        payload,
        "patient.ssn",
        testKey,
        testIV,
      );

      expect(result.encrypted["patient.ssn"]).toBeDefined();
      expect(payload.patient.ssn).toBe("123-45-6789"); // Original unchanged
    });

    it("should encrypt deeply nested field", () => {
      const payload = {
        data: {
          patient: {
            medical: {
              ssn: "123-45-6789",
            },
          },
        },
      };

      const result = encryptor.encryptField(
        payload,
        "data.patient.medical.ssn",
        testKey,
        testIV,
      );

      expect(result.encrypted["data.patient.medical.ssn"]).toBeDefined();
    });

    it("should include metadata in encrypted field", () => {
      const payload = { ssn: "123-45-6789" };
      const result = encryptor.encryptField(payload, "ssn", testKey, testIV);

      expect(result.encrypted.ssn.algorithm).toBe("aes-256-gcm");
      expect(result.encrypted.ssn.version).toBe("1.0");
      expect(result.encrypted.ssn.timestamp).toBeDefined();
    });

    it("should reject invalid field path", () => {
      const payload = { ssn: "123-45-6789" };

      expect(() => {
        encryptor.encryptField(payload, "nonexistent.field", testKey, testIV);
      }).toThrow();
    });

    it("should reject missing key", () => {
      const payload = { ssn: "123-45-6789" };

      expect(() => {
        encryptor.encryptField(payload, "ssn", null, testIV);
      }).toThrow();
    });
  });

  describe("decryptField", () => {
    it("should decrypt encrypted field", () => {
      const originalPayload = { ssn: "123-45-6789" };
      const encrypted = encryptor.encryptField(
        originalPayload,
        "ssn",
        testKey,
        testIV,
      );

      const decrypted = encryptor.decryptField(
        encrypted.encrypted.ssn,
        "ssn",
        testKey,
      );

      expect(decrypted).toBe("123-45-6789");
    });

    it("should decrypt nested field", () => {
      const originalPayload = {
        patient: { ssn: "123-45-6789" },
      };

      const encrypted = encryptor.encryptField(
        originalPayload,
        "patient.ssn",
        testKey,
        testIV,
      );

      const decrypted = encryptor.decryptField(
        encrypted.encrypted["patient.ssn"],
        "patient.ssn",
        testKey,
      );

      expect(decrypted).toBe("123-45-6789");
    });

    it("should decrypt numeric field", () => {
      const originalPayload = { medicalId: 987654321 };
      const encrypted = encryptor.encryptField(
        originalPayload,
        "medicalId",
        testKey,
        testIV,
      );

      const decrypted = encryptor.decryptField(
        encrypted.encrypted.medicalId,
        "medicalId",
        testKey,
      );

      expect(parseInt(decrypted, 10)).toBe(987654321);
    });

    it("should fail on tampered ciphertext", () => {
      const originalPayload = { ssn: "123-45-6789" };
      const encrypted = encryptor.encryptField(
        originalPayload,
        "ssn",
        testKey,
        testIV,
      );

      // Tamper with ciphertext
      encrypted.encrypted.ssn.data = "tampereddata";

      expect(() => {
        encryptor.decryptField(encrypted.encrypted.ssn, "ssn", testKey);
      }).toThrow();
    });

    it("should fail with wrong key", () => {
      const originalPayload = { ssn: "123-45-6789" };
      const encrypted = encryptor.encryptField(
        originalPayload,
        "ssn",
        testKey,
        testIV,
      );

      const wrongKey = deriveKeyFromPassword("WrongPassword", testSalt);

      expect(() => {
        encryptor.decryptField(encrypted.encrypted.ssn, "ssn", wrongKey);
      }).toThrow();
    });
  });

  describe("encryptFields", () => {
    it("should encrypt multiple fields", () => {
      const payload = {
        ssn: "123-45-6789",
        name: "John Doe",
        medicalId: 987654321,
      };

      const result = encryptor.encryptFields(
        payload,
        ["ssn", "medicalId"],
        testKey,
        testIV,
      );

      expect(result.encrypted.ssn).toBeDefined();
      expect(result.encrypted.medicalId).toBeDefined();
      expect(result.encrypted.name).toBeUndefined(); // Not encrypted
    });

    it("should encrypt nested fields", () => {
      const payload = {
        patient: {
          ssn: "123-45-6789",
          contact: {
            phone: "555-1234",
          },
        },
      };

      const result = encryptor.encryptFields(
        payload,
        ["patient.ssn", "patient.contact.phone"],
        testKey,
        testIV,
      );

      expect(result.encrypted["patient.ssn"]).toBeDefined();
      expect(result.encrypted["patient.contact.phone"]).toBeDefined();
    });

    it("should handle mixed encrypted and plain fields", () => {
      const payload = {
        id: 123,
        ssn: "123-45-6789",
        name: "John Doe",
        medicalId: 987654,
      };

      const result = encryptor.encryptFields(
        payload,
        ["ssn", "medicalId"],
        testKey,
        testIV,
      );

      expect(result.encrypted.ssn).toBeDefined();
      expect(result.encrypted.medicalId).toBeDefined();
      expect(result.plaintext.id).toBe(123);
      expect(result.plaintext.name).toBe("John Doe");
    });

    it("should return metadata for encrypted fields", () => {
      const payload = {
        ssn: "123-45-6789",
        medicalId: 987654,
      };

      const result = encryptor.encryptFields(
        payload,
        ["ssn", "medicalId"],
        testKey,
        testIV,
      );

      expect(result.metadata).toBeDefined();
      expect(result.metadata.encryptedFields).toContain("ssn");
      expect(result.metadata.encryptedFields).toContain("medicalId");
    });
  });

  describe("decryptFields", () => {
    it("should decrypt multiple fields", () => {
      const originalPayload = {
        ssn: "123-45-6789",
        name: "John Doe",
        medicalId: 987654321,
      };

      const encrypted = encryptor.encryptFields(
        originalPayload,
        ["ssn", "medicalId"],
        testKey,
        testIV,
      );

      const decrypted = encryptor.decryptFields(encrypted, testKey);

      expect(decrypted.ssn).toBe("123-45-6789");
      expect(decrypted.medicalId).toBe("987654321");
      expect(decrypted.name).toBe("John Doe");
    });

    it("should decrypt nested fields", () => {
      const originalPayload = {
        patient: {
          ssn: "123-45-6789",
          contact: {
            phone: "555-1234",
          },
        },
      };

      const encrypted = encryptor.encryptFields(
        originalPayload,
        ["patient.ssn", "patient.contact.phone"],
        testKey,
        testIV,
      );

      const decrypted = encryptor.decryptFields(encrypted, testKey);

      expect(decrypted["patient.ssn"]).toBe("123-45-6789");
      expect(decrypted["patient.contact.phone"]).toBe("555-1234");
    });

    it("should merge plaintext and decrypted fields", () => {
      const originalPayload = {
        id: 123,
        ssn: "123-45-6789",
        name: "John Doe",
      };

      const encrypted = encryptor.encryptFields(
        originalPayload,
        ["ssn"],
        testKey,
        testIV,
      );

      const decrypted = encryptor.decryptFields(encrypted, testKey);

      expect(decrypted.id).toBe(123);
      expect(decrypted.name).toBe("John Doe");
      expect(decrypted.ssn).toBe("123-45-6789");
    });
  });

  describe("maskField", () => {
    it("should mask string field with asterisks", () => {
      const payload = { ssn: "123-45-6789" };
      const masked = encryptor.maskField(payload, "ssn");

      expect(masked.masked.ssn).toBe("***-**-****");
    });

    it("should mask field keeping first and last characters", () => {
      const payload = { ssn: "123-45-6789" };
      const masked = encryptor.maskField(payload, "ssn", {
        keepFirst: 1,
        keepLast: 1,
        maskChar: "*",
      });

      expect(masked.masked.ssn).toMatch(/^1.*9$/);
    });

    it("should mask numeric field", () => {
      const payload = { medicalId: 987654321 };
      const masked = encryptor.maskField(payload, "medicalId");

      expect(masked.masked.medicalId).toBe("*********"); // All digits masked
    });

    it("should support custom mask character", () => {
      const payload = { ssn: "123-45-6789" };
      const masked = encryptor.maskField(payload, "ssn", { maskChar: "#" });

      expect(masked.masked.ssn).toBe("###-##-####");
    });

    it("should mask nested field", () => {
      const payload = {
        patient: { ssn: "123-45-6789" },
      };

      const masked = encryptor.maskField(payload, "patient.ssn");

      expect(masked.masked["patient.ssn"]).toBe("***-**-****");
    });
  });

  describe("validateFieldPath", () => {
    it("should validate existing field path", () => {
      const payload = {
        patient: {
          ssn: "123-45-6789",
        },
      };

      const isValid = validateFieldPath(payload, "patient.ssn");
      expect(isValid).toBe(true);
    });

    it("should reject non-existent field path", () => {
      const payload = {
        patient: {
          ssn: "123-45-6789",
        },
      };

      const isValid = validateFieldPath(payload, "patient.invalid");
      expect(isValid).toBe(false);
    });

    it("should validate top-level field", () => {
      const payload = { ssn: "123-45-6789" };

      const isValid = validateFieldPath(payload, "ssn");
      expect(isValid).toBe(true);
    });

    it("should validate deeply nested field", () => {
      const payload = {
        data: {
          patient: {
            medical: {
              ssn: "123-45-6789",
            },
          },
        },
      };

      const isValid = validateFieldPath(payload, "data.patient.medical.ssn");
      expect(isValid).toBe(true);
    });
  });

  describe("getEncryptedFields", () => {
    it("should return list of encrypted fields", () => {
      const originalPayload = {
        ssn: "123-45-6789",
        name: "John Doe",
        medicalId: 987654321,
      };

      const encrypted = encryptor.encryptFields(
        originalPayload,
        ["ssn", "medicalId"],
        testKey,
        testIV,
      );

      const encryptedFields = getEncryptedFields(encrypted);

      expect(encryptedFields).toContain("ssn");
      expect(encryptedFields).toContain("medicalId");
      expect(encryptedFields).not.toContain("name");
    });

    it("should handle nested encrypted fields", () => {
      const originalPayload = {
        patient: {
          ssn: "123-45-6789",
          contact: {
            phone: "555-1234",
          },
        },
      };

      const encrypted = encryptor.encryptFields(
        originalPayload,
        ["patient.ssn", "patient.contact.phone"],
        testKey,
        testIV,
      );

      const encryptedFields = getEncryptedFields(encrypted);

      expect(encryptedFields).toContain("patient.ssn");
      expect(encryptedFields).toContain("patient.contact.phone");
    });
  });

  describe("mergeEncryptedPayload", () => {
    it("should merge plaintext and encrypted fields", () => {
      const plaintext = { id: 123, name: "John Doe" };
      const encrypted = {
        ssn: {
          data: "encryptedssn",
          iv: "ivvalue",
          authTag: "authtag",
        },
      };

      const merged = mergeEncryptedPayload(plaintext, encrypted);

      expect(merged.id).toBe(123);
      expect(merged.name).toBe("John Doe");
      expect(merged.ssn).toBeDefined();
      expect(merged.ssn.data).toBe("encryptedssn");
    });

    it("should preserve plaintext priority on conflicts", () => {
      const plaintext = { field: "plaintext_value" };
      const encrypted = { field: { data: "encrypted" } };

      const merged = mergeEncryptedPayload(plaintext, encrypted);

      expect(merged.field).toBe("plaintext_value");
    });
  });

  describe("extractEncryptedFields", () => {
    it("should extract encrypted fields from payload", () => {
      const payload = {
        id: 123,
        name: "John Doe",
        ssn: {
          data: "encryptedssn",
          iv: "ivvalue",
          authTag: "authtag",
          algorithm: "aes-256-gcm",
        },
      };

      const encrypted = extractEncryptedFields(payload);

      expect(encrypted.ssn).toBeDefined();
      expect(encrypted.ssn.data).toBe("encryptedssn");
      expect(encrypted.id).toBeUndefined();
      expect(encrypted.name).toBeUndefined();
    });

    it("should identify encrypted field structure", () => {
      const payload = {
        ssn: {
          data: "x",
          iv: "y",
          authTag: "z",
          algorithm: "aes-256-gcm",
        },
        name: "John",
      };

      const encrypted = extractEncryptedFields(payload);

      expect(Object.keys(encrypted)).toContain("ssn");
      expect(Object.keys(encrypted)).not.toContain("name");
    });
  });

  describe("End-to-End Workflows", () => {
    it("should encrypt and decrypt complete health record", () => {
      const healthRecord = {
        recordId: "REC-001",
        patientName: "John Doe",
        ssn: "123-45-6789",
        dateOfBirth: "1990-01-01",
        medicalHistory: {
          allergies: ["Peanuts"],
          ssn: "123-45-6789", // Nested sensitive field
        },
      };

      // Encrypt sensitive fields
      const encrypted = encryptor.encryptFields(
        healthRecord,
        ["ssn", "medicalHistory.ssn", "dateOfBirth"],
        testKey,
        testIV,
      );

      // Decrypt sensitive fields
      const decrypted = encryptor.decryptFields(encrypted, testKey);

      expect(decrypted.recordId).toBe("REC-001");
      expect(decrypted.patientName).toBe("John Doe");
      expect(decrypted.ssn).toBe("123-45-6789");
      expect(decrypted["medicalHistory.ssn"]).toBe("123-45-6789");
      expect(decrypted.dateOfBirth).toBe("1990-01-01");
    });

    it("should support password-based encryption of record", () => {
      const record = {
        id: 1,
        ssn: "123-45-6789",
        name: "John Doe",
      };

      // Encrypt with password
      const encrypted = encryptor.encryptFields(
        record,
        ["ssn"],
        testKey,
        testIV,
      );

      // Decrypt with same password/salt
      const decrypted = encryptor.decryptFields(encrypted, testKey);

      expect(decrypted.ssn).toBe("123-45-6789");
      expect(decrypted.name).toBe("John Doe");
    });

    it("should support masking for display before decryption", () => {
      const encrypted = {
        encrypted: {
          ssn: {
            data: "encrypteddata",
            iv: "iv",
            authTag: "tag",
            algorithm: "aes-256-gcm",
          },
        },
        plaintext: {
          id: 1,
          name: "John Doe",
        },
        metadata: {
          encryptedFields: ["ssn"],
        },
      };

      const masked = encryptor.maskField({ ssn: "123-45-6789" }, "ssn");

      expect(masked.masked.ssn).toBe("***-**-****");
    });
  });

  describe("Error Handling", () => {
    it("should handle empty field path", () => {
      const payload = { ssn: "123-45-6789" };

      expect(() => {
        encryptor.encryptField(payload, "", testKey, testIV);
      }).toThrow();
    });

    it("should handle null payload", () => {
      expect(() => {
        encryptor.encryptField(null, "field", testKey, testIV);
      }).toThrow();
    });

    it("should handle invalid IV", () => {
      const payload = { ssn: "123-45-6789" };

      expect(() => {
        encryptor.encryptField(payload, "ssn", testKey, Buffer.from("short"));
      }).toThrow();
    });

    it("should provide clear error messages", () => {
      const payload = { ssn: "123-45-6789" };

      try {
        encryptor.encryptField(payload, "nonexistent", testKey, testIV);
        fail("Should have thrown");
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Performance", () => {
    it("should encrypt multiple fields efficiently", () => {
      const payload = {
        field1: "value1",
        field2: "value2",
        field3: "value3",
        field4: "value4",
        field5: "value5",
      };

      const start = Date.now();
      const encrypted = encryptor.encryptFields(
        payload,
        ["field1", "field2", "field3", "field4", "field5"],
        testKey,
        testIV,
      );
      const duration = Date.now() - start;

      expect(encrypted.encrypted.field1).toBeDefined();
      expect(duration).toBeLessThan(500); // Should be fast
    });

    it("should decrypt multiple fields efficiently", () => {
      const payload = {
        field1: "value1",
        field2: "value2",
        field3: "value3",
      };

      const encrypted = encryptor.encryptFields(
        payload,
        ["field1", "field2", "field3"],
        testKey,
        testIV,
      );

      const start = Date.now();
      const decrypted = encryptor.decryptFields(encrypted, testKey);
      const duration = Date.now() - start;

      expect(decrypted.field1).toBe("value1");
      expect(duration).toBeLessThan(500);
    });
  });

  describe("Security", () => {
    it("should not expose encrypted field values in ciphertext", () => {
      const payload = { ssn: "123-45-6789" };
      const encrypted = encryptor.encryptFields(
        payload,
        ["ssn"],
        testKey,
        testIV,
      );

      // Check ciphertext doesn't contain plaintext SSN value
      const encrypted_str = JSON.stringify(encrypted.encrypted.ssn.data);
      expect(encrypted_str).not.toContain("123");
      expect(encrypted_str).not.toContain("6789");
    });

    it("should generate unique IVs for same field", () => {
      const payload = { ssn: "123-45-6789" };

      const result1 = encryptor.encryptField(
        payload,
        "ssn",
        testKey,
        generateRandomIV(),
      );
      const result2 = encryptor.encryptField(
        payload,
        "ssn",
        testKey,
        generateRandomIV(),
      );

      expect(result1.encrypted.ssn.data).not.toBe(result2.encrypted.ssn.data);
    });

    it("should validate auth tag before decryption", () => {
      const payload = { ssn: "123-45-6789" };
      const encrypted = encryptor.encryptField(payload, "ssn", testKey, testIV);

      encrypted.encrypted.ssn.authTag = "invalideauthtag";

      expect(() => {
        encryptor.decryptField(encrypted.encrypted.ssn, "ssn", testKey);
      }).toThrow();
    });
  });
});
