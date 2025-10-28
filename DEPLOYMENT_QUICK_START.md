# Deployment Quick Start Guide

## TL;DR - Get Running Fast

### Local Development with Docker Compose

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

**Access Services:**

- User Service: http://localhost:3001
- Product Service: http://localhost:3002
- Order Service: http://localhost:3003
- Payment Service: http://localhost:3004
- Grafana: http://localhost:5601
- Elasticsearch: http://localhost:9200

---

### Kubernetes Production Deployment

#### Prerequisites

```bash
# Install kubectl
curl -LO https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl

# Install helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

#### Deploy Everything

**Linux/Mac:**

```bash
cd k8s
chmod +x deploy.sh
./deploy.sh all
```

**Windows PowerShell:**

```powershell
cd k8s
.\deploy.ps1 -Action all
```

#### Verify Deployment

```bash
kubectl get pods -n ecommerce
kubectl get services -n ecommerce
kubectl get ingress -n ecommerce
```

---

## Common Commands

### Docker

```bash
# Build services
docker-compose build

# Rebuild specific service
docker-compose build user-service

# View service logs
docker-compose logs -f user-service

# Restart service
docker-compose restart user-service

# Clean everything
docker-compose down -v --rmi all
```

### Kubernetes

```bash
# Get pod status
kubectl get pods -n ecommerce

# View pod logs
kubectl logs -f <pod-name> -n ecommerce

# Describe pod
kubectl describe pod <pod-name> -n ecommerce

# Execute command in pod
kubectl exec -it <pod-name> -n ecommerce -- sh

# Port forward
kubectl port-forward -n ecommerce svc/user-service 3001:3001

# Scale deployment
kubectl scale deployment user-service --replicas=5 -n ecommerce

# Update image
kubectl set image deployment/user-service user-service=myregistry/user-service:v2 -n ecommerce

# Rollback deployment
kubectl rollout undo deployment/user-service -n ecommerce

# Delete everything
kubectl delete namespace ecommerce
```

---

## Architecture Summary

```
                        ┌─────────────┐
                        │   Ingress   │
                        │  (SSL/TLS)  │
                        └──────┬──────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼────┐          ┌─────▼─────┐          ┌────▼────┐
   │  User   │          │  Product  │          │  Order  │
   │ Service │◄────────►│  Service  │◄────────►│ Service │
   │ (3001)  │          │  (3002)   │          │ (3003)  │
   └────┬────┘          └─────┬─────┘          └────┬────┘
        │                     │                      │
        │              ┌──────▼──────┐              │
        │              │   Payment   │              │
        │              │   Service   │              │
        │              │   (3004)    │              │
        │              └──────┬──────┘              │
        │                     │                      │
        └─────────────┬───────┴──────────┬──────────┘
                      │                  │
              ┌───────▼────────┐  ┌─────▼─────┐
              │   PostgreSQL   │  │   Redis   │
              └────────────────┘  └───────────┘
```

---

## Service Ports

| Service         | Port | Protocol | Purpose               |
| --------------- | ---- | -------- | --------------------- |
| User Service    | 3001 | HTTP     | Authentication, Users |
| Product Service | 3002 | HTTP     | Products, Catalog     |
| Order Service   | 3003 | HTTP     | Orders, Cart          |
| Payment Service | 3004 | HTTP     | Payments, Billing     |
| PostgreSQL      | 5432 | TCP      | Database              |
| Redis           | 6379 | TCP      | Cache                 |
| Elasticsearch   | 9200 | HTTP     | Search                |
| Kafka           | 9092 | TCP      | Events                |
| Prometheus      | 9090 | HTTP     | Metrics               |
| Grafana         | 3000 | HTTP     | Dashboards            |

---

## Environment Variables

### Required for All Services

```
NODE_ENV=production
PORT=<service-port>
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ecommerce
DB_USER=postgres
DB_PASSWORD=<secret>
REDIS_HOST=redis
REDIS_PORT=6379
```

### User Service Specific

```
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
```

### Product Service Specific

```
ELASTICSEARCH_NODE=http://elasticsearch:9200
KAFKA_BROKERS=kafka:9092
```

### Payment Service Specific

```
STRIPE_SECRET_KEY=<secret>
STRIPE_PUBLISHABLE_KEY=<secret>
STRIPE_WEBHOOK_SECRET=<secret>
PAYPAL_CLIENT_ID=<secret>
PAYPAL_CLIENT_SECRET=<secret>
PAYPAL_MODE=sandbox
ENCRYPTION_KEY=<secret>
```

---

## Health Check Endpoints

All services expose a `/health` endpoint:

```bash
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Product Service
curl http://localhost:3003/health  # Order Service
curl http://localhost:3004/health  # Payment Service
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T12:00:00Z",
  "service": "user-service",
  "version": "1.0.0"
}
```

---

## Monitoring URLs

### Local (Docker Compose)

- **Kibana**: http://localhost:5601
- **Grafana**: http://localhost:3000 (admin/admin)

### Kubernetes

- **Prometheus**: http://prometheus.ecommerce.example.com
- **Grafana**: http://grafana.ecommerce.example.com
- **Kibana**: http://kibana.ecommerce.example.com

---

## Troubleshooting Quick Fixes

### Service won't start

```bash
# Check logs
docker-compose logs <service-name>
# or
kubectl logs <pod-name> -n ecommerce

