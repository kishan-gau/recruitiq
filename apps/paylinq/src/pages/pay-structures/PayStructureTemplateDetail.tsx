import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
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
    navigate('/pay-components');
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
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
}

function ComponentRow({ component, index, onEdit, onDelete }: ComponentRowProps) {
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
        return `${component.percentageValue || 0}% of ${component.percentageBase || 'base'}`;
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
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Order Number */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
          {index + 1}
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
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

