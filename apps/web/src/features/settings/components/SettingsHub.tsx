/**
 * Settings Hub Component
 * Reusable hub-style settings landing page with categorized cards
 */

import type { LucideIcon} from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface SettingCard {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
  category: string;
  key?: string; // React key prop for list rendering
}

export interface SettingsCategory {
  id: string;
  label: string;
  description: string;
}

interface SettingsHubProps {
  title: string;
  description: string;
  cards: SettingCard[];
  categories: SettingsCategory[];
}

export function SettingsHub({ title, description, cards, categories }: SettingsHubProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
      </div>

      {/* Settings by Category */}
      {categories.map((category) => {
        const categoryCards = cards.filter((card) => card.category === category.id);
        
        if (categoryCards.length === 0) return null;

        return (
          <div key={category.id} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {category.label}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {category.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryCards.map((card) => (
                <SettingCardComponent key={card.title} {...card} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SettingCardComponent({ title, description, icon: Icon, href, badge }: SettingCard) {
  return (
    <Link
      to={href}
      className="block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        {badge && (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
            {badge}
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-between">
        {title}
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </h3>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </Link>
  );
}
