# PayLinQ Test Coverage Plan

**Created:** November 16, 2025  
**Status:** Implementation Plan  
**Target Coverage:** 90% for Services, 85% for Repositories

---

## Executive Summary

This document provides a comprehensive, systematic plan for increasing test coverage in the PayLinQ product. All service and repository method names have been verified via grep to prevent name mismatch errors. The plan follows the Testing Standards outlined in `docs/TESTING_STANDARDS.md`.

---

## Current Test Coverage Status

### Existing Tests
- ✅ `AllowanceService.test.js` - EXISTS
- ✅ `payComponentService.test.js` - EXISTS
- ✅ `payPeriodService.test.js` - EXISTS
- ✅ `PayrollRunTypeService.test.js` - EXISTS
- ✅ `workerTypeService.test.js` - EXISTS
- ✅ `dashboardRepository.test.js` - EXISTS

### Missing Tests (26 Services, 15 Repositories)

---

## Phase 1: Service Unit Tests (Priority: HIGH)

### Critical Acceptance Criteria
1. ✅ All method names verified via `grep "async \w+\(" ServiceFile.js`
2. ✅ Export pattern verified (class export, not singleton)
3. ✅ DTO usage identified and accounted for in tests
4. ✅ Dependency injection support validated
5. ✅ Test data uses DB format (snake_case) when mocking repository responses
6. ✅ Test expectations use DTO-mapped results (camelCase) when service uses DTOs

---

## Service Test Matrix

| Service | Priority | Method Count | Uses DTO | Export Pattern | Status |
|---------|----------|--------------|----------|----------------|--------|
| **approvalService.js** | HIGH | 6 | ❌ No | ⚠️ Need to verify | 🔴 NOT STARTED |
| **benefitsService.js** | HIGH | 8 | ❌ No | ✅ Class + DI | 🔴 NOT STARTED |
| **complianceService.js** | HIGH | 5 | ✅ Yes (complianceDto) | ✅ Class + DI | 🔴 NOT STARTED |
| **currencyService.js** | HIGH | 1 main + helpers | ❌ No | ✅ Class | 🔴 NOT STARTED |
| **dashboardService.js** | MEDIUM | 4 | ❌ No | ✅ Class + DI | 🔴 NOT STARTED |
| **deductionsService.js** | HIGH | 5 | ❌ No | ✅ Class + DI | 🔴 NOT STARTED |
| **formulaEngineService.js** | HIGH | 4 | ❌ No | ✅ Class | 🔴 NOT STARTED |
| **FormulaTemplateService.js** | MEDIUM | 5 | ❌ No | ⚠️ Need to verify | 🔴 NOT STARTED |
| **integrationService.js** | MEDIUM | 6 | ❌ No | ✅ Class | 🔴 NOT STARTED |
| **payComponentService.js** | HIGH | 1 main + validation | ✅ Yes (payComponentDto) | ⚠️ Need to verify | ✅ COMPLETE |
| **paymentService.js** | HIGH | 7 | ❌ No | ✅ Class | 🔴 NOT STARTED |
| **payrollService.js** | HIGH | 4 | ❌ No | ✅ Class | 🔴 NOT STARTED |
| **payScheduleService.js** | LOW | 1 | ❌ No | ⚠️ Need to verify | 🔴 NOT STARTED |
| **payslipPdfService.js** | MEDIUM | 4 | ❌ No | ⚠️ Need to verify | 🔴 NOT STARTED |
| **payslipTemplateService.js** | MEDIUM | 4 | ❌ No | ⚠️ Need to verify | 🔴 NOT STARTED |
| **payStructureService.js** | HIGH | 5 | ❌ No | ✅ Class | 🔴 NOT STARTED |
| **reconciliationService.js** | MEDIUM | 7 | ❌ No | ✅ Class | 🔴 NOT STARTED |
| **reportingService.js** | LOW | TBD | ❌ No | ⚠️ Need to verify | 🔴 NOT STARTED |
| **schedulingService.js** | MEDIUM | 5 | ❌ No | ✅ Class | 🔴 NOT STARTED |
| **taxCalculationService.js** | HIGH | 7 | ✅ Yes (taxRuleDto) | ✅ Class + DI | 🔴 NOT STARTED |
| **temporalPatternService.js** | MEDIUM | 5 | ❌ No | ✅ Class + DI | 🔴 NOT STARTED |
| **timeAttendanceService.js** | HIGH | 6 | ❌ No | ✅ Class | 🔴 NOT STARTED |

---

## Verified Service Method Names

