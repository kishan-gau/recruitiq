import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface EligibilityCriteria {
  criterion: string;
  met: boolean;
  details?: string;
}

interface BenefitPlanEligibility {
  planId: string;
  planName: string;
  isEligible: boolean;
  criteria: EligibilityCriteria[];
  recommendationLevel?: 'high' | 'medium' | 'low';
  message?: string;
}

interface BenefitsEligibilityCheckerProps {
  employeeId: string;
  eligibility: BenefitPlanEligibility[];
  onEnroll?: (planId: string) => void;
}

export default function BenefitsEligibilityChecker({
  employeeId,
  eligibility,
  onEnroll,
}: BenefitsEligibilityCheckerProps) {
  const recommendationColors = {
    high: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    medium: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    low: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Eligibility Check
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Review the eligibility criteria for each benefits plan. You can only enroll in
              plans where all criteria are met.
            </p>
          </div>
        </div>
      </div>

      {eligibility.map((plan) => (
        <div
          key={plan.planId}
          className={`border rounded-lg p-6 ${
            plan.recommendationLevel
              ? recommendationColors[plan.recommendationLevel]
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {plan.planName}
                </h3>
                {plan.isEligible ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              {plan.message && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{plan.message}</p>
              )}
            </div>
            
            {plan.isEligible && onEnroll && (
              <button
                onClick={() => onEnroll(plan.planId)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm font-medium"
              >
                Enroll Now
              </button>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Eligibility Criteria:
            </h4>
            {plan.criteria.map((criterion, index) => (
              <div key={index} className="flex items-start gap-3">
                {criterion.met ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      criterion.met
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {criterion.criterion}
                  </p>
                  {criterion.details && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {criterion.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!plan.isEligible && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <p className="ml-3 text-sm text-red-700 dark:text-red-300">
                  You do not meet all the eligibility requirements for this plan. Please
                  contact HR if you believe this is incorrect.
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
