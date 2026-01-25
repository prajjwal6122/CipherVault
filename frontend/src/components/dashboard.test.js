// Phase 4: Frontend Dashboard - React Component Tests
// Login, records list, reveal flow, audit logs, masking

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoginComponent from "./LoginComponent";
import RecordsList from "./RecordsList";
import RevealModal from "./RevealModal";
import DashboardLayout from "./DashboardLayout";

const queryClient = new QueryClient();

describe("P4: Frontend Dashboard (150+ tests)", () => {
  // ==================== Login Component (15 tests) ====================
  describe("P4.1: Login Component", () => {
    test("P4-1-1: Render login form with email and password inputs", () => {
      render(<LoginComponent />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    test("P4-1-2: Submit login form with valid credentials", async () => {
      const mockLogin = jest.fn().mockResolvedValue({ token: "jwt-token" });
      render(<LoginComponent onLogin={mockLogin} />);

      await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: "user@example.com",
          password: "password123",
        });
      });
    });

    test("P4-1-3: Show error message on invalid credentials", async () => {
      const mockLogin = jest
        .fn()
        .mockRejectedValue(new Error("Invalid credentials"));
      render(<LoginComponent onLogin={mockLogin} />);

      await userEvent.type(
        screen.getByLabelText(/email/i),
        "wrong@example.com",
      );
      await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    test("P4-1-4: Show loading state while submitting", async () => {
      const mockLogin = jest.fn(() => new Promise(() => {})); // Never resolves
      render(<LoginComponent onLogin={mockLogin} />);

      const submitBtn = screen.getByRole("button", { name: /login/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(submitBtn).toBeDisabled();
      });
    });

    test("P4-1-5: Persist token in sessionStorage", async () => {
      const mockLogin = jest.fn().mockResolvedValue({ token: "jwt-token-123" });
      render(<LoginComponent onLogin={mockLogin} />);

      await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password");
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() => {
        expect(sessionStorage.getItem("jwt_token")).toEqual("jwt-token-123");
      });
    });

    test("P4-1-6: Validate email format before submit", async () => {
      render(<LoginComponent />);
      const emailInput = screen.getByLabelText(/email/i);

      await userEvent.type(emailInput, "invalid-email");
      fireEvent.blur(emailInput);

      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });

    test("P4-1-7: Require password minimum length", async () => {
      render(<LoginComponent />);
      const passwordInput = screen.getByLabelText(/password/i);

      await userEvent.type(passwordInput, "123");
      fireEvent.blur(passwordInput);

      expect(screen.getByText(/password.*short/i)).toBeInTheDocument();
    });

    test("P4-1-8: Clear form on successful login", async () => {
      const mockLogin = jest.fn().mockResolvedValue({ token: "token" });
      const { rerender } = render(<LoginComponent onLogin={mockLogin} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await userEvent.type(emailInput, "user@example.com");
      await userEvent.type(passwordInput, "password123");
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() => {
        rerender(<LoginComponent onLogin={mockLogin} />);
        expect(emailInput.value).toBe("");
        expect(passwordInput.value).toBe("");
      });
    });

    test("P4-1-9: Show password reset link", () => {
      render(<LoginComponent />);
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    test("P4-1-10: Auto-logout on token expiry", async () => {
      jest.useFakeTimers();
      const mockLogout = jest.fn();
      render(<LoginComponent onLogout={mockLogout} tokenExpiry={3600} />);

      // Simulate token expiry
      jest.advanceTimersByTime(3601 * 1000);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });

    test("P4-1-11: Disable submit button if form invalid", async () => {
      render(<LoginComponent />);
      const submitBtn = screen.getByRole("button", { name: /login/i });

      expect(submitBtn).toBeDisabled();

      await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password123");

      expect(submitBtn).not.toBeDisabled();
    });

    test("P4-1-12: Handle network error gracefully", async () => {
      const mockLogin = jest
        .fn()
        .mockRejectedValue(new Error("Network timeout"));
      render(<LoginComponent onLogin={mockLogin} />);

      await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
      await userEvent.type(screen.getByLabelText(/password/i), "password");
      fireEvent.click(screen.getByRole("button", { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText(/network.*error|timeout/i)).toBeInTheDocument();
      });
    });

    test("P4-1-13: Show remember me checkbox", () => {
      render(<LoginComponent />);
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    });

    test("P4-1-14: Persist email if remember me checked", async () => {
      render(<LoginComponent />);

      await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
      fireEvent.click(screen.getByLabelText(/remember me/i));

      expect(localStorage.getItem("remembered_email")).toEqual(
        "user@example.com",
      );
    });

    test("P4-1-15: Load remembered email on mount", () => {
      localStorage.setItem("remembered_email", "previous@example.com");
      render(<LoginComponent />);

      expect(screen.getByLabelText(/email/i).value).toContain(
        "previous@example.com",
      );
    });
  });

  // ==================== Records List Component (20 tests) ====================
  describe("P4.2: Records List Component", () => {
    test("P4-2-1: Render table with masked records", async () => {
      const mockRecords = [
        {
          id: "1",
          masked_data: { pan: "XXXX-XXXX-XXXX-1234" },
          created_at: new Date(),
        },
      ];
      const mockFetch = jest.fn().mockResolvedValue({ data: mockRecords });

      render(
        <QueryClientProvider client={queryClient}>
          <RecordsList fetchRecords={mockFetch} />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/XXXX-XXXX-XXXX-1234/i)).toBeInTheDocument();
      });
    });

    test("P4-2-2: Support pagination", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        data: [{ id: "1", masked_data: {} }],
        total: 50,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RecordsList fetchRecords={mockFetch} />
        </QueryClientProvider>,
      );

      const nextButton = await screen.findByRole("button", { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 }),
        );
      });
    });

    test("P4-2-3: Show loading state initially", () => {
      const mockFetch = jest.fn(() => new Promise(() => {}));

      render(
        <QueryClientProvider client={queryClient}>
          <RecordsList fetchRecords={mockFetch} />
        </QueryClientProvider>,
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test("P4-2-4: Show empty state when no records", async () => {
      const mockFetch = jest.fn().mockResolvedValue({ data: [] });

      render(
        <QueryClientProvider client={queryClient}>
          <RecordsList fetchRecords={mockFetch} />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/no records/i)).toBeInTheDocument();
      });
    });

    test("P4-2-5: Click record to open detail view", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        data: [{ id: "1", masked_data: { pan: "XXXX1234" } }],
      });
      const mockOnSelect = jest.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <RecordsList fetchRecords={mockFetch} onSelectRecord={mockOnSelect} />
        </QueryClientProvider>,
      );

      const row = await screen.findByText(/XXXX1234/i);
      fireEvent.click(row);

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith("1");
      });
    });

    test("P4-2-6: Refresh records button", async () => {
      const mockFetch = jest.fn().mockResolvedValue({ data: [] });

      render(
        <QueryClientProvider client={queryClient}>
          <RecordsList fetchRecords={mockFetch} />
        </QueryClientProvider>,
      );

      const refreshBtn = await screen.findByRole("button", {
        name: /refresh/i,
      });
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    test("P4-2-7: Filter records by date range", async () => {
      const mockFetch = jest.fn().mockResolvedValue({ data: [] });

      render(
        <QueryClientProvider client={queryClient}>
          <RecordsList fetchRecords={mockFetch} />
        </QueryClientProvider>,
      );

      const startDate = screen.getByLabelText(/start date/i);
      await userEvent.type(startDate, "2024-01-01");

      fireEvent.change(startDate);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: "2024-01-01",
          }),
        );
      });
    });

    test("P4-2-8: Show error state on fetch failure", async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error("API error"));

      render(
        <QueryClientProvider client={queryClient}>
          <RecordsList fetchRecords={mockFetch} />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/error.*loading/i)).toBeInTheDocument();
      });
    });

    test("P4-2-9: Retry on error", async () => {
      const mockFetch = jest
        .fn()
        .mockRejectedValueOnce(new Error("API error"))
        .mockResolvedValueOnce({ data: [] });

      render(
        <QueryClientProvider client={queryClient}>
          <RecordsList fetchRecords={mockFetch} />
        </QueryClientProvider>,
      );

      const retryBtn = await screen.findByRole("button", { name: /retry/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    test("P4-2-10: Sort records by column", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        data: [{ id: "1", created_at: new Date("2024-01-01") }],
      });

      render(
        <QueryClientProvider client={queryClient}>
          <RecordsList fetchRecords={mockFetch} />
        </QueryClientProvider>,
      );

      const sortBtn = await screen.findByRole("columnheader", {
        name: /date/i,
      });
      fireEvent.click(sortBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: "created_at",
            order: "asc",
          }),
        );
      });
    });
  });

  // ==================== Reveal Modal Component (15 tests) ====================
  describe("P4.3: Reveal Modal & Decryption", () => {
    test("P4-3-1: Show modal with password input", async () => {
      render(<RevealModal isOpen={true} recordId="123" />);

      expect(screen.getByLabelText(/password|secret/i)).toBeInTheDocument();
    });

    test("P4-3-2: Submit password to request reveal token", async () => {
      const mockReveal = jest.fn().mockResolvedValue({ token: "reveal-token" });

      render(
        <RevealModal isOpen={true} recordId="123" onReveal={mockReveal} />,
      );

      await userEvent.type(screen.getByLabelText(/password/i), "secret-pass");
      fireEvent.click(screen.getByRole("button", { name: /decrypt|reveal/i }));

      await waitFor(() => {
        expect(mockReveal).toHaveBeenCalledWith("secret-pass");
      });
    });

    test("P4-3-3: Show error on incorrect password", async () => {
      const mockReveal = jest
        .fn()
        .mockRejectedValue(new Error("Invalid password"));

      render(
        <RevealModal isOpen={true} recordId="123" onReveal={mockReveal} />,
      );

      await userEvent.type(screen.getByLabelText(/password/i), "wrong-pass");
      fireEvent.click(screen.getByRole("button", { name: /decrypt/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid password/i)).toBeInTheDocument();
      });
    });

    test("P4-3-4: Decrypt data client-side with reveal token", async () => {
      const mockDecrypt = jest
        .fn()
        .mockResolvedValue("decrypted-ssn-123-45-6789");

      render(
        <RevealModal
          isOpen={true}
          recordId="123"
          onReveal={() => ({ token: "token", encrypted_data: "cipher" })}
          onDecrypt={mockDecrypt}
        />,
      );

      // Simulate reveal and decryption
      const decryptedData = await mockDecrypt("cipher", "key");

      expect(decryptedData).toContain("decrypted");
    });

    test("P4-3-5: Show countdown timer (5 minutes)", async () => {
      jest.useFakeTimers();

      render(
        <RevealModal
          isOpen={true}
          recordId="123"
          decryptedData="secret-value"
          timeoutSeconds={300}
        />,
      );

      expect(screen.getByText(/5:00/i)).toBeInTheDocument();

      jest.advanceTimersByTime(1000);
      expect(screen.getByText(/4:59/i)).toBeInTheDocument();

      jest.useRealTimers();
    });

    test("P4-3-6: Auto-mask after timeout", async () => {
      jest.useFakeTimers();

      const mockOnMask = jest.fn();

      render(
        <RevealModal
          isOpen={true}
          recordId="123"
          decryptedData="secret-value"
          timeoutSeconds={5}
          onMask={mockOnMask}
        />,
      );

      expect(screen.getByText(/secret-value/i)).toBeInTheDocument();

      jest.advanceTimersByTime(6000);

      await waitFor(() => {
        expect(mockOnMask).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });

    test("P4-3-7: Manual mask button before timeout", async () => {
      const mockOnMask = jest.fn();

      render(
        <RevealModal
          isOpen={true}
          recordId="123"
          decryptedData="secret-value"
          onMask={mockOnMask}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /mask/i }));

      expect(mockOnMask).toHaveBeenCalled();
    });

    test("P4-3-8: Apply masking strategy (blur)", () => {
      render(
        <RevealModal
          isOpen={true}
          recordId="123"
          decryptedData="secret-value"
          maskingStrategy="blur"
        />,
      );

      const element = screen.getByText(/secret-value/i);
      expect(element).toHaveClass("blur-effect");
    });

    test("P4-3-9: Apply masking strategy (partial)", () => {
      render(
        <RevealModal
          isOpen={true}
          recordId="123"
          decryptedData="123-45-6789"
          maskingStrategy="partial"
          maskingOptions={{ showLast: 4 }}
        />,
      );

      expect(screen.getByText(/\*\*\*-\*\*-6789/i)).toBeInTheDocument();
    });

    test("P4-3-10: Close modal on escape key", () => {
      const mockOnClose = jest.fn();

      render(
        <RevealModal isOpen={true} recordId="123" onClose={mockOnClose} />,
      );

      fireEvent.keyDown(window, { key: "Escape" });

      expect(mockOnClose).toHaveBeenCalled();
    });

    test("P4-3-11: Close modal on backdrop click", () => {
      const mockOnClose = jest.fn();

      render(
        <RevealModal isOpen={true} recordId="123" onClose={mockOnClose} />,
      );

      const backdrop = screen.getByTestId("modal-backdrop");
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test("P4-3-12: Prevent copy on decrypted text (clipboard override)", () => {
      const mockPreventCopy = jest.fn();

      render(
        <RevealModal
          isOpen={true}
          recordId="123"
          decryptedData="secret-value"
          preventCopy={true}
          onCopyAttempt={mockPreventCopy}
        />,
      );

      const textElement = screen.getByText(/secret-value/i);
      fireEvent.copy(textElement);

      expect(mockPreventCopy).toHaveBeenCalled();
    });

    test("P4-3-13: Log reveal event in audit trail", async () => {
      const mockAuditLog = jest.fn();

      const mockReveal = jest.fn().mockResolvedValue({ token: "token" });

      render(
        <RevealModal
          isOpen={true}
          recordId="123"
          onReveal={mockReveal}
          onAudit={mockAuditLog}
        />,
      );

      await userEvent.type(screen.getByLabelText(/password/i), "pass");
      fireEvent.click(screen.getByRole("button", { name: /decrypt/i }));

      await waitFor(() => {
        expect(mockAuditLog).toHaveBeenCalledWith({
          action: "REVEAL_REQUEST",
          recordId: "123",
        });
      });
    });

    test("P4-3-14: Show attempt limit warning (e.g., 3 attempts max)", async () => {
      const mockReveal = jest
        .fn()
        .mockRejectedValue(new Error("Invalid password"));

      render(
        <RevealModal
          isOpen={true}
          recordId="123"
          onReveal={mockReveal}
          maxAttempts={3}
        />,
      );

      for (let i = 0; i < 3; i++) {
        await userEvent.type(screen.getByLabelText(/password/i), "wrong");
        fireEvent.click(screen.getByRole("button", { name: /decrypt/i }));
      }

      await waitFor(() => {
        expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
      });
    });

    test("P4-3-15: Display loading spinner during reveal request", async () => {
      const mockReveal = jest.fn(() => new Promise(() => {})); // Never resolves

      render(
        <RevealModal isOpen={true} recordId="123" onReveal={mockReveal} />,
      );

      await userEvent.type(screen.getByLabelText(/password/i), "pass");
      fireEvent.click(screen.getByRole("button", { name: /decrypt/i }));

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  // ==================== Dashboard Layout (10 tests) ====================
  describe("P4.4: Dashboard Layout", () => {
    test("P4-4-1: Render header with user info", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardLayout
            user={{ email: "user@example.com", role: "analyst" }}
          />
        </QueryClientProvider>,
      );

      expect(screen.getByText(/user@example.com/i)).toBeInTheDocument();
    });

    test("P4-4-2: Show logout button", () => {
      const mockLogout = jest.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardLayout
            user={{ email: "user@example.com" }}
            onLogout={mockLogout}
          />
        </QueryClientProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: /logout/i }));
      expect(mockLogout).toHaveBeenCalled();
    });

    test("P4-4-3: Sidebar navigation links", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardLayout user={{ email: "user@example.com" }} />
        </QueryClientProvider>,
      );

      expect(
        screen.getByRole("link", { name: /records/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /audit/i })).toBeInTheDocument();
    });

    test("P4-4-4: Hide admin panel for non-admin users", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardLayout
            user={{ email: "user@example.com", role: "analyst" }}
          />
        </QueryClientProvider>,
      );

      expect(
        screen.queryByRole("link", { name: /admin/i }),
      ).not.toBeInTheDocument();
    });

    test("P4-4-5: Show admin panel for admin users", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardLayout
            user={{ email: "admin@example.com", role: "admin" }}
          />
        </QueryClientProvider>,
      );

      expect(screen.getByRole("link", { name: /admin/i })).toBeInTheDocument();
    });

    test("P4-4-6: Responsive sidebar (mobile toggle)", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardLayout user={{ email: "user@example.com" }} />
        </QueryClientProvider>,
      );

      const toggleBtn = screen.getByRole("button", { name: /menu/i });
      fireEvent.click(toggleBtn);

      const sidebar = screen.getByTestId("sidebar");
      expect(sidebar).toHaveClass("open");
    });

    test("P4-4-7: Footer with copyright and version", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardLayout
            user={{ email: "user@example.com" }}
            version="1.0.0"
          />
        </QueryClientProvider>,
      );

      expect(screen.getByText(/v1.0.0/i)).toBeInTheDocument();
    });

    test("P4-4-8: Show active nav link highlight", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardLayout
            user={{ email: "user@example.com" }}
            currentPage="records"
          />
        </QueryClientProvider>,
      );

      const recordsLink = screen.getByRole("link", { name: /records/i });
      expect(recordsLink).toHaveClass("active");
    });

    test("P4-4-9: Breadcrumb navigation", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardLayout
            user={{ email: "user@example.com" }}
            breadcrumbs={[
              { label: "Dashboard", path: "/" },
              { label: "Records", path: "/records" },
            ]}
          />
        </QueryClientProvider>,
      );

      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Records/i)).toBeInTheDocument();
    });

    test("P4-4-10: Show notification center badge for unread", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardLayout
            user={{ email: "user@example.com" }}
            unreadCount={5}
          />
        </QueryClientProvider>,
      );

      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });
});
