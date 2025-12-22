import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, AlertCircle, Trash2, X, ArrowLeft } from 'lucide-react';
import { TaxRule } from '@recruitiq/types/paylinq';
import StatusBadge from '@/components/ui/StatusBadge';
import { useTaxRules, useCreateTaxRule, useUpdateTaxRule, useDeleteTaxRule } from '@/hooks/useTaxRules';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorAlert } from '@/components/ui/ErrorDisplay';
import { useToast } from '@/contexts/ToastContext';
import TaxRuleCard from '@/components/tax-rules/TaxRuleCard';
import VersionHistoryModal from '@/components/tax-rules/VersionHistoryModal';
import CreateVersionModal from '@/components/tax-rules/CreateVersionModal';

interface TaxRuleFormData {
  taxName: string;
  taxType: string;
  description: string;
  calculationMethod: 'bracket' | 'flat_rate' | 'graduated';
  calculationMode: 'aggregated' | 'component_based' | 'proportional_distribution';
  effectiveFrom: string;
  effectiveTo?: string;
  annualCap?: number;
  status: 'draft' | 'published' | 'archived';
}

export default function TaxRulesList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<TaxRule | null>(null);
  const [formData, setFormData] = useState<TaxRuleFormData>({
    taxName: '',
    taxType: 'wage-tax',
    description: '',
    status: 'active',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  // Fetch tax rules using React Query
  const { data: taxRules, isLoading, isError, error: fetchError, refetch } = useTaxRules({});
  const createMutation = useCreateTaxRule();
  const updateMutation = useUpdateTaxRule(editingRule?.id || '');
  const deleteMutation = useDeleteTaxRule();
  const { success, error: errorToast } = useToast();

  const handleEdit = (rule: TaxRule) => {
    setEditingRule(rule);
    setFormData({
      taxName: rule.taxName,
      taxType: rule.taxType,
      description: rule.description,
      rate: rule.rate,
      brackets: rule.brackets,
      employerContribution: rule.employerContribution,
      employeeContribution: rule.employeeContribution,
      calculationMode: rule.calculationMode,
      status: rule.status,
      effectiveFrom: rule.effectiveFrom,
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingRule(null);
    setFormData({
      taxName: '',
      taxType: 'wage-tax',
      description: '',
      calculationMode: 'proportional_distribution', // Smart default for progressive taxes
      status: 'active',
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (rule: TaxRule) => {
    if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(rule.id);
      success('Tax rule deleted successfully');
    } catch (err) {
      errorToast(err instanceof Error ? err.message : 'Failed to delete tax rule');
    }
  };

  // Versioning handlers
  const handleViewVersionHistory = (rule: TaxRule) => {
    setSelectedRule(rule);
    setIsVersionHistoryOpen(true);
  };

  const handleCreateVersion = (rule: TaxRule) => {
    setSelectedRule(rule);
    setIsCreateVersionOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingRule) {
        await updateMutation.mutateAsync(formData);
        success('Tax rule updated successfully');
      } else {
        await createMutation.mutateAsync(formData);
        success('Tax rule created successfully');
      }
      setIsModalOpen(false);
    } catch (err) {
      errorToast(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || undefined : value,
    }));
  };

  const handleAddBracket = () => {
    setFormData((prev) => ({
      ...prev,
      brackets: [
        ...(prev.brackets || []),
        { min: 0, max: null, rate: 0, deduction: 0 },
      ],
    }));
  };

  const handleRemoveBracket = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      brackets: prev.brackets?.filter((_, i) => i !== index),
    }));
  };

  const handleBracketChange = (index: number, field: string, value: number | null) => {
    setFormData((prev) => ({
      ...prev,
      brackets: prev.brackets?.map((bracket, i) =>
        i === index ? { ...bracket, [field]: value } : bracket
      ),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tax Rules</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage Surinamese tax rules and social security contributions
            </p>
          </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tax Rule
        </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <ErrorAlert
          message={fetchError?.message || 'Failed to load tax rules'}
          onRetry={refetch}
        />
      )}

      {/* Tax Rules Cards */}
      {!isLoading && !isError && (
        <div className="space-y-4">
          {(!taxRules || taxRules.length === 0) ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No tax rules configured yet.</p>
            </div>
          ) : (
            taxRules.map((rule: TaxRule) => (
              <TaxRuleCard
                key={rule.id}
                rule={rule}
                onEdit={() => handleEdit(rule)}
                onDelete={() => handleDelete(rule)}
                onViewVersionHistory={() => handleViewVersionHistory(rule)}
                onCreateVersion={() => handleCreateVersion(rule)}
              />
            ))
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingRule ? 'Edit Tax Rule' : 'Add Tax Rule'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  name="taxName"
                  value={formData.taxName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="e.g., Wage Tax 2025"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select
                  name="taxType"
                  value={formData.taxType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="wage-tax">Wage Tax</option>
                  <option value="aov">AOV (Pension)</option>
                  <option value="aww">AWW (Widows & Orphans)</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Describe this tax rule..."
                />
              </div>

              {/* Calculation Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tax Calculation Mode *
                </label>
                <select
                  name="calculationMode"
                  value={formData.calculationMode || 'proportional_distribution'}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="proportional_distribution">
                    Proportional Distribution (Recommended for progressive taxes)
                  </option>
                  <option value="component_based">
                    Component Based (Recommended for flat-rate taxes)
                  </option>
                  <option value="aggregated">
                    Aggregated (No component breakdown)
                  </option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formData.calculationMode === 'proportional_distribution' && 
                    'Tax calculated on total income, then distributed proportionally to components. Best for progressive brackets.'}
                  {formData.calculationMode === 'component_based' && 
                    'Tax calculated separately for each component. Best for flat-rate taxes like AOV/AWW.'}
                  {formData.calculationMode === 'aggregated' && 
                    'Tax calculated on total income only, no per-component breakdown shown.'}
                </p>
              </div>

              {/* Progressive Tax Brackets (for wage-tax only) */}
              {formData.taxType === 'wage-tax' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tax Brackets
                    </label>
                    <button
                      type="button"
                      onClick={handleAddBracket}
                      className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Bracket
                    </button>
                  </div>

                  {formData.brackets && formData.brackets.length > 0 ? (
                    <div className="space-y-2">
                      {formData.brackets.map((bracket, index) => (
                        <div
                          key={index}
                          className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-900"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Bracket {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBracket(index)}
                              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Min Income (SRD)
                              </label>
                              <input
                                type="number"
                                value={bracket.min}
                                onChange={(e) =>
                                  handleBracketChange(index, 'min', parseFloat(e.target.value) || 0)
                                }
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Max Income (SRD, leave empty for unlimited)
                              </label>
                              <input
                                type="number"
                                value={bracket.max ?? ''}
                                onChange={(e) =>
                                  handleBracketChange(
                                    index,
                                    'max',
                                    e.target.value ? parseFloat(e.target.value) : null
                                  )
                                }
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Leave empty for no limit"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Tax Rate (%)
                              </label>
                              <input
                                type="number"
                                value={bracket.rate}
                                onChange={(e) =>
                                  handleBracketChange(index, 'rate', parseFloat(e.target.value) || 0)
                                }
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Standard Deduction (SRD)
                              </label>
                              <input
                                type="number"
                                value={bracket.deduction}
                                onChange={(e) =>
                                  handleBracketChange(index, 'deduction', parseFloat(e.target.value) || 0)
                                }
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400 italic p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded">
                      No tax brackets added. Click "Add Bracket" to define progressive tax rates.
                    </div>
                  )}
                </div>
              )}

              {/* Contributions (for AOV/AWW types) */}
              {(formData.taxType === 'aov' || formData.taxType === 'aww') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee Contribution (%)
                    </label>
                    <input
                      type="number"
                      name="employeeContribution"
                      value={formData.employeeContribution || ''}
                      onChange={handleInputChange}
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="e.g., 3.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employer Contribution (%)
                    </label>
                    <input
                      type="number"
                      name="employerContribution"
                      value={formData.employerContribution || ''}
                      onChange={handleInputChange}
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="e.g., 4.5"
                    />
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Effective Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Effective Date *
                </label>
                <input
                  type="date"
                  name="effectiveFrom"
                  value={formData.effectiveFrom}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingRule
                    ? 'Update Rule'
                    : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {selectedRule && (
        <VersionHistoryModal
          taxRule={selectedRule}
          isOpen={isVersionHistoryOpen}
          onClose={() => setIsVersionHistoryOpen(false)}
        />
      )}

      {/* Create Version Modal */}
      {selectedRule && (
        <CreateVersionModal
          taxRule={selectedRule}
          isOpen={isCreateVersionOpen}
          onClose={() => setIsCreateVersionOpen(false)}
        />
      )}
    </div>
  );
}


