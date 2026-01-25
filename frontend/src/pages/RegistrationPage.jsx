/**
 * Registration Page Component
 * Handles new user account creation
 */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./RegistrationPage.css";

const RegistrationPage = () => {
  const navigate = useNavigate();
  const { register, error: authError } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Calculate password strength
  const calculateStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;
    return strength;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "password") {
      setPasswordStrength(calculateStrength(value));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return false;
    }

    if (formData.name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return false;
    }

    if (!formData.email) {
      setError("Email is required");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!formData.password) {
      setError("Password is required");
      return false;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    if (passwordStrength < 3) {
      setError(
        "Password must include uppercase, lowercase, numbers, and symbols",
      );
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await register(formData.email, formData.password, formData.name);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = [
    "#e53e3e",
    "#ed8936",
    "#ecc94b",
    "#68d391",
    "#38a169",
  ];

  return (
    <div className="registration-container">
      <div className="registration-card">
        <div className="registration-header">
          <h1>🔒 Create Account</h1>
          <p>Join CipherVault</p>
        </div>

        <form className="registration-form" onSubmit={handleSubmit}>
          {(error || authError) && (
            <div className="error-message">{error || authError}</div>
          )}

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="new-password"
            />
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(passwordStrength / 5) * 100}%`,
                      backgroundColor: strengthColors[passwordStrength - 1],
                    }}
                  />
                </div>
                <span
                  className="strength-label"
                  style={{ color: strengthColors[passwordStrength - 1] }}
                >
                  {strengthLabels[passwordStrength - 1]}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <div className="requirements">
            <h4>Password Requirements:</h4>
            <ul>
              <li className={formData.password.length >= 8 ? "met" : ""}>
                ✓ At least 8 characters
              </li>
              <li
                className={
                  /[a-z]/.test(formData.password) &&
                  /[A-Z]/.test(formData.password)
                    ? "met"
                    : ""
                }
              >
                ✓ Mix of uppercase and lowercase
              </li>
              <li className={/\d/.test(formData.password) ? "met" : ""}>
                ✓ At least one number
              </li>
              <li className={/[!@#$%^&*]/.test(formData.password) ? "met" : ""}>
                ✓ At least one special character (!@#$%^&*)
              </li>
            </ul>
          </div>

          <button type="submit" className="register-btn" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="registration-footer">
          <p>
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;