### 1. approvalService.js
```javascript
// Verified methods (grep output):
async createApprovalRequest(requestData)
async getApplicableRules(organizationId, requestType, requestData)
ruleMatches(rule, requestType, requestData)
async approveRequest(requestId, userId, comments = null)
async rejectRequest(requestId, userId, comments)
async canUserApprove(requestId, userId, client)
```

**Export Pattern:** ⚠️ NEEDS VERIFICATION  
**Uses DTO:** ❌ No  
**Dependencies:** Database client, approval rules repository  

**Test Requirements:**
- Mock database queries for approval rules
- Test rule matching logic (conversion, rate_change types)
- Test approval workflow state transitions
- Test rejection workflow
- Test authorization checks (canUserApprove)

---

### 2. benefitsService.js
```javascript
// Verified methods:
constructor(payrollRepository = null)
async createBenefit(benefitData, organizationId, userId)
async getBenefitById(benefitId, organizationId)
async getEmployeeBenefits(employeeId, organizationId)
calculateBenefitDeduction(benefit, grossPay)
async enrollEmployeeBenefit(employeeId, benefitId, options)
async createBenefitPlan(planData, organizationId, userId)
async updateBenefitPlan(planId, updates, organizationId, userId)
async getBenefitPlans(organizationId, filters = {})
```

**Export Pattern:** ✅ Class with DI (payrollRepository)  
**Uses DTO:** ❌ No  
**Constants:** BENEFIT_TYPES, VALID_PLAN_TYPES

**Test Requirements:**
- Test benefit creation with all BENEFIT_TYPES
- Test benefit deduction calculation (percentage vs fixed)
- Test employee enrollment
- Test benefit plan CRUD operations
- Test input validation for all operations
- Mock payrollRepository for database operations

---

### 3. complianceService.js
```javascript
// Verified methods:
constructor(complianceRepository = null, payrollRepository = null)
async createComplianceRule(ruleData, organizationId, userId)
async updateComplianceRule(ruleId, updates, organizationId, userId)
async getComplianceRules(organizationId, filters = {})
async runComplianceCheck(ruleId, organizationId, userId)
```

**Export Pattern:** ✅ Class with DI (complianceRepository, payrollRepository)  
**Uses DTO:** ✅ Yes (complianceDto.js)  
**Rule Types:** wage_law, overtime_compliance

**Test Requirements:**
- ✅ DTO PATTERN: Mock repository returns DB format (snake_case)
- ✅ DTO PATTERN: Expect service returns API format (camelCase)
- Test rule creation with validation
- Test wage law compliance checks
- Test overtime compliance checks
- Test compliance violation detection
- Mock both repositories for complex compliance logic

---

### 4. currencyService.js
```javascript
// Verified methods:
constructor()
async initializeRedis()
async getExchangeRate(organizationId, fromCurrency, toCurrency, effectiveDate = new Date())
```

**Export Pattern:** ✅ Class with Redis caching  
**Uses DTO:** ❌ No  
**Caching:** L1 (memory), L2 (Redis), L3 (database)  
**Special:** Uses materialized views for performance

**Test Requirements:**
- Test exchange rate retrieval with all cache layers
- Test same currency returns 1.0
- Test cache hit/miss scenarios
- Test inverse rate calculation
- Test fallback to manual rates
- Test historical rate lookup
- Mock Redis client and database queries

---

### 5. dashboardService.js
```javascript
// Verified methods:
constructor(repository = null)
calculateDaysUntilNextPayroll(upcomingPayrolls)
async getDashboardOverview(organizationId, period = 30)
async getPayrollStats(organizationId, startDate, endDate)
async getEmployeeStats(organizationId)
async getRecentActivity(organizationId, limit = 10)
```

**Export Pattern:** ✅ Class with DI (repository)  
**Uses DTO:** ❌ No

**Test Requirements:**
- Test dashboard overview aggregation
- Test days calculation for next payroll
- Test payroll stats aggregation
- Test employee stats calculation
- Test recent activity retrieval with limits
- Mock repository for all database queries

---

### 6. deductionsService.js
```javascript
// Verified methods:
constructor(repository = null)
async createDeductionType(deductionData, organizationId, userId)
async getDeductionTypes(organizationId, filters = {})
async assignDeduction(assignmentData, organizationId, userId)
async updateEmployeeDeduction(deductionId, updates, organizationId, userId)
async terminateDeduction(deductionId, endDate, organizationId, userId)
```

**Export Pattern:** ✅ Class with DI (repository)  
**Uses DTO:** ❌ No  
**Calculation Types:** percentage, fixed

**Test Requirements:**
- Test deduction type creation with validation
- Test calculation type validation (percentage vs fixed)
- Test deduction assignment to employees
- Test employee deduction updates
- Test deduction termination with end date
- Mock repository for CRUD operations

