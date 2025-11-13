import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, DollarSign, Minus, Edit2, Trash2, Package, FileText, Users } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import CardSkeleton from '@/components/ui/CardSkeleton';
import PayComponentFormModal from '@/components/modals/PayComponentFormModal';
import DeletePayComponentDialog from '@/components/modals/DeletePayComponentDialog';
import PayStructureTemplateModal from '@/components/modals/PayStructureTemplateModal';
import BulkAssignPayStructureModal from '@/components/modals/BulkAssignPayStructureModal';
import {
  usePayComponents,
  useCreatePayComponent,
  useUpdatePayComponent,
  useDeletePayComponent,
  type PayComponent,
} from '@/hooks/usePayComponents';
import {
  usePayStructureTemplates,
  useCreatePayStructureTemplate,
  useUpdatePayStructureTemplate,
  usePublishPayStructureTemplate,
  useDeprecatePayStructureTemplate,
  type PayStructureTemplate,
} from '@/hooks/usePayStructures';

type TabType = 'components' | 'templates';

export default function PayComponentsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'components');

  // Update activeTab when URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam === 'templates' || tabParam === 'components') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<PayComponent | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PayStructureTemplate | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  // React Query hooks - Components (only fetch when components tab is active)
  const { data: components, isLoading, error } = usePayComponents({ enabled: activeTab === 'components' });
  const createMutation = useCreatePayComponent();
  const updateMutation = useUpdatePayComponent();
  const deleteMutation = useDeletePayComponent();

  // React Query hooks - Templates (only fetch when templates tab is active)
  const { data: templates, isLoading: templatesLoading, error: templatesError } = usePayStructureTemplates({ enabled: activeTab === 'templates' });
  const createTemplateMutation = useCreatePayStructureTemplate();
  const updateTemplateMutation = useUpdatePayStructureTemplate();
  const publishTemplateMutation = usePublishPayStructureTemplate();
  const deprecateTemplateMutation = useDeprecatePayStructureTemplate();

  const handleAdd = () => {
    setModalMode('add');
    setSelectedComponent(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (component: PayComponent) => {
    setModalMode('edit');
    setSelectedComponent(component);
    setIsFormModalOpen(true);
  };

  const handleDelete = (component: PayComponent) => {
    setSelectedComponent(component);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (componentData: Omit<PayComponent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (modalMode === 'add') {
      await createMutation.mutateAsync(componentData);
    } else if (selectedComponent?.id) {
      await updateMutation.mutateAsync({
        id: selectedComponent.id,
        data: componentData,
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedComponent?.id) {
      await deleteMutation.mutateAsync(selectedComponent.id);
      setIsDeleteDialogOpen(false);
      setSelectedComponent(null);
    }
  };

  // Filter components by type
  const earnings = components?.filter((c) => c.type === 'earning') || [];
  const deductions = components?.filter((c) => c.type === 'deduction') || [];

  // Filter and deduplicate templates by status
  // For published: show only the latest active version per template code
  const publishedTemplatesMap = new Map<string, PayStructureTemplate>();
  templates?.filter((t: PayStructureTemplate) => t.status === 'active')
    .forEach((template) => {
      const existing = publishedTemplatesMap.get(template.templateCode);
      if (!existing || template.effectiveFrom > existing.effectiveFrom) {
        publishedTemplatesMap.set(template.templateCode, template);
      }
    });
  const publishedTemplates = Array.from(publishedTemplatesMap.values());

  // For drafts: show only templates that have a draft version
  const draftTemplatesMap = new Map<string, PayStructureTemplate>();
  templates?.filter((t: PayStructureTemplate) => t.status === 'draft')
    .forEach((template) => {
      const existing = draftTemplatesMap.get(template.templateCode);
      if (!existing || template.effectiveFrom > existing.effectiveFrom) {
        draftTemplatesMap.set(template.templateCode, template);
      }
    });
  const draftTemplates = Array.from(draftTemplatesMap.values());

  // For deprecated: show all deprecated versions
  const deprecatedTemplates = templates?.filter((t: PayStructureTemplate) => t.status === 'deprecated') || [];

  // Create map of active versions for draft templates
  const activeVersionsMap = new Map<string, string>();
  publishedTemplates.forEach((template) => {
    activeVersionsMap.set(template.templateCode, `v${template.version}`);
  });

  // Template handlers
  const handleAddTemplate = () => {
    setModalMode('add');
    setSelectedTemplate(null);
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: PayStructureTemplate) => {
    setModalMode('edit');
    setSelectedTemplate(template);
    setIsTemplateModalOpen(true);
  };

  const handleTemplateFormSubmit = async (templateData: any) => {
    if (modalMode === 'add') {
      await createTemplateMutation.mutateAsync(templateData);
    } else if (selectedTemplate?.id) {
      await updateTemplateMutation.mutateAsync({
        id: selectedTemplate.id,
        data: templateData,
      });
    }
  };

  const handlePublishTemplate = async (templateId: string) => {
    await publishTemplateMutation.mutateAsync(templateId);
  };

  const handleDeprecateTemplate = async (templateId: string, reason?: string) => {
    await deprecateTemplateMutation.mutateAsync({ id: templateId, reason });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Pay Components & Templates
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage individual components and reusable pay structure templates
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'templates' && (
            <button
              onClick={() => setIsBulkAssignModalOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Users className="w-4 h-4" />
              Bulk Assign
            </button>
          )}
          <button
            onClick={activeTab === 'components' ? handleAdd : handleAddTemplate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'components' ? 'Add Component' : 'Create Template'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('components')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'components'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Components
            </div>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Templates
            </div>
          </button>
        </nav>
      </div>

      {/* Components Tab Content */}
      {activeTab === 'components' && (
        <ComponentsTabContent
          isLoading={isLoading}
          error={error}
          components={components}
          earnings={earnings}
          deductions={deductions}
          handleAdd={handleAdd}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
        />
      )}

      {/* Templates Tab Content */}
      {activeTab === 'templates' && (
        <TemplatesTabContent
          isLoading={templatesLoading}
          error={templatesError}
          draftTemplates={draftTemplates}
          publishedTemplates={publishedTemplates}
          deprecatedTemplates={deprecatedTemplates}
          activeVersionsMap={activeVersionsMap}
          handleAddTemplate={handleAddTemplate}
          handleEditTemplate={handleEditTemplate}
          handlePublishTemplate={handlePublishTemplate}
          handleDeprecateTemplate={handleDeprecateTemplate}
          navigate={navigate}
        />
      )}

      {/* Modals */}
      <PayComponentFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedComponent(null);
        }}
        onSubmit={handleFormSubmit}
        component={selectedComponent}
        mode={modalMode}
      />

      <PayStructureTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          setIsTemplateModalOpen(false);
          setSelectedTemplate(null);
        }}
        onSubmit={handleTemplateFormSubmit}
        template={selectedTemplate}
        mode={modalMode}
      />

      <DeletePayComponentDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedComponent(null);
        }}
        onConfirm={handleConfirmDelete}
        component={selectedComponent}
        isLoading={deleteMutation.isPending}
      />

      <BulkAssignPayStructureModal
        isOpen={isBulkAssignModalOpen}
        onClose={() => setIsBulkAssignModalOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// Components Tab Content
// ============================================================================

interface ComponentsTabContentProps {
  isLoading: boolean;
  error: Error | null;
  components: PayComponent[] | undefined;
  earnings: PayComponent[];
  deductions: PayComponent[];
  handleAdd: () => void;
  handleEdit: (component: PayComponent) => void;
  handleDelete: (component: PayComponent) => void;
}

function ComponentsTabContent({
  isLoading,
  error,
  components,
  earnings,
  deductions,
  handleAdd,
  handleEdit,
  handleDelete,
}: ComponentsTabContentProps) {
  const ComponentCard = ({ component }: { component: PayComponent }) => (
    <div
      data-testid={`pay-component-${component.code}`}
      className={`bg-white dark:bg-gray-800 border rounded-lg p-4 hover:shadow-md transition-shadow ${
        component.type === 'earning'
          ? 'border-green-200 dark:border-green-800'
          : 'border-red-200 dark:border-red-800'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg ${
              component.type === 'earning'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            }`}
          >
            {component.type === 'earning' ? (
              <DollarSign className="w-5 h-5" />
            ) : (
              <Minus className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {component.name}
              </h3>
              <StatusBadge status={component.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Code: {component.code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEdit(component)}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(component)}
            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {component.description}
      </p>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Category:</span>
          <p className="font-medium text-gray-900 dark:text-white mt-0.5">
            {component.category}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Calculation:</span>
          <p className="font-medium text-gray-900 dark:text-white mt-0.5 capitalize">
            {component.calculationType}
            {component.defaultValue && ` (${component.defaultValue}${component.calculationType === 'percentage' ? '%' : ' SRD'})`}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Recurring:</span>
          <p className="font-medium text-gray-900 dark:text-white mt-0.5">
            {component.isRecurring ? 'Yes' : 'No'}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Taxable:</span>
          <p className="font-medium text-gray-900 dark:text-white mt-0.5">
            {component.isTaxable ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    </div>
  );
  
  return (
    <>
      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error loading pay components
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && components?.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <DollarSign className="w-8 h-8 text-gray-400 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No pay components yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Get started by creating your first earnings or deduction component
          </p>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Component
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && components && components.length > 0 && (
        <>
          {/* Earnings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Earnings ({earnings.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Components that add to gross pay
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {earnings.map((component) => (
                <ComponentCard key={component.id} component={component} />
              ))}
            </div>
          </div>

          {/* Deductions Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                <Minus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Deductions ({deductions.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Components that reduce net pay
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deductions.map((component) => (
                <ComponentCard key={component.id} component={component} />
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ============================================================================
// Templates Tab Content
// ============================================================================

interface TemplatesTabContentProps {
  isLoading: boolean;
  error: Error | null;
  draftTemplates: PayStructureTemplate[];
  publishedTemplates: PayStructureTemplate[];
  deprecatedTemplates: PayStructureTemplate[];
  activeVersionsMap: Map<string, string>;
  handleAddTemplate: () => void;
  handleEditTemplate: (template: PayStructureTemplate) => void;
  handlePublishTemplate: (templateId: string) => void;
  handleDeprecateTemplate: (templateId: string, reason?: string) => void;
  navigate: (path: string) => void;
}

function TemplatesTabContent({
  isLoading,
  error,
  draftTemplates,
  publishedTemplates,
  deprecatedTemplates,
  activeVersionsMap,
  handleAddTemplate,
  handleEditTemplate,
  handlePublishTemplate,
  handleDeprecateTemplate,
  navigate,
}: TemplatesTabContentProps) {
  const TemplateCard = ({ template, activeVersion }: { template: PayStructureTemplate; activeVersion?: string }) => (
    <div 
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/pay-structures/${template.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {template.templateName}
              </h3>
              <StatusBadge status={template.status} />
              {template.isOrganizationDefault && (
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                  Default
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {template.templateCode} • v{template.version}
            </p>
            {activeVersion && template.status === 'draft' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <span className="text-gray-400">↳</span>
                <span>Active: {activeVersion}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditTemplate(template);
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {template.status === 'draft' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePublishTemplate(template.id);
              }}
              className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              title="Publish"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          {template.status === 'published' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeprecateTemplate(template.id);
              }}
              className="p-1.5 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
              title="Deprecate"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {template.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {template.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Components:</span>
          <p className="font-medium text-gray-900 dark:text-white mt-0.5">
            {template.componentCount || template.componentsCount || 0}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Effective From:</span>
          <p className="font-medium text-gray-900 dark:text-white mt-0.5">
            {template.effectiveFrom ? new Date(template.effectiveFrom).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error loading pay structure templates
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && (draftTemplates.length === 0 && publishedTemplates.length === 0 && deprecatedTemplates.length === 0) && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <Package className="w-8 h-8 text-gray-400 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No pay structure templates yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create templates to group pay components for easier assignment to workers
          </p>
          <button
            onClick={handleAddTemplate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (publishedTemplates.length > 0 || draftTemplates.length > 0 || deprecatedTemplates.length > 0) && (
        <div className="space-y-8">
          {/* Published Templates */}
          {publishedTemplates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Published ({publishedTemplates.length})
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Active templates ready for assignment
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publishedTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          )}

          {/* Draft Templates */}
          {draftTemplates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Draft ({draftTemplates.length})
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Templates in progress
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {draftTemplates.map((template) => (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    activeVersion={activeVersionsMap.get(template.templateCode)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Deprecated Templates */}
          {deprecatedTemplates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Deprecated ({deprecatedTemplates.length})
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Archived templates
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deprecatedTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

