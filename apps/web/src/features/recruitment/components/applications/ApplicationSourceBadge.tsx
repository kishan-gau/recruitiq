
import { Icon } from './icons';

export default function ApplicationSourceBadge({ source }) {
  // Default to 'manual' if no source specified
  const applicationSource = source || 'manual';

  const sourceConfig = {
    'public-portal': {
      label: 'Career Portal',
      icon: 'globe',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      borderColor: 'border-emerald-300 dark:border-emerald-700',
      description: 'Applied via public career portal'
    },
    'referral': {
      label: 'Referral',
      icon: 'users',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-700 dark:text-blue-400',
      borderColor: 'border-blue-300 dark:border-blue-700',
      description: 'Referred by employee or contact'
    },
    'linkedin': {
      label: 'LinkedIn',
      icon: 'briefcase',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      textColor: 'text-purple-700 dark:text-purple-400',
      borderColor: 'border-purple-300 dark:border-purple-700',
      description: 'Applied via LinkedIn'
    },
    'indeed': {
      label: 'Indeed',
      icon: 'search',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      textColor: 'text-orange-700 dark:text-orange-400',
      borderColor: 'border-orange-300 dark:border-orange-700',
      description: 'Applied via Indeed'
    },
    'email': {
      label: 'Email',
      icon: 'mail',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
      textColor: 'text-cyan-700 dark:text-cyan-400',
      borderColor: 'border-cyan-300 dark:border-cyan-700',
      description: 'Applied via email'
    },
    'manual': {
      label: 'Manual Entry',
      icon: 'edit',
      bgColor: 'bg-slate-100 dark:bg-slate-900/30',
      textColor: 'text-slate-700 dark:text-slate-400',
      borderColor: 'border-slate-300 dark:border-slate-700',
      description: 'Manually added by recruiter'
    },
    'api': {
      label: 'API',
      icon: 'code',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      textColor: 'text-indigo-700 dark:text-indigo-400',
      borderColor: 'border-indigo-300 dark:border-indigo-700',
      description: 'Submitted via API integration'
    }
  };

  const config = sourceConfig[applicationSource] || sourceConfig['manual'];

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
      title={config.description}
    >
      <Icon name={config.icon} className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
}
