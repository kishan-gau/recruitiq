# Phase 13: Nexus Product - Comprehensive Testing

**Duration:** 3 days  
**Dependencies:** Phase 12  
**Team:** QA Team (2 testers) + Backend Team  
**Status:** Not Started

---

## 📋 Overview

This phase implements comprehensive testing for the Nexus HRIS product, including unit tests, integration tests, end-to-end workflows, and business logic validation. The goal is to ensure the HRIS system is reliable, accurate, and meets all business requirements.

---

## 🎯 Objectives

1. Achieve 90%+ code coverage for all Nexus backend code
2. Validate employee lifecycle workflows
3. Test time-off accrual and approval logic
4. Verify integration with recruitment and payroll
5. Test organizational hierarchy functionality
6. Perform security and access control testing
7. Test performance with realistic employee counts

---

## 📊 Key Test Suites

### 1. Employee Service Unit Tests

**File:** `backend/tests/unit/products/nexus/services/employeeService.test.js`

```javascript
/**
 * Employee Service Unit Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import EmployeeService from '../../../../../src/products/nexus/services/employeeService.js';
import EmployeeRepository from '../../../../../src/products/nexus/repositories/employeeRepository.js';
import { ValidationError, NotFoundError } from '../../../../../src/shared/utils/errors.js';
import * as integrationBus from '../../../../../src/products/core/services/integrationBus.js';

vi.mock('../../../../../src/products/nexus/repositories/employeeRepository.js');
vi.mock('../../../../../src/products/core/services/integrationBus.js');

describe('EmployeeService', () => {
  let service;
  let mockRepository;
  const mockOrgId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440000';
  
  beforeEach(() => {
    mockRepository = {
      createEmployee: vi.fn(),
      findByOrganization: vi.fn(),
      updateEmployee: vi.fn(),
      findActivePolicies: vi.fn(),
      createTimeOffBalance: vi.fn()
    };
    service = new EmployeeService(mockRepository);
    vi.clearAllMocks();
  });
  
  describe('createEmployee', () => {
    it('should validate and create employee successfully', async () => {
      const validData = {
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        hireDate: new Date('2025-01-01'),
        employmentType: 'full-time',
        jobTitle: 'Software Engineer'
      };
      
      const expectedEmployee = {
        id: '770e8400-e29b-41d4-a716-446655440000',
        ...validData
      };
      
      mockRepository.createEmployee.mockResolvedValue(expectedEmployee);
      mockRepository.findActivePolicies.mockResolvedValue([]);
      vi.mocked(integrationBus.publishEvent).mockResolvedValue();
      
      const result = await service.createEmployee(validData, mockOrgId, mockUserId);
      
      expect(result).toEqual(expectedEmployee);
      expect(mockRepository.createEmployee).toHaveBeenCalledWith(
        expect.objectContaining(validData),
        mockOrgId,
        mockUserId
      );
      expect(integrationBus.publishEvent).toHaveBeenCalledWith(
        'employee.created',
        expect.objectContaining({
          employeeId: expectedEmployee.id,
          organizationId: mockOrgId
        })
      );
    });
    
    it('should reject invalid employment type', async () => {
      const invalidData = {
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        hireDate: new Date('2025-01-01'),
        employmentType: 'invalid-type',
        jobTitle: 'Software Engineer'
      };
      
      await expect(service.createEmployee(invalidData, mockOrgId, mockUserId))
        .rejects.toThrow(ValidationError);
    });
    
    it('should initialize time off balances for new employee', async () => {
      const validData = {
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        hireDate: new Date('2025-01-01'),
        employmentType: 'full-time',
        jobTitle: 'Software Engineer'
      };
      
      const mockPolicies = [
        { id: 'policy1', accrual_amount: 15 },
        { id: 'policy2', accrual_amount: 5 }
      ];
      
      mockRepository.createEmployee.mockResolvedValue({ id: 'emp1', ...validData });
      mockRepository.findActivePolicies.mockResolvedValue(mockPolicies);
      mockRepository.createTimeOffBalance.mockResolvedValue({});
      vi.mocked(integrationBus.publishEvent).mockResolvedValue();
      
      await service.createEmployee(validData, mockOrgId, mockUserId);
      
      expect(mockRepository.createTimeOffBalance).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('terminateEmployee', () => {
    it('should terminate employee and publish event', async () => {
      const employeeId = '770e8400-e29b-41d4-a716-446655440000';
      const terminationData = {
        terminationDate: new Date('2025-12-31'),
        reason: 'Resignation'
      };
      
      const terminatedEmployee = {
        id: employeeId,
        employment_status: 'terminated',
        termination_date: terminationData.terminationDate
      };
      
      mockRepository.updateEmployee.mockResolvedValue(terminatedEmployee);
      vi.mocked(integrationBus.publishEvent).mockResolvedValue();
      
      const result = await service.terminateEmployee(
        employeeId,
        terminationData,
        mockOrgId,
        mockUserId
      );
      
      expect(result.employment_status).toBe('terminated');
      expect(integrationBus.publishEvent).toHaveBeenCalledWith(
        'employee.terminated',
        expect.objectContaining({
          employeeId,
          terminationDate: terminationData.terminationDate
        })
      );
    });
    
    it('should throw NotFoundError if employee does not exist', async () => {
      mockRepository.updateEmployee.mockResolvedValue(null);
      
      await expect(service.terminateEmployee(
        'non-existent',
        { terminationDate: new Date() },
        mockOrgId,
        mockUserId
      )).rejects.toThrow(NotFoundError);
    });
  });
  
  describe('getOrganizationalChart', () => {
    it('should build hierarchical org chart', async () => {
      const mockEmployees = [
        { id: '1', name: 'CEO', manager_id: null },
        { id: '2', name: 'VP Eng', manager_id: '1' },
        { id: '3', name: 'Dev1', manager_id: '2' },
        { id: '4', name: 'Dev2', manager_id: '2' }
      ];
      
      mockRepository.findByOrganization.mockResolvedValue(mockEmployees);
      
      const chart = await service.getOrganizationalChart(mockOrgId);
      
      expect(chart).toHaveLength(1); // One root (CEO)
      expect(chart[0].reports).toHaveLength(1); // VP Eng reports to CEO
      expect(chart[0].reports[0].reports).toHaveLength(2); // 2 devs report to VP
    });
  });
});
```

