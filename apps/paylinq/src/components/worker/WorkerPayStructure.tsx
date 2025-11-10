import { useState } from 'react';
import { Package, Calendar, Plus, DollarSign, Percent, Clock, Trash2, History } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/utils/helpers';
import {
  useCurrentWorkerPayStructure,
  useWorkerPayStructureHistory,
  usePayStructureComponents,
  usePayStructureOverrides,
  useDeletePayStructureOverride,
} from '@/hooks/usePayStructures';
import AssignPayStructureModal from '@/components/modals/AssignPayStructureModal';
import ComponentOverrideModal from '@/components/modals/ComponentOverrideModal';

interface WorkerPayStructureProps {
  workerId: string;
  workerName?: string;
}

export default function WorkerPayStructure({ workerId, workerName }: WorkerPayStructureProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Fetch current pay structure
  const { data: currentStructure, isLoading: isLoadingCurrent } = useCurrentWorkerPayStructure(workerId);
  
  // Fetch assignment history
  const { data: structureHistory, isLoading: isLoadingHistory } = useWorkerPayStructureHistory(workerId);

  // Get components for current structure
  const { data: components, isLoading: isLoadingComponents } = usePayStructureComponents(
    currentStructure?.templateId || ''
  );

  // Get overrides for current structure
  const { data: overrides } = usePayStructureOverrides(currentStructure?.id || '');
  const deleteOverrideMutation = useDeletePayStructureOverride();

  const handleDeleteOverride = async (overrideId: string) => {
    if (window.confirm('Are you sure you want to delete this override?')) {
      await deleteOverrideMutation.mutateAsync({
        overrideId,
        workerStructureId: currentStructure?.id || '',
      });
    }
  };

  // Loading state
  if (isLoadingCurrent || isLoadingHistory) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
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

              {/* Components Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Pay Components</h5>
                  <button
                    onClick={() => setShowOverrideModal(true)}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Override</span>
                  </button>
                </div>

                {isLoadingComponents ? (
                  <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                  </div>
                ) : components && components.length > 0 ? (
                  <div className="space-y-2">
                    {components.map((component: any) => (
                      <ComponentRow key={component.id} component={component} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                    No components in this pay structure template
                  </div>
                )}
              </div>
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

      {/* Component Overrides Section */}
      {currentStructure && overrides && overrides.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <History className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Component Overrides</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Worker-specific component adjustments</p>
                </div>
              </div>
              <Badge variant="purple">{overrides.length} Override(s)</Badge>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {overrides.map((override: any) => (
                <div
                  key={override.id}
                  className="p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {override.componentCode}
                        </h5>
                        {override.isDisabled && (
                          <Badge variant="red" className="text-xs">Disabled</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {override.overrideReason}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>From: {formatDate(override.effectiveFrom)}</span>
                        </div>
                        {override.effectiveTo && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>To: {formatDate(override.effectiveTo)}</span>
                          </div>
                        )}
                        {!override.isDisabled && (
                          <>
                            {override.fixedAmount && (
                              <div className="flex items-center space-x-1">
                                <DollarSign className="w-3 h-3" />
                                <CurrencyDisplay amount={override.fixedAmount} className="text-xs" />
                              </div>
                            )}
                            {override.percentageValue && (
                              <div className="flex items-center space-x-1">
                                <Percent className="w-3 h-3" />
                                <span>{override.percentageValue}%</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteOverride(override.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete Override"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

      <ComponentOverrideModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        workerId={workerId}
        workerStructureId={currentStructure?.id || ''}
        templateId={currentStructure?.templateId || ''}
        workerName={workerName || 'Worker'}
      />
    </div>
  );
}

// Component Row Component
interface ComponentRowProps {
  component: any;
}

function ComponentRow({ component }: ComponentRowProps) {
  const getComponentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'earning':
        return <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'deduction':
        return <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getCalculationDisplay = () => {
    switch (component.calculation_method) {
      case 'fixed':
        return (
          <div className="flex items-center space-x-1">
            <DollarSign className="w-3 h-3" />
            <CurrencyDisplay amount={component.fixed_amount || 0} className="text-sm font-medium" />
          </div>
        );
      case 'percentage':
        return (
          <div className="flex items-center space-x-1">
            <Percent className="w-3 h-3" />
            <span className="text-sm font-medium">{component.percentage || 0}%</span>
          </div>
        );
      case 'hourly':
        return (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <CurrencyDisplay amount={component.hourly_rate || 0} className="text-sm font-medium" />
            <span className="text-xs text-gray-500">/hr</span>
          </div>
        );
      case 'formula':
        return <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Formula</span>;
      case 'tiered':
        return <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Tiered</span>;
      default:
        return <span className="text-sm text-gray-500">-</span>;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'earning':
        return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30';
      case 'deduction':
        return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30';
      case 'tax':
        return 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30';
      case 'benefit':
        return 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30';
      default:
        return 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-center space-x-3 flex-1">
        {getComponentIcon(component.component_type)}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{component.component_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(component.component_type)}`}>
              {component.component_type}
            </span>
            {component.is_optional && (
              <Badge variant="gray" className="text-xs">
                Optional
              </Badge>
            )}
            {component.is_hidden && (
              <Badge variant="gray" className="text-xs">
                Hidden
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-4 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">{component.component_code}</span>
            {getCalculationDisplay()}
          </div>
        </div>
      </div>
      {component.has_override && (
        <Badge variant="yellow" className="text-xs">
          Override Active
        </Badge>
      )}
    </div>
  );
}

