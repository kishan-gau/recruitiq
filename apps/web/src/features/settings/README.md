# Settings Feature

Unified settings system for all products in the RecruitIQ web app.

## Overview

The settings feature provides a consistent, centralized way to configure all products (PayLinQ, HRIS/Nexus, ScheduleHub, RecruitIQ). Each product has its own settings hub with categorized configuration options.

## Architecture

```
Shared Components (Reusable)
    ↓
Product Settings Hubs (Landing Pages)
    ↓
Individual Settings Pages (Specific Configuration)
```

## Directory Structure

```
features/settings/
├── components/              # Shared settings components
│   ├── SettingsHub.tsx     # Hub-style landing page
│   ├── SettingsHeader.tsx  # Standard page header
│   ├── SettingsSkeleton.tsx# Loading states
│   └── index.ts            # Exports
│
└── pages/
    └── UserSettingsPage.tsx # Personal user settings

features/payroll/pages/settings/
├── PayrollSettingsHub.tsx   # PayLinQ settings hub
├── GeneralSettings.tsx
├── EmailSettings.tsx
└── ...

features/hris/pages/settings/
├── HRISSettingsHub.tsx      # HRIS settings hub
├── RolesPermissions.tsx
└── ...

features/recruitment/pages/settings/
└── RecruitmentSettingsHub.tsx # Recruitment settings hub

features/scheduling/pages/
└── SettingsPage.tsx          # ScheduleHub settings
```

## Components

### SettingsHub

Reusable hub-style landing page with categorized setting cards.

**Props:**
```typescript
interface SettingsHubProps {
  title: string;
  description: string;
  cards: SettingCard[];
  categories: SettingsCategory[];
}
```

**Usage:**
```tsx
import { SettingsHub, SettingCard, SettingsCategory } from '@/features/settings/components';

const cards: SettingCard[] = [
  {
    title: 'General Settings',
    description: 'Configure general preferences',
    icon: Settings,
    href: '/product/settings/general',
    category: 'system',
  },
];

const categories: SettingsCategory[] = [
  {
    id: 'system',
    label: 'System Configuration',
    description: 'Core system settings',
  },
];

<SettingsHub
  title="Product Settings"
  description="Configure your product"
  cards={cards}
  categories={categories}
/>
```

### SettingsHeader

Standard header for settings pages with breadcrumbs and actions.

**Props:**
```typescript
interface SettingsHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  backTo?: string;
  actions?: React.ReactNode;
}
```

**Usage:**
```tsx
import { SettingsHeader } from '@/features/settings/components';

<SettingsHeader
  title="General Settings"
  description="Configure general preferences"
  breadcrumbs={[
    { label: 'Settings', href: '/product/settings' },
    { label: 'General' },
  ]}
  backTo="/product/settings"
  actions={<Button>Save Changes</Button>}
/>
```

### SettingsSkeleton

Loading skeleton for settings pages.

**Usage:**
```tsx
import { SettingsSkeleton } from '@/features/settings/components';

if (isLoading) {
  return <SettingsSkeleton />;
}
```

## Routes

### Product Settings

| Product | Hub Route | Description |
|---------|-----------|-------------|
| PayLinQ | `/payroll/settings` | Payroll configuration |
| HRIS | `/hris/settings` | HR management settings |
| Recruitment | `/recruitment/settings` | Recruitment settings |
| ScheduleHub | `/scheduling/settings` | Scheduling configuration |

### User Settings

| Route | Description |
|-------|-------------|
| `/settings` | Personal user settings |

## Adding a New Settings Hub

1. **Create the hub component:**

```tsx
// features/myproduct/pages/settings/MyProductSettingsHub.tsx
import { SettingsHub, SettingCard, SettingsCategory } from '@/features/settings/components';
import { Icon1, Icon2 } from 'lucide-react';

const cards: SettingCard[] = [
  {
    title: 'Setting Name',
    description: 'Setting description',
    icon: Icon1,
    href: '/myproduct/settings/page',
    category: 'category-id',
  },
];

const categories: SettingsCategory[] = [
  {
    id: 'category-id',
    label: 'Category Name',
    description: 'Category description',
  },
];

export default function MyProductSettingsHub() {
  return (
    <SettingsHub
      title="My Product Settings"
      description="Configure My Product"
      cards={cards}
      categories={categories}
    />
  );
}
```

2. **Add routes:**

```tsx
// core/routing/router.tsx
const MyProductSettingsHub = lazy(() => import('@features/myproduct/pages/settings/MyProductSettingsHub'));

// In routes:
<Route path="myproduct">
  <Route path="settings" element={<MyProductSettingsHub />} />
</Route>
```

