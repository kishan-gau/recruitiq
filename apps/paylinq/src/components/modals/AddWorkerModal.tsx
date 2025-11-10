import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import FormField, { Input, TextArea, Select } from '@/components/ui/FormField';
import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';

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
  department: string;
  position: string;
  compensation: string;
  payFrequency: string;
  bankName: string;
  bankAccount: string;
  address: string;
}

export default function AddWorkerModal({ isOpen, onClose, onSuccess }: AddWorkerModalProps) {
  const { paylinq } = usePaylinqAPI();
  const { success, error } = useToast();
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
    workerType: 'Full-Time',
    department: '',
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
    if (!formData.department.trim()) newErrors.department = 'Department is required';
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
      
      const response = await paylinq.createWorker({
        hrisEmployeeId: formData.employeeNumber, // Use employee number as HRIS ID
        employeeNumber: formData.employeeNumber,
        firstName: firstName,
        lastName: lastName,
        email: formData.email,
        hireDate: hireDateISO,
        status: 'active',
        paymentMethod: 'direct_deposit',
        bankAccountNumber: formData.bankAccount,
        bankRoutingNumber: '', // Optional
        metadata: {
          phone: formData.phone,
          nationalId: formData.nationalId,
          dateOfBirth: formData.dateOfBirth,
          workerType: formData.workerType,
          department: formData.department,
          position: formData.position,
          compensation: Number(formData.compensation),
          payFrequency: formData.payFrequency,
          bankName: formData.bankName,
          address: formData.address,
        },
      });
      
      if (response.success) {
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
          department: '',
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
        error(errorMessages || 'Please fix the validation errors');
      } else {
        // Handle other errors
        error(err.response?.data?.message || err.message || 'Failed to add worker. Please try again.');
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
                  { value: 'Full-Time', label: 'Full-Time' },
                  { value: 'Part-Time', label: 'Part-Time' },
                  { value: 'Contract', label: 'Contract' },
                  { value: 'Hourly', label: 'Hourly' },
                ]}
              />
            </FormField>

            <FormField label="Department" required error={errors.department}>
              <Input
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="Engineering"
                error={!!errors.department}
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
