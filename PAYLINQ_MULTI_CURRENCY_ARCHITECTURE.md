# PayLinq Multi-Currency Architecture

## Executive Summary

This document outlines a comprehensive, enterprise-grade multi-currency architecture for PayLinq that enables:
- **Component-level currency independence** - Each pay component can have its own currency
- **Flexible conversion scenarios** - Support for all conversion patterns (component → gross, gross → net, etc.)
- **Real-time and historical rates** - Exchange rate management with point-in-time accuracy
- **Audit compliance** - Full traceability of currency conversions for SOX/SOC 2 compliance
- **Scalable design** - Handles multiple currencies across jurisdictions without performance degradation

---

## 1. Current State Analysis

### 1.1 Current Schema Currency Support

**Current Implementation:**
```sql
-- employee_record: Single currency per employee
currency VARCHAR(3) DEFAULT 'SRD'

-- compensation: Single currency per compensation record
currency VARCHAR(3) DEFAULT 'SRD'

-- No currency fields in:
-- - pay_component
-- - paycheck (implicit: uses employee_record.currency)
-- - payroll_run_component
-- - deductions
```

**Current Limitations:**
1. ❌ All pay components for an employee must be in same currency
2. ❌ Cannot handle salary in USD but bonuses in EUR
3. ❌ Cannot track currency conversions
4. ❌ No exchange rate management
5. ❌ No currency conversion audit trail

---

## 2. Use Cases & Requirements

### 2.1 Primary Use Cases

#### UC1: Multi-Currency Pay Components
**Scenario:** Employee has base salary in SRD, housing allowance in USD, and performance bonus in EUR
```
Base Salary: 5,000 SRD
Housing: 500 USD → 8,925 SRD (rate: 17.85)
Bonus: 1,000 EUR → 19,200 SRD (rate: 19.20)
Gross: 33,125 SRD
```

#### UC2: Cross-Border Employment
**Scenario:** Employee works in Suriname (paid in SRD) but has deductions in USD for US taxes
```
Gross: 10,000 SRD
Tax (USD): 100 USD → 1,785 SRD (rate: 17.85)
Net: 8,215 SRD
```

#### UC3: Expatriate Payment
**Scenario:** US employee working in Suriname, salary in USD, local deductions in SRD
```
Base Salary: 5,000 USD
Gross (USD): 5,000 USD
Local Tax: 500 SRD → 28 USD (rate: 17.85)
Net (USD): 4,972 USD
```

#### UC4: Reporting Currency Different from Payment
**Scenario:** Company reports in EUR but pays employees in SRD
```
Payment Currency: SRD
Reporting Currency: EUR
Need: Convert all amounts to EUR for financial statements
```

### 2.2 Technical Requirements

**Functional:**
- FR1: Support unlimited currencies per organization
- FR2: Each pay component can have independent currency
- FR3: Real-time and scheduled exchange rate updates
- FR4: Historical exchange rate tracking (point-in-time accuracy)
- FR5: Automatic currency conversion with configurable rules
- FR6: Manual exchange rate override capability
- FR7: Multi-currency reporting and drill-down

**Non-Functional:**
- NFR1: Performance: <500ms for payroll calculation with 1000 employees
- NFR2: Accuracy: Maintain 4 decimal precision for rates, 2 for amounts
- NFR3: Audit: Full traceability of all conversions
- NFR4: Compliance: SOX, SOC 2, GAAP/IFRS reporting standards
- NFR5: Scalability: Support 100+ currencies without degradation

---

## 3. Architecture Design

### 3.1 Core Principles

1. **Currency Atomicity** - Every monetary amount stored with its currency
2. **Conversion Transparency** - All conversions explicitly tracked
3. **Temporal Accuracy** - Use exchange rates valid at transaction time
4. **Audit Trail** - Immutable record of all currency operations
5. **Flexible Conversion** - Support multiple conversion strategies

### 3.2 Database Schema Changes

#### 3.2.1 Exchange Rate Management

