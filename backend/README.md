# Backend API - CipherVault (Secure Encryption & Data Reveal Platform)

## Overview

This is the Node.js/Express.js backend for **CipherVault** - a secure client-side encryption and controlled data reveal platform. The backend handles:

- **User Authentication**: JWT tokens with role-based access control (Admin, Analyst, Viewer)
- **Encrypted Data Management**: Secure storage and retrieval of encrypted records
- **Audit Logging**: Comprehensive compliance tracking for all data access
- **Field-Level Encryption**: AES-256-GCM encryption with PBKDF2 key derivation
- **Record Reveal API**: Controlled access to encrypted payloads with audit trails
- **Database Integration**: MongoDB with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Encryption**: OpenSSL (AES-256-GCM, PBKDF2)
- **Testing**: Jest
- **Email**: Nodemailer (optional)

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (local or cloud - Atlas, etc.)

### Installation

1. **Install dependencies**:

```bash
npm install
```

2. **Setup environment variables** (create `.env` file):

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/secure_encryption_db

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY_DERIVATION_ROUNDS=100000

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

3. **Seed initial data** (optional - creates demo users):

```bash
npm run seed
```

4. **Start development server**:

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- audit.test.js

# Generate coverage report
npm test -- --coverage
```

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── auth-service.js         # Authentication logic
│   │   ├── record-service.js       # Record CRUD operations
│   │   └── api-endpoints.test.js   # API integration tests
│   ├── crypto/
│   │   ├── aes-256-gcm.js         # AES encryption/decryption
│   │   ├── pbkdf2-keyderivation.js # Key derivation
│   │   └── aws-kms-wrapper.js     # KMS integration (optional)
│   ├── middleware/
│   │   ├── auth-middleware.js      # JWT verification
│   │   ├── authorization-middleware.js  # Role checking
│   │   └── validation-middleware.js     # Request validation
│   ├── models/
│   │   ├── User.js                 # User schema
│   │   ├── Record.js               # Encrypted record schema
│   │   └── AuditLog.js            # Audit log schema
│   ├── routes/
│   │   ├── authRoutes.js          # /auth endpoints
│   │   ├── recordRoutes.js        # /records endpoints
│   │   └── auditRoutes.js         # /audit-logs endpoints
│   ├── services/
│   │   ├── audit-service.js       # Audit logging
│   │   └── record-service.js      # Business logic
│   ├── config/
│   │   ├── env-validator.js       # Environment validation
│   │   └── index.js               # Configuration loader
│   └── server.js                  # Express app setup
├── __tests__/
│   ├── audit.test.js
│   ├── auth.test.js
│   ├── crypto.aes-256-gcm.test.js
│   ├── crypto.field-level-encryption.test.js
│   ├── e2e.test.js
│   └── integration.phase6.test.js
├── data/                          # MongoDB WiredTiger storage
├── jest.config.js                 # Test configuration
├── package.json
├── seed.js                        # Database seeding script
└── server.js                      # Entry point
```

## Key Features

### 1. **Field-Level Encryption**
- AES-256-GCM encryption for sensitive data
- PBKDF2 key derivation (100,000 iterations)
- Unique salt per record
- Authentication tag for integrity verification

### 2. **User Authentication & Authorization**
- JWT-based authentication
- Role-based access control (RBAC)
- Three roles: Admin, Analyst, Viewer
- Secure password hashing (bcrypt)

### 3. **Audit Logging**
- Comprehensive action logging (LOGIN, LOGOUT, REVEAL_RECORD, DELETE, etc.)
- IP address and User-Agent tracking
- Error tracking and compliance reporting
- Non-blocking fire-and-forget logging

### 4. **API Endpoints**

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login (returns JWT)
- `POST /auth/logout` - User logout

#### Records
- `GET /records` - List user's encrypted records
- `POST /records` - Create new encrypted record
- `POST /records/:id/reveal` - Get decryption payload
- `PUT /records/:id` - Update record
- `DELETE /records/:id` - Delete record

