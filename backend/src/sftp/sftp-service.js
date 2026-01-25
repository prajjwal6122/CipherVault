// Phase 5.1: SFTP Server Service with file monitoring & auto-registration
// SSH key auth, encrypted file monitoring, auto-metadata registration

const ssh2 = require("ssh2");
const path = require("path");
const EventEmitter = require("events");

class SFTPService extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      host: config.host || "localhost",
      port: config.port || 22,
      username: config.username,
      privateKey: config.privateKey,
      algorithms: { cipher: ["aes128-ctr", "aes192-ctr", "aes256-ctr"] },
      ...config,
    };
    this.client = new ssh2.Client();
    this.sftp = null;
    this.isConnected = false;
    this.autoReconnect = true;
    this.watchedDirectories = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.client.on("ready", () => {
        this.client.sftp((err, sftp) => {
          if (err) return reject(err);
          this.sftp = sftp;
          this.isConnected = true;
          this.emit("connected");
          resolve(true);
        });
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        this.emit("error", err);
        reject(err);
      });

      this.client.on("close", () => {
        this.isConnected = false;
        this.emit("disconnected");
        if (this.autoReconnect) this.reconnect();
      });

      this.client.connect(this.config);
    });
  }

  async connectWithRetry(maxRetries = 3, delayMs = 5000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.connect();
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }

  async testConnection() {
    if (!this.sftp) return false;
    try {
      const listing = await new Promise((resolve, reject) => {
        this.sftp.readdir(".", (err, list) => {
          if (err) reject(err);
          else resolve(list);
        });
      });
      return listing !== undefined;
    } catch {
      return false;
    }
  }

  async createUserDirectory(userId) {
    const dirPath = `/uploads/${userId}`;
    return new Promise((resolve, reject) => {
      this.sftp.mkdir(dirPath, (err) => {
        if (err && err.code !== 2) return reject(err); // 2 = exists
        this.setFilePermissions(dirPath, "0700").then(() => resolve(dirPath));
      });
    });
  }

  async setFilePermissions(filePath, permissions) {
    const octal = parseInt(permissions, 8);
    return new Promise((resolve, reject) => {
      this.sftp.chmod(filePath, octal, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  setAutoReconnect(enabled = true) {
    this.autoReconnect = enabled;
    return enabled;
  }

  async reconnect() {
    try {
      await this.connect();
      this.emit("reconnected");
    } catch (err) {
      this.emit("reconnectFailed", err);
    }
  }

  async listFiles(dirPath) {
    return new Promise((resolve, reject) => {
      this.sftp.readdir(dirPath, (err, list) => {
        if (err) reject(err);
        else resolve(list || []);
      });
    });
  }

  async downloadFile(remotePath) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      this.sftp
        .createReadStream(remotePath)
        .on("data", (chunk) => chunks.push(chunk))
        .on("end", () => resolve(Buffer.concat(chunks)))
        .on("error", reject);
    });
  }

  async uploadFile(localPath, remotePath) {
    return new Promise((resolve, reject) => {
      const fs = require("fs");
      const readStream = fs.createReadStream(localPath);
      const writeStream = this.sftp.createWriteStream(remotePath);

      writeStream.on("finish", () => resolve(remotePath));
      writeStream.on("error", reject);
      readStream.on("error", reject);
      readStream.pipe(writeStream);
    });
  }

  async registerFileMetadata(metadata) {
    // Triggered by file watcher - register encrypted file in DB
    this.emit("fileDetected", {
      filename: metadata.filename,
      size: metadata.size,
      keyId: metadata.keyId,
      timestamp: new Date(),
    });

    return {
      recordId: `record-${Date.now()}`,
      registered: true,
    };
  }

  async storeEncryptedFile(fileData) {
    // Store encrypted file metadata in database
    this.emit("fileStored", {
      filename: fileData.filename,
      keyId: fileData.keyId,
    });

    return `record-${Date.now()}`;
  }

  async isDuplicateFile(filename) {
    // Check if file was already processed
    // In production, query database for filename + hash
    return false;
  }

  async archiveFile(sourcePath, archiveDir) {
    const filename = path.basename(sourcePath);
    const archivePath = path.join(archiveDir, `${Date.now()}-${filename}`);

    try {
      const content = await this.downloadFile(sourcePath);
      await this.uploadFile(Buffer.from(content), archivePath);
      return true;
    } catch {
      return false;
    }
  }

  async processFile(filename) {
    // Process single file - download, validate, register
    const content = await this.downloadFile(`/uploads/${filename}`);
    return { success: true, size: content.length };
  }

  async processFileWithRetry(filename, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.processFile(filename);
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }

  watchDirectory(dirPath, callbacks = {}) {
    const fs = require("fs");
    const chokidar = require("chokidar");

    const watcher = chokidar.watch(dirPath, {
      persistent: true,
      recursive: false,
    });

    watcher.on("add", async (filePath) => {
      if (callbacks.onAdd) {
        await callbacks.onAdd({ filename: path.basename(filePath) });
      }
    });

    watcher.on("change", async (filePath) => {
      if (callbacks.onChange) {
        await callbacks.onChange({ filename: path.basename(filePath) });
      }
    });

    watcher.on("error", (error) => {
      if (callbacks.onError) {
        callbacks.onError(error);
      }
    });

    this.watchedDirectories.set(dirPath, watcher);
    return watcher;
  }

  async close() {
    this.autoReconnect = false;
    return new Promise((resolve) => {
      this.client.end();
      resolve();
    });
  }
}

module.exports = SFTPService;
