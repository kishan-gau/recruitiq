/**
 * FilterChips Component - Stub
 */
import React from 'react';

interface FilterChipsProps {
  filters: any[];
  onRemove: (filter: any) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ filters, onRemove }) => (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter, index) => (
        <button
          key={index}
          onClick={() => onRemove(filter)}
          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
        >
          {filter.label} ×
        </button>
      ))}
    </div>
  );

export default FilterChips;
