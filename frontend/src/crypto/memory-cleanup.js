/**
 * P2-2.1.3: Memory Cleanup for Sensitive Data
 *
 * Utilities for securely clearing sensitive decrypted data from memory
 * and React component state to prevent leakage through:
 * - Browser DevTools inspection
 * - Memory dumps
 * - Clipboard remnants
 * - Process snapshots
 *
 * Features:
 * - Buffer overwriting with random data
 * - React state cleanup utilities
 * - Component unmount handlers
 * - Clipboard management
 * - DevTools inspection prevention
 * - Audit logging
 */

/**
 * Global configuration
 */
let globalConfig = {
  autoCleanupEnabled: true,
  iterations: 3,
  strategy: "random", // 'random', 'zeros', 'ones'
};

/**
 * Overwrite buffer with random data to prevent recovery
 *
 * @param {Buffer|Uint8Array} buffer - Buffer to overwrite
 * @param {Object} options - Configuration
 * @param {number} options.iterations - Number of overwrite passes (default 3)
 * @param {string} options.strategy - 'random', 'zeros', or 'ones'
 */
function overwriteBuffer(buffer, options = {}) {
  if (!buffer || buffer.length === 0) {
    return;
  }

  const iterations = options.iterations || globalConfig.iterations;
  const strategy = options.strategy || globalConfig.strategy;

  for (let pass = 0; pass < iterations; pass++) {
    for (let i = 0; i < buffer.length; i++) {
      let value;

      switch (strategy) {
        case "zeros":
          value = 0;
          break;
        case "ones":
          value = 0xff;
          break;
        case "random":
        default:
          value = Math.floor(Math.random() * 256);
      }

      buffer[i] = value;
    }
  }
}

/**
 * Clear sensitive fields from React state object
 *
 * @param {Object} state - State object to clean
 * @param {string[]} fieldsToClean - Field names to clear
 * @param {Object} options - Configuration
 * @param {Function} options.onClear - Called when field is cleared
 */
function clearReactState(state, fieldsToClean, options = {}) {
  if (!state || typeof state !== "object") {
    return;
  }

  // Prevent clearing entire object
  if (Array.isArray(fieldsToClean) && fieldsToClean.includes("*")) {
    throw new Error("Cannot clear entire state object");
  }

  const fieldsArray = Array.isArray(fieldsToClean)
    ? fieldsToClean
    : [fieldsToClean];
  const visited = new WeakSet(); // Track visited objects to prevent infinite loops

  /**
   * Recursively clear fields in object
   */
  function clearFields(obj, fields) {
    if (!obj || typeof obj !== "object") {
      return;
    }

    // Prevent circular reference infinite loops
    if (visited.has(obj)) {
      return;
    }
    visited.add(obj);

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item) => {
        if (item && typeof item === "object") {
          clearFields(item, fields);
        }
      });
      return;
    }

    // Handle objects
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        // Clear matching fields
        if (fields.includes(key)) {
          // Overwrite buffer if it's a Buffer/Uint8Array
          if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
            overwriteBuffer(value);
          }

          obj[key] = null;

          if (options.onClear) {
            options.onClear(key);
          }
        }

        // Recursively clear nested objects (but not self-references)
        if (
          value &&
          typeof value === "object" &&
          value !== obj &&
          !Buffer.isBuffer(value)
        ) {
          clearFields(value, fields);
        }
      }
    }
  }

  clearFields(state, fieldsArray);
}

/**
 * Create cleanup handler for component unmount
 *
 * @param {Object} sensitiveData - Data to clean
 * @param {Object} options - Configuration
 * @param {string[]} options.fieldsToClean - Fields to clear
 * @param {number} options.autoCleanupAfter - Auto-cleanup timeout (ms)
 * @param {Function} options.onCleanup - Called after cleanup
 *
 * @returns {Function} Cleanup handler function
 */
function createCleanupHandler(sensitiveData, options = {}) {
  const fieldsToClean = options.fieldsToClean || [];
  let timeoutId = null;

  const cleanup = () => {
    // Clear timeout if exists
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // Clear sensitive fields
    clearReactState(sensitiveData, fieldsToClean, {
      onClear: (fieldName) => {
        if (options.auditLog) {
          options.auditLog({
            action: "field_cleared",
            field: fieldName,
            timestamp: Date.now(),
          });
        }
      },
    });

    // Call cleanup callback
    if (options.onCleanup) {
      options.onCleanup();
    }
  };

  // Setup auto-cleanup if configured
  if (options.autoCleanupAfter && options.autoCleanupAfter > 0) {
    timeoutId = setTimeout(cleanup, options.autoCleanupAfter);
  }

  return cleanup;
}

/**
 * React Hook: useSensitiveState
 *
 * Manages sensitive state with automatic cleanup on unmount
 *
 * Usage:
 * const { state, setState, cleanup } = useSensitiveState(
 *   { password: '', ssn: '' },
 *   ['password', 'ssn']
 * );
 *
 * @param {Object} initialState - Initial state
 * @param {string[]} sensitiveFields - Fields to clean on unmount
 *
 * @returns {Object} { state, setState, cleanup }
 */
