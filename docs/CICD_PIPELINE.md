# CI/CD Pipeline Documentation

## Overview

This document describes the comprehensive CI/CD pipeline for the E-Commerce Microservices Platform. The pipeline implements industry best practices including automated testing, security scanning, blue-green deployment, and zero-downtime deployments.

## Table of Contents

- [Pipeline Architecture](#pipeline-architecture)
- [Workflow Stages](#workflow-stages)
- [Deployment Strategy](#deployment-strategy)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Troubleshooting](#troubleshooting)

## Pipeline Architecture

### Branching Strategy

- **`develop`** - Development branch, deployed to dev environment
- **`staging`** - Staging branch, deployed to staging environment  
- **`main`** - Production branch, deployed using blue-green deployment

### Environment Progression

```
develop → staging → production
   ↓         ↓          ↓
  dev     staging     prod
```

## Workflow Stages

### 1. Continuous Integration (CI)

**Workflow:** `.github/workflows/ci.yml`

Runs on every push and pull request to `develop`, `staging`, and `main` branches.

#### Stages:

**a) Code Quality Checks**
- ESLint code linting
- TypeScript type checking
- Code formatting validation
- Runs in parallel for all services

**b) Security Scanning**
- NPM audit for dependency vulnerabilities
- Snyk security scan
- CodeQL static analysis
- Secret scanning with TruffleHog
- Docker image vulnerability scanning
- License compliance checking

**c) Unit Tests**
- Parallel execution across all microservices
- Code coverage collection (80% threshold)
- Coverage reports uploaded to Codecov
- Matrix strategy for efficient testing

**d) Integration Tests**
- Spins up PostgreSQL and Redis services
- Runs database migrations
- Tests service interactions
- Validates API contracts

**e) Build Verification**
- Builds all services
- Validates TypeScript compilation
- Checks build artifacts
- Uploads artifacts for deployment

**f) End-to-End Tests (Staging Only)**
- Full user journey testing
- API integration validation
- Performance baseline checks

### 2. Security Scanning

**Workflow:** `.github/workflows/security-scan.yml`

Runs daily at 2 AM UTC and on every push/PR.

#### Scans Include:

- **Dependency Vulnerabilities:** NPM audit + Snyk
- **Static Code Analysis:** CodeQL security patterns
- **Secret Detection:** TruffleHog for leaked credentials
- **Container Security:** Trivy + Grype image scanning
- **License Compliance:** Detects restrictive licenses (GPL, AGPL)

Results are automatically uploaded to GitHub Security tab.

### 3. Production Deployment

**Workflow:** `.github/workflows/deploy-production.yml`

Implements zero-downtime blue-green deployment with canary analysis.

#### Deployment Phases:

**Phase 1: Pre-Deployment Checks**
- Version validation
- Staging environment verification
- Approval gate for production

**Phase 2: Build & Scan**
- Multi-arch Docker image builds
- Push to container registry
- Vulnerability scanning
- Image signing

**Phase 3: Database Migration**
- Automated database backup to S3
- Migration with rollback SQL generation
- Post-migration validation
- Integrity checks

**Phase 4: Green Environment Deployment**
- Deploy new version to "green" environment
- Scale up green pods
- Wait for readiness probes
- Internal health checks

**Phase 5: Health Verification**
- Comprehensive health checks
- Smoke test execution
- Performance baseline comparison
- Database connectivity validation

**Phase 6: Canary Deployment**
- Route 10% traffic to green
- Monitor error rates and latency
- Gradually increase: 10% → 25% → 50% → 75% → 100%
- Automatic rollback on threshold violations

**Phase 7: Traffic Switch**
- Manual approval gate
- Complete traffic cutover
- Label swap (green becomes blue)
- Scale down old blue environment

**Phase 8: Post-Deployment Validation**
- Full production test suite
- Error rate monitoring
- Latency checks (P95, P99)
- Database integrity verification
- Deployment record creation

**Phase 9: Cleanup**
- Keep old blue for 24 hours
- Scheduled cleanup job
- Release old resources