#### Audit Logs (Admin only)
- `GET /audit-logs` - Fetch audit logs with filtering
- `GET /audit-logs/statistics` - Compliance statistics
- `GET /audit-logs/export` - Export logs (CSV/PDF/JSON)

### 5. **Security Features**
- ✅ No passwords stored in database (only hashed)
- ✅ Client-side encryption (server never sees plaintext)
- ✅ JWT authentication with expiration
- ✅ HTTPS in production
- ✅ CORS configured
- ✅ Rate limiting on auth endpoints
- ✅ Input validation and sanitization
- ✅ Comprehensive audit trail

## Database Models

### User
```javascript
{
  email: String,
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: "admin" | "analyst" | "viewer",
  isActive: Boolean,
  createdAt: Date
}
```

### Record
```javascript
{
  userId: ObjectId,
  encryptedPayload: {
    encryptedData: Buffer,
    iv: Buffer,
    authTag: Buffer
  },
  encryption: {
    salt: Buffer,
    iterations: Number,
    algorithm: "aes-256-gcm"
  },
  metadata: {
    originalFileName: String,
    encryptedAt: Date
  },
  recordType: String,
  status: "encrypted" | "decrypted",
  createdAt: Date
}
```

### AuditLog
```javascript
{
  action: "LOGIN" | "LOGOUT" | "REVEAL" | "DELETE" | etc,
  userId: ObjectId,
  userEmail: String,
  recordId: ObjectId,
  ipAddress: String,
  userAgent: String,
  status: "SUCCESS" | "FAILED",
  errorMessage: String,
  details: Object,
  timestamp: Date
}
```

## Environment Variables

| Variable                           | Description                          | Default                                        |
| ---------------------------------- | ------------------------------------ | ---------------------------------------------- |
| `PORT`                             | Server port                          | 3001                                           |
| `NODE_ENV`                         | Environment (development/production) | development                                    |
| `MONGODB_URI`                      | MongoDB connection string            | mongodb://localhost:27017/secure_encryption_db |
| `JWT_SECRET`                       | JWT signing secret                   | (required)                                     |
| `JWT_EXPIRES_IN`                   | JWT token expiration                 | 7d                                             |
| `ENCRYPTION_KEY_DERIVATION_ROUNDS` | PBKDF2 iterations                    | 100000                                         |

## Development Workflow

### Running the Server
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Database Operations
```bash
# Seed demo data
npm run seed

# Connect to MongoDB shell
mongosh mongodb://localhost:27017/secure_encryption_db
```

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET`
- [ ] Configure `MONGODB_URI` for production database
- [ ] Enable HTTPS
- [ ] Set up environment variables securely
- [ ] Run migrations if needed
- [ ] Test audit logging
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 3001
CMD ["node", "server.js"]
```

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB is running
mongod --version

