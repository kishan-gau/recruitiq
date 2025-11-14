# Multi-Currency UI/UX Requirements

**Version:** 2.0  
**Date:** November 13, 2025  
**Dependencies:** API Design (04-api-design.md)

---

## Overview

User interface and user experience requirements for multi-currency support in PayLinQ, aligned with existing design patterns and component library.

---

## Design Principles

1. **Consistency:** Use existing UI components from `packages/ui`
2. **Clarity:** Currency always visible, never ambiguous
3. **Progressive Disclosure:** Advanced features hidden until needed
4. **Mobile Responsive:** All screens work on mobile devices
5. **Accessibility:** WCAG 2.1 AA compliance

---

## Component Enhancements

### 1. CurrencyDisplay Component (Enhanced)

**File:** `apps/paylinq/src/components/ui/CurrencyDisplay.tsx`

**Current Implementation:**
```tsx
interface CurrencyDisplayProps {
  amount: number;
  currency?: 'SRD' | 'USD';
  variant?: 'default' | 'positive' | 'negative';
  showSymbol?: boolean;
  className?: string;
}
```

**Enhanced Implementation:**
```tsx
interface CurrencyDisplayProps {
  amount: number;
  currency?: string;  // Support any ISO 4217 code
  variant?: 'default' | 'positive' | 'negative' | 'muted';
  showSymbol?: boolean;
  showCode?: boolean;  // NEW: Show currency code (USD, SRD)
  precision?: number;  // NEW: Decimal places (default: 2)
  className?: string;
  
  // NEW: Multi-currency display
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  showConversion?: boolean;
}

// Enhanced usage examples:
<CurrencyDisplay amount={17850} currency="SRD" showCode={true} />
// Output: SRD 17,850.00

<CurrencyDisplay 
  amount={17850} 
  currency="SRD"
  originalAmount={1000}
  originalCurrency="USD"
  exchangeRate={17.85}
  showConversion={true}
/>
// Output: SRD 17,850.00 (1,000 USD @ 17.85)
```

**Implementation:**
```tsx
import { formatCurrency } from '@/utils/helpers';
import { Tooltip } from '@/components/ui/Tooltip';
import clsx from 'clsx';

const currencySymbols: Record<string, string> = {
  SRD: '$',
  USD: '$',
  EUR: '€',
  GBP: '£'
};

export default function CurrencyDisplay({
  amount,
  currency = 'SRD',
  variant = 'default',
  showSymbol = true,
  showCode = false,
  precision = 2,
  originalAmount,
  originalCurrency,
  exchangeRate,
  showConversion = false,
  className
}: CurrencyDisplayProps) {
  const variantClasses = {
    default: 'text-gray-900 dark:text-gray-100',
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    muted: 'text-gray-500 dark:text-gray-400'
  };

  const formatAmount = (amt: number, curr: string) => {
    const symbol = currencySymbols[curr] || '';
    const formatted = amt.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
    
    if (showCode) {
      return `${curr} ${showSymbol ? symbol : ''}${formatted}`;
    }
    return `${showSymbol ? symbol : ''}${formatted}`;
  };

  const mainDisplay = formatAmount(amount, currency);
  
  const conversionText = showConversion && originalAmount && originalCurrency
    ? `${formatAmount(originalAmount, originalCurrency)} @ ${exchangeRate?.toFixed(6)}`
    : null;

  return (
    <span className={clsx('font-medium tabular-nums', variantClasses[variant], className)}>
      {mainDisplay}
      {conversionText && (
        <Tooltip content={`Converted from ${conversionText}`}>
          <span className="ml-1 text-xs text-gray-400">*</span>
        </Tooltip>
      )}
    </span>
  );
}
```

---

### 2. CurrencySelector Component (New)

**File:** `apps/paylinq/src/components/ui/CurrencySelector.tsx`

```tsx
import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  currencies: Currency[];
  disabled?: boolean;
  label?: string;
  error?: string;
  required?: boolean;
}

const commonCurrencies: Currency[] = [
  { code: 'SRD', name: 'Surinamese Dollar', symbol: '$' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' }
];

export default function CurrencySelector({
  value,
  onChange,
  currencies = commonCurrencies,
  disabled = false,
  label,
  error,
  required = false
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedCurrency = currencies.find(c => c.code === value);

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between',
          'focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
          disabled && 'bg-gray-100 cursor-not-allowed',
          error ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
        )}
      >
        <span className="flex items-center space-x-2">
          {selectedCurrency ? (
            <>
              <span className="font-mono text-gray-900 dark:text-white">
                {selectedCurrency.code}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {selectedCurrency.name}
              </span>
            </>
          ) : (
            <span className="text-gray-400">Select currency</span>
          )}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {currencies.map(currency => (
            <button
              key={currency.code}
              type="button"
              onClick={() => {
                onChange(currency.code);
                setIsOpen(false);
              }}
              className={clsx(
                'w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700',
                'flex items-center justify-between transition-colors',
                value === currency.code && 'bg-emerald-50 dark:bg-emerald-900/20'
              )}
            >
              <span className="flex items-center space-x-2">
                <span className="font-mono font-medium">{currency.code}</span>
                <span className="text-sm text-gray-500">{currency.name}</span>
              </span>
              {value === currency.code && (
                <Check className="w-4 h-4 text-emerald-600" />
              )}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
```

