/**
 * PayLinQ Settings Hub
 * Central hub for all PayLinQ payroll configuration and settings
 */

import {
  Globe,
  Send,
  DollarSign,
  Bell,
  FileText,
  Calendar,
  Scale,
  Users,
  Clock,
  Shield,
  Workflow,
} from 'lucide-react';

import type { SettingCard, SettingsCategory } from '@/features/settings/components';
import { SettingsHub } from '@/features/settings/components';

const settingsCards: SettingCard[] = [
  // System Configuration
  {
    title: 'General Settings',
    description: 'Currency, regional settings, date/time formats, and language preferences',
    icon: Globe,
    href: '/payroll/settings/general',
    category: 'system',
  },
  {
    title: 'Email Configuration',
    description: 'Configure SMTP, SendGrid, or AWS SES for system emails',
    icon: Send,
    href: '/payroll/settings/email',
    category: 'system',
  },
  {
    title: 'Notifications',
    description: 'Manage email and in-app notification preferences',
    icon: Bell,
    href: '/payroll/settings/notifications',
    category: 'system',
  },
  
  // Payroll Configuration
  {
    title: 'Worker Types',
    description: 'Configure worker classifications, pay settings, and benefits eligibility',
    icon: Users,
    href: '/payroll/worker-types',
    category: 'payroll',
  },
  {
    title: 'Payroll Defaults',
    description: 'Default pay frequency, overtime rates, and work schedule settings',
    icon: DollarSign,
    href: '/payroll/settings/payroll-defaults',
    category: 'payroll',
  },
  {
    title: 'Payslip Templates',
    description: 'Design and customize payslip layouts and branding',
    icon: FileText,
    href: '/payroll/settings/payslip-templates',
    category: 'payroll',
  },
  {
    title: 'Payroll Run Types',
    description: 'Configure different payroll run types and their component inclusion',
    icon: Workflow,
    href: '/payroll/payroll-run-types',
    category: 'payroll',
  },
  {
    title: 'Currency Settings',
    description: 'Configure currencies and exchange rates for multi-currency payroll',
    icon: DollarSign,
    href: '/payroll/settings/currency',
    category: 'payroll',
  },
  {
    title: 'Loontijdvak Periods',
    description: 'Manage Dutch payroll tax periods for progressive tax calculations',
    icon: Calendar,
    href: '/payroll/settings/loontijdvak',
    category: 'payroll',
  },
  
  // Compliance & Tax
  {
    title: 'Tax Rules',
    description: 'Tax brackets, rates, and calculation rules',
    icon: Scale,
    href: '/payroll/tax-rules',
    category: 'compliance',
  },
  {
    title: 'Tax Settings',
    description: 'Advanced tax configuration and calculation settings',
    icon: Scale,
    href: '/payroll/tax-settings',
    category: 'compliance',
  },
  {
    title: 'Compliance Rules',
    description: 'Regulatory compliance settings and reporting requirements',
    icon: Shield,
    href: '/payroll/settings/compliance',
    category: 'compliance',
    badge: 'Soon',
  },
  
  // Access Control
  {
    title: 'Roles & Permissions',
    description: 'Configure roles, assign permissions, and manage user access control',
    icon: Shield,
    href: '/payroll/settings/roles',
    category: 'access',
  },
  {
    title: 'Audit Logs',
    description: 'View system activity and change history',
    icon: Clock,
    href: '/payroll/settings/audit-logs',
    category: 'access',
    badge: 'Soon',
  },
];

const categories: SettingsCategory[] = [
  { 
    id: 'system', 
    label: 'System Configuration', 
    description: 'Core system settings and preferences' 
  },
  { 
    id: 'payroll', 
    label: 'Payroll Configuration', 
    description: 'Payroll processing and calculation settings' 
  },
  { 
    id: 'compliance', 
    label: 'Compliance & Tax', 
    description: 'Tax and regulatory compliance settings' 
  },
  { 
    id: 'access', 
    label: 'Access Control', 
    description: 'User access and security settings' 
  },
];

export default function PayrollSettingsHub() {
  return (
    <SettingsHub
      title="Payroll Settings"
      description="Configure and customize PayLinQ to match your organization's payroll needs"
      cards={settingsCards}
      categories={categories}
    />
  );
}
