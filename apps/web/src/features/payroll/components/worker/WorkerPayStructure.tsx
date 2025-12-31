import { Package, Calendar, Plus } from 'lucide-react';
import { useState } from 'react';

import { StatusBadge } from '@recruitiq/ui';

import AssignPayStructureModal from '@/components/modals/AssignPayStructureModal';
import WorkerPayStructureOverrides from '@/components/pay-structures/WorkerPayStructureOverrides';
import {
  useCurrentWorkerPayStructure,
  useWorkerPayStructureHistory,
} from '@/hooks';
import { formatDate } from '@/utils/helpers';

interface WorkerPayStructureProps {
  workerId: string;
  workerName?: string;
}

export default function WorkerPayStructure({ workerId, workerName }: WorkerPayStructureProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Fetch current pay structure
  const { data: currentStructure, isLoading: isLoadingCurrent } = useCurrentWorkerPayStructure(workerId);
  
  // Fetch assignment history
  const { data: structureHistory, isLoading: isLoadingHistory } = useWorkerPayStructureHistory(workerId);

  // Loading state
  if (isLoadingCurrent || isLoadingHistory) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Pay Structure Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Pay Structure</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active template and component overrides</p>
              </div>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Template</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {currentStructure ? (
            <div className="space-y-4">
              {/* Template Info Card */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                        {currentStructure.template?.templateName || 'Unknown Template'}
                      </h4>
                      <Badge variant="blue">{currentStructure.template?.templateCode || currentStructure.templateId}</Badge>
                      <StatusBadge status={currentStructure.effectiveTo ? 'inactive' : 'active'} />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {currentStructure.template?.description || currentStructure.assignmentReason || 'No description available'}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Effective: {formatDate(currentStructure.effectiveFrom)}</span>
                      </div>
                      {currentStructure.effectiveTo && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Ends: {formatDate(currentStructure.effectiveTo)}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Assigned: {formatDate(currentStructure.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pay Structure Components with Overrides - Integrated View */}
              {currentStructure.components && currentStructure.components.length > 0 && (
                <div className="mt-6">
                  <WorkerPayStructureOverrides
                    employeeId={workerId}
                    workerStructureId={currentStructure.id}
                    components={currentStructure.components}
                    workerName={workerName}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-1">No Pay Structure Assigned</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Assign a pay structure template to this worker to manage their compensation components.
              </p>
              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Assign Template</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Assignment History Section */}
      {structureHistory && structureHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assignment History</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Previous pay structure assignments</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {structureHistory.map((assignment: any, index: number) => (
                <div
                  key={assignment.id}
                  className={`p-4 rounded-lg border ${
                    index === 0
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {assignment.template?.templateName || 'Unknown Template'}
                        </h5>
                        <Badge variant={index === 0 ? 'blue' : 'gray'}>{assignment.template?.templateCode || assignment.templateId}</Badge>
                        {index === 0 && <Badge variant="green">Current</Badge>}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>From: {formatDate(assignment.effectiveFrom)}</span>
                        </div>
                        {assignment.effectiveTo && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>To: {formatDate(assignment.effectiveTo)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AssignPayStructureModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        workerId={workerId}
        workerName={workerName || 'Worker'}
      />
    </div>
  );
}

// Component Row Component removed - now handled by WorkerPayStructureOverrides component