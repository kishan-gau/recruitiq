import { useParams } from 'react-router-dom';
import { ArrowLeft, User, Briefcase, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import WorkerPayStructureOverrides from '@/components/pay-structures/WorkerPayStructureOverrides';

export default function WorkerPayStructureDetail() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const { paylinq } = usePaylinqAPI();

  // Fetch current worker pay structure
  const { data: workerStructure, isLoading: loadingStructure } = useQuery({
    queryKey: ['workerPayStructure', employeeId],
    queryFn: async () => {
      const response = await paylinq.getCurrentWorkerPayStructure(employeeId!);
      return response.structure;
    },
    enabled: !!employeeId,
  });

  // Fetch worker details (simplified - you'd integrate with your actual worker/employee API)
  const { data: worker, isLoading: loadingWorker } = useQuery({
    queryKey: ['worker', employeeId],
    queryFn: async () => {
      // This would be your actual worker API call
      // For now, return mock data
      return {
        id: employeeId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        jobTitle: 'Senior Developer',
      };
    },
    enabled: !!employeeId,
  });

  if (loadingStructure || loadingWorker) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading worker details...</p>
        </div>
      </div>
    );
  }

  if (!workerStructure) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No pay structure assigned to this worker</p>
        </div>
      </div>
    );
  }

  const workerName = worker ? `${worker.firstName} ${worker.lastName}` : 'Worker';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {workerName}
                </h1>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  {worker?.jobTitle && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {worker.jobTitle}
                    </div>
                  )}
                  {worker?.email && (
                    <div>
                      {worker.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pay Structure Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pay Structure Details
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Template</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {workerStructure.templateName || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Version</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {workerStructure.templateVersion || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Effective From</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {workerStructure.effectiveFrom 
                  ? new Date(workerStructure.effectiveFrom).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Component Overrides Section */}
        {workerStructure.components && workerStructure.components.length > 0 && (
          <WorkerPayStructureOverrides
            employeeId={employeeId!}
            workerStructureId={workerStructure.id}
            components={workerStructure.components}
            workerName={workerName}
          />
        )}
      </div>
    </div>
  );
}
