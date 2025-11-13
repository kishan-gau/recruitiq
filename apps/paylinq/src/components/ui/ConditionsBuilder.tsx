import { useState, useEffect } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import FormField, { Input, Select } from '@/components/ui/FormField';

interface Condition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal' | 'contains' | 'in';
  value: string | number | boolean;
  valueType: 'string' | 'number' | 'boolean';
}

interface ConditionsBuilderProps {
  value: string; // JSON string
  onChange: (jsonString: string) => void;
  disabled?: boolean;
}

const CONDITION_FIELDS = [
  { value: 'minHours', label: 'Minimum Hours', type: 'number' },
  { value: 'maxHours', label: 'Maximum Hours', type: 'number' },
  { value: 'minDays', label: 'Minimum Days', type: 'number' },
  { value: 'workerType', label: 'Worker Type', type: 'string' },
  { value: 'employmentType', label: 'Employment Type', type: 'string' },
  { value: 'department', label: 'Department', type: 'string' },
  { value: 'jobTitle', label: 'Job Title', type: 'string' },
  { value: 'workLocation', label: 'Work Location', type: 'string' },
  { value: 'salaryGrade', label: 'Salary Grade', type: 'string' },
  { value: 'isActive', label: 'Is Active', type: 'boolean' },
  { value: 'hasOvertime', label: 'Has Overtime', type: 'boolean' },
];

const OPERATORS = [
  { value: 'equals', label: 'Equals (=)', types: ['string', 'number', 'boolean'] },
  { value: 'not_equals', label: 'Not Equals (≠)', types: ['string', 'number', 'boolean'] },
  { value: 'greater_than', label: 'Greater Than (>)', types: ['number'] },
  { value: 'less_than', label: 'Less Than (<)', types: ['number'] },
  { value: 'greater_or_equal', label: 'Greater or Equal (≥)', types: ['number'] },
  { value: 'less_or_equal', label: 'Less or Equal (≤)', types: ['number'] },
  { value: 'contains', label: 'Contains', types: ['string'] },
  { value: 'in', label: 'In List', types: ['string', 'number'] },
];

const WORKER_TYPES = ['full-time', 'part-time', 'contractor', 'temporary', 'intern'];
const EMPLOYMENT_TYPES = ['permanent', 'contract', 'temporary', 'seasonal', 'probation'];

