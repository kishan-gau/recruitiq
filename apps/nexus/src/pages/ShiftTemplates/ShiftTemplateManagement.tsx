/**
 * Shift Template Management Page
 * 
 * Main page for managing shift templates with CRUD operations,
 * search, filtering, and bulk actions following established patterns.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  useShiftTemplates,
  useShiftTemplate,
  useDeleteShiftTemplate,
  useToggleShiftTemplateStatus,
  useBulkShiftTemplateOperations,
  usePrefetchShiftTemplate,
  useCreateShiftTemplate,
  useUpdateShiftTemplate
} from '@/hooks/schedulehub/useShiftTemplates';
import {
  ShiftTemplateFilters,
  ShiftTemplateSortField,
  SortOrder,
  ShiftTemplateSummary
} from '@/types/shift-templates';
import { useToast } from '../../contexts/ToastContext';
import { handleApiError } from '../../utils/errorHandler';
import { formatDuration, formatTime } from '../../utils/dateUtils';
import { format, isValid, parseISO } from 'date-fns';

// Helper function to safely format dates
const safeFormatDate = (dateString: string | null | undefined, formatStr: string): string => {
  if (!dateString) return 'Not available';
  
  try {
    // Try to parse as ISO string first, then as regular date
    const date = dateString.includes('T') ? parseISO(dateString) : new Date(dateString);
    
    if (!isValid(date)) {
      return 'Invalid date';
    }
    
    return format(date, formatStr);
  } catch (error) {
    return 'Invalid date';
  }
};

// Helper function to calculate duration from start and end times
const calculateShiftDuration = (startTime: string, endTime: string): number => {
  console.log('calculateShiftDuration called with:', { startTime, endTime });
  
  if (!startTime || !endTime) {
    console.log('Missing start or end time');
    return 0;
  }
  
  try {
    // Parse time strings (supporting both HH:mm and HH:mm:ss formats)
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    
    if (startParts.length < 2 || endParts.length < 2) {
      console.log('Invalid time format - need at least HH:mm');
      return 0;
    }
    
    const startHours = parseInt(startParts[0], 10);
    const startMinutes = parseInt(startParts[1], 10);
    const endHours = parseInt(endParts[0], 10);
    const endMinutes = parseInt(endParts[1], 10);
    
    if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
      console.log('Could not parse time values');
      return 0;
    }
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    let endTotalMinutes = endHours * 60 + endMinutes;
    
    console.log('Parsed times:', { startTotalMinutes, endTotalMinutes });
    
    // Handle overnight shifts (end time is next day)
    if (endTotalMinutes <= startTotalMinutes) {
      endTotalMinutes += 24 * 60; // Add 24 hours
      console.log('Overnight shift detected, adjusted endTotalMinutes:', endTotalMinutes);
    }
    
    const duration = endTotalMinutes - startTotalMinutes;
    console.log('Calculated duration in minutes:', duration);
    return duration;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 0;
  }
};

// Components
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import TemplateFilters from '../../components/ShiftTemplates/ShiftTemplateFilters';
import ShiftTemplateForm from '../../components/ShiftTemplates/ShiftTemplateForm';
import ShiftTemplateCard from '../../components/ShiftTemplates/ShiftTemplateCard';

interface ShiftTemplateManagementProps {
  // Future extensibility for different contexts
  mode?: 'full' | 'selection';
  onTemplateSelect?: (template: ShiftTemplateSummary) => void;
}

export default function ShiftTemplateManagement({
  mode = 'full',
  onTemplateSelect
}: ShiftTemplateManagementProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { prefetchTemplate } = usePrefetchShiftTemplate();

  // Route detection
  const location = useLocation();
  const params = useParams();
  const isCreateMode = location.pathname.endsWith('/new');
  const isEditMode = params.id && location.pathname.endsWith('/edit');
  const isViewMode = params.id && !location.pathname.endsWith('/edit') && !isCreateMode;
  const templateId = params.id;

  // Debug logging
  console.log('ShiftTemplateManagement - Current pathname:', location.pathname);
  console.log('ShiftTemplateManagement - Params:', params);
  console.log('ShiftTemplateManagement - isCreateMode:', isCreateMode);
  console.log('ShiftTemplateManagement - isEditMode:', isEditMode);
  console.log('ShiftTemplateManagement - isViewMode:', isViewMode);
  console.log('ShiftTemplateManagement - templateId:', templateId);

  // State management
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [filters, setFilters] = useState<ShiftTemplateFilters>({
    page: 1,
    limit: 20,
    sortBy: 'templateName',
    sortOrder: 'asc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    templateId?: string;
    templateName?: string;
  }>({ show: false });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Data fetching
  const {
    data,
    isLoading,
    error,
    refetch
  } = useShiftTemplates(filters);
  
  // Extract templates array from response data
  const templates = data?.templates || [];

  // Mutations - ALL hooks must be called at the top level, not conditionally
  const deleteMutation = useDeleteShiftTemplate();
  const createMutation = useCreateShiftTemplate(); // Moved from conditional block
  const updateMutation = useUpdateShiftTemplate();
  
  // Single useShiftTemplate hook call - conditionally enabled based on mode
  const { 
    data: template, 
    isLoading: isLoadingTemplate, 
    error: templateError 
  } = useShiftTemplate(
    templateId || '', 
    !!templateId && (isEditMode || isViewMode)
  );
  
  const handleDeleteSuccess = () => {
    toast.success('Shift template deleted successfully');
    setDeleteConfirm({ show: false });
  };
  
  const handleDeleteError = (error: Error) => {
    handleApiError(error, { toast, defaultMessage: 'Failed to delete shift template' });
  };

  const toggleStatusMutation = useToggleShiftTemplateStatus();
  
  const handleToggleSuccess = (updatedTemplate: { id: string; isActive: boolean }) => {
    const status = updatedTemplate.isActive ? 'activated' : 'deactivated';
    toast.success(`Shift template ${status} successfully`);
  };
  
  const handleToggleError = (error: Error) => {
    handleApiError(error, { toast, defaultMessage: 'Failed to toggle template status' });
  };

  const bulkOperationsMutation = useBulkShiftTemplateOperations();
  
  const handleBulkOperationSuccess = (_: any, { operation }: { operation: 'delete' | 'activate' | 'deactivate' }) => {
    const operationText: Record<string, string> = {
      delete: 'deleted',
      activate: 'activated',
      deactivate: 'deactivated'
    };
    toast.success(`${selectedTemplates.length} templates ${operationText[operation]} successfully`);
    setSelectedTemplates([]);
    setBulkDeleteConfirm(false);
  };
  
  const handleBulkOperationError = (error: Error) => {
    handleApiError(error, { toast, defaultMessage: 'Bulk operation failed' });
  };

  // Event handlers
  const handleSearch = useCallback((searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm || undefined,
      page: 1
    }));
  }, []);

  const handleFilterChange = useCallback((newFilters: Partial<ShiftTemplateFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1
    }));
  }, []);

  const handleSort = useCallback((sortBy: ShiftTemplateSortField, sortOrder: SortOrder) => {
    setFilters(prev => ({
      ...prev,
      sortBy: sortBy as ShiftTemplateFilters['sortBy'],
      sortOrder,
      page: 1
    }));
  }, []);

  const handleTemplateSelect = useCallback((templateId: string, selected: boolean) => {
    setSelectedTemplates(prev => 
      selected 
        ? [...prev, templateId]
        : prev.filter(id => id !== templateId)
    );
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedTemplates(selected ? templates.map((t: ShiftTemplateSummary) => t.id) : []);
  }, [templates]);

  const handleTemplateClick = useCallback((template: ShiftTemplateSummary) => {
    if (mode === 'selection' && onTemplateSelect) {
      onTemplateSelect(template);
    } else {
      navigate(`/schedulehub/shift-templates/${template.id}`);
    }
  }, [mode, onTemplateSelect, navigate]);

  const handleTemplateHover = useCallback((templateId: string) => {
    // Prefetch template details for better UX
    prefetchTemplate(templateId);
  }, [prefetchTemplate]);

  const handleEdit = useCallback((templateId: string) => {
    navigate(`/schedulehub/shift-templates/${templateId}/edit`);
  }, [navigate]);

  const handleClone = useCallback((templateId: string) => {
    navigate(`/schedulehub/shift-templates/${templateId}/clone`);
  }, [navigate]);

  const handleDelete = useCallback((template: ShiftTemplateSummary) => {
    setDeleteConfirm({
      show: true,
      templateId: template.id,
      templateName: template.templateName
    });
  }, []);

  const handleToggleStatus = useCallback(async (templateId: string) => {
    try {
      const template = templates.find((t: ShiftTemplateSummary) => t.id === templateId);
      if (template) {
        await toggleStatusMutation.mutateAsync({ id: templateId, isActive: !template.isActive });
        handleToggleSuccess({ id: templateId, isActive: !template.isActive });
      }
    } catch (error) {
      handleToggleError(error as Error);
    }
  }, [toggleStatusMutation, templates, handleToggleSuccess, handleToggleError]);

  const confirmDelete = useCallback(async () => {
    if (deleteConfirm.templateId) {
      try {
        await deleteMutation.mutateAsync(deleteConfirm.templateId);
        handleDeleteSuccess();
      } catch (error) {
        handleDeleteError(error as Error);
      }
    }
  }, [deleteConfirm.templateId, deleteMutation, handleDeleteSuccess, handleDeleteError]);

  const handleBulkDelete = useCallback(() => {
    setBulkDeleteConfirm(true);
  }, []);

  const handleBulkActivate = useCallback(async () => {
    try {
      await bulkOperationsMutation.bulkActivate.mutateAsync(selectedTemplates);
      handleBulkOperationSuccess(null, { operation: 'activate' });
    } catch (error) {
      handleBulkOperationError(error as Error);
    }
  }, [selectedTemplates, bulkOperationsMutation, handleBulkOperationSuccess, handleBulkOperationError]);

  const handleBulkDeactivate = useCallback(async () => {
    try {
      await bulkOperationsMutation.bulkDeactivate.mutateAsync(selectedTemplates);
      handleBulkOperationSuccess(null, { operation: 'deactivate' });
    } catch (error) {
      handleBulkOperationError(error as Error);
    }
  }, [selectedTemplates, bulkOperationsMutation, handleBulkOperationSuccess, handleBulkOperationError]);

  const confirmBulkDelete = useCallback(async () => {
    try {
      await bulkOperationsMutation.bulkDelete.mutateAsync(selectedTemplates);
      handleBulkOperationSuccess(null, { operation: 'delete' });
    } catch (error) {
      handleBulkOperationError(error as Error);
    }
  }, [selectedTemplates, bulkOperationsMutation, handleBulkOperationSuccess, handleBulkOperationError]);

  const handleCreateNew = useCallback(() => {
    console.log('handleCreateNew - Current location:', location.pathname);
    console.log('handleCreateNew - Navigating to: /schedulehub/shift-templates/new');
    navigate('/schedulehub/shift-templates/new');
  }, [navigate, location.pathname]);

  // Computed values
  const hasSelection = selectedTemplates.length > 0;
  const isAllSelected = templates.length > 0 && selectedTemplates.length === templates.length;
  // Remove unused variable

  const bulkActions = useMemo(() => [
    {
      label: 'Activate Selected',
      action: handleBulkActivate,
      icon: 'CheckCircle',
      variant: 'success' as const
    },
    {
      label: 'Deactivate Selected',
      action: handleBulkDeactivate,
      icon: 'XCircle',
      variant: 'warning' as const
    },
    {
      label: 'Delete Selected',
      action: handleBulkDelete,
      icon: 'Trash',
      variant: 'danger' as const
    }
  ], [handleBulkActivate, handleBulkDeactivate, handleBulkDelete]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Failed to load shift templates</h2>
        <p className="text-red-600 dark:text-red-400 mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Conditional rendering based on route
  if (isCreateMode) {
    const handleCreateSubmit = async (data: any) => {
      try {
        await createMutation.mutateAsync(data);
        navigate('/schedulehub/shift-templates');
      } catch (error) {
        console.error('Failed to create shift template:', error);
        // Error handling is done by the mutation hook and toast notifications
      }
    };

    return (
      <div className="space-y-6">
        {/* Page Header for Create Mode */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Shift Template</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Set up a new shift template with role assignments</p>
          </div>
          <button
            onClick={() => navigate('/schedulehub/shift-templates')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <span>←</span>
            Back to Templates
          </button>
        </div>
        
        {/* Creation Form */}
        <ShiftTemplateForm
          mode="create"
          onSubmit={handleCreateSubmit}
          onCancel={() => navigate('/schedulehub/shift-templates')}
          isSubmitting={createMutation.isPending}
        />
      </div>
    );
  }

  // Handle edit mode
  if (isEditMode && templateId) {
    // Debug: Log the template found for editing
    console.log('ShiftTemplateManagement edit mode:', { templateId, template, roles: template?.roles, roleRequirements: template?.roleRequirements });
    
    if (templateError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">Template not found</p>
            <button
              onClick={() => navigate('/schedulehub/shift-templates')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Templates
            </button>
          </div>
        </div>
      );
    }

    if (isLoadingTemplate || !template) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <LoadingSpinner />
            <p className="text-gray-600 dark:text-gray-400">Loading template...</p>
          </div>
        </div>
      );
    }

    const handleEditSubmit = async (data: any) => {
      try {
        await updateMutation.mutateAsync({
          id: templateId,
          updates: data
        });
        navigate('/schedulehub/shift-templates');
      } catch (error) {
        console.error('Failed to update shift template:', error);
        // Error handling is done by the mutation hook and toast notifications
      }
    };

    return (
      <div className="space-y-6">
        {/* Page Header for Edit Mode */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Shift Template</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Modify the shift template settings and role assignments</p>
          </div>
          <button
            onClick={() => navigate('/schedulehub/shift-templates')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <span>←</span>
            Back to Templates
          </button>
        </div>
        
        {/* Edit Form */}
        <ShiftTemplateForm
          mode="edit"
          template={template}
          onSubmit={handleEditSubmit}
          onCancel={() => navigate('/schedulehub/shift-templates')}
          isSubmitting={updateMutation.isPending}
        />
      </div>
    );
  }

  // Handle view mode (individual template details)
  if (isViewMode && templateId) {
    if (templateError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">Template not found</p>
            <button
              onClick={() => navigate('/schedulehub/shift-templates')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Templates
            </button>
          </div>
        </div>
      );
    }

    if (isLoadingTemplate || !template) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <LoadingSpinner />
            <p className="text-gray-600 dark:text-gray-400">Loading template details...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Template Details Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/schedulehub/shift-templates')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Back to templates"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{template.templateName}</h1>
              <p className="text-gray-600 dark:text-gray-400">Template Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/schedulehub/shift-templates/${templateId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Template
            </button>
          </div>
        </div>

        {/* Template Details Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Template Name</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{template.templateName}</p>
                  </div>
                  {template.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
                      <p className="mt-1 text-gray-900 dark:text-white">{template.description}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        template.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Shift Details</h3>
                <div className="space-y-3">
                  {template.startTime && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Time</label>
                      <p className="mt-1 text-gray-900 dark:text-white">{formatTime(template.startTime)}</p>
                    </div>
                  )}
                  {template.endTime && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">End Time</label>
                      <p className="mt-1 text-gray-900 dark:text-white">{formatTime(template.endTime)}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {(() => {
                        const calculatedDuration = calculateShiftDuration(template.startTime, template.endTime);
                        console.log('Duration calculation:', {
                          startTime: template.startTime,
                          endTime: template.endTime,
                          shiftDuration: template.shiftDuration,
                          calculatedDuration: calculatedDuration
                        });
                        return formatDuration(template.shiftDuration || calculatedDuration);
                      })()}
                    </p>
                  </div>
                  {(template.breakDuration || 0) > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Break Duration</label>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {formatDuration(template.breakDuration || 0)}
                      </p>
                    </div>
                  )}
                  {template.stationName && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Station</label>
                      <p className="mt-1 text-gray-900 dark:text-white">{template.stationName}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Roles and Staffing */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Roles & Staffing</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{template.roleRequirements?.length || 0}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Roles Assigned</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {template.roleRequirements?.reduce((sum, role) => sum + (role.quantity || 0), 0) || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff Required</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {template.isActive ? 'Active' : 'Inactive'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Status</p>
                  </div>
                </div>

                {/* Role Requirements Details */}
                {template.roleRequirements && template.roleRequirements.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Role Requirements</h4>
                    <div className="space-y-3">
                      {template.roleRequirements.map((role, index) => (
                        <div key={role.id || index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                {role.roleName || 'Unknown Role'}
                              </h5>
                              {role.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{role.description}</p>
                              )}
                            </div>
                            <div className="ml-4 text-right">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                  {role.quantity || 0} required
                                </span>
                                {role.proficiencyLevel && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    role.proficiencyLevel === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    role.proficiencyLevel === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    role.proficiencyLevel === 'advanced' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    role.proficiencyLevel === 'expert' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                  }`}>
                                    {role.proficiencyLevel}
                                  </span>
                                )}
                              </div>
                              {role.priority && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Priority: {role.priority}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-gray-500 dark:text-gray-400">Created</label>
                  <p className="text-gray-900 dark:text-white">
                    {safeFormatDate(template.createdAt, 'PPP')} at {safeFormatDate(template.createdAt, 'p')}
                  </p>
                </div>
                {template.updatedAt !== template.createdAt && (
                  <div>
                    <label className="text-gray-500 dark:text-gray-400">Last Updated</label>
                    <p className="text-gray-900 dark:text-white">
                      {safeFormatDate(template.updatedAt, 'PPP')} at {safeFormatDate(template.updatedAt, 'p')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Shift Templates</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage shift templates and role assignments</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          <span>+</span>
          Create Template
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search templates by name, description, or station..."
              value={filters.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 dark:text-gray-500">🔍</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <span>Filters</span>
          <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <TemplateFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onSort={handleSort}
        />
      )}

      {/* Bulk Actions */}
      {hasSelection && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-blue-800 dark:text-blue-300 font-medium">
                {selectedTemplates.length} of {templates.length} selected
              </span>
              <button
                onClick={() => handleSelectAll(!isAllSelected)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {bulkActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    action.variant === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' :
                    action.variant === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50' :
                    action.variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <EmptyState
          title="No shift templates found"
          description="Get started by creating your first shift template"
          action={{
            label: 'Create Template',
            onClick: handleCreateNew
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template: ShiftTemplateSummary) => (
            <ShiftTemplateCard
              key={template.id}
              template={template}
              onClick={() => handleTemplateClick(template)}
              onEdit={() => handleEdit(template.id)}
              onClone={() => handleClone(template.id)}
              onDelete={() => handleDelete(template)}
              onToggleStatus={() => handleToggleStatus(template.id)}
              isStatusToggling={toggleStatusMutation.isPending}
              selected={selectedTemplates.includes(template.id)}
              onSelect={(selected: boolean) => handleTemplateSelect(template.id, selected)}
              selectionMode={mode === 'selection'}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {templates.length > 0 && (
        <div className="flex justify-center">
          {/* Pagination component would go here */}
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false })}
        onConfirm={confirmDelete}
        title="Delete Shift Template"
        message={`Are you sure you want to delete "${deleteConfirm.templateName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Shift Templates"
        message={`Are you sure you want to delete ${selectedTemplates.length} selected templates? This action cannot be undone.`}
        confirmText="Delete All"
        variant="danger"
        isLoading={bulkOperationsMutation.bulkDelete.isPending}
      />
    </div>
  );
}