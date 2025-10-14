# Release Process

## Release Cycle

**Standard Cycle:** 2-week sprints

- **Week 1-2:** Development on `develop` branch
- **End of Sprint:** Release preparation & QA
- **Start of Next Sprint:** Deploy to production

---

## Release Types

### Major Release (X.0.0)
- Breaking changes
- Major new features
- Architecture changes
- Requires migration guide

### Minor Release (1.X.0)
- New features
- Non-breaking changes
- Backward compatible

### Patch Release (1.2.X)
- Bug fixes only
- Security patches
- Performance improvements

---

## Step-by-Step Release Process

### Phase 1: Preparation (Day 1)

#### 1.1 Code Freeze
```bash
# Announce code freeze in Slack
# No new features merged to develop after this point
# Only bug fixes allowed
```

#### 1.2 Create Release Branch
```bash
# Pull latest develop
git checkout develop
git pull origin develop

# Create release branch
git checkout -b release/1.2.0
git push -u origin release/1.2.0
```

#### 1.3 Version Bump
```bash
# Update root package.json
npm version 1.2.0 --no-git-tag-version

# Update all service versions
cd services/user-service
npm version 1.2.0 --no-git-tag-version

# Repeat for all services...

# Or use a script
npm run version:bump 1.2.0
```

**Update version in:**
- Root `package.json`
- All service `package.json` files
- `package-lock.json` (run `npm install`)

#### 1.4 Generate Changelog
```bash
# Auto-generate from commits
npm run changelog

# Or manually update CHANGELOG.md
```

**CHANGELOG.md format:**
```markdown
# Changelog

## [1.2.0] - 2025-01-15

### Added
- User Service: Password reset functionality (#123)
- Product Service: Advanced search filters (#456)
- Cart Service: Guest checkout support (#789)

### Changed
- Order Service: Improved payment timeout handling (#234)
- Upgraded PostgreSQL to v15

### Fixed
- Inventory Service: Fixed stock sync issues (#567)
- Notification Service: Fixed email template rendering (#890)

### Security
- Updated jsonwebtoken to fix CVE-2024-XXXX

### Breaking Changes
- User API: `/api/users/profile` now requires `phone_verified` field
  - **Migration**: Run `npm run migrate:user-service`
```

#### 1.5 Update Documentation
```bash
# Update README.md
# Update API documentation
# Update deployment guides
# Update migration guides (if breaking changes)

git commit -am "docs: update documentation for release 1.2.0"
git push origin release/1.2.0
```

---

### Phase 2: Staging Deployment (Day 1-2)

#### 2.1 Merge to Staging Branch
```bash
git checkout staging
git pull origin staging
git merge --no-ff release/1.2.0 -m "merge: release 1.2.0 for staging"
git push origin staging
```

#### 2.2 Run Database Migrations
```bash
# Backup staging database first
npm run db:backup:staging

# Run migrations
npm run migrate:staging

# Verify migrations succeeded
npm run migrate:verify:staging
```

#### 2.3 Deploy to Staging
```bash
# CI/CD automatically deploys staging branch
# Or trigger manually:
npm run deploy:staging

# Verify deployment
npm run health-check:staging
```

#### 2.4 Smoke Tests
```bash
# Run automated smoke tests
npm run test:smoke:staging

# Manual checks:
# ✓ Health endpoints
# ✓ Authentication
# ✓ Critical user journeys
# ✓ Database connectivity
# ✓ External integrations
```

---

### Phase 3: QA Testing (Day 2-4)

#### 3.1 QA Test Plan
**Test Categories:**
- [ ] Functional testing (new features)
- [ ] Regression testing (existing features)
- [ ] Integration testing (service interactions)
- [ ] Performance testing (load, stress)
- [ ] Security testing (OWASP top 10)
- [ ] User acceptance testing (UAT)

#### 3.2 Bug Tracking
**If bugs found:**

```bash
# Create bug fix branch from release branch
git checkout release/1.2.0
git checkout -b bugfix/ECOM-999-fix-staging-issue

# Fix the bug
# Test locally

# Commit and push
git commit -am "fix: resolve staging issue ECOM-999"
git push origin bugfix/ECOM-999-fix-staging-issue

# Create PR to release/1.2.0
# After approval, merge to release branch
git checkout release/1.2.0
git merge --no-ff bugfix/ECOM-999-fix-staging-issue

# Redeploy to staging
git checkout staging
git merge --no-ff release/1.2.0
git push origin staging
```

