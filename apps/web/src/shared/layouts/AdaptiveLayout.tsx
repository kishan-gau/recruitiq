import { useIsMobile } from '@/hooks/useMobile';

import { MainLayout } from './MainLayout';
import { MobileLayout } from './MobileLayout';

/**
 * Adaptive layout that switches between desktop and mobile layouts
 * based on screen size.
 * 
 * - Desktop (≥768px): Uses MainLayout with sidebar navigation
 * - Mobile (<768px): Uses MobileLayout with bottom navigation
 * 
 * This implements the mobile-first responsive design approach
 * described in the PWA proposal.
 */
export function AdaptiveLayout() {
  const isMobile = useIsMobile();

  // Return mobile layout for small screens
  if (isMobile) {
    return <MobileLayout />;
  }

  // Return desktop layout for larger screens
  return <MainLayout />;
}
