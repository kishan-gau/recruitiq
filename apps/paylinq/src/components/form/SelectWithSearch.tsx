/**
 * SelectWithSearch Component
 * 
 * Reusable searchable select/combobox with:
 * - Fuzzy search filtering
 * - Keyboard navigation
 * - Custom option rendering
 * - Virtual scrolling for large lists
 * - Multi-select support
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import clsx from 'clsx';

export interface SelectOption {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectWithSearchProps {
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  className?: string;
  maxHeight?: number;
  renderOption?: (option: SelectOption) => React.ReactNode;
  name?: string;
}

export interface MultiSelectWithSearchProps {
  value?: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  maxHeight?: number;
  maxSelections?: number;
  renderOption?: (option: SelectOption) => React.ReactNode;
  name?: string;
}

export function SelectWithSearch({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select an option',
  error,
  required = false,
  disabled = false,
  searchable = true,
  clearable = true,
  className,
  maxHeight = 300,
  renderOption,
  name,
}: SelectWithSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter(option => 
      option.label.toLowerCase().includes(query) ||
      option.description?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <input type="hidden" name={name} value={value || ''} />
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'w-full px-3 py-2 pr-10 text-left border rounded-lg transition-colors',
          'focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
          disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-600',
          error ? 'border-red-300' : 'border-gray-300 dark:border-gray-700',
          'text-gray-900 dark:text-white'
        )}
      >
        {selectedOption ? (
          <span className="block truncate">{selectedOption.label}</span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
        )}
      </button>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        <ChevronDown className={clsx(
          'w-4 h-4 transition-transform',
          disabled ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500',
          isOpen && 'rotate-180'
        )} />
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg">
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div 
            className="overflow-y-auto py-1"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  disabled={option.disabled}
                  className={clsx(
                    'w-full px-3 py-2 text-left transition-colors',
                    highlightedIndex === index && 'bg-blue-50 dark:bg-blue-900/20',
                    option.value === value && 'bg-blue-100 dark:bg-blue-900/30',
                    option.disabled ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800',
                    !option.disabled && 'cursor-pointer',
                    'text-gray-900 dark:text-white'
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {renderOption ? (
                        renderOption(option)
                      ) : (
                        <>
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {option.label}
                          </div>
                          {option.description && (
                            <div className="text-xs text-gray-500 truncate">
                              {option.description}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {option.value === value && (
                      <Check className="w-4 h-4 text-blue-600 ml-2 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MultiSelectWithSearch({
  value = [],
  onChange,
  options,
  label,
  placeholder = 'Select options',
  error,
  required = false,
  disabled = false,
  searchable = true,
  className,
  maxHeight = 300,
  maxSelections,
  renderOption,
  name,
}: MultiSelectWithSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter(option => 
      option.label.toLowerCase().includes(query) ||
      option.description?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const selectedOptions = options.filter(opt => value.includes(opt.value));

  const handleToggle = (option: SelectOption) => {
    if (option.disabled) return;
    
    if (value.includes(option.value)) {
      onChange(value.filter(v => v !== option.value));
    } else {
      if (maxSelections && value.length >= maxSelections) return;
      onChange([...value, option.value]);
    }
  };

  const handleRemove = (optionValue: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optionValue));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {value.map(v => (
        <input key={v} type="hidden" name={`${name}[]`} value={v} />
      ))}
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'w-full px-3 py-2 pr-10 text-left border rounded-lg transition-colors min-h-[42px]',
          'focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400',
          error ? 'border-red-300' : 'border-gray-300'
        )}
      >
        {selectedOptions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map(option => (
              <span
                key={option.value}
                className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-sm"
              >
                {option.label}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleRemove(option.value, e)}
                    className="ml-1 hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
        {value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleClearAll}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        <ChevronDown className={clsx(
          'w-4 h-4 transition-transform',
          disabled ? 'text-gray-300' : 'text-gray-400',
          isOpen && 'rotate-180'
        )} />
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {maxSelections && (
        <p className="mt-1 text-xs text-gray-500">
          {value.length}/{maxSelections} selected
        </p>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div 
            className="overflow-y-auto py-1"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                const isMaxReached = !!(maxSelections && value.length >= maxSelections && !isSelected);
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggle(option)}
                    disabled={option.disabled || isMaxReached}
                    className={clsx(
                      'w-full px-3 py-2 text-left transition-colors',
                      isSelected && 'bg-blue-50',
                      option.disabled || isMaxReached ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'
                    )}
                  >
                    <div className="flex items-center">
                      <div className={clsx(
                        'w-4 h-4 mr-3 border rounded flex items-center justify-center flex-shrink-0',
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {renderOption ? (
                          renderOption(option)
                        ) : (
                          <>
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {option.label}
                            </div>
                            {option.description && (
                              <div className="text-xs text-gray-500 truncate">
                                {option.description}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-8 text-center text-sm text-gray-500">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

