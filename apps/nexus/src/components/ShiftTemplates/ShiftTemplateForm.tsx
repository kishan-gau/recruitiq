/**
 * Shift Template Form Component
 * 
 * Form for creating and editing shift templates with role management.
 * Supports validation, auto-save, and complex role configuration.
 */

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/contexts/ToastContext';
import {
  CreateShiftTemplateInput,
  UpdateShiftTemplateInput,
  ShiftTemplate
} from '@/types/shift-templates';
import type { Station, Role } from '@/types/schedulehub';
import { useStations } from '@/hooks/schedulehub/useStations';
import { useRoles } from '@/hooks/schedulehub/useRoles';
import { formatDuration } from '../../utils/dateUtils';
import { handleFormError } from '@recruitiq/utils';

// Validation schema
const shiftTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  stationIds: z.array(z.string().uuid()).optional().default([]),
  shiftDuration: z.number().min(30, 'Minimum shift duration is 30 minutes').max(1440, 'Maximum shift duration is 24 hours'),
  breakDuration: z.number().min(0).max(240, 'Maximum break duration is 4 hours'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  isFlexibleTiming: z.boolean(),
  isActive: z.boolean(),
  roles: z.array(z.object({
    roleId: z.string().uuid('Please select a role'),
    quantity: z.number().min(1, 'At least 1 required').max(50, 'Maximum 50 per role'),
    minimumProficiency: z.number().min(1).max(5).optional(),
    preferredProficiency: z.number().min(1).max(5).optional(),
    isPrimaryRole: z.boolean().optional(),
    priority: z.number().min(1).max(10).optional(),
    isFlexible: z.boolean().optional()
  })).min(1, 'At least one role is required')
});

type FormData = z.infer<typeof shiftTemplateSchema>;

