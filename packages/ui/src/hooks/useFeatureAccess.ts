/**
 * useFeatureAccess Hook
 * 
 * React hook for checking feature access in tenant applications
 * Provides real-time feature availability with caching and automatic updates
 * 
 * @module @recruitiq/ui/hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RecruitIQPlatformAPI } from '@recruitiq/api-client';

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  config?: Record<string, any>;
  usage?: {
    current: number;
    limit: number | null;
    remaining: number | null;
    percentage?: number;
  };
}

export interface UseFeatureAccessReturn {
  /** Check if a specific feature is available */
  hasFeature: (featureKey: string) => boolean;
  
  /** Check a feature and get detailed result */
  checkFeature: (featureKey: string) => Promise<FeatureAccessResult>;
  
  /** All loaded features with their access status */
  features: Record<string, FeatureAccessResult>;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Manually refetch features */
  refetch: () => Promise<void>;
  
  /** Invalidate cache and force reload */
  invalidate: () => void;
}

export interface UseFeatureAccessOptions {
  /** Product slug (e.g., 'paylinq', 'recruitiq') */
  productSlug: string;
  
  /** API client instance (optional) */
  apiClient?: RecruitIQPlatformAPI;
  
  /** Auto-fetch features on mount */
  autoFetch?: boolean;
  
  /** Feature keys to pre-load */
  preloadFeatures?: string[];
  
  /** Cache duration in milliseconds (default: 60000 - 1 minute) */
  cacheDuration?: number;
}

/**
 * Hook for checking feature access
 * 
 * @example
 * ```tsx
 * const { hasFeature, features, isLoading } = useFeatureAccess({
 *   productSlug: 'paylinq'
 * });
 * 
 * if (hasFeature('advanced_formula_engine')) {
 *   return <FormulaBuilder />;
 * }
 * ```
 */
export function useFeatureAccess(options: UseFeatureAccessOptions): UseFeatureAccessReturn {
  const {
    productSlug,
    apiClient,
    autoFetch = true,
    preloadFeatures = [],
    cacheDuration = 60000 // 1 minute default
  } = options;

  const [api] = useState(() => {
    if (apiClient) return apiClient;
    
    const baseURL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) 
      || 'http://localhost:4000/api';
    
    return new RecruitIQPlatformAPI({ baseURL, timeout: 30000 });
  });

  const [features, setFeatures] = useState<Record<string, FeatureAccessResult>>({});
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  
  // Cache timestamps for each feature
  const cacheTimestamps = useRef<Record<string, number>>({});
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Fetch all available features for the organization
   */
  const fetchAllFeatures = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get(`/features`, {
        params: { productSlug }
      });

      if (!isMounted.current) return;

      if (response.data?.success && response.data?.features) {
        const { available, unavailable } = response.data.features;
        const featureMap: Record<string, FeatureAccessResult> = {};
        const now = Date.now();

        // Map available features
        available?.forEach((feature: any) => {
          featureMap[feature.key] = {
            hasAccess: true,
            config: feature.config,
            usage: feature.usage
          };
          cacheTimestamps.current[feature.key] = now;
        });

        // Map unavailable features
        unavailable?.forEach((feature: any) => {
          featureMap[feature.key] = {
            hasAccess: false,
            reason: feature.reason
          };
          cacheTimestamps.current[feature.key] = now;
        });

        setFeatures(featureMap);
      }
    } catch (err) {
      if (!isMounted.current) return;
      
      const error = err as Error;
      setError(error);
      console.error('Failed to fetch features:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [api, productSlug]);

  /**
   * Check a specific feature (with caching)
   */
  const checkFeature = useCallback(async (featureKey: string): Promise<FeatureAccessResult> => {
    // Check cache first
    const cachedResult = features[featureKey];
    const cacheTime = cacheTimestamps.current[featureKey];
    
    if (cachedResult && cacheTime && (Date.now() - cacheTime) < cacheDuration) {
      return cachedResult;
    }

    // Fetch from API
    try {
      const response = await api.get('/features/check', {
        params: { productSlug, featureKey }
      });

      if (response.data?.success) {
        const result: FeatureAccessResult = {
          hasAccess: response.data.hasAccess,
          reason: response.data.reason,
          config: response.data.config,
          usage: response.data.usage
        };

        // Update cache
        if (isMounted.current) {
          setFeatures(prev => ({
            ...prev,
            [featureKey]: result
          }));
          cacheTimestamps.current[featureKey] = Date.now();
        }

        return result;
      }

      throw new Error('Invalid API response');
    } catch (err) {
      const error = err as Error;
      console.error(`Failed to check feature ${featureKey}:`, error);
      
      // Return cached result if available, otherwise return no access
      return cachedResult || {
        hasAccess: false,
        reason: 'error'
      };
    }
  }, [api, productSlug, features, cacheDuration]);

  /**
   * Simple boolean check if feature is available
   */
  const hasFeature = useCallback((featureKey: string): boolean => {
    return features[featureKey]?.hasAccess ?? false;
  }, [features]);

  /**
   * Manually refetch all features
   */
  const refetch = useCallback(async () => {
    await fetchAllFeatures();
  }, [fetchAllFeatures]);

  /**
   * Invalidate cache and force reload
   */
  const invalidate = useCallback(() => {
    cacheTimestamps.current = {};
    setFeatures({});
    fetchAllFeatures();
  }, [fetchAllFeatures]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchAllFeatures();
    }
  }, [autoFetch, fetchAllFeatures]);

  // Preload specific features
  useEffect(() => {
    if (preloadFeatures.length > 0 && !isLoading) {
      Promise.all(preloadFeatures.map(key => checkFeature(key)))
        .catch(err => console.error('Failed to preload features:', err));
    }
  }, [preloadFeatures, isLoading, checkFeature]);

  return {
    hasFeature,
    checkFeature,
    features,
    isLoading,
    error,
    refetch,
    invalidate
  };
}

export default useFeatureAccess;
