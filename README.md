# CipherVault - Secure Data Platform

A full-stack application for managing sensitive data with end-to-end encryption, audit logging, and compliance controls.

## Features

- **End-to-End Encryption** – AES-256-GCM encryption with PBKDF2 key derivation
- **AWS KMS Integration** – Secure key management and rotation
- **Field-Level Encryption** – Encrypt specific data fields independently
- **JWT Authentication** – Secure token-based authentication
- **Audit Logging** – Complete audit trail of all data access
- **Client-Side Encryption** – Encrypt data before it leaves the browser
- **SFTP Support** – Secure file transfer protocol integration

## Application Workflow

### 1. User Authentication
```
User Login → JWT Token Generated → Stored in Browser → Sent with Requests
```
- User enters credentials on login page
- Backend validates credentials against MongoDB
- Access token & refresh token issued
- Frontend securely stores tokens in localStorage
- All subsequent API requests include JWT token

### 2. Data Upload
```
User Selects File → Client-Side Validation → Encryption → Upload → Backend Verification
```
- User uploads CSV/JSON/XLSX/TXT file (max 100MB)
- File validated on frontend (size, type, format)
- Sensitive fields identified and encrypted using AES-256-GCM
- Encrypted data sent to backend with authentication token

### 3. Encryption Process
```
Raw Data → Derive Key (PBKDF2) → Generate IV → Encrypt (AES-256-GCM) → Store Ciphertext + Tag
```
- Backend receives encrypted data from frontend
- Master key retrieved from AWS KMS
- Encryption key derived using PBKDF2 with salt
- Initialization Vector (IV) generated for each record
- Data encrypted with AES-256-GCM algorithm
- Authentication tag appended to ensure data integrity
- Encrypted record stored in MongoDB

### 4. Key Management
```
Master Key → AWS KMS → Key Encryption → Secure Storage → Key Rotation
```
- Master keys stored securely in AWS KMS
- Automatic key rotation enabled for compliance
- Keys never transmitted in plaintext
- Audit log of all key access and rotations
- Different keys for different encryption levels

### 5. Data Retrieval
```
User Request → Authentication Check → Authorization Verify → Decrypt Data → Audit Log → Display
```
- User requests specific records through frontend
- Backend verifies JWT authentication token
- Authorization checked against access control lists
- Data decrypted on-demand using appropriate key
- Access event logged with timestamp and user info
- Decrypted data sent to frontend
- Frontend displays data in user session

### 6. Audit & Compliance
```
Every Action Logged → Timestamp + User + Action + Status → MongoDB → Reports Generated
```
- Every data access event logged
- All encryption/decryption operations tracked
- User actions recorded with IP address and timestamp
- Compliance reports generated for auditing
- Data retention policies enforced
- GDPR/regulatory compliance maintained

## Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB (NoSQL database)
- AWS KMS (Key Management Service)
- Jest (testing framework)
- SFTP support for secure file transfers

**Frontend:**
- React 18+ (UI framework)
- Vite (build tool)
- Tailwind CSS (styling)
- Client-side crypto utilities
- Jest (testing framework)

**DevOps:**
- Docker containerization
- Kubernetes orchestration
- MongoDB persistence layer
- Render deployment platform

## Quick Start

### Prerequisites
- Node.js 16 or higher
- npm or yarn package manager
- MongoDB (local or Atlas)
- AWS account with KMS access
- Git for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/prajjwal6122/CipherVault.git
cd CipherVault

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start

# Frontend setup (in new terminal)
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

Access the application at `http://localhost:5173`

### Environment Variables

**Backend (.env)**
```
# Database
MONGODB_URI=mongodb://localhost:27017/ciphervault
MONGODB_USER=admin
MONGODB_PASSWORD=password

# AWS KMS
AWS_KMS_KEY_ID=your-kms-key-id
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Server
PORT=3000
NODE_ENV=development

# SFTP
SFTP_HOST=sftp.example.com
SFTP_PORT=22
SFTP_USER=sftp-user
SFTP_PASSWORD=sftp-password
```

