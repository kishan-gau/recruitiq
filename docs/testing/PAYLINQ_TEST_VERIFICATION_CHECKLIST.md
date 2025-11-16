# PayLinQ Test Verification Checklist

**Purpose:** Systematic verification process to prevent common test errors  
**Use:** Complete this checklist BEFORE writing each test file

---

## Pre-Implementation Verification Form

**Service/Repository:** ____________________  
**Test File:** ____________________  
**Date:** ____________________  
**Developer:** ____________________

---

## Step 1: Source Code Analysis

### 1.1 Extract Method Names
```powershell
# Run this command and paste output below:
grep "async \w+\(" src/products/paylinq/services/[ServiceName].js
```

**Method Names Found:**
```
✅ async methodName1(param1, param2)
✅ async methodName2(param1)
✅ async methodName3()
...
```

**Total Methods:** _____

---

### 1.2 Verify Export Pattern
```powershell
# Run this command:
Select-String -Path "src/products/paylinq/services/[ServiceName].js" -Pattern "^export default"
```

**Export Pattern Found:**
- [ ] ✅ `export default ServiceClass;` (Class export - CORRECT)
- [ ] ❌ `export default new ServiceClass();` (Singleton - MUST REFACTOR)
- [ ] ❌ `const instance = new ServiceClass(); export default instance;` (Singleton - MUST REFACTOR)

**Action Required:**
- [ ] ✅ No action (class export confirmed)
- [ ] 🔴 Refactor service to export class before writing tests

---

### 1.3 Check DTO Usage
```powershell
# Run this command:
grep "from '../dto" src/products/paylinq/services/[ServiceName].js
```

**DTO Imports Found:**
```
□ None (service does not use DTOs)
□ import { mapDbToApi } from '../dto/entityDto.js'
□ Other: ____________________
```

**DTO Pattern Required:**
- [ ] ✅ Yes - Use DTO test pattern (DB format mocks → API format expectations)
- [ ] ✅ No - Use direct format pattern (same format for mocks and expectations)

---

### 1.4 Identify Dependencies
```powershell
# Check constructor parameters:
grep "constructor(" src/products/paylinq/services/[ServiceName].js
```

**Constructor Signature:**
```javascript
constructor(param1 = null, param2 = null)
```

**Dependencies to Mock:**
1. ____________________
2. ____________________
3. ____________________

**Dependency Injection Support:**
- [ ] ✅ Yes (default null parameters) - Can inject mocks
- [ ] ❌ No (hardcoded dependencies) - MUST REFACTOR

---

## Step 2: Method Signature Documentation

**Complete this table for ALL methods:**

| Method Name | Parameters | Return Type | organizationId? | userId? | Uses DTO? |
|-------------|-----------|-------------|-----------------|---------|-----------|
| methodName1 | (id, orgId) | Object | ✅ Yes | ❌ No | ✅ Yes |
| methodName2 | (data, orgId, userId) | Object | ✅ Yes | ✅ Yes | ❌ No |
| ... | ... | ... | ... | ... | ... |

---

## Step 3: Test Data Helpers Design

### 3.1 DB Format Helper (for repository mocks)
```javascript
// Helper: DB format data (snake_case)
const createDbEntity = (overrides = {}) => ({
  id: 'entity-123',
  organization_id: orgId,
  // ADD ALL DB FIELDS FROM SOURCE CODE:
  field_name_1: 'value',
  field_name_2: 'value',
  is_active: true,
  created_at: new Date(),
  updated_at: null,
  deleted_at: null,
  created_by: userId,
  updated_by: null,
  ...overrides
});
```

**DB Fields Documented:**
- [ ] ✅ All fields from actual database schema included
- [ ] ✅ Field names in snake_case
- [ ] ✅ Audit fields included (created_at, updated_at, deleted_at)

---

### 3.2 API Format Helper (for service input)
```javascript
// Helper: API format data (camelCase)
const createApiEntity = (overrides = {}) => ({
  // ADD ALL API FIELDS (camelCase version of DB fields):
  fieldName1: 'value',
  fieldName2: 'value',
  isActive: true,
  ...overrides
});
```

**API Fields Documented:**
- [ ] ✅ All fields in camelCase
- [ ] ✅ Field names match service validation schema

---

## Step 4: Test Coverage Planning

### 4.1 Methods to Test

| Method | Success Case | Validation Error | Not Found | Authorization | Edge Cases |
|--------|--------------|------------------|-----------|---------------|------------|
| methodName1 | ✅ | ✅ | ✅ | ✅ | ✅ |
| methodName2 | ✅ | ✅ | ✅ | ✅ | ✅ |
| ... | ... | ... | ... | ... | ... |

**Total Test Cases Planned:** _____

---

### 4.2 Validation Rules to Test

**From Joi schema in service:**

| Field | Validation Rule | Test Case |
|-------|----------------|-----------|
| fieldName | required | Test missing field → ValidationError |
| fieldName | min(3) | Test too short → ValidationError |
| fieldName | max(200) | Test too long → ValidationError |
| status | valid('active', 'inactive') | Test invalid value → ValidationError |
| ... | ... | ... |

---

## Step 5: Mock Setup Verification

