import React from 'react';

export interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  isSearching?: boolean;
  onClear?: () => void;
  className?: string;
}

/**
 * SearchInput Component
 * Enhanced search input with clear button and loading indicator
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  isSearching = false,
  onClear,
  className = '',
}: SearchInputProps) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Icon */}
      <svg 
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      
      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="border dark:border-slate-700 pl-10 pr-10 py-2 rounded w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
      />
      
      {/* Loading Spinner or Clear Button */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {isSearching ? (
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        ) : value ? (
          <button
            onClick={handleClear}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Clear search"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
