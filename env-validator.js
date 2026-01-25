/**
 * Shared Environment Validator
 * Can be used by frontend, CLI, and other projects
 */

class EnvironmentValidator {
  constructor(projectName = "unknown") {
    this.projectName = projectName;
    this.errors = [];
    this.warnings = [];
    this.config = {};
  }

  require(key, defaultValue = null, options = {}) {
    const value =
      (typeof process !== "undefined" && process.env ? process.env[key] : null) ||
      (typeof window !== "undefined" && window.__ENV__
        ? window.__ENV__[key]
        : null);

    if (!value && defaultValue === null) {
      this.errors.push(`❌ REQUIRED: ${key} is not defined`);
      return undefined;
    }

    const finalValue = value || defaultValue;

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

    if (options.pattern && !options.pattern.test(finalValue)) {
      this.errors.push(
        `❌ PATTERN: ${key} does not match required pattern. Got: "${finalValue}"`,
      );
      return undefined;
    }

    if (options.minLength && finalValue.length < options.minLength) {
      this.errors.push(
        `❌ LENGTH: ${key} must be at least ${options.minLength} characters`,
      );
      return undefined;
    }

    if (options.enum && !options.enum.includes(finalValue)) {
      this.errors.push(
        `❌ ENUM: ${key} must be one of [${options.enum.join(", ")}], got "${finalValue}"`,
      );
      return undefined;
    }

    this.config[key] = finalValue;
    return finalValue;
  }

  optional(key, defaultValue = undefined, options = {}) {
    const value =
      (typeof process !== "undefined" && process.env ? process.env[key] : null) ||
      (typeof window !== "undefined" && window.__ENV__
        ? window.__ENV__[key]
        : null);

    if (!value && defaultValue === undefined) {
      return undefined;
    }

    const finalValue = value || defaultValue;

    if (options.type === "number" && finalValue) {
      if (isNaN(finalValue)) {
        this.warnings.push(`⚠️  TYPE: ${key} should be a number`);
        return undefined;
      }
      this.config[key] = Number(finalValue);
      return Number(finalValue);
    }

    if (options.enum && finalValue && !options.enum.includes(finalValue)) {
      this.warnings.push(
        `⚠️  ENUM: ${key} should be one of [${options.enum.join(", ")}]`,
      );
      return undefined;
    }

    this.config[key] = finalValue;
    return finalValue;
  }

  getConfig() {
    return { ...this.config };
  }

  isValid() {
    return this.errors.length === 0;
  }

  getErrors() {
    return [...this.errors];
  }

  getWarnings() {
    return [...this.warnings];
  }

  validate(exitOnError = false) {
    if (typeof window === "undefined") {
      // Node.js environment
      console.log("\n" + "=".repeat(60));
      console.log(
        `📋 Environment Configuration Validation [${this.projectName}]`,
      );
      console.log("=".repeat(60) + "\n");

      if (this.warnings.length > 0) {
        console.log("⚠️  WARNINGS:");
        this.warnings.forEach((w) => console.log(`   ${w}`));
        console.log();
      }

      if (this.errors.length > 0) {
        console.log("❌ ERRORS:");
        this.errors.forEach((e) => console.log(`   ${e}`));
        console.log();

        if (exitOnError) {
          console.log(`🛑 Validation failed for ${this.projectName}`);
          process.exit(1);
        }
      } else {
        console.log("✅ All environment variables validated!\n");
      }

      console.log("=".repeat(60) + "\n");
    }
  }

  reset() {
    this.errors = [];
    this.warnings = [];
    this.config = {};
  }
}

// Export for both Node.js and browser environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = EnvironmentValidator;
}
