# Fresh restart of all services
Write-Host "🔄 Fresh system restart..." -ForegroundColor Cyan

# Kill Node processes
Write-Host "`n1️⃣ Killing Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# MongoDB is already running (mongod terminal)
Write-Host "`n2️⃣ MongoDB already running on port 27017" -ForegroundColor Green

# Start Backend
Write-Host "`n3️⃣ Starting Backend on port 3000..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "E:\FRONT END\Secured-Data-App\backend" -WindowStyle Hidden
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "`n4️⃣ Starting Frontend on port 3001/3002..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory "E:\FRONT END\Secured-Data-App\frontend" -WindowStyle Hidden
Start-Sleep -Seconds 3

Write-Host "`n✅ Services restarted!" -ForegroundColor Green
Write-Host "`n📍 Access points:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3001" -ForegroundColor White
Write-Host "   MongoDB:  localhost:27017" -ForegroundColor White
Write-Host "`n⏳ Give the services 5-10 seconds to fully start..." -ForegroundColor Yellow
