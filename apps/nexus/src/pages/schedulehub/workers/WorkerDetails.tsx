import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWorker } from '@/hooks/schedulehub/useScheduleStats';
import { ArrowLeft } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import WorkerSchedulingConfig from '@/components/schedulehub/WorkerSchedulingConfig';

export default function WorkerDetails() {
  const { workerId } = useParams<{ workerId: string }>();
  const { data: worker, isLoading, error } = useWorker(workerId!);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  // Debug logging
  console.log('WorkerDetails Debug:', { workerId, worker, isLoading, error });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
        <p className="ml-4">Loading worker {workerId}...</p>
      </div>
    );
  }

  if (error) {
    console.error('Worker fetch error:', error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400">Failed to load worker details</p>
          <p className="text-red-600 dark:text-red-500 text-sm mt-2">Error: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-400">No worker data found for ID: {workerId}</p>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Worker not found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            The worker you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/schedulehub/workers"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Workers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/schedulehub/workers"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Workers
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {worker.firstName} {worker.lastName}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Employee #{worker.workerNumber || worker.employeeId}
            </p>
          </div>
          
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            worker.status === 'active'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : worker.status === 'inactive'
                ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {worker.status}
          </span>
        </div>
      </div>

      {/* Worker Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Basic Information */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Basic Information
              </h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    First Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {worker.firstName}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Last Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {worker.lastName}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Worker Number
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {worker.workerNumber || worker.employeeId}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Email
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {worker.email || 'Not provided'}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Phone
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {worker.phone || 'Not provided'}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Hire Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {worker.hireDate ? new Date(worker.hireDate).toLocaleDateString() : 'N/A'}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Employment & Schedule Info */}
        <div className="space-y-8">
          {/* Employment Details */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Employment Details
              </h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Max Hours/Week
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {worker.maxHoursPerWeek
                    ? `${worker.maxHoursPerWeek} hours/week`
                    : 'Not set'}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Status
                </dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    worker.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : worker.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {worker.status}
                  </span>
                </dd>
              </div>
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Schedule Configuration
              </h2>
            </div>
            
            <div className="px-6 py-4">
              <button
                onClick={() => setIsConfigDialogOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Manage Schedule Config
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-end space-x-4">
        <Link
          to={`/schedulehub/workers/${worker.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Edit Worker
        </Link>
      </div>

      {/* Schedule Configuration Dialog */}
      <WorkerSchedulingConfig
        employeeId={worker.id}
        employeeName={`${worker.firstName} ${worker.lastName}`}
        isOpen={isConfigDialogOpen}
        onClose={() => setIsConfigDialogOpen(false)}
        existingConfig={worker} // Pass the existing worker data which contains scheduling config
      />
    </div>
  );
}