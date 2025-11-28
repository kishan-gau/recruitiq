/**
 * Pay Period Configuration Page
 * 
 * Configure pay period settings including:
 * - Pay frequency (weekly, bi-weekly, semi-monthly, monthly)
 * - Pay period start date
 * - Pay day configuration
 * - Holiday calendar
 * - Preview of upcoming pay periods
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Settings,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { DatePicker, FormSection, FormGrid, FormField, FormActions } from '@/components/form';
import { format, addDays, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';

type PayFrequency = 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';

interface PayPeriodConfig {
  frequency: PayFrequency;
  startDate: Date;
  payDayOffset: number; // Days after period end
  firstPayDay?: number; // For semi-monthly (e.g., 15)
  secondPayDay?: number; // For semi-monthly (e.g., last day)
}

interface Holiday {
  id: string;
  holidayName: string;
  holidayDate: string | Date;
  isRecurring: boolean;
}

const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', description: '52 pay periods per year' },
  { value: 'bi-weekly', label: 'Bi-Weekly', description: '26 pay periods per year' },
  { value: 'semi-monthly', label: 'Semi-Monthly', description: '24 pay periods per year (15th & last day)' },
  { value: 'monthly', label: 'Monthly', description: '12 pay periods per year' },
];

function calculateNextPayPeriods(config: PayPeriodConfig, count: number = 6) {
  const periods = [];
  let currentDate = config.startDate;

  for (let i = 0; i < count; i++) {
    let periodStart: Date;
    let periodEnd: Date;

    switch (config.frequency) {
      case 'weekly':
        periodStart = currentDate;
        periodEnd = addDays(currentDate, 6);
        currentDate = addDays(currentDate, 7);
        break;
      case 'bi-weekly':
        periodStart = currentDate;
        periodEnd = addDays(currentDate, 13);
        currentDate = addDays(currentDate, 14);
        break;
      case 'semi-monthly':
        // 1st-15th and 16th-last day
        if (i % 2 === 0) {
          periodStart = startOfMonth(currentDate);
          periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);
        } else {
          periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 16);
          periodEnd = endOfMonth(currentDate);
          currentDate = addMonths(currentDate, 1);
        }
        break;
      case 'monthly':
        periodStart = startOfMonth(currentDate);
        periodEnd = endOfMonth(currentDate);
        currentDate = addMonths(currentDate, 1);
        break;
    }

    const payDate = addDays(periodEnd, config.payDayOffset);

    periods.push({
      periodStart,
      periodEnd,
      payDate,
    });
  }

  return periods;
}

export default function PayPeriodConfigPage() {
  const { paylinq } = usePaylinqAPI();
  const { success: showSuccess, error: showError } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState<PayFrequency>('bi-weekly');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [payDayOffset, setPayDayOffset] = useState(3);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState<Date | null>(null);
  const [newHolidayRecurring, setNewHolidayRecurring] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadConfig();
    loadHolidays();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const response = await paylinq.getPayPeriodConfig();
      if (response.payPeriodConfig) {
        const config = response.payPeriodConfig;
        setSelectedFrequency(config.payFrequency);
        setStartDate(new Date(config.periodStartDate));
        setPayDayOffset(config.payDayOffset || 3);
      }
    } catch (err: any) {
      console.error('Error loading pay period config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHolidays = async () => {
    try {
      const response = await paylinq.getHolidays();
      if (response.holidays) {
        setHolidays(response.holidays);
      }
    } catch (err: any) {
      console.error('Error loading holidays:', err);
    }
  };

  const config: PayPeriodConfig = {
    frequency: selectedFrequency,
    startDate: startDate || new Date(),
    payDayOffset,
  };

  const upcomingPeriods = startDate ? calculateNextPayPeriods(config, 6) : [];

  const handleSave = async () => {
    if (!startDate) {
      showError('Please select a pay period start date');
      return;
    }

    try {
      setIsSaving(true);
      await paylinq.savePayPeriodConfig({
        payFrequency: selectedFrequency,
        periodStartDate: startDate.toISOString().split('T')[0],
        payDayOffset,
      });
      
      showSuccess('Pay period configuration saved successfully');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to save configuration',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayName || !newHolidayDate) {
      showError('Please enter holiday name and date');
      return;
    }

    try {
      const response = await paylinq.createHoliday({
        holidayName: newHolidayName,
        holidayDate: newHolidayDate.toISOString().split('T')[0],
        isRecurring: newHolidayRecurring,
        affectsPaySchedule: true,
        affectsWorkSchedule: true,
      });

      if (response.holiday) {
        setHolidays([...holidays, response.holiday]);
        setNewHolidayName('');
        setNewHolidayDate(null);
        setNewHolidayRecurring(false);
        setShowAddHoliday(false);
        showSuccess('Holiday added successfully');
      }
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to add holiday',
      });
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      await paylinq.deleteHoliday(id);
      setHolidays(holidays.filter(h => h.id !== id));
      showSuccess('Holiday deleted successfully');
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to delete holiday',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pay Period Configuration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure pay frequency, pay dates, and holiday calendar
        </p>
      </div>

      {/* Success Message */}
      {isSaved && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
          <p className="text-sm text-green-800">Settings saved successfully!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pay Frequency */}
          <FormSection
            title="Pay Frequency"
            description="Select how often employees are paid"
            icon={<Calendar className="w-5 h-5 text-gray-600" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PAY_FREQUENCIES.map((freq) => (
                <label
                  key={freq.value}
                  className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedFrequency === freq.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    value={freq.value}
                    checked={selectedFrequency === freq.value}
                    onChange={(e) => setSelectedFrequency(e.target.value as PayFrequency)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{freq.label}</span>
                    {selectedFrequency === freq.value && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{freq.description}</span>
                </label>
              ))}
            </div>
          </FormSection>

          {/* Pay Period Settings */}
          <FormSection
            title="Pay Period Settings"
            description="Configure pay period start date and pay day"
            icon={<Settings className="w-5 h-5 text-gray-600" />}
          >
            <FormGrid columns={2} gap={6}>
              <FormField
                label="Pay Period Start Date"
                helpText="First day of the first pay period"
                required
              >
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  required
                />
              </FormField>

              <FormField
                label="Pay Day Offset"
                helpText="Days after period end to pay employees"
                required
              >
                <select
                  value={payDayOffset}
                  onChange={(e) => setPayDayOffset(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value={0}>Same day as period end</option>
                  <option value={1}>1 day after period end</option>
                  <option value={2}>2 days after period end</option>
                  <option value={3}>3 days after period end</option>
                  <option value={5}>5 days after period end</option>
                  <option value={7}>7 days after period end</option>
                </select>
              </FormField>
            </FormGrid>
          </FormSection>

          {/* Holiday Calendar */}
          <FormSection
            title="Holiday Calendar"
            description="Manage company holidays that affect pay schedules"
            icon={<Calendar className="w-5 h-5 text-gray-600" />}
          >
            <div className="space-y-4">
              {/* Holidays List */}
              {holidays.length > 0 ? (
                <div className="space-y-2">
                  {holidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{holiday.holidayName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(holiday.holidayDate), 'MMMM dd, yyyy')}
                          {holiday.isRecurring && ' • Recurring annually'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                  <p className="text-sm">No holidays configured</p>
                </div>
              )}

              {/* Add Holiday Form */}
              {showAddHoliday ? (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Holiday Name
                    </label>
                    <input
                      type="text"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      placeholder="e.g., Christmas Day"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <DatePicker
                      value={newHolidayDate}
                      onChange={setNewHolidayDate}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={newHolidayRecurring}
                      onChange={(e) => setNewHolidayRecurring(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="recurring" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Recurring annually
                    </label>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleAddHoliday}
                      disabled={!newHolidayName || !newHolidayDate}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Holiday
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddHoliday(false);
                        setNewHolidayName('');
                        setNewHolidayDate(null);
                        setNewHolidayRecurring(true);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddHoliday(true)}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Holiday
                </button>
              )}
            </div>
          </FormSection>

          {/* Save Button */}
          <FormActions
            onSubmit={handleSave}
            submitLabel="Save Configuration"
          />
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Upcoming Pay Periods
            </h3>

            {startDate ? (
              <div className="space-y-4">
                {upcomingPeriods.map((period, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Period {index + 1}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white mb-2">
                      {format(period.periodStart, 'MMM dd')} - {format(period.periodEnd, 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                      <Calendar className="w-3 h-3 mr-1" />
                      Pay Date: {format(period.payDate, 'MMM dd, yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Select a start date to preview pay periods</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