### 2. Time Off Service Unit Tests

**File:** `backend/tests/unit/products/nexus/services/timeOffService.test.js`

```javascript
/**
 * Time Off Service Unit Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import TimeOffService from '../../../../../src/products/nexus/services/timeOffService.js';
import TimeOffRepository from '../../../../../src/products/nexus/repositories/timeOffRepository.js';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../../../src/shared/utils/errors.js';

vi.mock('../../../../../src/products/nexus/repositories/timeOffRepository.js');

describe('TimeOffService', () => {
  let service;
  let mockRepository;
  const mockOrgId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440000';
  
  beforeEach(() => {
    mockRepository = {
      createTimeOffRequest: vi.fn(),
      findPolicyById: vi.fn(),
      findBalance: vi.fn(),
      updateBalance: vi.fn(),
      findRequestById: vi.fn(),
      updateRequestStatus: vi.fn(),
      findActivePolicies: vi.fn(),
      findBalancesByPolicy: vi.fn()
    };
    service = new TimeOffService(mockRepository);
    vi.clearAllMocks();
  });
  
  describe('createTimeOffRequest', () => {
    it('should create time off request with sufficient balance', async () => {
      const requestData = {
        employeeId: '770e8400',
        policyId: '880e8400',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        totalDays: 5,
        requestNote: 'Holiday vacation'
      };
      
      const mockPolicy = {
        id: '880e8400',
        policy_name: 'PTO',
        min_notice_days: 7
      };
      
      const mockBalance = {
        id: 'balance1',
        available_balance: 15,
        pending_balance: 0
      };
      
      mockRepository.findPolicyById.mockResolvedValue(mockPolicy);
      mockRepository.findBalance.mockResolvedValue(mockBalance);
      mockRepository.createTimeOffRequest.mockResolvedValue({ id: 'request1', ...requestData });
      mockRepository.updateBalance.mockResolvedValue({});
      
      const result = await service.createTimeOffRequest(requestData, mockOrgId, mockUserId);
      
      expect(result.totalDays).toBe(5);
      expect(mockRepository.updateBalance).toHaveBeenCalledWith(
        'balance1',
        expect.objectContaining({
          pendingBalance: 5
        }),
        mockOrgId
      );
    });
    
    it('should reject request with insufficient balance', async () => {
      const requestData = {
        employeeId: '770e8400',
        policyId: '880e8400',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-05'),
        totalDays: 5
      };
      
      mockRepository.findPolicyById.mockResolvedValue({ id: '880e8400', min_notice_days: 0 });
      mockRepository.findBalance.mockResolvedValue({ available_balance: 2 });
      
      await expect(service.createTimeOffRequest(requestData, mockOrgId, mockUserId))
        .rejects.toThrow(BusinessRuleError);
    });
    
    it('should reject request with insufficient notice', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const requestData = {
        employeeId: '770e8400',
        policyId: '880e8400',
        startDate: tomorrow,
        endDate: new Date(tomorrow.getTime() + 5 * 24 * 60 * 60 * 1000),
        totalDays: 5
      };
      
      mockRepository.findPolicyById.mockResolvedValue({ 
        id: '880e8400', 
        min_notice_days: 14 // Requires 14 days notice
      });
      mockRepository.findBalance.mockResolvedValue({ available_balance: 15 });
      
      await expect(service.createTimeOffRequest(requestData, mockOrgId, mockUserId))
        .rejects.toThrow(BusinessRuleError);
    });
  });
  
  describe('approveTimeOffRequest', () => {
    it('should approve pending request and update balance', async () => {
      const requestId = 'request1';
      
      const mockRequest = {
        id: requestId,
        employee_id: 'emp1',
        policy_id: 'policy1',
        start_date: '2025-12-01',
        status: 'pending',
        total_days: 5
      };
      
      const mockBalance = {
        id: 'balance1',
        available_balance: 15,
        pending_balance: 5,
        used_balance: 0
      };
      
      mockRepository.findRequestById.mockResolvedValue(mockRequest);
      mockRepository.updateRequestStatus.mockResolvedValue({ ...mockRequest, status: 'approved' });
      mockRepository.findBalance.mockResolvedValue(mockBalance);
      mockRepository.updateBalance.mockResolvedValue({});
      
      const result = await service.approveTimeOffRequest(requestId, mockOrgId, mockUserId);
      
      expect(result.status).toBe('approved');
      expect(mockRepository.updateBalance).toHaveBeenCalledWith(
        'balance1',
        expect.objectContaining({
          availableBalance: 10, // 15 - 5
          pendingBalance: 0,    // 5 - 5
          usedBalance: 5        // 0 + 5
        }),
        mockOrgId
      );
    });
    
    it('should reject approval of non-pending request', async () => {
      mockRepository.findRequestById.mockResolvedValue({
        id: 'request1',
        status: 'approved'
      });
      
      await expect(service.approveTimeOffRequest('request1', mockOrgId, mockUserId))
        .rejects.toThrow(BusinessRuleError);
    });
  });
  
  describe('processAccruals', () => {
    it('should process monthly accruals correctly', async () => {
      const mockPolicies = [{
        id: 'policy1',
        accrual_method: 'monthly',
        accrual_amount: 1.25,
        max_balance: 15
      }];
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const mockBalances = [{
        id: 'balance1',
        available_balance: 10,
        next_accrual_date: yesterday
      }];
      
      mockRepository.findActivePolicies.mockResolvedValue(mockPolicies);
      mockRepository.findBalancesByPolicy.mockResolvedValue(mockBalances);
      mockRepository.updateBalance.mockResolvedValue({});
      
      await service.processAccruals(mockOrgId);
      
      expect(mockRepository.updateBalance).toHaveBeenCalledWith(
        'balance1',
        expect.objectContaining({
          availableBalance: 11.25, // 10 + 1.25
          lastAccrualDate: expect.any(Date),
          nextAccrualDate: expect.any(Date)
        }),
        mockOrgId
      );
    });
    
    it('should respect maximum balance limit', async () => {
      const mockPolicies = [{
        id: 'policy1',
        accrual_method: 'monthly',
        accrual_amount: 2,
        max_balance: 15
      }];
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const mockBalances = [{
        id: 'balance1',
        available_balance: 14, // Already near max
        next_accrual_date: yesterday
      }];
      
      mockRepository.findActivePolicies.mockResolvedValue(mockPolicies);
      mockRepository.findBalancesByPolicy.mockResolvedValue(mockBalances);
      mockRepository.updateBalance.mockResolvedValue({});
      
      await service.processAccruals(mockOrgId);
      
      expect(mockRepository.updateBalance).toHaveBeenCalledWith(
        'balance1',
        expect.objectContaining({
          availableBalance: 15 // Capped at max_balance
        }),
        mockOrgId
      );
    });
  });
});
```

