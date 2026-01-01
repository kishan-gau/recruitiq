import { Calendar, Clock, DollarSign, User, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '@recruitiq/auth';

import QuickClockIn from '../components/QuickClockIn';

/**
 * Employee Home Page
 * Mobile-first dashboard for employee self-service features
 * 
 * Features:
 * - Quick clock-in/out widget
 * - Today's schedule preview
 * - Recent payslip preview
 * - Quick action shortcuts
 */
export default function EmployeeHome() {
  const { user } = useAuth();

  // Get first name from user
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Welcome Header */}
      <div className="bg-primary text-primary-foreground p-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">
            👋 Hi, {firstName}!
          </h1>
          <button 
            className="p-2 hover:bg-primary-foreground/10 rounded-full touch-manipulation"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6" />
          </button>
        </div>
        <p className="text-primary-foreground/80 text-sm">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Quick Clock-In Widget */}
        <QuickClockIn />

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          <QuickActionCard
            icon={Calendar}
            title="Schedule"
            description="View your shifts"
            to="/employee/schedule"
            color="bg-blue-500"
          />
          <QuickActionCard
            icon={DollarSign}
            title="Payslips"
            description="View pay history"
            to="/employee/pay"
            color="bg-green-500"
          />
          <QuickActionCard
            icon={Clock}
            title="Time Off"
            description="Request leave"
            to="/employee/time-off"
            color="bg-purple-500"
          />
          <QuickActionCard
            icon={User}
            title="Profile"
            description="Update info"
            to="/employee/profile"
            color="bg-orange-500"
          />
        </div>

        {/* Today's Schedule Preview */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today's Schedule
            </h2>
            <Link 
              to="/employee/schedule" 
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          
          {/* Schedule content would be loaded from API */}
          <div className="space-y-2">
            <SchedulePreviewPlaceholder />
          </div>
        </div>

        {/* Recent Payslip Preview */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Recent Payslip
            </h2>
            <Link 
              to="/employee/pay" 
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          
          {/* Payslip content would be loaded from API */}
          <div className="space-y-2">
            <PayslipPreviewPlaceholder />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Action Card Component
 * Large touch-friendly card for primary actions
 */
interface QuickActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  to: string;
  color: string;
}

function QuickActionCard({ icon: Icon, title, description, to, color }: QuickActionCardProps) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center p-6 bg-card rounded-xl border border-border
                 hover:border-primary hover:shadow-md transition-all
                 touch-manipulation active:scale-95"
      style={{ minHeight: '140px' }}
    >
      <div className={`${color} text-white p-3 rounded-full mb-3`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-center">{title}</h3>
      <p className="text-xs text-muted-foreground text-center mt-1">{description}</p>
    </Link>
  );
}

/**
 * Placeholder for schedule preview
 * Will be replaced with actual data from API
 */
function SchedulePreviewPlaceholder() {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <Clock className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="flex-1">
        <p className="font-medium">No shifts scheduled</p>
        <p className="text-sm text-muted-foreground">Enjoy your day off!</p>
      </div>
    </div>
  );
}

/**
 * Placeholder for payslip preview
 * Will be replaced with actual data from API
 */
function PayslipPreviewPlaceholder() {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
          <DollarSign className="h-6 w-6 text-green-600" />
        </div>
      </div>
      <div className="flex-1">
        <p className="font-medium">No recent payslips</p>
        <p className="text-sm text-muted-foreground">Check back after payday</p>
      </div>
    </div>
  );
}
