import { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useWorkerOverrides, useCreateWorkerOverride, useUpdateWorkerOverride, useDeleteWorkerOverride } from '@/hooks/useWorkerOverrides';
import type { PayStructureComponent } from '@/hooks/usePayStructures';
import WorkerOverrideModal from '@/components/modals/WorkerOverrideModal';

interface WorkerPayStructureOverridesProps {
  employeeId: string;
  workerStructureId: string;
  components: PayStructureComponent[];
  workerName?: string;
}

export default function WorkerPayStructureOverrides({
  employeeId,
  workerStructureId,
  components,
  workerName,
}: WorkerPayStructureOverridesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<PayStructureComponent | null>(null);
  const [editingOverride, setEditingOverride] = useState<any>(null);

  const { data: overrides = [], isLoading } = useWorkerOverrides(workerStructureId);
  const createMutation = useCreateWorkerOverride(employeeId);
  const updateMutation = useUpdateWorkerOverride();
  const deleteMutation = useDeleteWorkerOverride();

  const handleAddOverride = (component: PayStructureComponent) => {
    setSelectedComponent(component);
    setEditingOverride(null);
    setIsModalOpen(true);
  };

  const handleEditOverride = (component: PayStructureComponent, override: any) => {
    setSelectedComponent(component);
    setEditingOverride(override);
    setIsModalOpen(true);
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (confirm('Are you sure you want to remove this override? The worker will revert to the template default.')) {
      deleteMutation.mutate(overrideId);
    }
  };

  const handleSubmit = async (data: any) => {
    if (editingOverride) {
      updateMutation.mutate({ overrideId: editingOverride.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getOverrideForComponent = (componentCode: string) => {
    return overrides.find((o: any) => o.componentCode === componentCode);
  };

  const formatOverrideValue = (override: any) => {
    switch (override.overrideType) {
      case 'amount':
        return `$${override.overrideAmount?.toFixed(2) || '0.00'}`;
      case 'percentage':
        return `${(override.overridePercentage * 100).toFixed(2)}%`;
      case 'rate':
        return `$${override.overrideRate?.toFixed(2) || '0.00'}/hr`;
      case 'formula':
        return 'Custom Formula';
      case 'disabled':
        return 'Disabled';
      default:
        return 'Unknown';
    }
  };

  const getComponentValue = (component: PayStructureComponent) => {
    switch (component.calculationType) {
      case 'fixed':
        return component.defaultAmount ? `$${component.defaultAmount.toFixed(2)}` : 'N/A';
      case 'percentage':
        return component.percentageRate ? `${(component.percentageRate * 100).toFixed(2)}%` : 'N/A';
      case 'hourly_rate':
        return component.rateMultiplier && component.defaultAmount 
          ? `$${(component.defaultAmount * component.rateMultiplier).toFixed(2)}/hr` 
          : 'N/A';
      case 'formula':
        return 'Formula';
      default:
        return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading overrides...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Component Overrides
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Customize pay components for this worker
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Component
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Template Value
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Override
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {components.map((component) => {
              const override = getOverrideForComponent(component.componentCode);
              const hasOverride = !!override;

              return (
                <tr key={component.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {component.componentName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {component.componentCode}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {getComponentValue(component)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {hasOverride ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {formatOverrideValue(override)}
                        </span>
                        {override.effectiveFrom && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            From {new Date(override.effectiveFrom).toLocaleDateString()}
                            {override.effectiveTo && ` to ${new Date(override.effectiveTo).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">
                        No override
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {hasOverride ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Override Active
                      </span>
                    ) : component.allowWorkerOverride ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        <XCircle className="w-3 h-3 mr-1" />
                        Not Allowed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {component.allowWorkerOverride && (
                        <>
                          {hasOverride ? (
                            <>
                              <button
                                onClick={() => handleEditOverride(component, override)}
                                className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                title="Edit override"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteOverride(override.id)}
                                className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                title="Remove override"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleAddOverride(component)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                              title="Add override"
                            >
                              <Plus className="w-4 h-4" />
                              Add Override
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedComponent && (
        <WorkerOverrideModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedComponent(null);
            setEditingOverride(null);
          }}
          onSubmit={handleSubmit}
          component={selectedComponent}
          existingOverride={editingOverride}
          workerStructureId={workerStructureId}
          workerName={workerName}
        />
      )}
    </div>
  );
}
