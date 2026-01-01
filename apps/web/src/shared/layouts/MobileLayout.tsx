import { 
  Home,
  Calendar,
  DollarSign,
  User,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@recruitiq/auth';

import ProfileMenu from '@shared/components/ProfileMenu';

/**
 * Bottom navigation items for mobile layout
 * Simplified navigation focused on employee self-service features
 */
const mobileNavigation = [
  { 
    name: 'Home', 
    path: '/', 
    icon: Home,
    description: 'Dashboard and quick actions'
  },
  { 
    name: 'Schedule', 
    path: '/scheduling', 
    icon: Calendar,
    description: 'View schedule and time off'
  },
  { 
    name: 'Pay', 
    path: '/payroll', 
    icon: DollarSign,
    description: 'Payslips and tax documents'
  },
  { 
    name: 'Profile', 
    path: '/hris', 
    icon: User,
    description: 'Personal info and settings'
  },
];

/**
 * Mobile-optimized layout with bottom navigation
 * Implements mobile-first design principles from the PWA proposal
 * 
 * Features:
 * - Bottom navigation bar (iOS/Android standard)
 * - Touch-optimized targets (60x60pt minimum)
 * - Safe area insets for notched devices
 * - Simplified navigation for employee workflows
 * - Full-screen content area
 */
export function MobileLayout() {
  const location = useLocation();
  const { isLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Header - Minimal for mobile */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-bold text-primary">RecruitIQ</h1>
          
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-accent rounded-md touch-manipulation"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Slide-out Menu */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed inset-y-0 right-0 w-64 bg-card border-l border-border z-50 shadow-xl">
            <div className="flex flex-col h-full">
              <div className="flex h-14 items-center justify-between px-4 border-b border-border">
                <h2 className="font-semibold">Menu</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 hover:bg-accent rounded-md touch-manipulation"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <ProfileMenu />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area - Scrollable with padding for bottom nav */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar - Fixed at bottom */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 safe-area-inset-bottom"
        style={{ 
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex justify-around items-center h-16">
          {mobileNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = 
              item.path === '/' 
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center gap-1 flex-1
                  min-h-[56px] touch-manipulation transition-colors
                  ${isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground active:text-foreground'
                  }
                `}
                aria-label={item.description}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
