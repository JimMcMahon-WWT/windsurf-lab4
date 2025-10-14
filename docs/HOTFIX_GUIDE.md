# Hotfix Guide

## When to Create a Hotfix

A hotfix is an emergency fix deployed outside the normal release cycle.

**Create a hotfix for:**
- ✅ Production outages
- ✅ Critical security vulnerabilities
- ✅ Data corruption issues
- ✅ Payment processing failures
- ✅ Complete feature breakage affecting all users

**Do NOT create a hotfix for:**
- ❌ Minor bugs affecting few users
- ❌ UI cosmetic issues
- ❌ Feature requests
- ❌ Performance optimizations
- ❌ Technical debt

---

## Severity Levels

| Level | Response | Examples | Process |
|-------|----------|----------|---------|
| **P0 - Critical** | < 1 hour | Complete outage, data loss, security breach | Immediate hotfix |
| **P1 - High** | < 4 hours | Major feature broken, payment issues | Same-day hotfix |
| **P2 - Medium** | < 24 hours | Minor bugs, partial feature broken | Next release |
| **P3 - Low** | Next sprint | UI issues, small bugs | Backlog |

---

## Hotfix Workflow

### Phase 1: Identification & Assessment (0-30 minutes)

#### 1.1 Identify the Issue
```bash
# Gather information:
# - What's broken?
# - When did it start?
# - How many users affected?
# - What's the business impact?

# Check monitoring:
# - Error rates
# - Response times
# - Database health
# - External service status
```

#### 1.2 Assess Severity
```bash
# Determine severity level
# P0: Immediate action required
# P1: Same-day fix needed
# P2: Can wait for next release

# If P0 or P1, proceed with hotfix
```

#### 1.3 Notify Team
```bash
# Post in #incidents Slack channel
# Alert on-call engineer
# Notify tech lead
# Update status page (if customer-facing)
```

**Incident Template:**
```markdown
🚨 INCIDENT ALERT

**Severity:** P0 - Critical
**Service:** User Service
**Issue:** Authentication failures causing 500 errors
**Impact:** All users unable to log in
**Started:** 2025-01-15 10:30 AM EST
**Assigned:** @engineer-name
**Status:** Investigating
```

---

### Phase 2: Investigation & Fix (30 minutes - 2 hours)

#### 2.1 Create Hotfix Branch
```bash
# Create branch from main (current production code)
git checkout main
git pull origin main
git checkout -b hotfix/1.2.1-ECOM-999-auth-failure

# Branch naming:
# hotfix/<new-version>-<ticket-id>-<short-description>
```

#### 2.2 Reproduce the Issue
```bash
# Reproduce locally or in staging
# Identify root cause
# Document findings in ticket
```

#### 2.3 Develop the Fix
**Guidelines:**
- Keep it MINIMAL - only fix the critical issue
- Don't add features or refactor
- Don't fix unrelated bugs
- Avoid large architectural changes
- Focus on correctness over perfection

```typescript
// Example: Fix authentication bug
// ❌ DON'T refactor everything
export class AuthService {
  // Refactor the entire class...
}

// ✅ DO fix only the bug
export class AuthService {
  async login(email: string, password: string) {
    // Add null check that was missing
    if (!email || !password) {
      throw new Error('Email and password required');
    }
    // ... rest of existing code
  }
}
```

#### 2.4 Test Thoroughly
```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Manual testing
# - Test the fix
# - Test related functionality
# - Test edge cases
# - Verify no regressions
```

#### 2.5 Commit with Clear Message
```bash
git add .
git commit -m "hotfix: resolve authentication failure in login endpoint

- Add null check for email and password parameters
- Return proper error message instead of 500
- Add unit tests for edge cases

Root Cause: Missing input validation allowed undefined values
to reach database query, causing server error.

Impact: All users unable to log in since deployment at 10:30 AM

Fixes ECOM-999"

git push origin hotfix/1.2.1-ECOM-999-auth-failure
```

---

