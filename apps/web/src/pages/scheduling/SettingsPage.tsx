import React from 'react';
import { Settings, Clock, Users, Calendar, Shield, FileText, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SettingsGroup {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  items: {
    name: string;
    description: string;
    href: string;
    icon: React.ElementType;
  }[];
}

const settingsGroups: SettingsGroup[] = [
  {
    title: 'Schedule Configuration',
    description: 'Configure scheduling rules and preferences',
    icon: Calendar,
    color: 'bg-blue-500',
    items: [
      {
        name: 'Working Hours',
        description: 'Set default working hours and shift patterns',
        href: '/scheduling/settings/hours',
        icon: Clock
      },
      {
        name: 'Holiday Calendar',
        description: 'Configure holidays and special dates',
        href: '/scheduling/settings/holidays',
        icon: Calendar
      },
      {
        name: 'Overtime Rules',
        description: 'Set overtime calculation rules',
        href: '/scheduling/settings/overtime',
        icon: AlertTriangle
      }
    ]
  },
  {
    title: 'Worker Management',
    description: 'Configure worker-related settings',
    icon: Users,
    color: 'bg-green-500',
    items: [
      {
        name: 'Availability Rules',
        description: 'Set worker availability constraints',
        href: '/scheduling/settings/availability',
        icon: Users
      },
      {
        name: 'Skill Requirements',
        description: 'Configure required skills for stations',
        href: '/scheduling/settings/skills',
        icon: Shield
      },
      {
        name: 'Notification Preferences',
        description: 'Configure worker notifications',
        href: '/scheduling/settings/notifications',
        icon: FileText
      }
    ]
  },
  {
    title: 'System Settings',
    description: 'General system configuration',
    icon: Settings,
    color: 'bg-purple-500',
    items: [
      {
        name: 'General Settings',
        description: 'General scheduling preferences',
        href: '/scheduling/settings/general',
        icon: Settings
      },
      {
        name: 'Data Export',
        description: 'Export scheduling data',
        href: '/scheduling/settings/export',
        icon: FileText
      },
      {
        name: 'Advanced Settings',
        description: 'Advanced configuration options',
        href: '/scheduling/settings/advanced',
        icon: Shield
      }
    ]
  }
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            ScheduleHub Settings
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Configure scheduling system preferences and rules
          </p>
        </div>
      </div>

      {/* Settings Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {settingsGroups.map((group) => {
          const IconComponent = group.icon;
          return (
            <div
              key={group.title}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Group Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${group.color} text-white mr-4`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {group.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {group.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Group Items */}
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center">
                        <ItemIcon className="h-5 w-5 text-slate-400 dark:text-slate-500 mr-3" />
                        <div>
                          <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                            {item.name}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/scheduling/settings/backup"
            className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <FileText className="h-8 w-8 text-blue-500 mb-2" />
            <h4 className="font-medium text-slate-900 dark:text-white">Backup Data</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Create backup of settings
            </p>
          </Link>

          <Link
            to="/scheduling/settings/reset"
            className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings className="h-8 w-8 text-red-500 mb-2" />
            <h4 className="font-medium text-slate-900 dark:text-white">Reset Settings</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Reset to default values
            </p>
          </Link>

          <Link
            to="/scheduling/settings/import"
            className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <FileText className="h-8 w-8 text-green-500 mb-2" />
            <h4 className="font-medium text-slate-900 dark:text-white">Import Settings</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Import configuration
            </p>
          </Link>

          <Link
            to="/scheduling/settings/help"
            className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Shield className="h-8 w-8 text-purple-500 mb-2" />
            <h4 className="font-medium text-slate-900 dark:text-white">Help & Support</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Get configuration help
            </p>
          </Link>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          System Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-600 dark:text-slate-400">Version:</span>
            <span className="ml-2 text-slate-900 dark:text-white font-medium">2.1.0</span>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Last Updated:</span>
            <span className="ml-2 text-slate-900 dark:text-white font-medium">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Environment:</span>
            <span className="ml-2 text-slate-900 dark:text-white font-medium">Production</span>
          </div>
        </div>
      </div>
    </div>
  );
}