# Paylinq Backend Non-Compliance Report

**Generated:** 2026-01-01  
**Standards Reference:** `/docs/BACKEND_STANDARDS.md`, `/docs/TESTING_STANDARDS.md`

## Executive Summary

During comprehensive test coverage extension, the following non-compliance issues were identified in the Paylinq backend codebase.

### Critical Issues Found

1. **Singleton Export Pattern** (2 services) - Prevents testability via dependency injection
2. **Missing Constructor Dependency Injection** (2 services) - Hard-coded dependencies

---

## Non-Compliant Services

### 1. payslipPdfService.ts - CRITICAL

**Issue:** Singleton export pattern  
**Line:** 752  
**Current Code:**
```typescript
export default new PayslipPdfService();
```

**Problem:**
- ❌ Exports singleton instance instead of class
- ❌ Cannot inject mock dependencies for testing
- ❌ Violates industry standard DI pattern
- ❌ Not testable with unit tests

**Required Fix:**
```typescript
// BEFORE (Anti-pattern) ❌
export default new PayslipPdfService();

// AFTER (Industry standard) ✅
export default PayslipPdfService;
```

**Constructor Fix Needed:**
```typescript
class PayslipPdfService {
  constructor(
    payrollRepository = null,
    employeeRepository = null,
    // ... other dependencies
  ) {
    this.payrollRepository = payrollRepository || new PayrollRepository();
    this.employeeRepository = employeeRepository || new EmployeeRepository();
    // ... initialize other dependencies
  }
}
```

**Impact:** HIGH - 744 LOC, prevents all unit testing

---

### 2. reconciliationService.ts - CRITICAL

**Issue:** Singleton export pattern  
**Line:** 557  
**Current Code:**
```typescript
export default new ReconciliationService();
```

**Problem:**
- ❌ Exports singleton instance instead of class
- ❌ Cannot inject mock dependencies for testing
- ❌ Hard-coded dependencies in constructor
- ❌ Not testable with unit tests

**Required Fix:**
```typescript
// BEFORE (Anti-pattern) ❌
export default new ReconciliationService();

// AFTER (Industry standard) ✅
export default ReconciliationService;
```

**Constructor Fix Needed:**
```typescript
class ReconciliationService {
  constructor(
    reconciliationRepository = null,
    paymentRepository = null,
    // ... other dependencies
  ) {
    this.reconciliationRepository = reconciliationRepository || new ReconciliationRepository();
    this.paymentRepository = paymentRepository || new PaymentRepository();
    // ... initialize other dependencies
  }
}
```

**Impact:** HIGH - 557 LOC, prevents all unit testing

---

### 3. integrationService.ts - HIGH PRIORITY

**Issue:** Missing dependency injection in constructor  
**Line:** 20  
**Current Code:**
```typescript
constructor() {
  this.baseUrl = config.paylinq.apiUrl;
  this.apiKey = config.paylinq.apiKey;
}
```

**Problem:**
- ❌ Hard-coded dependencies (no DI parameters)
- ❌ Difficult to test with different configurations
- ❌ Cannot inject mock HTTP clients
- ⚠️ Class export is correct, but constructor needs enhancement

**Required Fix:**
```typescript
class PaylinqIntegrationService {
  constructor(
    baseUrl = null,
    apiKey = null,
    httpClient = null
  ) {
    this.baseUrl = baseUrl || config.paylinq.apiUrl;
    this.apiKey = apiKey || config.paylinq.apiKey;
    this.httpClient = httpClient || axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }
}
```

**Impact:** MEDIUM - 605 LOC, testable but not ideal

---

### 4. paymentService.ts - MEDIUM PRIORITY

**Issue:** Missing dependency injection in constructor  
**Line:** 22  
**Current Code:**
```typescript
constructor() {
  this.paymentRepository = new PaymentRepository();
}
```

**Problem:**
- ❌ Hard-coded dependencies
- ❌ Cannot inject mock repositories for testing
- ❌ Must use complex jest.mock() instead of simple DI
- ⚠️ Class export is correct

