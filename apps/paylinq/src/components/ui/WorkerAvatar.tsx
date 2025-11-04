import { getInitials } from '@/utils/helpers';
import clsx from 'clsx';

interface WorkerAvatarProps {
  fullName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function WorkerAvatar({ fullName, size = 'md', className }: WorkerAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const initials = getInitials(fullName);

  return (
    <div
      className={clsx(
        'rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      <span className="font-semibold text-white">{initials}</span>
    </div>
  );
}
