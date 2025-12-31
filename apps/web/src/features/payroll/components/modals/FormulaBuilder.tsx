import { useState, useEffect, useCallback, useRef } from 'react';

import { FormField, Input, Select } from '@recruitiq/ui';

import { usePaylinqAPI } from '../../hooks/usePaylinqAPI';

interface FormulaRule {
  id: string;
  variable: string;
  operator: 'multiply' | 'divide' | 'add' | 'subtract';
  valueType: 'percentage' | 'fixed' | 'variable';
  value: number | string;
  combineOperator?: 'add' | 'subtract' | 'none'; // How to combine with next rule
}

// Conditional rule structure for future IF/THEN/ELSE feature
// Currently not implemented
/*
interface ConditionalRule {
  id: string;
  condition: {
    variable: string;
    comparator: 'greater_than' | 'less_than' | 'equal_to' | 'greater_or_equal' | 'less_or_equal' | 'not_equal';
    value: number;
  };
  thenRules: FormulaRule[];
  elseRules: FormulaRule[];
}
*/

interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  field?: string;
}

interface FormulaBuilderProps {
  value: string;
  onChange: (formula: string) => void;
  disabled?: boolean;
  componentType: 'earning' | 'deduction';
}

const FORMULA_TEMPLATES = [
  {
    id: 'percentage_of_gross',
    name: 'Percentage of Gross Pay',
    description: 'Calculate as X% of gross pay (e.g., retirement contribution)',
    example: 'gross_pay * 0.10 = 10% of gross',
    formula: 'gross_pay * {percentage}',
    defaultRule: { variable: 'gross_pay', operator: 'multiply' as const, valueType: 'percentage' as const, value: 10 },
  },
  {
    id: 'percentage_of_base',
    name: 'Percentage of Base Salary',
    description: 'Calculate as X% of base salary (e.g., bonus)',
    example: 'base_salary * 0.15 = 15% bonus',
    formula: 'base_salary * {percentage}',
    defaultRule: { variable: 'base_salary', operator: 'multiply' as const, valueType: 'percentage' as const, value: 15 },
  },
  {
    id: 'hours_times_rate',
    name: 'Hours × Hourly Rate',
    description: 'Calculate based on hours worked (e.g., overtime pay)',
    example: 'hours_worked * 25.00',
    formula: 'hours_worked * {rate}',
    defaultRule: { variable: 'hours_worked', operator: 'multiply' as const, valueType: 'fixed' as const, value: 25 },
  },
  {
    id: 'fixed_per_period',
    name: 'Fixed Amount per Period',
    description: 'Same amount every pay period (e.g., phone allowance)',
    example: '150.00',
    formula: '{amount}',
    defaultRule: { variable: '', operator: 'add' as const, valueType: 'fixed' as const, value: 150 },
  },
  {
    id: 'tiered_calculation',
    name: 'Tiered Calculation',
    description: 'Different rates for different amounts (e.g., progressive tax)',
    example: 'IF gross_pay > 5000 THEN 0.15 ELSE 0.10',
    formula: 'IF(gross_pay > {threshold}, gross_pay * {rate1}, gross_pay * {rate2})',
    defaultRule: { variable: 'gross_pay', operator: 'multiply' as const, valueType: 'percentage' as const, value: 10 },
  },
  {
    id: 'custom',
    name: 'Custom Formula',
    description: 'Build your own formula from scratch',
    example: 'Combine multiple variables and operators',
    formula: '',
    defaultRule: { variable: 'gross_pay', operator: 'multiply' as const, valueType: 'percentage' as const, value: 0 },
  },
];

