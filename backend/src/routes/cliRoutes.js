/**
 * CLI Tool Routes - Phase 4.6
 * Provides API endpoints for command-line bulk operations
 */

const express = require("express");
const { authenticateToken } = require("../middleware/auth-middleware");
const CLIService = require("../services/cli-service");

const router = express.Router();
const cliService = new CLIService();

/**
 * POST /api/v1/cli/execute
 * Execute CLI command for bulk operations
 */
router.post("/execute", authenticateToken, async (req, res, next) => {
  try {
    const { command, args = {}, options = {} } = req.body;
    const userId = req.user._id;
    const ipAddress = req.ip;

    // Validate command
    const validCommands = [
      "encrypt-bulk",
      "decrypt-reveal",
      "export-csv",
      "export-json",
      "audit-report",
      "key-rotate",
      "statistics",
    ];

    if (!command || !validCommands.includes(command)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_COMMAND",
          message: `Invalid command. Valid commands: ${validCommands.join(", ")}`,
        },
      });
    }

    // Execute command
    const result = await cliService.executeCommand({
      command,
      args,
      options,
      userId,
      ipAddress,
    });

    // Log CLI execution
    const AuditService = require("../services/audit-service");
    await AuditService.logAction({
      action: "CLI_EXECUTE",
      userId,
      ipAddress,
      details: { command, args },
      status: "SUCCESS",
    });

    res.status(200).json({
      success: true,
      data: result,
      message: `Command '${command}' executed successfully`,
    });
  } catch (error) {
    const AuditService = require("../services/audit-service");
    await AuditService.logAction({
      action: "CLI_EXECUTE",
      userId: req.user._id,
      ipAddress: req.ip,
      status: "FAILED",
      reason: error.message,
    });

    res.status(500).json({
      success: false,
      error: {
        code: "COMMAND_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/cli/commands
 * List available CLI commands
 */
router.get("/commands", authenticateToken, async (req, res, next) => {
  try {
    const commands = {
      "encrypt-bulk": {
        description: "Encrypt multiple files in bulk",
        usage: "cli execute --command encrypt-bulk --input-file data.csv",
        args: {
          inputFile: "Path to CSV file with data to encrypt",
          recordType: "Type of records (PAN, SSN, PHONE, EMAIL, OTHER)",
        },
      },
      "decrypt-reveal": {
        description: "Request decryption and reveal sensitive data",
        usage: "cli execute --command decrypt-reveal --record-ids id1,id2,id3",
        args: {
          recordIds: "Comma-separated list of record IDs",
          outputFormat: "Format for output (json, csv)",
        },
      },
      "export-csv": {
        description: "Export records to CSV format (masked)",
        usage: "cli execute --command export-csv --filters type:PAN",
        args: {
          filters: "Filter records by type and tags",
          outputFile: "Output file path",
        },
      },
      "export-json": {
        description: "Export records to JSON format (masked)",
        usage: "cli execute --command export-json --limit 1000",
        args: {
          limit: "Maximum number of records to export",
          outputFile: "Output file path",
        },
      },
      "audit-report": {
        description: "Generate audit compliance report",
        usage: "cli execute --command audit-report --period month",
        args: {
          period: "Time period (day, week, month, year)",
          outputFormat: "Format for report (pdf, html, csv)",
        },
      },
      "key-rotate": {
        description: "Rotate encryption keys (secure operation)",
        usage: "cli execute --command key-rotate",
        args: {
          keyId: "Specific key ID to rotate (optional)",
          newKeyId: "New key ID to use",
        },
      },
      statistics: {
        description: "Get encryption statistics and metrics",
        usage: "cli execute --command statistics --period month",
        args: {
          period: "Time period for statistics (day, week, month, year)",
        },
      },
    };

    res.status(200).json({
      success: true,
      data: commands,
      count: Object.keys(commands).length,
      message: "CLI commands listed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "COMMAND_LIST_FAILED",
        message: error.message,
      },
    });
  }
});

/**
 * POST /api/v1/cli/validate
 * Validate CLI command before execution
 */
router.post("/validate", authenticateToken, async (req, res, next) => {
  try {
    const { command, args = {} } = req.body;

    const validation = await cliService.validateCommand(command, args);

    res.status(200).json({
      success: validation.valid,
      data: {
        valid: validation.valid,
        errors: validation.errors || [],
        warnings: validation.warnings || [],
      },
      message: validation.valid
        ? "Command is valid"
        : "Command validation failed",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: error.message,
      },
    });
  }
});

module.exports = router;
