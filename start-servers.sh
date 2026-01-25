#!/bin/bash
# ========================================
# CipherVault - Quick Start Script
# ========================================

echo "🔐 CipherVault - Secure Data Management Platform"
echo "=================================================="
echo ""

# Check Node.js version
echo "✓ Checking Node.js..."
node --version
npm --version

echo ""
echo "=================================================="
echo "Starting Servers..."
echo "=================================================="
echo ""

# Start Backend
echo "🔄 Starting Backend Server (Port 3000)..."
cd backend || exit 1
npm install > /dev/null 2>&1
npm start &
BACKEND_PID=$!
echo "✅ Backend Started (PID: $BACKEND_PID)"

sleep 3

# Start Frontend
echo ""
echo "🔄 Starting Frontend Server (Port 3003)..."
cd ../frontend || exit 1
npm install > /dev/null 2>&1
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend Started (PID: $FRONTEND_PID)"

echo ""
echo "=================================================="
echo "✨ Servers Running Successfully!"
echo "=================================================="
echo ""
echo "📱 Frontend: http://localhost:3003"
echo "🔗 Backend: http://localhost:3000"
echo "📚 API Docs: http://localhost:3000/api-docs"
echo ""
echo "👤 Demo Login:"
echo "   Email: admin@example.com"
echo "   Password: password123"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
