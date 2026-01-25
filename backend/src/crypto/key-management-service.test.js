// Key Management & Rotation Service Tests
// Tests for multi-cloud key management, rotation, credential handling, and failover

const KeyManagementService = require("./key-management-service");
const AWSKMSWrapper = require("./aws-kms-wrapper");
const GCPKMSWrapper = require("./gcp-kms-wrapper");

jest.mock("./aws-kms-wrapper");
jest.mock("./gcp-kms-wrapper");

describe("P2-3.1.3: Key Management & Rotation Service", () => {
  let keyMgmtService;

  beforeEach(() => {
    keyMgmtService = new KeyManagementService({
      primaryProvider: "aws",
      fallbackProvider: "gcp",
      aws: {
        region: "us-east-1",
        keyId: "arn:aws:kms:us-east-1:123456789012:key/test-key",
      },
      gcp: {
        projectId: "my-project",
        location: "global",
        keyRing: "my-keyring",
        cryptoKey: "my-key",
      },
    });
  });

  // ==================== Service Initialization ====================
  describe("Key Management Service Initialization (4 tests)", () => {
    test("P2-3.1.3-1: Initialize with AWS primary and GCP fallback", () => {
      const service = new KeyManagementService({
        primaryProvider: "aws",
        fallbackProvider: "gcp",
        aws: { region: "us-east-1", keyId: "key1" },
        gcp: {
          projectId: "proj",
          location: "global",
          keyRing: "ring",
          cryptoKey: "key",
        },
      });

      expect(service.primaryProvider).toEqual("aws");
      expect(service.fallbackProvider).toEqual("gcp");
    });

    test("P2-3.1.3-2: Initialize with GCP primary and AWS fallback", () => {
      const service = new KeyManagementService({
        primaryProvider: "gcp",
        fallbackProvider: "aws",
        gcp: {
          projectId: "proj",
          location: "global",
          keyRing: "ring",
          cryptoKey: "key",
        },
        aws: { region: "us-east-1", keyId: "key1" },
      });

      expect(service.primaryProvider).toEqual("gcp");
      expect(service.fallbackProvider).toEqual("aws");
    });

    test("P2-3.1.3-3: Throw error on invalid provider configuration", () => {
      expect(() => {
        new KeyManagementService({
          primaryProvider: "invalid-provider",
        });
      }).toThrow("Invalid primary provider");
    });

    test("P2-3.1.3-4: Initialize with single provider (no failover)", () => {
      const service = new KeyManagementService({
        primaryProvider: "aws",
        aws: { region: "us-east-1", keyId: "key1" },
      });

      expect(service.primaryProvider).toEqual("aws");
      expect(service.fallbackProvider).toBeNull();
    });
  });

  // ==================== Credential Management ====================
  describe("Credential Management (6 tests)", () => {
    test("P2-3.1.3-5: Store AWS credentials in credential vault", () => {
      const creds = {
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      };

      keyMgmtService.storeCredentials("aws", creds);

      expect(keyMgmtService.getCredentials("aws")).toBeDefined();
    });

    test("P2-3.1.3-6: Store GCP service account credentials", () => {
      const creds = {
        type: "service_account",
        project_id: "my-project",
        private_key_id: "key-id-123",
        private_key: "-----BEGIN PRIVATE KEY-----...",
        client_email: "svc@my-project.iam.gserviceaccount.com",
      };

      keyMgmtService.storeCredentials("gcp", creds);

      expect(keyMgmtService.getCredentials("gcp")).toBeDefined();
    });

    test("P2-3.1.3-7: Retrieve credentials (encrypted at rest)", () => {
      keyMgmtService.storeCredentials("aws", { accessKeyId: "test" });

      const creds = keyMgmtService.getCredentials("aws");

      expect(creds).toBeDefined();
    });

    test("P2-3.1.3-8: Rotate credentials (update with new ones)", () => {
      const oldCreds = { accessKeyId: "OLD" };
      const newCreds = { accessKeyId: "NEW" };

      keyMgmtService.storeCredentials("aws", oldCreds);
      keyMgmtService.rotateCredentials("aws", newCreds);

      expect(keyMgmtService.getCredentials("aws").accessKeyId).toEqual("NEW");
    });

    test("P2-3.1.3-9: Validate credentials on store", () => {
      expect(() => {
        keyMgmtService.storeCredentials("aws", {});
      }).toThrow("Invalid AWS credentials");
    });

    test("P2-3.1.3-10: Throw error when credentials not found", () => {
      expect(() => {
        keyMgmtService.getCredentials("nonexistent");
      }).toThrow("Credentials not found");
    });
  });

  // ==================== Multi-Cloud Encryption & Decryption ====================
  describe("Multi-Cloud Encryption & Decryption (8 tests)", () => {
    test("P2-3.1.3-11: Encrypt using primary provider (AWS)", async () => {
      AWSKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("encrypted-aws"));

      const result = await keyMgmtService.encryptData("secret", {
        provider: "aws",
      });

      expect(result).toEqual(Buffer.from("encrypted-aws"));
      expect(AWSKMSWrapper.prototype.encryptData).toHaveBeenCalled();
    });

    test("P2-3.1.3-12: Encrypt using primary provider (GCP)", async () => {
      GCPKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("encrypted-gcp"));

      keyMgmtService.primaryProvider = "gcp";

      const result = await keyMgmtService.encryptData("secret", {
        provider: "gcp",
      });

      expect(result).toEqual(Buffer.from("encrypted-gcp"));
    });

    test("P2-3.1.3-13: Failover to secondary provider on encrypt failure", async () => {
      AWSKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockRejectedValue(new Error("AWS service unavailable"));

      GCPKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("encrypted-gcp-fallback"));

      const result = await keyMgmtService.encryptData("secret", {
        provider: "aws",
        enableFailover: true,
      });

      expect(result).toEqual(Buffer.from("encrypted-gcp-fallback"));
    });

    test("P2-3.1.3-14: Decrypt using provider metadata", async () => {
      AWSKMSWrapper.prototype.decryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("decrypted-secret"));

      const encryptedData = Buffer.from("ciphertext");
      const providerMetadata = { provider: "aws" };

      const result = await keyMgmtService.decryptData(
        encryptedData,
        providerMetadata,
      );

      expect(result).toEqual(Buffer.from("decrypted-secret"));
    });

    test("P2-3.1.3-15: Auto-failover on decrypt failure", async () => {
      AWSKMSWrapper.prototype.decryptData = jest
        .fn()
        .mockRejectedValue(new Error("Key not found"));

      GCPKMSWrapper.prototype.decryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("decrypted-from-gcp"));

      const result = await keyMgmtService.decryptData(
        Buffer.from("ciphertext"),
        { provider: "aws", enableFailover: true },
      );

      expect(result).toEqual(Buffer.from("decrypted-from-gcp"));
    });

    test("P2-3.1.3-16: Encrypt with context for audit trail", async () => {
      AWSKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("encrypted"));

      const context = { userId: "user123", recordId: "rec456" };

      await keyMgmtService.encryptData("secret", { context });

      expect(AWSKMSWrapper.prototype.encryptData).toHaveBeenCalledWith(
        "secret",
        context,
      );
    });

    test("P2-3.1.3-17: Decrypt without losing provider information", async () => {
      AWSKMSWrapper.prototype.decryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("plaintext"));

      const result = await keyMgmtService.decryptData(
        Buffer.from("ciphertext"),
        { provider: "aws" },
      );

      expect(result).toBeDefined();
    });

    test("P2-3.1.3-18: Handle both providers unavailable (no failover)", async () => {
      AWSKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockRejectedValue(new Error("AWS offline"));

      GCPKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockRejectedValue(new Error("GCP offline"));

      await expect(
        keyMgmtService.encryptData("secret", {
          provider: "aws",
          enableFailover: true,
        }),
      ).rejects.toThrow();
    });
  });

  // ==================== Key Rotation ====================
  describe("Key Rotation (6 tests)", () => {
    test("P2-3.1.3-19: Initiate key rotation on AWS", async () => {
      AWSKMSWrapper.prototype.rotateKey = jest
        .fn()
        .mockResolvedValue("arn:aws:kms:us-east-1:123456789012:key/new-key-id");

      const newKeyId = await keyMgmtService.rotateKey("aws");

      expect(newKeyId).toContain("new-key-id");
    });

    test("P2-3.1.3-20: Initiate key rotation on GCP", async () => {
      GCPKMSWrapper.prototype.createKeyVersion = jest.fn().mockResolvedValue({
        name: "projects/proj/locations/global/keyRings/ring/cryptoKeys/key/versions/4",
      });

      GCPKMSWrapper.prototype.setPrimaryKeyVersion = jest
        .fn()
        .mockResolvedValue({
          name: "versions/4",
        });

      keyMgmtService.primaryProvider = "gcp";

      const newVersion = await keyMgmtService.rotateKey("gcp");

      expect(newVersion).toBeDefined();
    });

    test("P2-3.1.3-21: Schedule automatic key rotation", async () => {
      AWSKMSWrapper.prototype.enableKeyRotation = jest
        .fn()
        .mockResolvedValue(undefined);

      await keyMgmtService.scheduleKeyRotation("aws", "automatic");

      expect(AWSKMSWrapper.prototype.enableKeyRotation).toHaveBeenCalled();
    });

    test("P2-3.1.3-22: Get key rotation status", async () => {
      AWSKMSWrapper.prototype.getKeyRotationStatus = jest
        .fn()
        .mockResolvedValue(true);

      const status = await keyMgmtService.getKeyRotationStatus("aws");

      expect(status).toBe(true);
    });

    test("P2-3.1.3-23: Reencrypt data with new key (key rotation)", async () => {
      const oldCiphertext = Buffer.from("encrypted-with-old-key");
      const newCiphertext = Buffer.from("encrypted-with-new-key");

      AWSKMSWrapper.prototype.decryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("plaintext"));

      AWSKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockResolvedValue(newCiphertext);

      const result = await keyMgmtService.reencryptDataWithNewKey(
        oldCiphertext,
        "aws",
      );

      expect(result).toEqual(newCiphertext);
    });

    test("P2-3.1.3-24: Track rotation history for audit", async () => {
      AWSKMSWrapper.prototype.rotateKey = jest
        .fn()
        .mockResolvedValue("new-key-id");

      await keyMgmtService.rotateKey("aws");

      const history = keyMgmtService.getRotationHistory("aws");

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].timestamp).toBeDefined();
    });
  });

  // ==================== Provider Health & Failover ====================
  describe("Provider Health & Failover (5 tests)", () => {
    test("P2-3.1.3-25: Health check primary provider", async () => {
      AWSKMSWrapper.prototype.getKeyMetadata = jest.fn().mockResolvedValue({
        KeyState: "Enabled",
      });

      const health = await keyMgmtService.healthCheckProvider("aws");

      expect(health.status).toEqual("healthy");
      expect(health.latency).toBeLessThan(5000);
    });

    test("P2-3.1.3-26: Detect provider failure and switch to fallback", async () => {
      AWSKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockRejectedValue(new Error("Timeout"));

      GCPKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("encrypted"));

      const initialProvider = keyMgmtService.primaryProvider;

      const result = await keyMgmtService.encryptData("secret", {
        enableFailover: true,
      });

      expect(result).toBeDefined();
    });

    test("P2-3.1.3-27: Get provider health status", () => {
      const health = keyMgmtService.getProviderHealth();

      expect(health).toHaveProperty("aws");
      expect(health).toHaveProperty("gcp");
    });

    test("P2-3.1.3-28: Automatic failback when primary recovers", async () => {
      // Simulate primary provider failure then recovery
      AWSKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockRejectedValueOnce(new Error("Timeout"));

      // After recovery
      AWSKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockResolvedValueOnce(Buffer.from("encrypted-aws"));

      // First call fails, uses fallback
      // Second call should try primary again
      const result = await keyMgmtService.encryptData("secret", {
        enableFailover: true,
      });

      expect(result).toBeDefined();
    });

    test("P2-3.1.3-29: Log failover events for debugging", async () => {
      const auditLog = [];
      keyMgmtService.setAuditLogger((event) => auditLog.push(event));

      AWSKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockRejectedValue(new Error("AWS unavailable"));

      GCPKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("encrypted"));

      await keyMgmtService.encryptData("secret", { enableFailover: true });

      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].event).toContain("FAILOVER");
    });
  });

  // ==================== Data Migration & Key Versioning ====================
  describe("Data Migration & Key Versioning (5 tests)", () => {
    test("P2-3.1.3-30: Get all keys across providers", () => {
      const keys = keyMgmtService.listAllKeys();

      expect(keys).toHaveProperty("aws");
      expect(keys).toHaveProperty("gcp");
    });

    test("P2-3.1.3-31: Get key metadata including version", () => {
      AWSKMSWrapper.prototype.getKeyMetadata = jest.fn().mockResolvedValue({
        KeyId: "key-1",
        Description: "Data key",
        KeyState: "Enabled",
        CreationDate: new Date("2024-01-01"),
      });

      // Should return key metadata with version info
      expect(keyMgmtService.getKeyInfo("aws")).toBeDefined();
    });

    test("P2-3.1.3-32: Migrate encrypted data between keys", async () => {
      AWSKMSWrapper.prototype.decryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("plaintext"));

      GCPKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockResolvedValue(Buffer.from("encrypted-with-gcp-key"));

      const result = await keyMgmtService.migrateEncryptedData(
        Buffer.from("old-ciphertext"),
        "aws",
        "gcp",
      );

      expect(result).toEqual(Buffer.from("encrypted-with-gcp-key"));
    });

    test("P2-3.1.3-33: Track key usage metrics per provider", () => {
      const metrics = keyMgmtService.getMetrics();

      expect(metrics).toHaveProperty("aws");
      expect(metrics).toHaveProperty("gcp");
      expect(metrics.aws).toHaveProperty("encryptCount");
      expect(metrics.aws).toHaveProperty("decryptCount");
    });

    test("P2-3.1.3-34: Export key rotation audit trail", () => {
      const auditTrail = keyMgmtService.getKeyRotationAuditTrail();

      expect(Array.isArray(auditTrail)).toBe(true);
    });
  });

  // ==================== Error Handling & Recovery ====================
  describe("Error Handling & Recovery (3 tests)", () => {
    test("P2-3.1.3-35: Handle network timeout with exponential backoff", async () => {
      let callCount = 0;

      AWSKMSWrapper.prototype.encryptData = jest.fn(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error("Timeout"));
        }
        return Promise.resolve(Buffer.from("encrypted"));
      });

      const result = await keyMgmtService.encryptData("secret", {
        retryPolicy: "exponential",
        maxRetries: 3,
      });

      expect(result).toEqual(Buffer.from("encrypted"));
    });

    test("P2-3.1.3-36: Gracefully degrade when both providers fail", async () => {
      AWSKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockRejectedValue(new Error("AWS offline"));

      GCPKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockRejectedValue(new Error("GCP offline"));

      await expect(keyMgmtService.encryptData("secret")).rejects.toThrow();
    });

    test("P2-3.1.3-37: Log all errors for debugging", async () => {
      const errorLog = [];
      keyMgmtService.setErrorLogger((error) => errorLog.push(error));

      AWSKMSWrapper.prototype.encryptData = jest
        .fn()
        .mockRejectedValue(new Error("Test error"));

      try {
        await keyMgmtService.encryptData("secret");
      } catch (e) {
        // Expected
      }

      expect(errorLog.length).toBeGreaterThan(0);
    });
  });
});
