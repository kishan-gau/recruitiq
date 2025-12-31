import { format } from 'date-fns';
import { History, GitCompare, ArrowUpCircle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CreateVersionModal from '@/components/modals/CreateVersionModal';
import UpgradeWorkersModal from '@/components/modals/UpgradeWorkersModal';
import VersionComparisonModal from '@/components/modals/VersionComparisonModal';
import { StatusBadge, Dialog } from '@recruitiq/ui';
import { useDeletePayStructureTemplate } from '@/hooks';
import { useTemplateVersions } from '@/hooks/useTemplateVersions';

interface TemplateVersionHistoryProps {
  templateId: string;
  templateCode: string;
  currentVersion?: string;
}

interface Version {
  id: string;
  template_id: number;
  templateCode: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  version: string;
  versionString?: string; // Keep for backwards compatibility
  status: 'draft' | 'active' | 'deprecated';
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  componentCount?: number;
  componentsCount?: number; // Keep for backwards compatibility
  assignedWorkerCount?: number;
  activeWorkersCount?: number; // Keep for backwards compatibility
}

export default function TemplateVersionHistory({
  templateId,
  templateCode,
  currentVersion,
}: TemplateVersionHistoryProps) {
  const navigate = useNavigate();
  const { versions, isLoading, error, refetch } = useTemplateVersions(templateCode);
  const deleteTemplate = useDeletePayStructureTemplate();
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [createVersionModalOpen, setCreateVersionModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<{ from?: string; to?: string }>({});
  const [selectedVersionForUpgrade, setSelectedVersionForUpgrade] = useState<Version | null>(null);
  const [selectedVersionForDelete, setSelectedVersionForDelete] = useState<Version | null>(null);

  const getStatusVariant = (status: string): 'green' | 'yellow' | 'red' | 'gray' => {
    switch (status) {
      case 'active':
        return 'green';
      case 'draft':
        return 'yellow';
      case 'deprecated':
        return 'red';
      default:
        return 'gray';
    }
  };

  const handleCompare = (fromId: string, toId: string) => {
    setSelectedVersions({ from: fromId, to: toId });
    setCompareModalOpen(true);
  };

  const handleUpgrade = (version: Version) => {
    setSelectedVersionForUpgrade(version);
    setUpgradeModalOpen(true);
  };

  const handleDelete = (version: Version, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVersionForDelete(version);
    setDeleteDialogOpen(true);
  };

  const handleVersionClick = (versionId: string) => {
    navigate(`/pay-structures/${versionId}`);
  };

  const confirmDelete = async () => {
    if (!selectedVersionForDelete) return;
    
    await deleteTemplate.mutateAsync({ id: selectedVersionForDelete.id });
    setDeleteDialogOpen(false);
    setSelectedVersionForDelete(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Failed to load version history: {error.message}</p>
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <History className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400">No version history available</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Version History</h3>
          </div>
          <button
            onClick={() => setCreateVersionModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create New Version
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Components
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Active Workers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Effective From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {versions.map((version: Version, index: number) => (
                <tr
                  key={version.id || index}
                  onClick={() => handleVersionClick(version.id)}
                  className={`cursor-pointer transition-colors ${
                    (version.version || version.versionString) === currentVersion
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                      v{version.version || version.versionString}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge variant={getStatusVariant(version.status)}>
                      {version.status.toUpperCase()}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {version.componentCount || version.componentsCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {version.assignedWorkerCount || version.activeWorkersCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {version.effectiveFrom
                      ? format(new Date(version.effectiveFrom), 'MMM dd, yyyy')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(version.createdAt), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {version.createdByName || version.createdBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {index < versions.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompare(
                              versions[index + 1].id,
                              version.id
                            );
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Compare with previous version"
                        >
                          <GitCompare className="h-4 w-4" />
                        </button>
                      )}
                      {version.status === 'active' && 
                       (version.assignedWorkerCount || version.activeWorkersCount || 0) > 0 && 
                       index > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpgrade(version);
                          }}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="Upgrade workers to newer version"
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                        </button>
                      )}
                      {version.status === 'draft' && (
                        <button
                          onClick={(e) => handleDelete(version, e)}
                          disabled={version.id === templateId}
                          className={`p-1 rounded transition-colors ${
                            version.id === templateId
                              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                              : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                          title={version.id === templateId ? 'Cannot delete currently viewed version' : 'Delete draft version'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {compareModalOpen && selectedVersions.from && selectedVersions.to && (
        <VersionComparisonModal
          isOpen={compareModalOpen}
          onClose={() => setCompareModalOpen(false)}
          fromId={selectedVersions.from}
          toId={selectedVersions.to}
        />
      )}

      {upgradeModalOpen && selectedVersionForUpgrade && (
        <UpgradeWorkersModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          sourceVersion={{
            template_id: selectedVersionForUpgrade.template_id,
            versionString: selectedVersionForUpgrade.version || selectedVersionForUpgrade.versionString || '',
            activeWorkersCount: selectedVersionForUpgrade.assignedWorkerCount || selectedVersionForUpgrade.activeWorkersCount || 0,
          }}
          onUpgradeComplete={() => {
            refetch();
            setUpgradeModalOpen(false);
          }}
        />
      )}

      {createVersionModalOpen && (
        <CreateVersionModal
          isOpen={createVersionModalOpen}
          onClose={() => setCreateVersionModalOpen(false)}
          templateId={
            versions && versions.length > 0
              ? versions.reduce((latest, current) => {
                  if (!latest) return current;
                  if (current.versionMajor > latest.versionMajor) return current;
                  if (current.versionMajor === latest.versionMajor && current.versionMinor > latest.versionMinor) return current;
                  if (current.versionMajor === latest.versionMajor && current.versionMinor === latest.versionMinor && current.versionPatch > latest.versionPatch) return current;
                  return latest;
                }).id
              : templateId
          }
          templateCode={templateCode}
          currentVersion={currentVersion}
          onVersionCreated={(newTemplate) => {
            refetch();
            setCreateVersionModalOpen(false);
            // Navigate to the newly created template
            if (newTemplate?.id) {
              navigate(`/pay-structures/${newTemplate.id}`);
            }
          }}
        />
      )}

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedVersionForDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Draft Version"
        message={`Are you sure you want to delete version ${selectedVersionForDelete?.version || selectedVersionForDelete?.versionString}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
