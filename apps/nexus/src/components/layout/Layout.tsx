import { Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@recruitiq/auth';
import {
  LayoutDashboard,
  Users,
  FileText,
  Award,
  Calendar,
  Clock,
  Heart,
  Building2,
  MapPin,
  FolderOpen,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  CalendarClock,
  Target,
  UserCircle2,
  Briefcase,
  HeartPulse,
  LogOut,
  Shield,
  Crown,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import NavigationGroup, { NavigationItem } from './NavigationGroup';

// Main navigation structure with logical grouping
const dashboardItem: NavigationItem = {
  name: 'Dashboard',
  href: '/dashboard',
  icon: LayoutDashboard,
  description: 'Overview of HR operations',
};

const peopleItems: NavigationItem[] = [
  {
    name: 'Employees',
    href: '/employees',
    icon: Users,
    description: 'Manage employee profiles and details',
  },
  {
    name: 'VIP Employees',
    href: '/vip-employees',
    icon: Crown,
    description: 'Manage VIP employee status and restrictions',
  },
  {
    name: 'Departments',
    href: '/departments',
    icon: Building2,
    description: 'Organize by departments',
  },
  {
    name: 'Locations',
    href: '/locations',
    icon: MapPin,
    description: 'Manage office locations',
  },
];

const workforceItems: NavigationItem[] = [
  {
    name: 'Contracts',
    href: '/contracts',
    icon: FileText,
    description: 'Employment contracts',
  },
  {
    name: 'Attendance',
    href: '/attendance',
    icon: Clock,
    description: 'Track attendance records',
  },
  {
    name: 'Time Off',
    href: '/time-off/requests',
    icon: Calendar,
    description: 'Manage time off requests',
    badge: 3,
  },
];

const schedulingItems: NavigationItem[] = [
  {
    name: 'ScheduleHub',
    href: '/schedulehub',
    icon: CalendarClock,
    description: 'Work schedules and shifts',
  },
];

const performanceItems: NavigationItem[] = [
  {
    name: 'Reviews',
    href: '/performance/reviews',
    icon: Award,
    description: 'Performance reviews',
  },
  {
    name: 'Goals',
    href: '/performance/goals',
    icon: Target,
    description: 'Employee goals and objectives',
  },
];

const benefitsItems: NavigationItem[] = [
  {
    name: 'Plans',
    href: '/benefits/plans',
    icon: Heart,
    description: 'Employee benefits plans',
  },
];

const documentsItem: NavigationItem = {
  name: 'Documents',
  href: '/documents',
  icon: FolderOpen,
  description: 'Document management',
};

const reportsItem: NavigationItem = {
  name: 'Reports',
  href: '/reports',
  icon: BarChart3,
  description: 'Analytics and reporting',
};

const settingsItems: NavigationItem[] = [
  {
    name: 'General',
    href: '/settings',
    icon: Settings,
    description: 'General settings',
  },
  {
    name: 'Roles & Permissions',
    href: '/settings/roles-permissions',
    icon: Shield,
    description: 'Manage user roles and permissions',
  },
  {
    name: 'Bulk User Access',
    href: '/settings/bulk-user-access',
    icon: Users,
    description: 'Manage user access in bulk',
  },
];

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
              NX
            </div>
            <span className="text-xl font-semibold text-slate-900 dark:text-white">
              Nexus
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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

          {/* Workforce Group */}
          <NavigationGroup
            title="Workforce"
            icon={Briefcase}
            items={workforceItems}
            collapsible
            isOpen={expandedGroup === 'workforce'}
            onToggle={() => setExpandedGroup(expandedGroup === 'workforce' ? null : 'workforce')}
            onItemClick={() => setSidebarOpen(false)}
          />

          {/* Scheduling Group */}
          <NavigationGroup
            title="Scheduling"
            icon={CalendarClock}
            items={schedulingItems}
            collapsible
            isOpen={expandedGroup === 'scheduling'}
            onToggle={() => setExpandedGroup(expandedGroup === 'scheduling' ? null : 'scheduling')}
            onItemClick={() => setSidebarOpen(false)}
          />

          {/* Performance Group */}
          <NavigationGroup
            title="Performance"
            icon={Target}
            items={performanceItems}
            collapsible
            isOpen={expandedGroup === 'performance'}
            onToggle={() => setExpandedGroup(expandedGroup === 'performance' ? null : 'performance')}
            onItemClick={() => setSidebarOpen(false)}
          />

          {/* Benefits Group */}
          <NavigationGroup
            title="Benefits"
            icon={HeartPulse}
            items={benefitsItems}
            collapsible
            isOpen={expandedGroup === 'benefits'}
            onToggle={() => setExpandedGroup(expandedGroup === 'benefits' ? null : 'benefits')}
            onItemClick={() => setSidebarOpen(false)}
          />

          <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

          {/* Documents - Top level */}
          <NavigationGroup
            items={[documentsItem]}
            onItemClick={() => setSidebarOpen(false)}
          />

          {/* Reports - Top level */}
          <NavigationGroup
            items={[reportsItem]}
            onItemClick={() => setSidebarOpen(false)}
          />

          {/* Settings - Collapsible Group */}
          <NavigationGroup
            title="Settings"
            icon={Settings}
            items={settingsItems}
            collapsible
            isOpen={expandedGroup === 'settings'}
            onToggle={() => setExpandedGroup(expandedGroup === 'settings' ? null : 'settings')}
            onItemClick={() => setSidebarOpen(false)}
          />
        </nav>

        {/* Theme toggle */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
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
            className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 lg:flex-none" />

          {/* User info placeholder */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.productRoles?.nexus || 'HR Administrator'}
              </p>
            </div>
            <div className="relative group">
              <button className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-purple-500 rounded-full flex items-center justify-center hover:ring-2 hover:ring-emerald-500 hover:ring-offset-2 transition-all">
                <span className="text-white font-semibold text-sm">
                  {user?.firstName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </button>
              
              {/* Dropdown menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
