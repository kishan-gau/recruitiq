# Phase 10: Paylinq Product - Comprehensive Testing

**Duration:** 3 days  
**Dependencies:** Phase 9  
**Team:** QA Team (2 testers) + Backend Team  
**Status:** Not Started

---

## 📋 Overview

This phase implements comprehensive testing for the Paylinq product, including unit tests, integration tests, end-to-end tests, and payroll calculation validation tests. The goal is to ensure the payroll system is accurate, reliable, and secure before production deployment.

---

## 🎯 Objectives

1. Achieve 90%+ code coverage for all Paylinq backend code
2. Validate payroll calculation accuracy
3. Test tax calculation correctness
4. Verify integration with Nexus HRIS
5. Test access control and permissions
6. Perform security testing
7. Test performance with realistic payroll sizes

---

## 📊 Deliverables

### 1. Unit Tests - Repository Layer

**File:** `backend/tests/unit/products/paylinq/repositories/payrollRepository.test.js`

```javascript
/**
 * Payroll Repository Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PayrollRepository from '../../../../../src/products/paylinq/repositories/payrollRepository.js';
import * as dbQuery from '../../../../../src/shared/database/query.js';

vi.mock('../../../../../src/shared/database/query.js');

describe('PayrollRepository', () => {
  let repository;
  const mockOrgId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440000';
  
  beforeEach(() => {
    repository = new PayrollRepository();
    vi.clearAllMocks();
  });
  
  describe('createEmployeeRecord', () => {
    it('should create employee payroll record successfully', async () => {
      const employeeData = {
        employeeId: '770e8400-e29b-41d4-a716-446655440000',
        employeeNumber: 'EMP001',
        payFrequency: 'bi-weekly',
        paymentMethod: 'direct_deposit',
        currency: 'USD',
        startDate: '2025-01-01'
      };
      
      const expectedRecord = {
        id: '880e8400-e29b-41d4-a716-446655440000',
        ...employeeData,
        organization_id: mockOrgId,
        status: 'active',
        created_at: new Date()
      };
      
      vi.mocked(dbQuery.query).mockResolvedValue({
        rows: [expectedRecord],
        rowCount: 1
      });
      
      const result = await repository.createEmployeeRecord(employeeData, mockOrgId, mockUserId);
      
      expect(result).toEqual(expectedRecord);
      expect(dbQuery.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.employee_records'),
        expect.arrayContaining([
          mockOrgId,
          employeeData.employeeId,
          employeeData.employeeNumber,
          employeeData.payFrequency,
          employeeData.paymentMethod,
          employeeData.currency,
          'active',
          employeeData.startDate,
          mockUserId
        ]),
        mockOrgId,
        expect.objectContaining({ operation: 'INSERT', table: 'payroll.employee_records' })
      );
    });
  });
  
  describe('findByOrganization', () => {
    it('should find all employee records for organization', async () => {
      const mockEmployees = [
        { id: '1', employee_number: 'EMP001', status: 'active' },
        { id: '2', employee_number: 'EMP002', status: 'active' }
      ];
      
      vi.mocked(dbQuery.query).mockResolvedValue({
        rows: mockEmployees,
        rowCount: 2
      });
      
      const result = await repository.findByOrganization(mockOrgId);
      
      expect(result).toEqual(mockEmployees);
      expect(dbQuery.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [mockOrgId],
        mockOrgId,
        expect.any(Object)
      );
    });
    
    it('should filter by status', async () => {
      vi.mocked(dbQuery.query).mockResolvedValue({ rows: [], rowCount: 0 });
      
      await repository.findByOrganization(mockOrgId, { status: 'inactive' });
      
      expect(dbQuery.query).toHaveBeenCalledWith(
        expect.stringContaining('er.status = $2'),
        [mockOrgId, 'inactive'],
        mockOrgId,
        expect.any(Object)
      );
    });
  });
  
  describe('createPayrollRun', () => {
    it('should create payroll run successfully', async () => {
      const runData = {
        runNumber: 'PR-2025-01',
        runName: 'January 2025 Payroll',
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-15',
        paymentDate: '2025-01-20'
      };
      
      const expectedRun = {
        id: '990e8400-e29b-41d4-a716-446655440000',
        ...runData,
        organization_id: mockOrgId,
        status: 'draft',
        created_at: new Date()
      };
      
      vi.mocked(dbQuery.query).mockResolvedValue({
        rows: [expectedRun],
        rowCount: 1
      });
      
      const result = await repository.createPayrollRun(runData, mockOrgId, mockUserId);
      
      expect(result).toEqual(expectedRun);
      expect(result.status).toBe('draft');
    });
  });
  
  describe('createTimesheet', () => {
    it('should create timesheet successfully', async () => {
      const timesheetData = {
        employeeRecordId: '880e8400-e29b-41d4-a716-446655440000',
        periodStart: '2025-01-01',
        periodEnd: '2025-01-15',
        regularHours: 80,
        overtimeHours: 5,
        ptoHours: 0,
        sickHours: 0
      };
      
      const expectedTimesheet = {
        id: '111e8400-e29b-41d4-a716-446655440000',
        ...timesheetData,
        organization_id: mockOrgId,
        status: 'draft',
        created_at: new Date()
      };
      
      vi.mocked(dbQuery.query).mockResolvedValue({
        rows: [expectedTimesheet],
        rowCount: 1
      });
      
      const result = await repository.createTimesheet(timesheetData, mockOrgId, mockUserId);
      
      expect(result).toEqual(expectedTimesheet);
      expect(result.status).toBe('draft');
    });
  });
  
  describe('updateTimesheetStatus', () => {
    it('should approve timesheet successfully', async () => {
      const timesheetId = '111e8400-e29b-41d4-a716-446655440000';
      
      const expectedTimesheet = {
        id: timesheetId,
        status: 'approved',
        approved_by: mockUserId,
        approved_at: new Date()
      };
      
      vi.mocked(dbQuery.query).mockResolvedValue({
        rows: [expectedTimesheet],
        rowCount: 1
      });
      
      const result = await repository.updateTimesheetStatus(
        timesheetId,
        'approved',
        mockOrgId,
        mockUserId
      );
      
      expect(result.status).toBe('approved');
      expect(result.approved_by).toBe(mockUserId);
    });
  });
});
```

