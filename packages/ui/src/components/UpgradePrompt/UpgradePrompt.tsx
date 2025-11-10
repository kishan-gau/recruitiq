import React from 'react';
import { clsx } from 'clsx';
import { Card, CardHeader, CardContent, CardFooter } from '../Card';
import { Button } from '../Button';

export interface UpgradePromptProps {
  /**
   * The name of the feature that requires an upgrade
   */
  featureName: string;

  /**
   * Optional description of the feature
   */
  description?: string;

  /**
   * The tier required to access this feature
   */
  requiredTier?: string;

  /**
   * The user's current tier
   */
  currentTier?: string;

  /**
   * Callback when the upgrade button is clicked
   */
  onUpgrade?: () => void;

  /**
   * Callback when the dismiss button is clicked
   */
  onDismiss?: () => void;

  /**
   * Custom upgrade button text
   * @default "Upgrade Now"
   */
  upgradeButtonText?: string;

  /**
   * Show a dismiss button
   * @default true
   */
  showDismiss?: boolean;

  /**
   * Display variant
   * @default "card"
   */
  variant?: 'card' | 'banner' | 'inline';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Icon to display
   */
  icon?: React.ReactNode;

  /**
   * List of benefits included in the upgrade
   */
  benefits?: string[];
}

/**
 * UpgradePrompt component displays a call-to-action for users to upgrade
 * when they attempt to access a premium feature.
 * 
 * @example
 * ```tsx
 * <UpgradePrompt
 *   featureName="Advanced Analytics"
 *   description="Get detailed insights into your recruitment pipeline"
 *   requiredTier="Professional"
 *   currentTier="Starter"
 *   onUpgrade={() => navigate('/billing/upgrade')}
 *   benefits={[
 *     'Real-time analytics dashboard',
 *     'Custom report builder',
 *     'Export to CSV/PDF'
 *   ]}
 * />
 * ```
 */
export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  featureName,
  description,
  requiredTier,
  currentTier,
  onUpgrade,
  onDismiss,
  upgradeButtonText = 'Upgrade Now',
  showDismiss = true,
  variant = 'card',
  className,
  icon,
  benefits,
}) => {
  const defaultIcon = (
    <svg
      className="w-12 h-12 text-primary-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );

  // Banner variant - compact horizontal layout
  if (variant === 'banner') {
    return (
      <div
        className={clsx(
          'flex items-center justify-between gap-4 p-4 bg-primary-50 border border-primary-200 rounded-lg dark:bg-primary-950 dark:border-primary-800',
          className
        )}
      >
        <div className="flex items-center gap-3 flex-1">
          {icon || (
            <svg
              className="w-6 h-6 text-primary-600 dark:text-primary-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {featureName} requires {requiredTier || 'an upgrade'}
            </p>
            {description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={onUpgrade}>
            {upgradeButtonText}
          </Button>
          {showDismiss && onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Inline variant - minimal text-based
  if (variant === 'inline') {
    return (
      <div className={clsx('text-sm text-gray-600 dark:text-gray-400', className)}>
        <p>
          <strong className="text-gray-900 dark:text-gray-100">{featureName}</strong> is
          available on the{' '}
          <strong className="text-primary-600 dark:text-primary-400">
            {requiredTier || 'premium'}
          </strong>{' '}
          plan.{' '}
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="text-primary-600 hover:text-primary-700 underline dark:text-primary-400 dark:hover:text-primary-300"
            >
              {upgradeButtonText}
            </button>
          )}
        </p>
      </div>
    );
  }

  // Card variant - full featured layout (default)
  return (
    <Card variant="outlined" padding="lg" className={clsx('max-w-md', className)}>
      <div className="text-center">
        <div className="flex justify-center mb-4">{icon || defaultIcon}</div>

        <CardHeader
          title={`Unlock ${featureName}`}
          subtitle={description}
          className="text-center mb-4"
        />

        {currentTier && requiredTier && (
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Current Plan
              </p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {currentTier}
              </p>
            </div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Required Plan
              </p>
              <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                {requiredTier}
              </p>
            </div>
          </div>
        )}

        {benefits && benefits.length > 0 && (
          <CardContent>
            <ul className="text-left space-y-2 mb-4">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        )}

        <CardFooter align="center">
          <Button variant="primary" fullWidth onClick={onUpgrade}>
            {upgradeButtonText}
          </Button>
          {showDismiss && onDismiss && (
            <Button variant="ghost" fullWidth onClick={onDismiss}>
              Maybe Later
            </Button>
          )}
        </CardFooter>
      </div>
    </Card>
  );
};

UpgradePrompt.displayName = 'UpgradePrompt';
