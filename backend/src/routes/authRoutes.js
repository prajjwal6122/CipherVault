/**
 * Authentication Routes
 * Handles login, logout, token refresh, and registration endpoints
 *
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 *       500:
 *         description: Server error
 *
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid refresh token
 *       500:
 *         description: Server error
 *
 * /auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /auth/register:
 *   post:
 *     summary: User registration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: [analyst, viewer]
 *               department:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */

const express = require("express");
const AuthService = require("../services/auth-service");
const { authenticateToken } = require("../middleware/auth-middleware");
const {
  validateLoginRequest,
  validateRegisterRequest,
} = require("../middleware/validation-middleware");
const AuditService = require("../services/audit-service");

const router = express.Router();
const authService = new AuthService();

/**
 * POST /auth/login
 * User login endpoint
 */
router.post("/login", validateLoginRequest, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get("user-agent");

    // Validate credentials
    const user = await authService.validateCredentials(email, password);

    if (!user) {
      // Log failed login attempt
      AuditService.logAction({
        action: "FAILED_LOGIN",
        userEmail: email,
        ipAddress,
        userAgent,
        status: "FAILED",
        reason: "Invalid credentials",
      });

      return res.status(401).json({
        success: false,
        error: {
          code: "AUTH_FAILED",
          message: "Invalid email or password",
        },
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      AuditService.logAction({
        action: "FAILED_LOGIN",
        userId: user._id,
        userEmail: email,
        ipAddress,
        userAgent,
        status: "SUSPICIOUS",
        reason: "Account locked due to failed attempts",
      });

      return res.status(429).json({
        success: false,
        error: {
          code: "ACCOUNT_LOCKED",
          message:
            "Account locked due to multiple failed login attempts. Try again later.",
          lockUntil: user.lockUntil,
        },
      });
    }

    // Generate tokens with plain payload (not Mongoose document)
    const token = authService.generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = authService.generateRefreshToken({
      id: user._id,
      email: user.email,
    });

    // Reset login attempts
    await user.resetLoginAttempts();

    // Log successful login
    AuditService.logAction({
      action: "LOGIN",
      userId: user._id,
      userEmail: email,
      ipAddress,
      userAgent,
      status: "SUCCESS",
    });

    // Return response without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      data: {
        user: userResponse,
        token,
        refreshToken,
      },
      message: "Login successful",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/register
 * User registration endpoint
 */
router.post("/register", validateRegisterRequest, async (req, res, next) => {
  try {
    const { email, password, role, department } = req.body;
    const ipAddress = req.ip;
    const User = require("../models/User");

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: "USER_EXISTS",
          message: "Email already registered",
        },
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      role,
      department,
    });

    await user.save();

    // Log registration
    AuditService.logAction({
      action: "ADMIN_ACTION",
      userEmail: email,
      ipAddress,
      status: "SUCCESS",
      reason: "New user registration",
    });

    // Generate tokens with plain payload (not Mongoose document)
    const token = authService.generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = authService.generateRefreshToken({
      id: user._id,
      email: user.email,
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        token,
        refreshToken,
      },
      message: "User registered successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Refresh token is required",
        },
      });
    }

    // Verify refresh token
    const newToken = authService.refreshToken(refreshToken);

    if (!newToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired refresh token",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
      },
      message: "Token refreshed successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/logout
 * User logout endpoint
 */
router.post("/logout", authenticateToken, async (req, res, next) => {
  try {
    const user = req.user;
    const ipAddress = req.ip;

    // Log logout
    AuditService.logAction({
      action: "LOGOUT",
      userId: user.id,
      userEmail: user.email,
      ipAddress,
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get("/me", authenticateToken, async (req, res, next) => {
  try {
    const User = require("../models/User");
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
