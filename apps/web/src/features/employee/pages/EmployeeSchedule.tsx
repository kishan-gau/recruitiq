import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';

/**
 * Employee Schedule Page
 * Mobile-optimized schedule viewer for employees
 * 
 * Features:
 * - Weekly schedule view
 * - Swipeable day cards
 * - Shift details
 * - Time-off request link
 * 
 * From PWA Proposal Phase 2: Time & Attendance Module
 */
export default function EmployeeSchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get week days starting from selectedDate
  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'prev' ? -7 : 7));
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Schedule
          </h1>
          <button 
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-1 text-sm bg-primary-foreground/20 hover:bg-primary-foreground/30 
                       rounded-lg touch-manipulation"
          >
            Today
          </button>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-primary-foreground/10 rounded-lg touch-manipulation"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="text-center">
            <p className="text-sm opacity-90">
              {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' - '}
              {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-primary-foreground/10 rounded-lg touch-manipulation"
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Day Selector Pills */}
      <div className="sticky top-[88px] bg-background border-b border-border px-4 py-3 z-10">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {weekDays.map((day, index) => {
            const isToday = day.getTime() === today.getTime();
            const isSelected = day.getDate() === selectedDate.getDate();
            
            return (
              <button
                key={index}
                onClick={() => setSelectedDate(day)}
                className={`
                  flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 rounded-lg
                  min-w-[60px] touch-manipulation transition-all
                  ${isSelected 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : isToday 
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-muted hover:bg-muted/80'
                  }
                `}
              >
                <span className="text-xs font-medium">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-lg font-bold">
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule Content */}
      <div className="p-4 space-y-4">
        {/* Selected Date Header */}
        <div>
          <h2 className="text-lg font-semibold mb-1">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
          <p className="text-sm text-muted-foreground">
            Your scheduled shifts for this day
          </p>
        </div>

        {/* Shift Cards */}
        <div className="space-y-3">
          {/* TODO: Replace with actual shifts from API */}
          <ShiftCard
            startTime="9:00 AM"
            endTime="5:00 PM"
            duration="8 hours"
            location="Main Office"
            role="Customer Service"
            status="scheduled"
          />
          
          {/* Empty state if no shifts */}
          {/* <EmptyScheduleState date={selectedDate} /> */}
        </div>

        {/* Quick Actions */}
        <div className="pt-4 space-y-2">
          <ActionButton
            label="Request Time Off"
            onClick={() => {/* Navigate to time off request */}}
            variant="primary"
          />
          <ActionButton
            label="View Full Calendar"
            onClick={() => {/* Navigate to calendar view */}}
            variant="secondary"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Shift Card Component
 * Displays shift details in a mobile-friendly format
 */
interface ShiftCardProps {
  startTime: string;
  endTime: string;
  duration: string;
  location: string;
  role: string;
  status: 'scheduled' | 'completed' | 'missed';
}

function ShiftCard({ startTime, endTime, duration, location, role, status }: ShiftCardProps) {
  const statusColors = {
    scheduled: 'bg-blue-500/10 text-blue-700 border-blue-200',
    completed: 'bg-green-500/10 text-green-700 border-green-200',
    missed: 'bg-red-500/10 text-red-700 border-red-200',
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      {/* Time & Duration */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-primary" />
            {startTime} - {endTime}
          </div>
          <p className="text-sm text-muted-foreground ml-7">{duration}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Location & Role */}
      <div className="space-y-2 ml-7">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Role:</span>
          <span className="font-medium">{role}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state when no shifts scheduled
 */
function EmptyScheduleState({ date }: { date: Date }) {
  const isToday = date.toDateString() === new Date().toDateString();
  
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No shifts scheduled</h3>
      <p className="text-muted-foreground mb-6">
        {isToday ? "Enjoy your day off!" : "You have no shifts on this day"}
      </p>
    </div>
  );
}

/**
 * Action Button Component
 */
interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary';
}

function ActionButton({ label, onClick, variant }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full py-3 rounded-lg font-medium touch-manipulation
        transition-all active:scale-95
        ${variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
        }
      `}
    >
      {label}
    </button>
  );
}
