# GitHub Secrets Configuration Guide

This guide explains how to configure all required GitHub secrets for the CI/CD pipeline.

## Table of Contents

- [Accessing GitHub Secrets](#accessing-github-secrets)
- [Required Secrets](#required-secrets)
- [Step-by-Step Setup](#step-by-step-setup)
- [Verification](#verification)

## Accessing GitHub Secrets

1. Navigate to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** to add each secret

## Required Secrets

### Container Registry

| Secret Name | Description | Example |
|------------|-------------|---------|
| `REGISTRY_URL` | Container registry URL | `ghcr.io/your-org` or `docker.io/username` |
| `REGISTRY_USERNAME` | Registry username | `your-github-username` or Docker Hub username |
| `REGISTRY_PASSWORD` | Registry password/token | GitHub PAT or Docker Hub access token |

**Setup Instructions:**

**For GitHub Container Registry (ghcr.io):**
```bash
# 1. Create Personal Access Token
# Go to: Settings → Developer settings → Personal access tokens → Tokens (classic)
# Scopes: write:packages, read:packages, delete:packages

# 2. Add secrets
REGISTRY_URL: ghcr.io/YOUR_GITHUB_USERNAME
REGISTRY_USERNAME: YOUR_GITHUB_USERNAME
REGISTRY_PASSWORD: YOUR_GITHUB_PAT
```

**For Docker Hub:**
```bash
# 1. Create Access Token
# Go to: Docker Hub → Account Settings → Security → New Access Token

# 2. Add secrets
REGISTRY_URL: docker.io/YOUR_DOCKERHUB_USERNAME
REGISTRY_USERNAME: YOUR_DOCKERHUB_USERNAME
REGISTRY_PASSWORD: YOUR_DOCKERHUB_ACCESS_TOKEN
```

### Database Configuration

| Secret Name | Description | Example |
|------------|-------------|---------|
| `PROD_DB_HOST` | Production database hostname | `prod-db.example.com` |
| `PROD_DB_PORT` | Production database port | `5432` |
| `PROD_DB_NAME` | Production database name | `ecommerce_prod` |
| `PROD_DB_USER` | Production database username | `app_user` |
| `PROD_DB_PASSWORD` | Production database password | `<strong-password>` |

**Security Best Practices:**
- Use read-only credentials for read operations
- Use separate migration user with DDL permissions
- Rotate passwords regularly
- Use connection pooling
- Enable SSL/TLS for database connections

### Kubernetes Configuration

| Secret Name | Description |
|------------|-------------|
| `KUBE_CONFIG` | Base64-encoded kubeconfig file |

**Setup Instructions:**
```bash
# 1. Get your kubeconfig
cat ~/.kube/config

# 2. Base64 encode it
cat ~/.kube/config | base64

# 3. Add to GitHub secrets
# Secret name: KUBE_CONFIG
# Value: <base64-encoded-content>
```

**Alternative (kubectl create secret):**
```bash
kubectl create secret generic github-actions \
  --from-file=kubeconfig=$HOME/.kube/config \
  -n default
```

### Monitoring & Observability

| Secret Name | Description | Example |
|------------|-------------|---------|
| `PROMETHEUS_URL` | Prometheus server URL | `https://prometheus.example.com` |
| `GRAFANA_URL` | Grafana dashboard URL | `https://grafana.example.com` |
| `GRAFANA_API_KEY` | Grafana API key for automation | `<api-key>` |

**Setup Prometheus:**
```bash
# If using Prometheus Operator
kubectl port-forward svc/prometheus-operated 9090:9090 -n monitoring

# Get service endpoint
kubectl get svc prometheus-operated -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

### Notifications

| Secret Name | Description |
|------------|-------------|
| `SLACK_WEBHOOK` | Slack webhook URL for notifications |

**Setup Slack Webhook:**
1. Go to https://api.slack.com/apps
2. Create new app
3. Enable Incoming Webhooks
4. Add new webhook to workspace
5. Select channel (#devops, #deployments, etc.)
6. Copy webhook URL
7. Add to GitHub secrets

**Webhook URL format:**
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### API Keys & Tokens

| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `PROD_API_KEY` | Production API key for testing | Your API management system |
| `STAGING_API_KEY` | Staging API key for testing | Your API management system |
| `SNYK_TOKEN` | Snyk security scanning | https://app.snyk.io/account |
| `CODECOV_TOKEN` | Codecov upload token | https://codecov.io/gh/settings |

**Get Snyk Token:**
1. Sign up at https://snyk.io
2. Go to Account Settings
3. Copy API token
4. Add to GitHub secrets

**Get Codecov Token:**
1. Sign in to https://codecov.io
2. Add repository
3. Copy upload token
4. Add to GitHub secrets

### Backup Configuration

| Secret Name | Description | Example |
|------------|-------------|---------|
| `BACKUP_S3_BUCKET` | S3 bucket for database backups | `prod-db-backups` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `<secret-access-key>` |
| `AWS_REGION` | AWS region | `us-east-1` |

**Setup AWS Backup:**
```bash
# 1. Create IAM user for backups
aws iam create-user --user-name github-actions-backup

# 2. Create S3 bucket
aws s3 mb s3://prod-db-backups --region us-east-1

# 3. Create IAM policy
cat > backup-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::prod-db-backups",
        "arn:aws:s3:::prod-db-backups/*"
      ]
    }
  ]
}
EOF

