import { useState } from 'react';
import { Dialog, FormField } from '@/components/ui';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  currentVersion?: string;
  onVersionCreated: () => void;
}

export default function CreateVersionModal({
  isOpen,
  onClose,
  templateId,
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
      return api.paylinq.createPayStructureTemplateVersion(templateId, {
        versionType,
        changeSummary,
      });
    },
    onSuccess: () => {
      toast.success('New version created successfully');
      queryClient.invalidateQueries({ queryKey: ['templateVersions'] });
      queryClient.invalidateQueries({ queryKey: ['payStructureTemplate', templateId] });
      onVersionCreated();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create version');
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
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-gray-700">
            Current Version: <span className="font-semibold">v{currentVersion || '1.0.0'}</span>
          </p>
          <p className="text-sm text-gray-700">
            New Version: <span className="font-semibold">v{getNextVersion()}</span>
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Version Type
          </label>
          <div className="space-y-2">
            <label className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                value="major"
                checked={versionType === 'major'}
                onChange={(e) => setVersionType(e.target.value as 'major' | 'minor' | 'patch')}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium text-sm">Major (Breaking Changes)</div>
                <div className="text-xs text-gray-600">
                  Incompatible API changes or significant structural changes
                </div>
              </div>
            </label>

            <label className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                value="minor"
                checked={versionType === 'minor'}
                onChange={(e) => setVersionType(e.target.value as 'major' | 'minor' | 'patch')}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium text-sm">Minor (New Features)</div>
                <div className="text-xs text-gray-600">
                  New functionality added in a backwards-compatible manner
                </div>
              </div>
            </label>

            <label className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                value="patch"
                checked={versionType === 'patch'}
                onChange={(e) => setVersionType(e.target.value as 'major' | 'minor' | 'patch')}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium text-sm">Patch (Bug Fixes)</div>
                <div className="text-xs text-gray-600">
                  Backwards-compatible bug fixes and minor adjustments
                </div>
              </div>
            </label>
          </div>
        </div>

        <FormField label="Change Summary" required>
          <textarea
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            rows={4}
            placeholder="Describe the changes in this version..."
          />
        </FormField>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            A new draft version will be created with all components from the current version.
            You can then modify the components before publishing.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

