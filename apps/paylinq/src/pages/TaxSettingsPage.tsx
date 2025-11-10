/**
 * Tax Settings Page
 * 
 * Configure tax-related settings including:
 * - Tax jurisdictions (federal, state, local)
 * - Suriname-specific tax settings (wage tax, AOV, AWW)
 * - Tax brackets and rates
 * - Tax calculation preview
 */

import { useState } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Calculator,
  CheckCircle,
  Info,
} from 'lucide-react';
import { FormSection, FormGrid, FormField } from '../components/form/FormField';
import { CurrencyInput } from '../components/form/CurrencyInput';

type Currency = 'SRD' | 'USD' | 'EUR';

interface TaxBracket {
  id: string;
  minIncome: number;
  maxIncome: number | null; // null for unlimited
  rate: number; // percentage
}

interface TaxJurisdiction {
  id: string;
  name: string;
  type: 'federal' | 'state' | 'local';
  enabled: boolean;
}

interface TaxCalculationPreview {
  grossIncome: number;
  federalTax: number;
  stateTax: number;
  localTax: number;
  aovContribution: number;
  awwContribution: number;
  totalTax: number;
  netIncome: number;
}

const TaxSettingsPage = () => {
  // Tax jurisdictions
  const [jurisdictions, setJurisdictions] = useState<TaxJurisdiction[]>([
    { id: '1', name: 'Suriname Federal Tax', type: 'federal', enabled: true },
    { id: '2', name: 'Paramaribo Municipal Tax', type: 'local', enabled: false },
  ]);

  // Tax brackets for federal tax
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([
    { id: '1', minIncome: 0, maxIncome: 10000, rate: 8 },
    { id: '2', minIncome: 10001, maxIncome: 25000, rate: 18 },
    { id: '3', minIncome: 25001, maxIncome: 50000, rate: 28 },
    { id: '4', minIncome: 50001, maxIncome: null, rate: 38 },
  ]);

  // Suriname-specific contributions
  const [aovRate, setAovRate] = useState(4.0); // AOV (pension) rate %
  const [awwRate, setAwwRate] = useState(1.5); // AWW (disability) rate %
  const [maxAovBase, setMaxAovBase] = useState(60000); // Max income for AOV calculation

  // Add new bracket form
  const [showAddBracket, setShowAddBracket] = useState(false);
  const [newBracketMin, setNewBracketMin] = useState<number | null>(null);
  const [newBracketMax, setNewBracketMax] = useState<number | null>(null);
  const [newBracketRate, setNewBracketRate] = useState<number | null>(null);

  // Tax calculator
  const [calculatorIncome, setCalculatorIncome] = useState(30000);
  const [calculatorResult, setCalculatorResult] = useState<TaxCalculationPreview | null>(null);

  // Save state
  const [isSaved, setIsSaved] = useState(false);

  // Currency for display
  const currency: Currency = 'SRD';

  // Calculate tax based on brackets
  const calculateTax = (income: number, brackets: TaxBracket[]): number => {
    let totalTax = 0;
    let remainingIncome = income;

    for (const bracket of brackets.sort((a, b) => a.minIncome - b.minIncome)) {
      if (remainingIncome <= 0) break;

      const bracketMin = bracket.minIncome;
      const bracketMax = bracket.maxIncome ?? Infinity;
      const bracketRange = bracketMax - bracketMin;

      if (income > bracketMin) {
        const taxableInBracket = Math.min(remainingIncome, bracketRange);
        totalTax += (taxableInBracket * bracket.rate) / 100;
        remainingIncome -= taxableInBracket;
      }
    }

    return totalTax;
  };

  // Calculate full tax preview
  const calculateFullTaxPreview = (grossIncome: number): TaxCalculationPreview => {
    const federalTax = calculateTax(grossIncome, taxBrackets);
    const stateTax = 0; // Not implemented
    const localTax = jurisdictions.find(j => j.type === 'local' && j.enabled)
      ? grossIncome * 0.02
      : 0; // 2% municipal tax if enabled

    // AOV contribution (capped at maxAovBase)
    const aovBase = Math.min(grossIncome, maxAovBase);
    const aovContribution = (aovBase * aovRate) / 100;

    // AWW contribution (no cap)
    const awwContribution = (grossIncome * awwRate) / 100;

    const totalTax = federalTax + stateTax + localTax + aovContribution + awwContribution;
    const netIncome = grossIncome - totalTax;

    return {
      grossIncome,
      federalTax,
      stateTax,
      localTax,
      aovContribution,
      awwContribution,
      totalTax,
      netIncome,
    };
  };

  // Handle tax calculator
  const handleCalculate = () => {
    const result = calculateFullTaxPreview(calculatorIncome);
    setCalculatorResult(result);
  };

  // Toggle jurisdiction
  const toggleJurisdiction = (id: string) => {
    setJurisdictions(jurisdictions.map(j =>
      j.id === id ? { ...j, enabled: !j.enabled } : j
    ));
  };

  // Add tax bracket
  const handleAddBracket = () => {
    if (newBracketMin !== null && newBracketRate !== null) {
      const newBracket: TaxBracket = {
        id: Date.now().toString(),
        minIncome: newBracketMin,
        maxIncome: newBracketMax,
        rate: newBracketRate,
      };
      setTaxBrackets([...taxBrackets, newBracket].sort((a, b) => a.minIncome - b.minIncome));
      setShowAddBracket(false);
      setNewBracketMin(null);
      setNewBracketMax(null);
      setNewBracketRate(null);
    }
  };

  // Delete tax bracket
  const handleDeleteBracket = (id: string) => {
    setTaxBrackets(taxBrackets.filter(b => b.id !== id));
  };

  // Format currency
  const formatCurrency = (amount: number, curr: Currency = currency): string => {
    const symbol = curr === 'SRD' ? '$' : curr === 'USD' ? '$' : '€';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Handle save
  const handleSave = () => {
    console.log('Saving tax settings:', {
      jurisdictions,
      taxBrackets,
      aovRate,
      awwRate,
      maxAovBase,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tax Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure tax jurisdictions, brackets, and calculation settings
          </p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Save Settings
        </button>
      </div>

      {/* Success message */}
      {isSaved && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Tax settings saved successfully
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tax Jurisdictions */}
          <FormSection
            title="Tax Jurisdictions"
            description="Enable or disable tax jurisdictions"
            icon={<DollarSign className="h-5 w-5" />}
          >
            <div className="space-y-3">
              {jurisdictions.map(jurisdiction => (
                <div
                  key={jurisdiction.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={jurisdiction.enabled}
                      onChange={() => toggleJurisdiction(jurisdiction.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-emerald-500 border-gray-300 rounded"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{jurisdiction.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{jurisdiction.type} level</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      jurisdiction.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {jurisdiction.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Tax Brackets */}
          <FormSection
            title="Federal Tax Brackets"
            description="Configure income tax brackets and rates"
            icon={<DollarSign className="h-5 w-5" />}
          >
            <div className="space-y-3">
              {/* Existing brackets */}
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Min Income
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Max Income
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taxBrackets.map(bracket => (
                      <tr key={bracket.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatCurrency(bracket.minIncome)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {bracket.maxIncome ? formatCurrency(bracket.maxIncome) : 'Unlimited'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {bracket.rate}%
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <button
                            onClick={() => handleDeleteBracket(bracket.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add bracket form */}
              {!showAddBracket ? (
                <button
                  onClick={() => setShowAddBracket(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tax Bracket
                </button>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                  <FormGrid>
                    <FormField label="Min Income" required>
                      <CurrencyInput
                        value={newBracketMin ?? 0}
                        onChange={(value) => setNewBracketMin(value)}
                        currency={currency}
                      />
                    </FormField>
                    <FormField label="Max Income">
                      <CurrencyInput
                        value={newBracketMax ?? 0}
                        onChange={(value) => setNewBracketMax(value)}
                        currency={currency}
                        placeholder="Leave empty for unlimited"
                      />
                    </FormField>
                    <FormField label="Tax Rate (%)" required>
                      <input
                        type="number"
                        value={newBracketRate ?? ''}
                        onChange={(e) => setNewBracketRate(parseFloat(e.target.value))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        placeholder="e.g., 18"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </FormField>
                  </FormGrid>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddBracket}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                      Add Bracket
                    </button>
                    <button
                      onClick={() => {
                        setShowAddBracket(false);
                        setNewBracketMin(null);
                        setNewBracketMax(null);
                        setNewBracketRate(null);
                      }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          {/* Suriname-Specific Contributions */}
          <FormSection
            title="Social Contributions"
            description="Configure AOV and AWW contribution rates"
            icon={<DollarSign className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>AOV</strong> (Algemene Ouderdomsverzekering) - General pension insurance
                      <br />
                      <strong>AWW</strong> (Algemene Weduwen- en Wezenverzekering) - General widow and orphan insurance
                    </p>
                  </div>
                </div>
              </div>

              <FormGrid>
                <FormField label="AOV Rate (%)" required>
                  <input
                    type="number"
                    value={aovRate}
                    onChange={(e) => setAovRate(parseFloat(e.target.value))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </FormField>

                <FormField label="AWW Rate (%)" required>
                  <input
                    type="number"
                    value={awwRate}
                    onChange={(e) => setAwwRate(parseFloat(e.target.value))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </FormField>

                <FormField
                  label="Max AOV Base Income"
                  required
                  helpText="Maximum income used for AOV calculation"
                >
                  <CurrencyInput
                    value={maxAovBase}
                    onChange={(value) => setMaxAovBase(value ?? 0)}
                    currency={currency}
                  />
                </FormField>
              </FormGrid>
            </div>
          </FormSection>
        </div>

        {/* Tax Calculator Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            <FormSection
              title="Tax Calculator"
              description="Preview tax calculations"
              icon={<Calculator className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <FormField label="Gross Income" required>
                  <CurrencyInput
                    value={calculatorIncome}
                    onChange={(value) => setCalculatorIncome(value ?? 0)}
                    currency={currency}
                  />
                </FormField>

                <button
                  onClick={handleCalculate}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate
                </button>

                {calculatorResult && (
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Gross Income</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(calculatorResult.grossIncome)}
                      </span>
                    </div>

                    <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Federal Tax</span>
                        <span className="text-gray-900">
                          {formatCurrency(calculatorResult.federalTax)}
                        </span>
                      </div>

                      {calculatorResult.localTax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Local Tax</span>
                          <span className="text-gray-900">
                            {formatCurrency(calculatorResult.localTax)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">AOV</span>
                        <span className="text-gray-900">
                          {formatCurrency(calculatorResult.aovContribution)}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">AWW</span>
                        <span className="text-gray-900">
                          {formatCurrency(calculatorResult.awwContribution)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-200">
                      <span className="text-gray-900">Total Tax</span>
                      <span className="text-red-600">
                        -{formatCurrency(calculatorResult.totalTax)}
                      </span>
                    </div>

                    <div className="flex justify-between text-base font-semibold pt-2 border-t-2 border-gray-300">
                      <span className="text-gray-900">Net Income</span>
                      <span className="text-green-600">
                        {formatCurrency(calculatorResult.netIncome)}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="text-gray-600">Effective Tax Rate</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {((calculatorResult.totalTax / calculatorResult.grossIncome) * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </FormSection>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxSettingsPage;


