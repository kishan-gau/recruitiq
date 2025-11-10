# Cross-Product Integration Tests
**Last Updated:** November 7, 2025

## Overview
Comprehensive integration tests for all cross-product flows in the RecruitIQ monolithic platform.

---

## Test Suites

### 1. RecruitIQ → Nexus → ScheduleHub
**File:** `recruitiq-nexus-schedulehub.test.js`  
**Test Count:** 7 tests

**Scenarios:**
- ✅ Create candidate, position, and offer
- ✅ Create employee in Nexus when offer accepted
- ✅ Sync employee to ScheduleHub workforce
- ✅ Verify end-to-end data consistency
- ✅ Error handling for missing data
- ✅ Transaction rollback on errors

**Key Validations:**
- Employee number auto-generation (EMP0001, EMP0002...)
- Contract creation with salary details
- Time-off balance initialization
- Worker creation in ScheduleHub
- Default availability (Mon-Fri 9am-5pm)
- Data consistency across all systems

---

### 2. Nexus → Paylinq
**File:** `nexus-paylinq.test.js`  
**Test Count:** 8 tests

**Scenarios:**

**Contract Activation → Payroll Setup:**
- ✅ Create payroll record on contract activation
- ✅ Calculate hourly rate for hourly employees
- ✅ Update existing payroll record (no duplicates)

**Benefits Enrollment → Deduction:**
- ✅ Create deduction when employee enrolls
- ✅ Prevent duplicate deductions

**Error Handling:**
- ✅ Graceful failure handling
- ✅ Integration metrics tracking

**Key Validations:**
- Employee record creation in payroll
- Compensation calculation (hourly, annual, pay period)
- Salary vs hourly rate determination
- Pre-tax benefit deductions
- Circuit breaker functionality

---

### 3. ScheduleHub → Paylinq
**File:** `schedulehub-paylinq.test.js`  
**Test Count:** 10 tests

**Scenarios:**

**Clock In/Out Flow:**
- ✅ Record clock in successfully
- ✅ Record time entry on clock out
- ✅ Calculate overtime hours correctly
- ✅ Handle part-time worker hours
- ✅ Prevent duplicate time entries

**Error Handling:**
- ✅ Prevent clock out without clock in
- ✅ Prevent double clock out
- ✅ Handle missing payroll record gracefully

**Integration Health:**
- ✅ Track metrics for time entries

**Key Validations:**
- Time calculation (regular vs overtime)
- Part-time vs full-time overtime rules
- Break time deduction
- Auto-approval for payroll
- Non-blocking integration

---

## Running Tests

### Run All Integration Tests
```bash
cd backend
npm test -- tests/integration
```

### Run Specific Test Suite
```bash
# RecruitIQ → Nexus → ScheduleHub
npm test -- tests/integration/recruitiq-nexus-schedulehub.test.js

# Nexus → Paylinq
npm test -- tests/integration/nexus-paylinq.test.js

# ScheduleHub → Paylinq
npm test -- tests/integration/schedulehub-paylinq.test.js
```

### Run with Coverage
```bash
npm test -- --coverage tests/integration
```

### Run in Watch Mode
```bash
npm test -- --watch tests/integration
```

---

## Test Data Management

### Automatic Cleanup
All tests use `beforeAll`, `afterAll`, and `beforeEach` hooks to:
- Create fresh test organizations
- Create test users with admin role
- Clean up all test data after completion
- Isolate tests from each other

### Test Organization Naming
Each test suite creates organizations with unique names:
- `Test Org - Integration` (RecruitIQ → Nexus → ScheduleHub)
- `Test Org - Paylinq Integration` (Nexus → Paylinq)
- `Test Org - TimeEntry Integration` (ScheduleHub → Paylinq)

### Database Cleanup Order
Cleanup follows foreign key dependencies:
1. Payroll data (time_entry, deduction, compensation, employee_payroll_config)
2. Scheduling data (shift, worker_availability, worker)
3. HRIS data (contract, employee_benefit_enrollment, benefits_plan, employee)
4. Recruitment data (offer, candidate, position)
5. Core data (users, organization)

---

## Test Configuration

### Prerequisites
- PostgreSQL database running
- All schemas created (recruitment, hris, scheduling, payroll)
- Database connection configured in `src/config/database.js`
- Jest test framework installed

### Environment Variables
```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=recruitiq_test
DATABASE_USER=postgres
DATABASE_PASSWORD=yourpassword
NODE_ENV=test
```

### Jest Configuration
Located in `backend/jest.config.js`:
```javascript
{
  testEnvironment: 'node',
  testTimeout: 30000, // 30 seconds for integration tests
  setupFilesAfterEnv: ['./tests/setup.js'],
  testMatch: ['**/tests/integration/**/*.test.js']
}
```

---

## Integration Test Patterns

