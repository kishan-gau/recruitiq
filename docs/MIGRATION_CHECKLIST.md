# Backend Refactoring - Migration Checklist

**Track progress through each phase of the backend modernization**  
**Status:** 🟢 Development Phase - Accelerated Timeline (2-3 weeks)

---

## Pre-Migration Setup

- [ ] Review and approve REFACTORING_PLAN.md
- [ ] Choose branch: Create `feature/backend-modernization` OR use existing `feature/multi-currency-support`
- [ ] Ensure all tests currently passing
- [ ] Quick team sync on approach
- [ ] Install dependencies: `npm install glob`

**No Production Prep Needed:**
- ✅ No production database to backup
- ✅ No external API consumers to notify
- ✅ No staging environment coordination
- ✅ Development phase - move fast!

---

## Phase 1: Foundation & Setup (Days 1-2) ✅ / ⚠️ / ❌

### 1.1 Path Aliases Setup
- [ ] Install module-alias package
- [ ] Update package.json with _moduleAliases
- [ ] Create jsconfig.json
- [ ] Add module-alias import to server.js
- [ ] Test server starts without errors
- [ ] Run full test suite
- [ ] Verify all routes working
- [ ] Commit: "feat: add path aliases configuration"

**Test Commands:**
```bash
npm test
npm run test:integration
npm run dev
```

### 1.2 Create New Directory Structure
- [ ] Create api/v1 directories
- [ ] Create shared/errors directory
- [ ] Create dto subdirectories
- [ ] Create config subdirectories
- [ ] Create domain directories (optional)
- [ ] Document structure in ARCHITECTURE.md
- [ ] Commit: "feat: create new directory structure"

---

## Phase 2: Error Handling & Constants (Days 3-4)

### 2.1 Extract Error Classes
- [ ] Create src/shared/errors/base.error.js
- [ ] Create src/shared/errors/http.errors.js
- [ ] Create src/shared/errors/index.js
- [ ] Update middleware/errorHandler.js (import from shared, not re-export)
- [ ] Test error handling still works
- [ ] Commit: "refactor: extract error classes to shared/errors"

#### Update ALL Files at Once (Day 3-4)
- [ ] Run automated migration on ALL files
- [ ] Review all changes in git diff
- [ ] Run tests
- [ ] Manual smoke test
- [ ] Verify no files import from middleware/errorHandler for errors
- [ ] Commit: "refactor: migrate all files to new error imports"

**No Gradual Batches Needed:**
- Development phase - can update everything at once
- Single commit for easier tracking
- Faster completion

### 2.2 Organize Configuration Files
- [ ] Create config/security/cors.config.js
- [ ] Create config/security/helmet.config.js
- [ ] Create config/security/csrf.config.js
- [ ] Create config/security/rateLimit.config.js
- [ ] Create config/services/email.config.js
- [ ] Create config/services/storage.config.js
- [ ] Create config/services/redis.config.js
- [ ] Create config/database/postgres.config.js
- [ ] Create config/database/tenant.config.js
- [ ] Update config/index.js
- [ ] Test all services start correctly
- [ ] Verify environment variables work
- [ ] Run integration tests
- [ ] Commit: "refactor: organize configuration files"

---

## Phase 3: API Versioning (Days 5-7)

### 3.1 Create API Version Structure
- [ ] MOVE (not copy) routes to api/v1/routes
- [ ] Create api/v1/index.js router
- [ ] Update server.js with ONLY v1 routes
- [ ] Remove old /api route registrations
- [ ] Test v1 endpoints work
- [ ] Update API documentation
- [ ] Commit: "feat: implement API v1 versioning (breaking)"

**Test Commands:**
```bash
# New endpoint (should work)
curl http://localhost:3000/api/v1/auth/login

# Old endpoint (should fail - expected)
curl http://localhost:3000/api/auth/login
```

**No Backward Compatibility:**
- Development phase - just replace old with new
- No deprecation headers needed
- Clean break, no dual support

