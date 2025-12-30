/**
 * Recruitment Settings Hub
 * Central hub for all RecruitIQ recruitment configuration and settings
 */

import {
  Briefcase,
  FileText,
  Mail,
  Star,
  Users,
  Calendar,
  MessageSquare,
  Globe,
  Shield,
  Settings,
} from 'lucide-react';

import type { SettingCard, SettingsCategory } from '@/features/settings/components';
import { SettingsHub } from '@/features/settings/components';

const settingsCards: SettingCard[] = [
  // Recruitment Configuration
  {
    title: 'Job Templates',
    description: 'Create and manage job posting templates',
    icon: Briefcase,
    href: '/recruitment/settings/job-templates',
    category: 'recruitment',
    badge: 'Soon',
  },
  {
    title: 'Application Forms',
    description: 'Customize application forms and required fields',
    icon: FileText,
    href: '/recruitment/settings/application-forms',
    category: 'recruitment',
    badge: 'Soon',
  },
  {
    title: 'Email Templates',
    description: 'Configure automated email templates for candidates',
    icon: Mail,
    href: '/recruitment/settings/email-templates',
    category: 'recruitment',
    badge: 'Soon',
  },
  {
    title: 'Evaluation Criteria',
    description: 'Define screening and evaluation criteria',
    icon: Star,
    href: '/recruitment/settings/evaluation',
    category: 'recruitment',
    badge: 'Soon',
  },
  
  // Hiring Process
  {
    title: 'Interview Types',
    description: 'Configure interview types and assessment methods',
    icon: Users,
    href: '/recruitment/settings/interview-types',
    category: 'hiring',
    badge: 'Soon',
  },
  {
    title: 'Screening Questions',
    description: 'Set up pre-screening questionnaires',
    icon: MessageSquare,
    href: '/recruitment/settings/screening',
    category: 'hiring',
    badge: 'Soon',
  },
  {
    title: 'Interview Scheduling',
    description: 'Configure interview scheduling preferences',
    icon: Calendar,
    href: '/recruitment/settings/scheduling',
    category: 'hiring',
    badge: 'Soon',
  },
  {
    title: 'Offer Templates',
    description: 'Manage job offer letter templates',
    icon: FileText,
    href: '/recruitment/settings/offers',
    category: 'hiring',
    badge: 'Soon',
  },
  
  // Career Portal
  {
    title: 'Career Page Settings',
    description: 'Customize your public career page',
    icon: Globe,
    href: '/recruitment/settings/career-page',
    category: 'portal',
    badge: 'Soon',
  },
  {
    title: 'Job Board Integrations',
    description: 'Connect with external job boards',
    icon: Settings,
    href: '/recruitment/settings/integrations',
    category: 'portal',
    badge: 'Soon',
  },
  
  // Access Control
  {
    title: 'Roles & Permissions',
    description: 'Configure recruiter roles and hiring team permissions',
    icon: Shield,
    href: '/recruitment/settings/roles',
    category: 'access',
    badge: 'Soon',
  },
];

const categories: SettingsCategory[] = [
  { 
    id: 'recruitment', 
    label: 'Recruitment Configuration', 
    description: 'Job postings, applications, and communication templates' 
  },
  { 
    id: 'hiring', 
    label: 'Hiring Process', 
    description: 'Interviews, screening, and offer management' 
  },
  { 
    id: 'portal', 
    label: 'Career Portal', 
    description: 'Public career page and job board integrations' 
  },
  { 
    id: 'access', 
    label: 'Access Control', 
    description: 'Recruiter roles and permissions' 
  },
];

export default function RecruitmentSettingsHub() {
  return (
    <div className="space-y-4">
      {/* Coming Soon Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Recruitment Settings Coming Soon
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Comprehensive recruitment settings are under development. These settings will allow you 
              to customize the entire hiring process, from job postings to candidate onboarding.
            </p>
          </div>
        </div>
      </div>

      <SettingsHub
        title="Recruitment Settings"
        description="Configure and customize RecruitIQ to match your hiring needs"
        cards={settingsCards}
        categories={categories}
      />
    </div>
  );
}
