import { Shield, CheckCircle, XCircle, Calendar, Mail, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { formatDate } from '@/utils/helpers';

import GrantAccessModal from '../modals/GrantAccessModal';

interface SystemAccessPanelProps {
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
}

export default function SystemAccessPanel({ 
  employeeId, 
  employeeName, 
  employeeEmail 
}: SystemAccessPanelProps) {
  const { paylinq } = usePaylinqAPI();
  const { success: showSuccess, error: showError } = useToast();
  
  const [userAccount, setUserAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchUserAccount = async () => {
    try {
      setIsLoading(true);
      const response = await paylinq.getEmployeeUserAccount(employeeId);
      
      if (response.success && response.data) {
        setUserAccount(response.data);
      } else {
        setUserAccount(null);
      }
    } catch (error: any) {
      // 404 is expected if user doesn't have access
      if (error.response?.status !== 404) {
        console.error('Failed to fetch user account:', error);
      }
      setUserAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAccount();
  }, [employeeId]);

  const handleRevokeAccess = async () => {
    if (!confirm(`Are you sure you want to revoke system access for ${employeeName}?`)) {
      return;
    }

    setIsRevoking(true);
    try {
      const response = await paylinq.revokeEmployeeAccess(employeeId);
      
      if (response.success) {
        showSuccess('System access revoked successfully');
        setUserAccount(null);
      } else {
        showError(response.message || 'Failed to revoke access');
      }
    } catch (error: any) {
      console.error('Failed to revoke access:', error);
      showError(error.response?.data?.message || 'Failed to revoke system access');
    } finally {
      setIsRevoking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">System Access</h3>
              <p className="text-sm text-gray-600">Manage employee login credentials</p>
            </div>
          </div>

          {!userAccount ? (
            <button
              onClick={() => setIsGrantModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Grant Access
            </button>
          ) : (
            <button
              onClick={handleRevokeAccess}
              disabled={isRevoking}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {isRevoking ? 'Revoking...' : 'Revoke Access'}
            </button>
          )}
        </div>

        {!userAccount ? (
          /* No Access State */
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <XCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No System Access</h4>
            <p className="text-gray-600 mb-4">
              This employee does not have login credentials to access the system.
            </p>
            <button
              onClick={() => setIsGrantModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Shield className="w-5 h-5" />
              Grant System Access
            </button>
          </div>
        ) : (
          /* Has Access State */
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-900">System Access Active</div>
                  <div className="text-sm text-green-700">Employee can log in to the system</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {userAccount.isActive ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Account Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm font-medium">Email</span>
                </div>
                <div className="text-gray-900 font-medium">{userAccount.email}</div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Account Status</span>
                </div>
                <div className="text-gray-900 font-medium capitalize">
                  {userAccount.accountStatus?.replace('_', ' ')}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Created</span>
                </div>
                <div className="text-gray-900 font-medium">
                  {formatDate(userAccount.createdAt)}
                </div>
              </div>

              {userAccount.lastLoginAt && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Last Login</span>
                  </div>
                  <div className="text-gray-900 font-medium">
                    {formatDate(userAccount.lastLoginAt)}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => {
                  // TODO: Implement reset password
                  showError('Reset password feature coming soon');
                }}
              >
                Reset Password
              </button>
              <button
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => {
                  // TODO: Implement edit access
                  showError('Edit access feature coming soon');
                }}
              >
                Edit Access
              </button>
            </div>
          </div>
        )}
      </div>

      <GrantAccessModal
        isOpen={isGrantModalOpen}
        onClose={() => setIsGrantModalOpen(false)}
        employeeId={employeeId}
        employeeName={employeeName}
        employeeEmail={employeeEmail}
        onSuccess={fetchUserAccount}
      />
    </>
  );
}
