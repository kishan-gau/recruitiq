import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Grid3x3, Shield, FileText, Server, Menu, Bell, LogOut, FileKey, ChevronDown, ChevronRight, Users, Plus, BarChart3, Layers, Settings, Key, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: Grid3x3 },
  { 
    name: 'License Manager', 
    path: '/licenses', 
    icon: FileKey,
    children: [
      { name: 'Dashboard', path: '/licenses', icon: Grid3x3 },
      { name: 'Customers', path: '/licenses/customers', icon: Users },
      { name: 'Create License', path: '/licenses/create', icon: Plus },
      { name: 'Analytics', path: '/licenses/analytics', icon: BarChart3 },
      { name: 'Tiers', path: '/licenses/tiers', icon: Layers },
      { name: 'Settings', path: '/licenses/settings', icon: Settings },
    ]
  },
  { name: 'Infrastructure', path: '/infrastructure', icon: Server },
  { 
    name: 'Access Control',
    path: '/users',
    icon: Shield,
    children: [
      { name: 'Users', path: '/users', icon: Users },
      { name: 'Roles', path: '/roles', icon: Shield },
      { name: 'Permissions', path: '/permissions', icon: Key },
    ]
  },
  { name: 'Security', path: '/security', icon: Shield },
  { name: 'Logs', path: '/logs', icon: FileText },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, mfaWarning, dismissMfaWarning } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState({});

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || (path !== '/licenses' && location.pathname.startsWith(path));
  };

  const isParentActive = (item) => {
    if (item.children) {
      return item.children.some(child => location.pathname === child.path || location.pathname.startsWith(child.path + '/'));
    }
    return false;
  };

  const toggleMenu = (itemName) => {
    setExpandedMenus(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
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

      {/* MFA Warning Banner */}
      {mfaWarning && (
        <div className="fixed top-16 left-0 right-0 bg-amber-500 text-white px-4 py-3 shadow-md z-20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {mfaWarning.message}
                </p>
                <Link 
                  to="/settings" 
                  className="text-xs text-amber-100 hover:text-white underline mt-1 inline-block"
                >
                  Enable MFA now in Settings →
                </Link>
              </div>
            </div>
            <button 
              onClick={dismissMfaWarning}
              className="text-amber-200 hover:text-white p-1 flex-shrink-0"
              aria-label="Dismiss warning"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className={`flex ${mfaWarning ? 'pt-28' : 'pt-16'}`}>
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
              const parentActive = isParentActive(item);
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus[item.name] || parentActive;
              
              return (
                <div key={item.path}>
                  {/* Parent Menu Item */}
                  {hasChildren ? (
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`
                        w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors
                        ${parentActive
                          ? 'bg-primary-50 text-primary-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={20} className={parentActive ? 'text-primary-600' : 'text-gray-500'} />
                        <span className={`${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
                          {item.name}
                        </span>
                      </div>
                      {sidebarOpen && (
                        isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                      )}
                    </button>
                  ) : (
                    <Link
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
                  )}
                  
                  {/* Child Menu Items */}
                  {hasChildren && isExpanded && sidebarOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isActive(child.path);
                        
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`
                              flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm
                              ${childActive
                                ? 'bg-primary-50 text-primary-600 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                              }
                            `}
                          >
                            <ChildIcon size={16} className={childActive ? 'text-primary-600' : 'text-gray-400'} />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
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
