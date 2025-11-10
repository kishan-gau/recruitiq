/**
 * Time Off Request Edit Page
 * Wrapper page for editing an existing time-off request
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import TimeOffRequestForm from '@/components/forms/TimeOffRequestForm';
import { useTimeOffRequest } from '@/hooks/useTimeOff';

export default function TimeOffRequestEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: request, isLoading } = useTimeOffRequest(id);

  const handleSuccess = () => {
    navigate(`/time-off/requests/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Request not found</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          The time-off request you're trying to edit doesn't exist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/time-off/requests/${id}`)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Time-Off Request</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Request ID: {request.id}
          </p>
        </div>
      </div>

      {/* Form */}
      <TimeOffRequestForm request={request} onSuccess={handleSuccess} />
    </div>
  );
}