# 4. Attach policy
aws iam put-user-policy \
  --user-name github-actions-backup \
  --policy-name S3BackupPolicy \
  --policy-document file://backup-policy.json

# 5. Create access key
aws iam create-access-key --user-name github-actions-backup

# 6. Add to GitHub secrets
```

## Step-by-Step Setup

### 1. Development Environment (Optional)

For development environment, you can use these simplified secrets:

```bash
# Minimal secrets for dev
REGISTRY_URL: ghcr.io/YOUR_USERNAME
REGISTRY_USERNAME: YOUR_USERNAME
REGISTRY_PASSWORD: YOUR_GITHUB_PAT
SLACK_WEBHOOK: YOUR_SLACK_WEBHOOK (optional)
```

### 2. Staging Environment

Staging requires all secrets except production database:

```bash
# Copy from your staging environment
STAGING_DB_HOST
STAGING_DB_PORT
STAGING_DB_NAME
STAGING_DB_USER
STAGING_DB_PASSWORD
STAGING_API_KEY
```

### 3. Production Environment

Production requires all secrets listed above.

**Checklist:**
- [ ] Container Registry credentials
- [ ] Production database credentials
- [ ] Kubernetes configuration
- [ ] Monitoring URLs
- [ ] Slack webhook
- [ ] API keys (Snyk, Codecov)
- [ ] AWS backup credentials

## Verification

### Test Container Registry

```bash
# Test Docker login
echo $REGISTRY_PASSWORD | docker login $REGISTRY_URL -u $REGISTRY_USERNAME --password-stdin

# Test push
docker tag test-image $REGISTRY_URL/test-image:latest
docker push $REGISTRY_URL/test-image:latest
```

### Test Database Connection

```bash
# Test PostgreSQL connection
psql "postgresql://$PROD_DB_USER:$PROD_DB_PASSWORD@$PROD_DB_HOST:$PROD_DB_PORT/$PROD_DB_NAME" -c "SELECT version();"
```

### Test Kubernetes Access

```bash
# Decode and test kubeconfig
echo $KUBE_CONFIG | base64 -d > /tmp/kubeconfig
export KUBECONFIG=/tmp/kubeconfig
kubectl cluster-info
kubectl get nodes
```

### Test Slack Webhook

```bash
# Test Slack notification
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Test notification from CI/CD pipeline setup"
  }'
```

### Test Snyk Token

```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth $SNYK_TOKEN

# Test scan
snyk test
```

## Security Best Practices

### Secret Rotation

Rotate secrets regularly:
- Database passwords: Every 90 days
- API keys: Every 180 days
- Access tokens: Every 90 days
- Webhook URLs: When compromised

### Access Control

1. **Limit secret access** to necessary repositories only
2. **Use environment-specific secrets** (dev, staging, prod)
3. **Enable branch protection** requiring review before deployment
4. **Audit secret usage** regularly
5. **Use environment protection rules** for production

### Monitoring

Set up alerts for:
- Failed authentication attempts
- Unusual API usage patterns
- Secret access outside business hours
- Multiple failed deployments

## Troubleshooting

### Common Issues

**Issue: Docker login fails**
```bash
# Check credentials
echo $REGISTRY_PASSWORD | docker login $REGISTRY_URL -u $REGISTRY_USERNAME --password-stdin

# Verify token permissions
# GitHub PAT needs: write:packages, read:packages
```

**Issue: Database connection refused**
```bash
# Check firewall rules
# Verify GitHub Actions IP ranges are whitelisted
# Test from GitHub Actions runner
```

**Issue: Kubeconfig invalid**
```bash
# Verify base64 encoding
echo $KUBE_CONFIG | base64 -d | kubectl --kubeconfig=/dev/stdin cluster-info

# Check certificate expiry
echo $KUBE_CONFIG | base64 -d | grep 'certificate-authority-data' | base64 -d | openssl x509 -noout -dates
```

**Issue: Snyk token invalid**
```bash
# Regenerate token at https://app.snyk.io/account
# Verify organization access
snyk config get api
```

## Environment-Specific Configuration

### Development
```bash
# Minimal configuration
- REGISTRY_URL
- REGISTRY_USERNAME
- REGISTRY_PASSWORD
```

### Staging
```bash
# Full configuration except production database
- All registry secrets
- STAGING_DB_* secrets
- STAGING_KUBE_CONFIG
- Monitoring URLs
- SLACK_WEBHOOK
```

### Production
```bash
# Complete configuration
- All secrets listed in this guide
- Production database credentials
- Production Kubernetes config
- Backup configuration
- All API keys
```

## Support

For questions or issues:
- Review GitHub Actions logs
- Check secret expiry dates
- Verify network connectivity
- Contact DevOps team: #devops-support

## References

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Docker Hub Access Tokens](https://docs.docker.com/docker-hub/access-tokens/)