---

### 7. formulaEngineService.js
```javascript
// Verified methods:
constructor()
evaluateFormula(formula, variables = {})
validateFormula(formula)
substituteVariables(formula, variables)
```

**Export Pattern:** ✅ Class (no DI needed)  
**Uses DTO:** ❌ No  
**Critical:** Security-sensitive (formula evaluation)

**Test Requirements:**
- Test formula evaluation with various operators (+, -, *, /, **, %)
- Test variable substitution
- Test formula validation (balanced parentheses)
- Test security: prevent dangerous patterns
- Test error handling for invalid formulas
- Test complex nested formulas
- Test edge cases (division by zero, empty variables)

---

### 8. FormulaTemplateService.js
```javascript
// Verified methods:
async getTemplates(organizationId, filters = {})
async getTemplateById(templateId, organizationId)
async getTemplateByCode(templateCode, organizationId)
async createTemplate(data, organizationId, userId)
```

**Export Pattern:** ⚠️ NEEDS VERIFICATION  
**Uses DTO:** ❌ No  
**Features:** Global templates, organization-specific templates

**Test Requirements:**
- Test template retrieval with filters (category, complexity, tags)
- Test global vs organization-specific templates
- Test template creation with validation
- Test template code uniqueness
- Test search functionality
- Mock database queries

---

### 9. integrationService.js
```javascript
// Verified methods:
constructor()
async setupPayrollFromNexusContract(contractData, createdBy)
async setupPayrollFromNexusContractInternal(contractData, createdBy)
async addBenefitsDeductionFromNexus(enrollmentData, createdBy)
async addBenefitsDeductionFromNexusInternal(enrollmentData, createdBy)
async recordTimeEntryFromScheduleHub(timeData, createdBy)
async recordTimeEntryFromScheduleHubInternal(timeData, createdBy)
mapSalaryFrequency(nexusFrequency)
determineCompensationType(employmentType, salaryFrequency)
```

**Export Pattern:** ✅ Class  
**Uses DTO:** ❌ No  
**Integration Points:** Nexus (contracts), ScheduleHub (time entries)

**Test Requirements:**
- Test Nexus contract to payroll setup
- Test benefits/deduction syncing from Nexus
- Test time entry recording from ScheduleHub
- Test salary frequency mapping
- Test compensation type determination
- Test duplicate detection (employee_number conflicts)
- Mock database queries and external integrations

---

### 10. paymentService.js
```javascript
// Verified methods:
constructor()
async initiatePayment(transactionData, organizationId, userId)
async getPaymentTransactions(organizationId, filters = {})
async getPaymentTransactionById(transactionId, organizationId)
async updatePaymentStatus(transactionId, status, organizationId, userId, additionalData = {})
async processPayment(transactionId, organizationId, userId)
async handlePaymentFailure(transactionId, failureReason, organizationId, userId)
async retryPayment(transactionId, organizationId, userId)
```

**Export Pattern:** ✅ Class  
**Uses DTO:** ❌ No  
**Payment Methods:** ach, wire, direct_deposit, check, cash  
**Statuses:** pending, processing, processed, failed

**Test Requirements:**
- Test payment initiation with validation
- Test payment method validation (bank details for ACH/wire)
- Test payment status transitions
- Test payment processing workflow
- Test payment failure handling
- Test payment retry logic
- Mock database and payment processor

---

### 11. payrollService.js
```javascript
// Verified methods:
constructor()
async createEmployeeRecord(employeeData, organizationId, userId)
async getEmployeesByOrganization(organizationId, filters = {})
async getEmployeeById(employeeRecordId, organizationId)
async deleteEmployeeRecord(employeeRecordId, organizationId, userId)
```

**Export Pattern:** ✅ Class  
**Uses DTO:** ❌ No  
**Payment Methods:** ach, wire, direct_deposit

**Test Requirements:**
- Test employee record creation with validation
- Test employee number uniqueness (23505 error handling)
- Test bank details validation for ACH/wire/direct_deposit
- Test employee retrieval with pagination
- Test employee filtering (status, payFrequency)
- Test employee soft delete
- Mock database queries

---

### 12. payStructureService.js
```javascript
// Verified methods:
constructor()
async createTemplate(templateData, organizationId, userId)
async getTemplateById(templateId, organizationId)
async getTemplates(organizationId, filters = {})
async updateTemplate(templateId, updates, organizationId, userId)
async publishTemplate(templateId, organizationId, userId)
```

