import React from 'react';

/**
 * Application source types
 */
export type ApplicationSource = 
  | 'public-portal' 
  | 'referral' 
  | 'linkedin' 
  | 'indeed' 
  | 'email' 
  | 'manual' 
  | 'api';

/**
 * Source configuration interface
 */
interface SourceConfig {
  label: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
}

/**
 * Props for ApplicationSourceBadge component
 */
export interface ApplicationSourceBadgeProps {
  source: ApplicationSource;
  className?: string;
}

/**
 * Inline SVG icon components
 */
const Icons = {
  Globe: () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Users: () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Briefcase: () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Search: () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Mail: () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Edit: () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Code: () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

/**
 * Source configurations with labels, descriptions, icons, and color classes
 */
const sourceConfigs: Record<ApplicationSource, SourceConfig> = {
  'public-portal': {
    label: 'Career Portal',
    description: 'Applied through public career portal',
    icon: <Icons.Globe />,
    colorClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  'referral': {
    label: 'Referral',
    description: 'Referred by employee or contact',
    icon: <Icons.Users />,
    colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  'linkedin': {
    label: 'LinkedIn',
    description: 'Sourced from LinkedIn',
    icon: <Icons.Briefcase />,
    colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  'indeed': {
    label: 'Indeed',
    description: 'Applied through Indeed',
    icon: <Icons.Search />,
    colorClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
  'email': {
    label: 'Email',
    description: 'Applied via email',
    icon: <Icons.Mail />,
    colorClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  },
  'manual': {
    label: 'Manual Entry',
    description: 'Manually entered by recruiter',
    icon: <Icons.Edit />,
    colorClass: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
  },
  'api': {
    label: 'API',
    description: 'Imported via API integration',
    icon: <Icons.Code />,
    colorClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  },
};

/**
 * ApplicationSourceBadge Component
 * 
 * Displays a color-coded badge indicating the source/channel through which
 * a job application was received. Each source has a unique icon and color theme.
 * 
 * @example
 * ```tsx
 * <ApplicationSourceBadge source="linkedin" />
 * <ApplicationSourceBadge source="referral" className="ml-2" />
 * ```
 */
export function ApplicationSourceBadge({ source, className = '' }: ApplicationSourceBadgeProps) {
  const config = sourceConfigs[source];

  if (!config) {
    console.warn(`Unknown application source: ${source}`);
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.colorClass} ${className}`}
      title={config.description}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