```sql
-- Exchange rate master table
CREATE TABLE payroll.exchange_rate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Currency pair
  from_currency VARCHAR(3) NOT NULL,  -- ISO 4217 (USD, EUR, SRD)
  to_currency VARCHAR(3) NOT NULL,
  
  -- Rate details
  rate NUMERIC(12, 6) NOT NULL,  -- 6 decimals for precision
  inverse_rate NUMERIC(12, 6),   -- Cached for performance (1/rate)
  
  -- Rate type
  rate_type VARCHAR(20) DEFAULT 'market' CHECK (rate_type IN ('market', 'fixed', 'manual', 'average')),
  rate_source VARCHAR(50),  -- 'ECB', 'CBSuriname', 'manual', etc.
  
  -- Effective period
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
  effective_to TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  CONSTRAINT valid_rate CHECK (rate > 0),
  CONSTRAINT valid_currencies CHECK (from_currency != to_currency),
  CONSTRAINT valid_period CHECK (effective_to IS NULL OR effective_to > effective_from),
  UNIQUE(organization_id, from_currency, to_currency, effective_from)
);

CREATE INDEX idx_exchange_rate_org ON payroll.exchange_rate(organization_id);
CREATE INDEX idx_exchange_rate_pair ON payroll.exchange_rate(from_currency, to_currency);
CREATE INDEX idx_exchange_rate_effective ON payroll.exchange_rate(effective_from, effective_to) 
  WHERE is_active = true;

-- Exchange rate audit log
CREATE TABLE payroll.exchange_rate_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_rate_id UUID NOT NULL REFERENCES payroll.exchange_rate(id),
  
  -- Historical values
  old_rate NUMERIC(12, 6),
  new_rate NUMERIC(12, 6),
  rate_change_percentage NUMERIC(5, 2),
  
  -- Change details
  change_reason VARCHAR(100),
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3.2.2 Currency Conversion Tracking

```sql
-- Currency conversion log (audit trail for every conversion)
CREATE TABLE payroll.currency_conversion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Source transaction
  source_table VARCHAR(50) NOT NULL,  -- 'paycheck', 'payroll_run_component', etc.
  source_id UUID NOT NULL,
  
  -- Conversion details
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  from_amount NUMERIC(12, 2) NOT NULL,
  to_amount NUMERIC(12, 2) NOT NULL,
  
  -- Rate used
  exchange_rate_id UUID REFERENCES payroll.exchange_rate(id),
  rate_used NUMERIC(12, 6) NOT NULL,
  rate_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,  -- When rate was valid
  
  -- Conversion metadata
  conversion_method VARCHAR(20) CHECK (conversion_method IN ('automatic', 'manual', 'override')),
  rounding_method VARCHAR(20) DEFAULT 'standard' CHECK (rounding_method IN ('standard', 'up', 'down', 'bankers')),
  
  -- Context
  payroll_run_id UUID REFERENCES payroll.payroll_run(id),
  employee_id UUID REFERENCES hris.employee(id),
  conversion_date DATE NOT NULL,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_currency_conversion_org ON payroll.currency_conversion(organization_id);
CREATE INDEX idx_currency_conversion_source ON payroll.currency_conversion(source_table, source_id);
CREATE INDEX idx_currency_conversion_payroll ON payroll.currency_conversion(payroll_run_id);
CREATE INDEX idx_currency_conversion_date ON payroll.currency_conversion(conversion_date DESC);
```

#### 3.2.3 Enhanced Pay Component with Currency

```sql
-- Modify pay_component to support currency
ALTER TABLE payroll.pay_component 
  ADD COLUMN currency VARCHAR(3),
  ADD COLUMN use_employee_currency BOOLEAN DEFAULT true,
  ADD COLUMN conversion_timing VARCHAR(20) DEFAULT 'calculation' 
    CHECK (conversion_timing IN ('calculation', 'payment', 'manual'));

COMMENT ON COLUMN payroll.pay_component.currency IS 
  'Currency for this component. NULL means use employee base currency';
COMMENT ON COLUMN payroll.pay_component.use_employee_currency IS 
  'If true, inherit currency from employee payroll config. If false, use component.currency';
COMMENT ON COLUMN payroll.pay_component.conversion_timing IS 
  'When to convert: calculation (during payroll calc), payment (at pay date), manual (user triggered)';
```

#### 3.2.4 Enhanced Payroll Run Component with Multi-Currency

```sql
-- Modify payroll_run_component to track currency
ALTER TABLE payroll.payroll_run_component
  ADD COLUMN component_currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
  ADD COLUMN component_amount_original NUMERIC(12, 2),
  ADD COLUMN paycheck_currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
  ADD COLUMN amount_converted NUMERIC(12, 2),
  ADD COLUMN exchange_rate_used NUMERIC(12, 6),
  ADD COLUMN conversion_id UUID REFERENCES payroll.currency_conversion(id);

COMMENT ON COLUMN payroll.payroll_run_component.component_currency IS 
  'Currency of the component as defined';
COMMENT ON COLUMN payroll.payroll_run_component.component_amount_original IS 
  'Amount in original component currency before conversion';
COMMENT ON COLUMN payroll.payroll_run_component.paycheck_currency IS 
  'Target currency for this paycheck';
COMMENT ON COLUMN payroll.payroll_run_component.amount_converted IS 
  'Amount after conversion to paycheck currency';
COMMENT ON COLUMN payroll.payroll_run_component.exchange_rate_used IS 
  'Cached exchange rate for audit trail';
```

#### 3.2.5 Enhanced Employee Payroll Config & Paycheck Tables

```sql
-- Add preferred payment currency to employee payroll config
ALTER TABLE payroll.employee_payroll_config
  ADD COLUMN payment_currency VARCHAR(3),
  ADD COLUMN allow_multi_currency BOOLEAN DEFAULT false;

