import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Grid3x3, Shield, FileText, Server, Menu, Bell, LogOut } from 'lucide-react';
import AppSwitcher from './AppSwitcher';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: Grid3x3 },
  { name: 'Infrastructure', path: '/infrastructure', icon: Server },
  { name: 'Security', path: '/security', icon: Shield },
  { name: 'Logs', path: '/logs', icon: FileText },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                R
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">RecruitIQ Portal</h1>
                <p className="text-xs text-gray-500">Platform Administration</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <button
              onClick={() => setShowAppSwitcher(!showAppSwitcher)}
              className="p-2 rounded-lg hover:bg-gray-100"
              title="Apps"
            >
              <Grid3x3 size={20} />
            </button>

            <div className="ml-2 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ')}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* App Switcher */}
      <AppSwitcher
        isOpen={showAppSwitcher}
        onClose={() => setShowAppSwitcher(false)}
      />

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)]
            bg-white border-r border-gray-200 transition-all duration-300
            ${sidebarOpen ? 'w-64' : 'w-0 lg:w-16'}
            overflow-hidden z-20
          `}
        >
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                    ${active
                      ? 'bg-primary-50 text-primary-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon size={20} className={active ? 'text-primary-600' : 'text-gray-500'} />
                  <span className={`${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
