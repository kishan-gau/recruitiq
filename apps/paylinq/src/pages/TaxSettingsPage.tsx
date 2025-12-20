/**
 * Tax Settings Page - DEPRECATED
 * 
 * This page has been replaced with TaxRulesList for full backend integration.
 * Redirects users to the new tax rules management page.
 */

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle, ArrowLeft } from 'lucide-react';

const TaxSettingsPage = () => {
  const navigate = useNavigate();

  // Auto-redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/settings/tax-rules');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Deprecation Notice */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-8 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                This Page Has Been Replaced
              </h1>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                The Tax Settings page has been deprecated in favor of a new, fully-functional 
                <strong> Tax Rules Management</strong> interface with complete backend integration.
              </p>
              
              <div className="bg-white dark:bg-gray-800 rounded-md p-4 mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  What's new in Tax Rules:
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                    <span>Full CRUD operations for tax rules (Create, Read, Update, Delete)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                    <span>Real-time tax calculation preview</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                    <span>One-click Suriname tax rules setup</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                    <span>Progressive tax brackets with standard deductions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                    <span>Persistent data storage (no more mock data!)</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/settings/tax-rules"
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors gap-2"
                >
                  Go to Tax Rules Management
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/settings"
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Settings
                </Link>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                You will be automatically redirected in 5 seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxSettingsPage;
