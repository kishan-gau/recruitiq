import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, TrendingUp, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import FormField, { Input, Select } from './FormField';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useMutation, useQuery } from '@tanstack/react-query';
import WorkerSelectionModal from './WorkerSelectionModal';

interface TemporalPattern {
  patternType: 'day_of_week' | 'shift_type' | 'station' | 'role' | 'hours_threshold' | 'combined';
  dayOfWeek?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  consecutiveCount: number;
  lookbackPeriodDays: number;
  shiftTypeId?: string;
  stationId?: string;
  roleId?: string;
  hoursThreshold?: number;
  comparisonOperator?: 'greater_than' | 'less_than' | 'equals' | 'greater_or_equal' | 'less_or_equal';
  combinedPatterns?: TemporalPattern[];
  logicalOperator?: 'AND' | 'OR';
}

interface TemporalPatternBuilderProps {
  value: TemporalPattern | null;
  onChange: (pattern: TemporalPattern | null) => void;
  disabled?: boolean;
}

const PATTERN_TYPES = [
  { 
    value: 'day_of_week', 
    label: 'Day of Week Pattern', 
    icon: Calendar,
    description: 'Worker must work specific consecutive days (e.g., 3 consecutive Sundays)',
    phase: 1
  },
  { 
    value: 'shift_type', 
    label: 'Shift Type Pattern', 
    icon: Clock,
    description: 'Worker must work consecutive shifts of a specific type',
    phase: 2
  },
  { 
    value: 'station', 
    label: 'Station Pattern', 
    icon: Users,
    description: 'Worker must work consecutive days at a specific station',
    phase: 2
  },
  { 
    value: 'role', 
    label: 'Role Pattern', 
    icon: Users,
    description: 'Worker must work consecutive days in a specific role',
    phase: 2
  },
  { 
    value: 'hours_threshold', 
    label: 'Hours Threshold Pattern', 
    icon: TrendingUp,
    description: 'Worker must meet hours requirement in consecutive days',
    phase: 2
  },
  { 
    value: 'combined', 
    label: 'Combined Pattern', 
    icon: Users,
    description: 'Combine multiple patterns with AND/OR logic',
    phase: 2
  },
];

const DAYS_OF_WEEK = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

const COMPARISON_OPERATORS = [
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'equals', label: 'Equals (=)' },
  { value: 'greater_or_equal', label: 'Greater or Equal (≥)' },
  { value: 'less_or_equal', label: 'Less or Equal (≤)' },
];