---

### 3. ExchangeRateDisplay Component (New)

**File:** `apps/paylinq/src/components/currency/ExchangeRateDisplay.tsx`

```tsx
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import clsx from 'clsx';

interface ExchangeRateDisplayProps {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate?: Date;
  rateSource?: string;
  previousRate?: number;
  compact?: boolean;
}

export default function ExchangeRateDisplay({
  fromCurrency,
  toCurrency,
  rate,
  effectiveDate,
  rateSource,
  previousRate,
  compact = false
}: ExchangeRateDisplayProps) {
  const changePercentage = previousRate 
    ? ((rate - previousRate) / previousRate) * 100 
    : null;

  if (compact) {
    return (
      <span className="inline-flex items-center space-x-1 text-sm">
        <span className="font-mono font-medium">{fromCurrency}</span>
        <ArrowRight className="w-3 h-3 text-gray-400" />
        <span className="font-mono font-medium">{toCurrency}</span>
        <span className="text-gray-600 dark:text-gray-400">@</span>
        <span className="font-mono font-semibold">{rate.toFixed(6)}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded font-mono text-sm font-medium">
            {fromCurrency}
          </span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded font-mono text-sm font-medium">
            {toCurrency}
          </span>
        </div>
        
        <div className="text-left">
          <div className="font-mono text-lg font-bold text-gray-900 dark:text-white">
            {rate.toFixed(6)}
          </div>
          {effectiveDate && (
            <div className="text-xs text-gray-500">
              as of {formatDate(effectiveDate)}
            </div>
          )}
        </div>
      </div>

      {changePercentage !== null && (
        <div className={clsx(
          'flex items-center space-x-1 text-sm font-medium',
          changePercentage > 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {changePercentage > 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{Math.abs(changePercentage).toFixed(2)}%</span>
        </div>
      )}

      {rateSource && (
        <div className="text-xs text-gray-500">
          Source: {rateSource}
        </div>
      )}
    </div>
  );
}
```

---

## New Screens/Pages

### 1. Exchange Rate Management Page

**File:** `apps/paylinq/src/pages/settings/ExchangeRates.tsx`

**Features:**
- List all exchange rates with filtering
- Add/edit/delete rates
- Bulk import from CSV/API
- Rate history timeline
- Quick conversion calculator

**Layout:**
```tsx
import { useState } from 'react';
import { Plus, Upload, Download, Calculator } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { useExchangeRates } from '@/hooks/useExchangeRates';

export default function ExchangeRates() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { rates, loading } = useExchangeRates();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exchange Rates"
        description="Manage currency exchange rates for payroll calculations"
        actions={[
          {
            label: 'Bulk Import',
            icon: Upload,
            onClick: () => setShowBulkImport(true),
            variant: 'secondary'
          },
          {
            label: 'Add Rate',
            icon: Plus,
            onClick: () => setShowAddModal(true),
            variant: 'primary'
          }
        ]}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Rates"
          value={rates.filter(r => r.isActive).length}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Currency Pairs"
          value={new Set(rates.map(r => `${r.fromCurrency}:${r.toCurrency}`)).size}
          icon={<Repeat className="w-5 h-5" />}
        />
        <StatCard
          label="Last Updated"
          value={formatDate(rates[0]?.updatedAt)}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Auto-Update"
          value={autoUpdateEnabled ? 'Enabled' : 'Disabled'}
          icon={<Settings className="w-5 h-5" />}
        />
      </div>

      {/* Currency Pair Matrix */}
      <ExchangeRateMatrix rates={rates} />

      {/* Rates Table */}
      <DataTable
        data={rates}
        columns={[
          {
            header: 'Currency Pair',
            accessor: row => (
              <ExchangeRateDisplay
                fromCurrency={row.fromCurrency}
                toCurrency={row.toCurrency}
                rate={row.rate}
                compact={true}
              />
            )
          },
          {
            header: 'Rate',
            accessor: row => row.rate.toFixed(6),
            align: 'right'
          },
          {
            header: 'Type',
            accessor: 'rateType'
          },
          {
            header: 'Source',
            accessor: 'rateSource'
          },
          {
            header: 'Effective From',
            accessor: row => formatDate(row.effectiveFrom)
          },
          {
            header: 'Status',
            accessor: row => (
              <Badge variant={row.isActive ? 'success' : 'default'}>
                {row.isActive ? 'Active' : 'Inactive'}
              </Badge>
            )
          },
          {
            header: 'Actions',
            accessor: row => (
              <ActionMenu
                items={[
                  { label: 'Edit', onClick: () => handleEdit(row) },
                  { label: 'History', onClick: () => handleHistory(row) },
                  { label: 'Deactivate', onClick: () => handleDeactivate(row) }
                ]}
              />
            )
          }
        ]}
      />

      {/* Modals */}
      {showAddModal && <AddExchangeRateModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
```

