import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Grid3x3, Shield, FileText, Key, BarChart3, X } from 'lucide-react';

const apps = [
  {
    id: 'portal',
    name: 'Portal Home',
    icon: Grid3x3,
    description: 'Platform overview',
    path: '/dashboard',
    color: 'bg-blue-500',
  },
  {
    id: 'security',
    name: 'Security Monitor',
    icon: Shield,
    description: 'Real-time security monitoring',
    path: '/security',
    color: 'bg-red-500',
  },
  {
    id: 'logs',
    name: 'Log Viewer',
    icon: FileText,
    description: 'System and security logs',
    path: '/logs',
    color: 'bg-green-500',
  },
  {
    id: 'licenses',
    name: 'License Manager',
    icon: Key,
    description: 'Manage customer licenses',
    href: import.meta.env.VITE_LICENSE_MANAGER_URL || 'http://localhost:5175',
    color: 'bg-purple-500',
    external: true,
  },
  {
    id: 'recruitiq',
    name: 'RecruitIQ',
    icon: BarChart3,
    description: 'Main application',
    href: import.meta.env.VITE_RECRUITIQ_URL || 'http://localhost:5173',
    color: 'bg-indigo-500',
    external: true,
  },
];

export default function AppSwitcher({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* App Switcher Panel */}
      <div className="fixed top-16 right-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Apps</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Apps Grid */}
        <div className="p-4 grid grid-cols-2 gap-3">
          {apps.map((app) => {
            const Icon = app.icon;
            
            if (app.external) {
              return (
                <a
                  key={app.id}
                  href={app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                  onClick={onClose}
                >
                  <div className={`${app.color} text-white p-3 rounded-lg mb-2 group-hover:scale-105 transition-transform`}>
                    <Icon size={24} />
                  </div>
                  <span className="text-sm font-medium text-gray-900 text-center">{app.name}</span>
                  <span className="text-xs text-gray-500 text-center mt-1">{app.description}</span>
                </a>
              );
            }

            return (
              <Link
                key={app.id}
                to={app.path}
                className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                onClick={onClose}
              >
                <div className={`${app.color} text-white p-3 rounded-lg mb-2 group-hover:scale-105 transition-transform`}>
                  <Icon size={24} />
                </div>
                <span className="text-sm font-medium text-gray-900 text-center">{app.name}</span>
                <span className="text-xs text-gray-500 text-center mt-1">{app.description}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
