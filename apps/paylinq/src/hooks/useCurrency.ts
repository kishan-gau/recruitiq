import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/apiClient';

// Types
export interface ExchangeRate {
  id: number;
  organization_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source: 'manual' | 'api' | 'system';
  source_provider?: string;
  effective_from: string;
  effective_to?: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface CurrencyConversion {
  id: number;
  organization_id: string;
  reference_type: string;
  reference_id: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  exchange_rate_id: number;
  rate_used: number;
  rounding_method: string;
  conversion_date: string;
  created_by: string;
}

export interface OrganizationCurrencyConfig {
  id: number;
  organization_id: string;
  base_currency: string;
  supported_currencies: string[];
  auto_update_rates: boolean;
  rate_update_frequency?: string;
  default_rate_source?: string;
  allow_manual_rates: boolean;
  require_rate_approval: boolean;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface ConversionRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  date?: string;
  roundingMethod?: 'up' | 'down' | 'half_up' | 'half_down' | 'half_even';
  decimalPlaces?: number;
  referenceType?: string;
  referenceId?: string;
  logConversion?: boolean;
}

export interface ConversionResult {
  fromAmount: number;
  toAmount: number;
  rate: number;
  fromCurrency: string;
  toCurrency: string;
  conversionDate: string;
  roundingMethod: string;
  decimalPlaces: number;
}

// Query keys
export const currencyKeys = {
  all: ['currency'] as const,
  rates: () => [...currencyKeys.all, 'rates'] as const,
  rate: (from: string, to: string, date?: string) => 
    [...currencyKeys.rates(), from, to, date] as const,
  historical: (from: string, to: string) => 
    [...currencyKeys.rates(), 'historical', from, to] as const,
  conversions: (type: string, id: string) => 
    [...currencyKeys.all, 'conversions', type, id] as const,
  config: () => [...currencyKeys.all, 'config'] as const,
  cacheStats: () => [...currencyKeys.all, 'cache', 'stats'] as const,
};

// Hook for exchange rates
export function useExchangeRates() {
  return useQuery({
    queryKey: currencyKeys.rates(),
    queryFn: async () => {
      const response = await apiClient.get('/currency/');
      return response.data.data as ExchangeRate[];
    },
  });
}

// Hook for current exchange rate
export function useCurrentExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date?: string
) {
  return useQuery({
    queryKey: currencyKeys.rate(fromCurrency, toCurrency, date),
    queryFn: async () => {
      const url = `/currency/current/${fromCurrency}/${toCurrency}`;
      const params = date ? { date } : {};
      const response = await apiClient.get(url, { params });
      return response.data.data as ExchangeRate;
    },
    enabled: !!fromCurrency && !!toCurrency,
  });
}

// Hook for historical exchange rates
export function useHistoricalExchangeRates(
  fromCurrency: string,
  toCurrency: string,
  options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
) {
  return useQuery({
    queryKey: [...currencyKeys.historical(fromCurrency, toCurrency), options],
    queryFn: async () => {
      const url = `/currency/historical/${fromCurrency}/${toCurrency}`;
      const response = await apiClient.get(url, { params: options });
      return response.data.data as ExchangeRate[];
    },
    enabled: !!fromCurrency && !!toCurrency,
  });
}

// Hook for creating exchange rate
export function useCreateExchangeRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ExchangeRate>) => {
      const response = await apiClient.post('/currency/', data);
      return response.data.data as ExchangeRate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.rates() });
    },
  });
}

// Hook for updating exchange rate
export function useUpdateExchangeRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExchangeRate> }) => {
      const response = await apiClient.put(`/currency/${id}`, data);
      return response.data.data as ExchangeRate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.rates() });
    },
  });
}

// Hook for deleting exchange rate
export function useDeleteExchangeRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/currency/${id}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.rates() });
    },
  });
}

// Hook for bulk importing rates
export function useBulkImportRates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rates: Partial<ExchangeRate>[]) => {
      const response = await apiClient.post('/currency/bulk-import', { rates });
      return response.data.data as ExchangeRate[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.rates() });
    },
  });
}

// Hook for currency conversion
export function useCurrencyConversion() {
  return useMutation({
    mutationFn: async (data: ConversionRequest) => {
      const response = await apiClient.post('/currency/convert', data);
      return response.data.data as ConversionResult;
    },
  });
}

// Hook for conversion history
export function useConversionHistory(referenceType: string, referenceId: string) {
  return useQuery({
    queryKey: currencyKeys.conversions(referenceType, referenceId),
    queryFn: async () => {
      const url = `/currency/conversions/${referenceType}/${referenceId}`;
      const response = await apiClient.get(url);
      return response.data.data as CurrencyConversion[];
    },
    enabled: !!referenceType && !!referenceId,
  });
}

// Hook for organization currency config
export function useCurrencyConfig() {
  return useQuery({
    queryKey: currencyKeys.config(),
    queryFn: async () => {
      const response = await apiClient.get('/currency/config');
      return response.data.data as OrganizationCurrencyConfig;
    },
  });
}

// Hook for updating currency config
export function useUpdateCurrencyConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<OrganizationCurrencyConfig>) => {
      const response = await apiClient.put('/currency/config', data);
      return response.data.data as OrganizationCurrencyConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.config() });
    },
  });
}

// Hook for cache statistics
export function useCacheStats() {
  return useQuery({
    queryKey: currencyKeys.cacheStats(),
    queryFn: async () => {
      const response = await apiClient.get('/currency/cache/stats');
      return response.data.data;
    },
  });
}

// Hook for clearing cache
export function useClearCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/currency/cache/clear');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.all });
    },
  });
}

// Combined hook for all currency operations
export function useCurrency() {
  const [selectedFromCurrency, setSelectedFromCurrency] = useState<string>('USD');
  const [selectedToCurrency, setSelectedToCurrency] = useState<string>('SRD');

  const rates = useExchangeRates();
  const currentRate = useCurrentExchangeRate(selectedFromCurrency, selectedToCurrency);
  const config = useCurrencyConfig();
  const createRate = useCreateExchangeRate();
  const updateRate = useUpdateExchangeRate();
  const deleteRate = useDeleteExchangeRate();
  const convert = useCurrencyConversion();
  const updateConfig = useUpdateCurrencyConfig();

  const selectCurrencyPair = useCallback((from: string, to: string) => {
    setSelectedFromCurrency(from);
    setSelectedToCurrency(to);
  }, []);

  return {
    // Data
    rates: rates.data || [],
    currentRate: currentRate.data,
    config: config.data,
    
    // Loading states
    isLoadingRates: rates.isLoading,
    isLoadingCurrentRate: currentRate.isLoading,
    isLoadingConfig: config.isLoading,
    
    // Mutations
    createRate: createRate.mutate,
    updateRate: updateRate.mutate,
    deleteRate: deleteRate.mutate,
    convert: convert.mutate,
    updateConfig: updateConfig.mutate,
    
    // Mutation states
    isCreating: createRate.isPending,
    isUpdating: updateRate.isPending,
    isDeleting: deleteRate.isPending,
    isConverting: convert.isPending,
    
    // Selection
    selectedFromCurrency,
    selectedToCurrency,
    selectCurrencyPair,
    
    // Refresh
    refetch: () => {
      rates.refetch();
      currentRate.refetch();
      config.refetch();
    },
  };
}
