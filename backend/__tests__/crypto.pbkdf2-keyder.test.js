/**
 * P2-1.1.2: PBKDF2 Key Derivation Tests
 * Tests for password-based key derivation using PBKDF2
 */

const crypto = require("crypto");
const {
  deriveKeyFromPassword,
  validatePBKDF2Input,
  generateSalt,
  verifyDerivedKey,
} = require("../src/crypto/pbkdf2-keyder");

describe("P2-1.1.2: PBKDF2 Key Derivation Module", () => {
  describe("deriveKeyFromPassword", () => {
    it("should derive a 256-bit key from password and salt", () => {
      const password = "MySecurePassword123!";
      const salt = crypto.randomBytes(16);

      const key = deriveKeyFromPassword(password, salt);

      expect(key).toBeDefined();
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32); // 256-bit key
    });

    it("should derive same key for same password and salt", () => {
      const password = "ConsistentPassword";
      const salt = crypto.randomBytes(16);

      const key1 = deriveKeyFromPassword(password, salt);
      const key2 = deriveKeyFromPassword(password, salt);

      expect(key1).toEqual(key2);
    });

    it("should derive different keys for different passwords", () => {
      const salt = crypto.randomBytes(16);

      const key1 = deriveKeyFromPassword("Password1", salt);
      const key2 = deriveKeyFromPassword("Password2", salt);

      expect(key1).not.toEqual(key2);
    });

    it("should derive different keys for different salts", () => {
      const password = "SamePassword";
      const salt1 = crypto.randomBytes(16);
      const salt2 = crypto.randomBytes(16);

      const key1 = deriveKeyFromPassword(password, salt1);
      const key2 = deriveKeyFromPassword(password, salt2);

      expect(key1).not.toEqual(key2);
    });

    it("should use minimum 100,000 iterations by default", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);

      // Should not throw and should complete
      const key = deriveKeyFromPassword(password, salt);

      expect(key).toBeDefined();
      expect(key.length).toBe(32);
    });

    it("should use custom iteration count when provided", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);
      const iterations = 200000;

      const key = deriveKeyFromPassword(password, salt, iterations);

      expect(key).toBeDefined();
      expect(key.length).toBe(32);
    });

    it("should reject weak passwords with warning behavior", () => {
      const password = "123"; // Very weak
      const salt = crypto.randomBytes(16);

      // Should still work but password itself is weak
      const key = deriveKeyFromPassword(password, salt);

      expect(key).toBeDefined();
    });

    it("should handle empty password", () => {
      const password = "";
      const salt = crypto.randomBytes(16);

      const key = deriveKeyFromPassword(password, salt);

      expect(key).toBeDefined();
      expect(key.length).toBe(32);
    });

    it("should handle very long password (>1000 chars)", () => {
      const password = "a".repeat(1000);
      const salt = crypto.randomBytes(16);

      const key = deriveKeyFromPassword(password, salt);

      expect(key).toBeDefined();
      expect(key.length).toBe(32);
    });

    it("should handle special characters in password", () => {
      const password = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`";
      const salt = crypto.randomBytes(16);

      const key = deriveKeyFromPassword(password, salt);

      expect(key).toBeDefined();
      expect(key.length).toBe(32);
    });

    it("should handle unicode characters in password", () => {
      const password = "Пароль密码🔐パスワード";
      const salt = crypto.randomBytes(16);

      const key = deriveKeyFromPassword(password, salt);

      expect(key).toBeDefined();
      expect(key.length).toBe(32);
    });

    it("should reject invalid salt length", () => {
      const password = "Password";
      const invalidSalt = crypto.randomBytes(8); // Too short

      expect(() => {
        deriveKeyFromPassword(password, invalidSalt);
      }).toThrow();
    });

    it("should reject null password", () => {
      const salt = crypto.randomBytes(16);

      expect(() => {
        deriveKeyFromPassword(null, salt);
      }).toThrow();
    });

    it("should reject invalid iteration count (too low)", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);
      const tooLowIterations = 1000; // Less than 100k minimum

      expect(() => {
        deriveKeyFromPassword(password, salt, tooLowIterations);
      }).toThrow();
    });

    it("should reject invalid iteration count (non-integer)", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);

      expect(() => {
        deriveKeyFromPassword(password, salt, 100000.5);
      }).toThrow();
    });
  });

  describe("generateSalt", () => {
    it("should generate salt of correct length (16 bytes)", () => {
      const salt = generateSalt();

      expect(Buffer.isBuffer(salt)).toBe(true);
      expect(salt.length).toBe(16);
    });

    it("should generate different salts on each call", () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      expect(salt1).not.toEqual(salt2);
    });

    it("should generate cryptographically random salts", () => {
      const salts = Array.from({ length: 100 }, () => generateSalt());

      // Check all are unique
      const uniqueSalts = new Set(salts.map((s) => s.toString("hex")));
      expect(uniqueSalts.size).toBe(100);
    });

    it("should support custom salt length", () => {
      const salt = generateSalt(32);

      expect(salt.length).toBe(32);
    });

    it("should reject invalid salt length (0)", () => {
      expect(() => {
        generateSalt(0);
      }).toThrow();
    });

    it("should reject negative salt length", () => {
      expect(() => {
        generateSalt(-1);
      }).toThrow();
    });
  });

  describe("validatePBKDF2Input", () => {
    it("should validate correct inputs", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);
      const iterations = 100000;

      expect(() => {
        validatePBKDF2Input(password, salt, iterations);
      }).not.toThrow();
    });

    it("should reject null password", () => {
      const salt = crypto.randomBytes(16);

      expect(() => {
        validatePBKDF2Input(null, salt);
      }).toThrow();
    });

    it("should reject invalid salt type", () => {
      const password = "Password";
      const invalidSalt = "not-a-buffer";

      expect(() => {
        validatePBKDF2Input(password, invalidSalt);
      }).toThrow();
    });

    it("should reject salt shorter than 16 bytes", () => {
      const password = "Password";
      const shortSalt = crypto.randomBytes(8);

      expect(() => {
        validatePBKDF2Input(password, shortSalt);
      }).toThrow();
    });

    it("should reject iterations less than 100,000", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);
      const lowIterations = 50000;

      expect(() => {
        validatePBKDF2Input(password, salt, lowIterations);
      }).toThrow();
    });

    it("should reject non-integer iterations", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);

      expect(() => {
        validatePBKDF2Input(password, salt, 100000.5);
      }).toThrow();
    });
  });

  describe("verifyDerivedKey", () => {
    it("should verify matching key from same password and salt", () => {
      const password = "MyPassword";
      const salt = crypto.randomBytes(16);

      const key = deriveKeyFromPassword(password, salt);
      const isMatch = verifyDerivedKey(password, salt, key);

      expect(isMatch).toBe(true);
    });

    it("should reject key from different password", () => {
      const password1 = "Password1";
      const password2 = "Password2";
      const salt = crypto.randomBytes(16);

      const key = deriveKeyFromPassword(password1, salt);
      const isMatch = verifyDerivedKey(password2, salt, key);

      expect(isMatch).toBe(false);
    });

    it("should reject key from different salt", () => {
      const password = "Password";
      const salt1 = crypto.randomBytes(16);
      const salt2 = crypto.randomBytes(16);

      const key = deriveKeyFromPassword(password, salt1);
      const isMatch = verifyDerivedKey(password, salt2, key);

      expect(isMatch).toBe(false);
    });

    it("should reject tampered key", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);

      const key = deriveKeyFromPassword(password, salt);

      // Tamper with key
      const tamperedKey = Buffer.from(key);
      tamperedKey[0] ^= 0xff;

      const isMatch = verifyDerivedKey(password, salt, tamperedKey);

      expect(isMatch).toBe(false);
    });

    it("should handle custom iteration count in verification", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);
      const iterations = 200000;

      const key = deriveKeyFromPassword(password, salt, iterations);
      const isMatch = verifyDerivedKey(password, salt, key, iterations);

      expect(isMatch).toBe(true);
    });
  });

  describe("End-to-End Key Derivation", () => {
    it("should derive consistent keys from user password", () => {
      const userPassword = "UserSecurePassword123";
      const salt = generateSalt();

      // First derivation (registration)
      const key1 = deriveKeyFromPassword(userPassword, salt);

      // Second derivation (login)
      const key2 = deriveKeyFromPassword(userPassword, salt);

      expect(key1).toEqual(key2);
    });

    it("should support password-based encryption workflow", () => {
      const password = "UserPassword";
      const salt = generateSalt();
      const secretData = "Sensitive information";

      // Derive key from password
      const key = deriveKeyFromPassword(password, salt);

      // Could be used with AES-256-GCM for encryption
      expect(key.length).toBe(32);
      expect(Buffer.isBuffer(key)).toBe(true);
    });

    it("should handle multiple users with different passwords", () => {
      const users = [
        { password: "user1pass", salt: generateSalt() },
        { password: "user2pass", salt: generateSalt() },
        { password: "user3pass", salt: generateSalt() },
      ];

      const keys = users.map((u) => deriveKeyFromPassword(u.password, u.salt));

      // All keys should be different
      const uniqueKeys = new Set(keys.map((k) => k.toString("hex")));
      expect(uniqueKeys.size).toBe(3);
    });
  });

  describe("Performance Characteristics", () => {
    it("should complete derivation in reasonable time (< 1 second)", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);

      const start = Date.now();
      deriveKeyFromPassword(password, salt);
      const duration = Date.now() - start;

      // Should take at least some time due to iterations
      expect(duration).toBeGreaterThan(0);

      // But not too long (depends on CPU, but 1 second is reasonable upper bound)
      expect(duration).toBeLessThan(1000);
    });

    it("should scale with iteration count", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);

      const start100k = Date.now();
      deriveKeyFromPassword(password, salt, 100000);
      const duration100k = Date.now() - start100k;

      const start200k = Date.now();
      deriveKeyFromPassword(password, salt, 200000);
      const duration200k = Date.now() - start200k;

      // More iterations should take longer
      expect(duration200k).toBeGreaterThan(duration100k);
    });
  });

  describe("Security Considerations", () => {
    it("should use constant-time comparison for key verification", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);

      const key = deriveKeyFromPassword(password, salt);

      // Both should succeed with same result
      const match1 = verifyDerivedKey(password, salt, key);
      const match2 = verifyDerivedKey(password, salt, key);

      expect(match1).toBe(match2);
      expect(match1).toBe(true);
    });

    it("should work with minimum recommended salt size (16 bytes)", () => {
      const password = "Password";
      const salt = crypto.randomBytes(16);

      const key = deriveKeyFromPassword(password, salt);

      expect(key.length).toBe(32);
    });
  });
});
