import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  FileKey, 
  BarChart3, 
  Settings,
  Shield,
  Layers
} from 'lucide-react'

export default function Sidebar() {
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/licenses/create', icon: FileKey, label: 'Create License' },
    { to: '/tiers', icon: Layers, label: 'Tier Management' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <Shield className="w-8 h-8 text-primary-600 mr-2" />
        <div>
          <h1 className="text-lg font-bold text-gray-900">License Manager</h1>
          <p className="text-xs text-gray-500">RecruitIQ Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>Version 1.0.0</p>
          <p className="mt-1">© 2025 RecruitIQ</p>
        </div>
      </div>
    </div>
  )
}
