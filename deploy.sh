#!/bin/bash
# Deployment Script for Secure Data Platform
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Deploying Secure Data Platform to $ENVIRONMENT"
echo "📅 Timestamp: $TIMESTAMP"

# ==================== Pre-deployment Checks ====================
echo "🔍 Running pre-deployment checks..."

if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found"
    echo "Copy .env.example to .env.local and fill in your values"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  Warning: docker-compose not found, trying docker compose"
fi

# ==================== Build Images ====================
echo "🔨 Building Docker images..."
docker-compose build --no-cache

# ==================== Database Backup ====================
if [ "$ENVIRONMENT" = "production" ]; then
    echo "💾 Creating database backup..."
    docker-compose exec mongodb mongodump --uri "mongodb://root:$MONGODB_PASSWORD@localhost:27017/secure_data_db?authSource=admin" --out /backup/$TIMESTAMP
fi

# ==================== Stop Old Containers ====================
echo "🛑 Stopping old containers..."
docker-compose down

# ==================== Start New Containers ====================
echo "▶️  Starting new containers..."
docker-compose up -d

# ==================== Wait for Services ====================
echo "⏳ Waiting for services to be healthy..."
sleep 30

# ==================== Run Migrations ====================
echo "📊 Running database migrations..."
docker-compose exec backend npm run migrate

# ==================== Health Checks ====================
echo "🏥 Running health checks..."

BACKEND_HEALTH=$(curl -s http://localhost:3000/health | grep -o "ok" || echo "failed")
if [ "$BACKEND_HEALTH" = "ok" ]; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

FRONTEND_CHECK=$(curl -s http://localhost:3001/ || echo "failed")
if [ "$FRONTEND_CHECK" != "failed" ]; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

# ==================== Post-deployment ====================
echo "✅ Deployment successful!"
echo ""
echo "📋 Service URLs:"
echo "  Frontend: http://localhost:3001"
echo "  Backend:  http://localhost:3000"
echo "  Health:   http://localhost:3000/health"
echo ""
echo "📚 Next steps:"
echo "  1. Verify services are running: docker-compose ps"
echo "  2. Check logs: docker-compose logs -f"
echo "  3. Access frontend: http://localhost:3001"
echo ""

# ==================== Logging ====================
echo "📝 Deployment log saved to: deployment_${TIMESTAMP}.log"
docker-compose logs > "deployment_${TIMESTAMP}.log"

exit 0
