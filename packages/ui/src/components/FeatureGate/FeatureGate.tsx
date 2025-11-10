import React from 'react';
import { useFeatureGate } from '../../hooks/useFeatureGate';

export interface FeatureGateProps {
  /**
   * The product slug to check feature access for
   */
  productSlug: string;

  /**
   * The feature key to check
   */
  featureKey: string;

  /**
   * Content to render when the feature is allowed
   */
  children: React.ReactNode;

  /**
   * Content to render when the feature is denied or loading
   * If not provided, nothing will be rendered
   */
  fallback?: React.ReactNode;

  /**
   * Whether to automatically show an upgrade prompt when denied
   * @default false
   */
  showUpgradePrompt?: boolean;

  /**
   * Callback when feature access is denied
   */
  onBlocked?: (reason: string) => void;

  /**
   * Callback when feature access is allowed
   */
  onAllowed?: () => void;

  /**
   * Show loading state while checking access
   * @default false
   */
  showLoading?: boolean;

  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;
}

/**
 * FeatureGate component conditionally renders children based on feature access.
 * Use this to wrap features that should only be visible to users with access.
 * 
 * @example
 * ```tsx
 * <FeatureGate 
 *   productSlug="nexus" 
 *   featureKey="advanced_analytics"
 *   fallback={<UpgradePrompt feature="Advanced Analytics" />}
 * >
 *   <AdvancedAnalyticsDashboard />
 * </FeatureGate>
 * ```
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  productSlug,
  featureKey,
  children,
  fallback,
  showUpgradePrompt = false,
  onBlocked,
  onAllowed,
  showLoading = false,
  loadingComponent,
}) => {
  const { isAllowed, isLoading, reason } = useFeatureGate({
    productSlug,
    featureKey,
    onBlocked,
    onAllowed,
  });

  // Show loading state
  if (isLoading && showLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <div className="flex items-center justify-center p-4">
        <svg
          className="animate-spin h-5 w-5 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  // Feature is allowed - render children
  if (isAllowed) {
    return <>{children}</>;
  }

  // Feature is denied - render fallback or upgrade prompt
  if (showUpgradePrompt && !fallback) {
    // Auto-import UpgradePrompt would be used here if needed
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">This feature requires an upgrade.</p>
        {reason && <p className="text-xs mt-1">{reason}</p>}
      </div>
    );
  }

  return <>{fallback || null}</>;
};

FeatureGate.displayName = 'FeatureGate';
