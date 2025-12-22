import React, { useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Badge,
  Calendar, 
  Clock, 
  Users, 
  MapPin,
  Edit,
  Download,
  List,
  Grid
} from 'lucide-react';
import { schedulehubApi } from '@/lib/api/schedulehub';
import { scheduleHubService } from '@/services/schedulehub.service';
import { useStations } from '@/hooks/schedulehub/useStations';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatusBadge from '@/components/ui/StatusBadge';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import CalendarView from '../../components/schedulehub/CalendarView';
import ShiftAssignmentModal from '../../components/schedulehub/ShiftAssignmentModal';

// TypeScript interfaces for schedule and shift data
interface Worker {
  id: string;
  firstName: string;
  lastName: string;
}

interface Role {
  id: string;
  name: string;
}

interface Station {
  id: string;
  name: string;
}

interface Shift {
  id: string;
  scheduleId: string;
  roleId: string;
  stationId: string;
  workerId: string | null;
  startTime: string;
  endTime: string;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  worker?: Worker | null;
  role?: Role;
  station?: Station;
}



// Helper function to safely format date ranges
const formatDateRange = (startDate: string | Date | null | undefined, endDate: string | Date | null | undefined): string => {
  const formatSingleDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'No date';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      return dateObj.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (!startDate && !endDate) {
    return 'No dates specified';
  }

  if (!startDate) {
    return `Until ${formatSingleDate(endDate)}`;
  }

  if (!endDate) {
    return `From ${formatSingleDate(startDate)}`;
  }

  const formattedStart = formatSingleDate(startDate);
  const formattedEnd = formatSingleDate(endDate);

  if (formattedStart === formattedEnd) {
    return formattedStart;
  }

  return `${formattedStart} - ${formattedEnd}`;
};

// Helper function to format single dates safely
const formatSingleDate = (date: string | Date | null | undefined): string => {
  if (!date) return 'No date';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    return dateObj.toLocaleDateString();
  } catch (error) {
    return 'Invalid date';
  }
};

// Helper function to safely calculate duration between dates
const calculateDuration = (startDate: string | Date | null | undefined, endDate: string | Date | null | undefined): string => {
  if (!startDate || !endDate) return 'No dates available';
  
  try {
    const startDateObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const endDateObj = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    // Check if dates are valid
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return 'Invalid dates';
    }
    
    const diffTime = endDateObj.getTime() - startDateObj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    
    if (diffDays < 0) {
      return 'Invalid date range';
    }
    
    if (diffDays === 0) {
      return 'Same day';
    }
    
    return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
  } catch (error) {
    return 'Duration calculation error';
  }
};

// Helper functions to calculate schedule statistics
const calculateAssignedWorkers = (shifts: Shift[]): number => {
  if (!shifts || !Array.isArray(shifts)) {
    return 0;
  }
  
  // Count unique workers - check both workerId and worker object
  const uniqueWorkers = new Set();
  
  shifts.forEach(shift => {
    if (shift && (shift.workerId || shift.worker)) {
      // Prefer workerId if available, otherwise use worker.id, fallback to a composite key
      const workerKey = shift.workerId || 
                       (shift.worker?.id) || 
                       (shift.worker ? `${shift.worker.firstName}-${shift.worker.lastName}` : null);
      
      if (workerKey && workerKey.trim() !== '') {
        uniqueWorkers.add(workerKey);
      }
    }
  });
  

  
  return uniqueWorkers.size;
};

const calculateStations = (shifts: Shift[]): number => {
  if (!shifts || !Array.isArray(shifts)) return 0;
  
  const uniqueStations = new Set();
  
  shifts.forEach(shift => {
    if (shift && (shift.stationId || shift.station)) {
      // Prefer stationId if available, otherwise use station.id, fallback to station.name
      const stationKey = shift.stationId || 
                        (shift.station?.id) || 
                        (shift.station?.name);
      
      if (stationKey && stationKey.trim() !== '') {
        uniqueStations.add(stationKey);
      }
    }
  });
  
  return uniqueStations.size;
};

