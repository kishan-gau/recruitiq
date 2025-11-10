/**
 * TimeOffRepository Unit Tests
 */

import { jest } from '@jest/globals';
import TimeOffRepository from '../../../src/products/nexus/repositories/timeOffRepository.js';

const mockQuery = jest.fn();
jest.unstable_mockModule('../../../src/shared/database/query.js', () => ({
  query: mockQuery
}));

describe('TimeOffRepository', () => {
  let repository;
  const organizationId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    repository = new TimeOffRepository();
    mockQuery.mockClear();
  });

  describe('Time-Off Types', () => {
    it('should create time-off type', async () => {
      const typeData = {
        typeName: 'Vacation',
        description: 'Annual vacation leave',
        defaultDaysPerYear: 20,
        isPaid: true,
        requiresApproval: true
      };

      mockQuery.mockResolvedValue({
        rows: [{
          id: 'type-1',
          type_name: 'Vacation',
          description: 'Annual vacation leave',
          default_days_per_year: 20,
          is_paid: true,
          requires_approval: true
        }]
      });

      const result = await repository.createType(typeData, organizationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.arrayContaining([organizationId, 'Vacation']),
        organizationId
      );
      expect(result.typeName).toBe('Vacation');
      expect(result.defaultDaysPerYear).toBe(20);
    });

    it('should find all time-off types', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { id: 'type-1', type_name: 'Vacation', default_days_per_year: 20 },
          { id: 'type-2', type_name: 'Sick Leave', default_days_per_year: 10 }
        ]
      });

      const result = await repository.findAllTypes(organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [organizationId],
        organizationId
      );
      expect(result).toHaveLength(2);
      expect(result[0].typeName).toBe('Vacation');
    });
  });

  describe('Time-Off Balances', () => {
    it('should find employee balance by type', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          id: 'balance-1',
          employee_id: 'emp-1',
          time_off_type_id: 'type-1',
          total_balance: 20,
          used_balance: 5,
          available_balance: 15,
          type_name: 'Vacation'
        }]
      });

      const result = await repository.findBalance('emp-1', 'type-1', organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN'),
        ['emp-1', 'type-1', organizationId],
        organizationId
      );
      expect(result.totalBalance).toBe(20);
      expect(result.availableBalance).toBe(15);
    });

    it('should find all balances for employee', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'balance-1',
            time_off_type_id: 'type-1',
            total_balance: 20,
            available_balance: 15,
            type_name: 'Vacation'
          },
          {
            id: 'balance-2',
            time_off_type_id: 'type-2',
            total_balance: 10,
            available_balance: 8,
            type_name: 'Sick Leave'
          }
        ]
      });

      const result = await repository.findBalancesByEmployee('emp-1', organizationId);

      expect(result).toHaveLength(2);
      expect(result[0].typeName).toBe('Vacation');
      expect(result[1].typeName).toBe('Sick Leave');
    });

    it('should update balance', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          id: 'balance-1',
          total_balance: 25,
          used_balance: 5,
          available_balance: 20
        }]
      });

      const updates = {
        totalBalance: 25,
        availableBalance: 20
      };

      const result = await repository.updateBalance('balance-1', updates, organizationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining([25, 20]),
        organizationId
      );
      expect(result.totalBalance).toBe(25);
      expect(result.availableBalance).toBe(20);
    });
  });

  describe('Time-Off Requests', () => {
    it('should create time-off request', async () => {
      const requestData = {
        employeeId: 'emp-1',
        timeOffTypeId: 'type-1',
        startDate: '2024-07-01',
        endDate: '2024-07-05',
        daysRequested: 5,
        reason: 'Summer vacation',
        status: 'pending'
      };

      mockQuery.mockResolvedValue({
        rows: [{
          id: 'request-1',
          employee_id: 'emp-1',
          time_off_type_id: 'type-1',
          start_date: '2024-07-01',
          end_date: '2024-07-05',
          days_requested: 5,
          status: 'pending'
        }]
      });

      const result = await repository.createRequest(requestData, organizationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.arrayContaining([organizationId, 'emp-1', 'type-1', 5]),
        organizationId
      );
      expect(result.id).toBe('request-1');
      expect(result.status).toBe('pending');
    });

    it('should find request by ID with employee details', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          id: 'request-1',
          employee_id: 'emp-1',
          employee_name: 'John Doe',
          type_name: 'Vacation',
          days_requested: 5,
          status: 'pending'
        }]
      });

      const result = await repository.findRequestById('request-1', organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN'),
        ['request-1', organizationId],
        organizationId
      );
      expect(result.employeeName).toBe('John Doe');
      expect(result.typeName).toBe('Vacation');
    });

    it('should update request status', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          id: 'request-1',
          status: 'approved',
          reviewed_by: 'user-456',
          reviewer_notes: 'Approved for vacation'
        }]
      });

      const result = await repository.updateRequestStatus(
        'request-1',
        'approved',
        userId,
        'Approved for vacation',
        organizationId
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining(['approved', userId, 'Approved for vacation']),
        organizationId
      );
      expect(result.status).toBe('approved');
      expect(result.reviewerNotes).toBe('Approved for vacation');
    });

    it('should find all requests with filters', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { id: 'request-1', employee_name: 'John Doe', status: 'pending' },
          { id: 'request-2', employee_name: 'Jane Smith', status: 'pending' }
        ]
      });

      const filters = { status: 'pending' };
      const result = await repository.findAllRequests(filters, organizationId, { limit: 50, offset: 0 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining([organizationId, 'pending']),
        organizationId
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('Accrual History', () => {
    it('should create accrual history entry', async () => {
      const accrualData = {
        employeeId: 'emp-1',
        timeOffTypeId: 'type-1',
        daysAccrued: 1.67,
        accrualDate: '2024-01-31',
        accrualPeriod: 'January 2024',
        notes: 'Monthly accrual'
      };

      mockQuery.mockResolvedValue({
        rows: [{
          id: 'accrual-1',
          employee_id: 'emp-1',
          days_accrued: 1.67,
          accrual_period: 'January 2024'
        }]
      });

      const result = await repository.createAccrualHistory(accrualData, organizationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.arrayContaining([organizationId, 'emp-1', 1.67]),
        organizationId
      );
      expect(result.daysAccrued).toBe(1.67);
    });

    it('should get accrual history for employee', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { id: 'accrual-1', days_accrued: 1.67, accrual_period: 'January 2024' },
          { id: 'accrual-2', days_accrued: 1.67, accrual_period: 'February 2024' }
        ]
      });

      const result = await repository.getAccrualHistory('emp-1', 'type-1', organizationId);

      expect(result).toHaveLength(2);
      expect(result[0].daysAccrued).toBe(1.67);
    });
  });
});
