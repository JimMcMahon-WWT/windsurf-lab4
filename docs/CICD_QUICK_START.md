# CI/CD Pipeline Quick Start Guide

## 🚀 Overview

This project implements a production-grade CI/CD pipeline with:

- **Automated Testing** - Unit, integration, and E2E tests
- **Security Scanning** - Vulnerabilities, secrets, and compliance
- **Blue-Green Deployment** - Zero-downtime releases
- **Canary Analysis** - Gradual rollout with automatic rollback
- **Database Migrations** - Safe schema changes with rollback capability

## 📋 Prerequisites

Before using the CI/CD pipeline, ensure you have:

- [ ] GitHub repository set up
- [ ] Container registry account (GitHub Container Registry or Docker Hub)
- [ ] Kubernetes cluster access
- [ ] Database credentials (staging/production)
- [ ] Monitoring tools (Prometheus, Grafana)
- [ ] Slack workspace (for notifications)

## ⚡ Quick Setup (5 Minutes)

### Step 1: Configure GitHub Secrets

Go to **Settings** → **Secrets and variables** → **Actions** and add:

**Minimum Required:**

```
REGISTRY_URL=ghcr.io/YOUR_USERNAME
REGISTRY_USERNAME=YOUR_USERNAME
REGISTRY_PASSWORD=YOUR_GITHUB_PAT
```

**For Production:**

```
PROD_DB_HOST=your-db-host
PROD_DB_PASSWORD=your-secure-password
KUBE_CONFIG=<base64-encoded-kubeconfig>
SLACK_WEBHOOK=https://hooks.slack.com/services/...
```

📖 **Detailed setup:** See [GitHub Secrets Setup Guide](./GITHUB_SECRETS_SETUP.md)

### Step 2: Test the Pipeline

```bash
# 1. Create a feature branch
git checkout -b feature/test-cicd

# 2. Make a small change
echo "// Test CI/CD" >> services/user-service/src/app.ts

# 3. Commit and push
git add .
git commit -m "test: verify CI/CD pipeline"
git push origin feature/test-cicd

# 4. Create Pull Request
# The CI pipeline will automatically run!
```

### Step 3: Verify Pipeline Status

1. Go to **Actions** tab in GitHub
2. You should see:
   - ✅ Code Quality checks
   - ✅ Security scanning
   - ✅ Unit tests
   - ✅ Build verification

## 🔄 Deployment Workflow

### Development Environment

```bash
git checkout develop
git push origin develop
```

✅ Automatically deploys to dev environment

### Staging Environment

```bash
git checkout staging
git merge develop
git push origin staging
```

✅ Runs full test suite + E2E tests
✅ Deploys to staging environment

### Production Environment

```bash
# Create release tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
```

✅ Triggers blue-green deployment
✅ Runs canary analysis
✅ Requires manual approval
✅ Automatic rollback on failures

## 📊 Pipeline Stages Explained

### 1. Code Quality (2-3 minutes)

- ESLint & TypeScript checks
- Code formatting validation
- Runs in parallel for all services

### 2. Security Scan (3-5 minutes)

- NPM audit for vulnerabilities
- Snyk security scan
- Secret detection
- License compliance

### 3. Testing (5-10 minutes)

- **Unit Tests:** All microservices in parallel
- **Integration Tests:** With PostgreSQL & Redis
- **Code Coverage:** 80% threshold enforced

### 4. Build (3-5 minutes)

- TypeScript compilation
- Docker image builds
- Artifact uploads

### 5. Deployment (Production: 15-20 minutes)

- Database backup & migration
- Blue-green deployment
- Health checks
- Canary analysis (10% → 100%)
- Post-deployment verification

## 🔧 Common Tasks

### Running Tests Locally

```bash
# Unit tests
npm run test:unit

# Integration tests (requires Docker)
docker-compose up -d postgres redis
npm run test:integration

# Coverage
npm run test:coverage
```

### Testing Database Migrations

```bash
# Dry run (safe)
DRY_RUN=true node scripts/migrate-production.js

# Apply migrations
node scripts/migrate-production.js
```

### Manual Health Check

```bash
# Check all services
TARGET_URL=https://api.staging.example.com \
SERVICES=user-service,product-service,order-service,payment-service \
node scripts/health-check.js
```

### Performance Testing

```bash
# Compare against baseline
TARGET_URL=https://api.staging.example.com \
DURATION=30 \
CONCURRENCY=10 \
node scripts/performance-check.js
```

## 🚨 Troubleshooting

### Pipeline Failing on Security Scan?

```bash
# Check vulnerabilities locally
npm audit

# Fix automatically
npm audit fix

# Update package-lock.json
npm install
```

### Tests Failing in CI but Pass Locally?

- Check Node.js version matches (18.x)
- Verify environment variables
- Review GitHub Actions logs
- Test with same database version

