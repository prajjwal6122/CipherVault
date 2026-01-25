/**
 * Record Management Routes
 * Handles CRUD operations for encrypted records with reveal functionality
 *
 * @swagger
 * /records:
 *   get:
 *     summary: List all records (with pagination and filtering)
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: recordType
 *         schema:
 *           type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecordListResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 *   post:
 *     summary: Create a new encrypted record
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRecordRequest'
 *     responses:
 *       201:
 *         description: Record created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *
 * /records/{recordId}:
 *   get:
 *     summary: Get specific record details
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record details retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Soft delete a record
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 *
 * /records/{recordId}/mask:
 *   get:
 *     summary: Get masked record (without encryption)
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Masked record retrieved
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Record not found
 *
 * /records/{recordId}/reveal:
 *   post:
 *     summary: Request to reveal/decrypt a record
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RevealRequest'
 *     responses:
 *       200:
 *         description: Record revealed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RevealResponse'
 *       401:
 *         description: Unauthorized or invalid password
 *       403:
 *         description: No permission to reveal
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 */

const express = require("express");
const RecordService = require("../services/record-service");
const AuditService = require("../services/audit-service");
const User = require("../models/User");
const { authenticateToken } = require("../middleware/auth-middleware");
const {
  validateCreateRecord,
  validateRevealRequest,
} = require("../middleware/validation-middleware");
const { paginate, filterRecords } = require("../middleware/query-middleware");

const router = express.Router();
const recordService = new RecordService();

// KMS service is passed via middleware or created at route init

/**
 * GET /records
 * List all records with pagination and filtering
 */