### Phase 3: Review & Approval (30 minutes)

#### 3.1 Create Pull Request
```bash
# Create PR to main branch
# Use hotfix PR template
```

**Hotfix PR Template:**
```markdown
## 🚨 HOTFIX - URGENT

**Severity:** P0 - Critical
**Ticket:** ECOM-999
**Service:** User Service

### Issue
All users unable to log in. Authentication endpoint returning 500 errors.

### Root Cause
Missing null check allowed undefined email/password to reach database query.

### Fix
Added input validation and proper error handling.

### Testing
- [x] Unit tests pass
- [x] Manual testing completed
- [x] Verified fix in staging
- [x] No regressions found

### Impact
- **Users Affected:** All users (100%)
- **Duration:** 30 minutes
- **Data Loss:** None

### Rollback Plan
Revert this commit if issues arise.

### Deployment
Deploy immediately after approval.
```

#### 3.2 Fast-Track Review
**Required:** 1 senior developer approval

**Reviewers focus on:**
- Does it fix the issue?
- Is it safe to deploy?
- Are there obvious bugs?
- Skip: Code style, minor optimizations

**Review time:** < 30 minutes

---

### Phase 4: Staging Deployment (15-30 minutes)

#### 4.1 Deploy to Staging First
```bash
# Even for P0, test in staging if possible
git checkout staging
git merge --no-ff hotfix/1.2.1-ECOM-999-auth-failure
git push origin staging

# Deploy to staging environment
npm run deploy:staging
```

#### 4.2 Verify Fix in Staging
```bash
# Run smoke tests
npm run test:smoke:staging

# Manual verification:
# ✓ Issue is resolved
# ✓ No new issues introduced
# ✓ Related features still work
```

**Exception:** Skip staging for P0 if staging unavailable or time-critical

---

### Phase 5: Production Deployment (15-30 minutes)

#### 5.1 Pre-Deployment
```bash
# Backup database (if needed)
npm run db:backup:production

# Notify team
# "🚨 Deploying hotfix 1.2.1 to production"
```

#### 5.2 Merge to Main
```bash
git checkout main
git merge --no-ff hotfix/1.2.1-ECOM-999-auth-failure -m "hotfix: authentication failure fix"

# Tag new version
git tag -a v1.2.1 -m "Hotfix: Critical authentication bug

Fixed authentication endpoint returning 500 errors.
All users unable to log in since 10:30 AM.

Fixes ECOM-999"

git push origin main --tags
```

#### 5.3 Deploy
```bash
# Deploy hotfix
npm run deploy:production

# Or manually trigger CI/CD
```

#### 5.4 Verify Deployment
```bash
# Health checks
curl https://api.example.com/user-service/health

# Smoke tests
npm run test:smoke:production

# Verify fix
# ✓ Users can log in
# ✓ No errors in logs
# ✓ Error rate back to normal
```

---

### Phase 6: Monitoring (1-24 hours)

#### 6.1 Immediate Monitoring (First Hour)
```bash
# Watch logs continuously
npm run logs:production --follow --service=user-service

# Monitor metrics:
# - Error rate (should drop to normal)
# - Response time (should normalize)
# - Active sessions (should increase)
# - CPU/Memory (should be stable)
```

#### 6.2 Extended Monitoring (24 Hours)
- Check error rates every hour
- Monitor customer support tickets
- Review application logs
- Compare metrics to baseline

---

### Phase 7: Post-Hotfix (24-48 hours)

#### 7.1 Backport to Develop
```bash
# Merge hotfix back to develop branch
git checkout develop
git merge --no-ff hotfix/1.2.1-ECOM-999-auth-failure -m "merge: hotfix 1.2.1 to develop"
git push origin develop
```

#### 7.2 Backport to Release Branch (if exists)
```bash
# If there's an active release branch
git checkout release/1.3.0
git merge --no-ff hotfix/1.2.1-ECOM-999-auth-failure
git push origin release/1.3.0
```

