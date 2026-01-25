/**
 * API Specifications - OpenAPI 3.0
 * Complete endpoint specifications for Secure Data Encryption Platform
 */

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Secure Data Encryption & Controlled Reveal API",
      version: "1.0.0",
      description:
        "Client-side encryption with controlled data reveal for sensitive information",
      contact: {
        name: "Support",
        email: "support@securedata.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://api.securedata.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        // User schemas
        User: {
          type: "object",
          required: ["email", "password", "role"],
          properties: {
            id: {
              type: "string",
              description: "User ID (MongoDB ObjectId)",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            password: {
              type: "string",
              format: "password",
              description: "Hashed password (bcryptjs)",
            },
            role: {
              type: "string",
              enum: ["admin", "analyst", "viewer"],
              description: "User role for access control",
            },
            department: {
              type: "string",
              description: "Department or team",
            },
            isActive: {
              type: "boolean",
              default: true,
            },
            loginAttempts: {
              type: "integer",
              default: 0,
            },
            lockUntil: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },

        // Login request/response
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
            },
            password: {
              type: "string",
              format: "password",
            },
          },
        },

        AuthResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            data: {
              type: "object",
              properties: {
                user: {
                  $ref: "#/components/schemas/User",
                },
                token: {
                  type: "string",
                  description: "JWT access token (expires in 1 hour)",
                },
                refreshToken: {
                  type: "string",
                  description: "Refresh token (expires in 7 days)",
                },
              },
            },
            message: {
              type: "string",
            },
          },
        },

        // Record schemas
        EncryptedRecord: {
          type: "object",
          required: ["encryptedData", "iv", "authTag", "dataHash"],
          properties: {
            id: {
              type: "string",
              description: "Record ID (MongoDB ObjectId)",
            },
            encryptedData: {
              type: "string",
              description: "Base64-encoded encrypted data",
            },
            iv: {
              type: "string",
              description: "Base64-encoded initialization vector (12 bytes)",
            },
            authTag: {
              type: "string",
              description: "Base64-encoded authentication tag (16 bytes)",
            },
            dataHash: {
              type: "string",
              description:
                "SHA-256 hash of original data for integrity verification",
            },
            metadata: {
              type: "object",
              properties: {
                originalFileName: {
                  type: "string",
                },
                fileType: {
                  type: "string",
                },
                dataType: {
                  type: "string",
                  enum: ["PII", "PCI", "PHI", "CUSTOM"],
                },
                sensitivity: {
                  type: "string",
                  enum: ["low", "medium", "high", "critical"],
                },
              },
            },
            kmsProvider: {
              type: "string",
              enum: ["AWS_KMS", "GCP_KMS", "LOCAL"],
              description: "Key management service provider",
            },
            recordType: {
              type: "string",
              description: "Type of record (PAN, SSN, etc)",
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
            },
            ownerEmail: {
              type: "string",
              format: "email",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
            expiresAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
          },
        },

        CreateRecordRequest: {
          type: "object",
          required: ["encryptedData", "iv", "authTag", "dataHash"],
          properties: {
            encryptedData: {
              type: "string",
              description: "Base64-encoded encrypted data",
            },
            iv: {
              type: "string",
              description: "Base64-encoded IV",
            },
            authTag: {
              type: "string",
              description: "Base64-encoded auth tag",
            },
            dataHash: {
              type: "string",
              description: "SHA-256 hash",
            },
            metadata: {
              type: "object",
            },
            kmsProvider: {
              type: "string",
              enum: ["AWS_KMS", "GCP_KMS", "LOCAL"],
            },
            recordType: {
              type: "string",
            },
            tags: {
              type: "array",
              items: { type: "string" },
            },
            expiresIn: {
              type: "number",
              description: "Expiration time in seconds",
            },
          },
        },

        RecordListResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            data: {
              type: "object",
              properties: {
                records: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      recordType: { type: "string" },
                      metadata: { type: "object" },
                      maskedData: {
                        type: "object",
                        description: "Partially masked data preview",
                      },
                      createdAt: { type: "string" },
                      tags: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                  },
                },
                pagination: {
                  type: "object",
                  properties: {
                    total: { type: "integer" },
                    page: { type: "integer" },
                    pageSize: { type: "integer" },
                    totalPages: { type: "integer" },
                  },
                },
              },
            },
            message: {
              type: "string",
            },
          },
        },

        // Reveal/Decrypt request/response
        RevealRequest: {
          type: "object",
          required: ["revealPassword"],
          properties: {
            revealPassword: {
              type: "string",
              description: "Password to authorize reveal",
            },
            reason: {
              type: "string",
              description: "Reason for revealing (for audit log)",
            },
            duration: {
              type: "number",
              description: "How long reveal is valid (seconds)",
            },
          },
        },

        RevealResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            data: {
              type: "object",
              properties: {
                decryptedData: {
                  type: "string",
                  description: "Base64-encoded decrypted data",
                },
                decryptionKey: {
                  type: "string",
                  description: "One-time decryption key (if applicable)",
                },
                expiresAt: {
                  type: "string",
                  format: "date-time",
                  description: "When this reveal access expires",
                },
                revealToken: {
                  type: "string",
                  description: "Token to prove authorization",
                },
              },
            },
            message: {
              type: "string",
            },
          },
        },

        // Audit log schemas
        AuditLog: {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
            action: {
              type: "string",
              enum: [
                "LOGIN",
                "LOGOUT",
                "CREATE_RECORD",
                "VIEW_RECORD",
                "REVEAL_RECORD",
                "DELETE_RECORD",
                "UPDATE_RECORD",
                "EXPORT_DATA",
                "CHANGE_PASSWORD",
                "FAILED_LOGIN",
                "UNAUTHORIZED_ACCESS",
                "SUSPICIOUS_ACTIVITY",
                "KEY_ROTATION",
                "COMPLIANCE_CHECK",
                "ADMIN_ACTION",
                "SYSTEM_EVENT",
              ],
            },
            userId: {
              type: "string",
            },
            userEmail: {
              type: "string",
            },
            recordId: {
              type: "string",
              nullable: true,
            },
            ipAddress: {
              type: "string",
            },
            userAgent: {
              type: "string",
            },
            reason: {
              type: "string",
              description: "Reason for action (especially for reveals)",
            },
            status: {
              type: "string",
              enum: ["SUCCESS", "FAILED", "SUSPICIOUS"],
            },
            details: {
              type: "object",
              description: "Additional context-specific details",
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
          },
        },

        // Error response
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  description:
                    "Error code (e.g., AUTH_FAILED, INVALID_REQUEST)",
                },
                message: {
                  type: "string",
                },
                details: {
                  type: "object",
                  description: "Additional error details",
                },
              },
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./backend/src/routes/*.js"], // Path to route files
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
