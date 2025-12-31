# PayLinQ Backend Test Coverage Report

**Generated:** December 31, 2025  
**Repository:** kishan-gau/recruitiq  
**Backend Path:** `/backend/src/products/paylinq`  
**Command:** `NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules npx jest tests/products/paylinq --coverage`

---

## 📊 Overall Coverage Summary

| Metric | Coverage | Target | Gap | Status |
|--------|----------|--------|-----|--------|
| **Statements** | **13.03%** | 80% | -66.97% | ❌ Below Target |
| **Branches** | **13.12%** | 80% | -66.88% | ❌ Below Target |
| **Functions** | **16.16%** | 80% | -63.84% | ❌ Below Target |
| **Lines** | **13.11%** | 80% | -66.89% | ❌ Below Target |

---

## 🧪 Test Suite Statistics

- **Test Suites:** 27 passed, 27 total (✅ 100% pass rate)
- **Tests:** 692 passed, 5 skipped, 697 total (✅ 99.3% pass rate)
- **Test Files:** 48 test files covering PayLinQ functionality
- **Execution Time:** ~8-15 seconds (fast and efficient)
- **Test Types:**
  - Services: 32 test files
  - Repositories: 7 test files
  - Controllers: 2 test files
  - DTOs: 3 test files
  - API: 1 test file
  - E2E: 1 test file

---

## 📂 Coverage by Layer

### Controllers (50% average)
| File | Statements | Branches | Functions | Lines | Status |
|------|------------|----------|-----------|-------|--------|
| dashboardController.ts | ✅ 100% | 100% | 100% | 100% | Excellent |
| PayrollRunTypeController.ts | ❌ 0% | 0% | 0% | 0% | Needs Tests |

### Services (18.58% average - Target: 90%)
#### Well-Tested Services (≥70% coverage) ✅
| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| AllowanceService.ts | 98.55% | 89.13% | 100% | 98.55% |
| complianceService.ts | 96.62% | 78.94% | 95% | 98.82% |
| formulaEngineService.ts | 95.31% | 91.25% | 100% | 94.95% |
| payScheduleService.ts | 100% | 100% | 100% | 100% |
| reportingService.ts | 100% | 100% | 100% | 100% |
| ForfaitairBenefitsService.ts | 73.58% | 55.55% | 85.71% | 73.58% |

#### Moderately Tested Services (30-70% coverage) ⚠️
| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| paymentService.ts | 61.9% | 100% | 73.33% | 61.9% |
| payComponentService.ts | 55.45% | 61.81% | 37.5% | 56.01% |
| dashboardService.ts | 47.22% | 76.19% | 50% | 47.22% |
| reconciliationService.ts | 44.18% | 33.33% | 57.89% | 43.75% |
| workerTypeService.ts | 38.09% | 28.36% | 45.94% | 39.29% |
| benefitsService.ts | 37.83% | 51.06% | 55% | 38.35% |

#### Poorly Tested Services (1-30% coverage) ⚠️
| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| temporalPatternService.ts | 29.5% | 41.53% | 22.58% | 30% |
| currencyService.ts | 26.53% | 26.9% | 22.95% | 26.62% |
| loontijdvakService.ts | 24.07% | 25% | 50% | 24.07% |
| schedulingService.ts | 21.25% | 16.47% | 20% | 20.25% |
| approvalService.ts | 13.75% | 34.32% | 7.14% | 12.1% |
| ForfaitRuleService.ts | 12.92% | 11.11% | 20% | 13.6% |
| overtimeTaxService.ts | 4.54% | 1.96% | 28.57% | 4.68% |

#### Untested Services (0% coverage) ❌
| Service | Lines of Code | Priority |
|---------|---------------|----------|
| payrollService.ts | 2,574 | 🔴 Critical |
| payStructureService.ts | 2,516 | 🔴 Critical |
| taxCalculationService.ts | 1,919 | 🔴 Critical |
| timeAttendanceService.ts | 968 | 🔴 Critical |
| payslipPdfService.ts | 744 | 🟡 High |
| integrationService.ts | 605 | 🟡 High |
| payslipTemplateService.ts | 579 | 🟡 High |
| PayrollRunTypeService.ts | 539 | 🟡 High |
| FormulaTemplateService.ts | 516 | 🟡 High |
| payPeriodService.ts | 432 | 🟡 High |
| bonusTaxService.ts | 404 | 🟠 Medium |
| PayrollRunCalculationService.ts | 274 | 🟠 Medium |
| deductionsService.ts | 243 | 🟠 Medium |

**Total Untested LOC:** ~12,713 lines (13 services)