3. **Create individual settings pages as needed**

## Adding a New Settings Page

1. **Create the page component:**

```tsx
// features/myproduct/pages/settings/MySettingsPage.tsx
import { SettingsHeader } from '@/features/settings/components';

export default function MySettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsHeader
        title="My Settings"
        description="Configure specific settings"
        breadcrumbs={[
          { label: 'Settings', href: '/myproduct/settings' },
          { label: 'My Settings' },
        ]}
        backTo="/myproduct/settings"
      />
      
      {/* Settings form content */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6">
        <form>
          {/* Form fields */}
        </form>
      </div>
    </div>
  );
}
```

2. **Add to settings hub:**

```tsx
const cards: SettingCard[] = [
  // ... existing cards
  {
    title: 'My Settings',
    description: 'Configure my settings',
    icon: MyIcon,
    href: '/myproduct/settings/my-settings',
    category: 'my-category',
  },
];
```

3. **Add route:**

```tsx
const MySettingsPage = lazy(() => import('@features/myproduct/pages/settings/MySettingsPage'));

<Route path="myproduct">
  <Route path="settings">
    <Route index element={<MyProductSettingsHub />} />
    <Route path="my-settings" element={<MySettingsPage />} />
  </Route>
</Route>
```

## Best Practices

### 1. Use Shared Components

Always use the shared settings components for consistency:
- `SettingsHub` for landing pages
- `SettingsHeader` for page headers
- `SettingsSkeleton` for loading states

### 2. Categorize Settings

Group related settings into categories:
```typescript
const categories = [
  { id: 'system', label: 'System Configuration', ... },
  { id: 'advanced', label: 'Advanced Settings', ... },
];
```

### 3. Use Icons

Include appropriate Lucide React icons for visual clarity:
```tsx
import { Settings, Users, Shield } from 'lucide-react';
```

### 4. Add "Coming Soon" Badges

For settings not yet implemented:
```tsx
{
  title: 'Future Feature',
  description: 'Coming soon',
  icon: Star,
  href: '/product/settings/future',
  category: 'advanced',
  badge: 'Soon',
}
```

### 5. Implement Breadcrumbs

Help users navigate with clear breadcrumbs:
```tsx
breadcrumbs={[
  { label: 'Settings', href: '/product/settings' },
  { label: 'Subsection', href: '/product/settings/sub' },
  { label: 'Current Page' },
]}
```

### 6. Provide Back Navigation

Include a back link to the settings hub:
```tsx
<SettingsHeader backTo="/product/settings" />
```

## Styling

### Color Scheme

Settings pages use the standard app color scheme:
- Background: `bg-white dark:bg-slate-800`
- Text: `text-slate-900 dark:text-white`
- Borders: `border-slate-200 dark:border-slate-700`

### Responsive Design

All settings pages are responsive:
- Mobile: Single column, stacked cards
- Tablet: 2 column grid
- Desktop: 3 column grid (hubs), 2 column (forms)

### Icons

Use Lucide React icons consistently:
```tsx
import { Settings, Users, Shield, Bell } from 'lucide-react';
```

## Testing

### Component Testing

Test settings components with React Testing Library:
```tsx
import { render, screen } from '@testing-library/react';
import { SettingsHub } from '@/features/settings/components';

test('renders settings hub', () => {
  render(<SettingsHub title="Test" ... />);
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

### Integration Testing

Test navigation and routing:
```tsx
test('navigates to settings page', async () => {
  const { user } = render(<App />);
  await user.click(screen.getByText('Settings'));
  expect(screen.getByText('Product Settings')).toBeInTheDocument();
});
```

## Migration from Legacy Apps

Settings from legacy apps (nexus, paylinq, portal, recruitiq) should be:
1. Copied to appropriate product folder in web app
2. Updated imports to use shared components
3. Added to routing configuration
4. Tested for functionality

See `UNIFIED_SETTINGS_IMPLEMENTATION_SUMMARY.md` for migration details.

## Related Documentation

- [Unified Settings Migration Plan](../../docs/UNIFIED_SETTINGS_MIGRATION_PLAN.md)
- [Implementation Summary](../../docs/UNIFIED_SETTINGS_IMPLEMENTATION_SUMMARY.md)
- [Component Migration Quickstart](../../docs/COMPONENT_MIGRATION_QUICKSTART.md)

## Support

For questions or issues with settings:
1. Review this README
2. Check implementation summary document
3. Examine existing settings hubs for patterns
4. Review shared components source code