## Deployment Strategy

### Blue-Green Deployment

The pipeline implements blue-green deployment for zero-downtime releases:

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                         │
│                    (Istio Virtual Service)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
   ┌────▼─────┐                 ┌────▼─────┐
   │   Blue   │                 │  Green   │
   │ (Current)│                 │  (New)   │
   └──────────┘                 └──────────┘
```

**Benefits:**
- Zero downtime during deployment
- Instant rollback capability
- Full environment validation before traffic switch
- Reduced risk of failed deployments

### Canary Deployment

Traffic is gradually shifted to validate the new deployment:

1. **10%** - Initial canary, monitor for 5 minutes
2. **25%** - Increase if metrics are good, monitor for 3 minutes
3. **50%** - Half traffic, monitor for 3 minutes
4. **75%** - Majority traffic, monitor for 3 minutes
5. **100%** - Complete cutover

**Monitored Metrics:**
- Error rate (threshold: < 1%)
- P95 latency (threshold: < 500ms)
- Request rate
- Database connection health

**Automatic Rollback Triggers:**
- Error rate exceeds 1%
- P95 latency exceeds 500ms
- 3 consecutive metric violations
- Health check failures

## Configuration

### Required GitHub Secrets

#### Container Registry
```
REGISTRY_URL          # Docker registry URL (e.g., ghcr.io, docker.io)
REGISTRY_USERNAME     # Registry username
REGISTRY_PASSWORD     # Registry password/token
```

#### Database (Production)
```
PROD_DB_HOST         # Production database host
PROD_DB_PORT         # Production database port
PROD_DB_NAME         # Production database name
PROD_DB_USER         # Production database user
PROD_DB_PASSWORD     # Production database password
```

#### Kubernetes
```
KUBE_CONFIG          # Base64-encoded kubeconfig file
```

#### Monitoring
```
PROMETHEUS_URL       # Prometheus server URL
GRAFANA_URL          # Grafana dashboard URL
```

#### Notifications
```
SLACK_WEBHOOK        # Slack webhook for notifications
```

#### API Keys
```
PROD_API_KEY         # Production API key for testing
STAGING_API_KEY      # Staging API key for testing
SNYK_TOKEN          # Snyk security scanning token
CODECOV_TOKEN       # Codecov upload token
```

#### Backups
```
BACKUP_S3_BUCKET    # S3 bucket for database backups
AWS_ACCESS_KEY_ID   # AWS access key
AWS_SECRET_ACCESS_KEY # AWS secret key
```

### Environment Variables

**CI Workflow:**
```yaml
NODE_VERSION: '18'
COVERAGE_THRESHOLD: 80
```

**Production Deployment:**
```yaml
DEPLOYMENT_STRATEGY: 'blue-green'
HEALTH_CHECK_TIMEOUT: 300
ROLLBACK_ON_FAILURE: true
CANARY_INITIAL_PERCENTAGE: 10
```

## Usage Guide

### Deploying to Development

Push to `develop` branch:
```bash
git checkout develop
git push origin develop
```

Automatically triggers:
- CI pipeline
- Deployment to dev environment

### Deploying to Staging

Create PR from `develop` to `staging`:
```bash
git checkout staging
git merge develop
git push origin staging
```

Triggers:
- Full CI pipeline
- E2E tests
- Deployment to staging

### Deploying to Production

**Option 1: Tag-based Release**
```bash
git checkout main
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
```

**Option 2: Manual Workflow Dispatch**
1. Go to Actions tab in GitHub
2. Select "Deploy to Production"
3. Click "Run workflow"
4. Enter version number
5. Approve at required gates

### Manual Rollback

If automatic rollback doesn't trigger:

```bash
# 1. Switch traffic back to blue
kubectl patch virtualservice api-gateway \
  -n production \
  --type merge \
  -p '{"spec":{"http":[{"route":[{"destination":{"host":"blue-service"},"weight":100}]}]}}'

