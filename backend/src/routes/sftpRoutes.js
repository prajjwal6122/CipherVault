/**
 * SFTP Integration Routes - Phase 4.6
 * Handles secure file transfer via SFTP protocol
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const { authenticateToken } = require("../middleware/auth-middleware");
const SFTPService = require("../services/sftp-service");

const router = express.Router();
const sftpService = new SFTPService();

/**
 * POST /api/v1/sftp/upload
 * Handle SFTP file upload for bulk encryption
 */
router.post("/upload", authenticateToken, async (req, res, next) => {
  try {
    const { filename, fileContent, recordType = "OTHER", tags = [] } = req.body;
    const userId = req.user._id;

    if (!filename || !fileContent) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "filename and fileContent are required",
        },
      });
    }

    // Encrypt the file using SFTP service
    const encryptedRecord = await sftpService.encryptAndStore({
      userId,
      filename,
      fileContent,
      recordType,
      tags,
      ipAddress: req.ip,
    });

    // Log SFTP upload action
    const AuditService = require("../services/audit-service");
    await AuditService.logAction({
      action: "SFTP_UPLOAD",
      userId,
      recordId: encryptedRecord._id,
      ipAddress: req.ip,
      details: { filename, size: fileContent.length },
      status: "SUCCESS",
    });

    res.status(201).json({
      success: true,
      data: {
        recordId: encryptedRecord._id,
        filename: encryptedRecord.filename,
        size: fileContent.length,
        createdAt: encryptedRecord.createdAt,
      },
      message: "File uploaded and encrypted successfully",
    });
  } catch (error) {
    const AuditService = require("../services/audit-service");
    await AuditService.logAction({
      action: "SFTP_UPLOAD",
      userId: req.user._id,
      ipAddress: req.ip,
      status: "FAILED",
      reason: error.message,
    });

    res.status(500).json({
      success: false,
      error: {
        code: "UPLOAD_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/sftp/download/:recordId
 * Download and decrypt file via SFTP
 */
router.get("/download/:recordId", authenticateToken, async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const userId = req.user._id;
    const ipAddress = req.ip;

    // Get encrypted record
    const Record = require("../models/Record");
    const record = await Record.findById(recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Record not found",
        },
      });
    }

    // Check access permissions
    if (record.userId.toString() !== userId.toString()) {
      const AuditService = require("../services/audit-service");
      await AuditService.logAction({
        action: "SFTP_DOWNLOAD_DENIED",
        userId,
        recordId,
        ipAddress,
        status: "DENIED",
        reason: "Unauthorized access attempt",
      });

      return res.status(403).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You do not have permission to access this record",
        },
      });
    }

    // Decrypt file
    const decryptedContent = await sftpService.decryptFile(record);

    // Log SFTP download action
    const AuditService = require("../services/audit-service");
    await AuditService.logAction({
      action: "SFTP_DOWNLOAD",
      userId,
      recordId,
      ipAddress,
      details: { filename: record.filename },
      status: "SUCCESS",
    });

    // Send file as attachment
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${record.filename}"`,
    );
    res.send(decryptedContent);
  } catch (error) {
    const AuditService = require("../services/audit-service");
    await AuditService.logAction({
      action: "SFTP_DOWNLOAD",
      userId: req.user._id,
      recordId: req.params.recordId,
      ipAddress: req.ip,
      status: "FAILED",
      reason: error.message,
    });

    res.status(500).json({
      success: false,
      error: {
        code: "DOWNLOAD_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/sftp/list
 * List all files uploaded via SFTP for current user
 */
router.get("/list", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, pageSize = 20 } = req.query;

    const Record = require("../models/Record");
    const skip = (page - 1) * pageSize;

    const [records, total] = await Promise.all([
      Record.find({ userId, source: "SFTP" })
        .select("_id filename size createdAt type")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(pageSize)),
      Record.countDocuments({ userId, source: "SFTP" }),
    ]);

    res.status(200).json({
      success: true,
      data: records,
      pagination: {
        current: Number(page),
        pageSize: Number(pageSize),
        total,
        pages: Math.ceil(total / pageSize),
      },
      message: "SFTP files listed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "LIST_FAILED",
        message: error.message,
      },
    });
  }
});

module.exports = router;