export default function TemporalPatternBuilder({ value, onChange, disabled = false }: TemporalPatternBuilderProps) {
  const [pattern, setPattern] = useState<TemporalPattern | null>(value);
  const [testResults, setTestResults] = useState<any>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const { paylinq } = usePaylinqAPI();

  // Fetch shift types
  const { data: shiftTypesData, isLoading: isLoadingShiftTypes } = useQuery({
    queryKey: ['patternShiftTypes'],
    queryFn: async () => {
      const response = await paylinq.getPatternShiftTypes({ limit: 100 });
      return response.shiftTypes || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch stations
  const { data: stationsData, isLoading: isLoadingStations } = useQuery({
    queryKey: ['patternStations'],
    queryFn: async () => {
      const response = await paylinq.getPatternStations({ limit: 100 });
      return response.stations || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch roles
  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['patternRoles'],
    queryFn: async () => {
      const response = await paylinq.getPatternRoles({ limit: 100 });
      return response.roles || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Sync internal state with external value
  useEffect(() => {
    setPattern(value);
  }, [value]);

  // Notify parent of changes
  const updatePattern = (updates: Partial<TemporalPattern>) => {
    const newPattern = pattern ? { ...pattern, ...updates } : null;
    setPattern(newPattern);
    onChange(newPattern);
  };

  // Initialize new pattern
  const initializePattern = (patternType: TemporalPattern['patternType']) => {
    const newPattern: TemporalPattern = {
      patternType,
      consecutiveCount: 3,
      lookbackPeriodDays: 90,
    };

    if (patternType === 'day_of_week') {
      newPattern.dayOfWeek = 'sunday';
    } else if (patternType === 'hours_threshold') {
      newPattern.hoursThreshold = 40;
      newPattern.comparisonOperator = 'greater_than';
    } else if (patternType === 'shift_type') {
      newPattern.shiftTypeId = '';
    } else if (patternType === 'station') {
      newPattern.stationId = '';
    } else if (patternType === 'role') {
      newPattern.roleId = '';
    } else if (patternType === 'combined') {
      newPattern.logicalOperator = 'AND';
      newPattern.combinedPatterns = [];
    }

    setPattern(newPattern);
    onChange(newPattern);
  };

  // Clear pattern
  const clearPattern = () => {
    setPattern(null);
    onChange(null);
    setTestResults(null);
  };

  // Test pattern mutation
  const testPatternMutation = useMutation({
    mutationFn: async (testEmployeeIds: string[]) => {
      if (!pattern) throw new Error('No pattern to test');
      
      const response = await paylinq.testTemporalPattern({
        pattern,
        employeeIds: testEmployeeIds,
      });

      // The API client returns the response directly (already unwrapped)
      return response;
    },
    onSuccess: (data) => {
      setTestResults(data);
      setShowTestPanel(true);
      setShowWorkerModal(false);
    },
    onError: (error) => {
      console.error('[TemporalPatternBuilder] Test pattern error:', error);
    },
  });

  const handleTestPattern = (selectedWorkerIds: string[]) => {
    testPatternMutation.mutate(selectedWorkerIds);
  };

  const renderPatternTypeSelector = () => (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700">Select Pattern Type</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PATTERN_TYPES.map((type) => {
          const Icon = type.icon;
          const isPhase2 = type.phase === 2;
          
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => !disabled && initializePattern(type.value as TemporalPattern['patternType'])}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderDayOfWeekPattern = () => {
    if (!pattern || pattern.patternType !== 'day_of_week') return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Day of Week Pattern Configuration</h3>
          <button
            type="button"
            onClick={clearPattern}
            disabled={disabled}
            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Clear Pattern
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Day of Week" required>
            <Select
              value={pattern.dayOfWeek || 'sunday'}
              onChange={(e) => updatePattern({ dayOfWeek: e.target.value as any })}
              options={DAYS_OF_WEEK}
              disabled={disabled}
            />
          </FormField>

          <FormField label="Consecutive Count" required>
            <Input
              type="number"
              min={1}
              max={52}
              value={pattern.consecutiveCount}
              onChange={(e) => updatePattern({ consecutiveCount: parseInt(e.target.value) || 1 })}
              disabled={disabled}
              placeholder="e.g., 3"
            />
            <div className="text-xs text-gray-500 mt-1">
              Number of consecutive {pattern.dayOfWeek || 'days'} required
            </div>
          </FormField>

          <FormField label="Lookback Period (Days)" required>
            <Input
              type="number"
              min={7}
              max={730}
              value={pattern.lookbackPeriodDays}
              onChange={(e) => updatePattern({ lookbackPeriodDays: parseInt(e.target.value) || 90 })}
              disabled={disabled}
              placeholder="e.g., 90"
            />
            <div className="text-xs text-gray-500 mt-1">
              How far back to check for pattern (7-730 days)
            </div>
          </FormField>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Pattern Summary:</strong> Worker must work{' '}
              <strong>{pattern.consecutiveCount} consecutive {pattern.dayOfWeek}s</strong>{' '}
              within the last <strong>{pattern.lookbackPeriodDays} days</strong> to qualify for this component.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderShiftTypePattern = () => {
    if (!pattern || pattern.patternType !== 'shift_type') return null;

    const shiftTypes = [
      { value: '', label: isLoadingShiftTypes ? 'Loading shift types...' : 'Select a shift type...' },
      ...(shiftTypesData || []).map((st: any) => ({
        value: st.id,
        label: `${st.shiftName} (${st.shiftCode})`,
      })),
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Shift Type Pattern Configuration</h3>
          <button
            type="button"
            onClick={clearPattern}
            disabled={disabled}
            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Clear Pattern
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Shift Type" required>
            <Select
              value={pattern.shiftTypeId || ''}
              onChange={(e) => updatePattern({ shiftTypeId: e.target.value })}
              options={shiftTypes}
              disabled={disabled || isLoadingShiftTypes}
            />
            <div className="text-xs text-gray-500 mt-1">
              Select the shift type (e.g., Night Shift, Morning Shift)
            </div>
          </FormField>

          <FormField label="Consecutive Count" required>
            <Input
              type="number"
              min={1}
              max={90}
              value={pattern.consecutiveCount}
              onChange={(e) => updatePattern({ consecutiveCount: parseInt(e.target.value) || 1 })}
              disabled={disabled}
              placeholder="e.g., 5"
            />
            <div className="text-xs text-gray-500 mt-1">
              Number of consecutive days with this shift type
            </div>
          </FormField>

          <FormField label="Lookback Period (Days)" required>
            <Input
              type="number"
              min={7}
              max={730}
              value={pattern.lookbackPeriodDays}
              onChange={(e) => updatePattern({ lookbackPeriodDays: parseInt(e.target.value) || 90 })}
              disabled={disabled}
              placeholder="e.g., 90"
            />
            <div className="text-xs text-gray-500 mt-1">
              How far back to check for pattern (7-730 days)
            </div>
          </FormField>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Pattern Summary:</strong> Worker must work{' '}
              <strong>{pattern.consecutiveCount} consecutive days</strong> with the selected shift type{' '}
              within the last <strong>{pattern.lookbackPeriodDays} days</strong> to qualify for this component.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStationPattern = () => {
    if (!pattern || pattern.patternType !== 'station') return null;

    const stations = [
      { value: '', label: isLoadingStations ? 'Loading stations...' : 'Select a station...' },
      ...(stationsData || []).map((station: any) => ({
        value: station.id,
        label: `${station.stationName} (${station.stationCode})`,
      })),
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Station Pattern Configuration</h3>
          <button
            type="button"
            onClick={clearPattern}
            disabled={disabled}
            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Clear Pattern
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Station" required>
            <Select
              value={pattern.stationId || ''}
              onChange={(e) => updatePattern({ stationId: e.target.value })}
              options={stations}
              disabled={disabled || isLoadingStations}
            />
            <div className="text-xs text-gray-500 mt-1">
              Select the station location (e.g., Main Warehouse, Store #123)
            </div>
          </FormField>

          <FormField label="Consecutive Count" required>
            <Input
              type="number"
              min={1}
              max={90}
              value={pattern.consecutiveCount}
              onChange={(e) => updatePattern({ consecutiveCount: parseInt(e.target.value) || 1 })}
              disabled={disabled}
              placeholder="e.g., 10"
            />
            <div className="text-xs text-gray-500 mt-1">
              Number of consecutive days at this station
            </div>
          </FormField>

          <FormField label="Lookback Period (Days)" required>
            <Input
              type="number"
              min={7}
              max={730}
              value={pattern.lookbackPeriodDays}
              onChange={(e) => updatePattern({ lookbackPeriodDays: parseInt(e.target.value) || 90 })}
              disabled={disabled}
              placeholder="e.g., 90"
            />
            <div className="text-xs text-gray-500 mt-1">
              How far back to check for pattern (7-730 days)
            </div>
          </FormField>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Pattern Summary:</strong> Worker must work{' '}
              <strong>{pattern.consecutiveCount} consecutive days</strong> at the selected station{' '}
              within the last <strong>{pattern.lookbackPeriodDays} days</strong> to qualify for this component.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRolePattern = () => {
    if (!pattern || pattern.patternType !== 'role') return null;

    const roles = [
      { value: '', label: isLoadingRoles ? 'Loading roles...' : 'Select a role...' },
      ...(rolesData || []).map((role: any) => ({
        value: role.id,
        label: `${role.roleName} (${role.roleCode})`,
      })),
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Role Pattern Configuration</h3>
          <button
            type="button"
            onClick={clearPattern}
            disabled={disabled}
            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Clear Pattern
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Role" required>
            <Select
              value={pattern.roleId || ''}
              onChange={(e) => updatePattern({ roleId: e.target.value })}
              options={roles}
              disabled={disabled || isLoadingRoles}
            />
            <div className="text-xs text-gray-500 mt-1">
              Select the role (e.g., Supervisor, Cashier, Manager)
            </div>
          </FormField>

          <FormField label="Consecutive Count" required>
            <Input
              type="number"
              min={1}
              max={90}
              value={pattern.consecutiveCount}
              onChange={(e) => updatePattern({ consecutiveCount: parseInt(e.target.value) || 1 })}
              disabled={disabled}
              placeholder="e.g., 7"
            />
            <div className="text-xs text-gray-500 mt-1">
              Number of consecutive days in this role
            </div>
          </FormField>

          <FormField label="Lookback Period (Days)" required>
            <Input
              type="number"
              min={7}
              max={730}
              value={pattern.lookbackPeriodDays}
              onChange={(e) => updatePattern({ lookbackPeriodDays: parseInt(e.target.value) || 90 })}
              disabled={disabled}
              placeholder="e.g., 90"
            />
            <div className="text-xs text-gray-500 mt-1">
              How far back to check for pattern (7-730 days)
            </div>
          </FormField>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Pattern Summary:</strong> Worker must work{' '}
              <strong>{pattern.consecutiveCount} consecutive days</strong> in the selected role{' '}
              within the last <strong>{pattern.lookbackPeriodDays} days</strong> to qualify for this component.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHoursThresholdPattern = () => {
    if (!pattern || pattern.patternType !== 'hours_threshold') return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Hours Threshold Pattern Configuration</h3>
          <button
            type="button"
            onClick={clearPattern}
            disabled={disabled}
            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Clear Pattern
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Hours Threshold" required>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={pattern.hoursThreshold || 40}
              onChange={(e) => updatePattern({ hoursThreshold: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              placeholder="e.g., 40"
            />
          </FormField>

          <FormField label="Comparison" required>
            <Select
              value={pattern.comparisonOperator || 'greater_than'}
              onChange={(e) => updatePattern({ comparisonOperator: e.target.value as any })}
              options={COMPARISON_OPERATORS}
              disabled={disabled}
            />
          </FormField>

          <FormField label="Consecutive Days" required>
            <Input
              type="number"
              min={1}
              max={365}
              value={pattern.consecutiveCount}
              onChange={(e) => updatePattern({ consecutiveCount: parseInt(e.target.value) || 1 })}
              disabled={disabled}
              placeholder="e.g., 7"
            />
          </FormField>

          <FormField label="Lookback Period (Days)" required>
            <Input
              type="number"
              min={7}
              max={730}
              value={pattern.lookbackPeriodDays}
              onChange={(e) => updatePattern({ lookbackPeriodDays: parseInt(e.target.value) || 90 })}
              disabled={disabled}
              placeholder="e.g., 90"
            />
          </FormField>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Pattern Summary:</strong> Worker must work{' '}
              {COMPARISON_OPERATORS.find(op => op.value === pattern.comparisonOperator)?.label.toLowerCase()}{' '}
              <strong>{pattern.hoursThreshold} hours</strong> in any{' '}
              <strong>{pattern.consecutiveCount} consecutive day period</strong>{' '}
              within the last <strong>{pattern.lookbackPeriodDays} days</strong>.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCombinedPattern = () => {
    if (!pattern || pattern.patternType !== 'combined') return null;

    const combinedPatterns = pattern.combinedPatterns || [];
    const logicalOperator = pattern.logicalOperator || 'AND';

    const addSubPattern = () => {
      const newSubPattern: TemporalPattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      updatePattern({
        combinedPatterns: [...combinedPatterns, newSubPattern],
      });
    };

    const updateSubPattern = (index: number, updates: Partial<TemporalPattern>) => {
      const updated = [...combinedPatterns];
      updated[index] = { ...updated[index], ...updates };
      updatePattern({ combinedPatterns: updated });
    };

    const removeSubPattern = (index: number) => {
      const updated = combinedPatterns.filter((_, i) => i !== index);
      updatePattern({ combinedPatterns: updated });
    };

    const renderSubPattern = (subPattern: TemporalPattern, index: number) => {
      return (
        <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Pattern {index + 1}</h4>
            <button
              type="button"
              onClick={() => removeSubPattern(index)}
              disabled={disabled || combinedPatterns.length <= 1}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 text-sm"
            >
              Remove
            </button>
          </div>

          <div className="space-y-4">
            <FormField label="Pattern Type" required>
              <Select
                value={subPattern.patternType}
                onChange={(e) => {
                  const newType = e.target.value as TemporalPattern['patternType'];
                  let updates: Partial<TemporalPattern> = { patternType: newType };
                  
                  // Initialize type-specific fields
                  if (newType === 'day_of_week') {
                    updates.dayOfWeek = 'sunday';
                  } else if (newType === 'shift_type') {
                    updates.shiftTypeId = '';
                  } else if (newType === 'station') {
                    updates.stationId = '';
                  } else if (newType === 'role') {
                    updates.roleId = '';
                  } else if (newType === 'hours_threshold') {
                    updates.hoursThreshold = 40;
                    updates.comparisonOperator = 'greater_than';
                  }
                  
                  updateSubPattern(index, updates);
                }}
                disabled={disabled}
              >
                <option value="day_of_week">Day of Week Pattern</option>
                <option value="shift_type">Shift Type Pattern</option>
                <option value="station">Station Pattern</option>
                <option value="role">Role Pattern</option>
                <option value="hours_threshold">Hours Threshold Pattern</option>
              </Select>
            </FormField>

            {/* Render type-specific fields */}
            {subPattern.patternType === 'day_of_week' && (
              <FormField label="Day of Week" required>
                <Select
                  value={subPattern.dayOfWeek || 'sunday'}
                  onChange={(e) => updateSubPattern(index, { dayOfWeek: e.target.value as any })}
                  disabled={disabled}
                >
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </Select>
              </FormField>
            )}

            {subPattern.patternType === 'shift_type' && (
              <FormField label="Shift Type" required>
                <Select
                  value={subPattern.shiftTypeId || ''}
                  onChange={(e) => updateSubPattern(index, { shiftTypeId: e.target.value })}
                  disabled={disabled || isLoadingShiftTypes}
                >
                  <option value="">Select shift type...</option>
                  {(shiftTypesData || []).map((st: any) => (
                    <option key={st.id} value={st.id}>{`${st.shiftName} (${st.shiftCode})`}</option>
                  ))}
                </Select>
              </FormField>
            )}

            {subPattern.patternType === 'station' && (
              <FormField label="Station" required>
                <Select
                  value={subPattern.stationId || ''}
                  onChange={(e) => updateSubPattern(index, { stationId: e.target.value })}
                  disabled={disabled || isLoadingStations}
                >
                  <option value="">Select station...</option>
                  {(stationsData || []).map((station: any) => (
                    <option key={station.id} value={station.id}>{`${station.stationName} (${station.stationCode})`}</option>
                  ))}
                </Select>
              </FormField>
            )}

            {subPattern.patternType === 'role' && (
              <FormField label="Role" required>
                <Select
                  value={subPattern.roleId || ''}
                  onChange={(e) => updateSubPattern(index, { roleId: e.target.value })}
                  disabled={disabled || isLoadingRoles}
                >
                  <option value="">Select role...</option>
                  {(rolesData || []).map((role: any) => (
                    <option key={role.id} value={role.id}>{`${role.roleName} (${role.roleCode})`}</option>
                  ))}
                </Select>
              </FormField>
            )}

            {subPattern.patternType === 'hours_threshold' && (
              <>
                <FormField label="Hours Threshold" required>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={subPattern.hoursThreshold || 40}
                    onChange={(e) => updateSubPattern(index, { hoursThreshold: parseFloat(e.target.value) || 40 })}
                    disabled={disabled}
                    placeholder="e.g., 40"
                  />
                </FormField>
                <FormField label="Comparison" required>
                  <Select
                    value={subPattern.comparisonOperator || 'greater_than'}
                    onChange={(e) => updateSubPattern(index, { comparisonOperator: e.target.value as any })}
                    disabled={disabled}
                  >
                    {COMPARISON_OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </Select>
                </FormField>
              </>
            )}

            {/* Common fields for all sub-patterns */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Consecutive Count" required>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={subPattern.consecutiveCount}
                  onChange={(e) => updateSubPattern(index, { consecutiveCount: parseInt(e.target.value) || 1 })}
                  disabled={disabled}
                  placeholder="e.g., 3"
                />
              </FormField>

              <FormField label="Lookback Period (Days)" required>
                <Input
                  type="number"
                  min={7}
                  max={730}
                  value={subPattern.lookbackPeriodDays}
                  onChange={(e) => updateSubPattern(index, { lookbackPeriodDays: parseInt(e.target.value) || 90 })}
                  disabled={disabled}
                  placeholder="e.g., 90"
                />
              </FormField>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Combined Patterns</strong> allow you to create complex conditions by combining multiple patterns with AND/OR logic.
              <div className="mt-2">
                <strong>Example:</strong> "3 consecutive Sundays AND 40+ hours per week" or "Night shift OR weekend work"
              </div>
            </div>
          </div>
        </div>

        <FormField label="Logical Operator" required>
          <Select
            value={logicalOperator}
            onChange={(e) => updatePattern({ logicalOperator: e.target.value as 'AND' | 'OR' })}
            disabled={disabled}
          >
            <option value="AND">AND (All patterns must match)</option>
            <option value="OR">OR (Any pattern can match)</option>
          </Select>
        </FormField>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Sub-Patterns</h3>
            <button
              type="button"
              onClick={addSubPattern}
              disabled={disabled}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              Add Pattern
            </button>
          </div>

          {combinedPatterns.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">No patterns added yet</p>
              <button
                type="button"
                onClick={addSubPattern}
                disabled={disabled}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                Add Your First Pattern
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {combinedPatterns.map((subPattern, index) => (
                <div key={index}>
                  {renderSubPattern(subPattern, index)}
                  {index < combinedPatterns.length - 1 && (
                    <div className="flex items-center justify-center py-2">
                      <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded font-medium text-sm">
                        {logicalOperator}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {combinedPatterns.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Pattern Summary:</strong> Worker must match{' '}
                <strong>{logicalOperator === 'AND' ? 'ALL' : 'ANY'}</strong> of the{' '}
                <strong>{combinedPatterns.length}</strong> pattern(s) defined above.
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTestResults = () => {
    if (!testResults || !showTestPanel) return null;

    return (
      <div className="mt-6 border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">Test Results</h3>
          <button
            type="button"
            onClick={() => setShowTestPanel(false)}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Tested</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{testResults.totalTested}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="text-sm text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Qualified
            </div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{testResults.qualifiedCount}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              Not Qualified
            </div>
            <div className="text-2xl font-bold text-red-900 mt-1">{testResults.notQualifiedCount}</div>
          </div>
        </div>

        {/* Qualified Workers */}
        {testResults.qualifiedWorkers && testResults.qualifiedWorkers.length > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-4">
            <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-3">Qualified Workers</div>
            <div className="space-y-2">
              {testResults.qualifiedWorkers.slice(0, 5).map((worker: any, idx: number) => (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {worker.fullName || 'Unknown Employee'}
                        </div>
                        {worker.employeeNumber && (
                          <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            #{worker.employeeNumber}
                          </div>
                        )}
                      </div>
                      {worker.jobTitle && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {worker.jobTitle}
                        </div>
                      )}
                      {worker.metadata && (
                        <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1 bg-emerald-50 dark:bg-emerald-900/20 rounded p-2">
                          {worker.metadata.actualMaxConsecutive !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600 dark:text-gray-400">Consecutive days achieved:</span>
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                {worker.metadata.actualMaxConsecutive}
                              </span>
                            </div>
                          )}
                          {worker.metadata.totalMatchingDays !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600 dark:text-gray-400">Total matching days:</span>
                              <span className="font-semibold">{worker.metadata.totalMatchingDays}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {testResults.qualifiedWorkers.length > 5 && (
                <div className="text-center text-sm text-emerald-700 dark:text-emerald-300 italic pt-2">
                  ...and {testResults.qualifiedWorkers.length - 5} more workers qualified
                </div>
              )}
            </div>
          </div>
        )}

        {/* Not Qualified Workers */}
        {testResults.notQualifiedWorkers && testResults.notQualifiedWorkers.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-3">Not Qualified Workers</div>
            <div className="space-y-2">
              {testResults.notQualifiedWorkers.slice(0, 5).map((worker: any, idx: number) => (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {worker.fullName || 'Unknown Employee'}
                        </div>
                        {worker.employeeNumber && (
                          <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            #{worker.employeeNumber}
                          </div>
                        )}
                      </div>
                      {worker.jobTitle && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {worker.jobTitle}
                        </div>
                      )}
                      {worker.metadata && (
                        <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1 bg-gray-50 dark:bg-gray-900/50 rounded p-2">
                          {worker.metadata.actualMaxConsecutive !== undefined && worker.metadata.requiredConsecutive && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600 dark:text-gray-400">Consecutive days found:</span>
                              <span className="font-semibold">{worker.metadata.actualMaxConsecutive}</span>
                              <span className="text-red-600 dark:text-red-400">
                                (required: {worker.metadata.requiredConsecutive})
                              </span>
                            </div>
                          )}
                          {worker.metadata.totalMatchingDays !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600 dark:text-gray-400">Total matching days:</span>
                              <span className="font-semibold">{worker.metadata.totalMatchingDays}</span>
                            </div>
                          )}
                          {worker.metadata.reason && (
                            <div className="text-red-600 dark:text-red-400 italic mt-1">
                              {worker.metadata.reason}
                            </div>
                          )}
                          {worker.error && (
                            <div className="text-red-600 dark:text-red-400 italic">
                              Error: {worker.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {testResults.notQualifiedWorkers.length > 5 && (
                <div className="text-center text-sm text-red-700 dark:text-red-300 italic pt-2">
                  ...and {testResults.notQualifiedWorkers.length - 5} more workers not qualified
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!pattern) {
    return (
      <div className="space-y-4">
        {renderPatternTypeSelector()}
        <div className="text-sm text-gray-500 italic">
          Select a pattern type to add temporal conditions to this component
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {pattern.patternType === 'day_of_week' && renderDayOfWeekPattern()}
        {pattern.patternType === 'shift_type' && renderShiftTypePattern()}
        {pattern.patternType === 'station' && renderStationPattern()}
        {pattern.patternType === 'role' && renderRolePattern()}
        {pattern.patternType === 'hours_threshold' && renderHoursThresholdPattern()}
        {pattern.patternType === 'combined' && renderCombinedPattern()}
        
        {/* Test Pattern Section */}
        {pattern && (
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Test Pattern</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Test this pattern against sample workers to see who would qualify
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkerModal(true)}
                disabled={disabled || testPatternMutation.isPending}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
              >
                {testPatternMutation.isPending ? 'Testing...' : 'Test Pattern'}
              </button>
            </div>
            
            {renderTestResults()}
          </div>
        )}
      </div>

      {/* Worker Selection Modal */}
      <WorkerSelectionModal
        isOpen={showWorkerModal}
        onClose={() => setShowWorkerModal(false)}
        onConfirm={handleTestPattern}
        isLoading={testPatternMutation.isPending}
      />
    </>
  );
}
