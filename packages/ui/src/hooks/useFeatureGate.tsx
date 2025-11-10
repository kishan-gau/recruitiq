/**
 * useFeatureGate Hook
 * 
 * React hook for conditionally rendering components based on feature access
 * Provides a declarative way to gate features with upgrade prompts
 * 
 * @module @recruitiq/ui/hooks
 */

import { useEffect, ReactNode } from 'react';
import { useFeatureAccess, FeatureAccessResult } from './useFeatureAccess';

export interface UseFeatureGateOptions {
  /** Product slug */
  productSlug: string;
  
  /** Feature key to check */
  featureKey: string;
  
  /** Fallback content when feature is not available */
  fallback?: ReactNode;
  
  /** Callback when feature is blocked */
  onBlocked?: (reason: string, feature?: FeatureAccessResult) => void;
  
  /** Callback when feature is available */
  onAllowed?: (feature: FeatureAccessResult) => void;
  
  /** Show upgrade prompt automatically (default: false) */
  showUpgradePrompt?: boolean;
}

export interface UseFeatureGateReturn {
  /** Whether the feature is allowed */
  isAllowed: boolean;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Access denial reason */
  reason?: string;
  
  /** Full feature access result */
  result?: FeatureAccessResult;
  
  /** Component wrapper that shows/hides based on access */
  FeatureGate: React.FC<{ children: ReactNode }>;
}

/**
 * Hook for feature gating with callbacks and conditional rendering
 * 
 * @example
 * ```tsx
 * const { isAllowed, FeatureGate } = useFeatureGate({
 *   productSlug: 'paylinq',
 *   featureKey: 'advanced_formula_engine',
 *   onBlocked: (reason) => {
 *     toast.error(`Feature not available: ${reason}`);
 *   }
 * });
 * 
 * return (
 *   <FeatureGate fallback={<UpgradePrompt />}>
 *     <FormulaBuilder />
 *   </FeatureGate>
 * );
 * ```
 */
export function useFeatureGate(options: UseFeatureGateOptions): UseFeatureGateReturn {
  const {
    productSlug,
    featureKey,
    fallback,
    onBlocked,
    onAllowed,
    showUpgradePrompt = false
  } = options;

  const { hasFeature, features, isLoading, checkFeature } = useFeatureAccess({
    productSlug,
    preloadFeatures: [featureKey],
    autoFetch: true
  });

  const isAllowed = hasFeature(featureKey);
  const result = features[featureKey];

  // Call callbacks when access changes
  useEffect(() => {
    if (isLoading) return;

    if (isAllowed && result && onAllowed) {
      onAllowed(result);
    } else if (!isAllowed && onBlocked) {
      onBlocked(result?.reason || 'no_access', result);
    }
  }, [isAllowed, isLoading, result, onAllowed, onBlocked]);

  /**
   * Component wrapper for conditional rendering
   */
  const FeatureGate: React.FC<{ children: ReactNode }> = ({ children }) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) as any;
    }

    if (!isAllowed) {
      if (fallback) {
        return fallback as any;
      }

      if (showUpgradePrompt) {
        // Return upgrade prompt component
        // Note: This would need to be imported from the components package
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <p className="text-gray-600">This feature is not available in your current plan.</p>
            <button className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
              Upgrade Now
            </button>
          </div>
        ) as any;
      }

      return null;
    }

    return children as any;
  };

  return {
    isAllowed,
    isLoading,
    reason: result?.reason,
    result,
    FeatureGate
  };
}

export default useFeatureGate;