### 3.2 Frontend Migration (Day 6-7)
- [ ] Update packages/api-client with API_BASE = '/api/v1'
- [ ] Update ALL frontend apps at once:
  - [ ] RecruitIQ app
  - [ ] PaylinQ app
  - [ ] Nexus app
  - [ ] Portal app
- [ ] Run E2E tests for all apps
- [ ] Manual QA testing (quick spot checks)
- [ ] Commit: "feat: migrate all frontends to API v1"

**Development Speed:**
- No gradual rollout needed
- Update all apps in one go
- We control all the code!

---

## Phase 4: DTO Layer Enhancement (Days 8-10)

### 4.1 Create DTO Infrastructure
- [ ] Create dto/request directory structure
- [ ] Create dto/response directory structure
- [ ] Create dto/mappers directory structure
- [ ] Create validation middleware
- [ ] Write DTO documentation
- [ ] Commit: "feat: create DTO infrastructure"

### 4.2 Implement DTOs by Domain (Days 8-10)

**Day 8: Auth + Jobs**
- [ ] Create auth request/response DTOs
- [ ] Create auth mappers
- [ ] Update auth controllers
- [ ] Create job request/response DTOs
- [ ] Create job mappers
- [ ] Update job controllers
- [ ] Add validation tests
- [ ] Run integration tests
- [ ] Commit: "feat: implement auth and job DTOs"

**Day 9: Candidates + Applications**
- [ ] Create candidate request/response DTOs
- [ ] Create candidate mappers
- [ ] Update candidate controllers
- [ ] Create application request/response DTOs
- [ ] Create application mappers
- [ ] Update application controllers
- [ ] Add validation tests
- [ ] Run integration tests
- [ ] Commit: "feat: implement candidate and application DTOs"

**Day 10: Remaining Endpoints**
- [ ] Create interview DTOs
- [ ] Create organization DTOs
- [ ] Create user DTOs
- [ ] Create remaining DTOs
- [ ] Update respective controllers
- [ ] Add validation tests
- [ ] Run all integration tests
- [ ] Commit: "feat: complete DTO implementation"

**Accelerated Approach:**
- Multiple domains per day
- Can work in parallel if multiple devs
- Less critical endpoints can be done last

---

## Phase 5: Path Alias Migration (Days 11-12)

### 5.1 Prepare Migration Script
- [ ] Create scripts/migrate-to-aliases.js
- [ ] Test script on sample files
- [ ] Create backup branch
- [ ] Commit: "chore: add path alias migration script"

### 5.2 Execute Migration - ALL Files at Once
- [ ] Run migration script on ALL files
- [ ] Review changes: `git diff`
- [ ] Run tests: `npm test`
- [ ] Run integration tests
- [ ] Verify server starts
- [ ] Test all API endpoints
- [ ] Commit: "refactor: migrate all files to path aliases"

### 5.3 Verification
- [ ] Search for remaining relative imports
- [ ] Verify no "../" imports exist
- [ ] Run full test suite
- [ ] Run E2E tests
- [ ] Quick performance check
- [ ] Commit: "chore: verify path alias migration complete"

**Verification Command:**
```bash
grep -r "from '\.\." src/ | grep -v node_modules
# Should return nothing
```

**Single Batch Approach:**
- Development phase - no need for gradual rollout
- Single commit easier to review
- Faster completion (1-2 days vs 1 week)

---

## Phase 6: Cleanup & Documentation (Days 13-14)

### 6.1 Code Cleanup
- [ ] Verify no relative imports remain
- [ ] Verify all routes use /api/v1
- [ ] Remove any TODO/FIXME markers related to old structure
- [ ] Clean up test files
- [ ] Remove unused imports
- [ ] Commit: "chore: cleanup refactoring remnants"

**No Deprecation Monitoring:**
- Development phase - just remove old code
- No gradual sunset needed
- Clean slate!

