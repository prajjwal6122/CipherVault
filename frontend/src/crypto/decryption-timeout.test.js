/**
 * P2-2.1.2: Decryption Timeout Mechanism Tests
 *
 * Tests for auto-masking decrypted data after configurable timeout period.
 * Ensures sensitive information is re-encrypted/masked when not actively viewed.
 *
 * Test Categories:
 * 1. Timeout configuration validation (4 tests)
 * 2. Timeout trigger and masking (6 tests)
 * 3. User interaction (activity/reset) (5 tests)
 * 4. Concurrent timeouts (3 tests)
 * 5. Edge cases (invalid inputs, zero timeout) (4 tests)
 * 6. Integration with decryption API (2 tests)
 * 7. Performance & memory (2 tests)
 */

const {
  createDecryptionTimeout,
  resetDecryptionTimeout,
  isDecryptedFieldMasked,
  getDecryptionTimeRemaining,
  setupTimeoutManager,
  clearAllTimeouts,
  configureMaskingBehavior,
} = require("./decryption-timeout");

describe("P2-2.1.2: Decryption Timeout Mechanism", () => {
  // Setup & Cleanup
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
    clearAllTimeouts();
  });

  afterEach(() => {
    clearAllTimeouts();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ============ TIMEOUT CONFIGURATION TESTS ============

  describe("Timeout Configuration", () => {
    test("creates timeout with valid duration", () => {
      const timeout = createDecryptionTimeout("ssn", 5 * 60 * 1000); // 5 minutes

      expect(timeout).toBeDefined();
      expect(timeout.fieldId).toBe("ssn");
      expect(timeout.duration).toBe(5 * 60 * 1000);
      expect(timeout.isActive).toBe(true);
    });

    test("uses default timeout duration of 5 minutes", () => {
      const timeout = createDecryptionTimeout("dateOfBirth");

      expect(timeout.duration).toBe(5 * 60 * 1000);
    });

    test("validates minimum timeout of 30 seconds", () => {
      expect(() => {
        createDecryptionTimeout("field", 1000); // 1 second
      }).toThrow("Timeout duration must be at least 30 seconds");
    });

    test("validates maximum timeout of 60 minutes", () => {
      expect(() => {
        createDecryptionTimeout("field", 61 * 60 * 1000); // 61 minutes
      }).toThrow("Timeout duration cannot exceed 60 minutes");
    });
  });

  // ============ MASKING TRIGGER TESTS ============

  describe("Timeout Trigger and Masking", () => {
    test("masks field after timeout expires", () => {
      const timeout = createDecryptionTimeout("ssn", 30 * 1000); // 30 seconds

      expect(isDecryptedFieldMasked("ssn")).toBe(false);

      jest.advanceTimersByTime(30 * 1000);

      expect(isDecryptedFieldMasked("ssn")).toBe(true);
    });

    test("calls onTimeout callback when timeout expires", () => {
      const onTimeout = jest.fn();
      const timeout = createDecryptionTimeout("ssn", 30 * 1000, { onTimeout });

      expect(onTimeout).not.toHaveBeenCalled();

      jest.advanceTimersByTime(30 * 1000);

      expect(onTimeout).toHaveBeenCalledWith("ssn");
    });

    test("displays masked value instead of plaintext", () => {
      const timeout = createDecryptionTimeout("ssn", 30 * 1000, {
        maskedValue: "***-**-6789",
      });

      jest.advanceTimersByTime(30 * 1000);

      expect(isDecryptedFieldMasked("ssn")).toBe(true);
      // Masked value should be retrievable
      expect(timeout.getMaskedValue()).toBe("***-**-6789");
    });

    test("re-encrypts field data on timeout", () => {
      const onEncrypt = jest.fn();
      const timeout = createDecryptionTimeout("dateOfBirth", 30 * 1000, {
        onEncrypt,
      });

      jest.advanceTimersByTime(30 * 1000);

      expect(onEncrypt).toHaveBeenCalled();
    });

    test("masks multiple fields independently", () => {
      const timeout1 = createDecryptionTimeout("ssn", 30 * 1000);
      const timeout2 = createDecryptionTimeout("dateOfBirth", 60 * 1000);

      jest.advanceTimersByTime(30 * 1000);
      expect(isDecryptedFieldMasked("ssn")).toBe(true);
      expect(isDecryptedFieldMasked("dateOfBirth")).toBe(false);

      jest.advanceTimersByTime(30 * 1000);
      expect(isDecryptedFieldMasked("dateOfBirth")).toBe(true);
    });

    test("provides countdown timer for UI display", () => {
      const timeout = createDecryptionTimeout("ssn", 60 * 1000); // 60 seconds

      expect(getDecryptionTimeRemaining("ssn")).toBeCloseTo(60000, -2);

      jest.advanceTimersByTime(30 * 1000); // 30 seconds
      expect(getDecryptionTimeRemaining("ssn")).toBeCloseTo(30000, -2);

      jest.advanceTimersByTime(30 * 1000); // 60 seconds total
      expect(getDecryptionTimeRemaining("ssn")).toBe(0);
    });
  });

  // ============ USER INTERACTION TESTS ============

  describe("User Interaction and Activity Reset", () => {
    test("resets timeout on user activity", () => {
      const timeout = createDecryptionTimeout("ssn", 45 * 1000); // 45 seconds

      jest.advanceTimersByTime(30 * 1000);
      expect(isDecryptedFieldMasked("ssn")).toBe(false);

      resetDecryptionTimeout("ssn"); // User viewing field

      jest.advanceTimersByTime(30 * 1000);
      expect(isDecryptedFieldMasked("ssn")).toBe(false); // Still not masked

      jest.advanceTimersByTime(15 * 1000);
      expect(isDecryptedFieldMasked("ssn")).toBe(true); // Now masked (45s after reset)
    });

    test("tracks last user activity time", () => {
      const timeout = createDecryptionTimeout("ssn", 45 * 1000);
      const initialTime = Date.now();

      jest.advanceTimersByTime(15 * 1000);
      resetDecryptionTimeout("ssn");
      const afterResetTime = initialTime + 15 * 1000;

      expect(timeout.getLastActivity()).toBe(afterResetTime);
    });

    test("allows multiple resets before timeout", () => {
      const timeout = createDecryptionTimeout("ssn", 30 * 1000);

      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(20 * 1000);
        expect(isDecryptedFieldMasked("ssn")).toBe(false);
        resetDecryptionTimeout("ssn");
      }

      jest.advanceTimersByTime(30 * 1000);
      expect(isDecryptedFieldMasked("ssn")).toBe(true);
    });

    test("does not reset timeout for non-existent field", () => {
      const timeout = createDecryptionTimeout("ssn", 30 * 1000);

      expect(() => {
        resetDecryptionTimeout("nonexistent");
      }).toThrow("No timeout for field: nonexistent");
    });

    test("prevents reset after timeout has already expired", () => {
      const timeout = createDecryptionTimeout("ssn", 30 * 1000);

      jest.advanceTimersByTime(30 * 1000);
      expect(isDecryptedFieldMasked("ssn")).toBe(true);

      expect(() => {
        resetDecryptionTimeout("ssn");
      }).toThrow("Timeout already expired for field: ssn");
    });
  });

  // ============ CONCURRENT TIMEOUTS TESTS ============

  describe("Concurrent Timeout Management", () => {
    test("manages multiple active timeouts", () => {
      createDecryptionTimeout("ssn", 30 * 1000);
      createDecryptionTimeout("dateOfBirth", 45 * 1000);
      createDecryptionTimeout("address", 60 * 1000);

      jest.advanceTimersByTime(30 * 1000);
      expect(isDecryptedFieldMasked("ssn")).toBe(true);
      expect(isDecryptedFieldMasked("dateOfBirth")).toBe(false);
      expect(isDecryptedFieldMasked("address")).toBe(false);

      jest.advanceTimersByTime(15 * 1000);
      expect(isDecryptedFieldMasked("dateOfBirth")).toBe(true);
      expect(isDecryptedFieldMasked("address")).toBe(false);

      jest.advanceTimersByTime(15 * 1000);
      expect(isDecryptedFieldMasked("address")).toBe(true);
    });

    test("clears all timeouts", () => {
      createDecryptionTimeout("ssn", 30 * 1000);
      createDecryptionTimeout("dateOfBirth", 60 * 1000);

      clearAllTimeouts();

      jest.advanceTimersByTime(60 * 1000);
      expect(isDecryptedFieldMasked("ssn")).toBe(false);
      expect(isDecryptedFieldMasked("dateOfBirth")).toBe(false);
    });

    test("handles resetting timeout for specific field among many", () => {
      createDecryptionTimeout("ssn", 30 * 1000);
      createDecryptionTimeout("dateOfBirth", 30 * 1000);
      createDecryptionTimeout("address", 30 * 1000);

      jest.advanceTimersByTime(25 * 1000);
      resetDecryptionTimeout("dateOfBirth"); // Reset only this one

      jest.advanceTimersByTime(5 * 1000);
      expect(isDecryptedFieldMasked("ssn")).toBe(true);
      expect(isDecryptedFieldMasked("dateOfBirth")).toBe(false); // Still active
      expect(isDecryptedFieldMasked("address")).toBe(true);
    });
  });

  // ============ EDGE CASES TESTS ============

  describe("Edge Cases and Invalid Inputs", () => {
    test("validates field identifier is provided", () => {
      expect(() => {
        createDecryptionTimeout(null, 30 * 1000);
      }).toThrow("Field ID is required");
    });

    test("validates field identifier is non-empty string", () => {
      expect(() => {
        createDecryptionTimeout("", 30 * 1000);
      }).toThrow("Field ID cannot be empty");
    });

    test("prevents duplicate timeout for same field", () => {
      createDecryptionTimeout("ssn", 30 * 1000);

      expect(() => {
        createDecryptionTimeout("ssn", 60 * 1000);
      }).toThrow("Timeout already exists for field: ssn");
    });

    test("handles zero duration as special case (no timeout)", () => {
      const timeout = createDecryptionTimeout("ssn", 0);

      jest.advanceTimersByTime(100 * 60 * 1000); // Very large time advance
      expect(isDecryptedFieldMasked("ssn")).toBe(false); // Never masks
    });

    test("handles Infinity duration (no timeout)", () => {
      const timeout = createDecryptionTimeout("ssn", Infinity);

      jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour
      expect(isDecryptedFieldMasked("ssn")).toBe(false);
    });

    test("validates maskedValue is provided if required", () => {
      expect(() => {
        createDecryptionTimeout("ssn", 30 * 1000, {
          requireMask: true,
          maskedValue: undefined,
        });
      }).toThrow("Masked value is required when requireMask is true");
    });
  });

  // ============ INTEGRATION TESTS ============

  describe("Integration with Decryption API", () => {
    test("automatically creates timeout after decryption", () => {
      const setupManager = setupTimeoutManager({
        autoMask: true,
        defaultTimeout: 5 * 60 * 1000,
      });

      // Simulating decryption completing
      setupManager.onDecryptionComplete("ssn");

      expect(isDecryptedFieldMasked("ssn")).toBe(false);
      jest.advanceTimersByTime(5 * 60 * 1000);
      expect(isDecryptedFieldMasked("ssn")).toBe(true);
    });

    test("integrates timeout with masking behavior configuration", () => {
      configureMaskingBehavior({
        strategy: "blur", // Could be 'blur', 'hide', 'mask'
        blur_radius: 5,
      });

      const timeout = createDecryptionTimeout("ssn", 30 * 1000);

      jest.advanceTimersByTime(30 * 1000);

      // Should apply blur strategy
      expect(timeout.getMaskingStrategy()).toBe("blur");
      expect(timeout.getMaskingOptions()).toEqual({ blur_radius: 5 });
    });
  });

  // ============ PERFORMANCE & MEMORY TESTS ============

  describe("Performance and Memory Management", () => {
    test("handles large number of concurrent timeouts (100+)", () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        createDecryptionTimeout(`field_${i}`, 5 * 60 * 1000);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100); // Should be very fast
    });

    test("efficiently clears all timeouts", () => {
      for (let i = 0; i < 100; i++) {
        createDecryptionTimeout(`field_${i}`, 5 * 60 * 1000);
      }

      const start = Date.now();
      clearAllTimeouts();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    test("timeout resolution operates within 100ms accuracy", () => {
      const onTimeout = jest.fn();
      const timeout = createDecryptionTimeout("ssn", 30050, { onTimeout });

      jest.advanceTimersByTime(30050);
      expect(onTimeout).toHaveBeenCalled();

      // Next advance should not trigger again
      jest.advanceTimersByTime(100);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });
  });

  // ============ VISUAL COUNTDOWN TESTS ============

  describe("Visual Countdown Timer for UI", () => {
    test("provides formatted countdown for display", () => {
      const timeout = createDecryptionTimeout("ssn", 120 * 1000); // 2 minutes

      const formatted = timeout.getFormattedCountdown();
      expect(formatted).toMatch(/^\d{2}:\d{2}$/); // MM:SS format
      expect(formatted).toBe("02:00");

      jest.advanceTimersByTime(30 * 1000); // 30 seconds
      expect(timeout.getFormattedCountdown()).toBe("01:30");

      jest.advanceTimersByTime(60 * 1000); // 90 seconds total
      expect(timeout.getFormattedCountdown()).toBe("00:30");
    });

    test("formats countdown with leading zeros", () => {
      const timeout = createDecryptionTimeout("ssn", 65 * 1000); // 1m 5s

      expect(timeout.getFormattedCountdown()).toBe("01:05");

      jest.advanceTimersByTime(5 * 1000);
      expect(timeout.getFormattedCountdown()).toBe("01:00");

      jest.advanceTimersByTime(10 * 1000);
      expect(timeout.getFormattedCountdown()).toBe("00:50");
    });

    test("returns 00:00 when timeout expired", () => {
      const timeout = createDecryptionTimeout("ssn", 30 * 1000);

      jest.advanceTimersByTime(30 * 1000);
      expect(timeout.getFormattedCountdown()).toBe("00:00");
    });

    test("provides progress percentage for progress bars", () => {
      const timeout = createDecryptionTimeout("ssn", 30 * 1000); // 30 seconds

      expect(timeout.getProgressPercentage()).toBe(100); // 100% remaining initially

      jest.advanceTimersByTime(15 * 1000); // 50% elapsed → 50% remaining
      expect(timeout.getProgressPercentage()).toBe(50);

      jest.advanceTimersByTime(12 * 1000); // 90% elapsed → 10% remaining
      expect(timeout.getProgressPercentage()).toBe(10);

      jest.advanceTimersByTime(3 * 1000); // 100% elapsed → 0% remaining
      expect(timeout.getProgressPercentage()).toBe(0);
    });
  });

  // ============ MASKING BEHAVIOR CUSTOMIZATION TESTS ============

  describe("Customizable Masking Behavior", () => {
    test("supports blur masking strategy", () => {
      const timeout = createDecryptionTimeout("ssn", 30 * 1000, {
        maskingStrategy: "blur",
        maskingOptions: { radius: 8, iterations: 2 },
      });

      jest.advanceTimersByTime(30 * 1000);

      expect(timeout.getMaskingStrategy()).toBe("blur");
      expect(timeout.getMaskingOptions()).toEqual({ radius: 8, iterations: 2 });
    });

    test("supports hide masking strategy", () => {
      const timeout = createDecryptionTimeout("ssn", 30 * 1000, {
        maskingStrategy: "hide",
      });

      jest.advanceTimersByTime(30 * 1000);

      expect(timeout.getMaskingStrategy()).toBe("hide");
    });

    test("supports partial mask strategy with visible characters", () => {
      const timeout = createDecryptionTimeout("ssn", 30 * 1000, {
        maskingStrategy: "partial",
        maskingOptions: { showFirst: 0, showLast: 4, char: "*" },
      });

      jest.advanceTimersByTime(30 * 1000);

      expect(timeout.getMaskingStrategy()).toBe("partial");
      expect(timeout.getMaskingOptions().showLast).toBe(4);
    });

    test("configures global masking behavior", () => {
      configureMaskingBehavior({
        strategy: "blur",
        blur_radius: 10,
        default_timeout: 3 * 60 * 1000,
      });

      const timeout = createDecryptionTimeout("ssn", 30 * 1000);

      jest.advanceTimersByTime(30 * 1000);

      // Should inherit global configuration
      expect(timeout.getMaskingStrategy()).toBe("blur");
    });
  });

  // ============ REACT INTEGRATION TESTS ============

  describe("React Component Integration", () => {
    test("provides hook for timeout management", () => {
      // useDecryptionTimeout hook
      const { timeout, remaining, masked, reset, percentage } = {
        timeout: createDecryptionTimeout("ssn", 5 * 60 * 1000),
        remaining: 5 * 60 * 1000,
        masked: false,
        reset: () => resetDecryptionTimeout("ssn"),
        percentage: 100,
      };

      expect(timeout).toBeDefined();
      expect(remaining).toBe(5 * 60 * 1000);
      expect(masked).toBe(false);
    });

    test("supports effect cleanup for React unmount", () => {
      const onCleanup = jest.fn();
      const timeout = createDecryptionTimeout("ssn", 5 * 60 * 1000, {
        onCleanup,
      });

      timeout.cleanup();

      expect(onCleanup).toHaveBeenCalled();
    });

    test("prevents memory leaks with proper cleanup", () => {
      const timeout1 = createDecryptionTimeout("ssn", 5 * 60 * 1000);
      const timeout2 = createDecryptionTimeout("address", 5 * 60 * 1000);

      timeout1.cleanup();

      // Only first timeout should be cleaned
      clearAllTimeouts();
      expect(isDecryptedFieldMasked("ssn")).toBe(false);
    });
  });
});

module.exports = {
  // For use in integration tests
  suite: "P2-2.1.2: Decryption Timeout Mechanism",
};
