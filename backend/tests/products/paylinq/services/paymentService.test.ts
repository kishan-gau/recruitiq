/**
 * PaymentService Test Suite
 * 
 * Tests for PayLinQ payment service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - Comprehensive service method coverage
 * - Validation of payment workflows
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PaymentService from '../../../../src/products/paylinq/services/paymentService.js';

describe('PaymentService', () => {
  let service: any;
  let mockRepository: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testTransactionId = '323e4567-e89b-12d3-a456-426614174002';
  const testPaycheckId = '423e4567-e89b-12d3-a456-426614174003';
  const testPayrollRunId = '523e4567-e89b-12d3-a456-426614174004';
  const testEmployeeRecordId = '623e4567-e89b-12d3-a456-426614174005';

  beforeEach(() => {
    // Create comprehensive mock repository
    mockRepository = {
      createPaymentTransaction: jest.fn(),
      findPaymentTransactions: jest.fn(),
      findPaymentTransactionById: jest.fn(),
      updatePaymentStatus: jest.fn(),
      recordPaymentFailure: jest.fn(),
      reconcilePayment: jest.fn(),
      findPendingPayments: jest.fn(),
      getPaymentStatistics: jest.fn(),
      getPaymentMethodBreakdown: jest.fn()
    };

    // Instantiate service with injected mock repository
    service = new PaymentService(mockRepository);
  });

  describe('initiatePayment', () => {
    it('should initiate payment transaction with valid data', async () => {
      const transactionData = {
        paycheckId: testPaycheckId,
        payrollRunId: testPayrollRunId,
        employeeRecordId: testEmployeeRecordId,
        paymentMethod: 'ach',
        paymentAmount: 1500.00,
        scheduledDate: new Date('2025-02-15'),
        bankAccountNumber: '123456789',
        routingNumber: '021000021',
        currency: 'SRD'
      };

      const mockCreatedTransaction = {
        id: testTransactionId,
        ...transactionData,
        payment_status: 'pending',
        created_at: new Date()
      };

      mockRepository.createPaymentTransaction.mockResolvedValue(mockCreatedTransaction);

      const result = await service.initiatePayment(transactionData, testOrganizationId, testUserId);

      expect(result).toEqual(mockCreatedTransaction);
      expect(mockRepository.createPaymentTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          paycheckId: testPaycheckId,
          paymentMethod: 'ach',
          paymentAmount: 1500.00
        }),
        testOrganizationId,
        testUserId
      );
    });

    it('should throw validation error for missing required fields', async () => {
      const invalidData = {
        paymentMethod: 'ach'
        // Missing required fields
      };

      await expect(service.initiatePayment(invalidData, testOrganizationId, testUserId))
        .rejects.toThrow();
    });

    it('should throw error for ACH without bank details', async () => {
      const transactionData = {
        paycheckId: testPaycheckId,
        payrollRunId: testPayrollRunId,
        employeeRecordId: testEmployeeRecordId,
        paymentMethod: 'ach',
        paymentAmount: 1500.00,
        scheduledDate: new Date('2025-02-15')
        // Missing bankAccountNumber and routingNumber
      };

      await expect(service.initiatePayment(transactionData, testOrganizationId, testUserId))
        .rejects.toThrow('Bank account number and routing number are required for ACH/wire payments');
    });

    it('should throw error for wire transfer without bank details', async () => {
      const transactionData = {
        paycheckId: testPaycheckId,
        payrollRunId: testPayrollRunId,
        employeeRecordId: testEmployeeRecordId,
        paymentMethod: 'wire',
        paymentAmount: 2000.00,
        scheduledDate: new Date('2025-02-15')
        // Missing bank details
      };

      await expect(service.initiatePayment(transactionData, testOrganizationId, testUserId))
        .rejects.toThrow('Bank account number and routing number are required for ACH/wire payments');
    });

    it('should accept check payment without bank details', async () => {
      const transactionData = {
        paycheckId: testPaycheckId,
        payrollRunId: testPayrollRunId,
        employeeRecordId: testEmployeeRecordId,
        paymentMethod: 'check',
        paymentAmount: 1000.00,
        scheduledDate: new Date('2025-02-15')
      };

      mockRepository.createPaymentTransaction.mockResolvedValue({
        id: testTransactionId,
        ...transactionData
      });

      const result = await service.initiatePayment(transactionData, testOrganizationId, testUserId);

      expect(result).toBeDefined();
    });
  });

  describe('getPaymentTransactions', () => {
    it('should retrieve payment transactions with filters', async () => {
      const mockTransactions = [
        { id: '1', payment_method: 'ach' },
        { id: '2', payment_method: 'check' }
      ];

      mockRepository.findPaymentTransactions.mockResolvedValue(mockTransactions);

      const filters = { paymentMethod: 'ach' };
      const result = await service.getPaymentTransactions(testOrganizationId, filters);

      expect(result).toEqual(mockTransactions);
      expect(mockRepository.findPaymentTransactions).toHaveBeenCalledWith(filters, testOrganizationId);
    });

    it('should retrieve all transactions when no filters provided', async () => {
      mockRepository.findPaymentTransactions.mockResolvedValue([]);

      const result = await service.getPaymentTransactions(testOrganizationId);

      expect(mockRepository.findPaymentTransactions).toHaveBeenCalledWith({}, testOrganizationId);
    });
  });

  describe('getPaymentTransactionById', () => {
    it('should retrieve payment transaction by ID', async () => {
      const mockTransaction = {
        id: testTransactionId,
        payment_amount: 1500.00,
        payment_status: 'pending'
      };

      mockRepository.findPaymentTransactionById.mockResolvedValue(mockTransaction);

      const result = await service.getPaymentTransactionById(testTransactionId, testOrganizationId);

      expect(result).toEqual(mockTransaction);
      expect(mockRepository.findPaymentTransactionById).toHaveBeenCalledWith(
        testTransactionId,
        testOrganizationId
      );
    });

    it('should throw NotFoundError when transaction does not exist', async () => {
      mockRepository.findPaymentTransactionById.mockResolvedValue(null);

      await expect(service.getPaymentTransactionById(testTransactionId, testOrganizationId))
        .rejects.toThrow('Payment transaction not found');
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status with valid status', async () => {
      const mockUpdatedTransaction = {
        id: testTransactionId,
        payment_status: 'processed'
      };

      mockRepository.updatePaymentStatus.mockResolvedValue(mockUpdatedTransaction);

      const result = await service.updatePaymentStatus(
        testTransactionId,
        'processed',
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(mockUpdatedTransaction);
      expect(mockRepository.updatePaymentStatus).toHaveBeenCalledWith(
        testTransactionId,
        'processed',
        testOrganizationId,
        testUserId,
        {}
      );
    });

    it('should throw error for invalid payment status', async () => {
      await expect(service.updatePaymentStatus(
        testTransactionId,
        'invalid_status',
        testOrganizationId,
        testUserId
      )).rejects.toThrow('Invalid payment status: invalid_status');
    });

    it('should accept all valid statuses', async () => {
      const validStatuses = ['pending', 'processing', 'processed', 'failed', 'cancelled', 'reconciled'];

      for (const status of validStatuses) {
        mockRepository.updatePaymentStatus.mockResolvedValue({ payment_status: status });

        await service.updatePaymentStatus(testTransactionId, status, testOrganizationId, testUserId);

        expect(mockRepository.updatePaymentStatus).toHaveBeenCalledWith(
          testTransactionId,
          status,
          testOrganizationId,
          testUserId,
          {}
        );
      }
    });
  });

  describe('processPayment', () => {
    it('should process pending payment successfully', async () => {
      const mockPendingTransaction = {
        id: testTransactionId,
        payment_status: 'pending',
        payment_amount: 1500.00
      };

      const mockProcessedTransaction = {
        ...mockPendingTransaction,
        payment_status: 'processed'
      };

      mockRepository.findPaymentTransactionById.mockResolvedValue(mockPendingTransaction);
      mockRepository.updatePaymentStatus.mockResolvedValue(mockProcessedTransaction);

      const result = await service.processPayment(testTransactionId, testOrganizationId, testUserId);

      expect(result).toEqual(mockProcessedTransaction);
      expect(mockRepository.updatePaymentStatus).toHaveBeenCalledWith(
        testTransactionId,
        'processed',
        testOrganizationId,
        testUserId,
        expect.objectContaining({
          processorTransactionId: expect.stringMatching(/^TXN-/)
        })
      );
    });

    it('should throw error when processing non-pending payment', async () => {
      const mockProcessedTransaction = {
        id: testTransactionId,
        payment_status: 'processed'
      };

      mockRepository.findPaymentTransactionById.mockResolvedValue(mockProcessedTransaction);

      await expect(service.processPayment(testTransactionId, testOrganizationId, testUserId))
        .rejects.toThrow('Cannot process payment with status: processed');
    });
  });

  describe('handlePaymentFailure', () => {
    it('should record payment failure with reason', async () => {
      const failureReason = 'Insufficient funds';
      const mockFailedTransaction = {
        id: testTransactionId,
        payment_status: 'failed',
        failure_reason: failureReason,
        retry_count: 1
      };

      mockRepository.recordPaymentFailure.mockResolvedValue(mockFailedTransaction);

      const result = await service.handlePaymentFailure(
        testTransactionId,
        failureReason,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(mockFailedTransaction);
      expect(mockRepository.recordPaymentFailure).toHaveBeenCalledWith(
        testTransactionId,
        failureReason,
        testOrganizationId,
        testUserId
      );
    });
  });

  describe('retryPayment', () => {
    it('should retry failed payment within retry limit', async () => {
      const mockFailedTransaction = {
        id: testTransactionId,
        payment_status: 'failed',
        retry_count: 1
      };

      const mockRetriedTransaction = {
        ...mockFailedTransaction,
        payment_status: 'pending'
      };

      const mockProcessedTransaction = {
        ...mockFailedTransaction,
        payment_status: 'processed'
      };

      mockRepository.findPaymentTransactionById
        .mockResolvedValueOnce(mockFailedTransaction)
        .mockResolvedValueOnce(mockRetriedTransaction);
      mockRepository.updatePaymentStatus
        .mockResolvedValueOnce(mockRetriedTransaction)
        .mockResolvedValueOnce(mockProcessedTransaction);

      const result = await service.retryPayment(testTransactionId, testOrganizationId, testUserId);

      expect(result).toEqual(mockProcessedTransaction);
    });

    it('should throw error when retrying non-failed payment', async () => {
      const mockPendingTransaction = {
        id: testTransactionId,
        payment_status: 'pending'
      };

      mockRepository.findPaymentTransactionById.mockResolvedValue(mockPendingTransaction);

      await expect(service.retryPayment(testTransactionId, testOrganizationId, testUserId))
        .rejects.toThrow('Can only retry failed payments');
    });

    it('should throw error when maximum retries reached', async () => {
      const mockFailedTransaction = {
        id: testTransactionId,
        payment_status: 'failed',
        retry_count: 3
      };

      mockRepository.findPaymentTransactionById.mockResolvedValue(mockFailedTransaction);

      await expect(service.retryPayment(testTransactionId, testOrganizationId, testUserId))
        .rejects.toThrow('Maximum retry attempts (3) reached');
    });
  });

  describe('reconcilePayment', () => {
    it('should reconcile payment successfully', async () => {
      const mockReconciledTransaction = {
        id: testTransactionId,
        payment_status: 'reconciled',
        reconciled_at: new Date()
      };

      mockRepository.reconcilePayment.mockResolvedValue(mockReconciledTransaction);

      const result = await service.reconcilePayment(testTransactionId, testOrganizationId, testUserId);

      expect(result).toEqual(mockReconciledTransaction);
      expect(mockRepository.reconcilePayment).toHaveBeenCalledWith(
        testTransactionId,
        testOrganizationId,
        testUserId
      );
    });
  });

  describe('getPendingPayments', () => {
    it('should retrieve pending payments without date filter', async () => {
      const mockPendingPayments = [
        { id: '1', payment_status: 'pending' },
        { id: '2', payment_status: 'pending' }
      ];

      mockRepository.findPendingPayments.mockResolvedValue(mockPendingPayments);

      const result = await service.getPendingPayments(testOrganizationId);

      expect(result).toEqual(mockPendingPayments);
      expect(mockRepository.findPendingPayments).toHaveBeenCalledWith(testOrganizationId, null);
    });

    it('should retrieve pending payments with date filter', async () => {
      const scheduledBefore = new Date('2025-02-28');
      const mockPendingPayments = [
        { id: '1', scheduled_date: new Date('2025-02-15') }
      ];

      mockRepository.findPendingPayments.mockResolvedValue(mockPendingPayments);

      const result = await service.getPendingPayments(testOrganizationId, scheduledBefore);

      expect(result).toEqual(mockPendingPayments);
      expect(mockRepository.findPendingPayments).toHaveBeenCalledWith(testOrganizationId, scheduledBefore);
    });
  });

  describe('getPaymentStatistics', () => {
    it('should retrieve payment statistics with method breakdown', async () => {
      const mockStats = {
        totalAmount: 50000,
        totalTransactions: 100,
        pendingAmount: 5000
      };

      const mockMethodBreakdown = [
        { payment_method: 'ach', count: 80, total_amount: 40000 },
        { payment_method: 'check', count: 20, total_amount: 10000 }
      ];

      mockRepository.getPaymentStatistics.mockResolvedValue(mockStats);
      mockRepository.getPaymentMethodBreakdown.mockResolvedValue(mockMethodBreakdown);

      const result = await service.getPaymentStatistics(testPayrollRunId, testOrganizationId);

      expect(result).toEqual({
        ...mockStats,
        methodBreakdown: mockMethodBreakdown
      });
      expect(mockRepository.getPaymentStatistics).toHaveBeenCalledWith(testPayrollRunId, testOrganizationId);
      expect(mockRepository.getPaymentMethodBreakdown).toHaveBeenCalledWith(testPayrollRunId, testOrganizationId);
    });
  });
});
