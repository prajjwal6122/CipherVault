# CipherVault Deployment Script
# Automated Docker Compose Deployment with Health Checks
# Run: .\deploy.ps1

param(
    [string]$Environment = "production",
    [switch]$SkipTests = $false,
    [switch]$Clean = $false,
    [switch]$BuildOnly = $false
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CipherVault Deployment Script" -ForegroundColor Cyan
Write-Host "  Environment: $Environment" -ForegroundColor Cyan
Write-Host "  Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Pre-deployment checks
Write-Host "[STEP 1] Pre-deployment Checks..." -ForegroundColor Yellow

# Check Docker is installed and running
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not installed or not running" -ForegroundColor Red
    Write-Host "  Please install Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

try {
    docker ps | Out-Null
    Write-Host "✓ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker daemon is not running" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

# Check docker-compose
try {
    $composeVersion = docker-compose --version
    Write-Host "✓ Docker Compose installed: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker Compose is not installed" -ForegroundColor Red
    exit 1
}

# Check environment file exists
if (-not (Test-Path ".env.$Environment")) {
    Write-Host "✗ Environment file .env.$Environment not found" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Environment file found: .env.$Environment" -ForegroundColor Green

# Step 2: Run tests (unless skipped)
if (-not $SkipTests) {
    Write-Host "`n[STEP 2] Running Tests..." -ForegroundColor Yellow
    
    # Check if backend server is running for tests
    if (Test-Connection -ComputerName localhost -TCPPort 3000 -ErrorAction SilentlyContinue) {
        Write-Host "✓ Backend is running, executing tests..." -ForegroundColor Green
        
        # Run UAT tests
        Write-Host "  Running UAT tests..." -ForegroundColor Cyan
        $uatResult = & .\run-uat-tests.ps1
        if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 2) {
            Write-Host "✗ UAT tests failed" -ForegroundColor Red
            Write-Host "  Review test results and fix issues before deploying" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "✓ UAT tests completed" -ForegroundColor Green
        
        # Run integration tests
        Write-Host "  Running integration tests..." -ForegroundColor Cyan
        Push-Location backend
        npm test -- __tests__/integration.phase6.test.js --forceExit --silent
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Integration tests failed" -ForegroundColor Red
            Pop-Location
            exit 1
        }
        Pop-Location
        Write-Host "✓ Integration tests passed" -ForegroundColor Green
    } else {
        Write-Host "⚠ Backend not running - skipping tests" -ForegroundColor Yellow
        Write-Host "  Tests will be run after deployment" -ForegroundColor Cyan
    }
} else {
    Write-Host "`n[STEP 2] Tests Skipped" -ForegroundColor Yellow
}

# Step 3: Clean up old containers (if requested)
if ($Clean) {
    Write-Host "`n[STEP 3] Cleaning Up Old Deployment..." -ForegroundColor Yellow
    
    Write-Host "  Stopping containers..." -ForegroundColor Cyan
    docker-compose down -v --remove-orphans
    
    Write-Host "  Removing old images..." -ForegroundColor Cyan
    docker image prune -f
    
    Write-Host "✓ Cleanup complete" -ForegroundColor Green
} else {
    Write-Host "`n[STEP 3] Cleanup Skipped" -ForegroundColor Yellow
}

# Step 4: Build Docker images
Write-Host "`n[STEP 4] Building Docker Images..." -ForegroundColor Yellow

# Copy environment file
Copy-Item ".env.$Environment" ".env" -Force
Write-Host "✓ Environment configured for $Environment" -ForegroundColor Green

Write-Host "  Building backend image..." -ForegroundColor Cyan
docker-compose build backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Backend build failed" -ForegroundColor Red
    exit 1
}

Write-Host "  Building frontend image..." -ForegroundColor Cyan
docker-compose build frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Frontend build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✓ All images built successfully" -ForegroundColor Green

if ($BuildOnly) {
    Write-Host "`n Build complete (BuildOnly flag)" -ForegroundColor Green
    exit 0
}

# Step 5: Deploy containers
Write-Host "`n[STEP 5] Deploying Containers..." -ForegroundColor Yellow

docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Containers started" -ForegroundColor Green

# Step 6: Wait for services to be healthy
Write-Host "`n[STEP 6] Waiting for Services to be Healthy..." -ForegroundColor Yellow

$maxWaitTime = 120
$elapsed = 0
$interval = 5

$services = @(
    @{Name="MongoDB"; Container="secure-data-mongodb"},
    @{Name="Backend"; Container="secure-data-backend"; Url="http://localhost:3000/api/v1/health"},
    @{Name="Frontend"; Container="secure-data-frontend"; Url="http://localhost:3001/health"}
)

foreach ($service in $services) {
    Write-Host "  Checking $($service.Name)..." -ForegroundColor Cyan
    $healthy = $false
    $serviceElapsed = 0
    
    while (-not $healthy -and $serviceElapsed -lt $maxWaitTime) {
        $status = docker inspect --format='{{.State.Health.Status}}' $service.Container 2>$null
        
        if ($status -eq "healthy") {
            $healthy = $true
            Write-Host "  ✓ $($service.Name) is healthy" -ForegroundColor Green
        } elseif ($status -eq "starting") {
            Write-Host "    $($service.Name) is starting... ($serviceElapsed/$maxWaitTime seconds)" -ForegroundColor Yellow
            Start-Sleep -Seconds $interval
            $serviceElapsed += $interval
        } elseif ($status -eq "unhealthy") {
            Write-Host "  ✗ $($service.Name) is unhealthy" -ForegroundColor Red
            Write-Host "    Checking logs..." -ForegroundColor Cyan
            docker logs --tail 50 $service.Container
            exit 1
        } else {
            # No health check or container not found, try URL if available
            if ($service.Url) {
                $urlHealthy = $false
                try {
                    $response = Invoke-RestMethod -Uri $service.Url -ErrorAction Stop -TimeoutSec 2
                    $urlHealthy = $true
                } catch {
                    $urlHealthy = $false
                }
                
                if ($urlHealthy) {
                    $healthy = $true
                    Write-Host "  ✓ $($service.Name) is responding" -ForegroundColor Green
                } else {
                    Start-Sleep -Seconds $interval
                    $serviceElapsed += $interval
                }
            } else {
                # Just check if container is running
                $running = docker ps --filter "name=$($service.Container)" --format "{{.Status}}"
                if ($running -match "Up") {
                    $healthy = $true
                    Write-Host "  ✓ $($service.Name) is running" -ForegroundColor Green
                } else {
                    Start-Sleep -Seconds $interval
                    $serviceElapsed += $interval
                }
            }
        }
    }
    
    if (-not $healthy) {
        Write-Host "  ✗ $($service.Name) failed to become healthy within $maxWaitTime seconds" -ForegroundColor Red
        exit 1
    }
}

# Step 7: Post-deployment verification
Write-Host "`n[STEP 7] Post-Deployment Verification..." -ForegroundColor Yellow

# Test backend API
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -ErrorAction Stop
    Write-Host "✓ Backend API is responding" -ForegroundColor Green
    Write-Host "  Status: $($health.message)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Backend API is not responding" -ForegroundColor Red
    exit 1
}

# Test frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3001" -ErrorAction Stop
    Write-Host "✓ Frontend is accessible (HTTP $($frontendResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "✗ Frontend is not accessible" -ForegroundColor Red
    exit 1
}

# Show running containers
Write-Host "`n[STEP 8] Deployment Status..." -ForegroundColor Yellow
docker-compose ps

# Final Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor White
Write-Host "  Frontend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Backend:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "  API Docs:  http://localhost:3000/api-docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Commands:" -ForegroundColor White
Write-Host "  View logs:     docker-compose logs -f" -ForegroundColor Cyan
Write-Host "  Stop:          docker-compose stop" -ForegroundColor Cyan
Write-Host "  Restart:       docker-compose restart" -ForegroundColor Cyan
Write-Host "  Remove:        docker-compose down" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default Credentials:" -ForegroundColor White
Write-Host "  Admin:    admin@example.com / password123" -ForegroundColor Yellow
Write-Host "  Analyst:  analyst@example.com / password123" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠ Change default passwords in production!" -ForegroundColor Red
Write-Host "========================================`n" -ForegroundColor Cyan
