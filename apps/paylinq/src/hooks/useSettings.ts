/**
 * Settings & Configuration Hooks
 * 
 * Custom React Query hooks for Paylinq settings and system configuration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import type {
  PaylinqSettings,
  PayPeriodConfig,
  TaxConfiguration,
  UpdateSettingsRequest,
  UpdatePayPeriodConfigRequest,
  UpdateTaxConfigRequest,
} from '@recruitiq/types';

// Query keys
const SETTINGS_KEY = ['settings'];
const PAY_PERIOD_CONFIG_KEY = ['payPeriodConfig'];
const TAX_CONFIG_KEY = ['taxConfig'];

// ============================================================================
// Settings Queries
// ============================================================================

/**
 * Hook to fetch Paylinq settings
 */
export function useSettings() {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const response = await paylinq.getSettings();
      return response.settings;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - settings change infrequently
  });
}

/**
 * Hook to fetch pay period configuration
 */
export function usePayPeriodConfig() {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: PAY_PERIOD_CONFIG_KEY,
    queryFn: async () => {
      const response = await paylinq.getPayPeriodConfig();
      return response.payPeriodConfig;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch tax configuration
 */
export function useTaxConfig() {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: TAX_CONFIG_KEY,
    queryFn: async () => {
      const response = await paylinq.getTaxConfig();
      return response.taxConfig;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Settings Mutations
// ============================================================================

/**
 * Hook to update Paylinq settings
 */
export function useUpdateSettings() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateSettingsRequest) => {
      const response = await paylinq.updateSettings(data);
      return response.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      success('Settings updated successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update settings');
    },
  });
}

/**
 * Hook to update pay period configuration
 */
export function useUpdatePayPeriodConfig() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: UpdatePayPeriodConfigRequest) => {
      const response = await paylinq.updatePayPeriodConfig(data);
      return response.payPeriodConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAY_PERIOD_CONFIG_KEY });
      success('Pay period configuration updated successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update pay period configuration');
    },
  });
}

/**
 * Hook to update tax configuration
 */
export function useUpdateTaxConfig() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateTaxConfigRequest) => {
      const response = await paylinq.updateTaxConfig(data);
      return response.taxConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAX_CONFIG_KEY });
      success('Tax configuration updated successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update tax configuration');
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to check if Paylinq is configured
 */
export function useIsPaylinqConfigured() {
  const { data: settings, isLoading } = useSettings();
  
  return {
    isConfigured: settings?.isConfigured || false,
    settings,
    isLoading,
  };
}

/**
 * Hook to get current pay period dates
 */
export function useCurrentPayPeriod() {
  const { data: config, isLoading } = usePayPeriodConfig();
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAY_PERIOD_CONFIG_KEY, 'current'],
    queryFn: async () => {
      const response = await paylinq.getCurrentPayPeriod();
      return response.payPeriod;
    },
    enabled: !isLoading && !!config,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get next pay period dates
 */
export function useNextPayPeriod() {
  const { data: config, isLoading } = usePayPeriodConfig();
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAY_PERIOD_CONFIG_KEY, 'next'],
    queryFn: async () => {
      const response = await paylinq.getNextPayPeriod();
      return response.payPeriod;
    },
    enabled: !isLoading && !!config,
    staleTime: 5 * 60 * 1000,
  });
}
