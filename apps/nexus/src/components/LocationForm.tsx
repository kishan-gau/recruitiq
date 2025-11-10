import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCreateLocation, useUpdateLocation } from '@/services/LocationsService';
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
        alert(`Validation errors:\n${errors.map((e: any) => `• ${fieldLabels[e.field] || e.field}: ${e.message}`).join('\n')}`);
      } else {
        console.error('Failed to save location:', error);
        alert(apiError.response?.data?.message || 'Failed to save location. Please try again.');
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
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Create Location' : 'Edit Location'}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {mode === 'create' 
              ? 'Add a new location to your organization'
              : 'Update location information'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Basic Information
            </h3>

            {/* Location Code */}
            <div>
              <label htmlFor="locationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Location Code <span className="text-red-500">*</span>
              </label>
              <input
                id="locationCode"
                type="text"
                {...register('locationCode')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
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
              <label htmlFor="locationName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Location Name <span className="text-red-500">*</span>
              </label>
              <input
                id="locationName"
                type="text"
                {...register('locationName')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
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
              <label htmlFor="locationType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Location Type <span className="text-red-500">*</span>
              </label>
              <select
                id="locationType"
                {...register('locationType')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
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

          {/* Address Section */}
          <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Address
            </h3>

            {/* Address Line 1 */}
            <div>
              <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                id="addressLine1"
                type="text"
                {...register('addressLine1')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
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
              <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Address Line 2
              </label>
              <input
                id="addressLine2"
                type="text"
                {...register('addressLine2')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                placeholder="Apartment, suite, unit, building, floor, etc."
              />
              {errors.addressLine2 && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.addressLine2.message}
                </p>
              )}
            </div>

            {/* City, State, Postal Code */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  {...register('city')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder="City"
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.city.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="stateProvince" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  State/Province
                </label>
                <input
                  id="stateProvince"
                  type="text"
                  {...register('stateProvince')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder="State"
                />
                {errors.stateProvince && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.stateProvince.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Postal Code
                </label>
                <input
                  id="postalCode"
                  type="text"
                  {...register('postalCode')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
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
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                id="country"
                type="text"
                {...register('country')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                placeholder="Country"
              />
              {errors.country && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.country.message}
                </p>
              )}
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Contact Information
            </h3>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                placeholder="location@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-start pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center h-5">
              <input
                id="isActive"
                type="checkbox"
                {...register('isActive')}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="isActive" className="font-medium text-gray-700 dark:text-gray-300">
                Active
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Inactive locations are hidden from most views but can be reactivated
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting 
                ? (mode === 'create' ? 'Creating...' : 'Saving...') 
                : (mode === 'create' ? 'Create Location' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
