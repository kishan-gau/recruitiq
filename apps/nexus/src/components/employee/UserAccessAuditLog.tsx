/**
 * User Access Audit Log
 * Displays history of user access operations (grant, revoke, update)
 */

import { useState, useEffect } from 'react';
import { Shield, Clock, User, CheckCircle, XCircle, Edit, Mail } from 'lucide-react';
import { format } from 'date-fns';

// Mock data structure - would come from backend API
interface AuditEntry {
  id: string;
  action: 'grant' | 'revoke' | 'update';
  employeeName: string;
  employeeEmail: string;
  performedBy: string;
  performedAt: string;
  details?: string;
  metadata?: {
    emailSent?: boolean;
    previousStatus?: string;
    newStatus?: string;
  };
}

export default function UserAccessAuditLog() {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<'all' | 'grant' | 'revoke' | 'update'>('all');

  useEffect(() => {
    // Simulate loading audit log
    // In production, this would call: await nexusClient.getUserAccessAuditLog()
    setTimeout(() => {
      const mockData: AuditEntry[] = [
        {
          id: '1',
          action: 'grant',
          employeeName: 'John Doe',
          employeeEmail: 'john.doe@company.com',
          performedBy: 'Admin User',
          performedAt: new Date().toISOString(),
          details: 'Initial system access granted',
          metadata: { emailSent: true },
        },
        {
          id: '2',
          action: 'revoke',
          employeeName: 'Jane Smith',
          employeeEmail: 'jane.smith@company.com',
          performedBy: 'HR Manager',
          performedAt: new Date(Date.now() - 86400000).toISOString(),
          details: 'Access revoked due to termination',
        },
        {
          id: '3',
          action: 'update',
          employeeName: 'Bob Johnson',
          employeeEmail: 'bob.johnson@company.com',
          performedBy: 'System Admin',
          performedAt: new Date(Date.now() - 172800000).toISOString(),
          details: 'Account status updated',
          metadata: { previousStatus: 'inactive', newStatus: 'active' },
        },
      ];
      setAuditLog(mockData);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredLog = filterAction === 'all' 
    ? auditLog 
    : auditLog.filter((entry) => entry.action === filterAction);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'grant':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'revoke':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'update':
        return <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getActionBadge = (action: string) => {
    const config: Record<string, { class: string; label: string }> = {
      grant: {
        class: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        label: 'Access Granted',
      },
      revoke: {
        class: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        label: 'Access Revoked',
      },
      update: {
        class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
        label: 'Access Updated',
      },
    };

    const { class: className, label } = config[action] || config.update;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by action:
        </label>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value as any)}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="all">All Actions</option>
          <option value="grant">Access Granted</option>
          <option value="revoke">Access Revoked</option>
          <option value="update">Access Updated</option>
        </select>
      </div>

      {/* Audit Log Entries */}
      {filteredLog.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No audit log entries found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLog.map((entry) => (
            <div
              key={entry.id}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="mt-1">{getActionIcon(entry.action)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getActionBadge(entry.action)}
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {format(new Date(entry.performedAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {entry.employeeName}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({entry.employeeEmail})
                      </span>
                    </div>

                    {entry.details && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.details}
                      </p>
                    )}

                    {entry.metadata?.emailSent && (
                      <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                        <Mail className="w-4 h-4" />
                        <span>Credential email sent</span>
                      </div>
                    )}

                    {entry.metadata?.previousStatus && entry.metadata?.newStatus && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Status changed from{' '}
                        <span className="font-medium">{entry.metadata.previousStatus}</span> to{' '}
                        <span className="font-medium">{entry.metadata.newStatus}</span>
                      </div>
                    )}

                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <span>by</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {entry.performedBy}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
