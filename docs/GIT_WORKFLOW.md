# Git Workflow Strategy

## Overview

This document defines the Git workflow for our e-commerce microservices platform with 5-8 developers working in a monorepo structure.

**Strategy:** GitFlow with modifications for monorepo microservices

---

## 1. Branch Naming Conventions

### Main Branches (Protected)

```
main                    # Production-ready code
├── develop             # Integration branch for next release
└── staging             # Pre-production testing
```

### Supporting Branches

#### Feature Branches
```
feature/<service>/<ticket-id>-<short-description>
```

**Examples:**
- `feature/user-service/ECOM-123-add-password-reset`
- `feature/product-service/ECOM-456-add-search-filters`
- `feature/shared/ECOM-789-update-logger-package`

#### Bugfix Branches
```
bugfix/<service>/<ticket-id>-<short-description>
```

**Examples:**
- `bugfix/order-service/ECOM-234-fix-payment-timeout`
- `bugfix/cart-service/ECOM-567-fix-quantity-validation`

#### Hotfix Branches
```
hotfix/<version>-<ticket-id>-<short-description>
```

**Examples:**
- `hotfix/1.2.1-ECOM-890-critical-auth-bug`
- `hotfix/1.3.2-ECOM-901-payment-gateway-down`

#### Release Branches
```
release/<version>
```

**Examples:**
- `release/1.2.0`
- `release/2.0.0`

---

## 2. Pull Request Templates & Review Process

See [PULL_REQUEST_TEMPLATE.md](./PULL_REQUEST_TEMPLATE.md) for the full template.

### Review Process

#### Stage 1: Automated Checks (Pre-Review)
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Unit tests (Jest) - >80% coverage
- ✅ Build succeeds
- ✅ Security scan

#### Stage 2: Code Review
**Required Reviewers:**
- Small changes (< 200 lines): 1 approval
- Medium changes (200-500 lines): 2 approvals
- Large changes (> 500 lines): 2 approvals + tech lead
- Breaking changes: 2 approvals + tech lead + architecture review

**Review Timeline:** Within 4 hours during business hours

#### Stage 3: Testing
- Feature branches → Deploy to dev environment
- After approval → Deploy to staging

#### Stage 4: Merge
- Must have all approvals
- Must pass all automated checks
- Must be up-to-date with target branch

---

## 3. Merge Strategies

### Feature → Develop: Squash and Merge
Clean history, easier to revert

### Develop → Staging: Merge Commit
Preserve feature context for testing

### Staging → Main: Merge Commit + Tag
Clear release points, enables rollbacks

```bash
git checkout main
git merge --no-ff staging -m "release: version 1.2.0"
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin main --tags
```

---

## 4. Release Management Process

**Cycle:** 2-Week Sprints

### Release Steps

1. **Create Release Branch**
   ```bash
   git checkout develop
   git checkout -b release/1.2.0
   ```

2. **Version Bump & Changelog**
   ```bash
   npm version 1.2.0 --no-git-tag-version
   npm run changelog
   ```

3. **Deploy to Staging** (2-3 days QA testing)

4. **Merge to Main**
   ```bash
   git checkout main
   git merge --no-ff release/1.2.0
   git tag -a v1.2.0 -m "Release 1.2.0"
   ```

5. **Merge Back to Develop**

See [RELEASE_PROCESS.md](./RELEASE_PROCESS.md) for detailed steps.

---

## 5. Hotfix Procedures

### Priority Levels

| Level | Response Time | Examples |
|-------|---------------|----------|
| **P0** | < 1 hour | Complete outage, security breach |
| **P1** | < 4 hours | Major feature broken, payment issues |
| **P2** | Next release | Minor bugs |

### Hotfix Workflow

1. Create hotfix branch from `main`
2. Develop & test fix (keep minimal)
3. Fast-track review (1 senior dev)
4. Deploy to staging first
5. Deploy to production
6. Backport to develop
7. Post-mortem within 24 hours

See [HOTFIX_GUIDE.md](./HOTFIX_GUIDE.md) for details.

---

## 6. Code Review Checklist

### For Authors
- [ ] Code follows style guide (ESLint passes)
- [ ] No console.log or debug statements
- [ ] Tests added/updated (>80% coverage)
- [ ] Documentation updated
- [ ] No secrets in code
- [ ] Security best practices followed

### For Reviewers
- [ ] Functionality is correct
- [ ] Code is maintainable
- [ ] Tests are meaningful
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed

See [CODE_REVIEW_CHECKLIST.md](./CODE_REVIEW_CHECKLIST.md) for complete list.

---

## 7. Automated Quality Gates

### Pre-Commit (Husky)
- Lint staged files
- Type check

### Pre-Push
- Run tests
- Ensure build succeeds

### CI Pipeline (GitHub Actions)
- Code quality checks
- Security scan
- Unit & integration tests
- Build verification
- Code coverage check (>80%)

See [CI_CD_PIPELINE.md](./CI_CD_PIPELINE.md) for complete configuration.

### Quality Gate Criteria

| Check | Threshold | Blocking |
|-------|-----------|----------|
| Linting | 0 errors | ✅ Yes |
| Type Errors | 0 errors | ✅ Yes |
| Unit Tests | 100% pass | ✅ Yes |
| Code Coverage | ≥ 80% | ✅ Yes |
| Security Scan | 0 high/critical | ✅ Yes |
| Build Success | Must succeed | ✅ Yes |

---

## Branch Protection Rules

### Main Branch
- Require 2 PR reviews
- Require all status checks to pass
- Require up-to-date branches
- No force pushes
- No deletions
- Require signed commits

### Develop Branch
- Require 1 PR review
- Require status checks
- Allow force pushes (maintainers only)

---

## Commit Message Convention

Follow **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance
- `ci`: CI/CD changes

### Examples

```bash
feat(user-service): add password reset functionality

Implement password reset flow with email notifications

Closes ECOM-123
```

---

## Best Practices

### ✅ Do's
- Keep PRs small (< 500 lines)
- Write descriptive commit messages
- Update documentation with code changes
- Add tests for new features
- Delete branches after merge

### ❌ Don'ts
- Don't commit directly to protected branches
- Don't force push to protected branches
- Don't merge without approvals
- Don't skip CI checks
- Don't commit secrets

---

## Related Documentation

- [Pull Request Template](./PULL_REQUEST_TEMPLATE.md)
- [Code Review Checklist](./CODE_REVIEW_CHECKLIST.md)
- [Release Process](./RELEASE_PROCESS.md)
- [Hotfix Guide](./HOTFIX_GUIDE.md)
- [CI/CD Pipeline](./CI_CD_PIPELINE.md)

---

## Team Training

New developers should:
1. Read this workflow guide
2. Review 2-3 recent PRs
3. Pair with senior dev for first PR
4. Complete Git training module

---

## Metrics to Track

- PR Cycle Time (target: < 1 day)
- Review Time (target: < 4 hours)
- Build Success Rate (target: > 95%)
- Deployment Frequency (target: 10+ per week)
- Change Failure Rate (target: < 5%)
- Mean Time to Recovery (target: < 1 hour)
