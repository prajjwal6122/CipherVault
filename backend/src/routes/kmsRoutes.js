/**
 * Key Management Service (KMS) Routes
 * Handles encryption key operations, key rotation, and KMS management
 *
 * @swagger
 * /kms/encrypt:
 *   post:
 *     summary: Encrypt data using KMS
 *     tags: [KMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plaintext]
 *             properties:
 *               plaintext:
 *                 type: string
 *                 description: Data to encrypt (base64 encoded)
 *               kmsProvider:
 *                 type: string
 *                 enum: [AWS_KMS, GCP_KMS, LOCAL]
 *               keyId:
 *                 type: string
 *                 description: Specific key ID to use
 *     responses:
 *       200:
 *         description: Data encrypted successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /kms/decrypt:
 *   post:
 *     summary: Decrypt data using KMS
 *     tags: [KMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [encryptedData, iv, authTag]
 *             properties:
 *               encryptedData:
 *                 type: string
 *               iv:
 *                 type: string
 *               authTag:
 *                 type: string
 *               kmsProvider:
 *                 type: string
 *               keyId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Data decrypted successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Decryption not allowed
 *
 * /kms/keys:
 *   get:
 *     summary: List all KMS keys (admin only)
 *     tags: [KMS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Keys listed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *
 * /kms/keys/rotate:
 *   post:
 *     summary: Rotate encryption keys (admin only)
 *     tags: [KMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kmsProvider]
 *             properties:
 *               kmsProvider:
 *                 type: string
 *                 enum: [AWS_KMS, GCP_KMS, LOCAL]
 *               rotateAll:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Key rotation initiated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *
 * /kms/health:
 *   get:
 *     summary: Check KMS health status
 *     tags: [KMS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KMS status retrieved
 *       500:
 *         description: KMS unavailable
 */

const express = require("express");
const { getKMSService } = require("../services/kms-factory");
const AuditService = require("../services/audit-service");
const { authenticateToken } = require("../middleware/auth-middleware");
const { checkAdminRole } = require("../middleware/authorization-middleware");

const router = express.Router();

/**
 * POST /kms/encrypt
 * Encrypt data using KMS
 */
