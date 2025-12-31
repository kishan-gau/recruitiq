/**
 * Loontijdvak (Tax Period) Settings Page
 * 
 * Manage Dutch payroll tax periods for accurate progressive tax calculations.
 * Loontijdvak periods determine which tax tables are used for wage tax calculations.
 */

import {
  Calendar,
  Plus,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Edit2,
  Trash2,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { APIClient, PaylinqClient } from '@recruitiq/api-client';

import { FormField } from "@recruitiq/ui";
import { Select } from '@recruitiq/ui';
import { Input } from '@recruitiq/ui';
import { useToast } from '@/contexts/ToastContext';


const apiClient = new APIClient();
const paylinqClient = new PaylinqClient(apiClient);

interface Loontijdvak {
  id: string;
  period_type: 'week' | '4_weeks' | 'month' | 'quarter' | 'year';
  period_number: number;
  year: number;
  start_date: string;
  end_date: string;
  tax_table_version?: string;
  is_active: boolean;
  created_at: string;
}

interface BulkGenerateForm {
  year: number;
  periodTypes: string[];
}

export default function LoontijdvakSettings() {
  const { success: showSuccess, error: showError } = useToast();
  
  const [loontijdvakken, setLoontijdvakken] = useState<Loontijdvak[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkGenerateForm>({
    year: new Date().getFullYear(),
    periodTypes: ['week', '4_weeks', 'month'],
  });

  // Period type options
  const periodTypeOptions = [
    { value: 'all', label: 'All Period Types' },
    { value: 'week', label: 'Weekly (Loontijdvak Week)' },
    { value: '4_weeks', label: '4-Weekly (Loontijdvak 4 Weken)' },
    { value: 'month', label: 'Monthly (Loontijdvak Maand)' },
    { value: 'quarter', label: 'Quarterly (Loontijdvak Kwartaal)' },
    { value: 'year', label: 'Yearly (Loontijdvak Jaar)' },
  ];

  // Year options (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => {
    const year = currentYear - 5 + i;
    return { value: year.toString(), label: year.toString() };
  });

  useEffect(() => {
    loadLoontijdvakken();
  }, [selectedYear, selectedType]);

  const loadLoontijdvakken = async () => {
    setIsLoading(true);
    try {
      const filters: any = {
        year: selectedYear,
      };
      if (selectedType !== 'all') {
        filters.periodType = selectedType;
      }

      const response = await paylinqClient.getLoontijdvakken(filters);
      setLoontijdvakken(response.data.loontijdvakken || []);
    } catch (error: any) {
      showError(`Failed to load loontijdvak periods: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await paylinqClient.bulkGenerateLoontijdvakken(
        bulkForm.year,
        bulkForm.periodTypes
      );
      
      showSuccess(`Generated ${response.data.result.created.length} loontijdvak periods for ${bulkForm.year}`);
      setShowBulkForm(false);
      loadLoontijdvakken();
    } catch (error: any) {
      showError(`Failed to generate periods: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this loontijdvak period?')) {
      return;
    }

    try {
      await paylinqClient.deleteLoontijdvak(id);
      showSuccess('Loontijdvak period deleted successfully');
      loadLoontijdvakken();
    } catch (error: any) {
      showError(`Failed to delete period: ${error.message}`);
    }
  };

  const handleCheckOverlaps = async () => {
    try {
      const response = await paylinqClient.checkLoontijdvakOverlaps();
      if (response.data.hasOverlaps) {
        showError(`Found ${response.data.count} overlapping periods!`);
      } else {
        showSuccess('No overlapping periods found');
      }
    } catch (error: any) {
      showError(`Failed to check for overlaps: ${error.message}`);
    }
  };

  const formatPeriodType = (type: string): string => {
    const labels: Record<string, string> = {
      'week': 'Week',
      '4_weeks': '4 Weeks',
      'month': 'Month',
      'quarter': 'Quarter',
      'year': 'Year',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string): string => new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Loontijdvak Periods
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage Dutch payroll tax periods for progressive tax rate calculations
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCheckOverlaps}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Overlaps
            </button>
            <button
              onClick={() => setShowBulkForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Bulk Generate
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
              About Loontijdvak Periods
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Loontijdvak periods define the timeframe used for looking up progressive tax rates in Dutch payroll.
              Each pay period must align with a configured loontijdvak to calculate taxes correctly.
              Different period types (week, 4-weeks, month) use different tax tables.
            </p>
          </div>
        </div>
      </div>

      {/* Bulk Generation Modal */}
      {showBulkForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Bulk Generate Loontijdvak Periods
            </h3>
            
            <div className="space-y-4">
              <FormField label="Year" required>
                <Input
                  type="number"
                  value={bulkForm.year}
                  onChange={(e) => setBulkForm({ ...bulkForm, year: parseInt(e.target.value) })}
                  min={currentYear - 5}
                  max={currentYear + 5}
                />
              </FormField>

              <FormField label="Period Types" required>
                <div className="space-y-2">
                  {['week', '4_weeks', 'month'].map((type) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={bulkForm.periodTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkForm({
                              ...bulkForm,
                              periodTypes: [...bulkForm.periodTypes, type],
                            });
                          } else {
                            setBulkForm({
                              ...bulkForm,
                              periodTypes: bulkForm.periodTypes.filter((t) => t !== type),
                            });
                          }
                        }}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {formatPeriodType(type)}
                      </span>
                    </label>
                  ))}
                </div>
              </FormField>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowBulkForm(false)}
                disabled={isGenerating}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkGenerate}
                disabled={isGenerating || bulkForm.periodTypes.length === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Year">
            <Select
              options={yearOptions}
              value={selectedYear.toString()}
              onChange={(value) => setSelectedYear(parseInt(value as string))}
              placeholder="Select year"
            />
          </FormField>

          <FormField label="Period Type">
            <Select
              options={periodTypeOptions}
              value={selectedType}
              onChange={(value) => setSelectedType(value as string)}
              placeholder="Select period type"
            />
          </FormField>
        </div>
      </div>

      {/* Loontijdvak List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Configured Periods ({loontijdvakken.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            Loading loontijdvak periods...
          </div>
        ) : loontijdvakken.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No loontijdvak periods found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Generate periods for {selectedYear} to get started.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowBulkForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate Periods
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loontijdvakken.map((period) => (
                  <tr key={period.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {period.year} - Period {period.period_number}
                      </div>
                      {period.tax_table_version && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Tax Table: {period.tax_table_version}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {formatPeriodType(period.period_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(period.start_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(period.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {period.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(period.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-4"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
