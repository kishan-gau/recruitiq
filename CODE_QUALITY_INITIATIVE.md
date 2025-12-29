# Code Quality Initiative

This directory contains tools, documentation, and workflows for maintaining code quality standards in the RecruitIQ monorepo.

## 📋 Overview

The RecruitIQ project has comprehensive coding standards documented in `/docs`, but there were gaps between documented standards and actual implementation. This initiative addresses those gaps by:

1. **Automated Detection** - Scripts to find standards violations
2. **Clear Documentation** - Guides for fixing common issues
3. **CI/CD Integration** - Automated checks in pull requests
4. **Developer Tools** - Pre-commit hooks and linting

## 🎯 Goals

- **Security:** Enforce tenant isolation and security logging
- **Quality:** Consistent code style and patterns
- **Testability:** Enable dependency injection and mocking
- **Maintainability:** Clear documentation and structured logging

## 📊 Current Status

### Critical Issues
- 🔴 **43 files** with `pool.query()` usage (security risk)
- 🟡 **20 files** with singleton exports (testability)
- 🟡 **41 files** with `console.log` usage (logging)

See [CODE_QUALITY_REPORT.md](../CODE_QUALITY_REPORT.md) for detailed findings.

## 🛠️ Tools

### Audit Scripts

Located in `backend/scripts/`:

1. **audit-pool-query.js**
   - Detects direct `pool.query()` usage
   - **Why:** Bypasses tenant isolation and security logging
   - **Fix:** Use custom `query()` wrapper from `config/database.js`

2. **audit-console-log.js**
   - Detects `console.log/error/warn` usage
   - **Why:** Missing structured logging and context
   - **Fix:** Use `logger` from `utils/logger.js`

3. **audit-singleton-exports.js**
   - Detects `export default new Service()` pattern
   - **Why:** Prevents dependency injection and testing
   - **Fix:** Export class, not instance

### Run Audits

```bash
# Run all audits
cd backend
npm run audit:code-quality

# Run individual audits
npm run audit:pool-query
npm run audit:console-log
npm run audit:singleton-exports
```

### ESLint

Modern ESLint v9 flat config with RecruitIQ-specific rules:

```bash
# Run linting
cd backend
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

## 📚 Documentation

1. **[CODE_QUALITY_REPORT.md](../CODE_QUALITY_REPORT.md)**
   - Comprehensive assessment of current state
   - Prioritized list of issues
   - Recommendations and acceptance criteria

2. **[CODE_QUALITY_FIX_GUIDE.md](../docs/CODE_QUALITY_FIX_GUIDE.md)**
   - Quick reference for fixing common violations
   - Code examples showing wrong vs. right patterns
   - Step-by-step instructions

3. **Standards Documents** (in `/docs`)
   - `CODING_STANDARDS.md` - Overview
   - `BACKEND_STANDARDS.md` - Backend-specific rules
   - `SECURITY_STANDARDS.md` - Security requirements
   - `TESTING_STANDARDS.md` - Testing guidelines

## 🔄 CI/CD Integration

### GitHub Actions Workflow

File: `.github/workflows/code-quality.yml`

Runs on every pull request:
- ✅ ESLint checks
- ✅ pool.query audit (blocks merge if violations found)
- ✅ console.log audit
- ✅ Singleton exports audit
- 📝 Posts audit results as PR comment

**Critical violations block merges!**

### Pre-commit Hooks

File: `.pre-commit-config.yaml`

Runs before each commit:
- ESLint on changed files
- Audit scripts on JavaScript files
- Prettier formatting
- Secret detection
- Large file check
- Prevent direct commits to main

**Setup:**
```bash
pnpm add -D -w husky lint-staged
pnpm exec husky install
```

## 🚀 Getting Started

### For Developers

1. **Read the standards:**
   ```bash
   cat docs/CODING_STANDARDS.md
   cat docs/BACKEND_STANDARDS.md
   ```

2. **Run audits to see current issues:**
   ```bash
   cd backend
   npm run audit:code-quality
   ```

3. **Pick a category to fix:**
   - Start with pool.query (CRITICAL for security)
   - Then singleton exports (HIGH for testability)
   - Then console.log (HIGH for operations)

4. **Follow the fix guide:**
   ```bash
   cat docs/CODE_QUALITY_FIX_GUIDE.md
   ```

5. **Run audits again to verify:**
   ```bash
   npm run audit:code-quality
   ```

### For Reviewers

1. **Check CI/CD results:**
   - GitHub Actions will comment on PRs with audit results
   - Critical violations (pool.query) will fail the build

2. **Verify fixes:**
   ```bash
   # Checkout PR branch
   git checkout pr-branch
   
   # Run audits
   cd backend
   npm run audit:code-quality
   ```

3. **Review against standards:**
   - Check `docs/BACKEND_STANDARDS.md` for patterns
   - Ensure code follows layer architecture
   - Verify proper error handling and validation

## 📈 Progress Tracking

### Metrics to Track

1. **Violations by Category:**
   - pool.query usage: Start: 43 → Goal: 0
   - console.log usage: Start: 41 → Goal: 0
   - Singleton exports: Start: 20 → Goal: 0

2. **Test Coverage:**
   - Overall: Goal: ≥80%
   - Services: Goal: ≥90%
   - Repositories: Goal: ≥85%

3. **ESLint Errors:**
   - Goal: 0 errors (warnings OK)

### Check Progress

```bash
# Run audits
cd backend
npm run audit:code-quality

