/**
 * Client-side Decryption Utilities
 * Uses Web Crypto API for AES-256-GCM decryption
 */

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} encryptionKey - Base64 encoded encryption key
 * @param {string} iv - Base64 encoded initialization vector
 * @param {string} authTag - Base64 encoded authentication tag
 * @returns {Promise<string>} Decrypted data
 */
export async function decryptAES256GCM(
  encryptedData,
  encryptionKey,
  iv,
  authTag,
) {
  try {
    // Validate inputs
    if (!encryptedData || !encryptionKey || !iv || !authTag) {
      throw new Error("Missing required decryption parameters");
    }

    // Convert Base64 strings to ArrayBuffers
    const encryptedBuffer = base64ToArrayBuffer(encryptedData);
    const keyBuffer = base64ToArrayBuffer(encryptionKey);
    const ivBuffer = base64ToArrayBuffer(iv);
    const authTagBuffer = base64ToArrayBuffer(authTag);

    // Validate key size (should be 32 bytes for AES-256)
    if (keyBuffer.byteLength !== 32) {
      throw new Error("Invalid key size. Expected 32 bytes for AES-256.");
    }

    // Validate IV size (should be 12 bytes for GCM)
    if (ivBuffer.byteLength !== 12) {
      throw new Error("Invalid IV size. Expected 12 bytes for GCM.");
    }

    // Validate auth tag size (should be 16 bytes)
    if (authTagBuffer.byteLength !== 16) {
      throw new Error("Invalid authentication tag size. Expected 16 bytes.");
    }

    // Import the key
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["decrypt"],
    );

    // Combine encrypted data and auth tag
    const ciphertext = new Uint8Array(
      encryptedBuffer.byteLength + authTagBuffer.byteLength,
    );
    ciphertext.set(new Uint8Array(encryptedBuffer), 0);
    ciphertext.set(new Uint8Array(authTagBuffer), encryptedBuffer.byteLength);

    // Decrypt
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuffer,
      },
      cryptoKey,
      ciphertext,
    );

    // Convert decrypted buffer to string
    const decryptedString = new TextDecoder().decode(decryptedBuffer);
    return decryptedString;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a payload from the backend reveal API response
 * @param {object} payload - Encrypted payload from backend
 * @param {string} payload.encryptedData - Base64 encoded encrypted data
 * @param {string} payload.iv - Base64 encoded IV
 * @param {string} payload.authTag - Base64 encoded auth tag
 * @param {string} encryptionKey - Base64 encoded encryption key
 * @returns {Promise<object>} Decrypted data object
 */
export async function decryptPayload(payload, encryptionKey) {
  try {
    if (!payload || !encryptionKey) {
      throw new Error("Missing payload or encryption key");
    }

    const { encryptedData, iv, authTag } = payload;

    if (!encryptedData || !iv || !authTag) {
      throw new Error(
        "Invalid payload structure. Missing encryption parameters.",
      );
    }

    // Decrypt the data
    const decryptedString = await decryptAES256GCM(
      encryptedData,
      encryptionKey,
      iv,
      authTag,
    );

    // Parse as JSON
    try {
      const decryptedData = JSON.parse(decryptedString);
      return decryptedData;
    } catch {
      // If not JSON, return as string
      return { data: decryptedString };
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Derive encryption key from user password
 * Uses PBKDF2 for key derivation
 * @param {string} password - User password
 * @param {string} salt - Base64 encoded salt
 * @param {number} iterations - Number of iterations (default: 100000)
 * @returns {Promise<string>} Base64 encoded derived key
 */
export async function deriveKeyFromPassword(
  password,
  salt,
  iterations = 100000,
) {
  try {
    if (!password || !salt) {
      throw new Error("Missing password or salt");
    }

    // Convert password to ArrayBuffer
    const passwordBuffer = new TextEncoder().encode(password);

    // Convert salt from Base64
    const saltBuffer = base64ToArrayBuffer(salt);

    // Derive key using PBKDF2
    const baseKey = await window.crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveBits"],
    );

    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: iterations,
        hash: "SHA-256",
      },
      baseKey,
      256, // 256 bits = 32 bytes for AES-256
    );

    // Convert to Base64
    return arrayBufferToBase64(derivedBits);
  } catch (error) {
    throw new Error(`Key derivation failed: ${error.message}`);
  }
}

/**
 * Generate a random encryption key (for testing/demo)
 * @returns {Promise<string>} Base64 encoded random key
 */
export async function generateRandomKey() {
  try {
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"],
    );

    const keyBuffer = await window.crypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(keyBuffer);
  } catch (error) {
    throw new Error(`Key generation failed: ${error.message}`);
  }
}

/**
 * Helper: Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Helper: Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Verify encryption payload structure
 * @param {object} payload - Payload to verify
 * @returns {boolean} True if valid
 */
export function isValidEncryptedPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return (
    typeof payload.encryptedData === "string" &&
    typeof payload.iv === "string" &&
    typeof payload.authTag === "string"
  );
}

/**
 * Format decrypted data for display
 * @param {object} decryptedData - Decrypted data object
 * @returns {object} Formatted display data
 */
export function formatDecryptedData(decryptedData) {
  return {
    displayValue: decryptedData,
    isDecrypted: true,
    decryptedAt: new Date().toISOString(),
  };
}

/**
 * Check if decryption key is valid (basic check)
 * @param {string} key - Base64 encoded key
 * @returns {boolean} True if appears valid
 */
export function isValidEncryptionKey(key) {
  if (!key || typeof key !== "string") {
    return false;
  }

  try {
    const buffer = base64ToArrayBuffer(key);
    return buffer.byteLength === 32; // Must be 32 bytes for AES-256
  } catch {
    return false;
  }
}
