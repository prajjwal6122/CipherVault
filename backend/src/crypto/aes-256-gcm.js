/**
 * AES-256-GCM Encryption Module (P2-1.1.1)
 * Provides AES-256-GCM authenticated encryption with random IV
 *
 * Security Characteristics:
 * - Algorithm: AES-256-GCM (Advanced Encryption Standard, 256-bit key, Galois/Counter Mode)
 * - Key Size: 256 bits (32 bytes)
 * - IV Size: 96 bits (12 bytes) - standard for GCM mode
 * - Authentication Tag: 128 bits (16 bytes)
 * - Integrity: Authenticated encryption (AEAD - Authenticated Encryption with Associated Data)
 *
 * Usage:
 * const { encryptAES256GCM, decryptAES256GCM } = require('./aes-256-gcm');
 *
 * const key = crypto.randomBytes(32);
 * const iv = crypto.randomBytes(12);
 * const plaintext = 'Sensitive data';
 *
 * const encrypted = encryptAES256GCM(plaintext, key, iv);
 * const decrypted = decryptAES256GCM(encrypted.ciphertext, key, iv, encrypted.authTag);
 */

const crypto = require("crypto");

/**
 * Validate encryption inputs for proper format and size
 * @param {string|Buffer} plaintext - Data to encrypt
 * @param {Buffer} key - 256-bit (32-byte) encryption key
 * @param {Buffer} iv - 96-bit (12-byte) initialization vector
 * @throws {Error} If inputs are invalid
 */
function validateEncryptionInput(plaintext, key, iv) {
  if (!plaintext && plaintext !== "") {
    throw new Error("Plaintext is required");
  }

  if (!Buffer.isBuffer(key)) {
    throw new Error("Key must be a Buffer");
  }

  if (key.length !== 32) {
    throw new Error("Key must be 32 bytes (256-bit)");
  }

  if (!Buffer.isBuffer(iv)) {
    throw new Error("IV must be a Buffer");
  }

  if (iv.length !== 12) {
    throw new Error("IV must be 12 bytes (96-bit)");
  }
}

/**
 * Validate decryption inputs
 * @param {string} ciphertext - Hex-encoded ciphertext
 * @param {Buffer} key - 256-bit encryption key
 * @param {Buffer} iv - 96-bit initialization vector
 * @param {Buffer} authTag - 128-bit authentication tag
 * @throws {Error} If inputs are invalid
 */
function validateDecryptionInput(ciphertext, key, iv, authTag) {
  if (!ciphertext || typeof ciphertext !== "string") {
    throw new Error("Ciphertext must be a non-empty hex string");
  }

  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new Error("Key must be a 32-byte Buffer");
  }

  if (!Buffer.isBuffer(iv) || iv.length !== 12) {
    throw new Error("IV must be a 12-byte Buffer");
  }

  if (!Buffer.isBuffer(authTag) || authTag.length !== 16) {
    throw new Error("Auth tag must be a 16-byte Buffer");
  }
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param {string} plaintext - Data to encrypt
 * @param {Buffer} key - 256-bit encryption key (32 bytes)
 * @param {Buffer} iv - 96-bit initialization vector (12 bytes)
 * @returns {Object} Encryption result with ciphertext, authTag, and IV
 *   - ciphertext: Hex-encoded encrypted data
 *   - authTag: Hex-encoded authentication tag (16 bytes)
 *   - iv: The IV used (for record-keeping)
 *
 * @throws {Error} If inputs are invalid
 *
 * @example
 * const key = crypto.randomBytes(32);
 * const iv = crypto.randomBytes(12);
 * const result = encryptAES256GCM('secret data', key, iv);
 * // result = {
 * //   ciphertext: 'a1b2c3d4...',
 * //   authTag: 'e5f6g7h8...',
 * //   iv: <Buffer ...>
 * // }
 */
function encryptAES256GCM(plaintext, key, iv) {
  validateEncryptionInput(plaintext, key, iv);

  try {
    // Create cipher instance
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    // Encrypt plaintext (convert string to UTF-8 if necessary)
    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");

    // Get authentication tag (proves data hasn't been tampered with)
    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      authTag,
      iv,
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt AES-256-GCM encrypted ciphertext
 *
 * @param {string} ciphertext - Hex-encoded encrypted data
 * @param {Buffer} key - 256-bit decryption key (must be same as encryption key)
 * @param {Buffer} iv - 96-bit initialization vector (must be same as used in encryption)
 * @param {Buffer} authTag - 128-bit authentication tag (16 bytes)
 * @returns {string} Decrypted plaintext as UTF-8 string
 *
 * @throws {Error} If decryption fails, authentication tag is invalid, or inputs are invalid
 *
 * @example
 * const plaintext = decryptAES256GCM(
 *   'a1b2c3d4...',
 *   key,
 *   iv,
 *   authTagBuffer
 * );
 */
function decryptAES256GCM(ciphertext, key, iv, authTag) {
  validateDecryptionInput(ciphertext, key, iv, authTag);

  try {
    // Create decipher instance
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

    // Set authentication tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt ciphertext
    let plaintext = decipher.update(ciphertext, "hex", "utf8");
    plaintext += decipher.final("utf8");

    return plaintext;
  } catch (error) {
    // Distinguish between authentication failures and other errors
    if (
      error.message.includes("Unsupported state or arguments") ||
      error.message.includes("AUTHENTICATION_TAG_MISMATCH")
    ) {
      throw new Error(
        "Authentication tag verification failed - data may have been tampered with",
      );
    }
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Generate a cryptographically secure random IV for AES-GCM
 *
 * @returns {Buffer} 12-byte (96-bit) random initialization vector
 *
 * @note Always generate a new IV for each encryption operation
 *
 * @example
 * const iv = generateRandomIV();
 * const encrypted = encryptAES256GCM(plaintext, key, iv);
 */
function generateRandomIV() {
  return crypto.randomBytes(12);
}

/**
 * Generate cryptographically secure random bytes
 *
 * @param {number} size - Number of random bytes to generate
 * @returns {Buffer} Random bytes of specified size
 *
 * @throws {Error} If size is invalid (<=0)
 *
 * @example
 * const key = generateRandomBytes(32);  // 256-bit key
 * const salt = generateRandomBytes(16); // 128-bit salt
 */
function generateRandomBytes(size) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("Size must be a positive integer");
  }

  return crypto.randomBytes(size);
}

/**
 * Encrypt data and include IV in output (convenience function)
 * Useful when IV needs to be transmitted with ciphertext
 *
 * @param {string} plaintext - Data to encrypt
 * @param {Buffer} key - 256-bit encryption key
 * @returns {Object} Encryption result with ciphertext, authTag, and IV
 *
 * @example
 * const key = crypto.randomBytes(32);
 * const result = encryptAES256GCMWithIV(plaintext, key);
 * // Store or transmit: iv + ciphertext + authTag
 */
function encryptAES256GCMWithIV(plaintext, key) {
  const iv = generateRandomIV();
  return encryptAES256GCM(plaintext, key, iv);
}

module.exports = {
  // Main functions
  encryptAES256GCM,
  decryptAES256GCM,
  encryptAES256GCMWithIV,

  // Utility functions
  generateRandomIV,
  generateRandomBytes,
  validateEncryptionInput,
  validateDecryptionInput,

  // Constants for reference
  ALGORITHM: "aes-256-gcm",
  KEY_SIZE: 32, // 256 bits
  IV_SIZE: 12, // 96 bits (standard for GCM)
  AUTH_TAG_SIZE: 16, // 128 bits
};
