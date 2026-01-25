/**
 * Create Record Form
 * Form for creating encrypted records with client-side encryption
 * Supports both manual text input and file upload (CSV/JSON)
 */

import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";
import { useAuth } from "../hooks/useAuth";
import "./CreateRecordForm.css";

const CreateRecordForm = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [inputMode, setInputMode] = useState("text"); // "text" or "file"
  const [formData, setFormData] = useState({
    recordType: "PII",
    data: "",
    tags: "",
    description: "",
    summary: "",
    password: "",
    confirmPassword: "",
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [errors, setErrors] = useState({});
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Mutation for creating record
  const createRecordMutation = useMutation({
    mutationFn: async (recordPayload) => {
      const response = await apiClient.post("/records", recordPayload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["records"]);
      if (onSuccess) onSuccess();
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();
    const isValidType = ["csv", "json", "txt"].includes(fileExtension);

    if (!isValidType) {
      setErrors({ file: "Please upload a CSV, JSON, or TXT file" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ file: "File size must be less than 5MB" });
      return;
    }

    try {
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
      });
      setUploadedFile(file);
      setFileContent(content);
      setErrors((prev) => ({ ...prev, file: "" }));
      if (!formData.summary) {
        setFormData((prev) => ({
          ...prev,
          summary: `Encrypted: ${file.name}`,
        }));
      }
    } catch (error) {
      setErrors({ file: `Failed to read file: ${error.message}` });
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileContent(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const newErrors = {};

    if (inputMode === "text" && !formData.data.trim()) {
      newErrors.data = "Data is required";
    } else if (inputMode === "file" && !fileContent) {
      newErrors.file = "Please upload a file";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.summary.trim()) {
      newErrors.summary = "Summary is required for record preview";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsEncrypting(true);
    setErrors({});

    try {
      // Get the data to encrypt
      const dataToEncrypt = inputMode === "file" ? fileContent : formData.data;

      // Generate salt using Web Crypto API directly
      const salt = new Uint8Array(16);
      window.crypto.getRandomValues(salt);

      // Derive encryption key from password using PBKDF2
      const iterations = 100000;
      const passwordBuffer = new TextEncoder().encode(formData.password);

      const baseKey = await window.crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"],
      );

      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: iterations,
          hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"],
      );

      // Generate IV for AES-GCM
      const iv = new Uint8Array(12);
      window.crypto.getRandomValues(iv);

      // Prepare data payload
      const payload = JSON.stringify({
        content: dataToEncrypt,
        recordType: formData.recordType,
        createdBy: user?.email,
        timestamp: new Date().toISOString(),
        fileName: uploadedFile?.name || null,
      });

      const plaintextBytes = new TextEncoder().encode(payload);

      // Encrypt using AES-256-GCM
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        derivedKey,
        plaintextBytes,
      );

      // Split ciphertext and auth tag
      const encryptedArray = new Uint8Array(encrypted);
      const ciphertext = encryptedArray.slice(0, -16);
      const authTag = encryptedArray.slice(-16);

      // Convert to Base64
      const arrayToBase64 = (arr) => btoa(String.fromCharCode(...arr));
      const encryptedDataBase64 = arrayToBase64(ciphertext);
      const ivBase64 = arrayToBase64(iv);
      const authTagBase64 = arrayToBase64(authTag);
      const saltBase64 = arrayToBase64(salt);

      // Calculate data hash for integrity
      const hashBuffer = await window.crypto.subtle.digest(
        "SHA-256",
        plaintextBytes,
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const dataHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Generate mask pattern
      const maskPattern = generateMaskPattern(
        dataToEncrypt,
        formData.recordType,
        uploadedFile?.name,
      );

      // Prepare record payload for API
      const recordPayload = {
        encryptedData: encryptedDataBase64,
        iv: ivBase64,
        authTag: authTagBase64,
        dataHash,
        encryption: {
          algorithm: "AES-256-GCM",
          keyDerivation: "PBKDF2",
          salt: saltBase64,
          iterations,
          version: "v1",
        },
        recordType: formData.recordType || "Other",
        summary: formData.summary.trim(),
        maskPattern: maskPattern || "***encrypted***",
        description: formData.description?.trim() || "",
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        kmsProvider: "local",
        metadata: {
          encryptedAt: new Date().toISOString(),
          encryptedBy: user?.email || "unknown",
          fileName: uploadedFile?.name || null,
          fileSize: uploadedFile?.size || null,
          inputMode,
        },
      };

      console.log("Sending payload:", recordPayload); // Debug log
      await createRecordMutation.mutateAsync(recordPayload);

      // Clear form
      setFormData({
        recordType: "PII",
        data: "",
        tags: "",
        description: "",
        summary: "",
        password: "",
        confirmPassword: "",
      });
      setUploadedFile(null);
      setFileContent(null);
      setInputMode("text");
    } catch (error) {
      console.error("Create record error:", error);
      // Extract detailed error message from API response
      let errorMessage = "Failed to create record";
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.error?.details) {
        // Joi validation errors
        const details = error.response.data.error.details;
        errorMessage = details.map((d) => d.message).join(", ");
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setErrors({ submit: errorMessage });
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="create-record-form">
      <div className="form-header">
        <h2>🔐 Create Encrypted Record</h2>
        <p>Encrypt sensitive data with client-side encryption</p>
      </div>

      <form onSubmit={handleSubmit}>
        {errors.submit && <div className="error-banner">{errors.submit}</div>}

        {/* Record Type */}
        <div className="form-group">
          <label htmlFor="recordType">Record Type *</label>
          <select
            id="recordType"
            name="recordType"
            value={formData.recordType}
            onChange={handleChange}
            className="form-select"
          >
            <option value="PII">Personal Identifiable Information (PII)</option>
            <option value="Financial">Financial Data</option>
            <option value="Medical">Medical Records</option>
            <option value="Legal">Legal Documents</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Input Mode Toggle */}
        <div className="form-group">
          <label>Data Input Method *</label>
          <div className="input-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${inputMode === "text" ? "active" : ""}`}
              onClick={() => setInputMode("text")}
            >
              ✏️ Enter Text
            </button>
            <button
              type="button"
              className={`mode-btn ${inputMode === "file" ? "active" : ""}`}
              onClick={() => setInputMode("file")}
            >
              📁 Upload File
            </button>
          </div>
        </div>

        {/* Text Input Mode */}
        {inputMode === "text" && (
          <div className="form-group">
            <label htmlFor="data">Sensitive Data *</label>
            <textarea
              id="data"
              name="data"
              value={formData.data}
              onChange={handleChange}
              placeholder={
                "Enter sensitive data to encrypt...\n\nExample:\nName: John Doe\nSSN: 123-45-6789\nEmail: john@example.com"
              }
              rows="8"
              className={`form-textarea ${errors.data ? "error" : ""}`}
            />
            {errors.data && <span className="error-text">{errors.data}</span>}
          </div>
        )}

        {/* File Upload Mode */}
        {inputMode === "file" && (
          <div className="form-group">
            <label>Upload Sensitive File *</label>
            <div
              className={`file-upload-area ${uploadedFile ? "has-file" : ""} ${errors.file ? "error" : ""}`}
            >
              {!uploadedFile ? (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".csv,.json,.txt"
                    className="file-input"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="file-upload-label">
                    <div className="upload-icon">📤</div>
                    <div className="upload-text">
                      <strong>Click to upload</strong> or drag and drop
                    </div>
                    <div className="upload-hint">
                      CSV, JSON, or TXT files (max 5MB)
                    </div>
                  </label>
                </>
              ) : (
                <div className="uploaded-file-info">
                  <div className="file-icon">📄</div>
                  <div className="file-details">
                    <div className="file-name">{uploadedFile.name}</div>
                    <div className="file-size">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={handleRemoveFile}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            {errors.file && <span className="error-text">{errors.file}</span>}
            {fileContent && (
              <div className="file-preview">
                <label>Preview (first 500 characters):</label>
                <pre className="preview-content">
                  {fileContent.substring(0, 500)}
                  {fileContent.length > 500 && "..."}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="summary">Summary (Unencrypted) *</label>
          <input
            type="text"
            id="summary"
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            placeholder="Brief summary for record listing..."
            className={`form-input ${errors.summary ? "error" : ""}`}
            maxLength="280"
          />
          {errors.summary && (
            <span className="error-text">{errors.summary}</span>
          )}
          <small className="form-hint">
            This will be visible without decryption
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Additional context..."
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (Optional)</label>
          <input
            type="text"
            id="tags"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="customer, confidential, Q1-2026 (comma-separated)"
            className="form-input"
          />
          <small className="form-hint">Comma-separated tags</small>
        </div>

        <div className="form-group">
          <label htmlFor="password">Encryption Password *</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter strong password..."
            className={`form-input ${errors.password ? "error" : ""}`}
            autoComplete="new-password"
          />
          {errors.password && (
            <span className="error-text">{errors.password}</span>
          )}
          <small className="form-hint">
            Minimum 8 characters. You'll need this to decrypt.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password *</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm password..."
            className={`form-input ${errors.confirmPassword ? "error" : ""}`}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <span className="error-text">{errors.confirmPassword}</span>
          )}
        </div>

        <div className="security-notice">
          <strong>🔒 Security Notice:</strong>
          <p>
            Your data will be encrypted locally in your browser before being
            sent to the server. The encryption password is never transmitted.
          </p>
        </div>

        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={isEncrypting || createRecordMutation.isLoading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isEncrypting || createRecordMutation.isLoading}
          >
            {isEncrypting || createRecordMutation.isLoading
              ? "Encrypting & Creating..."
              : "Encrypt & Create Record"}
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * Generate a mask pattern based on data type
 */
function generateMaskPattern(data, recordType, fileName) {
  if (fileName) {
    return `📁 ${fileName} (encrypted)`;
  }

  const dataStr = String(data);
  const lines = dataStr.split("\n").length;

  if (lines > 3) {
    return `📄 ${lines} lines of ${recordType} data (encrypted)`;
  }

  if (recordType === "PII") {
    if (dataStr.includes("@")) {
      const emailMatch = dataStr.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        const email = emailMatch[0];
        const parts = email.split("@");
        return `${parts[0][0]}***@${parts[1]}`;
      }
    }
    return `${dataStr.slice(0, 2)}***${dataStr.slice(-2)}`;
  }

  if (recordType === "Financial") {
    return `****-****-****-${dataStr.slice(-4)}`;
  }

  if (recordType === "Medical") {
    return `MRN-***${dataStr.slice(-3)}`;
  }

  return `***encrypted data***`;
}

export default CreateRecordForm;
