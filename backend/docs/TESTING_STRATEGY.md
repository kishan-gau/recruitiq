# Testing Strategy

## Overview

This document defines the standard testing approach for the RecruitIQ backend codebase. We use a **Dual Testing Strategy** that combines automated Jest tests with manual PowerShell BDD tests to ensure comprehensive coverage.

## ⚡ Quick Start - Running All Tests

**STANDARD COMMAND** - Use this to run the complete test suite:

```bash
npm run test:all
```

This single command executes:
1. ✅ All Jest tests (unit + integration + security)
2. ✅ All PowerShell BDD E2E tests
3. ✅ Generates code coverage reports
4. ✅ Provides comprehensive test summary

**Alternative Commands**:
```bash
npm run test:all:jest    # Run only Jest tests
npm run test:all:bdd     # Run only PowerShell BDD tests
npm test                 # Run Jest tests only (legacy)
```

**PowerShell Direct**:
```powershell
# Run all tests (Jest + BDD)
.\scripts\run-all-tests.ps1

# Run only specific test types
.\scripts\run-all-tests.ps1 -JestOnly
.\scripts\run-all-tests.ps1 -BDDOnly
.\scripts\run-all-tests.ps1 -CoverageOnly
```

> **⚠️ Note**: BDD tests require the server to be running on `http://localhost:3000`
> Start the server first: `npm run dev`

## Dual Testing Strategy

### 1. Jest Tests (Automated CI/CD)

**Purpose**: Fast, automated tests that run in CI/CD pipelines

**Test Types**:
- **Unit Tests**: Test individual functions, services, and utilities in isolation
- **Integration Tests**: Test API logic without full HTTP server overhead
- **Security Tests**: Validate security implementations (auth, encryption, validation)

**Location**: 
- Unit tests: `src/**/__tests__/*.test.js` or `tests/unit/**/*.test.js`
- Integration tests: `tests/integration/**/*.test.js`
- Security tests: `tests/security/**/*.test.js`

**Framework**: Jest 29+ with ES modules support

**Execution**: 
```bash
npm test                    # Run all tests
npm test -- auth.security  # Run specific test file
npm run test:coverage      # Run with coverage report
```

**Characteristics**:
- ✅ Fast execution (~8 seconds for 38+ tests)
- ✅ Automated in CI/CD pipelines
- ✅ Mocks external dependencies
- ✅ Tests logic and algorithms
- ✅ Coverage metrics (target: 70%+)
- ✅ Runs without database or server

**Example Structure**:
```javascript
describe('Authentication Security', () => {
  describe('Password Hashing', () => {
    it('should hash password using bcrypt', async () => {
      const password = 'SecurePass123!';
      const hashed = await hashPassword(password);
      expect(hashed).not.toBe(password);
      expect(hashed.startsWith('$2b$')).toBe(true);
    });
  });
});
```

### 2. PowerShell BDD Tests (Manual E2E)

**Purpose**: End-to-end validation with real HTTP requests and database

**Test Types**:
- **E2E API Tests**: Test complete request/response cycles
- **Integration Flows**: Test multi-step user journeys
- **Manual Validation**: QA testing before releases

**Location**: `tests/test-all-bdd.ps1`

**Framework**: PowerShell with custom BDD functions

**Execution**:
```powershell
.\tests\test-all-bdd.ps1    # Run all scenarios
```

**Characteristics**:
- ✅ Tests real API endpoints
- ✅ Uses actual database
- ✅ Validates complete flows
- ✅ Human-readable BDD format
- ✅ Documents API behavior
- ⚠️ Slower execution (~5 minutes for 49 scenarios)
- ⚠️ Requires manual execution

**Example Structure**:
```powershell
Test-Scenario -Name "User can setup MFA" -Steps @(
    @{
        Given = "User is authenticated with valid token"
        When = "POST /auth/mfa/setup"
        Then = "Should receive QR code and manual entry key"
    }
) -Validator {
    param($response)
    $response.success -eq $true -and
    $response.data.qrCode -ne $null -and
    $response.data.manualEntryKey -ne $null
}
```

## When to Use Each Strategy

### Use Jest Tests When:
- ✅ Testing business logic and algorithms
- ✅ Testing service layer functions
- ✅ Testing utility functions and helpers
- ✅ Testing security implementations (hashing, tokens, validation)
- ✅ Need fast feedback in development
- ✅ Running in CI/CD pipelines
- ✅ Generating coverage reports
- ✅ Testing error handling and edge cases

