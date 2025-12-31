/**
 * Payroll Defaults Settings Page
 * 
 * Configure default payroll settings:
 * - Pay frequency
 * - Overtime rates
 * - Work hours and days
 */

import {
  DollarSign,
  Calendar,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { FormField } from "@recruitiq/ui";
import { Select } from '@recruitiq/ui';
import { Input } from '@recruitiq/ui';
import { useToast } from '@/contexts/ToastContext';

export default function PayrollDefaultsSettings() {
  const { success: showSuccess } = useToast();
  const [isSaved, setIsSaved] = useState(false);

  // Payroll defaults
  const [defaultPayFrequency, setDefaultPayFrequency] = useState('bi-weekly');
  const [defaultOvertimeRate, setDefaultOvertimeRate] = useState(1.5);
  const [defaultWorkHoursPerDay, setDefaultWorkHoursPerDay] = useState(8);
  const [defaultWorkDaysPerWeek, setDefaultWorkDaysPerWeek] = useState(5);

  // Pay frequency options
  const payFrequencyOptions = [
    { value: 'weekly', label: 'Weekly (52 pay periods)' },
    { value: 'bi-weekly', label: 'Bi-weekly (26 pay periods)' },
    { value: 'semi-monthly', label: 'Semi-monthly (24 pay periods)' },
    { value: 'monthly', label: 'Monthly (12 pay periods)' },
  ];

  const handleSave = () => {
    console.log('Saving payroll defaults:', {
      defaultPayFrequency,
      defaultOvertimeRate,
      defaultWorkHoursPerDay,
      defaultWorkDaysPerWeek,
    });
    setIsSaved(true);
    showSuccess('Payroll defaults saved successfully');
    setTimeout(() => setIsSaved(false), 3000);
  };

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
              Payroll Defaults
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure default payroll settings for new employees
            </p>
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Save Settings
          </button>
        </div>
      </div>

      {/* Success message */}
      {isSaved && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Payroll defaults saved successfully
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Defaults */}
      <section
        title="Payroll Defaults"
        description="Configure default payroll settings for new employees"
        icon={<Calendar className="h-5 w-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Default Pay Frequency" required>
            <Select
              options={payFrequencyOptions}
              value={defaultPayFrequency}
              onChange={(value) => setDefaultPayFrequency(value as string)}
              placeholder="Select pay frequency"
            />
          </FormField>

          <FormField label="Default Overtime Rate" required helpText="Multiplier (e.g., 1.5 = 150%)">
            <Input
              type="number"
              value={defaultOvertimeRate}
              onChange={(e) => setDefaultOvertimeRate(parseFloat(e.target.value))}
              min="1"
              max="3"
              step="0.1"
            />
          </FormField>

          <FormField label="Default Work Hours Per Day" required>
            <Input
              type="number"
              value={defaultWorkHoursPerDay}
              onChange={(e) => setDefaultWorkHoursPerDay(parseInt(e.target.value))}
              min="1"
              max="24"
            />
          </FormField>

          <FormField label="Default Work Days Per Week" required>
            <Input
              type="number"
              value={defaultWorkDaysPerWeek}
              onChange={(e) => setDefaultWorkDaysPerWeek(parseInt(e.target.value))}
              min="1"
              max="7"
            />
          </FormField>
        </div>
      </section>
    </div>
  );
}
