/**
 * RunTypeSelector Component
 * Allows selection of payroll run type
 */

import { FormField } from '@recruitiq/ui';

interface RunType {
  id: string;
  name: string;
  description?: string;
}

interface RunTypeSelectorProps {
  value: RunType | null;
  onChange: (runType: RunType | null) => void;
  required?: boolean;
  error?: string;
}

const runTypes: RunType[] = [
  { id: 'regular', name: 'Regular Payroll', description: 'Standard pay period processing' },
  { id: 'off-cycle', name: 'Off-Cycle', description: 'Special one-time payment' },
  { id: 'bonus', name: 'Bonus', description: 'Bonus payment processing' },
  { id: 'adjustment', name: 'Adjustment', description: 'Correction or adjustment run' },
];

export function RunTypeSelector({ value, onChange, required, error }: RunTypeSelectorProps) {
  return (
    <FormField
      label="Run Type"
      required={required}
      error={error}
    >
      <div className="space-y-2">
        {runTypes.map((runType) => (
          <label
            key={runType.id}
            className="flex items-start p-3 border rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
          >
            <input
              type="radio"
              name="runType"
              checked={value?.id === runType.id}
              onChange={() => onChange(runType)}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">{runType.name}</div>
              {runType.description && (
                <div className="text-sm text-gray-600 mt-0.5">{runType.description}</div>
              )}
            </div>
          </label>
        ))}
      </div>
    </FormField>
  );
}
