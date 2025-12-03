/**
 * VIP Access Denied Component
 * Displayed when user attempts to access restricted VIP employee data
 */

import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VIPAccessDeniedProps {
  employeeName?: string;
  reason?: string;
  backPath?: string;
}

const DEFAULT_VIP_DENIAL_MESSAGE = "You do not have permission to access this employee's data.";

export function VIPAccessDenied({
  employeeName = 'this employee',
  reason = DEFAULT_VIP_DENIAL_MESSAGE,
  backPath = '/workers',
}: VIPAccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-full p-6 mb-6">
        <Shield className="w-16 h-16 text-amber-600 dark:text-amber-400" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        VIP Employee - Access Restricted
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
        {reason}
      </p>
      
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-8">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>Employee:</strong> {employeeName}
          <br />
          <span className="text-amber-600 dark:text-amber-400">
            This worker has VIP status with access restrictions. 
            Contact your HR administrator if you need access.
          </span>
        </p>
      </div>
      
      <button
        onClick={() => navigate(backPath)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Workers
      </button>
    </div>
  );
}

export default VIPAccessDenied;
