import { X } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'daterange' | 'text';
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (filterId: string, value: any) => void;
  onReset: () => void;
  onApply: () => void;
}

export default function FilterPanel({
  isOpen,
  onClose,
  filters,
  values,
  onChange,
  onReset,
  onApply,
}: FilterPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-6 space-y-6">
          {filters.map((filter) => (
            <div key={filter.id}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {filter.label}
              </label>

              {/* Select Filter */}
              {filter.type === 'select' && (
                <select
                  value={values[filter.id] || ''}
                  onChange={(e) => onChange(filter.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{filter.placeholder || 'All'}</option>
                  {filter.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Multi-Select Filter */}
              {filter.type === 'multiselect' && (
                <div className="space-y-2">
                  {filter.options?.map((option) => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={(values[filter.id] || []).includes(option.value)}
                        onChange={(e) => {
                          const current = values[filter.id] || [];
                          const newValue = e.target.checked
                            ? [...current, option.value]
                            : current.filter((v: string) => v !== option.value);
                          onChange(filter.id, newValue);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Date Range Filter */}
              {filter.type === 'daterange' && (
                <div className="space-y-2">
                  <input
                    type="date"
                    value={values[filter.id]?.from || ''}
                    onChange={(e) =>
                      onChange(filter.id, {
                        ...values[filter.id],
                        from: e.target.value,
                      })
                    }
                    placeholder="From"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={values[filter.id]?.to || ''}
                    onChange={(e) =>
                      onChange(filter.id, {
                        ...values[filter.id],
                        to: e.target.value,
                      })
                    }
                    placeholder="To"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Text Filter */}
              {filter.type === 'text' && (
                <input
                  type="text"
                  value={values[filter.id] || ''}
                  onChange={(e) => onChange(filter.id, e.target.value)}
                  placeholder={filter.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onApply}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}