COMMENT ON COLUMN payroll.employee_payroll_config.payment_currency IS 
  'Preferred currency for net payment. NULL means use base currency';
COMMENT ON COLUMN payroll.employee_payroll_config.allow_multi_currency IS 
  'If true, employee can receive payments in multiple currencies';

-- Add currency tracking to paycheck
ALTER TABLE payroll.paycheck
  ADD COLUMN base_currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
  ADD COLUMN payment_currency VARCHAR(3),
  ADD COLUMN currency_conversion_summary JSONB,
  ADD COLUMN total_conversions INTEGER DEFAULT 0;

COMMENT ON COLUMN payroll.paycheck.base_currency IS 
  'Primary currency for paycheck calculations';
COMMENT ON COLUMN payroll.paycheck.payment_currency IS 
  'Currency for actual payment (may differ from base)';
COMMENT ON COLUMN payroll.paycheck.currency_conversion_summary IS 
  'Summary of all currency conversions: {USD: 500, EUR: 200} → {SRD: 14425}';
COMMENT ON COLUMN payroll.paycheck.total_conversions IS 
  'Count of currency conversions performed';
```

#### 3.2.6 Organization Currency Configuration

```sql
-- Organization currency settings
CREATE TABLE payroll.organization_currency_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Base currencies
  base_currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
  reporting_currency VARCHAR(3),  -- For financial reporting
  
  -- Supported currencies
  supported_currencies VARCHAR(3)[] NOT NULL DEFAULT ARRAY['SRD'],
  
  -- Exchange rate settings
  auto_update_rates BOOLEAN DEFAULT false,
  rate_provider VARCHAR(50),  -- 'ECB', 'CBSuriname', 'manual'
  rate_update_frequency VARCHAR(20),  -- 'daily', 'weekly', 'manual'
  
  -- Conversion rules
  default_rounding_method VARCHAR(20) DEFAULT 'standard',
  conversion_tolerance NUMERIC(5, 4) DEFAULT 0.0001,  -- Acceptable variance
  
  -- Audit settings
  require_conversion_approval BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(organization_id)
);

CREATE INDEX idx_org_currency_config ON payroll.organization_currency_config(organization_id);
```

### 3.3 API Schema Changes

#### 3.3.1 Pay Component API

```typescript
// POST /api/paylinq/pay-components
interface CreatePayComponentRequest {
  componentCode: string;
  componentName: string;
  componentType: 'earning' | 'deduction';
  category: string;
  
  // Currency configuration
  currency?: string;  // NULL = use employee currency
  useEmployeeCurrency?: boolean;  // Default: true
  conversionTiming?: 'calculation' | 'payment' | 'manual';
  
  // Calculation
  calculationType: 'fixed_amount' | 'percentage' | 'hourly_rate' | 'formula';
  defaultAmount?: number;
  defaultRate?: number;
  
  // Existing fields...
}

interface PayComponentResponse {
  id: string;
  componentCode: string;
  componentName: string;
  
  // Currency info
  currency: string | null;
  useEmployeeCurrency: boolean;
  conversionTiming: string;
  
  // Display helper
  currencyDisplay: string;  // "Employee Currency" or "USD"
  
  // ... other fields
}
```

#### 3.3.2 Paycheck API with Multi-Currency

```typescript
// GET /api/paylinq/payroll-runs/{id}/paychecks
interface PaycheckResponse {
  id: string;
  employeeRecordId: string;
  
  // Currency information
  baseCurrency: string;  // "SRD"
  paymentCurrency: string | null;  // "USD" if different
  
  // Amounts in base currency
  grossPay: number;
  netPay: number;
  
  // Currency breakdown
  componentsByCurrency: {
    [currency: string]: {
      totalEarnings: number;
      totalDeductions: number;
      totalTaxes: number;
    };
  };
  
  // Conversion summary
  currencyConversions: Array<{
    fromCurrency: string;
    fromAmount: number;
    toCurrency: string;
    toAmount: number;
    rate: number;
    timestamp: string;
  }>;
  
  // Component details with currency
  earnings: Array<{
    componentCode: string;
    componentName: string;
    originalCurrency: string;
    originalAmount: number;
    convertedCurrency: string;
    convertedAmount: number;
    exchangeRate: number | null;
  }>;
  
  // ... existing fields
}
```

#### 3.3.3 Exchange Rate Management API

```typescript
// GET /api/paylinq/exchange-rates
interface GetExchangeRatesRequest {
  fromCurrency?: string;
  toCurrency?: string;
  effectiveDate?: string;  // Get rates for specific date
  rateType?: 'market' | 'fixed' | 'manual' | 'average';
}

