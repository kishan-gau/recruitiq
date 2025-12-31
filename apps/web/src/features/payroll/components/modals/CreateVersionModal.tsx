import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Dialog } from '@recruitiq/ui';
import { FormField } from '@recruitiq/ui';

import { usePaylinqAPI } from '@/hooks';
import { useToast } from '@/hooks/useToast';

interface CreateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  templateCode: string;
  currentVersion?: string;
  onVersionCreated: (newTemplate?: any) => void;
}

export default function CreateVersionModal({
  isOpen,
  onClose,
  templateId,
  templateCode,
  currentVersion,
  onVersionCreated,
}: CreateVersionModalProps) {
  const api = usePaylinqAPI();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [versionType, setVersionType] = useState<'major' | 'minor' | 'patch'>('minor');
  const [changeSummary, setChangeSummary] = useState('');

  const createVersionMutation = useMutation({
    mutationFn: async () => {
      const response = await api.paylinq.createPayStructureTemplateVersion(templateId, {
        versionType,
        changeSummary,
      });
      // Response is already response.data from axios interceptor
      return response.template;
    },
    onSuccess: (newTemplate) => {
      toast.success('New version created successfully');
      queryClient.invalidateQueries({ queryKey: ['templateVersions', templateCode] });
      queryClient.invalidateQueries({ queryKey: ['payStructureTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['payStructureTemplate', templateId] });
      // Prefill the cache with the new template data to avoid 404 on navigation
      if (newTemplate?.id) {
        queryClient.setQueryData(['payStructureTemplate', newTemplate.id], newTemplate);
      }
      onVersionCreated(newTemplate);
    },
    onError: (error: any) => {
      console.error('Version creation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create version';
      toast.error(errorMessage);
    },
  });

  const getNextVersion = (): string => {
    if (!currentVersion) return '1.0.0';
    
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (versionType) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        return currentVersion;
    }
  };

  const handleSubmit = () => {
    if (!changeSummary.trim()) {
      toast.error('Please provide a change summary');
      return;
    }
    createVersionMutation.mutate();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Template Version"
      size="lg"
    >
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Current Version: <span className="font-semibold">v{currentVersion || '1.0.0'}</span>
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            New Version: <span className="font-semibold">v{getNextVersion()}</span>
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            What type of changes are you making?
          </label>
          <div className="space-y-2">
            <label className="flex items-start p-3 border-2 border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors">
              <input
                type="radio"
                value="major"
                checked={versionType === 'major'}
                onChange={(e) => setVersionType(e.target.value as 'major' | 'minor' | 'patch')}
                className="mt-0.5 mr-3"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">⚠️ Major Change</span>
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded font-medium whitespace-nowrap">
                    May require worker migration
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Removing/renaming components, changing calculation logic that affects existing workers
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                  ⚡ Workers on the old version should be reviewed before upgrading
                </p>
              </div>
            </label>

            <label className="flex items-start p-3 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors">
              <input
                type="radio"
                value="minor"
                checked={versionType === 'minor'}
                onChange={(e) => setVersionType(e.target.value as 'major' | 'minor' | 'patch')}
                className="mt-0.5 mr-3"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">✨ Minor Change</span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded font-medium whitespace-nowrap">
                    Safe to upgrade
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Adding new components, adding optional conditions or features
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 flex items-center gap-1">
                  <span>✅</span> Existing workers can safely upgrade to this version
                </p>
              </div>
            </label>

            <label className="flex items-start p-3 border-2 border-green-200 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer transition-colors">
              <input
                type="radio"
                value="patch"
                checked={versionType === 'patch'}
                onChange={(e) => setVersionType(e.target.value as 'major' | 'minor' | 'patch')}
                className="mt-0.5 mr-3"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">🔧 Patch/Fix</span>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded font-medium whitespace-nowrap">
                    Bug fix only
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Fixing calculation errors, correcting formulas or thresholds, minor text adjustments
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1 flex items-center gap-1">
                  <span>✅</span> Safe - No structural changes to components
                </p>
              </div>
            </label>
          </div>
        </div>

        <FormField label="Change Summary" required>
          <textarea
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            rows={4}
            placeholder="Describe the changes in this version..."
          />
        </FormField>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            A new draft version will be created with all components from the current version.
            You can then modify the components before publishing.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          disabled={createVersionMutation.isPending}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          disabled={createVersionMutation.isPending || !changeSummary.trim()}
        >
          {createVersionMutation.isPending ? 'Creating...' : 'Create Version'}
        </button>
      </div>
    </Dialog>
  );
}

