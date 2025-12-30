import { Settings, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@recruitiq/auth';

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.email || 'User';
  
  const initials = user?.firstName 
    ? user.firstName.charAt(0).toUpperCase() 
    : user?.email?.charAt(0).toUpperCase() || 'U';

  const handleSettingsClick = () => {
    setIsOpen(false);
    navigate('/settings');
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    if (logout) {
      logout();
    }
  };

  return (
    <div className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-accent rounded-lg transition-colors p-2"
      >
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground">
            {user?.productRoles?.nexus || user?.productRoles?.paylinq || user?.productRoles?.recruitiq || user?.role || 'User'}
          </p>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {initials}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-background rounded-lg shadow-lg border border-border py-1 z-20">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || ''}
              </p>
            </div>
            
            <button
              onClick={handleSettingsClick}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
            
            <div className="border-t border-border my-1" />
            
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
