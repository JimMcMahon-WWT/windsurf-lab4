# Deployment and Scaling Guide

## Overview

Comprehensive deployment strategy from local development to production, with horizontal scaling and auto-recovery capabilities.

---

## 1. Local Development (Docker Compose)

### Quick Start

```bash
# Clone and start
git clone https://github.com/yourorg/ecommerce.git
cd ecommerce
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Key Services Configuration

**Infrastructure Stack:**
- PostgreSQL (port 5432) - Primary database
- Redis (port 6379) - Cache and cart storage
- Kafka (port 9092) - Event bus
- Elasticsearch (port 9200) - Search engine
- Prometheus (port 9090) - Metrics
- Grafana (port 3000) - Dashboards

**Microservices:**
- API Gateway (port 8000)
- User Service (port 3001)
- Product Service (port 3002)
- Cart Service (port 3003)
- Order Service (port 3004)
- Payment Service (port 3005)
- Inventory Service (port 3006)
- Notification Service (port 3007)
- Search Service (port 3008)

---

## 2. Production Kubernetes Deployment

### Namespace Structure

```yaml
# Create namespaces
kubectl create namespace ecommerce-prod
kubectl create namespace ecommerce-staging
kubectl create namespace monitoring
```

### Deploy Services

```bash
# Deploy infrastructure
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/redis/
kubectl apply -f k8s/kafka/
kubectl apply -f k8s/elasticsearch/

# Deploy microservices
kubectl apply -f k8s/services/

# Deploy monitoring
kubectl apply -f k8s/monitoring/
```

### Example Service Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: ecommerce-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: registry/user-service:latest
        ports:
        - containerPort: 3001
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
  - port: 3001
  type: ClusterIP
```

---

## 3. Horizontal Auto-Scaling

### HPA Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Scaling Targets by Service

| Service | Min | Max | CPU Target | Memory Target |
|---------|-----|-----|------------|---------------|
| User | 2 | 5 | 70% | 80% |
| Product | 3 | 10 | 70% | 80% |
| Cart | 2 | 8 | 60% | 75% |
| Order | 2 | 5 | 70% | 80% |
| Payment | 2 | 4 | 75% | 85% |
| Inventory | 2 | 5 | 70% | 80% |
| Notification | 2 | 5 | 60% | 70% |
| Search | 2 | 5 | 60% | 80% |

---

## 4. CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run tests
        run: npm test
      
      - name: Build Docker image
        run: docker build -t registry/service:${{ github.sha }} .
      
      - name: Push image
        run: docker push registry/service:${{ github.sha }}
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to K8s
        run: |
          kubectl set image deployment/service \
            service=registry/service:${{ github.sha }}
          kubectl rollout status deployment/service
```

---

## 5. Load Balancing & Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.yourcompany.com
    secretName: tls-secret
  rules:
  - host: api.yourcompany.com
    http:
      paths:
      - path: /api/users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 3001
      - path: /api/products
        pathType: Prefix
        backend:
          service:
            name: product-service
            port:
              number: 3002
```

---

## 6. Monitoring & Alerts

### Prometheus Alerts

```yaml
groups:
- name: microservices
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Error rate > 5%"
  
  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "P95 latency > 1s"
  
  - alert: PodCrashLooping
    expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
    labels:
      severity: critical
```

---

## 7. Database Scaling

### PostgreSQL Read Replicas

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-read
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_REPLICATION_MODE
          value: "replica"
```

### Redis Cluster

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis
  replicas: 6
  template:
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command: ["redis-server", "/conf/redis.conf"]
```

---

## 8. Deployment Strategies

### Blue-Green Deployment

1. Deploy green version alongside blue
2. Test green version
3. Switch traffic to green
4. Keep blue for rollback

### Canary Deployment

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
spec:
  http:
  - route:
    - destination:
        host: user-service
        subset: v1
      weight: 90
    - destination:
        host: user-service
        subset: v2
      weight: 10  # 10% traffic to new version
```

---

## 9. Disaster Recovery

### Backup Strategy

```bash
# Daily PostgreSQL backups
0 2 * * * pg_dump -h postgres -U postgres -d user_db | gzip > /backup/user_db_$(date +\%Y\%m\%d).sql.gz

