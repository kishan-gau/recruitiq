# PayLinQ Test Coverage - Quick Start Guide

**For:** Developers implementing tests  
**Created:** November 16, 2025

---

## ⚡ Quick Reference

### Before Writing ANY Test

1. **Verify method names** (prevents 90% of errors):
   ```powershell
   grep "async \w+\(" ServiceFile.js
   ```

2. **Check export pattern**:
   ```javascript
   // ✅ CORRECT
   export default ServiceClass;
   
   // ❌ WRONG - Must refactor first!
   export default new ServiceClass();
   ```

3. **Check for DTO usage**:
   ```powershell
   grep "from '../dto" ServiceFile.js
   ```

---

## 🎯 Critical Acceptance Criteria

| Criteria | Why It Matters |
|----------|----------------|
| ✅ Method names verified via grep | Prevents `method is not a function` errors |
| ✅ Export pattern validated | Singleton exports cannot be tested |
| ✅ DTO usage identified | Determines test data format expectations |
| ✅ DB format mocks (snake_case) | Matches repository return format |
| ✅ API format expectations (camelCase) | Matches service transformation |

---

## 📋 Test File Template (Copy This)

```javascript
/**
 * [ServiceName] Test Suite
 * 
 * VERIFIED METHODS (grep "async \w+\(" ServiceFile.js):
 * - async methodName(param1, param2)
 * - async anotherMethod(param)
 * 
 * Export Pattern: [Class with DI / Class / Singleton - MUST BE CLASS]
 * Uses DTO: [Yes - dtoFile.js / No]
 * Dependencies: [MockRepository1, MockRepository2]
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ServiceClass from '../../../../src/products/paylinq/services/ServiceClass.js';
// If DTO used:
import { mapDbToApi } from '../../../../src/products/paylinq/dto/entityDto.js';
import { ValidationError, NotFoundError } from '../../../../src/middleware/errorHandler.js';

// Mock dependencies
jest.mock('../../../../src/products/paylinq/repositories/Repository.js');

describe('ServiceClass', () => {
  let service;
  let mockRepository;
  const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const userId = 'user-123e4567-e89b-12d3-a456-426614174000';

  // Helper: DB format (snake_case) - for repository mocks
  const createDbEntity = (overrides = {}) => ({
    id: 'entity-123',
    organization_id: orgId,
    field_name: 'value', // ALWAYS snake_case
    is_active: true,
    created_at: new Date(),
    updated_at: null,
    deleted_at: null,
    ...overrides
  });

  // Helper: API format (camelCase) - for service input
  const createApiEntity = (overrides = {}) => ({
    fieldName: 'value', // ALWAYS camelCase
    isActive: true,
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock with ALL repository methods
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn()
    };
    
    // Inject mock via constructor (DI pattern)
    service = new ServiceClass(mockRepository);
  });

  describe('methodName', () => {
    it('should return DTO-transformed result when DTO is used', async () => {
      // Arrange: Mock returns DB format
      const dbEntity = createDbEntity({ field_name: 'test value' });
      mockRepository.findById.mockResolvedValue(dbEntity);

      // Act: Call service method
      const result = await service.methodName('entity-123', orgId);

      // Assert: Expect API format (DTO-transformed)
      expect(result).toEqual(mapDbToApi(dbEntity));
      expect(result.fieldName).toBe('test value'); // camelCase
      expect(result.field_name).toBeUndefined(); // DB field should NOT exist
      
      // Verify repository called with correct params
      expect(mockRepository.findById).toHaveBeenCalledWith('entity-123', orgId);
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidData = {}; // Missing required fields

      await expect(
        service.methodName(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when entity does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.methodName('non-existent-id', orgId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should enforce tenant isolation', async () => {
      const dbEntity = createDbEntity();
      mockRepository.findById.mockResolvedValue(dbEntity);

      await service.methodName('entity-123', orgId);

      // Verify organizationId passed to repository
      expect(mockRepository.findById).toHaveBeenCalledWith(
        'entity-123',
        orgId // MUST be present for tenant isolation
      );
    });
  });
});
```

---

## 🔴 Common Errors & Solutions

### Error 1: `TypeError: service.methodName is not a function`

**Cause:** Method name mismatch between source and test

**Solution:**
```powershell
# ALWAYS verify method names first
grep "async \w+\(" src/products/paylinq/services/ServiceName.js
```

### Error 2: `Cannot read property 'organizationId' of undefined`

**Cause:** Service exported as singleton instead of class

**Solution:**
```javascript
// ❌ WRONG (in source file)
export default new ServiceClass();

// ✅ CORRECT (in source file)
export default ServiceClass;

// Test file
service = new ServiceClass(mockRepository); // ✅ Now works!
```

### Error 3: `Expected fieldName, got field_name`

**Cause:** Not using DTO transformation when service uses DTOs

