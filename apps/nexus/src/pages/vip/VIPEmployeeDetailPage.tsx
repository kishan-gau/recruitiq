/**
 * VIP Employee Detail Page
 * Shows VIP status details and allows management of VIP settings
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Crown, 
  ArrowLeft, 
  Shield, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useVIPStatus, useMarkAsVIP, useUpdateVIPStatus, useRemoveVIPStatus, useVIPAuditLog } from '@/hooks/useVIPEmployees';
import { useEmployee } from '@/hooks/useEmployees';
import { useToast } from '@/contexts/ToastContext';
import { VIPEmployeeForm } from '@/components/vip/VIPEmployeeForm';
import { VIPBadge } from '@/components/vip/VIPBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { MarkAsVIPDTO, VIPAccessLog } from '@/types/vipEmployee.types';

// Utility function for capitalizing first letter
const capitalizeFirst = (text?: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export default function VIPEmployeeDetailPage() {
  const { id: employeeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch data
  const { data: employee, isLoading: employeeLoading } = useEmployee(employeeId!);
  const { data: vipStatus, isLoading: vipLoading } = useVIPStatus(employeeId!);
  const { data: auditData, isLoading: auditLoading } = useVIPAuditLog(employeeId!, { limit: 10 });

  // Mutations
  const { mutate: markAsVIP, isPending: isMarking } = useMarkAsVIP();
  const { mutate: updateVIPStatus, isPending: isUpdating } = useUpdateVIPStatus();
  const { mutate: removeVIPStatus, isPending: isRemoving } = useRemoveVIPStatus();

  const isLoading = employeeLoading || vipLoading;
  const isMutating = isMarking || isUpdating || isRemoving;

  const handleSubmit = async (data: MarkAsVIPDTO) => {
    if (!employeeId) return;

    const mutation = vipStatus?.isVip ? updateVIPStatus : markAsVIP;
    
    mutation(
      { employeeId, data },
      {
        onSuccess: () => {
          toast.success(vipStatus?.isVip ? 'VIP settings updated' : 'Employee marked as VIP');
          setIsEditing(false);
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to update VIP status');
        },
      }
    );
  };

  const handleRemoveVIP = () => {
    if (!employeeId) return;

    removeVIPStatus(employeeId, {
      onSuccess: () => {
        toast.success('VIP status removed');
        setShowRemoveDialog(false);
        navigate('/vip-employees');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to remove VIP status');
      },
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccessLogIcon = (log: VIPAccessLog) => {
    if (log.accessGranted) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
          Employee Not Found
        </h2>
        <p className="text-red-600 dark:text-red-400 mb-4">
          The requested employee could not be found.
        </p>
        <Link
          to="/vip-employees"
          className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to VIP Employees
        </Link>
      </div>
    );
  }

  const employeeName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/vip-employees')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {employeeName}
            </h1>
            <VIPBadge isVip={vipStatus?.isVip || false} isRestricted={vipStatus?.isRestricted} />
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {employee.jobTitle || 'No title'} • #{employee.employeeNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/employees/${employeeId}`}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            View Profile
          </Link>
          {vipStatus?.isVip && !isEditing && (
            <button
              onClick={() => setShowRemoveDialog(true)}
              className="px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Remove VIP
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - VIP Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
            {isEditing || !vipStatus?.isVip ? (
              <VIPEmployeeForm
                employeeId={employeeId!}
                employeeName={employeeName}
                initialData={vipStatus}
                onSubmit={handleSubmit}
                onCancel={() => {
                  if (vipStatus?.isVip) {
                    setIsEditing(false);
                  } else {
                    navigate('/vip-employees');
                  }
                }}
                isSubmitting={isMutating}
              />
            ) : (
              <div className="space-y-6">
                {/* VIP Status Summary */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        VIP Status Active
                      </h2>
                      <p className="text-slate-600 dark:text-slate-400">
                        {vipStatus?.isRestricted ? 'Access restrictions enabled' : 'No access restrictions'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                  >
                    Edit Settings
                  </button>
                </div>

                {/* Restriction Details */}
                {vipStatus?.isRestricted && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="font-medium text-amber-800 dark:text-amber-300">
                        Access Restrictions
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                        {capitalizeFirst(vipStatus.restrictionLevel)} Level
                      </span>
                    </div>
                    
                    {vipStatus.restrictionReason && (
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                        {vipStatus.restrictionReason}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-amber-600 dark:text-amber-400">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>Restricted by: {vipStatus.restrictedByEmail || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(vipStatus.restrictedAt)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Access Control Summary */}
                {vipStatus?.accessControl && (
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white mb-3">
                      Data Access Restrictions
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'restrictCompensation', label: 'Compensation' },
                        { key: 'restrictPersonalInfo', label: 'Personal Info' },
                        { key: 'restrictPerformance', label: 'Performance' },
                        { key: 'restrictDocuments', label: 'Documents' },
                        { key: 'restrictTimeOff', label: 'Time Off' },
                        { key: 'restrictBenefits', label: 'Benefits' },
                        { key: 'restrictAttendance', label: 'Attendance' },
                      ].map(({ key, label }) => (
                        <div
                          key={key}
                          className={`
                            px-3 py-2 rounded-lg text-sm text-center
                            ${vipStatus.accessControl?.[key as keyof typeof vipStatus.accessControl]
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                            }
                          `}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Audit Log */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Access Log
              </h3>
              {auditData?.auditLog && auditData.auditLog.length > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Last {auditData.auditLog.length} entries
                </span>
              )}
            </div>

            {auditLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : auditData?.auditLog && auditData.auditLog.length > 0 ? (
              <div className="space-y-3">
                {auditData.auditLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start gap-2">
                      {getAccessLogIcon(log)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${log.accessGranted ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            {log.accessGranted ? 'Granted' : 'Denied'}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
                            {log.accessType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {log.userName || log.userEmail || 'Unknown user'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {formatDate(log.accessedAt)}
                        </p>
                        {!log.accessGranted && log.denialReason && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {log.denialReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No access logs yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remove VIP Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRemoveDialog}
        onClose={() => setShowRemoveDialog(false)}
        onConfirm={handleRemoveVIP}
        title="Remove VIP Status"
        message={`Are you sure you want to remove VIP status from ${employeeName}? This will remove all access restrictions and audit logging for this employee.`}
        confirmText="Remove VIP"
        variant="danger"
      />
    </div>
  );
}
