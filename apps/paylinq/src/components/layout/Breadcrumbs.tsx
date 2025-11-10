/**
 * Breadcrumbs Component
 * 
 * Auto-generates breadcrumbs from current route with:
 * - Clickable navigation links
 * - Current page highlighting
 * - Icon support
 * - Home link
 */

import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

const Breadcrumbs = () => {
  const location = useLocation();

  // Route to label mapping
  const routeLabels: Record<string, string> = {
    '/': 'Dashboard',
    '/payroll-runs': 'Payroll Runs',
    '/payroll-runs/new': 'Create Payroll Run',
    '/timesheets': 'Timesheets',
    '/timesheets/new': 'New Time Entry',
    '/compensation': 'Compensation Management',
    '/compensation/new': 'Add Compensation',
    '/reports': 'Reports Dashboard',
    '/settings': 'Settings',
    '/settings/pay-periods': 'Pay Period Configuration',
    '/settings/tax': 'Tax Settings',
    '/settings/preferences': 'System Preferences',
    '/profile': 'Your Profile',
  };

  // Generate breadcrumbs from current path
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname;

    // Home page - no breadcrumbs
    if (path === '/') {
      return [];
    }

    const breadcrumbs: BreadcrumbItem[] = [];
    const segments = path.split('/').filter(Boolean);
    let currentPath = '';

    for (const segment of segments) {
      currentPath += `/${segment}`;
      
      // Check if it's a dynamic ID (UUID or number)
      const isId = /^[0-9a-f-]+$|^\d+$/.test(segment);
      
      if (isId) {
        // For detail pages, use a generic "Details" label
        breadcrumbs.push({
          label: 'Details',
          href: currentPath,
        });
      } else {
        // Use mapped label or format segment
        const label = routeLabels[currentPath] || formatSegment(segment);
        breadcrumbs.push({
          label,
          href: currentPath,
        });
      }
    }

    return breadcrumbs;
  };

  // Format segment for display
  const formatSegment = (segment: string): string => {
    return segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't render if on home page
  if (breadcrumbs.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <Home className="h-4 w-4 text-gray-400" />
        <span className="text-gray-600 font-medium">Dashboard</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      {/* Home link */}
      <Link
        to="/"
        className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {/* Breadcrumb items */}
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={item.href} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            {isLast ? (
              <span className="text-gray-900 font-medium">{item.label}</span>
            ) : (
              <Link
                to={item.href}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
