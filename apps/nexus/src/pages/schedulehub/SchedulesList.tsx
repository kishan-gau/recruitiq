import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Eye, FileText, Archive, ArrowLeft, ChevronDown, ChevronRight, RotateCcw, Layers } from 'lucide-react';
import { useSchedules, usePublishSchedule } from '@/hooks/schedulehub/useScheduleStats';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Schedule } from '@/types/schedulehub';

// Helper function to safely format date ranges
function formatDateRange(startDate: string | null | undefined, endDate: string | null | undefined): string {
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'No date set';
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString();
  };

  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);

  if (formattedStart === formattedEnd) {
    return formattedStart;
  }

  return `${formattedStart} - ${formattedEnd}`;
}

export default function SchedulesList() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [publishDialogState, setPublishDialogState] = useState<{ isOpen: boolean; id: string }>({ 
    isOpen: false, 
    id: '' 
  });
  const toast = useToast();

  const { data, isLoading, error } = useSchedules({
    page,
    limit: 20,
    status: statusFilter || undefined,
  });

  const publishSchedule = usePublishSchedule();

  // Move all useMemo hooks before any early returns to ensure consistent hook order
  const allSchedules = data?.data || [];
  const pagination = data?.pagination;
  


  // Group schedules by parent_schedule_id or id for root schedules
  const scheduleGroups = useMemo(() => {
    const groups = new Map<string, Schedule[]>();
    
    allSchedules.forEach((schedule: Schedule) => {
      const groupKey = schedule.parent_schedule_id || schedule.id;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(schedule);
    });
    
    // Sort each group by version in descending order (latest first)
    groups.forEach((schedules) => {
      schedules.sort((a, b) => (b.version || 1) - (a.version || 1));
    });
    
    return groups;
  }, [allSchedules]);

  // Check if there are any schedule groups with multiple versions
  const hasMultipleVersions = useMemo(() => {
    return Array.from(scheduleGroups.values()).some(group => group.length > 1);
  }, [scheduleGroups]);

  // Get displayed schedules based on view mode
  const displayedSchedules = useMemo(() => {

    
    const result: Schedule[] = [];
    let totalVersionsAvailable = 0;
    
    scheduleGroups.forEach((group, groupKey) => {
      totalVersionsAvailable += group.length;
      
      if (showAllVersions) {
        // Show ALL versions when in "Show All Versions" mode

        result.push(...group);
      } else {
        // Show only latest version by default

        result.push(group[0]); // First item is latest due to sorting
        
        // In "Show Latest Only" mode, add older versions ONLY if manually expanded
        if (expandedGroups.has(groupKey) && group.length > 1) {

          result.push(...group.slice(1));
        }
      }
    });
    

    return result;
  }, [scheduleGroups, showAllVersions, expandedGroups]);

  const handlePublish = async (id: string) => {
    setPublishDialogState({ isOpen: true, id });
  };

  const confirmPublish = async () => {
    try {
      await publishSchedule.mutateAsync(publishDialogState.id);
      toast.success('Schedule published successfully!');
      setPublishDialogState({ isOpen: false, id: '' });
    } catch (error: any) {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to publish schedule',
      });
      setPublishDialogState({ isOpen: false, id: '' });
    }
  };

  const toggleGroupExpansion = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const isLatestVersion = (schedule: Schedule) => {
    const groupKey = schedule.parent_schedule_id || schedule.id;
    const group = scheduleGroups.get(groupKey);
    return group && group[0].id === schedule.id;
  };

  const getVersionCount = (schedule: Schedule) => {
    const groupKey = schedule.parent_schedule_id || schedule.id;
    const group = scheduleGroups.get(groupKey);
    return group ? group.length : 1;
  };

  const isGroupExpanded = (schedule: Schedule) => {
    const groupKey = schedule.parent_schedule_id || schedule.id;
    return expandedGroups.has(groupKey);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error loading schedules</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        to="/schedulehub"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to ScheduleHub
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedules</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create and manage work schedules
          </p>
        </div>
        <Link
          to="/schedulehub/schedules/builder"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Schedule
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Draft Schedules
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {displayedSchedules.filter((s: Schedule) => s.status === 'draft').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Published Schedules
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {displayedSchedules.filter((s: Schedule) => s.status === 'published').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Archive className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Archived
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {displayedSchedules.filter((s: Schedule) => s.status === 'archived').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            {hasMultipleVersions && (
              <button
                onClick={() => setShowAllVersions(!showAllVersions)}
                className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md transition-colors ${
                  showAllVersions
                    ? 'border-indigo-300 text-indigo-700 bg-indigo-50 dark:border-indigo-600 dark:text-indigo-400 dark:bg-indigo-900/20'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                }`}
              >
                <Layers className="h-4 w-4 mr-2" />
                {showAllVersions ? 'Show Latest Only' : 'Show All Versions'}
              </button>
            )}
            
            {hasMultipleVersions && (
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                {scheduleGroups.size} schedules ({allSchedules.length - scheduleGroups.size} versions)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Schedules Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayedSchedules.map((schedule: Schedule) => {
          const groupKey = schedule.parent_schedule_id || schedule.id;
          const versionCount = getVersionCount(schedule);
          const isLatest = isLatestVersion(schedule);
          const isExpanded = isGroupExpanded(schedule);
          const isOlderVersion = !isLatest;
          
          return (
            <div
              key={schedule.id}
              className={`bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow ${
                isOlderVersion ? 'ml-4 border-l-4 border-indigo-200 dark:border-indigo-800' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {schedule.name}
                    </h3>
                    
                    {/* Version Badge */}
                    {(schedule.version && schedule.version > 1) || schedule.parent_schedule_id ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        v{schedule.version || 1}
                      </span>
                    ) : null}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        schedule.status === 'published'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : schedule.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}
                    >
                      {schedule.status}
                    </span>
                  </div>
                </div>

                {/* Version History Controls */}
                {isLatest && versionCount > 1 && !showAllVersions && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => toggleGroupExpansion(groupKey)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      <RotateCcw className="h-3 w-3" />
                      {versionCount - 1} older version{versionCount > 2 ? 's' : ''}
                    </button>
                  </div>
                )}
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDateRange(schedule.start_date, schedule.end_date)}
                  </div>
                  {schedule.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {schedule.notes}
                    </p>
                  )}
                  
                  {/* Show regeneration info for older versions */}
                  {isOlderVersion && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      Previous version • Created {new Date(schedule.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  to={`/schedulehub/schedules/${schedule.id}`}
                  className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Link>

                {schedule.status === 'draft' && (
                  <button
                    onClick={() => handlePublish(schedule.id)}
                    disabled={publishSchedule.isPending}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    Publish
                  </button>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {displayedSchedules.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No schedules
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new schedule.
          </p>
          <div className="mt-6">
            <Link
              to="/schedulehub/schedules/builder"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Link>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing page <span className="font-medium">{page}</span> of{' '}
                <span className="font-medium">{pagination.totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                  disabled={page === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Dialog */}
      <ConfirmDialog
        isOpen={publishDialogState.isOpen}
        onClose={() => setPublishDialogState({ isOpen: false, id: '' })}
        onConfirm={confirmPublish}
        title="Publish Schedule"
        message="Are you sure you want to publish this schedule? Workers will be notified."
        confirmText="Publish"
        variant="info"
      />
    </div>
  );
}