# Check connection string in .env
# Format: mongodb://[username:password@]host:port/database
```

### JWT Errors
- Ensure `JWT_SECRET` is set and consistent
- Check token expiration with `JWT_EXPIRES_IN`
- Verify token format in Authorization header

### Encryption Issues
- Ensure `ENCRYPTION_KEY_DERIVATION_ROUNDS` >= 100000
- Check salt and IV lengths (16 bytes minimum)
- Verify auth tag is included in encrypted payload

## API Documentation

Full API documentation available at `/api/docs` (Swagger/OpenAPI coming soon)

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests: `npm test`
4. Commit with clear messages
5. Push and create pull request

## Support

For issues, please check:
1. Database connection
2. Environment variables
3. Test logs: `npm test -- --verbose`
4. Server logs in terminal

## License

Proprietary - CipherVault Platform

npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Build

```bash
npm run build
```

This runs the test suite as part of the build process.

## Project Structure

```
backend/
├── src/
│   ├── server.js              # Main Express app entry point
│   ├── middleware/            # Express middleware (auth, logging, etc)
│   ├── routes/                # API route handlers
│   ├── controllers/           # Business logic
│   ├── models/                # Database models
│   ├── services/              # Service layer (encryption, KMS, etc)
│   ├── utils/                 # Utility functions
│   └── config/                # Configuration
├── __tests__/                 # Test files
├── package.json               # Dependencies and scripts
├── jest.config.js             # Jest testing configuration
├── .env.example               # Environment template
└── .gitignore                 # Git ignore rules
```

## API Endpoints

### Health Checks

- `GET /health` - Basic health check
- `GET /api/v1/health` - API health status
- `GET /api/v1` - API overview

### Authentication (Phase 2)

- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - User logout

### Records (Phase 3)

- `GET /api/v1/records` - List all records (masked)
- `GET /api/v1/records/{id}` - Get single record (masked)
- `POST /api/v1/records` - Create/upload record metadata
- `DELETE /api/v1/records/{id}` - Delete record

### Decryption & Reveal (Phase 3-4)

- `POST /api/v1/records/{id}/reveal` - Request decryption token
- `GET /api/v1/records/{id}/decrypted` - Get decrypted payload

### Audit Logs (Phase 4)

- `GET /api/v1/audit` - List audit logs
- `GET /api/v1/audit/{id}` - Get audit log detail

## Tech Stack

### Core

- **Framework**: Express.js (REST API)
- **Runtime**: Node.js
- **Language**: JavaScript (ES Modules)

### Database

- **Primary**: MongoDB + Mongoose ODM
- **Object Storage**: AWS S3 / GCP Cloud Storage

### Security

- **Encryption**: Node.js `crypto` module (AES-256-GCM)
- **Authentication**: JWT (jsonwebtoken)
- **Key Management**: AWS KMS / GCP KMS

### Logging & Monitoring

- **Structured Logging**: Winston
- **Metrics**: Prometheus (future)
- **Audit Trails**: MongoDB audit_logs collection

### Testing

- **Framework**: Jest
- **HTTP Assertions**: Supertest
- **Coverage**: jest-coverage

## Development

### Adding a New Endpoint

1. Create route handler in `src/routes/`
2. Create controller in `src/controllers/`
3. Add tests in `__tests__/` with matching structure
4. Run `npm test` to verify
5. Update API documentation

### Code Standards

- Use JavaScript (no TypeScript)
- Follow ESLint rules (TBD - add .eslintrc.js)
- Write tests alongside features (TDD)
- Add JSDoc comments for public functions
- Use async/await instead of callbacks

## Environment Variables

See `.env.example` for complete list. Key variables:

| Variable       | Purpose                | Example                  |
| -------------- | ---------------------- | ------------------------ |
| `NODE_ENV`     | Environment type       | development, production  |
| `PORT`         | Server port            | 3000                     |
| `MONGODB_URI`  | Database connection    | mongodb://localhost/db   |
| `JWT_SECRET`   | JWT signing key        | (generate random string) |
| `KMS_PROVIDER` | Key management service | aws, gcp                 |

## Troubleshooting

### Port Already in Use

```bash
# Change PORT in .env or use different port:
PORT=3001 npm run dev
```

### MongoDB Connection Failed

```bash
# Ensure MongoDB is running:
# On macOS: brew services start mongodb-community
# On Windows: mongod
# Or use MongoDB Atlas connection string in .env
```

### Tests Failing

```bash
npm test -- --verbose
# For specific test file:
npm test -- setup.test.js
```

## Contributing

When implementing new features:

1. Read related section in TODO.md
2. Check Tech Stack document for approved libraries
3. Write tests first (TDD)
4. Implement feature to pass tests
5. Update this README with new endpoints/features
6. Run `npm run test:coverage` and verify thresholds

## License

MIT

## Contact

For questions or issues, contact the technical lead.
