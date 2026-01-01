/**
 * Performance Monitoring Service
 * Tracks Core Web Vitals and custom performance metrics
 * 
 * Features:
 * - Core Web Vitals monitoring (LCP, FID, CLS)
 * - Custom performance marks
 * - Performance reporting
 * - Bundle size tracking
 * 
 * From PWA Proposal Phase 3: Performance Optimization
 */

import { onCLS, onFCP, onFID, onLCP, onTTFB, type Metric } from 'web-vitals';

/**
 * Performance thresholds (from Google)
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },    // Largest Contentful Paint
  FID: { good: 100, poor: 300 },      // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },     // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },    // First Contentful Paint
  TTFB: { good: 800, poor: 1800 },    // Time to First Byte
};

/**
 * Get rating for a metric
 */
function getRating(
  value: number,
  thresholds: { good: number; poor: number }
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Format metric value for display
 */
function formatMetricValue(metric: Metric): string {
  const value = metric.value;
  
  // CLS is unitless
  if (metric.name === 'CLS') {
    return value.toFixed(3);
  }
  
  // Others are in milliseconds
  return `${Math.round(value)}ms`;
}

/**
 * Send metric to analytics
 */
function sendToAnalytics(metric: Metric) {
  const rating = getRating(
    metric.value,
    THRESHOLDS[metric.name as keyof typeof THRESHOLDS]
  );

  console.log(`[Web Vitals] ${metric.name}:`, {
    value: formatMetricValue(metric),
    rating,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  // TODO: Send to actual analytics service (e.g., Google Analytics, Sentry)
  // Example:
  // gtag('event', metric.name, {
  //   value: Math.round(metric.value),
  //   metric_id: metric.id,
  //   metric_rating: rating,
  // });
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals(): void {
  // Only run in browser
  if (typeof window === 'undefined') return;

  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

/**
 * Custom performance marks for feature timing
 */
export const performanceMark = {
  /**
   * Mark the start of an operation
   */
  start(name: string): void {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  },

  /**
   * Mark the end of an operation and measure duration
   */
  end(name: string): number | null {
    if ('performance' in window && 'mark' in performance && 'measure' in performance) {
      try {
        performance.mark(`${name}-end`);
        const measure = performance.measure(
          name,
          `${name}-start`,
          `${name}-end`
        );
        
        console.log(`[Performance] ${name}:`, `${Math.round(measure.duration)}ms`);
        
        // Clean up marks
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
        
        return measure.duration;
      } catch (error) {
        console.error('Performance measurement failed:', error);
        return null;
      }
    }
    return null;
  },
};

/**
 * Get resource timing information
 */
export function getResourceTimings(): PerformanceResourceTiming[] {
  if ('performance' in window && 'getEntriesByType' in performance) {
    return performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  }
  return [];
}

/**
 * Get bundle size information
 */
export function getBundleSize(): {
  total: number;
  scripts: number;
  styles: number;
  images: number;
} {
  const resources = getResourceTimings();
  
  const sizes = {
    total: 0,
    scripts: 0,
    styles: 0,
    images: 0,
  };

  resources.forEach((resource) => {
    const size = resource.encodedBodySize || resource.transferSize || 0;
    sizes.total += size;

    if (resource.name.endsWith('.js')) {
      sizes.scripts += size;
    } else if (resource.name.endsWith('.css')) {
      sizes.styles += size;
    } else if (resource.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
      sizes.images += size;
    }
  });

  return sizes;
}

/**
 * Log bundle size information
 */
export function logBundleSize(): void {
  const sizes = getBundleSize();
  
  console.group('[Bundle Size]');
  console.log('Total:', `${(sizes.total / 1024).toFixed(2)} KB`);
  console.log('Scripts:', `${(sizes.scripts / 1024).toFixed(2)} KB`);
  console.log('Styles:', `${(sizes.styles / 1024).toFixed(2)} KB`);
  console.log('Images:', `${(sizes.images / 1024).toFixed(2)} KB`);
  console.groupEnd();
}

/**
 * Memory usage information (if available)
 */
export function getMemoryInfo(): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} | null {
  // @ts-ignore - performance.memory is non-standard
  if ('performance' in window && 'memory' in performance) {
    // @ts-ignore
    const memory = performance.memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }
  return null;
}

/**
 * Get navigation timing
 */
export function getNavigationTiming(): PerformanceNavigationTiming | null {
  if ('performance' in window && 'getEntriesByType' in performance) {
    const entries = performance.getEntriesByType('navigation');
    return entries[0] as PerformanceNavigationTiming || null;
  }
  return null;
}

/**
 * Calculate page load time
 */
export function getPageLoadTime(): number | null {
  const navTiming = getNavigationTiming();
  if (navTiming) {
    return navTiming.loadEventEnd - navTiming.fetchStart;
  }
  return null;
}

/**
 * Performance report for debugging
 */
export function getPerformanceReport(): {
  pageLoad: number | null;
  bundleSize: ReturnType<typeof getBundleSize>;
  memory: ReturnType<typeof getMemoryInfo>;
  resourceCount: number;
} {
  return {
    pageLoad: getPageLoadTime(),
    bundleSize: getBundleSize(),
    memory: getMemoryInfo(),
    resourceCount: getResourceTimings().length,
  };
}
