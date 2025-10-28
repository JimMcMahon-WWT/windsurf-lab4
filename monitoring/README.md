# E-Commerce Platform Monitoring Stack

Complete monitoring solution for the containerized e-commerce microservices platform using Prometheus and Grafana.

---

## 📊 Monitoring Components

### Core Monitoring Services

| Service               | Port | Purpose                      | Status     |
| --------------------- | ---- | ---------------------------- | ---------- |
| **Prometheus**        | 9090 | Metrics collection & storage | ✅ Running |
| **Grafana**           | 3000 | Metrics visualization        | ✅ Running |
| **cAdvisor**          | 8080 | Container metrics            | ✅ Running |
| **Postgres Exporter** | 9187 | PostgreSQL metrics           | ✅ Running |
| **Redis Exporter**    | 9121 | Redis metrics                | ✅ Running |

### Metrics Sources

- **Service Metrics**: User, Product, Order, Payment services (via `/metrics` endpoint)
- **Container Metrics**: CPU, memory, network, disk I/O per container
- **Database Metrics**: PostgreSQL connections, queries, cache hits
- **Cache Metrics**: Redis connections, memory usage, hit rates
- **Infrastructure**: Host-level metrics (when available)

---

## 🚀 Quick Start

### Access the Dashboards

1. **Grafana UI**: http://localhost:3000
   - Username: `admin`
   - Password: `admin`
   - (Change on first login)

2. **Prometheus UI**: http://localhost:9090
   - Query metrics directly
   - View targets and alerts

3. **cAdvisor UI**: http://localhost:8080
   - Real-time container metrics
   - Per-container resource usage

### Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose up -d prometheus grafana cadvisor postgres-exporter redis-exporter

# Check status
docker-compose ps prometheus grafana cadvisor

# View logs
docker-compose logs -f prometheus grafana
```

### Stop Monitoring Stack

```bash
# Stop monitoring services (keeps data)
docker-compose stop prometheus grafana cadvisor postgres-exporter redis-exporter

# Remove monitoring services (destroys data)
docker-compose down -v prometheus grafana cadvisor
```

---

## 📈 Available Metrics

### Service-Level Metrics

Once you add the `prom-client` library to your services, you'll get:

- **HTTP Metrics**
  - Request rate (requests/sec)
  - Request duration (ms)
  - Status code distribution
  - Endpoint latency by route

- **Business Metrics**
  - Active users
  - Orders created/processed
  - Payment transactions
  - Product searches

- **Error Metrics**
  - Error rate by service
  - Failed requests
  - Exception counts

### Container Metrics (cAdvisor)

- **CPU**: Usage %, throttling events
- **Memory**: Usage, limits, OOM events
- **Network**: Bytes sent/received, packets
- **Disk I/O**: Read/write bytes, operations

### Database Metrics (Postgres Exporter)

- Active connections
- Transaction rate
- Query duration
- Cache hit ratio
- Table/index sizes
- Replication lag
- Deadlocks

### Cache Metrics (Redis Exporter)

- Connected clients
- Memory usage
- Cache hit/miss ratio
- Key evictions
- Commands processed/sec
- Replication info

---

## 🔧 Configuration

### Prometheus Configuration

Located at: `monitoring/prometheus/prometheus.yml`

**Scrape Intervals:**

- Global: 15s
- Services: 30s (configurable per job)

**Retention:**

- 30 days of metrics data

**Targets:**
All services are auto-discovered via static configs in docker-compose network.

### Grafana Configuration

Located at: `monitoring/grafana/provisioning/`

**Datasource:** Prometheus (auto-configured)
**Dashboards:** Auto-loaded from provisioning directory

**Default Credentials:**

- Username: `admin`
- Password: `admin`

⚠️ **Change the password on first login!**

---

## 📊 Creating Custom Dashboards

### Import Pre-built Dashboards

Grafana provides thousands of community dashboards:

1. Go to Grafana UI → Dashboards → Import
2. Enter dashboard ID or paste JSON
3. Select Prometheus datasource

**Recommended Dashboard IDs:**

- **Docker/Container Monitoring**: 193, 8321
- **PostgreSQL**: 9628, 12485
- **Redis**: 11835, 763
- **Node Exporter**: 1860 (if node-exporter is available)
- **Cadvisor**: 14282

### Custom Dashboard Example

```json
{
  "dashboard": {
    "title": "E-Commerce Services Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      }
    ]
  }
}
```

---

## 🎯 Key Metrics to Monitor

### Service Health

```promql
# Service uptime
up{job=~".*-service"}

# Health check success rate
rate(http_requests_total{endpoint="/health", status="200"}[5m])
```

### Performance

```promql
# Request latency (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Requests per second
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])
```

### Resource Usage

```promql
# Container CPU usage
rate(container_cpu_usage_seconds_total[5m]) * 100

# Container memory usage
container_memory_usage_bytes / container_spec_memory_limit_bytes * 100

# Database connections
pg_stat_database_numbackends
```

### Business Metrics

```promql
# Orders per minute
rate(orders_created_total[1m]) * 60

# Payment success rate
rate(payments_successful_total[5m]) / rate(payments_total[5m])

