import React from 'react';
import { clsx } from 'clsx';

export interface FeatureUsageIndicatorProps {
  /**
   * Current usage count
   */
  usage: number;

  /**
   * Maximum usage limit
   */
  limit: number;

  /**
   * The name of the feature or resource being tracked
   */
  featureName?: string;

  /**
   * Display variant
   * @default "bar"
   */
  variant?: 'bar' | 'circular' | 'text';

  /**
   * Size of the indicator
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Show percentage text
   * @default true
   */
  showPercentage?: boolean;

  /**
   * Show usage count text
   * @default true
   */
  showCount?: boolean;

  /**
   * Show warning when approaching limit
   * @default true
   */
  showWarning?: boolean;

  /**
   * Percentage threshold for warning state (0-100)
   * @default 80
   */
  warningThreshold?: number;

  /**
   * Callback when usage reaches the limit
   */
  onLimitReached?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * FeatureUsageIndicator component displays usage progress for limited features.
 * Shows visual feedback when approaching or exceeding usage limits.
 * 
 * @example
 * ```tsx
 * <FeatureUsageIndicator
 *   usage={750}
 *   limit={1000}
 *   featureName="API Calls"
 *   variant="bar"
 *   showWarning={true}
 * />
 * ```
 */
export const FeatureUsageIndicator: React.FC<FeatureUsageIndicatorProps> = ({
  usage,
  limit,
  featureName,
  variant = 'bar',
  size = 'md',
  showPercentage = true,
  showCount = true,
  showWarning = true,
  warningThreshold = 80,
  onLimitReached,
  className,
}) => {
  const percentage = Math.min((usage / limit) * 100, 100);
  const isWarning = showWarning && percentage >= warningThreshold && percentage < 100;
  const isExceeded = usage >= limit;

  // Trigger callback when limit is reached
  React.useEffect(() => {
    if (isExceeded && onLimitReached) {
      onLimitReached();
    }
  }, [isExceeded, onLimitReached]);

  const getStatusColor = () => {
    if (isExceeded) return 'danger';
    if (isWarning) return 'warning';
    return 'success';
  };

  const statusColor = getStatusColor();

  const colorClasses = {
    success: {
      bg: 'bg-green-500 dark:bg-green-600',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-500 dark:border-green-600',
    },
    warning: {
      bg: 'bg-yellow-500 dark:bg-yellow-600',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-500 dark:border-yellow-600',
    },
    danger: {
      bg: 'bg-red-500 dark:bg-red-600',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-500 dark:border-red-600',
    },
  };

  const sizeClasses = {
    sm: { height: 'h-1', text: 'text-xs', circular: 'w-12 h-12' },
    md: { height: 'h-2', text: 'text-sm', circular: 'w-16 h-16' },
    lg: { height: 'h-3', text: 'text-base', circular: 'w-20 h-20' },
  };

  // Text-only variant
  if (variant === 'text') {
    return (
      <div className={clsx('inline-flex items-center gap-2', className)}>
        {featureName && (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {featureName}:
          </span>
        )}
        <span className={clsx('font-medium', sizeClasses[size].text, colorClasses[statusColor].text)}>
          {usage.toLocaleString()} / {limit.toLocaleString()}
        </span>
        {showPercentage && (
          <span className={clsx('text-xs', colorClasses[statusColor].text)}>
            ({percentage.toFixed(0)}%)
          </span>
        )}
      </div>
    );
  }

  // Circular progress variant
  if (variant === 'circular') {
    const circleSize = parseInt(sizeClasses[size].circular.split(' ')[0].replace('w-', '')) * 4; // Convert to pixels
    const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className={clsx('inline-flex flex-col items-center gap-2', className)}>
        <div className="relative" style={{ width: circleSize, height: circleSize }}>
          <svg className="transform -rotate-90" width={circleSize} height={circleSize}>
            {/* Background circle */}
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={clsx('transition-all duration-300', colorClasses[statusColor].text)}
            />
          </svg>
          {showPercentage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={clsx(
                  'font-semibold',
                  sizeClasses[size].text,
                  colorClasses[statusColor].text
                )}
              >
                {percentage.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        {showCount && (
          <div className="text-center">
            {featureName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                {featureName}
              </p>
            )}
            <p className={clsx('font-medium', sizeClasses[size].text)}>
              {usage.toLocaleString()} / {limit.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Bar progress variant (default)
  return (
    <div className={clsx('w-full', className)}>
      {(featureName || showCount) && (
        <div className="flex items-center justify-between mb-1">
          {featureName && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {featureName}
            </span>
          )}
          {showCount && (
            <span className={clsx('font-medium', sizeClasses[size].text)}>
              {usage.toLocaleString()} / {limit.toLocaleString()}
            </span>
          )}
        </div>
      )}

      <div className="relative">
        {/* Background bar */}
        <div
          className={clsx(
            'w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden',
            sizeClasses[size].height
          )}
        >
          {/* Progress bar */}
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-300',
              colorClasses[statusColor].bg
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {showPercentage && (
          <div className="flex items-center justify-end mt-1">
            <span
              className={clsx(
                'text-xs font-medium',
                colorClasses[statusColor].text
              )}
            >
              {percentage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Warning/Error messages */}
      {isExceeded && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          Usage limit reached. Please upgrade to continue.
        </p>
      )}
      {isWarning && !isExceeded && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
          Approaching usage limit ({percentage.toFixed(0)}% used)
        </p>
      )}
    </div>
  );
};

FeatureUsageIndicator.displayName = 'FeatureUsageIndicator';
