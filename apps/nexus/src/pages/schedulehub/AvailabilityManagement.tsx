import { useState, useMemo } from 'react';
import { useAuth } from '@recruitiq/auth';
import { Plus, Download, Upload, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@recruitiq/ui';
import AvailabilityCalendar from '../../components/schedulehub/availability/AvailabilityCalendar';
import AvailabilityEditor from '../../components/schedulehub/availability/AvailabilityEditor';
import Tabs from '../../components/ui/Tabs';
import { useAvailability, useCreateAvailability, useUpdateAvailability } from '../../hooks/schedulehub/useAvailability';
import { useToast } from '../../contexts/ToastContext';
import { useEmployees } from '../../hooks/useEmployees';

interface AvailabilityRule {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  availabilityType?: 'recurring' | 'one_time' | 'unavailable';
  effectiveDate?: string;
  expirationDate?: string;
  priority?: 'required' | 'preferred' | 'available' | 'unavailable';
}

const AvailabilityManagement = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('calendar');
  const [filterVisible, setFilterVisible] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedWorkerName, setSelectedWorkerName] = useState<string>('');
  const [existingRules, setExistingRules] = useState<AvailabilityRule[]>([]);

  const { data: availabilityData } = useAvailability();
  const { data: employees } = useEmployees();
  const createAvailability = useCreateAvailability();
  const updateAvailability = useUpdateAvailability();

  // Transform flat availability data into grouped format for calendar
  const groupedAvailability = useMemo(() => {
    if (!availabilityData || !employees) return [];

    // Group availability rules by workerId
    const grouped = new Map<string, any[]>();
    
    availabilityData.forEach((rule: any) => {
      if (!grouped.has(rule.workerId)) {
        grouped.set(rule.workerId, []);
      }
      grouped.get(rule.workerId)!.push({
        id: rule.id,
        workerId: rule.workerId,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        isRecurring: rule.availabilityType === 'recurring',
        effectiveDate: rule.effectiveFrom,
        expirationDate: rule.effectiveTo,
      });
    });

    // Map to calendar format with worker names
    return Array.from(grouped.entries()).map(([workerId, rules]) => {
      const employee = employees.find((emp: any) => emp.id === workerId);
      return {
        workerId,
        workerName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Worker',
        rules,
      };
    });
  }, [availabilityData, employees]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please log in to view availability.</p>
      </div>
    );
  }

  const handleDateSelect = (date: Date, workerId: string) => {
    // TODO: Implement availability exception editor
    console.log('Date selected:', date, 'Worker:', workerId);
  };

  const handleRuleClick = (rule: any) => {
    // Open editor with existing rule
    const employee = employees?.find((emp: any) => emp.id === rule.workerId);
    if (employee) {
      setSelectedWorkerId(rule.workerId);
      setSelectedWorkerName(`${employee.firstName} ${employee.lastName}`);
      setExistingRules([rule]);
      setEditorOpen(true);
    }
  };

  const handleAddAvailability = () => {
    // Open editor in create mode (without pre-selected employee)
    if (employees && employees.length > 0) {
      setSelectedWorkerId(null); // No pre-selection - let user choose
      setSelectedWorkerName('');
      setExistingRules([]);
      setEditorOpen(true);
    } else {
      toast.warning('No employees found. Please add employees first.');
    }
  };

  const handleSaveAvailability = async (rules: AvailabilityRule[], selectedWorkerIds: string[]) => {
    try {
      // If editing a single worker, use the pre-selected workerId
      const workerIds = selectedWorkerIds.length > 0 ? selectedWorkerIds : (selectedWorkerId ? [selectedWorkerId] : []);
      
      if (workerIds.length === 0) {
        toast.error('No workers selected');
        return;
      }

      // Create rules for each selected worker
      for (const workerId of workerIds) {
        for (const rule of rules) {
          const payload = {
            workerId: workerId,
            availabilityType: 'recurring' as const, // Backend expects this field
            dayOfWeek: rule.dayOfWeek, // Backend expects number, not string
            startTime: rule.startTime,
            endTime: rule.endTime,
            effectiveFrom: rule.effectiveDate,
            effectiveTo: rule.expirationDate,
            priority: 'preferred' as const, // Optional but good to set default
          };

          if (rule.id && selectedWorkerId) {
            // Update existing rule (only when editing single worker)
            await updateAvailability.mutateAsync({ id: rule.id, updates: payload });
          } else {
            // Create new rule (for all selected workers or new rules)
            await createAvailability.mutateAsync(payload);
          }
        }
      }

      const workerCount = workerIds.length;
      toast.success(`Availability saved successfully for ${workerCount} ${workerCount === 1 ? 'employee' : 'employees'}`);
      setEditorOpen(false);
      setSelectedWorkerId(null);
      setSelectedWorkerName('');
      setExistingRules([]);
    } catch (error) {
      console.error('Failed to save availability:', error);
      throw error; // Let the editor handle the error
    }
  };

  const handleCancelEditor = () => {
    setEditorOpen(false);
    setSelectedWorkerId(null);
    setSelectedWorkerName('');
    setExistingRules([]);
  };

  const handleExport = () => {
    // Export availability data as CSV
    try {
      if (!availabilityData || availabilityData.length === 0) {
        toast.warning('No availability data to export');
        return;
      }

      const csv = [
        ['Worker ID', 'Day of Week', 'Start Time', 'End Time', 'Is Recurring', 'Effective From', 'Effective To'].join(','),
        ...availabilityData.map((rule: any) =>
          [
            rule.workerId,
            rule.dayOfWeek,
            rule.startTime,
            rule.endTime,
            rule.isRecurring,
            rule.effectiveFrom || '',
            rule.effectiveTo || '',
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `availability-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Availability data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export availability data');
    }
  };

  const handleImport = () => {
    // Create file input and trigger click
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const lines = text.split('\n').slice(1); // Skip header
        
        let successCount = 0;
        let errorCount = 0;

        for (const line of lines) {
          if (!line.trim()) continue;
          
          const [workerId, dayOfWeek, startTime, endTime, isRecurring, effectiveFrom, effectiveTo] = line.split(',');
          
          try {
            await createAvailability.mutateAsync({
              workerId: workerId.trim(),
              availabilityType: isRecurring.trim().toLowerCase() === 'true' ? 'recurring' as const : 'one_time' as const,
              dayOfWeek: parseInt(dayOfWeek.trim()),
              startTime: startTime.trim(),
              endTime: endTime.trim(),
              effectiveFrom: effectiveFrom?.trim() || undefined,
              effectiveTo: effectiveTo?.trim() || undefined,
            });
            successCount++;
          } catch (error) {
            errorCount++;
            console.error('Failed to import line:', line, error);
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully imported ${successCount} availability rules`);
        }
        if (errorCount > 0) {
          toast.warning(`Failed to import ${errorCount} rules`);
        }
      } catch (error) {
        console.error('Import failed:', error);
        toast.error('Failed to import availability data');
      }
    };
    input.click();
  };

  const handleFilter = () => {
    // Toggle filter panel visibility
    setFilterVisible(!filterVisible);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Availability Management</h1>
          <p className="text-gray-600 mt-1">
            Manage employee availability for scheduling
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleFilter}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
          
          <button
            onClick={handleImport}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          
          <button
            onClick={handleAddAvailability}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Availability
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'calendar', label: 'Calendar View' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'calendar' && (
          <div className="bg-white rounded-lg shadow">
            <AvailabilityCalendar 
              availability={groupedAvailability} 
              onDateSelect={handleDateSelect}
              onRuleClick={handleRuleClick}
              showWorkerNames={true}
              highlightConflicts={true}
            />
          </div>
        )}
      </div>

      {/* Availability Editor Modal */}
      <Modal
        isOpen={editorOpen}
        onClose={handleCancelEditor}
        size="xl"
        title={selectedWorkerId ? 'Edit Worker Availability' : 'Add Worker Availability'}
      >
        <AvailabilityEditor
          workerId={selectedWorkerId || undefined}
          workerName={selectedWorkerName}
          employees={employees || []}
          existingRules={existingRules}
          onSave={handleSaveAvailability}
          onCancel={handleCancelEditor}
          isSubmitting={createAvailability.isPending || updateAvailability.isPending}
        />
      </Modal>
    </div>
  );
};

export default AvailabilityManagement;
