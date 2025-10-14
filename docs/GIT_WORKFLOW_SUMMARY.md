# Git Workflow - Quick Reference

## 📚 Complete Documentation Index

1. **[GIT_WORKFLOW.md](./GIT_WORKFLOW.md)** - Main workflow guide
2. **[PULL_REQUEST_TEMPLATE.md](./PULL_REQUEST_TEMPLATE.md)** - PR template
3. **[CODE_REVIEW_CHECKLIST.md](./CODE_REVIEW_CHECKLIST.md)** - Review guidelines
4. **[RELEASE_PROCESS.md](./RELEASE_PROCESS.md)** - Release procedures
5. **[HOTFIX_GUIDE.md](./HOTFIX_GUIDE.md)** - Emergency fixes
6. **[CI_CD_PIPELINE](../.github/workflows/ci.yml)** - Automated checks

---

## 🌳 Branch Strategy

```
main (production)
  └── Protected, requires 2 approvals
  
staging (pre-production)
  └── Protected, requires 1 approval, E2E tests
  
develop (integration)
  └── Protected, requires 1 approval
  
feature/<service>/<ticket>-<description>
  └── From develop, squash merge back
  
bugfix/<service>/<ticket>-<description>
  └── From develop, squash merge back
  
hotfix/<version>-<ticket>-<description>
  └── From main, merge to main + develop
  
release/<version>
  └── From develop, merge to staging → main
```

---

## 🚀 Common Workflows

### Start New Feature

```bash
# 1. Update develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/user-service/ECOM-123-add-password-reset

# 3. Develop feature
# ... make changes ...

# 4. Commit with conventional commit
git add .
git commit -m "feat(user-service): add password reset functionality

- Implement token generation
- Add email notification
- Update API documentation

Closes ECOM-123"

# 5. Push and create PR
git push -u origin feature/user-service/ECOM-123-add-password-reset
```

### Code Review Process

```bash
# 1. Reviewer assigned automatically (CODEOWNERS)
# 2. CI checks run automatically
# 3. Reviewer approves/requests changes
# 4. Author addresses feedback
# 5. Auto-merge when approved + CI passes
```

### Release to Production

```bash
# 1. Create release branch (end of sprint)
git checkout develop
git checkout -b release/1.2.0

# 2. Bump version and update changelog
npm version 1.2.0 --no-git-tag-version
npm run changelog

# 3. Deploy to staging for QA (2-3 days)
git checkout staging
git merge --no-ff release/1.2.0

# 4. After QA approval, deploy to production
git checkout main
git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release 1.2.0"
git push origin main --tags

# 5. Merge back to develop
git checkout develop
git merge --no-ff release/1.2.0
```

### Emergency Hotfix

```bash
# 1. Create hotfix from main
git checkout main
git checkout -b hotfix/1.2.1-ECOM-999-critical-bug

# 2. Fix the bug (minimal changes)
# ... make fix ...

# 3. Test thoroughly
npm run test

# 4. Fast-track review (1 senior dev)
git push origin hotfix/1.2.1-ECOM-999-critical-bug
# Create PR, get approval

# 5. Deploy to production
git checkout main
git merge --no-ff hotfix/1.2.1-ECOM-999-critical-bug
git tag -a v1.2.1 -m "Hotfix: Critical bug"
git push origin main --tags

# 6. Backport to develop
git checkout develop
git merge --no-ff hotfix/1.2.1-ECOM-999-critical-bug
```

---

## ✅ Quality Gates

All PRs must pass:

| Gate | Threshold | Blocking |
|------|-----------|----------|
| Linting | 0 errors | ✅ |
| Type Check | 0 errors | ✅ |
| Unit Tests | 100% pass | ✅ |
| Coverage | ≥ 80% | ✅ |
| Security Scan | 0 high/critical | ✅ |
| Build | Success | ✅ |
| Code Review | 1-2 approvals | ✅ |

---

## 📝 Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `perf`: Performance
- `test`: Tests
- `chore`: Maintenance
- `ci`: CI/CD changes

**Example:**
```bash
feat(user-service): add password reset functionality

Implement password reset flow with email notifications.
Users can now request password reset via email.

Closes ECOM-123
```

---

## 🔄 PR Review Timeline

- **Small PR (< 200 lines):** 15-30 min review
- **Medium PR (200-500 lines):** 30-60 min review
- **Large PR (> 500 lines):** 1-2 hours (consider splitting)
- **Response time:** < 4 hours during business hours

---

## 🎯 Best Practices

### ✅ Do's
- Keep PRs small (< 500 lines)
- Write clear commit messages
- Update tests with code
- Request review early
- Delete branches after merge
- Respond to feedback quickly

### ❌ Don'ts
- Don't commit to protected branches
- Don't force push to protected branches
- Don't merge without approval
- Don't skip CI checks
- Don't commit secrets
- Don't create huge PRs

---

## 🚨 When Things Go Wrong

