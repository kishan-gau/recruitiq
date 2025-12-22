import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import FormField, { Input, TextArea, Select } from '@/components/ui/FormField';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useWorkerTypeTemplates } from '@/hooks/useWorkerTypes';
import { useDepartments } from '@/hooks/useDepartments';
import { useLocations } from '@/hooks/useLocations';
import { useWorkersForManager } from '@/hooks/useWorkersForManager';

interface AddWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface WorkerFormData {
  employeeNumber: string;
  fullName: string;
  email: string;
  phone: string;
  nationalId: string;
  dateOfBirth: string;
  startDate: string;
  workerType: string;
  departmentId: string;   // Phase 2: FK to hris.department
  locationId: string;     // Phase 2: FK to hris.location
  managerId: string;      // Phase 2: Self-referencing FK
  department: string;     // Fallback for legacy
  position: string;
  compensation: string;
  payFrequency: string;
  bankName: string;
  bankAccount: string;
  address: string;
}

export default function AddWorkerModal({ isOpen, onClose, onSuccess }: AddWorkerModalProps) {
  const { paylinq } = usePaylinqAPI();
  const toast = useToast();
  const { success, error } = toast;
  const { data: workerTypes = [], isLoading: loadingTypes } = useWorkerTypeTemplates({ status: 'active' });
  
  // Phase 2: Load organizational structure data
  const { data: departments = [], isLoading: loadingDepartments } = useDepartments({ isActive: true });
  const { data: locations = [], isLoading: loadingLocations } = useLocations({ isActive: true });
  const { data: managers = [], isLoading: loadingManagers } = useWorkersForManager({ status: 'active' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof WorkerFormData, string>>>({});
  const [formData, setFormData] = useState<WorkerFormData>({
    employeeNumber: '',
    fullName: '',
    email: '',
    phone: '',
    nationalId: '',
    dateOfBirth: '',
    startDate: new Date().toISOString().split('T')[0],
    workerType: '',
    departmentId: '',   // Phase 2
    locationId: '',     // Phase 2
    managerId: '',      // Phase 2
    department: '',     // Fallback
    position: '',
    compensation: '',
    payFrequency: 'monthly',
    bankName: '',
    bankAccount: '',
    address: '',
  });

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof WorkerFormData, string>> = {};

    if (!formData.employeeNumber.trim()) newErrors.employeeNumber = 'Employee number is required';
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email format';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.nationalId.trim()) newErrors.nationalId = 'National ID is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    // Phase 2: Department is now optional (can be set via departmentId or legacy text)
    if (!formData.position.trim()) newErrors.position = 'Position is required';
    if (!formData.compensation.trim()) newErrors.compensation = 'Compensation is required';
    else if (isNaN(Number(formData.compensation)) || Number(formData.compensation) <= 0)
      newErrors.compensation = 'Invalid compensation amount';
    if (!formData.bankName.trim()) newErrors.bankName = 'Bank name is required';
    if (!formData.bankAccount.trim()) newErrors.bankAccount = 'Bank account is required';

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
      
      // Convert date to ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
      const hireDateISO = new Date(formData.startDate).toISOString();
      
      // Phase 1 & 2 Migration: Send PII and organizational structure at root level
      const response = await paylinq.createWorker({
        hrisEmployeeId: formData.employeeNumber,
        employeeNumber: formData.employeeNumber,
        firstName: firstName,
        lastName: lastName,
        email: formData.email,
        phone: formData.phone, // Phase 1: Root level
        nationalId: formData.nationalId, // Phase 1: Root level (maps to taxIdNumber)
        dateOfBirth: formData.dateOfBirth, // Phase 1: Root level
        hireDate: hireDateISO,
        status: 'active',
        paymentMethod: 'direct_deposit',
        bankAccountNumber: formData.bankAccount,
        bankRoutingNumber: '',
        // Phase 2: Organizational structure at root level
        departmentId: formData.departmentId || null,
        locationId: formData.locationId || null,
        managerId: formData.managerId || null,
        metadata: {
          department: formData.department || null, // Fallback for legacy
          position: formData.position,
          compensation: Number(formData.compensation),
          payFrequency: formData.payFrequency,
          bankName: formData.bankName,
          address: formData.address,
        },
      });
      
      if (response.success && response.employee) {
        // Assign worker type if specified
        if (formData.workerType) {
          try {
            await paylinq.assignWorkerType({
              employeeRecordId: response.employee.employeeId,
              workerTypeTemplateId: formData.workerType,
              effectiveFrom: formData.startDate,
              payFrequency: formData.payFrequency || null,
            });
          } catch (wtError: any) {
            console.error('Failed to assign worker type:', wtError);
            
            // Handle validation errors for worker type assignment
            if (wtError.response?.status === 400 && wtError.response?.data?.details) {
              const apiErrors = wtError.response.data.details;
              const fieldErrors: Record<string, string> = {};
              
              // Map backend field names to frontend form field names
              const fieldMapping: Record<string, string> = {
                effectiveFrom: 'startDate',
                employeeRecordId: 'employeeNumber',
                workerTypeTemplateId: 'workerType',
                payFrequency: 'payFrequency',
              };
              
              // Map field names to user-friendly labels
              const fieldLabels: Record<string, string> = {
                startDate: 'Start Date',
                employeeNumber: 'Employee Number',
                workerType: 'Worker Type',
                payFrequency: 'Pay Frequency',
              };
              
              apiErrors.forEach((apiError: any) => {
                const backendField = apiError.path?.[0] || apiError.field;
                const frontendField = fieldMapping[backendField] || backendField;
                const fieldLabel = fieldLabels[frontendField] || frontendField;
                fieldErrors[frontendField] = `${fieldLabel}: ${apiError.message}`;
              });
              
              setErrors(fieldErrors);
              
              // Also show a general error message
              error('Please correct the worker type assignment fields and try again.');
            } else {
              // For other errors, show generic message
              error('Worker created but failed to assign worker type. Please assign manually.');
            }
            
            return; // Don't close the modal so user can fix the errors
          }
        }
        
        success(`Worker ${formData.fullName} has been added successfully`);
        // Reset form
        setFormData({
          employeeNumber: '',
          fullName: '',
          email: '',
          phone: '',
          nationalId: '',
          dateOfBirth: '',
          startDate: new Date().toISOString().split('T')[0],
          workerType: 'Full-Time',
          departmentId: '',   // Phase 2
          locationId: '',     // Phase 2
          managerId: '',      // Phase 2
          department: '',     // Fallback
          position: '',
          compensation: '',
          payFrequency: 'monthly',
          bankName: '',
          bankAccount: '',
          address: '',
        });
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      // Handle validation errors from API
      // Backend returns validation errors in 'details' field
      if (err.response?.status === 400 && err.response?.data?.details) {
        const apiErrors = err.response.data.details;
        const fieldErrors: Record<string, string> = {};
        
        // Map backend field names to frontend form field names
        const fieldMapping: Record<string, string> = {
          hrisEmployeeId: 'employeeNumber',
          firstName: 'fullName',
          lastName: 'fullName',
          hireDate: 'startDate',
          bankAccountNumber: 'bankAccount',
          effectiveFrom: 'startDate',
          employeeRecordId: 'employeeNumber',
        };
        
        // Map field names to user-friendly labels
        const fieldLabels: Record<string, string> = {
          employeeNumber: 'Employee Number',
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
          payFrequency: 'Pay Frequency',
          bankName: 'Bank Name',
          bankAccount: 'Bank Account Number',
          address: 'Address',
        };
        
        apiErrors.forEach((apiError: any) => {
          // Map backend field name to frontend field name
          const frontendField = fieldMapping[apiError.field] || apiError.field;
          fieldErrors[frontendField] = apiError.message;
        });
        
        setErrors(fieldErrors);
        
        // Show user-friendly error message with labels
        const errorMessages = apiErrors
          .map((e: any) => {
            const frontendField = fieldMapping[e.field] || e.field;
            const label = fieldLabels[frontendField] || e.field;
            return `${label}: ${e.message}`;
          })
          .join(', ');
        toast.error(errorMessages || 'Please fix the validation errors');
      } else {
        // Handle other errors
        handleApiError(err, {
          toast,
          defaultMessage: 'Failed to add worker. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof WorkerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Worker"
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
            {isLoading ? 'Adding...' : 'Add Worker'}
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
            <FormField label="Employee Number" required error={errors.employeeNumber}>
              <Input
                value={formData.employeeNumber}
                onChange={(e) => handleChange('employeeNumber', e.target.value)}
                placeholder="SR-001"
                error={!!errors.employeeNumber}
              />
            </FormField>

            <FormField label="Full Name" required error={errors.fullName}>
              <Input
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="John Doe"
                error={!!errors.fullName}
              />
            </FormField>

            <FormField label="Email" required error={errors.email}>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john.doe@example.com"
                error={!!errors.email}
              />
            </FormField>

            <FormField label="Phone" required error={errors.phone}>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+597 123-4567"
                error={!!errors.phone}
              />
            </FormField>

            <FormField label="National ID" required error={errors.nationalId}>
              <Input
                value={formData.nationalId}
                onChange={(e) => handleChange('nationalId', e.target.value)}
                placeholder="12345678"
                error={!!errors.nationalId}
              />
            </FormField>

            <FormField label="Date of Birth" required error={errors.dateOfBirth}>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                error={!!errors.dateOfBirth}
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
            <FormField label="Start Date" required error={errors.startDate}>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                error={!!errors.startDate}
              />
            </FormField>

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
                placeholder="Software Engineer"
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
                    label: `${loc.name || loc.locationName}${loc.city ? ` - ${loc.city}` : ''}`
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
                placeholder="5000"
                error={!!errors.compensation}
              />
            </FormField>

            <FormField label="Pay Frequency" required>
              <Select
                value={formData.payFrequency}
                onChange={(e) => handleChange('payFrequency', e.target.value)}
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'biweekly', label: 'Bi-Weekly' },
                  { value: 'weekly', label: 'Weekly' },
                ]}
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
            <FormField label="Bank Name" required error={errors.bankName}>
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
                error={!!errors.bankName}
              />
            </FormField>

            <FormField label="Bank Account Number" required error={errors.bankAccount}>
              <Input
                value={formData.bankAccount}
                onChange={(e) => handleChange('bankAccount', e.target.value)}
                placeholder="1234567890"
                error={!!errors.bankAccount}
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
              placeholder="123 Main St, Paramaribo, Suriname"
              rows={3}
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