### Use PowerShell BDD Tests When:
- ✅ Testing complete API endpoints
- ✅ Testing multi-step user flows
- ✅ Validating authentication flows
- ✅ Testing database interactions
- ✅ QA validation before releases
- ✅ Documenting API behavior
- ✅ Manual testing new features
- ✅ Testing features requiring external services (email, MFA apps)

### Use Both When:
- ✅ Implementing new API endpoints (Jest for logic, PowerShell for E2E)
- ✅ Adding security features (Jest for algorithms, PowerShell for flows)
- ✅ Refactoring critical features (Jest prevents regressions, PowerShell validates behavior)

## Testing Standards

### 1. Code Coverage Targets
- **Statements**: 70%+
- **Branches**: 70%+
- **Functions**: 70%+
- **Lines**: 70%+

### 2. Test Organization
```
tests/
├── integration/          # Integration tests with Jest
│   ├── auth.security.test.js
│   └── api.*.test.js
├── security/            # Security-specific tests
│   ├── sql-injection.test.js
│   └── xss.test.js
├── unit/                # Unit tests for services
│   ├── accountLockout.test.js
│   └── passwordReset.test.js
├── test-all-bdd.ps1    # PowerShell E2E tests
└── README_TESTING.md   # PowerShell test documentation
```

### 3. Naming Conventions
- **Jest files**: `*.test.js` or `*.spec.js`
- **Test suites**: `describe('Feature Name', () => {})`
- **Test cases**: `it('should do something', () => {})`
- **PowerShell scenarios**: `Test-Scenario -Name "User can do something"`

### 4. Test Data Management
- **Jest**: Use mocks and fixtures
- **PowerShell**: Use test user accounts and cleanup after tests
- **Never use production data in tests**

### 5. Commit Standards
When adding tests, use conventional commit messages:
```
test: Add Jest integration tests for auth security
test: Add password reset flow to PowerShell BDD suite
test(security): Add SQL injection penetration tests
```

## Current Test Coverage

### Jest Tests (Automated)
- **Total**: 38+ tests
- **Runtime**: ~8 seconds
- **Files**:
  - `tests/integration/auth.security.test.js` (23 tests)
  - `src/modules/auth/tests/*.test.js` (15+ tests)

### PowerShell BDD Tests (Manual)
- **Total**: 49 scenarios
- **Runtime**: ~5 minutes
- **Coverage**: Authentication, Users, Organizations, Jobs, Applications, Analytics
- **Pass Rate**: 86.5% (32/37 executed)

## Integration with CI/CD

### Development Workflow
1. Write feature code
2. Add Jest unit/integration tests
3. Run `npm test` locally (fast feedback)
4. Add PowerShell E2E tests for API endpoints
5. Run `.\tests\test-all-bdd.ps1` manually
6. Commit code + both test types

### CI/CD Pipeline (Future)
```yaml
test:
  script:
    - npm install
    - npm test -- --coverage
    - npm run test:security
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
```

### Pre-Release Checklist
- [ ] All Jest tests passing
- [ ] Code coverage ≥ 70%
- [ ] All PowerShell BDD scenarios passing
- [ ] Manual testing of critical flows
- [ ] Security tests passing
- [ ] No known vulnerabilities

## Best Practices

### Jest Tests
1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **One assertion per test (when possible)**
4. **Mock external dependencies**
5. **Test edge cases and error handling**
6. **Keep tests fast (<100ms per test)**
7. **Use beforeEach/afterEach for setup/cleanup**

### PowerShell BDD Tests
1. **Use Given/When/Then format**
2. **Test realistic user scenarios**
3. **Clean up test data**
4. **Document expected responses**
5. **Handle authentication tokens properly**
6. **Mark manual tests as SKIP when needed**
7. **Update README_TESTING.md with new scenarios**

## Examples

### Adding a New Feature: Password Reset

#### Step 1: Jest Unit Tests
```javascript
// tests/unit/passwordResetService.test.js
describe('Password Reset Service', () => {
  it('should generate secure reset token', () => {
    const token = generateResetToken();
    expect(token).toHaveLength(64);
  });
});
```

#### Step 2: Jest Integration Tests
```javascript
// tests/integration/passwordReset.test.js
describe('Password Reset Logic', () => {
  it('should create reset token with expiry', async () => {
    const result = await createPasswordResetToken(userId);
    expect(result.token).toBeDefined();
    expect(result.expiresAt).toBeInstanceOf(Date);
  });
});
```

#### Step 3: PowerShell E2E Tests
```powershell
# tests/test-all-bdd.ps1
Test-Scenario -Name "User can request password reset" -Steps @(
    @{
        Given = "Valid email address"
        When = "POST /auth/forgot-password"
        Then = "Should send reset email"
    }
) -Validator {
    param($response)
    $response.success -eq $true
}
```