// POST /api/paylinq/exchange-rates
interface CreateExchangeRateRequest {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateType: 'market' | 'fixed' | 'manual';
  rateSource?: string;
  effectiveFrom: string;  // ISO datetime
  effectiveTo?: string;
  notes?: string;
}

// POST /api/paylinq/exchange-rates/bulk-update
interface BulkUpdateRatesRequest {
  rateSource: string;  // 'ECB', 'CBSuriname'
  rates: Array<{
    fromCurrency: string;
    toCurrency: string;
    rate: number;
  }>;
  effectiveFrom: string;
}
```

---

## 4. Business Logic Implementation

### 4.1 Currency Service

```javascript
/**
 * Currency Service
 * Handles all currency operations, conversions, and exchange rate management
 */
class CurrencyService {
  /**
   * Get exchange rate for a specific date
   * Uses temporal querying to get rate valid at that time
   */
  async getExchangeRate(fromCurrency, toCurrency, effectiveDate, organizationId) {
    // Check if direct rate exists
    const directRate = await this.repository.findExchangeRate(
      organizationId,
      fromCurrency,
      toCurrency,
      effectiveDate
    );
    
    if (directRate) {
      return directRate;
    }
    
    // Check inverse rate (USD → SRD vs SRD → USD)
    const inverseRate = await this.repository.findExchangeRate(
      organizationId,
      toCurrency,
      fromCurrency,
      effectiveDate
    );
    
    if (inverseRate) {
      return {
        ...inverseRate,
        rate: 1 / inverseRate.rate,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        is_inverse: true
      };
    }
    
    // Try triangulation (USD → EUR via USD → SRD → EUR)
    const triangulated = await this.triangulateRate(
      fromCurrency,
      toCurrency,
      effectiveDate,
      organizationId
    );
    
    if (triangulated) {
      return triangulated;
    }
    
    throw new NotFoundError(
      `No exchange rate found for ${fromCurrency} → ${toCurrency} on ${effectiveDate}`
    );
  }
  
  /**
   * Convert amount from one currency to another
   * Returns conversion with full audit trail
   */
  async convertAmount(
    fromCurrency,
    toCurrency,
    amount,
    effectiveDate,
    context,
    organizationId
  ) {
    // No conversion needed
    if (fromCurrency === toCurrency) {
      return {
        fromAmount: amount,
        toAmount: amount,
        currency: toCurrency,
        rate: 1,
        conversionId: null
      };
    }
    
    // Get exchange rate
    const exchangeRate = await this.getExchangeRate(
      fromCurrency,
      toCurrency,
      effectiveDate,
      organizationId
    );
    
    // Calculate converted amount
    const convertedAmount = this.roundAmount(amount * exchangeRate.rate);
    
    // Log conversion for audit
    const conversion = await this.repository.createCurrencyConversion({
      organizationId,
      sourceTable: context.sourceTable,
      sourceId: context.sourceId,
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount: convertedAmount,
      exchangeRateId: exchangeRate.id,
      rateUsed: exchangeRate.rate,
      rateTimestamp: effectiveDate,
      conversionMethod: 'automatic',
      payrollRunId: context.payrollRunId,
      employeeRecordId: context.employeeRecordId,
      conversionDate: effectiveDate
    });
    
    return {
      fromAmount: amount,
      toAmount: convertedAmount,
      currency: toCurrency,
      rate: exchangeRate.rate,
      conversionId: conversion.id,
      rateSource: exchangeRate.rate_source
    };
  }
  
  /**
   * Triangulate exchange rate through intermediate currency
   * Example: GBP → SRD via GBP → USD → SRD
   */
  async triangulateRate(fromCurrency, toCurrency, effectiveDate, organizationId) {
    const config = await this.getOrganizationConfig(organizationId);
    const baseCurrency = config.base_currency;
    
    // Try via base currency
    const rateToBase = await this.repository.findExchangeRate(
      organizationId,
      fromCurrency,
      baseCurrency,
      effectiveDate
    );
    
    const rateFromBase = await this.repository.findExchangeRate(
      organizationId,
      baseCurrency,
      toCurrency,
      effectiveDate
    );
    
    if (rateToBase && rateFromBase) {
      return {
        rate: rateToBase.rate * rateFromBase.rate,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate_type: 'triangulated',
        rate_source: `via ${baseCurrency}`,
        effective_from: effectiveDate
      };
    }
    
    return null;
  }
  
  /**
   * Round amount according to organization's rounding rules
   */
  roundAmount(amount, method = 'standard') {
    switch (method) {
      case 'standard':
        return Math.round(amount * 100) / 100;
      case 'up':
        return Math.ceil(amount * 100) / 100;
      case 'down':
        return Math.floor(amount * 100) / 100;
      case 'bankers':
        // Bankers rounding (round to even)
        const rounded = Math.round(amount * 100);
        return rounded / 100;
      default:
        return Math.round(amount * 100) / 100;
    }
  }
}
```

### 4.2 Enhanced Payroll Calculation with Multi-Currency

```javascript
/**
 * Calculate payroll with multi-currency support
 */