### 6.2 Documentation Updates
- [ ] Create ARCHITECTURE.md
- [ ] Update README.md with new structure
- [ ] Document path aliases
- [ ] Document API v1 conventions
- [ ] Create OpenAPI/Swagger spec for v1
- [ ] Update Postman collection
- [ ] Create code examples
- [ ] Commit: "docs: update architecture documentation"

**No Migration Guide Needed:**
- Still in development
- No version history yet
- v1 is the baseline

### 6.3 Final Verification
- [ ] All tests passing
- [ ] No lint errors
- [ ] No console errors or warnings
- [ ] All API endpoints documented
- [ ] Code review by team member
- [ ] Ready to merge!

---

## Phase 7: Advanced Improvements (Optional - Weeks 3-4)

### 7.1 TypeScript Migration
- [ ] Install TypeScript dependencies
- [ ] Create tsconfig.json
- [ ] Convert models to TypeScript
- [ ] Convert DTOs to TypeScript
- [ ] Convert services to TypeScript
- [ ] Convert controllers to TypeScript
- [ ] Convert routes to TypeScript
- [ ] Update build process
- [ ] Run type checks in CI/CD
- [ ] Commit: "feat: migrate to TypeScript"

### 7.2 Domain-Driven Design
- [ ] Design domain boundaries
- [ ] Create domain/recruitment
- [ ] Create domain/payroll
- [ ] Create domain/scheduling
- [ ] Migrate recruitment logic
- [ ] Migrate payroll logic
- [ ] Migrate scheduling logic
- [ ] Update tests
- [ ] Commit: "refactor: implement domain-driven design"

---

## Testing & Validation

### Per-Phase Testing
- [ ] Unit tests pass (100%)
- [ ] Integration tests pass
- [ ] E2E tests pass (all apps)
- [ ] Load tests pass
- [ ] Security tests pass
- [ ] Manual smoke testing
- [ ] Performance baseline check
- [ ] No new errors in logs

### Pre-Production Testing
- [ ] Deploy to staging
- [ ] Full regression testing
- [ ] Load testing on staging
- [ ] Security audit
- [ ] Performance profiling
- [ ] Database connection pooling check
- [ ] Memory leak testing
- [ ] Error rate monitoring

### Production Deployment
- [ ] Deploy during maintenance window
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Monitor database performance
- [ ] Check deprecated endpoint usage
- [ ] Verify rollback procedure ready
- [ ] Monitor for 24 hours
- [ ] Send success notification

---

## Rollback Procedures

### If Issues Found (Development)
- [ ] Identify affected components
- [ ] Determine severity
- [ ] Decision: Fix forward (preferred) or rollback
- [ ] Execute plan
- [ ] Document learnings

### Rollback Commands (Simple in Development)
```bash
# Rollback last commit
git reset --hard HEAD~1

# Rollback to specific commit
git reset --hard <commit-hash>

# Revert specific commit
git revert <commit-hash>
```

**Development Advantages:**
- Can rollback entire refactoring if needed
- No production impact
- Prefer fixing forward when possible

---

## Sign-Off (Simplified for Development)

### Core Refactoring Complete (Days 1-14)
- [ ] Developer Sign-Off: _______________
- [ ] Code Review Complete: _______________
- [ ] All Tests Passing: _______________
- [ ] Date: _______________

**No Extended Approval Process:**
- Development phase - streamlined sign-off
- Team lead approval sufficient
- Quick iteration encouraged

---

## Metrics Tracking

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Test Coverage | ___% | ___% | ___% |
| Relative Imports | ___ | 0 | -___% |
| API Response Time (avg) | ___ms | ___ms | ___ms |
| Error Rate | ___% | ___% | ___% |
| Build Time | ___s | ___s | ___s |
| Lines of Code | ___ | ___ | ___ |
| Technical Debt Score | ___ | ___ | ___ |

---

**Last Updated:** November 13, 2025  
**Status:** Ready for Immediate Start (Development Phase)  
**Timeline:** 2-3 weeks (10-14 working days)
