import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
  description?: string;
  matchPaths?: string[]; // Additional paths that should be considered active
}

interface NavigationGroupProps {
  title?: string;
  icon?: LucideIcon;
  items: NavigationItem[];
  collapsible?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  onItemClick?: () => void;
}

export default function NavigationGroup({
  title,
  icon: GroupIcon,
  items,
  collapsible = false,
  isOpen = true,
  onToggle,
  onItemClick,
}: NavigationGroupProps) {
  const location = useLocation();

  // Check if any item in this group is active
  const hasActiveItem = items.some((item) => {
    const matchesHref = location.pathname.startsWith(item.href);
    const matchesAdditionalPaths = item.matchPaths?.some(path => 
      location.pathname.startsWith(path)
    );
    return matchesHref || matchesAdditionalPaths;
  });

  const toggleOpen = () => {
    if (collapsible && onToggle) {
      onToggle();
    }
  };

  return (
    <div className="space-y-1">
      {/* Group Header */}
      {title && (
        <button
          onClick={toggleOpen}
          className={clsx(
            'w-full flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
            collapsible
              ? 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
              : 'text-slate-500 dark:text-slate-500 cursor-default',
            hasActiveItem && 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          {GroupIcon && <GroupIcon className="w-4 h-4 mr-2" />}
          <span className="flex-1 text-left">{title}</span>
          {collapsible && (
            isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          )}
        </button>
      )}

      {/* Group Items */}
      <div
        className={clsx(
          'space-y-1 transition-all duration-200 ease-in-out overflow-hidden',
          collapsible && !isOpen && 'max-h-0 opacity-0',
          (!collapsible || isOpen) && 'max-h-screen opacity-100'
        )}
      >
        {items.map((item) => {
          const matchesHref = location.pathname.startsWith(item.href);
          const matchesAdditionalPaths = item.matchPaths?.some(path => 
            location.pathname.startsWith(path)
          );
          const isActive = matchesHref || matchesAdditionalPaths;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onItemClick}
              title={item.description}
              className={clsx(
                'group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                title && 'ml-2', // Indent if part of a group
                isActive
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              )}
            >
              <div className="flex items-center min-w-0 flex-1">
                <Icon
                  className={clsx(
                    'w-5 h-5 mr-3 flex-shrink-0 transition-transform group-hover:scale-110',
                    isActive && 'text-emerald-600 dark:text-emerald-400'
                  )}
                />
                <span className="truncate">{item.name}</span>
              </div>

              {/* Badge */}
              {item.badge !== undefined && (
                <span
                  className={clsx(
                    'ml-2 px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0',
                    isActive
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
