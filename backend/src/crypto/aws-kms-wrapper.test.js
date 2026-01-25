// AWS KMS Integration Tests
// Tests for AWS Key Management Service wrapper for key encryption/decryption and rotation

const AWS = require("aws-sdk");
const KMSWrapper = require("./aws-kms-wrapper");

// Mock AWS KMS client
jest.mock("aws-sdk");

describe("P2-3.1.1: AWS KMS Wrapper", () => {
  let kmsWrapper;
  let mockKmsClient;

  beforeEach(() => {
    mockKmsClient = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      generateDataKey: jest.fn(),
      createGrant: jest.fn(),
      scheduleKeyDeletion: jest.fn(),
      getKeyRotationStatus: jest.fn(),
      enableKeyRotation: jest.fn(),
      createKey: jest.fn(),
      createAlias: jest.fn(),
      describeKey: jest.fn(),
      listAliases: jest.fn(),
      listGrants: jest.fn(),
    };

    AWS.KMS = jest.fn(() => mockKmsClient);
    kmsWrapper = new KMSWrapper({
      region: "us-east-1",
      keyId:
        "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
    });
  });

  // ==================== KMS Client Initialization ====================
  describe("KMS Client Initialization (4 tests)", () => {
    test("P2-3.1.1-1: Initialize KMS wrapper with key ID", () => {
      const wrapper = new KMSWrapper({
        region: "us-east-1",
        keyId: "arn:aws:kms:us-east-1:123456789012:key/test-key",
      });

      expect(AWS.KMS).toHaveBeenCalledWith({ region: "us-east-1" });
      expect(wrapper.keyId).toEqual(
        "arn:aws:kms:us-east-1:123456789012:key/test-key",
      );
    });

    test("P2-3.1.1-2: Initialize KMS wrapper with key alias", () => {
      const wrapper = new KMSWrapper({
        region: "us-west-2",
        keyId: "alias/my-data-key",
      });

      expect(wrapper.keyId).toEqual("alias/my-data-key");
    });

    test("P2-3.1.1-3: Throw error on missing region", () => {
      expect(() => {
        new KMSWrapper({ keyId: "test-key" });
      }).toThrow("AWS region is required");
    });

    test("P2-3.1.1-4: Throw error on missing keyId", () => {
      expect(() => {
        new KMSWrapper({ region: "us-east-1" });
      }).toThrow("KMS key ID is required");
    });
  });

  // ==================== Key Encryption & Decryption ====================
  describe("Key Encryption & Decryption (8 tests)", () => {
    test("P2-3.1.1-5: Encrypt plaintext using KMS", async () => {
      const plaintext = "my-secret-password";
      const ciphertext = Buffer.from("encrypted-data");

      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.resolve({
            CiphertextBlob: ciphertext,
            KeyId: kmsWrapper.keyId,
          }),
      });

      const result = await kmsWrapper.encryptData(plaintext);

      expect(mockKmsClient.encrypt).toHaveBeenCalledWith({
        KeyId: kmsWrapper.keyId,
        Plaintext: plaintext,
      });
      expect(result).toEqual(ciphertext);
    });

    test("P2-3.1.1-6: Decrypt ciphertext using KMS", async () => {
      const ciphertext = Buffer.from("encrypted-data");
      const plaintext = "my-secret-password";

      mockKmsClient.decrypt.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Plaintext: Buffer.from(plaintext),
            KeyId: kmsWrapper.keyId,
          }),
      });

      const result = await kmsWrapper.decryptData(ciphertext);

      expect(mockKmsClient.decrypt).toHaveBeenCalledWith({
        CiphertextBlob: ciphertext,
      });
      expect(result).toEqual(plaintext);
    });

    test("P2-3.1.1-7: Encrypt empty string", async () => {
      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.resolve({
            CiphertextBlob: Buffer.from("empty-encrypted"),
          }),
      });

      const result = await kmsWrapper.encryptData("");

      expect(result).toBeDefined();
      expect(mockKmsClient.encrypt).toHaveBeenCalled();
    });

    test("P2-3.1.1-8: Decrypt with invalid ciphertext throws error", async () => {
      mockKmsClient.decrypt.mockReturnValue({
        promise: () =>
          Promise.reject(
            new Error("InvalidCiphertextException: Ciphertext is invalid"),
          ),
      });

      await expect(
        kmsWrapper.decryptData(Buffer.from("invalid")),
      ).rejects.toThrow("InvalidCiphertextException");
    });

    test("P2-3.1.1-9: Handle KMS service error on encrypt", async () => {
      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.reject(
            new Error("The request is not valid for key spec INVALID_SPEC"),
          ),
      });

      await expect(kmsWrapper.encryptData("test")).rejects.toThrow();
    });

    test("P2-3.1.1-10: Encrypt and decrypt round-trip", async () => {
      const plaintext = "secret-data";
      const encrypted = Buffer.from("encrypted-secret-data");

      mockKmsClient.encrypt.mockReturnValue({
        promise: () => Promise.resolve({ CiphertextBlob: encrypted }),
      });

      mockKmsClient.decrypt.mockReturnValue({
        promise: () => Promise.resolve({ Plaintext: Buffer.from(plaintext) }),
      });

      const encryptedResult = await kmsWrapper.encryptData(plaintext);
      const decryptedResult = await kmsWrapper.decryptData(encryptedResult);

      expect(decryptedResult).toEqual(plaintext);
    });

    test("P2-3.1.1-11: Encrypt with encryption context", async () => {
      const plaintext = "password";
      const context = { userId: "user123", recordId: "record456" };

      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.resolve({
            CiphertextBlob: Buffer.from("encrypted"),
          }),
      });

      await kmsWrapper.encryptData(plaintext, context);

      expect(mockKmsClient.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          EncryptionContext: context,
        }),
      );
    });

    test("P2-3.1.1-12: Decrypt with encryption context validation", async () => {
      const ciphertext = Buffer.from("encrypted");
      const context = { userId: "user123" };

      mockKmsClient.decrypt.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Plaintext: Buffer.from("plaintext"),
          }),
      });

      await kmsWrapper.decryptData(ciphertext, context);

      expect(mockKmsClient.decrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          EncryptionContext: context,
        }),
      );
    });
  });

  // ==================== Data Key Generation & Management ====================
  describe("Data Key Generation & Management (6 tests)", () => {
    test("P2-3.1.1-13: Generate plaintext data key", async () => {
      const plainDataKey = Buffer.from("plaintext-key-32-bytes-12345678");
      const encryptedDataKey = Buffer.from("encrypted-key-data");

      mockKmsClient.generateDataKey.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Plaintext: plainDataKey,
            CiphertextBlob: encryptedDataKey,
            KeyId: kmsWrapper.keyId,
          }),
      });

      const result = await kmsWrapper.generateDataKey("AES_256");

      expect(mockKmsClient.generateDataKey).toHaveBeenCalledWith({
        KeyId: kmsWrapper.keyId,
        KeySpec: "AES_256",
      });
      expect(result.plaintext).toEqual(plainDataKey);
      expect(result.encrypted).toEqual(encryptedDataKey);
    });

    test("P2-3.1.1-14: Generate data key with 256-bit length", async () => {
      mockKmsClient.generateDataKey.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Plaintext: Buffer.alloc(32),
            CiphertextBlob: Buffer.from("encrypted"),
          }),
      });

      const result = await kmsWrapper.generateDataKey("AES_256");

      expect(result.plaintext.length).toBe(32);
    });

    test("P2-3.1.1-15: Generate data key with 128-bit length", async () => {
      mockKmsClient.generateDataKey.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Plaintext: Buffer.alloc(16),
            CiphertextBlob: Buffer.from("encrypted"),
          }),
      });

      const result = await kmsWrapper.generateDataKey("AES_128");

      expect(result.plaintext.length).toBe(16);
    });

    test("P2-3.1.1-16: Reencrypt data key with new KMS key", async () => {
      const sourceKey = Buffer.from("encrypted-with-old-key");
      const targetKey = Buffer.from("encrypted-with-new-key");
      const newKeyId = "arn:aws:kms:us-east-1:123456789012:key/new-key-id";

      mockKmsClient.decrypt.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Plaintext: Buffer.from("decrypted-key"),
          }),
      });

      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.resolve({
            CiphertextBlob: targetKey,
          }),
      });

      const result = await kmsWrapper.reencryptDataKey(sourceKey, newKeyId);

      expect(result).toEqual(targetKey);
    });

    test("P2-3.1.1-17: Handle invalid key spec", async () => {
      mockKmsClient.generateDataKey.mockReturnValue({
        promise: () =>
          Promise.reject(
            new Error(
              "1 validation error detected: Value INVALID_SPEC is not valid",
            ),
          ),
      });

      await expect(
        kmsWrapper.generateDataKey("INVALID_SPEC"),
      ).rejects.toThrow();
    });

    test("P2-3.1.1-18: Generate data key without encryption context", async () => {
      mockKmsClient.generateDataKey.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Plaintext: Buffer.alloc(32),
            CiphertextBlob: Buffer.from("encrypted"),
          }),
      });

      const result = await kmsWrapper.generateDataKey("AES_256");

      expect(result).toBeDefined();
      expect(mockKmsClient.generateDataKey).toHaveBeenCalledWith(
        expect.not.objectContaining({ EncryptionContext: expect.anything() }),
      );
    });
  });

  // ==================== Key Rotation & Versioning ====================
  describe("Key Rotation & Versioning (8 tests)", () => {
    test("P2-3.1.1-19: Check if key rotation is enabled", async () => {
      mockKmsClient.getKeyRotationStatus.mockReturnValue({
        promise: () =>
          Promise.resolve({
            KeyRotationEnabled: true,
          }),
      });

      const result = await kmsWrapper.getKeyRotationStatus();

      expect(mockKmsClient.getKeyRotationStatus).toHaveBeenCalledWith({
        KeyId: kmsWrapper.keyId,
      });
      expect(result).toBe(true);
    });

    test("P2-3.1.1-20: Enable key rotation", async () => {
      mockKmsClient.enableKeyRotation.mockReturnValue({
        promise: () => Promise.resolve({}),
      });

      await kmsWrapper.enableKeyRotation();

      expect(mockKmsClient.enableKeyRotation).toHaveBeenCalledWith({
        KeyId: kmsWrapper.keyId,
      });
    });

    test("P2-3.1.1-21: Rotate key manually", async () => {
      const newKeyId = "arn:aws:kms:us-east-1:123456789012:key/new-rotated-key";
      mockKmsClient.createKey.mockReturnValue({
        promise: () =>
          Promise.resolve({
            KeyMetadata: {
              KeyId: newKeyId,
              Arn: newKeyId,
            },
          }),
      });

      const result = await kmsWrapper.rotateKey();

      expect(result).toEqual(newKeyId);
    });

    test("P2-3.1.1-22: Get key metadata including rotation status", async () => {
      mockKmsClient.describeKey.mockReturnValue({
        promise: () =>
          Promise.resolve({
            KeyMetadata: {
              KeyId: kmsWrapper.keyId,
              Description: "Data encryption key",
              KeyState: "Enabled",
              KeyRotationEnabled: true,
              CreationDate: new Date("2024-01-01"),
            },
          }),
      });

      const result = await kmsWrapper.getKeyMetadata();

      expect(result.KeyRotationEnabled).toBe(true);
      expect(result.KeyState).toEqual("Enabled");
    });

    test("P2-3.1.1-23: Schedule key deletion (grace period)", async () => {
      mockKmsClient.scheduleKeyDeletion.mockReturnValue({
        promise: () =>
          Promise.resolve({
            KeyId: kmsWrapper.keyId,
            DeletionDate: new Date(),
          }),
      });

      const result = await kmsWrapper.scheduleKeyDeletion(7);

      expect(mockKmsClient.scheduleKeyDeletion).toHaveBeenCalledWith({
        KeyId: kmsWrapper.keyId,
        PendingWindowInDays: 7,
      });
      expect(result.DeletionDate).toBeDefined();
    });

    test("P2-3.1.1-24: List key grants for auditing", async () => {
      mockKmsClient.listGrants.mockReturnValue({
        promise: () =>
          Promise.resolve({
            Grants: [
              {
                GrantId: "grant-001",
                GranteePrincipal: "arn:aws:iam::123456789012:role/service-role",
                Operations: ["Encrypt", "Decrypt"],
                CreationDate: new Date("2024-01-01"),
              },
            ],
          }),
      });

      const result = await kmsWrapper.listKeyGrants();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].GrantId).toBeDefined();
    });

    test("P2-3.1.1-25: Create grant for service principal", async () => {
      const grantId = "grant-new-12345";
      mockKmsClient.createGrant.mockReturnValue({
        promise: () =>
          Promise.resolve({
            GrantId: grantId,
            GrantToken: "grant-token-12345",
          }),
      });

      const result = await kmsWrapper.createGrant(
        "arn:aws:iam::123456789012:role/lambda-role",
        ["Decrypt", "GenerateDataKey"],
      );

      expect(result.GrantId).toEqual(grantId);
      expect(mockKmsClient.createGrant).toHaveBeenCalled();
    });
  });

  // ==================== Error Handling & Edge Cases ====================
  describe("Error Handling & Edge Cases (6 tests)", () => {
    test("P2-3.1.1-26: Handle network timeout", async () => {
      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.reject(
            new Error("Network timeout connecting to KMS service"),
          ),
      });

      await expect(kmsWrapper.encryptData("test")).rejects.toThrow();
    });

    test("P2-3.1.1-27: Handle insufficient permissions", async () => {
      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.reject(
            new Error(
              "User: arn:aws:iam::123456789012:user/test is not authorized",
            ),
          ),
      });

      await expect(kmsWrapper.encryptData("test")).rejects.toThrow(
        "is not authorized",
      );
    });

    test("P2-3.1.1-28: Handle key not found", async () => {
      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.reject(
            new Error(
              "NotFoundException: Key 'arn:aws:kms:us-east-1:123456789012:key/invalid' does not exist",
            ),
          ),
      });

      await expect(kmsWrapper.encryptData("test")).rejects.toThrow(
        "NotFoundException",
      );
    });

    test("P2-3.1.1-29: Handle throttling (rate limit exceeded)", async () => {
      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.reject(new Error("ThrottlingException: Rate exceeded")),
      });

      await expect(kmsWrapper.encryptData("test")).rejects.toThrow(
        "ThrottlingException",
      );
    });

    test("P2-3.1.1-30: Handle invalid AWS credentials", async () => {
      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.reject(
            new Error(
              "InvalidSignatureException: The request signature could not be verified",
            ),
          ),
      });

      await expect(kmsWrapper.encryptData("test")).rejects.toThrow();
    });

    test("P2-3.1.1-31: Handle CMK in disabled state", async () => {
      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.reject(new Error("DisabledException: Key is disabled")),
      });

      await expect(kmsWrapper.encryptData("test")).rejects.toThrow(
        "DisabledException",
      );
    });
  });

  // ==================== Encryption Context & Audit ====================
  describe("Encryption Context & Audit (4 tests)", () => {
    test("P2-3.1.1-32: Store encryption context for audit trail", async () => {
      const context = {
        userId: "user-123",
        recordId: "record-456",
        purpose: "data-encryption",
      };

      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.resolve({
            CiphertextBlob: Buffer.from("encrypted"),
          }),
      });

      await kmsWrapper.encryptData("test", context);

      expect(mockKmsClient.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          EncryptionContext: context,
        }),
      );
    });

    test("P2-3.1.1-33: Encryption context required for decrypt", async () => {
      const context = { userId: "user-123" };

      mockKmsClient.decrypt.mockReturnValue({
        promise: () =>
          Promise.reject(
            new Error(
              "InvalidCiphertextException: Encryption context does not match",
            ),
          ),
      });

      await expect(
        kmsWrapper.decryptData(Buffer.from("encrypted"), context),
      ).rejects.toThrow();
    });

    test("P2-3.1.1-34: Log encryption operations for compliance", async () => {
      const auditLog = [];
      const logFn = jest.fn((operation) => {
        auditLog.push(operation);
      });

      kmsWrapper.setAuditLogger(logFn);

      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.resolve({
            CiphertextBlob: Buffer.from("encrypted"),
          }),
      });

      await kmsWrapper.encryptData("test");

      expect(logFn).toHaveBeenCalled();
    });

    test("P2-3.1.1-35: Track key usage metrics", async () => {
      mockKmsClient.encrypt.mockReturnValue({
        promise: () =>
          Promise.resolve({
            CiphertextBlob: Buffer.from("encrypted"),
          }),
      });

      await kmsWrapper.encryptData("test");
      await kmsWrapper.encryptData("test2");

      const metrics = kmsWrapper.getUsageMetrics();
      expect(metrics.encryptCount).toBeGreaterThanOrEqual(2);
    });
  });
});
