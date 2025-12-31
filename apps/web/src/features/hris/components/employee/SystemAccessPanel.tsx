import { format } from 'date-fns';
import { Shield, Mail, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

import GrantAccessModal from '@/components/modals/GrantAccessModal';
import { useToast } from '@/contexts/ToastContext';
import { employeesService } from '@/services/employees.service';
import { handleApiError } from '@/utils/errorHandler';

interface SystemAccessPanelProps {
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
}

export default function SystemAccessPanel({
  employeeId,
  employeeName,
  employeeEmail,
}: SystemAccessPanelProps) {
  const [userAccount, setUserAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const toast = useToast();

  const fetchUserAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await employeesService.getUserAccountStatus(_employeeId);
      setUserAccount(response.data || null);
    } catch (err: any) {
      // 404 means no user account exists (not an error state)
      if (err.response?.status === 404) {
        setUserAccount(null);
        setError(null);
      } else {
        const errorMessage = handleApiError(err, {
          toast,
          defaultMessage: 'Failed to load user account',
          showToast: false, // Don't show toast, just get the message
        });
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAccount();
  }, [employeeId]);

  const handleRevokeAccess = async () => {
    if (!window.confirm('Are you sure you want to revoke system access for this employee? They will no longer be able to log in.')) {
      return;
    }

    try {
      setIsRevoking(true);
      await employeesService.revokeSystemAccess(_employeeId);
      toast.success('System access revoked successfully');
      await fetchUserAccount();
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to revoke access',
      });
    } finally {
      setIsRevoking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: any; class: string; label: string }> = {
      active: {
        icon: CheckCircle,
        class: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        label: 'Active',
      },
      inactive: {
        icon: XCircle,
        class: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
        label: 'Inactive',
      },
      suspended: {
        icon: AlertCircle,
        class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
        label: 'Suspended',
      },
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.class}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading system access information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">
              Failed to Load Access Information
            </h3>
            <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchUserAccount}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No access granted yet
  if (!userAccount) {
    return (
      <>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8">
          <div className="flex flex-col items-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No System Access
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {employeeName} does not have login credentials yet. Grant system access to allow them to log in to the platform.
            </p>
            <button
              onClick={() => setIsGrantModalOpen(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
            >
              <Shield className="w-5 h-5" />
              Grant System Access
            </button>
          </div>
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

  // Access exists - show details
  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  System Access Active
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  User account credentials and status
                </p>
              </div>
            </div>
            {getStatusBadge(userAccount.status)}
          </div>
        </div>

        {/* Account Details */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <Mail className="w-4 h-4" />
                <span className="font-medium">Login Email</span>
              </div>
              <p className="text-gray-900 dark:text-white font-medium">
                {userAccount.email}
              </p>
            </div>

            {/* User Type */}
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <Shield className="w-4 h-4" />
                <span className="font-medium">User Type</span>
              </div>
              <p className="text-gray-900 dark:text-white font-medium capitalize">
                {userAccount.user_type || 'Tenant User'}
              </p>
            </div>

            {/* Created Date */}
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Access Granted</span>
              </div>
              <p className="text-gray-900 dark:text-white">
                {userAccount.created_at ? format(new Date(userAccount.created_at), 'MMM d, yyyy') : 'N/A'}
              </p>
            </div>

            {/* Last Login */}
            {userAccount.last_login && (
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Last Login</span>
                </div>
                <p className="text-gray-900 dark:text-white">
                  {format(new Date(userAccount.last_login), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-800 rounded-b-lg">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleRevokeAccess}
              disabled={isRevoking}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isRevoking && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isRevoking ? 'Revoking...' : 'Revoke Access'}
            </button>
          </div>
        </div>
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

