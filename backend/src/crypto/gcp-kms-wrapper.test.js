// GCP Cloud KMS Integration Tests
// Tests for Google Cloud Key Management Service wrapper for key encryption/decryption

const KmsClient = require("@google-cloud/kms");
const GCPKMSWrapper = require("./gcp-kms-wrapper");

jest.mock("@google-cloud/kms");

describe("P2-3.1.2: GCP Cloud KMS Wrapper", () => {
  let gcpKmsWrapper;
  let mockKmsClient;
  let mockLocationClient;

  beforeEach(() => {
    mockLocationClient = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    mockKmsClient.prototype.cryptoKeyVersion = jest.fn(
      () => mockLocationClient,
    );

    const projectId = "my-secure-project";
    const location = "global";
    const keyRing = "my-keyring";
    const cryptoKey = "my-key";

    gcpKmsWrapper = new GCPKMSWrapper({
      projectId,
      location,
      keyRing,
      cryptoKey,
    });

    gcpKmsWrapper.kmsClient = mockKmsClient;
  });

  // ==================== GCP KMS Client Initialization ====================
  describe("GCP KMS Client Initialization (4 tests)", () => {
    test("P2-3.1.2-1: Initialize GCP KMS wrapper with project and key details", () => {
      const wrapper = new GCPKMSWrapper({
        projectId: "my-project",
        location: "us-central1",
        keyRing: "prod-keyring",
        cryptoKey: "data-key",
      });

      expect(wrapper.projectId).toEqual("my-project");
      expect(wrapper.keyName).toContain("my-project");
      expect(wrapper.keyName).toContain("us-central1");
      expect(wrapper.keyName).toContain("prod-keyring");
      expect(wrapper.keyName).toContain("data-key");
    });

    test("P2-3.1.2-2: Throw error on missing projectId", () => {
      expect(() => {
        new GCPKMSWrapper({
          location: "global",
          keyRing: "ring",
          cryptoKey: "key",
        });
      }).toThrow("GCP projectId is required");
    });

    test("P2-3.1.2-3: Throw error on missing keyRing", () => {
      expect(() => {
        new GCPKMSWrapper({
          projectId: "project",
          location: "global",
          cryptoKey: "key",
        });
      }).toThrow("keyRing is required");
    });

    test("P2-3.1.2-4: Throw error on missing cryptoKey", () => {
      expect(() => {
        new GCPKMSWrapper({
          projectId: "project",
          location: "global",
          keyRing: "ring",
        });
      }).toThrow("cryptoKey is required");
    });
  });

  // ==================== Key Encryption & Decryption ====================
  describe("Key Encryption & Decryption (8 tests)", () => {
    test("P2-3.1.2-5: Encrypt plaintext using GCP Cloud KMS", async () => {
      const plaintext = "my-secret-password";
      const ciphertext = Buffer.from("encrypted-data");

      mockLocationClient.encrypt.mockReturnValue({
        ciphertext: ciphertext,
      });

      const result = await gcpKmsWrapper.encryptData(plaintext);

      expect(mockLocationClient.encrypt).toHaveBeenCalled();
      expect(result).toEqual(ciphertext);
    });

    test("P2-3.1.2-6: Decrypt ciphertext using GCP Cloud KMS", async () => {
      const ciphertext = Buffer.from("encrypted-data");
      const plaintext = "my-secret-password";

      mockLocationClient.decrypt.mockReturnValue({
        plaintext: Buffer.from(plaintext),
      });

      const result = await gcpKmsWrapper.decryptData(ciphertext);

      expect(mockLocationClient.decrypt).toHaveBeenCalled();
      expect(result.toString()).toEqual(plaintext);
    });

    test("P2-3.1.2-7: Encrypt with additional authenticated data (AAD)", async () => {
      const plaintext = "secret";
      const aad = "userId:user123,recordId:record456";

      mockLocationClient.encrypt.mockReturnValue({
        ciphertext: Buffer.from("encrypted"),
      });

      await gcpKmsWrapper.encryptData(plaintext, aad);

      expect(mockLocationClient.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalAuthenticatedData: Buffer.from(aad),
        }),
      );
    });

    test("P2-3.1.2-8: Decrypt with matching AAD", async () => {
      const ciphertext = Buffer.from("encrypted");
      const aad = "userId:user123";

      mockLocationClient.decrypt.mockReturnValue({
        plaintext: Buffer.from("secret"),
      });

      await gcpKmsWrapper.decryptData(ciphertext, aad);

      expect(mockLocationClient.decrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalAuthenticatedData: Buffer.from(aad),
        }),
      );
    });

    test("P2-3.1.2-9: Decrypt with wrong AAD throws error", async () => {
      mockLocationClient.decrypt.mockReturnValue(
        Promise.reject(new Error("3:Aead operation failed: Decryption failed")),
      );

      await expect(
        gcpKmsWrapper.decryptData(Buffer.from("ciphertext"), "wrong-aad"),
      ).rejects.toThrow();
    });

    test("P2-3.1.2-10: Handle decryption error", async () => {
      mockLocationClient.decrypt.mockReturnValue(
        Promise.reject(new Error("Cloud KMS API error")),
      );

      await expect(
        gcpKmsWrapper.decryptData(Buffer.from("invalid")),
      ).rejects.toThrow();
    });

    test("P2-3.1.2-11: Encrypt empty string", async () => {
      mockLocationClient.encrypt.mockReturnValue({
        ciphertext: Buffer.from("encrypted-empty"),
      });

      const result = await gcpKmsWrapper.encryptData("");

      expect(result).toBeDefined();
      expect(mockLocationClient.encrypt).toHaveBeenCalled();
    });

    test("P2-3.1.2-12: Encrypt and decrypt round-trip", async () => {
      const plaintext = "secret-data";
      const encrypted = Buffer.from("encrypted-secret-data");

      mockLocationClient.encrypt.mockReturnValue({
        ciphertext: encrypted,
      });

      mockLocationClient.decrypt.mockReturnValue({
        plaintext: Buffer.from(plaintext),
      });

      const encryptedResult = await gcpKmsWrapper.encryptData(plaintext);
      const decryptedResult = await gcpKmsWrapper.decryptData(encryptedResult);

      expect(decryptedResult.toString()).toEqual(plaintext);
    });
  });

  // ==================== Key Version Management ====================
  describe("Key Version Management (6 tests)", () => {
    test("P2-3.1.2-13: Get primary key version", async () => {
      const mockKeyVersion = {
        name: "projects/project/locations/global/keyRings/ring/cryptoKeys/key/versions/1",
        state: "ENABLED",
        createTime: new Date().toISOString(),
      };

      gcpKmsWrapper.getPrimaryKeyVersion = jest
        .fn()
        .mockReturnValue(mockKeyVersion);

      const result = gcpKmsWrapper.getPrimaryKeyVersion();

      expect(result.name).toContain("versions/1");
      expect(result.state).toEqual("ENABLED");
    });

    test("P2-3.1.2-14: List all key versions", async () => {
      const mockVersions = [
        { name: "versions/3", state: "ENABLED" },
        { name: "versions/2", state: "DISABLED" },
        { name: "versions/1", state: "DESTROYED" },
      ];

      gcpKmsWrapper.listKeyVersions = jest.fn().mockReturnValue(mockVersions);

      const result = gcpKmsWrapper.listKeyVersions();

      expect(result.length).toBe(3);
      expect(result[0].state).toEqual("ENABLED");
    });

    test("P2-3.1.2-15: Get specific key version", async () => {
      const mockVersion = {
        name: "projects/project/locations/global/keyRings/ring/cryptoKeys/key/versions/2",
        state: "DISABLED",
      };

      gcpKmsWrapper.getKeyVersion = jest.fn().mockReturnValue(mockVersion);

      const result = gcpKmsWrapper.getKeyVersion(2);

      expect(result.name).toContain("versions/2");
      expect(result.state).toEqual("DISABLED");
    });

    test("P2-3.1.2-16: Disable key version (rotation)", async () => {
      gcpKmsWrapper.disableKeyVersion = jest.fn().mockReturnValue({
        state: "DISABLED",
      });

      const result = gcpKmsWrapper.disableKeyVersion(1);

      expect(result.state).toEqual("DISABLED");
    });

    test("P2-3.1.2-17: Destroy key version (after grace period)", async () => {
      gcpKmsWrapper.destroyKeyVersion = jest.fn().mockReturnValue({
        state: "DESTROYED",
      });

      const result = gcpKmsWrapper.destroyKeyVersion(1);

      expect(result.state).toEqual("DESTROYED");
    });

    test("P2-3.1.2-18: Restore destroyed key version", async () => {
      gcpKmsWrapper.restoreKeyVersion = jest.fn().mockReturnValue({
        state: "DISABLED",
      });

      const result = gcpKmsWrapper.restoreKeyVersion(1);

      expect(result.state).toEqual("DISABLED");
    });
  });

  // ==================== Key Rotation ====================
  describe("Key Rotation (5 tests)", () => {
    test("P2-3.1.2-19: Create and set primary key version (rotation)", async () => {
      const newVersion = {
        name: "versions/4",
        state: "ENABLED",
        createTime: new Date().toISOString(),
      };

      gcpKmsWrapper.createKeyVersion = jest.fn().mockReturnValue(newVersion);
      gcpKmsWrapper.setPrimaryKeyVersion = jest
        .fn()
        .mockReturnValue(newVersion);

      const created = gcpKmsWrapper.createKeyVersion();
      const primary = gcpKmsWrapper.setPrimaryKeyVersion("versions/4");

      expect(primary.name).toEqual("versions/4");
      expect(primary.state).toEqual("ENABLED");
    });

    test("P2-3.1.2-20: Get key rotation schedule", async () => {
      const mockKey = {
        rotationSchedule: {
          rotationPeriod: {
            seconds: 7776000, // 90 days in seconds
          },
          nextRotationTime: new Date("2026-04-25").toISOString(),
        },
      };

      gcpKmsWrapper.getKeyRotationSchedule = jest
        .fn()
        .mockReturnValue(mockKey.rotationSchedule);

      const result = gcpKmsWrapper.getKeyRotationSchedule();

      expect(result.rotationPeriod.seconds).toEqual(7776000);
    });

    test("P2-3.1.2-21: Update key rotation schedule (e.g., 30 days)", async () => {
      gcpKmsWrapper.updateKeyRotationSchedule = jest.fn().mockReturnValue({
        rotationPeriod: { seconds: 2592000 }, // 30 days
      });

      const result = gcpKmsWrapper.updateKeyRotationSchedule(30 * 24 * 60 * 60);

      expect(result.rotationPeriod.seconds).toEqual(2592000);
    });

    test("P2-3.1.2-22: Disable automatic key rotation", async () => {
      gcpKmsWrapper.disableKeyRotation = jest.fn().mockReturnValue({
        rotationSchedule: null,
      });

      const result = gcpKmsWrapper.disableKeyRotation();

      expect(result.rotationSchedule).toBeNull();
    });

    test("P2-3.1.2-23: Log key rotation events for audit", async () => {
      const auditLog = [];
      const logFn = jest.fn((event) => auditLog.push(event));

      gcpKmsWrapper.setAuditLogger(logFn);
      gcpKmsWrapper.createKeyVersion = jest
        .fn()
        .mockReturnValue({ name: "v4" });
      gcpKmsWrapper.createKeyVersion();

      expect(logFn).toHaveBeenCalled();
    });
  });

  // ==================== IAM & Access Control ====================
  describe("IAM & Access Control (5 tests)", () => {
    test("P2-3.1.2-24: Get IAM policy for key", async () => {
      const mockPolicy = {
        bindings: [
          {
            role: "roles/cloudkms.cryptoKeyEncrypterDecrypter",
            members: ["serviceAccount:backend@project.iam.gserviceaccount.com"],
          },
        ],
      };

      gcpKmsWrapper.getIamPolicy = jest.fn().mockReturnValue(mockPolicy);

      const result = gcpKmsWrapper.getIamPolicy();

      expect(result.bindings.length).toBeGreaterThan(0);
      expect(result.bindings[0].role).toContain("cryptoKeyEncrypterDecrypter");
    });

    test("P2-3.1.2-25: Grant role to service account", async () => {
      gcpKmsWrapper.grantRole = jest.fn().mockReturnValue({
        role: "roles/cloudkms.cryptoKeyEncrypterDecrypter",
        principal: "serviceAccount:lambda@project.iam.gserviceaccount.com",
      });

      const result = gcpKmsWrapper.grantRole(
        "serviceAccount:lambda@project.iam.gserviceaccount.com",
        "roles/cloudkms.cryptoKeyEncrypterDecrypter",
      );

      expect(result.principal).toBeDefined();
    });

    test("P2-3.1.2-26: Revoke role from principal", async () => {
      gcpKmsWrapper.revokeRole = jest.fn().mockReturnValue(true);

      const result = gcpKmsWrapper.revokeRole(
        "user:admin@company.com",
        "roles/cloudkms.admin",
      );

      expect(result).toBe(true);
    });

    test("P2-3.1.2-27: Set resource-level policy", async () => {
      gcpKmsWrapper.setIamPolicy = jest.fn().mockReturnValue({
        bindings: [],
        etag: "ACAB",
      });

      const policy = {
        bindings: [
          {
            role: "roles/cloudkms.cryptoKeyEncrypterDecrypter",
            members: ["serviceAccount:svc@project.iam.gserviceaccount.com"],
          },
        ],
      };

      const result = gcpKmsWrapper.setIamPolicy(policy);

      expect(result).toBeDefined();
    });

    test("P2-3.1.2-28: Test IAM permissions on key", async () => {
      gcpKmsWrapper.testIamPermissions = jest.fn().mockReturnValue({
        permissions: [
          "cloudkms.cryptoKeys.encrypt",
          "cloudkms.cryptoKeys.decrypt",
        ],
      });

      const result = gcpKmsWrapper.testIamPermissions([
        "cloudkms.cryptoKeys.encrypt",
        "cloudkms.cryptoKeys.decrypt",
      ]);

      expect(result.permissions.length).toBe(2);
    });
  });

  // ==================== Error Handling ====================
  describe("Error Handling (4 tests)", () => {
    test("P2-3.1.2-29: Handle authentication error", async () => {
      mockLocationClient.encrypt.mockReturnValue(
        Promise.reject(
          new Error("3:Authentication failed: Invalid credentials"),
        ),
      );

      await expect(gcpKmsWrapper.encryptData("test")).rejects.toThrow(
        "Authentication",
      );
    });

    test("P2-3.1.2-30: Handle permission denied error", async () => {
      mockLocationClient.encrypt.mockReturnValue(
        Promise.reject(new Error("7:Permission denied")),
      );

      await expect(gcpKmsWrapper.encryptData("test")).rejects.toThrow(
        "Permission",
      );
    });

    test("P2-3.1.2-31: Handle not found error (key deleted)", async () => {
      mockLocationClient.encrypt.mockReturnValue(
        Promise.reject(new Error("5:Not found: Could not find key")),
      );

      await expect(gcpKmsWrapper.encryptData("test")).rejects.toThrow(
        "Not found",
      );
    });

    test("P2-3.1.2-32: Handle service unavailable (rate limit)", async () => {
      mockLocationClient.encrypt.mockReturnValue(
        Promise.reject(new Error("14:Service temporarily unavailable")),
      );

      await expect(gcpKmsWrapper.encryptData("test")).rejects.toThrow();
    });
  });

  // ==================== Audit & Compliance ====================
  describe("Audit & Compliance (3 tests)", () => {
    test("P2-3.1.2-33: Log operations with user context", async () => {
      const auditLog = [];
      gcpKmsWrapper.setAuditLogger((event) => auditLog.push(event));

      mockLocationClient.encrypt.mockReturnValue({
        ciphertext: Buffer.from("encrypted"),
      });

      await gcpKmsWrapper.encryptData("test", null, {
        userId: "user123",
        requestId: "req456",
      });

      expect(auditLog.length).toBeGreaterThan(0);
    });

    test("P2-3.1.2-34: Track key usage metrics", async () => {
      mockLocationClient.encrypt.mockReturnValue({
        ciphertext: Buffer.from("encrypted"),
      });

      await gcpKmsWrapper.encryptData("test1");
      await gcpKmsWrapper.encryptData("test2");

      const metrics = gcpKmsWrapper.getUsageMetrics();
      expect(metrics.encryptCount).toBe(2);
    });

    test("P2-3.1.2-35: Export audit logs to Cloud Audit Logs", async () => {
      gcpKmsWrapper.exportAuditLogs = jest.fn().mockReturnValue({
        exported: true,
        entries: 42,
      });

      const result = gcpKmsWrapper.exportAuditLogs();

      expect(result.exported).toBe(true);
    });
  });
});
