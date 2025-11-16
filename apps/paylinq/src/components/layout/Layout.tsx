import { Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Clock,
  Calendar,
  Receipt,
  CreditCard,
  Scale,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  UserCircle2,
  Wallet,
  FileBarChart,
  LogOut,
  Briefcase,
  CheckSquare,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import NavigationGroup, { NavigationItem } from './NavigationGroup';

// Main navigation structure with logical grouping
const dashboardItem: NavigationItem = {
  name: 'Dashboard',
  href: '/dashboard',
  icon: LayoutDashboard,
  description: 'Overview of payroll operations',
};

const peopleItems: NavigationItem[] = [
  {
    name: 'Workers',
    href: '/workers',
    icon: Users,
    description: 'Manage worker profiles and details',
  },
  {
    name: 'Scheduling',
    href: '/scheduling',
    icon: Calendar,
    description: 'Create and manage work schedules',
  },
];

const payrollItems: NavigationItem[] = [
  {
    name: 'Time & Attendance',
    href: '/time-entries',
    icon: Clock,
    description: 'Track time entries and attendance',
  },
  {
    name: 'Earnings & Deductions',
    href: '/pay-components',
    icon: DollarSign,
    description: 'Configure pay components',
    matchPaths: ['/pay-structures'], // Also highlight when viewing pay structures
  },
  {
    name: 'Payroll Runs',
    href: '/payroll',
    icon: CreditCard,
    description: 'Process and manage payroll',
    badge: 2, // Example: 2 draft payrolls
  },
  {
    name: 'Payslips',
    href: '/payslips',
    icon: Receipt,
    description: 'View and distribute payslips',
  },
];

const complianceItems: NavigationItem[] = [
  {
    name: 'Tax Rules',
    href: '/tax-rules',
    icon: FileText,
    description: 'Manage tax configuration',
  },
  {
    name: 'Reconciliation',
    href: '/reconciliation',
    icon: Scale,
    description: 'Balance and verify accounts',
  },
];

const approvalsItem: NavigationItem = {
  name: 'Approvals',
  href: '/approvals',
  icon: CheckSquare,
  description: 'Review approval requests',
  badge: 0, // Will be updated dynamically with pending count
};

const reportsItem: NavigationItem = {
  name: 'Reports',
  href: '/reports',
  icon: BarChart3,
  description: 'Analytics and reporting',
};

const settingsItem: NavigationItem = {
  name: 'Settings',
  href: '/settings',
  icon: Settings,
  description: 'System configuration and preferences',
};

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-sm',
          'transform transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-[72px] flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
              Paylinq
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
          {/* Dashboard - Top level */}
          <NavigationGroup
            items={[dashboardItem]}
            onItemClick={() => setSidebarOpen(false)}
          />

          <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

          {/* People Group */}
          <NavigationGroup
            title="People"
            icon={UserCircle2}
            items={peopleItems}
            collapsible
            isOpen={expandedGroup === 'people'}
            onToggle={() => setExpandedGroup(expandedGroup === 'people' ? null : 'people')}
            onItemClick={() => setSidebarOpen(false)}
          />

          {/* Payroll Operations Group */}
          <NavigationGroup
            title="Payroll Operations"
            icon={Wallet}
            items={payrollItems}
            collapsible
            isOpen={expandedGroup === 'payroll'}
            onToggle={() => setExpandedGroup(expandedGroup === 'payroll' ? null : 'payroll')}
            onItemClick={() => setSidebarOpen(false)}
          />

          {/* Compliance & Finance Group */}
          <NavigationGroup
            title="Compliance & Finance"
            icon={FileBarChart}
            items={complianceItems}
            collapsible
            isOpen={expandedGroup === 'compliance'}
            onToggle={() => setExpandedGroup(expandedGroup === 'compliance' ? null : 'compliance')}
            onItemClick={() => setSidebarOpen(false)}
          />

          <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

          {/* Approvals - Top level */}
          <NavigationGroup
            items={[approvalsItem]}
            onItemClick={() => setSidebarOpen(false)}
          />

          {/* Reports - Top level */}
          <NavigationGroup
            items={[reportsItem]}
            onItemClick={() => setSidebarOpen(false)}
          />

          {/* Settings - Top level */}
          <NavigationGroup
            items={[settingsItem]}
            onItemClick={() => setSidebarOpen(false)}
          />
        </nav>

        {/* Theme toggle */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-5 h-5 mr-3" />
                Dark Mode
              </>
            ) : (
              <>
                <Sun className="w-5 h-5 mr-3" />
                Light Mode
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-[72px] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 lg:flex-none" />

          {/* User info placeholder */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.productRoles?.paylinq || 'Payroll Administrator'}
              </p>
            </div>
            <div className="relative group">
              <button className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center hover:ring-2 hover:ring-emerald-500 hover:ring-offset-2 transition-all">
                <span className="text-white font-semibold text-sm">
                  {user?.firstName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </button>
              
              {/* Dropdown menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
