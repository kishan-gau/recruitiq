import { Plus, Edit2, Trash2, Check, X, Link2, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import TemplateInclusionModal from '@/components/modals/TemplateInclusionModal';
import { ConfirmDialog } from '@recruitiq/ui';
import {
  useTemplateInclusions,
  useAddTemplateInclusion,
  useUpdateTemplateInclusion,
  useDeleteTemplateInclusion,
  type TemplateInclusion,
} from '@/hooks';

interface TemplateInclusionsPanelProps {
  templateId: string;
  isDraft: boolean;
}

export default function TemplateInclusionsPanel({ templateId, isDraft }: TemplateInclusionsPanelProps) {
  const { data: inclusions, isLoading } = useTemplateInclusions(templateId);
  const addMutation = useAddTemplateInclusion();
  const updateMutation = useUpdateTemplateInclusion();
  const deleteMutation = useDeleteTemplateInclusion();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInclusion, setSelectedInclusion] = useState<TemplateInclusion | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inclusionToDelete, setInclusionToDelete] = useState<string | null>(null);

  const handleAdd = () => {
    setSelectedInclusion(null);
    setIsModalOpen(true);
  };

  const handleEdit = (inclusion: TemplateInclusion) => {
    setSelectedInclusion(inclusion);
    setIsModalOpen(true);
  };

  const handleDelete = (inclusionId: string) => {
    setInclusionToDelete(inclusionId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (inclusionToDelete) {
      await deleteMutation.mutateAsync({
        parentTemplateId: templateId,
        inclusionId: inclusionToDelete,
      });
      setInclusionToDelete(null);
    }
  };

  const handleSubmit = async (data: any) => {
    if (selectedInclusion) {
      await updateMutation.mutateAsync({
        parentTemplateId: templateId,
        inclusionId: selectedInclusion.id,
        data,
      });
    } else {
      await addMutation.mutateAsync({
        parentTemplateId: templateId,
        data,
      });
    }
  };

  // Get IDs of already included templates
  const excludedTemplateIds = inclusions?.map((inc) => inc.includedTemplateId) || [];

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const sortedInclusions = [...(inclusions || [])].sort((a, b) => a.priority - b.priority);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Template Inclusions ({sortedInclusions.length})
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Include components from other templates to build complex pay structures
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={!isDraft}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={isDraft ? 'Add template inclusion' : 'Create a new version to add inclusions'}
        >
          <Plus className="w-4 h-4" />
          Add Inclusion
        </button>
      </div>

      {/* Inclusions List */}
      {sortedInclusions.length === 0 ? (
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
            <Link2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No template inclusions
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Include other templates to inherit their components and build modular pay structures
          </p>
          {isDraft && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Inclusion
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedInclusions.map((inclusion) => (
            <InclusionRow
              key={inclusion.id}
              inclusion={inclusion}
              onEdit={() => handleEdit(inclusion)}
              onDelete={() => handleDelete(inclusion.id)}
              isDraft={isDraft}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <TemplateInclusionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInclusion(null);
        }}
        onSubmit={handleSubmit}
        inclusion={selectedInclusion}
        excludeTemplateIds={[templateId, ...excludedTemplateIds]}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setInclusionToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Template Inclusion"
        message="Are you sure you want to remove this template inclusion? Components from the included template will no longer be merged."
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// ============================================================================
// Inclusion Row Component
// ============================================================================

interface InclusionRowProps {
  inclusion: TemplateInclusion;
  onEdit: () => void;
  onDelete: () => void;
  isDraft: boolean;
  key?: string; // React key prop for list rendering
}

function InclusionRow({ inclusion, onEdit, onDelete, isDraft }: InclusionRowProps) {
  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'merge':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'override':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
      case 'append':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'conditional':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getVersionDisplay = () => {
    switch (inclusion.versionConstraint) {
      case 'exact':
        return `v${inclusion.includedTemplateVersion}`;
      case 'minimum':
        return `≥ v${inclusion.minVersion}`;
      case 'range':
        return `v${inclusion.minVersion} - v${inclusion.maxVersion}`;
      case 'latest':
      default:
        return 'Latest version';
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Priority Badge */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {inclusion.priority}
          </span>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 text-gray-400 mt-2">
          <ChevronRight className="w-5 h-5" />
        </div>

        {/* Inclusion Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {inclusion.includedTemplate?.templateName || 'Unknown Template'}
            </h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getModeColor(inclusion.inclusionMode)}`}>
              {inclusion.inclusionMode}
            </span>
            {!inclusion.isActive && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded flex items-center gap-1">
                <X className="w-3 h-3" />
                Inactive
              </span>
            )}
            {inclusion.isActive && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded flex items-center gap-1">
                <Check className="w-3 h-3" />
                Active
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span>
              Code: {inclusion.includedTemplate?.templateCode || 'N/A'}
            </span>
            <span>•</span>
            <span>{getVersionDisplay()}</span>
            <span>•</span>
            <span>Priority: {inclusion.priority}</span>
            {inclusion.conditionExpression && (
              <>
                <span>•</span>
                <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <code className="text-xs bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
                    conditional
                  </code>
                </span>
              </>
            )}
          </div>

          {inclusion.conditionExpression && (
            <div className="mt-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">Condition: </span>
              <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded font-mono text-gray-900 dark:text-gray-100">
                {inclusion.conditionExpression}
              </code>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            disabled={!isDraft}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400"
            title={isDraft ? 'Edit inclusion' : 'Create a new version to edit inclusions'}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={!isDraft}
            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400"
            title={isDraft ? 'Delete inclusion' : 'Create a new version to delete inclusions'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