### Repositories (11.12% average - Target: 85%)
| File | Statements | Branches | Functions | Lines | Status |
|------|------------|----------|-----------|-------|--------|
| workerTypeRepository.ts | 73.45% | 52.56% | 79.16% | 73.45% | ⚠️ Near Target |
| dashboardRepository.ts | 15.62% | 0% | 0% | 16.66% | ❌ Poor |
| AllowanceRepository.ts | 13.38% | 7.69% | 0% | 13.47% | ❌ Poor |
| PayrollRunTypeRepository.ts | 8.27% | 5.88% | 0% | 8.33% | ❌ Poor |
| taxRepository.ts | 100% | 33.33% | 100% | 100% | ✅ Good |
| deductionRepository.ts | 6.34% | 4.05% | 4% | 6.45% | ❌ Poor |
| currencyRepository.ts | 1.6% | 0% | 2.32% | 1.6% | ❌ Very Poor |
| benefitRepository.ts | 0.88% | 7.14% | 5.55% | 0.88% | ❌ Very Poor |
| paymentRepository.ts | 0.89% | 6.38% | 7.69% | 0.89% | ❌ Very Poor |
| reconciliationRepository.ts | 0.9% | 6.38% | 5.55% | 0.9% | ❌ Very Poor |
| payrollRepository.ts | 0.67% | 3.01% | 2.77% | 0.67% | ❌ Very Poor |
| timeAttendanceRepository.ts | 0.64% | 3.7% | 4.76% | 0.64% | ❌ Very Poor |
| schedulingRepository.ts | 0.63% | 5% | 6.25% | 0.63% | ❌ Very Poor |
| taxEngineRepository.ts | 0% | 0% | 0% | 0% | ❌ Untested |

### DTOs (5.7% average)
| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| complianceDto.ts | 5.66% | 0% | 0% | 5.66% |
| schedulingDto.ts | 5.66% | 0% | 0% | 5.66% |
| componentDto.ts | 5.79% | 0% | 11.11% | 5.79% |

### Routes (0% average)
**All 28 route files have 0% coverage.** This is expected as routes are tested via integration/E2E tests, not unit tests:
- approvals.ts, compensation.ts, currency.ts, dashboard.ts
- deductions.ts, employees.ts, formula-templates.ts, formulas.ts
- loontijdvak.ts, payComponents.ts, payStructures.ts, paychecks.ts
- payments.ts, payrollRunTypes.ts, payrollRuns.ts, payslipTemplates.ts
- rbac.ts, reconciliation.ts, reports.ts, routes.ts
- scheduling.ts, settings.ts, taxRates.ts, temporalPatterns.ts
- timeAttendance.ts, timesheets.ts, workerTypes.ts, workers.ts

### Utils (7.61% average)
| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| dtoMapper.ts | 7.61% | 0% | 3.5% | 10.22% |

---

## 🏆 Top Performing Files (≥90% Coverage)

1. **AllowanceService.ts** - 98.55% statements (excellent!)
2. **complianceService.ts** - 96.62% statements (excellent!)
3. **formulaEngineService.ts** - 95.31% statements (excellent!)
4. **payScheduleService.ts** - 100% statements (perfect!)
5. **reportingService.ts** - 100% statements (perfect!)
6. **dashboardController.ts** - 100% statements (perfect!)
7. **taxRepository.ts** - 100% statements (perfect!)

**These files demonstrate excellent testing practices and should serve as examples for other components.**

---

## ⚠️ Critical Gaps Analysis

### By Priority

#### 🔴 P0 - Critical Services (0% coverage, >900 LOC)
These are core business logic services with zero test coverage:
1. **payrollService.ts** (2,574 LOC) - Core payroll processing
2. **payStructureService.ts** (2,516 LOC) - Pay structure management
3. **taxCalculationService.ts** (1,919 LOC) - Tax calculations
4. **timeAttendanceService.ts** (968 LOC) - Time tracking

**Impact:** High risk for production bugs, difficult maintenance

#### 🟡 P1 - High Priority Services (0% coverage, 400-900 LOC)
5. **payslipPdfService.ts** (744 LOC)
6. **integrationService.ts** (605 LOC)
7. **payslipTemplateService.ts** (579 LOC)
8. **PayrollRunTypeService.ts** (539 LOC)
9. **FormulaTemplateService.ts** (516 LOC)
10. **payPeriodService.ts** (432 LOC)

#### 🟠 P2 - Medium Priority Services (0% coverage, 200-400 LOC)
11. **bonusTaxService.ts** (404 LOC)
12. **PayrollRunCalculationService.ts** (274 LOC)
13. **deductionsService.ts** (243 LOC)

#### ⚠️ P3 - Repository Layer (Most <10% coverage)
All repositories except workerTypeRepository and taxRepository need significant testing improvements to meet the 85% target.

