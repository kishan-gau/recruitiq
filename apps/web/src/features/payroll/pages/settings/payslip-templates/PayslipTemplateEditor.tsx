import { ArrowLeft, Save, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { handleApiError } from '@/utils/errorHandler';

export default function PayslipTemplateEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { success, error: showError } = useToast();
  const { paylinq } = usePaylinqAPI();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    templateName: '',
    templateCode: '',
    description: '',
    layoutType: 'standard',
    headerColor: '#10b981',
    primaryColor: '#10b981',
    secondaryColor: '#6b7280',
    showCompanyLogo: true,
    showEmployeeInfo: true,
    showPaymentDetails: true,
    showEarningsSection: true,
    showDeductionsSection: true,
    showTaxesSection: true,
    showLeaveBalances: false,
    showYtdTotals: true,
    showQrCode: false,
    fontFamily: 'Arial',
    fontSize: 10,
    pageSize: 'A4',
    pageOrientation: 'portrait',
    showConfidentialityNotice: true,
    status: 'draft'
  });

  useEffect(() => {
    if (id && id !== 'new') {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      setIsLoading(true);
      const response = await paylinq.getPayslipTemplate(id!);
      const template = response.data?.data || response.data;
      
      setFormData({
        templateName: template.template_name || '',
        templateCode: template.template_code || '',
        description: template.description || '',
        layoutType: template.layout_type || 'standard',
        headerColor: template.header_color || '#10b981',
        primaryColor: template.primary_color || '#10b981',
        secondaryColor: template.secondary_color || '#6b7280',
        showCompanyLogo: template.show_company_logo !== false,
        showEmployeeInfo: template.show_employee_info !== false,
        showPaymentDetails: template.show_payment_details !== false,
        showEarningsSection: template.show_earnings_section !== false,
        showDeductionsSection: template.show_deductions_section !== false,
        showTaxesSection: template.show_taxes_section !== false,
        showLeaveBalances: template.show_leave_balances === true,
        showYtdTotals: template.show_ytd_totals !== false,
        showQrCode: template.show_qr_code === true,
        fontFamily: template.font_family || 'Arial',
        fontSize: template.font_size || 10,
        pageSize: template.page_size || 'A4',
        pageOrientation: template.page_orientation || 'portrait',
        showConfidentialityNotice: template.show_confidentiality_notice !== false,
        status: template.status || 'draft'
      });
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to load template',
      });
      navigate('/settings/payslip-templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (activate = false) => {
    try {
      setIsSaving(true);

      const payload = {
        ...formData,
        status: activate ? 'active' : formData.status
      };

      if (id && id !== 'new') {
        await paylinq.updatePayslipTemplate(id, payload);
        success(`Template ${activate ? 'activated' : 'updated'} successfully`);
      } else {
        const response = await paylinq.createPayslipTemplate(payload);
        const newId = response.data?.data?.id || response.data?.id;
        success('Template created successfully');
        navigate(`/settings/payslip-templates/${newId}`);
      }
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to save template',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading template...</p>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/settings/payslip-templates')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {id === 'new' ? 'Create Template' : 'Edit Template'}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Customize your payslip design and layout
              </p>
            </div>
          </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Activate</span>
          </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.templateName}
                onChange={(e) => handleChange('templateName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Standard Company Template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Template Code *
              </label>
              <input
                type="text"
                value={formData.templateCode}
                onChange={(e) => handleChange('templateCode', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., standard-template"
              />
              <p className="mt-1 text-xs text-gray-500">Lowercase letters, numbers, hyphens and underscores only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500"
                placeholder="Optional description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Layout Type
              </label>
              <select
                value={formData.layoutType}
                onChange={(e) => handleChange('layoutType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="standard">Standard</option>
                <option value="compact">Compact</option>
                <option value="detailed">Detailed</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Branding & Colors</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Header Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.headerColor}
                    onChange={(e) => handleChange('headerColor', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 dark:border-gray-700"
                  />
                  <input
                    type="text"
                    value={formData.headerColor}
                    onChange={(e) => handleChange('headerColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 dark:border-gray-700"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Family
              </label>
              <select
                value={formData.fontFamily}
                onChange={(e) => handleChange('fontFamily', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier">Courier</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Size: {formData.fontSize}pt
              </label>
              <input
                type="range"
                min="8"
                max="14"
                value={formData.fontSize}
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Page Size
                </label>
                <select
                  value={formData.pageSize}
                  onChange={(e) => handleChange('pageSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Orientation
                </label>
                <select
                  value={formData.pageOrientation}
                  onChange={(e) => handleChange('pageOrientation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section Visibility */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Section Visibility</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { key: 'showCompanyLogo', label: 'Company Logo' },
              { key: 'showEmployeeInfo', label: 'Employee Information' },
              { key: 'showPaymentDetails', label: 'Payment Details' },
              { key: 'showEarningsSection', label: 'Earnings Breakdown' },
              { key: 'showDeductionsSection', label: 'Deductions' },
              { key: 'showTaxesSection', label: 'Taxes' },
              { key: 'showLeaveBalances', label: 'Leave Balances' },
              { key: 'showYtdTotals', label: 'YTD Totals' },
              { key: 'showQrCode', label: 'QR Code' },
              { key: 'showConfidentialityNotice', label: 'Confidentiality Notice' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData[key as keyof typeof formData] as boolean}
                  onChange={(e) => handleChange(key, e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
