# Payment Service Setup Script

Write-Host "Setting up Payment Service..." -ForegroundColor Cyan

# Check if .env exists
if (!(Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Please configure .env with your Stripe and PayPal credentials" -ForegroundColor Yellow
}

# Create logs directory
if (!(Test-Path "logs")) {
    Write-Host "Creating logs directory..." -ForegroundColor Green
    New-Item -ItemType Directory -Path "logs"
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Green
npm install

# Check if PostgreSQL is running
Write-Host "Checking PostgreSQL connection..." -ForegroundColor Green
$pgCheck = docker ps | Select-String "ecommerce-postgres"
if (!$pgCheck) {
    Write-Host "PostgreSQL container not running. Please start docker-compose." -ForegroundColor Red
    exit 1
}

# Create database
Write-Host "Creating payment_db database..." -ForegroundColor Green
docker exec -it ecommerce-postgres psql -U postgres -c "CREATE DATABASE payment_db;" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Database created" -ForegroundColor Green
} else {
    Write-Host "Database may already exist" -ForegroundColor Yellow
}

# Run schema
Write-Host "Running database schema..." -ForegroundColor Green
Get-Content schema.sql | docker exec -i ecommerce-postgres psql -U postgres -d payment_db

if ($LASTEXITCODE -eq 0) {
    Write-Host "Schema applied successfully" -ForegroundColor Green
} else {
    Write-Host "Schema application failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Payment Service setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Configure .env with your Stripe and PayPal credentials" -ForegroundColor White
Write-Host "  2. Set ENCRYPTION_KEY to a secure 32-character string" -ForegroundColor White
Write-Host "  3. Run: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Documentation: See README.md for detailed setup instructions" -ForegroundColor Cyan