**Export Pattern:** ✅ Class  
**Uses DTO:** ❌ No  
**Template Status:** draft, published

**Test Requirements:**
- Test template creation with version handling
- Test template code + version uniqueness
- Test template status transitions (draft → published)
- Test publish validation (must have components)
- Test template updates (only draft can be updated)
- Mock repository for CRUD operations

---

### 13. reconciliationService.js
```javascript
// Verified methods:
constructor()
async createReconciliation(reconciliationData, organizationId, userId)
async startReconciliation(reconciliationData, organizationId, userId)
async getReconciliations(organizationId, filters = {})
async getReconciliationsByOrganization(organizationId, filters = {})
async getReconciliationById(reconciliationId, organizationId)
async updateReconciliation(reconciliationId, organizationId, updateData)
async deleteReconciliation(reconciliationId, organizationId, userId)
async completeReconciliation(reconciliationId, organizationId, userId, notes = null)
```

**Export Pattern:** ✅ Class  
**Uses DTO:** ❌ No  
**Statuses:** pending, in_progress, completed

**Test Requirements:**
- Test reconciliation creation
- Test reconciliation start workflow
- Test reconciliation completion with unresolved items check
- Test reconciliation filtering
- Test reconciliation updates
- Test reconciliation soft delete
- Mock repository for all operations

---

### 14. schedulingService.js
```javascript
// Verified methods:
constructor()
async createBulkSchedules(employeeId, startDate, endDate, shifts, scheduleType, organizationId, userId)
async createWorkSchedule(scheduleData, organizationId, userId)
async getWorkSchedules(organizationId, filters = {})
async getSchedulesByOrganization(organizationId, filters = {})
async getSchedulesByEmployee(employeeId, organizationId, filters = {})
```

**Export Pattern:** ✅ Class  
**Uses DTO:** ❌ No  
**Features:** Bulk schedule creation, conflict detection

**Test Requirements:**
- Test bulk schedule creation with date ranges
- Test schedule conflict detection
- Test work schedule creation with duration calculation
- Test schedule retrieval with filters
- Test employee-specific schedule retrieval
- Mock repository for schedule operations

---

### 15. taxCalculationService.js
```javascript
// Verified methods:
constructor(taxEngineRepository = null, deductionRepository = null, allowanceService = null)
async createDeduction(deductionData, organizationId, userId)
async getDeductionsByOrganization(organizationId, filters = {})
async getDeductionsByEmployee(employeeRecordId, organizationId, filters = {})
async getDeductionById(deductionId, organizationId)
async updateDeduction(deductionId, organizationId, updates, userId)
async deleteDeduction(deductionId, organizationId, userId)
async createTaxRuleSet(ruleSetData, organizationId, userId)
```

**Export Pattern:** ✅ Class with DI (taxEngineRepository, deductionRepository, allowanceService)  
**Uses DTO:** ✅ Yes (taxRuleDto.js)  
**Calculation Types:** fixed_amount, percentage

**Test Requirements:**
- ✅ DTO PATTERN: Mock repository returns DB format (snake_case)
- ✅ DTO PATTERN: Expect service returns API format (camelCase)
- Test deduction creation with calculation type validation
- Test effective date range validation
- Test deduction CRUD operations
- Test tax rule set creation
- Mock all dependencies (3 repositories/services)

---

### 16. temporalPatternService.js
```javascript
// Verified methods:
constructor(timeAttendanceRepository = null, queryFn = null)
async evaluatePattern(employeeId, pattern, organizationId, asOfDate = new Date())
async evaluateDayOfWeekPattern(employeeId, pattern, organizationId, asOfDate)
countConsecutiveDays(entries, dayOfWeek, requiredCount)
async evaluateShiftTypePattern(employeeId, pattern, organizationId, asOfDate)
async evaluateStationPattern(employeeId, pattern, organizationId, asOfDate)
```

**Export Pattern:** ✅ Class with DI (timeAttendanceRepository, queryFn)  
**Uses DTO:** ❌ No  
**Pattern Types:** day_of_week, shift_type, station

**Test Requirements:**
- Test pattern evaluation for each pattern type
- Test day of week pattern (consecutive days)
- Test shift type pattern detection
- Test station pattern detection
- Test consecutive day counting logic
- Mock timeAttendanceRepository for time entries

---

### 17. timeAttendanceService.js
```javascript
// Verified methods:
constructor()
async createShiftType(shiftData, organizationId, userId)
async getShiftTypes(organizationId, filters = {})
async clockIn(clockData, organizationId, userId)
async clockOut(clockData, organizationId, userId)
async createClockEvent(eventData, organizationId, userId)
async createTimeEntry(entryData, organizationId, userId)
async getTimeEntries(organizationId, filters = {})
async getTimeEntryById(timeEntryId, organizationId)
```

