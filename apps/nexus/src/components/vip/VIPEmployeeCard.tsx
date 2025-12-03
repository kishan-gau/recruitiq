/**
 * VIP Employee Card Component
 * Displays VIP employee information in a card format
 */

import { Link } from 'react-router-dom';
import { Crown, Shield, Clock, User, Mail, Building2 } from 'lucide-react';
import { VIPBadge } from './VIPBadge';
import type { VIPEmployee } from '@/types/vipEmployee.types';

interface VIPEmployeeCardProps {
  employee: VIPEmployee;
  onManage?: (employeeId: string) => void;
}

export function VIPEmployeeCard({ employee, onManage }: VIPEmployeeCardProps) {
  const getRestrictionLevelBadge = (level?: string) => {
    if (!level || level === 'none') return null;
    
    const styles = {
      financial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      full: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      executive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[level as keyof typeof styles] || styles.financial}`}>
        {level.charAt(0).toUpperCase() + level.slice(1)} Restriction
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header with VIP gradient */}
      <div className="h-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />
      
      <div className="p-4">
        {/* Employee Info */}
        <div className="flex items-start gap-3 mb-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {employee.profilePhotoUrl ? (
              <img
                src={employee.profilePhotoUrl}
                alt={`${employee.firstName} ${employee.lastName}`}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white font-semibold ring-2 ring-amber-400">
                {employee.firstName?.[0] || '?'}
                {employee.lastName?.[0] || '?'}
              </div>
            )}
          </div>
          
          {/* Name and Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link 
                to={`/employees/${employee.id}`}
                className="text-lg font-semibold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors truncate"
              >
                {employee.firstName} {employee.lastName}
              </Link>
              <VIPBadge isVip={employee.isVip} isRestricted={employee.isRestricted} size="sm" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
              {employee.jobTitle || 'No title'}
            </p>
          </div>
        </div>
        
        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <User className="w-4 h-4" />
            <span>#{employee.employeeNumber}</span>
          </div>
          
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Mail className="w-4 h-4" />
            <span className="truncate">{employee.email}</span>
          </div>
          
          {employee.departmentName && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Building2 className="w-4 h-4" />
              <span>{employee.departmentName}</span>
            </div>
          )}
        </div>
        
        {/* Restriction Info */}
        {employee.isRestricted && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Access Restricted
              </span>
              {getRestrictionLevelBadge(employee.restrictionLevel)}
            </div>
            {employee.restrictedAt && (
              <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                <Clock className="w-3 h-3" />
                <span>Since {formatDate(employee.restrictedAt)}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Link
            to={`/employees/${employee.id}`}
            className="flex-1 px-3 py-2 text-sm text-center border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            View Profile
          </Link>
          {onManage && (
            <button
              onClick={() => onManage(employee.id)}
              className="flex-1 px-3 py-2 text-sm text-center bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              Manage VIP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default VIPEmployeeCard;
