/**
 * Tax Settings Page
 * 
 * Configure tax-related settings including:
 * - Tax jurisdictions (federal, state, local)
 * - Suriname-specific tax settings (wage tax, AOV, AWW)
 * - Tax brackets and rates
 * - Tax calculation preview
 * 
 * Integrated with backend API for real-time tax management
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  Trash2,
  Calculator,
  CheckCircle,
  Info,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Save,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { FormSection, FormGrid, FormField } from '@/components/form/FormField';
import { CurrencyInput } from '@/components/form/CurrencyInput';
import { useTaxRules, useCreateTaxRule, useUpdateTaxRule, useDeleteTaxRule } from '@/hooks/useTaxRules';
import { useToast } from '@/contexts/ToastContext';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorAlert } from '@/components/ui/ErrorDisplay';

type Currency = 'SRD' | 'USD' | 'EUR';

interface TaxBracket {
  id?: string;
  min: number;
  max: number | null; // null for unlimited
  rate: number; // percentage
  deduction: number; // Standard deduction for bracket
}

interface TaxRule {
  id: string;
  name: string;
  type: 'wage-tax' | 'aov' | 'aww';
  description: string;
  rate?: number;
  brackets?: TaxBracket[];
  employerContribution?: number;
  employeeContribution?: number;
  calculationMode?: 'aggregated' | 'component_based' | 'proportional_distribution';
  status: 'active' | 'inactive';
  effectiveDate: string;
  lastUpdated: string;
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
  breakdown?: {
    bracket: TaxBracket;
    taxableIncome: number;
    tax: number;
  }[];
}

const TaxSettingsPage = () => {
  // API hooks
  const { data: wageRules, isLoading: wageLoading, error: wageError, refetch: refetchWage } = useTaxRules({ type: 'wage-tax' });
  const { data: aovRules, isLoading: aovLoading, error: aovError, refetch: refetchAov } = useTaxRules({ type: 'aov' });
  const { data: awwRules, isLoading: awwLoading, error: awwError, refetch: refetchAww } = useTaxRules({ type: 'aww' });
  
  const createMutation = useCreateTaxRule();
  const updateMutation = useUpdateTaxRule('');
  const deleteMutation = useDeleteTaxRule();
  const { success, error: errorToast } = useToast();

  // Local state
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null);
  const [isAddingBracket, setIsAddingBracket] = useState(false);
  const [selectedRuleType, setSelectedRuleType] = useState<'wage-tax' | 'aov' | 'aww'>('wage-tax');
  
  // Tax jurisdictions (local UI state)
  const [jurisdictions, setJurisdictions] = useState<TaxJurisdiction[]>([
    { id: '1', name: 'Suriname Federal Tax', type: 'federal', enabled: true },
    { id: '2', name: 'Paramaribo Municipal Tax', type: 'local', enabled: false },
  ]);

  // Get current rules based on selection
  const currentRules = selectedRuleType === 'wage-tax' ? wageRules : 
                      selectedRuleType === 'aov' ? aovRules : awwRules;
  const isLoading = wageLoading || aovLoading || awwLoading;
  const hasError = wageError || aovError || awwError;
  
  // Extract brackets from current wage tax rule
  const taxBrackets = currentRules?.find(rule => rule.status === 'active')?.brackets || [];
  
  // Suriname-specific contributions from API data
  const aovRule = aovRules?.find(rule => rule.status === 'active');
  const awwRule = awwRules?.find(rule => rule.status === 'active');
  const [aovRate, setAovRate] = useState(aovRule?.employeeContribution || 4.0);
  const [awwRate, setAwwRate] = useState(awwRule?.employeeContribution || 1.5);
  const [maxAovBase, setMaxAovBase] = useState(60000);
  
  // Update local rates when API data changes
  useEffect(() => {
    if (aovRule?.employeeContribution) setAovRate(aovRule.employeeContribution);
    if (awwRule?.employeeContribution) setAwwRate(awwRule.employeeContribution);
  }, [aovRule, awwRule]);

  // Add new bracket form
  const [showAddBracket, setShowAddBracket] = useState(false);
  const [newBracketMin, setNewBracketMin] = useState<number | null>(null);
  const [newBracketMax, setNewBracketMax] = useState<number | null>(null);
  const [newBracketRate, setNewBracketRate] = useState<number | null>(null);
  const [newBracketDeduction, setNewBracketDeduction] = useState<number | null>(null);

  // CRUD handlers
  const handleCreateTaxRule = async (type: 'wage-tax' | 'aov' | 'aww', data: any) => {
    try {
      await createMutation.mutateAsync({
        name: `${type.toUpperCase()} Tax Rule`,
        type,
        description: `${type} tax configuration`,
        status: 'active',
        effectiveDate: new Date().toISOString().split('T')[0],
        ...data
      });
      success(`${type} tax rule created successfully`);
      await refetchData();
    } catch (error: any) {
      errorToast(error.message || `Failed to create ${type} rule`);
    }
  };

  const handleUpdateTaxRule = async (ruleId: string, updates: any) => {
    try {
      const updateMutationWithId = useUpdateTaxRule(ruleId);
      await updateMutationWithId.mutateAsync(updates);
      success('Tax rule updated successfully');
      await refetchData();
    } catch (error: any) {
      errorToast(error.message || 'Failed to update tax rule');
    }
  };

  const handleDeleteTaxRule = async (ruleId: string, ruleName: string) => {
    if (!confirm(`Are you sure you want to delete "${ruleName}"?`)) return;
    
    try {
      await deleteMutation.mutateAsync(ruleId);
      success('Tax rule deleted successfully');
      await refetchData();
    } catch (error: any) {
      errorToast(error.message || 'Failed to delete tax rule');
    }
  };

  const refetchData = async () => {
    await Promise.all([refetchWage(), refetchAov(), refetchAww()]);
  };

  // Auto-setup Surinamese tax rules if they don't exist
  const setupSurinameseTaxRules = async () => {
    const hasExistingRules = wageRules?.length || aovRules?.length || awwRules?.length;
    
    if (hasExistingRules) {
      const confirmed = confirm(
        'This will set up standard Surinamese tax rules. Existing rules will be preserved but you may need to review them. Continue?'
      );
      if (!confirmed) return;
    }
    
    try {
      // Create wage tax rule with progressive brackets
      if (!wageRules?.length) {
        await handleCreateTaxRule('wage-tax', {
          brackets: [
            { min: 0, max: 73031, rate: 36.93, deduction: 6150 },
            { min: 73031, max: null, rate: 49.5, deduction: 15316 }
          ],
          calculationMode: 'proportional_distribution'
        });
      }
      
      // Create AOV rule
      if (!aovRules?.length) {
        await handleCreateTaxRule('aov', {
          employeeContribution: 4.0,
          employerContribution: 4.0,
          rate: 8.0 // Combined rate
        });
      }
      
      // Create AWW rule  
      if (!awwRules?.length) {
        await handleCreateTaxRule('aww', {
          employeeContribution: 1.5,
          employerContribution: 1.5,
          rate: 3.0 // Combined rate
        });
      }
      
      success('Surinamese tax rules setup completed');
    } catch (error: any) {
      errorToast(error.message || 'Failed to setup Surinamese tax rules');
    }
  };

  // Tax calculator
  const [calculatorIncome, setCalculatorIncome] = useState(30000);
  const [calculatorResult, setCalculatorResult] = useState<TaxCalculationPreview | null>(null);

  // Save state
  const [isSaved, setIsSaved] = useState(false);

  // Currency for display
  const currency: Currency = 'SRD';

  // Calculate tax based on brackets (matches backend logic)
  const calculateTax = (income: number, brackets: TaxBracket[]): { totalTax: number; breakdown: any[] } => {
    let totalTax = 0;
    let remainingIncome = income;
    const breakdown: any[] = [];

    const sortedBrackets = [...brackets].sort((a, b) => a.min - b.min);

    for (const bracket of sortedBrackets) {
      if (remainingIncome <= 0) break;

      const bracketMin = bracket.min;
      const bracketMax = bracket.max ?? Infinity;
      
      if (income > bracketMin) {
        const taxableInThisBracket = Math.min(
          remainingIncome,
          (bracketMax === Infinity ? income : Math.min(bracketMax, income)) - bracketMin
        );
        
        if (taxableInThisBracket > 0) {
          const bracketTax = (taxableInThisBracket * bracket.rate) / 100 - (bracket.deduction || 0);
          const actualTax = Math.max(0, bracketTax);
          
          totalTax += actualTax;
          remainingIncome -= taxableInThisBracket;
          
          breakdown.push({
            bracket,
            taxableIncome: taxableInThisBracket,
            tax: actualTax
          });
        }
      }
    }

    return { totalTax, breakdown };
  };

  // Calculate full tax preview
  const calculateFullTaxPreview = (grossIncome: number): TaxCalculationPreview => {
    const federalTaxResult = calculateTax(grossIncome, taxBrackets);
    const federalTax = federalTaxResult.totalTax;
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
      breakdown: federalTaxResult.breakdown
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

  // Add tax bracket to existing wage tax rule
  const handleAddBracket = async () => {
    if (newBracketMin !== null && newBracketRate !== null) {
      const activeWageRule = wageRules?.find(rule => rule.status === 'active');
      if (activeWageRule) {
        const newBracket: TaxBracket = {
          min: newBracketMin,
          max: newBracketMax,
          rate: newBracketRate,
          deduction: newBracketDeduction || 0,
        };
        
        const updatedBrackets = [...(activeWageRule.brackets || []), newBracket]
          .sort((a, b) => a.min - b.min);
        
        await handleUpdateTaxRule(activeWageRule.id, {
          brackets: updatedBrackets
        });
      }
      
      setShowAddBracket(false);
      setNewBracketMin(null);
      setNewBracketMax(null);
      setNewBracketRate(null);
      setNewBracketDeduction(null);
    }
  };

  // Delete tax bracket from existing wage tax rule
  const handleDeleteBracket = async (bracketIndex: number) => {
    const activeWageRule = wageRules?.find(rule => rule.status === 'active');
    if (activeWageRule && activeWageRule.brackets) {
      const bracket = activeWageRule.brackets[bracketIndex];
      const bracketText = bracket ? 
        `bracket for income above ${formatCurrency(bracket.minIncome)}` : 
        'this tax bracket';
      
      if (!confirm(`Are you sure you want to delete ${bracketText}?`)) return;
      
      const updatedBrackets = activeWageRule.brackets.filter((_, index) => index !== bracketIndex);
      await handleUpdateTaxRule(activeWageRule.id, {
        brackets: updatedBrackets
      });
    }
  };

  // Format currency
  const formatCurrency = (amount: number, curr: Currency = currency): string => {
    const symbol = curr === 'SRD' ? '$' : curr === 'USD' ? '$' : '€';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Handle save - save AOV/AWW rates
  const handleSave = async () => {
    try {
      // Update AOV rule if rates changed
      if (aovRule && aovRule.employeeContribution !== aovRate) {
        await handleUpdateTaxRule(aovRule.id, {
          employeeContribution: aovRate,
          rate: aovRate * 2 // Combined employer + employee
        });
      }
      
      // Update AWW rule if rates changed
      if (awwRule && awwRule.employeeContribution !== awwRate) {
        await handleUpdateTaxRule(awwRule.id, {
          employeeContribution: awwRate,
          rate: awwRate * 2 // Combined employer + employee
        });
      }
      
      success('Tax settings saved successfully');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error: any) {
      errorToast(error.message || 'Failed to save tax settings');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Tax Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure tax jurisdictions, brackets, and calculation settings
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={setupSurinameseTaxRules}
              disabled={createTaxRuleMutation.isPending}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                createTaxRuleMutation.isPending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {createTaxRuleMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {createTaxRuleMutation.isPending ? 'Setting up...' : 'Quick Setup'}
            </button>
            <button
              onClick={handleSave}
              disabled={updateTaxRuleMutation.isPending}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                updateTaxRuleMutation.isPending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500`}
            >
              {updateTaxRuleMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {updateTaxRuleMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
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
                            disabled={deleteTaxRuleMutation.isPending}
                            className={`${deleteTaxRuleMutation.isPending ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                            title={deleteTaxRuleMutation.isPending ? 'Deleting...' : 'Delete bracket'}
                          >
                            {deleteTaxRuleMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
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
                      disabled={createTaxRuleMutation.isPending}
                      className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                        createTaxRuleMutation.isPending
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500`}
                    >
                      {createTaxRuleMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Bracket'
                      )}
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