#### 7.3 Clean Up
```bash
# Delete hotfix branch
git branch -d hotfix/1.2.1-ECOM-999-auth-failure
git push origin --delete hotfix/1.2.1-ECOM-999-auth-failure
```

#### 7.4 Update Documentation
```bash
# Update CHANGELOG.md
# Update incident log
# Document lessons learned
```

#### 7.5 Communication
**Update status page:**
```
✅ Incident Resolved

The authentication issue has been resolved. All users can now log in successfully.

Duration: 45 minutes
Impact: 100% of users unable to log in
Root cause: Missing input validation
Resolution: Hotfix deployed at 11:15 AM

We apologize for the inconvenience.
```

**Notify stakeholders:**
- Engineering team
- Customer support
- Product team
- Management (if significant)

---

## Post-Mortem (Within 48 Hours)

### Post-Mortem Template

```markdown
# Post-Mortem: Authentication Failure - 2025-01-15

## Summary
Users unable to log in due to missing input validation in authentication endpoint.

## Timeline
- **10:30 AM** - Issue detected via monitoring alerts
- **10:35 AM** - Incident declared, team notified
- **10:45 AM** - Root cause identified
- **11:00 AM** - Fix developed and tested
- **11:10 AM** - Deployed to staging, verified
- **11:15 AM** - Deployed to production
- **11:20 AM** - Verified resolution
- **11:30 AM** - Incident closed

**Total Duration:** 60 minutes
**Time to Fix:** 30 minutes
**Time to Deploy:** 15 minutes

## Impact
- **Users Affected:** 100% (all users)
- **Duration:** 45 minutes
- **Failed Login Attempts:** ~2,500
- **Revenue Impact:** ~$5,000 (estimated)
- **Customer Support Tickets:** 37

## Root Cause
Missing null/undefined check for email and password parameters allowed
invalid values to reach database query, causing uncaught exception.

## What Went Well
✅ Quick detection (< 5 minutes after deployment)
✅ Clear monitoring alerts
✅ Fast root cause identification
✅ Minimal fix scope
✅ Quick deployment process
✅ Good team communication

## What Went Wrong
❌ Missing test cases for edge cases
❌ No input validation in API layer
❌ Insufficient code review focus on validation
❌ Staging tests didn't catch the issue

## Action Items
1. **Immediate**
   - [ ] Add input validation middleware (Owner: @dev1, Due: 2025-01-16)
   - [ ] Add test cases for null/undefined inputs (Owner: @dev2, Due: 2025-01-16)

2. **Short-term (1 week)**
   - [ ] Audit all API endpoints for input validation (Owner: @dev3, Due: 2025-01-22)
   - [ ] Update code review checklist to emphasize validation (Owner: @tech-lead, Due: 2025-01-22)
   - [ ] Add automated validation tests to CI pipeline (Owner: @dev4, Due: 2025-01-22)

3. **Long-term (1 month)**
   - [ ] Implement API schema validation using Joi/Zod (Owner: @team, Due: 2025-02-15)
   - [ ] Add chaos engineering tests (Owner: @sre, Due: 2025-02-15)
   - [ ] Improve staging test coverage (Owner: @qa, Due: 2025-02-15)

## Prevention
- Enforce input validation at API gateway level
- Require schema validation for all endpoints
- Add property-based testing for edge cases
- Update developer training materials

## Lessons Learned
1. Input validation is critical and should be layered
2. Edge case testing prevents production issues
3. Quick detection and response minimized impact
4. Having a clear hotfix process saved time
```

---

## Hotfix Checklist

