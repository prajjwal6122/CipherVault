/**
 * Authentication Service
 * Handles user authentication, JWT token generation, and credential validation
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

class AuthService {
  constructor(options = {}) {
    this.secret = options.secret || process.env.JWT_SECRET || "your-secret-key";
    this.refreshSecret =
      options.refreshSecret ||
      process.env.JWT_REFRESH_SECRET ||
      "your-refresh-secret";
    this.tokenExpiry = options.tokenExpiry || "1h";
    this.refreshExpiry = options.refreshExpiry || "7d";
  }

  /**
   * Validate user credentials against database
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object|null} User object if valid, null if invalid
   */
  async validateCredentials(email, password) {
    try {
      // Find user by email - need to explicitly select password field
      const user = await User.findOne({ email, isActive: true }).select(
        "+password",
      );

      if (!user) {
        return null;
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        throw new Error("Account locked");
      }

      // Compare passwords
      const passwordMatch = await user.comparePassword(password);

      if (!passwordMatch) {
        // Increment failed login attempts
        await user.incLoginAttempts();
        return null;
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload
   * @param {Object} options - Token options
   * @returns {string} JWT token
   */
  generateToken(payload, options = {}) {
    return jwt.sign(payload, this.secret, {
      expiresIn: options.expiresIn || this.tokenExpiry,
    });
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {string} Refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiry,
    });
  }

  /**
   * Refresh an expired access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {string|null} New access token or null if invalid
   */
  refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.refreshSecret);
      return this.generateToken({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  /**
   * Verify refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  verifyRefreshToken(refreshToken) {
    try {
      return jwt.verify(refreshToken, this.refreshSecret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a new user account
   * @param {Object} userData - User data
   * @returns {Object} Created user object
   */
  async createUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error("User already exists");
      }

      // Create new user
      const user = new User(userData);
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Object|null} User object or null if not found
   */
  async getUserById(userId) {
    try {
      return await User.findById(userId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Object|null} User object or null if not found
   */
  async getUserByEmail(email) {
    try {
      return await User.findOne({ email });
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} True if successful
   */
  async updatePassword(userId, oldPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      // Verify old password
      const passwordMatch = await user.comparePassword(oldPassword);
      if (!passwordMatch) {
        return false;
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = AuthService;
