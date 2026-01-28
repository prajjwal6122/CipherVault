/**
 * Decryption Modal Component
 * Modal for entering password and triggering decryption
 */

import React, { useState } from "react";
import apiClient from "../api/client";
import { decryptAES256GCM } from "../utils/decryptionUtils";
import "./DecryptionModal.css";

const DecryptionModal = ({ isOpen, onClose, recordId, onDecryptSuccess }) => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!password) {
        throw new Error("Password is required");
      }

      if (!recordId) {
        throw new Error("Record ID is missing");
      }

      // Call backend reveal API (no password needed - already authenticated via JWT)
      const response = await apiClient.post(`/records/${recordId}/reveal`, {
        reason: "User requested decryption",
      });

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || "Decryption failed");
      }

      const { encryptedPayload, encryption } = response.data.data || {};

      if (!encryptedPayload || !encryption) {
        throw new Error("Invalid response from server");
      }

      // Decrypt the payload
      let decryptedData;
      try {
        const { encryptedData, iv, authTag } = encryptedPayload;

        // Derive key from password using PBKDF2 and decrypt
        const {
          deriveKeyFromPasswordWeb,
          decryptAES256GCMWeb,
          base64ToArrayBuffer,
        } = await import("../crypto/web-crypto-api");

        // Convert salt from base64
        const saltArray = new Uint8Array(base64ToArrayBuffer(encryption.salt));

        // Derive CryptoKey from password
        const derivedKey = await deriveKeyFromPasswordWeb(
          password,
          saltArray,
          encryption.iterations || 100000,
        );

        // Convert encrypted data components from base64
        const encryptedDataArray = new Uint8Array(
          base64ToArrayBuffer(encryptedData),
        );
        const ivArray = new Uint8Array(base64ToArrayBuffer(iv));
        const authTagArray = new Uint8Array(base64ToArrayBuffer(authTag));

        // Decrypt using derived key
        const decryptedBuffer = await decryptAES256GCMWeb(
          encryptedDataArray,
          derivedKey,
          ivArray,
          authTagArray,
        );

        // Convert to string
        const decryptedString = new TextDecoder().decode(decryptedBuffer);

        // Parse as JSON if possible
        try {
          decryptedData = JSON.parse(decryptedString);
        } catch {
          decryptedData = { data: decryptedString };
        }
      } catch (decryptError) {
        throw new Error(`Failed to decrypt data: ${decryptError.message}`);
      }

      // Clear form
      setPassword("");
      setShowPassword(false);

      // Call success callback
      if (onDecryptSuccess) {
        onDecryptSuccess(decryptedData);
      }

      // Close modal
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Decryption failed",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    setShowPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="decryption-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔓 Decrypt Record</h2>
          <button
            className="close-btn"
            onClick={handleClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Enter your password to decrypt and reveal this record. You will have
            5 minutes to view the decrypted data before it automatically
            re-masks.
          </p>

          <form onSubmit={handleSubmit} className="decryption-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-group">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="off"
                  className="password-input"
                  autoFocus
                />
                <button
                  type="button"
                  className="toggle-visibility-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>

            <div className="security-notice">
              <p>
                <strong>⚠️ Security Notice:</strong> This action will be logged
                in the audit trail. Make sure you're in a secure location.
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !password}
                className="btn btn-primary"
              >
                {isLoading ? "Decrypting..." : "Decrypt"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DecryptionModal;
