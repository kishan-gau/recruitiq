import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, Clock, Save, ArrowLeft, Zap, MapPin, User, CheckCircle, Target, AlertTriangle, XCircle } from 'lucide-react';
import { useAutoGenerateSchedule, useRegenerateSchedule } from '@/hooks/schedulehub/useScheduleStats';
import { useNexusAPI } from '@/hooks/api/useNexusAPI';
import { schedulehubApi } from '@/lib/api/schedulehub';
import { Button, Modal, ModalFooter } from '@recruitiq/ui';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ShiftTemplateSummary } from '@/types/shift-templates';

interface DayTemplateMapping {
  [dayOfWeek: number]: string[]; // Array of template IDs for each day
}

const dayNames: { [key: number]: string } = {
  1: 'Monday',
  2: 'Tuesday', 
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  0: 'Sunday'
};

export default function ScheduleBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Route detection
  const isEditMode = params.id && location.pathname.includes('/edit');
  const isCreateMode = location.pathname.includes('/create') || location.pathname.includes('/builder');
  const scheduleId = params.id;

  const autoGenerateSchedule = useAutoGenerateSchedule();
  const regenerateSchedule = useRegenerateSchedule();
  
  // Initialize API hooks
  const nexusAPI = useNexusAPI();
  const { data: templatesData, isLoading: templatesLoading, isError: templatesError } = nexusAPI.shiftTemplates.list();

  const templates = (templatesData?.templates || []) as ShiftTemplateSummary[];
  const activeTemplates = templates.filter(template => template.isActive);

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    notes: '',
    allowPartialTime: false,
  });

  // Template selection state - templates mapped to days of the week
  const [dayTemplateMapping, setDayTemplateMapping] = useState<DayTemplateMapping>({
    1: [], // Monday
    2: [], // Tuesday
    3: [], // Wednesday
    4: [], // Thursday
    5: [], // Friday
    6: [], // Saturday
    0: [], // Sunday
  });

  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showFormValidationDialog, setShowFormValidationDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Enhanced success dialog state
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [regenerationResult, setRegenerationResult] = useState<any>(null);

  // Load existing schedule data when in edit mode using React Query
  const { data: scheduleResponse, isLoading: scheduleLoading, error: scheduleError } = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: () => schedulehubApi.schedules.get(scheduleId!, true),
    enabled: !!(isEditMode && scheduleId),
  });

  const schedule = scheduleResponse?.schedule;
  const shifts = scheduleResponse?.shifts || [];

  // Track if we've already loaded the initial template mapping from shifts
  const [hasLoadedInitialMapping, setHasLoadedInitialMapping] = useState(false);

  // Populate form data and dayTemplateMapping when schedule loads (ONE TIME ONLY)
  useEffect(() => {
    if (isEditMode && schedule && shifts && !hasLoadedInitialMapping && !scheduleLoading) {
      console.log('🚀 [SCHEDULE LOAD] Loading schedule data one time only');
      console.log('🚀 [SCHEDULE LOAD] Schedule:', schedule.name);
      console.log('🚀 [SCHEDULE LOAD] Shifts:', shifts.length);
      
      // Format dates for input fields (YYYY-MM-DD)
      // Fix: Handle timezone issues by extracting date directly from ISO string
      const formatDateForInput = (dateString: string) => {
        console.log('🔧 [formatDateForInput] Input:', dateString);
        if (!dateString) return '';
        try {
          // If it's already in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ), extract the date part
          if (dateString.includes('T') && dateString.includes('Z')) {
            const result = dateString.split('T')[0];
            console.log('🔧 [formatDateForInput] ISO format detected, extracted:', result);
            return result;
          }
          
          // If it's just a date string (YYYY-MM-DD), use it directly
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            console.log('🔧 [formatDateForInput] YYYY-MM-DD format, using as-is:', dateString);
            return dateString;
          }
          
          // Fallback: use Date object but be careful with timezone
          console.log('🔧 [formatDateForInput] Using Date fallback for:', dateString);
          const date = new Date(dateString);
          const result = date.toISOString().split('T')[0];
          console.log('🔧 [formatDateForInput] Date fallback result:', result);
          return result;
        } catch (error) {
          console.error('Error formatting date:', error);
          return '';
        }
      };

      // Debug: Log date conversion
      console.log('📅 [DATE DEBUG] Raw schedule dates:', {
        startDate: schedule.startDate,
        endDate: schedule.endDate
      });
      
      const formattedStartDate = formatDateForInput(schedule.startDate);
      const formattedEndDate = formatDateForInput(schedule.endDate);
      
      console.log('📅 [DATE DEBUG] Formatted for input:', {
        startDate: formattedStartDate,
        endDate: formattedEndDate
      });

      // Update form data with schedule information
      setFormData({
        name: schedule.name || '',
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        notes: schedule.notes || '',
        allowPartialTime: false,
      });

      // Initialize dayTemplateMapping for schedule editing
      // Always initialize empty mapping first to ensure all days are available for template selection
      const newDayTemplateMapping: Record<number, string[]> = {
        0: [], // Sunday
        1: [], // Monday
        2: [], // Tuesday
        3: [], // Wednesday
        4: [], // Thursday
        5: [], // Friday
        6: []  // Saturday
      };

      // If we have existing shifts, pre-select their templates but allow modification
      if (shifts && shifts.length > 0) {
        console.log('🔍 [SCHEDULE LOAD] Processing shifts for template mapping');

        // Use shift.dayOfWeek property directly instead of parsing date
        const dayNameToNumber: Record<string, number> = {
          'Monday': 1,
          'Tuesday': 2,
          'Wednesday': 3,
          'Thursday': 4,
          'Friday': 5,
          'Saturday': 6,
          'Sunday': 0,
        };

        shifts.forEach(shift => {
          if (shift.shiftTemplateId && shift.dayOfWeek) {
            const dayNumber = dayNameToNumber[shift.dayOfWeek];
            if (dayNumber !== undefined && newDayTemplateMapping[dayNumber]) {
              // Add template ID if it's not already in the array for this day
              if (!newDayTemplateMapping[dayNumber].includes(shift.shiftTemplateId)) {
                newDayTemplateMapping[dayNumber].push(shift.shiftTemplateId);
                console.log(`🎯 [SCHEDULE LOAD] Pre-selected template ${shift.shiftTemplateId} for ${shift.dayOfWeek} (day ${dayNumber}) from existing shifts`);
              }
            }
          }
        });

        console.log('📅 [SCHEDULE LOAD] Built initial dayTemplateMapping with pre-selected templates:', newDayTemplateMapping);
      } else {
        console.log('📅 [SCHEDULE LOAD] No existing shifts found, initialized empty dayTemplateMapping for new schedule');
      }

      // Always set the mapping (even if empty) to ensure users can select any templates
      setDayTemplateMapping(newDayTemplateMapping);

      // Mark that we've loaded the initial mapping so this doesn't run again
      setHasLoadedInitialMapping(true);
    }
  }, [isEditMode, schedule, shifts, hasLoadedInitialMapping, scheduleLoading]);

  // Handle API errors
  useEffect(() => {
    if (scheduleError && isEditMode) {
      console.error('Error loading schedule:', scheduleError);
      setShowErrorDialog(true);
    }
  }, [scheduleError, isEditMode]);

  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, type } = e.target;
    const value = type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTemplateSelect = (templateId: string, dayOfWeek: number, checked: boolean) => {
    setDayTemplateMapping(prev => {
      const currentTemplates = prev[dayOfWeek] || [];
      
      if (checked) {
        // Add template if not already present
        if (!currentTemplates.includes(templateId)) {
          return {
            ...prev,
            [dayOfWeek]: [...currentTemplates, templateId]
          };
        }
      } else {
        // Remove template
        return {
          ...prev,
          [dayOfWeek]: currentTemplates.filter(id => id !== templateId)
        };
      }
      
      return prev;
    });
  };

  const getAllSelectedTemplateIds = (): string[] => {
    const allIds: string[] = [];
    Object.values(dayTemplateMapping).forEach(templateIds => {
      templateIds.forEach(id => {
        if (!allIds.includes(id)) {
          allIds.push(id);
        }
      });
    });
    return allIds;
  };



  const handleSubmit = async (e: React.FormEvent, asDraft: boolean = false) => {
    e.preventDefault();

    if (!formData.name || !formData.startDate || !formData.endDate) {
      setShowFormValidationDialog(true);
      return;
    }

    const templateIds = getAllSelectedTemplateIds();
    if (templateIds.length === 0) {
      setShowValidationDialog(true);
      return;
    }

    try {
      // Convert dayTemplateMapping to templateDayMapping format expected by backend
      const templateDayMapping: Record<string, number[]> = {};
      // dayTemplateMapping uses indices: 0=Sunday, 1=Monday, 2=Tuesday, etc.
      // Backend expects: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
      const indexToDayNumber: Record<number, number> = {
        0: 7, // Sunday
        1: 1, // Monday
        2: 2, // Tuesday
        3: 3, // Wednesday
        4: 4, // Thursday
        5: 5, // Friday
        6: 6, // Saturday
      };

      Object.entries(dayTemplateMapping).forEach(([dayIndex, templates]) => {
        const dayNumber = indexToDayNumber[parseInt(dayIndex)];
        if (dayNumber && Array.isArray(templates) && templates.length > 0) {
          // Only add day if it has templates
          templateDayMapping[dayNumber] = templates;
        }
      });

      console.log('✅ Final templateDayMapping for handleSubmit:', templateDayMapping);
      
      // Use auto-generate with selected templates for manual creation
      const scheduleData = {
        scheduleName: formData.name,
        description: formData.notes,
        startDate: formData.startDate,
        endDate: formData.endDate,
        templateIds: templateIds,
        templateDayMapping: templateDayMapping,
      };

      await autoGenerateSchedule.mutateAsync(scheduleData);
      setSuccessMessage(`Schedule ${asDraft ? 'saved as draft' : 'created'} successfully using selected templates!`);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error creating schedule:', error);
      setShowErrorDialog(true);
    }
  };

  const handleAutoGenerate = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      setShowFormValidationDialog(true);
      return;
    }

    const templateIds = getAllSelectedTemplateIds();
    if (templateIds.length === 0) {
      setShowValidationDialog(true);
      return;
    }

    try {
      // Convert dayTemplateMapping to templateDayMapping format expected by backend
      const templateDayMapping: Record<string, number[]> = {};
      // dayTemplateMapping uses indices: 0=Sunday, 1=Monday, 2=Tuesday, etc.
      // Backend expects: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
      const indexToDayNumber: Record<number, number> = {
        0: 7, // Sunday
        1: 1, // Monday
        2: 2, // Tuesday
        3: 3, // Wednesday
        4: 4, // Thursday
        5: 5, // Friday
        6: 6, // Saturday
      };

      Object.entries(dayTemplateMapping).forEach(([dayIndex, templates]) => {
        const dayNumber = indexToDayNumber[parseInt(dayIndex)];
        if (dayNumber && Array.isArray(templates) && templates.length > 0) {
          // Only add day if it has templates
          templateDayMapping[dayNumber] = templates;
        }
      });

      console.log('✅ Final templateDayMapping for handleAutoGenerate:', templateDayMapping);
      
      const scheduleData = {
        scheduleName: formData.name,
        description: formData.notes,
        startDate: formData.startDate,
        endDate: formData.endDate,
        templateIds: templateIds,
        templateDayMapping: templateDayMapping,
        allowPartialTime: formData.allowPartialTime,
      };

      console.log('DEBUG: Sending schedule data:', scheduleData);
      console.log('DEBUG: dayTemplateMapping state:', dayTemplateMapping);
      console.log('DEBUG: templateDayMapping converted:', templateDayMapping);

      let result;
      
      if (isEditMode && scheduleId) {
        // Use regenerate for existing schedules - this will delete existing shifts first
        console.log('🔄 Regenerating existing schedule:', scheduleId);
        result = await regenerateSchedule.mutateAsync({ id: scheduleId, data: scheduleData });
        setRegenerationResult(result);
        const summary = result.generationSummary || {};
        setSuccessMessage(`Schedule regenerated successfully! Deleted existing shifts and created ${summary.shiftsGenerated || 0} new shifts out of ${summary.totalShiftsRequested || 0} requested. ${summary.partialCoverage > 0 ? `${summary.partialCoverage} shifts have partial coverage. ` : ''}${summary.noCoverage > 0 ? `${summary.noCoverage} shifts could not be covered.` : ''}`);
      } else {
        // Use auto-generate for new schedules
        console.log('✨ Auto-generating new schedule');
        result = await autoGenerateSchedule.mutateAsync(scheduleData);
        setGenerationResult(result);
        const summary = result.generationSummary || {};
        setSuccessMessage(`Schedule auto-generated successfully! Created ${summary.shiftsGenerated || 0} shifts out of ${summary.totalShiftsRequested || 0} requested. ${summary.partialCoverage > 0 ? `${summary.partialCoverage} shifts have partial coverage. ` : ''}${summary.noCoverage > 0 ? `${summary.noCoverage} shifts could not be covered.` : ''}`);
      }
      
      setShowSuccessDialog(true);
    } catch (error) {
      console.error(`Error ${isEditMode ? 'regenerating' : 'auto-generating'} schedule:`, error);
      setShowErrorDialog(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/schedulehub"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to ScheduleHub
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEditMode ? 'Edit Schedule' : 'Create New Schedule'}
          </h1>
        </div>
      </div>

      {/* Loading State for Edit Mode */}
      {isEditMode && scheduleLoading && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-600 dark:text-slate-400">Loading schedule details...</div>
          </div>
        </div>
      )}

      {/* Schedule Loading Error */}
      {scheduleError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-red-800 dark:text-red-200">
            Failed to load schedule details. Please try refreshing the page.
          </div>
        </div>
      )}

      {/* Main Form - Only show when not loading in edit mode */}
      {(!isEditMode || !scheduleLoading) && !scheduleError && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule Information
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Schedule Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="e.g., Week of Nov 7-13"
                />
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Additional notes or instructions..."
              />
            </div>

            {/* Auto-Generation Options */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Auto-Generation Options
              </h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowPartialTime"
                  name="allowPartialTime"
                  checked={formData.allowPartialTime}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 rounded"
                />
                <label htmlFor="allowPartialTime" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                  Allow partial time coverage
                </label>
                <div className="ml-2 group relative">
                  <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help text-xs">
                    ?
                  </div>
                  <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-xs text-white bg-slate-800 rounded-lg shadow-lg -translate-x-1/2 left-1/2">
                    When enabled, workers will be assigned to shifts even if they can only cover part of the required time. This helps maximize coverage when full-time workers aren't available.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Select Shift Templates
            </h2>

            {templatesLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-slate-600 dark:text-slate-400">Loading templates...</span>
              </div>
            ) : templatesError ? (
              <div className="text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                Failed to load shift templates. Please try again.
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="space-y-4">
                {/* Compact Template Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.keys(dayNames).map((dayKey) => (
                    <div key={dayKey} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 capitalize">
                        {dayNames[parseInt(dayKey)]}
                      </h3>
                      <div className="space-y-2">
                        {templates.map((template) => (
                          <label key={template.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600/50 rounded p-2 -m-2">
                            <input
                              type="checkbox"
                              checked={(() => {
                                const dayIndex = parseInt(dayKey);
                                const mappingForDay = dayTemplateMapping[dayIndex] || [];
                                const isChecked = mappingForDay.includes(template.id);
                                console.log(`🔲 Checkbox check for ${dayNames[dayIndex]} - Template: ${template.templateName} (ID: ${template.id}) - Mapping: [${mappingForDay.join(', ')}] - Checked: ${isChecked}`);
                                return isChecked;
                              })()}
                              onChange={(e) => handleTemplateSelect(template.id, parseInt(dayKey), e.target.checked)}
                              className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500 focus:ring-2 dark:bg-slate-800 dark:border-slate-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {template.templateName}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {template.startTime} - {template.endTime}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                      {dayTemplateMapping[parseInt(dayKey)].length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-600">
                          <div className="text-xs text-slate-600 dark:text-slate-300">
                            {dayTemplateMapping[parseInt(dayKey)].length} template{dayTemplateMapping[parseInt(dayKey)].length !== 1 ? 's' : ''} selected
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Selected Templates Summary */}
                {(() => {
                  const selectedCount = Object.values(dayTemplateMapping).reduce((total, templates) => total + templates.length, 0);
                  return selectedCount > 0 ? (
                    <div className="mt-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                        Selected Templates Summary ({selectedCount} selections)
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                        {Object.keys(dayNames).map((dayKey) => {
                          const selectedTemplates = dayTemplateMapping[parseInt(dayKey)];
                          if (selectedTemplates.length === 0) return null;
                          
                          return (
                            <div key={dayKey} className="text-emerald-700 dark:text-emerald-300">
                              <div className="font-medium">{dayNames[parseInt(dayKey)]}</div>
                              <div>{selectedTemplates.length} template{selectedTemplates.length !== 1 ? 's' : ''}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <div className="text-center p-8 text-slate-500 dark:text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p>No shift templates available. Create some templates first to use auto-generation.</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, true)}
              disabled={autoGenerateSchedule.isPending}
              className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handleAutoGenerate}
              disabled={autoGenerateSchedule.isPending || getAllSelectedTemplateIds().length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {autoGenerateSchedule.isPending ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Auto-Generate Shifts
                </>
              )}
            </button>
            <button
              type="submit"
              disabled={autoGenerateSchedule.isPending || getAllSelectedTemplateIds().length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {autoGenerateSchedule.isPending ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Create & Publish
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Validation Dialog */}
      <ConfirmDialog
        isOpen={showValidationDialog}
        onClose={() => setShowValidationDialog(false)}
        onConfirm={() => setShowValidationDialog(false)}
        title="No Templates Selected"
        message="Please select at least one shift template for the days you want to schedule before creating the schedule."
        confirmText="OK"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={showFormValidationDialog}
        onClose={() => setShowFormValidationDialog(false)}
        onConfirm={() => setShowFormValidationDialog(false)}
        title="Missing Required Fields"
        message="Please fill in all required fields (Name, Start Date, and End Date) and select shift templates before creating the schedule."
        confirmText="OK"
        variant="warning"
      />

      {/* Enhanced Schedule Generation Success Dialog */}
      <Modal 
        isOpen={showSuccessDialog} 
        onClose={() => {
          setShowSuccessDialog(false);
          navigate('/schedulehub/schedules');
        }}
        title={isEditMode ? 'Schedule Regenerated Successfully!' : 'Schedule Generated Successfully!'}
        size="md"
      >
        <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
            {isEditMode 
              ? 'Your schedule has been regenerated with the latest settings. Previous shifts have been replaced with new ones.'
              : 'Your new schedule has been created and is ready for review.'
            }
          </p>
        </div>

        {/* Generation Statistics */}
        <div className="my-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Generation Summary</h4>            {/* Success Stats */}
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Shifts Created
              </span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {(isEditMode ? regenerationResult?.generationSummary?.shiftsGenerated : generationResult?.generationSummary?.shiftsGenerated) || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Target className="w-4 h-4 text-blue-500 mr-2" />
                Total Requested
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {(isEditMode ? regenerationResult?.generationSummary?.totalShiftsRequested : generationResult?.generationSummary?.totalShiftsRequested) || 0}
              </span>
            </div>

            {/* Partial Coverage Warning */}
            {((isEditMode ? regenerationResult?.generationSummary?.partialCoverage : generationResult?.generationSummary?.partialCoverage) || 0) > 0 && (
                <div className="flex items-center justify-between py-2 bg-yellow-50 dark:bg-yellow-900/20 -mx-4 px-4 rounded">
                  <span className="flex items-center text-sm text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
                  Partial Coverage
                </span>
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                  {(isEditMode ? regenerationResult?.generationSummary?.partialCoverage : generationResult?.generationSummary?.partialCoverage) || 0} shifts
                </span>
              </div>
            )}

            {/* No Coverage Error */}
            {((isEditMode ? regenerationResult?.generationSummary?.noCoverage : generationResult?.generationSummary?.noCoverage) || 0) > 0 && (
                <div className="flex items-center justify-between py-2 bg-red-50 dark:bg-red-900/20 -mx-4 px-4 rounded">
                  <span className="flex items-center text-sm text-red-700 dark:text-red-400">
                  <XCircle className="w-4 h-4 text-red-500 mr-2" />
                  No Coverage
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {(isEditMode ? regenerationResult?.generationSummary?.noCoverage : generationResult?.generationSummary?.noCoverage) || 0} shifts
                </span>
              </div>
            )}
          </div>
        </div>

        <ModalFooter className="sm:flex-col-reverse gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowSuccessDialog(false);
              // Stay on current page to allow further edits
            }}
            className="w-full sm:w-auto"
          >
            Continue Editing
          </Button>
          <Button
            onClick={() => {
              setShowSuccessDialog(false);
              navigate('/schedulehub/schedules');
            }}
            className="w-full sm:w-auto"
          >
            View All Schedules
          </Button>
        </ModalFooter>
      </Modal>      <ConfirmDialog
        isOpen={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        onConfirm={() => setShowErrorDialog(false)}
        title="Error"
        message="Failed to create schedule. Please try again."
        confirmText="OK"
        variant="danger"
      />
    </div>
  );
}
