import { Link } from 'react-router-dom';
import { Shield, FileText, Key, Activity, AlertTriangle, Users } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    {
      name: 'Total Cloud Instances',
      value: '12',
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Active Tenants',
      value: '45',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Security Alerts (24h)',
      value: '3',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      name: 'Active Licenses',
      value: '42',
      icon: Key,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const quickLinks = [
    {
      name: 'Security Monitor',
      description: 'Real-time security events and alerts',
      icon: Shield,
      path: '/security',
      color: 'bg-red-500',
    },
    {
      name: 'System Logs',
      description: 'View logs from all instances',
      icon: FileText,
      path: '/logs',
      color: 'bg-green-500',
    },
    {
      name: 'License Manager',
      description: 'Manage customer licenses',
      icon: Key,
      path: '/licenses',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage all RecruitIQ cloud instances from one place
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="card hover:shadow-md transition-shadow group"
              >
                <div className={`${link.color} text-white p-4 rounded-lg mb-4 inline-block group-hover:scale-105 transition-transform`}>
                  <Icon size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {link.name}
                </h3>
                <p className="text-gray-600">{link.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="card">
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Brute force attack detected
                </p>
                <p className="text-xs text-gray-500">Tenant: customer-acme • 2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  New instance deployed
                </p>
                <p className="text-xs text-gray-500">Region: EU-West • 15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  License renewed
                </p>
                <p className="text-xs text-gray-500">Customer: TechCorp • 1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
