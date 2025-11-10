import { useState, useEffect } from 'react';
import {
  Building2,
  DollarSign,
  FileText,
  Users,
  Save,
  Calculator,
  Zap,
} from 'lucide-react';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import StatusBadge from '@/components/ui/StatusBadge';
import type { Tab } from '@/components/ui/Tabs';
import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const { success, error: showError } = useToast();
  const { paylinq } = usePaylinqAPI();
  const navigate = useNavigate();
  const [taxRules, setTaxRules] = useState<any[]>([]);
  const [isLoadingTaxRules, setIsLoadingTaxRules] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>({});
  const [payrollSettings, setPayrollSettings] = useState<any>({});
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Fetch company settings when company tab is active
  useEffect(() => {
    if (activeTab === 'company') {
      const fetchCompanySettings = async () => {
        try {
          setIsLoadingSettings(true);
          const response = await paylinq.getCompanySettings();
          if (response.success && response.data) {
            setCompanySettings(response.data);
          }
        } catch (err: any) {
          console.error('Failed to fetch company settings:', err);
        } finally {
          setIsLoadingSettings(false);
        }
      };
      fetchCompanySettings();
    }
  }, [activeTab, paylinq]);

  // Fetch payroll settings when payroll tab is active
  useEffect(() => {
    if (activeTab === 'payroll') {
      const fetchPayrollSettings = async () => {
        try {
          setIsLoadingSettings(true);
          const response = await paylinq.getPayrollSettings();
          if (response.success && response.data) {
            setPayrollSettings(response.data);
          }
        } catch (err: any) {
          console.error('Failed to fetch payroll settings:', err);
        } finally {
          setIsLoadingSettings(false);
        }
      };
      fetchPayrollSettings();
    }
  }, [activeTab, paylinq]);

  // Fetch tax rules when tax-rules tab is active
  useEffect(() => {
    if (activeTab === 'tax-rules') {
      const fetchTaxRules = async () => {
        try {
          setIsLoadingTaxRules(true);
          const response = await paylinq.getTaxRules();
          if (response.success && response.data) {
            setTaxRules(response.data);
          }
        } catch (err: any) {
          console.error('Failed to fetch tax rules:', err);
          showError(err.message || 'Failed to load tax rules');
        } finally {
          setIsLoadingTaxRules(false);
        }
      };
      fetchTaxRules();
    }
  }, [activeTab, paylinq, showError]);

  const handleSaveCompanySettings = async () => {
    try {
      await paylinq.updateCompanySettings(companySettings);
      success('Company settings saved successfully');
    } catch (err: any) {
      console.error('Failed to save company settings:', err);
      showError(err.message || 'Failed to save company settings');
    }
  };

  const handleSavePayrollSettings = async () => {
    try {
      await paylinq.updatePayrollSettings(payrollSettings);
      success('Payroll settings saved successfully');
    } catch (err: any) {
      console.error('Failed to save payroll settings:', err);
      showError(err.message || 'Failed to save payroll settings');
    }
  };

  const tabs: Tab[] = [
    { id: 'company', label: 'Company', icon: <Building2 className="w-4 h-4" /> },
    { id: 'payroll', label: 'Payroll', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'tax-rules', label: 'Tax Rules', icon: <FileText className="w-4 h-4" /> },
    { id: 'pay-components', label: 'Pay Components', icon: <Calculator className="w-4 h-4" /> },
    { id: 'users', label: 'Users & Roles', icon: <Users className="w-4 h-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure organization and payroll settings
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Company Settings */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          {isLoadingSettings ? (
            <div className="animate-pulse bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companySettings.name || ''}
                  onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tax Registration Number
                </label>
                <input
                  type="text"
                  value={companySettings.taxRegistrationNumber || ''}
                  onChange={(e) => setCompanySettings({ ...companySettings, taxRegistrationNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={companySettings.email || ''}
                  onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={companySettings.phone || ''}
                  onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={companySettings.address || ''}
                  onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button
                onClick={handleSaveCompanySettings}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
              >
                <Save className="w-5 h-5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Regional Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Currency
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
                  <option value="SRD">SRD - Surinamese Dollar</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timezone
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
                  <option value="America/Paramaribo">Paramaribo (GMT-3)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Format
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
                  <option value="en">English</option>
                  <option value="nl">Dutch</option>
                </select>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* Payroll Settings */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pay Period Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pay Frequency
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
                  <option value="biweekly">Bi-weekly (Every 2 weeks)</option>
                  <option value="monthly">Monthly</option>
                  <option value="semimonthly">Semi-monthly (Twice a month)</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pay Day
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
                  <option value="15">15th of the month</option>
                  <option value="last">Last day of the month</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-emerald-500" defaultChecked />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable 13th month bonus (December)
                </span>
              </label>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Approval Workflow</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-emerald-500" defaultChecked />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Require manager approval for time entries
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-emerald-500" defaultChecked />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Require HR review before payroll processing
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-emerald-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Auto-approve regular scheduled shifts
                </span>
              </label>
            </div>
            <div className="mt-4 flex justify-end">
                <button
                onClick={handleSavePayrollSettings}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
              >
                <Save className="w-5 h-5" />
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Rules */}
      {activeTab === 'tax-rules' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Tax Rules</h3>
              <button 
                onClick={() => navigate('/tax-rules')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-medium"
              >
                Manage Tax Rules
              </button>
            </div>
            {isLoadingTaxRules ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            ) : taxRules.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No tax rules configured yet.</p>
            ) : (
              <div className="space-y-3">
                {taxRules.map((rule) => (
                  <div key={rule.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{rule.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{rule.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={rule.status} size="sm" />
                      <button 
                        onClick={() => navigate('/tax-rules')}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              ⚠️ Tax rates for 2025 are placeholders. Please update with official rates from the Belastingdienst.
            </p>
          </div>
        </div>
      )}

      {/* Pay Components */}
      {activeTab === 'pay-components' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pay Components</h3>
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-medium">
                Add Component
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-between border border-green-200 dark:border-green-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Base Salary</p>
                  <Badge variant="green" size="sm">Earning</Badge>
                </div>
                <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">Edit</button>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-between border border-green-200 dark:border-green-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Overtime Pay</p>
                  <Badge variant="green" size="sm">Earning</Badge>
                </div>
                <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">Edit</button>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-between border border-green-200 dark:border-green-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Vacation Allowance</p>
                  <Badge variant="green" size="sm">Earning</Badge>
                </div>
                <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">Edit</button>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-between border border-red-200 dark:border-red-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Pension Contribution</p>
                  <Badge variant="red" size="sm">Deduction</Badge>
                </div>
                <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">Edit</button>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-between border border-red-200 dark:border-red-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Health Insurance</p>
                  <Badge variant="red" size="sm">Deduction</Badge>
                </div>
                <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users & Roles */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Users</h3>
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors font-medium">
                Invite User
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    AD
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Admin User</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">admin@abccompany.sr</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="purple">Administrator</Badge>
                  <StatusBadge status="active" size="sm" />
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                    HR
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">HR Manager</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">hr@abccompany.sr</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="blue">HR Manager</Badge>
                  <StatusBadge status="active" size="sm" />
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-semibold">
                    PM
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Payroll Manager</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">payroll@abccompany.sr</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="green">Payroll</Badge>
                  <StatusBadge status="active" size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integrations */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Integrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Banking Integration</h4>
                  <Badge variant="green">Connected</Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Direct payment processing with Surinamese banks
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">Configure</button>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Tax Authority</h4>
                  <Badge variant="gray">Not Connected</Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Automated tax declaration submission
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">Connect</button>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Time Tracking</h4>
                  <Badge variant="green">Connected</Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Import time entries from external systems
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">Configure</button>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Accounting Software</h4>
                  <Badge variant="gray">Not Connected</Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Sync payroll data with accounting systems
                </p>
                <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">Connect</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


