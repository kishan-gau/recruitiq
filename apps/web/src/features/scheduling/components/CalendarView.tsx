import { format, startOfWeek, addDays, getWeeksInMonth, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from 'react';

import { useStationCoverage, useShiftTemplates } from '../hooks';
import { 
  type Shift, 
  type Station, 
  type Worker,
  type ShiftTemplate,
  type CalendarTimeSlot,
  type ViewType 
} from '../types';
import { formatTime } from '../utils';

import StationDropdownFilter from './StationDropdownFilter';
import TemplateTimeSlots from './TemplateTimeSlots';

export interface CalendarViewProps {
  shifts: Shift[];
  selectedDate: Date;
  onDateChange?: (date: Date) => void;
  onShiftClick?: (shift: Shift) => void;
  onShiftCreate?: (timeSlot: CalendarTimeSlot, stationId?: string) => void;
  onShiftEdit?: (shift: Shift) => void;
  onShiftUpdate?: (shiftId: string, updates: Partial<Shift>) => void;
  onShiftTimeChange?: (shiftId: string, newStartTime: string, newEndTime: string) => void;
  viewType?: ViewType;
  stations?: Station[];
  workers?: Worker[];
  getWorkerName?: (workerId: string) => string;
  getStationName?: (stationId: string) => string;
  getEmployeeName?: (_employeeId: string) => string;
  templates?: boolean;
}

/**
 * CalendarView - Main calendar interface for schedule visualization and management
 * 
 * Features:
 * - Multiple view types (week, month, timeline)
 * - Station-based filtering with dropdown
 * - Drag-and-drop shift management
 * - Template-based shift creation
 * - Coverage analysis integration
 * - Station grid view for detailed planning
 */
const CalendarView: React.FC<CalendarViewProps> = ({
  shifts = [],
  selectedDate,
  onDateChange,
  onShiftClick,
  onShiftCreate,
  onShiftEdit,
  onShiftUpdate,
  onShiftTimeChange,
  viewType = 'week',
  stations = [],
  workers = [],
  getWorkerName,
  getStationName,
  getEmployeeName = () => 'Unknown',
  templates = false
}) => {
  // State management
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Shift>>>(new Map());
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showStationGrid, setShowStationGrid] = useState(false);

  // Refs for drag and drop
  const dragSourceRef = useRef<HTMLElement | null>(null);

  // Custom hooks
  const { data: stationCoverage } = useStationCoverage();
  const { data: shiftTemplates = [] } = useShiftTemplates();
  // const { data: templateTimeSlots } = useTemplateBasedTimeSlots(selectedDate); // TODO: Implement hook
  const templateTimeSlots = undefined;  // Placeholder until hook is implemented

  // Memoized calculations
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const timeSlots = useMemo(() => {
    const slots: CalendarTimeSlot[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let quarter = 0; quarter < 4; quarter++) {
        const minutes = quarter * 15;
        const time = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        slots.push({
          time,
          hour,
          quarter,
          label: formatTime(time)
        });
      }
    }
    return slots;
  }, []);

  // Station grid data organization
  const stationGridData = useMemo(() => {
    const gridData: Record<string, any> = {};
    
    stations.forEach(station => {
      gridData[station.id] = {
        station,
        days: {}
      };
      
      weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayShifts = shifts.filter(shift => {
          const shiftDate = new Date(shift.shiftDate);
          return shiftDate.toDateString() === day.toDateString() && 
                 shift.stationId === station.id;
        });
        
        // Group shifts by template
        const templateGroups: Record<string, any> = {};
        
        dayShifts.forEach(shift => {
          const templateKey = shift.templateId || 'no-template';
          if (!templateGroups[templateKey]) {
            templateGroups[templateKey] = {
              template: shift.templateId ? 
                shiftTemplates.find(t => t.id === shift.templateId) : null,
              shifts: [],
              timeSlots: []
            };
          }
          templateGroups[templateKey].shifts.push(shift);
        });
        
        gridData[station.id].days[dayKey] = {
          date: day,
          shifts: dayShifts,
          templates: templateGroups
        };
      });
    });
    
    return gridData;
  }, [stations, weekDays, shifts, shiftTemplates]);

  // Month calendar calculation
  const getMonthCalendarDays = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const startWeek = startOfWeek(start, { weekStartsOn: 0 });
    const endWeek = addDays(startWeek, 41); // 6 weeks * 7 days
    
    const days = eachDayOfInterval({ start: startWeek, end: endWeek });
    
    return days.map(day => ({
      date: day,
      isCurrentMonth: day >= start && day <= end
    }));
  };

  // Event handlers
  const handlePreviousWeek = () => {
    if (viewType === 'month') {
      onDateChange?.(addDays(selectedDate, -30));
    } else {
      onDateChange?.(addDays(selectedDate, -7));
    }
  };

  const handleNextWeek = () => {
    if (viewType === 'month') {
      onDateChange?.(addDays(selectedDate, 30));
    } else {
      onDateChange?.(addDays(selectedDate, 7));
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplateId) return;
    
    const template = shiftTemplates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    // Apply template to selected stations and current week
    selectedStations.forEach(stationId => {
      weekDays.forEach(day => {
        const timeSlot: CalendarTimeSlot = {
          time: template.start_time,
          hour: parseInt(template.start_time.split(':')[0]),
          quarter: Math.floor(parseInt(template.start_time.split(':')[1]) / 15),
          label: formatTime(template.start_time)
        };
        
        onShiftCreate?.(timeSlot, stationId);
      });
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, shift: Shift) => {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    
    if (e.currentTarget instanceof HTMLElement) {
      dragSourceRef.current = e.currentTarget;
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedShift(null);
    dragSourceRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, timeSlot: CalendarTimeSlot, day: Date) => {
    e.preventDefault();
    
    if (!draggedShift) return;
    
    const newTime = timeSlot.time;
    const endHour = parseInt(draggedShift.endTime.split(':')[0]);
    const endMinutes = parseInt(draggedShift.endTime.split(':')[1]);
    const startHour = parseInt(draggedShift.startTime.split(':')[0]);
    const startMinutes = parseInt(draggedShift.startTime.split(':')[1]);
    
    const duration = (endHour * 60 + endMinutes) - (startHour * 60 + startMinutes);
    const newStartMinutes = timeSlot.hour * 60 + timeSlot.quarter * 15;
    const newEndMinutes = newStartMinutes + duration;
    
    const newEndHour = Math.floor(newEndMinutes / 60);
    const newEndMin = newEndMinutes % 60;
    const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`;
    
    onShiftTimeChange?.(draggedShift.id, newTime, newEndTime);
  };

  // Time slot click handler
  const handleTimeSlotClick = (timeSlot: CalendarTimeSlot, day: Date) => {
    if (selectedStations.size === 1) {
      const stationId = Array.from(selectedStations)[0];
      onShiftCreate?.(timeSlot, stationId);
    } else {
      onShiftCreate?.(timeSlot);
    }
  };

  // Helper functions
  const getShiftPositionStyle = (shift: Shift) => {
    const startMinutes = parseInt(shift.startTime.split(':')[0]) * 60 + parseInt(shift.startTime.split(':')[1]);
    const endMinutes = parseInt(shift.endTime.split(':')[0]) * 60 + parseInt(shift.endTime.split(':')[1]);
    const duration = endMinutes - startMinutes;
    
    const top = (startMinutes / (24 * 60)) * 100;
    const height = (duration / (24 * 60)) * 100;
    
    return {
      position: 'absolute' as const,
      top: `${top}%`,
      height: `${height}%`,
      left: '0',
      right: '0'
    };
  };

  const getShiftStatusColor = (shift: Shift) => {
    switch (shift.status) {
      case 'scheduled':
        return 'bg-blue-100 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200';
      case 'in_progress':
        return 'bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200';
      case 'completed':
        return 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/50 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200';
    }
  };

  const getFilteredShifts = (day: Date) => shifts.filter(shift => {
      const shiftDate = new Date(shift.shiftDate);
      const dateMatches = shiftDate.toDateString() === day.toDateString();
      const stationMatches = selectedStations.size === 0 || 
        (shift.stationId && selectedStations.has(shift.stationId));
      return dateMatches && stationMatches;
    });

  // Week view content generation
  const weekViewContent = useMemo(() => (
    <div className="grid grid-cols-8 gap-1 mt-4">
      {/* Time column */}
      <div className="space-y-px">
        <div className="h-16 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded" />
        {timeSlots.filter((_, i) => i % 4 === 0).map(slot => (
          <div 
            key={slot.time} 
            className="h-16 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs p-1 text-gray-600 dark:text-gray-300 flex items-start"
          >
            {slot.label}
          </div>
        ))}
      </div>

      {/* Day columns */}
      {weekDays.map(day => {
        const dayShifts = getFilteredShifts(day);
        
        return (
          <div key={day.toISOString()} className="space-y-px">
            {/* Day header */}
            <div className="h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 text-center">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {format(day, 'EEE')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {format(day, 'MMM d')}
              </div>
            </div>
            
            {/* Time slots with shifts */}
            <div className="relative">
              {timeSlots.filter((_, i) => i % 4 === 0).map((slot, index) => (
                <div
                  key={slot.time}
                  className="h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors relative"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, slot, day)}
                  onClick={() => handleTimeSlotClick(slot, day)}
                >
                  {/* 15-minute subdivisions */}
                  <div className="absolute inset-0 grid grid-rows-4">
                    {Array.from({ length: 4 }, (_, i) => {
                      const quarterSlot = timeSlots[index * 4 + i];
                      return (
                        <div 
                          key={quarterSlot.time}
                          className="border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, quarterSlot, day)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTimeSlotClick(quarterSlot, day);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Shifts overlay */}
              {dayShifts.map(shift => (
                <div
                  key={shift.id}
                  style={getShiftPositionStyle(shift)}
                  className={`p-1 border rounded-md m-px cursor-pointer transition-all hover:shadow-md z-10 ${getShiftStatusColor(shift)}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, shift)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    onShiftClick?.(shift);
                  }}
                >
                  <div className="text-xs font-medium truncate">
                    {shift.startTime} - {shift.endTime}
                  </div>
                  <div className="text-xs opacity-80 truncate">
                    {getEmployeeName(shift._employeeId)}
                  </div>
                  {shift.stationId && (
                    <div className="text-xs opacity-60 truncate">
                      {getStationName?.(shift.stationId) || 'Station'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  ), [weekDays, timeSlots, shifts, selectedStations, getEmployeeName, getStationName, onShiftClick, onShiftCreate, onShiftTimeChange, handleDragStart, handleDragEnd, handleDragOver, handleDrop, handleTimeSlotClick]);

  return (
    <div className="space-y-4">
      {/* Header with navigation and controls */}
      <div className="flex items-center justify-between">
        {/* Date navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePreviousWeek}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {viewType === 'month' 
              ? format(selectedDate, 'MMMM yyyy')
              : `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`
            }
          </h2>
          
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                                {(templateGroup as any).template?.templateName || 'No Template'}
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