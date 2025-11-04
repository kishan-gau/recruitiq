import { useState } from 'react';
import { Dialog, FormField, Select, Input } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { FileDown } from 'lucide-react';

interface ReportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: {
    id: string;
    title: string;
    category: string;
  } | null;
}

export default function ReportConfigModal({ isOpen, onClose, reportType }: ReportConfigModalProps) {
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    format: 'pdf',
    groupBy: 'none',
  });

  const handleGenerate = async () => {
    setIsLoading(true);

    try {
      // TODO: Replace with actual API call
      // const result = await api.reports.generate(reportType?.id, formData);
      // downloadFile(result.url);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      success(`${reportType?.title} report generated successfully`);
      onClose();
    } catch (err) {
      error('Failed to generate report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!reportType) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Generate ${reportType.title}`}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <span>Generating...</span>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Generate Report</span>
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Category: <span className="font-semibold">{reportType.category}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date" required>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </FormField>

          <FormField label="End Date" required>
            <Input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="Format" required>
          <Select
            value={formData.format}
            onChange={(e) => setFormData({ ...formData, format: e.target.value })}
            options={[
              { value: 'pdf', label: 'PDF' },
              { value: 'xlsx', label: 'Excel (XLSX)' },
              { value: 'csv', label: 'CSV' },
            ]}
          />
        </FormField>

        {reportType.category === 'payroll' && (
          <FormField label="Group By">
            <Select
              value={formData.groupBy}
              onChange={(e) => setFormData({ ...formData, groupBy: e.target.value })}
              options={[
                { value: 'none', label: 'No Grouping' },
                { value: 'department', label: 'Department' },
                { value: 'position', label: 'Position' },
                { value: 'workerType', label: 'Worker Type' },
              ]}
            />
          </FormField>
        )}
      </div>
    </Dialog>
  );
}