# Compare numbers to baseline in CODE_QUALITY_REPORT.md
```

## 🎓 Training Resources

### Quick Wins

Fix these first for maximum impact:

1. **Replace pool.query in one file:**
   - Time: 10-15 minutes
   - Impact: HIGH (security)
   - Difficulty: EASY

2. **Replace console.log in one file:**
   - Time: 5-10 minutes
   - Impact: MEDIUM (operations)
   - Difficulty: EASY

3. **Refactor one singleton service:**
   - Time: 20-30 minutes
   - Impact: HIGH (testability)
   - Difficulty: MEDIUM

### Learning Path

1. Read standards documents
2. Review CODE_QUALITY_FIX_GUIDE.md
3. Pick one category to master
4. Fix 5-10 files in that category
5. Move to next category
6. Repeat!

## 🤝 Contributing

### Adding New Checks

1. Create audit script in `backend/scripts/`
2. Add npm script in `backend/package.json`
3. Update CI/CD workflow
4. Document in this README
5. Add examples to fix guide

### Improving Documentation

1. Update relevant docs in `/docs`
2. Add examples to CODE_QUALITY_FIX_GUIDE.md
3. Update CODE_QUALITY_REPORT.md metrics
4. Submit PR with changes

## 📞 Support

### Questions?

1. **Standards questions:** Check `/docs` first
2. **Fix guide unclear?** See CODE_QUALITY_FIX_GUIDE.md
3. **Still stuck?** Ask in #engineering-standards Slack

### Reporting Issues

If you find:
- False positives in audit scripts
- Missing checks for standards violations
- Outdated documentation

Open an issue with:
- Description of the problem
- Expected vs actual behavior
- Code examples if applicable

## 🎉 Success Criteria

The code quality initiative will be successful when:

- [ ] Zero pool.query violations (security)
- [ ] Zero singleton exports (testability)
- [ ] Zero console.log in production code (logging)
- [ ] ≥80% test coverage overall
- [ ] ≥90% test coverage for services
- [ ] Zero ESLint errors
- [ ] All CI/CD checks pass
- [ ] New code follows standards automatically

## 📅 Timeline

### Phase 1: Foundation (Complete ✅)
- ✅ Create audit tools
- ✅ Document findings
- ✅ Set up CI/CD
- ✅ Create fix guides

### Phase 2: Critical Fixes (In Progress)
- [ ] Fix all pool.query violations
- [ ] Fix all singleton exports
- [ ] Replace all console.log

### Phase 3: Quality Improvements (Next)
- [ ] Add JSDoc documentation
- [ ] Improve test coverage
- [ ] Add security headers
- [ ] Implement CSRF protection

### Phase 4: Excellence (Future)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Performance monitoring
- [ ] Advanced security scanning
- [ ] Automated refactoring tools

---

**Last Updated:** December 29, 2025  
**Status:** Active  
**Owner:** Engineering Team

For detailed findings, see [CODE_QUALITY_REPORT.md](../CODE_QUALITY_REPORT.md)  
For quick fixes, see [CODE_QUALITY_FIX_GUIDE.md](../docs/CODE_QUALITY_FIX_GUIDE.md)