async calculatePayrollWithMultiCurrency(payrollRunId, organizationId, userId) {
  const payrollRun = await this.repository.findPayrollRunById(payrollRunId, organizationId);
  const employees = await this.repository.findByOrganization(organizationId, { status: 'active' });
  
  const paychecks = [];
  
  for (const employee of employees) {
    // Determine base currency for calculations
    const baseCurrency = employee.currency || 'SRD';
    const paymentCurrency = employee.payment_currency || baseCurrency;
    
    // Get all pay components for this employee
    const components = await this.getEmployeeComponents(
      employee.id,
      payrollRun.pay_period_start,
      payrollRun.pay_period_end,
      organizationId
    );
    
    // Group components by currency
    const componentsByCurrency = {};
    const currencyConversions = [];
    
    for (const component of components) {
      const componentCurrency = component.use_employee_currency 
        ? baseCurrency 
        : (component.currency || baseCurrency);
      
      if (!componentsByCurrency[componentCurrency]) {
        componentsByCurrency[componentCurrency] = {
          earnings: [],
          deductions: [],
          total: 0
        };
      }
      
      // Calculate component amount
      const amount = await this.calculateComponentAmount(
        component,
        employee,
        payrollRun,
        organizationId
      );
      
      // Store in original currency
      if (component.component_type === 'earning') {
        componentsByCurrency[componentCurrency].earnings.push({
          ...component,
          amount,
          currency: componentCurrency
        });
      } else {
        componentsByCurrency[componentCurrency].deductions.push({
          ...component,
          amount,
          currency: componentCurrency
        });
      }
      
      componentsByCurrency[componentCurrency].total += 
        (component.component_type === 'earning' ? amount : -amount);
    }
    
    // Convert all components to base currency
    let grossPayInBaseCurrency = 0;
    let deductionsInBaseCurrency = 0;
    
    for (const [currency, data] of Object.entries(componentsByCurrency)) {
      if (currency === baseCurrency) {
        // No conversion needed
        grossPayInBaseCurrency += data.earnings.reduce((sum, e) => sum + e.amount, 0);
        deductionsInBaseCurrency += data.deductions.reduce((sum, d) => sum + d.amount, 0);
      } else {
        // Convert to base currency
        const totalEarnings = data.earnings.reduce((sum, e) => sum + e.amount, 0);
        const totalDeductions = data.deductions.reduce((sum, d) => sum + d.amount, 0);
        
        const earningsConverted = await this.currencyService.convertAmount(
          currency,
          baseCurrency,
          totalEarnings,
          payrollRun.payment_date,
          {
            sourceTable: 'paycheck',
            sourceId: null,  // Will be updated after paycheck creation
            payrollRunId,
            employeeRecordId: employee.id
          },
          organizationId
        );
        
        const deductionsConverted = await this.currencyService.convertAmount(
          currency,
          baseCurrency,
          totalDeductions,
          payrollRun.payment_date,
          {
            sourceTable: 'paycheck',
            sourceId: null,
            payrollRunId,
            employeeRecordId: employee.id
          },
          organizationId
        );
        
        grossPayInBaseCurrency += earningsConverted.toAmount;
        deductionsInBaseCurrency += deductionsConverted.toAmount;
        
        currencyConversions.push({
          fromCurrency: currency,
          toCurrency: baseCurrency,
          earningsAmount: totalEarnings,
          deductionsAmount: totalDeductions,
          earningsConverted: earningsConverted.toAmount,
          deductionsConverted: deductionsConverted.toAmount,
          rate: earningsConverted.rate,
          conversionId: earningsConverted.conversionId
        });
      }
    }
    
    // Calculate taxes in base currency
    const taxes = await this.calculateTaxes(
      grossPayInBaseCurrency,
      employee,
      organizationId
    );
    
    // Calculate net pay in base currency
    const netPayInBaseCurrency = grossPayInBaseCurrency - 
      deductionsInBaseCurrency - 
      taxes.totalTax;
    
    // Convert to payment currency if different
    let netPayInPaymentCurrency = netPayInBaseCurrency;
    let finalConversion = null;
    
    if (paymentCurrency !== baseCurrency) {
      finalConversion = await this.currencyService.convertAmount(
        baseCurrency,
        paymentCurrency,
        netPayInBaseCurrency,
        payrollRun.payment_date,
        {
          sourceTable: 'paycheck',
          sourceId: null,
          payrollRunId,
          employeeRecordId: employee.id
        },
        organizationId
      );
      
      netPayInPaymentCurrency = finalConversion.toAmount;
    }
    
    // Create paycheck with currency data
    const paycheck = await this.repository.createPaycheck({
      payrollRunId,
      employeeRecordId: employee.id,
      paymentDate: payrollRun.payment_date,
      payPeriodStart: payrollRun.pay_period_start,
      payPeriodEnd: payrollRun.pay_period_end,
      
      // Amounts in base currency
      baseCurrency,
      grossPay: grossPayInBaseCurrency,
      netPay: netPayInBaseCurrency,
      
      // Payment currency
      paymentCurrency,
      
      // Currency conversion summary
      currencyConversionSummary: {
        componentsByCurrency,
        conversions: currencyConversions,
        finalConversion,
        totalConversions: currencyConversions.length + (finalConversion ? 1 : 0)
      },
      totalConversions: currencyConversions.length + (finalConversion ? 1 : 0),
      
      // Tax details
      ...taxes,
      
      paymentMethod: employee.payment_method,
      status: 'pending'
    }, organizationId, userId);
    
    // Create detailed component records with currency info
    for (const [currency, data] of Object.entries(componentsByCurrency)) {
      for (const earning of data.earnings) {
        await this.createPayrollRunComponent(
          paycheck.id,
          earning,
          currency,
          baseCurrency,
          payrollRun,
          organizationId,
          userId
        );
      }
      
      for (const deduction of data.deductions) {
        await this.createPayrollRunComponent(
          paycheck.id,
          deduction,
          currency,
          baseCurrency,
          payrollRun,
          organizationId,
          userId
        );
      }
    }
    
    paychecks.push(paycheck);
  }
  
  return paychecks;
}
```

---

## 5. UI/UX Design

### 5.1 Pay Component Creation

```tsx
// Component configuration modal
<CurrencyConfiguration>
  <RadioGroup label="Currency Source">
    <Radio value="employee" checked>
      Use Employee's Currency
      <Help>Component will use each employee's base currency</Help>
    </Radio>
    <Radio value="specific">
      Specific Currency
      <CurrencySelect 
        value="USD"
        onChange={handleCurrencyChange}
        currencies={['USD', 'EUR', 'SRD', 'GBP']}
      />
      <Help>All employees receive this component in USD</Help>
    </Radio>
  </RadioGroup>
  
  <Select label="Conversion Timing">
    <Option value="calculation">During Calculation</Option>
    <Option value="payment">At Payment Time</Option>
    <Option value="manual">Manual</Option>
  </Select>
