# CLI Encryption Tool - Secure Encryption Platform

## Overview

Command-line tool for encrypting sensitive data client-side before uploading to the Secure Encryption Platform. Supports CSV and JSON file formats with field-level encryption using AES-256-GCM.

**Features**:

- AES-256-GCM encryption with authenticated encryption
- PBKDF2 key derivation from passwords
- CSV and JSON file support
- Field-level encryption (encrypt only sensitive fields)
- SFTP upload integration
- Progress indicators
- Comprehensive error handling

## Installation

### From NPM Registry (when published)

```bash
npm install -g secure-encryption-cli
```

### Local Installation

```bash
cd cli
npm install
npm link  # Makes 'secure-encrypt' command available globally
```

### From Source

```bash
git clone <repo>
cd cli
npm install
node bin/index.js --help
```

## Quick Start

### Encrypt a CSV file

```bash
secure-encrypt encrypt \
  --file data.csv \
  --fields "ssn,pan,dob" \
  --password "your-encryption-password"
```

### Decrypt a file

```bash
secure-encrypt decrypt \
  --file data.encrypted.csv \
  --password "your-encryption-password"
```

### Upload encrypted file to SFTP

```bash
secure-encrypt upload \
  --file data.encrypted.csv \
  --sftp-host sftp.example.com \
  --sftp-user username \
  --sftp-key ~/.ssh/id_rsa
```

### Validate setup

```bash
secure-encrypt validate
```

## Commands

### encrypt

Encrypt sensitive fields in a data file

```bash
secure-encrypt encrypt [options]
```

**Options**:

- `-f, --file <path>` - Input file path (required)
- `--fields <fields>` - Comma-separated field names to encrypt (required)
- `-p, --password <password>` - Encryption password (required)
- `-a, --algorithm <algo>` - Encryption algorithm (default: aes-256-gcm)
- `-o, --output <path>` - Output file path (optional)

**Examples**:

```bash
# Encrypt CSV with output file
secure-encrypt encrypt \
  --file patients.csv \
  --fields "ssn,insurance_id" \
  --password "secure-password" \
  --output patients.encrypted.csv

# Encrypt JSON
secure-encrypt encrypt \
  --file records.json \
  --fields "patient.ssn,patient.pan" \
  --password "secure-password"
```

### decrypt

Decrypt an encrypted file

```bash
secure-encrypt decrypt [options]
```

**Options**:

- `-f, --file <path>` - Encrypted file path (required)
- `-p, --password <password>` - Decryption password (required)
- `-o, --output <path>` - Output file path (optional)

**Examples**:

```bash
# Decrypt to file
secure-encrypt decrypt \
  --file data.encrypted.csv \
  --password "secure-password" \
  --output data.decrypted.csv
```

### upload

Upload encrypted file to SFTP server

```bash
secure-encrypt upload [options]
```

**Options**:

- `-f, --file <path>` - Encrypted file to upload (required)
- `--sftp-host <host>` - SFTP server hostname (required)
- `--sftp-port <port>` - SFTP port (default: 22)
- `--sftp-user <user>` - SFTP username
- `--sftp-key <path>` - SFTP private key path
- `--remote-dir <dir>` - Remote directory (default: /uploads)

**Examples**:

```bash
# Upload with key authentication
secure-encrypt upload \
  --file data.encrypted.csv \
  --sftp-host sftp.secure-platform.com \
  --sftp-user data-uploader \
  --sftp-key ~/.ssh/platform_key \
  --remote-dir /healthcare/uploads
```

### validate

Validate encryption setup and configuration

```bash
secure-encrypt validate
```

Checks:

- Node.js crypto module availability
- Environment variables loaded
- Configuration validity

## File Formats

### CSV

Supported file format:

```csv
id,name,ssn,pan,dob
1,John Doe,123-45-6789,1234-5678-9012-3456,1980-01-15
2,Jane Smith,987-65-4321,9876-5432-1098-7654,1990-06-20
```

### JSON

Supported file format:

```json
{
  "records": [
    {
      "id": 1,
      "patient": {
        "name": "John Doe",
        "ssn": "123-45-6789",
        "pan": "1234-5678-9012-3456"
      }
    }
  ]
}
```

## Encryption Details

### Algorithm: AES-256-GCM

- **Key Length**: 256 bits (32 bytes)
- **Mode**: Galois/Counter Mode (authenticated encryption)
- **IV Length**: 12 bytes (96 bits)
- **Auth Tag Length**: 16 bytes

### Key Derivation: PBKDF2

- **Hash Algorithm**: SHA-256
- **Iterations**: 100,000 (configurable)
- **Salt Length**: 16 bytes
- **Derived Key Length**: 32 bytes (for AES-256)

### Encryption Payload Format

```json
{
  "algorithm": "aes-256-gcm",
  "version": "1.0",
  "salt": "hex-encoded-salt",
  "iv": "hex-encoded-iv",
  "ciphertext": "hex-encoded-ciphertext",
  "authTag": "hex-encoded-auth-tag",
  "timestamp": "ISO-8601-timestamp"
}
```

## Configuration

### Environment Variables

See `.env.example` for complete configuration.

**Key Variables**:
| Variable | Purpose | Default |
|----------|---------|---------|
| `ENCRYPTION_ALGORITHM` | Algorithm to use | aes-256-gcm |
| `PBKDF2_ITERATIONS` | Key derivation iterations | 100000 |
| `SFTP_HOST` | Default SFTP server | (none) |
| `API_BASE_URL` | Backend API URL | http://localhost:3000 |

### Create .env file

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Testing

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

**Coverage Requirements**: 70% across all metrics

## Project Structure

```
cli/
├── bin/
│   └── index.js          # CLI entry point (executable)
├── src/
│   └── index.js          # Main encryption module
├── __tests__/
│   └── setup.test.js     # CLI initialization tests
├── package.json          # Project metadata
├── jest.config.js        # Jest configuration
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## Security Considerations

1. **Password Handling**: Passwords are read from command line (visible in process list)
   - For production: Use environment variables or secure input prompts

2. **Key Derivation**: PBKDF2 with 100,000 iterations
   - Configurable but should never be less than 100,000

3. **File Handling**:
   - Original files remain unencrypted
   - Use `--output` to save encrypted version separately
   - Delete original files manually after verification

4. **SFTP Keys**:
   - Use SSH key authentication instead of passwords
   - Keep private keys secure (chmod 600)
   - Never commit keys to version control

5. **Logging**:
   - No passwords logged
   - File paths logged for audit trail
   - Configurable log level

## Troubleshooting

### Command not found

```bash
npm link
# or use
node bin/index.js <command>
```

### Permission denied on binary

```bash
chmod +x bin/index.js
```

### SFTP connection failed

- Verify SFTP server is running
- Check network connectivity
- Verify SSH key permissions (chmod 600)
- Confirm username and host

### Encryption key error

- Password must be string
- Salt must be 16 bytes
- IV must be 12 bytes

### File not found

- Use absolute paths or verify working directory
- Check file permissions

## Development

### Run CLI Locally

```bash
node bin/index.js encrypt --help
```

### Add New Command

1. Create command file in `src/commands/`
2. Add to `bin/index.js` with commander
3. Write tests in `__tests__/`
4. Run `npm test` to verify

### Code Standards

- Use JavaScript (no TypeScript)
- Follow TDD approach
- Minimum 70% test coverage
- Use async/await instead of callbacks
- Add JSDoc comments

## Contributing

1. Create feature branch
2. Follow TDD approach
3. Test coverage > 70%
4. Create pull request

## License

MIT

## Contact

For issues or questions, contact the technical lead.
