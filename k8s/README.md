# Kubernetes Deployment Guide

## Overview

This directory contains Kubernetes manifests for deploying the E-commerce microservices platform.

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Docker registry access
- Helm 3+ (for cert-manager)
- NGINX Ingress Controller
- Metrics Server (for HPA)

## Directory Structure

```
k8s/
├── namespace.yaml              # Namespace definition
├── configmap.yaml             # Shared configuration
├── secrets.yaml               # Secrets (template)
├── user-service.yaml          # User service deployment
├── product-service.yaml       # Product service deployment
├── order-service.yaml         # Order service deployment
├── payment-service.yaml       # Payment service deployment
├── ingress.yaml               # Ingress configuration
├── hpa.yaml                   # Horizontal Pod Autoscalers
└── monitoring/
    ├── prometheus-config.yaml # Prometheus setup
    └── grafana.yaml          # Grafana setup
```

## Quick Start

### 1. Build and Push Docker Images

```bash
# Build all images
docker-compose build

# Tag and push to registry
docker tag ecommerce/user-service:latest your-registry/user-service:v1.0.0
docker tag ecommerce/product-service:latest your-registry/product-service:v1.0.0
docker tag ecommerce/order-service:latest your-registry/order-service:v1.0.0
docker tag ecommerce/payment-service:latest your-registry/payment-service:v1.0.0

docker push your-registry/user-service:v1.0.0
docker push your-registry/product-service:v1.0.0
docker push your-registry/order-service:v1.0.0
docker push your-registry/payment-service:v1.0.0
```

### 2. Install Prerequisites

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install Metrics Server for HPA
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 3. Create Secrets

```bash
# Update secrets.yaml with actual values
# DO NOT commit secrets to version control

# Create secrets in Kubernetes
kubectl apply -f secrets.yaml
```

### 4. Deploy Infrastructure

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Apply ConfigMaps
kubectl apply -f configmap.yaml

# Deploy infrastructure (if not using external services)
# Note: For production, use managed services (RDS, ElastiCache, etc.)
```

### 5. Deploy Services

```bash
# Deploy all services
kubectl apply -f user-service.yaml
kubectl apply -f product-service.yaml
kubectl apply -f order-service.yaml
kubectl apply -f payment-service.yaml

# Verify deployments
kubectl get pods -n ecommerce
kubectl get services -n ecommerce
```

### 6. Configure Ingress

```bash
# Update ingress.yaml with your domain
# Apply ingress
kubectl apply -f ingress.yaml

# Verify ingress
kubectl get ingress -n ecommerce
```

### 7. Enable Autoscaling

```bash
# Apply HPA configurations
kubectl apply -f hpa.yaml

# Verify HPA
kubectl get hpa -n ecommerce
```

### 8. Deploy Monitoring

```bash
# Deploy Prometheus
kubectl apply -f monitoring/prometheus-config.yaml

# Deploy Grafana
kubectl apply -f monitoring/grafana.yaml

# Access Grafana (port-forward for testing)
kubectl port-forward -n ecommerce svc/grafana 3000:3000
# Open http://localhost:3000 (admin/admin)
```

## Production Considerations

### Security

1. **Update Secrets**: Replace all placeholder secrets in `secrets.yaml`
2. **Use External Secrets**: Consider using AWS Secrets Manager, HashiCorp Vault, or Sealed Secrets
3. **Network Policies**: Implement network policies to restrict pod-to-pod communication
4. **Pod Security Standards**: Enable pod security admission
5. **RBAC**: Implement role-based access control

### High Availability

1. **Multi-zone Deployment**: Spread replicas across availability zones
2. **Pod Disruption Budgets**: Define PDBs for critical services
3. **Resource Quotas**: Set namespace resource quotas
4. **Priority Classes**: Define priority classes for critical workloads

### Monitoring & Logging

1. **Prometheus**: Metrics collection and alerting
2. **Grafana**: Visualization dashboards
3. **ELK Stack**: Centralized logging
4. **Jaeger/Zipkin**: Distributed tracing
5. **Alert Manager**: Alert routing and management

### Backup & Disaster Recovery

1. **Database Backups**: Regular automated backups
2. **Velero**: Kubernetes backup solution
3. **GitOps**: Infrastructure as code with ArgoCD/Flux
4. **Disaster Recovery Plan**: Document recovery procedures

## Resource Allocation

### Development Environment
- User Service: 2 replicas, 256Mi-512Mi memory
- Product Service: 3 replicas, 256Mi-512Mi memory
- Order Service: 2 replicas, 256Mi-512Mi memory
- Payment Service: 2 replicas, 256Mi-512Mi memory

### Production Environment
- Scale based on load testing results
- Use HPA for automatic scaling
- Monitor resource utilization
- Adjust limits based on actual usage

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n ecommerce
kubectl describe pod <pod-name> -n ecommerce
kubectl logs <pod-name> -n ecommerce
```

### Check Service Endpoints
```bash
kubectl get endpoints -n ecommerce
```

### Test Service Connectivity
```bash
kubectl run test-pod --rm -i --tty --image=curlimages/curl -n ecommerce -- sh
curl http://user-service:3001/health
```

### View HPA Status
```bash
kubectl get hpa -n ecommerce
kubectl describe hpa user-service-hpa -n ecommerce
```

### Check Ingress
```bash
kubectl describe ingress ecommerce-ingress -n ecommerce
```

## Maintenance

### Rolling Updates
```bash
kubectl set image deployment/user-service user-service=your-registry/user-service:v1.0.1 -n ecommerce
kubectl rollout status deployment/user-service -n ecommerce
```

### Rollback
```bash
kubectl rollout undo deployment/user-service -n ecommerce
kubectl rollout history deployment/user-service -n ecommerce
```

### Scale Manually
```bash
kubectl scale deployment user-service --replicas=5 -n ecommerce
```

## Service Mesh (Optional)

### Istio Installation

```bash
# Install Istio
istioctl install --set profile=production

# Label namespace for sidecar injection
kubectl label namespace ecommerce istio-injection=enabled

# Deploy Istio addons
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.19/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.19/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.19/samples/addons/jaeger.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.19/samples/addons/kiali.yaml
```

### Benefits of Service Mesh
- Traffic management (canary deployments, A/B testing)
- Security (mTLS, authentication, authorization)
- Observability (distributed tracing, metrics)
- Resilience (circuit breaking, retries, timeouts)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and Push Docker Images
        run: |
          docker build -t ${{ secrets.REGISTRY }}/user-service:${{ github.sha }} ./services/user-service
          docker push ${{ secrets.REGISTRY }}/user-service:${{ github.sha }}
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/user-service user-service=${{ secrets.REGISTRY }}/user-service:${{ github.sha }} -n ecommerce
```

## Support

For issues or questions:
- Check logs: `kubectl logs -n ecommerce <pod-name>`
- Review events: `kubectl get events -n ecommerce --sort-by='.lastTimestamp'`
- Monitor metrics in Grafana
- Review traces in Jaeger (if using service mesh)
