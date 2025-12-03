/**
 * VIP Status Toggle Component
 * Toggle switch for enabling/disabling VIP status
 */

import { Crown, Shield, ShieldOff } from 'lucide-react';

interface VIPStatusToggleProps {
  isVip: boolean;
  isRestricted?: boolean;
  onToggle: (isVip: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function VIPStatusToggle({
  isVip,
  isRestricted = false,
  onToggle,
  disabled = false,
  loading = false,
}: VIPStatusToggleProps) {
  const handleToggle = () => {
    if (!disabled && !loading) {
      onToggle(!isVip);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
      <div className={`p-2 rounded-full ${isVip ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
        <Crown className={`w-6 h-6 ${isVip ? 'text-amber-500' : 'text-slate-400'}`} />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-900 dark:text-white">
            VIP Employee Status
          </label>
          {isVip && isRestricted && (
            <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
              <Shield className="w-3 h-3" />
              Restricted
            </span>
          )}
          {isVip && !isRestricted && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <ShieldOff className="w-3 h-3" />
              Unrestricted
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isVip 
            ? 'This employee has VIP status with special access considerations'
            : 'Enable VIP status for executives, board members, or sensitive personnel'
          }
        </p>
      </div>
      
      <button
        type="button"
        role="switch"
        aria-checked={isVip}
        aria-label="Toggle VIP status"
        onClick={handleToggle}
        disabled={disabled || loading}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
          ${isVip ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}
          ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${isVip ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}

export default VIPStatusToggle;
