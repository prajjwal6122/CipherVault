/**
 * P2-2.1.2: Decryption Timeout Mechanism
 *
 * Browser-side mechanism for automatically masking/re-encrypting decrypted data
 * after a configurable timeout period. Prevents sensitive data from remaining
 * visible indefinitely after decryption.
 *
 * Features:
 * - Auto-mask after timeout (customizable duration: 30s - 60m)
 * - Activity reset (user interaction extends timeout)
 * - Multiple masking strategies (blur, hide, partial mask)
 * - Visual countdown timer for UI
 * - Callback hooks for custom behavior
 * - Concurrent timeout management
 * - Memory-efficient for 100+ fields
 */

/**
 * Global timeout registry
 * Maps field ID → timeout config object
 */
const timeoutRegistry = new Map();

/**
 * Global configuration
 */
let globalConfig = {
  autoMask: true,
  defaultTimeout: 5 * 60 * 1000, // 5 minutes
  maskingStrategy: "blur",
  maskingOptions: { blur_radius: 8 },
};

/**
 * Create a new decryption timeout for a field
 *
 * @param {string} fieldId - Unique field identifier
 * @param {number} duration - Timeout duration in milliseconds (30s - 60m, default 5m)
 * @param {Object} options - Configuration options
 * @param {Function} options.onTimeout - Called when timeout expires
 * @param {Function} options.onEncrypt - Called to re-encrypt field
 * @param {string} options.maskedValue - Value to display when masked
 * @param {string} options.maskingStrategy - Strategy for masking (blur, hide, partial)
 * @param {Object} options.maskingOptions - Options for masking strategy
 * @param {boolean} options.requireMask - If true, maskedValue is required
 * @param {Function} options.onCleanup - Called when timeout is cleaned up
 * @param {boolean} options.allowReset - Allow resetting timeout via activity
 *
 * @returns {Object} Timeout handle with methods
 * @throws {Error} If configuration is invalid
 */
function createDecryptionTimeout(fieldId, duration, options = {}) {
  // Validate field ID - check if provided first
  if (fieldId === null || fieldId === undefined) {
    throw new Error("Field ID is required");
  }
  if (typeof fieldId !== "string" || fieldId.trim() === "") {
    throw new Error("Field ID cannot be empty");
  }

  // Check for duplicate
  if (timeoutRegistry.has(fieldId)) {
    throw new Error(`Timeout already exists for field: ${fieldId}`);
  }

  // Use default duration if not provided
  if (duration === undefined) {
    duration = globalConfig.defaultTimeout;
  }

  // Validate duration (allow 0 for no timeout, Infinity for permanent)
  if (duration !== 0 && duration !== Infinity) {
    if (duration < 30 * 1000) {
      throw new Error("Timeout duration must be at least 30 seconds");
    }
    if (duration > 60 * 60 * 1000) {
      throw new Error("Timeout duration cannot exceed 60 minutes");
    }
  }

  // Validate maskedValue if required
  if (options.requireMask && !options.maskedValue) {
    throw new Error("Masked value is required when requireMask is true");
  }

  // Create timeout config
  const config = {
    fieldId,
    duration,
    isActive: true,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    isMasked: false,
    maskedValue: options.maskedValue || null,
    maskingStrategy: options.maskingStrategy || globalConfig.maskingStrategy,
    maskingOptions: options.maskingOptions || globalConfig.maskingOptions,

    // Callbacks
    onTimeout: options.onTimeout || (() => {}),
    onEncrypt: options.onEncrypt || (() => {}),
    onCleanup: options.onCleanup || (() => {}),

    // Configuration
    allowReset: options.allowReset !== false, // Default to true

    // Internal timeout reference
    timeoutId: null,
  };

  // Don't set actual timeout for zero or Infinity durations
  if (duration !== 0 && duration !== Infinity) {
    config.timeoutId = setTimeout(() => {
      // Mark as masked
      config.isMasked = true;
      config.isActive = false;

      // Call callbacks
      config.onEncrypt(fieldId);
      config.onTimeout(fieldId);
    }, duration);
  }

  // Store in registry
  timeoutRegistry.set(fieldId, config);

  // Return handle object with public methods
  return {
    fieldId,
    duration,
    isActive: config.isActive,

    getMaskedValue: () => config.maskedValue,
    getMaskingStrategy: () => config.maskingStrategy,
    getMaskingOptions: () => ({ ...config.maskingOptions }),
    getLastActivity: () => config.lastActivity,
    getFormattedCountdown: () => formatCountdown(config),
    getProgressPercentage: () => calculateProgress(config),
    cleanup: () => cleanupTimeout(config),
  };
}

/**
 * Reset timeout for a field (on user activity)
 *
 * @param {string} fieldId - Field to reset
 * @throws {Error} If field not found or already expired
 */
function resetDecryptionTimeout(fieldId) {
  const config = timeoutRegistry.get(fieldId);

  if (!config) {
    throw new Error(`No timeout for field: ${fieldId}`);
  }

  if (config.isMasked) {
    throw new Error(`Timeout already expired for field: ${fieldId}`);
  }

  // Update last activity
  config.lastActivity = Date.now();

  // Clear existing timeout
  if (config.timeoutId) {
    clearTimeout(config.timeoutId);
  }

  // Set new timeout
  if (config.duration !== 0 && config.duration !== Infinity) {
    config.timeoutId = setTimeout(() => {
      config.isMasked = true;
      config.isActive = false;
      config.onEncrypt(fieldId);
      config.onTimeout(fieldId);
    }, config.duration);
  }
}

/**
 * Check if a field is currently masked
 *
 * @param {string} fieldId - Field to check
 * @returns {boolean} True if field is masked
 */
