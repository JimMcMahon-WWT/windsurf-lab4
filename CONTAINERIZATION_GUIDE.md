# Containerization & Orchestration Guide

## Overview

This document provides a comprehensive guide for containerizing and orchestrating the E-commerce microservices platform using Docker and Kubernetes.

## Table of Contents

- [Architecture](#architecture)
- [Docker Implementation](#docker-implementation)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring & Observability](#monitoring--observability)
- [Security Best Practices](#security-best-practices)
- [Production Considerations](#production-considerations)
- [Troubleshooting](#troubleshooting)

---

## Architecture

### Microservices Overview

| Service         | Port | Purpose                          | Dependencies                               |
| --------------- | ---- | -------------------------------- | ------------------------------------------ |
| User Service    | 3001 | Authentication & user management | PostgreSQL, Redis                          |
| Product Service | 3002 | Product catalog & search         | PostgreSQL, Redis, Elasticsearch, Kafka    |
| Order Service   | 3003 | Order processing                 | PostgreSQL, Redis, Kafka, Product, Payment |
| Payment Service | 3004 | Payment processing               | PostgreSQL, Redis, Stripe, PayPal          |

### Infrastructure Components

- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **Elasticsearch**: Product search and analytics
- **Kafka**: Event streaming and async communication
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **NGINX Ingress**: API Gateway and load balancing

---

## Docker Implementation

### Multi-Stage Dockerfiles

All services use optimized multi-stage builds:

#### Stage 1: Builder

- Base: `node:18-alpine`
- Installs all dependencies (including dev)
- Compiles TypeScript to JavaScript
- Optimizes build artifacts

#### Stage 2: Production

- Base: `node:18-alpine`
- Installs only production dependencies
- Copies compiled code from builder
- Runs as non-root user
- Includes health checks

### Key Features

#### Security

- **Non-root user**: All services run as user `nodejs` (UID 1001)
- **Minimal base image**: Alpine Linux reduces attack surface
- **No secrets in images**: Environment variables for sensitive data
- **Read-only filesystem**: Where possible

#### Optimization

- **Layer caching**: Package files copied before source code
- **Dependency pruning**: Only production dependencies in final image
- **dumb-init**: Proper signal handling for Node.js
- **Image size**: ~50-70MB per service

#### Health Checks

- **HTTP-based**: Checks `/health` endpoint
- **Configurable**: 30s interval, 10s timeout, 3 retries
- **Startup period**: 40s grace period for initialization

### Docker Compose

#### Local Development Setup

```yaml
# Key features:
- Health checks with depends_on conditions
- Resource limits (CPU and memory)
- Automatic restart policies
- Named volumes for data persistence
- Shared network for service communication
- Environment variable management
```

#### Resource Allocation (Local)

| Service           | CPU | Memory | Replicas |
| ----------------- | --- | ------ | -------- |
| PostgreSQL        | 1.0 | 1GB    | 1        |
| Redis             | 0.5 | 512MB  | 1        |
| Elasticsearch     | 1.0 | 2GB    | 1        |
| Kafka             | 1.0 | 1GB    | 1        |
| Each Microservice | 0.5 | 512MB  | 1        |

#### Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Clean up everything
docker-compose down -v
```

---

## Kubernetes Deployment

### Cluster Architecture

```
┌─────────────────────────────────────────────────┐
│                 NGINX Ingress                   │
│            (SSL Termination, Routing)           │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼────┐              ┌────▼────┐
   │ Service │              │ Service │
   │ Mesh    │              │ Mesh    │
   │ (Istio) │              │ (Istio) │
   └────┬────┘              └────┬────┘
        │                         │
   ┌────▼──────────────────┬─────▼─────┐
   │  User Service         │  Product   │
   │  (2-10 pods)          │  Service   │
   │                       │  (3-15     │
   │  Order Service        │   pods)    │
   │  (2-10 pods)          │            │
   │                       │  Payment   │
   │                       │  Service   │
   │                       │  (2-8 pods)│
   └───────────┬───────────┴────────────┘
               │
      ┌────────┴────────┐
      │                 │
 ┌────▼────┐      ┌────▼────┐
 │PostgreSQL│      │  Redis  │
 │ (StatefulSet)   │(StatefulSet)
 └─────────┘      └─────────┘
```

### Kubernetes Components

#### 1. Namespace

- **Name**: `ecommerce`
- **Labels**: environment, application
- **Purpose**: Resource isolation and organization

#### 2. ConfigMaps

- **Shared configuration**: Database hosts, service URLs
- **Non-sensitive data**: Ports, feature flags
- **Centralized management**: Single source of truth

#### 3. Secrets

- **Sensitive data**: Credentials, API keys
- **Encrypted at rest**: Kubernetes encryption
- **Injected as env vars**: No hardcoding
- **External management**: Integrate with Vault/AWS Secrets Manager

#### 4. Deployments

##### User Service

- **Replicas**: 2-10 (HPA controlled)
- **Strategy**: RollingUpdate (maxSurge: 1, maxUnavailable: 0)
- **Resources**: 256Mi-512Mi memory, 250m-500m CPU
- **Probes**: Liveness and readiness checks

##### Product Service

- **Replicas**: 3-15 (HPA controlled)
- **Higher scaling**: More traffic expected
- **Additional deps**: Elasticsearch, Kafka

##### Order Service

- **Replicas**: 2-10 (HPA controlled)
- **Dependencies**: Product, Payment services
- **State management**: PostgreSQL transactions

##### Payment Service

- **Replicas**: 2-8 (HPA controlled)
- **Critical service**: PCI compliance
- **External APIs**: Stripe, PayPal integration

#### 5. Services

- **Type**: ClusterIP (internal)
- **Port mapping**: Service port = container port
- **Selector**: Label-based pod selection
- **Session affinity**: None (stateless services)

#### 6. Ingress

- **Controller**: NGINX Ingress Controller
- **TLS/SSL**: cert-manager with Let's Encrypt
- **Path-based routing**: `/api/v1/{service}`
- **Rate limiting**: 100 req/s per IP
- **CORS**: Configured headers
- **Timeouts**: 60s read/send

#### 7. Horizontal Pod Autoscaling (HPA)

```yaml
Scaling Metrics:
  - CPU utilization: 70% target
  - Memory utilization: 80% target

Scaling Behavior:
  - Scale up: Fast (100% increase or 2-3 pods per 30s)
  - Scale down: Slow (50% decrease per 60s, 5min stabilization)
```

| Service | Min | Max | Scale Up Policy      | Scale Down Policy |
| ------- | --- | --- | -------------------- | ----------------- |
| User    | 2   | 10  | +100% or +2 pods/30s | -50%/60s          |
| Product | 3   | 15  | +100% or +3 pods/30s | -50%/60s          |
| Order   | 2   | 10  | +100% or +2 pods/30s | -50%/60s          |
| Payment | 2   | 8   | +100% or +2 pods/30s | -50%/60s          |

---

## Monitoring & Observability

### Prometheus Stack

#### Metrics Collection

- **Service discovery**: Kubernetes pods and services
- **Scrape interval**: 15s
- **Retention**: 15 days
- **Labels**: service, namespace, pod, environment

#### Key Metrics

- **Application metrics**: Request rate, latency, errors
- **System metrics**: CPU, memory, disk, network
- **Custom metrics**: Business KPIs, user actions

#### Alert Rules (Examples)

```yaml
- High error rate: >5% for 5 minutes
- High latency: p95 >500ms for 5 minutes
- Low availability: <99% for 10 minutes
- Pod restarts: >3 in 10 minutes
- Memory usage: >90% for 5 minutes
```

### Grafana Dashboards

#### Pre-configured Dashboards

1. **Service Overview**: All services health
2. **User Service**: Auth, sessions, user metrics
3. **Product Service**: Search, inventory, catalog
4. **Order Service**: Orders, payments, fulfillment
5. **Payment Service**: Transactions, fraud, processing
6. **Infrastructure**: Kubernetes cluster metrics

#### Access

- **URL**: https://grafana.ecommerce.example.com
- **Default creds**: admin/admin (change immediately)
- **SSO**: Configure OAuth/SAML for production

### Distributed Tracing (Optional)

#### Jaeger/Zipkin Integration

- **Trace propagation**: W3C Trace Context
- **Sampling**: 10% in production, 100% in dev
- **Storage**: Elasticsearch backend
- **Retention**: 7 days

### Logging

#### ELK Stack (Recommended)

- **Elasticsearch**: Log storage
- **Logstash/Fluentd**: Log aggregation
- **Kibana**: Log visualization

#### Log Structure

```json
{
  "timestamp": "2025-10-22T12:00:00Z",
  "service": "user-service",
  "level": "info",
  "message": "User logged in",
  "userId": "123",
  "traceId": "abc-def-ghi",
  "spanId": "xyz"
}
```

---

## Security Best Practices

### Container Security

1. **Image Scanning**
   - Scan for vulnerabilities (Trivy, Snyk)
   - Use trusted base images
   - Keep images updated

2. **Runtime Security**
   - Run as non-root user
   - Read-only root filesystem
   - Drop unnecessary capabilities
   - Use security contexts

3. **Network Security**
   - Network policies (deny-all default)
   - Service mesh (mTLS between services)
   - Egress filtering

### Kubernetes Security

1. **RBAC (Role-Based Access Control)**
   - Principle of least privilege
   - Service accounts per service
   - Namespace-scoped roles

2. **Pod Security Standards**
   - Restricted pod security policy
   - No privileged containers
   - No host network/PID/IPC

3. **Secrets Management**
   - External secrets operator
   - Vault integration
   - Secrets rotation

4. **Admission Controllers**
   - OPA (Open Policy Agent)
   - Image policy webhook
   - Resource validation

### API Security

1. **Authentication**
   - JWT tokens with rotation
   - OAuth2/OIDC integration
   - API key management

2. **Authorization**
   - Role-based access control
   - Attribute-based access control
   - Resource-level permissions

3. **Rate Limiting**
   - Per-IP rate limits
   - Per-user rate limits
   - API quotas

4. **TLS/SSL**
   - TLS 1.3 minimum
   - Strong cipher suites
   - Certificate rotation

---

## Production Considerations

### High Availability

1. **Multi-Zone Deployment**
   - Spread pods across AZs
   - Zone-aware scheduling
   - Cross-zone load balancing

2. **Pod Disruption Budgets**

   ```yaml
   minAvailable: 1 # For critical services
   maxUnavailable: 1 # For non-critical
   ```

3. **Database HA**
   - PostgreSQL replication
   - Redis Sentinel/Cluster
   - Managed services (RDS, ElastiCache)

### Disaster Recovery

1. **Backup Strategy**
   - Database: Daily automated backups
   - Kubernetes: Velero for cluster backup
   - Configuration: GitOps (ArgoCD/Flux)

2. **Recovery Procedures**
   - RTO: 1 hour
   - RPO: 15 minutes
   - Documented runbooks

### Performance Optimization

1. **Database**
   - Connection pooling
   - Query optimization
   - Indexing strategy
   - Read replicas

2. **Caching**
   - Redis for frequently accessed data
   - CDN for static assets
   - HTTP caching headers

3. **Async Processing**
   - Kafka for event streaming
   - Background jobs for heavy tasks
   - Queue-based architecture

### Cost Optimization

1. **Resource Right-Sizing**
   - Monitor actual usage
   - Adjust requests/limits
   - Use VPA (Vertical Pod Autoscaler)

2. **Spot Instances**
   - Use for non-critical workloads
   - Implement graceful shutdown
   - Node pool strategy

3. **Storage Optimization**
   - Use appropriate storage classes
   - Lifecycle policies
   - Compression

---

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n ecommerce

# Describe pod for events
kubectl describe pod <pod-name> -n ecommerce

# Check logs
kubectl logs <pod-name> -n ecommerce

# Common causes:
# - Image pull errors
# - Resource limits exceeded
# - ConfigMap/Secret missing
# - Health check failures
```

#### Service Communication Issues

```bash
# Check service endpoints
kubectl get endpoints -n ecommerce

# Test connectivity from another pod
kubectl run test --rm -it --image=curlimages/curl -n ecommerce -- sh
curl http://user-service:3001/health

# Common causes:
# - Service selector mismatch
# - Network policy blocking
# - DNS issues
# - Port configuration
```

#### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n ecommerce

# Increase memory limits
kubectl set resources deployment/<name> -n ecommerce --limits=memory=1Gi

# Common causes:
# - Memory leaks
# - Insufficient limits
# - Connection pool issues
# - Large payloads
```

#### Database Connection Issues

```bash
# Check database pod
kubectl get pods -n ecommerce | grep postgres

# Test connection
kubectl exec -it <app-pod> -n ecommerce -- sh
nc -zv postgres-service 5432

# Common causes:
# - Wrong credentials
# - Connection limit reached
# - Network policy
# - DNS resolution
```

### Debugging Commands

```bash
# Get all resources
kubectl get all -n ecommerce

# Describe resource
kubectl describe <resource-type> <resource-name> -n ecommerce

# View events
kubectl get events -n ecommerce --sort-by='.lastTimestamp'

# Execute commands in pod
kubectl exec -it <pod-name> -n ecommerce -- sh

# Port forward for testing
kubectl port-forward -n ecommerce svc/<service-name> 8080:3001

# View logs (tail)
kubectl logs -f <pod-name> -n ecommerce

# View previous logs (crashed pod)
kubectl logs <pod-name> -n ecommerce --previous
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All Docker images built and pushed
- [ ] Secrets created and validated
- [ ] DNS records configured
- [ ] SSL certificates obtained
- [ ] Database migrations ready
- [ ] Monitoring configured
- [ ] Backup strategy in place

### Deployment

- [ ] Create namespace
- [ ] Apply ConfigMaps
- [ ] Apply Secrets
- [ ] Deploy infrastructure (DB, Redis, etc.)
- [ ] Deploy services
- [ ] Configure Ingress
- [ ] Enable HPA
- [ ] Deploy monitoring

### Post-Deployment

- [ ] Verify all pods running
- [ ] Test API endpoints
- [ ] Check monitoring dashboards
- [ ] Verify logs flowing
- [ ] Test autoscaling
- [ ] Run smoke tests
- [ ] Document any issues

---

## Additional Resources

### Documentation

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

### Tools

- **kubectl**: Kubernetes CLI
- **helm**: Kubernetes package manager
- **k9s**: Kubernetes TUI
- **stern**: Multi-pod log tailing
- **kubectx/kubens**: Context/namespace switching

### Best Practices

- [12-Factor App](https://12factor.net/)
- [Cloud Native Trail Map](https://github.com/cncf/trailmap)
- [Kubernetes Best Practices](https://learnk8s.io/production-best-practices)
- [Container Security Guide](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)

---

## Support & Maintenance

### Monitoring Alerts

- Set up PagerDuty/Opsgenie integration
- Define on-call rotation
- Document incident response procedures

### Regular Maintenance

- **Weekly**: Review resource usage, check for updates
- **Monthly**: Security patches, dependency updates
- **Quarterly**: Disaster recovery drills, capacity planning

### Upgrades

- **Kubernetes**: Minor version every 6 months
- **Services**: CI/CD automated deployments
- **Dependencies**: Security patches within 7 days
