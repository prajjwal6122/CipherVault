/**
 * P2-2.1.1: Web Crypto API for Browser-Side Decryption
 * Browser-side AES-256-GCM decryption using Web Crypto API
 * Interoperates with backend Node.js crypto for encrypted data
 */

/**
 * Convert Base64 string to ArrayBuffer
 * @param {string} base64 - Base64 encoded string
 * @returns {ArrayBuffer} Binary data as ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  if (typeof base64 !== "string") {
    throw new Error("Base64 input must be a string");
  }

  if (base64.length === 0) {
    return new ArrayBuffer(0);
  }

  // Replace URL-safe characters if present
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to Base64 string
 * @param {ArrayBuffer|Uint8Array} buffer - Binary data
 * @returns {string} Base64 encoded string
 */
function arrayBufferToBase64(buffer) {
  let bytes;

  if (buffer instanceof ArrayBuffer) {
    bytes = new Uint8Array(buffer);
  } else if (buffer instanceof Uint8Array) {
    bytes = buffer;
  } else {
    throw new Error("Input must be ArrayBuffer or Uint8Array");
  }

  let binaryString = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }

  return btoa(binaryString);
}

/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - User password
 * @param {Uint8Array} salt - Random salt (minimum 16 bytes)
 * @param {number} iterations - PBKDF2 iterations (minimum 100,000)
 * @param {string} hashAlgorithm - Hash function ('SHA-256' or 'SHA-512')
 * @returns {Promise<CryptoKey>} Derived CryptoKey
 */
async function deriveKeyFromPasswordWeb(
  password,
  salt,
  iterations = 100000,
  hashAlgorithm = "SHA-256",
) {
  if (typeof password !== "string") {
    throw new Error("Password must be a string");
  }

  if (!(salt instanceof Uint8Array)) {
    throw new Error("Salt must be a Uint8Array");
  }

  if (salt.length < 16) {
    throw new Error("Salt must be at least 16 bytes (128-bit)");
  }

  if (!Number.isInteger(iterations) || iterations < 100000) {
    throw new Error("Iterations must be an integer >= 100,000");
  }

  if (!["SHA-256", "SHA-512"].includes(hashAlgorithm)) {
    throw new Error("Hash algorithm must be SHA-256 or SHA-512");
  }

  // Convert password to Uint8Array
  const passwordBuffer = new TextEncoder().encode(password);

  // Import password as key material
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  // Derive key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: hashAlgorithm,
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256, // 256-bit key for AES-256
    },
    false, // Not extractable (security best practice)
    ["decrypt"],
  );

  return derivedKey;
}

/**
 * Generate random 12-byte IV for AES-GCM
 * @returns {Uint8Array} Random IV (12 bytes / 96 bits)
 */
function generateRandomIVWeb() {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
}

/**
 * Decrypt AES-256-GCM ciphertext using Web Crypto API
 * @param {ArrayBuffer|Uint8Array|Buffer} ciphertext - Encrypted data
 * @param {CryptoKey} key - Decryption key (derived from password)
 * @param {Uint8Array|Uint8Array} iv - Initialization vector (12 bytes)
 * @param {Uint8Array|Buffer} authTag - Authentication tag (16 bytes)
 * @returns {Promise<ArrayBuffer>} Decrypted plaintext as ArrayBuffer
 */
async function decryptAES256GCMWeb(ciphertext, key, iv, authTag) {
  // Input validation
  if (!ciphertext) {
    throw new Error("Ciphertext is required");
  }

  if (!(key instanceof CryptoKey)) {
    throw new Error("Key must be a CryptoKey");
  }

  if (!(iv instanceof Uint8Array) || iv.length !== 12) {
    throw new Error("IV must be a Uint8Array of 12 bytes (96-bit)");
  }

  if (!(authTag instanceof Uint8Array) && !Buffer.isBuffer(authTag)) {
    throw new Error("Auth tag must be a Uint8Array or Buffer");
  }

  if (authTag.length !== 16) {
    throw new Error("Auth tag must be 16 bytes (128-bit)");
  }

  // Convert ciphertext to Uint8Array if needed
  let ciphertextBytes;
  if (ciphertext instanceof ArrayBuffer) {
    ciphertextBytes = new Uint8Array(ciphertext);
  } else if (ciphertext instanceof Uint8Array) {
    ciphertextBytes = ciphertext;
  } else if (Buffer.isBuffer(ciphertext)) {
    ciphertextBytes = new Uint8Array(ciphertext);
  } else {
    throw new Error("Ciphertext must be ArrayBuffer, Uint8Array, or Buffer");
  }

  // Combine ciphertext and auth tag (required by Web Crypto API)
  const combined = new Uint8Array(ciphertextBytes.length + authTag.length);
  combined.set(ciphertextBytes, 0);
  combined.set(new Uint8Array(authTag), ciphertextBytes.length);

  try {
    // Decrypt using Web Crypto API
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      combined,
    );

    return plaintext;
  } catch (error) {
    // Re-throw with consistent error message (no plaintext exposure)
    if (error.name === "OperationError") {
      throw new Error(
        "Decryption failed: Invalid password, tampered ciphertext, or corrupted data",
      );
    }
    throw error;
  }
}

/**
 * Decrypt JSON field from backend encrypted payload
 * @param {object} encryptedField - { ciphertext, iv, authTag, algorithm }
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<string>} Decrypted plaintext
 */
async function decryptFieldWeb(encryptedField, key) {
  if (!encryptedField || typeof encryptedField !== "object") {
    throw new Error("Encrypted field must be an object");
  }

  if (
    !encryptedField.ciphertext ||
    !encryptedField.iv ||
    !encryptedField.authTag
  ) {
    throw new Error(
      "Encrypted field missing required properties: ciphertext, iv, authTag",
    );
  }

  const ciphertext = base64ToArrayBuffer(encryptedField.ciphertext);
  const iv = new Uint8Array(base64ToArrayBuffer(encryptedField.iv));
  const authTag = new Uint8Array(base64ToArrayBuffer(encryptedField.authTag));

  const plaintext = await decryptAES256GCMWeb(ciphertext, key, iv, authTag);

  return new TextDecoder().decode(plaintext);
}

/**
 * Decrypt entire encrypted payload with multiple fields
 * @param {object} encryptedPayload - { encrypted: {...}, plaintext: {...} }
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<object>} Complete object with all fields decrypted
 */
async function decryptPayloadWeb(encryptedPayload, key) {
  if (!encryptedPayload || typeof encryptedPayload !== "object") {
    throw new Error("Encrypted payload must be an object");
  }

  const result = { ...encryptedPayload.plaintext };

  if (
    encryptedPayload.encrypted &&
    typeof encryptedPayload.encrypted === "object"
  ) {
    for (const [fieldPath, encryptedField] of Object.entries(
      encryptedPayload.encrypted,
    )) {
      try {
        const decrypted = await decryptFieldWeb(encryptedField, key);
        result[fieldPath] = decrypted;
      } catch (error) {
        throw new Error(
          `Failed to decrypt field ${fieldPath}: ${error.message}`,
        );
      }
    }
  }

  return result;
}

// Export for Node.js (testing environment)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    base64ToArrayBuffer,
    arrayBufferToBase64,
    deriveKeyFromPasswordWeb,
    generateRandomIVWeb,
    decryptAES256GCMWeb,
    decryptFieldWeb,
    decryptPayloadWeb,
  };
}
