/**
 * Secure Encryption CLI Tool
 * Main module for encryption utilities
 */

const crypto = require("crypto");
const fs = require("fs");

/**
 * Encrypt data using AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @param {Buffer} key - Encryption key (32 bytes for AES-256)
 * @param {Buffer} iv - Initialization vector (12 bytes recommended)
 * @returns {Object} - { ciphertext, authTag, iv }
 */
function encryptAES256GCM(plaintext, key, iv) {
  if (!key || key.length !== 32) {
    throw new Error("Key must be 32 bytes for AES-256");
  }
  if (!iv || iv.length !== 12) {
    throw new Error("IV must be 12 bytes for GCM mode");
  }

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    authTag: authTag.toString("hex"),
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} ciphertext - Encrypted data (hex)
 * @param {Buffer} key - Decryption key (32 bytes)
 * @param {string} iv - Initialization vector (hex)
 * @param {string} authTag - Authentication tag (hex)
 * @returns {string} - Decrypted plaintext
 */
function decryptAES256GCM(ciphertext, key, iv, authTag) {
  if (!key || key.length !== 32) {
    throw new Error("Key must be 32 bytes for AES-256");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let plaintext = decipher.update(ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}

/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - User password
 * @param {Buffer} salt - Random salt (16 bytes recommended)
 * @param {number} iterations - PBKDF2 iterations (default: 100000)
 * @returns {Buffer} - Derived key (32 bytes for AES-256)
 */
function deriveKeyFromPassword(password, salt, iterations = 100000) {
  if (!salt || salt.length !== 16) {
    throw new Error("Salt must be 16 bytes");
  }

  return crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
}

/**
 * Generate random bytes
 * @param {number} size - Number of bytes to generate
 * @returns {Buffer} - Random bytes
 */
function generateRandomBytes(size) {
  return crypto.randomBytes(size);
}

module.exports = {
  encryptAES256GCM,
  decryptAES256GCM,
  deriveKeyFromPassword,
  generateRandomBytes,
};
