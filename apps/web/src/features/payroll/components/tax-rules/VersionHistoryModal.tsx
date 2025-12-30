import { format } from 'date-fns';
import { 
  X as XMarkIcon, 
  Eye as EyeIcon, 
  Check as CheckIcon,
  Clock as ClockIcon,
  Tag as TagIcon
} from 'lucide-react';
import React, { useState } from 'react';


import type { TaxRule, TaxRuleVersion } from '@recruitiq/types';

import { useToast } from '../../contexts/ToastContext';
import { 
  useTaxRuleVersions, 
  useCompareTaxRuleVersions,
  useCreateTaxRuleVersion,
  usePublishTaxRuleVersion 
} from '../../hooks/useTaxRuleVersioning';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  taxRule: TaxRule;
}
export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  taxRule
}) => {
  const { success, error: errorToast } = useToast();
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const { 
    versions, 
    isLoading: versionsLoading, 
    error: versionsError 
  } = useTaxRuleVersions(taxRule.id);

  const { 
    comparison, 
    isLoading: comparisonLoading 
  } = useCompareTaxRuleVersions(
    selectedVersions[0], 
    selectedVersions[1]
  );

  const createVersionMutation = useCreateTaxRuleVersion();
  const publishVersionMutation = usePublishTaxRuleVersion();

  if (!isOpen) return null;

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  const handleCreateVersion = async () => {
    try {
      await createVersionMutation.mutateAsync({
        taxRuleSetId: taxRule.id,
        changeDescription: `Version created from current state at ${new Date().toISOString()}`,
        updates: {
          // Include current tax rule data as updates
          taxName: taxRule.taxName,
          description: taxRule.description,
          calculationMethod: taxRule.calculationMethod,
          calculationMode: taxRule.calculationMode
        }
      });
      success('New version created successfully');
    } catch (error) {
      errorToast('Failed to create new version');
    }
  };

  const handlePublishVersion = async (versionId: string) => {
    if (!confirm('Are you sure you want to publish this version? This will make it the active version.')) {
      return;
    }

    try {
      await publishVersionMutation.mutateAsync(versionId);
      success('Version published successfully');
    } catch (error) {
      errorToast('Failed to publish version');
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    if (status === 'published') {
      return (
        <span className={`${baseClasses} bg-green-100 text-green-800`}>
          <CheckIcon className="w-3 h-3 mr-1" />
          Published
        </span>
      );
    }
    
    return (
      <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
        <ClockIcon className="w-3 h-3 mr-1" />
        Draft
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Version History: {taxRule.taxName}
            </h3>
            <p className="text-sm text-gray-500">
              Manage and compare versions of this tax rule
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCreateVersion}
              disabled={createVersionMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <TagIcon className="w-4 h-4 mr-2" />
              Create Version
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Version List */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-900">Versions</h4>
                {selectedVersions.length === 2 && (
                  <button
                    onClick={() => setShowComparison(!showComparison)}
                    className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <EyeIcon className="w-4 h-4 mr-2" />
                    {showComparison ? 'Hide' : 'Show'} Comparison
                  </button>
                )}
              </div>
              
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {versionsLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    Loading versions...
                  </div>
                ) : versionsError ? (
                  <div className="p-4 text-center text-red-500">
                    Error loading versions
                  </div>
                ) : !versions?.length ? (
                  <div className="p-4 text-center text-gray-500">
                    No versions found
                  </div>
                ) : (
                  versions.map((version: TaxRuleVersion) => (
                    <div
                      key={version.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        selectedVersions.includes(version.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleVersionSelect(version.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-900">
                              Version {version.version}
                            </span>
                            {getStatusBadge(version.status)}
                            {selectedVersions.includes(version.id) && (
                              <CheckIcon className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Created {format(new Date(version.createdAt), 'PPp')} by {version.createdBy}
                          </p>
                          {version.publishedAt && (
                            <p className="text-sm text-green-600 mt-1">
                              Published {format(new Date(version.publishedAt), 'PPp')} by {version.publishedBy}
                            </p>
                          )}
                          {version.description && (
                            <p className="text-sm text-gray-700 mt-2">{version.description}</p>
                          )}
                        </div>
                        
                        {version.status === 'draft' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePublishVersion(version.id);
                            }}
                            disabled={publishVersionMutation.isPending}
                            className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50"
                          >
                            Publish
                          </button>
                        )}
                      </div>
                      
                      {version.changeDescription && (
                        <div className="mt-3">
                          <h5 className="text-xs font-medium text-gray-700 mb-1">Changes:</h5>
                          <div className="text-xs text-gray-600">
                            {version.changeDescription}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Comparison Panel */}
          {showComparison && selectedVersions.length === 2 && (
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">Comparison</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Comparing versions {selectedVersions.join(' vs ')}
                  </p>
                </div>
                
                <div className="p-4">
                  {comparisonLoading ? (
                    <div className="text-sm text-gray-500">Loading comparison...</div>
                  ) : comparison ? (
                    <div className="space-y-4">
                      {comparison.differences?.map((difference: { field: string; oldValue: any; newValue: any; type: 'added' | 'removed' | 'modified' }, index: number) => (
                        <div key={index} className="text-sm">
                          <div className="font-medium text-gray-900">{difference.field}</div>
                          <div className="mt-1 space-y-1">
                            <div className="text-red-600 bg-red-50 px-2 py-1 rounded">
                              - {difference.oldValue}
                            </div>
                            <div className="text-green-600 bg-green-50 px-2 py-1 rounded">
                              + {difference.newValue}
                            </div>
                          </div>
                        </div>
                      ))}
                      {!comparison.differences?.length && (
                        <div className="text-sm text-gray-500">No differences found</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Select two versions to compare</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;