const AVAILABLE_VARIABLES = [
  { value: 'base_salary', label: 'Base Salary', description: 'Employee base salary amount' },
  { value: 'gross_pay', label: 'Gross Pay', description: 'Total earnings before deductions' },
  { value: 'net_pay', label: 'Net Pay', description: 'Pay after all deductions' },
  { value: 'hours_worked', label: 'Hours Worked', description: 'Total hours for the period' },
  { value: 'regular_hours', label: 'Regular Hours', description: 'Standard work hours' },
  { value: 'overtime_hours', label: 'Overtime Hours', description: 'Hours beyond regular time' },
  { value: 'hourly_rate', label: 'Hourly Rate', description: 'Standard hourly pay rate' },
  { value: 'days_worked', label: 'Days Worked', description: 'Number of working days' },
  { value: 'taxable_income', label: 'Taxable Income', description: 'Income subject to tax' },
];

const OPERATORS = [
  { value: 'multiply', label: 'Multiply by (×)', symbol: '*' },
  { value: 'divide', label: 'Divide by (÷)', symbol: '/' },
  { value: 'add', label: 'Add (+)', symbol: '+' },
  { value: 'subtract', label: 'Subtract (-)', symbol: '-' },
];

const COMPARATORS = [
  { value: 'greater_than', label: 'Greater than (>)', symbol: '>' },
  { value: 'less_than', label: 'Less than (<)', symbol: '<' },
  { value: 'equal_to', label: 'Equal to (=)', symbol: '==' },
  { value: 'greater_or_equal', label: 'Greater or equal (≥)', symbol: '>=' },
  { value: 'less_or_equal', label: 'Less or equal (≤)', symbol: '<=' },
  { value: 'not_equal', label: 'Not equal (≠)', symbol: '!=' },
];

// Combine operators for chaining rules (not currently used in UI)
// const COMBINE_OPERATORS = [
//   { value: 'none', label: 'Replace', symbol: '' },
//   { value: 'add', label: 'Then add (+)', symbol: '+' },
//   { value: 'subtract', label: 'Then subtract (-)', symbol: '-' },
// ];