const calculateTotalShifts = (shifts: Shift[]): number => {
  if (!shifts || !Array.isArray(shifts)) return 0;
  return shifts.length;
};

type ViewMode = 'list' | 'week' | 'month';

function ScheduleDetailsComponent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('week'); // Default to week view to show calendar first
  const [showQuickStats, setShowQuickStats] = useState(false); // Collapsed by default
  const [showSummary, setShowSummary] = useState(true); // Keep summary visible
  // Add date state for calendar navigation
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Shift assignment modal state
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const { data: scheduleResponse, isLoading, error } = useQuery({
    queryKey: ['schedule', id],
    queryFn: () => schedulehubApi.schedules.get(id!, true),
    enabled: !!id,
  });

  // Fetch stations for calendar view filtering
  const { data: stations = [] } = useStations();

  const queryClient = useQueryClient();
  const toast = useToast();
  
  // Publish schedule mutation following RolesList pattern
  const publishMutation = useMutation({
    mutationFn: (scheduleId: string) => scheduleHubService.publishSchedule(scheduleId),
    onSuccess: (result) => {
      // Invalidate and refetch schedule data
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      
      if (result.success) {
        toast.success('Schedule published successfully!');
      }
    },
    onError: (error: any) => {

      
      // Handle ConflictError from service layer
      if (error.conflicts && error.conflicts.length > 0) {
        // For now, show a basic alert with conflict information
        // TODO: Implement proper conflict resolution modal/dialog
        const conflictSummary = error.conflicts
          .map((conflict: any) => `${conflict.employee.name}: ${conflict.message}`)
          .join('\n');
        
        toast.error(`Cannot publish schedule due to conflicts:\n\n${conflictSummary}\n\nPlease resolve these conflicts and try again.`);
      } else {
        // General error handling
        toast.error(`Error publishing schedule: ${error.message || 'Unknown error'}`);
      }
    },
  });

  // Update shift mutation for drag-drop functionality
  const updateShiftMutation = useMutation({
    mutationFn: ({ shiftId, startTime, date }: { shiftId: string; startTime: string; date: Date }) => {
      // Convert date to ISO 8601 format (YYYY-MM-DD) required by backend
      const dateStr = date.toISOString().split('T')[0];
      // NOTE: Backend schema expects 'shiftDate', not 'date'
      return scheduleHubService.updateShift(shiftId, { startTime, shiftDate: dateStr });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (error: any) => {
      toast.error('Failed to update shift. Please try again.');
    }
  });

  // Handle shift time change from calendar drag-drop
  const handleShiftTimeChange = (shiftId: string, newTime: string, newDate: Date) => {
    updateShiftMutation.mutate({ shiftId, startTime: newTime, date: newDate });
  };

  // Optimized event handlers with useCallback for performance
  const handlePublishClick = useCallback(() => {
    if (id) {
      publishMutation.mutate(id);
    }
  }, [id, publishMutation]);

  const handleEditClick = useCallback(() => {
    if (id) {
      navigate(`/schedulehub/schedules/${id}/edit`);
    }
  }, [id, navigate]);

  const handleQuickStatsToggle = useCallback(() => {
    setShowQuickStats(prev => !prev);
  }, []);

  const handleWeekViewClick = useCallback(() => {
    setViewMode('week');
  }, []);

  const handleMonthViewClick = useCallback(() => {
    setViewMode('month');
  }, []);

  const handleListViewClick = useCallback(() => {
    setViewMode('list');
  }, []);

  // Handler for shift assignment modal
  const handleEditShift = useCallback((shift: Shift) => {
    setSelectedShift(shift);
    setIsAssignmentModalOpen(true);
  }, []);

  const handleCloseAssignmentModal = useCallback(() => {
    setIsAssignmentModalOpen(false);
    setSelectedShift(null);
  }, []);

  const schedule = scheduleResponse?.schedule;
  const shifts = scheduleResponse?.shifts || [];

  // Memoized calculations to prevent unnecessary re-computation
  const scheduleDuration = useMemo(() => 
    calculateDuration(schedule?.startDate, schedule?.endDate), 
    [schedule?.startDate, schedule?.endDate]
  );

  const assignedWorkersCount = useMemo(() => 
    calculateAssignedWorkers(shifts), 
    [shifts]
  );

  const stationsCount = useMemo(() => 
    calculateStations(shifts), 
    [shifts]
  );

  const totalShiftsCount = useMemo(() => 
    calculateTotalShifts(shifts), 
    [shifts]
  );

  // State for worker and station name mappings
  const [workerNames, setWorkerNames] = React.useState<Record<string, string>>({});
  const [stationNames, setStationNames] = React.useState<Record<string, string>>({});
  const [namesLoading, setNamesLoading] = React.useState(false);

  // Fetch worker and station names for shifts
  React.useEffect(() => {

    
    const fetchNames = async () => {
      if (!shifts.length) {

        return;
      }
      
      setNamesLoading(true);
      
      try {
        // Debug: Log first few shifts to understand structure
    
        
        // Get unique worker IDs and station IDs from shifts
        const workerIds = [...new Set(shifts.map((s: any) => s.employeeId || s.workerId).filter(Boolean))] as string[];
        const stationIds = [...new Set(shifts.map((s: any) => s.stationId).filter(Boolean))] as string[];
        

        
        if (workerIds.length === 0 && stationIds.length === 0) {

          setNamesLoading(false);
          return;
        }
        
        // Fetch worker names
        const workerPromises = workerIds.map(async (id) => {
          try {
            const response = await schedulehubApi.workers.get(id);
            // Worker data is in response.data
            const worker = response.data || response;

            // Handle both snake_case (from API) and camelCase field names
            const firstName = worker.first_name || worker.firstName;
            const lastName = worker.last_name || worker.lastName;
            const name = firstName && lastName 
              ? `${firstName} ${lastName}`
              : worker.name || `Worker ${id}`;

            return { id, name };
          } catch (error) {

            return { id, name: `Worker ${id}` };
          }
        });
        
        // Fetch station names
        const stationPromises = stationIds.map(async (id) => {
          try {
            const response = await schedulehubApi.stations.get(id);
            // Station data is in response.station
            const station = response.station || response.data || response;
            const name = station.name || `Station ${id}`;
            return { id, name };
          } catch (error) {

            return { id, name: `Station ${id}` };
          }
        });
        
        // Wait for all promises and build name mappings
        const [workerResults, stationResults] = await Promise.all([
          Promise.all(workerPromises),
          Promise.all(stationPromises)
        ]);
        
        const workerNameMap = workerResults.reduce((acc, { id, name }) => {
          acc[id as string] = name;
          return acc;
        }, {} as Record<string, string>);
        
        const stationNameMap = stationResults.reduce((acc, { id, name }) => {
          acc[id as string] = name;
          return acc;
        }, {} as Record<string, string>);
        
        setWorkerNames(workerNameMap);
        setStationNames(stationNameMap);
        

        
      } catch (error) {

      } finally {
        setNamesLoading(false);
      }
    };
    

    fetchNames();
  }, [shifts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Schedule Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The schedule you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link
            to="/schedulehub/schedules"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Schedules
          </Link>
        </div>
      </div>
    );
  }



  return (
    <div className="max-w-full mx-auto">
      {/* Compact Header */}
      <div className="mb-4">
        <div className="flex items-center mb-3">
          <Link
            to="/schedulehub/schedules"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to ScheduleHub
          </Link>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">
                {schedule.name}
              </h1>
              <StatusBadge status={schedule.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDateRange(schedule.startDate, schedule.endDate)}
              </div>
              {/* Contextual Quick Stats - Always visible, compact */}
              <div className="hidden sm:flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {calculateAssignedWorkers(shifts)} workers
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {calculateStations(shifts)} stations
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {calculateTotalShifts(shifts)} shifts
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Compact on mobile */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {schedule.status === 'draft' && (
              <button 
                  onClick={handlePublishClick}
                disabled={publishMutation.isPending}
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
              >
                {publishMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1"></div>
                    <span className="hidden sm:inline">Publishing...</span>
                    <span className="sm:hidden">Pub...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Publish</span>
                    <span className="sm:hidden">Pub</span>
                  </>
                )}
              </button>
            )}
            <button 
                onClick={handleEditClick}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Edit</span>
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Quick Stats - Only show on mobile when needed */}
      <div className="sm:hidden mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {calculateAssignedWorkers(shifts)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Workers</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {calculateStations(shifts)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Stations</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {totalShiftsCount}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Shifts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Extended Stats */}
      <div className="mb-4">
        <button
            onClick={handleQuickStatsToggle}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <span>{showQuickStats ? 'Hide' : 'Show'} detailed statistics</span>
          <span className="text-xs">
            {showQuickStats ? '▲' : '▼'}
          </span>
        </button>
        
        {showQuickStats && (
          <div className="mt-2 bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {schedule ? scheduleDuration : 'Loading...'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {schedule ? assignedWorkersCount : 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Assigned Workers</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {schedule ? stationsCount : 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active Stations</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {schedule ? totalShiftsCount : 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Shifts</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full-Width Calendar Layout */}
      <div className="w-full">
        
        {/* Main Calendar View - Full width */}
        <div className="w-full">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Shift Assignments
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {schedule ? `${formatDateRange(schedule.startDate, schedule.endDate)}` : 'Loading schedule...'}
                    {schedule?.notes && ` • ${schedule.notes}`}
                  </p>
                </div>
                
                {/* View Mode Toggle - Calendar Views First */}
                <div className="flex items-center space-x-2">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
                    <button
                      onClick={handleWeekViewClick}
                      className={`flex items-center px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'week'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Calendar className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Week</span>
                    </button>
                    <button
                      onClick={handleMonthViewClick}
                      className={`flex items-center px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'month'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Grid className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Month</span>
                    </button>
                    <button
                      onClick={handleListViewClick}
                      className={`flex items-center px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'list'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <List className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">List</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {shifts && shifts.length > 0 ? (
                <>
                  {viewMode === 'list' ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {shifts.map((shift: Shift) => (
                        <div
                          key={shift.id}
                          className="py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-6 mb-3">
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 text-gray-400 mr-2" />
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {shift.worker?.firstName} {shift.worker?.lastName}
                                  </span>
                                </div>
                                
                                <div className="flex items-center">
                                  <Badge className="h-4 w-4 text-gray-400 mr-2" />
                                  <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {shift.role?.name || 'No Role Assigned'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                                  <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {shift.station?.name || 'No Station Assigned'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                                <Clock className="h-4 w-4 mr-2" />
                                <span className="font-medium">
                                  {(() => {
                                    try {
                                      const startTime = new Date(shift.startTime);
                                      const endTime = new Date(shift.endTime);
                                      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                                        return 'Invalid time';
                                      }
                                      return `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                    } catch (error) {
                                      return 'Invalid time';
                                    }
                                  })()}
                                </span>
                                <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                                <span>
                                  {formatSingleDate(shift.startTime)}
                                </span>
                              </div>
                              
                              {shift.notes && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                  <p className="text-sm text-blue-700 dark:text-blue-300">
                                    <strong>Notes:</strong> {shift.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-shrink-0 ml-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                shift.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                  : shift.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                                  : shift.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                              }`}>
                                {shift.status || 'scheduled'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="min-h-[400px]">
                      <CalendarView 
                        shifts={shifts} 
                        viewType={viewMode as 'week' | 'month'}
                        workerNames={workerNames}
                        stationNames={stationNames}
                        stations={stations}
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                        onShiftTimeChange={handleShiftTimeChange}
                        onEditShift={handleEditShift}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    No shifts assigned yet
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add shifts to this schedule to see worker assignments and timeline details.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Shift Assignment Modal */}
      {selectedShift && (
        <ShiftAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={handleCloseAssignmentModal}
          shift={selectedShift}
          scheduleId={id!}
          onAssignmentChange={() => {
            // Refetch schedule data to update the UI
            queryClient.invalidateQueries({ queryKey: ['schedule', id] });
          }}
        />
      )}
    </div>
  );
}

export default function ScheduleDetails() {
  return (
    <ErrorBoundary>
      <ScheduleDetailsComponent />
    </ErrorBoundary>
  );
}