#### 3.3 Performance Testing
```bash
# Run load tests
npm run test:load

# Check metrics:
# - Response times (p95, p99)
# - Throughput (requests/sec)
# - Error rate
# - CPU/Memory usage
# - Database performance
```

#### 3.4 QA Sign-Off
**Required approvals:**
- [ ] QA team lead
- [ ] Product owner
- [ ] Tech lead
- [ ] Security team (if security changes)

---

### Phase 4: Production Deployment (Day 5)

#### 4.1 Pre-Deployment Checklist
- [ ] All staging tests passed
- [ ] QA sign-off received
- [ ] Product owner approval
- [ ] Deployment runbook reviewed
- [ ] Rollback plan documented
- [ ] Database backup scheduled
- [ ] Monitoring alerts configured
- [ ] On-call team notified
- [ ] Customer communication prepared (if needed)

#### 4.2 Deployment Window
**Recommended:** Tuesday-Thursday, 10 AM - 2 PM (low traffic)

**Avoid:**
- Mondays (weekend issues)
- Fridays (limited support)
- Weekends (limited staff)
- High-traffic periods
- Before holidays

#### 4.3 Production Deployment Steps

**Step 1: Backup Production Database**
```bash
npm run db:backup:production

# Verify backup completed
npm run db:verify-backup
```

**Step 2: Run Database Migrations**
```bash
# Test migrations in production-like environment first
npm run migrate:production-test

# If successful, run on production
npm run migrate:production

# Verify migrations
npm run migrate:verify:production
```

**Step 3: Merge to Main**
```bash
git checkout main
git pull origin main
git merge --no-ff release/1.2.0 -m "release: version 1.2.0"
git tag -a v1.2.0 -m "Release version 1.2.0

Features:
- Password reset functionality
- Advanced search filters
- Guest checkout support

Bug Fixes:
- Payment timeout handling
- Inventory sync issues

Breaking Changes: None"

git push origin main --tags
```

**Step 4: Deploy Services**
```bash
# Deploy in dependency order
npm run deploy:production:user-service
npm run deploy:production:product-service
npm run deploy:production:cart-service
npm run deploy:production:order-service

# Or deploy all at once
npm run deploy:production
```

**Step 5: Health Checks**
```bash
# Verify all services are healthy
npm run health-check:production

# Check specific services
curl https://api.example.com/user-service/health
curl https://api.example.com/product-service/health
curl https://api.example.com/cart-service/health
curl https://api.example.com/order-service/health
```

**Step 6: Smoke Tests**
```bash
# Run automated smoke tests
npm run test:smoke:production

# Manual verification:
# ✓ User login
# ✓ Product search
# ✓ Add to cart
# ✓ Checkout flow
# ✓ Order confirmation
```

**Step 7: Monitor**
```bash
# Watch logs for errors
npm run logs:production --follow

# Monitor metrics:
# - Error rates
# - Response times
# - CPU/Memory usage
# - Database connections
# - Queue depths
```

#### 4.4 Post-Deployment
**First Hour:**
- Monitor error rates closely
- Watch for spikes in response times
- Check customer support tickets
- Review application logs

**First 24 Hours:**
- Daily metrics review
- Performance comparison (before/after)
- Customer feedback monitoring

---

### Phase 5: Post-Release (Day 5-6)

#### 5.1 Merge Back to Develop
```bash
# Merge release changes back to develop
git checkout develop
git merge --no-ff release/1.2.0 -m "merge: release 1.2.0 back to develop"
git push origin develop
```

#### 5.2 Clean Up
```bash
# Delete release branch
git branch -d release/1.2.0
git push origin --delete release/1.2.0

# Delete staging-specific bug fix branches
git branch -d bugfix/ECOM-999-fix-staging-issue
git push origin --delete bugfix/ECOM-999-fix-staging-issue
```

