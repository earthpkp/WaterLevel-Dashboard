# API Testing Script
# สคริปต์สำหรับทดสอบ API endpoints

$API_URL = "http://localhost:5000"

Write-Host "🧪 Testing Water Dashboard API" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/health" -Method Get
    Write-Host "✅ Health Check: $($response.status)" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor White
} catch {
    Write-Host "❌ Health Check failed" -ForegroundColor Red
}

Write-Host ""

# Test 2: Metadata
Write-Host "2. Testing Metadata Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/metadata" -Method Get
    Write-Host "✅ Metadata: Retrieved $($response.data.Count) stations" -ForegroundColor Green
    foreach ($station in $response.data) {
        Write-Host "   - Station $($station.station_id): $($station.subbasin_name)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Metadata request failed" -ForegroundColor Red
}

Write-Host ""

# Test 3: Latest Water Level
Write-Host "3. Testing Latest Water Level..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/waterlevel/latest" -Method Get
    Write-Host "✅ Latest Data:" -ForegroundColor Green
    Write-Host "   Date: $($response.data.date_time)" -ForegroundColor White
    Write-Host "   X.274: $($response.data.x_274) m" -ForegroundColor White
    Write-Host "   X.119A: $($response.data.x_119a) m" -ForegroundColor White
    Write-Host "   X.119: $($response.data.x_119) m" -ForegroundColor White
} catch {
    Write-Host "❌ Latest water level request failed" -ForegroundColor Red
}

Write-Host ""

# Test 4: Alerts
Write-Host "4. Testing Alerts..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/alerts" -Method Get
    Write-Host "✅ Alerts: Found $($response.count) alert(s)" -ForegroundColor Green
    if ($response.count -gt 0) {
        foreach ($alert in $response.data) {
            Write-Host "   ⚠️  Station $($alert.station_id): $($alert.water_level)m / $($alert.bank_level)m ($($alert.percentage)%)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   No alerts - all stations normal" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Alerts request failed" -ForegroundColor Red
}

Write-Host ""

# Test 5: Statistics
Write-Host "5. Testing Statistics..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/statistics/274" -Method Get
    Write-Host "✅ Statistics for Station 274:" -ForegroundColor Green
    Write-Host "   Min: $($response.data.min_level) m" -ForegroundColor White
    Write-Host "   Max: $($response.data.max_level) m" -ForegroundColor White
    Write-Host "   Avg: $([math]::Round($response.data.avg_level, 2)) m" -ForegroundColor White
    Write-Host "   Records: $($response.data.total_records)" -ForegroundColor White
} catch {
    Write-Host "❌ Statistics request failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ API Testing Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Full API Documentation available in README.md" -ForegroundColor Cyan