# Common issues:
# 1. Database not ready → Wait longer
# 2. Port already in use → Change port or kill process
# 3. Missing env vars → Check .env file
```

### Can't connect to database

```bash
# Test connection
docker-compose exec user-service nc -zv postgres 5432
# or
kubectl exec -it <pod> -n ecommerce -- nc -zv postgres-service 5432

# Common issues:
# 1. Wrong host → Use service name
# 2. Wrong credentials → Check secrets
# 3. Network issue → Check network policies
```

### High memory usage

```bash
# Check usage
docker stats
# or
kubectl top pods -n ecommerce

# Solutions:
# 1. Increase limits
# 2. Check for memory leaks
# 3. Restart service
```

### Slow performance

```bash
# Check if Redis is working
redis-cli ping

# Check database connections
# Check if Kafka is processing events

# Solutions:
# 1. Enable caching
# 2. Add database indexes
# 3. Scale horizontally
```

---

## Scaling

### Docker Compose (Limited)

```bash
docker-compose up -d --scale product-service=3
```

### Kubernetes (Automatic)

```bash
# Manual scaling
kubectl scale deployment product-service --replicas=5 -n ecommerce

# Autoscaling (HPA already configured)
kubectl get hpa -n ecommerce
```

---

## Backup & Restore

### Database Backup

```bash
# Docker Compose
docker-compose exec postgres pg_dump -U postgres ecommerce > backup.sql

# Kubernetes
kubectl exec -it postgres-0 -n ecommerce -- pg_dump -U postgres ecommerce > backup.sql
```

### Database Restore

```bash
# Docker Compose
docker-compose exec -T postgres psql -U postgres ecommerce < backup.sql

# Kubernetes
kubectl exec -i postgres-0 -n ecommerce -- psql -U postgres ecommerce < backup.sql
```

---

## Security Checklist

- [ ] Change default passwords
- [ ] Use secrets management (Vault, AWS Secrets Manager)
- [ ] Enable TLS/SSL everywhere
- [ ] Configure network policies
- [ ] Enable pod security policies
- [ ] Set up RBAC properly
- [ ] Enable audit logging
- [ ] Scan images for vulnerabilities
- [ ] Rotate credentials regularly
- [ ] Enable monitoring and alerting

---

## Performance Tuning

### Database

- Connection pooling: 10-20 connections per service
- Indexes on frequently queried columns
- Regular VACUUM and ANALYZE

### Redis

- Use appropriate eviction policy
- Monitor memory usage
- Use clustering for high load

### Services

- Enable compression
- Use connection pooling
- Implement circuit breakers
- Add caching layers

---

## Cost Optimization Tips

1. **Use autoscaling** - Scale down during low traffic
2. **Right-size resources** - Don't over-provision
3. **Use spot instances** - For non-critical workloads
4. **Implement caching** - Reduce database load
5. **Use CDN** - Offload static assets
6. **Monitor unused resources** - Clean up regularly

---

## Support

### Get Help

```bash
# View all documentation
ls -la docs/

# Check logs for errors
docker-compose logs | grep ERROR
kubectl logs -n ecommerce --all-containers=true | grep ERROR

# Community support
# - Stack Overflow
# - Kubernetes Slack
# - GitHub Issues
```

### Report Issues

1. Collect logs
2. Document steps to reproduce
3. Include environment details
4. Check existing issues first

---

## Next Steps

1. ✅ **Services Running** - Verify all services healthy
2. ⬜ **Load Testing** - Test with realistic traffic
3. ⬜ **Security Audit** - Run security scans
4. ⬜ **Documentation** - Update team docs
5. ⬜ **Monitoring** - Configure alerts
6. ⬜ **CI/CD** - Automate deployments
7. ⬜ **Backup Strategy** - Test disaster recovery
8. ⬜ **Performance Tuning** - Optimize based on metrics

---

**For detailed information, see:**

- `CONTAINERIZATION_GUIDE.md` - Comprehensive guide
- `k8s/README.md` - Kubernetes deployment details
- `docker-compose.yml` - Local development setup
