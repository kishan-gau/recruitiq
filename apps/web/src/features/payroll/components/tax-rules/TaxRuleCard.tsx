import { 
  Pencil as PencilIcon, 
  Trash2 as TrashIcon, 
  Eye as EyeIcon, 
  Clock as ClockIcon,
  Copy as DocumentDuplicateIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon
} from 'lucide-react';
import React, { useState } from 'react';

import type { TaxRule } from '@recruitiq/types';

import { VersionStatusBadge } from './VersionStatusBadge';


interface TaxRuleCardProps {
  rule: TaxRule & {
    versions?: Array<{
      id: string;
      version: number;
      status: 'draft' | 'published' | 'archived';
      description?: string;
      createdAt: string;
      createdBy: string;
    }>;
    currentVersion?: {
      version: number;
      status: 'draft' | 'published' | 'archived';
    };
  };
  onEdit: (rule: TaxRule) => void;
  onDelete: (rule: TaxRule) => void;
  onView: (rule: TaxRule) => void;
  onViewVersionHistory: (rule: TaxRule) => void;
  onCreateVersion: (rule: TaxRule) => void;
  onViewVersion?: (rule: TaxRule, versionId: string) => void;
}

export const TaxRuleCard: React.FC<TaxRuleCardProps> = ({
  rule,
  onEdit,
  onDelete,
  onView,
  onViewVersionHistory,
  onCreateVersion,
  onViewVersion
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Safety check: if rule is undefined/null, don't render anything
  if (!rule) {
    console.warn('TaxRuleCard: rule prop is undefined/null');
    return null;
  }
  
  const hasVersions = (rule.versions?.length ?? 0) > 0;
  const publishedVersionsCount = rule.versions?.filter((v: { status: string }) => v.status === 'published').length || 0;
  const draftVersionsCount = rule.versions?.filter((v: { status: string }) => v.status === 'draft').length || 0;
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);

  const getTaxRuleTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'income_tax': 'Income Tax',
      'social_security': 'Social Security',
      'unemployment': 'Unemployment',
      'pension': 'Pension',
      'health_insurance': 'Health Insurance'
    };
    return typeMap[type] || type;
  };


  // Debug logging to see what data we're receiving
  console.log('TaxRuleCard rule data:', rule);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Main Card Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {rule.taxName || 'Unnamed Tax Rule'}
              </h3>
              {rule.currentVersion && (
                <VersionStatusBadge 
                  status={rule.currentVersion.status}
                  size="sm"
                />
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                v{rule.currentVersion?.version || rule.version || 1}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
              <span>Type: {getTaxRuleTypeDisplay(rule.taxType) || 'Not specified'}</span>
              {rule.effectiveFrom && (
                <>
                  <span>•</span>
                  <span>Effective: {new Date(rule.effectiveFrom).toLocaleDateString()}</span>
                </>
              )}
              {rule.effectiveTo && (
                <>
                  <span>•</span>
                  <span>Until: {new Date(rule.effectiveTo).toLocaleDateString()}</span>
                </>
              )}
            </div>

            {/* Tax Details */}
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">Method:</span>
                <span className="ml-1 text-gray-600 dark:text-gray-300">
                  {rule.calculationMethod || 'Not specified'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">Mode:</span>
                <span className="ml-1 text-gray-600 dark:text-gray-300">
                  {rule.calculationMode || 'Not specified'}
                </span>
              </div>
              {rule.annualCap && (
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Annual Cap:</span>
                  <span className="ml-1 text-gray-600 dark:text-gray-300">
                    {formatCurrency(rule.annualCap)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onView(rule)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="View Details"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(rule)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
              title="Edit Rule"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(rule)}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
              title="Delete Rule"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Version Summary & Actions */}
        {hasVersions && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  <span>{rule.versions?.length || 0} versions</span>
                </div>
                {publishedVersionsCount > 0 && (
                  <span>{publishedVersionsCount} published</span>
                )}
                {draftVersionsCount > 0 && (
                  <span>{draftVersionsCount} draft</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCreateVersion(rule)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  New Version
                </button>
                <button
                  onClick={() => onViewVersionHistory(rule)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Version History
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  title={isExpanded ? 'Collapse versions' : 'Expand versions'}
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Versions State */}
        {!hasVersions && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">No versions created yet</span>
              <button
                onClick={() => onCreateVersion(rule)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <DocumentDuplicateIcon className="w-4 h-4" />
                Create First Version
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Version List */}
      {isExpanded && hasVersions && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Recent Versions</h4>
            <div className="space-y-2">
              {rule.versions?.slice(0, 5).map((version: { id: string; version: number; status: string; description?: string; createdAt: string; createdBy: string }) => (
                <div 
                  key={version.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Version {version.version}
                    </span>
                    <VersionStatusBadge status={version.status as 'draft' | 'published' | 'archived' | 'pending'} size="sm" />
                    {version.description && (
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {version.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <div>{new Date(version.createdAt).toLocaleDateString()}</div>
                      <div>by {version.createdBy}</div>
                    </div>
                    {onViewVersion && (
                      <button
                        onClick={() => onViewVersion(rule, version.id)}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 rounded transition-colors"
                        title="View Version"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {(rule.versions?.length || 0) > 5 && (
              <div className="mt-3 text-center">
                <button
                  onClick={() => onViewVersionHistory(rule)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  View all {rule.versions?.length || 0} versions
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxRuleCard;