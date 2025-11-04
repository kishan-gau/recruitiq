import { Plus, DollarSign, Minus, Edit2, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui';

interface PayComponent {
  id: string;
  name: string;
  code: string;
  type: 'earning' | 'deduction';
  category: string;
  calculationType: 'fixed' | 'percentage' | 'formula';
  defaultValue?: number;
  isRecurring: boolean;
  isTaxable: boolean;
  status: 'active' | 'inactive';
  description: string;
}

const mockPayComponents: PayComponent[] = [
  {
    id: '1',
    name: 'Base Salary',
    code: 'BASE',
    type: 'earning',
    category: 'Regular Pay',
    calculationType: 'fixed',
    isRecurring: true,
    isTaxable: true,
    status: 'active',
    description: 'Monthly base salary as per employment contract',
  },
  {
    id: '2',
    name: 'Overtime Pay',
    code: 'OT',
    type: 'earning',
    category: 'Additional Pay',
    calculationType: 'formula',
    isRecurring: false,
    isTaxable: true,
    status: 'active',
    description: 'Overtime compensation at 1.5x hourly rate',
  },
  {
    id: '3',
    name: 'Vacation Allowance',
    code: 'VAC',
    type: 'earning',
    category: 'Benefits',
    calculationType: 'percentage',
    defaultValue: 8.33,
    isRecurring: true,
    isTaxable: true,
    status: 'active',
    description: '8.33% of gross salary for vacation',
  },
  {
    id: '4',
    name: '13th Month Bonus',
    code: '13M',
    type: 'earning',
    category: 'Bonus',
    calculationType: 'formula',
    isRecurring: false,
    isTaxable: true,
    status: 'active',
    description: 'Annual 13th month salary payment',
  },
  {
    id: '5',
    name: 'Pension Contribution',
    code: 'AOV',
    type: 'deduction',
    category: 'Social Security',
    calculationType: 'percentage',
    defaultValue: 4.0,
    isRecurring: true,
    isTaxable: false,
    status: 'active',
    description: 'Employee contribution to AOV pension fund',
  },
  {
    id: '6',
    name: 'Health Insurance',
    code: 'HEALTH',
    type: 'deduction',
    category: 'Insurance',
    calculationType: 'fixed',
    defaultValue: 150,
    isRecurring: true,
    isTaxable: false,
    status: 'active',
    description: 'Monthly health insurance premium',
  },
  {
    id: '7',
    name: 'Advance Payment',
    code: 'ADV',
    type: 'deduction',
    category: 'Other',
    calculationType: 'fixed',
    isRecurring: false,
    isTaxable: false,
    status: 'active',
    description: 'Salary advance repayment',
  },
];

export default function PayComponentsList() {
  const handleAdd = () => {
    // TODO: Open add component modal
  };

  const handleEdit = (_component: PayComponent) => {
    // TODO: Open edit modal
  };

  const handleDelete = (_componentId: string) => {
    // TODO: Open delete confirmation
  };

  const earnings = mockPayComponents.filter((c) => c.type === 'earning');
  const deductions = mockPayComponents.filter((c) => c.type === 'deduction');

  const ComponentCard = ({ component }: { component: PayComponent }) => (
    <div
      className={`bg-white dark:bg-gray-800 border rounded-lg p-4 hover:shadow-md transition-shadow ${
        component.type === 'earning'
          ? 'border-green-200 dark:border-green-800'
          : 'border-red-200 dark:border-red-800'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg ${
              component.type === 'earning'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            }`}
          >
            {component.type === 'earning' ? (
              <DollarSign className="w-5 h-5" />
            ) : (
              <Minus className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {component.name}
              </h3>
              <StatusBadge status={component.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Code: {component.code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEdit(component)}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(component.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {component.description}
      </p>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Category:</span>
          <p className="font-medium text-gray-900 dark:text-white mt-0.5">
            {component.category}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Calculation:</span>
          <p className="font-medium text-gray-900 dark:text-white mt-0.5 capitalize">
            {component.calculationType}
            {component.defaultValue && ` (${component.defaultValue}${component.calculationType === 'percentage' ? '%' : ' SRD'})`}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Recurring:</span>
          <p className="font-medium text-gray-900 dark:text-white mt-0.5">
            {component.isRecurring ? 'Yes' : 'No'}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Taxable:</span>
          <p className="font-medium text-gray-900 dark:text-white mt-0.5">
            {component.isTaxable ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pay Components</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage earnings and deduction components for payroll calculations
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Component
        </button>
      </div>

      {/* Earnings Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Earnings ({earnings.length})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Components that add to gross pay
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {earnings.map((component) => (
            <ComponentCard key={component.id} component={component} />
          ))}
        </div>
      </div>

      {/* Deductions Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
            <Minus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Deductions ({deductions.length})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Components that reduce net pay
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deductions.map((component) => (
            <ComponentCard key={component.id} component={component} />
          ))}
        </div>
      </div>
    </div>
  );
}
