# PayLinQ Integration Tests

This directory contains integration tests for the PayLinQ payroll system. These tests validate complete workflows with real database operations.

## Overview

Integration tests validate multi-component interactions with a real PostgreSQL database. Unlike unit tests that mock dependencies, these tests ensure that services, repositories, and the database work together correctly.

### Test Files

1. **payroll-processing-flow.test.js** (13 tests, 640 lines)
   - Complete payroll run workflow from creation to finalization
   - Multi-employee payroll calculations
   - Payment transaction generation
   - Data integrity verification
   - Organization isolation testing

2. **tax-calculation-scenarios.test.js** (23 tests, 690 lines)
   - Progressive tax calculation with 3 brackets (0%, 15%, 25%)
   - Tax-free allowances and deductions
   - Multi-employee tax scenarios
   - Edge cases: zero income, bracket boundaries, high income
   - Tax breakdown validation

3. **worker-lifecycle.test.js** (18 tests, 650 lines)
   - Complete employee lifecycle: creation → updates → payroll → termination
   - Compensation history tracking
   - Worker status transitions (active/inactive/terminated)
   - Payroll inclusion/exclusion based on status
   - Referential integrity verification

**Total: 54 integration test cases, ~2000 lines of code**

## Prerequisites

### 1. PostgreSQL Database

Integration tests require a running PostgreSQL database with the RecruitIQ schema:

```bash
# Option A: Docker Compose (Recommended)
docker-compose up -d postgres

# Option B: Local PostgreSQL
# Ensure PostgreSQL is running on localhost:5432
# Database: primecore_dev
# User: postgres
# Password: postgres
```

### 2. Environment Configuration

Tests use the `.env.test` file in the backend directory. Verify database connection settings:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/primecore_dev
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=primecore_dev
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

### 3. Database Schema

Ensure the database has the latest schema:

```bash
# Apply migrations if needed
cd backend
npm run migrate
```

## Running Tests

### All Integration Tests

```bash
cd backend

# Run all integration tests
npm test tests/products/paylinq/integration/

# Run with coverage
npm test tests/products/paylinq/integration/ -- --coverage
```

### Individual Test Files

```bash
# Payroll processing flow
npm test tests/products/paylinq/integration/payroll-processing-flow.test.js

# Tax calculation scenarios
npm test tests/products/paylinq/integration/tax-calculation-scenarios.test.js

# Worker lifecycle
npm test tests/products/paylinq/integration/worker-lifecycle.test.js
```

### Using Jest Directly

```bash
# With environment variables
NODE_OPTIONS="--experimental-vm-modules" npx jest \
  --config=tests/products/paylinq/jest.config.js \
  tests/products/paylinq/integration/ \
  --testTimeout=30000

# Verbose output
NODE_OPTIONS="--experimental-vm-modules" npx jest \
  --config=tests/products/paylinq/jest.config.js \
  tests/products/paylinq/integration/ \
  --verbose
```

## Test Structure

All integration tests follow the same pattern from `TESTING_STANDARDS.md`:

```javascript
describe('Feature - Integration Tests', () => {
  let organizationId;
  let userId;
  let service;

  beforeAll(async () => {
    // Setup: Create test organization, users, and data
    organizationId = uuidv4();
    await query('INSERT INTO organizations ...');
    service = new Service();
  });

  afterAll(async () => {
    // Cleanup: Delete all test data in reverse dependency order
    await query('DELETE FROM table WHERE organization_id = $1', [organizationId]);
    await pool.end();
  });

  describe('Feature Area', () => {
    it('should test specific behavior', async () => {
      // Arrange - Setup test data
      const testData = { ... };

      // Act - Execute the feature
      const result = await service.doSomething(testData);

      // Assert - Verify results
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });
  });
});
```

## Key Features

### Real Database Operations

- No mocking - tests use actual PostgreSQL connections
- Validates SQL queries work correctly
- Tests database constraints and triggers
- Verifies indexes and performance

### Data Isolation

- Each test creates its own organization with a unique UUID
- Test data is scoped to the test organization
- Cleanup removes all test data
- Tests can run in parallel without conflicts

### Multi-Tenant Testing

- Validates `organization_id` filtering in all queries
- Tests that data from one organization is not accessible to another
- Ensures tenant isolation at the database level

### Complete Workflows

- Tests entire user journeys from start to finish
- Validates that all services work together
- Verifies data flows correctly between components
- Tests both happy paths and error scenarios

## Test Data

Tests create realistic test data:

### Organizations
- UUID-based organization IDs
- Professional tier access
- Proper audit fields

### Employees
- Complete employee records in `hris.employee`
- Payroll configuration in `payroll.employee_payroll_config`
- Varied compensation levels for different test scenarios

### Tax Rules
- Progressive tax brackets (0%, 15%, 25%)
- Tax-free allowances (250 SRD)
- Suriname wage tax (SR country code)

### Payroll Runs
- Monthly pay periods
- Multiple employees per run
- Draft → Calculated → Finalized workflow

## Troubleshooting

### Database Connection Errors

```
Error: connect ECONNREFUSED ::1:5432
```

**Solution:** Start PostgreSQL:
```bash
docker-compose up -d postgres
# or
sudo service postgresql start
```

### Schema Errors

```
Error: relation "payroll.tax_rule_set" does not exist
```

**Solution:** Apply database migrations:
```bash
cd backend
npm run migrate
```

### Test Timeout Errors

```
Timeout - Async callback was not invoked within the 10000 ms timeout
```

**Solution:** Increase timeout for slow operations:
```bash
npm test -- --testTimeout=30000
```

### Cleanup Errors

If tests fail during cleanup, you may have orphaned test data:

```sql
-- Connect to database
psql -U postgres -d primecore_dev

-- Find test organizations
SELECT id, name FROM organizations WHERE name LIKE 'Test%';

-- Clean up specific test org
DELETE FROM organizations WHERE id = 'uuid-here';
```

## Performance

Expected test execution times (with warm database):

- **payroll-processing-flow.test.js**: ~10-15 seconds
- **tax-calculation-scenarios.test.js**: ~8-12 seconds
- **worker-lifecycle.test.js**: ~8-12 seconds

**Total suite: ~30-40 seconds**

Slow tests may indicate:
- Database not warmed up (first run is slower)
- Missing indexes
- Network latency
- Resource constraints

## Coverage

Integration tests complement unit tests:

- **Unit Tests**: Test individual functions with mocked dependencies
- **Integration Tests**: Test multiple components working together
- **E2E Tests**: Test complete user workflows through the API

Target coverage:
- Critical workflows: 100%
- Data integrity: 100%
- Error handling: 80%+
- Edge cases: 70%+

## Contributing

When adding new integration tests:

1. Follow the existing pattern (beforeAll/afterAll setup/cleanup)
2. Use unique UUIDs for all test entities
3. Clean up all test data in afterAll
4. Test both success and failure paths
5. Verify data integrity with database queries
6. Add descriptive test names
7. Document any special requirements

## Related Documentation

- [TESTING_STANDARDS.md](../../../../../docs/TESTING_STANDARDS.md) - Overall testing guidelines
- [PAYLINQ_TEST_TYPES_ANALYSIS.md](../PAYLINQ_TEST_TYPES_ANALYSIS.md) - Detailed test analysis
- [TEST_TYPES_SUMMARY.md](../TEST_TYPES_SUMMARY.md) - Quick reference guide

## Questions?

For questions about these tests, see:
- Test implementation patterns in existing files
- Service and repository implementations
- Database schema documentation
- TESTING_STANDARDS.md for conventions
