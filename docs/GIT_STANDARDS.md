# Git Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** November 3, 2025

---

## Table of Contents

1. [Commit Message Standards](#commit-message-standards)
2. [Branch Naming](#branch-naming)
3. [Pull Request Process](#pull-request-process)
4. [Git Workflow](#git-workflow)
5. [Code Review Guidelines](#code-review-guidelines)

---

## Commit Message Standards

### Commit Message Format (MANDATORY)

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

```
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Code style changes (formatting, missing semicolons, etc.)
refactor: Code refactoring (neither fixes a bug nor adds a feature)
perf:     Performance improvements
test:     Adding or updating tests
chore:    Maintenance tasks (dependency updates, build config, etc.)
ci:       CI/CD changes
revert:   Reverting a previous commit
```

### Examples

```bash
# ✅ CORRECT: Feature addition
feat(jobs): add salary range filter to job search

# ✅ CORRECT: Bug fix
fix(auth): resolve token expiration handling issue

Tokens were not being properly refreshed when expired.
Now includes automatic retry logic with token refresh.

Fixes #123

# ✅ CORRECT: Documentation
docs(readme): update installation instructions

# ✅ CORRECT: Refactoring
refactor(services): migrate JobController logic to JobService

- Move business logic from controller to service layer
- Add comprehensive validation in service
- Update tests to reflect new architecture

Part of Phase 2 refactoring initiative.

# ✅ CORRECT: Breaking change
feat(api): change response format to use resource-specific keys

BREAKING CHANGE: API responses now use resource-specific keys
(e.g., "job" instead of "data"). Clients must update to handle
new response format.

Before: { "success": true, "data": { ... } }
After:  { "success": true, "job": { ... } }

# ❌ WRONG: No type
"fixed the bug"

# ❌ WRONG: Vague subject
fix: update code

# ❌ WRONG: Too long subject
feat(jobs): add a new feature that allows users to search for jobs by multiple criteria including salary, location, employment type, and experience level
```

### Subject Line Rules

```
1. Use imperative mood ("add" not "added" or "adds")
2. Don't capitalize first letter
3. No period at the end
4. Maximum 50 characters
5. Be specific and descriptive

✅ CORRECT:
feat(auth): add password reset functionality
fix(jobs): resolve duplicate job posting issue
docs(api): update endpoint documentation

❌ WRONG:
feat(auth): Added password reset functionality  # Past tense
Fix(jobs): Resolve duplicate issue.  # Capitalized, has period
docs: updated docs  # Too vague
feat(jobs): add a new feature for managing job postings with advanced filtering # Too long
```

### Scope Guidelines

```
Use the affected module or feature area:

auth          - Authentication/authorization
jobs          - Job management
candidates    - Candidate management
applications  - Application management
interviews    - Interview scheduling
api           - API-related changes
db            - Database changes
ui            - UI/frontend changes
tests         - Test-related changes
config        - Configuration changes
deps          - Dependency updates

Examples:
feat(auth): add JWT refresh token support
fix(candidates): resolve profile image upload issue
test(jobs): add integration tests for job creation
chore(deps): upgrade express to v4.18.0
```

---

## Branch Naming

### Branch Naming Convention

```
type/short-description

Types:
feature/    - New features
bugfix/     - Bug fixes
hotfix/     - Urgent production fixes
refactor/   - Code refactoring
docs/       - Documentation updates
test/       - Test additions/updates
chore/      - Maintenance tasks
```

### Examples

```bash
# ✅ CORRECT: Descriptive branch names
feature/job-salary-filter
bugfix/token-expiration-issue
hotfix/critical-security-vulnerability
refactor/phase2-controller-migration
docs/api-documentation-update
test/integration-tests-jobs
chore/upgrade-dependencies

# ❌ WRONG: Poor branch names
my-branch               # No type, not descriptive
fix                     # Too vague
feature/new-stuff       # Not specific enough
john-dev                # Personal branches should be avoided
temp-fix                # Temporary branches should be cleaned up
```

### Branch Lifecycle

```bash
# Create feature branch
git checkout -b feature/job-salary-filter

# Work on feature
git add .
git commit -m "feat(jobs): add salary range filter"

# Keep branch updated with main
git checkout main
git pull origin main
git checkout feature/job-salary-filter
git rebase main

# Push branch
git push origin feature/job-salary-filter

# After PR is merged, delete branch
git branch -d feature/job-salary-filter
git push origin --delete feature/job-salary-filter
```

---

## Pull Request Process

### PR Title Format

```
Same as commit message format:
type(scope): description

Examples:
feat(jobs): add salary range filter
fix(auth): resolve token expiration issue
docs(readme): update installation guide
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Related Issues
Fixes #123
Relates to #456

## Changes Made
- List key changes
- Be specific
- Include technical details

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project coding standards
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console.log or debugging code
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No merge conflicts

## Additional Notes
Any additional context or considerations
```

### PR Best Practices

```
1. Keep PRs small and focused (< 400 lines changed)
2. One feature/fix per PR
3. Write clear, descriptive PR titles
4. Fill out the PR template completely
5. Request reviews from appropriate team members
6. Respond to review comments promptly
7. Keep PR branch updated with main
8. Squash commits if requested
9. Delete branch after merge
10. Link related issues

✅ GOOD PR:
- 150 lines changed
- Single feature
- Clear description
- Tests included
- Documentation updated

❌ BAD PR:
- 2000 lines changed
- Multiple unrelated changes
- No description
- No tests
- Conflicts with main
```

---

## Git Workflow

### Feature Development Workflow

```bash
# 1. Start with updated main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/job-salary-filter

# 3. Make changes and commit regularly
git add src/services/JobService.js
git commit -m "feat(jobs): add salary filter validation"

git add tests/services/JobService.test.js
git commit -m "test(jobs): add tests for salary filter"

# 4. Keep branch updated (rebase regularly)
git fetch origin main
git rebase origin/main

# 5. Push to remote
git push origin feature/job-salary-filter

# 6. Create Pull Request on GitHub

# 7. Address review comments
git add .
git commit -m "refactor(jobs): address PR review comments"
git push origin feature/job-salary-filter

# 8. After PR approval and merge
git checkout main
git pull origin main
git branch -d feature/job-salary-filter
```

### Hotfix Workflow

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# 2. Fix the issue
git add .
git commit -m "fix(security): patch critical vulnerability"

# 3. Push and create PR immediately
git push origin hotfix/critical-security-fix

# 4. Fast-track review and merge

# 5. After merge, pull and delete
git checkout main
git pull origin main
git branch -d hotfix/critical-security-fix
```

### Rebasing vs Merging

```bash
# ✅ RECOMMENDED: Rebase for clean history
git checkout feature/my-feature
git fetch origin main
git rebase origin/main

# If conflicts occur
# 1. Resolve conflicts in files
# 2. Stage resolved files
git add .
# 3. Continue rebase
git rebase --continue

# Force push after rebase (only on your feature branch!)
git push origin feature/my-feature --force-with-lease

# ❌ AVOID: Merge commits on feature branches
git merge origin/main  # Creates merge commit
```

### Stashing Changes

```bash
# Save work in progress
git stash save "WIP: implementing salary filter"

# List stashes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{1}

# Drop stash
git stash drop stash@{0}
```

---

## Code Review Guidelines

### For Reviewers

```markdown
## What to Check

### Code Quality
- [ ] Code follows project standards
- [ ] No code smells or anti-patterns
- [ ] Proper error handling
- [ ] Input validation present
- [ ] No security vulnerabilities
- [ ] No hardcoded secrets or sensitive data

### Architecture
- [ ] Follows layer architecture (routes → controllers → services → repositories)
- [ ] Proper separation of concerns
- [ ] Service layer contains business logic
- [ ] Repository layer handles data access
- [ ] Controllers are thin HTTP handlers

### Testing
- [ ] Adequate test coverage
- [ ] Tests are meaningful and not trivial
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Tests cover edge cases and error conditions
- [ ] All tests passing

### Database
- [ ] Uses custom query wrapper (not pool.query)
- [ ] Filters by organization_id for tenant isolation
- [ ] Uses parameterized queries (no SQL injection risk)
- [ ] Includes audit columns (created_at, updated_at, etc.)
- [ ] Uses soft deletes (deleted_at)

### Documentation
- [ ] JSDoc comments for public functions
- [ ] README updated if needed
- [ ] API documentation updated if endpoints changed
- [ ] Inline comments for complex logic

### Performance
- [ ] No N+1 query problems
- [ ] Appropriate use of indexes
- [ ] Pagination for large datasets
- [ ] No unnecessary re-renders (frontend)

### Security
- [ ] Tenant isolation enforced
- [ ] Authentication required where appropriate
- [ ] Authorization checks present
- [ ] Input validation and sanitization
- [ ] No sensitive data in logs
```

### Review Comment Examples

```markdown
# ✅ GOOD: Constructive feedback
🔴 **Critical:** This query is vulnerable to SQL injection. Use parameterized queries.
```javascript
// Current (vulnerable)
const query = `SELECT * FROM users WHERE email = '${email}'`;

// Suggested
const query = 'SELECT * FROM users WHERE email = $1';
await pool.query(query, [email]);
```

💡 **Suggestion:** Consider extracting this validation logic into a reusable validator.

👍 **Nice:** Great use of the custom query wrapper for tenant isolation!

❓ **Question:** What happens if the user doesn't have permission? Should we return 403?

# ❌ BAD: Unhelpful feedback
"This is wrong."
"I don't like this."
"Change this."
```

### Review Response Guidelines

```markdown
# For PR Authors

## Responding to Comments

✅ DO:
- Acknowledge all comments
- Ask clarifying questions if needed
- Explain your reasoning
- Make requested changes
- Mark conversations as resolved after addressing

❌ DON'T:
- Ignore comments
- Get defensive
- Make unrelated changes
- Force push without warning
- Mark conversations resolved without addressing them

## Example Responses

"Good catch! I'll update to use parameterized queries."

"I see your point about validation. I've extracted it into a separate validator function."

"I'm not sure I understand the concern here. Could you clarify what issue you're seeing?"

"I've addressed all comments. Let me know if anything else needs attention."
```

---

## Git Best Practices

### What to Commit

```bash
# ✅ COMMIT:
- Source code changes
- Test files
- Documentation
- Configuration files (without secrets)
- Package.json / package-lock.json

# ❌ DON'T COMMIT:
- node_modules/
- .env files
- IDE config (.vscode/, .idea/)
- Log files (*.log)
- Build artifacts (dist/, build/)
- OS files (.DS_Store, Thumbs.db)
- Temporary files
- Credentials or secrets
- Large binary files
```

### .gitignore Template

```gitignore
# Dependencies
node_modules/
package-lock.json  # Or keep, depending on policy

# Environment variables
.env
.env.local
.env.*.local

# Build output
dist/
build/
out/

# Logs
logs/
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Test coverage
coverage/
.nyc_output/

# Temporary files
*.tmp
.cache
```

### Git Aliases (Optional)

```bash
# Add to ~/.gitconfig

[alias]
  # Status
  st = status
  
  # Branch
  br = branch
  co = checkout
  cob = checkout -b
  
  # Commit
  cm = commit -m
  ca = commit --amend
  
  # Log
  lg = log --oneline --graph --decorate
  lga = log --oneline --graph --decorate --all
  
  # Rebase
  rb = rebase
  rbc = rebase --continue
  rba = rebase --abort
  
  # Stash
  save = stash save
  pop = stash pop
  
  # Diff
  df = diff
  dfc = diff --cached
```

---

**Next:** [Documentation Standards](./DOCUMENTATION_STANDARDS.md)
