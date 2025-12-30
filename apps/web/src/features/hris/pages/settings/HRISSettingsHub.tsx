/**
 * HRIS Settings Hub
 * Central hub for all HRIS/Nexus configuration and settings
 */

import {
  Building2,
  MapPin,
  Users,
  Clock,
  Heart,
  FileText,
  Calendar,
  Shield,
  Award,
  Briefcase,
  UserCog,
} from 'lucide-react';

import type { SettingCard, SettingsCategory } from '@/features/settings/components';
import { SettingsHub } from '@/features/settings/components';

const settingsCards: SettingCard[] = [
  // Organization Structure
  {
    title: 'Organization Settings',
    description: 'Company information, branding, and organizational structure',
    icon: Building2,
    href: '/hris/settings/organization',
    category: 'organization',
  },
  {
    title: 'Departments',
    description: 'Configure departments and organizational units',
    icon: Users,
    href: '/hris/departments',
    category: 'organization',
  },
  {
    title: 'Locations',
    description: 'Manage office locations and work sites',
    icon: MapPin,
    href: '/hris/locations',
    category: 'organization',
  },
  
  // HR Configuration
  {
    title: 'Employment Types',
    description: 'Configure employee classifications and contract types',
    icon: Briefcase,
    href: '/hris/settings/employment-types',
    category: 'hr',
  },
  {
    title: 'Time-Off Types',
    description: 'Configure vacation, sick leave, and other time-off types',
    icon: Calendar,
    href: '/hris/time-off-types',
    category: 'hr',
  },
  {
    title: 'Attendance Rules',
    description: 'Set attendance tracking rules and policies',
    icon: Clock,
    href: '/hris/settings/attendance',
    category: 'hr',
  },
  {
    title: 'Benefits Configuration',
    description: 'Configure employee benefits plans and eligibility',
    icon: Heart,
    href: '/hris/settings/benefits',
    category: 'hr',
  },
  {
    title: 'Performance Settings',
    description: 'Configure performance review cycles and criteria',
    icon: Award,
    href: '/hris/settings/performance',
    category: 'hr',
  },
  
  // Compliance & Documents
  {
    title: 'Document Templates',
    description: 'Manage contract templates and document generation',
    icon: FileText,
    href: '/hris/settings/document-templates',
    category: 'compliance',
  },
  {
    title: 'Compliance Settings',
    description: 'Data retention policies and compliance requirements',
    icon: Shield,
    href: '/hris/settings/compliance',
    category: 'compliance',
  },
  
  // Access Control
  {
    title: 'Roles & Permissions',
    description: 'Configure roles and manage user access control',
    icon: Shield,
    href: '/hris/settings/roles',
    category: 'access',
  },
  {
    title: 'Bulk User Management',
    description: 'Manage multiple users and permissions at once',
    icon: UserCog,
    href: '/hris/settings/bulk-users',
    category: 'access',
  },
];

const categories: SettingsCategory[] = [
  { 
    id: 'organization', 
    label: 'Organization Structure', 
    description: 'Company structure, departments, and locations' 
  },
  { 
    id: 'hr', 
    label: 'HR Configuration', 
    description: 'Employee types, time-off, attendance, and benefits' 
  },
  { 
    id: 'compliance', 
    label: 'Compliance & Documents', 
    description: 'Document templates and compliance settings' 
  },
  { 
    id: 'access', 
    label: 'Access Control', 
    description: 'User roles and permissions management' 
  },
];

export default function HRISSettingsHub() {
  return (
    <SettingsHub
      title="HRIS Settings"
      description="Configure and customize Nexus HRIS to match your organization's HR needs"
      cards={settingsCards}
      categories={categories}
    />
  );
}