export default function ConditionsBuilder({ value, onChange, disabled = false }: ConditionsBuilderProps) {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rawJson, setRawJson] = useState('');

  // Parse incoming JSON string to conditions array
  useEffect(() => {
    if (value && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        setRawJson(value);
        
        // Convert object to conditions array
        const conditionsArray: Condition[] = Object.entries(parsed).map(([key, val], index) => ({
          id: `${key}-${index}`,
          field: key,
          operator: 'equals',
          value: val as string | number | boolean,
          valueType: typeof val as 'string' | 'number' | 'boolean',
        }));
        
        setConditions(conditionsArray);
      } catch (error) {
        console.error('Failed to parse conditions JSON:', error);
        setRawJson(value);
      }
    }
  }, [value]);

  // Convert conditions array back to JSON string
  useEffect(() => {
    if (showAdvanced) return; // Don't auto-convert when in advanced mode
    
    const conditionsObject: Record<string, any> = {};
    conditions.forEach((condition) => {
      if (condition.field && condition.value !== undefined && condition.value !== '') {
        conditionsObject[condition.field] = condition.value;
      }
    });

    const jsonString = Object.keys(conditionsObject).length > 0 
      ? JSON.stringify(conditionsObject, null, 2)
      : '';
    
    // Only call onChange if the value actually changed
    if (jsonString !== value) {
      onChange(jsonString);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditions, showAdvanced]);

  const addCondition = () => {
    const newCondition: Condition = {
      id: `condition-${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      valueType: 'string',
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map((c) => {
      if (c.id === id) {
        const updated = { ...c, ...updates };
        
        // Update valueType when field changes
        if (updates.field) {
          const fieldDef = CONDITION_FIELDS.find((f) => f.value === updates.field);
          if (fieldDef) {
            updated.valueType = fieldDef.type as 'string' | 'number' | 'boolean';
            // Reset value when field type changes
            updated.value = fieldDef.type === 'boolean' ? false : '';
          }
        }
        
        return updated;
      }
      return c;
    }));
  };

  const renderValueInput = (condition: Condition) => {
    const field = CONDITION_FIELDS.find((f) => f.value === condition.field);
    
    if (condition.valueType === 'boolean') {
      return (
        <Select
          value={String(condition.value)}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value === 'true' })}
          options={[
            { value: 'true', label: 'Yes / True' },
            { value: 'false', label: 'No / False' },
          ]}
          disabled={disabled}
        />
      );
    }

    if (condition.field === 'workerType') {
      return (
        <Select
          value={String(condition.value)}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
          options={[
            { value: '', label: 'Select worker type...' },
            ...WORKER_TYPES.map((type) => ({ value: type, label: type })),
          ]}
          disabled={disabled}
        />
      );
    }

    if (condition.field === 'employmentType') {
      return (
        <Select
          value={String(condition.value)}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
          options={[
            { value: '', label: 'Select employment type...' },
            ...EMPLOYMENT_TYPES.map((type) => ({ value: type, label: type })),
          ]}
          disabled={disabled}
        />
      );
    }

    if (condition.valueType === 'number') {
      return (
        <Input
          type="number"
          step="0.01"
          value={String(condition.value)}
          onChange={(e) => updateCondition(condition.id, { value: parseFloat(e.target.value) || 0 })}
          placeholder={field?.label || 'Enter number'}
          disabled={disabled}
        />
      );
    }

    return (
      <Input
        type="text"
        value={String(condition.value)}
        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
        placeholder={field?.label || 'Enter value'}
        disabled={disabled}
      />
    );
  };

  if (showAdvanced) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Advanced JSON Editor
          </label>
          <button
            type="button"
            onClick={() => setShowAdvanced(false)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Switch to Visual Builder
          </button>
        </div>
        <textarea
          value={rawJson}
          onChange={(e) => {
            setRawJson(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-blue-400 focus:border-transparent"
          rows={6}
          placeholder='{"minHours": 40, "workerType": "full-time"}'
          disabled={disabled}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ⚠️ Make sure to enter valid JSON format
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Conditions
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (Optional - When should this component apply?)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAdvanced(true)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <ChevronDown className="w-3 h-3" />
          Advanced JSON
        </button>
      </div>

      {conditions.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            No conditions set. This component will apply to all workers.
          </p>
          <button
            type="button"
            onClick={addCondition}
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg inline-flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add First Condition
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div
              key={condition.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {index === 0 ? (
                    <FormField label="Field">
                      <Select
                        value={condition.field}
                        onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                        options={[
                          { value: '', label: 'Select field...' },
                          ...CONDITION_FIELDS.map((f) => ({ value: f.value, label: f.label })),
                        ]}
                        disabled={disabled}
                      />
                    </FormField>
                  ) : (
                    <div>
                      <Select
                        value={condition.field}
                        onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                        options={[
                          { value: '', label: 'Select field...' },
                          ...CONDITION_FIELDS.map((f) => ({ value: f.value, label: f.label })),
                        ]}
                        disabled={disabled}
                      />
                    </div>
                  )}

                  {index === 0 ? (
                    <FormField label="Operator">
                      <Select
                        value={condition.operator}
                        onChange={(e) => updateCondition(condition.id, { operator: e.target.value as any })}
                        options={
                          condition.field
                            ? [
                                { value: '', label: 'Select operator...' },
                                ...OPERATORS.filter((op) => op.types.includes(condition.valueType)).map((op) => ({
                                  value: op.value,
                                  label: op.label,
                                })),
                              ]
                            : [{ value: '', label: 'Select field first...' }]
                        }
                        disabled={disabled || !condition.field}
                      />
                    </FormField>
                  ) : (
                    <div>
                      <Select
                        value={condition.operator}
                        onChange={(e) => updateCondition(condition.id, { operator: e.target.value as any })}
                        options={
                          condition.field
                            ? [
                                { value: '', label: 'Select operator...' },
                                ...OPERATORS.filter((op) => op.types.includes(condition.valueType)).map((op) => ({
                                  value: op.value,
                                  label: op.label,
                                })),
                              ]
                            : [{ value: '', label: 'Select field first...' }]
                        }
                        disabled={disabled || !condition.field}
                      />
                    </div>
                  )}

                  {index === 0 ? (
                    <FormField label="Value">
                      {renderValueInput(condition)}
                    </FormField>
                  ) : (
                    <div>
                      {renderValueInput(condition)}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeCondition(condition.id)}
                  disabled={disabled}
                  className="mt-6 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                  title="Remove condition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addCondition}
            disabled={disabled}
            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add Another Condition
          </button>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          <strong>💡 Tip:</strong> Conditions determine when this component applies. For example, "minHours = 40" means this component only applies if the worker has at least 40 hours.
        </p>
      </div>
    </div>
  );
}
