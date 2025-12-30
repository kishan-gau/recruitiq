/**
 * Shift Template Card Component
 * 
 * Displays shift template information in a card format
 * with actions for CRUD operations following established patterns.
 */

import React, { useState } from 'react';

import type { ShiftTemplateSummary } from '@/types/shift-templates';

import { formatDuration, formatTime } from '../../utils/dateUtils';

interface ShiftTemplateCardProps {
  template: ShiftTemplateSummary;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onClick?: () => void;
  onHover?: () => void;
  onEdit?: () => void;
  onClone?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  isStatusToggling?: boolean;
  selectionMode?: boolean;
}

export default function ShiftTemplateCard({
  template,
  selected = false,
  onSelect,
  onClick,
  onHover,
  onEdit,
  onClone,
  onDelete,
  onToggleStatus,
  isStatusToggling = false,
  selectionMode = false
}: ShiftTemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on actions or checkbox
    if ((e.target as HTMLElement).closest('.card-actions, .card-checkbox')) {
      return;
    }
    onClick?.();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect?.(e.target.checked);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };
    
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  const statusColor = template.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400';
  const statusBg = template.isActive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800/50';
  const statusText = template.isActive ? 'Active' : 'Inactive';

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all duration-200 cursor-pointer
        ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'}
        ${isHovered ? 'shadow-md border-gray-300 dark:border-gray-600' : ''}
        ${!template.isActive ? 'opacity-75' : ''}
      `}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Selection Checkbox */}
            {(selectionMode || onSelect) && (
              <div className="card-checkbox mt-1">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            )}

            {/* Template Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {template.templateName}
                </h3>
                <span
                  className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${statusBg} ${statusColor}
                  `}
                >
                  {statusText}
                </span>
              </div>

              {template.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              {/* Template Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-white">
                    {formatDuration(template.shiftDuration || 0)}
                  </span>
                </div>
                
                {(template.breakDuration || 0) > 0 && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Break:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {formatDuration(template.breakDuration || 0)}
                    </span>
                  </div>
                )}

                {template.startTime && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Start:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {formatTime(template.startTime)}
                    </span>
                  </div>
                )}

                {template.stationName && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Station:</span>
                    <span className="ml-1 font-medium text-gray-900 dark:text-white">
                      {template.stationName}
                    </span>
                  </div>
                )}
              </div>

              {/* Roles Summary */}
              {(template.roleCount || 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Roles:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {template.roleCount || 0} assigned
                    </span>
                  </div>
                  
                  {(template.totalRequiredStaff || 0) > 0 && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-500 dark:text-gray-400">Total Staff:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {template.totalRequiredStaff || 0} required
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions Dropdown */}
          <div className="card-actions relative">
            <div className="flex items-center gap-2">
              {/* Status Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus?.();
                }}
                disabled={isStatusToggling}
                className={`
                  px-3 py-1 text-xs font-medium rounded-full transition-colors
                  ${template.isActive
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }
                  ${isStatusToggling ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title={template.isActive ? 'Deactivate Template' : 'Activate Template'}
              >
                {isStatusToggling 
                  ? '...' 
                  : template.isActive 
                    ? 'Deactivate' 
                    : 'Activate'
                }
              </button>

              {/* Actions Menu */}
              <div className="relative">
                <button
                  onClick={handleDropdownToggle}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="More actions"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Template
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClone?.();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Clone Template
                    </button>

                    <hr className="my-1 border-gray-200 dark:border-gray-600" />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Template
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Created {new Date(template.createdAt).toLocaleDateString()}
          </span>
          {template.updatedAt !== template.createdAt && (
            <span>
              Updated {new Date(template.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}