## Unified Test Runner

### Standard Testing Command

The **standard way** to run tests in this codebase is using the unified test runner:

```bash
npm run test:all
```

This command is implemented in `scripts/run-all-tests.ps1` and provides:

**Features**:
- ✅ Runs all Jest tests (unit + integration + security)
- ✅ Runs all PowerShell BDD E2E tests
- ✅ Generates code coverage reports
- ✅ Provides detailed pass/fail summary
- ✅ Tracks execution time
- ✅ Supports flexible execution modes

**Execution Modes**:
```powershell
# Run everything (default)
npm run test:all

# Run only Jest tests
npm run test:all:jest

# Run only BDD E2E tests  
npm run test:all:bdd

# Direct PowerShell execution with options
.\scripts\run-all-tests.ps1                # All tests
.\scripts\run-all-tests.ps1 -JestOnly      # Jest only
.\scripts\run-all-tests.ps1 -BDDOnly       # BDD only
.\scripts\run-all-tests.ps1 -SkipBDD       # Jest only
.\scripts\run-all-tests.ps1 -CoverageOnly  # Jest with coverage
```

**Prerequisites for BDD Tests**:
- Server must be running on `http://localhost:3000`
- Start with: `npm run dev` (in separate terminal)
- Or use `-SkipBDD` flag to skip E2E tests

**Output Format**:
```
═══════════════════════════════════════════════════════════
 🚀 RecruitIQ Backend - Unified Test Suite Runner
═══════════════════════════════════════════════════════════

ℹ Running comprehensive test suite...
ℹ Start Time: 2025-10-31 14:30:00

═══════════════════════════════════════════════════════════
 📦 Phase 1: Running Jest Tests (Unit + Integration + Security)
═══════════════════════════════════════════════════════════

✓ Jest tests completed successfully
ℹ Coverage report available at: coverage/lcov-report/index.html

═══════════════════════════════════════════════════════════
 🎭 Phase 2: Running PowerShell BDD/Gherkin E2E Tests
═══════════════════════════════════════════════════════════

✓ BDD E2E tests completed successfully

═══════════════════════════════════════════════════════════
 📊 Test Suite Results Summary
═══════════════════════════════════════════════════════════

ℹ Duration: 05:23
✓ Jest Tests: PASSED
✓ BDD E2E Tests: PASSED

═══════════════════════════════════════════════════════════
 ✅ ALL TESTS PASSED
═══════════════════════════════════════════════════════════
```

**CI/CD Integration**:
```yaml
# Example GitHub Actions workflow
- name: Run All Tests
  run: npm run test:all:jest  # Skip BDD in CI (requires server)
  
# Or for full E2E in CI
- name: Start Server
  run: npm run dev &
- name: Run All Tests
  run: npm run test:all
```

### Why Use the Unified Test Runner?

**Benefits**:
1. ✅ **Single Command**: One command runs everything
2. ✅ **Comprehensive**: Ensures no tests are forgotten
3. ✅ **Consistent**: Same command for all developers
4. ✅ **Flexible**: Can run subsets when needed
5. ✅ **Documented**: Clear output shows what passed/failed
6. ✅ **Standard**: Establishes testing convention

**When to Use**:
- ✅ Before committing code changes
- ✅ Before creating pull requests
- ✅ During code reviews
- ✅ Before production deployments
- ✅ Weekly regression testing

## Maintenance

### Regular Tasks
- **Weekly**: Review test failures in PowerShell suite
- **Monthly**: Review and update test coverage targets
- **Per Feature**: Add both Jest and PowerShell tests
- **Per Bug Fix**: Add regression tests

### Test Debt Management
- Mark flaky tests and investigate root causes
- Remove obsolete tests when features are removed
- Refactor tests when code is refactored
- Update documentation when test structure changes

## Resources

- **Jest Documentation**: https://jestjs.io/
- **Testing Best Practices**: https://testingjavascript.com/
- **BDD Testing**: https://cucumber.io/docs/bdd/
- **Test Coverage**: `npm test -- --coverage`
- **PowerShell Guide**: `tests/README_TESTING.md`

## Questions?

For questions about testing strategy, ask:
- **What am I testing?** (Logic → Jest, API → PowerShell, Both → Both)
- **Who runs this test?** (CI/CD → Jest, QA → PowerShell)
- **How fast should it be?** (Fast → Jest, Comprehensive → PowerShell)

---

*Last Updated: October 31, 2025*
*Version: 1.0*