**Required Fix:**
```typescript
class PaymentService {
  constructor(paymentRepository = null) {
    this.paymentRepository = paymentRepository || new PaymentRepository();
  }
}
```

**Impact:** LOW - Class export correct, easy fix needed

---

## Compliant Services ✅

The following services correctly implement DI pattern and are testable:

- ✅ AllowanceService.ts
- ✅ ForfaitRuleService.ts
- ✅ ForfaitairBenefitsService.ts
- ✅ FormulaTemplateService.ts
- ✅ PayrollRunCalculationService.ts
- ✅ PayrollRunTypeService.ts
- ✅ approvalService.ts
- ✅ benefitsService.ts
- ✅ bonusTaxService.ts
- ✅ complianceService.ts
- ✅ currencyService.ts
- ✅ dashboardService.ts
- ✅ deductionsService.ts
- ✅ formulaEngineService.ts
- ✅ loontijdvakService.ts
- ✅ overtimeTaxService.ts
- ✅ payComponentService.ts
- ✅ payPeriodService.ts
- ✅ payScheduleService.ts
- ✅ **payStructureService.ts** ✅ (2,516 LOC - largest compliant service)
- ✅ **payrollService.ts** ✅ (2,574 LOC - largest overall, fully compliant)
- ✅ payslipTemplateService.ts
- ✅ reportingService.ts
- ✅ schedulingService.ts
- ✅ taxCalculationService.ts
- ✅ temporalPatternService.ts
- ✅ timeAttendanceService.ts
- ✅ workerTypeService.ts

---

## All Repositories ✅

**EXCELLENT:** All 17 repositories follow proper DI pattern with optional database parameter:

```typescript
constructor(database = null) {
  this.db = database || pool;
}
```

- ✅ AllowanceRepository.ts
- ✅ ExchangeRateRepository.ts
- ✅ ForfaitRuleRepository.ts
- ✅ PayrollRunTypeRepository.ts
- ✅ complianceRepository.ts
- ✅ dashboardRepository.ts
- ✅ deductionRepository.ts
- ✅ payComponentRepository.ts
- ✅ payStructureRepository.ts
- ✅ paymentRepository.ts
- ✅ payrollRepository.ts
- ✅ reconciliationRepository.ts
- ✅ schedulingRepository.ts
- ✅ taxEngineRepository.ts
- ✅ taxRepository.ts
- ✅ timeAttendanceRepository.ts
- ✅ workerTypeRepository.ts

---

## Refactoring Priority

### Immediate (Block Test Creation)

1. **payslipPdfService.ts** - Change export to class, add DI to constructor
2. **reconciliationService.ts** - Change export to class, add DI to constructor

### High Priority (Can Test With Workarounds)

3. **integrationService.ts** - Add DI parameters to constructor
4. **paymentService.ts** - Add DI parameters to constructor

---

## Testing Impact

### Can Test Immediately (28 services)
- All services with proper DI can be tested using standard unit test patterns
- No refactoring required before test creation

### Require Refactoring First (2 services)
- **payslipPdfService.ts** - MUST refactor before testing
- **reconciliationService.ts** - MUST refactor before testing

### Can Test With Workarounds (2 services)
- **integrationService.ts** - Can use jest.mock() but not ideal
- **paymentService.ts** - Can use jest.mock() but not ideal

---

## Recommendations

1. **Immediate Action:** Refactor payslipPdfService.ts and reconciliationService.ts before creating tests
2. **Short Term:** Enhance integrationService.ts and paymentService.ts constructors
3. **Maintain Excellence:** Keep all repositories and other services compliant during future development
4. **Code Review:** Add lint rule or code review checklist to prevent singleton exports

---

## Compliance Score

- **Services:** 28/32 compliant (87.5%) ✅
- **Repositories:** 17/17 compliant (100%) ✅
- **Overall:** 45/49 components (91.8%) ✅

**Excellent!** Vast majority of code follows industry standards.
