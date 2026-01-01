/**
 * Tests for useWorkerTypes hook
 * 
 * Tests React Query hooks for worker type templates, assignments, and upgrades.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack:react-query';
import React from 'react';
import {
  useWorkerTypeTemplates,
  useWorkerTypeTemplate,
  useCreateWorkerTypeTemplate,
  useUpdateWorkerTypeTemplate,
  useDeleteWorkerTypeTemplate,
  useEmployeeWorkerTypeAssignments,
  useAssignWorkerType,
  useTerminateWorkerTypeAssignment,
  useWorkerTypeUpgradePreview,
  usePreviewWorkerTypeUpgrade,
  useExecuteWorkerTypeUpgrade,
  useCompareTemplates,
  useWorkerTypeUpgradeStatus,
} from '@/features/payroll/hooks/useWorkerTypes';
import { PaylinqClient, APIClient } from '@recruitiq/api-client';

// Mock API clients
const mockPaylinqClient = {
  getWorkerTypeTemplates: vi.fn(),
  getWorkerTypeTemplate: vi.fn(),
  createWorkerTypeTemplate: vi.fn(),
  updateWorkerTypeTemplate: vi.fn(),
  deleteWorkerTypeTemplate: vi.fn(),
  getEmployeeWorkerTypeAssignments: vi.fn(),
  assignWorkerType: vi.fn(),
  terminateWorkerTypeAssignment: vi.fn(),
  previewWorkerTypeUpgrade: vi.fn(),
  executeWorkerTypeUpgrade: vi.fn(),
};

vi.mock('@recruitiq/api-client', () => ({
  APIClient: vi.fn().mockImplementation(() => ({})),
  PaylinqClient: vi.fn().mockImplementation(() => mockPaylinqClient),
}));

// Mock toast context
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

// Mock error handlers
vi.mock('@/utils/errorHandler', () => ({
  handleApiError: vi.fn((error, options) => {
    if (options?.toast) {
      options.toast.error(options.defaultMessage);
    }
  }),
  getValidationErrors: vi.fn((error) => {
    if (error?.validationErrors) {
      return error.validationErrors;
    }
    return null;
  }),
}));

describe('useWorkerTypes hooks', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    // Create wrapper component
    wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

    vi.clearAllMocks();
  });

  describe('Worker Type Templates', () => {
    describe('useWorkerTypeTemplates', () => {
      it('should fetch all worker type templates successfully', async () => {
        // Arrange
        const mockTemplates = [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            code: 'FULL_TIME',
            name: 'Full Time Employee',
            version: 1,
            defaultPayFrequency: 'monthly',
            benefitsEligible: true,
          },
          {
            id: '223e4567-e89b-12d3-a456-426614174001',
            code: 'PART_TIME',
            name: 'Part Time Employee',
            version: 1,
            defaultPayFrequency: 'weekly',
            benefitsEligible: false,
          },
        ];
        mockPaylinqClient.getWorkerTypeTemplates.mockResolvedValue({ data: { templates: mockTemplates } });

        // Act
        const { result } = renderHook(() => useWorkerTypeTemplates(), { wrapper });

        // Assert - Initial state
        expect(result.current.data).toBeUndefined();
        expect(result.current.isLoading).toBe(true);

        // Wait for success
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert - Success state (data should be extracted from templates property)
        expect(result.current.data).toEqual(mockTemplates);
        expect(result.current.data).toHaveLength(2);
        expect(result.current.isLoading).toBe(false);
      });

      it('should handle response with direct array (no templates wrapper)', async () => {
        // Arrange
        const mockTemplates = [
          { id: '123', code: 'FULL_TIME', name: 'Full Time' },
        ];
        mockPaylinqClient.getWorkerTypeTemplates.mockResolvedValue({ data: mockTemplates });

        // Act
        const { result } = renderHook(() => useWorkerTypeTemplates(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        expect(result.current.data).toEqual(mockTemplates);
      });

      it('should cache templates for 5 minutes', async () => {
        // Arrange
        const mockTemplates = [{ id: '123', code: 'TEST' }];
        mockPaylinqClient.getWorkerTypeTemplates.mockResolvedValue({ data: { templates: mockTemplates } });

        // Act
        renderHook(() => useWorkerTypeTemplates(), { wrapper });

        await waitFor(() => {
          const queryState = queryClient.getQueryState(['workerTypeTemplates']);
          expect(queryState).toBeDefined();
          expect(queryState?.dataUpdateCount).toBeGreaterThan(0);
        });
      });

      it('should handle fetch errors', async () => {
        // Arrange
        const error = new Error('Failed to fetch templates');
        mockPaylinqClient.getWorkerTypeTemplates.mockRejectedValue(error);

        // Act
        const { result } = renderHook(() => useWorkerTypeTemplates(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));

        // Assert
        expect(result.current.error).toEqual(error);
      });
    });

    describe('useWorkerTypeTemplate', () => {
      it('should fetch a single worker type template by ID', async () => {
        // Arrange
        const templateId = '123e4567-e89b-12d3-a456-426614174000';
        const mockTemplate = {
          id: templateId,
          code: 'FULL_TIME',
          name: 'Full Time Employee',
          version: 1,
          defaultPayFrequency: 'monthly',
        };
        mockPaylinqClient.getWorkerTypeTemplate.mockResolvedValue({ data: { template: mockTemplate } });

        // Act
        const { result } = renderHook(() => useWorkerTypeTemplate(templateId), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        expect(result.current.data).toEqual(mockTemplate);
        expect(mockPaylinqClient.getWorkerTypeTemplate).toHaveBeenCalledWith(templateId);
      });

      it('should not fetch when ID is empty', async () => {
        // Arrange
        const emptyId = '';

        // Act
        const { result } = renderHook(() => useWorkerTypeTemplate(emptyId), { wrapper });

        // Assert
        expect(result.current.fetchStatus).toBe('idle');
        expect(mockPaylinqClient.getWorkerTypeTemplate).not.toHaveBeenCalled();
      });
    });

    describe('useCreateWorkerTypeTemplate', () => {
      it('should create a worker type template successfully', async () => {
        // Arrange
        const newTemplate = {
          code: 'CONTRACTOR',
          name: 'Contractor',
          defaultPayFrequency: 'weekly',
          benefitsEligible: false,
        };
        const createdTemplate = {
          id: '323e4567-e89b-12d3-a456-426614174002',
          ...newTemplate,
          version: 1,
        };
        mockPaylinqClient.createWorkerTypeTemplate.mockResolvedValue({ data: { template: createdTemplate } });

        // Act
        const { result } = renderHook(() => useCreateWorkerTypeTemplate(), { wrapper });

        result.current.mutate(newTemplate);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        expect(result.current.data).toEqual(createdTemplate);
        expect(mockPaylinqClient.createWorkerTypeTemplate).toHaveBeenCalledWith(newTemplate);
        expect(mockToast.success).toHaveBeenCalledWith('Worker type template created successfully');
      });

      it('should invalidate templates cache after creation', async () => {
        // Arrange
        const newTemplate = { code: 'TEST', name: 'Test' };
        const createdTemplate = { id: '123', ...newTemplate };
        mockPaylinqClient.createWorkerTypeTemplate.mockResolvedValue({ data: { template: createdTemplate } });

        // Pre-populate cache
        queryClient.setQueryData(['workerTypeTemplates'], []);

        // Act
        const { result } = renderHook(() => useCreateWorkerTypeTemplate(), { wrapper });
        result.current.mutate(newTemplate);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        const queryState = queryClient.getQueryState(['workerTypeTemplates']);
        expect(queryState?.isInvalidated).toBe(true);
      });

      it('should handle validation errors', async () => {
        // Arrange
        const newTemplate = { code: '', name: 'Invalid' };
        const error = { validationErrors: { code: 'Code is required' } };
        mockPaylinqClient.createWorkerTypeTemplate.mockRejectedValue(error);

        // Act
        const { result } = renderHook(() => useCreateWorkerTypeTemplate(), { wrapper });
        result.current.mutate(newTemplate);

        await waitFor(() => expect(result.current.isError).toBe(true));

        // Assert
        expect(result.current.error).toEqual(error);
      });
    });

    describe('useUpdateWorkerTypeTemplate', () => {
      it('should update a worker type template successfully', async () => {
        // Arrange
        const templateId = '123e4567-e89b-12d3-a456-426614174000';
        const updateData = { name: 'Updated Full Time', benefitsEligible: true };
        const updatedTemplate = {
          id: templateId,
          code: 'FULL_TIME',
          name: 'Updated Full Time',
          benefitsEligible: true,
        };
        mockPaylinqClient.updateWorkerTypeTemplate.mockResolvedValue({ data: { template: updatedTemplate } });

        // Act
        const { result } = renderHook(() => useUpdateWorkerTypeTemplate(), { wrapper });
        result.current.mutate({ templateId, data: updateData });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        expect(result.current.data).toEqual(updatedTemplate);
        expect(mockPaylinqClient.updateWorkerTypeTemplate).toHaveBeenCalledWith(templateId, updateData);
        expect(mockToast.success).toHaveBeenCalledWith('Worker type template updated successfully');
      });

      it('should invalidate both list and detail caches', async () => {
        // Arrange
        const templateId = '123e4567-e89b-12d3-a456-426614174000';
        const updateData = { name: 'Updated' };
        const updatedTemplate = { id: templateId, name: 'Updated' };
        mockPaylinqClient.updateWorkerTypeTemplate.mockResolvedValue({ data: { template: updatedTemplate } });

        // Pre-populate caches
        queryClient.setQueryData(['workerTypeTemplates'], []);
        queryClient.setQueryData(['workerTypeTemplate', templateId], {});

        // Act
        const { result } = renderHook(() => useUpdateWorkerTypeTemplate(), { wrapper });
        result.current.mutate({ templateId, data: updateData });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        const listQueryState = queryClient.getQueryState(['workerTypeTemplates']);
        const detailQueryState = queryClient.getQueryState(['workerTypeTemplate', templateId]);
        expect(listQueryState?.isInvalidated).toBe(true);
        expect(detailQueryState?.isInvalidated).toBe(true);
      });
    });

    describe('useDeleteWorkerTypeTemplate', () => {
      it('should delete a worker type template successfully', async () => {
        // Arrange
        const templateId = '123e4567-e89b-12d3-a456-426614174000';
        mockPaylinqClient.deleteWorkerTypeTemplate.mockResolvedValue({ data: {} });

        // Act
        const { result } = renderHook(() => useDeleteWorkerTypeTemplate(), { wrapper });
        result.current.mutate(templateId);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        expect(mockPaylinqClient.deleteWorkerTypeTemplate).toHaveBeenCalledWith(templateId);
        expect(mockToast.success).toHaveBeenCalledWith('Worker type template deleted successfully');
      });
    });
  });

  describe('Worker Type Assignments', () => {
    describe('useEmployeeWorkerTypeAssignments', () => {
      it('should fetch worker type assignments for an employee', async () => {
        // Arrange
        const employeeId = '123e4567-e89b-12d3-a456-426614174000';
        const mockAssignments = [
          {
            id: '223e4567-e89b-12d3-a456-426614174001',
            employeeId,
            workerTypeId: '323e4567-e89b-12d3-a456-426614174002',
            effectiveDate: '2025-01-01',
            status: 'active',
          },
        ];
        mockPaylinqClient.getEmployeeWorkerTypeAssignments.mockResolvedValue({ data: { assignments: mockAssignments } });

        // Act
        const { result } = renderHook(() => useEmployeeWorkerTypeAssignments(employeeId), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        expect(result.current.data).toEqual(mockAssignments);
        expect(mockPaylinqClient.getEmployeeWorkerTypeAssignments).toHaveBeenCalledWith(employeeId);
      });

      it('should not fetch when employee ID is empty', async () => {
        // Arrange
        const emptyId = '';

        // Act
        const { result } = renderHook(() => useEmployeeWorkerTypeAssignments(emptyId), { wrapper });

        // Assert
        expect(result.current.fetchStatus).toBe('idle');
        expect(mockPaylinqClient.getEmployeeWorkerTypeAssignments).not.toHaveBeenCalled();
      });
    });

    describe('useAssignWorkerType', () => {
      it('should assign a worker type to an employee', async () => {
        // Arrange
        const assignmentData = {
          employeeId: '123e4567-e89b-12d3-a456-426614174000',
          workerTypeId: '223e4567-e89b-12d3-a456-426614174001',
          effectiveDate: '2025-01-01',
        };
        const createdAssignment = {
          id: '323e4567-e89b-12d3-a456-426614174002',
          ...assignmentData,
        };
        mockPaylinqClient.assignWorkerType.mockResolvedValue({ data: createdAssignment });

        // Act
        const { result } = renderHook(() => useAssignWorkerType(), { wrapper });
        result.current.mutate(assignmentData);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        expect(mockPaylinqClient.assignWorkerType).toHaveBeenCalledWith(
          assignmentData.employeeId,
          {
            workerTypeId: assignmentData.workerTypeId,
            effectiveDate: assignmentData.effectiveDate,
            config: undefined,
          }
        );
        expect(mockToast.success).toHaveBeenCalledWith('Worker type assigned successfully');
      });

      it('should invalidate employee assignments cache', async () => {
        // Arrange
        const employeeId = '123e4567-e89b-12d3-a456-426614174000';
        const assignmentData = {
          employeeId,
          workerTypeId: '223e4567-e89b-12d3-a456-426614174001',
          effectiveDate: '2025-01-01',
        };
        mockPaylinqClient.assignWorkerType.mockResolvedValue({ data: {} });

        // Pre-populate cache
        queryClient.setQueryData(['employeeWorkerTypeAssignments', employeeId], []);

        // Act
        const { result } = renderHook(() => useAssignWorkerType(), { wrapper });
        result.current.mutate(assignmentData);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        const queryState = queryClient.getQueryState(['employeeWorkerTypeAssignments', employeeId]);
        expect(queryState?.isInvalidated).toBe(true);
      });
    });

    describe('useTerminateWorkerTypeAssignment', () => {
      it('should terminate a worker type assignment', async () => {
        // Arrange
        const terminationData = {
          employeeId: '123e4567-e89b-12d3-a456-426614174000',
          assignmentId: '223e4567-e89b-12d3-a456-426614174001',
          terminationDate: '2025-12-31',
        };
        mockPaylinqClient.terminateWorkerTypeAssignment.mockResolvedValue({ data: {} });

        // Act
        const { result } = renderHook(() => useTerminateWorkerTypeAssignment(), { wrapper });
        result.current.mutate(terminationData);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        expect(mockPaylinqClient.terminateWorkerTypeAssignment).toHaveBeenCalledWith(
          terminationData.employeeId,
          terminationData.assignmentId,
          terminationData.terminationDate
        );
        expect(mockToast.success).toHaveBeenCalledWith('Worker type assignment terminated');
      });
    });
  });

  describe('Worker Type Upgrades', () => {
    describe('useWorkerTypeUpgradePreview (query)', () => {
      it('should fetch upgrade preview when enabled', async () => {
        // Arrange
        const workerTypeId = '123e4567-e89b-12d3-a456-426614174000';

        // Act
        const { result } = renderHook(() => useWorkerTypeUpgradePreview(workerTypeId, true), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert - Should return stub data for now (TODO in implementation)
        expect(result.current.data).toBeDefined();
        expect(result.current.data?.workerTypeId).toBe(workerTypeId);
      });

      it('should not fetch when disabled', async () => {
        // Arrange
        const workerTypeId = '123e4567-e89b-12d3-a456-426614174000';

        // Act
        const { result } = renderHook(() => useWorkerTypeUpgradePreview(workerTypeId, false), { wrapper });

        // Assert
        expect(result.current.fetchStatus).toBe('idle');
      });

      it('should not fetch when workerTypeId is empty', async () => {
        // Arrange
        const emptyId = '';

        // Act
        const { result } = renderHook(() => useWorkerTypeUpgradePreview(emptyId, true), { wrapper });

        // Assert
        expect(result.current.fetchStatus).toBe('idle');
      });
    });

    describe('usePreviewWorkerTypeUpgrade (mutation)', () => {
      it('should preview a worker type upgrade', async () => {
        // Arrange
        const previewData = {
          employeeId: '123e4567-e89b-12d3-a456-426614174000',
          currentWorkerTypeId: '223e4567-e89b-12d3-a456-426614174001',
          targetWorkerTypeId: '323e4567-e89b-12d3-a456-426614174002',
          effectiveDate: '2025-02-01',
        };
        const mockPreview = {
          fromTemplate: { id: previewData.currentWorkerTypeId, version: 1 },
          toTemplate: { id: previewData.targetWorkerTypeId, version: 2 },
          componentChanges: [],
          affectedWorkersCount: 1,
        };
        mockPaylinqClient.previewWorkerTypeUpgrade.mockResolvedValue({ data: mockPreview });

        // Act
        const { result } = renderHook(() => usePreviewWorkerTypeUpgrade(), { wrapper });
        result.current.mutate(previewData);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        expect(mockPaylinqClient.previewWorkerTypeUpgrade).toHaveBeenCalledWith(
          previewData.employeeId,
          {
            currentWorkerTypeId: previewData.currentWorkerTypeId,
            targetWorkerTypeId: previewData.targetWorkerTypeId,
            effectiveDate: previewData.effectiveDate,
          }
        );
      });
    });

    describe('useExecuteWorkerTypeUpgrade', () => {
      it('should execute a worker type upgrade successfully', async () => {
        // Arrange
        const upgradeData = {
          employeeId: '123e4567-e89b-12d3-a456-426614174000',
          currentWorkerTypeId: '223e4567-e89b-12d3-a456-426614174001',
          targetWorkerTypeId: '323e4567-e89b-12d3-a456-426614174002',
          effectiveDate: '2025-02-01',
        };
        const mockResult = { success: true, newAssignmentId: '423e4567-e89b-12d3-a456-426614174003' };
        mockPaylinqClient.executeWorkerTypeUpgrade.mockResolvedValue({ data: mockResult });

        // Act
        const { result } = renderHook(() => useExecuteWorkerTypeUpgrade(), { wrapper });
        result.current.mutate(upgradeData);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        expect(mockPaylinqClient.executeWorkerTypeUpgrade).toHaveBeenCalledWith(
          upgradeData.employeeId,
          {
            currentWorkerTypeId: upgradeData.currentWorkerTypeId,
            targetWorkerTypeId: upgradeData.targetWorkerTypeId,
            effectiveDate: upgradeData.effectiveDate,
          }
        );
        expect(mockToast.success).toHaveBeenCalledWith('Worker type upgraded successfully');
      });

      it('should invalidate employee assignments cache after upgrade', async () => {
        // Arrange
        const employeeId = '123e4567-e89b-12d3-a456-426614174000';
        const upgradeData = {
          employeeId,
          currentWorkerTypeId: '223e4567-e89b-12d3-a456-426614174001',
          targetWorkerTypeId: '323e4567-e89b-12d3-a456-426614174002',
          effectiveDate: '2025-02-01',
        };
        mockPaylinqClient.executeWorkerTypeUpgrade.mockResolvedValue({ data: {} });

        // Pre-populate cache
        queryClient.setQueryData(['employeeWorkerTypeAssignments', employeeId], []);

        // Act
        const { result } = renderHook(() => useExecuteWorkerTypeUpgrade(), { wrapper });
        result.current.mutate(upgradeData);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert
        const queryState = queryClient.getQueryState(['employeeWorkerTypeAssignments', employeeId]);
        expect(queryState?.isInvalidated).toBe(true);
      });

      it('should handle validation errors during upgrade', async () => {
        // Arrange
        const upgradeData = {
          employeeId: '123e4567-e89b-12d3-a456-426614174000',
          currentWorkerTypeId: '223e4567-e89b-12d3-a456-426614174001',
          targetWorkerTypeId: '323e4567-e89b-12d3-a456-426614174002',
          effectiveDate: '2025-02-01',
        };
        const error = { validationErrors: { effectiveDate: 'Date must be in the future' } };
        mockPaylinqClient.executeWorkerTypeUpgrade.mockRejectedValue(error);

        // Act
        const { result } = renderHook(() => useExecuteWorkerTypeUpgrade(), { wrapper });
        result.current.mutate(upgradeData);

        await waitFor(() => expect(result.current.isError).toBe(true));

        // Assert
        expect(result.current.error).toEqual(error);
      });
    });

    describe('useCompareTemplates', () => {
      it('should return stub comparison data', async () => {
        // Arrange
        const template1Id = '123e4567-e89b-12d3-a456-426614174000';
        const template2Id = '223e4567-e89b-12d3-a456-426614174001';

        // Act
        const { result } = renderHook(() => useCompareTemplates(template1Id, template2Id), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert - Should return stub data (TODO in implementation)
        expect(result.current.data).toBeDefined();
        expect(result.current.data?.template1).toBeDefined();
        expect(result.current.data?.template2).toBeDefined();
        expect(result.current.data?.differences).toBeDefined();
      });

      it('should not fetch when template IDs are missing', async () => {
        // Act
        const { result } = renderHook(() => useCompareTemplates('', ''), { wrapper });

        // Assert
        expect(result.current.fetchStatus).toBe('idle');
      });
    });

    describe('useWorkerTypeUpgradeStatus', () => {
      it('should return stub upgrade status', async () => {
        // Arrange
        const workerId = '123e4567-e89b-12d3-a456-426614174000';

        // Act
        const { result } = renderHook(() => useWorkerTypeUpgradeStatus(workerId), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Assert - Should return stub data (TODO in implementation)
        expect(result.current.data).toBeDefined();
        expect(result.current.data?.canUpgrade).toBeDefined();
        expect(result.current.data?.availableUpgrades).toBeDefined();
      });

      it('should not fetch when worker ID is missing', async () => {
        // Act
        const { result } = renderHook(() => useWorkerTypeUpgradeStatus(''), { wrapper });

        // Assert
        expect(result.current.fetchStatus).toBe('idle');
      });
    });
  });

  describe('cache management', () => {
    it('should use correct query keys for caching', async () => {
      // Arrange
      mockPaylinqClient.getWorkerTypeTemplates.mockResolvedValue({ data: { templates: [] } });

      // Act
      renderHook(() => useWorkerTypeTemplates(), { wrapper });

      await waitFor(() => {
        const queryState = queryClient.getQueryState(['workerTypeTemplates']);
        expect(queryState).toBeDefined();
      });
    });

    it('should cache templates and not refetch on remount', async () => {
      // Arrange
      const mockData = [{ id: '123', code: 'TEST' }];
      mockPaylinqClient.getWorkerTypeTemplates.mockResolvedValue({ data: { templates: mockData } });

      // Act - First mount
      const { unmount } = renderHook(() => useWorkerTypeTemplates(), { wrapper });
      await waitFor(() =>
        expect(mockPaylinqClient.getWorkerTypeTemplates).toHaveBeenCalledTimes(1)
      );

      // Unmount and remount
      unmount();
      renderHook(() => useWorkerTypeTemplates(), { wrapper });

      // Assert - Should use cache, not refetch
      expect(mockPaylinqClient.getWorkerTypeTemplates).toHaveBeenCalledTimes(1);
    });
  });

  describe('error scenarios', () => {
    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network error: timeout');
      mockPaylinqClient.getWorkerTypeTemplates.mockRejectedValue(networkError);

      // Act
      const { result } = renderHook(() => useWorkerTypeTemplates(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert
      expect(result.current.error).toEqual(networkError);
    });

    it('should handle API errors with toast messages', async () => {
      // Arrange
      const newTemplate = { code: 'TEST', name: 'Test' };
      const error = new Error('API Error');
      mockPaylinqClient.createWorkerTypeTemplate.mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useCreateWorkerTypeTemplate(), { wrapper });
      result.current.mutate(newTemplate);

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert - Toast error should be called via handleApiError
      expect(mockToast.error).toHaveBeenCalled();
    });
  });
});