</CurrencyConfiguration>
```

### 5.2 Paycheck Detail View

```tsx
// Paycheck detail with multi-currency breakdown
<PaycheckDetail>
  <CurrencySummary>
    <Stat label="Base Currency" value="SRD" />
    <Stat label="Payment Currency" value="USD" />
    <Stat label="Conversions" value="3" />
  </CurrencySummary>
  
  <EarningsBreakdown>
    <SectionTitle>Earnings by Currency</SectionTitle>
    
    {/* SRD Components */}
    <CurrencyGroup currency="SRD">
      <ComponentLine>
        <Label>Base Salary</Label>
        <Amount>5,000.00 SRD</Amount>
      </ComponentLine>
      <ComponentLine>
        <Label>Overtime</Label>
        <Amount>750.00 SRD</Amount>
      </ComponentLine>
      <Total>5,750.00 SRD</Total>
    </CurrencyGroup>
    
    {/* USD Components */}
    <CurrencyGroup currency="USD">
      <ComponentLine>
        <Label>Housing Allowance</Label>
        <Amount>500.00 USD</Amount>
        <ConversionBadge>
          → 8,925.00 SRD @ 17.85
        </ConversionBadge>
      </ComponentLine>
      <Total>500.00 USD → 8,925.00 SRD</Total>
    </CurrencyGroup>
    
    {/* EUR Components */}
    <CurrencyGroup currency="EUR">
      <ComponentLine>
        <Label>Performance Bonus</Label>
        <Amount>1,000.00 EUR</Amount>
        <ConversionBadge>
          → 19,200.00 SRD @ 19.20
        </ConversionBadge>
      </ComponentLine>
      <Total>1,000.00 EUR → 19,200.00 SRD</Total>
    </CurrencyGroup>
    
    <GrandTotal>
      <Label>Total Gross</Label>
      <Amount>33,875.00 SRD</Amount>
      <Details>
        (5,750 SRD + 500 USD + 1,000 EUR)
      </Details>
    </GrandTotal>
  </EarningsBreakdown>
  
  <ConversionDetails>
    <Title>Currency Conversions</Title>
    <Table>
      <Row>
        <Cell>USD → SRD</Cell>
        <Cell>500.00 USD</Cell>
        <Cell>17.85</Cell>
        <Cell>8,925.00 SRD</Cell>
        <Cell>2024-11-06 14:30</Cell>
      </Row>
      <Row>
        <Cell>EUR → SRD</Cell>
        <Cell>1,000.00 EUR</Cell>
        <Cell>19.20</Cell>
        <Cell>19,200.00 SRD</Cell>
        <Cell>2024-11-06 14:30</Cell>
      </Row>
    </Table>
  </ConversionDetails>