---

### 2. Add/Edit Exchange Rate Modal

**File:** `apps/paylinq/src/components/modals/ExchangeRateModal.tsx`

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Dialog from '@/components/ui/Dialog';
import CurrencySelector from '@/components/ui/CurrencySelector';
import { useToast } from '@/contexts/ToastContext';

interface ExchangeRateFormData {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateType: 'manual' | 'market' | 'fixed';
  rateSource: string;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
}

export default function ExchangeRateModal({ rate, onClose, onSuccess }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ExchangeRateFormData>({
    defaultValues: rate || {
      fromCurrency: 'USD',
      toCurrency: 'SRD',
      rateType: 'manual',
      effectiveFrom: new Date().toISOString().split('T')[0]
    }
  });

  const fromCurrency = watch('fromCurrency');
  const toCurrency = watch('toCurrency');
  const rateValue = watch('rate');

  const onSubmit = async (data: ExchangeRateFormData) => {
    try {
      const response = rate
        ? await api.updateExchangeRate(rate.id, data)
        : await api.createExchangeRate(data);
      
      showToast('success', `Exchange rate ${rate ? 'updated' : 'created'} successfully`);
      onSuccess();
      onClose();
    } catch (error) {
      showToast('error', error.message);
    }
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={rate ? 'Edit Exchange Rate' : 'Add Exchange Rate'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Currency Pair */}
        <div className="grid grid-cols-2 gap-4">
          <CurrencySelector
            label="From Currency"
            value={fromCurrency}
            onChange={value => setValue('fromCurrency', value)}
            required
            error={errors.fromCurrency?.message}
          />
          
          <CurrencySelector
            label="To Currency"
            value={toCurrency}
            onChange={value => setValue('toCurrency', value)}
            required
            error={errors.toCurrency?.message}
          />
        </div>

        {/* Rate */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Exchange Rate <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.000001"
            {...register('rate', { 
              required: 'Rate is required',
              min: { value: 0.000001, message: 'Rate must be positive' }
            })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="17.850000"
          />
          {errors.rate && (
            <p className="mt-1 text-sm text-red-600">{errors.rate.message}</p>
          )}
          
          {/* Preview */}
          {rateValue > 0 && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
              <div>1 {fromCurrency} = {rateValue.toFixed(6)} {toCurrency}</div>
              <div className="text-gray-500">
                1 {toCurrency} = {(1 / rateValue).toFixed(6)} {fromCurrency}
              </div>
            </div>
          )}
        </div>

        {/* Rate Type & Source */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Rate Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('rateType', { required: 'Rate type is required' })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="manual">Manual</option>
              <option value="market">Market</option>
              <option value="fixed">Fixed</option>
              <option value="average">Average</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Rate Source
            </label>
            <input
              type="text"
              {...register('rateSource')}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Central Bank, ECB, etc."
            />
          </div>
        </div>

        {/* Effective Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Effective From <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('effectiveFrom', { required: 'Start date is required' })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Effective To
            </label>
            <input
              type="date"
              {...register('effectiveTo')}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Optional notes about this rate"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            {rate ? 'Update Rate' : 'Create Rate'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
```

---

### 3. Enhanced Paycheck Detail with Multi-Currency

**File:** `apps/paylinq/src/pages/paychecks/PaycheckDetail.tsx` (Enhanced)

**New Sections:**
- Currency conversion summary card
- Component breakdown by currency
- Conversion details panel

```tsx
// Currency Conversion Summary Card
<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
    Currency Conversions
  </h3>
  
  {paycheck.currencyConversions.map((conv, idx) => (
    <div key={idx} className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-2">
        <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded font-mono text-sm">
          {conv.fromCurrency}
        </span>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded font-mono text-sm">
          {conv.toCurrency}
        </span>
      </div>
      
      <div className="text-right">
        <CurrencyDisplay 
          amount={conv.fromAmount} 
          currency={conv.fromCurrency}
          className="text-sm"
        />
        <div className="text-xs text-gray-500">
          @ {conv.rate.toFixed(6)} = {conv.toAmount.toLocaleString()}
        </div>
      </div>
    </div>
  ))}
</div>

// Component Breakdown by Currency
<div className="space-y-4">
  {Object.entries(componentsByCurrency).map(([currency, components]) => (
    <div key={currency} className="border rounded-lg p-4">
      <h4 className="font-medium mb-3 flex items-center space-x-2">
        <span>Components in {currency}</span>
        <Badge variant="blue">{components.length}</Badge>
      </h4>
      
      {components.map(comp => (
        <div key={comp.id} className="flex justify-between py-2">
          <span>{comp.componentName}</span>
          <div className="text-right">
            <CurrencyDisplay 
              amount={comp.amount} 
              currency={comp.componentCurrency}
            />
            {comp.convertedAmount && (
              <div className="text-xs text-gray-500">
                → {comp.convertedAmount.toLocaleString()} {comp.paycheckCurrency}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  ))}
</div>
```

---

### 4. Currency Configuration Settings

**File:** `apps/paylinq/src/pages/settings/CurrencyConfig.tsx`

```tsx
export default function CurrencyConfig() {
  const { config, loading, updateConfig } = useCurrencyConfig();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Currency Configuration"
        description="Manage organization-wide currency settings and preferences"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Base Currency */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Base Currency</h3>
            <p className="text-sm text-gray-500">
              Primary currency for your organization
            </p>
          </CardHeader>
          <CardContent>
            <CurrencySelector
              label="Base Currency"
              value={config.baseCurrency}
              onChange={value => updateField('baseCurrency', value)}
            />
          </CardContent>
        </Card>

        {/* Supported Currencies */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Supported Currencies</h3>
            <p className="text-sm text-gray-500">
              Currencies enabled for use in payroll
            </p>
          </CardHeader>
          <CardContent>
            <MultiCurrencySelector
              value={config.supportedCurrencies}
              onChange={value => updateField('supportedCurrencies', value)}
            />
          </CardContent>
        </Card>

        {/* Exchange Rate Settings */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Exchange Rate Updates</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              label="Auto-update rates"
              checked={config.autoUpdateRates}
              onChange={value => updateField('autoUpdateRates', value)}
            />

            {config.autoUpdateRates && (
              <>
                <Select
                  label="Rate Provider"
                  value={config.rateProvider}
                  options={[
                    { value: 'ECB', label: 'European Central Bank' },
                    { value: 'CBSuriname', label: 'Central Bank Suriname' },
                    { value: 'manual', label: 'Manual Entry' }
                  ]}
                  onChange={value => updateField('rateProvider', value)}
                />

                <Select
                  label="Update Frequency"
                  value={config.rateUpdateFrequency}
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'manual', label: 'Manual' }
                  ]}
                  onChange={value => updateField('rateUpdateFrequency', value)}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Conversion Rules */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Conversion Rules</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Rounding Method"
              value={config.defaultRoundingMethod}
              options={[
                { value: 'standard', label: 'Standard (Round Half Up)' },
                { value: 'up', label: 'Always Round Up' },
                { value: 'down', label: 'Always Round Down' },
                { value: 'bankers', label: 'Bankers Rounding' }
              ]}
              onChange={value => updateField('defaultRoundingMethod', value)}
            />

            <Toggle
              label="Require approval for conversions"
              checked={config.requireConversionApproval}
              onChange={value => updateField('requireConversionApproval', value)}
            />

            {config.requireConversionApproval && (
              <Input
                type="number"
                label="Approval Threshold Amount"
                value={config.approvalThresholdAmount}
                onChange={e => updateField('approvalThresholdAmount', e.target.value)}
                help="Conversions above this amount require approval"
              />
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## User Flows

### Flow 1: Adding an Exchange Rate

1. Navigate to Settings → Exchange Rates
2. Click "Add Rate" button
3. Select FROM currency (e.g., USD)
4. Select TO currency (e.g., SRD)
5. Enter rate (e.g., 17.85)
6. Select rate type (manual)
7. Enter rate source (optional)
8. Set effective date
9. Click "Create Rate"
10. See confirmation toast
11. Rate appears in table

### Flow 2: Running Payroll with Multi-Currency

1. Create payroll run (standard flow)
2. System detects employees with different currencies
3. For each employee:
   - Calculate components in compensation currency
   - Apply currency conversion if payment currency differs
   - Store both original and converted amounts
4. Show summary with currency breakdown
5. Allow drill-down into conversion details
6. Approve and process payroll

### Flow 3: Viewing Paycheck with Conversions

1. Open paycheck detail
2. See currency summary card at top
3. View component breakdown by currency
4. Click conversion icon for details
5. See conversion rate, source, timestamp
6. Drill into conversion audit trail

---

**Next Document:** `06-implementation-roadmap.md` - Phased implementation plan with timelines