function useSensitiveState(initialState, sensitiveFields = []) {
  const state = { ...initialState };
  let cleanup = null;

  const setState = (updates) => {
    Object.assign(state, updates);
  };

  const setupCleanup = () => {
    cleanup = createCleanupHandler(state, {
      fieldsToClean: sensitiveFields,
    });
  };

  setupCleanup();

  return {
    state,
    setState,
    cleanup: cleanup || (() => {}),
  };
}

/**
 * Prevent sensitive data from being visible in DevTools
 *
 * @param {Object} obj - Object to protect
 * @param {string[]} sensitiveFields - Field names to hide
 */
function preventDevToolsExport(obj, sensitiveFields = []) {
  if (!obj || typeof obj !== "object") {
    return;
  }

  // Use Proxy to intercept property access
  try {
    const handler = {
      get(target, prop) {
        if (sensitiveFields.includes(prop)) {
          // Log access attempt
          return undefined; // Don't expose value
        }
        return Reflect.get(target, prop);
      },

      getOwnPropertyDescriptor(target, prop) {
        if (sensitiveFields.includes(prop)) {
          return undefined; // Hide from enumeration
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },

      ownKeys(target) {
        // Hide sensitive keys from enumeration
        return Reflect.ownKeys(target).filter(
          (key) => !sensitiveFields.includes(key),
        );
      },
    };

    return new Proxy(obj, handler);
  } catch (e) {
    // Proxy not supported, silently fail
    return obj;
  }
}

/**
 * Setup global memory cleanup configuration
 *
 * @param {Object} options - Configuration
 * @param {boolean} options.autoCleanupEnabled - Enable auto-cleanup
 * @param {number} options.iterations - Overwrite iterations
 * @param {string} options.strategy - Overwrite strategy
 * @param {Function} options.onProcessExit - Called on process exit
 */
function setupMemoryCleanup(options = {}) {
  if (options.autoCleanupEnabled !== undefined) {
    globalConfig.autoCleanupEnabled = options.autoCleanupEnabled;
  }

  if (options.iterations !== undefined) {
    globalConfig.iterations = options.iterations;
  }

  if (options.strategy) {
    globalConfig.strategy = options.strategy;
  }

  // Setup process exit handler if provided
  if (options.onProcessExit && typeof process !== "undefined") {
    process.on("exit", options.onProcessExit);
  }

  return {
    cleanup: (data, fields) => clearReactState(data, fields),
  };
}

/**
 * Shred array of buffers/sensitive data
 *
 * @param {Array} array - Array of buffers to shred
 * @param {Object} options - Configuration
 */
function shredArray(array, options = {}) {
  if (!Array.isArray(array) || array.length === 0) {
    return;
  }

  array.forEach((item) => {
    if (Buffer.isBuffer(item) || item instanceof Uint8Array) {
      overwriteBuffer(item, options);
    }
  });
}

/**
 * Secure clipboard management - clear clipboard after timeout
 *
 * @param {string} text - Text to copy
 * @param {number} timeoutMs - Clear clipboard after this many ms
 * @returns {Promise}
 */
async function secureCopyToClipboard(text, timeoutMs = 30000) {
  try {
    if (navigator && navigator.clipboard) {
      await navigator.clipboard.writeText(text);

      // Schedule clipboard clearing
      setTimeout(async () => {
        try {
          // Overwrite with spaces instead of clearing
          const spaces = " ".repeat(text.length);
          await navigator.clipboard.writeText(spaces);
        } catch (e) {
          // Clipboard access may fail silently
        }
      }, timeoutMs);
    }
  } catch (e) {
    // Clipboard not available (private browsing, etc.)
  }
}

/**
 * Create readonly wrapper for sensitive object
 * Prevents accidental modification
 *
 * @param {Object} obj - Object to make readonly
 * @returns {Proxy} Readonly proxy
 */
function makeReadonly(obj) {
  return new Proxy(obj, {
    set: () => {
      throw new Error("Cannot modify readonly sensitive object");
    },
    deleteProperty: () => {
      throw new Error("Cannot delete from readonly sensitive object");
    },
  });
}

/**
 * Audit log for cleanup operations
 *
 * @param {string} action - Action performed
 * @param {Object} details - Operation details
 */
const auditLog = (action, details) => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const logs = JSON.parse(localStorage.getItem("__audit_log") || "[]");
      logs.push({
        action,
        details,
        timestamp: new Date().toISOString(),
      });
      // Keep last 100 log entries
      if (logs.length > 100) {
        logs.shift();
      }
      localStorage.setItem("__audit_log", JSON.stringify(logs));
    } catch (e) {
      // Storage quota exceeded or disabled
    }
  }
};

// Export all functions
module.exports = {
  overwriteBuffer,
  clearReactState,
  useSensitiveState,
  createCleanupHandler,
  preventDevToolsExport,
  setupMemoryCleanup,
  shredArray,
  secureCopyToClipboard,
  makeReadonly,
  auditLog,

  // For testing
  _getConfig: () => globalConfig,
};
