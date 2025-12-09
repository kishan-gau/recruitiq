import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { Employee, CreateEmployeeDTO } from '@/types/employee.types';

// Helper function to convert empty strings to undefined for optional fields
const preprocessFormData = (data: any) => {
  const processed = { ...data };
  
  // List of optional fields that should be undefined when empty
  const optionalFields = [
    'middleName', 'preferredName', 'dateOfBirth', 'gender', 'nationality', 'residenceStatus',
    'phone', 'mobilePhone', 'addressLine1', 'addressLine2', 'city', 'stateProvince',
    'postalCode', 'country', 'emergencyContactName', 'emergencyContactRelationship',
    'emergencyContactPhone', 'jobTitle', 'workSchedule', 'bio', 'terminationDate'
  ];
  
  // Handle UUID fields specially - they need to be undefined if empty to avoid validation errors
  const uuidFields = ['departmentId', 'locationId', 'managerId'];
  
  // Handle URL fields specially
  const urlFields = ['profilePhotoUrl'];
  
  optionalFields.forEach(field => {
    if (processed[field] === '') {
      processed[field] = undefined;
    }
  });
  
  // Convert empty strings and placeholder values to undefined for UUID fields to prevent validation errors
  uuidFields.forEach(field => {
    if (processed[field] === '' || processed[field] === null || processed[field] === '__none__') {
      processed[field] = undefined;
    }
  });
  
  // Convert empty strings to undefined for URL fields to prevent validation errors
  urlFields.forEach(field => {
    if (processed[field] === '' || processed[field] === null) {
      processed[field] = undefined;
    }
  });
  
  // Handle ftePercentage specially (number field)
  if (processed.ftePercentage === '' || processed.ftePercentage === null || isNaN(processed.ftePercentage)) {
    processed.ftePercentage = undefined;
  }
  
  return processed;
};

// Zod validation schema
const employeeSchema = z.object({
  // Required fields
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  email: z.string().email('Invalid email address'),
  employeeNumber: z.string().min(1, 'Employee number is required'),
  hireDate: z.string().min(1, 'Hire date is required'),
  employmentStatus: z.enum(['active', 'on_leave', 'terminated', 'suspended']),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'intern']),
  
  // Optional fields - Personal
  middleName: z.string().max(100).optional(),
  preferredName: z.string().max(100).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.preprocess(
    (val) => val === '' ? undefined : val,
    z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say', 'other']).optional()
  ),
  nationality: z.string().max(100).optional(),
  residenceStatus: z.preprocess(
    (val) => val === '' ? undefined : val,
    z.enum(['resident', 'non_resident', 'partial_year_resident']).optional()
  ),
  
  // Contact
  phone: z.string().max(20).optional(),
  mobilePhone: z.string().max(20).optional(),
  
  // Address
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  stateProvince: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  
  // Emergency Contact
  emergencyContactName: z.string().max(200).optional(),
  emergencyContactRelationship: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  
  // Employment Details
  departmentId: z.union([z.string().uuid(), z.literal('__none__'), z.literal('')]).transform(val => val === '__none__' || val === '' ? undefined : val).optional(),
  locationId: z.union([z.string().uuid(), z.literal('__none__'), z.literal('')]).transform(val => val === '__none__' || val === '' ? undefined : val).optional(),
  managerId: z.union([z.string().uuid(), z.literal('__none__'), z.literal('')]).transform(val => val === '__none__' || val === '' ? undefined : val).optional(),
  jobTitle: z.string().max(200).optional(),
  workSchedule: z.string().max(100).optional(),
  ftePercentage: z.union([z.number().min(0).max(100), z.nan()]).transform(val => isNaN(val) ? undefined : val).optional(),
  
  // Additional
  bio: z.string().optional(),
  profilePhotoUrl: z.union([z.string().url(), z.literal('')]).transform(val => val === '' ? undefined : val).optional(),
  skills: z.array(z.string()).optional(),
  terminationDate: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: Employee;
  onSubmit: (data: CreateEmployeeDTO) => void;
  onCancel: () => void;
  isLoading?: boolean;
  departments?: Array<{ id: string; departmentName: string }>;
  locations?: Array<{ id: string; locationName: string }>;
  managers?: Array<{ id: string; firstName: string; lastName: string }>;
}

// Create consistent default values factory
const createDefaultValues = (): EmployeeFormData => ({
  id: '',
  organizationId: '',
  employeeNumber: '',
  firstName: '',
  middleName: '',
  lastName: '',
  preferredName: '',
  email: '',
  phone: '',
  mobilePhone: '',
  dateOfBirth: '',
  gender: '',
  nationality: '',
  residenceStatus: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateProvince: '',
  postalCode: '',
  country: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  hireDate: '',
  jobTitle: '',
  employmentStatus: 'active' as const,
  employmentType: 'full_time' as const,
  departmentId: '__none__',
  locationId: '__none__',
  managerId: '__none__',
  workSchedule: '',
  terminationDate: '',
  bio: '',
  profilePhotoUrl: '',
});

