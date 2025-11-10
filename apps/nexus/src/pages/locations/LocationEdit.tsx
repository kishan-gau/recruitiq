import { useParams, useNavigate } from 'react-router-dom';
import { useLocation } from '@/services/LocationsService';
import LocationForm from '@/components/LocationForm';

export default function LocationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: location, isLoading, error } = useLocation(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 spinner" aria-label="Loading location"></div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">
          Location Not Found
        </h3>
        <p className="text-red-700 dark:text-red-400 mb-4">
          The location you're trying to edit doesn't exist or has been deleted.
        </p>
        <button
          onClick={() => navigate('/locations')}
          className="text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
        >
          ← Back to Locations
        </button>
      </div>
    );
  }

  return <LocationForm location={location} mode="edit" />;
}
