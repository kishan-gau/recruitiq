# Paylinq Core Components - Task 7 Complete ✅

## Overview

All 14 core UI components have been successfully built for the Paylinq app. These components are designed specifically for Surinamese payroll management, featuring SRD currency formatting, local context, and dark mode support.

## Component List

### 1. Basic UI Components

#### StatusBadge.tsx
- **Purpose**: Display status indicators with color coding
- **Props**: `status`, `size`, `className`
- **Statuses Supported**: 15+ statuses (active, inactive, pending, approved, rejected, draft, ready, processing, completed, etc.)
- **Used In**: Workers List, Payroll Runs, Time Entries
- **Features**: Dynamic color mapping via helper function, responsive sizing

#### Badge.tsx
- **Purpose**: Generic label/tag component
- **Props**: `children`, `variant`, `size`, `className`
- **Variants**: default, blue, green, yellow, red, purple, gray
- **Used In**: Worker types, labels, tags throughout the app
- **Features**: 7 color variants, dark mode support

#### WorkerAvatar.tsx
- **Purpose**: Display worker initials in circular avatar
- **Props**: `fullName`, `size`, `className`
- **Sizes**: sm (8px), md (10px), lg (12px), xl (16px)
- **Used In**: Workers List, Worker Details, Dashboard activity feed
- **Features**: Auto-generates initials, blue gradient background

#### CurrencyDisplay.tsx
- **Purpose**: Format and display SRD/USD amounts
- **Props**: `amount`, `currency`, `variant`, `showSymbol`, `className`
- **Currencies**: SRD (primary), USD (secondary)
- **Variants**: default (gray), positive (green), negative (red)
- **Used In**: All financial displays (dashboard, compensation, payroll runs, YTD)
- **Features**: Tabular-nums for alignment, color coding, proper SRD formatting

### 2. Navigation Components

#### Pagination.tsx
- **Purpose**: Page navigation for lists
- **Props**: `currentPage`, `totalPages`, `onPageChange`, `className`
- **Used In**: Workers List, Time Entries, Reports
- **Features**: Smart page number display (shows ellipsis), previous/next buttons, disabled states

#### Tabs.tsx
- **Purpose**: Tab navigation within pages
- **Props**: `tabs`, `activeTab`, `onChange`, `className`
- **Used In**: Worker Details, Time Entries, Reports
- **Features**: Icon support, count badges, underline indicator, keyboard navigation

#### DropdownMenu.tsx
- **Purpose**: Actions dropdown (3-dot menu)
- **Props**: `items`, `onSelect`, `className`, `trigger`
- **Used In**: Table rows, action menus throughout app
- **Features**: Portal rendering, click outside to close, keyboard navigation (Escape), danger variant

### 3. Dashboard Components

#### DashboardSummaryCard.tsx
- **Purpose**: Display key metrics with icons and trends
- **Props**: `title`, `value`, `icon`, `trend`, `variant`, `className`
- **Variants**: blue, green, yellow, purple (gradient backgrounds)
- **Used In**: Dashboard (4 metric cards)
- **Features**: Trend indicators with up/down arrows, gradient icon backgrounds

#### PayrollTimeline.tsx
- **Purpose**: Horizontal timeline visualization of payroll runs
- **Props**: `runs`, `onSelect`, `className`
- **Run States**: completed (green check), current (blue pulse), upcoming (gray outline)
- **Used In**: Dashboard
- **Features**: Visual timeline with connecting line, date ranges, animated pulse for current period

### 4. Data Display Components

#### WorkerTable.tsx (Complex Component)
- **Purpose**: Advanced data table for workers with full CRUD actions
- **Props**: `workers`, `onSort`, `onSelect`, `onView`, `onEdit`, `onDelete`, `selectedIds`, `className`
- **Columns**: Checkbox, Employee #, Name, Type, Compensation (SRD), Status, Actions
- **Used In**: Workers List page
- **Features**:
  - Multi-select with checkboxes (select all + individual)
  - Sortable columns with visual indicators (chevron up/down)
  - Avatar + name display
  - Worker type badges
  - Status indicators
  - SRD compensation with type (hourly/salary)
  - Dropdown actions menu (view, edit, delete)
  - Responsive hover states
  - Empty state message

#### PayrollRunCard.tsx
- **Purpose**: Card displaying payroll run details with actions
- **Props**: `run`, `onProcess`, `onView`, `className`
- **Used In**: Payroll Runs page
- **Features**:
  - Status badge (draft, ready, processing, completed)
  - Period date range
  - Employee count
  - Total SRD amount
  - Elevated border for "ready" status
  - Process Payroll button (primary action)
  - View Details button (secondary action)
  - 13th-month bonus type indicator

#### TimeEntryCard.tsx (Complex Component)
- **Purpose**: Expandable time entry with approval actions
- **Props**: `entry`, `onApprove`, `onReject`, `onSelect`, `selected`, `className`
- **Used In**: Time Entries page
- **Features**:
  - Multi-select checkbox
  - Worker avatar and details
  - Status badge (pending, approved, rejected)
  - Clock in/out times with break minutes
  - Calculated total hours (with helper function)
  - "In Progress" indicator for active clock-ins
  - Issue warnings with yellow alert box
  - Expandable notes section
  - Approve/Reject buttons for pending entries
  - Selected state with blue ring