**Export Pattern:** ✅ Class  
**Uses DTO:** ❌ No

**Test Requirements:**
- Test shift type creation
- Test clock in/out workflow
- Test open event detection (prevent double clock-in)
- Test time entry creation with validation
- Test worked hours calculation validation
- Test time entry retrieval with filters
- Mock database queries

---

## Phase 2: Repository Unit Tests (Priority: MEDIUM)

### Repository Test Matrix

| Repository | Priority | Method Count | Tested Methods | Status |
|-----------|----------|--------------|----------------|--------|
| **AllowanceRepository** | HIGH | 5 | findActiveAllowanceByType, getEmployeeAllowanceUsage, recordAllowanceUsage, getAllAllowances, resetAllowanceUsage | 🔴 NOT STARTED |
| **complianceRepository** | MEDIUM | 8 | createComplianceRule, findComplianceRulesByType, updateComplianceRule, createComplianceCheck, findComplianceChecks, createComplianceViolation, findComplianceViolations, updateComplianceViolation | 🔴 NOT STARTED |
| **deductionRepository** | HIGH | 4 | createEmployeeDeduction, findEmployeeDeductions, findEmployeeDeductionById, updateEmployeeDeduction, deactivateEmployeeDeduction | 🔴 NOT STARTED |
| **ExchangeRateRepository** | HIGH | 9 | getCurrentRate, getActiveRates, getHistoricalRates, createRate, updateRate, deleteRate, bulkCreateRates, logConversion, getConversionHistory | 🔴 NOT STARTED |
| **payComponentRepository** | HIGH | 5 | createPayComponent, findPayComponents, findPayComponentById, findPayComponentByCode, updatePayComponent | 🔴 NOT STARTED |
| **paymentRepository** | HIGH | 4 | createPaymentTransaction, findPaymentTransactions, findPaymentTransactionById, updatePaymentStatus | 🔴 NOT STARTED |
| **payrollRepository** | HIGH | 4 | createEmployeeRecord, findByOrganization, findEmployeeRecordById, updateEmployeeRecord | 🔴 NOT STARTED |
| **payStructureRepository** | MEDIUM | 5 | createTemplate, findTemplateById, findTemplates, updateTemplate, publishTemplate | 🔴 NOT STARTED |
| **reconciliationRepository** | MEDIUM | 6 | createReconciliation, findReconciliations, findReconciliationById, updateReconciliation, completeReconciliation, deleteReconciliation | 🔴 NOT STARTED |
| **schedulingRepository** | MEDIUM | 3 | createWorkSchedule, findWorkSchedules, findWorkSchedulesPaginated | 🔴 NOT STARTED |
| **taxEngineRepository** | HIGH | 5 | createTaxRuleSet, findApplicableTaxRuleSets, findTaxRuleSetById, findTaxRuleSets, updateTaxRuleSet | 🔴 NOT STARTED |
| **taxRepository** | LOW | 3 | getTaxRates, getAllJurisdictions, getJurisdictionById | 🔴 NOT STARTED |
| **timeAttendanceRepository** | HIGH | 7 | createShiftType, findShiftTypes, findShiftTypeById, createTimeEvent, findOpenClockEvent, findTimeEvents, createTimeEntry | 🔴 NOT STARTED |
| **workerTypeRepository** | MEDIUM | 7 | createTemplate, findTemplatesByOrganization, findTemplateById, findTemplateByCode, updateTemplate, assignWorkerType, findCurrentWorkerType, findWorkerTypeHistory | 🔴 NOT STARTED |

---

## Phase 3: Integration Tests (Priority: MEDIUM)

### Integration Test Requirements

1. **PayLinQ API Endpoints** (End-to-End)
   - POST /api/products/paylinq/employee-records (create employee)
   - GET /api/products/paylinq/employee-records (list employees)
   - GET /api/products/paylinq/employee-records/:id (get employee)
   - PUT /api/products/paylinq/employee-records/:id (update employee)
   - DELETE /api/products/paylinq/employee-records/:id (soft delete)
   
2. **Payroll Run Workflow**
   - Create payroll run
   - Generate paychecks
   - Process payments
   - Complete payroll run

3. **Multi-Currency Support**
   - Exchange rate retrieval
   - Currency conversion
   - Historical rate lookup

4. **Compliance Checks**
   - Run compliance check
   - Detect violations
   - Generate compliance report

5. **Tenant Isolation**
   - Verify organization_id filtering
   - Test cross-tenant access prevention
   - Test soft delete filtering