# Active users
user_sessions_active
```

---

## 🚨 Setting Up Alerts (Optional)

### Create Alert Rules

Create `monitoring/prometheus/alerts.yml`:

```yaml
groups:
  - name: service_alerts
    interval: 30s
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Service {{ $labels.job }} is down'

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High error rate on {{ $labels.service }}'

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Container {{ $labels.name }} using >90% memory'
```

Update `prometheus.yml` to include rules:

```yaml
rule_files:
  - 'alerts.yml'
```

---

## 🔍 Troubleshooting

### Prometheus Not Scraping Targets

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# View Prometheus logs
docker-compose logs prometheus

# Verify service is exposing /metrics
curl http://localhost:3001/metrics
```

### Grafana Not Showing Data

```bash
# Check Grafana logs
docker-compose logs grafana

# Verify datasource connection
curl http://localhost:3000/api/datasources

# Test Prometheus from Grafana container
docker exec -it ecommerce-grafana curl http://prometheus:9090/api/v1/query?query=up
```

### cAdvisor Issues

```bash
# Check cAdvisor logs
docker-compose logs cadvisor

# Access cAdvisor UI
curl http://localhost:8080/containers/

# Verify metrics
curl http://localhost:8080/metrics
```

### Missing Metrics

**Problem**: Service metrics endpoint returns 404

**Solution**: Add metrics endpoint to your service (see Adding Metrics section)

---

## 📝 Adding Metrics to Services

### Install Prometheus Client

```bash
# For Node.js services
npm install prom-client
```

### Add Metrics Endpoint

```javascript
const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Custom Business Metrics

```javascript
// Counter for orders
const ordersTotal = new promClient.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'],
  registers: [register],
});

// Gauge for active sessions
const activeSessions = new promClient.Gauge({
  name: 'user_sessions_active',
  help: 'Number of active user sessions',
  registers: [register],
});

// Histogram for payment amounts
const paymentAmount = new promClient.Histogram({
  name: 'payment_amount_dollars',
  help: 'Distribution of payment amounts',
  buckets: [10, 50, 100, 500, 1000, 5000],
  registers: [register],
});
```

---

## 📚 Useful Prometheus Queries

### Service Discovery

```promql
# All available services
up

# Service-specific metrics
{job="user-service"}

# All HTTP metrics
http_requests_total
```

### Aggregations

```promql
# Total requests across all services
sum(rate(http_requests_total[5m]))

# Requests by service
sum by (service) (rate(http_requests_total[5m]))

# Average latency by endpoint
avg by (route) (rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]))
```

### Time Windows

```promql
# Last 5 minutes
rate(http_requests_total[5m])

# Last 1 hour
rate(http_requests_total[1h])

# Instant value
http_requests_total

# Range vector (for graphing)
rate(http_requests_total[5m])[1h:1m]
```

---

## 🎓 Best Practices

### Metric Naming

- Use `_total` suffix for counters
- Use `_seconds` for durations
- Use `_bytes` for sizes
- Use descriptive names: `http_request_duration_seconds` vs `latency`

### Labels

- Keep cardinality low (avoid user IDs, timestamps)
- Use consistent label names across services
- Common labels: `service`, `environment`, `method`, `status_code`

### Retention

- Prometheus: 15-30 days for detailed metrics
- Consider Thanos/Cortex for long-term storage
- Aggregate older data to reduce storage

### Performance

- Use recording rules for expensive queries
- Limit scrape intervals (15-60s is typical)
- Monitor Prometheus resource usage

---

## 🔗 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [Prometheus Exporters](https://prometheus.io/docs/instrumenting/exporters/)

---

## 📊 Monitoring Stack Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Grafana (Port 3000)                      │
│              Visualization & Dashboards                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Prometheus (Port 9090)                      │
│              Metrics Storage & Queries                       │
└─┬───────┬────────┬──────────┬────────────┬─────────────┬────┘
  │       │        │          │            │             │
  ▼       ▼        ▼          ▼            ▼             ▼
┌───┐   ┌───┐   ┌────┐   ┌──────┐   ┌─────────┐   ┌────────┐
│User│   │Prod│  │Order│  │Payment│  │Postgres │   │ Redis  │
│Svc │   │Svc │  │ Svc │  │  Svc  │  │Exporter │   │Exporter│
└───┘   └───┘   └────┘   └──────┘   └─────────┘   └────────┘
  │       │        │          │            │             │
  ▼       ▼        ▼          ▼            ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                   cAdvisor (Port 8080)                       │
│                  Container Metrics                           │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Prometheus UI accessible at http://localhost:9090
- [ ] Grafana UI accessible at http://localhost:3000
- [ ] All Prometheus targets showing "UP" status
- [ ] Grafana datasource connected successfully
- [ ] cAdvisor showing container metrics
- [ ] Postgres Exporter collecting DB metrics
- [ ] Redis Exporter collecting cache metrics
- [ ] Can create test dashboard in Grafana
- [ ] Metrics persisted after container restart

---

**Status**: ✅ Monitoring Stack Ready  
**Last Updated**: October 24, 2025  
**Version**: 1.0.0

For issues or questions, refer to the troubleshooting section or check service logs.