### Build Fails
```bash
# Check CI logs
# Fix the issue
# Push fix
git add .
git commit -m "fix: resolve build error"
git push
```

### Merge Conflicts
```bash
# Update your branch
git checkout feature/my-feature
git fetch origin
git rebase origin/develop

# Resolve conflicts
# git add resolved files
git rebase --continue

# Force push (feature branches only)
git push --force-with-lease
```

### Need to Rollback
```bash
# Production rollback
git revert -m 1 <merge-commit-hash>
git push origin main

# Or use previous tag
kubectl rollout undo deployment/service-name
```

---

## 📞 Who to Contact

- **Tech Lead:** @tech-lead - Architecture, complex changes
- **DevOps Lead:** @devops-lead - Infrastructure, deployments
- **Security Lead:** @security-lead - Security concerns
- **DBA Lead:** @dba-lead - Database changes
- **QA Lead:** @qa-lead - Testing questions

---

## 🎓 New Developer Onboarding

1. Read [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)
2. Review 2-3 recent PRs
3. Make a documentation PR (practice)
4. Pair with senior dev on first feature PR
5. Shadow a code review session
6. Attend release retrospective

---

## 📊 Metrics We Track

- PR cycle time (target: < 1 day)
- Review time (target: < 4 hours)
- Build success rate (target: > 95%)
- Deployment frequency (target: 10+ per week)
- Change failure rate (target: < 5%)
- MTTR (target: < 1 hour)

---

## 🛠️ Tools & Commands

### Useful Git Commands

```bash
# Create branch
git checkout -b feature/my-feature

# Update branch with latest
git fetch origin
git rebase origin/develop

# Squash last N commits
git rebase -i HEAD~3

# Amend last commit
git commit --amend

# Cherry-pick commit
git cherry-pick <commit-hash>

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# View branch history
git log --oneline --graph --all

# Clean up merged branches
git branch --merged | grep -v "\*" | xargs -n 1 git branch -d
```

### Project Scripts

```bash
# Development
npm run dev          # Start all services
npm run dev:service  # Start specific service

# Building
npm run build        # Build all
npm run build:affected  # Build only changed

# Testing
npm run test         # All tests
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e     # E2E tests

# Code quality
npm run lint         # Check linting
npm run lint:fix     # Auto-fix linting
npm run type-check   # TypeScript check
npm run format       # Format code
npm run format:check # Check formatting

# Database
npm run migrate      # Run migrations
npm run migrate:down # Rollback migrations
npm run seed         # Seed database

# Deployment
npm run deploy:staging     # Deploy to staging
npm run deploy:production  # Deploy to production
```

---

## 📖 Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Semantic Versioning](https://semver.org/)
- [Code Review Best Practices](https://google.github.io/eng-practices/review/)

---

## 🔄 Workflow Diagram

```
Developer          CI/CD            Reviewer         Production
    |                |                 |                 |
    |-- Create PR -->|                 |                 |
    |                |-- Run Tests --->|                 |
    |                |-- Run Lint ---->|                 |
    |                |-- Run Build --->|                 |
    |                |                 |                 |
    |                |<-- All Pass ----|                 |
    |                |                 |                 |
    |<---------------|---- Review -----|                 |
    |                |                 |                 |
    |-- Address   -->|                 |                 |
    |   Feedback     |                 |                 |
    |                |                 |                 |
    |                |<-- Approve -----|                 |
    |                |                 |                 |
    |-- Merge ------>|                 |                 |
    |                |                 |                 |
    |                |-- Deploy -------|-------------->  |
    |                |                 |                 |
    |                |<-- Monitor -----|-------------->  |
```

---

## 📅 Release Schedule

**2-Week Sprint Cycle:**

- **Week 1-2:** Feature development
- **Thursday (Week 2):** Code freeze, create release branch
- **Friday-Monday:** QA testing on staging
- **Tuesday:** Deploy to production
- **Wednesday:** Monitor & fix issues
- **Thursday:** Sprint retrospective
- **Friday:** Sprint planning

---

## 🎯 Success Criteria

You're following the workflow correctly when:

✅ All commits follow conventional commit format
✅ All PRs are < 500 lines
✅ All PRs have tests
✅ All PRs pass CI checks
✅ PRs are reviewed within 4 hours
✅ Branches are deleted after merge
✅ Production deployments happen smoothly
✅ Rollbacks are rare (< 5%)
✅ Team velocity is increasing
✅ Code quality metrics improving

---

## 🆘 Emergency Procedures

### P0 Incident (Production Down)
1. Declare incident in #incidents
2. Create hotfix branch from main
3. Develop minimal fix
4. Fast-track review (1 senior dev)
5. Deploy immediately
6. Monitor closely
7. Post-mortem within 48 hours

### Security Vulnerability
1. Create private security advisory
2. Develop patch in private repo
3. Test thoroughly
4. Coordinate disclosure
5. Deploy patch
6. Publish advisory

---

This is your quick reference guide. For detailed information, see the full documentation links at the top of this document.