```markdown
## Hotfix Checklist - v1.2.1

### Identification
- [ ] Issue identified and documented
- [ ] Severity assessed (P0/P1)
- [ ] Team notified in #incidents
- [ ] Status page updated
- [ ] On-call engineer assigned

### Development
- [ ] Hotfix branch created from main
- [ ] Issue reproduced locally
- [ ] Root cause identified
- [ ] Minimal fix implemented
- [ ] Unit tests added/updated
- [ ] Manual testing completed

### Review
- [ ] PR created with hotfix template
- [ ] Senior developer approval obtained
- [ ] Security review (if applicable)

### Staging
- [ ] Deployed to staging
- [ ] Smoke tests passed
- [ ] Fix verified

### Production
- [ ] Database backup completed (if needed)
- [ ] Merged to main
- [ ] Tagged with new version
- [ ] Deployed to production
- [ ] Health checks passed
- [ ] Fix verified in production

### Post-Deployment
- [ ] Monitoring alerts configured
- [ ] Logs reviewed for errors
- [ ] Metrics back to normal
- [ ] Status page updated (resolved)
- [ ] Team notified

### Cleanup
- [ ] Merged back to develop
- [ ] Merged to release branch (if exists)
- [ ] Hotfix branch deleted
- [ ] Documentation updated

### Post-Mortem
- [ ] Post-mortem scheduled
- [ ] Root cause documented
- [ ] Action items created
- [ ] Lessons learned shared
```

---

## Common Hotfix Scenarios

### Scenario 1: Database Migration Issue
```bash
# Rollback migration
npm run migrate:down:production

# Fix migration script
# Test in staging
# Redeploy with fixed migration
```

### Scenario 2: Configuration Error
```bash
# Update environment variables
kubectl set env deployment/user-service NEW_CONFIG=value

# Restart pods
kubectl rollout restart deployment/user-service
```

### Scenario 3: Dependency Vulnerability
```bash
# Update vulnerable dependency
npm update vulnerable-package

# Run security audit
npm audit

# Test and deploy
```

### Scenario 4: External Service Outage
```bash
# Implement circuit breaker
# Add fallback logic
# Deploy gracefully

# Or temporary workaround:
# - Disable feature
# - Use backup service
# - Queue requests for later
```

---

## Emergency Contacts

```
Tech Lead: @tech-lead (Slack, +1-XXX-XXX-XXXX)
DevOps Lead: @devops-lead (Slack, +1-XXX-XXX-XXXX)
On-Call Rotation: See PagerDuty schedule
Security Team: @security (Slack)
Database Admin: @dba (Slack, +1-XXX-XXX-XXXX)
```

---

## Hotfix vs Regular Release

| Aspect | Hotfix | Regular Release |
|--------|--------|-----------------|
| **Trigger** | Production emergency | Scheduled sprint end |
| **Branch** | From main | From develop |
| **Scope** | Minimal fix only | Multiple features |
| **Review** | 1 senior dev, fast | 2 devs, thorough |
| **Testing** | Critical paths only | Full test suite |
| **Staging** | Quick verification | 2-3 days QA |
| **Approval** | Fast-track | Full sign-off process |
| **Timeline** | Hours | Days/weeks |
| **Risk** | Higher (speed) | Lower (thorough testing) |

---

## Best Practices

### ✅ Do's
- Act quickly but carefully
- Communicate clearly and frequently
- Keep the fix minimal
- Test in staging when possible
- Monitor closely after deployment
- Document everything
- Conduct post-mortem

### ❌ Don'ts
- Don't panic
- Don't skip testing entirely
- Don't add unrelated changes
- Don't refactor during hotfix
- Don't deploy late Friday
- Don't skip communication
- Don't forget to backport

---

## Metrics

Track these for hotfix process improvement:

- **Time to Detect:** Incident start → detection
- **Time to Fix:** Detection → fix ready
- **Time to Deploy:** Fix ready → deployed
- **Total MTTR:** Incident start → resolved
- **Hotfix Frequency:** Number per month
- **Hotfix Success Rate:** % deployed successfully

**Target Metrics:**
- Time to detect: < 5 minutes
- Time to fix: < 2 hours (P0), < 4 hours (P1)
- Time to deploy: < 30 minutes
- Total MTTR: < 1 hour (P0), < 4 hours (P1)
- Hotfix frequency: < 2 per month
- Success rate: > 95%