### 5.1 Repository Mock
```javascript
beforeEach(() => {
  mockRepository = {
    // LIST ALL METHODS FROM ACTUAL REPOSITORY:
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    // ... ADD MORE AS NEEDED
  };
});
```

**Repository Methods Documented:**
- [ ] ✅ All methods used by service are mocked
- [ ] ✅ Method names match actual repository

---

### 5.2 Additional Mocks
```javascript
// If service uses other dependencies:
mockOtherService = {
  method1: jest.fn(),
  method2: jest.fn()
};
```

**Additional Mocks Needed:**
- [ ] None
- [ ] Logger (from utils/logger.js)
- [ ] Other service: ____________________
- [ ] Database client: ____________________

---

## Step 6: DTO Testing Pattern (If Applicable)

**If service uses DTOs, complete this section:**

### 6.1 DTO Import Verified
```javascript
import { mapDbToApi, mapApiToDb } from '../../../../src/products/paylinq/dto/entityDto.js';
```

**DTO Functions Available:**
- [ ] mapDbToApi (DB format → API format)
- [ ] mapApiToDb (API format → DB format)
- [ ] mapArrayDbToApi (array transformation)

---

### 6.2 DTO Test Pattern Template
```javascript
it('should return DTO-transformed result', async () => {
  // Arrange: Mock returns DB format (snake_case)
  const dbEntity = createDbEntity({ field_name: 'test' });
  mockRepository.findById.mockResolvedValue(dbEntity);

  // Act
  const result = await service.getById(id, orgId);

  // Assert: Expect API format (camelCase)
  expect(result).toEqual(mapDbToApi(dbEntity));
  expect(result.fieldName).toBe('test'); // camelCase
  expect(result.field_name).toBeUndefined(); // DB field removed
});
```

**DTO Pattern Checklist:**
- [ ] Mock returns DB format (snake_case)
- [ ] Expectation uses DTO mapper
- [ ] Verify camelCase fields exist
- [ ] Verify snake_case fields removed

---

## Step 7: Final Pre-Implementation Checklist

### 7.1 Documentation Complete
- [ ] ✅ All method names verified and documented
- [ ] ✅ Export pattern validated
- [ ] ✅ DTO usage identified
- [ ] ✅ Dependencies identified
- [ ] ✅ Test data helpers designed
- [ ] ✅ Test coverage planned

### 7.2 No Blockers
- [ ] ✅ Service exports class (not singleton)
- [ ] ✅ Service supports dependency injection
- [ ] ✅ All repository methods identified
- [ ] ✅ DTO functions available (if needed)

### 7.3 Ready to Implement
- [ ] ✅ Test file path: `tests/products/paylinq/services/[ServiceName].test.js`
- [ ] ✅ Imported test template from Quick Start Guide
- [ ] ✅ Verification checklist saved for reference

---

## Step 8: Post-Implementation Verification

**After writing tests, verify:**

### 8.1 Tests Pass
```powershell
npm test tests/products/paylinq/services/[ServiceName].test.js
```

**Result:**
- [ ] ✅ All tests pass
- [ ] ❌ Some tests fail (debug before proceeding)

---

### 8.2 Coverage Target Met
```powershell
npm test -- --coverage tests/products/paylinq/services/[ServiceName].test.js
```

**Coverage Results:**
- Statements: _____% (Target: 90%)
- Branches: _____% (Target: 85%)
- Functions: _____% (Target: 90%)
- Lines: _____% (Target: 90%)

**Coverage Met:**
- [ ] ✅ All targets met
- [ ] ⚠️ Some targets missed (add more tests)

---

### 8.3 Error-Free Execution
- [ ] ✅ No `TypeError: method is not a function` errors
- [ ] ✅ No `undefined is not a function` errors
- [ ] ✅ No field name mismatch errors
- [ ] ✅ All mocks called with correct parameters
- [ ] ✅ Tenant isolation verified (organizationId in all calls)

---

### 8.4 Code Quality
- [ ] ✅ JSDoc comments present for describe blocks
- [ ] ✅ Test names are descriptive
- [ ] ✅ Helper functions used (no hardcoded data)
- [ ] ✅ No skipped tests (it.skip)
- [ ] ✅ No console.log statements

---

## Step 9: Peer Review Preparation

### 9.1 Documentation
- [ ] ✅ Completed this verification checklist
- [ ] ✅ Method names documented in test file header
- [ ] ✅ DTO pattern noted in test file header (if applicable)

### 9.2 Test Quality
- [ ] ✅ All happy paths tested
- [ ] ✅ All error paths tested
- [ ] ✅ Edge cases covered
- [ ] ✅ Validation rules tested
- [ ] ✅ Tenant isolation verified

### 9.3 Ready for PR
- [ ] ✅ Tests pass locally
- [ ] ✅ Coverage targets met
- [ ] ✅ No linting errors
- [ ] ✅ Verification checklist attached to PR

---

## Common Issues Log

**If you encounter issues, document them here for team learning:**

| Issue | Solution | Prevention |
|-------|----------|------------|
| Example: Method not found | Verified method name with grep | Always verify before writing tests |
| | | |
| | | |

---

## Sign-Off

**Developer:** ____________________  
**Date Completed:** ____________________  
**Reviewer:** ____________________  
**Date Reviewed:** ____________________

---

**IMPORTANT:** Keep this checklist with your test file for reference and attach to PR!
