import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';

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
  conversions: (type?: string, id?: string) => 
    [...currencyKeys.all, 'conversions', type, id] as const,
  config: () => [...currencyKeys.all, 'config'] as const,
  cacheStats: () => [...currencyKeys.all, 'cache', 'stats'] as const,
};

// Hook for exchange rates
export function useExchangeRates() {
  const { paylinq } = usePaylinqAPI();
  
  return useQuery({
    queryKey: currencyKeys.rates(),
    queryFn: async () => {
      const response = await paylinq.getExchangeRates();
      return (response.data.data || []) as ExchangeRate[];
    },
  });
}

// Hook for current exchange rate
export function useCurrentExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  date?: string
) {
  const { paylinq } = usePaylinqAPI();
  
  return useQuery({
    queryKey: currencyKeys.rate(fromCurrency, toCurrency, date),
    queryFn: async () => {
      const params: any = { fromCurrency, toCurrency };
      if (date) params.date = date;
      const response = await paylinq.getExchangeRates(params);
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
  const { paylinq } = usePaylinqAPI();
  
  return useQuery({
    queryKey: [...currencyKeys.historical(fromCurrency, toCurrency), options],
    queryFn: async () => {
      const params = {
        fromCurrency,
        toCurrency,
        ...options,
      };
      const response = await paylinq.getExchangeRateHistory(params);
      return response.data.data as ExchangeRate[];
    },
    enabled: !!fromCurrency && !!toCurrency,
  });
}

// Hook for creating exchange rate
export function useCreateExchangeRate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ExchangeRate>) => {
      const response = await paylinq.createExchangeRate(data);
      return response.data.data as ExchangeRate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.rates() });
    },
  });
}

// Hook for updating exchange rate
export function useUpdateExchangeRate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExchangeRate> }) => {
      const response = await paylinq.updateExchangeRate(id.toString(), data);
      return response.data.data as ExchangeRate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.rates() });
    },
  });
}

// Hook for deleting exchange rate
export function useDeleteExchangeRate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await paylinq.deleteExchangeRate(id.toString());
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.rates() });
    },
  });
}

// Hook for bulk importing rates
export function useBulkImportRates() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rates: Partial<ExchangeRate>[]) => {
      const response = await paylinq.bulkImportExchangeRates(rates);
      return response.data.data as ExchangeRate[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.rates() });
    },
  });
}

// Hook for currency conversion
export function useCurrencyConversion() {
  const { paylinq } = usePaylinqAPI();
  
  return useMutation({
    mutationFn: async (data: ConversionRequest) => {
      const response = await paylinq.convertCurrency({
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        amount: data.amount,
        asOfDate: data.date,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
      });
      return response.data.data as ConversionResult;
    },
  });
}

// Hook for conversion history
export function useConversionHistory(referenceType?: string, referenceId?: string) {
  const { paylinq } = usePaylinqAPI();
  
  return useQuery({
    queryKey: currencyKeys.conversions(referenceType, referenceId),
    queryFn: async () => {
      const params: any = {};
      if (referenceType) params.referenceType = referenceType;
      if (referenceId) params.referenceId = referenceId;
      const response = await paylinq.getConversionHistory(params);
      return response.data.data as CurrencyConversion[];
    },
    enabled: !!referenceType && !!referenceId,
  });
}

// Hook for organization currency config
export function useCurrencyConfig() {
  const { paylinq } = usePaylinqAPI();
  
  return useQuery({
    queryKey: currencyKeys.config(),
    queryFn: async () => {
      const response = await paylinq.getCurrencyConfig();
      return (response.data.data || {}) as OrganizationCurrencyConfig;
    },
  });
}

// Hook for updating currency config
export function useUpdateCurrencyConfig() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<OrganizationCurrencyConfig>) => {
      const response = await paylinq.updateCurrencyConfig(data);
      return response.data.data as OrganizationCurrencyConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.config() });
    },
  });
}

// Hook for cache statistics
export function useCacheStats() {
  const { paylinq } = usePaylinqAPI();
  
  return useQuery({
    queryKey: currencyKeys.cacheStats(),
    queryFn: async () => {
      const response = await paylinq.getCacheStats();
      return response.data.data || {};
    },
    enabled: false, // Disabled by default since it requires admin permission
  });
}

// Hook for clearing cache
export function useClearCache() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await paylinq.clearCurrencyCache();
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