router.post("/encrypt", authenticateToken, async (req, res, next) => {
  try {
    const { plaintext, kmsProvider = "LOCAL", keyId } = req.body;
    const userEmail = req.user.email;

    if (!plaintext) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_DATA",
          message: "Plaintext is required",
        },
      });
    }

    // Encrypt data
    const kmsService = getKMSService();
    const encryptionResult = await kmsService.encryptData(plaintext, {});

    // Log action
    await AuditService.logAction({
      action: "CREATE_RECORD",
      userEmail,
      ipAddress: req.ip,
      status: "SUCCESS",
      resourceType: "kms",
      details: {
        operation: "encrypt",
        kmsProvider: encryptionResult.provider || kmsProvider,
        keyId: encryptionResult.keyId,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        encryptedData: encryptionResult.ciphertext,
        iv: encryptionResult.iv,
        authTag: encryptionResult.authTag,
        kmsProvider: encryptionResult.provider || kmsProvider,
        keyId: encryptionResult.keyId,
      },
      message: "Data encrypted successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /kms/decrypt
 * Decrypt data using KMS
 */
router.post("/decrypt", authenticateToken, async (req, res, next) => {
  try {
    const {
      encryptedData,
      iv,
      authTag,
      kmsProvider = "LOCAL",
      keyId,
    } = req.body;
    const userEmail = req.user.email;
    const userId = req.user.id;

    // Validate required fields
    if (!encryptedData || !iv || !authTag) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_DATA",
          message: "encryptedData, iv, and authTag are required",
        },
      });
    }

    // Decrypt data
    const kmsService = getKMSService();
    const decryptedData = await kmsService.decryptData(
      encryptedData,
      iv,
      authTag,
      {},
    );

    // Log action
    await AuditService.logAction({
      action: "REVEAL_RECORD",
      userId,
      userEmail,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "kms",
      details: {
        operation: "decrypt",
        kmsProvider,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        decryptedData,
      },
      message: "Data decrypted successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /kms/keys
 * List all KMS keys (admin only)
 */
router.get(
  "/keys",
  authenticateToken,
  checkAdminRole,
  async (req, res, next) => {
    try {
      // Get keys from KMS service
      const kmsService = getKMSService();
      const keys = await kmsService.listKeys();

      res.status(200).json({
        success: true,
        data: {
          keys,
        },
        message: "Keys retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /kms/keys/rotate
 * Rotate encryption keys (admin only)
 */
router.post(
  "/keys/rotate",
  authenticateToken,
  checkAdminRole,
  async (req, res, next) => {
    try {
      const { kmsProvider, rotateAll = false } = req.body;
      const userEmail = req.user.email;

      // Initiate key rotation
      const kmsService = getKMSService();
      const rotationResult = await kmsService.rotateKey();

      // Log action
      await AuditService.logAction({
        action: "KMS_ROTATE_KEY",
        userEmail,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        status: "SUCCESS",
        resourceType: "kms",
        reason: `Key rotation initiated`,
        details: {
          kmsProvider: kmsProvider || "local",
          rotateAll,
          newKeyId: rotationResult,
        },
      });

      res.status(200).json({
        success: true,
        data: { newKeyId: rotationResult },
        message: "Key rotation initiated successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /kms/health
 * Check KMS health status
 */
router.get("/health", authenticateToken, async (req, res, next) => {
  try {
    // Check KMS connectivity
    const kmsService = getKMSService();
    const healthStatus = await kmsService.checkHealth();

    const statusCode = healthStatus.healthy ? 200 : 500;

    res.status(statusCode).json({
      success: healthStatus.healthy,
      data: {
        status: healthStatus.status,
        provider: healthStatus.provider,
        keyId: healthStatus.keyId,
        timestamp: new Date().toISOString(),
      },
      message: healthStatus.healthy ? "KMS is healthy" : "KMS has issues",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "KMS_ERROR",
        message: "KMS health check failed",
      },
    });
  }
});

/**
 * POST /kms/generate-data-key
 * Generate a new data key
 */
router.post("/generate-data-key", authenticateToken, async (req, res, next) => {
  try {
    const { kmsProvider = "LOCAL", keySpec = "AES_256" } = req.body;
    const userEmail = req.user.email;

    // Generate data key
    const kmsService = getKMSService();
    const dataKey = await kmsService.generateDataKey(keySpec);

    // Log action
    await AuditService.logAction({
      action: "CREATE_RECORD",
      userEmail,
      ipAddress: req.ip,
      status: "SUCCESS",
      resourceType: "kms",
      details: {
        operation: "generate_data_key",
        kmsProvider,
        keySpec,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        plaintext: dataKey.plaintext,
        encrypted: dataKey.encrypted,
        iv: dataKey.iv,
        authTag: dataKey.authTag,
        keyId: dataKey.keyId,
        keySpec: dataKey.keySpec,
      },
      message: "Data key generated successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /kms/verify-key
 * Verify key integrity and functionality
 */
router.post(
  "/verify-key",
  authenticateToken,
  checkAdminRole,
  async (req, res, next) => {
    try {
      const { kmsProvider, keyId } = req.body;
      const userEmail = req.user.email;

      if (!kmsProvider || !keyId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "kmsProvider and keyId are required",
          },
        });
      }

      // Verify key
      const kmsService = getKMSService();
      const verificationResult = await kmsService.verifyKey(kmsProvider, keyId);

      // Log action
      await AuditService.logAction({
        action: "COMPLIANCE_CHECK",
        userEmail,
        ipAddress: req.ip,
        status: "SUCCESS",
        reason: "Key integrity verification",
        details: {
          kmsProvider,
          keyId,
          result: verificationResult,
        },
      });

      res.status(200).json({
        success: verificationResult.valid,
        data: verificationResult,
        message: verificationResult.valid
          ? "Key is valid"
          : "Key verification failed",
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