# Upload to S3
aws s3 cp /backup/user_db_$(date +\%Y\%m\%d).sql.gz s3://backups/postgres/
```

### Restore Procedure

```bash
# Download backup
aws s3 cp s3://backups/postgres/user_db_20241015.sql.gz .

# Restore
gunzip user_db_20241015.sql.gz
psql -h localhost -U postgres -d user_db < user_db_20241015.sql
```

**Retention:**
- Daily backups: 30 days
- Weekly backups: 1 year
- Monthly backups: 7 years

---

## 10. Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Database migrations ready
- [ ] Secrets configured
- [ ] Load testing complete
- [ ] Rollback plan ready

### During Deployment
- [ ] Health checks passing
- [ ] Gradual traffic shift
- [ ] Monitor errors/latency
- [ ] Check resource usage

### Post-Deployment
- [ ] All services healthy
- [ ] E2E tests passing
- [ ] Metrics within SLA
- [ ] Logs reviewed
- [ ] Backups completed

---

## Resource Requirements (Production)

### Cluster Sizing

**10K Concurrent Users:**
- Worker Nodes: 6x (4 CPU, 16GB RAM)
- Total: 24 CPU, 96GB RAM

**Service Allocation:**
| Component | Instances | CPU/instance | Memory/instance |
|-----------|-----------|--------------|-----------------|
| API Gateway | 2 | 1 CPU | 1GB |
| User Service | 3 | 0.5 CPU | 512MB |
| Product Service | 5 | 0.5 CPU | 512MB |
| Cart Service | 3 | 0.25 CPU | 256MB |
| Order Service | 3 | 1 CPU | 1GB |
| Payment Service | 2 | 1 CPU | 1GB |
| Inventory Service | 3 | 0.5 CPU | 512MB |
| Notification Service | 2 | 0.25 CPU | 256MB |
| Search Service | 2 | 1 CPU | 2GB |
| PostgreSQL | 3 | 2 CPU | 4GB |
| Redis | 3 | 0.5 CPU | 2GB |
| Kafka | 3 | 1 CPU | 2GB |
| Elasticsearch | 3 | 1 CPU | 4GB |

---

## Performance Tuning

### Database Connection Pooling

```javascript
const pool = new Pool({
  max: 20,              // Max connections
  min: 5,               // Min connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 10000,
});
```

### Redis Optimization

```javascript
// Use pipelining for bulk operations
const pipeline = redis.pipeline();
for (let i = 0; i < 1000; i++) {
  pipeline.set(`key:${i}`, `value:${i}`);
}
await pipeline.exec();
```

### Kafka Tuning

```javascript
const producer = kafka.producer({
  compression: CompressionTypes.GZIP,
  batch: { size: 16384, lingerMs: 10 },
  idempotent: true,
});
```

---

## Cost Estimation (AWS, Monthly)

| Component | Configuration | Cost |
|-----------|---------------|------|
| EKS Cluster | 6 t3.xlarge nodes | $450 |
| RDS PostgreSQL | db.t3.large (3) | $270 |
| ElastiCache Redis | cache.t3.medium (3) | $135 |
| Elasticsearch | t3.large (3) | $300 |
| MSK (Kafka) | kafka.t3.small (3) | $150 |
| Load Balancer | ALB | $25 |
| S3 | 200GB storage | $5 |
| CloudWatch | Logs/monitoring | $50 |
| Data Transfer | 1TB/month | $90 |
| **Total** | | **~$1,475/month** |

**Cost Optimization:**
- Use spot instances (50% savings)
- Reserved instances (40% savings)
- Auto-scale to minimum off-peak
- CDN for static assets

---

## Security Best Practices

1. **Network Policies**: Restrict inter-service communication
2. **RBAC**: Role-based access control for K8s
3. **Secrets Management**: Use external secrets manager
4. **TLS**: Enforce HTTPS everywhere
5. **Security Scanning**: Regular vulnerability scans
6. **Rate Limiting**: Prevent abuse
7. **WAF**: Web Application Firewall
8. **Pod Security**: Non-root containers, read-only filesystems

---

For more details, see:
- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
- [Service Definitions](./SERVICE_DEFINITIONS.md)
- [Technology Stack](./TECHNOLOGY_STACK.md)
