/**
 * App Layout Component
 * 
 * Main application layout with:
 * - Top navigation bar
 * - Collapsible sidebar
 * - Breadcrumbs
 * - Main content area
 * - User menu
 * - Organization switcher
 */

import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
} from 'lucide-react';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import { useAuth } from '@/hooks/useAuth';

interface AppLayoutProps {
  children?: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);

  // Get user data from auth context
  const currentUser = {
    name: user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    role: user?.productRoles?.paylinq || 'User',
    avatar: null,
  };

  // Get organization data from auth context
  const currentOrg = {
    id: user?.organizationId || '',
    name: user?.organizationName || 'Organization',
  };

  // For now, single organization (multi-org support can be added later)
  const organizations = [
    { id: currentOrg.id, name: currentOrg.name },
  ];

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close menus when clicking outside
  const closeMenus = () => {
    setUserMenuOpen(false);
    setOrgMenuOpen(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation bar */}
        <header className="bg-white border-b border-gray-200 z-10">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Left: Menu toggle + Logo */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>

              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PL</span>
                </div>
                <span className="text-xl font-semibold text-gray-900 hidden sm:block">
                  Paylinq
                </span>
              </Link>
            </div>

            {/* Right: Organization switcher + Notifications + User menu */}
            <div className="flex items-center space-x-3">
              {/* Organization switcher */}
              <div className="relative">
                <button
                  onClick={() => {
                    setOrgMenuOpen(!orgMenuOpen);
                    setUserMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="hidden md:block">{currentOrg.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* Organization dropdown */}
                {orgMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={closeMenus}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                      <div className="py-1">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Switch Organization
                        </div>
                        {organizations.map((org) => (
                          <button
                            key={org.id}
                            onClick={() => {
                              console.log('Switch to organization:', org.id);
                              setOrgMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm ${
                              org.id === currentOrg.id
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4" />
                              <span>{org.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Notifications */}
              <button
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 relative"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {/* Notification badge */}
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setOrgMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <ChevronDown className="h-4 w-4 hidden sm:block" />
                </button>

                {/* User dropdown */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={closeMenus}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                      <div className="py-1">
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-900">
                            {currentUser.name}
                          </p>
                          <p className="text-xs text-gray-500">{currentUser.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {currentUser.role}
                            </span>
                          </p>
                        </div>

                        {/* Menu items */}
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <User className="h-4 w-4" />
                          <span>Your Profile</span>
                        </Link>

                        <Link
                          to="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Settings</span>
                        </Link>

                        <div className="border-t border-gray-200"></div>

                        <button
                          onClick={async () => {
                            setUserMenuOpen(false);
                            await logout();
                            navigate('/login');
                          }}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
            <Breadcrumbs />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

