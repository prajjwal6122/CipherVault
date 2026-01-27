# CipherVault Production Runbook

**Version**: 1.0.0  
**Last Updated**: January 27, 2026  
**Maintained By**: DevOps Team

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Common Operations](#common-operations)
4. [Troubleshooting](#troubleshooting)
5. [Incident Response](#incident-response)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Emergency Contacts](#emergency-contacts)

---

## System Overview

### Application Details

- **Name**: CipherVault Secure Data Platform
- **Version**: 1.0.0
- **Environment**: Production
- **Deployment**: Docker Compose
- **Location**: On-premise / Cloud

### Components

| Component | Technology           | Port  | Purpose             |
| --------- | -------------------- | ----- | ------------------- |
| Frontend  | React 18 + Vite      | 3001  | Web UI              |
| Backend   | Node.js 20 + Express | 3000  | REST API            |
| Database  | MongoDB 7.0          | 27017 | Data persistence    |
| Cache     | Redis 7              | 6379  | Session/query cache |

### Key Features

- AES-256-GCM field-level encryption
- JWT authentication
- RBAC authorization (Admin/Analyst)
- Audit logging
- Data masking
- Controlled reveal mechanism

---

## Architecture

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Future)      │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
       ┌────────▼─────────┐      ┌───────▼────────┐
       │    Frontend      │      │    Backend     │
       │  Nginx (3001)    │◄─────┤ Express (3000) │
       │  React + Vite    │      │   Node.js      │
       └──────────────────┘      └────────┬───────┘
                                          │
                             ┌────────────┼────────────┐
                             │            │            │
                    ┌────────▼──────┐ ┌──▼─────┐ ┌────▼────┐
                    │   MongoDB     │ │ Redis  │ │   KMS   │
                    │  (Port 27017) │ │ (6379) │ │ (Cloud) │
                    └───────────────┘ └────────┘ └─────────┘
```

---

## Common Operations

### 1. Start Application

```powershell
# Navigate to project directory
cd "e:\FRONT END\Secured-Data-App"

# Start all services
docker-compose up -d

# Verify all containers are running
docker-compose ps

# Check logs
docker-compose logs -f
```

**Expected Output**: All containers in "Up" state with health checks passing

### 2. Stop Application

```powershell
# Stop all services (data preserved)
docker-compose stop

# Or stop and remove containers
docker-compose down

# To also remove volumes (⚠️ DATA LOSS)
docker-compose down -v
```

### 3. Restart Services

```powershell
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
docker-compose restart mongodb
```

### 4. View Logs

```powershell
# All services (follow mode)
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Filter for errors
docker logs secure-data-backend 2>&1 | Select-String "ERROR"
```

### 5. Check Health Status

```powershell
# Backend health
Invoke-RestMethod http://localhost:3000/api/v1/health

# Frontend health
Invoke-WebRequest http://localhost:3001

# Database health
docker exec secure-data-mongodb mongosh --eval "db.adminCommand('ping')"

# All containers
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### 6. Access Database

```powershell
# MongoDB shell
docker exec -it secure-data-mongodb mongosh -u root -p SecurePass2026!Production --authenticationDatabase admin

# Switch to application database
use secure_data_db

# Common queries
db.users.find().pretty()
db.records.count()
db.audit_logs.find().sort({timestamp:-1}).limit(10)
```

### 7. Run Backup

```powershell
# Manual backup
.\backup-production.ps1

# Backup without compression
.\backup-production.ps1 -Compress:$false

# Backup with custom retention
.\backup-production.ps1 -RetentionDays 60
```

### 8. Monitor System

```powershell
# One-time health check
.\monitor-production.ps1

# Continuous monitoring (every 60 seconds)
.\monitor-production.ps1 -Continuous -IntervalSeconds 60

# Resource usage
docker stats
```

### 9. Verify Production Readiness

```powershell
# Run full verification
.\verify-production.ps1

# Save detailed report
.\verify-production.ps1 -SaveReport -Detailed
```

### 10. Update Application

```powershell
# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Deploy updates (zero-downtime approach)
docker-compose up -d --no-deps --build backend
docker-compose up -d --no-deps --build frontend

# Verify deployment
.\verify-production.ps1
```

---

## Troubleshooting

### Issue 1: Backend Not Responding

**Symptoms**:

- Health endpoint returns 500/502
- Frontend cannot connect to API
- Timeout errors

**Diagnosis**:

```powershell
# Check if container is running
docker ps | Select-String "backend"

# Check logs for errors
docker logs --tail=50 secure-data-backend

# Check MongoDB connection
docker exec secure-data-mongodb mongosh --eval "db.adminCommand('ping')"
```

**Solution**:

```powershell
# Step 1: Restart backend
docker-compose restart backend

# Step 2: If still failing, check environment variables
docker exec secure-data-backend env | Select-String "MONGODB|JWT"

# Step 3: Verify database connectivity
docker exec secure-data-backend node -e "require('mongoose').connect(process.env.MONGODB_URI)"

# Step 4: Full restart if needed
docker-compose down
docker-compose up -d
```

### Issue 2: Database Connection Failed

**Symptoms**:

- Backend logs show "MongoNetworkError"
- Cannot connect to MongoDB
- Authentication failures

**Diagnosis**:

```powershell
# Check if MongoDB is running
docker ps | Select-String "mongodb"

# Check MongoDB logs
docker logs secure-data-mongodb | Select-String "error|failed"

# Test connection manually
docker exec secure-data-mongodb mongosh --eval "db.version()"
```

**Solution**:

```powershell
# Step 1: Restart MongoDB
docker-compose restart mongodb

# Step 2: Verify credentials
# Check .env.production for correct MONGODB_PASSWORD

# Step 3: Verify connection string
# Should be: mongodb://root:PASSWORD@mongodb:27017/secure_data_db?authSource=admin

# Step 4: Restore from backup if data corruption
.\restore-backup.ps1 -BackupFile "backup-YYYYMMDD.zip"
```

### Issue 3: Frontend Shows Blank Page

**Symptoms**:

- White screen on http://localhost:3001
- Console errors in browser
- 404 errors for assets

**Diagnosis**:

```powershell
# Check if frontend is running
docker ps | Select-String "frontend"

# Check nginx logs
docker logs secure-data-frontend

# Test frontend directly
Invoke-WebRequest http://localhost:3001
```

**Solution**:

```powershell
# Step 1: Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend

# Step 2: Check nginx configuration
docker exec secure-data-frontend cat /etc/nginx/nginx.conf

# Step 3: Verify assets are present
docker exec secure-data-frontend ls -la /usr/share/nginx/html

# Step 4: Check browser console for errors
# Open DevTools (F12) and check Console tab
```

### Issue 4: High CPU Usage

**Symptoms**:

- CPU > 80%
- Slow response times
- Server feels sluggish

**Diagnosis**:

```powershell
# Check resource usage
docker stats

# Identify which container
docker stats --no-stream | Sort-Object -Property CPUPerc -Descending
```

**Solution**:

```powershell
# Step 1: Check for infinite loops or memory leaks
docker logs secure-data-backend | Select-String "memory|heap"

# Step 2: Restart high-usage container
docker-compose restart backend

# Step 3: Scale horizontally (if supported)
docker-compose up -d --scale backend=2

# Step 4: Optimize queries (check slow queries)
docker exec secure-data-mongodb mongosh --eval "db.currentOp()"
```

### Issue 5: Disk Space Full

**Symptoms**:

- Write operations failing
- Database errors
- Container cannot start

**Diagnosis**:

```powershell
# Check disk space
Get-PSDrive | Where-Object {$_.Name -eq 'C'}

# Check Docker disk usage
docker system df
```

**Solution**:

```powershell
# Step 1: Clean Docker cache
docker system prune -a

# Step 2: Remove old logs
docker logs secure-data-backend > backend-logs.txt
# Restart container to clear logs

# Step 3: Clean old backups
Remove-Item ".\backups\backup-*.zip" -Exclude "backup-$(Get-Date -Format 'yyyyMMdd')*.zip"

# Step 4: Move data to larger drive
# Stop containers, move docker data directory, update docker settings
```

### Issue 6: Authentication Failing

**Symptoms**:

- Cannot login
- 401 Unauthorized errors
- "Invalid token" messages

**Diagnosis**:

```powershell
# Test login directly
$body = '{"email":"admin@example.com","password":"password123"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
```

**Solution**:

```powershell
# Step 1: Verify JWT secret is set
docker exec secure-data-backend env | Select-String "JWT_SECRET"

# Step 2: Check user exists in database
docker exec secure-data-mongodb mongosh -u root -p SecurePass2026!Production --authenticationDatabase admin --eval "use secure_data_db; db.users.find({email:'admin@example.com'})"

# Step 3: Reset admin password
docker exec secure-data-backend node -e "
  const bcrypt = require('bcrypt');
  const newPassword = bcrypt.hashSync('NewSecurePassword123!', 10);
  console.log(newPassword);
"

# Manually update in database if needed
```

### Issue 7: Memory Leak

**Symptoms**:

- Memory usage continuously increasing
- Container gets killed (OOMKilled)
- Performance degrading over time

**Diagnosis**:

```powershell
# Monitor memory over time
docker stats secure-data-backend --no-stream

# Check for memory leaks in Node.js
docker exec secure-data-backend node --expose-gc -e "
  console.log(process.memoryUsage());
  global.gc();
  console.log(process.memoryUsage());
"
```

**Solution**:

```powershell
# Step 1: Restart container to reclaim memory
docker-compose restart backend

# Step 2: Set memory limits
# Edit docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       memory: 1G

# Step 3: Enable Node.js garbage collection
# Add to backend Dockerfile CMD:
# CMD ["node", "--max-old-space-size=512", "server.js"]

# Step 4: Profile application
# Use Node.js heap profiler to identify leaks
```

---

## Incident Response

### Severity Levels

**P1 - Critical** (Response: 15 minutes)

- Complete service outage
- Data breach or loss
- Security compromise

**P2 - High** (Response: 1 hour)

- Partial service degradation
- Performance severely impacted
- Non-critical feature broken

**P3 - Medium** (Response: 4 hours)

- Minor feature issues
- Performance slightly degraded

**P4 - Low** (Response: Next business day)

- Cosmetic bugs
- Feature requests

### Incident Response Workflow

1. **Detection**
   - Automated monitoring alerts
   - User reports
   - Manual discovery

2. **Assessment**
   - Run diagnostic checks
   - Determine severity
   - Identify affected components

3. **Communication**
   - Notify stakeholders
   - Update status page
   - Set up war room (for P1/P2)

4. **Resolution**
   - Execute fix procedures
   - Test changes
   - Monitor recovery

5. **Post-Incident**
   - Document timeline
   - Identify root cause
   - Implement preventive measures
   - Conduct post-mortem

### Emergency Procedures

#### Complete Service Outage

```powershell
# Step 1: Check all containers
docker-compose ps

# Step 2: Restart all services
docker-compose restart

# Step 3: If restart fails, full redeploy
docker-compose down
docker-compose up -d

# Step 4: Verify health
.\verify-production.ps1

# Step 5: If still failing, rollback
git checkout [previous-stable-commit]
docker-compose up -d
```

#### Data Corruption

```powershell
# Step 1: Stop all services
docker-compose stop

# Step 2: Assess damage
docker exec secure-data-mongodb mongosh --eval "db.fsyncLock()"
docker exec secure-data-mongodb mongosh --eval "db.stats()"

# Step 3: Restore from latest backup
.\restore-backup.ps1 -BackupFile "backup-[latest].zip"

# Step 4: Verify data integrity
docker exec secure-data-mongodb mongosh --eval "db.records.count()"

# Step 5: Restart services
docker-compose start
```

#### Security Breach

```powershell
# Step 1: IMMEDIATELY isolate system
docker-compose stop

# Step 2: Preserve evidence
docker logs secure-data-backend > incident-backend-$(Get-Date -Format 'yyyyMMdd-HHmmss').log
docker exec secure-data-mongodb mongodump --out=/data/incident-backup

# Step 3: Notify security team
# Contact: security@company.com

# Step 4: Analyze breach
# Review audit logs
docker exec secure-data-mongodb mongosh --eval "use secure_data_db; db.audit_logs.find().sort({timestamp:-1}).limit(100)"

# Step 5: Remediate
# - Change all passwords
# - Rotate JWT secrets
# - Update security rules
# - Patch vulnerabilities

# Step 6: Document and report
```

---

## Maintenance Procedures

### Weekly Maintenance (Sunday 2-4 AM)

```powershell
# 1. Create pre-maintenance backup
.\backup-production.ps1

# 2. Check for updates
docker-compose pull

# 3. Restart services for clean state
docker-compose restart

# 4. Run verification
.\verify-production.ps1

# 5. Check logs for warnings
docker logs --since 168h secure-data-backend | Select-String "WARN"

# 6. Optimize database
docker exec secure-data-mongodb mongosh --eval "
  use secure_data_db;
  db.records.reIndex();
  db.audit_logs.reIndex();
"

# 7. Clean old logs
docker logs secure-data-backend > dev/null 2>&1
```

### Monthly Maintenance (First Sunday)

```powershell
# 1. Full system backup
.\backup-production.ps1

# 2. Security updates
docker-compose pull
docker-compose up -d

# 3. Database maintenance
docker exec secure-data-mongodb mongosh --eval "
  use secure_data_db;
  db.repairDatabase();
  db.runCommand({compact:'audit_logs'});
"

# 4. Clean old backups (keep 30 days)
Get-ChildItem ".\backups" -Filter "backup-*.zip" |
  Where-Object {$_.CreationTime -lt (Get-Date).AddDays(-30)} |
  Remove-Item

# 5. Review and rotate logs
# Archive old logs to cold storage

# 6. Performance review
# Check metrics, identify bottlenecks

# 7. Update documentation
# Reflect any changes made during the month
```

### Quarterly Maintenance

```powershell
# 1. Full system audit
.\verify-production.ps1 -Detailed

# 2. Security review
# - Review user access
# - Audit permissions
# - Check for vulnerabilities
# - Update dependencies

# 3. Capacity planning
# - Review growth trends
# - Assess scaling needs
# - Plan infrastructure upgrades

# 4. Disaster recovery test
# - Test backup restoration
# - Validate rollback procedures
# - Update incident response plans

# 5. Documentation update
# - Update runbook
# - Refresh training materials
# - Review and improve processes
```

---

## Emergency Contacts

### On-Call Rotation

**Primary On-Call**: DevOps Engineer

- Phone: +1-XXX-XXX-XXXX
- Email: devops-oncall@company.com
- Slack: @devops-oncall

**Secondary On-Call**: Backend Developer

- Phone: +1-XXX-XXX-XXXX
- Email: backend-oncall@company.com
- Slack: @backend-oncall

### Escalation Path

**Level 1**: On-Call Engineer (15 min response)  
**Level 2**: Technical Lead (30 min response)  
**Level 3**: Engineering Manager (1 hour response)  
**Level 4**: CTO/Director (2 hour response)

### External Support

**Docker Support**: support.docker.com  
**MongoDB Support**: support.mongodb.com  
**Cloud Provider**: [Your cloud provider support]

### Communication Channels

- **Incidents**: #incidents-critical (Slack)
- **Status**: status.company.com
- **Email**: incidents@company.com
- **Phone**: 1-800-XXX-XXXX (24/7 hotline)

---

## Appendix

### A. Useful Commands

```powershell
# Quick health check
docker-compose ps && Invoke-RestMethod http://localhost:3000/api/v1/health

# View resource usage
docker stats --no-stream

# Backup quickly
.\backup-production.ps1 -Compress

# Monitor continuously
.\monitor-production.ps1 -Continuous -IntervalSeconds 30

# Check recent errors
docker logs --since 1h secure-data-backend 2>&1 | Select-String "ERROR"

# Restart everything
docker-compose restart && Start-Sleep 30 && .\verify-production.ps1
```

### B. File Locations

- **Backups**: `.\backups\`
- **Logs**: `.\logs\`
- **Config**: `.env.production`, `docker-compose.yml`
- **Scripts**: `*.ps1` in root directory
- **Documentation**: `*.md` files

### C. Performance Benchmarks

| Metric          | Target | Acceptable | Critical |
| --------------- | ------ | ---------- | -------- |
| API Response    | <500ms | <1000ms    | >1000ms  |
| Page Load       | <2s    | <5s        | >5s      |
| CPU Usage       | <50%   | <80%       | >90%     |
| Memory Usage    | <70%   | <85%       | >95%     |
| Disk Space Free | >30%   | >20%       | <10%     |
| Error Rate      | <0.1%  | <1%        | >5%      |
| Uptime          | >99.9% | >99%       | <99%     |

---

**Document Version**: 1.0.0  
**Last Review**: January 27, 2026  
**Next Review**: April 27, 2026  
**Owner**: DevOps Team