interface ShiftTemplateFormProps {
  template?: ShiftTemplate;
  onSubmit: (data: CreateShiftTemplateInput | UpdateShiftTemplateInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  mode: 'create' | 'edit' | 'clone';
}

export default function ShiftTemplateForm({
  template,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode
}: ShiftTemplateFormProps) {

  const [previewDuration, setPreviewDuration] = useState<string>('');  
  const [showStationsDropdown, setShowStationsDropdown] = useState(false);
  const [stationSearchTerm, setStationSearchTerm] = useState('');

  // Debug: Log template data to see what's being passed
  console.log('ShiftTemplateForm received template:', { mode, template, roles: template?.roles, roleRequirements: template?.roleRequirements });

  // Data hooks
  const { data: stations, isLoading: isLoadingStations, error: stationsError } = useStations();
  const { data: rolesData } = useRoles();
  const roles = rolesData?.roles || [];
  const toast = useToast();

  // Filter stations based on search term
  const filteredStations = stations?.filter((station: Station) => 
    station.name.toLowerCase().includes(stationSearchTerm.toLowerCase())
  ) ?? [];

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isValid, isDirty: formIsDirty }
  } = useForm<FormData>({
    resolver: zodResolver(shiftTemplateSchema),
    defaultValues: {
      templateName: mode === 'clone' ? `${template?.templateName} (Copy)` : template?.templateName || '',
      description: template?.description || '',
      stationIds: template?.stationIds || (template?.stationId ? [template.stationId] : []),
      shiftDuration: template?.shiftDuration || 480, // 8 hours default
      breakDuration: template?.breakDuration || 30,
      startTime: template?.startTime || '',
      endTime: template?.endTime || '',
      isFlexibleTiming: template?.isFlexibleTiming || false,
      isActive: template?.isActive !== undefined ? template.isActive : true,
      roles: template?.roles?.map(role => ({
        roleId: role.roleId,
        quantity: role.quantity || 1,
        minimumProficiency: role.minimumProficiency || 1,
        preferredProficiency: role.preferredProficiency || 3,
        isPrimaryRole: role.isPrimaryRole || false,
        priority: role.priority || 1,
        isFlexible: role.isFlexible || false
      })) || []
    },
    mode: 'onChange'
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'roles'
  });

  // Reset form when template data arrives (for edit mode)
  useEffect(() => {
    if (template && mode === 'edit' && roles.length > 0) {
      console.log('🔄 [ShiftTemplateForm] Resetting form with template data:', template);
      console.log('🔄 [ShiftTemplateForm] Available roles for dropdown:', roles);
      console.log('🔄 [ShiftTemplateForm] Template roles array:', template.roles);
      console.log('🔄 [ShiftTemplateForm] Template roleRequirements array:', template.roleRequirements);
      console.log('🔄 [ShiftTemplateForm] Template keys:', Object.keys(template));
      console.log('🔄 [ShiftTemplateForm] typeof roles:', typeof template.roles);
      console.log('🔄 [ShiftTemplateForm] typeof roleRequirements:', typeof template.roleRequirements);
      
      const rolesToUse = template.roles || template.roleRequirements || [];
      console.log('🔄 [ShiftTemplateForm] Using roles for form:', rolesToUse);
      console.log('🔄 [ShiftTemplateForm] rolesToUse length:', rolesToUse.length);
      console.log('🔄 [ShiftTemplateForm] rolesToUse isArray:', Array.isArray(rolesToUse));
      
      reset({
        templateName: template.templateName || '',
        description: template.description || '',
        stationIds: template.stationIds || (template.stationId ? [template.stationId] : []),
        shiftDuration: template.shiftDuration || 480,
        breakDuration: template.breakDuration || 30,
        startTime: template.startTime || '',
        endTime: template.endTime || '',
        isFlexibleTiming: template.isFlexibleTiming || false,
        isActive: template.isActive !== undefined ? template.isActive : true,
        roles: rolesToUse?.map((role: any, idx: number) => {
          console.log(`🔄 [ShiftTemplateForm] Mapping role ${idx}:`, role);
          console.log(`🔄 [ShiftTemplateForm] Role ${idx} keys:`, Object.keys(role));
          console.log(`🔄 [ShiftTemplateForm] Role ${idx} roleId:`, role.roleId);
          const mappedRole = {
            roleId: role.roleId,
            quantity: role.quantity || 1,
            minimumProficiency: role.minimumProficiency || 1,
            preferredProficiency: role.preferredProficiency || 3,
            isPrimaryRole: role.isPrimaryRole || false,
            priority: role.priority || 1,
            isFlexible: role.isFlexible || false
          };
          console.log(`🔄 [ShiftTemplateForm] Mapped role ${idx}:`, mappedRole);
          return mappedRole;
        }) || []
      });
    }
  }, [template, mode, reset, roles]);

  // Use react-hook-form's built-in dirty state tracking instead of manual state

  // Calculate end time when duration or start time changes
  const shiftDuration = watch('shiftDuration');
  const startTime = watch('startTime');
  const isFlexibleTiming = watch('isFlexibleTiming');

  useEffect(() => {
    if (!isFlexibleTiming && startTime && shiftDuration) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + shiftDuration;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      setValue('endTime', endTime);
    }
  }, [shiftDuration, startTime, isFlexibleTiming, setValue]);

  // Update preview duration
  useEffect(() => {
    setPreviewDuration(formatDuration(shiftDuration || 0));
  }, [shiftDuration]);

  const handleFormSubmit: (data: FormData) => Promise<void> = async (data: FormData) => {
    try {
      await onSubmit(data as CreateShiftTemplateInput);
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Create a wrapper function to adapt React Hook Form's setError to the expected signature
      const setFieldErrors = (errors: Record<string, string>) => {
        Object.entries(errors).forEach(([field, message]: [string, string]) => {
          setError(field as keyof FormData, { 
            type: 'manual', 
            message 
          });
        });
      };
      
      // Field mapping for better error messages
      const fieldMap = {
        templateName: 'Template name is required',
        startTime: 'Start time is required',
        endTime: 'End time is required', 
        stationId: 'Station is required',
        shiftDuration: 'Shift duration must be a positive number',
        breakDuration: 'Break duration must be a positive number'
      };
      
      // Use centralized error handler with proper parameters
      handleFormError(
        error, 
        setFieldErrors, 
        toast.error, 
        'Failed to save shift template. Please check your input and try again.',
        fieldMap
      );
    }
  };

  const addRole = () => {
    append({
      roleId: '',
      quantity: 1,
      minimumProficiency: 1,
      preferredProficiency: 3,
      isPrimaryRole: fields.length === 0,
      priority: fields.length + 1,
      isFlexible: false
    });
  };

  const removeRole = (index: number) => {
    remove(index);
    // Adjust priorities
    fields.forEach((field: any, i: number) => {
      if (i > index) {
        update(i, { ...field, priority: (field.priority || 0) - 1 });
      }
    });
  };

  const moveRole = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentRole = fields[index];
    const targetRole = fields[targetIndex];

    // Swap roles and priorities
    update(index, { ...targetRole, priority: currentRole.priority });
    update(targetIndex, { ...currentRole, priority: targetRole.priority });
  };

  const totalStaff = fields.reduce((sum, role) => sum + role.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'create' && 'Create New Shift Template'}
            {mode === 'edit' && 'Edit Shift Template'}
            {mode === 'clone' && 'Clone Shift Template'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure the shift template details and assign roles with required staff counts.
          </p>
        </div>

        <div className="px-6 space-y-6">
          {/* Basic Information */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  {...register('templateName')}
                  className={`
                    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                    ${errors.templateName 
                      ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                    }
                  `}
                  placeholder="Enter template name"
                />
                {errors.templateName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.templateName.message}</p>
                )}
              </div>

              {/* Stations multi-select dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stations (optional)
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStationsDropdown(!showStationsDropdown)}
                    className="relative w-full cursor-pointer rounded-lg bg-white dark:bg-gray-700 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-gray-600"
                  >
                    <span className="block truncate text-gray-700 dark:text-gray-300">
                      {watch('stationIds')?.length > 0 
                        ? `${watch('stationIds').length} station${watch('stationIds').length > 1 ? 's' : ''} selected`
                        : 'Select stations...'}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${showStationsDropdown ? 'rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </button>

                  {showStationsDropdown && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-hidden rounded-md bg-white dark:bg-gray-700 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      {/* Search input */}
                      <div className="sticky top-0 bg-white dark:bg-gray-700 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
                        <input
                          type="text"
                          placeholder="Search stations..."
                          value={stationSearchTerm}
                          onChange={(e) => setStationSearchTerm(e.target.value)}
                          className="w-full px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      {/* Loading state */}
                      {isLoadingStations && (
                        <div className="py-8 px-3 text-center text-gray-500 dark:text-gray-400">
                          <div className="inline-flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                            <span>Loading stations...</span>
                          </div>
                        </div>
                      )}

                      {/* Error state */}
                      {stationsError && (
                        <div className="py-3 px-3 text-red-600 dark:text-red-400 text-sm text-center">
                          Failed to load stations
                        </div>
                      )}

                      {/* Station options */}
                      {!isLoadingStations && !stationsError && (
                        <div className="max-h-48 overflow-y-auto">
                          {filteredStations.length > 0 ? (
                            filteredStations.map((station: Station) => {
                              const currentStationIds = watch('stationIds');
                              const isSelected = currentStationIds?.includes(station.id);
                              
                              // Debug logging for checkbox state
                              if (station.id === 'e3f9239d-73bf-4c11-94d5-b2ca75439461') {
                                console.log('🔍 [Checkbox Debug] Station:', station.id);
                                console.log('🔍 [Checkbox Debug] watch("stationIds"):', currentStationIds);
                                console.log('🔍 [Checkbox Debug] isSelected:', isSelected);
                              }
                              
                              return (
                                <div
                                  key={station.id}
                                  onClick={() => {
                                    const currentValues = watch('stationIds') || [];
                                    const newValues = isSelected
                                      ? currentValues.filter(id => id !== station.id)
                                      : [...currentValues, station.id];
                                    setValue('stationIds', newValues, { shouldValidate: true });
                                  }}
                                  className="cursor-pointer select-none relative py-2 pl-3 pr-4 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-3"
                                >
                                  {/* Checkbox visual indicator */}
                                  <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    isSelected 
                                      ? 'bg-blue-600 border-blue-600 text-white' 
                                      : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  
                                  {/* Station name */}
                                  <span className={`block truncate font-normal ${
                                    isSelected 
                                      ? 'text-blue-900 dark:text-blue-200' 
                                      : 'text-gray-900 dark:text-gray-100'
                                  }`}>
                                    {station.name}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-3 px-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                              {stationSearchTerm ? `No stations found matching "${stationSearchTerm}"` : 'No stations available'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {errors.stationIds && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stationIds.message}</p>
                )}
              </div>

              {/* Display selected stations */}
              {watch('stationIds')?.length > 0 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selected Stations
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {watch('stationIds')?.map((stationId: string) => {
                      const station = stations?.find((s: Station) => s.id === stationId);
                      return station ? (
                        <span
                          key={stationId}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {station.name}
                          <button
                            type="button"
                            onClick={() => {
                              const currentValues = watch('stationIds') || [];
                              const newValues = currentValues.filter((id: string) => id !== stationId);
                              setValue('stationIds', newValues, { shouldValidate: true });
                            }}
                            className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none focus:bg-blue-200 focus:text-blue-600 dark:text-blue-300 dark:hover:bg-blue-800 dark:hover:text-blue-100"
                          >
                            <span className="sr-only">Remove {station.name}</span>
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className={`
                    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                    ${errors.description 
                      ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                    }
                  `}
                  placeholder="Optional description of the shift template"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Timing Configuration */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Timing Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Shift Duration (minutes) *
                </label>
                <input
                  type="number"
                  {...register('shiftDuration', { valueAsNumber: true })}
                  min="30"
                  max="1440"
                  step="15"
                  className={`
                    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                    ${errors.shiftDuration 
                      ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                    }
                  `}
                />
                {previewDuration && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Preview: {previewDuration}</p>
                )}
                {errors.shiftDuration && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.shiftDuration.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  {...register('breakDuration', { valueAsNumber: true })}
                  min="0"
                  max="240"
                  step="5"
                  className={`
                    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                    ${errors.breakDuration 
                      ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                    }
                  `}
                />
                {errors.breakDuration && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.breakDuration.message}</p>
                )}
              </div>

              <div className="flex items-center">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register('isFlexibleTiming')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Flexible Timing
                  </span>
                </label>
              </div>
            </div>

            {!isFlexibleTiming && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    {...register('startTime')}
                    className={`
                      w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                      ${errors.startTime 
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
                      }
                    `}
                  />
                  {errors.startTime && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startTime.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time (calculated)
                  </label>
                  <input
                    type="time"
                    {...register('endTime')}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Role Management */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Role Assignments</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total staff required: <span className="font-medium">{totalStaff}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={addRole}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Role
              </button>
            </div>

            {errors.roles && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{errors.roles.message}</p>
            )}

            <div className="space-y-4">
              {fields.map((field: any, index: number) => (
                <div key={field.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Role {index + 1}
                      {field.isPrimaryRole && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
                          Primary
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => moveRole(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRole(index, 'down')}
                        disabled={index === fields.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRole(index)}
                        className="p-1 text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        title="Remove role"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Role *
                      </label>
                      <select
                        {...register(`roles.${index}.roleId`)}
                        className={`
                          w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 dark:bg-gray-600 dark:text-gray-100
                          ${errors.roles?.[index]?.roleId 
                            ? 'border-red-300 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400'
                          }
                        `}
                      >
                        <option value="">Select role</option>
                        {Array.isArray(roles) && roles.map((role: Role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      {errors.roles?.[index]?.roleId && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.roles[index]?.roleId?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        {...register(`roles.${index}.quantity`, { valueAsNumber: true })}
                        min="1"
                        max="50"
                        className={`
                          w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 dark:bg-gray-600 dark:text-gray-100
                          ${errors.roles?.[index]?.quantity 
                            ? 'border-red-300 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400'
                          }
                        `}
                      />
                      {errors.roles?.[index]?.quantity && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.roles[index]?.quantity?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Min Proficiency
                      </label>
                      <select
                        {...register(`roles.${index}.minimumProficiency`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-600 dark:text-gray-100"
                      >
                        {[1, 2, 3, 4, 5].map((level) => (
                          <option key={level} value={level}>
                            Level {level}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Preferred Proficiency
                      </label>
                      <select
                        {...register(`roles.${index}.preferredProficiency`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-600 dark:text-gray-100"
                      >
                        {[1, 2, 3, 4, 5].map((level) => (
                          <option key={level} value={level}>
                            Level {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register(`roles.${index}.isPrimaryRole`)}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Primary Role</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register(`roles.${index}.isFlexible`)}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Flexible</span>
                    </label>

                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-gray-700 dark:text-gray-300">Priority:</label>
                      <input
                        type="number"
                        {...register(`roles.${index}.priority`, { valueAsNumber: true })}
                        min="1"
                        max="10"
                        className="w-12 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-600 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No roles assigned</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Add at least one role to define staffing requirements.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={addRole}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add First Role
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Status */}
          <section>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register('isActive')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-600 rounded"
              />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Template is active
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
              Active templates can be used for shift scheduling
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {formIsDirty && (
              <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Template' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}