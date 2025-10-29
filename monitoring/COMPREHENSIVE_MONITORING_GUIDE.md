# Comprehensive Monitoring & Observability Guide

Complete implementation guide for monitoring, logging, tracing, and observability across the e-commerce microservices platform.

---

## 📊 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      OBSERVABILITY STACK                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  METRICS    │  │   LOGGING   │  │   TRACING   │             │
│  │ (Prometheus)│  │    (ELK)    │  │  (Jaeger)   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                      │
│         └────────────────┴────────────────┘                      │
│                          │                                        │
│                   ┌──────▼───────┐                               │
│                   │   GRAFANA    │                               │
│                   │ (Unified UI) │                               │
│                   └──────────────┘                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Start Complete Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Check status
docker-compose -f monitoring/docker-compose.monitoring.yml ps

# View logs
docker-compose -f monitoring/docker-compose.monitoring.yml logs -f
```

### 2. Access Dashboards

| Service          | URL                    | Credentials |
| ---------------- | ---------------------- | ----------- |
| **Grafana**      | http://localhost:3000  | admin/admin |
| **Prometheus**   | http://localhost:9090  | -           |
| **Jaeger UI**    | http://localhost:16686 | -           |
| **Kibana**       | http://localhost:5601  | -           |
| **Alertmanager** | http://localhost:9093  | -           |
| **cAdvisor**     | http://localhost:8080  | -           |

### 3. Verify Services

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Check Jaeger health
curl http://localhost:14269/

# Test Logstash
echo '{"level":"info","message":"test"}' | nc localhost 5000
```

---

## 📈 Metrics Collection (Prometheus)

### Service Instrumentation

Install Prometheus client in your services:

```bash
npm install prom-client
```

### Basic Metrics Setup

```javascript
// src/config/metrics.ts
import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// HTTP request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Business metrics
export const ordersTotal = new Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'],
  registers: [register],
});

export const activeUsers = new Gauge({
  name: 'active_users_count',
  help: 'Number of currently active users',
  registers: [register],
});

export const paymentAmount = new Histogram({
  name: 'payment_amount_dollars',
  help: 'Distribution of payment amounts',
  labelNames: ['method', 'status'],
  buckets: [10, 50, 100, 500, 1000, 5000],
  registers: [register],
});
```

### Metrics Middleware

```javascript
// src/middlewares/metrics.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal } from '../config/metrics';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);

    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });

  next();
};
```

### Metrics Endpoint

```javascript
// In your app.ts or index.ts
import { register } from './config/metrics';
import { metricsMiddleware } from './middlewares/metrics.middleware';

// Apply metrics middleware
app.use(metricsMiddleware);

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## 📝 Centralized Logging (ELK Stack)

### Structured Logging Setup

Install Winston for structured logging:

```bash
npm install winston
```

### Logger Configuration

```javascript
// src/config/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'unknown-service',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),

    // Send to Logstash
    new winston.transports.Http({
      host: 'localhost',
      port: 5000,
      path: '/',
      ssl: false,
    }),
  ],
});

export default logger;
```

### Logging Best Practices

```javascript
// Structured logging with context
logger.info('Order created', {
  order_id: order.id,
  user_id: user.id,
  amount: order.total,
  items_count: order.items.length,
  duration_ms: processingTime,
});

// Error logging with stack traces
try {
  await processPayment(paymentData);
} catch (error) {
  logger.error('Payment processing failed', {
    error: error.message,
    stack: error.stack,
    payment_id: paymentData.id,
    user_id: paymentData.userId,
  });
}

