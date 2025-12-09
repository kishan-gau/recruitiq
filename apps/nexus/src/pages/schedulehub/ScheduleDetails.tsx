import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatusBadge from '@/components/ui/StatusBadge';
import CalendarView from '../../components/schedulehub/CalendarView.tsx';

// TypeScript interfaces for schedule and shift data
  interface Worker {
    id: string;
    firstName: string;
    lastName: string;
  }interface Role {
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
    console.error('Error calculating duration:', error, { startDate, endDate });
    return 'Duration calculation error';
  }
};

// Helper functions to calculate schedule statistics
const calculateAssignedWorkers = (shifts: Shift[]): number => {
  if (!shifts || !Array.isArray(shifts)) {
    console.log('DEBUG: calculateAssignedWorkers - Invalid shifts', { 
      hasShifts: !!shifts, 
      isArray: Array.isArray(shifts) 
    });
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
  
  console.log('DEBUG: calculateAssignedWorkers result', { 
    totalShifts: shifts.length, 
    uniqueWorkers: uniqueWorkers.size,
    workerKeys: Array.from(uniqueWorkers),
    sampleShift: shifts.length > 0 ? {
      hasWorkerId: !!shifts[0].workerId,
      hasWorker: !!shifts[0].worker,
      workerId: shifts[0].workerId,
      workerName: shifts[0].worker ? `${shifts[0].worker.firstName} ${shifts[0].worker.lastName}` : null
    } : null
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

export default function ScheduleDetails() {
  const { id } = useParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const { data: scheduleResponse, isLoading, error } = useQuery({
    queryKey: ['schedule', id],
    queryFn: () => schedulehubApi.schedules.get(id!, true),
    enabled: !!id,
  });

  const schedule = scheduleResponse?.schedule;
  const shifts = scheduleResponse?.shifts || [];
  
  // DEBUG: Log schedule response and shifts data
  React.useEffect(() => {
    console.log('DEBUG: Schedule response data:', {
      hasScheduleResponse: !!scheduleResponse,
      scheduleExists: !!schedule,
      shiftsFromResponse: scheduleResponse?.shifts,
      shiftsLength: shifts.length,
      isLoading,
      error
    });
    if (scheduleResponse) {
      console.log('DEBUG: Full schedule response:', scheduleResponse);
    }
  }, [scheduleResponse, schedule, shifts, isLoading, error]);
  
  // State for worker and station name mappings
  const [workerNames, setWorkerNames] = React.useState<Record<string, string>>({});
  const [stationNames, setStationNames] = React.useState<Record<string, string>>({});
  const [namesLoading, setNamesLoading] = React.useState(false);

  // Fetch worker and station names for shifts
  React.useEffect(() => {
    console.log('DEBUG: Name fetching useEffect triggered!', {
      shiftsLength: shifts.length,
      shiftsArray: shifts,
      hasShifts: shifts.length > 0
    });
    
    const fetchNames = async () => {
      if (!shifts.length) {
        console.log('DEBUG: No shifts to fetch names for - shifts array is empty');
        return;
      }
      
      setNamesLoading(true);
      
      try {
        // Debug: Log first few shifts to understand structure
        console.log('DEBUG: First 3 shifts structure:', shifts.slice(0, 3));
        
        // Get unique worker IDs and station IDs from shifts
        const workerIds = [...new Set(shifts.map((s: any) => s.employeeId || s.workerId).filter(Boolean))] as string[];
        const stationIds = [...new Set(shifts.map((s: any) => s.stationId).filter(Boolean))] as string[];
        
        console.log('DEBUG: Extracted IDs:', { 
          workerIds, 
          stationIds,
          totalShifts: shifts.length,
          shiftsWithWorkerIds: shifts.filter((s: any) => s.employeeId || s.workerId).length,
          shiftsWithStationIds: shifts.filter((s: any) => s.stationId).length
        });
        
        if (workerIds.length === 0 && stationIds.length === 0) {
          console.warn('DEBUG: No worker or station IDs found in shifts');
          setNamesLoading(false);
          return;
        }
        
        // Fetch worker names
        const workerPromises = workerIds.map(async (id) => {
          try {
            console.log(`DEBUG: Fetching worker data for ID: ${id}`);
            const response = await schedulehubApi.workers.get(id);
            console.log(`DEBUG: Worker API response for ${id}:`, response);
            // Worker data is in response.data
            const worker = response.data || response;
            console.log('DEBUG: Worker data extracted:', worker);
            // Handle both snake_case (from API) and camelCase field names
            const firstName = worker.first_name || worker.firstName;
            const lastName = worker.last_name || worker.lastName;
            const name = firstName && lastName 
              ? `${firstName} ${lastName}`
              : worker.name || `Worker ${id}`;
            console.log(`DEBUG: Resolved name for worker ${id}: ${name} (firstName: ${firstName}, lastName: ${lastName})`);
            return { id, name };
          } catch (error) {
            console.warn(`DEBUG: Failed to fetch worker ${id}:`, error);
            return { id, name: `Worker ${id}` };
          }
        });
        
        // Fetch station names
        const stationPromises = stationIds.map(async (id) => {
          try {
            console.log(`DEBUG: Fetching station data for ID: ${id}`);
            const response = await schedulehubApi.stations.get(id);
            console.log(`DEBUG: Station API response for ${id}:`, response);
            // Station data is in response.station
            const station = response.station || response.data || response;
            console.log(`DEBUG: Station data extracted:`, station);
            const name = station.name || `Station ${id}`;
            console.log(`DEBUG: Resolved name for station ${id}: ${name}`);
            return { id, name };
          } catch (error) {
            console.warn(`DEBUG: Failed to fetch station ${id}:`, error);
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
        
        console.log('DEBUG: Name mappings created:', {
          workerNames: workerNameMap,
          stationNames: stationNameMap
        });
        
      } catch (error) {
        console.error('Error fetching names:', error);
      } finally {
        setNamesLoading(false);
      }
    };
    
    console.log('DEBUG: Calling fetchNames() function');
    fetchNames();
  }, [shifts]);
  
  // Debug the shifts prop changes
  React.useEffect(() => {
    console.log('DEBUG: Shifts prop changed:', {
      shiftsCount: shifts.length,
      shiftsEmpty: shifts.length === 0,
      firstShiftSample: shifts[0] ? Object.keys(shifts[0]).slice(0, 10) : 'no shifts'
    });
  }, [shifts]);

  // Debug: Log the actual data structure to see what's coming from the API
  React.useEffect(() => {
    if (scheduleResponse) {
      console.log('DEBUG: Full API response:', scheduleResponse);
      console.log('DEBUG: Shifts data received:', {
        shiftsCount: shifts.length,
        shiftsArray: shifts,
        firstShift: shifts[0],
        hasShifts: shifts.length > 0,
        shiftsType: typeof shifts,
        isArray: Array.isArray(shifts),
        shiftDates: shifts.map((s: any) => ({
          id: s.id,
          shiftDate: s.shiftDate, // Updated to use correct property
          dateType: typeof s.shiftDate,
          parsedDate: new Date(s.shiftDate),
          dateString: new Date(s.shiftDate).toDateString()
        }))
      });
      console.log('DEBUG: Schedule data received:', {
        startDate: schedule?.startDate,
        startDateType: typeof schedule?.startDate,
        endDate: schedule?.endDate,
        endDateType: typeof schedule?.endDate,
        createdAt: schedule?.createdAt,
        createdAtType: typeof schedule?.createdAt,
        publishedAt: schedule?.publishedAt,
        rawStartDate: schedule?.startDate ? new Date(schedule.startDate) : 'No date',
        rawEndDate: schedule?.endDate ? new Date(schedule.endDate) : 'No date',
        fullSchedule: schedule
      });
    }
  }, [scheduleResponse, schedule, shifts]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link
            to="/schedulehub/schedules"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to ScheduleHub
          </Link>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {schedule.name}
            </h1>
            <div className="flex items-center mt-2 space-x-4">
              <StatusBadge status={schedule.status} />
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDateRange(schedule.startDate, schedule.endDate)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {schedule.status === 'draft' && (
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                Publish
              </button>
            )}
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {schedule ? calculateDuration(schedule.startDate, schedule.endDate) : 'Loading...'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {schedule ? calculateAssignedWorkers(shifts) : 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Workers</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {schedule ? calculateStations(shifts) : 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Stations</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {schedule ? calculateTotalShifts(shifts) : 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Shifts</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Calendar View - Takes 3/4 of the space */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Shift Assignments
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {schedule ? `${formatDateRange(schedule.startDate, schedule.endDate)}` : 'Loading schedule...'}
                    {schedule?.notes && ` • ${schedule.notes}`}
                  </p>
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex items-center space-x-2">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'list'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <List className="h-4 w-4 mr-1.5" />
                      List
                    </button>
                    <button
                      onClick={() => setViewMode('week')}
                      className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'week'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Calendar className="h-4 w-4 mr-1.5" />
                      Week
                    </button>
                    <button
                      onClick={() => setViewMode('month')}
                      className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'month'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Grid className="h-4 w-4 mr-1.5" />
                      Month
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
                          className="py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                    <CalendarView 
                      shifts={shifts} 
                      viewType={viewMode as 'week' | 'month'}
                      workerNames={workerNames}
                      stationNames={stationNames}
                    />
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

        {/* Sidebar - Takes 1/4 of the space */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Quick Stats
            </h2>
            
            <dl className="space-y-4">
              <div className="flex items-center justify-between">
                <dt className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Clock className="h-4 w-4 mr-2" />
                  Duration
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {schedule ? calculateDuration(schedule.startDate, schedule.endDate) : 'Loading...'}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Users className="h-4 w-4 mr-2" />
                  Workers
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {schedule ? `${calculateAssignedWorkers(shifts)}` : 'Loading...'}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  <MapPin className="h-4 w-4 mr-2" />
                  Stations
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {schedule ? `${calculateStations(shifts)}` : 'Loading...'}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Calendar className="h-4 w-4 mr-2" />
                  Shifts
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {schedule ? `${calculateTotalShifts(shifts)}` : 'Loading...'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No recent activity to display.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}