# 2. Scale up blue environment
kubectl scale deployment user-service-blue --replicas=3 -n production
kubectl scale deployment product-service-blue --replicas=3 -n production
kubectl scale deployment order-service-blue --replicas=3 -n production
kubectl scale deployment payment-service-blue --replicas=3 -n production

# 3. Verify rollback
kubectl get pods -n production -l environment=blue
```

## Monitoring & Alerts

### Health Checks

All services expose health endpoints:
```
GET /health
GET /metrics
```

Health check script validates:
- HTTP 200 response
- Service status: "healthy"
- Database connectivity
- Cache connectivity
- Message queue connectivity

### Performance Monitoring

Performance checks compare against baselines:
- Request rate (RPS)
- Success rate (%)
- Latency percentiles (P50, P95, P99)
- Error rates

Baselines stored in: `./performance-baselines/`

### Canary Monitoring

Real-time monitoring during canary deployment:
```
Metrics Checked:
- Error Rate < 1%
- P95 Latency < 500ms
- Request Rate (stability)

Check Interval: 10 seconds
Failure Threshold: 3 consecutive violations
```

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Symptom:** TypeScript compilation errors

**Solution:**
```bash
# Run type check locally
npm run type-check

# Fix type errors
npm run lint:fix
```

#### 2. Test Failures

**Symptom:** Unit tests failing in CI

**Solution:**
```bash
# Run tests locally with same environment
npm run test:unit

# Check coverage
npm run test:coverage
```

#### 3. Migration Failures

**Symptom:** Database migration fails during deployment

**Solution:**
```bash
# Test migration locally
DRY_RUN=true node scripts/migrate-production.js

# Check migration logs
kubectl logs -n production job/migration-job
```

#### 4. Health Check Failures

**Symptom:** Green environment fails health checks

**Solution:**
```bash
# Check pod logs
kubectl logs -n production -l environment=green

# Check service connectivity
kubectl exec -it pod-name -n production -- curl http://localhost:3000/health

# Verify database connections
kubectl exec -it pod-name -n production -- env | grep DB_
```

#### 5. Canary Rollback

**Symptom:** Automatic rollback triggered

**Actions:**
1. Check Prometheus metrics for error spikes
2. Review application logs
3. Verify database migration success
4. Check for configuration issues
5. Review recent code changes

#### 6. Secret Scanning False Positives

**Symptom:** TruffleHog reports false positives

**Solution:**
```bash
# Add to .trufflehogignore
echo "path/to/false/positive" >> .trufflehogignore
```

### Debug Commands

**View workflow logs:**
```bash
# Using GitHub CLI
gh run list
gh run view <run-id> --log
```

**Check deployment status:**
```bash
kubectl get deployments -n production
kubectl get pods -n production
kubectl describe deployment user-service-green -n production
```

**View metrics:**
```bash
# Prometheus query
curl "http://prometheus:9090/api/v1/query?query=http_requests_total"
```

**Check recent migrations:**
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;"
```

## Best Practices

1. **Always test migrations locally** before pushing to production
2. **Run performance tests** against staging before prod deployment
3. **Monitor metrics** during and after deployment
4. **Keep blue environment** for 24 hours after successful deployment
5. **Document breaking changes** in PR descriptions
6. **Update baselines** after successful performance improvements
7. **Review security scan results** before merging
8. **Use feature flags** for risky changes
9. **Tag releases semantically** (v1.2.3)
10. **Maintain deployment runbooks** for each service

## Pipeline Metrics

Track these metrics for continuous improvement:

- Deployment frequency
- Lead time for changes
- Mean time to recovery (MTTR)
- Change failure rate
- Test coverage percentage
- Security scan pass rate
- Average deployment duration

## Support

For issues or questions:
- Create an issue in GitHub
- Contact DevOps team on Slack: #devops-support
- Review runbooks: `./docs/runbooks/`

## References

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Blue-Green Deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Canary Releases](https://martinfowler.com/bliki/CanaryRelease.html)