### 2. Unit Tests - Service Layer

**File:** `backend/tests/unit/products/paylinq/services/payrollService.test.js`

```javascript
/**
 * Payroll Service Unit Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PayrollService from '../../../../../src/products/paylinq/services/payrollService.js';
import PayrollRepository from '../../../../../src/products/paylinq/repositories/payrollRepository.js';
import { ValidationError, NotFoundError } from '../../../../../src/shared/utils/errors.js';

vi.mock('../../../../../src/products/paylinq/repositories/payrollRepository.js');

describe('PayrollService', () => {
  let service;
  let mockRepository;
  const mockOrgId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440000';
  
  beforeEach(() => {
    mockRepository = {
      createEmployeeRecord: vi.fn(),
      findByOrganization: vi.fn(),
      createPayrollRun: vi.fn(),
      findPayrollRunById: vi.fn(),
      createTimesheet: vi.fn(),
      updateTimesheetStatus: vi.fn(),
      findTimesheets: vi.fn(),
      findCurrentCompensation: vi.fn(),
      createPaycheck: vi.fn(),
      updatePayrollRunSummary: vi.fn()
    };
    service = new PayrollService(mockRepository);
    vi.clearAllMocks();
  });
  
  describe('createEmployeeRecord', () => {
    it('should validate and create employee record', async () => {
      const validData = {
        employeeId: '770e8400-e29b-41d4-a716-446655440000',
        employeeNumber: 'EMP001',
        payFrequency: 'bi-weekly',
        paymentMethod: 'direct_deposit',
        startDate: new Date('2025-01-01')
      };
      
      const expectedRecord = { id: '880e8400', ...validData };
      mockRepository.createEmployeeRecord.mockResolvedValue(expectedRecord);
      
      const result = await service.createEmployeeRecord(validData, mockOrgId, mockUserId);
      
      expect(result).toEqual(expectedRecord);
      expect(mockRepository.createEmployeeRecord).toHaveBeenCalledWith(
        expect.objectContaining(validData),
        mockOrgId,
        mockUserId
      );
    });
    
    it('should reject invalid pay frequency', async () => {
      const invalidData = {
        employeeId: '770e8400-e29b-41d4-a716-446655440000',
        employeeNumber: 'EMP001',
        payFrequency: 'invalid-frequency',
        paymentMethod: 'direct_deposit',
        startDate: new Date('2025-01-01')
      };
      
      await expect(service.createEmployeeRecord(invalidData, mockOrgId, mockUserId))
        .rejects.toThrow(ValidationError);
    });
    
    it('should reject missing required fields', async () => {
      const incompleteData = {
        employeeNumber: 'EMP001'
      };
      
      await expect(service.createEmployeeRecord(incompleteData, mockOrgId, mockUserId))
        .rejects.toThrow(ValidationError);
    });
  });
  
  describe('calculatePayroll', () => {
    it('should calculate payroll for hourly employees correctly', async () => {
      const payrollRunId = '990e8400-e29b-41d4-a716-446655440000';
      
      const mockPayrollRun = {
        id: payrollRunId,
        pay_period_start: '2025-01-01',
        pay_period_end: '2025-01-15',
        payment_date: '2025-01-20'
      };
      
      const mockEmployees = [{
        id: '880e8400',
        employee_number: 'EMP001',
        status: 'active',
        payment_method: 'direct_deposit'
      }];
      
      const mockTimesheets = [{
        regular_hours: 80,
        overtime_hours: 5
      }];
      
      const mockCompensation = {
        compensation_type: 'hourly',
        hourly_rate: 25.00,
        overtime_rate: 37.50
      };
      
      mockRepository.findPayrollRunById.mockResolvedValue(mockPayrollRun);
      mockRepository.findByOrganization.mockResolvedValue(mockEmployees);
      mockRepository.findTimesheets.mockResolvedValue(mockTimesheets);
      mockRepository.findCurrentCompensation.mockResolvedValue(mockCompensation);
      mockRepository.createPaycheck.mockResolvedValue({
        id: '111e8400',
        gross_pay: 2187.50,
        net_pay: 1650.00
      });
      mockRepository.updatePayrollRunSummary.mockResolvedValue({});
      
      const result = await service.calculatePayroll(payrollRunId, mockOrgId, mockUserId);
      
      expect(result.paychecks).toHaveLength(1);
      expect(mockRepository.createPaycheck).toHaveBeenCalled();
      
      const paycheckCall = mockRepository.createPaycheck.mock.calls[0][0];
      expect(paycheckCall.grossPay).toBe(2187.50); // (80 * 25) + (5 * 37.50)
      expect(paycheckCall.regularPay).toBe(2000.00);
      expect(paycheckCall.overtimePay).toBe(187.50);
    });
    
    it('should calculate payroll for salaried employees correctly', async () => {
      const payrollRunId = '990e8400-e29b-41d4-a716-446655440000';
      
      mockRepository.findPayrollRunById.mockResolvedValue({
        id: payrollRunId,
        pay_period_start: '2025-01-01',
        pay_period_end: '2025-01-15',
        payment_date: '2025-01-20'
      });
      
      mockRepository.findByOrganization.mockResolvedValue([{
        id: '880e8400',
        employee_number: 'EMP001',
        status: 'active',
        payment_method: 'direct_deposit'
      }]);
      
      mockRepository.findTimesheets.mockResolvedValue([]);
      
      mockRepository.findCurrentCompensation.mockResolvedValue({
        compensation_type: 'salary',
        pay_period_amount: 5000.00
      });
      
      mockRepository.createPaycheck.mockResolvedValue({
        id: '111e8400',
        gross_pay: 5000.00,
        net_pay: 3750.00
      });
      
      mockRepository.updatePayrollRunSummary.mockResolvedValue({});
      
      const result = await service.calculatePayroll(payrollRunId, mockOrgId, mockUserId);
      
      const paycheckCall = mockRepository.createPaycheck.mock.calls[0][0];
      expect(paycheckCall.grossPay).toBe(5000.00);
      expect(paycheckCall.regularPay).toBe(5000.00);
      expect(paycheckCall.overtimePay).toBe(0);
    });
    
    it('should throw NotFoundError if payroll run does not exist', async () => {
      const payrollRunId = 'non-existent';
      
      mockRepository.findPayrollRunById.mockResolvedValue(null);
      
      await expect(service.calculatePayroll(payrollRunId, mockOrgId, mockUserId))
        .rejects.toThrow(NotFoundError);
    });
  });
  
  describe('calculateTaxes', () => {
    it('should calculate taxes correctly', async () => {
      const grossPay = 2000.00;
      const employee = {
        tax_filing_status: 'single',
        tax_allowances: 0
      };
      
      const taxes = await service.calculateTaxes(grossPay, employee, mockOrgId);
      
      expect(taxes.federalTax).toBe(240.00);      // 12%
      expect(taxes.stateTax).toBe(100.00);        // 5%
      expect(taxes.socialSecurity).toBe(124.00);  // 6.2%
      expect(taxes.medicare).toBe(29.00);         // 1.45%
      
      const totalTaxes = taxes.federalTax + taxes.stateTax + taxes.socialSecurity + taxes.medicare;
      expect(totalTaxes).toBe(493.00);
    });
  });
  
  describe('approveTimesheet', () => {
    it('should approve timesheet successfully', async () => {
      const timesheetId = '111e8400-e29b-41d4-a716-446655440000';
      
      const approvedTimesheet = {
        id: timesheetId,
        status: 'approved',
        approved_by: mockUserId,
        approved_at: new Date()
      };
      
      mockRepository.updateTimesheetStatus.mockResolvedValue(approvedTimesheet);
      
      const result = await service.approveTimesheet(timesheetId, mockOrgId, mockUserId);
      
      expect(result.status).toBe('approved');
      expect(mockRepository.updateTimesheetStatus).toHaveBeenCalledWith(
        timesheetId,
        'approved',
        mockOrgId,
        mockUserId
      );
    });
    
    it('should throw NotFoundError if timesheet does not exist', async () => {
      const timesheetId = 'non-existent';
      
      mockRepository.updateTimesheetStatus.mockResolvedValue(null);
      
      await expect(service.approveTimesheet(timesheetId, mockOrgId, mockUserId))
        .rejects.toThrow(NotFoundError);
    });
  });
});
```

