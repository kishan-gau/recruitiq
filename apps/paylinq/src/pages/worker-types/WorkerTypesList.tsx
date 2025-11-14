import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Users, Briefcase, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import CardSkeleton from '@/components/ui/CardSkeleton';
import Dialog from '@/components/ui/Dialog';
import {
  useWorkerTypeTemplates,
  useCreateWorkerTypeTemplate,
  useUpdateWorkerTypeTemplate,
  useDeleteWorkerTypeTemplate,
  type WorkerTypeTemplate,
} from '@/hooks/useWorkerTypes';
import type { CreateWorkerTypeTemplateRequest, UpdateWorkerTypeTemplateRequest } from '@recruitiq/types';

export default function WorkerTypesList() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkerType, setSelectedWorkerType] = useState<WorkerTypeTemplate | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  // React Query hooks
  const { data: workerTypes, isLoading, error } = useWorkerTypeTemplates();
  const createMutation = useCreateWorkerTypeTemplate();
  const updateMutation = useUpdateWorkerTypeTemplate();
  const deleteMutation = useDeleteWorkerTypeTemplate();

  const handleAdd = () => {
    setModalMode('add');
    setSelectedWorkerType(null);
    setIsModalOpen(true);
  };

  const handleEdit = (workerType: WorkerTypeTemplate) => {
    setModalMode('edit');
    setSelectedWorkerType(workerType);
    setIsModalOpen(true);
  };

  const handleDelete = (workerType: WorkerTypeTemplate) => {
    setSelectedWorkerType(workerType);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedWorkerType?.id) {
      await deleteMutation.mutateAsync(selectedWorkerType.id);
      setIsDeleteDialogOpen(false);
      setSelectedWorkerType(null);
    }
  };

  // Filter worker types by status
  const activeTypes = workerTypes?.filter((wt: WorkerTypeTemplate) => wt.status === 'active') || [];
  const inactiveTypes = workerTypes?.filter((wt: WorkerTypeTemplate) => wt.status === 'inactive') || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error loading worker types: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back to Settings Button */}
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Worker Types</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Define employee classifications with default payroll settings and eligibility rules
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Worker Type
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              About Worker Types
            </h3>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
              Worker types define default payroll settings and eligibility rules for different employee classifications 
              (e.g., Full-Time, Part-Time, Contractor). These settings affect pay frequency, benefits, overtime, and time-off eligibility.
            </p>
          </div>
        </div>
      </div>

      {/* Active Worker Types */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Active Worker Types ({activeTypes.length})
        </h2>

        {activeTypes.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
            <Briefcase className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Active Worker Types
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first worker type to start classifying employees.
            </p>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Worker Type
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeTypes.map((workerType: WorkerTypeTemplate) => (
              <WorkerTypeCard
                key={workerType.id}
                workerType={workerType}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Worker Types */}
      {inactiveTypes.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Inactive Worker Types ({inactiveTypes.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inactiveTypes.map((workerType: WorkerTypeTemplate) => (
              <WorkerTypeCard
                key={workerType.id}
                workerType={workerType}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Worker Type Form Modal */}
      {isModalOpen && (
        <WorkerTypeFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={async (data) => {
            if (modalMode === 'add') {
              await createMutation.mutateAsync(data as CreateWorkerTypeTemplateRequest);
            } else if (selectedWorkerType?.id) {
              await updateMutation.mutateAsync({
                id: selectedWorkerType.id,
                data: data as UpdateWorkerTypeTemplateRequest,
              });
            }
            setIsModalOpen(false);
          }}
          workerType={selectedWorkerType}
          mode={modalMode}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && selectedWorkerType && (
        <DeleteWorkerTypeDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          workerType={selectedWorkerType}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

// Worker Type Card Component
interface WorkerTypeCardProps {
  workerType: WorkerTypeTemplate;
  onEdit: (workerType: WorkerTypeTemplate) => void;
  onDelete: (workerType: WorkerTypeTemplate) => void;
}

function WorkerTypeCard({ workerType, onEdit, onDelete }: WorkerTypeCardProps) {
  const eligibilityFlags = [
    { label: 'Benefits', value: workerType.benefitsEligible },
    { label: 'Overtime', value: workerType.overtimeEligible },
    { label: 'PTO', value: workerType.ptoEligible },
    { label: 'Sick Leave', value: workerType.sickLeaveEligible },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {workerType.name}
            </h3>
            <StatusBadge
              status={workerType.status}
              variant={workerType.status === 'active' ? 'green' : 'gray'}
              size="sm"
            />
          </div>
          <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{workerType.code}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(workerType)}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(workerType)}
            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      {workerType.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {workerType.description}
        </p>
      )}

      {/* Default Settings */}
      <div className="space-y-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Pay Frequency</span>
          <span className="font-medium text-gray-900 dark:text-white capitalize">
            {workerType.defaultPayFrequency?.replace('-', ' ') || 'Not set'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Payment Method</span>
          <span className="font-medium text-gray-900 dark:text-white capitalize">
            {workerType.defaultPaymentMethod?.replace('_', ' ') || 'Not set'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Vacation Accrual</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {workerType.vacationAccrualRate} hrs/period
          </span>
        </div>
      </div>

      {/* Eligibility Flags */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Eligibility
        </p>
        <div className="flex flex-wrap gap-2">
          {eligibilityFlags.map(({ label, value }) => (
            <div
              key={label}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                value
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              {value ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Count (if available) */}
      {workerType.employeeCount !== undefined && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Users className="w-4 h-4" />
              Employees
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {workerType.employeeCount}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Worker Type Form Modal Component
interface WorkerTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWorkerTypeTemplateRequest | UpdateWorkerTypeTemplateRequest) => Promise<void>;
  workerType: WorkerTypeTemplate | null;
  mode: 'add' | 'edit';
}

function WorkerTypeFormModal({ isOpen, onClose, onSubmit, workerType, mode }: WorkerTypeFormModalProps) {
  const [formData, setFormData] = useState<CreateWorkerTypeTemplateRequest>({
    name: workerType?.name || '',
    code: workerType?.code || '',
    description: workerType?.description || '',
    defaultPayFrequency: workerType?.defaultPayFrequency || 'biweekly',
    defaultPaymentMethod: workerType?.defaultPaymentMethod || 'direct_deposit',
    benefitsEligible: workerType?.benefitsEligible ?? true,
    overtimeEligible: workerType?.overtimeEligible ?? true,
    ptoEligible: workerType?.ptoEligible ?? true,
    sickLeaveEligible: workerType?.sickLeaveEligible ?? true,
    vacationAccrualRate: workerType?.vacationAccrualRate || 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (formData.code.length < 2) {
      newErrors.code = 'Code must be at least 2 characters';
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      newErrors.code = 'Code can only contain letters, numbers, hyphens, and underscores';
    }

    if (formData.vacationAccrualRate < 0) {
      newErrors.vacationAccrualRate = 'Cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting worker type:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add Worker Type' : 'Edit Worker Type'}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : mode === 'add' ? 'Create Worker Type' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            Basic Information
          </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Full-Time Employee"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                  placeholder="FTE"
                  disabled={mode === 'edit'}
                />
                {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Regular full-time employee with full benefits"
              />
            </div>
          </div>

          {/* Default Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Default Payroll Settings
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pay Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.defaultPayFrequency}
                  onChange={(e) => setFormData({ ...formData, defaultPayFrequency: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="semimonthly">Semi-monthly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.defaultPaymentMethod}
                  onChange={(e) => setFormData({ ...formData, defaultPaymentMethod: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="direct_deposit">Direct Deposit</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vacation Accrual Rate (hours per pay period)
              </label>
              <input
                type="number"
                value={formData.vacationAccrualRate}
                onChange={(e) => setFormData({ ...formData, vacationAccrualRate: parseFloat(e.target.value) || 0 })}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="3.08"
              />
              {errors.vacationAccrualRate && (
                <p className="mt-1 text-sm text-red-600">{errors.vacationAccrualRate}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Example: 3.08 hours per period ≈ 2 weeks/year for biweekly pay
              </p>
            </div>
          </div>

          {/* Eligibility Flags */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Eligibility Flags
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.benefitsEligible}
                  onChange={(e) => setFormData({ ...formData, benefitsEligible: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Benefits Eligible</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Can enroll in company benefits programs</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.overtimeEligible}
                  onChange={(e) => setFormData({ ...formData, overtimeEligible: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Overtime Eligible</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Can earn overtime pay</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ptoEligible}
                  onChange={(e) => setFormData({ ...formData, ptoEligible: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">PTO Eligible</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Can accrue and use paid time off</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sickLeaveEligible}
                  onChange={(e) => setFormData({ ...formData, sickLeaveEligible: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Sick Leave Eligible</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Can use sick leave benefits</p>
                </div>
              </label>
            </div>
          </div>
        </form>
      </Dialog>
    );
}

// Delete Confirmation Dialog
interface DeleteWorkerTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  workerType: WorkerTypeTemplate;
  isDeleting: boolean;
}

function DeleteWorkerTypeDialog({ isOpen, onClose, onConfirm, workerType, isDeleting }: DeleteWorkerTypeDialogProps) {
  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Worker Type"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <span className="font-semibold">{workerType.name}</span> ({workerType.code})?
            This action cannot be undone.
          </p>
        </div>

        {workerType.employeeCount && workerType.employeeCount > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Warning:</strong> This worker type is assigned to {workerType.employeeCount} employee(s).
              Consider reassigning them before deleting.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
