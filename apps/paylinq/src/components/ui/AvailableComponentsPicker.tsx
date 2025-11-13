import { Plus } from 'lucide-react';

interface AvailableComponentsPickerProps {
  onComponentClick: (componentCode: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}

const AVAILABLE_COMPONENTS = [
  { code: 'base_salary', label: 'Base Salary', description: 'Employee base salary amount' },
  { code: 'gross_pay', label: 'Gross Pay', description: 'Total earnings before deductions' },
  { code: 'net_pay', label: 'Net Pay', description: 'Pay after all deductions' },
  { code: 'hours_worked', label: 'Hours Worked', description: 'Total hours for the period' },
  { code: 'regular_hours', label: 'Regular Hours', description: 'Standard work hours' },
  { code: 'overtime_hours', label: 'Overtime Hours', description: 'Hours beyond regular time' },
  { code: 'hourly_rate', label: 'Hourly Rate', description: 'Standard hourly pay rate' },
  { code: 'days_worked', label: 'Days Worked', description: 'Number of working days' },
  { code: 'taxable_income', label: 'Taxable Income', description: 'Income subject to tax' },
];

export default function AvailableComponentsPicker({
  onComponentClick,
  disabled = false,
  label = 'Available Components',
  hint = 'Click on a component to add it to the field',
}: AvailableComponentsPickerProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
      <div className="mb-2">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </p>
        {hint && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {hint}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {AVAILABLE_COMPONENTS.map((component) => (
          <button
            key={component.code}
            type="button"
            onClick={() => onComponentClick(component.code)}
            disabled={disabled}
            className="group text-left p-2 text-xs bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-start gap-2"
            title={component.description}
          >
            <Plus className="w-3 h-3 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-mono text-blue-600 dark:text-blue-400 block truncate">
                {component.code}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-[10px] block truncate">
                {component.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
