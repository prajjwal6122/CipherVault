/**
 * Error Handling Middleware
 * Centralized error response formatting and logging
 */

const AuditService = require("../services/audit-service");

/**
 * Format error response
 */
const formatErrorResponse = (error, req) => {
  let statusCode = 500;
  let errorCode = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected error occurred";
  let details = {};

  // Handle specific error types
  if (error.statusCode) {
    statusCode = error.statusCode;
    errorCode = error.code || errorCode;
    message = error.message || message;
  } else if (error.name === "ValidationError") {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = "Request validation failed";
    details = error.details || {};
  } else if (error.name === "CastError") {
    statusCode = 400;
    errorCode = "INVALID_ID";
    message = "Invalid resource ID format";
  } else if (error.name === "MongoServerError") {
    if (error.code === 11000) {
      statusCode = 409;
      errorCode = "DUPLICATE_ENTRY";
      message = "Resource already exists";
    } else {
      statusCode = 500;
      errorCode = "DATABASE_ERROR";
      message = "Database operation failed";
    }
  } else if (error instanceof SyntaxError) {
    statusCode = 400;
    errorCode = "INVALID_JSON";
    message = "Request body contains invalid JSON";
  }

  return {
    statusCode,
    errorCode,
    message,
    details,
  };
};

/**
 * Global error handler middleware
 */
const errorHandler = async (err, req, res, next) => {
  try {
    const { statusCode, errorCode, message, details } = formatErrorResponse(
      err,
      req,
    );

    // Log error to audit system if user is authenticated
    if (req.user) {
      try {
        AuditService.logAction({
          action: "SYSTEM_EVENT",
          userId: req.user.id,
          userEmail: req.user.email,
          ipAddress: req.ip,
          status: "FAILED",
          reason: `Error: ${errorCode}`,
          details: {
            errorMessage: message,
            errorCode,
            path: req.path,
            method: req.method,
          },
        });
      } catch (auditError) {
        // Continue even if audit logging fails
        console.error("Audit logging failed:", auditError);
      }
    }

    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.error(`[${errorCode}] ${message}`, err);
    }

    // Send error response
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
        ...(Object.keys(details).length > 0 && { details }),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (handlerError) {
    // Fallback error response
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * 404 Not Found middleware
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};

/**
 * Async error wrapper for route handlers
 * Wraps async functions to catch errors and pass to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom Error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = "APP_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error
 */
class AuthError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, 401, "AUTH_ERROR");
  }
}

/**
 * Authorization error
 */
class AuthorizationError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "FORBIDDEN");
  }
}

/**
 * Validation error
 */
class ValidationError extends AppError {
  constructor(message = "Validation failed", details = {}) {
    super(message, 400, "VALIDATION_ERROR");
    this.details = details;
  }
}

/**
 * Not found error
 */
class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

/**
 * Conflict error (duplicate entry, etc.)
 */
class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

/**
 * Database error
 */
class DatabaseError extends AppError {
  constructor(message = "Database operation failed") {
    super(message, 500, "DATABASE_ERROR");
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  AuthError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  formatErrorResponse,
};
