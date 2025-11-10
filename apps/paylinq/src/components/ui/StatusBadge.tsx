import clsx from 'clsx';
import { getStatusColor } from '@/utils/helpers';

interface StatusBadgeProps {
  status?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const displayStatus = status || 'inactive';

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        getStatusColor(status),
        sizeClasses[size],
        className
      )}
    >
      {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
    </span>
  );
}