// Security audit logging
logger.warn('Authentication failed', {
  audit: true,
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
  attempted_email: req.body.email,
});
```

---

## 🔍 Distributed Tracing (Jaeger)

### Install OpenTelemetry

```bash
npm install @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/exporter-jaeger
```

### Tracing Setup

```javascript
// src/config/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const jaegerExporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'unknown-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
  }),
  traceExporter: jaegerExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.error('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export default sdk;
```

### Initialize Tracing

```javascript
// In your index.ts (BEFORE importing other modules)
import './config/tracing'; // Must be first
import express from 'express';
// ... rest of imports
```

### Custom Spans

```javascript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service');

async function processOrder(orderData) {
  const span = tracer.startSpan('processOrder');

  try {
    span.setAttribute('order.id', orderData.id);
    span.setAttribute('order.total', orderData.total);

    // Your business logic
    const result = await createOrder(orderData);

    span.setStatus({ code: 0 }); // Success
    return result;
  } catch (error) {
    span.setStatus({ code: 2, message: error.message }); // Error
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

---

## 🎯 SLA/SLO Tracking

### Define SLOs

```yaml
# monitoring/slos.yml
slos:
  - name: api_availability
    description: 'API should be available 99.9% of the time'
    target: 0.999
    window: 30d
    query: |
      sum(rate(http_requests_total{status=~"2..|3.."}[30d]))
      /
      sum(rate(http_requests_total[30d]))

  - name: api_latency
    description: '95% of requests should complete within 500ms'
    target: 0.95
    threshold: 0.5
    window: 24h
    query: |
      histogram_quantile(0.95, 
        rate(http_request_duration_seconds_bucket[24h])
      ) < 0.5

  - name: error_rate
    description: 'Error rate should be below 0.1%'
    target: 0.999
    window: 24h
    query: |
      1 - (
        sum(rate(http_requests_total{status=~"5.."}[24h]))
        /
        sum(rate(http_requests_total[24h]))
      )
```

### SLO Dashboard Panels

Create Grafana panels with these queries:

```promql
# Availability SLI
(
  sum(rate(http_requests_total{status=~"2..|3.."}[24h]))
  /
  sum(rate(http_requests_total[24h]))
) * 100

# Error Budget Remaining
(1 - (
  (sum(rate(http_requests_total{status=~"5.."}[30d])) / sum(rate(http_requests_total[30d])))
  /
  (1 - 0.999)
)) * 100

# Latency SLI
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[24h])) * 1000
```

---

## 📊 Custom Business Metrics

### Tracking Business KPIs

```javascript
// Track order lifecycle
ordersTotal.labels('created').inc();
ordersTotal.labels('completed').inc();
ordersTotal.labels('cancelled').inc();

// Track revenue
paymentAmount.labels('credit_card', 'success').observe(orderTotal);

// Track active sessions
activeUsers.set(getUserSessionCount());

// Track inventory
const inventoryGauge = new Gauge({
  name: 'product_inventory_level',
  help: 'Current inventory level by product',
  labelNames: ['product_id', 'sku'],
  registers: [register],
});

inventoryGauge.labels(productId, sku).set(inventoryCount);
```

---

## 🚨 Alerting Configuration

### Alert Severity Levels

| Severity     | Response Time | Escalation        |
| ------------ | ------------- | ----------------- |
| **Critical** | Immediate     | PagerDuty + Email |
| **Warning**  | 15 minutes    | Email + Slack     |
| **Info**     | Best effort   | Slack only        |

### Key Alerts Configured

1. **Service Availability**
   - ServiceDown: Service unreachable for 1 minute
   - HighErrorRate: Error rate > 5% for 5 minutes

2. **Performance**
   - HighLatency: p95 latency > 1s for 5 minutes
   - HighCPUUsage: CPU > 80% for 10 minutes
   - HighMemoryUsage: Memory > 90% for 5 minutes

3. **Database**
   - PostgreSQLDown: Database unreachable
   - HighConnections: > 80% of max connections
   - SlowQueries: Avg query time > 1000ms

4. **Business**
   - OrderProcessingStalled: No orders for 10 minutes
   - HighPaymentFailureRate: > 10% failures
   - ErrorBudgetBurning: SLO violation

---

## 💰 Cost Optimization

### Resource Monitoring

```promql
# Container cost estimation (CPU hours)
sum(rate(container_cpu_usage_seconds_total[24h])) * 24

# Memory cost estimation
sum(avg_over_time(container_memory_usage_bytes[24h])) / 1024 / 1024 / 1024

# Storage cost
sum(node_filesystem_size_bytes - node_filesystem_avail_bytes) / 1024 / 1024 / 1024
```

### Optimization Recommendations

1. **Right-size Containers**
   - Monitor actual vs allocated resources
   - Adjust CPU/memory limits based on p95 usage
   - Use horizontal scaling for traffic spikes

2. **Database Optimization**
   - Monitor slow queries
   - Track cache hit ratios
   - Optimize connection pooling

3. **Cache Efficiency**
   - Track Redis memory usage
   - Monitor hit/miss ratios
   - Implement cache eviction policies

---

## 📈 Capacity Planning

### Growth Projections

```promql
# Request growth rate (7-day trend)
predict_linear(http_requests_total[7d], 86400 * 30)

# Memory growth
predict_linear(container_memory_usage_bytes[7d], 86400 * 30)

# Database growth
predict_linear(pg_database_size_bytes[7d], 86400 * 30)
```

### Capacity Alerts

```yaml
- alert: CapacityProjection
  expr: predict_linear(http_requests_total[7d], 86400 * 30) > current_capacity * 0.8
  for: 1h
  annotations:
    summary: 'Projected to reach 80% capacity in 30 days'
```

---

## 🔒 Security Monitoring

### Security Metrics

```javascript
// Track authentication attempts
const authAttempts = new Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['result', 'method'],
  registers: [register],
});

authAttempts.labels('success', 'password').inc();
authAttempts.labels('failure', 'password').inc();

// Track rate limit violations
const rateLimitExceeded = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total rate limit violations',
  labelNames: ['endpoint', 'ip'],
  registers: [register],
});
```

### Security Audit Logs

```javascript
// Log security events
logger.warn('Suspicious activity detected', {
  audit: true,
  security: true,
  event_type: 'brute_force_attempt',
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
  failed_attempts: failedAttemptCount,
});
```

---

## 📚 Dashboard Recommendations

### Pre-built Dashboards to Import

Import these Grafana dashboards by ID:

1. **Docker Monitoring**: 193
2. **PostgreSQL Database**: 9628
3. **Redis**: 11835
4. **Node Exporter**: 1860
5. **cAdvisor**: 14282
6. **Jaeger**: 10001

### Custom Dashboards

1. **Service Overview**
   - Request rate, latency, errors (RED metrics)
   - Service health and uptime
   - Resource usage per service

2. **Business Metrics**
   - Orders per minute
   - Revenue tracking
   - Payment success rates
   - Active users

3. **SLA/SLO Dashboard**
   - Availability percentage
   - Error budget remaining
   - Latency SLIs
   - SLO compliance history

4. **Infrastructure Health**
   - Container resource usage
   - Database performance
   - Cache efficiency
   - Network metrics

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] All services exposing `/metrics` endpoint
- [ ] Prometheus scraping all targets successfully
- [ ] Logs flowing to Elasticsearch via Logstash
- [ ] Kibana showing application logs
- [ ] Jaeger receiving traces from services
- [ ] Grafana dashboards displaying metrics
- [ ] Alerts triggering correctly
- [ ] AlertManager routing notifications
- [ ] Health checks passing for all monitoring services

---

## 🔧 Troubleshooting

### Common Issues

**Prometheus not scraping services:**

```bash
# Check service metrics endpoint
curl http://localhost:3001/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq
```

**Logs not appearing in Kibana:**

```bash
# Test Logstash
echo '{"message":"test"}' | nc localhost 5000

# Check Elasticsearch indices
curl http://localhost:9200/_cat/indices

# Check Logstash logs
docker logs ecommerce-logstash
```

**Traces not in Jaeger:**

```bash
# Check Jaeger health
curl http://localhost:14269/

# Verify service instrumentation
# Ensure tracing.ts is imported FIRST in index.ts
```

---

## 📖 Additional Resources

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Documentation](https://grafana.com/docs/)
- [ELK Stack Guide](https://www.elastic.co/guide/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [SLO Best Practices](https://sre.google/workbook/implementing-slos/)

---

**Status**: ✅ Comprehensive Monitoring Stack Ready
**Last Updated**: October 29, 2025
**Version**: 2.0.0

For questions or issues, refer to the troubleshooting section or check service logs.
