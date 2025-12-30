import { useState, useEffect } from 'react';

import Dialog from '@/components/ui/Dialog';
import FormField, { Input, TextArea, Select } from '@/components/ui/FormField';
import { useToast } from '@/hooks/useToast';
import { useDepartments } from '@/hooks/useDepartments';
import { useLocations } from '@/hooks/useLocations';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useWorkersForManager } from '@/hooks/useWorkersForManager';
import { useWorkerTypeTemplates } from '@/hooks/useWorkerTypes';
import { handleApiError } from '@/utils/errorHandler';

interface EditWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: {
    id: string;
    employeeNumber: string;
    fullName: string;
    email: string;
    phone: string;
    nationalId: string;
    dateOfBirth: string;
    startDate: string;
    workerType: string;
    departmentId?: string | null; // Phase 2: FK to hris.department
    locationId?: string | null;   // Phase 2: FK to hris.location
    managerId?: string | null;    // Phase 2: Self-referencing FK
    department: string;  // Fallback for legacy data
    position: string;
    compensation: number;
    status: string;
    bankName: string;
    bankAccount: string;
    address: string;
  };
  onSuccess: () => void;
}

export default function EditWorkerModal({ isOpen, onClose, worker, onSuccess }: EditWorkerModalProps) {
  const { paylinq } = usePaylinqAPI();
  const toast = useToast();
  const { success, error } = toast;
  const { data: workerTypes = [], isLoading: loadingTypes } = useWorkerTypeTemplates({ status: 'active' });
  
  // Phase 2: Load organizational structure data
  const { data: departments = [], isLoading: loadingDepartments } = useDepartments({ isActive: true });
  const { data: locations = [], isLoading: loadingLocations } = useLocations({ isActive: true });
  const { data: managers = [], isLoading: loadingManagers } = useWorkersForManager({ 
    excludeId: worker?.id, 
    status: 'active' 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    nationalId: '',
    dateOfBirth: '',
    startDate: '',
    workerType: '',
    departmentId: '',   // Phase 2: Department FK
    locationId: '',     // Phase 2: Location FK
    managerId: '',      // Phase 2: Manager FK
    department: '',     // Fallback for legacy
    position: '',
    compensation: '',
    status: '',
    bankName: '',
    bankAccount: '',
    address: '',
  });

  useEffect(() => {
    if (worker && workerTypes.length > 0) {
      // Find the worker type ID from the name/code
      // The worker.workerType might be a name, code, or ID
      // Try exact match first, then case-insensitive, then fuzzy match
      let matchedType = workerTypes.find((type: any) => 
        type.id === worker.workerType || 
        type.name === worker.workerType || 
        type.code === worker.workerType
      );
      
      // If no exact match, try case-insensitive
      if (!matchedType) {
        matchedType = workerTypes.find((type: any) =>
          type.name?.toLowerCase() === worker.workerType?.toLowerCase() ||
          type.code?.toLowerCase() === worker.workerType?.toLowerCase()
        );
      }
      
      // If still no match, try partial/fuzzy match (remove spaces, hyphens)
      if (!matchedType) {
        const normalizedWorkerType = worker.workerType?.replace(/[\s-]/g, '').toLowerCase();
        matchedType = workerTypes.find((type: any) =>
          type.name?.replace(/[\s-]/g, '').toLowerCase() === normalizedWorkerType ||
          type.code?.replace(/[\s-]/g, '').toLowerCase() === normalizedWorkerType
        );
      }
      
      setFormData({
        fullName: worker.fullName,
        email: worker.email,
        phone: worker.phone,
        nationalId: worker.nationalId,
        dateOfBirth: worker.dateOfBirth,
        startDate: worker.startDate,
        workerType: matchedType?.id || '',
        departmentId: worker.departmentId || '',     // Phase 2
        locationId: worker.locationId || '',         // Phase 2
        managerId: worker.managerId || '',           // Phase 2
        department: worker.department || '',         // Fallback
        position: worker.position,
        compensation: worker.compensation.toString(),
        status: worker.status,
        bankName: worker.bankName,
        bankAccount: worker.bankAccount,
        address: worker.address || '',
      });
    }
  }, [worker, workerTypes]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email format';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    // Phase 2: Department is now optional (can be set via departmentId or legacy text)
    if (!formData.position.trim()) newErrors.position = 'Position is required';
    if (!formData.compensation.trim()) newErrors.compensation = 'Compensation is required';
    else if (isNaN(Number(formData.compensation)) || Number(formData.compensation) <= 0)
      newErrors.compensation = 'Invalid compensation amount';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      error('Please fix the validation errors');
      return;
    }

    setIsLoading(true);

    try {
      // Split full name into first and last name
      const nameParts = formData.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

      // Phase 1 Migration: Send PII fields at root level, not in metadata
      // Phase 2 Migration: Send organizational structure fields at root level
      const updateData = {
        firstName: firstName,
        lastName: lastName,
        email: formData.email,
        phone: formData.phone, // Phase 1: Root level
        nationalId: formData.nationalId, // Phase 1: Root level (maps to taxIdNumber)
        dateOfBirth: formData.dateOfBirth, // Phase 1: Root level
        status: formData.status,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccount,
        // Phase 2: Organizational structure at root level
        departmentId: formData.departmentId || null,
        locationId: formData.locationId || null,
        managerId: formData.managerId || null,
        // Store remaining fields in metadata
        metadata: {
          workerType: formData.workerType,
          department: formData.department || null, // Fallback for legacy
          position: formData.position,
          compensation: Number(formData.compensation),
          address: formData.address,
        },
      };

      console.log('[EditWorkerModal] Sending update data:', updateData);

      const response = await paylinq.updateWorker(worker.id, updateData);

      console.log('[EditWorkerModal] Update response:', response);

      if (response.success) {
        success(`Worker ${formData.fullName} has been updated successfully`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('[EditWorkerModal] Update error:', err);
      console.error('[EditWorkerModal] Error response:', err.response?.data);
      
      // Handle validation errors from API
      if (err.response?.status === 400 && err.response?.data?.errors) {
        const apiErrors = err.response.data.errors;
        const fieldErrors: Record<string, string> = {};
        
        // Map field names to user-friendly labels
        const fieldLabels: Record<string, string> = {
          fullName: 'Full Name',
          email: 'Email',
          phone: 'Phone',
          nationalId: 'National ID',
          dateOfBirth: 'Date of Birth',
          startDate: 'Start Date',
          workerType: 'Worker Type',
          department: 'Department',
          position: 'Position',
          compensation: 'Base Compensation',
          status: 'Status',
          bankName: 'Bank Name',
          bankAccount: 'Bank Account Number',
          address: 'Address',
        };
        
        apiErrors.forEach((apiError: any) => {
          fieldErrors[apiError.field] = apiError.message;
        });
        
        setErrors(fieldErrors);
        
        // Show user-friendly error message with labels
        const errorMessages = apiErrors
          .map((e: any) => `${fieldLabels[e.field] || e.field}: ${e.message}`)
          .join(', ');
        toast.error(errorMessages || 'Please fix the validation errors');
      } else {
        // Handle other errors
        handleApiError(err, {
          toast,
          defaultMessage: 'Failed to update worker. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Worker - ${worker.employeeNumber}`}
      size="xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name" required error={errors.fullName}>
              <Input
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                error={!!errors.fullName}
              />
            </FormField>

            <FormField label="Email" required error={errors.email}>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={!!errors.email}
              />
            </FormField>

            <FormField label="Phone" required error={errors.phone}>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                error={!!errors.phone}
              />
            </FormField>

            <FormField label="National ID" required>
              <Input
                value={formData.nationalId}
                onChange={(e) => handleChange('nationalId', e.target.value)}
                disabled
              />
            </FormField>

            <FormField label="Date of Birth" required>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                disabled
              />
            </FormField>

            <FormField label="Start Date" required>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                disabled
              />
            </FormField>
          </div>
        </div>

        {/* Employment Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Employment Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Worker Type" required>
              <Select
                value={formData.workerType}
                onChange={(e) => handleChange('workerType', e.target.value)}
                options={[
                  { value: '', label: loadingTypes ? 'Loading...' : 'Select worker type' },
                  ...workerTypes.map((type: any) => ({
                    value: type.id,
                    label: type.name || type.code
                  }))
                ]}
                disabled={loadingTypes}
              />
            </FormField>

            <FormField label="Status" required>
              <Select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'on-leave', label: 'On Leave' },
                  { value: 'suspended', label: 'Suspended' },
                  { value: 'terminated', label: 'Terminated' },
                ]}
              />
            </FormField>

            {/* Phase 2: Department dropdown from Nexus HRIS */}
            <FormField label="Department" error={errors.departmentId}>
              <Select
                value={formData.departmentId}
                onChange={(e) => handleChange('departmentId', e.target.value)}
                options={[
                  { value: '', label: loadingDepartments ? 'Loading...' : 'Select Department (Optional)' },
                  ...departments.map((dept: any) => ({
                    value: dept.id,
                    label: dept.departmentName || dept.name || dept.departmentCode
                  }))
                ]}
                disabled={loadingDepartments}
              />
            </FormField>

            <FormField label="Position" required error={errors.position}>
              <Input
                value={formData.position}
                onChange={(e) => handleChange('position', e.target.value)}
                error={!!errors.position}
              />
            </FormField>

            {/* Phase 2: Location dropdown from Nexus HRIS */}
            <FormField label="Location">
              <Select
                value={formData.locationId}
                onChange={(e) => handleChange('locationId', e.target.value)}
                options={[
                  { value: '', label: loadingLocations ? 'Loading...' : 'Select Location (Optional)' },
                  ...locations.map((loc: any) => ({
                    value: loc.id,
                    label: `${loc.name || loc.locationName} ${loc.city ? `- ${loc.city}` : ''}`
                  }))
                ]}
                disabled={loadingLocations}
              />
            </FormField>

            {/* Phase 2: Manager dropdown (self-referencing) */}
            <FormField label="Manager / Supervisor">
              <Select
                value={formData.managerId}
                onChange={(e) => handleChange('managerId', e.target.value)}
                options={[
                  { value: '', label: loadingManagers ? 'Loading...' : 'No Manager (Optional)' },
                  ...managers.map((mgr: any) => ({
                    value: mgr.id,
                    label: mgr.fullName || `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim()
                  }))
                ]}
                disabled={loadingManagers}
              />
            </FormField>
          </div>
        </div>

        {/* Compensation */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Compensation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Base Compensation (SRD)" required error={errors.compensation}>
              <Input
                type="number"
                value={formData.compensation}
                onChange={(e) => handleChange('compensation', e.target.value)}
                error={!!errors.compensation}
              />
            </FormField>
          </div>
        </div>

        {/* Bank Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Bank Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Bank Name" required>
              <Select
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                options={[
                  { value: '', label: 'Select Bank' },
                  { value: 'DSB Bank', label: 'DSB Bank' },
                  { value: 'Hakrinbank', label: 'Hakrinbank' },
                  { value: 'RBC Suriname', label: 'RBC Suriname' },
                  { value: 'FINA Bank', label: 'FINA Bank' },
                  { value: 'Finabank', label: 'Finabank' },
                ]}
              />
            </FormField>

            <FormField label="Bank Account Number" required>
              <Input
                value={formData.bankAccount}
                onChange={(e) => handleChange('bankAccount', e.target.value)}
              />
            </FormField>
          </div>
        </div>

        {/* Address */}
        <div>
          <FormField label="Address">
            <TextArea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={3}
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
