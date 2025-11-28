import { useState } from 'react';
import { ChevronDown, ChevronRight, Link2, Box, Circle } from 'lucide-react';
import { useResolvedPayStructureTemplate, type ResolvedPayStructureTemplate, type PayStructureTemplate } from '@/hooks/usePayStructures';

interface TemplateHierarchyTreeProps {
  templateId: string;
}

export default function TemplateHierarchyTree({ templateId }: TemplateHierarchyTreeProps) {
  const { data: resolvedData, isLoading } = useResolvedPayStructureTemplate(templateId);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!resolvedData) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <p className="text-gray-600 dark:text-gray-400 text-center">
          No resolved template data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Box className="w-5 h-5" />
          Template Hierarchy
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Visual representation of nested template structure and component resolution
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {resolvedData.resolvedComponents?.length || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Components</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {resolvedData.inclusionHierarchy?.length || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Included Templates</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {resolvedData.appliedInclusions?.length || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Applied Inclusions</div>
        </div>
      </div>

      {/* Tree */}
      <div className="p-4">
        <TreeNode
          template={resolvedData.template}
          inclusions={resolvedData.inclusionHierarchy || []}
          isRoot={true}
          level={0}
        />
      </div>

      {/* Component List */}
      {resolvedData.resolvedComponents && resolvedData.resolvedComponents.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Resolved Components ({resolvedData.resolvedComponents.length})
            </h3>
            <div className="space-y-2">
              {resolvedData.resolvedComponents
                .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                .map((component, index) => (
                  <div
                    key={component.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {component.componentName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {component.componentCode} • {component.componentCategory}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(component.componentCategory)}`}>
                      {component.calculationType}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tree Node Component
// ============================================================================

interface TreeNodeProps {
  template: PayStructureTemplate;
  inclusions: any[];
  isRoot: boolean;
  level: number;
}

function TreeNode({ template, inclusions, isRoot, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const childInclusions = inclusions.filter(
    (inc) => inc.parentTemplateId === template.id
  );

  const hasChildren = childInclusions.length > 0;

  return (
    <div>
      <div
        className={`flex items-start gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
          isRoot ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
        }`}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        {/* Icon */}
        <div className="flex-shrink-0">
          {isRoot ? (
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Box className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-blue-700 dark:text-blue-300" />
            </div>
          )}
        </div>

        {/* Template Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {template.templateName}
            </h3>
            {isRoot && (
              <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded">
                Root
              </span>
            )}
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded">
              v{template.version}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {template.templateCode} • {template.status}
          </div>
          {template.components && (
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {template.components.length} component{template.components.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Child Nodes */}
      {isExpanded && hasChildren && (
        <div className="mt-2">
          {childInclusions.map((inclusion) => (
            <div key={inclusion.id}>
              {inclusion.includedTemplate && (
                <TreeNode
                  template={inclusion.includedTemplate}
                  inclusions={inclusions}
                  isRoot={false}
                  level={level + 1}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCategoryColor(category: string) {
  switch (category) {
    case 'earning':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'deduction':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'tax':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    case 'benefit':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'employer_cost':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'reimbursement':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}