export default function FormulaBuilder({ value, onChange, disabled }: FormulaBuilderProps) {
  const { client } = usePaylinqAPI();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [rules, setRules] = useState<FormulaRule[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customFormula, setCustomFormula] = useState('');
  const [useConditional, setUseConditional] = useState(false);
  const [conditionalVar, setConditionalVar] = useState('gross_pay');
  const [comparator, setComparator] = useState<'greater_than' | 'less_than' | 'equal_to' | 'greater_or_equal' | 'less_or_equal' | 'not_equal'>('greater_than');
  const [thresholdValue, setThresholdValue] = useState<number>(0);
  const [thenRules, setThenRules] = useState<FormulaRule[]>([]);
  const [elseRules, setElseRules] = useState<FormulaRule[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  // Validation state (used in validateFormula callback)
  // const [isValidating, setIsValidating] = useState(false);
  // const [validationResult, setValidationResult] = useState<any>(null);

  // Debounce timer ref
  const validationTimerRef = useRef<number | null>(null);

  // Validate formula with backend API (debounced)
  const validateFormula = useCallback((formula: string) => {
    if (!formula || formula.trim() === '') {
      setValidationErrors([]);
      // setValidationResult(null);
      return;
    }

    // Clear previous timer
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    // Debounce validation by 500ms
    validationTimerRef.current = window.setTimeout(async () => {
      // setIsValidating(true);
      setValidationErrors([]);

      try {
        const response = await client.post('/paylinq/formulas/validate', { formula });
        const data = response.data;
        
        if (data.success && data.data) {
          // setValidationResult(data.data);
          
          if (!data.data.valid) {
            setValidationErrors(
              data.data.errors.map((err: any) => ({
                type: 'error' as const,
                message: err.message,
              }))
            );
          }
          
          if (data.data.warnings && data.data.warnings.length > 0) {
            setValidationErrors((prev) => [
              ...prev,
              ...data.data.warnings.map((warn: any) => ({
                type: 'warning' as const,
                message: warn.message,
              })),
            ]);
          }
        }
      } catch (error) {
        console.error('Formula validation error:', error);
        // Silently fail validation - don't block user
      } finally {
        // setIsValidating(false);
      }
    }, 500);
  }, [client]);

  // Initialize from existing formula
  useEffect(() => {
    if (value && !selectedTemplate) {
      // Try to parse existing formula
      setCustomFormula(value);
      setShowAdvanced(true);
      setSelectedTemplate('custom');
    }
  }, [value]);

  // Cleanup validation timer on unmount
  useEffect(() => () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    }, []);

  // Generate formula from rules
  useEffect(() => {
    if (selectedTemplate === 'custom' && showAdvanced) {
      onChange(customFormula);
      validateFormula(customFormula);
      return;
    }

    if (rules.length === 0) return;

    let formula = '';

    if (useConditional) {
      // Build conditional formula: IF(condition, then, else)
      const comparatorSymbol = COMPARATORS.find((c) => c.value === comparator)?.symbol || '>';
      const condition = `${conditionalVar} ${comparatorSymbol} ${thresholdValue}`;
      
      const thenFormula = buildFormulaFromRules(thenRules);
      const elseFormula = buildFormulaFromRules(elseRules);
      
      formula = `IF(${condition}, ${thenFormula}, ${elseFormula})`;
    } else {
      formula = buildFormulaFromRules(rules);
    }

    onChange(formula);
    validateFormula(formula);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules, customFormula, selectedTemplate, showAdvanced, useConditional, conditionalVar, comparator, thresholdValue, thenRules, elseRules, validateFormula]);

  // Build formula string from rules array
  const buildFormulaFromRules = (rulesList: FormulaRule[]): string => {
    const formulaParts = rulesList.map((rule) => {
      const operatorSymbol = OPERATORS.find((op) => op.value === rule.operator)?.symbol || '*';
      
      if (!rule.variable && rule.valueType === 'fixed') {
        return String(rule.value);
      }

      if (rule.valueType === 'percentage') {
        const percentDecimal = Number(rule.value) / 100;
        return `${rule.variable} ${operatorSymbol} ${percentDecimal}`;
      } else if (rule.valueType === 'variable') {
        return `${rule.variable} ${operatorSymbol} ${rule.value}`;
      } else {
        return `${rule.variable} ${operatorSymbol} ${rule.value}`;
      }
    });

    return formulaParts.join(' + ');
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = FORMULA_TEMPLATES.find((t) => t.id === templateId);
    
    if (!template) return;

    if (templateId === 'custom') {
      setShowAdvanced(true);
      setRules([]);
      return;
    }

    setShowAdvanced(false);
    const newRule: FormulaRule = {
      id: Date.now().toString(),
      ...template.defaultRule,
    };
    setRules([newRule]);
  };

  const updateRule = (ruleId: string, field: keyof FormulaRule, value: any) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId ? { ...rule, [field]: value } : rule
      )
    );
  };

  const addRule = () => {
    const newRule: FormulaRule = {
      id: Date.now().toString(),
      variable: 'gross_pay',
      operator: 'multiply',
      valueType: 'percentage',
      value: 0,
    };
    setRules((prev) => [...prev, newRule]);
  };

  const removeRule = (ruleId: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  };

  const calculatePreview = () => {
    if (!rules.length && !customFormula) return null;

    // Mock calculation for preview
    const mockValues: Record<string, number> = {
      base_salary: 5000,
      gross_pay: 5500,
      hours_worked: 160,
      hourly_rate: 31.25,
    };

    try {
      if (selectedTemplate === 'custom') {
        return { formula: customFormula, example: 'Enter valid formula to see preview' };
      }

      const rule = rules[0];
      if (!rule) return null;

      const baseValue = rule.variable ? mockValues[rule.variable] || 0 : 0;
      const ruleValue = Number(rule.value) || 0;

      let result = 0;
      let exampleText = '';

      if (!rule.variable && rule.valueType === 'fixed') {
        result = ruleValue;
        exampleText = `SRD ${ruleValue.toFixed(2)}`;
      } else if (rule.valueType === 'percentage') {
        result = baseValue * (ruleValue / 100);
        exampleText = `SRD ${baseValue.toFixed(2)} × ${ruleValue}% = SRD ${result.toFixed(2)}`;
      } else {
        const operatorSymbol = OPERATORS.find((op) => op.value === rule.operator)?.symbol || '*';
        switch (rule.operator) {
          case 'multiply':
            result = baseValue * ruleValue;
            break;
          case 'divide':
            result = baseValue / ruleValue;
            break;
          case 'add':
            result = baseValue + ruleValue;
            break;
          case 'subtract':
            result = baseValue - ruleValue;
            break;
        }
        exampleText = `SRD ${baseValue.toFixed(2)} ${operatorSymbol} ${ruleValue} = SRD ${result.toFixed(2)}`;
      }

      // Get the actual formula
      const formula = rules.map((r) => {
        const op = OPERATORS.find((o) => o.value === r.operator)?.symbol || '*';
        if (!r.variable && r.valueType === 'fixed') return String(r.value);
        if (r.valueType === 'percentage') {
          return `${r.variable} ${op} ${(Number(r.value) / 100).toFixed(2)}`;
        }
        return `${r.variable} ${op} ${r.value}`;
      }).join(' + ');

      return { formula, example: exampleText };
    } catch (error) {
      return { formula: '', example: 'Invalid formula' };
    }
  };

  const preview = calculatePreview();

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <FormField label="Select Formula Template" required>
        <Select
          value={selectedTemplate}
          onChange={(e) => handleTemplateSelect(e.target.value)}
          options={[
            { value: '', label: 'Choose a template...' },
            ...FORMULA_TEMPLATES.map((t) => ({ value: t.id, label: t.name })),
          ]}
          disabled={disabled}
        />
      </FormField>

      {selectedTemplate && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-1">
            {FORMULA_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {FORMULA_TEMPLATES.find((t) => t.id === selectedTemplate)?.description}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-mono">
            Example: {FORMULA_TEMPLATES.find((t) => t.id === selectedTemplate)?.example}
          </p>
        </div>
      )}

      {/* Custom Formula (Advanced Mode) */}
      {showAdvanced && selectedTemplate === 'custom' && !useConditional && (
        <div className="space-y-4">
          <FormField 
            label="Custom Formula Expression" 
            required
            hint="Use variables like gross_pay, base_salary, hours_worked with operators +, -, *, /"
          >
            <Input
              type="text"
              value={customFormula}
              onChange={(e) => setCustomFormula(e.target.value)}
              placeholder="e.g., (base_salary * 0.10) + (overtime_hours * 1.5)"
              disabled={disabled}
              className="font-mono text-sm"
            />
          </FormField>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Available Variables:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_VARIABLES.map((variable) => (
                <button
                  key={variable.value}
                  type="button"
                  onClick={() => setCustomFormula((prev) => prev + (prev ? ' ' : '') + variable.value)}
                  disabled={disabled}
                  className="text-left p-2 text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 transition-colors disabled:opacity-50"
                  title={variable.description}
                >
                  <span className="font-mono text-blue-600 dark:text-blue-400">{variable.value}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
            <p>💡 <strong>Want to build your formula visually?</strong></p>
            <p className="mt-1">Uncheck "Custom Formula" above and optionally enable "Use conditional logic (IF/THEN/ELSE)" to use the visual builder.</p>
          </div>
        </div>
      )}

      {/* Conditional Logic Toggle */}
      {selectedTemplate && !showAdvanced && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <input
            type="checkbox"
            id="use-conditional"
            checked={useConditional}
            onChange={(e) => setUseConditional(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 rounded focus:ring-emerald-500"
          />
          <label htmlFor="use-conditional" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Use conditional logic (IF/THEN/ELSE)
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            Apply different calculations based on conditions
          </span>
        </div>
      )}

      {/* Conditional Logic Builder */}
      {useConditional && (
        <div className="border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 space-y-4 bg-purple-50/50 dark:bg-purple-900/10">
          <h4 className="font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
            <span>⚡</span> Conditional Logic
          </h4>
          
          {/* Condition */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
              IF (Condition):
            </p>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Variable">
                <Select
                  value={conditionalVar}
                  onChange={(e) => setConditionalVar(e.target.value)}
                  options={AVAILABLE_VARIABLES.map((v) => ({ value: v.value, label: v.label }))}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Comparator">
                <Select
                  value={comparator}
                  onChange={(e) => setComparator(e.target.value as any)}
                  options={COMPARATORS.map((c) => ({ value: c.value, label: c.label }))}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Threshold">
                <Input
                  type="number"
                  step="0.01"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                />
              </FormField>
            </div>
          </div>

          {/* THEN Rules */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-3">
              THEN (If condition is true):
            </p>
            {thenRules.map((rule, index) => (
              <div key={rule.id} className="grid grid-cols-3 gap-3 mb-2">
                <Select
                  value={rule.variable}
                  onChange={(e) => {
                    const newRules = [...thenRules];
                    newRules[index] = { ...newRules[index], variable: e.target.value };
                    setThenRules(newRules);
                  }}
                  options={AVAILABLE_VARIABLES.map((v) => ({ value: v.value, label: v.label }))}
                  disabled={disabled}
                />
                <Select
                  value={rule.operator}
                  onChange={(e) => {
                    const newRules = [...thenRules];
                    newRules[index] = { ...newRules[index], operator: e.target.value as any };
                    setThenRules(newRules);
                  }}
                  options={OPERATORS.map((op) => ({ value: op.value, label: op.label }))}
                  disabled={disabled}
                />
                <Input
                  type="number"
                  step="0.01"
                  value={rule.value}
                  onChange={(e) => {
                    const newRules = [...thenRules];
                    newRules[index] = { ...newRules[index], value: parseFloat(e.target.value) || 0 };
                    setThenRules(newRules);
                  }}
                  disabled={disabled}
                />
              </div>
            ))}
            {thenRules.length === 0 && (
              <button
                type="button"
                onClick={() => setThenRules([{ id: Date.now().toString(), variable: 'gross_pay', operator: 'multiply', valueType: 'percentage', value: 15 }])}
                disabled={disabled}
                className="text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                + Add THEN calculation
              </button>
            )}
          </div>

          {/* ELSE Rules */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
            <p className="text-xs font-semibold text-orange-900 dark:text-orange-100 mb-3">
              ELSE (If condition is false):
            </p>
            {elseRules.map((rule, index) => (
              <div key={rule.id} className="grid grid-cols-3 gap-3 mb-2">
                <Select
                  value={rule.variable}
                  onChange={(e) => {
                    const newRules = [...elseRules];
                    newRules[index] = { ...newRules[index], variable: e.target.value };
                    setElseRules(newRules);
                  }}
                  options={AVAILABLE_VARIABLES.map((v) => ({ value: v.value, label: v.label }))}
                  disabled={disabled}
                />
                <Select
                  value={rule.operator}
                  onChange={(e) => {
                    const newRules = [...elseRules];
                    newRules[index] = { ...newRules[index], operator: e.target.value as any };
                    setElseRules(newRules);
                  }}
                  options={OPERATORS.map((op) => ({ value: op.value, label: op.label }))}
                  disabled={disabled}
                />
                <Input
                  type="number"
                  step="0.01"
                  value={rule.value}
                  onChange={(e) => {
                    const newRules = [...elseRules];
                    newRules[index] = { ...newRules[index], value: parseFloat(e.target.value) || 0 };
                    setElseRules(newRules);
                  }}
                  disabled={disabled}
                />
              </div>
            ))}
            {elseRules.length === 0 && (
              <button
                type="button"
                onClick={() => setElseRules([{ id: Date.now().toString(), variable: 'gross_pay', operator: 'multiply', valueType: 'percentage', value: 10 }])}
                disabled={disabled}
                className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
              >
                + Add ELSE calculation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Rule-Based Builder */}
      {!showAdvanced && selectedTemplate && !useConditional && (
        <div className="space-y-4">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Rule {index + 1}
                </h4>
                {rules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRule(rule.id)}
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Variable Selection */}
                {rule.valueType !== 'fixed' || rule.variable ? (
                  <FormField label="Calculate from">
                    <Select
                      value={rule.variable}
                      onChange={(e) => updateRule(rule.id, 'variable', e.target.value)}
                      options={[
                        { value: '', label: 'Select variable...' },
                        ...AVAILABLE_VARIABLES.map((v) => ({ value: v.value, label: v.label })),
                      ]}
                      disabled={disabled}
                    />
                  </FormField>
                ) : null}

                {/* Operator Selection */}
                {rule.variable && (
                  <FormField label="Operation">
                    <Select
                      value={rule.operator}
                      onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                      options={OPERATORS.map((op) => ({ value: op.value, label: op.label }))}
                      disabled={disabled}
                    />
                  </FormField>
                )}

                {/* Value Input */}
                <FormField label={rule.valueType === 'percentage' ? 'Percentage (%)' : rule.valueType === 'variable' ? 'Variable' : 'Amount (SRD)'}>
                  <div className="flex gap-2">
                    <Input
                      type={rule.valueType === 'variable' ? 'text' : 'number'}
                      step={rule.valueType === 'percentage' ? '0.01' : '0.01'}
                      min="0"
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, 'value', rule.valueType === 'variable' ? e.target.value : parseFloat(e.target.value) || 0)}
                      placeholder={rule.valueType === 'percentage' ? '10.5' : '100'}
                      disabled={disabled}
                      className="flex-1"
                    />
                    <Select
                      value={rule.valueType}
                      onChange={(e) => {
                        updateRule(rule.id, 'valueType', e.target.value);
                        updateRule(rule.id, 'value', 0);
                      }}
                      options={[
                        { value: 'percentage', label: '%' },
                        { value: 'fixed', label: 'SRD' },
                        { value: 'variable', label: 'Var' },
                      ]}
                      disabled={disabled}
                      className="w-20"
                    />
                  </div>
                </FormField>
              </div>
            </div>
          ))}

          {selectedTemplate === 'custom' && (
            <button
              type="button"
              onClick={addRule}
              disabled={disabled}
              className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              + Add Another Rule
            </button>
          )}
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="space-y-2">
          {validationErrors.map((error, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-3 rounded-lg border ${
                error.type === 'error'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              }`}
            >
              <span className="text-lg">{error.type === 'error' ? '❌' : '⚠️'}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  error.type === 'error'
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-yellow-900 dark:text-yellow-100'
                }`}>
                  {error.type === 'error' ? 'Error' : 'Warning'}
                  {error.field && `: ${error.field}`}
                </p>
                <p className={`text-xs ${
                  error.type === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  {error.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formula Preview */}
      {preview && (selectedTemplate !== '' || customFormula) && (
        <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-2">
          <div>
            <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">
              Generated Formula:
            </p>
            <p className="font-mono text-sm text-green-800 dark:text-green-200 bg-white dark:bg-gray-900 px-3 py-2 rounded border border-green-300 dark:border-green-700">
              {preview.formula || customFormula || 'No formula generated'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">
              Example Calculation:
            </p>
            <p className="text-sm text-green-800 dark:text-green-200">
              {preview.example}
            </p>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>💡 <strong>Tip:</strong> Start with a template and customize, or choose "Custom Formula" for advanced expressions.</p>
        <p>📊 The preview shows an example calculation with sample values.</p>
      </div>
    </div>
  );
}

