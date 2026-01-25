/**
 * SFTP Service - Phase 4.6
 * Handles SFTP file upload and encryption
 */

class SFTPService {
  constructor() {
    this.fileStorage = new Map();
  }

  /**
   * Encrypt and store file
   */
  async encryptAndStore({
    userId,
    filename,
    fileContent,
    recordType,
    tags,
    ipAddress,
  }) {
    try {
      const Record = require("../models/Record");
      const CryptoService = require("./encryption-service");

      // Encrypt file content
      const encryptedContent = await CryptoService.encryptData(fileContent);

      // Create record
      const record = new Record({
        userId,
        filename,
        encryptedPayload: encryptedContent,
        type: recordType,
        tags,
        source: "SFTP",
        ipAddress,
      });

      await record.save();
      return record;
    } catch (error) {
      throw new Error(`SFTP encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt file for download
   */
  async decryptFile(record) {
    try {
      const CryptoService = require("./encryption-service");
      const decrypted = await CryptoService.decryptData(
        record.encryptedPayload,
      );
      return decrypted;
    } catch (error) {
      throw new Error(`SFTP decryption failed: ${error.message}`);
    }
  }
}

module.exports = SFTPService;
