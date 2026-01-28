/**
 * Validation Middleware
 * Validates request bodies and query parameters using Joi schemas
 */

const Joi = require("joi");

// Define Joi schemas
const schemas = {
  loginRequest: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email must be valid",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters",
      "any.required": "Password is required",
    }),
  }),

  registerRequest: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email must be valid",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters",
      "any.required": "Password is required",
    }),
    role: Joi.string()
      .valid("admin", "analyst", "viewer")
      .default("viewer")
      .optional()
      .messages({
        "any.only": "Role must be admin, analyst, or viewer",
      }),
    department: Joi.string().optional(),
  }),

  createRecord: Joi.object({
    encryptedData: Joi.string().required().messages({
      "any.required": "Encrypted data is required",
    }),
    iv: Joi.string().required().messages({
      "any.required": "IV (initialization vector) is required",
    }),
    authTag: Joi.string().required().messages({
      "any.required": "Auth tag is required",
    }),
    dataHash: Joi.string().required().messages({
      "any.required": "Data hash is required",
    }),
    metadata: Joi.object().optional().default({}),
    summary: Joi.string().max(280).required().messages({
      "any.required": "Summary is required",
    }),
    maskPattern: Joi.string().optional(),
    description: Joi.string().optional().allow(""),
    encryption: Joi.object({
      algorithm: Joi.string().default("AES-256-GCM"),
      keyDerivation: Joi.string().default("PBKDF2"),
      salt: Joi.string().required(),
      iterations: Joi.number().positive().default(100000),
      version: Joi.string().default("v1"),
    }).required(),
    kmsProvider: Joi.string()
      .valid("AWS_KMS", "GCP_KMS", "LOCAL", "aws", "gcp", "local")
      .optional()
      .default("local"),
    recordType: Joi.string().optional().default("Other"),
    tags: Joi.array().items(Joi.string()).optional().default([]),
    expiresIn: Joi.number().positive().optional(),
  }),

  revealRequest: Joi.object({
    revealPassword: Joi.string().optional().messages({
      "string.base": "Reveal password must be a string",
    }),
    reason: Joi.string().optional(),
    duration: Joi.number().positive().optional(),
  }),

  pagination: Joi.object({
    page: Joi.number().positive().default(1).optional(),
    pageSize: Joi.number().positive().max(100).default(20).optional(),
  }),
};

/**
 * Validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details,
        },
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Validate login request
 */
const validateLoginRequest = validate(schemas.loginRequest);

/**
 * Validate register request
 */
const validateRegisterRequest = validate(schemas.registerRequest);

/**
 * Validate create record request
 */
const validateCreateRecord = validate(schemas.createRecord);

/**
 * Validate reveal request
 */
const validateRevealRequest = validate(schemas.revealRequest);

/**
 * Validate query parameters (pagination)
 */
const validatePagination = (req, res, next) => {
  const { error, value } = schemas.pagination.validate(req.query);

  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid query parameters",
      },
    });
  }

  req.query = { ...req.query, ...value };
  next();
};

module.exports = {
  validateLoginRequest,
  validateRegisterRequest,
  validateCreateRecord,
  validateRevealRequest,
  validatePagination,
  validate,
};