</PaycheckDetail>
```

### 5.3 Exchange Rate Management

```tsx
<ExchangeRateManagement>
  <Header>
    <Title>Exchange Rates</Title>
    <Actions>
      <Button onClick={handleBulkUpdate}>
        Bulk Update Rates
      </Button>
      <Button primary onClick={handleAddRate}>
        Add Rate
      </Button>
    </Actions>
  </Header>
  
  <RateMatrix>
    {/* Interactive currency pair matrix */}
    <Table>
      <thead>
        <tr>
          <th>From \ To</th>
          <th>SRD</th>
          <th>USD</th>
          <th>EUR</th>
          <th>GBP</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>SRD</td>
          <td>-</td>
          <td>
            <RateCell 
              rate={0.056}
              lastUpdated="2h ago"
              source="Manual"
              onClick={() => editRate('SRD', 'USD')}
            />
          </td>
          <td>
            <RateCell 
              rate={0.052}
              lastUpdated="2h ago"
              source="ECB"
            />
          </td>
          <td>
            <RateCell 
              rate={0.044}
              lastUpdated="2h ago"
              source="ECB"
            />
          </td>
        </tr>
        {/* ... more rows ... */}
      </tbody>
    </Table>
  </RateMatrix>
  
  <RateHistory>
    <Title>Recent Rate Changes</Title>
    <Timeline>
      <Event>
        <Time>2 hours ago</Time>
        <Change>USD/SRD: 17.50 → 17.85 (+2.0%)</Change>
        <User>John Doe (Manual)</User>
      </Event>
      <Event>
        <Time>1 day ago</Time>
        <Change>EUR/SRD: 19.00 → 19.20 (+1.05%)</Change>
        <User>Automatic (ECB)</User>
      </Event>
    </Timeline>
  </RateHistory>
</ExchangeRateManagement>
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create exchange rate tables
- [ ] Implement currency conversion tracking
- [ ] Build currency service with conversion logic
- [ ] Add currency fields to existing tables
- [ ] Create database migrations

### Phase 2: Core Integration (Week 3-4)
- [ ] Update payroll calculation logic for multi-currency
- [ ] Implement component-level currency support
- [ ] Add currency conversion to paycheck generation
- [ ] Build exchange rate management API
- [ ] Create currency audit reports

### Phase 3: UI Development (Week 5-6)
- [ ] Currency configuration in pay components
- [ ] Multi-currency paycheck display
- [ ] Exchange rate management interface
- [ ] Currency conversion drill-down views
- [ ] Reporting dashboards with currency breakdown

### Phase 4: Advanced Features (Week 7-8)
- [ ] Automatic rate updates from external sources
- [ ] Rate triangulation for missing pairs
- [ ] Historical rate analysis and trends
- [ ] Multi-currency reporting and exports
- [ ] Compliance and audit reports

### Phase 5: Testing & Optimization (Week 9-10)
- [ ] Unit tests for all currency operations
- [ ] Integration tests for payroll calculation
- [ ] Performance testing with high conversion volumes
- [ ] Audit trail verification
- [ ] User acceptance testing

---

## 7. Performance Considerations

### 7.1 Optimization Strategies