---

## 📈 Recommendations

### Immediate Actions (Next Sprint)

1. **Create Tests for P0 Services**
   - Start with `payrollService.ts` - most critical
   - Focus on happy path scenarios first
   - Target: 50% coverage as initial milestone

2. **Improve Repository Testing**
   - Use `workerTypeRepository.test.ts` (73% coverage) as a template
   - Add tests for CRUD operations with tenant isolation
   - Target: 70% coverage for top 5 repositories

3. **Study Success Patterns**
   - Review `AllowanceService.test.ts` (98.55% coverage)
   - Review `complianceService.test.ts` (96.62% coverage)
   - Review `formulaEngineService.test.ts` (95.31% coverage)
   - Apply their testing patterns to untested services

### Medium-Term Goals (Next Quarter)

1. **Phase 1 (Weeks 1-4):** P0 Critical Services
   - Bring all P0 services to 50% coverage
   - Focus on core business logic paths

2. **Phase 2 (Weeks 5-8):** P1 High Priority Services
   - Achieve 70% coverage on P1 services
   - Improve repository layer to 70%

3. **Phase 3 (Weeks 9-12):** Meet Standards
   - Bring services to 90% target
   - Bring repositories to 85% target
   - Overall coverage to 80%

### Testing Strategy

1. **Use Dependency Injection Pattern**
   ```javascript
   // All services should support constructor injection for testability
   class PayrollService {
     constructor(repository = null) {
       this.repository = repository || new PayrollRepository();
     }
   }
   ```

2. **Mock Database Layer**
   ```javascript
   // Mock repositories in service tests
   const mockRepository = {
     findById: jest.fn(),
     create: jest.fn(),
     update: jest.fn()
   };
   ```

3. **Test Organization Isolation**
   ```javascript
   // ALWAYS test with organizationId filter
   expect(mockRepository.findById).toHaveBeenCalledWith(
     id, 
     organizationId // ← Critical for security
   );
   ```

4. **Follow AAA Pattern**
   - Arrange: Set up test data and mocks
   - Act: Execute the function
   - Assert: Verify results and mock calls

---

## 🎯 Coverage Targets vs. Current Status

Based on project standards (from `TESTING_STANDARDS.md`):

| Layer | Target | Current | Gap | Priority |
|-------|--------|---------|-----|----------|
| **Overall** | 80% | 13.03% | -66.97% | 🔴 Critical |
| **Services** | 90% | 18.58% | -71.42% | 🔴 Critical |
| **Repositories** | 85% | 11.12% | -73.88% | 🔴 Critical |
| **Controllers** | 75% | 50% | -25% | 🟡 High |

**Current Status:** ❌ All layers significantly below target

**Required Effort Estimate:**
- ~130 new test files needed
- ~6,500+ test cases to write
- Estimated: 8-12 weeks with dedicated team

---

## 🔍 How to Run Coverage Reports

```bash
# Navigate to backend directory
cd backend

# Run PayLinQ tests with coverage
NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules \
  npx jest tests/products/paylinq \
  --coverage \
  --coverageDirectory=coverage/paylinq \
  --collectCoverageFrom='src/products/paylinq/**/*.{js,ts}' \
  --collectCoverageFrom='!src/products/paylinq/**/*.test.{js,ts}' \
  --collectCoverageFrom='!src/products/paylinq/**/*.spec.{js,ts}'

# View detailed HTML report
open coverage/paylinq/lcov-report/index.html

# Run specific service tests
npx jest tests/products/paylinq/services/AllowanceService.test.ts --coverage

# Run in watch mode for development
npm test:watch tests/products/paylinq
```

---

## 📚 Resources

- **Testing Standards:** `/docs/standards/TESTING_STANDARDS.md`
- **Backend Standards:** `/docs/standards/BACKEND_STANDARDS.md`
- **Example Tests:**
  - `tests/products/paylinq/services/AllowanceService.test.ts`
  - `tests/products/paylinq/services/complianceService.test.ts`
  - `tests/products/paylinq/repositories/workerTypeRepository.test.ts`

---

## 📝 Notes

- All 27 test suites pass successfully (100% pass rate)
- 692 tests pass with only 5 skipped (99.3% success rate)
- Test execution is fast (~8-15 seconds)
- No broken tests - quality of existing tests is good
- Main issue is quantity, not quality of tests

**The existing tests are well-written and serve as excellent templates for expanding coverage.**

---

**Report Generated:** 2025-12-31  
**Tool:** Jest with ES Modules support  
**Coverage Format:** Istanbul/nyc  
**Test Framework:** Jest + @jest/globals
