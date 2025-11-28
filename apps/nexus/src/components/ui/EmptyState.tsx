import { FileX, Search, PackageOpen, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'file' | 'search' | 'package' | 'alert';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const iconComponents = {
  file: FileX,
  search: Search,
  package: PackageOpen,
  alert: AlertCircle,
};

export default function EmptyState({
  icon = 'package',
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  const IconComponent = iconComponents[icon];

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 mb-4">
        <IconComponent className="h-12 w-12 text-gray-400 dark:text-gray-500" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
