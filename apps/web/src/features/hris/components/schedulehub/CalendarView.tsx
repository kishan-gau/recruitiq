import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, User, MapPin, ChevronDown, Check } from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from 'react';

import { formatTime } from '@/utils';

import { useShiftTemplates } from '../../hooks/schedulehub/useShiftTemplates';
import { useStationCoverage } from '../../hooks/schedulehub/useStationCoverage';
import type { Shift, CalendarTimeSlot, ShiftTemplate } from '../../types/schedulehub';
import { useTemplateBasedTimeSlots, TimeSlotPresets } from '../../utils/time-slot-generator';

interface StationDropdownFilterProps {
  stations: Array<{
    id: string;
    name: string;
    requirements?: Array<{
      requiredStaffing: number;
      minimumStaffing: number;
      timeSlots: Array<{ start: string; end: string }>;
    }>;
  }>;
  selectedStations: Set<string>;
  onSelectionChange: (selection: Set<string>) => void;
}

const StationDropdownFilter: React.FC<StationDropdownFilterProps> = ({
  stations,
  selectedStations,
  onSelectionChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStationToggle = (stationId: string) => {
    const newSelected = new Set(selectedStations);
    if (newSelected.has(stationId)) {
      newSelected.delete(stationId);
    } else {
      newSelected.add(stationId);
    }
    onSelectionChange(newSelected);
  };

  const handleSelectAll = () => {
    const allStationIds = new Set(stations.map(s => s.id));
    const shouldSelectAll = selectedStations.size !== stations.length;
    onSelectionChange(shouldSelectAll ? allStationIds : new Set());
  };

  const getDisplayText = () => {
    if (selectedStations.size === 0) {
      return 'Select stations';
    }
    if (selectedStations.size === stations.length) {
      return 'All stations';
    }
    if (selectedStations.size === 1) {
      const selectedStation = stations.find(s => selectedStations.has(s.id));
      return selectedStation ? selectedStation.name : '1 station';
    }
    return `${selectedStations.size} stations`;
  };

  return (
    <div className="relative flex items-center space-x-2" ref={dropdownRef}>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Stations:
      </span>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
      >
        <span className="max-w-40 truncate">{getDisplayText()}</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
        />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSelectAll}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <span className="font-medium">
                {selectedStations.size === stations.length ? 'Deselect All' : 'Select All'}
              </span>
              {selectedStations.size === stations.length && (
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {stations.map((station) => (
              <button
                key={station.id}
                onClick={() => handleStationToggle(station.id)}
                className="w-full flex items-center justify-between px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-900 dark:text-gray-100 truncate">
                  {station.name}
                </span>
                {selectedStations.has(station.id) && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
            {stations.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                No stations available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface CalendarViewProps {
  shifts: Shift[];
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onShiftClick?: (shift: Shift) => void;
  onCreateShift?: (stationId: string, date: Date) => void;
  onEditShift?: (shift: Shift) => void;
  onShiftUpdate?: (shift: Shift) => void;
  onShiftTimeChange?: (shiftId: string, newTime: string, newDate: Date) => void;
  viewType?: 'week' | 'month' | 'timeline';
  workerNames?: Record<string, string>;
  stationNames?: Record<string, string>;
  stations?: Array<{
    id: string;
    name: string;
    requirements?: Array<{
      requiredStaffing: number;
      minimumStaffing: number;
      timeSlots: Array<{ start: string; end: string }>;
    }>;
  }>;
  templates?: ShiftTemplate[];
  onApplyTemplate?: (templateId: string, date: Date) => void;
}

// Helper component to render template-specific time slots
interface TemplateTimeSlotsProps {
  templateGroup: {
    template: { id: string; templateName: string; startTime: string; endTime: string; } | null;
    timeSlots: Record<string, { hasGap?: boolean; shifts: any[] }>;
  };
  templateKey: string;
  shiftTemplates: any[];
}

// Helper function to merge consecutive slots with the same employee
const mergeConsecutiveSlots = (timeSlots: any[], templateGroup: any) => {
  const mergedSlots: Array<{
    startIndex: number;
    endIndex: number;
    timeSlot: any;
    shifts: any[];
    hasGap: boolean;
    employeeKey: string | null;
    spanCount: number;
  }> = [];

  let currentGroup: typeof mergedSlots[0] | null = null;

  timeSlots.forEach((timeSlot, slotIndex) => {
    // Find the closest matching time slot from the original timeSlots
    const closestMatch = Object.entries(templateGroup.timeSlots)
      .find(([label, slot]) => 
        // Check if the original slot hour is close to our generated slot hour
         Math.abs(slot.hour - timeSlot.hour) <= 1
      );
    
    const shifts = closestMatch ? closestMatch[1].shifts : [];
    const hasGap = shifts.length === 0;
    
    // Create employee key for grouping (null for gaps or no shifts)
    const employeeKey = shifts.length > 0 && shifts[0].worker 
      ? `${shifts[0].worker.firstName} ${shifts[0].worker.lastName}` 
      : null;

    // Check if this slot can be merged with the current group
    if (currentGroup && 
        currentGroup.employeeKey === employeeKey && 
        employeeKey !== null && 
        !hasGap && 
        !currentGroup.hasGap) {
      // Extend the current group
      currentGroup.endIndex = slotIndex;
      currentGroup.spanCount++;
    } else {
      // Start a new group
      currentGroup = {
        startIndex: slotIndex,
        endIndex: slotIndex,
        timeSlot,
        shifts,
        hasGap,
        employeeKey,
        spanCount: 1
      };
      mergedSlots.push(currentGroup);
    }
  });

  return mergedSlots;
};

const TemplateTimeSlots: React.FC<TemplateTimeSlotsProps> = ({ templateGroup, templateKey, shiftTemplates }) => {
  // Find the matching template in shiftTemplates to ensure proper ID matching
  const matchingTemplate = templateGroup.template?.id 
    ? shiftTemplates.find(t => t.id === templateGroup.template?.id)
    : null;
  
  // Get template-specific time slots using the verified template ID
  const { timeSlots: templateTimeSlots } = useTemplateBasedTimeSlots({
    templates: shiftTemplates,
    selectedTemplateId: matchingTemplate?.id || undefined, // Use verified template ID
    config: {
      intervalMinutes: 60,
      preBuffer: 30,
      postBuffer: 30,
      fallbackStart: '08:00',
      fallbackEnd: '15:00'
    }
  });

  // Merge consecutive slots with the same employee
  const mergedSlots = mergeConsecutiveSlots(templateTimeSlots, templateGroup);

  return (
    <div className="space-y-0.5">
      {mergedSlots.map((mergedSlot, groupIndex) => {
        const { timeSlot, shifts, hasGap, employeeKey, spanCount, startIndex, endIndex } = mergedSlot;
        
        // Debug logging to understand the merged slot data
        if (shifts.length > 0) {
          console.log(`DEBUG: Merged slot ${timeSlot.label} (span: ${spanCount}):`, {
            shiftsFound: shifts.length,
            employeeKey,
            spanCount,
            startIndex,
            endIndex,
            shiftDetails: shifts.map(s => ({
              id: s.id,
              startTime: s.startTime,
              endTime: s.endTime,
              templateName: s.template?.templateName
            }))
          });
        }
        
        // Skip empty time slots to save space (unless it's a gap)
        if (shifts.length === 0 && !hasGap) return null;
        
        // Calculate height for merged slots (each slot is about 20px + 2px spacing)
        const slotHeight = spanCount > 1 ? `${20 * spanCount + (spanCount - 1) * 2}px` : 'auto';
        
        return (
          <div 
            key={`${templateKey}-merged-${groupIndex}-${startIndex}-${endIndex}`}
            className={`p-1 text-xs rounded-sm min-h-[12px] transition-all hover:scale-105 cursor-pointer ${
              hasGap 
                ? 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/40' 
                : shifts.length > 0 
                  ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                  : 'bg-gray-50/70 border border-gray-200/50 dark:bg-gray-800/30 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/40'
            }`}
            style={{ height: slotHeight }}
            title={hasGap 
              ? `⚠️ No coverage at ${timeSlot.label}` 
              : shifts.length > 0 
                ? `✅ ${timeSlot.label}${spanCount > 1 ? ` (${spanCount} slots)` : ''}: ${shifts.map(shift => 
                    shift.worker 
                      ? `${shift.worker.firstName} ${shift.worker.lastName}`
                      : shift.employeeId || 'Unknown'
                  ).join(', ')}`
                : `No shifts scheduled at ${timeSlot.label}`
            }
          >
            {shifts.length > 0 && (
              <div className="text-[10px] font-medium text-gray-700 dark:text-gray-300 flex flex-col justify-center h-full">
                <div>
                  {employeeKey || shifts.map(shift => 
                    shift.worker 
                      ? `${shift.worker.firstName} ${shift.worker.lastName}`
                      : shift.employeeId || 'Unknown'
                  ).join(', ')}
                </div>
                {spanCount > 1 && (
                  <div className="text-[9px] opacity-70 mt-0.5">
                    {spanCount} slots
                  </div>
                )}
              </div>
            )}
            {hasGap && (
              <div className="text-[10px] font-medium text-red-600 dark:text-red-400 flex items-center justify-center h-full">
                ⚠️ Gap
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const CalendarView: React.FC<CalendarViewProps> = ({
  shifts = [],
  selectedDate = new Date(),
  onDateChange,
  onShiftClick,
  onCreateShift,
  onEditShift,
  onShiftUpdate,
  onShiftTimeChange,
  viewType = 'week',
  workerNames = {},
  stationNames = {},
  stations = [],
  templates = [],
  onApplyTemplate
}) => {
  const [pendingChanges, setPendingChanges] = useState<Array<{
    action: 'add' | 'remove';
    stationId: string;
    stationName: string;
  }>>([]);

  // Station filtering state - all stations shown by default
  const [selectedStations, setSelectedStations] = useState<Set<string>>(() => 
    new Set(stations.map(s => s.id))
  );

  // Update selected stations when stations prop changes (but preserve user selections)
  React.useEffect(() => {
    const stationIds = stations.map(s => s.id);
    const currentIds = Array.from(selectedStations);
    
    // Only reset to all stations if the available stations have changed
    // Check if new stations were added or removed
    const hasNewStations = stationIds.some(id => !currentIds.includes(id));
    const hasRemovedStations = currentIds.some(id => !stationIds.includes(id));
    
    // Only update if stations were added/removed, not if user just changed selections
    if (hasNewStations || hasRemovedStations) {
      // Filter current selections to only include stations that still exist
      const filteredSelections = currentIds.filter(id => stationIds.includes(id));
      
      // If no valid selections remain, select all available stations
      if (filteredSelections.length === 0) {
        setSelectedStations(new Set(stationIds));
      } else {
        setSelectedStations(new Set(filteredSelections));
      }
    }
  }, [stations]); // Remove selectedStations from dependencies to prevent infinite loop

  // Drag and drop state
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);

  // Template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Station grid view state
  const [showStationGrid, setShowStationGrid] = useState(false);

  // Template-based time slots (replaces hardcoded 6 AM-8 PM approach)
  const { data: shiftTemplatesData, isLoading: templatesLoading } = useShiftTemplates();
  
  // Extract templates array from React Query response
  const shiftTemplates = shiftTemplatesData?.templates || [];
  
  const { timeSlots } = useTemplateBasedTimeSlots({
    templates: shiftTemplates,
    selectedTemplateId: selectedTemplateId || undefined, // Pass the selected template for filtering
    config: {
      intervalMinutes: 60, // 1-hour intervals for better usability
      preBuffer: 30, // 30min buffer before earliest template
      postBuffer: 30, // 30min buffer after latest template
      fallbackStart: '08:00', // Fallback if no templates (aligned with 'opstart' template)
      fallbackEnd: '15:00' // Fallback if no templates (aligned with 'opstart' template)
    }
  });

  // Debug template-based time slot generation
  console.log('CalendarView - Template Selection Debug:', {
    selectedTemplateId,
    selectedTemplateIdType: typeof selectedTemplateId,
    selectedTemplateIdEmpty: selectedTemplateId === '',
    templatesLoading,
    shiftTemplatesDataType: typeof shiftTemplatesData,
    shiftTemplatesIsArray: Array.isArray(shiftTemplates),
    templatesCount: shiftTemplates.length,
    templates: shiftTemplates.map(t => ({
      id: t.id,
      name: t.name,
      startTime: t.startTime,
      endTime: t.endTime,
      isActive: t.isActive
    })),
    timeSlotsCount: timeSlots?.length || 0,
    firstSlot: timeSlots?.[0],
    lastSlot: timeSlots?.[timeSlots.length - 1]
  });

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, shift: Shift) => {
    setDraggedShift(shift);
    e.dataTransfer.setData('text/plain', shift.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStationId: string, targetDate: Date, targetHour?: number) => {
    e.preventDefault();
    if (!draggedShift) return;

    // Calculate new start time if dropping on a specific hour
    let newStartTime = draggedShift.startTime;
    if (targetHour !== undefined) {
      // Convert target hour to "HH:MM" format
      newStartTime = `${targetHour.toString().padStart(2, '0')}:00`;
    }

    // Calculate duration and new end time
    const [startHour, startMin] = draggedShift.startTime.split(':').map(Number);
    const [endHour, endMin] = draggedShift.endTime.split(':').map(Number);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    // Calculate new end time
    const [newStartHour, newStartMin] = newStartTime.split(':').map(Number);
    const newEndMinutes = (newStartHour * 60 + newStartMin) + durationMinutes;
    const newEndHour = Math.floor(newEndMinutes / 60);
    const newEndMin = newEndMinutes % 60;
    const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`;

    // Create updated shift
    const updatedShift: Shift = {
      ...draggedShift,
      stationId: targetStationId,
      shiftDate: formatDate(targetDate), // Use string date format
      startTime: newStartTime,
      endTime: newEndTime
    };

    // Call the onShiftUpdate callback if provided
    onShiftUpdate?.(updatedShift);
    setDraggedShift(null);
  };

  // Template handling functions
  const handleTemplateSelect = (templateId: string) => {
    const selectedTemplate = shiftTemplates.find(t => t.id === templateId);
    console.log('🎯 Template Selected:', {
      templateId,
      previousSelection: selectedTemplateId,
      willUpdateTo: templateId,
      selectedTemplate: selectedTemplate ? {
        id: selectedTemplate.id,
        name: selectedTemplate.name,
        start_time: selectedTemplate.start_time,
        end_time: selectedTemplate.end_time,
        startTime: selectedTemplate.startTime,
        endTime: selectedTemplate.endTime
      } : null,
      allAvailableTemplates: shiftTemplates.map(t => ({
        id: t.id, 
        name: t.name, 
        start_time: t.start_time, 
        end_time: t.end_time,
        startTime: t.startTime,
        endTime: t.endTime
      }))
    });
    setSelectedTemplateId(templateId);
  };

  const handleApplyTemplate = () => {
    if (selectedTemplateId && onApplyTemplate) {
      onApplyTemplate(selectedTemplateId, selectedDate);
    }
  };

  // Memoize the selected date to prevent infinite re-renders
  // This ensures the date object reference stays stable between renders
  const dateString = useMemo(() => {
    const date = selectedDate || new Date();
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format for stable comparison
  }, [selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]]);
  
  const memoizedSelectedDate = useMemo(() => {
    const date = selectedDate || new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()); // Normalize to start of day
  }, [dateString]); // Depend on stable date string, not object reference

  // Get coverage analysis from API
  const coverageAnalysis = useStationCoverage(memoizedSelectedDate);


  // Clear pending changes when shifts are saved
  React.useEffect(() => {
    // If shifts changed and we have pending changes, clear them after a delay
    if (pendingChanges.length > 0) {
      const timer = setTimeout(() => setPendingChanges([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [shifts]); // Remove pendingChanges.length from deps to prevent infinite loop

  // Debug useEffect moved to after weekDays declaration

  // Helper function to get employee display name
  const getEmployeeName = (_employeeId: string | undefined): string => {
    if (!_employeeId) {
      console.log(`DEBUG: getEmployeeName called with no _employeeId`);
      return 'Unassigned';
    }
    
    console.log(`DEBUG: getEmployeeName called with ID: ${_employeeId}`);
    console.log(`DEBUG: Available worker names:`, Object.keys(workerNames));
    
    const name = workerNames[employeeId];
    if (name) {
      console.log(`DEBUG: Using worker name for ID ${_employeeId}: ${name}`);
      return name;
    }
    console.log(`DEBUG: No name found for worker ID ${_employeeId}, using ID as fallback`);
    return employeeId;
  };

  // Helper function to get station display name
  const getStationName = (stationId: string | undefined): string => {
    if (!stationId) {
      console.log(`DEBUG: getStationName called with no stationId`);
      return 'No Station';
    }
    
    console.log(`DEBUG: getStationName called with ID: ${stationId}`);
    console.log(`DEBUG: Available station names:`, Object.keys(stationNames));
    
    const name = stationNames[stationId];
    if (name) {
      console.log(`DEBUG: Using station name for ID ${stationId}: ${name}`);
      return name;
    }
    console.log(`DEBUG: No name found for station ID ${stationId}, using ID as fallback`);
    return stationId;
  };

  // Use selectedDate prop directly instead of internal state
  const currentDate = selectedDate;

  // Get start of week (Monday)
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Get week days
  // Memoize weekDays calculation to prevent infinite re-renders
  const weekDays = React.useMemo(() => {
    const startOfWeek = getStartOfWeek(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  // Debug: Log the week range being displayed (moved after weekDays definition)
  React.useEffect(() => {
    console.log('DEBUG: Week range being displayed:', {
      selectedDate: selectedDate,
      weekStart: weekDays[0]?.toDateString(),
      weekEnd: weekDays[6]?.toDateString(),
      weekDays: weekDays.map(d => d.toDateString())
    });
  }, [selectedDate, weekDays]); // Include weekDays since we're using it

  // Station grid data - organize shifts by station and time slot for gap visualization
  const stationGridData = React.useMemo(() => {
    console.log('DEBUG: Building station grid data with:', {
      totalShifts: shifts.length,
      totalStations: stations.length,
      selectedStations: Array.from(selectedStations),
      weekDays: weekDays.map(d => d.toDateString()),
      timeSlots: timeSlots.map(ts => ts.label)
    });

    // Helper function to get template name
    const getTemplateName = (templateId?: string, shifts?: Shift[]) => {
      if (!templateId) return 'No Template';
      // Try to get template name from shift's nested template object first
      const shiftWithTemplate = shifts?.find(s => s.templateId === templateId && s.template);
      if (shiftWithTemplate?.template) {
        return shiftWithTemplate.template.templateName;
      }
      return `Template ${templateId}`;
    };

    // Hierarchical Station → Template → Shifts structure
    const gridData: Record<string, {
      station: { id: string; name: string };
      days: Record<string, {
        date: Date;
        templates: Record<string, {
          template: { id: string; templateName: string; startTime: string; endTime: string } | null;
          timeSlots: Record<string, {
            hour: number;
            label: string;
            shifts: Shift[];
            hasGap: boolean;
          }>;
        }>;
      }>;
    }> = {};

    // Only include selected stations
    const visibleStations = stations.filter(station => selectedStations.size === 0 || selectedStations.has(station.id));
    console.log('DEBUG: Visible stations:', visibleStations.map(s => s.name));

    visibleStations.forEach(station => {
      const stationDays: Record<string, {
        date: Date;
        templates: Record<string, {
          template: { id: string; templateName: string; startTime: string; endTime: string } | null;
          timeSlots: Record<string, {
            hour: number;
            label: string;
            shifts: Shift[];
            hasGap: boolean;
          }>;
        }>;
      }> = {};

      weekDays.forEach(date => {
        const dayKey = format(date, 'yyyy-MM-dd');
        
        // Get all shifts for this station and date first
        const stationDayShifts = shifts.filter(shift => {
          const shiftDate = new Date(shift.shiftDate);
          const dateMatch = shiftDate.toDateString() === date.toDateString();
          const stationMatch = shift.stationId === station.id;
          return dateMatch && stationMatch;
        });

        // Group shifts by template
        const templateGroups: Record<string, {
          template: { id: string; templateName: string; startTime: string; endTime: string } | null;
          timeSlots: Record<string, {
            hour: number;
            label: string;
            shifts: Shift[];
            hasGap: boolean;
          }>;
        }> = {};

        stationDayShifts.forEach(shift => {
          const templateKey = shift.templateId || 'no-template';
          
          // Initialize template group if not exists
          if (!templateGroups[templateKey]) {
            templateGroups[templateKey] = {
              template: shift.templateId && shift.template ? {
                id: shift.template.id,
                templateName: shift.template.templateName,
                startTime: shift.template.startTime,
                endTime: shift.template.endTime
              } : null,
              timeSlots: {}
            };
          }
        });

        // Process time slots for each template group
        Object.entries(templateGroups).forEach(([templateKey, templateGroup]) => {
          timeSlots.forEach(timeSlot => {
            const slotShifts = stationDayShifts.filter(shift => {
              // Only include shifts from this template
              const templateMatch = (shift.templateId || 'no-template') === templateKey;
              if (!templateMatch) return false;
              
              // Parse shift start and end times (format: "HH:mm")
              const [startHour] = shift.startTime.split(':').map(Number);
              const [endHour] = shift.endTime.split(':').map(Number);
              
              // Check if shift overlaps with this time slot (2-hour slots)
              const slotStart = timeSlot.hour;
              const slotEnd = timeSlot.hour + 2;
              
              // Shift overlaps if it starts before slot ends AND ends after slot starts
              return startHour < slotEnd && endHour > slotStart;
            });

            templateGroup.timeSlots[timeSlot.label] = {
              ...timeSlot,
              shifts: slotShifts,
              hasGap: slotShifts.length === 0
            };
          });
        });

        // Debug logging for first day
        if (date.getDate() === weekDays[0].getDate()) {
          console.log(`DEBUG: ${station.name} - ${dayKey} templates:`, {
            templateCount: Object.keys(templateGroups).length,
            templates: Object.entries(templateGroups).map(([key, group]) => ({
              templateKey: key,
              templateName: group.template?.templateName || 'No Template',
              timeSlotCount: Object.keys(group.timeSlots).length
            }))
          });
        }

        stationDays[dayKey] = {
          date,
          templates: templateGroups
        };
      });

      gridData[station.id] = {
        station,
        days: stationDays
      };
    });

    return gridData;
  }, [stations, selectedStations, weekDays, shifts, timeSlots]);

  // Get month calendar days (42 days = 6 weeks)
  const getMonthCalendarDays = (date: Date): Array<{ date: Date; isCurrentMonth: boolean }> => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    
    // First day of the calendar (start of week containing first day of month)
    const startDay = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    startDay.setDate(firstDay.getDate() - dayOfWeek);
    
    // Generate 42 days (6 weeks)
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDay);
      day.setDate(startDay.getDate() + i);
      days.push({
        date: day,
        isCurrentMonth: day.getMonth() === month
      });
    }
    
    return days;
  };

  // Generate template-based time slots for timeline view (moved from inside generateTimeSlots function)
  const templateBasedTimeSlots = useTemplateBasedTimeSlots({
    templates: shiftTemplates || [],
    selectedTemplateId: selectedTemplateId || undefined,
    config: {
      slotDurationMinutes: 30,
      includeBreaks: true,
      roundToNearestSlot: true
    }
  });

  // Week view content computed at top level (moved from IIFE in JSX)
  const weekViewContent = useMemo(() => {
    if (viewType !== 'week' || showStationGrid) return null;

    // Use the already calculated weekDays
    const weekDates = weekDays;

    // Generate 24-hour time slots
    const timeSlots = [];
    for (let hour = 0; hour < 24; hour++) {
      timeSlots.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`
      });
    }

    // Helper function to calculate shift position
    const calculateShiftPosition = (startTime: string, endTime: string, dayIndex: number) => {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      const startDecimal = startHour + startMinute / 60;
      const endDecimal = endHour + endMinute / 60;
      const duration = endDecimal - startDecimal;
      
      // Each hour is 30px, positioned relative to day column
      const top = startDecimal * 30;
      const height = duration * 30;
      const left = dayIndex * (100 / 7); // Percentage for responsive grid
      
      return {
        top: `${top}px`,
        height: `${height}px`,
        left: `${left}%`,
        width: `${100 / 7}%`
      };
    };

    // Get shifts for the week with positioning data
    const weekShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.shiftDate);
      return weekDates.some(date => 
        shiftDate.toDateString() === date.toDateString() &&
        (shift.stationId ? selectedStations.has(shift.stationId) : false)
      );
    }).map(shift => {
      const shiftDate = new Date(shift.shiftDate);
      const dayIndex = weekDates.findIndex(date => 
        date.toDateString() === shiftDate.toDateString()
      );
      
      const position = calculateShiftPosition(shift.startTime, shift.endTime, dayIndex);
      
      return {
        ...shift,
        dayIndex,
        position
      };
    });

    return (
      <div className="calendar-week-view relative overflow-auto" style={{ height: '720px' }}>
        {/* Time column */}
        <div className="absolute left-0 w-16 h-full bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div style={{ paddingTop: '52px' }}>
            {timeSlots.map(slot => (
              <div
                key={slot.hour}
                className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 p-1 text-right"
                style={{ height: '30px', lineHeight: '30px' }}
              >
                {slot.time}
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        <div className="ml-16 relative h-full">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
            {weekDates.map((date, index) => (
              <div
                key={index}
                className="p-2 text-center border-r border-gray-200 dark:border-gray-700 font-medium text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="relative" style={{ height: '720px', paddingTop: '52px' }}>
            {/* Hour lines */}
            {timeSlots.map(slot => (
              <div
                key={slot.hour}
                className="absolute w-full border-b border-gray-200"
                style={{ top: `${slot.hour * 30}px`, height: '30px' }}
              >
                {/* Day columns grid */}
                <div className="grid grid-cols-7 h-full">
                  {weekDates.map((_, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="border-r border-gray-100 h-full relative"
                      onDrop={(e) => {
                        e.preventDefault();
                        const shiftData = e.dataTransfer.getData('text/plain');
                        if (shiftData) {
                          const shift = JSON.parse(shiftData);
                          const newTime = `${slot.hour.toString().padStart(2, '0')}:00`;
                          const dayDate = weekDates[dayIndex];
                          onShiftTimeChange?.(shift.id, newTime, dayDate);
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Floating shifts layer */}
            <div className="absolute left-0 right-0 bottom-0 pointer-events-none" style={{ top: '52px' }}>
              {weekShifts.map(shift => (
                <div
                  key={shift.id}
                  className="absolute pointer-events-auto cursor-pointer bg-blue-500 text-white rounded-md p-1 text-xs shadow-md hover:bg-blue-600 z-20"
                  style={shift.position}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify(shift));
                  }}
                  onClick={() => {
                    onShiftClick?.(shift);
                    onEditShift?.(shift);
                  }}
                >
                  <div className="font-medium truncate">{shift.title}</div>
                  <div className="truncate">{shift.startTime} - {shift.endTime}</div>
                  {shift.station && (
                    <div className="truncate text-xs opacity-90">
                      {typeof shift.station === 'string' ? shift.station : shift.station.name || shift.station.id || 'Unknown Station'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    viewType, 
    showStationGrid, 
    weekDays, 
    shifts, 
    selectedStations, 
    onShiftClick, 
    onShiftTimeChange
  ]);

  // Get shifts for a specific date with station filtering
  const getShiftsForDate = (date: Date) => {
    console.log(`DEBUG: Getting shifts for date ${date.toDateString()}`);
    
    const filteredShifts = shifts.filter(shift => {
      // Debug: Log available properties for first shift only
      if (shifts.indexOf(shift) === 0) {
        console.log('DEBUG: First shift properties:', {
          shiftKeys: Object.keys(shift),
          shift: shift,
          shiftDateValue: shift.shiftDate,
          shiftDateType: typeof shift.shiftDate
        });
      }
      
      // Use the correct shiftDate property
      const shiftDate = new Date(shift.shiftDate);
      const dateMatch = shiftDate.toDateString() === date.toDateString();
      
      // Station filtering - only show shifts for selected stations
      const stationMatch = shift.stationId ? selectedStations.has(shift.stationId) : false;
      
      // Debug: Log the filtering for first shift only
      if (shifts.indexOf(shift) === 0) {
        console.log('DEBUG: Filtering result:', {
          targetDate: date.toDateString(),
          shiftDate: shiftDate.toDateString(),
          rawShiftDate: shift.shiftDate,
          dateMatch: dateMatch,
          stationId: shift.stationId,
          stationMatch: stationMatch,
          selectedStations: Array.from(selectedStations)
        });
      }
      
      return dateMatch && stationMatch;
    });
    
    console.log(`DEBUG: getShiftsForDate(${date.toDateString()}) found ${filteredShifts.length} shifts after station filtering`);
    return filteredShifts;
  };

  // Generate template-based time slots for timeline view (now uses top-level hook result)
  const generateTimeSlots = (): CalendarTimeSlot[] => {
    const { timeSlots: templateBasedSlots } = templateBasedTimeSlots;

    // Convert to CalendarTimeSlot format with time24 property
    return templateBasedSlots.map(slot => ({
      hour: Math.floor(slot.hour / 60), // Convert minutes to hours
      label: slot.label,
      time24: `${Math.floor(slot.hour / 60).toString().padStart(2, '0')}:${(slot.hour % 60).toString().padStart(2, '0')}`
    }));
  };


  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    onDateChange?.(newDate);
  };

  // Get status badge color with dark mode support
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200';
      case 'in_progress': return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200';
      case 'completed': return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200';
      case 'needs_coverage': return 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  // Format date for display
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="space-y-4">
      {/* Loading state */}
      {coverageAnalysis.loading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            <span>Loading station coverage data...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {coverageAnalysis.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <span className="font-medium">Error loading coverage data:</span>
              <span>{coverageAnalysis.error}</span>
            </div>
            <button
              onClick={coverageAnalysis.refetch}
              className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800/60 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}


      {/* Main Calendar View - Enhancement 3 (mobile-optimized) */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {currentDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </h2>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Station Filter Controls */}
          <StationDropdownFilter
            stations={stations}
            selectedStations={selectedStations}
            onSelectionChange={setSelectedStations}
          />
          
          {/* View Toggle Button */}
          <div className="flex items-center space-x-2 border-l border-gray-200 dark:border-gray-700 pl-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">View:</span>
            <button
              onClick={() => setShowStationGrid(!showStationGrid)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                showStationGrid
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {showStationGrid ? 'Station Grid' : 'Timeline'}
            </button>
          </div>
        </div>
          
          {/* Shift Template Selector */}
          {templates && templates.length > 0 && (
            <div className="flex items-center space-x-2 ml-4 border-l border-gray-200 dark:border-gray-700 pl-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Templates:
              </span>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="">Select template</option>
                {shiftTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.start_time} - {template.end_time})
                  </option>
                ))}
              </select>
              {selectedTemplateId && (
                <button
                  onClick={handleApplyTemplate}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Apply
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Enhanced Week View - 7-Day Layout */}
      {viewType === 'week' && !showStationGrid && weekViewContent}

      {/* Station Grid View */}
      {showStationGrid && viewType === 'week' && (
        <div className="mt-4">
          {/* Station Grid Header */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="p-2 font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded">
              Station
            </div>
            {weekDays.map(day => (
              <div key={day.toISOString()} className="p-2 text-center font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded">
                <div>{format(day, 'EEE')}</div>
                <div className="text-sm">{format(day, 'MMM d')}</div>
              </div>
            ))}
          </div>

          {/* Station Rows */}
          {stations
            .filter(station => selectedStations.size === 0 || selectedStations.has(station.id))
            .map(station => (
              <div key={station.id} className="mb-4">
                <div className="grid grid-cols-8 gap-1">
                  {/* Station Name */}
                  <div className="p-3 font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded flex items-center">
                    <div className="truncate">{station.name}</div>
                  </div>
                  
                  {/* Days for this station */}
                  {weekDays.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const stationData = stationGridData[station.id];
                    const dayData = stationData?.days[dayKey];
                    const templateGroups = dayData?.templates || {};
                    
                    return (
                      <div key={dayKey} className="min-h-[60px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-1">
                        {/* Template Groups for this day */}
                        <div className="space-y-2">
                          {Object.entries(templateGroups).map(([templateKey, templateGroup]) => (
                            <div key={templateKey} className="border border-gray-100 dark:border-gray-600 rounded-md p-1">
                              {/* Template Header */}
                              <div className="text-[9px] font-medium text-gray-600 dark:text-gray-400 mb-1 truncate">
                                {templateGroup.template?.templateName || 'No Template'}
                              </div>
                              
                              {/* Time Slots for this template */}
                              <TemplateTimeSlots 
                                templateGroup={templateGroup}
                                templateKey={templateKey}
                                shiftTemplates={shiftTemplates}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 dark:bg-red-900/20 dark:border-red-700 rounded" />
              <span>Scheduling Gap</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 dark:bg-blue-900/20 dark:border-blue-700 rounded" />
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 dark:bg-gray-700/50 rounded" />
              <span>Outside Operating Hours</span>
            </div>
          </div>
        </div>
      )}

      {/* Month View */}
      {viewType === 'month' && (
        <div className="grid grid-cols-7 gap-1 mt-4">
          {/* Month Header - Days of Week */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              {day}
            </div>
          ))}
          
          {/* Month Calendar Grid */}
          {getMonthCalendarDays(selectedDate).map(({ date, isCurrentMonth }, index) => {
            const dayShifts = shifts.filter(shift => {
              const shiftDate = new Date(shift.shiftDate);
              const dateMatches = shiftDate.toDateString() === date.toDateString();
              // Only show shifts from selected stations
              const stationSelected = !shift.stationId || selectedStations.has(shift.stationId);
              return dateMatches && stationSelected;
            });

            console.log(`DEBUG: Month calendar day ${date.toDateString()}:`, {
              isCurrentMonth,
              shiftsCount: dayShifts.length,
              dayShifts
            });

            return (
              <div
                key={`month-${date.toISOString()}`}
                className={`min-h-[60px] p-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 
                  ${!isCurrentMonth ? 'opacity-40' : ''} 
                  ${date.toDateString() === new Date().toDateString() ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
                onClick={() => onDateChange?.(date)}
              >
                {/* Date Number */}
                <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                  {date.getDate()}
                </div>
                
                {/* Shifts for this day */}
                <div className="space-y-1">
                  {dayShifts.map((shift, shiftIndex) => (
                    <div
                      key={`${shift.id}-${shiftIndex}`}
                      className="p-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded text-xs cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShiftClick?.(shift);
                      }}
                    >
                      <div className="font-medium truncate">
                        {shift.startTime} - {shift.endTime}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 opacity-80">
                        <User className="w-3 h-3" />
                        <span className="truncate">{getEmployeeName(shift._employeeId)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CalendarView;