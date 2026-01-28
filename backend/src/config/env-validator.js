/**
 * Environment Configuration Validator
 * Validates required environment variables across all projects
 *
 * Usage:
 * - Backend: require('./src/config/env-validator');
 * - Frontend: import { validateEnv } from '@config/env-validator';
 * - CLI: require('./src/config/env-validator');
 */

class EnvironmentValidator {
  constructor(projectName = "unknown") {
    this.projectName = projectName;
    this.errors = [];
    this.warnings = [];
    this.config = {};
  }

  /**
   * Validate a required environment variable
   * @param {string} key - Environment variable name
   * @param {string} defaultValue - Default value if not present (optional)
   * @param {object} options - Validation options
   * @returns {string|number} - The environment variable value
   */
  require(key, defaultValue = null, options = {}) {
    const value = process.env[key];

    if (!value && defaultValue === null) {
      this.errors.push(`❌ REQUIRED: ${key} is not defined`);
      return undefined;
    }

    const finalValue = value || defaultValue;

    // Type validation
    if (options.type === "number") {
      if (isNaN(finalValue)) {
        this.errors.push(
          `❌ TYPE: ${key} must be a number, got "${finalValue}"`,
        );
        return undefined;
      }
      this.config[key] = Number(finalValue);
      return Number(finalValue);
    }

    if (options.type === "boolean") {
      const boolValue = value === "true" || value === "1" || value === true;
      this.config[key] = boolValue;
      return boolValue;
    }

    // Pattern validation
    if (options.pattern && !options.pattern.test(finalValue)) {
      this.errors.push(
        `❌ PATTERN: ${key} does not match required pattern. Got: "${finalValue}"`,
      );
      return undefined;
    }

    // Length validation
    if (options.minLength && finalValue.length < options.minLength) {
      this.errors.push(
        `❌ LENGTH: ${key} must be at least ${options.minLength} characters, got ${finalValue.length}`,
      );
      return undefined;
    }

    if (options.maxLength && finalValue.length > options.maxLength) {
      this.errors.push(
        `❌ LENGTH: ${key} must be at most ${options.maxLength} characters, got ${finalValue.length}`,
      );
      return undefined;
    }

    // Enum validation
    if (options.enum && !options.enum.includes(finalValue)) {
      this.errors.push(
        `❌ ENUM: ${key} must be one of [${options.enum.join(", ")}], got "${finalValue}"`,
      );
      return undefined;
    }

    this.config[key] = finalValue;
    return finalValue;
  }

  /**
   * Validate an optional environment variable
   * @param {string} key - Environment variable name
   * @param {string} defaultValue - Default value
   * @param {object} options - Validation options
   * @returns {string|number|undefined} - The environment variable value or undefined
   */
  optional(key, defaultValue = undefined, options = {}) {
    const value = process.env[key];

    if (!value && defaultValue === undefined) {
      return undefined;
    }

    const finalValue = value || defaultValue;

    // Type validation
    if (options.type === "number" && finalValue) {
      if (isNaN(finalValue)) {
        this.warnings.push(
          `⚠️  TYPE: ${key} should be a number, got "${finalValue}"`,
        );
        return undefined;
      }
      this.config[key] = Number(finalValue);
      return Number(finalValue);
    }

    // Enum validation
    if (options.enum && finalValue && !options.enum.includes(finalValue)) {
      this.warnings.push(
        `⚠️  ENUM: ${key} should be one of [${options.enum.join(", ")}], got "${finalValue}"`,
      );
      return undefined;
    }

    this.config[key] = finalValue;
    return finalValue;
  }

  /**
   * Get all validated configuration
   * @returns {object} - Configuration object
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Check if validation passed
   * @returns {boolean} - True if no errors
   */
  isValid() {
    return this.errors.length === 0;
  }

  /**
   * Get validation errors
   * @returns {array} - Array of error messages
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Get validation warnings
   * @returns {array} - Array of warning messages
   */
  getWarnings() {
    return [...this.warnings];
  }

  /**
   * Print validation report and exit if invalid
   * @param {boolean} exitOnError - Exit process if errors found (default: true)
   * @returns {void}
   */
  validate(exitOnError = true) {
    // Print warnings
    if (this.warnings.length > 0) {
      // Warnings exist but not logged
    }

    // Print errors
    if (this.errors.length > 0) {
      if (exitOnError) {
        process.exit(1);
      }
    }

    // Configuration validated
  }

  /**
   * Clear all errors and warnings
   * @returns {void}
   */
  reset() {
    this.errors = [];
    this.warnings = [];
    this.config = {};
  }
}

module.exports = EnvironmentValidator;