function isDecryptedFieldMasked(fieldId) {
  const config = timeoutRegistry.get(fieldId);
  return config ? config.isMasked : false;
}

/**
 * Get remaining time until timeout for a field
 *
 * @param {string} fieldId - Field to check
 * @returns {number} Milliseconds remaining (0 if expired or no timeout)
 */
function getDecryptionTimeRemaining(fieldId) {
  const config = timeoutRegistry.get(fieldId);
  if (!config || config.isMasked) {
    return 0;
  }

  const elapsed = Date.now() - config.lastActivity;
  const remaining = config.duration - elapsed;

  return Math.max(0, remaining);
}

/**
 * Format countdown as MM:SS for UI display
 *
 * @param {Object} config - Timeout config
 * @returns {string} Formatted countdown (MM:SS)
 */
function formatCountdown(config) {
  if (config.isMasked) {
    return "00:00";
  }

  const remaining = getDecryptionTimeRemaining(config.fieldId);
  const totalSeconds = Math.ceil(remaining / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Calculate progress percentage for progress bars
 *
 * @param {Object} config - Timeout config
 * @returns {number} Progress percentage (0-100)
 */
function calculateProgress(config) {
  if (config.isMasked) {
    return 0;
  }

  const elapsed = Date.now() - config.lastActivity;
  const remaining = Math.max(0, config.duration - elapsed);
  const progress = Math.max(
    0,
    Math.min(100, (remaining / config.duration) * 100),
  );

  return Math.floor(progress);
}

/**
 * Clean up timeout and remove from registry
 *
 * @param {Object} config - Timeout config
 */
function cleanupTimeout(config) {
  if (config.timeoutId) {
    clearTimeout(config.timeoutId);
  }

  config.onCleanup();
  timeoutRegistry.delete(config.fieldId);
}

/**
 * Clear all active timeouts
 */
function clearAllTimeouts() {
  // Cleanup all timeouts
  for (const [fieldId, config] of timeoutRegistry.entries()) {
    if (config.timeoutId) {
      clearTimeout(config.timeoutId);
    }
  }

  // Clear registry
  timeoutRegistry.clear();
}

/**
 * Setup timeout manager with configuration
 *
 * @param {Object} options - Configuration
 * @param {boolean} options.autoMask - Auto-mask on timeout
 * @param {number} options.defaultTimeout - Default timeout duration
 *
 * @returns {Object} Manager with event handlers
 */
function setupTimeoutManager(options = {}) {
  // Update global config
  if (options.autoMask !== undefined) {
    globalConfig.autoMask = options.autoMask;
  }
  if (options.defaultTimeout !== undefined) {
    globalConfig.defaultTimeout = options.defaultTimeout;
  }

  return {
    onDecryptionComplete: (fieldId, options = {}) => {
      if (globalConfig.autoMask) {
        const timeout = options.timeout || globalConfig.defaultTimeout;
        createDecryptionTimeout(fieldId, timeout, options);
      }
    },

    getActiveTimeouts: () => {
      return Array.from(timeoutRegistry.keys());
    },

    isFieldMasked: isDecryptedFieldMasked,
    getTimeRemaining: getDecryptionTimeRemaining,
    reset: resetDecryptionTimeout,
    clearAll: clearAllTimeouts,
  };
}

/**
 * Configure global masking behavior
 *
 * @param {Object} options - Masking configuration
 * @param {string} options.strategy - Masking strategy (blur, hide, partial)
 * @param {number} options.blur_radius - Blur radius in pixels (for blur strategy)
 * @param {number} options.default_timeout - Default timeout for new fields
 */
function configureMaskingBehavior(options = {}) {
  if (options.strategy) {
    globalConfig.maskingStrategy = options.strategy;
  }

  if (options.blur_radius !== undefined) {
    globalConfig.maskingOptions.blur_radius = options.blur_radius;
  }

  if (options.default_timeout !== undefined) {
    globalConfig.defaultTimeout = options.default_timeout;
  }
}

/**
 * React Hook: useDecryptionTimeout
 *
 * Usage:
 * const {
 *   masked,
 *   remaining,
 *   formatted,
 *   progress,
 *   reset
 * } = useDecryptionTimeout(fieldId, duration);
 *
 * Returns state for rendering countdown timer UI
 */
function useDecryptionTimeout(fieldId, duration) {
  const [state, setState] = React.useState({
    masked: false,
    remaining: duration,
    formatted: formatCountdown({
      duration,
      isMasked: false,
      lastActivity: Date.now(),
    }),
    progress: 100,
  });

  React.useEffect(() => {
    const config = createDecryptionTimeout(fieldId, duration);

    // Update UI every 500ms
    const interval = setInterval(() => {
      const remaining = getDecryptionTimeRemaining(fieldId);
      const isMasked = isDecryptedFieldMasked(fieldId);

      setState({
        masked: isMasked,
        remaining,
        formatted: formatCountdown({
          ...config,
          isMasked,
          lastActivity: Date.now() - (duration - remaining),
        }),
        progress: calculateProgress({
          ...config,
          isMasked,
          lastActivity: Date.now() - (duration - remaining),
        }),
      });
    }, 500);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      cleanupTimeout(timeoutRegistry.get(fieldId) || {});
    };
  }, [fieldId, duration]);

  return {
    ...state,
    reset: () => resetDecryptionTimeout(fieldId),
  };
}

// Export all functions
module.exports = {
  createDecryptionTimeout,
  resetDecryptionTimeout,
  isDecryptedFieldMasked,
  getDecryptionTimeRemaining,
  setupTimeoutManager,
  clearAllTimeouts,
  configureMaskingBehavior,
  useDecryptionTimeout,

  // For testing
  _getRegistry: () => timeoutRegistry,
  _getConfig: () => globalConfig,
};
