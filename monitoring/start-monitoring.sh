#!/bin/bash

# Start Monitoring Stack Script
# This script starts all monitoring services in the correct order

set -e

echo "🚀 Starting Comprehensive Monitoring Stack..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create necessary directories
echo "${BLUE}📁 Creating necessary directories...${NC}"
mkdir -p prometheus/alerts
mkdir -p grafana/provisioning/dashboards
mkdir -p grafana/provisioning/datasources
mkdir -p grafana/dashboards
mkdir -p logstash/pipeline
mkdir -p logstash/config
mkdir -p filebeat
mkdir -p alertmanager

# Create ecommerce network if it doesn't exist
echo "${BLUE}🔧 Setting up Docker network...${NC}"
docker network create ecommerce-network 2>/dev/null || true

# Start monitoring services
echo "${BLUE}🐳 Starting monitoring services...${NC}"
cd "$(dirname "$0")"
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be healthy
echo "${BLUE}⏳ Waiting for services to become healthy...${NC}"
sleep 10

# Check service health
echo ""
echo "${GREEN}✅ Monitoring Stack Status:${NC}"
echo ""

# Check Prometheus
if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo "  ✅ Prometheus:      http://localhost:9090"
else
    echo "  ⚠️  Prometheus:      Starting..."
fi

# Check Grafana
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "  ✅ Grafana:         http://localhost:3000 (admin/admin)"
else
    echo "  ⚠️  Grafana:         Starting..."
fi

# Check Jaeger
if curl -s http://localhost:14269/ > /dev/null 2>&1; then
    echo "  ✅ Jaeger:          http://localhost:16686"
else
    echo "  ⚠️  Jaeger:          Starting..."
fi

# Check Elasticsearch
if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    echo "  ✅ Elasticsearch:   http://localhost:9200"
else
    echo "  ⚠️  Elasticsearch:   Starting..."
fi

# Check Kibana
if curl -s http://localhost:5601/api/status > /dev/null 2>&1; then
    echo "  ✅ Kibana:          http://localhost:5601"
else
    echo "  ⚠️  Kibana:          Starting (may take 2-3 minutes)"
fi

# Check AlertManager
if curl -s http://localhost:9093/-/healthy > /dev/null 2>&1; then
    echo "  ✅ AlertManager:    http://localhost:9093"
else
    echo "  ⚠️  AlertManager:    Starting..."
fi

echo ""
echo "${GREEN}📊 Additional Services:${NC}"
echo "  • cAdvisor:        http://localhost:8080"
echo "  • Node Exporter:   http://localhost:9100/metrics"
echo "  • Postgres Exporter: http://localhost:9187/metrics"
echo "  • Redis Exporter:  http://localhost:9121/metrics"

echo ""
echo "${GREEN}🎉 Monitoring stack deployment initiated!${NC}"
echo ""
echo "📝 Next steps:"
echo "  1. Wait 2-3 minutes for all services to fully start"
echo "  2. Access Grafana at http://localhost:3000 (admin/admin)"
echo "  3. Check Prometheus targets at http://localhost:9090/targets"
echo "  4. View logs in Kibana at http://localhost:5601"
echo "  5. Explore traces in Jaeger at http://localhost:16686"
echo ""
echo "📖 For detailed setup instructions, see:"
echo "   monitoring/COMPREHENSIVE_MONITORING_GUIDE.md"
echo ""
echo "To view logs: docker-compose -f monitoring/docker-compose.monitoring.yml logs -f"
echo "To stop:      docker-compose -f monitoring/docker-compose.monitoring.yml down"
echo ""