router.get(
  "/",
  authenticateToken,
  paginate,
  filterRecords,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { page, pageSize, filters } = req.query;

      // Get records based on user role
      let records;
      if (userRole === "admin") {
        // Admins see all records
        records = await recordService.listRecords(page, pageSize, filters);
      } else {
        // Others see only their own records
        records = await recordService.listRecordsByOwner(
          userId,
          page,
          pageSize,
          filters,
        );
      }

      res.status(200).json({
        success: true,
        data: records,
        message: "Records retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /records
 * Create a new encrypted record
 */
router.post(
  "/",
  authenticateToken,
  (req, res, next) => {
    console.log(
      "DEBUG - Before validation, req.body keys:",
      Object.keys(req.body || {}),
    );
    console.log(
      "DEBUG - encryption object:",
      JSON.stringify(req.body?.encryption, null, 2),
    );
    next();
  },
  validateCreateRecord,
  async (req, res, next) => {
    try {
      console.log("DEBUG - After validation, creating record...");
      const userId = req.user.id;
      const userEmail = req.user.email;
      const {
        encryptedData,
        iv,
        authTag,
        dataHash,
        metadata,
        kmsProvider,
        recordType,
        tags,
        expiresIn,
        summary,
        maskPattern,
        description,
        encryption,
      } = req.body;

      const normalizedProvider = (kmsProvider || "LOCAL").toLowerCase();
      const expiresAt = expiresIn
        ? new Date(Date.now() + Number(expiresIn) * 1000)
        : undefined;
      const encryptionConfig = {
        algorithm: encryption?.algorithm || "AES-256-GCM",
        keyDerivation: encryption?.keyDerivation || "PBKDF2",
        salt: encryption?.salt,
        iterations: encryption?.iterations || 100000,
        version: encryption?.version || "v1",
      };

      if (!encryptionConfig.salt) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_ENCRYPTION_METADATA",
            message: "Encryption salt is required",
          },
        });
      }

      // Create record
      const record = await recordService.createRecord({
        userId,
        encryptedData,
        iv,
        authTag,
        dataHash,
        metadata,
        summary,
        maskPattern,
        description,
        kmsProvider: normalizedProvider,
        recordType,
        tags: tags || [],
        ownerEmail: userEmail,
        encryption: encryptionConfig,
        expiresAt,
      });

      // Log action
      await AuditService.logAction({
        action: "CREATE_RECORD",
        userId,
        userEmail,
        recordId: record._id,
        resourceType: "record",
        resourceId: record.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        status: "SUCCESS",
        details: {
          recordType,
          kmsProvider: normalizedProvider,
          dataHash,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          record: {
            id: record._id,
            recordType,
            tags,
            createdAt: record.createdAt,
            summary: record.summary,
            maskPattern: record.maskPattern,
          },
        },
        message: "Record created successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /records/:recordId
 * Get specific record details
 */
router.get("/:recordId", authenticateToken, async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get record
    const record = await recordService.getRecord(recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: "RECORD_NOT_FOUND",
          message: "Record not found",
        },
      });
    }

    // Check permissions
    if (userRole !== "admin" && record.ownerEmail !== req.user.email) {
      // Log unauthorized access attempt
      await AuditService.logAction({
        action: "UNAUTHORIZED_ACCESS",
        userId,
        userEmail: req.user.email,
        recordId,
        ipAddress: req.ip,
        status: "SUSPICIOUS",
        reason: "Attempted to access record not owned",
      });

      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to access this record",
        },
      });
    }

    // Log view action
    await AuditService.logAction({
      action: "VIEW_RECORD",
      userId,
      userEmail: req.user.email,
      recordId,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    // Return masked data by default
    const maskedRecord = record.getMasked();

    res.status(200).json({
      success: true,
      data: {
        record: maskedRecord,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /records/:recordId
 * Soft delete a record
 */
router.delete("/:recordId", authenticateToken, async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userRole = req.user.role;

    // Get record
    const record = await recordService.getRecord(recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: "RECORD_NOT_FOUND",
          message: "Record not found",
        },
      });
    }

    // Check permissions
    if (userRole !== "admin" && record.ownerEmail !== userEmail) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to delete this record",
        },
      });
    }

    // Soft delete
    await recordService.deleteRecord(recordId);

    // Log action
    await AuditService.logAction({
      action: "DELETE_RECORD",
      userId,
      userEmail,
      recordId,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      message: "Record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /records/:recordId/mask
 * Get masked record preview
 */
router.get("/:recordId/mask", authenticateToken, async (req, res, next) => {
  try {
    const { recordId } = req.params;

    const record = await recordService.getRecord(recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: "RECORD_NOT_FOUND",
          message: "Record not found",
        },
      });
    }

    const maskedData = record.getMasked();

    res.status(200).json({
      success: true,
      data: {
        maskedData,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /records/:recordId/reveal
 * Reveal (decrypt) a record
 */
router.post(
  "/:recordId/reveal",
  authenticateToken,
  validateRevealRequest,
  async (req, res, next) => {
    try {
      const { recordId } = req.params;
      const { revealPassword, reason, duration } = req.body;
      const userId = req.user.id;
      const userEmail = req.user.email;
      const userRole = req.user.role;

      // Get record
      const record = await recordService.getRecord(recordId);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: {
            code: "RECORD_NOT_FOUND",
            message: "Record not found",
          },
        });
      }

      // Check permissions - only owner or admin can reveal
      if (userRole !== "admin" && record.ownerEmail !== userEmail) {
        await AuditService.logAction({
          action: "UNAUTHORIZED_ACCESS",
          userId,
          userEmail,
          recordId,
          ipAddress: req.ip,
          status: "SUSPICIOUS",
          reason: "Attempted to reveal record not owned",
        });

        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to reveal this record",
          },
        });
      }

      // Verify user password for re-authentication
      const user = await User.findById(userId).select("+password");
      if (!user || !(await user.comparePassword(revealPassword))) {
        await AuditService.logAction({
          action: "REVEAL_RECORD",
          userId,
          userEmail,
          recordId,
          resourceType: "record",
          resourceId: record.id,
          ipAddress: req.ip,
          status: "FAILED",
          reason: "Invalid password",
        });

        return res.status(401).json({
          success: false,
          error: {
            code: "INVALID_PASSWORD",
            message: "Invalid password",
          },
        });
      }

      const expiresAt = new Date(Date.now() + (duration || 3600) * 1000);

      // Log successful reveal
      await AuditService.logAction({
        action: "REVEAL_RECORD",
        userId,
        userEmail,
        recordId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        reason: reason || "Revealed for business purposes",
        status: "SUCCESS",
        details: {
          expiresAt,
          clientDecryption: true,
        },
      });

      // Mark record as revealed
      await record.markAsRevealed(userEmail);

      const responsePayload = {
        recordId: record.id,
        recordType: record.recordType,
        summary: record.summary,
        metadata: record.metadata,
        tags: record.tags,
        createdAt: record.createdAt,
        encryptedPayload: {
          encryptedData: record.encryptedData,
          iv: record.iv,
          authTag: record.authTag,
        },
        encryption: {
          algorithm: record.encryption?.algorithm,
          keyDerivation: record.encryption?.keyDerivation,
          salt: record.encryption?.salt,
          iterations: record.encryption?.iterations,
          version: record.encryption?.version,
        },
        dataHash: record.dataHash,
        expiresAt,
      };

      res.status(200).json({
        success: true,
        data: responsePayload,
        message:
          "Record ready for client-side decryption. This access is logged for compliance.",
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
