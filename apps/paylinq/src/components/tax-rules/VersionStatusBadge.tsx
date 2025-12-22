import React from 'react';
import { Check as CheckIcon, Clock as ClockIcon, Tag as TagIcon, AlertTriangle as ExclamationTriangleIcon } from 'lucide-react';

interface VersionStatusBadgeProps {
  status: 'draft' | 'published' | 'archived' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const VersionStatusBadge: React.FC<VersionStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'published':
        return {
          icon: CheckIcon,
          text: 'Published',
          classes: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'draft':
        return {
          icon: ClockIcon,
          text: 'Draft',
          classes: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'archived':
        return {
          icon: ExclamationTriangleIcon,
          text: 'Archived',
          classes: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      case 'pending':
        return {
          icon: TagIcon,
          text: 'Pending',
          classes: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      default:
        return {
          icon: ClockIcon,
          text: 'Unknown',
          classes: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs';
      case 'md':
        return 'px-2.5 py-0.5 text-xs';
      case 'lg':
        return 'px-3 py-1 text-sm';
      default:
        return 'px-2.5 py-0.5 text-xs';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'md':
        return 'w-3 h-3';
      case 'lg':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <span 
      className={`
        inline-flex items-center font-medium rounded-full border
        ${getSizeClasses()}
        ${config.classes}
        ${className}
      `}
    >
      {showIcon && (
        <IconComponent className={`${getIconSize()} ${size === 'lg' ? 'mr-1.5' : 'mr-1'}`} />
      )}
      {config.text}
    </span>
  );
};

export default VersionStatusBadge;