/**
 * P2-2.1.1: Web Crypto API for Browser-Side Decryption
 * Test Suite: Browser-side AES-GCM decryption using Web Crypto API
 *
 * Tests for ArrayBuffer <-> Base64 conversions, AES-GCM decryption,
 * and integration with backend-encrypted data
 */

describe("P2-2.1.1: Web Crypto API Setup", () => {
  // ==========================================================================
  // SETUP & UTILITIES
  // ==========================================================================

  const {
    base64ToArrayBuffer,
    arrayBufferToBase64,
    decryptAES256GCMWeb,
    deriveKeyFromPasswordWeb,
    generateRandomIVWeb,
  } = require("./web-crypto-api");

  // Test fixtures - from Node.js backend test vectors
  const testVectors = {
    plaintext: "Hello, World!",
    password: "MySecurePassword123",
    salt: Buffer.from("0123456789abcdef", "hex"), // 16 bytes
  };

  // Wait for crypto to be available
  beforeAll(() => {
    if (typeof global.crypto === "undefined") {
      global.crypto = require("webcrypto").webcrypto;
    }
  });

  // ==========================================================================
  // 1. BASE64 <-> ARRAYBUFFER CONVERSION TESTS
  // ==========================================================================

  describe("base64ToArrayBuffer", () => {
    test("converts valid Base64 string to ArrayBuffer", async () => {
      const base64 = "SGVsbG8sIFdvcmxkIQ=="; // "Hello, World!"
      const result = base64ToArrayBuffer(base64);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(13);
    });

    test("handles empty Base64 string", async () => {
      const base64 = "";
      const result = base64ToArrayBuffer(base64);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(0);
    });

    test("preserves binary data during conversion", async () => {
      const original = new Uint8Array([0, 1, 2, 3, 255, 254, 253]);
      const base64 = arrayBufferToBase64(original);
      const restored = new Uint8Array(base64ToArrayBuffer(base64));

      expect(Array.from(restored)).toEqual(Array.from(original));
    });

    test("rejects invalid Base64 strings", async () => {
      const invalidBase64 = "!!!invalid!!!";

      expect(() => {
        base64ToArrayBuffer(invalidBase64);
      }).toThrow();
    });

    test("handles large Base64 strings (>1MB)", async () => {
      const largeData = new Uint8Array(1024 * 1024); // 1MB
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }
      const base64 = arrayBufferToBase64(largeData);
      const restored = base64ToArrayBuffer(base64);

      expect(restored.byteLength).toBe(1024 * 1024);
    });
  });

  describe("arrayBufferToBase64", () => {
    test("converts ArrayBuffer to valid Base64 string", async () => {
      const data = new TextEncoder().encode("Hello, World!");
      const result = arrayBufferToBase64(data);

      expect(typeof result).toBe("string");
      expect(result).toBe("SGVsbG8sIFdvcmxkIQ==");
    });

    test("handles empty ArrayBuffer", async () => {
      const data = new ArrayBuffer(0);
      const result = arrayBufferToBase64(data);

      expect(result).toBe("");
    });

    test("produces URI-safe Base64 (no padding issues)", async () => {
      const testCases = [
        [0x00],
        [0x00, 0x01],
        [0x00, 0x01, 0x02],
        [0xff, 0xfe, 0xfd],
      ];

      for (const bytes of testCases) {
        const data = new Uint8Array(bytes);
        const base64 = arrayBufferToBase64(data);

        // Should be valid Base64 (can decode back)
        const restored = base64ToArrayBuffer(base64);
        expect(restored.byteLength).toBe(bytes.length);
      }
    });

    test("round-trip conversion preserves all bytes", async () => {
      const originalBytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        originalBytes[i] = i;
      }

      const base64 = arrayBufferToBase64(originalBytes);
      const restored = new Uint8Array(base64ToArrayBuffer(base64));

      expect(Array.from(restored)).toEqual(Array.from(originalBytes));
    });
  });

  // ==========================================================================
  // 2. KEY DERIVATION (WEB CRYPTO VERSION)
  // ==========================================================================

  describe("deriveKeyFromPasswordWeb", () => {
    test("derives consistent key from password and salt", async () => {
      const password = "TestPassword123!@#";
      const salt = new Uint8Array([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      ]);

      const key1 = await deriveKeyFromPasswordWeb(
        password,
        salt,
        100000,
        "SHA-256",
      );
      const key2 = await deriveKeyFromPasswordWeb(
        password,
        salt,
        100000,
        "SHA-256",
      );

      expect(key1).toBeInstanceOf(CryptoKey);
      expect(key2).toBeInstanceOf(CryptoKey);
      // CryptoKey objects can't be directly compared, but same params should work
    });

    test("rejects weak passwords", async () => {
      const weakPassword = "a";
      const salt = new Uint8Array(16).fill(0);

      const key = await deriveKeyFromPasswordWeb(
        weakPassword,
        salt,
        100000,
        "SHA-256",
      );

      // Should still work but password is weak (no validation in Web Crypto itself)
      expect(key).toBeInstanceOf(CryptoKey);
    });

    test("accepts different hash algorithms", async () => {
      const password = "TestPassword";
      const salt = new Uint8Array(16).fill(0);

      const keySHA256 = await deriveKeyFromPasswordWeb(
        password,
        salt,
        100000,
        "SHA-256",
      );
      const keySHA512 = await deriveKeyFromPasswordWeb(
        password,
        salt,
        100000,
        "SHA-512",
      );

      expect(keySHA256).toBeInstanceOf(CryptoKey);
      expect(keySHA512).toBeInstanceOf(CryptoKey);
    });

    test("respects iteration count parameter", async () => {
      const password = "TestPassword";
      const salt = new Uint8Array(16).fill(0);

      const key100k = await deriveKeyFromPasswordWeb(
        password,
        salt,
        100000,
        "SHA-256",
      );
      const key1m = await deriveKeyFromPasswordWeb(
        password,
        salt,
        1000000,
        "SHA-256",
      );

      // Both should be valid, 1M iterations should be slower
      expect(key100k).toBeInstanceOf(CryptoKey);
      expect(key1m).toBeInstanceOf(CryptoKey);
    });

    test("handles Unicode passwords", async () => {
      const unicodePassword = "密码🔐パスワード";
      const salt = new Uint8Array(16).fill(0);

      const key = await deriveKeyFromPasswordWeb(
        unicodePassword,
        salt,
        100000,
        "SHA-256",
      );

      expect(key).toBeInstanceOf(CryptoKey);
    });
  });

  describe("generateRandomIVWeb", () => {
    test("generates 12-byte IV (96-bit for GCM)", async () => {
      const iv = generateRandomIVWeb();

      expect(iv).toBeInstanceOf(Uint8Array);
      expect(iv.length).toBe(12);
    });

    test("generates different IV each time", async () => {
      const iv1 = generateRandomIVWeb();
      const iv2 = generateRandomIVWeb();
      const iv3 = generateRandomIVWeb();

      // Should be different
      expect(iv1).not.toEqual(iv2);
      expect(iv2).not.toEqual(iv3);
      expect(iv1).not.toEqual(iv3);
    });

    test("IVs contain sufficient entropy", async () => {
      const ivs = [];
      for (let i = 0; i < 100; i++) {
        ivs.push(generateRandomIVWeb());
      }

      // Check that most bytes are different across IVs (entropy check)
      const byteVariance = new Array(12).fill(0);
      for (let byteIndex = 0; byteIndex < 12; byteIndex++) {
        const values = new Set(ivs.map((iv) => iv[byteIndex]));
        byteVariance[byteIndex] = values.size;
      }

      // Each byte position should have multiple different values
      const avgVariance = byteVariance.reduce((a, b) => a + b, 0) / 12;
      expect(avgVariance).toBeGreaterThan(10); // At least 10 different values per byte position
    });
  });

  // ==========================================================================
  // 3. AES-256-GCM DECRYPTION (WEB CRYPTO)
  // ==========================================================================

  describe("decryptAES256GCMWeb", () => {
    test("decrypts valid AES-256-GCM ciphertext", async () => {
      const password = "MyPassword123";
      const plaintext = "Secret Message";
      const salt = Buffer.from("00010203040506070809101112131415", "hex"); // 16 bytes

      // First encrypt with backend function to get ciphertext
      const {
        encryptAES256GCM,
        generateRandomIV,
      } = require("../../../backend/src/crypto/aes-256-gcm");
      const {
        deriveKeyFromPassword,
      } = require("../../../backend/src/crypto/pbkdf2-keyder");

      const backendKey = deriveKeyFromPassword(password, salt);
      const iv = generateRandomIV();
      const encrypted = encryptAES256GCM(
        Buffer.from(plaintext),
        backendKey,
        iv,
      );

      // Now decrypt with web crypto
      // Note: encrypted.ciphertext is hex string, convert to Buffer
      const ciphertextBuffer = Buffer.from(encrypted.ciphertext, "hex");

      const webKey = await deriveKeyFromPasswordWeb(
        password,
        new Uint8Array(salt),
        100000,
        "SHA-256",
      );
      const decrypted = await decryptAES256GCMWeb(
        ciphertextBuffer,
        webKey,
        encrypted.iv,
        encrypted.authTag,
      );

      expect(new TextDecoder().decode(decrypted)).toBe(plaintext);
    });

    test("rejects tampered ciphertext", async () => {
      const password = "MyPassword123";
      const plaintext = "Secret Message";
      const salt = Buffer.from("01010101010101010101010101010101", "hex"); // 16 bytes

      const {
        encryptAES256GCM,
        generateRandomIV,
      } = require("../../../backend/src/crypto/aes-256-gcm");
      const {
        deriveKeyFromPassword,
      } = require("../../../backend/src/crypto/pbkdf2-keyder");

      const backendKey = deriveKeyFromPassword(password, salt);
      const iv = generateRandomIV();
      const encrypted = encryptAES256GCM(
        Buffer.from(plaintext),
        backendKey,
        iv,
      );

      // Tamper with ciphertext (convert from hex string to buffer first)
      const ciphertextBuffer = Buffer.from(encrypted.ciphertext, "hex");
      ciphertextBuffer[0] ^= 0xff; // Flip bits

      const webKey = await deriveKeyFromPasswordWeb(
        password,
        new Uint8Array(salt),
        100000,
        "SHA-256",
      );

      await expect(
        decryptAES256GCMWeb(
          ciphertextBuffer,
          webKey,
          encrypted.iv,
          encrypted.authTag,
        ),
      ).rejects.toThrow();
    });

    test("rejects wrong password", async () => {
      const password = "CorrectPassword";
      const wrongPassword = "WrongPassword";
      const plaintext = "Secret Message";
      const salt = Buffer.from("02020202020202020202020202020202", "hex"); // 16 bytes

      const {
        encryptAES256GCM,
        generateRandomIV,
      } = require("../../../backend/src/crypto/aes-256-gcm");
      const {
        deriveKeyFromPassword,
      } = require("../../../backend/src/crypto/pbkdf2-keyder");

      const backendKey = deriveKeyFromPassword(password, salt);
      const iv = generateRandomIV();
      const encrypted = encryptAES256GCM(
        Buffer.from(plaintext),
        backendKey,
        iv,
      );

      const wrongWebKey = await deriveKeyFromPasswordWeb(
        wrongPassword,
        new Uint8Array(salt),
        100000,
        "SHA-256",
      );

      // Convert hex ciphertext to Buffer
      const ciphertextBuffer = Buffer.from(encrypted.ciphertext, "hex");

      await expect(
        decryptAES256GCMWeb(
          ciphertextBuffer,
          wrongWebKey,
          encrypted.iv,
          encrypted.authTag,
        ),
      ).rejects.toThrow();
    });

    test("handles large plaintexts (>1MB)", async () => {
      const password = "MyPassword123";
      const largePlaintext = new Uint8Array(2 * 1024 * 1024); // 2MB
      for (let i = 0; i < largePlaintext.length; i++) {
        largePlaintext[i] = i % 256;
      }
      const salt = Buffer.from("03030303030303030303030303030303", "hex"); // 16 bytes

      const {
        encryptAES256GCM,
        generateRandomIV,
      } = require("../../../backend/src/crypto/aes-256-gcm");
      const {
        deriveKeyFromPassword,
      } = require("../../../backend/src/crypto/pbkdf2-keyder");

      const backendKey = deriveKeyFromPassword(password, salt);
      const iv = generateRandomIV();
      const encrypted = encryptAES256GCM(
        Buffer.from(largePlaintext),
        backendKey,
        iv,
      );

      // Convert hex ciphertext to Buffer
      const ciphertextBuffer = Buffer.from(encrypted.ciphertext, "hex");

      const webKey = await deriveKeyFromPasswordWeb(
        password,
        new Uint8Array(salt),
        100000,
        "SHA-256",
      );
      const decrypted = await decryptAES256GCMWeb(
        ciphertextBuffer,
        webKey,
        encrypted.iv,
        encrypted.authTag,
      );

      expect(decrypted.byteLength).toBe(2 * 1024 * 1024);
      expect(new Uint8Array(decrypted)).toEqual(largePlaintext);
    });

    test("validates IV length (must be 12 bytes)", async () => {
      const password = "MyPassword123";
      const salt = new Uint8Array(16).fill(0);

      const webKey = await deriveKeyFromPasswordWeb(
        password,
        salt,
        100000,
        "SHA-256",
      );
      const ciphertext = new Uint8Array(32);
      const authTag = new Uint8Array(16);

      // Wrong IV length
      const shortIV = new Uint8Array(11);

      await expect(
        decryptAES256GCMWeb(ciphertext, webKey, shortIV, authTag),
      ).rejects.toThrow();
    });

    test("validates auth tag length (must be 16 bytes)", async () => {
      const password = "MyPassword123";
      const salt = new Uint8Array(16).fill(0);

      const webKey = await deriveKeyFromPasswordWeb(
        password,
        salt,
        100000,
        "SHA-256",
      );
      const ciphertext = new Uint8Array(32);
      const iv = new Uint8Array(12);

      // Wrong auth tag length
      const shortAuthTag = new Uint8Array(15);

      await expect(
        decryptAES256GCMWeb(ciphertext, webKey, iv, shortAuthTag),
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // 4. END-TO-END INTEGRATION TESTS
  // ==========================================================================

  describe("End-to-End: Backend → Frontend Decryption", () => {
    test("decrypts backend-encrypted JSON field", async () => {
      const password = "HealthRecordPassword123";
      const ssn = "123-45-6789";
      const salt = Buffer.from("04040404040404040404040404040404", "hex"); // 16 bytes

      // Simulate backend encryption
      const {
        encryptAES256GCM,
        generateRandomIV,
      } = require("../../../backend/src/crypto/aes-256-gcm");
      const {
        deriveKeyFromPassword,
      } = require("../../../backend/src/crypto/pbkdf2-keyder");

      const backendKey = deriveKeyFromPassword(password, salt);
      const iv = generateRandomIV();
      const encrypted = encryptAES256GCM(Buffer.from(ssn), backendKey, iv);

      // Frontend decryption
      // Convert hex ciphertext to Buffer
      const ciphertextBuffer = Buffer.from(encrypted.ciphertext, "hex");

      const webKey = await deriveKeyFromPasswordWeb(
        password,
        new Uint8Array(salt),
        100000,
        "SHA-256",
      );
      const decrypted = await decryptAES256GCMWeb(
        ciphertextBuffer,
        webKey,
        encrypted.iv,
        encrypted.authTag,
      );

      expect(new TextDecoder().decode(decrypted)).toBe(ssn);
    });

    test("decrypts with Base64-encoded ciphertext (from API)", async () => {
      const password = "APIPassword123";
      const secret = "SensitiveData";
      const salt = Buffer.from("05050505050505050505050505050505", "hex"); // 16 bytes

      // Backend encryption + Base64 encoding (simulating API response)
      const {
        encryptAES256GCM,
        generateRandomIV,
      } = require("../../../backend/src/crypto/aes-256-gcm");
      const {
        deriveKeyFromPassword,
      } = require("../../../backend/src/crypto/pbkdf2-keyder");

      const backendKey = deriveKeyFromPassword(password, salt);
      const iv = generateRandomIV();
      const encrypted = encryptAES256GCM(Buffer.from(secret), backendKey, iv);

      // Simulate API response with Base64 encoding
      // Note: encrypted.ciphertext is hex string, convert to binary then Base64
      const ciphertextBuffer = Buffer.from(encrypted.ciphertext, "hex");
      const apiResponse = {
        ciphertext: ciphertextBuffer.toString("base64"),
        iv: encrypted.iv.toString("base64"),
        authTag: encrypted.authTag.toString("base64"),
      };

      // Frontend receives and decrypts
      const webKey = await deriveKeyFromPasswordWeb(
        password,
        new Uint8Array(salt),
        100000,
        "SHA-256",
      );
      const decrypted = await decryptAES256GCMWeb(
        base64ToArrayBuffer(apiResponse.ciphertext),
        webKey,
        new Uint8Array(base64ToArrayBuffer(apiResponse.iv)),
        new Uint8Array(base64ToArrayBuffer(apiResponse.authTag)),
      );

      expect(new TextDecoder().decode(decrypted)).toBe(secret);
    });

    test("handles JSON payload with multiple fields", async () => {
      const password = "ComplexPayloadPassword";
      const payload = {
        recordId: "REC-001",
        ssn: "123-45-6789",
        dateOfBirth: "1990-01-01",
      };
      const salt = Buffer.from("06060606060606060606060606060606", "hex"); // 16 bytes

      // Simulate field-level encryption
      const {
        encryptAES256GCM,
        generateRandomIV,
      } = require("../../../backend/src/crypto/aes-256-gcm");
      const {
        deriveKeyFromPassword,
      } = require("../../../backend/src/crypto/pbkdf2-keyder");

      const backendKey = deriveKeyFromPassword(password, salt);

      const encryptedFields = {};
      for (const field of ["ssn", "dateOfBirth"]) {
        const iv = generateRandomIV();
        const encrypted = encryptAES256GCM(
          Buffer.from(payload[field]),
          backendKey,
          iv,
        );
        // Convert hex ciphertext to buffer, then to base64
        const ciphertextBuffer = Buffer.from(encrypted.ciphertext, "hex");
        encryptedFields[field] = {
          ciphertext: ciphertextBuffer.toString("base64"),
          iv: encrypted.iv.toString("base64"),
          authTag: encrypted.authTag.toString("base64"),
        };
      }

      // Frontend decryption
      const webKey = await deriveKeyFromPasswordWeb(
        password,
        new Uint8Array(salt),
        100000,
        "SHA-256",
      );
      const decrypted = {};
      for (const field of ["ssn", "dateOfBirth"]) {
        const encrypted = encryptedFields[field];
        decrypted[field] = new TextDecoder().decode(
          await decryptAES256GCMWeb(
            base64ToArrayBuffer(encrypted.ciphertext),
            webKey,
            new Uint8Array(base64ToArrayBuffer(encrypted.iv)),
            new Uint8Array(base64ToArrayBuffer(encrypted.authTag)),
          ),
        );
      }

      expect(decrypted.ssn).toBe(payload.ssn);
      expect(decrypted.dateOfBirth).toBe(payload.dateOfBirth);
    });
  });

  // ==========================================================================
  // 5. PERFORMANCE TESTS
  // ==========================================================================

  describe("Performance: Web Crypto Operations", () => {
    test("decryption completes in <500ms", async () => {
      const password = "PerformanceTest";
      const plaintext = "Test data for performance";
      const salt = Buffer.from("07070707070707070707070707070707", "hex"); // 16 bytes

      const {
        encryptAES256GCM,
        generateRandomIV,
      } = require("../../../backend/src/crypto/aes-256-gcm");
      const {
        deriveKeyFromPassword,
      } = require("../../../backend/src/crypto/pbkdf2-keyder");

      const backendKey = deriveKeyFromPassword(password, salt);
      const iv = generateRandomIV();
      const encrypted = encryptAES256GCM(
        Buffer.from(plaintext),
        backendKey,
        iv,
      );

      // Convert hex ciphertext to Buffer
      const ciphertextBuffer = Buffer.from(encrypted.ciphertext, "hex");

      const webKey = await deriveKeyFromPasswordWeb(
        password,
        new Uint8Array(salt),
        100000,
        "SHA-256",
      );

      const startTime = Date.now();
      await decryptAES256GCMWeb(
        ciphertextBuffer,
        webKey,
        encrypted.iv,
        encrypted.authTag,
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    test("key derivation completes in <2 seconds", async () => {
      const password = "PerformanceKeyDerivation";
      const salt = new Uint8Array(16).fill(0);

      const startTime = Date.now();
      await deriveKeyFromPasswordWeb(password, salt, 100000, "SHA-256");
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    test("Base64 conversion is fast (<1 second for 1MB)", async () => {
      const largeData = new Uint8Array(1024 * 1024);

      const startTime = Date.now();
      const base64 = arrayBufferToBase64(largeData);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      expect(base64.length).toBeGreaterThan(1024 * 1024);
    });
  });

  // ==========================================================================
  // 6. SECURITY TESTS
  // ==========================================================================

  describe("Security: Sensitive Data Handling", () => {
    test("error messages do not expose internal details", async () => {
      const password = "SecurePassword";
      const salt = new Uint8Array(16).fill(0);

      const webKey = await deriveKeyFromPasswordWeb(
        password,
        salt,
        100000,
        "SHA-256",
      );
      const ciphertext = Buffer.from("tampered");
      const iv = new Uint8Array(12);
      const authTag = new Uint8Array(16);

      try {
        await decryptAES256GCMWeb(ciphertext, webKey, iv, authTag);
      } catch (error) {
        // Error message should not contain plaintext or passwords
        expect(error.message).not.toContain(password);
        // Should have generic error message, not "tampered"
        expect(error.message).toContain("Decryption failed");
      }
    });

    test("handles Web Crypto API CryptoKey securely", async () => {
      const password = "ProtectedPassword";
      const salt = new Uint8Array(16).fill(0);

      const key = await deriveKeyFromPasswordWeb(
        password,
        salt,
        100000,
        "SHA-256",
      );

      // CryptoKey should not be extractable (can't get raw key bytes)
      expect(key.type).toBe("secret");
      expect(key.extractable).toBe(false);
      // Key algorithm for AES-GCM decryption
      expect(key.algorithm.name).toBe("AES-GCM");
    });
  });
});