**Solution:**
```javascript
// Check if service imports DTO
grep "from '../dto" ServiceFile.js

// If yes, expect DTO-transformed result
expect(result).toEqual(mapDbToApi(dbData));
expect(result.fieldName).toBe('value'); // camelCase
```

---

## 📊 Test Priority Matrix

| Priority | Services (22 total) | Repositories (15 total) |
|----------|---------------------|-------------------------|
| **HIGH** | 11 services | 8 repositories |
| **MEDIUM** | 9 services | 5 repositories |
| **LOW** | 2 services | 2 repositories |

**Start with HIGH priority items!**

---

## ✅ Pre-Merge Checklist

Before submitting PR with test file:

- [ ] Method names verified via grep
- [ ] All tests pass (`npm test`)
- [ ] Coverage target met (90% for services)
- [ ] Zero `TypeError: method is not a function` errors
- [ ] DTO pattern used if service uses DTOs
- [ ] Tenant isolation verified (organizationId in all calls)
- [ ] Error cases tested (ValidationError, NotFoundError)
- [ ] Edge cases covered (null, empty, invalid input)
- [ ] Helper functions used (no hardcoded test data)
- [ ] JSDoc comments present

---

## 🚀 Implementation Phases

### Phase 1: High Priority Services (Week 1)
1. approvalService.js
2. benefitsService.js
3. complianceService.js (with DTO)
4. currencyService.js
5. deductionsService.js
6. paymentService.js
7. payrollService.js
8. taxCalculationService.js (with DTO)
9. timeAttendanceService.js
10. formulaEngineService.js (security-critical)

### Phase 2: Medium Priority Services (Week 2)
All remaining services from the main plan

### Phase 3: Repositories (Week 3-4)
High priority repositories first

### Phase 4: Integration Tests (Week 5)
End-to-end API tests

---

## 📚 Key Documents

1. **Main Plan:** `PAYLINQ_TEST_COVERAGE_PLAN.md` (this directory)
2. **Testing Standards:** `docs/TESTING_STANDARDS.md` (detailed patterns)
3. **Backend Standards:** `docs/BACKEND_STANDARDS.md` (service/repository patterns)

---

## 💡 Pro Tips

1. **Always use helper functions** for test data creation
   ```javascript
   // ✅ GOOD
   const dbEntity = createDbEntity({ field_name: 'custom' });
   
   // ❌ BAD
   const dbEntity = { id: '123', field_name: 'custom', ... }; // Hardcoded
   ```

2. **Mock returns DB format, expect API format**
   ```javascript
   mockRepo.find.mockResolvedValue(dbData); // snake_case
   const result = await service.get();
   expect(result.fieldName).toBe('value'); // camelCase
   ```

3. **Test error paths, not just happy paths**
   ```javascript
   it('should throw ValidationError for missing field', async () => {
     await expect(service.create({})).rejects.toThrow(ValidationError);
   });
   ```

4. **One assertion per test** (makes failures easier to debug)
   ```javascript
   // ✅ GOOD
   it('should return correct fieldName', async () => {
     const result = await service.get();
     expect(result.fieldName).toBe('value');
   });
   
   it('should return correct isActive', async () => {
     const result = await service.get();
     expect(result.isActive).toBe(true);
   });
   
   // ❌ BAD
   it('should return correct data', async () => {
     const result = await service.get();
     expect(result.fieldName).toBe('value');
     expect(result.isActive).toBe(true);
     expect(result.status).toBe('active');
     // If one fails, you don't know which
   });
   ```

---

## 🎓 Example: Complete Test Flow

```javascript
// 1. VERIFY method name
// $ grep "async getByCode" src/products/paylinq/services/PayrollRunTypeService.js
// Found: async getByCode(typeCode, organizationId)

// 2. CHECK DTO usage
// $ grep "from '../dto" src/products/paylinq/services/PayrollRunTypeService.js
// Found: import { mapRunTypeDbToApi } from '../dto/payrollRunTypeDto.js'

// 3. WRITE TEST
describe('getByCode', () => {
  it('should return DTO-transformed payroll run type', async () => {
    // Arrange: Mock returns DB format
    const dbType = createDbRunType({
      type_code: 'REGULAR_PAY',
      type_name: 'Regular Payroll'
    });
    mockRepository.findByCode.mockResolvedValue(dbType);

    // Act: Call verified method name
    const result = await service.getByCode('REGULAR_PAY', orgId);

    // Assert: Expect DTO-transformed result
    expect(result).toEqual(mapRunTypeDbToApi(dbType));
    expect(result.typeCode).toBe('REGULAR_PAY'); // camelCase
    expect(result.type_code).toBeUndefined(); // DB field removed
    
    // Verify tenant isolation
    expect(mockRepository.findByCode).toHaveBeenCalledWith(
      'REGULAR_PAY',
      orgId
    );
  });
});
```

---

**Questions?** Check the main plan document or Testing Standards.

**Ready to start?** Pick a HIGH priority service and begin! 🚀
