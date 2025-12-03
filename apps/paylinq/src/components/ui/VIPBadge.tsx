/**
 * VIP Badge Component for PayLinQ
 * Displays VIP status badge for workers/employees
 */

import { Crown } from 'lucide-react';

interface VIPBadgeProps {
  isVip: boolean;
  isRestricted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  tooltip?: string;
}

export function VIPBadge({
  isVip,
  isRestricted = false,
  size = 'md',
  showIcon = true,
  showLabel = true,
  tooltip = 'VIP Employee',
}: VIPBadgeProps) {
  if (!isVip) return null;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-semibold
        ${isRestricted 
          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
          : 'bg-gradient-to-r from-yellow-400 to-amber-400 text-amber-900'
        }
        ${sizeClasses[size]}
      `}
      title={tooltip}
    >
      {showIcon && <Crown className={iconSizes[size]} />}
      {showLabel && 'VIP'}
    </span>
  );
}

export default VIPBadge;
