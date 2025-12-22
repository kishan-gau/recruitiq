import React, { useState } from 'react';
import { X as XMarkIcon, Tag as TagIcon, Copy as DocumentDuplicateIcon } from 'lucide-react';
import { useCreateTaxRuleVersion, useTaxRuleVersions } from '../../hooks/useTaxRuleVersioning';
import type { TaxRule, TaxRuleVersion, CreateVersionRequest } from '@recruitiq/types/paylinq/tax';
import { useToast } from '../../contexts/ToastContext';

interface CreateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taxRule: TaxRule;
  onSuccess?: (version: TaxRuleVersion) => void;
}

interface CreateVersionFormData {
  description: string;
  basedOnVersion?: string;
  changes: string[];
}

const CreateVersionModal: React.FC<CreateVersionModalProps> = ({
  isOpen,
  onClose,
  taxRule,
  onSuccess
}) => {
  const { success, error: errorToast } = useToast();
  const [formData, setFormData] = useState<CreateVersionFormData>({
    description: '',
    basedOnVersion: '',
    changes: ['']
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { versions } = useTaxRuleVersions(taxRule.id);
  const createVersionMutation = useCreateTaxRuleVersion();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    const nonEmptyChanges = formData.changes.filter(change => change.trim());
    if (nonEmptyChanges.length === 0) {
      newErrors.changes = 'At least one change description is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const result = await createVersionMutation.mutateAsync({
        ruleSetId: taxRule.id,
        description: formData.description.trim(),
        basedOnVersion: formData.basedOnVersion || undefined,
        changesSummary: nonEmptyChanges,
      });
      
      success('New version created successfully');
      onSuccess?.(result);
      onClose();
      
      // Reset form
      setFormData({
        description: '',
        basedOnVersion: '',
        changes: ['']
      });
      setErrors({});
    } catch (error: any) {
      errorToast(error.message || 'Failed to create new version');
    }
  };

  const handleCancel = () => {
    onClose();
    setFormData({
      description: '',
      basedOnVersion: '',
      changes: ['']
    });
    setErrors({});
  };

  const addChangeField = () => {
    setFormData(prev => ({
      ...prev,
      changes: [...prev.changes, '']
    }));
  };

  const removeChangeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.filter((_, i) => i !== index)
    }));
  };

  const updateChangeField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.map((change, i) => i === index ? value : change)
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <TagIcon className="w-5 h-5 mr-2" />
              Create New Version
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Create a new version of "{taxRule.name}"
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Version Description *
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className={`mt-1 block w-full border rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe what changes are included in this version..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Base Version */}
            <div>
              <label htmlFor="basedOnVersion" className="block text-sm font-medium text-gray-700">
                Based on Version
              </label>
              <select
                id="basedOnVersion"
                value={formData.basedOnVersion}
                onChange={(e) => setFormData(prev => ({ ...prev, basedOnVersion: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Current state (latest)</option>
                {versions?.map((version) => (
                  <option key={version.id} value={version.id}>
                    Version {version.version} - {version.status === 'published' ? 'Published' : 'Draft'}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Select a specific version to base this new version on, or leave empty to use current state
              </p>
            </div>

            {/* Changes Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Changes Summary *
              </label>
              <div className="space-y-2">
                {formData.changes.map((change, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={change}
                      onChange={(e) => updateChangeField(index, e.target.value)}
                      className={`flex-1 border rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.changes ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder={`Change ${index + 1}...`}
                    />
                    {formData.changes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChangeField(index)}
                        className="text-red-500 hover:text-red-700 px-2 py-2"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addChangeField}
                className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
              >
                <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                Add another change
              </button>
              {errors.changes && (
                <p className="mt-1 text-sm text-red-600">{errors.changes}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                List the key changes included in this version
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createVersionMutation.isPending}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {createVersionMutation.isPending ? 'Creating...' : 'Create Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVersionModal;