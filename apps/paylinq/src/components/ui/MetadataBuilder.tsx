import { useState, useEffect } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import FormField, { Input, Select } from '@/components/ui/FormField';

interface MetadataItem {
  id: string;
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean';
}

interface MetadataBuilderProps {
  value: string; // JSON string
  onChange: (jsonString: string) => void;
  disabled?: boolean;
}

const COMMON_METADATA_KEYS = [
  { value: 'category', label: 'Category', type: 'string', placeholder: 'e.g., regular, special' },
  { value: 'taxable', label: 'Taxable', type: 'boolean', placeholder: '' },
  { value: 'displayOrder', label: 'Display Order', type: 'number', placeholder: 'e.g., 1, 2, 3' },
  { value: 'payslipLabel', label: 'Payslip Label', type: 'string', placeholder: 'e.g., Base Pay' },
  { value: 'description', label: 'Description', type: 'string', placeholder: 'e.g., Monthly basic salary' },
  { value: 'glAccount', label: 'GL Account', type: 'string', placeholder: 'e.g., 5000-100' },
  { value: 'costCenter', label: 'Cost Center', type: 'string', placeholder: 'e.g., HR-001' },
  { value: 'reportingGroup', label: 'Reporting Group', type: 'string', placeholder: 'e.g., Regular Pay' },
  { value: 'isStatutory', label: 'Is Statutory', type: 'boolean', placeholder: '' },
  { value: 'priority', label: 'Priority', type: 'number', placeholder: 'e.g., 1-10' },
];

export default function MetadataBuilder({ value, onChange, disabled = false }: MetadataBuilderProps) {
  const [metadata, setMetadata] = useState<MetadataItem[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rawJson, setRawJson] = useState('');

  // Parse incoming JSON string to metadata array
  useEffect(() => {
    if (value && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        setRawJson(value);
        
        // Convert object to metadata array
        const metadataArray: MetadataItem[] = Object.entries(parsed).map(([key, val], index) => {
          const commonKey = COMMON_METADATA_KEYS.find((k) => k.value === key);
          return {
            id: `${key}-${index}`,
            key,
            value: String(val),
            valueType: commonKey?.type as 'string' | 'number' | 'boolean' || 
                      (typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string'),
          };
        });
        
        setMetadata(metadataArray);
      } catch (error) {
        console.error('Failed to parse metadata JSON:', error);
        setRawJson(value);
      }
    }
  }, [value]);

  // Convert metadata array back to JSON string
  useEffect(() => {
    if (showAdvanced) return; // Don't auto-convert when in advanced mode
    
    const metadataObject: Record<string, any> = {};
    metadata.forEach((item) => {
      if (item.key && item.value !== undefined && item.value !== '') {
        // Convert value based on type
        if (item.valueType === 'number') {
          metadataObject[item.key] = parseFloat(item.value) || 0;
        } else if (item.valueType === 'boolean') {
          metadataObject[item.key] = item.value === 'true';
        } else {
          metadataObject[item.key] = item.value;
        }
      }
    });

    const jsonString = Object.keys(metadataObject).length > 0
      ? JSON.stringify(metadataObject, null, 2)
      : '';
    
    // Only call onChange if the value actually changed
    if (jsonString !== value) {
      onChange(jsonString);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata, showAdvanced]);

  const addMetadata = () => {
    const newItem: MetadataItem = {
      id: `metadata-${Date.now()}`,
      key: '',
      value: '',
      valueType: 'string',
    };
    setMetadata([...metadata, newItem]);
  };

  const removeMetadata = (id: string) => {
    setMetadata(metadata.filter((m) => m.id !== id));
  };

  const updateMetadata = (id: string, updates: Partial<MetadataItem>) => {
    setMetadata(metadata.map((m) => {
      if (m.id === id) {
        const updated = { ...m, ...updates };
        
        // Update valueType when key changes to a common key
        if (updates.key) {
          const commonKey = COMMON_METADATA_KEYS.find((k) => k.value === updates.key);
          if (commonKey) {
            updated.valueType = commonKey.type as 'string' | 'number' | 'boolean';
            // Reset value when type changes
            updated.value = commonKey.type === 'boolean' ? 'false' : '';
          }
        }
        
        return updated;
      }
      return m;
    }));
  };

  const renderValueInput = (item: MetadataItem) => {
    const commonKey = COMMON_METADATA_KEYS.find((k) => k.value === item.key);
    
    if (item.valueType === 'boolean') {
      return (
        <Select
          value={String(item.value)}
          onChange={(e) => updateMetadata(item.id, { value: e.target.value })}
          options={[
            { value: 'true', label: 'Yes / True' },
            { value: 'false', label: 'No / False' },
          ]}
          disabled={disabled}
        />
      );
    }

    if (item.valueType === 'number') {
      return (
        <Input
          type="number"
          step="0.01"
          value={item.value}
          onChange={(e) => updateMetadata(item.id, { value: e.target.value })}
          placeholder={commonKey?.placeholder || 'Enter number'}
          disabled={disabled}
        />
      );
    }

    return (
      <Input
        type="text"
        value={item.value}
        onChange={(e) => updateMetadata(item.id, { value: e.target.value })}
        placeholder={commonKey?.placeholder || 'Enter value'}
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
          placeholder='{"category": "regular", "taxable": true}'
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
            Additional Metadata
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (Optional - Extra information for reporting & integration)
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

      {metadata.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            No metadata defined. Add custom fields for reporting, integrations, or accounting.
          </p>
          <button
            type="button"
            onClick={addMetadata}
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg inline-flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Metadata Field
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {metadata.map((item, index) => (
            <div
              key={item.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {index === 0 ? (
                    <FormField label="Key / Field Name">
                      <Select
                        value={item.key}
                        onChange={(e) => updateMetadata(item.id, { key: e.target.value })}
                        options={[
                          { value: '', label: 'Select or enter custom key...' },
                          ...COMMON_METADATA_KEYS.map((k) => ({ value: k.value, label: k.label })),
                        ]}
                        disabled={disabled}
                      />
                    </FormField>
                  ) : (
                    <div>
                      <Select
                        value={item.key}
                        onChange={(e) => updateMetadata(item.id, { key: e.target.value })}
                        options={[
                          { value: '', label: 'Select or enter custom key...' },
                          ...COMMON_METADATA_KEYS.map((k) => ({ value: k.value, label: k.label })),
                        ]}
                        disabled={disabled}
                      />
                    </div>
                  )}

                  {index === 0 ? (
                    <FormField label="Value">
                      {renderValueInput(item)}
                    </FormField>
                  ) : (
                    <div>
                      {renderValueInput(item)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {index === 0 && (
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 h-5">
                      Type
                    </div>
                  )}
                  <Select
                    value={item.valueType}
                    onChange={(e) => updateMetadata(item.id, { 
                      valueType: e.target.value as 'string' | 'number' | 'boolean',
                      value: e.target.value === 'boolean' ? 'false' : '',
                    })}
                    options={[
                      { value: 'string', label: 'Text' },
                      { value: 'number', label: 'Number' },
                      { value: 'boolean', label: 'Yes/No' },
                    ]}
                    disabled={disabled}
                    className="w-24"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeMetadata(item.id)}
                  disabled={disabled}
                  className={`p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 ${
                    index === 0 ? 'mt-6' : ''
                  }`}
                  title="Remove metadata"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addMetadata}
            disabled={disabled}
            className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add Another Field
          </button>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          <strong>💡 Tip:</strong> Metadata is extra information used for accounting (GL accounts), reporting (categories), or payslip display. Common fields are available in the dropdown.
        </p>
      </div>
    </div>
  );
}
