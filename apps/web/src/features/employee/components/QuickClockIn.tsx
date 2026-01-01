import { useState, useEffect } from 'react';
import { Clock, MapPin, Check } from 'lucide-react';

/**
 * Quick Clock-In/Out Widget
 * Mobile-optimized component for time tracking
 * 
 * Features:
 * - Large touch target (80px minimum)
 * - Location display
 * - Visual feedback on clock in/out
 * - Optimistic UI updates
 * 
 * From PWA Proposal Phase 2: Time & Attendance Module
 */
export default function QuickClockIn() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSuccess, setShowSuccess] = useState(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // TODO: Load actual clock-in status from API
  useEffect(() => {
    // This would fetch the current status from the backend
    // For now, we'll use a placeholder
  }, []);

  const handleClockAction = async () => {
    setIsLoading(true);
    
    try {
      // Get location if permitted (optional feature)
      let location = null;
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false,
            });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        } catch (err) {
          // Location permission denied or unavailable - that's OK
          console.log('Location not available:', err);
        }
      }

      // TODO: Send clock-in/out request to API
      // const response = await clockInOut(location);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Toggle state
      setIsClockedIn(!isClockedIn);
      
      // Show success feedback
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
    } catch (error) {
      console.error('Clock action failed:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      {/* Current Time Display */}
      <div className="text-center mb-4">
        <div className="text-3xl font-bold tabular-nums">
          {currentTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {currentTime.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Clock In/Out Button - Large Touch Target */}
      <button
        onClick={handleClockAction}
        disabled={isLoading}
        className={`
          w-full h-20 flex items-center justify-center gap-3 rounded-xl
          text-lg font-semibold transition-all duration-200
          touch-manipulation active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isClockedIn 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }
          ${showSuccess ? 'ring-4 ring-green-500/50' : ''}
        `}
        style={{ minHeight: '80px' }}
        aria-label={isClockedIn ? 'Clock Out' : 'Clock In'}
      >
        {showSuccess ? (
          <>
            <Check className="h-6 w-6" />
            Success!
          </>
        ) : (
          <>
            <Clock className="h-6 w-6" />
            {isLoading 
              ? 'Processing...' 
              : isClockedIn 
                ? 'Clock Out' 
                : 'Clock In'
            }
          </>
        )}
      </button>

      {/* Status & Location */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-muted-foreground">
            {isClockedIn ? 'Clocked In' : 'Not Clocked In'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Main Office</span>
        </div>
      </div>

      {/* Clock-in time if clocked in */}
      {isClockedIn && (
        <div className="mt-3 pt-3 border-t border-border text-sm text-center text-muted-foreground">
          Clocked in at 9:00 AM
        </div>
      )}
    </div>
  );
}
