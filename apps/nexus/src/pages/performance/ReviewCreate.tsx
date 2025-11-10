/**
 * Performance Review Create Page
 * Wrapper page for creating a new performance review
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PerformanceReviewForm from '@/components/forms/PerformanceReviewForm';

export default function ReviewCreate() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/performance/reviews');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/performance/reviews')}
            className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Reviews
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create New Performance Review
          </h1>
        </div>
      </div>

      {/* Form */}
      <PerformanceReviewForm onSuccess={handleSuccess} />
    </div>
  );
}
