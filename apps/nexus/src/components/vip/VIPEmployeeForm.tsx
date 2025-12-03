/**
 * VIP Employee Form Component
 * Form for managing VIP status and access controls
 */

import { useState, useEffect } from 'react';
import { Crown, Shield, ShieldCheck, Users, Building2, Lock, Unlock, Info } from 'lucide-react';
import { VIPStatusToggle } from './VIPStatusToggle';
import type { VIPStatus, MarkAsVIPDTO, RestrictionLevel } from '@/types/vipEmployee.types';

interface VIPEmployeeFormProps {
  employeeId: string;
  employeeName: string;
  initialData?: VIPStatus | null;
  onSubmit: (data: MarkAsVIPDTO) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const RESTRICTION_LEVELS: { value: RestrictionLevel; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No access restrictions applied' },
  { value: 'financial', label: 'Financial', description: 'Only compensation data is restricted' },
  { value: 'full', label: 'Full', description: 'Compensation, performance, and documents are restricted' },
  { value: 'executive', label: 'Executive', description: 'Maximum protection - all sensitive data restricted' },
];

// Define restriction keys as a const for type safety
const RESTRICTION_KEYS = [
  'restrictCompensation',
  'restrictPersonalInfo',
  'restrictPerformance',
  'restrictDocuments',
  'restrictTimeOff',
  'restrictBenefits',
  'restrictAttendance',
] as const;

type RestrictionKey = typeof RESTRICTION_KEYS[number];

const DATA_RESTRICTIONS: { key: RestrictionKey; label: string; description: string }[] = [
  { key: 'restrictCompensation', label: 'Compensation Data', description: 'Salary, bonuses, benefits' },
  { key: 'restrictPersonalInfo', label: 'Personal Information', description: 'Address, SSN, contact details' },
  { key: 'restrictPerformance', label: 'Performance Data', description: 'Reviews, goals, feedback' },
  { key: 'restrictDocuments', label: 'Documents', description: 'Contracts, agreements, files' },
  { key: 'restrictTimeOff', label: 'Time Off Data', description: 'Leave balances and requests' },
  { key: 'restrictBenefits', label: 'Benefits Data', description: 'Enrollments and plan details' },
  { key: 'restrictAttendance', label: 'Attendance Data', description: 'Clock-in/out, attendance records' },
];

// Helper function to get restriction value safely
const getRestrictionValue = (formData: MarkAsVIPDTO, key: RestrictionKey): boolean => {
  return Boolean(formData[key]);
};

export function VIPEmployeeForm({
  employeeId,
  employeeName,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: VIPEmployeeFormProps) {
  const [formData, setFormData] = useState<MarkAsVIPDTO>({
    isVip: initialData?.isVip ?? false,
    isRestricted: initialData?.isRestricted ?? false,
    restrictionLevel: initialData?.restrictionLevel ?? 'none',
    restrictionReason: initialData?.restrictionReason ?? '',
    allowedUserIds: initialData?.accessControl?.allowedUserIds ?? [],
    allowedRoleIds: initialData?.accessControl?.allowedRoleIds ?? [],
    allowedDepartmentIds: initialData?.accessControl?.allowedDepartmentIds ?? [],
    restrictCompensation: initialData?.accessControl?.restrictCompensation ?? true,
    restrictPersonalInfo: initialData?.accessControl?.restrictPersonalInfo ?? false,
    restrictPerformance: initialData?.accessControl?.restrictPerformance ?? false,
    restrictDocuments: initialData?.accessControl?.restrictDocuments ?? false,
    restrictTimeOff: initialData?.accessControl?.restrictTimeOff ?? false,
    restrictBenefits: initialData?.accessControl?.restrictBenefits ?? false,
    restrictAttendance: initialData?.accessControl?.restrictAttendance ?? false,
  });

  // Apply restriction level presets
  useEffect(() => {
    if (formData.isRestricted && formData.restrictionLevel) {
      const presets: Record<RestrictionLevel, Partial<MarkAsVIPDTO>> = {
        none: {
          restrictCompensation: false,
          restrictPersonalInfo: false,
          restrictPerformance: false,
          restrictDocuments: false,
          restrictTimeOff: false,
          restrictBenefits: false,
          restrictAttendance: false,
        },
        financial: {
          restrictCompensation: true,
          restrictPersonalInfo: false,
          restrictPerformance: false,
          restrictDocuments: false,
          restrictTimeOff: false,
          restrictBenefits: true,
          restrictAttendance: false,
        },
        full: {
          restrictCompensation: true,
          restrictPersonalInfo: false,
          restrictPerformance: true,
          restrictDocuments: true,
          restrictTimeOff: false,
          restrictBenefits: true,
          restrictAttendance: false,
        },
        executive: {
          restrictCompensation: true,
          restrictPersonalInfo: true,
          restrictPerformance: true,
          restrictDocuments: true,
          restrictTimeOff: true,
          restrictBenefits: true,
          restrictAttendance: true,
        },
      };
      
      if (presets[formData.restrictionLevel]) {
        setFormData(prev => ({ ...prev, ...presets[formData.restrictionLevel!] }));
      }
    }
  }, [formData.restrictionLevel, formData.isRestricted]);

  const handleVIPToggle = (isVip: boolean) => {
    setFormData(prev => ({
      ...prev,
      isVip,
      isRestricted: isVip ? prev.isRestricted : false,
      restrictionLevel: isVip ? prev.restrictionLevel : 'none',
    }));
  };

  const handleRestrictionToggle = () => {
    setFormData(prev => ({
      ...prev,
      isRestricted: !prev.isRestricted,
      restrictionLevel: !prev.isRestricted ? 'financial' : 'none',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Employee Info Header */}
      <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-full">
          <Crown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{employeeName}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Configure VIP status and access restrictions
          </p>
        </div>
      </div>

      {/* VIP Status Toggle */}
      <VIPStatusToggle
        isVip={formData.isVip}
        isRestricted={formData.isRestricted}
        onToggle={handleVIPToggle}
        disabled={isSubmitting}
      />

      {/* VIP Configuration - Only show if VIP is enabled */}
      {formData.isVip && (
        <>
          {/* Enable Restrictions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${formData.isRestricted ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  {formData.isRestricted ? (
                    <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900 dark:text-white">
                    Enable Access Restrictions
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Limit who can view this employee's sensitive data
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.isRestricted}
                onClick={handleRestrictionToggle}
                disabled={isSubmitting}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                  ${formData.isRestricted ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${formData.isRestricted ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          </div>

          {/* Restriction Level - Only show if restrictions enabled */}
          {formData.isRestricted && (
            <>
              {/* Restriction Level Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Restriction Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {RESTRICTION_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, restrictionLevel: level.value }))}
                      disabled={isSubmitting}
                      className={`
                        p-3 rounded-lg border text-left transition-all
                        ${formData.restrictionLevel === level.value
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-500'
                          : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600'
                        }
                        ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="font-medium text-slate-900 dark:text-white">{level.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {level.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Restriction Reason */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Reason for Restriction
                </label>
                <textarea
                  value={formData.restrictionReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, restrictionReason: e.target.value }))}
                  disabled={isSubmitting}
                  placeholder="e.g., C-level executive with sensitive compensation structure..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-slate-800 dark:text-white resize-none"
                />
              </div>

              {/* Data Type Restrictions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Data Access Restrictions
                  </label>
                </div>
                <div className="space-y-2">
                  {DATA_RESTRICTIONS.map((item) => {
                    const isRestricted = getRestrictionValue(formData, item.key);
                    return (
                      <label
                        key={item.key}
                        className={`
                          flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                          ${isRestricted
                            ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-700'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          {isRestricted ? (
                            <Lock className="w-4 h-4 text-orange-500" />
                          ) : (
                            <Unlock className="w-4 h-4 text-slate-400" />
                          )}
                          <div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {item.label}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isRestricted}
                          onChange={(e) => setFormData(prev => ({ ...prev, [item.key]: e.target.checked }))}
                          disabled={isSubmitting}
                          className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Info about access control */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium">Authorized Users</p>
                  <p className="text-xs mt-1">
                    By default, only HR managers and administrators can access restricted employee data.
                    Additional authorized users can be configured after saving.
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Crown className="w-4 h-4" />
              Save VIP Settings
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default VIPEmployeeForm;