#### 5.3 Release Communication
**Announce in:**
- Company Slack (#announcements)
- Engineering Slack (#engineering)
- Customer-facing release notes
- Status page update

**Template:**
```
🚀 Release v1.2.0 deployed to production!

New Features:
- Password reset functionality
- Advanced product search
- Guest checkout

Bug Fixes:
- Improved payment processing
- Fixed inventory sync

Full release notes: https://github.com/org/repo/releases/tag/v1.2.0

Deployed by: @username
Status: ✅ All systems operational
```

#### 5.4 Retrospective (within 1 week)
**Discuss:**
- What went well?
- What could be improved?
- Were there any surprises?
- Did we follow the process?
- Update process documentation

---

## Rollback Procedure

### When to Rollback
- Critical bugs affecting users
- Major performance degradation
- Data integrity issues
- Security vulnerabilities introduced

### Rollback Steps

**Option 1: Git Revert (Preferred)**
```bash
# Revert to previous tag
git checkout main
git revert -m 1 <merge-commit-hash>
git push origin main

# Tag rollback
git tag -a v1.2.0-rollback -m "Rollback release 1.2.0"
git push --tags

# Trigger deployment
```

**Option 2: Redeploy Previous Version**
```bash
# Checkout previous version
git checkout v1.1.0

# Deploy
npm run deploy:production
```

**Option 3: Kubernetes Rollback**
```bash
# Rollback deployment
kubectl rollout undo deployment/user-service
kubectl rollout undo deployment/product-service

# Check status
kubectl rollout status deployment/user-service
```

**Database Rollback:**
```bash
# If migrations were run, rollback database
npm run migrate:down:production

# Or restore from backup
npm run db:restore:production --backup-id=<backup-id>
```

---

## Release Checklist Template

```markdown
# Release 1.2.0 Checklist

## Pre-Release
- [ ] Code freeze announced
- [ ] Release branch created
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Documentation updated
- [ ] Migrations tested

## Staging
- [ ] Deployed to staging
- [ ] Smoke tests passed
- [ ] QA testing completed
- [ ] Performance tests passed
- [ ] Security scan completed

## Approvals
- [ ] QA sign-off
- [ ] Product owner approval
- [ ] Tech lead approval
- [ ] Security approval (if needed)

## Production
- [ ] Database backed up
- [ ] Migrations run successfully
- [ ] Services deployed
- [ ] Health checks passed
- [ ] Smoke tests passed
- [ ] Monitoring configured
- [ ] On-call notified

## Post-Release
- [ ] Merged back to develop
- [ ] Branches cleaned up
- [ ] Release announced
- [ ] Retrospective scheduled
```

---

## Tools & Automation

### Release Scripts
```json
{
  "scripts": {
    "version:bump": "node scripts/bump-version.js",
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s",
    "deploy:staging": "node scripts/deploy.js --env=staging",
    "deploy:production": "node scripts/deploy.js --env=production",
    "migrate:staging": "node scripts/migrate.js --env=staging",
    "migrate:production": "node scripts/migrate.js --env=production",
    "health-check:staging": "node scripts/health-check.js --env=staging",
    "health-check:production": "node scripts/health-check.js --env=production"
  }
}
```

### CI/CD Integration
- GitHub Actions for automated deployments
- Slack notifications for deployment status
- Automated rollback on failed health checks
- Blue-green deployments for zero downtime

---

## Metrics to Track

- **Deployment Frequency:** How often we release
- **Lead Time:** Time from code commit to production
- **Change Failure Rate:** % of deployments causing issues
- **Mean Time to Recovery:** Time to fix production issues
- **Deployment Duration:** How long deployments take
- **Rollback Frequency:** How often we rollback

**Target Metrics:**
- Deployment frequency: 2+ per week
- Lead time: < 1 week
- Change failure rate: < 5%
- MTTR: < 1 hour
- Deployment duration: < 30 minutes
- Rollback frequency: < 5%

---

## Emergency Release

For critical hotfixes that can't wait for the regular cycle:

1. Follow [HOTFIX_GUIDE.md](./HOTFIX_GUIDE.md)
2. Skip staging if P0 severity
3. Fast-track approvals (1 senior dev)
4. Deploy immediately after testing
5. Monitor closely for 24 hours
6. Post-mortem within 48 hours
