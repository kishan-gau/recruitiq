import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

interface DashboardSummaryCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'blue' | 'green' | 'yellow' | 'purple';
  className?: string;
}

export default function DashboardSummaryCard({
  title,
  value,
  icon,
  trend,
  variant = 'blue',
  className,
}: DashboardSummaryCardProps) {
  const variantClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
  };

  const trendColor = trend && trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const TrendIcon = trend && trend.value >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className={clsx('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          
          {trend && (
            <div className={clsx('mt-2 flex items-center space-x-1 text-sm font-medium', trendColor)}>
              <TrendIcon className="w-4 h-4" />
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500 dark:text-gray-400 font-normal">{trend.label}</span>
            </div>
          )}
        </div>

        <div className={clsx('w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center', variantClasses[variant])}>
          <div className="w-6 h-6 text-white">{icon}</div>
        </div>
      </div>
    </div>
  );
}
