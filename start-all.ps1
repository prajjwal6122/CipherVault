# Stop any existing Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start MongoDB in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\FRONT END\Secured-Data-App\backend'; mongod --dbpath='E:\FRONT END\Secured-Data-App\backend\data'"

# Wait for MongoDB to start
Write-Host "Waiting for MongoDB to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\FRONT END\Secured-Data-App\backend'; npm run dev"

# Wait for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start Frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\FRONT END\Secured-Data-App\frontend'; npm run dev"

Write-Host "`nAll services starting..." -ForegroundColor Green
Write-Host "Frontend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nPress any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
