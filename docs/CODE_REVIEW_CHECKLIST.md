# Code Review Checklist

## For Authors (Before Creating PR)

### Code Quality
- [ ] Code follows ESLint rules (no errors or warnings)
- [ ] No `console.log` or debug statements left in code
- [ ] No commented-out code blocks
- [ ] TypeScript types properly defined
- [ ] No use of `any` type without justification
- [ ] Error handling implemented for all failure cases
- [ ] Edge cases and boundary conditions considered
- [ ] Functions are small and focused (< 50 lines)
- [ ] Variable and function names are descriptive
- [ ] Code is DRY (Don't Repeat Yourself)

### Testing
- [ ] Unit tests added for new functionality
- [ ] Unit tests updated for modified functionality
- [ ] Code coverage is ≥ 80%
- [ ] Tests are meaningful (not just for coverage)
- [ ] All tests pass locally (`npm run test`)
- [ ] Integration tests added for API endpoints
- [ ] Manual testing completed
- [ ] Edge cases tested

### Documentation
- [ ] README updated if public API changed
- [ ] API documentation updated (Swagger/OpenAPI)
- [ ] Inline comments for complex logic
- [ ] JSDoc comments for public functions
- [ ] CHANGELOG.md updated
- [ ] Migration guides for breaking changes

### Security
- [ ] No secrets, API keys, or passwords in code
- [ ] No secrets in commit history
- [ ] Input validation implemented
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize user input)
- [ ] Authentication checks in place
- [ ] Authorization checks in place
- [ ] CORS properly configured
- [ ] Rate limiting considered
- [ ] Sensitive data encrypted

### Performance
- [ ] No N+1 query problems
- [ ] Database indexes added where needed
- [ ] Caching strategy considered
- [ ] No synchronous blocking operations
- [ ] Large datasets paginated
- [ ] Memory leaks prevented
- [ ] API response times acceptable

### Dependencies
- [ ] Only necessary dependencies added
- [ ] Package versions specified (no wildcards)
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Dependencies are actively maintained
- [ ] License compatibility checked

### Database
- [ ] Migration scripts provided
- [ ] Rollback scripts provided
- [ ] Migrations tested locally
- [ ] No data loss risk
- [ ] Backward compatible if possible

---

## For Reviewers

### First Pass (5 minutes)

#### Administrative
- [ ] PR title is clear and descriptive
- [ ] PR description explains the "why"
- [ ] Linked to ticket/issue
- [ ] Appropriate branch naming
- [ ] Reasonable size (< 500 lines preferred)
- [ ] All CI checks are passing
- [ ] No merge conflicts

### Deep Review (15-30 minutes)

#### Functionality
- [ ] Code does what the PR claims
- [ ] Logic is correct
- [ ] No obvious bugs
- [ ] Edge cases are handled
- [ ] Error messages are helpful
- [ ] User experience is good

#### Code Quality
- [ ] Easy to read and understand
- [ ] Well-organized and structured
- [ ] Follows SOLID principles
- [ ] Appropriate abstractions
- [ ] No code smells
- [ ] Consistent with existing codebase
- [ ] No premature optimization
- [ ] No over-engineering

#### Architecture
- [ ] Follows established patterns
- [ ] Doesn't introduce tight coupling
- [ ] Service boundaries respected
- [ ] Shared code in appropriate location
- [ ] Doesn't violate separation of concerns
- [ ] Scalability considered
- [ ] Maintainability considered

#### Testing
- [ ] Tests cover new functionality
- [ ] Tests cover edge cases
- [ ] Tests are clear and maintainable
- [ ] Mock usage is appropriate
- [ ] Tests actually verify behavior
- [ ] No flaky tests
- [ ] Test data is realistic

#### Security
- [ ] No security vulnerabilities
- [ ] Sensitive data is protected
- [ ] Input validation is present
- [ ] Authentication is correct
- [ ] Authorization is correct
- [ ] No injection vulnerabilities
- [ ] Proper error handling (no info leakage)

#### Performance
- [ ] No obvious performance issues
- [ ] Database queries are optimized
- [ ] Indexes used appropriately
- [ ] Caching used where beneficial
- [ ] No blocking operations
- [ ] Async/await used correctly
- [ ] Resource cleanup (connections, files)

#### Documentation
- [ ] Code is self-documenting
- [ ] Complex logic is explained
- [ ] API changes are documented
- [ ] Public functions have JSDoc
- [ ] README is up to date

---

## Feedback Guidelines

### Giving Good Feedback

**Be Specific:**
```
❌ "This is confusing"
✅ "The variable name `x` doesn't convey what it represents. Consider `userId` instead."
```

**Be Constructive:**
```
❌ "This code is terrible"
✅ "Consider extracting this 100-line function into smaller, focused functions for better testability."
```

