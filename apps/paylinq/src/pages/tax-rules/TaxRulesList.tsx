import { Plus, Edit2, AlertCircle } from 'lucide-react';
import { StatusBadge } from '@/components/ui';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';

interface TaxRule {
  id: string;
  name: string;
  type: 'wage-tax' | 'aov' | 'aww';
  description: string;
  rate?: number; // For flat rates
  brackets?: Array<{
    min: number;
    max: number | null; // null means no upper limit
    rate: number;
    deduction: number; // Standard deduction for bracket
  }>;
  employerContribution?: number;
  employeeContribution?: number;
  status: 'active' | 'inactive';
  effectiveDate: string;
  lastUpdated: string;
}

const mockTaxRules: TaxRule[] = [
  {
    id: '1',
    name: 'Surinamese Wage Tax',
    type: 'wage-tax',
    description: 'Progressive income tax based on monthly gross salary',
    brackets: [
      { min: 0, max: 2500, rate: 8, deduction: 0 },
      { min: 2500, max: 6250, rate: 15, deduction: 175 },
      { min: 6250, max: 15625, rate: 25, deduction: 800 },
      { min: 15625, max: null, rate: 36, deduction: 2520 },
    ],
    status: 'active',
    effectiveDate: '2025-01-01',
    lastUpdated: '2024-12-15',
  },
  {
    id: '2',
    name: 'AOV (Old Age Pension)',
    type: 'aov',
    description: 'General Old Age Pension Fund - mandatory social security contribution',
    employeeContribution: 4,
    employerContribution: 2,
    status: 'active',
    effectiveDate: '2025-01-01',
    lastUpdated: '2024-12-15',
  },
  {
    id: '3',
    name: 'AWW (Widow and Orphan Pension)',
    type: 'aww',
    description: 'Widow and Orphan Insurance Fund - social security for dependents',
    employeeContribution: 1.5,
    employerContribution: 0,
    status: 'active',
    effectiveDate: '2025-01-01',
    lastUpdated: '2024-12-15',
  },
];

export default function TaxRulesList() {
  const handleEdit = (_rule: TaxRule) => {
    // TODO: Open edit modal
  };

  const handleAdd = () => {
    // TODO: Open add modal
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tax Rules</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage Surinamese tax rules and social security contributions
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tax Rule
        </button>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-900 dark:text-amber-100 font-medium">2025 Tax Rates</p>
          <p className="mt-1 text-amber-700 dark:text-amber-300 text-sm">
            These are placeholder rates for demonstration. Please consult with the Surinamese Tax Authority for the latest official rates.
          </p>
        </div>
      </div>

      {/* Tax Rules Cards */}
      <div className="space-y-4">
        {mockTaxRules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            {/* Rule Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {rule.name}
                  </h3>
                  <StatusBadge status={rule.status} />
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {rule.description}
                </p>
              </div>
              <button
                onClick={() => handleEdit(rule)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Rule Details */}
            <div className="space-y-3">
              {/* Progressive Brackets */}
              {rule.brackets && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tax Brackets
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                            Income Range
                          </th>
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                            Tax Rate
                          </th>
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">
                            Standard Deduction
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rule.brackets.map((bracket, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                          >
                            <td className="py-2 text-gray-900 dark:text-white">
                              <CurrencyDisplay amount={bracket.min} /> -{' '}
                              {bracket.max !== null ? (
                                <CurrencyDisplay amount={bracket.max} />
                              ) : (
                                <span>and above</span>
                              )}
                            </td>
                            <td className="py-2 text-gray-900 dark:text-white font-medium">
                              {bracket.rate}%
                            </td>
                            <td className="py-2 text-gray-900 dark:text-white">
                              <CurrencyDisplay amount={bracket.deduction} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Flat Rate Contributions */}
              {(rule.employeeContribution !== undefined ||
                rule.employerContribution !== undefined) && (
                <div className="grid grid-cols-2 gap-4">
                  {rule.employeeContribution !== undefined && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Employee Contribution
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {rule.employeeContribution}%
                      </p>
                    </div>
                  )}
                  {rule.employerContribution !== undefined && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Employer Contribution
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {rule.employerContribution}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-6 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <div>
                  <span className="font-medium">Effective Date:</span> {rule.effectiveDate}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {rule.lastUpdated}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
