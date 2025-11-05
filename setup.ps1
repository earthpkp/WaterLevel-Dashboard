# Quick Setup Script for Water Dashboard
# สคริปต์สำหรับติดตั้งและเริ่มต้นใช้งานระบบ

Write-Host "🌊 Water Level Dashboard - Quick Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker Compose is installed
Write-Host "Checking Docker Compose installation..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose found: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose not found. Please install Docker Compose." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting Water Dashboard..." -ForegroundColor Cyan
Write-Host ""

# Stop any existing containers
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# Start all services
Write-Host "Starting all services..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    Write-Host ""
    Write-Host "🎉 Setup Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access the application at:" -ForegroundColor Cyan
    Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
    Write-Host "  Backend:   http://localhost:5000" -ForegroundColor White
    Write-Host "  API Health: http://localhost:5000/api/health" -ForegroundColor White
    Write-Host ""
    Write-Host "Useful commands:" -ForegroundColor Cyan
    Write-Host "  View logs:        docker-compose logs -f" -ForegroundColor White
    Write-Host "  Stop services:    docker-compose down" -ForegroundColor White
    Write-Host "  Restart services: docker-compose restart" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening frontend in browser..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:3000"
    
} else {
    Write-Host ""
    Write-Host "❌ Failed to start services. Check the error messages above." -ForegroundColor Red
    Write-Host "Try running: docker-compose logs" -ForegroundColor Yellow
}
