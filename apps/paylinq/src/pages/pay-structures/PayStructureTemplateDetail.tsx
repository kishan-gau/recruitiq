import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import CardSkeleton from '@/components/ui/CardSkeleton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  usePayStructureTemplate,
  usePayStructureComponents,
  useAddPayStructureComponent,
  useUpdatePayStructureComponent,
  useDeletePayStructureComponent,
  usePublishPayStructureTemplate,
  type PayStructureComponent,
} from '@/hooks/usePayStructures';
import PayStructureComponentModal from '@/components/modals/PayStructureComponentModal';
import TemplateVersionHistory from '@/components/pay-structures/TemplateVersionHistory';

export default function PayStructureTemplateDetail() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  
  const { data: template, isLoading: templateLoading } = usePayStructureTemplate(templateId!);
  const { data: components, isLoading: componentsLoading } = usePayStructureComponents(templateId!);
  
  const addComponentMutation = useAddPayStructureComponent();
  const updateComponentMutation = useUpdatePayStructureComponent();
  const deleteComponentMutation = useDeletePayStructureComponent();
  const publishMutation = usePublishPayStructureTemplate();

  const [selectedComponent, setSelectedComponent] = useState<PayStructureComponent | null>(null);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<string | null>(null);

  const isLoading = templateLoading || componentsLoading;

  const handleBack = () => {
    navigate('/pay-components?tab=templates');
  };

  const handlePublish = () => {
    setShowPublishConfirm(true);
  };

  const confirmPublish = async () => {
    if (template?.id) {
      await publishMutation.mutateAsync(template.id);
    }
  };

  const handleAddComponent = () => {
    setSelectedComponent(null);
    setIsComponentModalOpen(true);
  };

  const handleEditComponent = (component: PayStructureComponent) => {
    setSelectedComponent(component);
    setIsComponentModalOpen(true);
  };

  const handleDeleteComponent = (componentId: string) => {
    setComponentToDelete(componentId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (componentToDelete && templateId) {
      await deleteComponentMutation.mutateAsync({ templateId, componentId: componentToDelete });
      setComponentToDelete(null);
    }
  };

  const handleComponentSubmit = async (data: any) => {
    if (selectedComponent) {
      // Update existing component
      await updateComponentMutation.mutateAsync({
        componentId: selectedComponent.id,
        templateId: templateId!,
        data,
      });
      // Toast is shown by the mutation hook
    } else {
      // Add new component
      await addComponentMutation.mutateAsync({
        templateId: templateId!,
        data,
      });
      // Toast is shown by the mutation hook
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Template not found
        </h3>
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Go back to templates
        </button>
      </div>
    );
  }

  const sortedComponents = components?.sort((a: PayStructureComponent, b: PayStructureComponent) => a.sequenceOrder - b.sequenceOrder) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to templates
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {template.templateName}
              </h1>
              <StatusBadge status={template.status} />
              {template.isOrganizationDefault && (
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                  Organization Default
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {template.templateCode} • Version {template.version}
            </p>
            {template.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {template.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {template.status === 'draft' && (
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Publish Template
              </button>
            )}
            <button
              onClick={handleAddComponent}
              disabled={template.status !== 'draft'}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={template.status !== 'draft' ? 'Create a new version to add components' : 'Add a new component'}
            >
              <Plus className="w-4 h-4" />
              Add Component
            </button>
          </div>
        </div>
      </div>

      {/* Template Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Components</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {sortedComponents.length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
            {template.status}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Effective From</div>
          <div className="text-lg font-medium text-gray-900 dark:text-white">
            {template.effectiveFrom ? new Date(template.effectiveFrom).toLocaleDateString() : 'Not set'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Created</div>
          <div className="text-lg font-medium text-gray-900 dark:text-white">
            {new Date(template.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Components List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pay Components ({sortedComponents.length})
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Components are calculated in the order shown below
          </p>
        </div>

        {sortedComponents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <Plus className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No components yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add your first pay component to start building this template
            </p>
            <button
              onClick={handleAddComponent}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Component
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedComponents.map((component: PayStructureComponent, index: number) => (
              <ComponentRow
                key={component.id}
                component={component}
                index={index}
                onEdit={() => handleEditComponent(component)}
                onDelete={() => handleDeleteComponent(component.id)}
                isDraft={template.status === 'draft'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Version History */}
      {template.templateCode && (
        <TemplateVersionHistory
          templateId={template.id}
          templateCode={template.templateCode}
          currentVersion={template.version}
        />
      )}

      {/* Component Modal */}
      <PayStructureComponentModal
        isOpen={isComponentModalOpen}
        onClose={() => {
          setIsComponentModalOpen(false);
          setSelectedComponent(null);
        }}
        onSubmit={handleComponentSubmit}
        component={selectedComponent}
        existingComponents={components || []}
      />

      {/* Publish Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={confirmPublish}
        title="Publish Template"
        message="Are you sure you want to publish this template? It will become available for assignment to workers."
        confirmText="Publish"
        variant="info"
        isLoading={publishMutation.isPending}
      />

      {/* Delete Component Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setComponentToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Component"
        message="Are you sure you want to delete this component from the template? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={deleteComponentMutation.isPending}
      />
    </div>
  );
}

// ============================================================================
// Component Row
// ============================================================================

interface ComponentRowProps {
  component: PayStructureComponent;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  isDraft: boolean;
}

function ComponentRow({ component, index, onEdit, onDelete, isDraft }: ComponentRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getComponentTypeColor = (type: string) => {
    switch (type) {
      case 'earnings':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'deductions':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'taxes':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'benefits':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getCalculationDisplay = (component: PayStructureComponent) => {
    switch (component.calculationType) {
      case 'fixed':
        return `Fixed: ${component.fixedAmount || 0} SRD`;
      case 'percentage':
        // Both percentageRate and percentageValue are stored as decimals (0.05 = 5%), multiply by 100 for display
        const percentageDisplay = ((component.percentageRate || component.percentageValue || 0) * 100).toFixed(4).replace(/\.?0+$/, '');
        const percentageBase = component.percentageOf || component.percentageBase || 'base';
        return `${percentageDisplay}% of ${percentageBase}`;
      case 'hourly_rate':
        return `Hourly: ${component.hourlyRate || 0} SRD/hr`;
      case 'formula':
        return 'Formula-based';
      case 'tiered':
        return `Tiered (${component.tieredRates?.length || 0} tiers)`;
      default:
        return component.calculationType;
    }
  };

  return (
    <div className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          {/* Order Number */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
            {index + 1}
          </div>

          {/* Expand/Collapse Icon */}
          <div
            className="flex-shrink-0 text-gray-400 transition-colors"
            title={isExpanded ? "Collapse details" : "Expand details"}
          >
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>

          {/* Component Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {component.componentName}
              </h3>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${getComponentTypeColor(component.componentType || '')}`}>
                {component.componentType}
              </span>
              {!component.isVisible && (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Hidden
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>Code: {component.componentCode}</span>
              <span>•</span>
              <span>{getCalculationDisplay(component)}</span>
              {component.isOptional && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 dark:text-blue-400">Optional</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              disabled={!isDraft}
              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400"
              title={isDraft ? "Edit" : "Create a new version to edit components"}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={!isDraft}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400"
              title={isDraft ? "Delete" : "Create a new version to delete components"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 ml-12 border-t border-gray-100 dark:border-gray-700/50 mt-2">
          <ComponentDetails component={component} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Component Details (Expanded View)
// ============================================================================

interface ComponentDetailsProps {
  component: PayStructureComponent;
}

function ComponentDetails({ component }: ComponentDetailsProps) {
  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => {
    if (!value && value !== 0 && value !== false) return null;
    
    return (
      <div className="flex items-start py-1.5">
        <div className="w-40 text-xs font-medium text-gray-600 dark:text-gray-400">
          {label}
        </div>
        <div className="flex-1 text-xs text-gray-900 dark:text-white">
          {value}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
      {/* Basic Information */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">Basic Information</h4>
        <div className="space-y-0.5">
          <DetailRow label="Component Code" value={component.componentCode} />
          <DetailRow label="Component Type" value={component.componentType} />
          <DetailRow label="Description" value={component.description} />
          <DetailRow label="Display Order" value={component.sequenceOrder} />
          <DetailRow label="Visible to Employee" value={component.isVisible ? 'Yes' : 'No'} />
          <DetailRow label="Optional Component" value={component.isOptional ? 'Yes' : 'No'} />
          <DetailRow label="Taxable" value={component.isTaxable ? 'Yes' : 'No'} />
          <DetailRow label="Affects Net Pay" value={component.affectsNetPay ? 'Yes' : 'No'} />
        </div>
      </div>

      {/* Calculation Details */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">Calculation Method</h4>
        <div className="space-y-0.5">
          <DetailRow label="Calculation Type" value={component.calculationType} />
          
          {component.calculationType === 'fixed' && (
            <DetailRow label="Fixed Amount" value={`${component.fixedAmount || 0} SRD`} />
          )}
          
          {component.calculationType === 'percentage' && (
            <>
              <DetailRow 
                label="Percentage Value" 
                value={`${((component.percentageRate || component.percentageValue || 0) * 100).toFixed(2)}%`} 
              />
              <DetailRow 
                label="Percentage Base" 
                value={component.percentageOf || component.percentageBase || 'base_salary'} 
              />
            </>
          )}
          
          {component.calculationType === 'hourly_rate' && (
            <DetailRow label="Hourly Rate" value={`${component.hourlyRate || 0} SRD/hr`} />
          )}
          
          {component.calculationType === 'formula' && (
            <DetailRow 
              label="Formula" 
              value={
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono">
                  {component.formula || 'No formula defined'}
                </code>
              } 
            />
          )}
          
          {component.calculationType === 'tiered' && component.tieredRates && component.tieredRates.length > 0 && (
            <DetailRow 
              label="Tiered Rates" 
              value={
                <div className="space-y-1">
                  {component.tieredRates.map((tier: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                      <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 rounded font-mono text-xs">
                        {tier.minValue || 0} - {tier.maxValue || '∞'}
                      </span>
                      <span>→</span>
                      <span className="font-medium">{tier.rate}%</span>
                    </div>
                  ))}
                </div>
              } 
            />
          )}
        </div>
      </div>

      {/* Min/Max Constraints */}
      {(component.minAmount !== undefined && component.minAmount !== null) || (component.maxAmount !== undefined && component.maxAmount !== null) ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">Value Constraints</h4>
          <div className="space-y-0.5">
            {component.minAmount !== undefined && component.minAmount !== null && (
              <DetailRow label="Minimum Amount" value={`${component.minAmount} SRD`} />
            )}
            {component.maxAmount !== undefined && component.maxAmount !== null && (
              <DetailRow label="Maximum Amount" value={`${component.maxAmount} SRD`} />
            )}
          </div>
        </div>
      ) : null}

      {/* Overrides & Patterns - Compact badges */}
      {(component.allowWorkerOverride || component.hasOverrides || component.temporalPatternId) && (
        <div className="col-span-1 md:col-span-2 xl:col-span-3 flex flex-wrap gap-2">
          {(component.allowWorkerOverride || component.hasOverrides) && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-900 dark:text-blue-100">Worker-Specific Overrides Allowed</span>
              {component.overrideAllowedFields && component.overrideAllowedFields.length > 0 && (
                <span className="text-blue-700 dark:text-blue-300">
                  ({component.overrideAllowedFields.join(', ')})
                </span>
              )}
            </div>
          )}
          {component.temporalPatternId && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-purple-900 dark:text-purple-100">Temporal Pattern: {component.temporalPatternId}</span>
            </div>
          )}
        </div>
      )}

      {/* Proration */}
      {component.prorationMethod && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">Proration</h4>
          <div className="space-y-0.5">
            <DetailRow label="Method" value={component.prorationMethod} />
          </div>
        </div>
      )}

      {/* Rules & Conditions */}
      {(component.applicabilityRules || component.conditionExpression || component.conditions) && (
        <div className="col-span-1 md:col-span-2 xl:col-span-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-orange-900 dark:text-orange-100 mb-2 uppercase tracking-wide">Rules & Conditions</h4>
          <div className="space-y-1.5">
            {component.applicabilityRules && (
              <div>
                <div className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-0.5">
                  Applicability Rules:
                </div>
                <pre className="text-xs bg-white dark:bg-gray-900 p-1.5 rounded border border-orange-200 dark:border-orange-800 overflow-x-auto font-mono">
                  {typeof component.applicabilityRules === 'string' 
                    ? component.applicabilityRules 
                    : JSON.stringify(component.applicabilityRules, null, 2)}
                </pre>
              </div>
            )}
            {component.conditionExpression && (
              <div>
                <div className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-0.5">
                  Condition Expression:
                </div>
                <code className="block text-xs bg-white dark:bg-gray-900 p-1.5 rounded border border-orange-200 dark:border-orange-800 font-mono">
                  {component.conditionExpression}
                </code>
              </div>
            )}
            {component.conditions && (
              <div>
                <div className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-0.5">
                  Conditions:
                </div>
                <pre className="text-xs bg-white dark:bg-gray-900 p-1.5 rounded border border-orange-200 dark:border-orange-800 overflow-x-auto font-mono">
                  {typeof component.conditions === 'string' 
                    ? component.conditions 
                    : JSON.stringify(component.conditions, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      {(component.roundingMethod || component.roundingPrecision !== undefined || 
        component.currency || component.payFrequency || component.compoundingFrequency) && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">Advanced Settings</h4>
          <div className="space-y-0.5">
            {component.roundingMethod && (
              <DetailRow label="Rounding Method" value={component.roundingMethod} />
            )}
            {component.roundingPrecision !== undefined && (
              <DetailRow label="Rounding Precision" value={component.roundingPrecision} />
            )}
            {component.currency && (
              <DetailRow label="Currency" value={component.currency} />
            )}
            {component.payFrequency && (
              <DetailRow label="Pay Frequency" value={component.payFrequency} />
            )}
            {component.compoundingFrequency && (
              <DetailRow label="Compounding Frequency" value={component.compoundingFrequency} />
            )}
          </div>
        </div>
      )}

      {/* Additional Metadata */}
      {(component.metadata || component.notes || component.tags) && (
        <div className="col-span-1 md:col-span-2 xl:col-span-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">Additional Information</h4>
          <div className="space-y-0.5">
            {component.notes && (
              <DetailRow label="Notes" value={component.notes} />
            )}
            {component.tags && (
              <DetailRow 
                label="Tags" 
                value={
                  Array.isArray(component.tags) 
                    ? component.tags.join(', ') 
                    : component.tags
                } 
              />
            )}
            {component.metadata && (
              <DetailRow 
                label="Metadata" 
                value={
                  <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-1.5 rounded overflow-x-auto font-mono">
                    {typeof component.metadata === 'string' 
                      ? component.metadata 
                      : JSON.stringify(component.metadata, null, 2)}
                  </pre>
                } 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