### 3. Integration Tests - Employee Lifecycle

**File:** `backend/tests/integration/products/nexus/employee-lifecycle.integration.test.js`

```javascript
/**
 * Employee Lifecycle Integration Tests
 * Tests complete employee journey from hire to termination
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../../src/server.js';
import { setupTestDatabase, teardownTestDatabase, createTestUser } from '../../../helpers/testSetup.js';

describe('Employee Lifecycle Integration Tests', () => {
  let authToken;
  let organizationId;
  let employeeId;
  
  beforeAll(async () => {
    await setupTestDatabase();
    const { token, user } = await createTestUser({ role: 'admin' });
    authToken = token;
    organizationId = user.organization_id;
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  describe('Complete Employee Lifecycle', () => {
    it('should handle complete employee lifecycle', async () => {
      // Step 1: Create employee
      const createResponse = await request(app)
        .post('/api/hris/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeNumber: 'EMP001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          hireDate: '2025-01-01',
          employmentType: 'full-time',
          jobTitle: 'Software Engineer'
        });
      
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      employeeId = createResponse.body.data.id;
      
      // Step 2: Verify time off balances initialized
      const balancesResponse = await request(app)
        .get(`/api/hris/employees/${employeeId}/time-off-balances`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(balancesResponse.status).toBe(200);
      expect(balancesResponse.body.data.length).toBeGreaterThan(0);
      
      // Step 3: Update employee information
      const updateResponse = await request(app)
        .put(`/api/hris/employees/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobTitle: 'Senior Software Engineer',
          phone: '+1-555-0123'
        });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.job_title).toBe('Senior Software Engineer');
      
      // Step 4: Create time off request
      const policy = balancesResponse.body.data[0];
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      
      const timeOffResponse = await request(app)
        .post('/api/hris/time-off/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId,
          policyId: policy.policy_id,
          startDate: futureDate.toISOString().split('T')[0],
          endDate: new Date(futureDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          totalDays: 5,
          requestNote: 'Vacation'
        });
      
      expect(timeOffResponse.status).toBe(201);
      
      // Step 5: Approve time off request
      const approveResponse = await request(app)
        .put(`/api/hris/time-off/requests/${timeOffResponse.body.data.id}/approve`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.data.status).toBe('approved');
      
      // Step 6: Terminate employee
      const terminateResponse = await request(app)
        .put(`/api/hris/employees/${employeeId}/terminate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          terminationDate: '2025-12-31',
          reason: 'Resignation'
        });
      
      expect(terminateResponse.status).toBe(200);
      expect(terminateResponse.body.data.employment_status).toBe('terminated');
    });
  });
  
  describe('Integration with Recruitment', () => {
    it('should create employee from hired candidate', async () => {
      // Simulate candidate.hired event
      const candidateData = {
        candidateId: 'candidate-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        jobTitle: 'Product Manager',
        hireDate: '2025-02-01'
      };
      
      // This would typically be triggered by integration bus
      const response = await request(app)
        .post('/api/hris/employees/from-candidate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(candidateData);
      
      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe(candidateData.email);
    });
  });
});
```

---

## 🔍 Detailed Tasks

### Task 13.1: Unit Tests - Repository Layer (0.5 days)

**Assignee:** QA Engineer 1

**Actions:**
1. Test all repository methods
2. Mock database queries
3. Test error scenarios
4. Achieve 90%+ coverage

**Standards:** Follow TESTING_STANDARDS.md

### Task 13.2: Unit Tests - Service Layer (1 day)

**Assignee:** QA Engineer 2

**Actions:**
1. Test all service methods
2. Test validation logic
3. Test business rules (time-off, org chart)
4. Test integration events
5. Achieve 90%+ coverage

**Standards:** Follow TESTING_STANDARDS.md

### Task 13.3: Integration Tests (1 day)

**Assignee:** QA Engineer 1 + Backend Dev

**Actions:**
1. Test complete employee lifecycle
2. Test time-off workflows
3. Test integration with other products
4. Test API endpoints end-to-end
5. Verify data integrity

**Standards:** Follow TESTING_STANDARDS.md

### Task 13.4: Performance Tests (0.5 days)

**Assignee:** Backend Developer

**Actions:**
1. Test with 500 employees
2. Test organizational chart with deep hierarchies
3. Test time-off accrual processing
4. Measure query performance
5. Identify bottlenecks

**Standards:** Follow PERFORMANCE_STANDARDS.md

### Task 13.5: Security Tests (0.5 days)

**Assignee:** QA Engineer 2

**Actions:**
1. Test authentication/authorization
2. Test data isolation
3. Test document access controls
4. Test sensitive data protection
5. Test input validation

**Standards:** Follow SECURITY_STANDARDS.md

### Task 13.6: Business Logic Validation (0.5 days)

**Assignee:** QA Team + Product Owner

**Actions:**
1. Validate time-off accrual rules
2. Validate organizational hierarchy
3. Validate employee status transitions
4. Test edge cases
5. Document test results

**Standards:** Business requirements

---

## 📋 Standards Compliance Checklist

- [ ] All tests follow TESTING_STANDARDS.md
- [ ] Unit test coverage ≥ 90%
- [ ] Integration tests cover critical paths
- [ ] Business logic verified accurate
- [ ] Performance tests meet targets
- [ ] Security tests pass
- [ ] All tests automated in CI/CD

---

## 🎯 Success Criteria

Phase 13 is complete when:

1. ✅ All unit tests pass (90%+ coverage)
2. ✅ All integration tests pass
3. ✅ Employee lifecycle workflows verified
4. ✅ Time-off logic verified correct
5. ✅ Integration with other products working
6. ✅ Performance tests meet targets
7. ✅ Security tests pass
8. ✅ All tests automated and running in CI/CD
9. ✅ QA sign-off obtained

---

## 📤 Outputs

### Tests Created
- [ ] Repository unit tests
- [ ] Service unit tests
- [ ] Integration tests
- [ ] Performance tests
- [ ] Security tests

### Documentation Created
- [ ] Test plan
- [ ] Test results report
- [ ] Coverage report

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Time-off calculation errors | High | Extensive test cases; manual verification |
| Organizational hierarchy bugs | Medium | Recursive query testing |
| Integration failures | High | Comprehensive integration tests |
| Performance issues | Medium | Load testing with realistic data |

---

## 🔗 Related Phases

- **Previous:** [Phase 12: Nexus Product - Backend](./PHASE_12_NEXUS_BACKEND.md)
- **Next:** [Phase 14: Cross-Product Integration - RecruitIQ to Nexus](./PHASE_14_INTEGRATION_RECRUIT_HRIS.md)
- **Related:** [Phase 10: Paylinq Testing](./PHASE_10_PAYLINQ_TESTING.md)

---

**Phase Owner:** QA Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start