### Deployment Stuck in Canary?

```bash
# Check Prometheus metrics
curl "http://prometheus:9090/api/v1/query?query=http_requests_total"

# View pod logs
kubectl logs -n production -l environment=green --tail=100
```

### Need to Rollback?

The pipeline automatically rolls back on failures, but for manual rollback:

```bash
# Switch traffic to blue (previous version)
kubectl patch virtualservice api-gateway \
  -n production \
  --type merge \
  -p '{"spec":{"http":[{"route":[{"destination":{"host":"blue-service"},"weight":100}]}]}}'
```

## 📈 Monitoring Your Deployments

### View Deployment Status

```bash
# Using GitHub CLI
gh run list --limit 10

# Specific workflow
gh run view <run-id> --log
```

### Check Metrics

- **Prometheus:** http://prometheus.example.com
- **Grafana:** http://grafana.example.com
- **Logs:** `kubectl logs -n production -l app=service-name`

### Deployment Notifications

All deployments send notifications to Slack:

- 🚀 Deployment started
- ✅ Deployment successful
- ❌ Deployment failed
- ⚠️ Rollback triggered

## 🎯 Best Practices

### Before Pushing Code

```bash
# 1. Run linter
npm run lint

# 2. Run tests
npm test

# 3. Check types
npm run type-check

# 4. Test build
npm run build
```

### Before Deploying to Production

- [ ] All tests passing in staging
- [ ] Security scans clear
- [ ] Database migrations tested
- [ ] Performance baselines met
- [ ] Rollback plan documented
- [ ] Team notified

### After Deployment

- [ ] Monitor error rates for 30 minutes
- [ ] Check response times (P95, P99)
- [ ] Verify all services healthy
- [ ] Review deployment logs
- [ ] Update release notes

## 📚 Additional Documentation

- **[Full CI/CD Pipeline Documentation](./CICD_PIPELINE.md)**
- **[GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md)**
- **[Kubernetes Deployment Guide](./KUBERNETES_DEPLOYMENT.md)** _(if exists)_
- **[Monitoring Setup](./MONITORING_SETUP.md)** _(from previous modules)_

## 🔐 Security Notes

### Secrets Management

- Never commit secrets to Git
- Rotate secrets every 90 days
- Use environment-specific secrets
- Enable audit logging

### Access Control

- Require PR reviews for main/staging
- Use branch protection rules
- Enable CODEOWNERS file
- Limit secret access

## 🤝 Getting Help

### Resources

- 📖 [Full Documentation](./CICD_PIPELINE.md)
- 💬 Slack: #devops-support
- 🐛 [Create an Issue](https://github.com/your-org/your-repo/issues)

### Common Questions

**Q: How long does a production deployment take?**
A: 15-20 minutes including canary analysis.

**Q: Can I skip the canary phase?**
A: Not recommended for production. Use staging for faster deployments.

**Q: What happens if deployment fails?**
A: Automatic rollback to previous version within 2 minutes.

**Q: How do I add a new service?**
A: Add service name to matrix in `.github/workflows/ci.yml` and deployment workflows.

**Q: Can I test the pipeline without deploying?**
A: Yes, create a PR to trigger CI without deployment.

## 📊 Pipeline Metrics

Track these KPIs:

| Metric               | Target   | Current |
| -------------------- | -------- | ------- |
| Deployment Frequency | Daily    | -       |
| Lead Time            | < 1 hour | -       |
| MTTR                 | < 30 min | -       |
| Change Failure Rate  | < 5%     | -       |
| Test Coverage        | > 80%    | -       |

## 🎓 Learn More

### Advanced Topics

- [Blue-Green vs Canary Deployments](https://martinfowler.com/bliki/CanaryRelease.html)
- [Database Migration Strategies](https://www.liquibase.org/get-started/best-practices)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### Video Tutorials

- Setting up GitHub Actions
- Configuring Kubernetes
- Database Migration Best Practices
- Monitoring with Prometheus

## ✅ Checklist for Production Readiness

- [ ] All GitHub secrets configured
- [ ] Container registry access verified
- [ ] Kubernetes cluster ready
- [ ] Database backups automated
- [ ] Monitoring dashboards created
- [ ] Alert rules configured
- [ ] Rollback procedures documented
- [ ] Team trained on pipeline
- [ ] Runbooks created
- [ ] On-call rotation established

## 🚀 Next Steps

1. **Configure secrets** following the [setup guide](./GITHUB_SECRETS_SETUP.md)
2. **Test the pipeline** with a simple change
3. **Review logs** and familiarize yourself with the workflow
4. **Set up monitoring** dashboards in Grafana
5. **Create runbooks** for common scenarios
6. **Train the team** on deployment procedures

---

**Questions?** Open an issue or contact the DevOps team on Slack (#devops-support)

**Found a bug?** Please report it with pipeline logs and error messages
