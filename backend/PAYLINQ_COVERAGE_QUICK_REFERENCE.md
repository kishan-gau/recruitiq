# PayLinQ Coverage Quick Reference

**Last Updated:** 2025-12-31

## 🎯 Current Status

```
Overall Coverage: 13.03% (Target: 80%)
Gap: -66.97%
Status: ❌ Critical - Needs Immediate Attention
```

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| Test Suites | 27 (100% pass) |
| Tests | 692 passed, 5 skipped |
| Test Files | 48 |
| Execution Time | 8-15 seconds |

## 🚨 Top 5 Priorities (Untested Services)

1. **payrollService.ts** - 2,574 LOC - 🔴 Critical
2. **payStructureService.ts** - 2,516 LOC - 🔴 Critical
3. **taxCalculationService.ts** - 1,919 LOC - 🔴 Critical
4. **timeAttendanceService.ts** - 968 LOC - 🔴 Critical
5. **payslipPdfService.ts** - 744 LOC - 🟡 High

**Total Untested:** 13 services, ~12,713 lines

## ⭐ Success Examples (Study These!)

1. **AllowanceService.ts** - 98.55% coverage
2. **complianceService.ts** - 96.62% coverage
3. **formulaEngineService.ts** - 95.31% coverage

## 🔧 Run Coverage Report

```bash
cd backend

# Full PayLinQ coverage
NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules \
  npx jest tests/products/paylinq --coverage

# Specific service
npx jest tests/products/paylinq/services/YourService.test.ts --coverage

# Watch mode
npm test:watch tests/products/paylinq
```

## 📈 Targets by Layer

| Layer | Current | Target | Gap |
|-------|---------|--------|-----|
| Services | 18.58% | 90% | -71.42% |
| Repositories | 11.12% | 85% | -73.88% |
| Controllers | 50% | 75% | -25% |

## 💡 Testing Tips

### 1. Use Dependency Injection
```javascript
class PayrollService {
  constructor(repository = null) {
    this.repository = repository || new PayrollRepository();
  }
}
```

### 2. Mock Dependencies
```javascript
const mockRepo = {
  findById: jest.fn(),
  create: jest.fn()
};
const service = new PayrollService(mockRepo);
```

### 3. Test Organization Isolation
```javascript
// ALWAYS include organizationId in tests
expect(mockRepo.findById).toHaveBeenCalledWith(
  id, 
  organizationId // ← Security critical!
);
```

### 4. Follow AAA Pattern
```javascript
// Arrange
const testData = { /* ... */ };
mockRepo.create.mockResolvedValue(testData);

// Act
const result = await service.create(testData, orgId, userId);

// Assert
expect(result).toEqual(testData);
expect(mockRepo.create).toHaveBeenCalledWith(testData, orgId);
```

## 📚 Resources

- **Full Report:** `backend/PAYLINQ_COVERAGE_REPORT.md`
- **Testing Standards:** `/docs/standards/TESTING_STANDARDS.md`
- **Example Tests:** 
  - `tests/products/paylinq/services/AllowanceService.test.ts`
  - `tests/products/paylinq/services/complianceService.test.ts`

## 🎯 Roadmap

### Phase 1 (Weeks 1-4): P0 Services
- Target: 50% coverage on critical services
- Focus: Core business logic paths

### Phase 2 (Weeks 5-8): P1 Services + Repositories
- Target: 70% coverage
- Improve repository layer

### Phase 3 (Weeks 9-12): Meet Standards
- Target: Services 90%, Repositories 85%
- Overall: 80%

## ❓ Common Questions

**Q: Why is coverage so low?**  
A: Not enough tests written. Quality of existing tests is excellent (100% pass rate).

**Q: What should I test first?**  
A: Start with `payrollService.ts` - highest priority, core business logic.

**Q: Can I use existing tests as templates?**  
A: Yes! Study `AllowanceService.test.ts` - it has 98.55% coverage.

**Q: Do routes need unit tests?**  
A: No, routes are tested via integration/E2E tests. 0% in unit tests is expected.

**Q: How long will this take?**  
A: Estimated 8-12 weeks with dedicated team to reach 80% overall coverage.

---

**Last Coverage Run:** 2025-12-31  
**Next Review:** Plan for Q1 2026