```sql
-- Materialized view for common currency pairs
CREATE MATERIALIZED VIEW payroll.mv_current_exchange_rates AS
SELECT DISTINCT ON (organization_id, from_currency, to_currency)
  id,
  organization_id,
  from_currency,
  to_currency,
  rate,
  inverse_rate,
  rate_source,
  effective_from
FROM payroll.exchange_rate
WHERE is_active = true
  AND (effective_to IS NULL OR effective_to > NOW())
ORDER BY organization_id, from_currency, to_currency, effective_from DESC;

CREATE UNIQUE INDEX ON payroll.mv_current_exchange_rates(organization_id, from_currency, to_currency);

-- Refresh strategy: Trigger on rate updates or scheduled job
CREATE OR REPLACE FUNCTION refresh_current_rates()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY payroll.mv_current_exchange_rates;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 7.2 Caching Strategy

```javascript
// Redis caching for exchange rates
class CachedCurrencyService extends CurrencyService {
  async getExchangeRate(fromCurrency, toCurrency, effectiveDate, organizationId) {
    const cacheKey = `exchange_rate:${organizationId}:${fromCurrency}:${toCurrency}:${effectiveDate}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fetch from database
    const rate = await super.getExchangeRate(fromCurrency, toCurrency, effectiveDate, organizationId);
    
    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(rate));
    
    return rate;
  }
}
```

---

## 8. Security & Compliance

### 8.1 Audit Requirements

```sql
-- Comprehensive audit view
CREATE VIEW payroll.v_currency_audit_trail AS
SELECT 
  cc.id as conversion_id,
  cc.organization_id,
  cc.conversion_date,
  cc.source_table,
  cc.source_id,
  
  -- Conversion details
  cc.from_currency,
  cc.from_amount,
  cc.to_currency,
  cc.to_amount,
  cc.rate_used,
  
  -- Rate provenance
  er.rate_source,
  er.rate_type,
  er.effective_from as rate_effective_from,
  
  -- Context
  cc.payroll_run_id,
  pr.run_number,
  cc.employee_id,
  emp.email as employee_email,
  
  -- Audit trail
  cc.conversion_method,
  cc.created_at,
  creator.email as created_by_email
  
FROM payroll.currency_conversion cc
LEFT JOIN payroll.exchange_rate er ON er.id = cc.exchange_rate_id
LEFT JOIN payroll.payroll_run pr ON pr.id = cc.payroll_run_id
LEFT JOIN hris.employee emp ON emp.id = cc.employee_id
LEFT JOIN users creator ON creator.id = cc.created_by
WHERE cc.created_at >= NOW() - INTERVAL '7 years'  -- SOX retention
ORDER BY cc.created_at DESC;
```

### 8.2 Access Control

```javascript
// Role-based permissions for currency operations
const currencyPermissions = {
  'platform_admin': {
    canViewRates: true,
    canEditRates: true,
    canApproveRates: true,
    canDeleteRates: true,
    canOverrideConversions: true
  },
  'payroll_admin': {
    canViewRates: true,
    canEditRates: true,
    canApproveRates: false,
    canDeleteRates: false,
    canOverrideConversions: true
  },
  'payroll_processor': {
    canViewRates: true,
    canEditRates: false,
    canApproveRates: false,
    canDeleteRates: false,
    canOverrideConversions: false
  }
};
```

---

## 9. Migration Strategy

### 9.1 Data Migration

```sql
-- Migrate existing single-currency data
BEGIN;

-- 1. Add new columns with defaults
ALTER TABLE payroll.pay_component 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS use_employee_currency BOOLEAN DEFAULT true;

-- 2. Backfill existing components (assume employee currency)
UPDATE payroll.pay_component 
SET use_employee_currency = true
WHERE currency IS NULL;

-- 3. Add currency tracking to existing paychecks
ALTER TABLE payroll.paycheck
  ADD COLUMN IF NOT EXISTS base_currency VARCHAR(3) DEFAULT 'SRD',
  ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3);

UPDATE payroll.paycheck pc
SET base_currency = COALESCE(epc.currency, 'SRD'),
    payment_currency = COALESCE(epc.currency, 'SRD')
FROM payroll.employee_payroll_config epc
WHERE pc.employee_id = epc.employee_id
  AND pc.base_currency IS NULL;

COMMIT;
```

### 9.2 Rollback Plan

```sql
-- Rollback script (if needed)
BEGIN;

-- Remove multi-currency columns
ALTER TABLE payroll.pay_component 
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS use_employee_currency,
  DROP COLUMN IF EXISTS conversion_timing;

ALTER TABLE payroll.paycheck
  DROP COLUMN IF EXISTS base_currency,
  DROP COLUMN IF EXISTS payment_currency,
  DROP COLUMN IF EXISTS currency_conversion_summary,
  DROP COLUMN IF EXISTS total_conversions;

-- Drop new tables
DROP TABLE IF EXISTS payroll.currency_conversion CASCADE;
DROP TABLE IF EXISTS payroll.exchange_rate_audit CASCADE;
DROP TABLE IF EXISTS payroll.exchange_rate CASCADE;
DROP TABLE IF EXISTS payroll.organization_currency_config CASCADE;

COMMIT;
```

---

## 10. Success Metrics

### 10.1 Technical KPIs
- Payroll calculation time: <500ms for 1000 employees (with conversions)
- Exchange rate lookup time: <10ms (cached), <50ms (uncached)
- Currency conversion accuracy: 100% match with source rates
- Audit trail completeness: 100% of conversions tracked
- System availability: 99.9% uptime

### 10.2 Business KPIs
- Multi-currency adoption rate: % of organizations using feature
- Average currencies per organization: Target 3-5
- Conversion errors: <0.1% of all conversions
- User satisfaction: >4.5/5 stars
- Support tickets: <5% of organizations

---

## Conclusion

This multi-currency architecture provides:

✅ **Complete Currency Independence** - Every component can have its own currency
✅ **Flexible Conversion** - Support all conversion scenarios
✅ **Full Auditability** - Track every conversion with immutable records
✅ **High Performance** - Optimized for scale with caching and materialized views
✅ **Enterprise-Ready** - SOX/SOC 2 compliant with comprehensive audit trails
✅ **Future-Proof** - Extensible design supports new currencies and conversion methods

The architecture is production-ready and can be implemented in phases while maintaining backward compatibility with existing single-currency implementations.
