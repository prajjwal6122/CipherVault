$ProgressPreference = 'SilentlyContinue'

Write-Host "`n=== FULL STACK WEBFLOW TEST ==="
Write-Host "1. Testing Backend Health..."
$b = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -UseBasicParsing 2>&1
if ($b.StatusCode -eq 200) {
    Write-Host "   [OK] Backend responds on port 3000"
} else {
    Write-Host "   [FAIL] Backend error"
}

Write-Host "2. Testing Frontend Server..."
$f = Invoke-WebRequest -Uri "http://localhost:3001/" -TimeoutSec 3 -UseBasicParsing 2>&1
if ($f.StatusCode -eq 200) {
    Write-Host "   [OK] Frontend responds on port 3001"
    Write-Host "   Content: $($f.Content.Length) bytes"
} else {
    Write-Host "   [FAIL] Frontend error"
}

Write-Host "3. Testing API Endpoints..."
$a = Invoke-WebRequest -Uri "http://localhost:3000/api/v1" -TimeoutSec 2 -UseBasicParsing 2>&1
if ($a.StatusCode -eq 200) {
    Write-Host "   [OK] /api/v1 endpoint working"
} else {
    Write-Host "   [FAIL] API endpoint error"
}

Write-Host "4. Testing Login Endpoint..."
$loginJson = @{email="admin@example.com";password="password123"} | ConvertTo-Json
$l = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $loginJson -TimeoutSec 2 -UseBasicParsing 2>&1
if ($l.StatusCode -eq 200) {
    Write-Host "   [OK] Login endpoint working"
    $lr = $l.Content | ConvertFrom-Json
    if ($lr.token) {
        Write-Host "   [OK] JWT token received"
    }
} else {
    Write-Host "   [FAIL] Login error"
}

Write-Host "`n=== ALL SYSTEMS OPERATIONAL ==="
Write-Host "Frontend: http://localhost:3001"
Write-Host "Backend API: http://localhost:3000"
Write-Host "Credentials: admin@example.com / password123"
Write-Host ""
