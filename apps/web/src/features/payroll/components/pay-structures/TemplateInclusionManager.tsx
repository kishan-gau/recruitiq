/**
 * Template Inclusion Manager Component
 * 
 * Manages nested template inclusions for a pay structure template
 * Allows adding, editing, reordering, and removing included templates
 */

import { Plus, Trash2, Edit2, GripVertical, Eye, AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/contexts/ToastContext';
import {
  useTemplateInclusions,
  useDeleteTemplateInclusion,
  useUpdateTemplateInclusion,
  type TemplateInclusion,
  type PayStructureTemplate,
} from '@/hooks';

import AddInclusionModal from './AddInclusionModal';

interface TemplateInclusionManagerProps {
  template: PayStructureTemplate;
  onPreviewResolved?: () => void;
}

export default function TemplateInclusionManager({ 
  template, 
  onPreviewResolved 
}: TemplateInclusionManagerProps) {
  const { error: showError } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInclusion, setEditingInclusion] = useState<TemplateInclusion | null>(null);

  // Fetch inclusions
  const { data: inclusions = [], isLoading } = useTemplateInclusions(template.id);

  // Mutations
  const deleteInclusion = useDeleteTemplateInclusion();
  const updateInclusion = useUpdateTemplateInclusion();

  const handleDelete = async (inclusion: TemplateInclusion) => {
    if (!window.confirm(`Remove "${inclusion.includedTemplateName || inclusion.includedTemplateCode}" from this template?`)) {
      return;
    }

    try {
      await deleteInclusion.mutateAsync({
        parentTemplateId: template.id,
        inclusionId: inclusion.id,
      });
    } catch (error: any) {
      showError(error.message || 'Failed to remove inclusion');
    }
  };

  const handleToggleActive = async (inclusion: TemplateInclusion) => {
    try {
      await updateInclusion.mutateAsync({
        parentTemplateId: template.id,
        inclusionId: inclusion.id,
        data: { isActive: !inclusion.isActive },
      });
    } catch (error: any) {
      showError(error.message || 'Failed to toggle inclusion');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Included Templates
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Inherit components from other templates
          </p>
        </div>
        <div className="flex gap-2">
          {inclusions.length > 0 && onPreviewResolved && (
            <button
              onClick={onPreviewResolved}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview Resolved
            </button>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Inclusion
          </button>
        </div>
      </div>

      {/* Draft Template Warning */}
      {template.status === 'draft' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Draft Template
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Template inclusions can only be added to published templates. Publish this template to enable nested structures.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inclusions List */}
      {inclusions.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Included Templates
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create reusable component sets by including other templates. Components will be merged based on priority and inclusion mode.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={template.status === 'draft'}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add First Inclusion
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {inclusions
            .sort((a: TemplateInclusion, b: TemplateInclusion) => a.inclusionPriority - b.inclusionPriority)
            .map((inclusion: TemplateInclusion) => (
              <InclusionCard
                key={inclusion.id}
                inclusion={inclusion}
                onEdit={() => setEditingInclusion(inclusion)}
                onDelete={() => handleDelete(inclusion)}
                onToggleActive={() => handleToggleActive(inclusion)}
              />
            ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAddModalOpen || editingInclusion) && (
        <AddInclusionModal
          parentTemplateId={template.id}
          inclusion={editingInclusion}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingInclusion(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Inclusion Card Component
// ============================================================================

interface InclusionCardProps {
  inclusion: TemplateInclusion;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  key?: string; // React key prop for list rendering
}

function InclusionCard({ inclusion, onEdit, onDelete, onToggleActive }: InclusionCardProps) {
  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        inclusion.isActive
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 opacity-60'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        <div className="flex-shrink-0 mt-1">
          <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
        </div>

        {/* Priority Badge */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {inclusion.inclusionPriority}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                {inclusion.includedTemplateName || inclusion.includedTemplateCode}
              </h4>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <span>{inclusion.includedTemplateCode}</span>
                <span>•</span>
                <span className="capitalize">{inclusion.inclusionMode}</span>
                {inclusion.versionConstraint && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{inclusion.versionConstraint}</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onToggleActive}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  inclusion.isActive
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                {inclusion.isActive ? 'Active' : 'Inactive'}
              </button>
              <button
                onClick={onEdit}
                className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Edit inclusion"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Remove inclusion"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