### Pattern 1: Direct Service Calls
Tests import and call service methods directly:
```javascript
const { default: EmployeeService } = await import('../../src/products/nexus/services/employeeService.js');
const employeeService = new EmployeeService();

const result = await employeeService.createFromRecruitIQOffer(...);
```

### Pattern 2: Database Verification
Tests query database directly to verify integration results:
```javascript
const workerResult = await pool.query(
  'SELECT * FROM scheduling.worker WHERE employee_id = $1',
  [employeeId]
);

expect(workerResult.rows.length).toBe(1);
```

### Pattern 3: Async Integration Handling
Tests wait for async integrations to complete:
```javascript
await someIntegrationMethod();
await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms
// Now verify results
```

### Pattern 4: Error Handler Testing
Tests interact with error handler directly:
```javascript
const { default: integrationErrorHandler } = await import('../../src/shared/utils/integrationErrorHandler.js');

integrationErrorHandler.resetMetrics('integration-name');
// ... trigger integration
const health = integrationErrorHandler.getHealthStatus();
expect(health['integration-name'].successCount).toBeGreaterThan(0);
```

---

## Coverage Targets

### Target Coverage: 80%+

**Current Coverage by Module:**
- ✅ PaylinqIntegrationService: TBD
- ✅ ScheduleHubIntegrationService: TBD
- ✅ EmployeeService (createFromRecruitIQOffer): TBD
- ✅ ContractService (activateContract): TBD
- ✅ BenefitsService (enrollEmployee): TBD
- ✅ ShiftService (clockOut): TBD

**Run coverage report:**
```bash
npm test -- --coverage --coverageDirectory=coverage/integration
```

---

## Common Test Failures and Solutions

### Issue: Database Connection Timeout
**Solution:**
- Increase `testTimeout` in Jest config
- Check database is running
- Verify connection string

### Issue: Foreign Key Violations
**Solution:**
- Ensure cleanup order follows FK dependencies
- Check all related data is deleted in `afterAll`

### Issue: Race Conditions in Async Integrations
**Solution:**
- Increase wait time after async calls
- Use proper async/await patterns
- Check integration completion before asserting

### Issue: Duplicate Data Between Tests
**Solution:**
- Use unique identifiers (timestamps, UUIDs)
- Clean up in `beforeEach` and `afterAll`
- Use transactions where appropriate

---

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: recruitiq_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd backend && npm install
      
      - name: Run database migrations
        run: cd backend && npm run migrate
      
      - name: Run integration tests
        run: cd backend && npm test -- tests/integration
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_NAME: recruitiq_test
          DATABASE_USER: postgres
          DATABASE_PASSWORD: postgres
          NODE_ENV: test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
```

---

## Best Practices

### 1. Test Independence
- Each test should run independently
- No shared state between tests
- Clean data in `beforeEach`

### 2. Descriptive Test Names
```javascript
it('should create employee in Nexus when offer is accepted', ...)
it('should sync employee to ScheduleHub workforce', ...)
it('should calculate overtime hours correctly', ...)
```

### 3. Arrange-Act-Assert Pattern
```javascript
// Arrange: Set up test data
const employee = await createEmployee();

// Act: Execute the action
const result = await service.doSomething(employee);

// Assert: Verify results
expect(result).toBeDefined();
expect(result.status).toBe('success');
```

### 4. Test Both Happy Path and Error Cases
```javascript
describe('Complete Flow', () => {
  it('should succeed with valid data', ...);
});

describe('Error Handling', () => {
  it('should fail gracefully with invalid data', ...);
  it('should rollback on error', ...);
});
```

### 5. Use Realistic Test Data
- Use actual employee names, emails, dates
- Test edge cases (part-time, overtime, etc.)
- Include various currencies, frequencies

---

## Future Enhancements

### Planned Improvements
1. **Performance Testing:** Load tests for high-volume integrations
2. **End-to-End Tests:** Full UI-to-database flows
3. **Mock External Services:** Isolate tests from external dependencies
4. **Parallel Execution:** Run tests faster with proper isolation
5. **Visual Regression:** Screenshot comparison for UI components
6. **API Contract Testing:** Validate API schemas and responses

---

## Test Statistics

### Summary
- **Total Integration Tests:** 25
- **Test Suites:** 3
- **Cross-Product Flows Tested:** 5
- **Database Schemas Involved:** 4 (recruitment, hris, scheduling, payroll)
- **Services Tested:** 6
- **Integration Points Tested:** 5

### Execution Time (Estimated)
- Full suite: ~60 seconds
- Individual suite: ~20 seconds
- Single test: ~2-3 seconds

---

## Troubleshooting

### Enable Debug Logging
```javascript
process.env.LOG_LEVEL = 'debug';
```

### View SQL Queries
```javascript
pool.on('query', (query) => {
  console.log('SQL:', query.text);
});
```

### Inspect Integration Results
```javascript
const result = await integration.someMethod();
console.log('Integration Result:', JSON.stringify(result, null, 2));
```

---

**End of Document**