#### ScheduleGrid.tsx (Complex Component)
- **Purpose**: Weekly schedule visualization grid
- **Props**: `schedules`, `employees`, `days`, `onCellClick`, `className`
- **Used In**: Scheduling page
- **Features**:
  - Employee rows with sticky left column
  - Day columns across top
  - Shift blocks with color coding:
    - Regular (blue)
    - Overtime (purple)
    - Holiday (green)
  - Start/end time display
  - Empty cells with dashed borders
  - "+ Add" button for empty slots
  - Hover effects for interactivity
  - Horizontal scroll for many days

### 5. Utility Functions (helpers.ts)

All components use these utility functions:

- `formatCurrency(amount, showSymbol)` - SRD formatting with locale support
- `formatDate(date)` - Display format: Jan 15, 2025
- `formatDateRange(start, end)` - Range format: Jan 1 - Jan 15
- `formatTime(time)` - 12-hour format with AM/PM
- `calculateHours(start, end, break)` - Time entry calculations
- `getStatusColor(status)` - Dynamic Tailwind classes for 15+ statuses
- `getInitials(fullName)` - Extract 2-letter initials
- `maskAccountNumber(number, visible)` - Security display: •••••7890
- `getRelativeTime(date)` - "2 hours ago" formatting
- `daysBetween(date1, date2)` - Calculate day difference
- `calculatePercentage(part, total)` - Percentage calculations
- `formatPercentage(value)` - Display format: 12.5%

## Design System

### Colors (Tailwind Classes)
- **Primary**: Blue (#3b82f6) - `blue-500`, `blue-600`
- **Success**: Green - `green-500`, `green-600`
- **Warning**: Yellow - `yellow-500`, `yellow-600`
- **Danger**: Red - `red-500`, `red-600`
- **Info**: Purple - `purple-500`, `purple-600`
- **Neutral**: Gray scale with dark mode variants

### Typography
- **Headings**: `text-lg`, `text-xl`, `text-2xl`, `text-3xl`
- **Body**: `text-sm`, `text-base`
- **Labels**: `text-xs uppercase tracking-wider`
- **Currency**: `tabular-nums` for alignment

### Spacing
- **Card Padding**: `p-6`
- **Component Spacing**: `space-x-2`, `space-x-3`, `space-x-4`
- **Stack Spacing**: `space-y-4`, `space-y-6`

### Dark Mode
- All components have full dark mode support
- Dark variants: `dark:bg-gray-900`, `dark:text-white`, `dark:border-gray-800`
- Consistent across all components

## Surinamese Context

These components are specifically designed for Surinamese payroll:

1. **Currency Display**: SRD primary, USD secondary
2. **Formatting**: Local number formatting (comma separators)
3. **Terminology**: Worker types, compensation structures appropriate for Suriname
4. **Tax Context**: Ready for AOV, AWW, Wage Tax displays
5. **Banking**: Supports local bank account displays

## File Structure

```
apps/paylinq/src/
├── components/
│   └── ui/
│       ├── index.ts              # Central exports
│       ├── StatusBadge.tsx       # Status indicators
│       ├── Badge.tsx             # Generic badges
│       ├── WorkerAvatar.tsx      # Avatar with initials
│       ├── CurrencyDisplay.tsx   # SRD/USD display
│       ├── Pagination.tsx        # Page navigation
│       ├── Tabs.tsx              # Tab navigation
│       ├── DropdownMenu.tsx      # Action menus
│       ├── DashboardSummaryCard.tsx  # Metric cards
│       ├── PayrollTimeline.tsx   # Timeline visualization
│       ├── WorkerTable.tsx       # Workers data table
│       ├── PayrollRunCard.tsx    # Payroll run cards
│       ├── TimeEntryCard.tsx     # Time entry cards
│       └── ScheduleGrid.tsx      # Schedule grid
└── utils/
    └── helpers.ts                # Utility functions
```

## Import Example

```typescript
import {
  StatusBadge,
  Badge,
  WorkerAvatar,
  CurrencyDisplay,
  Pagination,
  Tabs,
  DropdownMenu,
  DashboardSummaryCard,
  PayrollTimeline,
  WorkerTable,
  PayrollRunCard,
  TimeEntryCard,
  ScheduleGrid,
} from '@/components/ui';

// All types are also exported
import type {
  Tab,
  DropdownMenuItem,
  TimelineRun,
  Worker,
  PayrollRun,
  TimeEntry,
  Schedule,
  Employee,
} from '@/components/ui';
```

## Build Status

✅ All components created
✅ TypeScript types complete
✅ No compilation errors
✅ Dark mode implemented
✅ Responsive design
✅ Utility functions complete
✅ Central exports configured

## Next Steps (Task 8)

Now that all core components are built, we can proceed to **Task 8: Implement Pages with Mock Data**:

1. Update Dashboard.tsx with summary cards, timeline, activity feed
2. Update WorkersList.tsx with WorkerTable, filters
3. Update WorkerDetails.tsx with tabs, info display
4. Update PayrollRunsList.tsx with PayrollRunCard grid
5. Update TimeEntries.tsx with TimeEntryCard list, bulk actions
6. Update ScheduleCalendar.tsx with ScheduleGrid
7. Update ReportsDashboard.tsx with report cards
8. Test all pages with mock data
9. Verify dark mode throughout
10. Ensure responsive design on all screen sizes

## Dependencies

All components use:
- React 18
- TypeScript
- Tailwind CSS
- lucide-react (icons)
- clsx (conditional classes)

No additional dependencies needed! 🎉
