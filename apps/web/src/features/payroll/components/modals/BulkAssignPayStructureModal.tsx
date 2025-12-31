import { AlertCircle, Search, Users } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Dialog } from '@recruitiq/ui';
import { FormField, Input, TextArea } from '@recruitiq/ui';

import { usePayStructureTemplates, useAssignPayStructureToWorker, useWorkers } from '@/hooks';
import { useToast } from '@/hooks/useToast';

interface BulkAssignPayStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkAssignPayStructureModal({
  isOpen,
  onClose,
}: BulkAssignPayStructureModalProps) {
  const [formData, setFormData] = useState({
    templateId: '',
    effectiveFrom: '',
    effectiveTo: '',
    assignmentReason: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAssigning, setIsAssigning] = useState(false);

  const { success, error: showError } = useToast();

  // Fetch published templates
  const { data: templates, isLoading: isLoadingTemplates } = usePayStructureTemplates();
  
  // Fetch workers
  const { data: workers, isLoading: isLoadingWorkers } = useWorkers();
  
  const assignMutation = useAssignPayStructureToWorker();

  // Get only published templates and sort by name then version
  const publishedTemplates = templates?.filter((t: any) => t.status === 'active' || t.status === 'published')
    .sort((a: any, b: any) => {
      // First sort by template name
      const nameCompare = a.templateName.localeCompare(b.templateName);
      if (nameCompare !== 0) return nameCompare;
      // Then by version (descending - newest first)
      return b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: 'base' });
    }) || [];

  // Filter workers based on search
  const filteredWorkers = workers?.filter((w: any) => {
    const fullName = `${w.firstName || ''} ${w.lastName || ''}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      w.employeeNumber?.toLowerCase().includes(searchLower) ||
      w.email?.toLowerCase().includes(searchLower)
    );
  }) || [];

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        templateId: '',
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: '',
        assignmentReason: '',
      });
      setSearchTerm('');
      setSelectedWorkers(new Set());
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.templateId) {
      newErrors.templateId = 'Please select a pay structure template';
    }

    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = 'Effective date is required';
    }

    if (formData.effectiveTo && formData.effectiveFrom) {
      const fromDate = new Date(formData.effectiveFrom);
      const toDate = new Date(formData.effectiveTo);
      if (toDate <= fromDate) {
        newErrors.effectiveTo = 'End date must be after start date';
      }
    }

    if (selectedWorkers.size === 0) {
      newErrors.workers = 'Please select at least one worker';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleToggleWorker = (workerId: string) => {
    const newSelected = new Set(selectedWorkers);
    if (newSelected.has(workerId)) {
      newSelected.delete(workerId);
    } else {
      newSelected.add(workerId);
    }
    setSelectedWorkers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedWorkers.size === filteredWorkers.length) {
      setSelectedWorkers(new Set());
    } else {
      setSelectedWorkers(new Set(filteredWorkers.map((w: any) => w.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsAssigning(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const assignmentPromises = Array.from(selectedWorkers).map(async (workerId) => {
        try {
          await assignMutation.mutateAsync({
            employeeId: workerId,
            data: {
              templateId: formData.templateId,
              effectiveFrom: formData.effectiveFrom,
              effectiveTo: formData.effectiveTo || undefined,
              assignmentReason: formData.assignmentReason || undefined,
            },
          });
          successCount++;
        } catch (err) {
          failCount++;
          console.error(`Failed to assign to worker ${workerId}:`, err);
        }
      });

      await Promise.all(assignmentPromises);

      if (successCount > 0) {
        success(`Successfully assigned pay structure to ${successCount} worker(s)`);
      }
      if (failCount > 0) {
        showError(`Failed to assign to ${failCount} worker(s)`);
      }

      if (failCount === 0) {
        onClose();
      }
    } catch (error) {
      showError('Failed to complete bulk assignment');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Assign Pay Structure"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                Bulk Assignment
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Assign the same pay structure template to multiple workers at once. This will replace their current
                assignments.
              </p>
            </div>
          </div>
        </div>

        <FormField label="Pay Structure Template" required error={errors.templateId}>
          <select
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-blue-400 focus:border-transparent"
            value={formData.templateId}
            onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
          >
            <option value="">Select a template...</option>
            {isLoadingTemplates ? (
              <option value="">Loading templates...</option>
            ) : publishedTemplates.length > 0 ? (
              publishedTemplates.map((template: any) => (
                <option key={template.id} value={template.id}>
                  {template.templateName} (v{template.version})
                  {template.effectiveFrom && ` - Effective: ${new Date(template.effectiveFrom).toLocaleDateString()}`}
                  {template.isOrganizationDefault && ' [Default]'}
                </option>
              ))
            ) : (
              <option value="">No published templates available</option>
            )}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Effective From" required error={errors.effectiveFrom}>
            <Input
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
            />
          </FormField>

          <FormField label="Effective To" error={errors.effectiveTo} hint="Optional">
            <Input
              type="date"
              value={formData.effectiveTo}
              onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="Assignment Reason" hint="Optional">
          <TextArea
            value={formData.assignmentReason}
            onChange={(e) => setFormData({ ...formData, assignmentReason: e.target.value })}
            placeholder="e.g., Annual review update, New policy rollout..."
            rows={2}
          />
        </FormField>

        {/* Worker Selection */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Select Workers <span className="text-red-500">*</span>
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {selectedWorkers.size} selected
            </span>
          </div>

          {errors.workers && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{errors.workers}</p>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search workers..."
              className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {selectedWorkers.size === filteredWorkers.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Worker List */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {isLoadingWorkers ? (
              <div className="p-4 text-center text-sm text-gray-500">Loading workers...</div>
            ) : filteredWorkers.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredWorkers.map((worker: any) => (
                  <label
                    key={worker.id}
                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkers.has(worker.id)}
                      onChange={() => handleToggleWorker(worker.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {worker.firstName} {worker.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {worker.employeeNumber} • {worker.email}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                {searchTerm ? 'No workers match your search' : 'No workers available'}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
            disabled={isAssigning}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isAssigning || publishedTemplates.length === 0 || selectedWorkers.size === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Users className="w-4 h-4" />
            <span>{isAssigning ? 'Assigning...' : `Assign to ${selectedWorkers.size} Worker(s)`}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}

