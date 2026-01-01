import { useEffect, useRef, useState } from 'react';

/**
 * Pull-to-Refresh Hook
 * Implements native-like pull-to-refresh gesture for mobile
 * 
 * Features:
 * - Touch-based pull gesture
 * - Visual feedback during pull
 * - Customizable refresh callback
 * - Threshold-based triggering
 * 
 * From PWA Proposal Phase 3: Additional Polish
 */

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  enabled?: boolean;
}

interface PullState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  shouldRefresh: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [pullState, setPullState] = useState<PullState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    shouldRefresh: false,
  });

  const touchStartY = useRef<number>(0);
  const scrollElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const element = scrollElement.current || document.documentElement;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull if at top of page
      if (element.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Only pull if at top of page
      if (element.scrollTop !== 0) {
        return;
      }

      const touchY = e.touches[0].clientY;
      const pullDistance = Math.max(0, touchY - touchStartY.current);

      if (pullDistance > 0) {
        // Prevent default scrolling
        e.preventDefault();

        // Apply diminishing returns to pull distance
        const dampenedDistance = Math.min(
          pullDistance * 0.6,
          threshold * 1.5
        );

        setPullState({
          isPulling: true,
          pullDistance: dampenedDistance,
          isRefreshing: false,
          shouldRefresh: dampenedDistance >= threshold,
        });
      }
    };

    const handleTouchEnd = async () => {
      if (pullState.isPulling && pullState.shouldRefresh) {
        setPullState({
          isPulling: false,
          pullDistance: threshold,
          isRefreshing: true,
          shouldRefresh: false,
        });

        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setPullState({
            isPulling: false,
            pullDistance: 0,
            isRefreshing: false,
            shouldRefresh: false,
          });
        }
      } else {
        setPullState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
          shouldRefresh: false,
        });
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onRefresh, pullState.isPulling, pullState.shouldRefresh, threshold]);

  return {
    ...pullState,
    setScrollElement: (el: HTMLElement | null) => {
      scrollElement.current = el;
    },
  };
}

/**
 * Pull-to-Refresh Indicator Component
 */
interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  shouldRefresh: boolean;
  threshold: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  shouldRefresh,
  threshold,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center justify-center z-40 transition-transform"
      style={{
        transform: `translateY(${Math.min(pullDistance, threshold) - threshold}px)`,
        opacity: pullDistance > 0 ? 1 : 0,
      }}
    >
      <div className="bg-background border border-border rounded-full p-3 shadow-lg">
        {isRefreshing ? (
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-colors ${shouldRefresh ? 'text-primary' : 'text-muted-foreground'}`}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        )}
      </div>
    </div>
  );
}
