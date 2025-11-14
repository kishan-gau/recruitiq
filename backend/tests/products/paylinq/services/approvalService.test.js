/**
 * Approval Service Tests
 * 
 * Unit tests for ApprovalService business logic including rule matching,
 * approval workflows, and authorization checks.
 */

import { jest } from '@jest/globals';
import ApprovalService from '../../../../src/products/paylinq/services/approvalService.js';

// Mock dependencies
jest.mock('../../../../src/config/database.js', () => ({
  default: {
    connect: jest.fn()
  }
}));
jest.mock('../../../../src/utils/logger.js');

describe('ApprovalService', () => {
  let service;
  let mockClient;
  let mockDb;

  beforeEach(async () => {
    // Import after mocks are set up
    const dbModule = await import('../../../../src/config/database.js');
    mockDb = dbModule.default;
    
    service = new ApprovalService();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockDb.connect = jest.fn().mockResolvedValue(mockClient);
    jest.clearAllMocks();
  });

  describe('Rule Matching', () => {
    describe('ruleMatches', () => {
      test('should match conversion_threshold rule when amount exceeds threshold', () => {
        const rule = {
          rule_type: 'conversion_threshold',
          conditions: { threshold: 10000 }
        };
        const request = {
          request_type: 'conversion',
          request_data: { amount: 15000 }
        };

        const result = service.ruleMatches(rule, request);
        expect(result).toBe(true);
      });

      test('should not match conversion_threshold when amount is below threshold', () => {
        const rule = {
          rule_type: 'conversion_threshold',
          conditions: { threshold: 10000 }
        };
        const request = {
          request_type: 'conversion',
          request_data: { amount: 5000 }
        };

        const result = service.ruleMatches(rule, request);
        expect(result).toBe(false);
      });

      test('should match rate_variance rule when variance exceeds threshold', () => {
        const rule = {
          rule_type: 'rate_variance',
          conditions: { variance_percent: 5 }
        };
        const request = {
          request_type: 'rate_change',
          request_data: { variance_percent: 8 }
        };

        const result = service.ruleMatches(rule, request);
        expect(result).toBe(true);
      });

      test('should not match rate_variance when within threshold', () => {
        const rule = {
          rule_type: 'rate_variance',
          conditions: { variance_percent: 5 }
        };
        const request = {
          request_type: 'rate_change',
          request_data: { variance_percent: 3 }
        };

        const result = service.ruleMatches(rule, request);
        expect(result).toBe(false);
      });

      test('should match bulk_operation rule', () => {
        const rule = {
          rule_type: 'bulk_operation',
          conditions: {}
        };
        const request = {
          request_type: 'bulk_rate_import'
        };

        const result = service.ruleMatches(rule, request);
        expect(result).toBe(true);
      });

      test('should match configuration_change rule', () => {
        const rule = {
          rule_type: 'configuration_change',
          conditions: {}
        };
        const request = {
          request_type: 'configuration_change'
        };

        const result = service.ruleMatches(rule, request);
        expect(result).toBe(true);
      });

      test('should match currency-specific rules', () => {
        const rule = {
          rule_type: 'conversion_threshold',
          conditions: { 
            threshold: 10000,
            currencies: ['USD', 'EUR']
          }
        };
        const request = {
          request_type: 'conversion',
          request_data: { 
            amount: 15000,
            from_currency: 'USD'
          }
        };

        const result = service.ruleMatches(rule, request);
        expect(result).toBe(true);
      });

      test('should not match when currency not in rule', () => {
        const rule = {
          rule_type: 'conversion_threshold',
          conditions: { 
            threshold: 10000,
            currencies: ['USD', 'EUR']
          }
        };
        const request = {
          request_type: 'conversion',
          request_data: { 
            amount: 15000,
            from_currency: 'GBP'
          }
        };

        const result = service.ruleMatches(rule, request);
        expect(result).toBe(false);
      });
    });
  });

  describe('Create Approval Request', () => {
    test('should create request with matching rules', async () => {
      const mockRules = [
        {
          rule_id: 'rule-1',
          rule_type: 'conversion_threshold',
          required_approvals: 2,
          priority: 'high',
          conditions: { threshold: 10000 }
        }
      ];

      const mockInsertResult = {
        rows: [{ 
          request_id: 'req-123',
          required_approvals: 2,
          priority: 'high',
          status: 'pending'
        }]
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: mockRules }) // Get active rules
        .mockResolvedValueOnce(mockInsertResult) // Insert request
        .mockResolvedValueOnce({ rows: [] }); // Get approvers

      const requestData = {
        requestType: 'conversion',
        referenceType: 'currency_conversion',
        referenceId: 'conv-456',
        requestData: {
          amount: 15000,
          from_currency: 'USD',
          to_currency: 'EUR'
        },
        organizationId: 'org-789',
        requestedBy: 'user-123'
      };

      const result = await service.createApprovalRequest(requestData);

      expect(result.request_id).toBe('req-123');
      expect(result.required_approvals).toBe(2);
      expect(result.priority).toBe('high');
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    test('should use default rule when no specific rules match', async () => {
      const mockDefaultRule = {
        rule_id: 'default-rule',
        rule_type: 'default',
        required_approvals: 1,
        priority: 'normal',
        conditions: {}
      };

      const mockInsertResult = {
        rows: [{
          request_id: 'req-456',
          required_approvals: 1,
          priority: 'normal',
          status: 'pending'
        }]
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // No specific rules
        .mockResolvedValueOnce({ rows: [mockDefaultRule] }) // Get default rule
        .mockResolvedValueOnce(mockInsertResult) // Insert request
        .mockResolvedValueOnce({ rows: [] }); // Get approvers

      const requestData = {
        requestType: 'conversion',
        referenceType: 'currency_conversion',
        referenceId: 'conv-789',
        requestData: { amount: 500 },
        organizationId: 'org-123',
        requestedBy: 'user-456'
      };

      const result = await service.createApprovalRequest(requestData);

      expect(result.required_approvals).toBe(1);
      expect(result.priority).toBe('normal');
    });

    test('should handle multiple matching rules and select highest priority', async () => {
      const mockRules = [
        {
          rule_id: 'rule-1',
          rule_type: 'conversion_threshold',
          required_approvals: 1,
          priority: 'normal',
          conditions: { threshold: 5000 }
        },
        {
          rule_id: 'rule-2',
          rule_type: 'conversion_threshold',
          required_approvals: 3,
          priority: 'urgent',
          conditions: { threshold: 20000 }
        }
      ];

      const mockInsertResult = {
        rows: [{
          request_id: 'req-789',
          required_approvals: 3,
          priority: 'urgent',
          status: 'pending'
        }]
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: mockRules })
        .mockResolvedValueOnce(mockInsertResult)
        .mockResolvedValueOnce({ rows: [] });

      const requestData = {
        requestType: 'conversion',
        referenceType: 'currency_conversion',
        referenceId: 'conv-999',
        requestData: { amount: 25000 },
        organizationId: 'org-456',
        requestedBy: 'user-789'
      };

      const result = await service.createApprovalRequest(requestData);

      expect(result.priority).toBe('urgent');
      expect(result.required_approvals).toBe(3);
    });
  });

  describe('Approve Request', () => {
    test('should approve request successfully', async () => {
      const mockRequest = {
        request_id: 'req-123',
        status: 'pending',
        required_approvals: 2,
        current_approvals: 0,
        requested_by: 'user-456',
        organization_id: 'org-789'
      };

      const mockApprovalAction = {
        action_id: 'action-123',
        action: 'approved'
      };

      const mockUpdatedRequest = {
        ...mockRequest,
        current_approvals: 1,
        status: 'pending'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockRequest] }) // Get request
        .mockResolvedValueOnce({ rows: [] }) // Check existing approval
        .mockResolvedValueOnce({ rows: [mockApprovalAction] }) // Insert action
        .mockResolvedValueOnce({ rows: [mockUpdatedRequest] }); // Get updated request

      const result = await service.approveRequest(
        'req-123',
        'user-123',
        'Approved - looks good'
      );

      expect(result.current_approvals).toBe(1);
      expect(result.status).toBe('pending');
      expect(mockClient.query).toHaveBeenCalledTimes(4);
    });

    test('should auto-approve when required approvals met', async () => {
      const mockRequest = {
        request_id: 'req-456',
        status: 'pending',
        required_approvals: 2,
        current_approvals: 1,
        requested_by: 'user-789',
        organization_id: 'org-123'
      };

      const mockFinalRequest = {
        ...mockRequest,
        current_approvals: 2,
        status: 'approved'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockRequest] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ action_id: 'action-456' }] })
        .mockResolvedValueOnce({ rows: [mockFinalRequest] });

      const result = await service.approveRequest(
        'req-456',
        'user-123',
        'Final approval'
      );

      expect(result.current_approvals).toBe(2);
      expect(result.status).toBe('approved');
    });

    test('should reject approval if request not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.approveRequest('nonexistent', 'user-123', 'comment')
      ).rejects.toThrow('Approval request not found');
    });

    test('should reject approval if already approved/rejected', async () => {
      const mockRequest = {
        request_id: 'req-789',
        status: 'approved',
        organization_id: 'org-123'
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockRequest] });

      await expect(
        service.approveRequest('req-789', 'user-123', 'comment')
      ).rejects.toThrow('Request is not in pending status');
    });

    test('should prevent self-approval', async () => {
      const mockRequest = {
        request_id: 'req-999',
        status: 'pending',
        requested_by: 'user-123',
        organization_id: 'org-456'
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockRequest] });

      await expect(
        service.approveRequest('req-999', 'user-123', 'comment')
      ).rejects.toThrow('Cannot approve your own request');
    });

    test('should prevent duplicate approval by same user', async () => {
      const mockRequest = {
        request_id: 'req-888',
        status: 'pending',
        required_approvals: 3,
        requested_by: 'user-456',
        organization_id: 'org-789'
      };

      const mockExistingApproval = {
        action_id: 'action-prev',
        created_by: 'user-123'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockRequest] })
        .mockResolvedValueOnce({ rows: [mockExistingApproval] });

      await expect(
        service.approveRequest('req-888', 'user-123', 'comment')
      ).rejects.toThrow('You have already approved this request');
    });
  });

  describe('Reject Request', () => {
    test('should reject request with comments', async () => {
      const mockRequest = {
        request_id: 'req-111',
        status: 'pending',
        requested_by: 'user-456',
        organization_id: 'org-789'
      };

      const mockRejectedRequest = {
        ...mockRequest,
        status: 'rejected'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockRequest] })
        .mockResolvedValueOnce({ rows: [{ action_id: 'action-reject' }] })
        .mockResolvedValueOnce({ rows: [mockRejectedRequest] });

      const result = await service.rejectRequest(
        'req-111',
        'user-123',
        'Insufficient documentation'
      );

      expect(result.status).toBe('rejected');
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    test('should require comments for rejection', async () => {
      const mockRequest = {
        request_id: 'req-222',
        status: 'pending',
        organization_id: 'org-123'
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockRequest] });

      await expect(
        service.rejectRequest('req-222', 'user-123', '')
      ).rejects.toThrow('Comments are required when rejecting');
    });

    test('should reject if request not in pending status', async () => {
      const mockRequest = {
        request_id: 'req-333',
        status: 'approved',
        organization_id: 'org-456'
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockRequest] });

      await expect(
        service.rejectRequest('req-333', 'user-123', 'Too late')
      ).rejects.toThrow('Request is not in pending status');
    });
  });

  describe('Get Pending Approvals', () => {
    test('should retrieve pending approvals with filters', async () => {
      const mockApprovals = [
        {
          request_id: 'req-1',
          request_type: 'conversion',
          status: 'pending',
          priority: 'high',
          current_approvals: 1,
          required_approvals: 2
        },
        {
          request_id: 'req-2',
          request_type: 'rate_change',
          status: 'pending',
          priority: 'normal',
          current_approvals: 0,
          required_approvals: 1
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockApprovals });

      const result = await service.getPendingApprovals('org-123', {
        requestType: 'conversion'
      });

      expect(result).toHaveLength(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['org-123', 'pending'])
      );
    });

    test('should filter by priority', async () => {
      const mockApprovals = [
        {
          request_id: 'req-urgent',
          priority: 'urgent',
          status: 'pending'
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockApprovals });

      const result = await service.getPendingApprovals('org-456', {
        priority: 'urgent'
      });

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe('urgent');
    });
  });

  describe('Get Approval History', () => {
    test('should retrieve approval history for reference', async () => {
      const mockHistory = [
        {
          request_id: 'req-1',
          status: 'approved',
          requested_at: new Date('2024-11-01'),
          actions: [
            { action: 'approved', created_by: 'user-1' },
            { action: 'approved', created_by: 'user-2' }
          ]
        },
        {
          request_id: 'req-2',
          status: 'rejected',
          requested_at: new Date('2024-11-05'),
          actions: [
            { action: 'rejected', created_by: 'user-3' }
          ]
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockHistory });

      const result = await service.getApprovalHistory(
        'org-789',
        'currency_conversion',
        'conv-123'
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('approved');
      expect(result[0].actions).toHaveLength(2);
    });
  });

  describe('Expire Old Requests', () => {
    test('should expire requests older than timeout', async () => {
      const mockExpiredRequests = [
        { request_id: 'req-old-1' },
        { request_id: 'req-old-2' }
      ];

      mockClient.query.mockResolvedValueOnce({ 
        rows: mockExpiredRequests,
        rowCount: 2
      });

      const result = await service.expireOldRequests('org-123');

      expect(result.expired).toBe(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE currency_approval_request'),
        expect.arrayContaining(['org-123', 'pending'])
      );
    });
  });

  describe('Get Approval Statistics', () => {
    test('should retrieve approval statistics', async () => {
      const mockStats = {
        pending_count: 5,
        approved_today: 12,
        rejected_today: 2,
        avg_approval_time: '2 hours'
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockStats] });

      const result = await service.getApprovalStatistics('org-456');

      expect(result.pending_count).toBe(5);
      expect(result.approved_today).toBe(12);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('approval_statistics'),
        ['org-456']
      );
    });
  });
});
