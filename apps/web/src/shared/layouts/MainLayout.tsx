import { 
  Users, 
  Briefcase, 
  DollarSign, 
  Calendar,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@recruitiq/auth';

import ProfileMenu from '@shared/components/ProfileMenu';


const navigation = [
  { name: 'Recruitment', path: '/recruitment', icon: Briefcase },
  { name: 'HRIS', path: '/hris', icon: Users },
  { name: 'Payroll', path: '/payroll', icon: DollarSign },
  { name: 'Scheduling', path: '/scheduling', icon: Calendar },
];

export function MainLayout() {
  const location = useLocation();
  const { isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-transform duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 -translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <h1 className="text-xl font-bold text-primary">RecruitIQ</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-accent rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile in sidebar (mobile) - hidden on desktop */}
        <div className="border-t border-border p-4 lg:hidden">
          <ProfileMenu />
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'lg:pl-64' : 'pl-0'
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex h-16 items-center gap-4 px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-accent rounded-md"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex-1" />

            {/* User Profile Menu */}
            <ProfileMenu />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
