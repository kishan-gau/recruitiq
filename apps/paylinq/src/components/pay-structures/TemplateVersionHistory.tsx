import { useState } from 'react';
import { format } from 'date-fns';
import { History, GitCompare, ArrowUpCircle, Plus } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useTemplateVersions } from '@/hooks/useTemplateVersions';
import CreateVersionModal from '@/components/modals/CreateVersionModal';
import VersionComparisonModal from '@/components/modals/VersionComparisonModal';
import UpgradeWorkersModal from '@/components/modals/UpgradeWorkersModal';

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
  const { versions, isLoading, error, refetch } = useTemplateVersions(templateCode);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [createVersionModalOpen, setCreateVersionModalOpen] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<{ from?: string; to?: string }>({});
  const [selectedVersionForUpgrade, setSelectedVersionForUpgrade] = useState<Version | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load version history: {error.message}</p>
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <History className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No version history available</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Version History</h3>
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Components
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Workers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {versions.map((version: Version, index: number) => (
                <tr
                  key={version.id || index}
                  className={
                    (version.version || version.versionString) === currentVersion
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono font-medium text-gray-900">
                      v{version.version || version.versionString}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusVariant(version.status)}>
                      {version.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {version.componentCount || version.componentsCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {version.assignedWorkerCount || version.activeWorkersCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {version.effectiveFrom
                      ? format(new Date(version.effectiveFrom), 'MMM dd, yyyy')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(version.createdAt), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {version.createdByName || version.createdBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {index < versions.length - 1 && (
                        <button
                          onClick={() =>
                            handleCompare(
                              versions[index + 1].id,
                              version.id
                            )
                          }
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Compare with previous version"
                        >
                          <GitCompare className="h-4 w-4" />
                        </button>
                      )}
                      {version.status === 'active' && (version.assignedWorkerCount || version.activeWorkersCount || 0) > 0 && (
                        <button
                          onClick={() => handleUpgrade(version)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                          title="Upgrade workers to newer version"
                        >
                          <ArrowUpCircle className="h-4 w-4" />
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
          templateId={templateId}
          currentVersion={currentVersion}
          onVersionCreated={() => {
            refetch();
            setCreateVersionModalOpen(false);
          }}
        />
      )}
    </>
  );
}
