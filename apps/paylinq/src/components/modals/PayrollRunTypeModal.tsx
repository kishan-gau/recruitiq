/**
 * Payroll Run Type Modal
 * 
 * Form for creating and editing payroll run types.
 * Supports template, explicit, and hybrid component override modes.
 * 
 * Features:
 * - Component override mode selection
 * - Template selection (for template/hybrid modes)
 * - Component multi-select (for explicit/hybrid modes)
 * - Icon and color pickers
 * - Validation and error handling
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  Gift, 
  Award, 
  Edit as EditIcon, 
  UserX, 
  TrendingUp,
  Check,
  AlertCircle,
  Info
} from 'lucide-react';
import Dialog from '@/components/ui/Dialog';
import FormField, { Input, TextArea, Select } from '@/components/ui/FormField';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';

interface PayrollRunType {
  id: string;
  organizationId: string;
  typeCode: string;
  typeName: string;
  description?: string;
  componentOverrideMode: 'template' | 'explicit' | 'hybrid';
  defaultTemplateId?: string;
  templateName?: string;
  allowedComponents?: string[];
  excludedComponents?: string[];
  isSystemDefault: boolean;
  isActive: boolean;
  displayOrder: number;
  icon?: string;
  color?: string;
}

interface PayStructureTemplate {
  id: string;
  templateName: string;
  templateCode: string;
}

interface PayComponent {
  id: string;
  componentCode: string;
  componentName: string;
  isActive: boolean;
}

interface PayrollRunTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  runType?: PayrollRunType | null; // Null for create, populated for edit
}

// Icon options
const ICON_OPTIONS = [
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'gift', label: 'Gift', icon: Gift },
  { value: 'award', label: 'Award', icon: Award },
  { value: 'calendar-check', label: 'Calendar Check', icon: Calendar },
  { value: 'edit', label: 'Edit', icon: EditIcon },
  { value: 'user-x', label: 'User X', icon: UserX },
  { value: 'trending-up', label: 'Trending Up', icon: TrendingUp },
];

// Color presets
const COLOR_PRESETS = [
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#6b7280', label: 'Gray' },
  { value: '#ef4444', label: 'Red' },
  { value: '#059669', label: 'Emerald' },
  { value: '#3b82f6', label: 'Blue' },
];

export default function PayrollRunTypeModal({ isOpen, onClose, runType }: PayrollRunTypeModalProps) {
  const { client } = usePaylinqAPI();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!runType;

  const [formData, setFormData] = useState({
    typeCode: '',
    typeName: '',
    description: '',
    componentOverrideMode: 'explicit' as 'template' | 'explicit' | 'hybrid',
    defaultTemplateId: '',
    allowedComponents: [] as string[],
    excludedComponents: [] as string[],
    isActive: true,
    displayOrder: 999,
    icon: 'calendar',
    color: '#10b981',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when editing
  useEffect(() => {
    if (isEditMode && runType) {
      setFormData({
        typeCode: runType.typeCode,
        typeName: runType.typeName,
        description: runType.description || '',
        componentOverrideMode: runType.componentOverrideMode,
        defaultTemplateId: runType.defaultTemplateId || '',
        allowedComponents: runType.allowedComponents || [],
        excludedComponents: runType.excludedComponents || [],
        isActive: runType.isActive,
        displayOrder: runType.displayOrder,
        icon: runType.icon || 'calendar',
        color: runType.color || '#10b981',
      });
    } else {
      // Reset for create mode
      setFormData({
        typeCode: '',
        typeName: '',
        description: '',
        componentOverrideMode: 'explicit',
        defaultTemplateId: '',
        allowedComponents: [],
        excludedComponents: [],
        isActive: true,
        displayOrder: 999,
        icon: 'calendar',
        color: '#10b981',
      });
    }
    setErrors({});
  }, [isEditMode, runType, isOpen]);

  // Fetch pay structure templates
  const { data: templates } = useQuery({
    queryKey: ['payStructureTemplates'],
    queryFn: async () => {
      const response = await client.get<{ success: boolean; templates: PayStructureTemplate[] }>(
        '/products/paylinq/pay-structures/templates'
      );
      return response.templates || [];
    },
    enabled: isOpen && (formData.componentOverrideMode === 'template' || formData.componentOverrideMode === 'hybrid'),
  });

  // Fetch pay components
  const { data: components } = useQuery({
    queryKey: ['payComponents'],
    queryFn: async () => {
      const response = await client.get<{ success: boolean; components: PayComponent[] }>(
        '/products/paylinq/pay-components?includeInactive=false'
      );
      return response.components || [];
    },
    enabled: isOpen && (formData.componentOverrideMode === 'explicit' || formData.componentOverrideMode === 'hybrid'),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await client.post('/products/paylinq/payroll-run-types', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRunTypes'] });
      showToast('success', 'Run type created successfully');
      onClose();
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Failed to create run type');
      if (error.details?.validationErrors) {
        const fieldErrors: Record<string, string> = {};
        error.details.validationErrors.forEach((err: any) => {
          fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await client.patch(`/products/paylinq/payroll-run-types/${runType?.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRunTypes'] });
      showToast('success', 'Run type updated successfully');
      onClose();
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Failed to update run type');
      if (error.details?.validationErrors) {
        const fieldErrors: Record<string, string> = {};
        error.details.validationErrors.forEach((err: any) => {
          fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
      }
    },
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.typeCode.trim()) {
      newErrors.typeCode = 'Type code is required';
    } else if (!/^[A-Z_]+$/.test(formData.typeCode)) {
      newErrors.typeCode = 'Type code must contain only uppercase letters and underscores';
    }

    if (!formData.typeName.trim()) {
      newErrors.typeName = 'Type name is required';
    } else if (formData.typeName.length < 3) {
      newErrors.typeName = 'Type name must be at least 3 characters';
    }

    if (formData.componentOverrideMode === 'template' && !formData.defaultTemplateId) {
      newErrors.defaultTemplateId = 'Template is required for template mode';
    }

    if (formData.componentOverrideMode === 'hybrid' && !formData.defaultTemplateId) {
      newErrors.defaultTemplateId = 'Template is required for hybrid mode';
    }

    if (formData.componentOverrideMode === 'explicit' && formData.allowedComponents.length === 0) {
      newErrors.allowedComponents = 'At least one component is required for explicit mode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showToast('error', 'Please fix the validation errors');
      return;
    }

    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleComponentToggle = (componentCode: string, isAllowed: boolean) => {
    if (isAllowed) {
      setFormData((prev) => ({
        ...prev,
        allowedComponents: prev.allowedComponents.includes(componentCode)
          ? prev.allowedComponents.filter((c) => c !== componentCode)
          : [...prev.allowedComponents, componentCode],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        excludedComponents: prev.excludedComponents.includes(componentCode)
          ? prev.excludedComponents.filter((c) => c !== componentCode)
          : [...prev.excludedComponents, componentCode],
      }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const SelectedIcon = ICON_OPTIONS.find((opt) => opt.value === formData.icon)?.icon || Calendar;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Payroll Run Type' : 'Create Payroll Run Type'}
      size="xl"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Type Code" required error={errors.typeCode} hint="Uppercase letters and underscores only">
            <Input
              value={formData.typeCode}
              onChange={(e) => handleChange('typeCode', e.target.value.toUpperCase())}
              placeholder="e.g., BONUS"
              error={!!errors.typeCode}
              disabled={isEditMode} // Can't change code after creation
            />
          </FormField>

          <FormField label="Type Name" required error={errors.typeName}>
            <Input
              value={formData.typeName}
              onChange={(e) => handleChange('typeName', e.target.value)}
              placeholder="e.g., Bonus Payment"
              error={!!errors.typeName}
            />
          </FormField>
        </div>

        <FormField label="Description" error={errors.description}>
          <TextArea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe when this run type should be used..."
            rows={3}
            error={!!errors.description}
          />
        </FormField>

        {/* Component Override Mode */}
        <div>
          <FormField 
            label="Component Override Mode" 
            required 
            error={errors.componentOverrideMode}
            hint="How should components be determined for this run type?"
          >
            <Select
              value={formData.componentOverrideMode}
              onChange={(e) => handleChange('componentOverrideMode', e.target.value)}
              error={!!errors.componentOverrideMode}
            >
              <option value="explicit">Explicit - Use only specified components</option>
              <option value="template">Template - Use components from linked template</option>
              <option value="hybrid">Hybrid - Template + manual overrides</option>
            </Select>
          </FormField>

          {/* Mode explanation */}
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                {formData.componentOverrideMode === 'template' && (
                  <span>Components will be inherited from the selected pay structure template.</span>
                )}
                {formData.componentOverrideMode === 'explicit' && (
                  <span>You manually specify which components to include in this run type.</span>
                )}
                {formData.componentOverrideMode === 'hybrid' && (
                  <span>Starts with template components, then you can add or exclude specific ones.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Template Selection (for template/hybrid modes) */}
        {(formData.componentOverrideMode === 'template' || formData.componentOverrideMode === 'hybrid') && (
          <FormField 
            label="Default Template" 
            required 
            error={errors.defaultTemplateId}
            hint="Components will be inherited from this template"
          >
            <Select
              value={formData.defaultTemplateId}
              onChange={(e) => handleChange('defaultTemplateId', e.target.value)}
              error={!!errors.defaultTemplateId}
            >
              <option value="">Select a template...</option>
              {(templates || []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.templateName} ({template.templateCode})
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {/* Component Selection (for explicit/hybrid modes) */}
        {formData.componentOverrideMode === 'explicit' && (
          <div>
            <FormField 
              label="Allowed Components" 
              required 
              error={errors.allowedComponents}
              hint="Select which components should be included"
            >
              <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                {(components || []).map((component) => (
                  <label key={component.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowedComponents.includes(component.componentCode)}
                      onChange={() => handleComponentToggle(component.componentCode, true)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{component.componentName}</div>
                      <div className="text-xs text-gray-500 font-mono">{component.componentCode}</div>
                    </div>
                    {formData.allowedComponents.includes(component.componentCode) && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </label>
                ))}
                {(!components || components.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">No components available</p>
                )}
              </div>
            </FormField>
          </div>
        )}

        {/* Component Overrides (for hybrid mode) */}
        {formData.componentOverrideMode === 'hybrid' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField 
              label="Additional Components" 
              hint="Add these to template components"
            >
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {(components || []).slice(0, 5).map((component) => (
                  <label key={component.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowedComponents.includes(component.componentCode)}
                      onChange={() => handleComponentToggle(component.componentCode, true)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{component.componentName}</div>
                      <div className="text-xs text-gray-500 font-mono">{component.componentCode}</div>
                    </div>
                  </label>
                ))}
              </div>
            </FormField>

            <FormField 
              label="Excluded Components" 
              hint="Remove these from template"
            >
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {(components || []).slice(0, 5).map((component) => (
                  <label key={component.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.excludedComponents.includes(component.componentCode)}
                      onChange={() => handleComponentToggle(component.componentCode, false)}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{component.componentName}</div>
                      <div className="text-xs text-gray-500 font-mono">{component.componentCode}</div>
                    </div>
                  </label>
                ))}
              </div>
            </FormField>
          </div>
        )}

        {/* Visual Configuration */}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Icon" error={errors.icon}>
            <Select
              value={formData.icon}
              onChange={(e) => handleChange('icon', e.target.value)}
              error={!!errors.icon}
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Color" error={errors.color}>
            <div className="flex gap-2">
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                error={!!errors.color}
                className="w-20 h-10 p-1"
              />
              <Select
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                error={!!errors.color}
                className="flex-1"
              >
                {COLOR_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </Select>
            </div>
          </FormField>

          <FormField label="Display Order" error={errors.displayOrder} hint="Lower numbers appear first">
            <Input
              type="number"
              value={formData.displayOrder}
              onChange={(e) => handleChange('displayOrder', parseInt(e.target.value) || 0)}
              min={0}
              max={9999}
              error={!!errors.displayOrder}
            />
          </FormField>
        </div>

        {/* Preview */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <p className="text-xs font-medium text-gray-600 mb-3">Preview</p>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: formData.color }}
            >
              <SelectedIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{formData.typeName || 'Type Name'}</div>
              <div className="text-sm text-gray-500 font-mono">{formData.typeCode || 'TYPE_CODE'}</div>
            </div>
          </div>
        </div>

        {/* Status */}
        <FormField label="Status">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Active (visible in run type selectors)</span>
          </label>
        </FormField>

        {/* System default notice */}
        {isEditMode && runType?.isSystemDefault && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <strong>System Default:</strong> This is a system-seeded run type. Some restrictions may apply.
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
