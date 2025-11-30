/**
 * Station Requirements Component
 * 
 * Displays and manages station-specific requirements (skills, equipment, certifications)
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';

interface Requirement {
  id: string;
  type: 'skill' | 'equipment' | 'certification';
  name: string;
  description?: string;
  required: boolean;
}

interface StationRequirementsProps {
  stationId?: string;
  requirements: Requirement[];
  onUpdate?: (requirements: Requirement[]) => void;
  readOnly?: boolean;
}

export default function StationRequirements({
  stationId,
  requirements: initialRequirements,
  onUpdate,
  readOnly = false
}: StationRequirementsProps) {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);
  const [activeTab, setActiveTab] = useState<'skill' | 'equipment' | 'certification'>('skill');
  const [isAdding, setIsAdding] = useState(false);
  const [newRequirement, setNewRequirement] = useState({
    name: '',
    description: '',
    required: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update parent when requirements change
  useEffect(() => {
    if (onUpdate && requirements !== initialRequirements) {
      onUpdate(requirements);
    }
  }, [requirements, onUpdate, initialRequirements]);

  // Filter requirements by type
  const filteredRequirements = requirements.filter(req => req.type === activeTab);

  // Add new requirement
  const handleAdd = () => {
    const validation = validateRequirement(newRequirement);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const requirement: Requirement = {
      id: `temp-${Date.now()}`,
      type: activeTab,
      ...newRequirement
    };

    setRequirements([...requirements, requirement]);
    setNewRequirement({ name: '', description: '', required: true });
    setIsAdding(false);
    setErrors({});
  };

  // Remove requirement
  const handleRemove = (id: string) => {
    setRequirements(requirements.filter(req => req.id !== id));
  };

  // Toggle required status
  const handleToggleRequired = (id: string) => {
    setRequirements(requirements.map(req =>
      req.id === id ? { ...req, required: !req.required } : req
    ));
  };

  // Validate requirement
  const validateRequirement = (req: typeof newRequirement) => {
    const errors: Record<string, string> = {};

    if (!req.name.trim()) {
      errors.name = 'Name is required';
    } else if (req.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (req.name.length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }

    if (req.description && req.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  };

  // Tab configuration
  const tabs = [
    { id: 'skill' as const, label: 'Skills', icon: '🎯' },
    { id: 'equipment' as const, label: 'Equipment', icon: '🔧' },
    { id: 'certification' as const, label: 'Certifications', icon: '📜' }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Station Requirements
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Define skills, equipment, and certifications needed for this station
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsAdding(false);
                setErrors({});
              }}
              className={`
                flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm
                transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              {tab.label}
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {requirements.filter(r => r.type === tab.id).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Requirements List */}
        {filteredRequirements.length > 0 ? (
          <div className="space-y-3 mb-4">
            {filteredRequirements.map(req => (
              <div
                key={req.id}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{req.name}</h4>
                    {req.required && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  {req.description && (
                    <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                  )}
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleRequired(req.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {req.required ? 'Make Optional' : 'Make Required'}
                    </button>
                    <button
                      onClick={() => handleRemove(req.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Remove requirement"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">
              No {activeTab} requirements added yet
            </p>
          </div>
        )}

        {/* Add New Requirement Form */}
        {!readOnly && (
          <>
            {isAdding ? (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newRequirement.name}
                      onChange={(e) => {
                        setNewRequirement({ ...newRequirement, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: '' });
                      }}
                      placeholder={`Enter ${activeTab} name`}
                      className={`
                        w-full px-3 py-2 border rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${errors.name ? 'border-red-500' : 'border-gray-300'}
                      `}
                    />
                    {errors.name && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {errors.name}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newRequirement.description}
                      onChange={(e) => {
                        setNewRequirement({ ...newRequirement, description: e.target.value });
                        if (errors.description) setErrors({ ...errors, description: '' });
                      }}
                      placeholder={`Describe the ${activeTab} requirement`}
                      rows={2}
                      className={`
                        w-full px-3 py-2 border rounded-lg resize-none
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${errors.description ? 'border-red-500' : 'border-gray-300'}
                      `}
                    />
                    {errors.description && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {errors.description}
                      </div>
                    )}
                  </div>

                  {/* Required Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="required"
                      checked={newRequirement.required}
                      onChange={(e) => setNewRequirement({ 
                        ...newRequirement, 
                        required: e.target.checked 
                      })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="required" className="text-sm text-gray-700">
                      This is a required {activeTab}
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setIsAdding(false);
                        setNewRequirement({ name: '', description: '', required: true });
                        setErrors({});
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAdd}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Add Requirement
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add {activeTab}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
