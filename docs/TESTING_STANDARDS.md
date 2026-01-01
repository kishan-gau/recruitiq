# Testing Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.3  
**Last Updated:** November 24, 2025

---

## Table of Contents

1. [AI-Assisted Testing Strategy](#ai-assisted-testing-strategy)
2. [Testing Philosophy](#testing-philosophy)
3. [Test Coverage Requirements](#test-coverage-requirements)
4. [Test Classification: Unit vs Integration](#test-classification-unit-vs-integration)
5. [Test File Organization](#test-file-organization)
6. [Import Path Standards](#import-path-standards)
7. [Unit Testing Standards](#unit-testing-standards)
8. [Integration Testing Standards](#integration-testing-standards)
9. [E2E Testing Standards](#e2e-testing-standards)
10. [Test Structure](#test-structure)
11. [Mocking Standards](#mocking-standards)
12. [Test Data Management](#test-data-management)
13. [Refactoring Resilience](#refactoring-resilience)

---

## AI-Assisted Testing Strategy

### The Challenge: Writing Accurate Tests Without Trial-and-Error

When AI assistants write tests without proper verification, common failures include:
- ❌ `TypeError: service.methodName is not a function` - Assumed method names don't exist
- ❌ Incorrect parameter order or count
- ❌ Wrong data format expectations (snake_case vs camelCase)
- ❌ Testing singleton exports that can't be mocked
- ❌ Missing DTO transformations in assertions
- ❌ **Invalid UUID formats (prefixes like 'emp-123' instead of valid UUIDs)**
- ❌ **Enum values that don't match schema definitions**
- ❌ **Numeric values that violate min/max/positive constraints**

**Root Cause:** Assuming implementation details instead of verifying actual source code and validation schemas.

### The Solution: Systematic Pre-Implementation Verification

**MANDATORY WORKFLOW** for AI-assisted test writing:

```
┌─────────────────────────────────────────────────────┐
│ Step 1: Read Source File                            │
│ ✓ Get complete understanding of service API         │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ Step 2: Extract Method Signatures                   │
│ ✓ grep "async \w+\(" ServiceName.js                │
│ ✓ Document ACTUAL method names                      │
│ ✓ Document parameter order and types                │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ Step 3: Verify Export Pattern                       │
│ ✓ Check if service exports class or singleton       │
│ ✓ STOP if singleton - refactor first                │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ Step 4: Check DTO Usage                             │
│ ✓ grep "from '../dto" ServiceName.js               │
│ ✓ If found: Plan for DB→API transformation tests    │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ Step 5: Examine Validation Schemas (NEW!)           │
│ ✓ grep "static.*Schema" ServiceName.js             │
│ ✓ Document Joi validation constraints               │
│ ✓ Note UUID, enum, numeric, and date constraints    │
│ ✓ Identify required vs optional fields              │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ Step 6: Document Findings                           │
│ ✓ List all verified method names                    │
│ ✓ Document parameter signatures                     │
│ ✓ Note DTO usage                                    │
│ ✓ Document validation constraints                   │
│ ✓ Confirm export pattern                            │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ Step 7: Write Tests (Only Now!)                     │
│ ✓ Use EXACT method names from source                │
│ ✓ Use EXACT parameter order                         │
│ ✓ Mock with correct data format (DB if DTO used)    │
│ ✓ Assert with correct format (API if DTO used)      │
│ ✓ Use valid data formats matching schema constraints│
└─────────────────────────────────────────────────────┘
```

### Step-by-Step Verification Process

#### Step 1: Read the Complete Source File

```powershell
# PowerShell command to read source
Get-Content src/products/paylinq/services/AllowanceService.js
```

**Why:** Understanding the full context prevents assumptions about:
- Method naming patterns
- Parameter conventions
- Return value structures
- Dependencies and imports

#### Step 2: Extract Method Signatures

```powershell
# Extract all async method signatures
Select-String "async \w+\(" src/products/paylinq/services/AllowanceService.js

# Example output reveals ACTUAL methods:
# async calculateTaxFreeAllowance(grossPay, payDate, payPeriod, organizationId)
# async getAvailableHolidayAllowance(employeeId, year, organizationId)
# async getAllAllowances(organizationId)  ← NOT list()!
```

**Document findings:**
```javascript
/**
 * VERIFIED METHODS (from source code inspection):
 * 
 * 1. calculateTaxFreeAllowance(grossPay, payDate, payPeriod, organizationId)
 *    - Returns: number (calculated allowance)
 *    - DTO: No (returns calculated value)
 * 
 * 2. getAvailableHolidayAllowance(employeeId, year, organizationId)
 *    - Returns: object { available, used, total }
 *    - DTO: No (returns plain object)
 * 
 * 3. getAllAllowances(organizationId)
 *    - Returns: array of allowance objects
 *    - DTO: YES (uses mapAllowancesDbToApi)
 */
```

**CRITICAL: Verify Method Call Chain**

Don't just check method names—verify **what each method calls**:

```powershell
# Check the implementation of the method you're testing
Get-Content src/products/paylinq/services/DeductionsService.js | Select-String -Pattern "getYearToDateDeductions" -Context 5,15

# Example reveals actual behavior:
# async getYearToDateDeductions(employeeId, organizationId) {
#   // Calls repository directly, NOT another service method
#   return await this.repository.getYearToDateDeductions(employeeId, organizationId);
# }
```

**Real-World Failure Example:**

```javascript
// ❌ WRONG: Test assumes method calls another service method
describe('getYearToDateDeductions', () => {
  it('should return YTD deductions', async () => {
    // This spy will NEVER be called - getYearToDateDeductions doesn't call getDeductionSummary!
    jest.spyOn(service, 'getDeductionSummary').mockResolvedValue(mockData);
    
    // Test will fail: TypeError - mock not found
    const result = await service.getYearToDateDeductions(employeeId, orgId);
  });
});

// ✅ CORRECT: Test verifies actual method calls
describe('getYearToDateDeductions', () => {
  it('should return YTD deductions from repository', async () => {
    // Mock what the method ACTUALLY calls (verified by reading source)
    mockRepository.getYearToDateDeductions.mockResolvedValue(mockData);
    
    const result = await service.getYearToDateDeductions(employeeId, orgId);
    expect(result).toEqual(mockData);
  });
});
```

**Lesson:** Reading method signatures isn't enough. You must verify the **implementation** to know what to mock.

#### Step 3: Verify Export Pattern

```javascript
// Read bottom of source file to check export

// ✅ CORRECT: Class export (testable)
export default AllowanceService;

// ❌ WRONG: Singleton export (STOP - refactor required!)
export default new AllowanceService();
```

**If singleton found:**
1. **STOP** - Do not proceed with test writing
2. **REFACTOR** service to export class:
   ```javascript
   // Before: export default new AllowanceService();
   // After:  export default AllowanceService;
   ```
3. **Update constructor** to accept dependencies:
   ```javascript
   constructor(repository = null) {
     this.repository = repository || new AllowanceRepository();
   }
   ```
4. **VERIFY** refactoring doesn't break existing code
5. **THEN** proceed to Step 4

#### Step 4: Check DTO Usage

```powershell
# Search for DTO imports in service
Select-String "from '../dto" src/products/paylinq/services/AllowanceService.js
```

**If DTOs found:**
```javascript
// Service imports DTO mappers
import { mapAllowanceDbToApi, mapAllowancesDbToApi } from '../dto/allowanceDto.js';

// This means:
// 1. Repository returns snake_case (DB format)
// 2. Service transforms to camelCase (API format)
// 3. Tests must mock DB format, expect API format
```

**Create helper for test data:**
```javascript
// Helper to generate DB format data (snake_case)
const createDbAllowance = (overrides = {}) => ({
  id: 'allow-123',
  organization_id: 'org-456',        // snake_case
  allowance_type: 'housing',         // snake_case
  allowance_amount: 500.00,          // snake_case
  is_taxable: false,                 // snake_case
  created_at: new Date(),
  ...overrides
});
```

#### Step 5: Examine Validation Schemas (CRITICAL)

```powershell
# Search for Joi schema definitions
Select-String "static.*Schema" src/products/paylinq/services/AllowanceService.js
```

**Extract validation rules:**
```javascript
static createSchema = Joi.object({
  employeeRecordId: Joi.string().uuid().required(),      // ✓ Must be valid UUID
  deductionType: Joi.string().valid('tax', 'pension'),   // ✓ Must be enum value
  deductionAmount: Joi.number().positive().required(),   // ✓ Must be positive number
  effectiveDate: Joi.date().max('now'),                  // ✓ Must be past/present date
  description: Joi.string().max(500).optional()          // ✓ Optional with max length
});
```

**CRITICAL: Create test helpers matching constraints:**
```javascript
// ✅ CORRECT: Valid test data matching schema
const createValidDeduction = (overrides = {}) => ({
  employee_record_id: '123e4567-e89b-12d3-a456-426614174000',  // Valid UUID v4
  deduction_type: 'tax',                                        // Valid enum
  deduction_amount: 100.00,                                     // Positive number
  effective_date: new Date('2025-01-01'),                       // Past date
  description: 'Test deduction',                                // Within max length
  ...overrides
});

// ❌ WRONG: Invalid formats that will fail validation
const createInvalidDeduction = () => ({
  employee_record_id: 'emp-123',          // ❌ Not a valid UUID
  deduction_type: 'invalid',              // ❌ Not in enum
  deduction_amount: -50,                  // ❌ Negative number
  effective_date: new Date('2099-01-01'), // ❌ Future date
  description: 'x'.repeat(1000)           // ❌ Exceeds max length
});
```

**Why This Matters:**
- Prevents validation errors disguised as logic errors
- Ensures test data matches production constraints
- Catches schema mismatches early
- Reduces trial-and-error debugging

**Common Schema Patterns to Check:**

| Joi Validator | Test Data Requirement | Example |
|---------------|----------------------|---------|
| `.uuid()` | Valid UUID v4 format | `'123e4567-e89b-12d3-a456-426614174000'` |
| `.valid(...)` | Must be in enum list | `.valid('active', 'inactive')` → `'active'` |
| `.positive()` | Number > 0 | `100.00` not `-50` or `0` |
| `.min(n)` | Value ≥ n | `.min(18)` → `18` or higher |
| `.max(n)` | Value ≤ n | `.max(100)` → `100` or lower |
| `.email()` | Valid email format | `'user@example.com'` |
| `.pattern(regex)` | Must match regex | `.pattern(/^\d{5}$/)` → `'12345'` |
| `.date().max('now')` | Past/present date | `new Date('2025-01-01')` not future |
| `.required()` | Cannot be undefined | Must provide value |
| `.optional()` | Can be omitted | Can use `undefined` or omit |

#### Step 6: Document Findings

Before writing tests, create a summary:

```javascript
/**
 * AllowanceService Test Plan
 * 
 * EXPORT PATTERN: ✅ Class export (testable)
 * DTO USAGE: ✅ Uses allowanceDto.js
 * VALIDATION SCHEMAS: ✅ createSchema, updateSchema documented
 * 
 * VERIFIED METHODS:
 * 1. calculateTaxFreeAllowance(grossPay, payDate, payPeriod, organizationId)
 *    - Parameters: number, Date, string, string
 *    - Returns: number
 *    - DTO: No
 * 
 * 2. getAllAllowances(organizationId)
 *    - Parameters: string
 *    - Returns: array of objects
 *    - DTO: Yes (mapAllowancesDbToApi)
 *    - Mock format: snake_case
 *    - Expected format: camelCase
 * 
 * 3. getById(id, organizationId)
 *    - Parameters: string, string
 *    - Returns: object or null
 *    - DTO: Yes (mapAllowanceDbToApi)
 * 
 * VALIDATION CONSTRAINTS (from Joi schemas):
 * - id: UUID v4 required
 * - organizationId: UUID v4 required
 * - allowanceType: enum ['housing', 'transport', 'meal']
 * - allowanceAmount: positive number required
 * - effectiveDate: date, max 'now'
 * 
 * DEPENDENCIES:
 * - AllowanceRepository (inject mock)
 * - No other service dependencies
 */
```

#### Step 7: Write Tests with Verified Information

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import AllowanceService from '../../../../src/products/paylinq/services/AllowanceService.js';
import { mapAllowanceDbToApi, mapAllowancesDbToApi } from '../../../../src/products/paylinq/dto/allowanceDto.js';

describe('AllowanceService', () => {
  let service;
  let mockRepository;

  // Helper using VERIFIED DB format (snake_case) with VALID UUID
  const createDbAllowance = (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',  // ✅ Valid UUID v4
    organization_id: '223e4567-e89b-12d3-a456-426614174001',  // ✅ Valid UUID v4
    allowance_type: 'housing',  // ✅ Valid enum value
    allowance_amount: 500.00,   // ✅ Positive number
    is_taxable: false,
    created_at: new Date(),
    ...overrides
  });

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn()
    };
    service = new AllowanceService(mockRepository);
  });

  describe('getAllAllowances', () => {  // ✅ VERIFIED method name
    it('should return DTO-transformed allowances', async () => {
      const orgId = 'org-456';
      
      // Arrange: Mock returns DB format (snake_case)
      const dbAllowances = [
        createDbAllowance({ allowance_type: 'housing' }),
        createDbAllowance({ allowance_type: 'transport' })
      ];
      mockRepository.findAll.mockResolvedValue(dbAllowances);

      // Act: Call VERIFIED method name
      const result = await service.getAllAllowances(orgId);  // ✅ Exact name

      // Assert: Expect DTO-transformed result (camelCase)
      expect(result).toEqual(mapAllowancesDbToApi(dbAllowances));
      expect(result[0].allowanceType).toBe('housing');  // ✅ camelCase
      expect(result[0].allowance_type).toBeUndefined(); // ✅ DB field gone
    });
  });

  describe('calculateTaxFreeAllowance', () => {  // ✅ VERIFIED method name
    it('should calculate allowance correctly', async () => {
      const grossPay = 5000;
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';
      const orgId = 'org-456';

      // Act: Use VERIFIED parameter order
      const result = await service.calculateTaxFreeAllowance(
        grossPay,    // ✅ Correct order
        payDate,     // ✅ Correct order
        payPeriod,   // ✅ Correct order
        orgId        // ✅ Correct order
      );

      // Assert: Expect number (no DTO transformation)
      expect(typeof result).toBe('number');
    });
  });
});
```

### Common Anti-Patterns to Avoid

#### ❌ Anti-Pattern 1: Assuming Generic Method Names

```javascript
// ❌ WRONG: Assumes generic CRUD pattern
describe('getAllowances', () => {
  it('should list allowances', async () => {
    const result = await service.list(orgId);  // Method doesn't exist!
  });
});

// ✅ CORRECT: Uses verified method name
describe('getAllAllowances', () => {  // From source verification
  it('should return all allowances', async () => {
    const result = await service.getAllAllowances(orgId);
  });
});
```

#### ❌ Anti-Pattern 2: Ignoring DTO Transformations

```javascript
// ❌ WRONG: Expects DB format from service
it('should return allowance', async () => {
  const dbAllowance = { allowance_type: 'housing' };  // snake_case
  mockRepository.findById.mockResolvedValue(dbAllowance);
  
  const result = await service.getById(id, orgId);
  expect(result.allowance_type).toBe('housing');  // ❌ Won't exist!
});

// ✅ CORRECT: Expects API format after DTO transformation
it('should return DTO-transformed allowance', async () => {
  const dbAllowance = { allowance_type: 'housing' };  // Mock DB format
  mockRepository.findById.mockResolvedValue(dbAllowance);
  
  const result = await service.getById(id, orgId);
  expect(result.allowanceType).toBe('housing');  // ✅ camelCase (API format)
});
```

#### ❌ Anti-Pattern 3: Testing Singleton Exports

```javascript
// ❌ WRONG: Cannot inject mock into singleton
import service from '../../../../src/services/AllowanceService.js';  // Singleton!

describe('AllowanceService', () => {
  it('should create allowance', async () => {
    // How do we mock the repository? We can't!
    const result = await service.create(data, orgId);
  });
});

// ✅ CORRECT: Inject mock into class instance
import AllowanceService from '../../../../src/services/AllowanceService.js';

describe('AllowanceService', () => {
  let service, mockRepository;
  
  beforeEach(() => {
    mockRepository = { create: jest.fn() };
    service = new AllowanceService(mockRepository);  // ✅ DI works!
  });
});
```

### Verification Checklist

Before submitting tests, verify:

- [ ] ✅ Read complete source file
- [ ] ✅ Extracted all method signatures with grep
- [ ] ✅ **Verified what each method calls internally** (not just signatures)
- [ ] ✅ Documented verified method names
- [ ] ✅ Checked export pattern (class vs singleton)
- [ ] ✅ Verified DTO usage (searched for DTO imports)
- [ ] ✅ **Examined Joi validation schemas for data constraints**
- [ ] ✅ **Created test constants that match schema requirements (UUIDs, enums, etc.)**
- [ ] ✅ Created test data helpers with correct format
- [ ] ✅ All test method calls match source exactly
- [ ] ✅ All parameter orders match source
- [ ] ✅ Mock data uses DB format (snake_case) if DTOs used
- [ ] ✅ Assertions expect API format (camelCase) if DTOs used
- [ ] ✅ **All UUIDs are in valid v4 format (no prefixes like 'emp-123')**
- [ ] ✅ **All enum values match schema definitions exactly**
- [ ] ✅ **All numeric values satisfy min/max/positive constraints**
- [ ] ✅ **Mocks match what methods actually call** (verified in source)
- [ ] ✅ No assumed method names (all verified)
- [ ] ✅ Tests pass on first run (no trial-and-error)

### Success Metrics

**Acceptance Criteria for AI-Written Tests:**
- ✅ **ZERO** `TypeError: service.methodName is not a function` errors
- ✅ **ZERO** `TypeError: Cannot read properties of undefined (reading 'mockResolvedValue')` errors
- ✅ **ZERO** `ValidationError` due to invalid test data formats
- ✅ **ZERO** incorrect parameter order errors
- ✅ **ZERO** data format mismatches (snake_case vs camelCase)
- ✅ **ZERO** incorrect mock targets (mocking wrong methods)
- ✅ All tests pass on **first execution**
- ✅ No refactoring needed after initial test run

### Why This Process Works

1. **Evidence-Based Testing**: Tests based on actual implementation, not assumptions
2. **Single Source of Truth**: Source code is the authority
3. **Prevents Waste**: No trial-and-error cycles
4. **Industry Standard**: Follows TDD/BDD best practices
5. **AI-Friendly**: Systematic process that AI can follow reliably
6. **Human-Verifiable**: Clear audit trail of verification steps

### Example: Complete Verification Flow

```powershell
# Step 1: Read source
Get-Content backend/src/products/paylinq/services/PayrollRunTypeService.js

# Step 2: Extract methods
Select-String "async \w+\(" backend/src/products/paylinq/services/PayrollRunTypeService.js

# Output shows:
# async create(data, organizationId, userId)
# async getByCode(typeCode, organizationId)
# async getById(id, organizationId)
# async list(organizationId, filters)
# async update(id, data, organizationId, userId)
# async resolveAllowedComponents(typeCode, organizationId)

# Step 3: Check export (end of file shows)
# export default PayrollRunTypeService;  ✅ Class export

# Step 4: Check DTOs
Select-String "from '../dto" backend/src/products/paylinq/services/PayrollRunTypeService.js
# Found: import { mapRunTypeDbToApi, ... } from '../dto/payrollRunTypeDto.js'

# Step 5: Document findings (shown above in verification)

# Step 6: Write tests with verified information
# (See complete test example in previous section)
```

This systematic approach ensures **accurate, maintainable tests that pass on the first run**.

### Key Lessons from Real-World Testing

**From implementing taxCalculationService tests (November 2025):**

1. **UUID Validation is Non-Negotiable** - The biggest issue was using invalid UUID formats with prefixes like `'ded-123'` or `'emp-123'` instead of proper UUID v4 format. This violated Joi schema validation.

2. **Validation Schemas Are Documentation** - Joi schemas tell you EXACTLY what test data must look like. Read them BEFORE writing test helpers.

3. **Test Constants Must Match Production Format** - Descriptive names are good (`testEmployeeId`), but the values must be valid production formats (proper UUIDs, not `'emp-123'`).

4. **Bulk Operations Need Special Attention** - Each object in array must pass validation. Test both success and partial failure scenarios.

5. **Error Messages Guide Debugging** - Clear validation errors like `"deductionId" must be a valid GUID` immediately pinpoint the issue.

**This reinforces Step 5: Always examine validation schemas before creating test data helpers.**

---

## Testing Philosophy

### Testing Pyramid

```
        /\
       /  \
      / E2E \          ← Few, slow, expensive (Critical user journeys)
     /______\
    /        \
   /Integration\       ← Some, medium speed (API endpoints, component integration)
  /____________\
 /              \
/   Unit Tests   \    ← Many, fast, cheap (Services, utilities, components)
/__________________\
```

**Target Distribution:**
- **Unit Tests:** 70% of tests
- **Integration Tests:** 20% of tests
- **E2E Tests:** 10% of tests

---

## Test Coverage Requirements

### Minimum Coverage (MANDATORY)

| Type | Minimum Coverage | Target Coverage |
|------|-----------------|-----------------|
| Overall | 80% | 90% |
| Services | 90% | 95% |
| Repositories | 85% | 90% |
| Controllers | 75% | 85% |
| Utilities | 90% | 95% |
| UI Components | 70% | 80% |

### What to Test

**✅ MUST Test:**
- All business logic (services)
- All data access (repositories)
- All API endpoints (integration)
- All utility functions
- Critical user journeys (E2E)
- Error handling paths
- Validation logic

**❌ DO NOT Test:**
- Third-party libraries
- Generated code
- Configuration files
- Simple getters/setters
- Database migrations

---

## Test Classification: Unit vs Integration (CRITICAL)

### The Problem: Misclassified Tests

**COMMON MISTAKE:** Writing unit tests with excessive mocking for methods that should be integration tests.

**Red Flags - This is NOT a Unit Test:**
```javascript
// ❌ WRONG: Unit test with 10+ mocks
describe('calculateEmployeeTaxes', () => {
  it('should calculate taxes', async () => {
    // Mock database query
    const { query } = await import('database.js');
    query.mockResolvedValue({ rows: [...] });
    
    // Mock service dependencies
    mockAllowanceService.calculateTaxFreeAllowance.mockResolvedValue(9000);
    mockTaxRepository.findApplicableTaxRuleSets.mockResolvedValue([...]);
    mockTaxRepository.findTaxBrackets.mockResolvedValue([...]);
    mockTaxRepository.calculateBracketTax.mockResolvedValue(100);
    mockTaxRepository.getSurinameseAOVRate.mockResolvedValue({...});
    mockTaxRepository.getSurinameseAWWRate.mockResolvedValue({...});
    mockDeductionRepository.findActiveDeductionsForPayroll.mockResolvedValue([]);
    // ... 5 more mocks ...
    
    // What are we testing? The mocks or the code?
  });
});
```

**Problems with this approach:**
- ❌ Testing mock setup, not real behavior
- ❌ Fragile - breaks when dependencies change
- ❌ High maintenance burden
- ❌ Low confidence - are mocks realistic?
- ❌ Violates testing pyramid principles

### Decision Matrix: Unit Test or Integration Test?

| Factor | Unit Test | Integration Test |
|--------|-----------|------------------|
| **Dependencies** | 0-2 services/repos | 3+ services/repos |
| **Database queries** | None or 1 simple query | Multiple or complex queries |
| **Transactions** | No | Yes (BEGIN/COMMIT/ROLLBACK) |
| **External services** | None or 1 | Multiple |
| **Method purpose** | Pure calculation/validation | Orchestration/coordination |
| **Mocking complexity** | Simple (1-2 mocks) | Complex (5+ mocks) |
| **Execution time** | < 10ms | < 1000ms |

### Classification Examples

#### ✅ Unit Test Candidates (Pure Business Logic)

```javascript
// Pure calculation - NO dependencies
async calculateBracketTax(income, brackets) {
  let tax = 0;
  for (const bracket of brackets) {
    // Math logic only
  }
  return tax;
}

// Simple validation - 1 dependency
async validateTaxRule(data, organizationId) {
  const validated = await TaxRuleSchema.validateAsync(data);
  return validated;
}

// Data transformation - NO dependencies
function mapTaxRuleDbToApi(dbRule) {
  return {
    id: dbRule.id,
    ruleName: dbRule.rule_name, // snake_case → camelCase
  };
}
```

#### ❌ Integration Test Candidates (Orchestration)

```javascript
// Orchestrates 5+ dependencies
async calculateEmployeeTaxes(employeeId, grossPay, payDate, period, orgId) {
  // 1. Database query for employee
  const employee = await query('SELECT * FROM employees WHERE id = $1');
  
  // 2. External service call
  const taxFreeAllowance = await allowanceService.calculate(...);
  
  // 3. Repository call
  const taxRules = await taxRepository.findApplicable(...);
  
  // 4. Another repository call
  const brackets = await taxRepository.findBrackets(...);
  
  // 5. Calculation using another method
  const federalTax = await this.calculateBracketTax(...);
  
  // 6. Another repository
  const deductions = await deductionRepository.findActive(...);
  
  // This method ORCHESTRATES - it's an integration test!
}
```

### The Migration Rule (MANDATORY)

**RULE:** When you encounter a "unit test" that violates the decision matrix:

1. ✅ **Immediately stop writing unit tests**
2. ✅ **Move test to `tests/integration/` folder**
3. ✅ **Rewrite using real database**
4. ✅ **Document in original file why it was moved**

### Migration Template

**Step 1: Mark original unit test as moved**

```javascript
// tests/unit/services/TaxCalculationService.test.js

/**
 * calculateEmployeeTaxes - MOVED TO INTEGRATION TESTS
 * 
 * This method orchestrates multiple services and repositories:
 * - _getEmployeeResidenceStatus (database query)
 * - allowanceService.calculateTaxFreeAllowance (external service)
 * - taxEngineRepository.findApplicableTaxRuleSets (repository)
 * - taxEngineRepository.findTaxBrackets (repository)
 * - deductionRepository.findActiveDeductionsForPayroll (repository)
 * 
 * Reason for migration: 5+ dependencies make unit testing impractical.
 * Unit tests with excessive mocking test mock setup, not real behavior.
 * 
 * Integration tests provide higher confidence and are more maintainable.
 * 
 * Location: tests/integration/paylinq/tax-calculation.test.js
 * 
 * See TESTING_STANDARDS.md - "Test Classification" section.
 */
describe.skip('calculateEmployeeTaxes - MOVED TO INTEGRATION', () => {
  // Original tests removed
});
```

**Step 2: Create integration test**

```javascript
// tests/integration/paylinq/tax-calculation.test.js

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import pool from '../../../src/config/database.js';
import { TaxCalculationService } from '../../../src/products/paylinq/services/taxCalculationService.js';

describe('Tax Calculation - Integration Tests', () => {
  let testOrgId, testEmployeeId;

  beforeAll(async () => {
    // Setup real test data in database
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name)
      VALUES (gen_random_uuid(), 'Test Org')
      RETURNING id
    `);
    testOrgId = orgResult.rows[0].id;

    // Setup employee, tax rules, brackets, etc.
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    await pool.end();
  });

  describe('calculateEmployeeTaxes - Full Workflow', () => {
    it('should calculate taxes with real database', async () => {
      // Real service with real database
      const service = new TaxCalculationService();
      
      const result = await service.calculateEmployeeTaxes(
        testEmployeeId,
        15000,
        new Date('2025-01-15'),
        'monthly',
        testOrgId
      );

      // Assert real behavior
      expect(result.grossPay).toBe(15000);
      expect(result.totalTaxes).toBeGreaterThan(0);
      expect(result.taxableIncome).toBeLessThan(result.grossPay);
    });
  });
});
```

### Benefits of Proper Classification

| Metric | Wrong (Unit with Mocks) | Correct (Integration) |
|--------|------------------------|----------------------|
| **Setup complexity** | High (10+ mocks) | Medium (test data) |
| **Maintenance** | High (breaks often) | Low (stable) |
| **Confidence** | Low (testing mocks) | High (testing reality) |
| **Debugging** | Hard (which mock is wrong?) | Easy (real errors) |
| **Execution time** | ~50ms | ~200ms |
| **Value** | Low | High |

### Real-World Example: Tax Calculation Service

**Before (Wrong):**
- 4 unit tests skipped due to mock complexity
- Database query mocking was fragile
- Tests never ran successfully

**After (Correct):**
- 7 integration tests passing
- Real database interactions
- Tests complete workflows
- High confidence in code

### Classification Checklist

**Before writing ANY test, ask:**

- [ ] How many dependencies does this method have?
- [ ] Does it make database queries?
- [ ] Does it coordinate multiple services?
- [ ] Would I need 5+ mocks to test it?
- [ ] Is it an orchestration method?

**If you answered "many/yes" to 3+ questions → Integration Test**

### When to Skip Unit Tests Entirely

Some methods should **ONLY** have integration tests:

1. **Orchestration methods** - coordinate multiple services
2. **Transaction handlers** - BEGIN/COMMIT/ROLLBACK logic
3. **Complex workflows** - multi-step processes
4. **External API integrations** - third-party service calls

**Example:**
```javascript
// DON'T write unit test - write integration test only
async executePayrollRun(runId, orgId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Load run configuration
    // 2. Calculate for all employees
    // 3. Generate payslips
    // 4. Create payment records
    // 5. Update run status
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
```

### Summary: The Golden Rule

**"If you need more than 5 mocks, you're writing the wrong type of test."**

- ✅ Unit tests = Pure logic with 0-2 dependencies
- ✅ Integration tests = Orchestration with 3+ dependencies
- ✅ Move misclassified tests immediately
- ✅ Document why tests were moved
- ✅ Write integration tests with real database

---

## Test File Organization

### Location Standard (MANDATORY)

**ALL tests MUST be in dedicated `tests/` folders, NEVER co-located in `src/`.**

This is a critical architectural decision that affects:
- Code maintainability
- Deployment safety
- CI/CD configuration
- Refactoring ease

#### Backend Test Structure (MANDATORY)

```
backend/
├── src/                          ← Source code ONLY (no tests)
│   ├── services/
│   │   ├── JobService.js
│   │   └── InterviewService.js
│   ├── repositories/
│   │   └── JobRepository.js
│   ├── controllers/
│   │   └── jobController.js
│   ├── utils/
│   │   ├── logger.js
│   │   └── sanitization.js
│   └── products/
│       ├── paylinq/
│       │   ├── services/
│       │   └── repositories/
│       └── nexus/
│           ├── services/
│           └── repositories/
│
└── tests/                        ← ALL tests here
    ├── unit/                     ← Unit tests (70% of tests)
    │   ├── services/             ← Mirrors src/services/
    │   │   ├── JobService.test.js
    │   │   └── InterviewService.test.js
    │   ├── repositories/         ← Mirrors src/repositories/
    │   │   └── JobRepository.test.js
    │   ├── controllers/          ← Mirrors src/controllers/
    │   │   └── jobController.test.js
    │   ├── utils/                ← Mirrors src/utils/
    │   │   ├── logger.test.js
    │   │   └── sanitization.test.js
    │   └── formula/              ← Domain-specific tests
    │       ├── FormulaParser.test.js
    │       └── FormulaExecutor.test.js
    │
    ├── integration/              ← API/integration tests (20%)
    │   ├── auth.test.js
    │   ├── tenant-isolation.test.js
    │   ├── jobs-api.test.js
    │   └── session-management.test.js
    │
    ├── e2e/                      ← End-to-end tests (10%)
    │   ├── setup.js
    │   ├── teardown.js
    │   └── sso-integration.test.js
    │
    ├── security/                 ← Security-focused tests
    │   ├── auth-security.test.js
    │   ├── jwt-security.test.js
    │   └── penetration.test.js
    │
    ├── products/                 ← Product-specific tests
    │   ├── paylinq/              ← Mirrors src/products/paylinq/
    │   │   ├── services/
    │   │   │   ├── PayrollService.test.js
    │   │   │   └── AllowanceService.test.js
    │   │   ├── repositories/
    │   │   └── integration/
    │   │       └── payroll-api.test.js
    │   └── nexus/                ← Mirrors src/products/nexus/
    │       ├── services/
    │       │   ├── EmployeeService.test.js
    │       │   └── LocationService.test.js
    │       ├── repositories/
    │       └── integration/
    │
    ├── helpers/                  ← Test utilities & factories
    │   ├── auth.js               ← Auth test helpers
    │   ├── factories.js          ← Test data factories
    │   └── assertions.js         ← Custom assertions
    │
    ├── setup.js                  ← Global test setup
    └── teardown.js               ← Global test teardown
```

#### Frontend Test Structure

```
apps/nexus/                       ← Each app has its own tests
├── src/
│   ├── components/
│   │   └── LocationCard.tsx
│   ├── services/
│   │   └── LocationsService.ts
│   └── hooks/
│       └── useAuth.ts
│
├── tests/                        ← Separate tests folder
│   ├── components/               ← Component unit tests
│   │   └── LocationCard.test.tsx
│   ├── services/                 ← Service unit tests
│   │   └── LocationsService.test.tsx
│   ├── hooks/                    ← Hook unit tests
│   │   └── useAuth.test.tsx
│   ├── integration/              ← Integration tests
│   │   └── locations-flow.test.tsx
│   └── setup.ts                  ← Test configuration
│
├── e2e/                          ← Playwright E2E tests
│   └── locations.spec.ts
│
└── playwright.config.ts
```

#### Shared Packages Test Structure

```
packages/
├── api-client/
│   ├── src/
│   │   └── core/
│   │       └── client.ts
│   └── tests/                    ← Separate folder
│       └── core/
│           └── client.test.ts
│
└── utils/
    ├── src/
    │   └── dateUtils.ts
    └── tests/
        └── dateUtils.test.ts
```

### ❌ Anti-Patterns (DO NOT USE)

```
❌ WRONG: Co-located tests in src/
backend/src/services/__tests__/JobService.test.js
backend/src/utils/__tests__/logger.test.js
backend/src/services/jobs/__tests__/JobService.test.js

❌ WRONG: Mixed patterns (inconsistent)
backend/src/services/__tests__/JobService.test.js  ← Some in src/
backend/tests/services/InterviewService.test.js    ← Some in tests/

❌ WRONG: Tests without type folders
backend/tests/JobService.test.js  ← Should be tests/unit/services/
backend/tests/auth.test.js        ← Should be tests/integration/
```

### Rationale for Separation

| Benefit | Description |
|---------|-------------|
| **Clear Separation of Concerns** | Source code and test code serve different purposes |
| **Easier CI/CD Configuration** | Test folder can be excluded from production builds |
| **Prevents Accidental Deployment** | Tests never end up in production bundles |
| **Industry Standard** | Used by Google, Microsoft, Netflix, Airbnb |
| **Easier Refactoring** | Tests don't break when source files move |
| **Better IDE Performance** | Editors can exclude test folders from indexing |
| **Cleaner Coverage Reports** | Coverage tools work better with separated tests |

### Industry Examples

**Major frameworks that use separate test folders:**

- ✅ **Express.js** - `test/` folder
- ✅ **NestJS** - `test/` folder for E2E, unit tests near source (exception)
- ✅ **Next.js** - `__tests__/` folders (co-located but consistent)
- ✅ **React Testing Library** - Recommends co-location (smaller apps)
- ✅ **Angular** - `.spec.ts` files co-located
- ✅ **Vue.js** - `tests/` folder

**For enterprise monorepos (like RecruitIQ):**
- ✅ **Google** - Separate `test/` directories
- ✅ **Microsoft** - Separate test projects
- ✅ **Netflix** - Separate test folders

**RecruitIQ Standard: Separate `tests/` folder** (enterprise pattern)

### Migration from Co-Located Tests

If you have tests in `src/`, they must be moved:

```powershell
# Example migration (don't run manually - use migration script)
# backend/src/services/__tests__/JobService.test.js
# → backend/tests/unit/services/JobService.test.js
```

**After moving, update import paths (see Import Path Standards below).**

---

## Import Path Standards

### The Path Fragility Problem

**Problem:** Relative imports create tight coupling between test location and source location.

```javascript
// ❌ FRAGILE: Test in src/services/__tests__/JobService.test.js
import JobService from '../JobService.js';          // Works here
import logger from '../../utils/logger.js';         // Works here
import { query } from '../../config/database.js';   // Works here

// After moving to tests/unit/services/JobService.test.js
import JobService from '../JobService.js';          // ❌ BREAKS! Wrong path
import logger from '../../utils/logger.js';         // ❌ BREAKS! Wrong path
import { query } from '../../config/database.js';   // ❌ BREAKS! Wrong path
```

### Standard Import Patterns

#### Pattern 1: Consistent Relative Paths (Current Standard)

**When tests are in `tests/` folder, use consistent depth:**

```javascript
// ✅ CORRECT: Test in tests/unit/services/JobService.test.js
import JobService from '../../../src/services/JobService.js';
import logger from '../../../src/utils/logger.js';
import { query } from '../../../src/config/database.js';

// ✅ CORRECT: Test in tests/unit/utils/logger.test.js
import logger from '../../../src/utils/logger.js';
import { formatDate } from '../../../src/utils/dateUtils.js';

// ✅ CORRECT: Test in tests/integration/auth.test.js
import app from '../../src/app.js';
import pool from '../../src/config/database.js';
```

**Rules:**
1. Always count the depth from test file to `src/`
2. Unit tests: Usually `../../../src/`
3. Integration tests: Usually `../../src/`
4. Document common import depths in test helpers

#### Pattern 2: Path Mapping (Future Enhancement)

**For larger codebases, consider Node.js subpath imports:**

```javascript
// package.json
{
  "imports": {
    "#services/*": "./src/services/*.js",
    "#utils/*": "./src/utils/*.js",
    "#config/*": "./src/config/*.js"
  }
}

// Then in tests (location-independent):
import JobService from '#services/JobService';
import logger from '#utils/logger';
import { query } from '#config/database';
```

**Benefits:**
- ✅ Tests work regardless of location
- ✅ Easier refactoring
- ✅ Cleaner imports
- ✅ Industry standard (used by TypeScript, Next.js, etc.)

**Status:** Not yet implemented (requires package.json changes)

### Import Path Checklist

**When writing tests:**

- [ ] Count depth from test file to `src/` folder
- [ ] Use correct number of `../` levels
- [ ] Include `.js` extension (ES modules requirement)
- [ ] Test the import by running the test file
- [ ] Document unusual import paths in comments

**When moving tests:**

- [ ] Update ALL import paths (source code imports)
- [ ] Update ALL mock paths (jest.unstable_mockModule calls)
- [ ] Update relative path counts
- [ ] Run tests to verify imports work
- [ ] Check for any dynamic imports

### Common Import Mistakes

```javascript
// ❌ WRONG: Missing .js extension
import JobService from '../../../src/services/JobService';

// ❌ WRONG: Incorrect depth
import JobService from '../../services/JobService.js';  // Too few ../

// ❌ WRONG: Absolute path (not portable)
import JobService from '/home/user/project/src/services/JobService.js';

// ✅ CORRECT: Proper relative path with extension
import JobService from '../../../src/services/JobService.js';
```

---

## Unit Testing Standards

### ES Modules Requirements

**CRITICAL:** All test files MUST follow ES modules syntax:

```javascript
// ✅ CORRECT: Import with .js extension (REQUIRED for ES modules)
import JobService from '../../src/services/jobs/JobService.js';
import JobRepository from '../../src/repositories/JobRepository.js';
import { ValidationError } from '../../src/utils/errors.js';

// ❌ WRONG: Missing .js extension
import JobService from '../../src/services/jobs/JobService';

// ✅ CORRECT: Jest imports from @jest/globals (REQUIRED for ES modules)
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ❌ WRONG: Jest without import (causes "jest is not defined" error)
jest.mock('../../src/repositories/JobRepository.js'); // ← jest not imported!

// ❌ WRONG: CommonJS syntax
const JobService = require('../../src/services/jobs/JobService');
```

### Pre-Implementation Verification (CRITICAL)

**MANDATORY STEP:** Before writing any test for a service, repository, or controller, you MUST verify the actual method names and signatures in the source code.

**❌ NEVER:**
- Assume method names follow generic patterns (e.g., `create()`, `list()`, `getById()`)
- Write tests based on what you think the methods should be called
- Copy method names from similar services without verification

**✅ ALWAYS:**
1. **Read the complete source file** to understand the service's actual API
2. **Use grep/search** to extract ALL method names: `grep "async \w+\(" ServiceName.js`
3. **Document the verified method names** before writing any tests
4. **Match method signatures exactly** including parameter names and order

**Example - Correct Process:**

```bash
# Step 1: Search for all methods in the service
grep "async \w+\(" src/services/AllowanceService.js

# Output shows ACTUAL methods:
# - calculateTaxFreeAllowance(grossPay, payDate, payPeriod, organizationId)
# - getAvailableHolidayAllowance(employeeId, year, organizationId)
# - getAllAllowances(organizationId)  ← NOT list()!
```

```javascript
// Step 2: Use ONLY the verified method names in tests

// ✅ CORRECT: Uses actual method name from source
const result = await service.getAllAllowances(organizationId);

// ❌ WRONG: Assumes generic name without verification
const result = await service.list(organizationId);
```

**Why This Matters:**
- Prevents "method not found" errors that waste time and resources
- Ensures tests actually validate the implemented functionality
- Maintains accuracy between tests and implementation
- Critical for multi-tenant systems where method names may vary

**Acceptance Criteria:**
- ✅ **ZERO** `TypeError: service.methodName is not a function` errors
- ✅ All test method calls match source code exactly
- ✅ Method signatures (parameters, order) match implementation

### Export Pattern Verification & Refactoring (MANDATORY)

**CRITICAL:** When scanning a service/controller for method names, you MUST also verify the export pattern. If the service does not export the class, you MUST refactor it immediately before writing tests.

**✅ CORRECT Export Pattern (Industry Standard):**

```javascript
class MyService {
  constructor(repository = null) {
    this.repository = repository || new Repository();
  }
  
  async myMethod() { /* ... */ }
}

// ✅ Export the class - allows dependency injection and testing
export default MyService;
```

**❌ WRONG Export Patterns (Must Refactor):**

```javascript
// ❌ ANTI-PATTERN 1: Singleton instance only
class MyService {
  constructor() {
    this.repository = new Repository(); // Hard-coded
  }
}
export default new MyService(); // Singleton - NOT TESTABLE

// ❌ ANTI-PATTERN 2: Singleton as default (even with class export)
const myService = new MyService();
export default myService;        // Singleton as default
export { MyService };            // Class as named export - CONFUSING
```

**REFACTORING REQUIREMENT:**

When you encounter a service with singleton export pattern:

1. **STOP** - Do not write tests yet
2. **REFACTOR** the service immediately:
   - Remove singleton instance creation
   - Export only the class as default
   - Ensure constructor accepts optional dependencies for testing
3. **VERIFY** the refactoring works with existing code
4. **THEN** proceed with writing tests

**Example Refactoring:**

```javascript
// BEFORE (Anti-pattern) ❌
class WorkerTypeService {
  constructor() {
    this.repository = new WorkerTypeRepository(); // Hard-coded
  }
}
export default new WorkerTypeService(); // Singleton

// AFTER (Industry standard) ✅
class WorkerTypeService {
  constructor(repository = null) {
    this.repository = repository || new WorkerTypeRepository();
  }
}
export default WorkerTypeService; // Class export
```

**Why This Must Be Done Immediately:**

1. **Testability**: Singleton exports cannot be mocked - tests will fail or be meaningless
2. **Best Practices**: Industry standard is to export classes, not instances
3. **Maintainability**: Dependency injection makes code easier to refactor
4. **Multi-tenant Safety**: Singletons with state are dangerous in multi-tenant systems
5. **IoC Principles**: Follows Inversion of Control and SOLID principles

**Frameworks That Follow This Pattern:**
- NestJS (TypeScript)
- Spring Boot (Java)
- ASP.NET Core (C#)
- Laravel (PHP)
- Django (Python)

**Acceptance Criteria:**
- ✅ All services export the **class**, not singleton instances
- ✅ Constructor accepts optional dependencies for testing
- ✅ No `export default new ServiceName()` patterns exist
- ✅ Tests can inject mock dependencies successfully

### DTO (Data Transfer Object) Testing Requirements (MANDATORY)

**CRITICAL:** When testing services that use DTOs, you MUST account for data transformation between the repository layer (database format) and the service layer (API format).

**Three-Layer Architecture:**

```
Repository Layer → Returns snake_case (DB format)
     ↓
DTO Layer → Transforms DB ↔ API format
     ↓
Service Layer → Returns camelCase (API format)
```

**When to Use DTO Testing Pattern:**

Services MUST use DTOs when they:
- Return data directly to API/controllers
- Transform database field names (snake_case → camelCase)
- Have a corresponding `*Dto.js` file in `src/products/[product]/dto/`

**Example DTO Files in Codebase:**
- `payrollRunTypeDto.js` - transforms run type records
- `componentDto.js` - transforms component records
- `taxRuleDto.js` - transforms tax rule records
- `complianceDto.js` - transforms compliance records

**Verifying DTO Usage in Services:**

Before writing tests, check if the service imports and uses DTO mappers:

```javascript
// Search for DTO imports
grep "from '../dto" src/products/paylinq/services/ServiceName.js

// ✅ Service USES DTOs - must test with DTO pattern
import { mapRunTypeDbToApi, mapRunTypesDbToApi } from '../dto/payrollRunTypeDto.js';

// ❌ Service DOES NOT use DTOs - test without DTO pattern
// (no DTO imports found)
```

**DTO Testing Pattern (MANDATORY when DTOs are used):**

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayrollRunTypeService from '../../../../src/products/paylinq/services/PayrollRunTypeService.js';
import PayrollRunTypeRepository from '../../../../src/products/paylinq/repositories/PayrollRunTypeRepository.js';
import { mapRunTypeDbToApi, mapRunTypesDbToApi } from '../../../../src/products/paylinq/dto/payrollRunTypeDto.js';

describe('PayrollRunTypeService', () => {
  let service;
  let mockRepository;

  // Helper function to generate DB format data (snake_case)
  const createDbRunType = (overrides = {}) => ({
    id: 'type-123e4567-e89b-12d3-a456-426614174000',
    organization_id: 'org-123e4567-e89b-12d3-a456-426614174000',
    type_code: 'TEST_CODE',              // snake_case (DB format)
    type_name: 'Test Type',              // snake_case (DB format)
    component_override_mode: 'explicit', // snake_case (DB format)
    allowed_components: [],
    excluded_components: [],
    is_active: true,
    created_by: 'user-123',
    created_at: new Date(),
    // ... all DB fields in snake_case
    ...overrides
  });

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByCode: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn()
    };
    service = new PayrollRunTypeService(mockRepository);
  });

  describe('getByCode', () => {
    it('should return DTO-transformed payroll run type', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      
      // Arrange: Mock returns DB format (snake_case)
      const dbType = createDbRunType({
        type_code: 'REGULAR_PAY',
        type_name: 'Regular Payroll'
      });
      mockRepository.findByCode.mockResolvedValue(dbType);

      // Act: Service method is called
      const result = await service.getByCode('REGULAR_PAY', orgId);

      // Assert: Expect DTO-transformed result (camelCase)
      expect(result).toEqual(mapRunTypeDbToApi(dbType));
      expect(result.typeCode).toBe('REGULAR_PAY');    // camelCase (API format)
      expect(result.typeName).toBe('Regular Payroll'); // camelCase (API format)
      expect(result.type_code).toBeUndefined();        // DB field should not exist
    });
  });

  describe('list', () => {
    it('should return array of DTO-transformed types', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      
      // Arrange: Mock returns array of DB format records
      const dbTypes = [
        createDbRunType({ type_code: 'TYPE1', is_active: true }),
        createDbRunType({ type_code: 'TYPE2', is_active: true })
      ];
      mockRepository.findAll.mockResolvedValue(dbTypes);

      // Act
      const result = await service.list(orgId);

      // Assert: Expect array DTO transformation
      expect(result).toEqual(mapRunTypesDbToApi(dbTypes));
      expect(result[0].typeCode).toBe('TYPE1'); // camelCase
      expect(result[1].typeCode).toBe('TYPE2'); // camelCase
    });
  });
});
```

**Testing Services WITHOUT DTOs:**

Some services may return data directly without DTO transformation. Test these normally:

```javascript
describe('SimpleService', () => {
  it('should return data in same format as repository', async () => {
    const mockData = { id: '123', status: 'active' };
    mockRepository.findById.mockResolvedValue(mockData);

    const result = await service.getById('123');

    // No DTO transformation - direct comparison
    expect(result).toEqual(mockData);
  });
});
```

**Methods That May NOT Use DTOs:**

Some business logic methods return plain values, not DTO-transformed objects:

```javascript
// Example: resolveAllowedComponents returns string[]
async resolveAllowedComponents(typeCode, orgId) {
  const runType = await this.repository.findByCode(typeCode, orgId);
  // Business logic processes the data
  return components; // Returns ['COMP1', 'COMP2'] - no DTO
}

// Test pattern - expect plain array
it('should resolve components without DTO', async () => {
  const dbType = createDbRunType({
    component_override_mode: 'explicit',
    allowed_components: ['COMP1', 'COMP2']
  });
  mockRepository.findByCode.mockResolvedValue(dbType);

  const result = await service.resolveAllowedComponents('TEST', orgId);

  // Expect plain array, not DTO object
  expect(Array.isArray(result)).toBe(true);
  expect(result).toEqual(['COMP1', 'COMP2']);
});
```

**Refactoring Services to Use DTOs:**

If you discover a service has a DTO file but doesn't use it, you MUST refactor before writing tests:

1. ✅ **Verify DTO file exists**: `src/products/[product]/dto/[entity]Dto.js`
2. ✅ **Add DTO imports** to the service
3. ✅ **Transform all CRUD method returns** through DTO mappers
4. ✅ **Update controller** if needed (usually no changes required)
5. ✅ **Then write tests** with proper DTO expectations

**Common DTO Transformation Points:**

```javascript
// ✅ CRUD operations that MUST use DTOs:
async create(data, orgId, userId) {
  const dbData = mapEntityApiToDb(data);          // API → DB
  const created = await this.repository.create(dbData, orgId, userId);
  return mapEntityDbToApi(created);               // DB → API ✓
}

async getById(id, orgId) {
  const entity = await this.repository.findById(id, orgId);
  return mapEntityDbToApi(entity);                // DB → API ✓
}

async list(orgId, filters) {
  const entities = await this.repository.findAll(orgId, filters);
  return mapEntitiesDbToApi(entities);            // DB[] → API[] ✓
}

async update(id, data, orgId, userId) {
  const dbData = mapEntityApiToDb(data);          // API → DB
  const updated = await this.repository.update(id, dbData, orgId, userId);
  return mapEntityDbToApi(updated);               // DB → API ✓
}

// ❌ Business logic methods may NOT use DTOs:
async calculateTotal(id, orgId) {
  const entity = await this.repository.findById(id, orgId);
  return entity.amount * entity.quantity;         // Returns number - no DTO
}

async validateEntity(code, orgId) {
  const entity = await this.repository.findByCode(code, orgId);
  return { isValid: !!entity, errors: [] };       // Returns object - no DTO
}
```

**Acceptance Criteria:**
- ✅ All tests for services with DTOs use DB format mocks (snake_case)
- ✅ All test expectations use DTO-mapped results (camelCase)
- ✅ Helper functions like `createDb[Entity]()` generate DB format data
- ✅ Tests import DTO mapper functions and use them in assertions
- ✅ Services without DTOs are tested with direct format comparisons
- ✅ Business logic methods that return non-DTO values are tested appropriately
- ✅ ZERO field mismatch errors (e.g., `expected typeCode, got type_code`)

**Why This Matters:**
- **Industry Standard**: Follows Clean Architecture, DDD, and REST best practices
- **Separation of Concerns**: Repository = DB, Service = Business Logic, DTO = Transformation
- **API Consistency**: Ensures API always returns camelCase format
- **Test Accuracy**: Tests verify actual transformation logic, not just data pass-through
- **Multi-tenant Safety**: Proper DTO usage prevents DB schema leakage to API consumers

### Service Unit Test Template

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import JobService from '../../src/services/jobs/JobService.js';
import JobRepository from '../../src/repositories/JobRepository.js';
import { ValidationError, NotFoundError } from '../../src/utils/errors.js';

describe('JobService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    // Setup: Create fresh mocks for each test
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findWorkspaceById: jest.fn()
    };

    // Inject mock repository
    service = new JobService(mockRepository);
  });

  describe('create', () => {
    const organizationId = '123e4567-e89b-12d3-a456-426614174000';
    const userId = '223e4567-e89b-12d3-a456-426614174000';
    const workspaceId = '323e4567-e89b-12d3-a456-426614174000';

    it('should create a job with valid data', async () => {
      // Arrange
      const validData = {
        title: 'Senior Developer',
        description: 'Looking for a senior developer with 5+ years experience',
        workspaceId,
        department: 'Engineering',
        location: 'Remote',
        employmentType: 'full-time',
        salaryMin: 100000,
        salaryMax: 150000,
        skills: ['JavaScript', 'Node.js', 'React'],
        requirements: ['5+ years experience', 'Bachelor degree']
      };

      mockRepository.findWorkspaceById.mockResolvedValue({
        id: workspaceId,
        organizationId
      });

      mockRepository.create.mockResolvedValue({
        id: 'job-uuid',
        ...validData,
        organizationId,
        createdBy: userId,
        status: 'draft',
        isPublished: false
      });

      // Act
      const result = await service.create(validData, organizationId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('job-uuid');
      expect(result.title).toBe(validData.title);
      expect(result.organizationId).toBe(organizationId);
      expect(mockRepository.findWorkspaceById).toHaveBeenCalledWith(
        workspaceId,
        organizationId
      );
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: validData.title,
          organizationId,
          createdBy: userId,
          status: 'draft'
        })
      );
    });

    it('should throw ValidationError for missing required fields', async () => {
      // Arrange
      const invalidData = {
        title: 'Job' // Too short
      };

      // Act & Assert
      await expect(
        service.create(invalidData, organizationId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid employment type', async () => {
      // Arrange
      const invalidData = {
        title: 'Senior Developer',
        description: 'Description here',
        workspaceId,
        employmentType: 'invalid-type'
      };

      // Act & Assert
      await expect(
        service.create(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    it('should throw NotFoundError when workspace does not exist', async () => {
      // Arrange
      const validData = {
        title: 'Senior Developer',
        description: 'Description here',
        workspaceId: 'non-existent-workspace'
      };

      mockRepository.findWorkspaceById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.create(validData, organizationId, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should apply default values correctly', async () => {
      // Arrange
      const minimalData = {
        title: 'Senior Developer',
        description: 'Description here',
        workspaceId
      };

      mockRepository.findWorkspaceById.mockResolvedValue({
        id: workspaceId,
        organizationId
      });

      mockRepository.create.mockResolvedValue({
        id: 'job-uuid',
        ...minimalData,
        employmentType: 'full-time', // Default applied
        organizationId
      });

      // Act
      const result = await service.create(minimalData, organizationId, userId);

      // Assert
      expect(result.employmentType).toBe('full-time');
    });

    it('should strip unknown fields', async () => {
      // Arrange
      const dataWithUnknownFields = {
        title: 'Senior Developer',
        description: 'Description here',
        workspaceId,
        unknownField: 'should be stripped',
        anotherUnknown: 'also stripped'
      };

      mockRepository.findWorkspaceById.mockResolvedValue({
        id: workspaceId,
        organizationId
      });

      mockRepository.create.mockResolvedValue({
        id: 'job-uuid',
        title: dataWithUnknownFields.title,
        description: dataWithUnknownFields.description,
        workspaceId,
        organizationId
      });

      // Act
      await service.create(dataWithUnknownFields, organizationId, userId);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          unknownField: expect.anything(),
          anotherUnknown: expect.anything()
        })
      );
    });
  });

  describe('getById', () => {
    const jobId = '123e4567-e89b-12d3-a456-426614174000';
    const organizationId = '223e4567-e89b-12d3-a456-426614174000';

    it('should return job when found', async () => {
      // Arrange
      const mockJob = {
        id: jobId,
        title: 'Senior Developer',
        organizationId
      };

      mockRepository.findById.mockResolvedValue(mockJob);

      // Act
      const result = await service.getById(jobId, organizationId);

      // Assert
      expect(result).toEqual(mockJob);
      expect(mockRepository.findById).toHaveBeenCalledWith(jobId, organizationId);
    });

    it('should throw NotFoundError when job does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getById(jobId, organizationId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    const jobId = '123e4567-e89b-12d3-a456-426614174000';
    const organizationId = '223e4567-e89b-12d3-a456-426614174000';
    const userId = '323e4567-e89b-12d3-a456-426614174000';

    it('should update job with valid data', async () => {
      // Arrange
      const existingJob = {
        id: jobId,
        title: 'Old Title',
        salaryMin: 100000,
        organizationId
      };

      const updateData = {
        title: 'New Title',
        salaryMax: 150000
      };

      mockRepository.findById.mockResolvedValue(existingJob);
      mockRepository.update.mockResolvedValue({
        ...existingJob,
        ...updateData
      });

      // Act
      const result = await service.update(jobId, updateData, organizationId, userId);

      // Assert
      expect(result.title).toBe(updateData.title);
      expect(mockRepository.update).toHaveBeenCalledWith(
        jobId,
        expect.objectContaining({
          title: updateData.title,
          salaryMax: updateData.salaryMax,
          updatedBy: userId
        }),
        organizationId
      );
    });

    it('should throw ValidationError when salaryMax < salaryMin', async () => {
      // Arrange
      const existingJob = {
        id: jobId,
        salaryMin: 100000,
        organizationId
      };

      const updateData = {
        salaryMax: 50000 // Less than min
      };

      mockRepository.findById.mockResolvedValue(existingJob);

      // Act & Assert
      await expect(
        service.update(jobId, updateData, organizationId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should require at least one field to update', async () => {
      // Arrange
      const emptyUpdate = {};

      // Act & Assert
      await expect(
        service.update(jobId, emptyUpdate, organizationId, userId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('list', () => {
    const organizationId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return paginated jobs', async () => {
      // Arrange
      const mockJobs = [
        { id: '1', title: 'Job 1' },
        { id: '2', title: 'Job 2' }
      ];

      mockRepository.findAll.mockResolvedValue({
        jobs: mockJobs,
        total: 2
      });

      // Act
      const result = await service.list({}, organizationId);

      // Assert
      expect(result.jobs).toEqual(mockJobs);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
      });
    });

    it('should enforce maximum limit of 100', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue({ jobs: [], total: 0 });

      // Act
      await service.list({ limit: 999 }, organizationId);

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: 100 }),
        organizationId
      );
    });

    it('should handle filtering correctly', async () => {
      // Arrange
      const filters = {
        status: 'published',
        employmentType: 'full-time',
        search: 'developer'
      };

      mockRepository.findAll.mockResolvedValue({ jobs: [], total: 0 });

      // Act
      await service.list(filters, organizationId);

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          employmentType: 'full-time',
          search: 'developer'
        }),
        expect.anything(),
        organizationId
      );
    });
  });
});
```

### Unit Test Standards Checklist

**EVERY unit test suite MUST have:**

- [ ] **Describe blocks** for class/function organization
- [ ] **beforeEach** to setup fresh test state
- [ ] **Arrange-Act-Assert** pattern in tests
- [ ] **Clear test names** that describe expected behavior
- [ ] **Mock all dependencies** (no real database/API calls)
- [ ] **Test success cases** first
- [ ] **Test error cases** thoroughly
- [ ] **Test edge cases** (null, undefined, empty)
- [ ] **Test validation** rules
- [ ] **Assertions on mocks** to verify calls

---

## Integration Testing Standards

### Integration Test Template

```javascript
import request from 'supertest';
import app from '../../src/app.js';
import pool from '../../src/config/database.js'; // Import pool for cleanup
import { generateTestToken } from '../helpers/auth.js';

describe('Jobs API - Integration Tests', () => {
  let authToken;
  let organizationId;
  let userId;
  let workspaceId;

  beforeAll(async () => {
    // Setup: Create test organization and user with schema-qualified table names
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name)
      VALUES (uuid_generate_v4(), 'Test Org')
      RETURNING id
    `);
    organizationId = orgResult.rows[0].id;

    // Use schema-qualified names (e.g., hris.user_account)
    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id)
      VALUES (uuid_generate_v4(), 'test@example.com', '$2b$10$dummyhash', $1)
      RETURNING id
    `, [organizationId]);
    userId = userResult.rows[0].id;

    const workspaceResult = await pool.query(`
      INSERT INTO workspaces (id, name, organization_id, created_by)
      VALUES (uuid_generate_v4(), 'Test Workspace', $1, $2)
      RETURNING id
    `, [organizationId, userId]);
    workspaceId = workspaceResult.rows[0].id;

    // Generate auth token (cookie-based or Bearer based on your auth system)
    authToken = generateTestToken({ id: userId, organizationId, role: 'admin' });
  });

  afterAll(async () => {
    // Cleanup: Delete test data in correct order (respect foreign keys)
    await pool.query('DELETE FROM jobs WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM workspaces WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    
    // CRITICAL: Close database connection to prevent hanging tests
    await pool.end();
  });

  describe('POST /api/jobs', () => {
    it('should create a new job with valid data', async () => {
      // Arrange
      const jobData = {
        title: 'Senior Developer',
        description: 'Looking for a senior developer',
        workspaceId,
        department: 'Engineering',
        location: 'Remote',
        employmentType: 'full-time',
        salaryMin: 100000,
        salaryMax: 150000
      };

      // Act - Use cookie-based auth if applicable
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`) // Or set cookie
        .send(jobData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.job).toBeDefined();
      expect(response.body.job.title).toBe(jobData.title);
      expect(response.body.job.organizationId).toBe(organizationId);
      expect(response.body.job.createdBy).toBe(userId);
    });

    it('should return 400 for invalid data', async () => {
      // Arrange
      const invalidData = {
        title: 'AB' // Too short
      };

      // Act
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const jobData = {
        title: 'Senior Developer',
        description: 'Description',
        workspaceId
      };

      // Act - No auth token
      await request(app)
        .post('/api/jobs')
        .send(jobData)
        .expect(401);
    });

    it('should return 404 for non-existent workspace', async () => {
      // Arrange
      const jobData = {
        title: 'Senior Developer',
        description: 'Description',
        workspaceId: '00000000-0000-0000-0000-000000000000'
      };

      // Act
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(404);

      // Assert
      expect(response.body.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/jobs/:id', () => {
    let jobId;

    beforeEach(async () => {
      // Create a test job
      const result = await pool.query(`
        INSERT INTO jobs (
          id, title, description, workspace_id, organization_id, created_by
        )
        VALUES (uuid_generate_v4(), 'Test Job', 'Description', $1, $2, $3)
        RETURNING id
      `, [workspaceId, organizationId, userId]);
      jobId = result.rows[0].id;
    });

    it('should return job by ID', async () => {
      // Act
      const response = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.job).toBeDefined();
      expect(response.body.job.id).toBe(jobId);
      expect(response.body.job.title).toBe('Test Job');
    });

    it('should return 404 for non-existent job', async () => {
      // Act
      await request(app)
        .get('/api/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/jobs', () => {
    beforeEach(async () => {
      // Create multiple test jobs
      await pool.query(`
        INSERT INTO jobs (
          id, title, description, workspace_id, organization_id, 
          created_by, employment_type, status
        )
        VALUES 
          (uuid_generate_v4(), 'Job 1', 'Description 1', $1, $2, $3, 'full-time', 'published'),
          (uuid_generate_v4(), 'Job 2', 'Description 2', $1, $2, $3, 'part-time', 'draft'),
          (uuid_generate_v4(), 'Job 3', 'Description 3', $1, $2, $3, 'full-time', 'published')
      `, [workspaceId, organizationId, userId]);
    });

    it('should return paginated jobs', async () => {
      // Act
      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.jobs).toBeInstanceOf(Array);
      expect(response.body.jobs.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter by employment type', async () => {
      // Act
      const response = await request(app)
        .get('/api/jobs?employmentType=full-time')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.jobs.every(job => job.employmentType === 'full-time')).toBe(true);
    });

    it('should filter by status', async () => {
      // Act
      const response = await request(app)
        .get('/api/jobs?status=published')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.jobs.every(job => job.status === 'published')).toBe(true);
    });

    it('should support pagination', async () => {
      // Act
      const response = await request(app)
        .get('/api/jobs?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.jobs.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Tenant Isolation', () => {
    let org2Id, user2Id, workspace2Id, token2;

    beforeAll(async () => {
      // Create second organization
      const org2 = await pool.query(`
        INSERT INTO organizations (id, name)
        VALUES (uuid_generate_v4(), 'Test Org 2')
        RETURNING id
      `);
      org2Id = org2.rows[0].id;

      const user2 = await pool.query(`
        INSERT INTO users (id, email, name, organization_id, role)
        VALUES (uuid_generate_v4(), 'test2@example.com', 'Test User 2', $1, 'admin')
        RETURNING id
      `, [org2Id]);
      user2Id = user2.rows[0].id;

      const workspace2 = await pool.query(`
        INSERT INTO workspaces (id, name, organization_id, created_by)
        VALUES (uuid_generate_v4(), 'Test Workspace 2', $1, $2)
        RETURNING id
      `, [org2Id, user2Id]);
      workspace2Id = workspace2.rows[0].id;

      token2 = generateTestToken({ id: user2Id, organizationId: org2Id, role: 'admin' });
    });

    it('should not allow access to jobs from another organization', async () => {
      // Arrange: Create job in org1
      const result = await pool.query(`
        INSERT INTO jobs (id, title, description, workspace_id, organization_id, created_by)
        VALUES (uuid_generate_v4(), 'Org1 Job', 'Description', $1, $2, $3)
        RETURNING id
      `, [workspaceId, organizationId, userId]);
      const jobId = result.rows[0].id;

      // Act: Try to access with org2 user
      // Should return 403 Forbidden (not 404) - don't reveal resource existence
      await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);
    });

    afterAll(async () => {
      await pool.query('DELETE FROM workspaces WHERE organization_id = $1', [org2Id]);
      await pool.query('DELETE FROM users WHERE organization_id = $1', [org2Id]);
      await pool.query('DELETE FROM organizations WHERE id = $1', [org2Id]);
    });
  });
});
```

### Integration Test Standards Checklist

**EVERY integration test suite MUST:**

- [ ] **Use real database** (test database)
- [ ] **Import pool from database config** for cleanup
- [ ] **Setup test data** in beforeAll/beforeEach (with async/await)
- [ ] **Cleanup test data** in afterAll/afterEach (with async/await)
- [ ] **Close database connections** with `await pool.end()` in afterAll
- [ ] **Use schema-qualified table names** (e.g., `hris.user_account`)
- [ ] **Delete in correct order** (children before parents, respect FK constraints)
- [ ] **Test full request-response cycle**
- [ ] **Test authentication** requirements (Bearer or cookie-based)
- [ ] **Test authorization** rules
- [ ] **Test tenant isolation**
- [ ] **Test HTTP status codes**
- [ ] **Test response structure**
- [ ] **Test database state** changes

---

## Security Response Testing

### HTTP Status Codes for Security Scenarios (CRITICAL)

**IMPORTANT:** When testing organization/tenant isolation and authorization, use the **correct HTTP status codes** that match security best practices.

### Status Code Guidelines

```javascript
// 401 Unauthorized - No authentication credentials or invalid credentials
// Use when: User is not logged in or has invalid token

// 403 Forbidden - Valid credentials but insufficient permissions
// Use when: Authenticated user lacks permission for the resource

// 404 Not Found - Resource doesn't exist
// WARNING: Can reveal information about resource existence!
```

### Organization Isolation Pattern (MANDATORY)

**When testing cross-organization access attempts:**

```javascript
// ✅ CORRECT: Expect 403 Forbidden
describe('Organization Isolation', () => {
  it('should not access resources from other organizations', async () => {
    // Arrange: Create resource in org1
    const resource = await createResourceInOrg1();
    
    // Act: User from org2 tries to access org1's resource
    const response = await authenticatedUserOrg2
      .get(`/api/resources/${resource.id}`);
    
    // Assert: Should get 403 Forbidden (not 404)
    // Reason: Don't reveal resource existence to unauthorized users
    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('FORBIDDEN');
  });
});

// ❌ WRONG: Expecting 404 reveals information
describe('Organization Isolation', () => {
  it('should not access resources from other organizations', async () => {
    const resource = await createResourceInOrg1();
    
    const response = await authenticatedUserOrg2
      .get(`/api/resources/${resource.id}`);
    
    // ❌ WRONG: 404 confirms resource exists in system
    expect(response.status).toBe(404);
  });
});
```

### Security Rationale

**Why 403 (Forbidden) instead of 404 (Not Found)?**

1. **Information Disclosure Prevention**
   - 404 confirms the resource exists in the system
   - Attackers can enumerate resources across organizations
   - Violates principle of least privilege

2. **Proper HTTP Semantics**
   - User **is authenticated** (not 401)
   - User **lacks permission** (403 is correct)
   - Resource existence is not the issue

3. **Security Best Practice**
   - OWASP recommends minimizing information leakage
   - Don't reveal resource IDs from other organizations
   - Consistent denial response prevents enumeration

### Complete Status Code Matrix for Tests

| Scenario | User State | Resource State | Expected Status | Error Code |
|----------|-----------|----------------|-----------------|------------|
| No credentials | Not authenticated | Exists | **401** | UNAUTHORIZED |
| Invalid token | Not authenticated | Exists | **401** | UNAUTHORIZED |
| Valid token, wrong org | Authenticated | Exists in other org | **403** | FORBIDDEN |
| Valid token, own org | Authenticated | Not found in own org | **404** | NOT_FOUND |
| Valid token, no permission | Authenticated | Exists, lacks role | **403** | FORBIDDEN |
| Valid token, with permission | Authenticated | Exists | **200** | - |

### Test Examples

```javascript
describe('Security Response Tests', () => {
  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      await request(app)
        .get('/api/resources/123')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/resources/123')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Cross-Organization Access', () => {
    it('should return 403 for cross-org access (not 404)', async () => {
      // User2 from org2 tries to access org1's resource
      const response = await agent2
        .get(`/api/resources/${org1ResourceId}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('FORBIDDEN');
      // Should NOT reveal if resource exists
    });
  });

  describe('Role-Based Access', () => {
    it('should return 403 when user lacks required role', async () => {
      // Regular user tries to access admin endpoint
      await regularUserAgent
        .delete(`/api/admin/users/${userId}`)
        .expect(403);
    });
  });

  describe('Resource Not Found in Own Organization', () => {
    it('should return 404 when resource not found in own org', async () => {
      const fakeId = uuidv4();
      
      // User searches in their own organization
      await authenticatedAgent
        .get(`/api/resources/${fakeId}`)
        .expect(404);
    });
  });
});
```

### Anti-Patterns to Avoid

```javascript
// ❌ WRONG: Reveals resource existence across organizations
it('should not find resource from other org', async () => {
  const response = await agent2.get(`/api/resources/${org1ResourceId}`);
  expect(response.status).toBe(404); // ❌ Information leakage!
});

// ❌ WRONG: Generic error message
it('should deny access', async () => {
  const response = await agent2.get(`/api/resources/${org1ResourceId}`);
  expect(response.body.error).toBe('Error'); // ❌ Not specific!
});

// ✅ CORRECT: Proper security response
it('should return 403 for cross-org access', async () => {
  const response = await agent2.get(`/api/resources/${org1ResourceId}`);
  expect(response.status).toBe(403);
  expect(response.body.errorCode).toBe('FORBIDDEN');
  expect(response.body.error).toBe('Access denied');
});
```

### Testing Checklist for Security

**When writing organization isolation tests:**

- [ ] ✅ User from org2 accessing org1 resource → **Expect 403**
- [ ] ✅ User accessing non-existent resource in own org → **Expect 404**
- [ ] ✅ Unauthenticated request → **Expect 401**
- [ ] ✅ User with insufficient role → **Expect 403**
- [ ] ✅ Valid access → **Expect 200/201**
- [ ] ❌ Never use 404 for cross-org denial (information leakage)
- [ ] ✅ Include errorCode in assertions for clarity
- [ ] ✅ Verify error messages don't reveal sensitive info

---

## Database Connection Management

### CRITICAL: Always Close Database Connections

**PROBLEM:** Hanging tests, connection pool exhaustion, tests that never finish.

**SOLUTION:** Always close database connections in `afterAll`:

```javascript
import pool from '../../src/config/database.js';

describe('Integration Test Suite', () => {
  afterAll(async () => {
    // Clean up test data first
    await pool.query('DELETE FROM test_table WHERE organization_id = $1', [testOrgId]);
    
    // CRITICAL: Close the pool to allow tests to exit
    await pool.end();
  });
});
```

### Multi-Suite Test Files

If you have multiple describe blocks sharing a connection:

```javascript
import pool from '../../src/config/database.js';

describe('Jobs API Tests', () => {
  // Tests...
});

describe('Candidates API Tests', () => {
  // Tests...
});

// Close connection ONCE after all suites
afterAll(async () => {
  await pool.end();
});
```

---

## E2E Testing Standards

### E2E Test Philosophy

End-to-End (E2E) tests validate complete user journeys across the full application stack:
- Real browser interactions (or API requests)
- Full backend server running
- Real database (test database)
- Complete authentication flows
- Cross-application scenarios (SSO)

**When to write E2E tests:**
- Critical user journeys (login, checkout, data submission)
- Cross-application workflows (SSO across multiple apps)
- Integration points between frontend and backend
- Complex multi-step processes

**When NOT to write E2E tests:**
- Simple CRUD operations (use integration tests)
- Edge cases and error conditions (use unit tests)
- Internal service logic (use unit tests)

### Automated Server Lifecycle with Jest

**CRITICAL:** E2E tests should manage their own backend server lifecycle automatically using Jest's `globalSetup` and `globalTeardown`.

#### Jest E2E Configuration

```javascript
// jest.e2e.config.js
export default {
  displayName: 'E2E Tests',
  testEnvironment: 'node',
  
  // Set environment variables for test process
  setupFiles: ['<rootDir>/tests/e2e/jest-setup-env.js'],
  
  // Use ES modules
  transform: {},
  
  // Global setup/teardown for server lifecycle
  globalSetup: '<rootDir>/tests/e2e/setup.js',
  globalTeardown: '<rootDir>/tests/e2e/teardown.js',
  
  // Only run E2E tests
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.js'
  ],
  
  // Increase timeout for E2E tests (server startup + test execution)
  testTimeout: 60000,
  
  // Run tests serially (not in parallel) to avoid port conflicts
  maxWorkers: 1,
  
  // Don't collect coverage for E2E tests (too slow)
  collectCoverage: false,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true
};
```

#### Environment Setup File

```javascript
// tests/e2e/jest-setup-env.js
/**
 * Jest E2E Environment Setup
 * Sets environment variables for the Jest test process
 * This ensures test database is used when importing database config
 */

// Force test database for Jest test process
process.env.NODE_ENV = 'e2e';
process.env.DATABASE_NAME = 'recruitiq_test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/recruitiq_test';

console.log('📝 Jest E2E environment configured:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_NAME: process.env.DATABASE_NAME
});
```

#### Global Setup (Server Start)

```javascript
// tests/e2e/setup.js
import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

let serverProcess;

/**
 * Starts backend server before E2E tests
 * Server will use .env.test configuration automatically when NODE_ENV=e2e
 */
export default async function globalSetup() {
  console.log('🚀 Starting backend server for E2E tests...');

  return new Promise((resolve, reject) => {
    const serverPath = join(__dirname, '../../src/server.js');
    
    // Start server with e2e environment
    // Config will automatically load .env.test when NODE_ENV=e2e
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'e2e',
        PORT: '4000'
      },
      stdio: 'pipe'
    });

    let serverOutput = '';
    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      
      // Check if server is ready (look for actual startup message)
      if (output.includes('RecruitIQ API Server started')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Backend server ready on port 4000');
          
          // Store PID for cleanup
          global.__SERVER_PID__ = serverProcess.pid;
          
          // Give server a moment to fully initialize
          setTimeout(resolve, 1000);
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && !serverReady) {
        console.error('Server exited with code:', code);
        console.error('Server output:', serverOutput);
        reject(new Error(`Server failed to start. Exit code: ${code}`));
      }
    });

    // Timeout if server doesn't start within 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        serverProcess.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
  });
}
```

#### Global Teardown (Server Stop)

```javascript
// tests/e2e/teardown.js
/**
 * Stops backend server after E2E tests
 */
export default async function globalTeardown() {
  console.log('🛑 Stopping backend server...');
  
  const pid = global.__SERVER_PID__;
  
  if (pid) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log('✅ Backend server stopped');
    } catch (error) {
      console.error('Error stopping server:', error);
    }
  }
}
```

### Configuration Loading for E2E Tests

**CRITICAL:** Ensure your backend configuration loads `.env.test` when `NODE_ENV=e2e`:

```javascript
// src/config/index.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// Use .env.test for E2E tests to ensure test database isolation
const envFile = process.env.NODE_ENV === 'e2e' ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, '../../', envFile) });

// Rest of config...
```

### Test Database Setup

**CRITICAL:** E2E tests require a properly initialized test database with schema and seed data.

```bash
# Run database setup script with test database name
.\backend\src\database\setup-database.ps1 -DBName recruitiq_test
```

**`.env.test` Configuration:**

```env
# Test Database (using test database for E2E tests)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recruitiq_test
DATABASE_NAME=recruitiq_test
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Other test-specific settings...
NODE_ENV=e2e
PORT=4000
```

### E2E Test Template

```javascript
// tests/e2e/sso-integration.test.js
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import pool from '../../src/config/database.js';

const API_URL = 'http://localhost:4000';

describe('SSO Integration - E2E Tests', () => {
  let cookies = {};
  const testUsers = {
    tenant: {
      email: 'tenant@testcompany.com',
      password: 'Admin123!'
    }
  };

  // Setup test data before all tests
  beforeAll(async () => {
    console.log('🔧 Setting up E2E test data...');
    
    // Verify test users exist (created by database seed)
    const userCheck = await pool.query(
      'SELECT email FROM hris.user_account WHERE email = $1',
      [testUsers.tenant.email]
    );
    
    if (userCheck.rows.length === 0) {
      throw new Error(`Test user ${testUsers.tenant.email} not found. Run database setup.`);
    }
    
    console.log('✅ Test data verified');
  });

  // Clean up after all tests
  afterAll(async () => {
    console.log('🧹 Cleaning up E2E test data...');
    // Note: Don't close pool here - let Jest handle it
  });

  describe('Cross-App Authentication', () => {
    it('should login successfully and set cookies', async () => {
      // Act
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send(testUsers.tenant)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
      
      // Store cookies for subsequent tests
      cookies.auth = response.headers['set-cookie'];
    });

    it('should access protected route with session cookie', async () => {
      // Act
      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Cookie', cookies.auth)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUsers.tenant.email);
    });

    it('should maintain session across multiple requests', async () => {
      // First request
      const response1 = await request(API_URL)
        .get('/api/auth/me')
        .set('Cookie', cookies.auth)
        .expect(200);

      // Second request with same cookie
      const response2 = await request(API_URL)
        .get('/api/auth/me')
        .set('Cookie', cookies.auth)
        .expect(200);

      // Assert both requests succeed with same user
      expect(response1.body.user.id).toBe(response2.body.user.id);
    });

    it('should logout and clear cookies', async () => {
      // Act
      const response = await request(API_URL)
        .post('/api/auth/logout')
        .set('Cookie', cookies.auth)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      
      // Verify cookies are cleared (maxAge=0 or expired)
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader.some(c => 
        c.includes('Max-Age=0') || c.includes('Expires=Thu, 01 Jan 1970')
      )).toBe(true);
    });

    it('should reject requests after logout', async () => {
      // Act
      await request(API_URL)
        .get('/api/auth/me')
        .set('Cookie', cookies.auth)
        .expect(401);
    });
  });
});
```

### E2E Test Best Practices

```javascript
// ✅ CORRECT: Test complete user journeys
describe('Job Application Flow - E2E', () => {
  it('should complete entire application process', async () => {
    // 1. Login
    const loginRes = await request(API_URL).post('/api/auth/login').send(...);
    const cookies = loginRes.headers['set-cookie'];
    
    // 2. Browse jobs
    const jobsRes = await request(API_URL).get('/api/jobs').set('Cookie', cookies);
    const jobId = jobsRes.body.jobs[0].id;
    
    // 3. View job details
    await request(API_URL).get(`/api/jobs/${jobId}`).set('Cookie', cookies);
    
    // 4. Submit application
    const appRes = await request(API_URL)
      .post(`/api/jobs/${jobId}/apply`)
      .set('Cookie', cookies)
      .send({ resume: '...', coverLetter: '...' });
    
    // 5. Verify application created
    expect(appRes.body.application).toBeDefined();
    
    // 6. Verify in database
    const dbCheck = await pool.query('SELECT * FROM applications WHERE id = $1', [appRes.body.application.id]);
    expect(dbCheck.rows.length).toBe(1);
  });
});

// ❌ WRONG: Testing implementation details
it('should call the correct repository method', async () => {
  // This is a unit test, not E2E
});

// ❌ WRONG: No connection to real backend
it('should handle login with mocked API', async () => {
  // E2E tests must use real backend
});
```

### Playwright Browser E2E Tests

**For frontend E2E tests with Playwright, follow these best practices:**

#### Use Relative Paths (MANDATORY)

**CRITICAL:** Always use relative paths instead of hardcoded URLs to leverage Playwright's `baseURL` configuration.

```javascript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: 'http://localhost:5175',  // Configured once
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5175',      // Same as baseURL
    reuseExistingServer: !process.env.CI,
  },
});

// ❌ WRONG: Hardcoded URLs (not portable, harder to maintain)
test('should login', async ({ page }) => {
  await page.goto('http://localhost:5175/login');
  await page.waitForURL('http://localhost:5175/', { timeout: 10000 });
  expect(page.url()).toBe('http://localhost:5175/');
});

// ✅ CORRECT: Relative paths (uses baseURL from config)
test('should login', async ({ page }) => {
  await page.goto('/login');                    // Relative path
  await page.waitForURL('/', { timeout: 10000 }); // Relative path
  expect(page.url()).toMatch(/\/$/);            // Pattern matching
});

// ✅ CORRECT: Using constants for reusability
const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  EMPLOYEES: '/employees'
};

test('should navigate to employees', async ({ page }) => {
  await page.goto(ROUTES.LOGIN);
  // Login flow...
  await page.goto(ROUTES.EMPLOYEES);
});
```

**Why Relative Paths?**
- **Portability:** Works across dev, staging, production
- **Maintainability:** Change `baseURL` once, not in every test
- **Consistency:** Matches Playwright best practices
- **Flexibility:** Easy to test different environments

### E2E Test Standards Checklist

**EVERY E2E test suite MUST:**

- [ ] **Use automated server lifecycle** (globalSetup/globalTeardown)
- [ ] **Use test database** (recruitiq_test with proper schema)
- [ ] **Run against real backend server**
- [ ] **Test complete user journeys** (not isolated operations)
- [ ] **Use actual HTTP requests** (supertest or real browser)
- [ ] **Use relative paths** in Playwright tests (never hardcode URLs)
- [ ] **Verify database state** when necessary
- [ ] **Clean up test data** (if creating data beyond seeds)
- [ ] **Run serially** (maxWorkers: 1 to avoid port conflicts)
- [ ] **Have reasonable timeouts** (60s for server startup + tests)
- [ ] **Be idempotent** (can run multiple times)
- [ ] **Use seed data** (don't rely on manual data creation)

### Running E2E Tests

```bash
# Single command - server starts automatically
npm run test:e2e

# The script handles:
# 1. Starting backend server (NODE_ENV=e2e, port 4000)
# 2. Running all E2E tests
# 3. Stopping backend server
# 4. Exit with appropriate code
```

### Common E2E Test Patterns

#### Testing SSO Across Apps

```javascript
describe('SSO Cross-App Navigation', () => {
  let sessionCookie;

  it('should login in PayLinQ', async () => {
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({ product: 'paylinq', ...credentials });
    
    sessionCookie = response.headers['set-cookie'];
    expect(response.body.user.currentProduct).toBe('paylinq');
  });

  it('should access Nexus without re-login', async () => {
    const response = await request(API_URL)
      .post('/api/auth/switch-product')
      .set('Cookie', sessionCookie)
      .send({ product: 'nexus' })
      .expect(200);
    
    expect(response.body.user.currentProduct).toBe('nexus');
  });

  it('should access RecruitIQ with same session', async () => {
    const response = await request(API_URL)
      .post('/api/auth/switch-product')
      .set('Cookie', sessionCookie)
      .send({ product: 'recruitiq' })
      .expect(200);
    
    expect(response.body.user.currentProduct).toBe('recruitiq');
  });
});
```

#### Testing CSRF Protection

```javascript
describe('CSRF Protection - E2E', () => {
  let cookies, csrfToken;

  beforeAll(async () => {
    // Login to get session
    const loginRes = await request(API_URL)
      .post('/api/auth/login')
      .send(credentials);
    
    cookies = loginRes.headers['set-cookie'];
    
    // Get CSRF token
    const csrfRes = await request(API_URL)
      .get('/api/csrf-token')
      .set('Cookie', cookies);
    
    csrfToken = csrfRes.body.csrfToken;
  });

  it('should reject POST without CSRF token', async () => {
    await request(API_URL)
      .post('/api/jobs')
      .set('Cookie', cookies)
      .send({ title: 'Test Job' })
      .expect(403);
  });

  it('should accept POST with valid CSRF token', async () => {
    await request(API_URL)
      .post('/api/jobs')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Test Job' })
      .expect(201);
  });
});
```

---

## Test File Naming Conventions

### Integration Tests

```javascript
// ✅ CORRECT: Kebab-case for integration tests
tests/integration/tenant-isolation.test.js
tests/integration/license-restrictions.test.js
tests/integration/user-api.test.js

// ❌ WRONG: CamelCase
tests/integration/tenantIsolation.test.js
```

### Unit Tests

```javascript
// ✅ CORRECT: Match source file structure
tests/unit/services/JobService.test.js
tests/unit/repositories/JobRepository.test.js

// ❌ WRONG: Different naming
tests/unit/services/job-service.test.js
```

---

## Authentication in Tests

### Cookie-Based Authentication (MANDATORY)

**Migration Status:** ✅ **COMPLETE** - Bearer tokens are fully deprecated. All applications now use cookie-based authentication.

**⚠️ DEPRECATED: Bearer Token Authentication** - No longer supported. Any remaining tests using Bearer tokens must be updated immediately to use cookies.

```javascript
import request from 'supertest';
import app from '../../src/app.js';

describe('API with Cookie Auth', () => {
  let authCookie;

  beforeAll(async () => {
    // Login to get session cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    // Extract Set-Cookie header
    authCookie = loginResponse.headers['set-cookie'];
  });

  it('should access protected route with cookie', async () => {
    const response = await request(app)
      .get('/api/protected-resource')
      .set('Cookie', authCookie) // Pass cookie
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### ❌ DEPRECATED: Bearer Token Authentication (LEGACY ONLY)

**Status:** ❌ **FULLY DEPRECATED** - Do not use in new code. Update legacy tests to use cookies.

**Note:** Some backend integration test files may still contain Bearer token references (e.g., `tenant-isolation.test.js`, `license-restrictions.test.js`). These are legacy patterns from before the cookie-based auth migration. New tests must use the cookie-based pattern above. Legacy tests will be updated during the next test refactoring phase.

**Migration Required:** Any tests still using Bearer tokens should be updated to the cookie-based pattern above.

```javascript
import jwt from 'jsonwebtoken';
import config from '../../src/config/index.js';

describe('API with Bearer Token', () => {
  let authToken;

  beforeAll(async () => {
    // Generate JWT token
    authToken = jwt.sign(
      { 
        id: userId, 
        email: userEmail,
        organizationId: orgId,
        role: 'admin'
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  });

  it('should access protected route with Bearer token', async () => {
    const response = await request(app)
      .get('/api/protected-resource')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
```

### Test Helper for Authentication

Create a reusable helper:

```javascript
// tests/helpers/auth.js
import jwt from 'jsonwebtoken';
import config from '../../src/config/index.js';

/**
 * Generate test JWT token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
export function generateTestToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
}

/**
 * Login and get auth cookie
 * @param {Object} app - Express app
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<string>} Cookie string
 */
export async function loginWithCookie(app, email, password) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  
  return response.headers['set-cookie'];
}
```

---

## Dependency Injection for Testability

### Requirement

**ALL services MUST support dependency injection to enable clean testing without complex mocking.**

### Service Constructor Pattern

```javascript
// ✅ CORRECT: Service accepts dependencies via constructor
class JobService {
  /**
   * @param {JobRepository} repository - Optional repository instance for testing
   */
  constructor(repository = null) {
    this.repository = repository || new JobRepository();
  }

  async create(data, organizationId, userId) {
    // Use this.repository - works with real or mock
    return await this.repository.create(data);
  }
}

// Production usage (no parameter)
const jobService = new JobService();

// Test usage (inject mock)
const mockRepository = { create: jest.fn() };
const jobService = new JobService(mockRepository);
```

### Service Architecture: Classes vs Functions

**RULE: All services MUST be class-based for consistency and testability.**

```javascript
// ✅ CORRECT: Class-based service (stateful, DI-friendly)
class PayrollService {
  constructor(repository = null) {
    this.repository = repository || new PayrollRepository();
  }

  async calculatePayroll(data) {
    return await this.repository.save(data);
  }
}

export default PayrollService;

// Usage in controller
import PayrollService from '../services/PayrollService.js';
const payrollService = new PayrollService();
await payrollService.calculatePayroll(data);

// ❌ WRONG: Functional service (harder to inject dependencies)
async function calculatePayroll(data) {
  return await payrollRepository.save(data); // Can't inject mock
}

export default { calculatePayroll };
```

**Why Classes?**
- ✅ Supports dependency injection
- ✅ Can hold state/config when needed
- ✅ Consistent pattern across codebase
- ✅ Industry standard (OOP principles)
- ✅ Easy to extend/inherit

### Multiple Dependencies

```javascript
class PayrollService {
  /**
   * @param {PayrollRepository} payrollRepo - Optional for testing
   * @param {TaxService} taxService - Optional for testing
   * @param {EmailService} emailService - Optional for testing
   */
  constructor(payrollRepo = null, taxService = null, emailService = null) {
    this.payrollRepo = payrollRepo || new PayrollRepository();
    this.taxService = taxService || new TaxService();
    this.emailService = emailService || new EmailService();
  }
}
```

### Why Dependency Injection?

✅ **Clean Testing** - No jest.mock() gymnastics  
✅ **Industry Standard** - Used by Spring, NestJS, Angular, etc.  
✅ **Flexibility** - Easy to swap implementations  
✅ **Explicit Dependencies** - Clear what service needs  
✅ **SOLID Principles** - Follows Dependency Inversion  
✅ **ES Modules Compatible** - No mocking issues  

### Anti-Patterns to Avoid

```javascript
// ❌ BAD: Hard-coded dependency (not testable)
class JobService {
  constructor() {
    this.repository = new JobRepository(); // Hard-coded!
  }
}
// Must use complex jest.mock() to test

// ❌ BAD: Importing and using directly
import jobRepository from './repositories/jobRepository.js';

async function createJob(data) {
  return await jobRepository.create(data); // Can't inject mock
}

// ❌ BAD: Service instantiates other services internally
class PayrollService {
  constructor() {
    this.taxService = new TaxService(); // Hard-coded!
    this.emailService = new EmailService(); // Hard-coded!
  }
}
```

---

## Mocking Standards

### With Dependency Injection (PREFERRED)

When services use dependency injection, mocking is simple and clean:

```javascript
describe('JobService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    // Create mock repository object
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn()
    };

    // Inject mock into service - no jest.mock() needed!
    service = new JobService(mockRepository);
  });

  it('should create a job', async () => {
    // Setup mock behavior
    mockRepository.create.mockResolvedValue({ id: '123', title: 'Job' });

    // Test service
    const result = await service.create({ title: 'Job' }, 'org-id', 'user-id');

    // Verify
    expect(result.id).toBe('123');
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Job' })
    );
  });
});
```

### Legacy Jest Mocking (AVOID IF POSSIBLE)

Only use `jest.mock()` when you cannot modify the service to use DI:

```javascript
// Only if service doesn't support DI
jest.mock('../../src/repositories/JobRepository.js');

import JobRepository from '../../src/repositories/JobRepository.js';

beforeEach(() => {
  // ✅ CORRECT: Mock implementation for constructor
  JobRepository.mockImplementation(() => ({
    create: jest.fn(),
    findById: jest.fn()
  }));
});
```

### Common Jest Mock Patterns (ES Modules)

```javascript
// ✅ CORRECT: Mocking a module method
jest.spyOn(userAccountRepository, 'findByEmail').mockResolvedValue(null);

// ✅ CORRECT: Mocking bcrypt
jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_password');

// ❌ WRONG: Using "mockName" as second argument
jest.spyOn(userAccountRepository.findByEmail, "mockName").mockResolvedValue(null);

// ✅ CORRECT: Mock entire module
jest.mock('../../src/config/database.js');
jest.mock('bcryptjs');

// ✅ CORRECT: Restore mocks in afterEach
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
```

### Mock Patterns

```javascript
// Mock repository
const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn()
};

// Mock with return value
mockRepository.findById.mockResolvedValue({ id: '123', title: 'Job' });

// Mock with error
mockRepository.create.mockRejectedValue(new Error('Database error'));

// Mock with implementation
mockRepository.findAll.mockImplementation((filters, pagination, orgId) => {
  return Promise.resolve({
    jobs: [],
    total: 0
  });
});

// Verify mock was called
expect(mockRepository.create).toHaveBeenCalledWith(
  expect.objectContaining({
    title: 'Expected Title'
  })
);

// Verify mock was called with exact arguments
expect(mockRepository.findById).toHaveBeenCalledWith('123', 'org-id');

// Verify mock was called specific number of times
expect(mockRepository.create).toHaveBeenCalledTimes(1);

// Reset mock
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Error Handling in Tests: Catch Block Naming Standard (MANDATORY)

**CRITICAL:** All tests MUST use consistent naming for error parameters in catch blocks.

#### The Standard

**ALWAYS use `error` as the catch block parameter name. NEVER use `_error`, `err`, `e`, or other variations.**

```javascript
// ✅ CORRECT: Use "error" consistently
try {
  await service.doSomething();
} catch (error) {
  // Handle or verify error
  expect(error.message).toBe('Expected error');
}

// ❌ WRONG: Don't use underscore prefix
try {
  await service.doSomething();
} catch (_error) {  // ❌ Inconsistent!
  expect(_error.message).toBe('Expected error');
}

// ❌ WRONG: Don't use abbreviations
try {
  await service.doSomething();
} catch (err) {  // ❌ Inconsistent!
  expect(err.message).toBe('Expected error');
}

// ❌ WRONG: Don't use single letter
try {
  await service.doSomething();
} catch (e) {  // ❌ Inconsistent!
  expect(e.message).toBe('Expected error');
}
```

#### Common Patterns

**Pattern 1: Testing error logging**
```javascript
it('should log errors with proper context', async () => {
  // Arrange
  const dbError = new Error('Database connection failed');
  mockQuery.mockRejectedValue(dbError);

  // Act
  try {
    await repository.findById(mockId);
  } catch (error) {
    // ✅ Expected to throw - catch to verify logging
  }

  // Assert
  expect(mockLogger.error).toHaveBeenCalledWith(
    'Error finding product by ID',
    expect.objectContaining({
      id: mockId,
      error: 'Database connection failed'
    })
  );
});
```

**Pattern 2: Testing error cleanup (transactions)**
```javascript
it('should rollback transaction on error', async () => {
  // Arrange
  mockClient.query.mockImplementation((sql) => {
    if (sql === 'BEGIN') return Promise.resolve();
    if (sql.includes('UPDATE')) throw new Error('Database error');
  });

  // Act & Assert
  await expect(
    service.terminateEmployee('emp-id', 'org-id', 'user-id')
  ).rejects.toThrow();

  // Verify rollback was called
  expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  expect(mockClient.release).toHaveBeenCalled();
});
```

**Pattern 3: Intentional catch-and-suppress**
```javascript
it('should handle server cleanup errors gracefully', async () => {
  // Arrange
  mockProcess.kill.mockImplementation(() => {
    throw new Error('Process already stopped');
  });

  // Act
  try {
    await stopServer();
  } catch (error) {
    // ✅ Expected - server cleanup should not fail tests
  }

  // Assert
  expect(mockLogger.warn).toHaveBeenCalledWith(
    'Error stopping server',
    expect.objectContaining({ error: 'Process already stopped' })
  );
});
```

#### Why This Standard Matters

1. **Consistency:** All developers and AI assistants use the same convention
2. **Readability:** `error` is more descriptive than `e`, `err`, or `_error`
3. **Searchability:** Easy to find all error handling with `grep "catch (error)"`
4. **Linting:** Most linters expect `error` as the standard parameter name
5. **Industry Standard:** Used by Node.js, Express, Jest documentation, and most major projects
6. **No Underscore Prefix:** The `_error` pattern suggests "unused" which is misleading in error handling

#### When Error Variable is Intentionally Unused

If you're catching an error but not using it (rare in tests), use a comment:

```javascript
try {
  await service.doSomething();
} catch (error) {  // ✅ Still use "error" even if unused
  // Intentionally suppressing error - verified by other means
}

// NEVER do this:
} catch (_error) {  // ❌ WRONG - underscore suggests "unused" anti-pattern
```

**Better approach for unused errors:**
```javascript
// ✅ BEST: Use expect().rejects when possible (no catch needed)
await expect(service.doSomething()).rejects.toThrow();

// ✅ GOOD: Document why error is unused
try {
  await service.doSomething();
} catch (error) {
  // Error caught to prevent test failure - validation done via mock calls
}
```

#### Enforcement

**Acceptance Criteria:**
- ✅ ALL catch blocks use `error` parameter (never `_error`, `err`, `e`)
- ✅ Consistent across unit, integration, and E2E tests
- ✅ Code reviews enforce this standard
- ✅ ESLint configuration can enforce this (optional)

**Example ESLint Rule (optional):**
```json
{
  "rules": {
    "id-match": [
      "error",
      "^[a-zA-Z][a-zA-Z0-9]*$",
      {
        "onlyDeclarations": false,
        "properties": false,
        "ignoreDestructuring": false,
        "exceptPatterns": ["^error$"]
      }
    ]
  }
}
```

### Advanced Pattern: Proxy-Based Mocks for Functions with Methods

**Use Case:** When mocking a function that also has methods attached (e.g., `query()` function with `query.getClient()` method), standard property assignment doesn't work with ES Modules.

**The Challenge:**
```javascript
// ❌ WRONG: Property assignment doesn't survive ESM module system
const mockDbQuery = jest.fn().mockResolvedValue({ rows: [] });
mockDbQuery.getClient = jest.fn().mockResolvedValue(mockClient);
// After import: query.getClient is undefined!

// ❌ WRONG: Object.assign also fails
const mockDbQuery = Object.assign(jest.fn(), {
  getClient: jest.fn().mockResolvedValue(mockClient)
});
// After import: query.getClient is still undefined!
```

**The Solution: Proxy Pattern**
```javascript
// ✅ CORRECT: Use Proxy to intercept both function calls and property access
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

// Proxy intercepts both () calls and .property access
const mockDbQuery = new Proxy(jest.fn().mockResolvedValue({ rows: [] }), {
  get(target, prop) {
    // Intercept property access before ESM processes it
    if (prop === 'getClient') {
      return jest.fn().mockResolvedValue(mockClient);
    }
    return target[prop];
  },
  apply(target, thisArg, args) {
    // Handle function invocation
    return target.apply(thisArg, args);
  }
});

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  query: mockDbQuery
}));

// Now both patterns work:
const result = await query('SELECT * FROM table');        // ✅ Works via apply trap
const client = await query.getClient();                   // ✅ Works via get trap
await client.query('BEGIN');                              // ✅ Works
client.release();                                         // ✅ Works
```

**Why This Works:**
1. **`get` trap**: Intercepts property access (`query.getClient`) before ESM module system processes it
2. **`apply` trap**: Handles function calls (`query(sql, params)`)
3. **Dynamic Interception**: Works at runtime, survives module export/import cycle
4. **ESM Compatible**: Proxy object persists through module boundaries

**Real-World Example:**
```javascript
// Service code that requires both patterns
async terminateEmployee(employeeId, organizationId, userId) {
  const client = await query.getClient();  // Property access
  try {
    await client.query('BEGIN');           // Transaction method
    
    // Update operations using regular query()
    await query('UPDATE employees...', [employeeId], organizationId);
    await query('INSERT INTO employment_history...', [...], organizationId);
    
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Test using Proxy pattern
describe('terminateEmployee', () => {
  let service, mockClient;

  beforeEach(async () => {
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    };

    const mockDbQuery = new Proxy(jest.fn().mockResolvedValue({ rows: [] }), {
      get(target, prop) {
        if (prop === 'getClient') {
          return jest.fn().mockResolvedValue(mockClient);
        }
        return target[prop];
      },
      apply(target, thisArg, args) {
        return target.apply(thisArg, args);
      }
    });

    jest.unstable_mockModule('../../../../src/config/database.js', () => ({
      query: mockDbQuery
    }));

    const { default: Service } = await import('../../../../src/services/EmployeeService.js');
    service = new Service();
  });

  it('should commit transaction on success', async () => {
    await service.terminateEmployee('emp-id', 'org-id', 'user-id');

    // Verify transaction flow
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should rollback on error', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql.includes('UPDATE')) throw new Error('Database error');
    });

    await expect(
      service.terminateEmployee('emp-id', 'org-id', 'user-id')
    ).rejects.toThrow();

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
```

**When to Use Proxy Pattern:**
- Function needs both direct invocation AND method access
- Transaction patterns (`db.query()` and `db.getClient()`)
- API clients with helper methods (`api()` and `api.setToken()`)
- Any dual-purpose function+object pattern in ESM

**Performance Note:** Proxy adds minimal overhead and is the **only reliable solution** for ESM modules with attached methods.

---

## Common Test Errors and Solutions

### 1. SyntaxError: Cannot use import statement outside a module

**Problem:**
```
SyntaxError: Cannot use import statement outside a module
```

**Solution:**
- Ensure `"type": "module"` is in `package.json`
- Run tests with: `cross-env NODE_OPTIONS=--experimental-vm-modules jest`
- Use `.js` extension in all imports

### 2. Jest Spy Wrong Syntax

**Problem:**
```javascript
// ❌ WRONG: Using "mockName" as second parameter
jest.spyOn(repository.findById, "mockName").mockResolvedValue(null);
```

**Solution:**
```javascript
// ✅ CORRECT: Method name as second parameter
jest.spyOn(repository, 'findById').mockResolvedValue(null);
```

### 3. Tests Never Finish / Hanging

**Problem:** Tests run but never complete, Jest hangs.

**Solution:** Close database connections:
```javascript
afterAll(async () => {
  await pool.end(); // Close connection pool
});
```

### 4. Module Not Found with ES Modules

**Problem:**
```
Cannot find module './JobService' from 'JobService.test.js'
```

**Solution:** Add `.js` extension:
```javascript
// ✅ CORRECT
import JobService from './JobService.js';

// ❌ WRONG
import JobService from './JobService';
```

### 5. Async Functions Not Awaited

**Problem:**
```javascript
beforeAll(() => {
  pool.query('DELETE FROM...'); // Not awaited!
});
```

**Solution:**
```javascript
beforeAll(async () => {
  await pool.query('DELETE FROM...'); // Properly awaited
});
```

### 6. Foreign Key Constraint Violations

**Problem:**
```
ERROR: update or delete on table "organizations" violates foreign key constraint
```

**Solution:** Delete in correct order (children first):
```javascript
afterAll(async () => {
  // ✅ CORRECT ORDER: Delete children first
  await pool.query('DELETE FROM jobs WHERE organization_id = $1', [orgId]);
  await pool.query('DELETE FROM workspaces WHERE organization_id = $1', [orgId]);
  await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [orgId]);
  await pool.query('DELETE FROM organizations WHERE id = $1', [orgId]); // Parent last
});
```

### 7. Test Data Pollution

**Problem:** Tests pass individually but fail when run together.

**Solution:** Use unique test data or proper cleanup:
```javascript
beforeEach(async () => {
  // Create fresh test data with unique identifiers
  testOrg = await createTestOrg({ name: `Test Org ${Date.now()}` });
});

afterEach(async () => {
  // Clean up after each test
  await cleanupTestData(testOrg.id);
});
```

### 8. Missing Schema Qualification

**Problem:**
```
ERROR: relation "user_account" does not exist
```

**Solution:** Use schema-qualified table names:
```javascript
// ✅ CORRECT
await pool.query('SELECT * FROM hris.user_account WHERE id = $1', [userId]);

// ❌ WRONG
await pool.query('SELECT * FROM user_account WHERE id = $1', [userId]);
```

### 9. Incorrect Mock Expectations

**Problem:**
```javascript
expect(mockRepository.create).toHaveBeenCalledWith({ title: 'Job' });
// Fails because actual call includes more fields
```

**Solution:** Use partial matchers:
```javascript
expect(mockRepository.create).toHaveBeenCalledWith(
  expect.objectContaining({ title: 'Job' })
);
```

### 10. Authentication Token Missing Required Fields

**Problem:**
```
TypeError: Cannot read property 'organizationId' of undefined
```

**Solution:** Include all required token fields:
```javascript
// ✅ CORRECT: All required fields
const token = jwt.sign({
  id: userId,
  userId: userId, // Some middleware checks this
  email: userEmail,
  organizationId: orgId,
  role: 'admin'
}, config.jwt.secret, { expiresIn: '1h' });
```

---

## Test Debugging Checklist

When a test fails, check:

- [ ] All imports have `.js` extensions
- [ ] `async`/`await` used in all lifecycle hooks
- [ ] Database connections closed in `afterAll`
- [ ] Test data cleaned up in correct order (FK constraints)
- [ ] Schema-qualified table names used (e.g., `hris.user_account`)
- [ ] JWT tokens include all required fields
- [ ] Mocks cleared between tests (`jest.clearAllMocks()`)
- [ ] No hard-coded test data that could conflict
- [ ] Authentication method matches API expectations (cookie vs Bearer)
- [ ] Mock syntax correct: `jest.spyOn(obj, 'method')`

---

## Test Data Management

### Test Data Factory Pattern (Integration Tests)

**RECOMMENDED:** For integration tests that interact with the database, use the **Test Data Factory Class pattern** for true test isolation.

#### Why Test Data Factories?

✅ **Test Isolation** - Each test creates its own data  
✅ **No Seed Data Dependency** - Tests are self-contained  
✅ **Parallel Execution** - Tests don't interfere with each other  
✅ **Reusable** - Centralized data creation logic  
✅ **Type Safety** - Factory validates data structure  
✅ **Easy Cleanup** - Automated cleanup after tests

#### Implementation Pattern

```javascript
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../src/config/database.js';

// Test constants from seed data (for foreign keys only)
const testOrganizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
const testUserId = '550e8400-e29b-41d4-a716-446655440000';
const testWorkspaceId = '550e8400-e29b-41d4-a716-446655440100';

/**
 * Test Data Factory Class
 * Creates and manages test data with proper cleanup
 */
class JobTestFactory {
  /**
   * Create a test job
   * @param {Object} overrides - Override default values
   * @returns {Promise<Object>} Created job record
   */
  static async createJob(overrides = {}) {
    const defaultData = {
      id: uuidv4(), // Generate unique UUID for each test
      organization_id: testOrganizationId,
      workspace_id: testWorkspaceId,
      title: 'Test Job',
      description: 'Test job description',
      employment_type: 'full-time',
      status: 'published',
      created_by: testUserId,
      ...overrides // Allow test-specific overrides
    };

    const result = await query(
      `INSERT INTO jobs (
        id, organization_id, workspace_id, title, description,
        employment_type, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        defaultData.id,
        defaultData.organization_id,
        defaultData.workspace_id,
        defaultData.title,
        defaultData.description,
        defaultData.employment_type,
        defaultData.status,
        defaultData.created_by
      ]
    );

    return result.rows[0];
  }

  /**
   * Create a test application for a job
   * @param {Object} overrides - Override default values
   * @returns {Promise<Object>} Created application record
   */
  static async createApplication(overrides = {}) {
    const defaultData = {
      id: uuidv4(),
      job_id: overrides.job_id, // Required
      candidate_id: overrides.candidate_id, // Required
      status: 'submitted',
      created_by: testUserId,
      ...overrides
    };

    const result = await query(
      `INSERT INTO applications (
        id, job_id, candidate_id, status, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        defaultData.id,
        defaultData.job_id,
        defaultData.candidate_id,
        defaultData.status,
        defaultData.created_by
      ]
    );

    return result.rows[0];
  }

  /**
   * Clean up all test data created in the last hour
   * Uses timestamp-based deletion to avoid removing seed data
   */
  static async cleanup() {
    // Delete in reverse order to respect foreign keys
    await query(
      `DELETE FROM applications WHERE created_at > NOW() - INTERVAL '1 hour'`
    );
    await query(
      `DELETE FROM jobs WHERE created_at > NOW() - INTERVAL '1 hour'`
    );
  }
}
```

#### Usage in Tests

```javascript
import request from 'supertest';
import app from '../../src/app.js';
import JobTestFactory from '../factories/JobTestFactory.js';

describe('Jobs API - Integration Tests', () => {
  // Clean up after ALL tests complete
  afterAll(async () => {
    await JobTestFactory.cleanup();
  });

  describe('GET /api/jobs/:id', () => {
    let testJob;

    // Create fresh data before EACH test (test isolation)
    beforeEach(async () => {
      testJob = await JobTestFactory.createJob({
        title: 'Senior Developer',
        employment_type: 'full-time'
      });
    });

    it('should return job by ID', async () => {
      // Act
      const response = await request(app)
        .get(`/api/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.job.id).toBe(testJob.id);
      expect(response.body.job.title).toBe('Senior Developer');
    });

    it('should return 404 for non-existent job', async () => {
      const fakeId = uuidv4();

      await request(app)
        .get(`/api/jobs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/jobs', () => {
    it('should create job with valid data', async () => {
      const jobData = {
        title: 'New Job',
        description: 'Job description',
        workspaceId: testWorkspaceId,
        employmentType: 'full-time'
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.job.title).toBe('New Job');
    });
  });
});
```

#### Key Patterns

**1. UUID Generation:**
```javascript
import { v4 as uuidv4 } from 'uuid';

const id = uuidv4(); // Generates unique UUID v4

// ✅ CORRECT: Valid UUID v4 format (8-4-4-4-12 hexadecimal)
const validUUID = '123e4567-e89b-12d3-a456-426614174000';

// ❌ WRONG: Invalid formats that will fail Joi .uuid() validation
const invalidUUID1 = 'emp-123';                    // Prefixed short ID
const invalidUUID2 = 'emp-123e4567-e89b-12d3';    // Prefixed partial UUID
const invalidUUID3 = '123e4567e89b12d3';          // Missing hyphens
const invalidUUID4 = '123e4567-e89b-12d3-a456';   // Too short
```

**UUID Validation Best Practices:**
- Always use full UUID v4 format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Never use prefixes for readability (e.g., `'emp-123'`, `'job-456'`)
- Use descriptive variable names instead: `testEmployeeId`, `testJobId`
- Generate with `uuid` package for production code
- Use fixed valid UUIDs for test constants (for deterministic tests)

**2. Timestamp-Based Cleanup (Safe for Parallel Tests):**
```javascript
static async cleanup() {
  // Only deletes data created in last hour (test data, not seed data)
  await query(`DELETE FROM table WHERE created_at > NOW() - INTERVAL '1 hour'`);
}
```

**3. Foreign Key Order in Cleanup:**
```javascript
static async cleanup() {
  // Delete child records first
  await query(`DELETE FROM applications WHERE created_at > NOW() - INTERVAL '1 hour'`);
  // Then parent records
  await query(`DELETE FROM jobs WHERE created_at > NOW() - INTERVAL '1 hour'`);
}
```

**4. Test Isolation with beforeEach:**
```javascript
beforeEach(async () => {
  // Each test gets fresh data
  testJob = await JobTestFactory.createJob({ title: 'Specific Title' });
});
```

**5. Centralized Cleanup with afterAll:**
```javascript
afterAll(async () => {
  // Clean up once after all tests
  await JobTestFactory.cleanup();
});
```

### Simple Factory Functions (Unit Tests)

For **unit tests** with mocked dependencies, use simple factory functions:

```javascript
// ✅ GOOD: Simple factory for unit tests (returns objects, no DB)
const createMockJob = (overrides = {}) => ({
  id: uuidv4(),
  title: 'Test Job',
  description: 'Test Description',
  workspaceId: uuidv4(),
  organizationId: uuidv4(),
  createdBy: uuidv4(),
  ...overrides
});

// Usage in unit tests
const mockJob = createMockJob({ title: 'Custom Title' });
mockRepository.findById.mockResolvedValue(mockJob);
```

### Test Constants

```javascript
// ✅ GOOD: Use constants for test UUIDs (from seed data)
const TEST_UUIDS = {
  ORG1: '123e4567-e89b-12d3-a456-426614174000',
  ORG2: '223e4567-e89b-12d3-a456-426614174001',
  USER1: '323e4567-e89b-12d3-a456-426614174002'
};
```

### Anti-Patterns to Avoid

```javascript
// ❌ BAD: Hard-coded test data everywhere
const job = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Test Job',
  // ... repeated in every test
};

// ❌ BAD: Inline SQL in every test (not reusable)
beforeEach(async () => {
  const result = await pool.query(`INSERT INTO jobs...`);
  jobId = result.rows[0].id;
});

// ❌ BAD: Deleting all data (removes seed data too)
afterEach(async () => {
  await pool.query('DELETE FROM jobs'); // Dangerous!
});

// ❌ BAD: Depending on seed data without creating it
test('should get job', async () => {
  // Assumes job with this ID exists from seed - brittle!
  const response = await request(app)
    .get('/api/jobs/550e8400-e29b-41d4-a716-446655440888')
    .expect(200);
});
```

---

---

## Jest Configuration Requirements

### Required jest.config.js Settings

```javascript
export default {
  // REQUIRED for ES modules
  testEnvironment: 'node',
  transform: {},

  // Setup/teardown files
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/**/*.test.js',  // Exclude test files (should not exist in src/)
  ],

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',  // Only look in tests/ folder
  ],

  // Clear mocks between tests (IMPORTANT)
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Timeout (increase for integration tests)
  testTimeout: 10000,

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Required package.json Settings

```json
{
  "type": "module",
  "scripts": {
    "test": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --coverage",
    "test:watch": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --watch",
    "test:integration": "cross-env NODE_OPTIONS=--experimental-vm-modules jest tests/integration"
  },
  "devDependencies": {
    "@jest/globals": "^30.0.0",
    "jest": "^30.0.0",
    "supertest": "^7.0.0",
    "cross-env": "^10.0.0"
  }
}
```

### Global Setup File (tests/setup.js)

```javascript
/**
 * Global test setup - runs once before all tests
 */
export default async function globalSetup() {
  console.log('Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'recruitiq_test';
  
  // Any other global setup
}
```

### Global Teardown File (tests/teardown.js)

```javascript
/**
 * Global test teardown - runs once after all tests
 */
export default async function globalTeardown() {
  console.log('Tearing down test environment...');
  
  // Close any remaining connections
  // Clean up global resources
}
```

---

## Refactoring Resilience

### Test Resilience Philosophy

**Industry Standard:** *"If moving test files breaks tests, your tests are testing the file system structure, not your code."* - Martin Fowler

### What Makes Tests Fragile?

```javascript
// ❌ FRAGILE TEST (breaks when files move)
import JobService from '../JobService.js';           // Relative path
import logger from '../../utils/logger.js';          // Relative path

class JobService {
  constructor() {
    this.repository = new JobRepository();           // Hard-coded dependency
  }
}

// ✅ RESILIENT TEST (survives restructuring)
import JobService from '@services/JobService.js';    // Mapped path
import logger from '@utils/logger.js';               // Mapped path

class JobService {
  constructor(repository = null) {
    this.repository = repository || new JobRepository();  // Dependency injection
  }
}

// Test uses DI
const mockRepo = { create: jest.fn() };
const service = new JobService(mockRepo);             // No file system coupling
```

### Refactoring Safety Checklist

**Before major refactoring:**

- [ ] All services use dependency injection
- [ ] Tests are in separate `tests/` folder (not in `src/`)
- [ ] Import paths are consistent and documented
- [ ] Test helpers centralize common imports
- [ ] Run full test suite to establish baseline

**During refactoring:**

- [ ] Move source files first
- [ ] Update import paths in tests
- [ ] Run tests incrementally
- [ ] Commit working states frequently
- [ ] Use version control to track changes

**After refactoring:**

- [ ] All tests pass
- [ ] Coverage remains above thresholds
- [ ] No orphaned test files
- [ ] Update documentation
- [ ] Remove old file references

### Common Refactoring Scenarios

#### Scenario 1: Moving a Service

```javascript
// Before: src/services/JobService.js
// After:  src/services/jobs/JobService.js

// Impact on test: tests/unit/services/JobService.test.js
// Change: import JobService from '../../../src/services/JobService.js';
// To:     import JobService from '../../../src/services/jobs/JobService.js';
```

**Steps:**
1. Move source file
2. Update test import
3. Run test to verify
4. Update any mocks that reference old path

#### Scenario 2: Extracting a Module

```javascript
// Before: src/services/JobService.js (contains validation)
// After:  src/services/JobService.js + src/validators/jobValidator.js

// Impact: Need new test file
// Action: Create tests/unit/validators/jobValidator.test.js
```

**Steps:**
1. Create new source file
2. Extract code
3. Create new test file
4. Update existing test to mock new dependency
5. Run both tests

#### Scenario 3: Renaming a Service

```javascript
// Before: JobService.js
// After:  JobPostingService.js

// Impact: Test file should also rename
// From: tests/unit/services/JobService.test.js
// To:   tests/unit/services/JobPostingService.test.js
```

**Steps:**
1. Rename source file
2. Update all imports that reference it
3. Rename test file
4. Update test imports
5. Run tests

### Migration from Co-Located Tests

**Problem:** Tests in `src/` make refactoring risky.

**Solution:** Migrate to `tests/` folder first, then refactor.

#### Migration Script Pattern

```powershell
# 1. Create target directory structure
New-Item -ItemType Directory -Path "tests/unit/services" -Force

# 2. Move test file
Move-Item "src/services/__tests__/JobService.test.js" `
          "tests/unit/services/JobService.test.js"

# 3. Update imports (manual or scripted)
# Change: import JobService from '../JobService.js';
# To:     import JobService from '../../../src/services/JobService.js';

# 4. Run test to verify
npm test -- JobService.test.js

# 5. If passing, commit changes
git add .
git commit -m "test(structure): migrate JobService tests to tests/ folder"
```

#### Automated Migration (Recommended)

Use a migration script that:
1. Scans for tests in `src/`
2. Calculates new import paths
3. Moves files and updates imports
4. Runs tests to verify
5. Generates rollback script

**See:** Migration script in `backend/scripts/migrate-tests.ps1` (to be created)

### Test Independence Principles

**Tests should be independent of:**

1. ✅ **File location** - Use consistent import patterns
2. ✅ **Other tests** - Each test should run in isolation
3. ✅ **Test order** - Tests should pass in any order
4. ✅ **External state** - Clean up after each test
5. ✅ **Time** - Don't depend on current date/time
6. ✅ **Environment** - Use test-specific configuration

**Tests should depend on:**

1. ✅ **Code contracts** - Test public APIs, not implementation
2. ✅ **Behavior** - Test what code does, not how
3. ✅ **Clear setup** - Explicit test data creation
4. ✅ **Documented assumptions** - Comment edge cases

### Measuring Test Resilience

**Good indicators:**

- ✅ Tests pass after moving test files
- ✅ Tests pass after renaming source files
- ✅ Tests pass after extracting modules
- ✅ No hard-coded file paths in tests
- ✅ All dependencies are injected or mocked

**Bad indicators:**

- ❌ Tests fail when moved to different folder
- ❌ Tests have hard-coded absolute paths
- ❌ Tests import from multiple relative depths
- ❌ Tests break when source files reorganize
- ❌ Tests depend on test execution order

### Future Improvements

**To make tests more resilient:**

1. **Implement path mapping** - Use `#services/*` imports
2. **Centralize test utilities** - Common imports in helpers
3. **Use test factories** - Consistent test data creation
4. **Document import conventions** - Clear patterns for team
5. **Automate migration** - Scripts for bulk refactoring

---

## Quick Reference: Test Template Checklist

### Unit Test Template

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ServiceClass from '../../../src/services/ServiceClass.js'; // Correct depth for tests/unit/services/
import Repository from '../../../src/repositories/Repository.js';

describe('ServiceClass', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
    };
    service = new ServiceClass(mockRepository); // Dependency injection
  });

  it('should do something', async () => {
    // Arrange
    mockRepository.findById.mockResolvedValue({ id: '123' });

    // Act
    const result = await service.doSomething('123');

    // Assert
    expect(result).toBeDefined();
    expect(mockRepository.findById).toHaveBeenCalledWith('123');
  });
});
```

### Integration Test Template

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js'; // Correct depth for tests/integration/
import pool from '../../src/config/database.js'; // For cleanup!

describe('API Integration Tests', () => {
  let testOrgId;
  let authToken;

  beforeAll(async () => {
    // Create test data
    const result = await pool.query('INSERT INTO organizations...');
    testOrgId = result.rows[0].id;
    authToken = generateTestToken({ organizationId: testOrgId });
  });

  afterAll(async () => {
    // Clean up test data (correct order!)
    await pool.query('DELETE FROM child_table WHERE org_id = $1', [testOrgId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    
    // CRITICAL: Close connection
    await pool.end();
  });

  it('should test API endpoint', async () => {
    const response = await request(app)
      .get('/api/resource')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

---

## Quick Reference Card: Test Classification

### 🚦 When to Write Unit Tests vs Integration Tests

#### ✅ Write Unit Test If:
- Method has **0-2 dependencies**
- Pure calculation/validation logic
- Data transformation (DTOs)
- No database queries
- No external service calls
- **Example:** `calculateBracketTax()`, `validateInput()`, `mapDbToApi()`

#### ✅ Write Integration Test If:
- Method has **3+ dependencies**
- Orchestrates multiple services/repos
- Makes database queries
- Uses transactions (BEGIN/COMMIT)
- Calls external services
- **Example:** `calculateEmployeeTaxes()`, `executePayrollRun()`, `reconcilePayments()`

#### 🔄 Migration Rule
**If you start writing unit test and realize:**
- Need 5+ mocks
- Mocking database queries
- Mocking multiple services
- Tests are fragile

**→ STOP. Move to integration tests immediately.**

#### 📋 Quick Checklist
```
□ Count dependencies (0-2 = unit, 3+ = integration)
□ Check for database queries (complex = integration)
□ Check for transactions (any = integration)
□ Count needed mocks (5+ = integration)
□ Is this orchestration? (yes = integration)
```

#### 💡 The Golden Rule
**"If you need more than 5 mocks, you're writing the wrong type of test."**

---

**Next:** [Security Standards](./SECURITY_STANDARDS.md)

````
