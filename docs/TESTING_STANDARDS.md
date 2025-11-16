# Testing Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.1  
**Last Updated:** November 16, 2025

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Coverage Requirements](#test-coverage-requirements)
3. [Unit Testing Standards](#unit-testing-standards)
4. [Integration Testing Standards](#integration-testing-standards)
5. [E2E Testing Standards](#e2e-testing-standards)
6. [Test Structure](#test-structure)
7. [Mocking Standards](#mocking-standards)
8. [Test Data Management](#test-data-management)

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
      await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
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

### E2E Test Standards Checklist

**EVERY E2E test suite MUST:**

- [ ] **Use automated server lifecycle** (globalSetup/globalTeardown)
- [ ] **Use test database** (recruitiq_test with proper schema)
- [ ] **Run against real backend server**
- [ ] **Test complete user journeys** (not isolated operations)
- [ ] **Use actual HTTP requests** (supertest or real browser)
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

### Cookie-Based Authentication (PREFERRED)

**Current Migration Status:** The codebase is migrating from Bearer token to cookie-based authentication.

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

### Bearer Token Authentication (LEGACY)

**Status:** Being phased out, but still used in some tests.

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
```

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
    '!src/**/__tests__/**',
    '!src/**/*.test.js',
  ],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
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

## Quick Reference: Test Template Checklist

### Unit Test Template

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ServiceClass from '../../src/services/ServiceClass.js'; // .js extension!
import Repository from '../../src/repositories/Repository.js';

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
import app from '../../src/server.js';
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

**Next:** [Security Standards](./SECURITY_STANDARDS.md)

````