---

## Phase 4: DTO Testing Strategy

### DTO Files and Coverage

| DTO File | Functions | Test Required | Status |
|----------|-----------|---------------|--------|
| **payComponentDto.js** | mapComponentDbToApi, mapComponentsDbToApi, mapComponentApiToDb, mapComponentToSummary, mapComponentsToSummary, groupComponentsByType | ✅ Yes | 🔴 NOT STARTED |
| **payrollRunTypeDto.js** | mapRunTypeDbToApi, mapRunTypesDbToApi, mapRunTypeApiToDb, mapRunTypeToSummary, mapRunTypesToSummary | ✅ Yes | 🔴 NOT STARTED |
| **runComponentDto.js** | mapRunComponentDbToApi, mapRunComponentsDbToApi, mapRunComponentApiToDb, mapRunComponentsToBreakdown | ✅ Yes | 🔴 NOT STARTED |
| **taxRuleDto.js** | mapTaxRuleSetDbToApi, mapTaxBracketDbToApi, mapTaxRuleSetApiToDb | ✅ Yes | 🔴 NOT STARTED |
| **workerTypeDto.js** | mapTemplateDbToApi, mapTemplatesDbToApi, mapTemplateApiToDb, mapAssignmentDbToApi, mapAssignmentsDbToApi, mapAssignmentApiToDb | ✅ Yes | 🔴 NOT STARTED |
| **complianceDto.js** | TBD (file structure unknown) | ✅ Yes | 🔴 NOT STARTED |
| **componentDto.js** | TBD (file structure unknown) | ✅ Yes | 🔴 NOT STARTED |
| **paycheckDto.js** | TBD (file structure unknown) | ✅ Yes | 🔴 NOT STARTED |

### DTO Test Pattern (MANDATORY)

**When testing services that use DTOs:**

```javascript
// ✅ CORRECT DTO Test Pattern
describe('ServiceWithDTO', () => {
  it('should return DTO-transformed result', async () => {
    const dbData = createDbFormatData({ field_name: 'value' }); // snake_case
    mockRepository.findById.mockResolvedValue(dbData);

    const result = await service.getById(id, orgId);

    // Expect DTO-mapped result (camelCase)
    expect(result).toEqual(mapDbToApi(dbData));
    expect(result.fieldName).toBe('value'); // camelCase
    expect(result.field_name).toBeUndefined(); // DB field should not exist
  });
});
```

---

## Implementation Workflow (MANDATORY)

### Pre-Implementation Checklist

Before writing ANY test file:

1. ✅ **Verify Method Names**
   ```powershell
   grep "async \w+\(" ServiceFile.js
   ```

2. ✅ **Verify Export Pattern**
   - Check if service exports class or singleton
   - If singleton, STOP and refactor service first

3. ✅ **Identify DTO Usage**
   ```powershell
   grep "from '../dto" ServiceFile.js
   ```

4. ✅ **Document Verified Methods**
   - Create test plan comment block with actual method names
   - Include method signatures with parameters

5. ✅ **Create Helper Functions**
   - `createDbFormatData()` for repository mocks
   - `createApiFormatData()` for service input
   - Use actual field names from source code

### Test File Template

```javascript
/**
 * [ServiceName] Test Suite
 * Tests for [description of service]
 * 
 * VERIFIED METHODS (via grep):
 * - async methodName(param1, param2)
 * - async anotherMethod(param)
 * 
 * Export Pattern: [Class with DI / Class / Singleton]
 * Uses DTO: [Yes - dtoFile.js / No]
 * Dependencies: [list repositories/services]
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ServiceClass from '../../../../src/products/paylinq/services/ServiceClass.js';
import { mapDbToApi } from '../../../../src/products/paylinq/dto/entityDto.js'; // If DTO used

// Mock dependencies
jest.mock('../../../../src/products/paylinq/repositories/Repository.js');

describe('ServiceClass', () => {
  let service;
  let mockRepository;
  const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const userId = 'user-123e4567-e89b-12d3-a456-426614174000';

  // Helper: DB format data (snake_case)
  const createDbEntity = (overrides = {}) => ({
    id: 'entity-123',
    organization_id: orgId,
    field_name: 'value', // snake_case
    created_at: new Date(),
    ...overrides
  });

  // Helper: API format data (camelCase)
  const createApiEntity = (overrides = {}) => ({
    fieldName: 'value', // camelCase
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      // ... all repository methods
    };
    service = new ServiceClass(mockRepository); // DI pattern
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const dbEntity = createDbEntity();
      mockRepository.findById.mockResolvedValue(dbEntity);

      // Act
      const result = await service.methodName(param, orgId);

      // Assert
      if (usesDTO) {
        expect(result).toEqual(mapDbToApi(dbEntity));
      } else {
        expect(result).toEqual(dbEntity);
      }
      expect(mockRepository.findById).toHaveBeenCalledWith(param, orgId);
    });

    it('should throw ValidationError for invalid input', async () => {
      await expect(
        service.methodName(invalidData, orgId)
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

---

## Common Test Patterns

### Pattern 1: Service with DTO

```javascript
// Mock returns DB format
const dbData = createDbFormat({ snake_case_field: 'value' });
mockRepository.method.mockResolvedValue(dbData);

