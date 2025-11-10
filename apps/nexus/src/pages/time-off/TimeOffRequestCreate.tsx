/**
 * Time Off Request Create Page
 * Wrapper page for creating a new time-off request
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TimeOffRequestForm from '@/components/forms/TimeOffRequestForm';

export default function TimeOffRequestCreate() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/time-off/requests');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/time-off/requests')}
            className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Time-Off Requests
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create New Time-Off Request
          </h1>
        </div>
      </div>

      {/* Form */}
      <TimeOffRequestForm onSuccess={handleSuccess} />
    </div>
  );
}