export default function EmployeeForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  departments = [],
  locations = [],
  managers = [],
}: EmployeeFormProps) {
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    mode: 'onSubmit',
    shouldFocusError: true,
    defaultValues: createDefaultValues(), // Always start with clean defaults
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting, isDirty },
    reset,
    getValues,
  } = form;

  // Comprehensive debugging
  console.log('🔍 EmployeeForm render:', {
    hasInitialData: !!initialData,
    initialDataKeys: initialData ? Object.keys(initialData) : [],
    initialDataSample: initialData ? {
      id: initialData.id,
      firstName: initialData.firstName,
      dateOfBirth: initialData.dateOfBirth,
      gender: initialData.gender,
      phone: initialData.phone
    } : null,
    formState: {
      isDirty,
      isValid,
      touchedFields: Object.keys(form.formState.touchedFields),
      dirtyFields: Object.keys(form.formState.dirtyFields)
    }
  });

  // Reset form when initialData changes (proper pattern)
  useEffect(() => {
    if (initialData) {
      console.log('🔄 Resetting form with initialData');
      
      // Create clean values from initialData
      const resetValues: EmployeeFormData = {
        ...createDefaultValues(),
        ...Object.fromEntries(
          Object.entries(initialData).map(([key, value]) => [
            key,
            value === null || value === undefined ? '' : String(value)
          ])
        ),
        // Ensure proper enum values
        employmentStatus: (initialData.employmentStatus as any) || 'active',
        employmentType: (initialData.employmentType as any) || 'full_time',
        departmentId: initialData.departmentId || '__none__',
        locationId: initialData.locationId || '__none__',
        managerId: initialData.managerId || '__none__',
      };
      
      console.log('🎯 Reset values:', resetValues);
      reset(resetValues);
      
      // Debug form state after reset
      setTimeout(() => {
        console.log('📊 Form state after reset:', {
          isDirty: form.formState.isDirty,
          values: getValues(),
        });
      }, 0);
    }
  }, [initialData, reset, form, getValues]);

  // Debug isDirty state changes
  useEffect(() => {
    console.log('🚨 isDirty changed:', { 
      isDirty, 
      timestamp: new Date().toISOString(),
      hasInitialData: !!initialData 
    });
  }, [isDirty, initialData]);

  const handleFormSubmit = (data: EmployeeFormData) => {
    console.log('📤 Submitting form data:', data);
    // Preprocess form data to handle empty strings properly
    const processedData = preprocessFormData(data);

    onSubmit(processedData as CreateEmployeeDTO);
  };  // Custom submit handler that prevents automatic focus on errors
  const handleFormSubmitWithoutFocus = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(handleFormSubmit)(e);
    // Blur any focused element to prevent focus jumping
    (document.activeElement as HTMLElement)?.blur();
  };





  // Error display component
  const FieldError = ({ error }: { error?: { message?: string } }) => {
    if (!error?.message) return null;
    return (
      <p className="mt-1 text-sm text-red-600" role="alert">
        {error.message}
      </p>
    );
  };

  return (
    <form onSubmit={handleFormSubmitWithoutFocus} className="space-y-6">
      {/* Personal Information */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('firstName')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('lastName')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.lastName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Middle Name
            </label>
            <input
              type="text"
              {...register('middleName')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Preferred Name
            </label>
            <input
              type="text"
              {...register('preferredName')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              {...register('dateOfBirth')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Gender
            </label>
            <select
              {...register('gender')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
              <option value="other">Other</option>
            </select>
            <FieldError error={errors.gender} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nationality
            </label>
            <input
              type="text"
              {...register('nationality')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tax Residence Status
            </label>
            <select
              {...register('residenceStatus')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Select residence status</option>
              <option value="resident">Resident (Full tax obligations)</option>
              <option value="non_resident">Non-Resident (Limited tax obligations)</option>
              <option value="partial_year_resident">Partial Year Resident</option>
            </select>
            <FieldError error={errors.residenceStatus} />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Determines Dutch payroll tax calculations. Default: Resident
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Contact Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Phone
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Mobile Phone
            </label>
            <input
              type="tel"
              {...register('mobilePhone')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Address Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Address Line 1
            </label>
            <input
              type="text"
              {...register('addressLine1')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              {...register('addressLine2')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              City
            </label>
            <input
              type="text"
              {...register('city')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              State/Province
            </label>
            <input
              type="text"
              {...register('stateProvince')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Postal Code
            </label>
            <input
              type="text"
              {...register('postalCode')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Country
            </label>
            <input
              type="text"
              {...register('country')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Emergency Contact
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Contact Name
            </label>
            <input
              type="text"
              {...register('emergencyContactName')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Relationship
            </label>
            <input
              type="text"
              {...register('emergencyContactRelationship')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              {...register('emergencyContactPhone')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Employment Details */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Employment Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Employee Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('employeeNumber')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.employeeNumber && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.employeeNumber.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Job Title
            </label>
            <input
              type="text"
              {...register('jobTitle')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Department
            </label>
            <select
              {...register('departmentId')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="__none__">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.departmentName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Location
            </label>
            <select
              {...register('locationId')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="__none__">Select location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.locationName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Manager
            </label>
            <select
              {...register('managerId')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="__none__">Select manager</option>
              {managers.map((mgr) => (
                <option key={mgr.id} value={mgr.id}>
                  {mgr.firstName} {mgr.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Hire Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('hireDate')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.hireDate && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.hireDate.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Employment Status <span className="text-red-500">*</span>
            </label>
            <select
              {...register('employmentStatus')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
            <FieldError error={errors.employmentStatus} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Employment Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('employmentType')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="temporary">Temporary</option>
              <option value="intern">Intern</option>
            </select>
            <FieldError error={errors.employmentType} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Work Schedule
            </label>
            <input
              type="text"
              {...register('workSchedule')}
              placeholder="e.g., Mon-Fri 9-5"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              FTE Percentage
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('ftePercentage', { valueAsNumber: true })}
              placeholder="100"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Additional Information
        </h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Bio
            </label>
            <textarea
              {...register('bio')}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Profile Photo URL
            </label>
            <input
              type="url"
              {...register('profilePhotoUrl')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="inline-flex items-center px-6 py-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5 mr-2" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || (initialData && !isDirty)}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5 mr-2" />
          {isLoading ? 'Saving...' : initialData ? 'Update Employee' : 'Create Employee'}
        </button>
      </div>
    </form>
  );
}
