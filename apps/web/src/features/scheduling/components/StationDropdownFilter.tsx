import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { type Station } from '../types';

export interface StationDropdownFilterProps {
  stations: Station[];
  selectedStations: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

/**
 * StationDropdownFilter - Multi-select dropdown for filtering stations
 * 
 * Features:
 * - Multi-select with checkboxes
 * - "Select All" functionality
 * - Click outside to close
 * - Responsive display of selected count
 */
const StationDropdownFilter: React.FC<StationDropdownFilterProps> = ({
  stations,
  selectedStations,
  onSelectionChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleStation = (stationId: string) => {
    const newSelection = new Set(selectedStations);
    if (newSelection.has(stationId)) {
      newSelection.delete(stationId);
    } else {
      newSelection.add(stationId);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedStations.size === stations.length) {
      // Deselect all
      onSelectionChange(new Set());
    } else {
      // Select all
      onSelectionChange(new Set(stations.map(s => s.id)));
    }
  };

  const getDisplayText = () => {
    if (selectedStations.size === 0) {
      return 'All Stations';
    }
    if (selectedStations.size === stations.length) {
      return 'All Stations';
    }
    if (selectedStations.size === 1) {
      const station = stations.find(s => selectedStations.has(s.id));
      return station?.name || 'Station';
    }
    return `${selectedStations.size} Stations`;
  };

  const isAllSelected = selectedStations.size === stations.length;
  const isIndeterminate = selectedStations.size > 0 && selectedStations.size < stations.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between min-w-[140px] px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="text-gray-900 dark:text-gray-100 truncate">
          {getDisplayText()}
        </span>
        <ChevronDown 
          className={`w-4 h-4 ml-2 text-gray-500 dark:text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          <div className="p-2">
            {/* Select All Option */}
            <div className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer">
              <label className="flex items-center w-full cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = isIndeterminate;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </div>
                <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  Select All
                </span>
              </label>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>

            {/* Individual Station Options */}
            {stations.map((station) => {
              const isSelected = selectedStations.has(station.id);
              
              return (
                <div
                  key={station.id}
                  className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer"
                  onClick={() => handleToggleStation(station.id)}
                >
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleStation(station.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    {isSelected && (
                      <Check className="absolute inset-0 w-4 h-4 text-blue-600 pointer-events-none" />
                    )}
                  </div>
                  <span className="ml-3 text-sm text-gray-900 dark:text-gray-100 flex-1">
                    {station.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer with selection count */}
          {selectedStations.size > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-600 px-3 py-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedStations.size} of {stations.length} selected
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StationDropdownFilter;