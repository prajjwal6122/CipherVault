param([string]$Environment = "production")
$ErrorActionPreference = "Stop"
Write-Host "Deployment Starting..." -ForegroundColor Cyan
Write-Host "Checking Docker..." -ForegroundColor Yellow
docker --version
docker-compose --version
if (-not (Test-Path ".env.$Environment")) {
    Write-Host "Error: .env.$Environment not found" -ForegroundColor Red
    exit 1
}
Copy-Item ".env.$Environment" ".env" -Force
Write-Host "Building images..." -ForegroundColor Yellow
docker-compose build
if ($LASTEXITCODE -ne 0) {
    exit 1
}
Write-Host "Starting services..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    exit 1
}
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3001" -ForegroundColor White
Write-Host "Backend: http://localhost:3000" -ForegroundColor White

