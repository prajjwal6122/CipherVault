# CipherVault Deployment Guide

## Overview

This guide covers deploying the CipherVault Secure Data Platform using Docker Compose for containerized deployment.

## Prerequisites

### Required Software

- Docker Desktop 4.0+ (Windows/Mac) or Docker Engine 20.0+ (Linux)
- Docker Compose 2.0+
- PowerShell 5.1+ (Windows) or Bash (Linux/Mac)

### System Requirements

- CPU: 4+ cores recommended
- RAM: 8GB minimum, 16GB recommended
- Storage: 20GB free space
- Network: Ports 3000, 3001, 27017, 6379 available

## Deployment Methods

### Method 1: Quick Deploy (Recommended)

```powershell
# Run automated deployment script
.\deploy.ps1
```

This will:

1. Check prerequisites
2. Run tests
3. Build Docker images
4. Deploy all services
5. Verify deployment

### Method 2: Manual Deploy

```powershell
# Step 1: Configure environment
Copy-Item .env.production .env

# Step 2: Build images
docker-compose build

# Step 3: Start services
docker-compose up -d

# Step 4: Check status
docker-compose ps
docker-compose logs -f
```

### Method 3: Development Deploy (Skip Tests)

```powershell
.\deploy.ps1 -SkipTests
```

### Method 4: Clean Deploy (Fresh Start)

```powershell
.\deploy.ps1 -Clean
```

## Deployment Options

### Available Flags

| Flag                 | Description                               |
| -------------------- | ----------------------------------------- |
| `-Environment <env>` | Specify environment (default: production) |
| `-SkipTests`         | Skip pre-deployment tests                 |
| `-Clean`             | Remove old containers and volumes         |
| `-BuildOnly`         | Build images without deploying            |

### Examples

```powershell
# Production deployment with tests
.\deploy.ps1

# Development deployment
.\deploy.ps1 -Environment development -SkipTests

# Fresh production deployment
.\deploy.ps1 -Clean

# Build only (no deployment)
.\deploy.ps1 -BuildOnly
```

## Configuration

### Environment Variables

Edit `.env.production` before deployment:

```bash
# Security (CHANGE IN PRODUCTION!)
JWT_SECRET=your-ultra-secure-jwt-secret
MONGODB_PASSWORD=your-strong-mongodb-password

# AWS KMS (Optional)
AWS_REGION=us-east-1
AWS_KMS_KEY_ID=your-kms-key-id
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# GCP KMS (Optional)
GCP_PROJECT_ID=your-project-id
GCP_KMS_KEY_RING=your-keyring
GCP_KMS_KEY_NAME=your-key-name
```

### Ports Configuration

| Service  | Internal Port | External Port | Description      |
| -------- | ------------- | ------------- | ---------------- |
| Frontend | 3001          | 3001          | Web UI           |
| Backend  | 3000          | 3000          | REST API         |
| MongoDB  | 27017         | 27017         | Database         |
| Redis    | 6379          | 6379          | Cache (optional) |

To change external ports, edit `docker-compose.yml`:

```yaml
ports:
  - "8080:3001" # Frontend on port 8080
```

## Post-Deployment

### Access the Application

- **Frontend UI**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/api/v1/health

### Default Credentials

```
Admin User:
  Email: admin@example.com
  Password: password123

Analyst User:
  Email: analyst@example.com
  Password: password123
```

⚠️ **IMPORTANT**: Change these passwords immediately in production!

### Verify Deployment

```powershell
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test backend health
Invoke-RestMethod http://localhost:3000/api/v1/health

# Test frontend
Start-Process "http://localhost:3001"
```

## Management Commands

### View Logs

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Restart Services

```powershell
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Services

```powershell
# Stop (data preserved)
docker-compose stop

# Stop and remove containers (data preserved in volumes)
docker-compose down

# Stop and remove everything including volumes (⚠️ DATA LOSS)
docker-compose down -v
```

### Update Deployment

```powershell
# Pull latest code
git pull

