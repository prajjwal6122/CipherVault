/**
 * Revealed Record Component
 * Displays decrypted record data with auto-masking timeout
 */

import React, { useState, useEffect } from "react";
import "./RevealedRecord.css";

const RevealedRecord = ({ decryptedData, onRemask, autoMaskTimeout = 300 }) => {
  const [timeRemaining, setTimeRemaining] = useState(autoMaskTimeout);
  const [isMasked, setIsMasked] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (isMasked || timeRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsMasked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isMasked]);

  const handleRemask = () => {
    setIsMasked(true);
    if (onRemask) {
      onRemask();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerStatus = () => {
    if (timeRemaining > 120) {
      return "safe";
    } else if (timeRemaining > 60) {
      return "warning";
    } else {
      return "critical";
    }
  };

  if (!decryptedData) {
    return (
      <div className="revealed-record-container">
        <div className="empty-message">
          <p>No decrypted data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="revealed-record-container">
      {/* Auto-mask timer */}
      <div className={`timer-bar timer-${getTimerStatus()}`}>
        <div className="timer-content">
          <span className="timer-label">Auto-mask in:</span>
          <span className="timer-value">{formatTime(timeRemaining)}</span>
          <button
            onClick={handleRemask}
            className="remask-now-btn"
            title="Re-mask data immediately"
          >
            Re-mask Now
          </button>
        </div>
      </div>

      {/* Decrypted data display */}
      {!isMasked ? (
        <div className="decrypted-content">
          <div className="decrypted-header">
            <h3>🔓 Decrypted Record</h3>
            <p className="decrypted-timestamp">
              Revealed at {new Date().toLocaleTimeString()}
            </p>
          </div>

          <div className="decrypted-data">
            {typeof decryptedData === "object" ? (
              <div className="data-fields">
                {Object.entries(decryptedData).map(([key, value]) => (
                  <div key={key} className="data-field">
                    <label className="field-label">
                      {formatFieldName(key)}:
                    </label>
                    <div className="field-value">
                      {typeof value === "object" ? (
                        <pre>{JSON.stringify(value, null, 2)}</pre>
                      ) : (
                        <span>{String(value)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="data-field">
                <div className="field-value">
                  <p>{String(decryptedData)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="decrypted-footer">
            <p className="security-warning">
              ⚠️ This data is displayed unmasked. Be aware of your surroundings
              and ensure no one else can see your screen.
            </p>
          </div>
        </div>
      ) : (
        <div className="masked-content">
          <div className="masked-header">
            <h3>🔒 Data Re-masked</h3>
            <p>The decrypted data has been re-masked for security.</p>
          </div>
          <button
            onClick={() => setIsMasked(false)}
            className="reveal-again-btn"
          >
            Reveal Again
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Format field name for display (camelCase to Title Case)
 */
function formatFieldName(fieldName) {
  if (!fieldName || typeof fieldName !== "string") return "";

  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export default RevealedRecord;
