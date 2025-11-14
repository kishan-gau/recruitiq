/**
 * Settings Hub
 * 
 * Central hub for all Paylinq configuration and settings.
 * Organized into logical categories for better UX as the platform grows.
 */

import { Link } from 'react-router-dom';
import {
  Settings,
  Globe,
  Send,
  DollarSign,
  Bell,
  FileText,
  Calendar,
  Scale,
  Building2,
  Users,
  Clock,
  Shield,
  Database,
  Workflow,
  ChevronRight,
} from 'lucide-react';

interface SettingCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  category: 'system' | 'payroll' | 'compliance' | 'integration';
}

const settingsCards: SettingCard[] = [
  // System Configuration
  {
    title: 'General Settings',
    description: 'Currency, regional settings, date/time formats, and language preferences',
    icon: <Globe className="h-6 w-6" />,
    href: '/settings/general',
    category: 'system',
  },
  {
    title: 'Email Configuration',
    description: 'Configure SMTP, SendGrid, or AWS SES for system emails',
    icon: <Send className="h-6 w-6" />,
    href: '/settings/email',
    category: 'system',
  },
  {
    title: 'Notifications',
    description: 'Manage email and in-app notification preferences',
    icon: <Bell className="h-6 w-6" />,
    href: '/settings/notifications',
    category: 'system',
  },
  {
    title: 'Organization',
    description: 'Company information, branding, and organizational structure',
    icon: <Building2 className="h-6 w-6" />,
    href: '/settings/organization',
    category: 'system',
    badge: 'Soon',
  },
  
  // Payroll Configuration
  {
    title: 'Worker Types',
    description: 'Configure worker classifications, pay settings, and benefits eligibility',
    icon: <Users className="h-6 w-6" />,
    href: '/settings/worker-types',
    category: 'payroll',
  },
  {
    title: 'Payroll Defaults',
    description: 'Default pay frequency, overtime rates, and work schedule settings',
    icon: <DollarSign className="h-6 w-6" />,
    href: '/settings/payroll-defaults',
    category: 'payroll',
  },
  {
    title: 'Pay Period Configuration',
    description: 'Configure pay periods, cutoff dates, and payroll cycles',
    icon: <Calendar className="h-6 w-6" />,
    href: '/settings/pay-periods',
    category: 'payroll',
  },
  {
    title: 'Payslip Templates',
    description: 'Design and customize payslip layouts and branding',
    icon: <FileText className="h-6 w-6" />,
    href: '/settings/payslip-templates',
    category: 'payroll',
  },
  {
    title: 'Payroll Run Types',
    description: 'Configure different payroll run types and their component inclusion',
    icon: <Workflow className="h-6 w-6" />,
    href: '/settings/payroll-run-types',
    category: 'payroll',
  },
  
  // Compliance & Tax
  {
    title: 'Tax Rules',
    description: 'Tax brackets, rates, and calculation rules',
    icon: <Scale className="h-6 w-6" />,
    href: '/tax-rules',
    category: 'compliance',
  },
  {
    title: 'Tax Settings',
    description: 'Advanced tax configuration and calculation settings',
    icon: <Scale className="h-6 w-6" />,
    href: '/settings/tax-settings',
    category: 'compliance',
  },
  {
    title: 'Compliance Rules',
    description: 'Regulatory compliance settings and reporting requirements',
    icon: <Shield className="h-6 w-6" />,
    href: '/settings/compliance',
    category: 'compliance',
    badge: 'Soon',
  },
  
  // Integrations & Advanced
  {
    title: 'Data & Security',
    description: 'Data retention, backups, and security settings',
    icon: <Database className="h-6 w-6" />,
    href: '/settings/data-security',
    category: 'integration',
    badge: 'Soon',
  },
  {
    title: 'User Management',
    description: 'Manage users, roles, and access permissions',
    icon: <Users className="h-6 w-6" />,
    href: '/settings/users',
    category: 'integration',
    badge: 'Soon',
  },
  {
    title: 'Audit Logs',
    description: 'View system activity and change history',
    icon: <Clock className="h-6 w-6" />,
    href: '/settings/audit-logs',
    category: 'integration',
    badge: 'Soon',
  },
];

const categories = [
  { id: 'system', label: 'System Configuration', description: 'Core system settings and preferences' },
  { id: 'payroll', label: 'Payroll Configuration', description: 'Payroll processing and calculation settings' },
  { id: 'compliance', label: 'Compliance & Tax', description: 'Tax and regulatory compliance settings' },
  { id: 'integration', label: 'Advanced & Integration', description: 'Security, users, and system integration' },
] as const;

export default function SettingsHub() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-700 rounded-lg flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure and customize Paylinq to match your organization's needs
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats / Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Centralized Configuration
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              All Paylinq settings are now organized in one place. Changes made here apply system-wide 
              and affect how payroll is processed, calculated, and reported.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Categories */}
      {categories.map((category) => {
        const categoryCards = settingsCards.filter(card => card.category === category.id);
        
        return (
          <div key={category.id} className="space-y-4">
            {/* Category Header */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {category.label}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {category.description}
              </p>
            </div>

            {/* Settings Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryCards.map((card) => (
                <Link
                  key={card.href}
                  to={card.href}
                  className="group relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-lg transition-all duration-200"
                >
                  {/* Badge */}
                  {card.badge && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {card.badge}
                      </span>
                    </div>
                  )}

                  {/* Icon */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      {card.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center">
                        {card.title}
                        <ChevronRight className="ml-auto h-5 w-5 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                      </h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {card.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {/* Help Section */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Need Help?
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Settings marked with "Soon" are coming in future releases. If you need assistance 
          configuring your payroll system, contact your system administrator or refer to the documentation.
        </p>
      </div>
    </div>
  );
}