# Rebuild and redeploy
docker-compose build
docker-compose up -d
```

### Scale Services

```powershell
# Scale backend to 3 instances
docker-compose up -d --scale backend=3
```

## Database Management

### Backup MongoDB

```powershell
# Create backup
docker exec secure-data-mongodb mongodump --uri="mongodb://root:SecurePass2026!Production@localhost:27017/secure_data_db?authSource=admin" --out=/data/backup

# Copy backup to host
docker cp secure-data-mongodb:/data/backup ./backup-$(Get-Date -Format 'yyyyMMdd')
```

### Restore MongoDB

```powershell
# Copy backup to container
docker cp ./backup secure-data-mongodb:/data/restore

# Restore
docker exec secure-data-mongodb mongorestore --uri="mongodb://root:SecurePass2026!Production@localhost:27017/secure_data_db?authSource=admin" /data/restore
```

### Access MongoDB Shell

```powershell
docker exec -it secure-data-mongodb mongosh -u root -p SecurePass2026!Production --authenticationDatabase admin
```

## Monitoring

### Container Resource Usage

```powershell
docker stats
```

### Service Health

```powershell
# Check health status
docker inspect --format='{{.State.Health.Status}}' secure-data-backend
docker inspect --format='{{.State.Health.Status}}' secure-data-frontend
docker inspect --format='{{.State.Health.Status}}' secure-data-mongodb
```

### Disk Usage

```powershell
# Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Troubleshooting

### Service Won't Start

```powershell
# Check logs
docker-compose logs [service-name]

# Check container status
docker ps -a

# Restart service
docker-compose restart [service-name]
```

### Port Already in Use

```powershell
# Find process using port
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess

# Kill process or change port in docker-compose.yml
```

### Database Connection Failed

```powershell
# Check MongoDB is running
docker exec secure-data-mongodb mongosh --eval "db.adminCommand('ping')"

# Check connection string in backend logs
docker-compose logs backend | Select-String "MongoDB"
```

### Frontend Can't Reach Backend

1. Check CORS configuration in backend
2. Verify `REACT_APP_API_URL` in `.env.production`
3. Check network connectivity:
   ```powershell
   docker exec secure-data-frontend wget -O- http://backend:3000/api/v1/health
   ```

### Out of Memory

```powershell
# Increase Docker memory in Docker Desktop settings
# Or add memory limits to docker-compose.yml:

services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
```

## Security Best Practices

### Production Checklist

- [ ] Change default JWT_SECRET
- [ ] Change default MONGODB_PASSWORD
- [ ] Change default user passwords
- [ ] Configure HTTPS (use reverse proxy like Nginx)
- [ ] Enable firewall rules
- [ ] Set up backup automation
- [ ] Configure log rotation
- [ ] Enable audit logging
- [ ] Set up monitoring/alerts
- [ ] Review and restrict exposed ports

### SSL/TLS Setup

Use a reverse proxy like Nginx or Traefik:

```yaml
# docker-compose.yml addition
services:
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./ssl:/etc/nginx/ssl
      - ./nginx-proxy.conf:/etc/nginx/nginx.conf
```

## Performance Optimization

### Enable Redis Caching

Redis is included in docker-compose.yml. Configure backend to use it:

```javascript
// backend/src/config/redis.js
const redis = require("redis");
const client = redis.createClient({
  url: "redis://redis:6379",
});
```

### Database Indexing

```javascript
// Add indexes in MongoDB
db.records.createIndex({ patientName: 1 });
db.records.createIndex({ createdAt: -1 });
db.users.createIndex({ email: 1 }, { unique: true });
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        run: |
          docker-compose build
          docker-compose up -d
```

## Support

For issues or questions:

- Check logs: `docker-compose logs`
- Review documentation: `README.md`
- Check health endpoints
- Review test results in `TEST_EXECUTION_REPORT.md`

## Rollback Procedure

If deployment fails:

```powershell
# Stop new deployment
docker-compose down

# Restore from backup
docker-compose down -v
docker volume create mongodb_data
# Restore MongoDB backup (see Database Management section)

# Start previous version
git checkout [previous-commit]
docker-compose up -d
```