**Frontend (.env)**
```
VITE_API_URL=http://localhost:3000
VITE_APP_TITLE=CipherVault - Secure Data Platform
VITE_API_TIMEOUT=30000
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_ANALYTICS=false
VITE_ENCRYPTION_ALGORITHM=aes-256-gcm
VITE_MAX_FILE_SIZE=104857600
VITE_ALLOWED_FILE_TYPES=csv,json,xlsx,txt
VITE_THEME=light
VITE_ITEMS_PER_PAGE=20
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Watch mode for development
npm test -- --watch

# Specific test file
npm test -- auth.test.js

# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## API Endpoints

### Authentication
| Method | Endpoint             | Description          |
| ------ | -------------------- | -------------------- |
| POST   | `/api/auth/register` | Register new user    |
| POST   | `/api/auth/login`    | User login           |
| POST   | `/api/auth/refresh`  | Refresh access token |
| POST   | `/api/auth/logout`   | User logout          |

### Records
| Method | Endpoint           | Description                     |
| ------ | ------------------ | ------------------------------- |
| GET    | `/api/records`     | List all records                |
| GET    | `/api/records/:id` | Get specific record (decrypted) |
| POST   | `/api/records`     | Create new encrypted record     |
| PUT    | `/api/records/:id` | Update record                   |
| DELETE | `/api/records/:id` | Delete record                   |

### Audit & Compliance
| Method | Endpoint                  | Description                |
| ------ | ------------------------- | -------------------------- |
| GET    | `/api/audit-logs`         | View audit trail           |
| GET    | `/api/audit-logs/:id`     | Get specific audit log     |
| GET    | `/api/compliance/reports` | Generate compliance report |

### File Operations
| Method | Endpoint            | Description             |
| ------ | ------------------- | ----------------------- |
| POST   | `/api/files/upload` | Upload and encrypt file |
| GET    | `/api/files/:id`    | Download decrypted file |
| DELETE | `/api/files/:id`    | Delete file             |

## Project Structure

```
CipherVault/
├── backend/
│   ├── src/
│   │   ├── api/              # API endpoints & services
│   │   ├── crypto/           # Encryption utilities
│   │   ├── models/           # MongoDB schemas
│   │   ├── middleware/       # Express middleware
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── config/           # Configuration files
│   │   └── server.js         # Main server file
│   ├── __tests__/            # Test files
│   ├── jest.config.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── api/              # API client
│   │   ├── crypto/           # Client-side encryption
│   │   ├── utils/            # Utility functions
│   │   ├── config/           # Configuration
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── __tests__/            # Test files
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── k8s/                      # Kubernetes configurations
├── cli/                      # Command-line interface
├── sample-data/              # Sample CSV files for testing
│
├── DEPLOYMENT_PREP_CHECKLIST.md
├── PRODUCTION_RUNBOOK.md
├── RENDER_DEPLOY.md
├── technical_design_secure_encryption_reveal_system.md
└── README.md
```

## Deployment

### Docker Deployment
```bash
# Build backend image
cd backend
docker build -t ciphervault-backend .

# Build frontend image
cd ../frontend
docker build -t ciphervault-frontend .

# Run with docker-compose
docker-compose up
```

### Kubernetes Deployment
```bash
cd k8s
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

### Render Deployment
See [RENDER_DEPLOY.md](./RENDER_DEPLOY.md) for detailed instructions.

## Documentation

- [Technical Design](./technical_design_secure_encryption_reveal_system.md) - System architecture and encryption details
- [Deployment Guide](./RENDER_DEPLOY.md) - Step-by-step deployment instructions
- [Production Runbook](./PRODUCTION_RUNBOOK.md) - Production operations guide
- [Deployment Checklist](./DEPLOYMENT_PREP_CHECKLIST.md) - Pre-deployment verification
- [Secure Client-Side Encryption PRD](./prd_secure_client_side_encryption_controlled_data_reveal.md)

## Security Best Practices

- Always use HTTPS in production
- Store AWS credentials in secure credential manager
- Rotate encryption keys regularly
- Keep dependencies updated
- Use environment variables for sensitive data
- Enable audit logging in production
- Implement rate limiting on APIs
- Use CSRF protection tokens
- Validate all user inputs

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh

# Verify connection string in .env
MONGODB_URI=mongodb://localhost:27017/ciphervault
```

### AWS KMS Access Denied
```bash
# Verify AWS credentials
aws configure

# Check IAM permissions for KMS
aws kms describe-key --key-id your-key-id
```

### Port Already in Use
```bash
# Backend (port 3000)
lsof -i :3000
kill -9 <PID>

# Frontend (port 5173)
lsof -i :5173
```

## Support & Contributing

For issues and feature requests, please open an issue on GitHub.

## License

[MIT License](./LICENSE)

---

**Repository:** [prajjwal6122/CipherVault](https://github.com/prajjwal6122/CipherVault)

**Created:** January 2026

**Last Updated:** January 27, 2026
