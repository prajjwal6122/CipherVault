# Backend API - Secure Encryption & Data Reveal Platform

## Overview

This is the Node.js/Express.js backend for the Secure Client-Side Encryption & Controlled Data Reveal Platform. The backend handles:

- User authentication and authorization (JWT + RBAC)
- Encrypted data storage and retrieval
- Audit logging for compliance
- Decryption token management
- Secure API endpoints

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (for data persistence)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Setup environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run development server:

```bash
npm run dev
```

The server will start on `http://localhost:3000` by default.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
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
