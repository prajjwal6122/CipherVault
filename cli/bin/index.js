#!/usr/bin/env node

/**
 * CLI Entry Point
 * Secure Encryption CLI Tool
 *
 * Usage:
 *   secure-encrypt encrypt --file <path> --fields <fields> --password <password>
 *   secure-encrypt decrypt --file <path> --password <password>
 *   secure-encrypt upload --file <path> --sftp-host <host>
 */

const { program } = require("commander");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const pkg = require("../package.json");

// Create CLI program
program
  .name("secure-encrypt")
  .description("Client-side encryption CLI tool for sensitive data")
  .version(pkg.version);

// Encrypt command
program
  .command("encrypt")
  .description("Encrypt sensitive fields in CSV or JSON file")
  .option("-f, --file <path>", "Input file path (CSV or JSON)")
  .option("--fields <fields>", "Comma-separated field names to encrypt")
  .option("-p, --password <password>", "Encryption password")
  .option("-a, --algorithm <algo>", "Encryption algorithm", "aes-256-gcm")
  .option("-o, --output <path>", "Output file path (optional)")
  .action((options) => {
    // Implementation will follow in subsequent phases
  });

// Decrypt command
program
  .command("decrypt")
  .description("Decrypt an encrypted file")
  .option("-f, --file <path>", "Encrypted file path")
  .option("-p, --password <password>", "Decryption password")
  .option("-o, --output <path>", "Output file path (optional)")
  .action((options) => {
    // Implementation will follow in subsequent phases
  });

// Upload command
program
  .command("upload")
  .description("Upload encrypted file to SFTP server")
  .option("-f, --file <path>", "Encrypted file to upload")
  .option("--sftp-host <host>", "SFTP server hostname")
  .option("--sftp-port <port>", "SFTP server port", "22")
  .option("--sftp-user <user>", "SFTP username")
  .option("--sftp-key <path>", "SFTP private key path")
  .option("--remote-dir <dir>", "Remote directory path", "/uploads")
  .action((options) => {
    // Implementation will follow in subsequent phases
  });

// Validate command
program
  .command("validate")
  .description("Validate encryption setup and configuration")
  .action(() => {
    // Implementation will follow in subsequent phases
  });

// Help command
program
  .command("help")
  .description("Show help information")
  .action(() => {
    program.help();
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (process.argv.length < 3) {
  program.help();
}

module.exports = program;
