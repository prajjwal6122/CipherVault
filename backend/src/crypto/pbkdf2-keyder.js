/**
 * PBKDF2 Key Derivation Module (P2-1.1.2)
 * Password-Based Key Derivation Function 2 (PBKDF2)
 *
 * Security Characteristics:
 * - Algorithm: PBKDF2 with HMAC-SHA256
 * - Default Iterations: 100,000 (NIST recommendation for 2024)
 * - Output Key Size: 256 bits (32 bytes)
 * - Salt Size: 16 bytes (128 bits) minimum
 * - Derived from PKCS #5 standard (RFC 8018)
 *
 * Usage:
 * const { deriveKeyFromPassword, generateSalt } = require('./pbkdf2-keyder');
 *
 * const password = 'user-password';
 * const salt = generateSalt();
 * const key = deriveKeyFromPassword(password, salt);
 */

const crypto = require("crypto");

// Constants
const DEFAULT_ITERATIONS = 100000; // NIST recommendation (as of 2024)
const MINIMUM_ITERATIONS = 100000; // Enforce minimum for security
const KEY_LENGTH = 32; // 256 bits for AES-256
const SALT_MIN_LENGTH = 16; // 128 bits minimum
const HASH_ALGORITHM = "sha256"; // HMAC-SHA256

/**
 * Validate PBKDF2 input parameters
 * @param {string} password - User password
 * @param {Buffer} salt - Cryptographic salt
 * @param {number} iterations - Number of iterations (optional, defaults to 100000)
 * @throws {Error} If inputs are invalid
 */
function validatePBKDF2Input(password, salt, iterations = DEFAULT_ITERATIONS) {
  if (!password && password !== "") {
    throw new Error("Password is required");
  }

  if (!Buffer.isBuffer(salt)) {
    throw new Error("Salt must be a Buffer");
  }

  if (salt.length < SALT_MIN_LENGTH) {
    throw new Error(
      `Salt must be at least ${SALT_MIN_LENGTH} bytes (128 bits)`,
    );
  }

  if (!Number.isInteger(iterations) || iterations < MINIMUM_ITERATIONS) {
    throw new Error(
      `Iterations must be an integer >= ${MINIMUM_ITERATIONS} (NIST recommendation)`,
    );
  }
}

/**
 * Derive a cryptographic key from a password using PBKDF2
 *
 * @param {string} password - User password (any length)
 * @param {Buffer} salt - Random salt (minimum 16 bytes)
 * @param {number} iterations - Number of HMAC iterations (default: 100000, min: 100000)
 * @returns {Buffer} Derived key (32 bytes / 256 bits)
 *
 * @throws {Error} If parameters are invalid
 *
 * @note
 * - Always use a random salt for each password (don't reuse salts)
 * - Use at least 100,000 iterations (NIST 2024 recommendation)
 * - Higher iterations increase security but slow key derivation
 * - For user passwords, 100,000-200,000 iterations is typical
 *
 * @example
 * const salt = crypto.randomBytes(16);
 * const password = 'MySecurePassword';
 * const key = deriveKeyFromPassword(password, salt);
 * // key is a 32-byte Buffer suitable for AES-256 encryption
 */
function deriveKeyFromPassword(
  password,
  salt,
  iterations = DEFAULT_ITERATIONS,
) {
  validatePBKDF2Input(password, salt, iterations);

  try {
    // PBKDF2-HMAC-SHA256 key derivation
    // Returns a buffer of KEY_LENGTH bytes
    const derivedKey = crypto.pbkdf2Sync(
      password, // Password (converted to UTF-8)
      salt, // Random salt
      iterations, // Number of iterations
      KEY_LENGTH, // Output key length (32 bytes)
      HASH_ALGORITHM, // HMAC hash function (SHA-256)
    );

    return derivedKey;
  } catch (error) {
    throw new Error(`Key derivation failed: ${error.message}`);
  }
}

/**
 * Generate a cryptographically secure random salt
 *
 * @param {number} length - Salt length in bytes (default: 16, min: 16)
 * @returns {Buffer} Random salt bytes
 *
 * @throws {Error} If length is invalid
 *
 * @note Always generate a new salt for each password
 *
 * @example
 * const salt = generateSalt();
 * // Store salt alongside password hash in database
 * // Salt doesn't need to be secret, only unique per password
 */
function generateSalt(length = SALT_MIN_LENGTH) {
  if (!Number.isInteger(length) || length < SALT_MIN_LENGTH) {
    throw new Error(`Salt length must be an integer >= ${SALT_MIN_LENGTH}`);
  }

  return crypto.randomBytes(length);
}

