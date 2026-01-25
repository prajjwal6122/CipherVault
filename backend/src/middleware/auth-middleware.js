/**
 * Authentication Middleware
 * Verifies JWT tokens and extracts user information
 */

const jwt = require("jsonwebtoken");

/**
 * Verify and decode JWT token
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Authorization token is required",
        },
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );

    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          code: "TOKEN_EXPIRED",
          message: "Token has expired",
        },
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid token",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Authentication error",
      },
    });
  }
};

/**
 * Verify refresh token and generate new access token
 */
const verifyRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
    );
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const authenticateTokenOptional = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      );
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  authenticateTokenOptional,
  verifyRefreshToken,
};
