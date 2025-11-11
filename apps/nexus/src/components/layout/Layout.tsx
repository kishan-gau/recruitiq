import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
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
  ChevronDown,
  ChevronRight,
  Target,
  LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

// Types
type NavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

type NavigationSection = {
  id: string;
  label?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  items: NavigationItem[];
};

// Navigation structure with grouped sections
const navigationSections: NavigationSection[] = [
  {
    id: 'dashboard',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'people',
    label: 'PEOPLE',
    collapsible: true,
    defaultOpen: true,
    items: [
      { name: 'Employees', href: '/employees', icon: Users },
      { name: 'Departments', href: '/departments', icon: Building2 },
      { name: 'Locations', href: '/locations', icon: MapPin },
    ],
  },
  {
    id: 'workforce',
    label: 'WORKFORCE',
    collapsible: true,
    defaultOpen: true,
    items: [
      { name: 'Contracts', href: '/contracts', icon: FileText },
      { name: 'Attendance', href: '/attendance', icon: Clock },
      { name: 'Time Off', href: '/time-off/requests', icon: Calendar, badge: 3 },
    ],
  },
  {
    id: 'scheduling',
    label: 'SCHEDULING',
    collapsible: true,
    defaultOpen: true,
    items: [
      { name: 'ScheduleHub', href: '/schedulehub', icon: CalendarClock },
    ],
  },
  {
    id: 'performance',
    label: 'PERFORMANCE',
    collapsible: true,
    defaultOpen: true,
    items: [
      { name: 'Reviews', href: '/performance/reviews', icon: Award },
      { name: 'Goals', href: '/performance/goals', icon: Target },
    ],
  },
  {
    id: 'benefits',
    label: 'BENEFITS',
    collapsible: true,
    defaultOpen: true,
    items: [
      { name: 'Plans', href: '/benefits/plans', icon: Heart },
    ],
  },
  {
    id: 'documents',
    items: [
      { name: 'Documents', href: '/documents', icon: FolderOpen },
    ],
  },
  {
    id: 'bottom',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export default function Layout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Track which sections are collapsed
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navigationSections.forEach(section => {
      if (section.collapsible) {
        initial[section.id] = !section.defaultOpen;
      }
    });
    return initial;
  });

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
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
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigationSections.map((section, sectionIndex) => {
            const isCollapsed = section.collapsible && collapsedSections[section.id];

            return (
              <div key={section.id}>
                {/* Section divider */}
                {sectionIndex > 0 && section.label && (
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-4" />
                )}
                
                {/* Section label with collapse toggle */}
                {section.label && (
                  <button
                    onClick={() => section.collapsible && toggleSection(section.id)}
                    className={clsx(
                      'w-full flex items-center justify-between px-3 py-2 mb-1',
                      'text-xs font-semibold tracking-wider',
                      section.collapsible
                        ? 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 cursor-pointer'
                        : 'text-slate-500 dark:text-slate-400 cursor-default'
                    )}
                  >
                    <span>{section.label}</span>
                    {section.collapsible && (
                      <>
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </>
                    )}
                  </button>
                )}

                {/* Section items */}
                {!isCollapsed && (
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = location.pathname.startsWith(item.href);
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={clsx(
                            'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                          )}
                        >
                          <div className="flex items-center">
                            <Icon className="w-5 h-5 mr-3" />
                            {item.name}
                          </div>
                          {item.badge && item.badge > 0 && (
                            <span className={clsx(
                              'px-2 py-0.5 text-xs font-semibold rounded-full',
                              isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Bottom section divider */}
                {section.label && sectionIndex < navigationSections.length - 1 && (
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-4" />
                )}
              </div>
            );
          })}
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
                HR Admin
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Human Resources
              </p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">HA</span>
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