/**
 * Verify that a derived key matches the expected key from a password and salt
 * Uses constant-time comparison to prevent timing attacks
 *
 * @param {string} password - User password to verify
 * @param {Buffer} salt - Salt used in original derivation
 * @param {Buffer} expectedKey - Previously derived key to compare against
 * @param {number} iterations - Iteration count used (default: 100000)
 * @returns {boolean} True if key matches, false otherwise
 *
 * @note Uses crypto.timingSafeEqual for constant-time comparison
 *
 * @example
 * const password = 'UserPassword';
 * const salt = Buffer.from('...'); // Stored salt
 * const expectedKey = Buffer.from('...'); // Stored key
 *
 * const isMatch = verifyDerivedKey(password, salt, expectedKey);
 * if (isMatch) {
 *   // Password is correct
 * }
 */
function verifyDerivedKey(
  password,
  salt,
  expectedKey,
  iterations = DEFAULT_ITERATIONS,
) {
  try {
    // Derive key from provided password
    const derivedKey = deriveKeyFromPassword(password, salt, iterations);

    // Use constant-time comparison to prevent timing attacks
    // timingSafeEqual throws if buffers are different lengths
    try {
      return crypto.timingSafeEqual(derivedKey, expectedKey);
    } catch (error) {
      // Buffers have different lengths or one is not a Buffer
      return false;
    }
  } catch (error) {
    // Error during derivation means verification failed
    return false;
  }
}

/**
 * Create a complete password hashing object with salt and derived key
 * Useful for password storage and verification
 *
 * @param {string} password - User password
 * @param {number} iterations - Number of iterations (optional)
 * @returns {Object} Object with salt and key for storage
 *
 * @example
 * const hashObj = derivePasswordHash('UserPassword');
 * // Store hashObj.salt and hashObj.key in database
 * // Later, for verification:
 * // const isValid = verifyDerivedKey(password, hashObj.salt, hashObj.key);
 */
function derivePasswordHash(password, iterations = DEFAULT_ITERATIONS) {
  const salt = generateSalt();
  const key = deriveKeyFromPassword(password, salt, iterations);

  return {
    salt,
    key,
    iterations,
    algorithm: "pbkdf2-hmac-sha256",
  };
}

/**
 * Create a JSON-serializable password hash object
 * Encodes salt and key as hex strings for database storage
 *
 * @param {string} password - User password
 * @param {number} iterations - Number of iterations (optional)
 * @returns {Object} Serializable hash object
 *
 * @example
 * const hash = derivePasswordHashJSON('password');
 * // store in database as JSON
 * console.log(hash);
 * // {
 * //   salt: 'a1b2c3d4...',
 * //   key: 'e5f6g7h8...',
 * //   iterations: 100000,
 * //   algorithm: 'pbkdf2-hmac-sha256'
 * // }
 */
function derivePasswordHashJSON(password, iterations = DEFAULT_ITERATIONS) {
  const hash = derivePasswordHash(password, iterations);

  return {
    salt: hash.salt.toString("hex"),
    key: hash.key.toString("hex"),
    iterations: hash.iterations,
    algorithm: hash.algorithm,
  };
}

/**
 * Verify password against stored JSON hash
 *
 * @param {string} password - Password to verify
 * @param {Object} storedHash - Stored hash object from derivePasswordHashJSON
 * @returns {boolean} True if password matches
 *
 * @example
 * const isValid = verifyPasswordHashJSON(
 *   'user-password',
 *   storedHashFromDatabase
 * );
 */
function verifyPasswordHashJSON(password, storedHash) {
  try {
    const salt = Buffer.from(storedHash.salt, "hex");
    const expectedKey = Buffer.from(storedHash.key, "hex");
    const iterations = storedHash.iterations || DEFAULT_ITERATIONS;

    return verifyDerivedKey(password, salt, expectedKey, iterations);
  } catch (error) {
    return false;
  }
}

module.exports = {
  // Key derivation
  deriveKeyFromPassword,
  derivePasswordHash,
  derivePasswordHashJSON,

  // Verification
  verifyDerivedKey,
  verifyPasswordHashJSON,

  // Utility
  generateSalt,
  validatePBKDF2Input,

  // Constants
  DEFAULT_ITERATIONS,
  MINIMUM_ITERATIONS,
  KEY_LENGTH,
  SALT_MIN_LENGTH,
  HASH_ALGORITHM,
};
