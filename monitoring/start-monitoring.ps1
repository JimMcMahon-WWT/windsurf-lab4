# Start Monitoring Stack Script (PowerShell)
# This script starts all monitoring services in the correct order

Write-Host "🚀 Starting Comprehensive Monitoring Stack..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Blue
$dirs = @(
    "prometheus/alerts",
    "grafana/provisioning/dashboards",
    "grafana/provisioning/datasources",
    "grafana/dashboards",
    "logstash/pipeline",
    "logstash/config",
    "filebeat",
    "alertmanager"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# Create ecommerce network if it doesn't exist
Write-Host "🔧 Setting up Docker network..." -ForegroundColor Blue
docker network create ecommerce-network 2>$null

# Start monitoring services
Write-Host "🐳 Starting monitoring services..." -ForegroundColor Blue
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to become healthy..." -ForegroundColor Blue
Start-Sleep -Seconds 10

# Check service health
Write-Host ""
Write-Host "✅ Monitoring Stack Status:" -ForegroundColor Green
Write-Host ""

# Check Prometheus
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -UseBasicParsing -TimeoutSec 2
    Write-Host "  ✅ Prometheus:      http://localhost:9090" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Prometheus:      Starting..." -ForegroundColor Yellow
}

# Check Grafana
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 2
    Write-Host "  ✅ Grafana:         http://localhost:3000 (admin/admin)" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Grafana:         Starting..." -ForegroundColor Yellow
}

# Check Jaeger
try {
    $response = Invoke-WebRequest -Uri "http://localhost:14269/" -UseBasicParsing -TimeoutSec 2
    Write-Host "  ✅ Jaeger:          http://localhost:16686" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Jaeger:          Starting..." -ForegroundColor Yellow
}

# Check Elasticsearch
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9200/_cluster/health" -UseBasicParsing -TimeoutSec 2
    Write-Host "  ✅ Elasticsearch:   http://localhost:9200" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Elasticsearch:   Starting..." -ForegroundColor Yellow
}

# Check Kibana
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5601/api/status" -UseBasicParsing -TimeoutSec 2
    Write-Host "  ✅ Kibana:          http://localhost:5601" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Kibana:          Starting (may take 2-3 minutes)" -ForegroundColor Yellow
}

# Check AlertManager
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9093/-/healthy" -UseBasicParsing -TimeoutSec 2
    Write-Host "  ✅ AlertManager:    http://localhost:9093" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  AlertManager:    Starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 Additional Services:" -ForegroundColor Green
Write-Host "  • cAdvisor:        http://localhost:8080"
Write-Host "  • Node Exporter:   http://localhost:9100/metrics"
Write-Host "  • Postgres Exporter: http://localhost:9187/metrics"
Write-Host "  • Redis Exporter:  http://localhost:9121/metrics"

Write-Host ""
Write-Host "🎉 Monitoring stack deployment initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:"
Write-Host "  1. Wait 2-3 minutes for all services to fully start"
Write-Host "  2. Access Grafana at http://localhost:3000 (admin/admin)"
Write-Host "  3. Check Prometheus targets at http://localhost:9090/targets"
Write-Host "  4. View logs in Kibana at http://localhost:5601"
Write-Host "  5. Explore traces in Jaeger at http://localhost:16686"
Write-Host ""
Write-Host "📖 For detailed setup instructions, see:"
Write-Host "   monitoring/COMPREHENSIVE_MONITORING_GUIDE.md"
Write-Host ""
Write-Host "To view logs: docker-compose -f monitoring/docker-compose.monitoring.yml logs -f"
Write-Host "To stop:      docker-compose -f monitoring/docker-compose.monitoring.yml down"
Write-Host ""