**Explain the Why:**
```
❌ "Don't use callbacks here"
✅ "Using Promises instead of callbacks would make this code easier to test and handle errors better."
```

**Offer Alternatives:**
```
❌ "This won't scale"
✅ "This approach loads all records into memory. Consider pagination or streaming for large datasets."
```

**Ask Questions:**
```
❌ "This is wrong"
✅ "Have you considered what happens when the user ID is undefined here?"
```

### Use Labels

- `nit:` - Minor style suggestion, not blocking
- `question:` - Asking for clarification
- `suggestion:` - Alternative approach to consider
- `blocking:` - Must be fixed before merge
- `security:` - Security concern (always blocking)
- `performance:` - Performance concern
- `praise:` - Highlight good work

**Examples:**
```
nit: Consider adding a blank line here for readability

question: Why did you choose to use recursion here instead of iteration?

suggestion: You might want to extract this logic into a separate utility function

blocking: This function doesn't handle the case when the array is empty, which will cause a crash

security: User input is not validated here, which could lead to SQL injection

praise: Great use of the repository pattern here! Much cleaner than before.
```

---

## Common Code Smells to Watch For

### Functions
- [ ] Functions longer than 50 lines
- [ ] Functions with more than 3-4 parameters
- [ ] Functions doing multiple things
- [ ] Deeply nested conditionals (> 3 levels)

### Variables
- [ ] Single-letter variable names (except `i`, `j` in loops)
- [ ] Variables declared far from usage
- [ ] Mutable variables when const would work
- [ ] Magic numbers (use named constants)

### Structure
- [ ] Duplicate code (violation of DRY)
- [ ] God objects (classes doing too much)
- [ ] Tight coupling between modules
- [ ] Missing error handling
- [ ] Swallowing exceptions silently

### TypeScript Specific
- [ ] Using `any` type
- [ ] Type assertions without justification
- [ ] Non-null assertions (`!`) without checks
- [ ] Missing return type annotations
- [ ] Ignoring TypeScript errors with `@ts-ignore`

---

## When to Approve

**Approve when:**
- All blocking issues are resolved
- Code meets quality standards
- Tests are adequate
- Documentation is sufficient
- You're confident it won't break production

**Request changes when:**
- Security vulnerabilities exist
- Major bugs are present
- Tests are missing or inadequate
- Breaking changes lack migration path
- Performance issues are critical

**Comment (no approval) when:**
- You have questions
- You want to suggest improvements
- You're not qualified to fully review
- Waiting for CI checks to complete

---

## Review Time Expectations

- **Small PRs (< 200 lines):** 15-30 minutes
- **Medium PRs (200-500 lines):** 30-60 minutes
- **Large PRs (> 500 lines):** 1-2 hours (consider splitting)

**Response time:** Within 4 hours during business hours

---

## Automated Checks (Pre-Review)

These should pass before requesting human review:

- ✅ Linting passes
- ✅ Type checking passes
- ✅ All tests pass
- ✅ Code coverage ≥ 80%
- ✅ Build succeeds
- ✅ No security vulnerabilities
- ✅ No merge conflicts

---

## Post-Review

### After Approval
- [ ] Author addresses non-blocking feedback (optional)
- [ ] Author merges PR
- [ ] Author deletes feature branch
- [ ] PR is linked to ticket (auto-close)

### After Merge
- [ ] Monitor deployment
- [ ] Watch for errors in logs
- [ ] Be available for quick fixes
- [ ] Update team in Slack

---

## Special Cases

### Urgent Hotfixes
- Streamlined review process
- Focus on correctness, not style
- 1 approval from senior developer
- Deploy to staging first

### Documentation-Only PRs
- Lighter review process
- Check for accuracy and clarity
- 1 approval required

### Dependency Updates
- Check changelog for breaking changes
- Run full test suite
- Verify no vulnerabilities introduced
- 1 approval required

---

## Review Rotation

To ensure fair distribution:
- Use GitHub's "Load Balance" assignment
- Senior developers review complex changes
- Junior developers review simpler changes
- Everyone reviews documentation

**Weekly rotation:**
- Week 1: Dev A (primary), Dev B (secondary)
- Week 2: Dev C (primary), Dev D (secondary)
- Continue rotation...

---

## Tips for Effective Reviews

### For Reviewers
- Review code, not the person
- Be respectful and professional
- Focus on objective improvements
- Praise good work
- Learn from others' code
- Don't nitpick formatting (use automated tools)
- Consider the context and constraints
- Respond in a timely manner

### For Authors
- Accept criticism gracefully
- Ask questions if feedback is unclear
- Explain your reasoning
- Don't take it personally
- Iterate quickly on feedback
- Thank reviewers for their time
- Be open to learning

---

## Resources

- [Google's Code Review Developer Guide](https://google.github.io/eng-practices/review/)
- [Conventional Comments](https://conventionalcomments.org/)
- [Pull Request Best Practices](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests)
