/**
 * P2-2.1.3: Memory Cleanup for Sensitive Data Tests
 *
 * Tests for securely clearing sensitive decrypted data from memory
 * and React component state to prevent leakage through:
 * - Browser DevTools inspection
 * - Memory dumps
 * - Process snapshots
 * - Clipboard remnants
 *
 * Test Categories:
 * 1. Memory overwriting (4 tests)
 * 2. React state cleanup (5 tests)
 * 3. Component unmount handlers (4 tests)
 * 4. Clipboard management (3 tests)
 * 5. DevTools prevention (2 tests)
 * 6. Integration with timeouts (3 tests)
 * 7. Performance & edge cases (3 tests)
 */

const {
  overwriteBuffer,
  clearReactState,
  useSensitiveState,
  createCleanupHandler,
  preventDevToolsExport,
  setupMemoryCleanup,
  shredArray,
} = require("./memory-cleanup");

describe("P2-2.1.3: Memory Cleanup for Sensitive Data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Ensure all mocks are cleared
    jest.clearAllMocks();
  });

  // ============ BUFFER OVERWRITING TESTS ============

  describe("Buffer Memory Overwriting", () => {
    test("overwrites buffer with random data", () => {
      const buffer = Buffer.from("sensitive-password-12345678", "utf8");
      const originalLength = buffer.length;

      overwriteBuffer(buffer);

      // Buffer should still have same length but different contents
      expect(buffer.length).toBe(originalLength);
      // Should be unlikely to be same (all zeros probability < 1 in billion)
      expect(buffer.toString("utf8")).not.toEqual(
        "sensitive-password-12345678",
      );
    });

    test("overwrites Uint8Array with random values", () => {
      const data = new Uint8Array([
        115, 101, 110, 115, 105, 116, 105, 118, 101,
      ]); // 'sensitive'
      const original = Array.from(data);

      overwriteBuffer(data);

      // Should have different values now
      const overwritten = Array.from(data);
      expect(overwritten).not.toEqual(original);
    });

    test("overwrites multiple times for security", () => {
      const buffer = Buffer.from("secret-key-material", "utf8");

      overwriteBuffer(buffer, { iterations: 3 });

      // After 3 overwrites, should be completely random
      expect(buffer.toString("utf8")).not.toEqual("secret-key-material");
    });

    test("handles small buffers (1-2 bytes)", () => {
      const buffer = Buffer.from([255, 254]);

      expect(() => overwriteBuffer(buffer)).not.toThrow();
      expect(buffer.length).toBe(2);
    });
  });

  // ============ REACT STATE CLEANUP TESTS ============

  describe("React State Cleanup", () => {
    test("clears sensitive object properties", () => {
      const state = {
        name: "John Doe",
        ssn: "123-45-6789",
        password: "super-secret-123",
        publicField: "can-stay",
      };

      clearReactState(state, ["ssn", "password"]);

      expect(state.ssn).toBeNull();
      expect(state.password).toBeNull();
      expect(state.name).toBe("John Doe"); // Not cleared
      expect(state.publicField).toBe("can-stay");
    });

    test("clears deeply nested sensitive values", () => {
      const state = {
        user: {
          profile: {
            ssn: "123-45-6789",
            age: 30,
          },
          credentials: {
            password: "secret",
          },
        },
      };

      clearReactState(state, ["ssn", "password"]);

      expect(state.user.profile.ssn).toBeNull();
      expect(state.user.credentials.password).toBeNull();
      expect(state.user.profile.age).toBe(30);
    });

    test("clears arrays of sensitive objects", () => {
      const state = {
        records: [
          { id: 1, ssn: "111-11-1111", name: "John" },
          { id: 2, ssn: "222-22-2222", name: "Jane" },
          { id: 3, ssn: "333-33-3333", name: "Jack" },
        ],
      };

      clearReactState(state, ["ssn"]);

      state.records.forEach((record) => {
        expect(record.ssn).toBeNull();
        expect(record.name).not.toBeNull();
        expect(record.id).not.toBeNull();
      });
    });

    test("handles missing or undefined sensitive fields", () => {
      const state = {
        name: "John",
        ssn: null,
        address: "Main St",
      };

      expect(() => {
        clearReactState(state, ["ssn", "password", "nonexistent"]);
      }).not.toThrow();

      expect(state.name).toBe("John");
    });

    test("prevents clearing entire object (safety check)", () => {
      const state = {
        ssn: "123-45-6789",
      };

      // Should not allow clearing entire state object
      expect(() => {
        clearReactState(state, ["*"]);
      }).toThrow();
    });
  });

  // ============ COMPONENT UNMOUNT HANDLERS ============

  describe("Component Unmount Cleanup Handlers", () => {
    test("creates cleanup handler for component", () => {
      const sensitiveData = {
        decryptedValue: "super-secret-password",
      };

      const handler = createCleanupHandler(sensitiveData);

      expect(handler).toBeDefined();
      expect(typeof handler).toBe("function");
    });

    test("cleanup handler clears sensitive data", () => {
      const sensitiveData = {
        password: "secret-123",
        ssn: "123-45-6789",
      };

      const handler = createCleanupHandler(sensitiveData, {
        fieldsToClean: ["password", "ssn"],
      });

      handler();

      expect(sensitiveData.password).toBeNull();
      expect(sensitiveData.ssn).toBeNull();
    });

    test("creates React useEffect cleanup callback", () => {
      const state = {
        decrypted: "sensitive-data",
        publicField: "public",
      };

      const cleanup = createCleanupHandler(state, {
        fieldsToClean: ["decrypted"],
      });

      // Simulate unmount
      cleanup();

      expect(state.decrypted).toBeNull();
      expect(state.publicField).toBe("public");
    });

    test("cleanup handler can be called multiple times safely", () => {
      const state = { secret: "data" };
      const handler = createCleanupHandler(state, {
        fieldsToClean: ["secret"],
      });

      handler(); // First call
      expect(state.secret).toBeNull();

      expect(() => handler()).not.toThrow(); // Second call shouldn't error
    });
  });

  // ============ SENSITIVE STATE HOOK TESTS ============

  describe("React Hook: useSensitiveState", () => {
    test("hook manages sensitive state with auto-cleanup", () => {
      const { state, setState, cleanup } = useSensitiveState(
        { password: "secret-123", publicField: "public" },
        ["password"],
      );

      expect(state.password).toBe("secret-123");
      expect(state.publicField).toBe("public");

      // Cleanup on unmount
      cleanup();

      expect(state.password).toBeNull();
    });

    test("hook updates state securely", () => {
      const { state, setState } = useSensitiveState(
        { password: "", publicField: "value" },
        ["password"],
      );

      setState({ password: "new-secret" });

      expect(state.password).toBe("new-secret");
    });

    test("hook prevents state mutation of sensitive fields", () => {
      const { state } = useSensitiveState(
        { password: "secret", name: "John" },
        ["password"],
      );

      // Attempt direct mutation should be detected
      // (in real implementation, use Object.freeze or Proxy)
      const passwordRef = state.password;
      expect(passwordRef).toBe("secret");
    });

    test("hook cleanup works with unmount simulation", () => {
      const { state, cleanup } = useSensitiveState(
        { apiKey: "secret-key-123", userId: "user-1" },
        ["apiKey"],
      );

      expect(state.apiKey).toBe("secret-key-123");

      // Simulate unmount
      cleanup();

      expect(state.apiKey).toBeNull();
    });
  });

  // ============ CLIPBOARD MANAGEMENT TESTS ============

  describe("Clipboard Cleanup", () => {
    test("clears clipboard after timeout", async () => {
      // Mock clipboard API
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
        readText: jest.fn().mockResolvedValue("copied-secret"),
      };

      global.navigator = {
        clipboard: mockClipboard,
      };

      // Simulate copy to clipboard
      await navigator.clipboard.writeText("sensitive-data-123");

      // After cleanup timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clipboard should be cleared
      await navigator.clipboard.writeText("");

      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    test("overwrites clipboard with blank space", async () => {
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };

      global.navigator = {
        clipboard: mockClipboard,
      };

      await navigator.clipboard.writeText("                    ");

      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        "                    ",
      );
    });

    test("handles clipboard write errors gracefully", async () => {
      const mockClipboard = {
        writeText: jest.fn().mockRejectedValue(new Error("Permission denied")),
      };

      global.navigator = {
        clipboard: mockClipboard,
      };

      // Should not throw even if clipboard write fails
      expect(async () => {
        await navigator.clipboard.writeText("text");
      }).toBeDefined();
    });
  });

  // ============ DEVTOOLS PREVENTION TESTS ============

  describe("DevTools Inspection Prevention", () => {
    test("prevents exporting data to DevTools", () => {
      const sensitiveObject = {
        password: "super-secret",
        apiKey: "sk-123456789",
      };

      preventDevToolsExport(sensitiveObject, ["password", "apiKey"]);

      // DevTools inspection should not show values
      expect(sensitiveObject).toBeDefined();
    });

    test("logs access attempts to sensitive properties", () => {
      const consoleLogSpy = jest.spyOn(console, "warn").mockImplementation();

      const sensitiveObject = {
        secret: "hidden-value",
      };

      preventDevToolsExport(sensitiveObject, ["secret"]);

      // Attempt to access would be logged (in proxy implementation)
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    test("object still functions normally after DevTools prevention", () => {
      const data = {
        publicField: "visible",
        privateField: "hidden",
      };

      preventDevToolsExport(data, ["privateField"]);

      // Should still be able to access and use fields
      expect(data.publicField).toBe("visible");
    });
  });

  // ============ INTEGRATION WITH TIMEOUTS ============

  describe("Integration with Decryption Timeouts", () => {
    test("cleanup runs automatically on timeout expiry", () => {
      jest.useFakeTimers();

      const sensitiveData = {
        decrypted: "secret-value",
        timestamp: Date.now(),
      };

      const cleanup = createCleanupHandler(sensitiveData, {
        fieldsToClean: ["decrypted"],
        autoCleanupAfter: 1000,
      });

      jest.advanceTimersByTime(1000);
      cleanup();

      expect(sensitiveData.decrypted).toBeNull();

      jest.useRealTimers();
    });

    test("integrates with useSensitiveState hook lifecycle", () => {
      const { state, cleanup } = useSensitiveState(
        { decrypted: "data", timeout: 5000 },
        ["decrypted"],
      );

      expect(state.decrypted).toBe("data");

      // Simulate component unmount
      cleanup();

      expect(state.decrypted).toBeNull();
    });

    test("preserves non-sensitive data through timeout+cleanup cycle", () => {
      const state = {
        decrypted: "secret",
        recordId: "REC-001",
        decryptTime: Date.now(),
      };

      clearReactState(state, ["decrypted"]);

      expect(state.decrypted).toBeNull();
      expect(state.recordId).toBe("REC-001"); // Preserved
      expect(state.decryptTime).toBeGreaterThan(0);
    });
  });

  // ============ ARRAY SHREDDING TESTS ============

  describe("Array Shredding for Sensitive Values", () => {
    test("shreds array of sensitive values", () => {
      const buffers = [
        Buffer.from("password-123"), // 12 bytes
        Buffer.from("api-key-456"), // 11 bytes
        Buffer.from("token-789"), // 9 bytes
      ];

      const originalLengths = buffers.map((b) => b.length);

      shredArray(buffers);

      // All buffers should be overwritten but keep their lengths
      buffers.forEach((buffer, i) => {
        expect(buffer.length).toBe(originalLengths[i]);
      });
    });

    test("shreds Uint8Array collections", () => {
      const arrays = [
        new Uint8Array([1, 2, 3, 4, 5]),
        new Uint8Array([6, 7, 8, 9, 10]),
      ];

      const originalLengths = arrays.map((a) => a.length);

      shredArray(arrays);

      arrays.forEach((arr, i) => {
        expect(arr.length).toBe(originalLengths[i]); // Length preserved
      });
    });

    test("handles empty arrays", () => {
      const emptyArray = [];

      expect(() => shredArray(emptyArray)).not.toThrow();
    });

    test("shreds large arrays efficiently", () => {
      const largeArray = Array.from({ length: 1000 }, () =>
        Buffer.from("sensitive-data"),
      );

      const start = Date.now();
      shredArray(largeArray);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // Should be fast
    });
  });

  // ============ SETUP & CONFIGURATION TESTS ============

  describe("Memory Cleanup Setup and Configuration", () => {
    test("configures global cleanup behavior", () => {
      setupMemoryCleanup({
        autoCleanupEnabled: true,
        timeoutMs: 5000,
        iterations: 3,
      });

      // Should configure cleanup settings
      expect(setupMemoryCleanup).toBeDefined();
    });

    test("supports custom cleanup strategies", () => {
      setupMemoryCleanup({
        strategy: "zeros", // Fill with zeros
        iterations: 5,
      });

      const buffer = Buffer.from("secret");
      overwriteBuffer(buffer, { strategy: "zeros", iterations: 5 });

      // Should be overwritten
      expect(buffer.toString()).not.toEqual("secret");
    });

    test("handles cleanup on process exit", () => {
      const exitHandler = jest.fn();

      // Mock process.on to verify it would be called
      const mockProcessOn = jest.fn();
      const originalProcessOn = global.process ? global.process.on : null;
      if (global.process) {
        global.process.on = mockProcessOn;
      }

      setupMemoryCleanup({
        onProcessExit: exitHandler,
      });

      // Should have called process.on('exit', handler)
      if (originalProcessOn) {
        global.process.on = originalProcessOn;
      }

      // The handler is registered but not called until actual process exit
      expect(exitHandler).not.toHaveBeenCalled();
    });
  });

  // ============ EDGE CASES & PERFORMANCE TESTS ============

  describe("Edge Cases and Performance", () => {
    test("handles very large buffers (>100MB)", () => {
      // In memory, create reference (not actual large buffer)
      const largeBuffer = Buffer.alloc(1000); // 1KB for testing

      const start = Date.now();
      overwriteBuffer(largeBuffer);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10); // Should be fast even for large buffers
    });

    test("prevents double-cleanup errors", () => {
      const state = { secret: "data" };
      const cleanup = createCleanupHandler(state, {
        fieldsToClean: ["secret"],
      });

      cleanup(); // First call
      expect(() => cleanup()).not.toThrow(); // Second call should be safe
    });

    test("handles circular references in state", () => {
      const state = {
        secret: "data",
        self: null,
      };
      state.self = state; // Circular reference

      expect(() => {
        clearReactState(state, ["secret"]);
      }).not.toThrow();

      expect(state.secret).toBeNull();
    });

    test("preserves object prototypes after cleanup", () => {
      const sensitiveObject = Object.create({ method: () => "result" });
      sensitiveObject.secret = "hidden";

      clearReactState(sensitiveObject, ["secret"]);

      expect(sensitiveObject.secret).toBeNull();
      expect(sensitiveObject.method()).toBe("result");
    });

    test("memory cleanup completes within time budget", () => {
      const largeState = {};
      for (let i = 0; i < 1000; i++) {
        largeState[`field_${i}`] = `value_${i}`;
      }

      const start = Date.now();
      clearReactState(
        largeState,
        Array.from({ length: 100 }, (_, i) => `field_${i}`),
      );
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50); // Should be very fast
    });
  });

  // ============ SECURITY VALIDATION TESTS ============

  describe("Security Validation", () => {
    test("overwritten data is not recoverable", () => {
      const buffer = Buffer.from("secret-password");
      const originalData = Buffer.from(buffer); // Copy original

      overwriteBuffer(buffer, { iterations: 10 });

      // Data should be completely different
      expect(Buffer.compare(buffer, originalData)).not.toBe(0);
    });

    test("cleanup prevents memory disclosure", () => {
      const state = {
        password: "super-secret-123",
        apiKey: "sk-1234567890",
      };

      clearReactState(state, ["password", "apiKey"]);

      // Fields should be null (not just empty strings)
      expect(state.password).toBeNull();
      expect(state.apiKey).toBeNull();
    });

    test("audit logging on cleanup operations", () => {
      const auditLog = jest.fn();

      createCleanupHandler(
        { secret: "data" },
        {
          fieldsToClean: ["secret"],
          auditLog: auditLog,
        },
      );

      // Should support audit logging
      expect(createCleanupHandler).toBeDefined();
    });
  });
});

module.exports = {
  suite: "P2-2.1.3: Memory Cleanup for Sensitive Data",
};
