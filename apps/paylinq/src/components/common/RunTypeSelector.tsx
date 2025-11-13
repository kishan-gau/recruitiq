/**
 * Run Type Selector Component
 * 
 * Dropdown selector for payroll run types with visual indicators (icons, colors).
 * Fetches available run types from the API and displays them in a searchable dropdown.
 * 
 * Features:
 * - Visual indicators: Icon + color badge
 * - Description tooltip
 * - Active/inactive filtering
 * - Loading states
 * - Error handling
 * 
 * @example
 * <RunTypeSelector
 *   value={selectedRunType}
 *   onChange={(runType) => setSelectedRunType(runType)}
 *   disabled={isSubmitting}
 * />
 */

import { useState, useEffect } from 'react';
import { ChevronDown, Calendar, Gift, Award, Edit, UserX, TrendingUp, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';

// Type definition for PayrollRunType (from API response)
interface PayrollRunType {
  id: string;
  organizationId: string;
  typeCode: string;
  typeName: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  isSystemDefault: boolean;
  componentOverrideMode: 'template' | 'explicit' | 'hybrid';
  allowedComponents?: string[];
  excludedComponents?: string[];
}

interface RunTypeSelectorProps {
  value?: PayrollRunType | null;
  onChange: (runType: PayrollRunType | null) => void;
  disabled?: boolean;
  includeInactive?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

// Icon mapping for run types
const ICON_MAP: Record<string, React.ElementType> = {
  calendar: Calendar,
  gift: Gift,
  award: Award,
  'calendar-check': Calendar,
  edit: Edit,
  'user-x': UserX,
  'trending-up': TrendingUp,
};

export function RunTypeSelector({
  value,
  onChange,
  disabled = false,
  includeInactive = false,
  required = false,
  error,
  className = '',
}: RunTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { client } = usePaylinqAPI();

  // Fetch run types from API
  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['payrollRunTypes', includeInactive],
    queryFn: async () => {
      console.log('[RunTypeSelector] Fetching run types...');
      const response = await client.get<{ success: boolean; payrollRunTypes: PayrollRunType[] }>(
        `/products/paylinq/payroll-run-types/summary?includeInactive=${includeInactive}`
      );
      console.log('[RunTypeSelector] Raw response:', response);
      console.log('[RunTypeSelector] response.payrollRunTypes:', response.payrollRunTypes);
      console.log('[RunTypeSelector] Type of response:', typeof response);
      console.log('[RunTypeSelector] Keys in response:', Object.keys(response || {}));
      return response.payrollRunTypes || [];
    },
  });

  console.log('[RunTypeSelector] data:', data);
  console.log('[RunTypeSelector] isLoading:', isLoading);
  console.log('[RunTypeSelector] queryError:', queryError);
  
  const runTypes = data || [];
  console.log('[RunTypeSelector] runTypes:', runTypes);

  // Filter run types based on search query
  const filteredRunTypes = runTypes.filter((rt: PayrollRunType) => {
    if (!rt || !rt.typeName || !rt.typeCode) return false;
    
    const query = searchQuery.toLowerCase();
    return (
      rt.typeName.toLowerCase().includes(query) ||
      rt.typeCode.toLowerCase().includes(query) ||
      rt.description?.toLowerCase().includes(query)
    );
  });

  // Get icon component
  const getIcon = (iconName?: string) => {
    if (!iconName) return Calendar;
    return ICON_MAP[iconName] || Calendar;
  };

  // Handle selection
  const handleSelect = (runType: PayrollRunType) => {
    onChange(runType);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.run-type-selector')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`run-type-selector relative ${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Run Type {required && <span className="text-red-500">*</span>}
      </label>

      {/* Selector Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 
          border rounded-lg text-left transition-colors
          ${disabled 
            ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed' 
            : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer'
          }
          ${error ? 'border-red-500 dark:border-red-500' : ''}
          ${isOpen ? 'ring-2 ring-blue-500 dark:ring-blue-500 border-blue-500 dark:border-blue-500' : ''}
        `}
      >
        {isLoading ? (
          <span className="text-gray-500 dark:text-gray-400">Loading run types...</span>
        ) : value ? (
          <div className="flex items-center gap-3 flex-1">
            {/* Icon with color */}
            <div
              className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: value.color || '#10b981' }}
            >
              {(() => {
                const Icon = getIcon(value.icon);
                return <Icon className="w-4 h-4 text-white" />;
              })()}
            </div>

            {/* Run type info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">{value.typeName}</span>
                {!value.isActive && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                    Inactive
                  </span>
                )}
              </div>
              {value.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{value.description}</p>
              )}
            </div>

            {/* Clear button */}
            {!required && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="Clear selection"
              >
                <span className="sr-only">Clear</span>
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Select a run type...</span>
        )}

        {/* Dropdown arrow */}
        <ChevronDown
          className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>

      {/* Error message */}
      {error && (
        <div className="mt-1 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Query error */}
      {queryError && (
        <div className="mt-1 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>Failed to load run types</span>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg">
          {/* Search box */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="Search run types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              autoFocus
            />
          </div>

          {/* Run type list */}
          <div className="max-h-80 overflow-y-auto">
            {filteredRunTypes.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No run types match your search' : 'No run types available'}
              </div>
            ) : (
              <div className="py-1">
                {filteredRunTypes.map((runType: PayrollRunType) => {
                  const Icon = getIcon(runType.icon);
                  const isSelected = value?.id === runType.id;

                  return (
                    <button
                      key={runType.id}
                      type="button"
                      onClick={() => handleSelect(runType)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 text-left
                        transition-colors hover:bg-gray-50 dark:hover:bg-gray-800
                        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      `}
                    >
                      {/* Icon with color */}
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: runType.color || '#10b981' }}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>

                      {/* Run type info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
                            {runType.typeName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {runType.typeCode}
                          </span>
                          {!runType.isActive && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {runType.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {runType.description}
                          </p>
                        )}
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="w-5 h-5 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RunTypeSelector;
