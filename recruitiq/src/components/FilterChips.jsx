import React from 'react'

/**
 * FilterChips Component
 * Displays active filters as removable chips
 * 
 * @param {Array} filters - Array of active filters { key, label, value }
 * @param {function} onRemove - Callback when a filter is removed (key)
 * @param {function} onClearAll - Callback to clear all filters
 */
export default function FilterChips({ filters = [], onRemove, onClearAll }) {
  if (!filters || filters.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-slate-600 dark:text-slate-400">
        Active filters:
      </span>
      
      {filters.map((filter) => (
        <div
          key={filter.key}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full text-sm text-emerald-700 dark:text-emerald-300"
        >
          <span className="font-medium">{filter.label}:</span>
          <span>{filter.value}</span>
          <button
            onClick={() => onRemove(filter.key)}
            className="ml-1 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
