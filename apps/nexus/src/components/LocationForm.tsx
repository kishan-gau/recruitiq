import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { useCreateLocation, useUpdateLocation } from '@/services/LocationsService';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError, getValidationErrors } from '@/utils/errorHandler';
import type { Location } from '@/types/location.types';

const locationSchema = z.object({
  locationCode: z.string()
    .min(2, 'Location code must be at least 2 characters')
    .max(10, 'Location code must not exceed 10 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Location code must contain only uppercase letters, numbers, hyphens, and underscores'),
  locationName: z.string()
    .min(2, 'Location name must be at least 2 characters')
    .max(100, 'Location name must not exceed 100 characters'),
  locationType: z.enum(['headquarters', 'branch', 'remote', 'warehouse', 'store'], {
    required_error: 'Location type is required',
  }),
  addressLine1: z.string()
    .min(1, 'Address line 1 is required')
    .max(200, 'Address line 1 must not exceed 200 characters'),
  addressLine2: z.string()
    .max(200, 'Address line 2 must not exceed 200 characters')
    .optional(),
  city: z.string()
    .max(100, 'City must not exceed 100 characters')
    .optional(),
  stateProvince: z.string()
    .max(100, 'State/Province must not exceed 100 characters')
    .optional(),
  postalCode: z.string()
    .max(20, 'Postal code must not exceed 20 characters')
    .optional(),
  country: z.string()
    .min(1, 'Country is required')
    .max(100, 'Country must not exceed 100 characters'),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(val), {
      message: 'Invalid phone number format',
    }),
  email: z.string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'Invalid email address',
    }),
  isActive: z.boolean(),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface LocationFormProps {
  location?: Location;
  mode: 'create' | 'edit';
}

export default function LocationForm({ location, mode }: LocationFormProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    mode: 'onBlur',
    defaultValues: {
      locationCode: location?.locationCode || '',
      locationName: location?.locationName || '',
      locationType: location?.locationType || 'branch',
      addressLine1: location?.addressLine1 || '',
      addressLine2: location?.addressLine2 || '',
      city: location?.city || '',
      stateProvince: location?.stateProvince || '',
      postalCode: location?.postalCode || '',
      country: location?.country || '',
      phone: location?.phone || '',
      email: location?.email || '',
      isActive: location?.isActive ?? true,
    },
  });

  const onSubmit = async (data: LocationFormData) => {
    try {
      // Convert empty strings to undefined for optional fields
      const submitData = {
        ...data,
        addressLine2: data.addressLine2 || undefined,
        city: data.city || undefined,
        stateProvince: data.stateProvince || undefined,
        postalCode: data.postalCode || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
      };
      
      if (mode === 'create') {
        await createMutation.mutateAsync(submitData);
        navigate('/locations');
      } else if (location) {
        await updateMutation.mutateAsync({
          id: location.id,
          data: submitData,
        });
        navigate(`/locations/${location.id}`);
      }
    } catch (error) {
      // Handle validation errors from API
      const apiError = error as any;
      if (apiError.response?.status === 400 && apiError.response?.data?.errors) {
        const errors = apiError.response.data.errors;
        console.error('Validation errors:', errors);
        
        // Map field names to user-friendly labels
        const fieldLabels: Record<string, string> = {
          name: 'Location Name',
          code: 'Location Code',
          address: 'Address',
          city: 'City',
          state: 'State/Province',
          country: 'Country',
          postalCode: 'Postal Code',
          timezone: 'Timezone',
        };
        
        // Show user-friendly error message
        const errorMessages = errors.map((e: any) => `${fieldLabels[e.field] || e.field}: ${e.message}`).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
      } else {
        // Use centralized error handler for other errors (including permission errors)
        handleApiError(error, {
          toast,
          defaultMessage: 'Failed to save location',
        });
      }
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && location) {
      navigate(`/locations/${location.id}`);
    } else {
      navigate('/locations');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Information */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Location Code */}
          <div>
            <label htmlFor="locationCode" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Location Code <span className="text-red-500">*</span>
            </label>
            <input
              id="locationCode"
              type="text"
              {...register('locationCode')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., HQ, NYC, LA"
            />
            {errors.locationCode && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.locationCode.message}
              </p>
            )}
          </div>

          {/* Location Name */}
          <div>
            <label htmlFor="locationName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Location Name <span className="text-red-500">*</span>
            </label>
            <input
              id="locationName"
              type="text"
              {...register('locationName')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., Headquarters, New York Office"
            />
            {errors.locationName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.locationName.message}
              </p>
            )}
          </div>

          {/* Location Type */}
          <div>
            <label htmlFor="locationType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Location Type <span className="text-red-500">*</span>
            </label>
            <select
              id="locationType"
              {...register('locationType')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="headquarters">Headquarters</option>
              <option value="branch">Branch</option>
              <option value="remote">Remote</option>
              <option value="warehouse">Warehouse</option>
              <option value="store">Store</option>
            </select>
            {errors.locationType && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.locationType.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Address
        </h2>
        <div className="space-y-6">
          {/* Address Line 1 */}
          <div>
            <label htmlFor="addressLine1" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <input
              id="addressLine1"
              type="text"
              {...register('addressLine1')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Street address"
            />
            {errors.addressLine1 && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.addressLine1.message}
              </p>
            )}
          </div>

          {/* Address Line 2 */}
          <div>
            <label htmlFor="addressLine2" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Address Line 2
            </label>
            <input
              id="addressLine2"
              type="text"
              {...register('addressLine2')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Apartment, suite, unit, building, floor, etc."
            />
            {errors.addressLine2 && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.addressLine2.message}
              </p>
            )}
          </div>

          {/* City, State, Postal Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                City
              </label>
              <input
                id="city"
                type="text"
                {...register('city')}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="City"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.city.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="stateProvince" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                State/Province
              </label>
              <input
                id="stateProvince"
                type="text"
                {...register('stateProvince')}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="State"
              />
              {errors.stateProvince && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.stateProvince.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Postal Code
              </label>
              <input
                id="postalCode"
                type="text"
                {...register('postalCode')}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="ZIP"
              />
              {errors.postalCode && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.postalCode.message}
                </p>
              )}
            </div>
          </div>

          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Country <span className="text-red-500">*</span>
            </label>
            <input
              id="country"
              type="text"
              {...register('country')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Country"
            />
            {errors.country && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.country.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Contact Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="+1-555-0100"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="location@company.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
          Status
        </h2>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="isActive"
              type="checkbox"
              {...register('isActive')}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="isActive" className="font-medium text-slate-700 dark:text-slate-300">
              Active
            </label>
            <p className="text-slate-500 dark:text-slate-400">
              Inactive locations are hidden from most views but can be reactivated
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="inline-flex items-center px-6 py-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5 mr-2" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5 mr-2" />
          {isSubmitting 
            ? (mode === 'create' ? 'Creating...' : 'Saving...') 
            : (mode === 'create' ? 'Create Location' : 'Save Changes')}
        </button>
      </div>
    </form>
  );
}
