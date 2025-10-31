# Testing Quick Reference Card

## 🚀 Standard Testing Command

```bash
npm run test:all
```

**This is the STANDARD way to run tests in RecruitIQ Backend.**

## 📋 All Test Commands

### Unified Test Runner (Recommended)
```bash
npm run test:all          # Run ALL tests (Jest + BDD)
npm run test:all:jest     # Run only Jest tests
npm run test:all:bdd      # Run only BDD E2E tests
```

### Jest Tests (Automated)
```bash
npm test                  # Run all Jest tests with coverage
npm run test:watch        # Run in watch mode
npm run test:integration  # Run integration tests only
```

### PowerShell BDD Tests (Manual E2E)
```powershell
.\scripts\test-all-bdd.ps1           # Run BDD E2E suite
.\scripts\run-all-tests.ps1          # Run unified test suite
.\scripts\run-all-tests.ps1 -JestOnly    # Jest only
.\scripts\run-all-tests.ps1 -BDDOnly     # BDD only
```

## 📊 Test Types Matrix

| Test Type | Framework | Speed | Coverage | When to Use |
|-----------|-----------|-------|----------|-------------|
| **Unit** | Jest | Fast (~ms) | Logic/Services | Testing functions in isolation |
| **Integration** | Jest | Medium (~100ms) | API Logic | Testing service interactions |
| **Security** | Jest | Medium | Auth/Validation | Testing security implementations |
| **E2E BDD** | PowerShell | Slow (~min) | Full Flows | Testing real API endpoints |

## ✅ Testing Checklist

**Before Committing Code:**
- [ ] Run `npm run test:all`
- [ ] All Jest tests pass
- [ ] All BDD tests pass (or updated)
- [ ] Code coverage ≥ 70%
- [ ] New features have both Jest and BDD tests

**Adding New Feature:**
1. [ ] Write Jest unit tests for logic
2. [ ] Write Jest integration tests for API logic
3. [ ] Write PowerShell BDD tests for E2E flows
4. [ ] Run `npm run test:all` to verify
5. [ ] Update documentation if needed

**Fixing a Bug:**
1. [ ] Write regression test (Jest or BDD)
2. [ ] Verify test fails without fix
3. [ ] Implement fix
4. [ ] Verify test passes
5. [ ] Run `npm run test:all`

## 🎯 Coverage Targets

- **Statements**: ≥ 70%
- **Branches**: ≥ 70%
- **Functions**: ≥ 70%
- **Lines**: ≥ 70%

View coverage: `coverage/lcov-report/index.html`

## 📁 Test File Locations

```
backend/
├── src/
│   └── **/__tests__/              # Unit tests (co-located)
│       └── *.test.js
├── tests/
│   ├── integration/                # Integration tests
│   │   └── *.test.js
│   ├── security/                   # Security tests
│   │   └── *.test.js
│   └── test-all-bdd.ps1           # BDD E2E suite
└── scripts/
    └── run-all-tests.ps1          # Unified test runner
```

## 🔧 Prerequisites

**For Jest Tests:**
- ✅ No prerequisites (uses mocks)

**For BDD Tests:**
- ⚠️ Server must be running: `npm run dev`
- ⚠️ Database must be available
- ⚠️ Redis must be running (optional)

## 📚 Documentation

- **Full Strategy**: `docs/TESTING_STRATEGY.md`
- **BDD Guide**: `tests/README_TESTING.md`
- **Jest Config**: `jest.config.js`

## 💡 Quick Tips

1. **Always use** `npm run test:all` before committing
2. **Both test types** are required for new features
3. **Jest = Fast automated**, **BDD = Comprehensive manual**
4. **Mock external dependencies** in Jest tests
5. **Test real endpoints** in BDD tests
6. **70%+ coverage** is the target
7. **Update this doc** if testing approach changes

## 🆘 Troubleshooting

**Jest tests failing?**
```bash
npm test -- --verbose      # See detailed output
npm test -- auth.security  # Run specific file
```

**BDD tests failing?**
```powershell
# Check server is running
Invoke-WebRequest http://localhost:3000/api/health

# Start server if needed
npm run dev
```

**Coverage too low?**
```bash
npm test -- --coverage     # Generate coverage report
# Open coverage/lcov-report/index.html
# Find untested files/functions
```

---

**Remember**: `npm run test:all` is the standard command. Always refer to `docs/TESTING_STRATEGY.md` for complete documentation.

*Last Updated: October 31, 2025*
