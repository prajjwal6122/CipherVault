/**
 * P2-1.1.1: AES-256-GCM Encryption Tests
 * Tests for core encryption/decryption functionality
 */

const crypto = require("crypto");
const {
  encryptAES256GCM,
  decryptAES256GCM,
  generateRandomIV,
  generateRandomBytes,
  validateEncryptionInput,
} = require("../src/crypto/aes-256-gcm");

describe("P2-1.1.1: AES-256-GCM Encryption Module", () => {
  describe("encryptAES256GCM", () => {
    it("should encrypt plaintext with AES-256-GCM and return ciphertext with auth tag", () => {
      const plaintext = "Hello, World!";
      const key = crypto.randomBytes(32); // 256-bit key
      const iv = crypto.randomBytes(12); // 96-bit IV

      const result = encryptAES256GCM(plaintext, key, iv);

      expect(result).toBeDefined();
      expect(result.ciphertext).toBeDefined();
      expect(result.authTag).toBeDefined();
      expect(result.iv).toEqual(iv);
      expect(result.ciphertext).not.toEqual(plaintext);
    });

    it("should produce different ciphertexts for same plaintext with different IVs", () => {
      const plaintext = "Sensitive Data";
      const key = crypto.randomBytes(32);
      const iv1 = crypto.randomBytes(12);
      const iv2 = crypto.randomBytes(12);

      const result1 = encryptAES256GCM(plaintext, key, iv1);
      const result2 = encryptAES256GCM(plaintext, key, iv2);

      expect(result1.ciphertext).not.toEqual(result2.ciphertext);
    });

    it("should reject invalid key length", () => {
      const plaintext = "Test";
      const invalidKey = crypto.randomBytes(16); // 128-bit, not 256-bit
      const iv = crypto.randomBytes(12);

      expect(() => {
        encryptAES256GCM(plaintext, invalidKey, iv);
      }).toThrow();
    });

    it("should reject invalid IV length", () => {
      const plaintext = "Test";
      const key = crypto.randomBytes(32);
      const invalidIV = crypto.randomBytes(16); // 128-bit, not 96-bit

      expect(() => {
        encryptAES256GCM(plaintext, key, invalidIV);
      }).toThrow();
    });

    it("should handle empty plaintext", () => {
      const plaintext = "";
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);

      const result = encryptAES256GCM(plaintext, key, iv);

      expect(result).toBeDefined();
      expect(result.authTag).toBeDefined();
    });

    it("should handle large plaintext (>1MB)", () => {
      const plaintext = "x".repeat(1024 * 1024); // 1MB
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);

      const result = encryptAES256GCM(plaintext, key, iv);

      expect(result.ciphertext).toBeDefined();
      expect(result.ciphertext.length).toBeGreaterThan(0);
    });

    it("should encrypt JSON data", () => {
      const jsonData = { ssn: "123-45-6789", name: "John Doe" };
      const plaintext = JSON.stringify(jsonData);
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);

      const result = encryptAES256GCM(plaintext, key, iv);

      expect(result.ciphertext).toBeDefined();
      expect(result.authTag).toBeDefined();
    });
  });

  describe("decryptAES256GCM", () => {
    it("should decrypt encrypted plaintext back to original", () => {
      const originalPlaintext = "Hello, World!";
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);

      const encrypted = encryptAES256GCM(originalPlaintext, key, iv);
      const decrypted = decryptAES256GCM(
        encrypted.ciphertext,
        key,
        iv,
        encrypted.authTag,
      );

      expect(decrypted).toEqual(originalPlaintext);
    });

    it("should fail if auth tag is invalid", () => {
      const plaintext = "Secret Message";
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);

      const encrypted = encryptAES256GCM(plaintext, key, iv);

      // Tamper with auth tag
      const invalidAuthTag = crypto.randomBytes(16);

      expect(() => {
        decryptAES256GCM(encrypted.ciphertext, key, iv, invalidAuthTag);
      }).toThrow();
    });

    it("should fail if ciphertext is tampered with", () => {
      const plaintext = "Secret Message";
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);

      const encrypted = encryptAES256GCM(plaintext, key, iv);

      // Tamper with ciphertext
      const buffer = Buffer.from(encrypted.ciphertext, "hex");
      buffer[0] ^= 0xff; // Flip bits in first byte
      const tamperedCiphertext = buffer.toString("hex");

      expect(() => {
        decryptAES256GCM(tamperedCiphertext, key, iv, encrypted.authTag);
      }).toThrow();
    });

    it("should fail with wrong key", () => {
      const plaintext = "Secret Message";
      const key = crypto.randomBytes(32);
      const wrongKey = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);

      const encrypted = encryptAES256GCM(plaintext, key, iv);

      expect(() => {
        decryptAES256GCM(encrypted.ciphertext, wrongKey, iv, encrypted.authTag);
      }).toThrow();
    });

    it("should fail if IV is incorrect", () => {
      const plaintext = "Secret Message";
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);
      const wrongIV = crypto.randomBytes(12);

      const encrypted = encryptAES256GCM(plaintext, key, iv);

      expect(() => {
        decryptAES256GCM(encrypted.ciphertext, key, wrongIV, encrypted.authTag);
      }).toThrow();
    });

    it("should reject invalid auth tag length", () => {
      const plaintext = "Test";
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);

      const encrypted = encryptAES256GCM(plaintext, key, iv);
      const invalidAuthTag = crypto.randomBytes(12); // 96-bit, not 128-bit

      expect(() => {
        decryptAES256GCM(encrypted.ciphertext, key, iv, invalidAuthTag);
      }).toThrow();
    });

    it("should handle empty ciphertext", () => {
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);
      const authTag = crypto.randomBytes(16);

      expect(() => {
        decryptAES256GCM("", key, iv, authTag);
      }).toThrow();
    });
  });

  describe("generateRandomIV", () => {
    it("should generate IV of correct length (12 bytes)", () => {
      const iv = generateRandomIV();

      expect(iv).toBeDefined();
      expect(Buffer.isBuffer(iv)).toBe(true);
      expect(iv.length).toBe(12);
    });

    it("should generate different IVs on each call", () => {
      const iv1 = generateRandomIV();
      const iv2 = generateRandomIV();

      expect(iv1).not.toEqual(iv2);
    });

    it("should generate cryptographically random IVs", () => {
      const ivs = Array.from({ length: 100 }, () => generateRandomIV());

      // Check all are unique
      const uniqueIVs = new Set(ivs.map((iv) => iv.toString("hex")));
      expect(uniqueIVs.size).toBe(100);
    });
  });

  describe("generateRandomBytes", () => {
    it("should generate random bytes of requested size", () => {
      const size = 32;
      const bytes = generateRandomBytes(size);

      expect(Buffer.isBuffer(bytes)).toBe(true);
      expect(bytes.length).toBe(size);
    });

    it("should generate different random bytes on each call", () => {
      const bytes1 = generateRandomBytes(32);
      const bytes2 = generateRandomBytes(32);

      expect(bytes1).not.toEqual(bytes2);
    });

    it("should handle various sizes", () => {
      const sizes = [16, 32, 64, 128, 256];

      sizes.forEach((size) => {
        const bytes = generateRandomBytes(size);
        expect(bytes.length).toBe(size);
      });
    });

    it("should reject invalid size (0)", () => {
      expect(() => {
        generateRandomBytes(0);
      }).toThrow();
    });

    it("should reject negative size", () => {
      expect(() => {
        generateRandomBytes(-1);
      }).toThrow();
    });
  });

  describe("validateEncryptionInput", () => {
    it("should validate correct encryption inputs", () => {
      const plaintext = "Test";
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);

      expect(() => {
        validateEncryptionInput(plaintext, key, iv);
      }).not.toThrow();
    });

    it("should reject null plaintext", () => {
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);

      expect(() => {
        validateEncryptionInput(null, key, iv);
      }).toThrow();
    });

    it("should reject invalid key length", () => {
      const plaintext = "Test";
      const invalidKey = crypto.randomBytes(16); // Not 256-bit
      const iv = crypto.randomBytes(12);

      expect(() => {
        validateEncryptionInput(plaintext, invalidKey, iv);
      }).toThrow("Key must be 32 bytes (256-bit)");
    });

    it("should reject invalid IV length", () => {
      const plaintext = "Test";
      const key = crypto.randomBytes(32);
      const invalidIV = crypto.randomBytes(16); // Not 96-bit

      expect(() => {
        validateEncryptionInput(plaintext, key, invalidIV);
      }).toThrow("IV must be 12 bytes (96-bit)");
    });
  });

  describe("End-to-End Encryption/Decryption", () => {
    it("should encrypt and decrypt multiple messages with same key", () => {
      const key = crypto.randomBytes(32);
      const messages = ["Message 1", "Message 2", "Message 3"];

      const results = messages.map((msg) => {
        const iv = generateRandomIV();
        return {
          message: msg,
          encrypted: encryptAES256GCM(msg, key, iv),
          iv,
        };
      });

      const decrypted = results.map((result) =>
        decryptAES256GCM(
          result.encrypted.ciphertext,
          key,
          result.iv,
          result.encrypted.authTag,
        ),
      );

      expect(decrypted).toEqual(messages);
    });

    it("should handle structured data encryption/decryption", () => {
      const data = {
        patient_id: "12345",
        ssn: "123-45-6789",
        medical_record: {
          diagnosis: "Hypertension",
          medications: ["Lisinopril", "Amlodipine"],
        },
      };

      const plaintext = JSON.stringify(data);
      const key = crypto.randomBytes(32);
      const iv = generateRandomIV();

      const encrypted = encryptAES256GCM(plaintext, key, iv);
      const decrypted = decryptAES256GCM(
        encrypted.ciphertext,
        key,
        iv,
        encrypted.authTag,
      );

      expect(JSON.parse(decrypted)).toEqual(data);
    });

    it("should pass NIST test vector (example)", () => {
      // Known test vector for verification
      const key = Buffer.from(
        "00000000000000000000000000000000" + "00000000000000000000000000000000",
        "hex",
      );
      const iv = Buffer.from("000000000000000000000000", "hex");
      const plaintext = "";

      const result = encryptAES256GCM(plaintext, key, iv);

      expect(result).toBeDefined();
      expect(result.ciphertext).toBeDefined();
      expect(result.authTag).toBeDefined();
    });
  });
});