### 3. Integration Tests

**File:** `backend/tests/integration/products/paylinq/payroll.integration.test.js`

```javascript
/**
 * Payroll Integration Tests
 * Tests complete payroll workflow end-to-end
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../../src/server.js';
import { setupTestDatabase, teardownTestDatabase, createTestUser } from '../../../helpers/testSetup.js';

describe('Payroll Integration Tests', () => {
  let authToken;
  let organizationId;
  let employeeRecordId;
  let payrollRunId;
  
  beforeAll(async () => {
    await setupTestDatabase();
    const { token, user } = await createTestUser({ role: 'admin' });
    authToken = token;
    organizationId = user.organization_id;
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  describe('Complete Payroll Workflow', () => {
    it('should complete full payroll cycle', async () => {
      // Step 1: Create employee record
      const employeeResponse = await request(app)
        .post('/api/payroll/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId: '770e8400-e29b-41d4-a716-446655440000',
          employeeNumber: 'EMP001',
          payFrequency: 'bi-weekly',
          paymentMethod: 'direct_deposit',
          startDate: '2025-01-01'
        });
      
      expect(employeeResponse.status).toBe(201);
      expect(employeeResponse.body.success).toBe(true);
      employeeRecordId = employeeResponse.body.data.id;
      
      // Step 2: Create compensation
      const compensationResponse = await request(app)
        .post(`/api/payroll/employees/${employeeRecordId}/compensation`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          compensationType: 'hourly',
          hourlyRate: 25.00,
          overtimeRate: 37.50,
          effectiveDate: '2025-01-01'
        });
      
      expect(compensationResponse.status).toBe(201);
      
      // Step 3: Create timesheet
      const timesheetResponse = await request(app)
        .post('/api/payroll/timesheets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeRecordId,
          periodStart: '2025-01-01',
          periodEnd: '2025-01-15',
          regularHours: 80,
          overtimeHours: 5
        });
      
      expect(timesheetResponse.status).toBe(201);
      const timesheetId = timesheetResponse.body.data.id;
      
      // Step 4: Approve timesheet
      const approvalResponse = await request(app)
        .put(`/api/payroll/timesheets/${timesheetId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(approvalResponse.status).toBe(200);
      expect(approvalResponse.body.data.status).toBe('approved');
      
      // Step 5: Create payroll run
      const payrollRunResponse = await request(app)
        .post('/api/payroll/runs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          runNumber: 'PR-2025-01',
          runName: 'January 2025 Payroll',
          payPeriodStart: '2025-01-01',
          payPeriodEnd: '2025-01-15',
          paymentDate: '2025-01-20'
        });
      
      expect(payrollRunResponse.status).toBe(201);
      payrollRunId = payrollRunResponse.body.data.id;
      
      // Step 6: Calculate payroll
      const calculateResponse = await request(app)
        .post(`/api/payroll/runs/${payrollRunId}/calculate`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(calculateResponse.status).toBe(200);
      expect(calculateResponse.body.data.paychecks).toHaveLength(1);
      
      const paycheck = calculateResponse.body.data.paychecks[0];
      expect(paycheck.gross_pay).toBe('2187.50');
      expect(paycheck.regular_pay).toBe('2000.00');
      expect(paycheck.overtime_pay).toBe('187.50');
      expect(parseFloat(paycheck.net_pay)).toBeLessThan(parseFloat(paycheck.gross_pay));
      
      // Step 7: Verify payroll run summary
      const summaryResponse = await request(app)
        .get(`/api/payroll/runs/${payrollRunId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse.body.data.status).toBe('calculated');
      expect(summaryResponse.body.data.total_employees).toBe(1);
    });
  });
  
  describe('Access Control', () => {
    it('should prevent unauthorized access to payroll data', async () => {
      const { token: unauthorizedToken } = await createTestUser({ 
        role: 'user',
        organizationId: 'different-org'
      });
      
      const response = await request(app)
        .get('/api/payroll/employees')
        .set('Authorization', `Bearer ${unauthorizedToken}`);
      
      expect(response.status).toBe(403);
    });
    
    it('should allow manager to approve timesheets', async () => {
      const { token: managerToken } = await createTestUser({ 
        role: 'manager',
        organizationId
      });
      
      const response = await request(app)
        .put(`/api/payroll/timesheets/some-id/approve`)
        .set('Authorization', `Bearer ${managerToken}`);
      
      expect(response.status).not.toBe(403);
    });
  });
});
```

---

## 🔍 Detailed Tasks

### Task 10.1: Unit Tests - Repository Layer (0.5 days)

**Assignee:** QA Engineer 1

**Actions:**
1. ✅ Test all repository methods
2. ✅ Mock database queries
3. ✅ Test error scenarios
4. ✅ Verify SQL queries
5. ✅ Achieve 90%+ coverage

**Standards:** Follow TESTING_STANDARDS.md

### Task 10.2: Unit Tests - Service Layer (1 day)

**Assignee:** QA Engineer 2

**Actions:**
1. ✅ Test all service methods
2. ✅ Test validation logic
3. ✅ Test calculation logic (payroll, taxes)
4. ✅ Test error handling
5. ✅ Achieve 90%+ coverage

**Standards:** Follow TESTING_STANDARDS.md

### Task 10.3: Integration Tests (1 day)

**Assignee:** QA Engineer 1 + Backend Dev

**Actions:**
1. ✅ Test complete payroll workflow
2. ✅ Test API endpoints end-to-end
3. ✅ Test access control
4. ✅ Test database transactions
5. ✅ Verify data integrity

**Standards:** Follow TESTING_STANDARDS.md

### Task 10.4: Payroll Calculation Tests (0.5 days)

**Assignee:** QA Engineer 2

**Actions:**
1. ✅ Test hourly calculations
2. ✅ Test salary calculations
3. ✅ Test overtime calculations
4. ✅ Test tax calculations
5. ✅ Verify against known payroll examples

**Standards:** Accuracy is critical

### Task 10.5: Performance Tests (0.5 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Test with 100 employees
2. ✅ Test with 500 employees
3. ✅ Test with 1000 employees
4. ✅ Measure calculation time
5. ✅ Identify bottlenecks

**Standards:** Follow PERFORMANCE_STANDARDS.md

### Task 10.6: Security Tests (0.5 days)

**Assignee:** QA Engineer 1

**Actions:**
1. ✅ Test authentication
2. ✅ Test authorization
3. ✅ Test data isolation
4. ✅ Test input validation
5. ✅ Test sensitive data protection

**Standards:** Follow SECURITY_STANDARDS.md

---

## 📋 Standards Compliance Checklist

- [ ] All tests follow TESTING_STANDARDS.md
- [ ] Unit test coverage ≥ 90%
- [ ] Integration tests cover critical paths
- [ ] Payroll calculations verified accurate
- [ ] Performance tests meet targets
- [ ] Security tests pass
- [ ] All tests automated in CI/CD

---

## 🎯 Success Criteria

Phase 10 is complete when:

1. ✅ All unit tests pass (90%+ coverage)
2. ✅ All integration tests pass
3. ✅ Payroll calculations verified accurate
4. ✅ Tax calculations verified correct
5. ✅ Performance tests meet targets (<5s for 1000 employees)
6. ✅ Security tests pass
7. ✅ All tests automated and running in CI/CD
8. ✅ Test documentation complete
9. ✅ Coverage report generated
10. ✅ QA sign-off obtained

---

## 📤 Outputs

### Tests Created
- [ ] Repository unit tests (90%+ coverage)
- [ ] Service unit tests (90%+ coverage)
- [ ] Integration tests (end-to-end workflows)
- [ ] Payroll calculation tests
- [ ] Performance tests
- [ ] Security tests

### Documentation Created
- [ ] Test plan
- [ ] Test results report
- [ ] Coverage report
- [ ] Performance test results

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Calculation inaccuracies | Critical | Extensive test cases; manual verification |
| Insufficient test coverage | High | Automated coverage reporting; enforce 90% minimum |
| Performance issues undetected | Medium | Comprehensive performance testing |
| Security vulnerabilities | Critical | Security-focused test suite |

---

## 🔗 Related Phases

- **Previous:** [Phase 9: Paylinq Product - Backend](./PHASE_09_PAYLINQ_BACKEND.md)
- **Next:** [Phase 11: Nexus Product - Database](./PHASE_11_NEXUS_DATABASE.md)
- **Related:** [Phase 7: Integration Bus](./PHASE_07_INTEGRATION_BUS.md)

---

## ⏭️ Next Phase

**[Phase 11: Nexus Product - Database Schema](./PHASE_11_NEXUS_DATABASE.md)**

Upon completion of Phase 10, proceed to Phase 11 to begin Nexus HRIS product implementation.

---

**Phase Owner:** QA Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start