// Service transforms via DTO
const result = await service.method(params);

// Expect API format
expect(result).toEqual(mapDbToApi(dbData));
expect(result.camelCaseField).toBe('value');
```

### Pattern 2: Service without DTO

```javascript
// Mock returns data as-is
const data = { field: 'value' };
mockRepository.method.mockResolvedValue(data);

const result = await service.method(params);

expect(result).toEqual(data);
```

### Pattern 3: Validation Testing

```javascript
it('should throw ValidationError for missing required field', async () => {
  const invalidData = { /* missing required field */ };

  await expect(
    service.create(invalidData, orgId, userId)
  ).rejects.toThrow(ValidationError);
});
```

### Pattern 4: Tenant Isolation

```javascript
it('should filter by organization_id', async () => {
  await service.getById(id, orgId);

  expect(mockRepository.findById).toHaveBeenCalledWith(
    id,
    orgId
  );
});
```

---

## Test Execution Plan

### Step 1: Export Pattern Verification (Week 1, Day 1)
- [ ] Run grep on all service files
- [ ] Identify services with singleton exports
- [ ] Refactor singleton services to class exports
- [ ] Update service imports throughout codebase

### Step 2: High Priority Services (Week 1, Days 2-5)
- [ ] approvalService.js
- [ ] benefitsService.js
- [ ] complianceService.js (with DTO)
- [ ] currencyService.js
- [ ] deductionsService.js
- [ ] paymentService.js
- [ ] payrollService.js
- [ ] taxCalculationService.js (with DTO)
- [ ] timeAttendanceService.js

### Step 3: Medium Priority Services (Week 2)
- [ ] dashboardService.js
- [ ] FormulaTemplateService.js
- [ ] integrationService.js
- [ ] payslipPdfService.js
- [ ] payslipTemplateService.js
- [ ] payStructureService.js
- [ ] reconciliationService.js
- [ ] schedulingService.js
- [ ] temporalPatternService.js

### Step 4: Formula Engine (Week 2, Priority)
- [ ] formulaEngineService.js (security-critical)

### Step 5: High Priority Repositories (Week 3)
- [ ] AllowanceRepository
- [ ] deductionRepository
- [ ] ExchangeRateRepository
- [ ] payComponentRepository
- [ ] paymentRepository
- [ ] payrollRepository
- [ ] taxEngineRepository
- [ ] timeAttendanceRepository

### Step 6: Medium Priority Repositories (Week 4)
- [ ] complianceRepository
- [ ] payStructureRepository
- [ ] reconciliationRepository
- [ ] schedulingRepository
- [ ] workerTypeRepository

### Step 7: DTO Tests (Week 4)
- [ ] All DTO mapper functions

### Step 8: Integration Tests (Week 5)
- [ ] API endpoint tests
- [ ] Workflow tests
- [ ] Tenant isolation tests

---

## Coverage Targets

| Category | Minimum Coverage | Target Coverage |
|----------|------------------|-----------------|
| Services | 90% | 95% |
| Repositories | 85% | 90% |
| DTOs | 90% | 95% |
| Controllers | 75% | 85% |
| Overall | 80% | 90% |

---

## Quality Gates

### Before Merging Each Test File

1. ✅ All method names match source code exactly
2. ✅ Zero `TypeError: method is not a function` errors
3. ✅ All tests pass
4. ✅ Coverage target met for tested file
5. ✅ No hardcoded test data (use helper functions)
6. ✅ DTO pattern followed if applicable
7. ✅ Tenant isolation validated
8. ✅ Error cases tested
9. ✅ Edge cases covered
10. ✅ JSDoc comments present

---

## Risk Mitigation

### Common Pitfalls (AVOID)

1. ❌ **Assuming method names** without verification
   - **Solution:** Always grep source file first

2. ❌ **Testing singleton exports** without refactoring
   - **Solution:** Refactor to class export first

3. ❌ **Ignoring DTO transformation** in tests
   - **Solution:** Check for DTO imports, use DTO pattern

4. ❌ **Missing organizationId** in repository calls
   - **Solution:** Verify all repository methods receive orgId

5. ❌ **Not mocking all dependencies**
   - **Solution:** Create mock for every constructor parameter

6. ❌ **Hardcoding test data**
   - **Solution:** Use helper functions for test data creation

7. ❌ **Not testing validation**
   - **Solution:** Test all Joi validation rules

8. ❌ **Not testing error paths**
   - **Solution:** Test NotFoundError, ValidationError, ConflictError

---

## Success Metrics

- ✅ 90%+ coverage on all services
- ✅ 85%+ coverage on all repositories
- ✅ Zero method name mismatch errors
- ✅ All tests passing
- ✅ DTO pattern consistently applied
- ✅ Tenant isolation verified in all tests

---

## Appendix A: Example Test Implementation

### Example: complianceService.js Test

```javascript
/**
 * ComplianceService Test Suite
 * Tests for compliance rule management and checking
 * 
 * VERIFIED METHODS (via grep):
 * - constructor(complianceRepository = null, payrollRepository = null)
 * - async createComplianceRule(ruleData, organizationId, userId)
 * - async updateComplianceRule(ruleId, updates, organizationId, userId)
 * - async getComplianceRules(organizationId, filters = {})
 * - async runComplianceCheck(ruleId, organizationId, userId)
 * 
 * Export Pattern: Class with DI (complianceRepository, payrollRepository)
 * Uses DTO: Yes (complianceDto.js)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ComplianceService from '../../../../src/products/paylinq/services/complianceService.js';
import { mapRuleDbToApi } from '../../../../src/products/paylinq/dto/complianceDto.js';
import { ValidationError, NotFoundError } from '../../../../src/middleware/errorHandler.js';

describe('ComplianceService', () => {
  let service;
  let mockComplianceRepo;
  let mockPayrollRepo;
  const orgId = 'org-123';
  const userId = 'user-123';

  // Helper: DB format (snake_case)
  const createDbRule = (overrides = {}) => ({
    id: 'rule-123',
    organization_id: orgId,
    rule_name: 'Minimum Wage Check',
    rule_type: 'wage_law',
    description: 'Verify minimum wage compliance',
    threshold: 15.00,
    is_active: true,
    created_at: new Date(),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockComplianceRepo = {
      createComplianceRule: jest.fn(),
      findComplianceRulesByType: jest.fn(),
      updateComplianceRule: jest.fn()
    };
    mockPayrollRepo = {
      findEmployees: jest.fn(),
      findCompensation: jest.fn()
    };
    service = new ComplianceService(mockComplianceRepo, mockPayrollRepo);
  });

  describe('createComplianceRule', () => {
    it('should create rule with valid data and return DTO-transformed result', async () => {
      const ruleData = {
        ruleName: 'Minimum Wage Check',
        ruleType: 'wage_law',
        description: 'Verify minimum wage compliance',
        threshold: 15.00
      };

      const dbCreated = createDbRule();
      mockComplianceRepo.createComplianceRule.mockResolvedValue(dbCreated);

      const result = await service.createComplianceRule(ruleData, orgId, userId);

      // DTO transformation expected
      expect(result).toEqual(mapRuleDbToApi(dbCreated));
      expect(result.ruleName).toBe('Minimum Wage Check'); // camelCase
      expect(result.rule_name).toBeUndefined(); // DB field should not exist
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidData = { ruleName: 'Test' }; // Missing required fields

      await expect(
        service.createComplianceRule(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid ruleType', async () => {
      const invalidData = {
        ruleName: 'Test',
        ruleType: 'invalid_type',
        description: 'Test'
      };

      await expect(
        service.createComplianceRule(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('runComplianceCheck', () => {
    it('should detect wage law violations', async () => {
      const ruleId = 'rule-123';
      const rule = createDbRule({ rule_type: 'wage_law', threshold: 15.00 });
      
      mockComplianceRepo.findComplianceRulesByType.mockResolvedValue([rule]);
      mockPayrollRepo.findEmployees.mockResolvedValue([
        { id: 'emp-1', name: 'John Doe' }
      ]);
      mockPayrollRepo.findCompensation.mockResolvedValue({
        pay_period: 'hour',
        pay_rate: 12.00 // Below threshold
      });

      const result = await service.runComplianceCheck(ruleId, orgId, userId);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].employeeId).toBe('emp-1');
    });
  });
});
```

---

## Document Maintenance

**Last Updated:** November 16, 2025  
**Next Review:** After Phase 1 completion  
**Owner:** Development Team

---

**END OF PLAN**
