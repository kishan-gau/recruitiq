# Search & Filter Enhancement Plan

**Document Version:** 1.0  
**Created:** November 19, 2025  
**Status:** Planning Phase  
**Target Applications:** PayLinQ, Nexus, ScheduleHub

---

## 📋 Executive Summary

This document outlines a comprehensive enhancement plan for search and filter functionality across all three RecruitIQ applications (PayLinQ, Nexus, ScheduleHub) based on industry standards and best practices from leading SaaS platforms.

### Current State Analysis

**Search Coverage:**
- ✅ PayLinQ: 3/5 pages have search (60%)
- ✅ Nexus: 3/4 pages have search (75%)
- ❌ ScheduleHub: 0/1 pages have search (0%)

**Filter Sophistication:**
- PayLinQ WorkersList: Most advanced (FilterPanel + search + multi-select)
- Nexus: Moderate (inline collapsible panels)
- ScheduleHub: Basic (status dropdown only)

**Key Gaps Identified:**
1. Inconsistent filter UX across applications
2. Missing search on several critical pages
3. No date range filtering despite temporal data
4. Client-side filtering limiting scalability
5. No filter persistence or saved presets
6. Limited accessibility features

### Business Impact

**Expected Improvements:**
- ⬇️ 60% reduction in time to find specific records
- ⬆️ 40% increase in feature adoption
- ⬆️ 10x search performance with optimizations
- ✅ WCAG 2.1 AA compliance
- ✅ Competitive parity with industry leaders

---

## 🎯 Phase 1: Critical Gaps & Quick Wins

**Timeline:** 1-2 weeks  
**Priority:** HIGH  
**Risk:** LOW

### Enhancement 1.1: Add Missing Search Functionality

#### Problem Statement
Three critical list pages lack search functionality, forcing users to manually scan through records. This violates industry standards where all list views should be searchable.

#### Scope

**Pages Requiring Search:**

1. **ScheduleHub - SchedulesList** (`apps/nexus/src/pages/schedulehub/SchedulesList.tsx`)
   - Current: Status dropdown only
   - Add: Search by schedule name, description
   
2. **PayLinQ - PayComponentsList** (`apps/paylinq/src/pages/pay-components/PayComponentsList.tsx`)
   - Current: Tab navigation, no search
   - Add: Search by component code, component name, description

3. **PayLinQ - WorkerTypesList** (`apps/paylinq/src/pages/worker-types/WorkerTypesList.tsx`)
   - Current: Simple list with status grouping
   - Add: Search by type name, type code

#### Technical Implementation

```typescript
// Pattern to add to each page
import { Search } from 'lucide-react';
import { useState, useMemo } from 'react';

// Add state
const [searchQuery, setSearchQuery] = useState('');

// Add search UI
<div className="relative flex-1 max-w-md">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search by name or code..."
    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500"
  />
</div>

// Add filtering logic
const filteredData = useMemo(() => {
  if (!searchQuery.trim()) return data;
  
  const query = searchQuery.toLowerCase();
  return data.filter(item => 
    item.name?.toLowerCase().includes(query) ||
    item.code?.toLowerCase().includes(query) ||
    item.description?.toLowerCase().includes(query)
  );
}, [data, searchQuery]);
```

#### Acceptance Criteria

**AC 1.1.1: SchedulesList Search**
- [ ] Search input visible above schedule grid
- [ ] Search filters by schedule name (case-insensitive)
- [ ] Search filters by schedule description (case-insensitive)
- [ ] Search updates results in real-time (no submit button)
- [ ] Clear search shows all schedules again
- [ ] Search persists when navigating between pages (same session)
- [ ] Empty search state shows "No schedules match your search" message
- [ ] Search works correctly with pagination
- [ ] Search works correctly with existing status filter

**AC 1.1.2: PayComponentsList Search**
- [ ] Search input visible for both Components and Templates tabs
- [ ] Search filters by component code (case-insensitive)
- [ ] Search filters by component name (case-insensitive)
- [ ] Search filters by description (case-insensitive)
- [ ] Tab switching preserves search query
- [ ] Search updates results in real-time
- [ ] Empty search state shows appropriate message
- [ ] Search works within component type grouping (earnings/deductions)

**AC 1.1.3: WorkerTypesList Search**
- [ ] Search input visible above worker types list
- [ ] Search filters by type name (case-insensitive)
- [ ] Search filters by type code (case-insensitive)
- [ ] Search works across active/inactive groupings
- [ ] Search updates results in real-time
- [ ] Clear search returns to full list view
- [ ] Empty search state shows "No worker types match your search"

**AC 1.1.4: Cross-Cutting Requirements**
- [ ] All search inputs have proper ARIA labels
- [ ] Search icon positioned consistently (left side of input)
- [ ] Placeholder text is descriptive and consistent
- [ ] Search input supports keyboard navigation (Tab, Enter, Escape)
- [ ] Escape key clears search and returns focus
- [ ] Search performance: <100ms for datasets up to 1000 items
- [ ] No console errors or warnings
- [ ] Dark mode styling matches existing inputs
- [ ] Mobile responsive (full width on small screens)

#### Testing Requirements

**Unit Tests:**
```typescript
describe('SchedulesList Search', () => {
  it('should filter schedules by name', () => { });
  it('should filter schedules by description', () => { });
  it('should handle case-insensitive search', () => { });
  it('should show empty state when no matches', () => { });
  it('should clear search on input clear', () => { });
});
```

**E2E Tests:**
```typescript
test('should search schedules by name', async ({ page }) => {
  await page.goto('/schedules');
  await page.fill('[placeholder*="Search"]', 'Weekly');
  await expect(page.locator('[data-testid="schedule-card"]')).toHaveCount(1);
});
```

#### Definition of Done

- [ ] Code implemented and peer reviewed
- [ ] Unit tests written with >90% coverage
- [ ] E2E tests passing for all search scenarios
- [ ] Accessibility audit passed (keyboard navigation, screen readers)
- [ ] Performance validated (<100ms search response time)
- [ ] Documentation updated (if applicable)
- [ ] Deployed to staging and QA approved
- [ ] No regressions in existing functionality

---

### Enhancement 1.2: Standardize FilterPanel Component

#### Problem Statement
Inconsistent filter UI/UX across applications creates confusion and reduces efficiency. PayLinQ uses a custom FilterPanel, Nexus uses inline collapsible panels, and ScheduleHub has minimal filtering.

#### Current Implementation Analysis

**PayLinQ FilterPanel** (`apps/paylinq/src/components/ui/FilterPanel.tsx`):
- ✅ Right-side slide panel with backdrop
- ✅ Supports 4 filter types (select, multiselect, daterange, text)
- ✅ Sticky header/footer with Reset and Apply buttons
- ✅ Dark mode support
- ❌ Not shared across apps

**Nexus Inline Panels:**
- ✅ Collapsible filter sections
- ✅ Status and type dropdowns
- ❌ Inconsistent placement and styling
- ❌ No standardized "Clear Filters" button

#### Solution: Shared FilterPanel Component

**Location:** `packages/ui/src/components/FilterPanel.tsx`

**Features:**
```typescript
export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'daterange' | 'text' | 'number' | 'checkbox';
  options?: FilterOption[];
  placeholder?: string;
  min?: number;
  max?: number;
  helpText?: string;
}

export interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (filterId: string, value: any) => void;
  onReset: () => void;
  onApply: () => void;
  position?: 'right' | 'bottom'; // 'bottom' for mobile
  title?: string;
  showAppliedCount?: boolean;
}
```

#### Migration Plan

**Step 1: Create Shared Component** (2 days)
- [ ] Extract FilterPanel from PayLinQ
- [ ] Enhance with additional filter types
- [ ] Add position prop for mobile support
- [ ] Add comprehensive TypeScript types
- [ ] Write Storybook documentation
- [ ] Add unit tests

**Step 2: Migrate PayLinQ** (1 day)
- [ ] Update WorkersList to use shared FilterPanel
- [ ] Update import paths
- [ ] Verify functionality unchanged
- [ ] Test dark mode
- [ ] Test mobile responsiveness

**Step 3: Migrate Nexus** (2 days)
- [ ] Replace inline panels in EmployeesList
- [ ] Replace inline panels in LocationsList
- [ ] Add FilterPanel to DepartmentsList
- [ ] Standardize filter toggle button
- [ ] Test all filter combinations

**Step 4: Enhance ScheduleHub** (1 day)
- [ ] Add FilterPanel to SchedulesList
- [ ] Include status multiselect
- [ ] Add date range filter for schedule dates
- [ ] Add search integration

#### Acceptance Criteria

**AC 1.2.1: Shared Component Creation**
- [ ] Component created in `packages/ui/src/components/FilterPanel.tsx`
- [ ] Exported from `packages/ui/src/index.ts`
- [ ] Full TypeScript support with proper interfaces
- [ ] Supports all filter types: select, multiselect, daterange, text, number, checkbox
- [ ] Position prop supports 'right' (desktop) and 'bottom' (mobile)
- [ ] Dark mode fully supported
- [ ] Accessibility features: keyboard navigation, ARIA labels, focus management
- [ ] Storybook stories created with all filter type examples

**AC 1.2.2: PayLinQ Migration**
- [ ] WorkersList successfully using shared FilterPanel
- [ ] All existing filters working identically
- [ ] No visual regressions
- [ ] Performance unchanged or improved
- [ ] Existing tests still passing

**AC 1.2.3: Nexus Migration**
- [ ] EmployeesList using shared FilterPanel
- [ ] LocationsList using shared FilterPanel
- [ ] DepartmentsList using shared FilterPanel
- [ ] Filter toggle button consistently placed (top-right)
- [ ] "Clear Filters" button behavior consistent
- [ ] All existing filters working identically
- [ ] No visual regressions

**AC 1.2.4: ScheduleHub Enhancement**
- [ ] FilterPanel added to SchedulesList
- [ ] Status filter converted to multiselect
- [ ] Date range filter added for schedule dates
- [ ] Search input integrated above filters
- [ ] Filter works correctly with search
- [ ] Pagination works correctly with filters

**AC 1.2.5: Cross-App Consistency**
- [ ] Filter panel opens from same position in all apps
- [ ] Filter toggle button has same icon and placement
- [ ] "Applied Filters" display is consistent
- [ ] "Clear Filters" button behavior is identical
- [ ] Keyboard shortcuts work consistently (Esc to close)
- [ ] Mobile behavior identical across apps (bottom sheet)

**AC 1.2.6: Performance Requirements**
- [ ] Filter panel opens in <100ms
- [ ] Filter application completes in <200ms for datasets up to 1000 items
- [ ] No memory leaks on repeated open/close
- [ ] Smooth animations (60fps)

**AC 1.2.7: Accessibility Requirements**
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation: Tab, Shift+Tab, Enter, Escape
- [ ] Focus trap when panel is open
- [ ] Screen reader announces filter count and applied filters
- [ ] All form controls have proper labels
- [ ] High contrast mode supported
- [ ] Focus indicators visible and clear

#### Testing Requirements

**Unit Tests:**
```typescript
describe('FilterPanel Shared Component', () => {
  it('should render with all filter types', () => { });
  it('should handle select filter changes', () => { });
  it('should handle multiselect filter changes', () => { });
  it('should handle date range filter changes', () => { });
  it('should reset all filters', () => { });
  it('should call onApply with current values', () => { });
  it('should close on backdrop click', () => { });
  it('should close on Escape key', () => { });
  it('should support mobile position', () => { });
});
```

**Integration Tests:**
```typescript
describe('FilterPanel Integration', () => {
  it('should filter workers by status and type', () => { });
  it('should filter employees by status and employment type', () => { });
  it('should persist filters on page reload', () => { });
  it('should work with search', () => { });
  it('should work with pagination', () => { });
});
```

**E2E Tests:**
```typescript
test('should apply filters in EmployeesList', async ({ page }) => {
  await page.goto('/employees');
  await page.click('[data-testid="filter-toggle"]');
  await page.selectOption('#status', 'active');
  await page.click('button:has-text("Apply")');
  await expect(page.locator('[data-testid="employee-row"]')).toHaveCount(5);
});
```

#### Definition of Done

- [ ] Shared FilterPanel component created in packages/ui
- [ ] All three apps migrated to shared component
- [ ] Unit tests with >95% coverage
- [ ] Integration tests covering all apps
- [ ] E2E tests for critical filter scenarios
- [ ] Storybook documentation complete
- [ ] Accessibility audit passed
- [ ] Performance benchmarks met
- [ ] Peer review completed
- [ ] QA approved in staging
- [ ] No regressions in production

---

## 🎯 Phase 2: Advanced Filtering

**Timeline:** 2-3 weeks  
**Priority:** MEDIUM  
**Risk:** LOW-MEDIUM

### Enhancement 2.1: Implement Date Range Filters

#### Problem Statement
Payroll, HR, and scheduling data is inherently temporal, yet no date range filtering exists. Users cannot easily filter by hire date ranges, payroll periods, or schedule date ranges.

#### Scope

**Pages Requiring Date Range Filters:**

1. **PayLinQ - PayrollRunsPage**
   - Filter by period start date range
   - Filter by period end date range
   - Filter by payment date range

2. **PayLinQ - TimesheetsPage**
   - Filter by submission date range
   - Filter by period date range

3. **Nexus - EmployeesList**
   - Filter by hire date range
   - Filter by termination date range (if applicable)

4. **ScheduleHub - SchedulesList**
   - Filter by schedule start date range
   - Filter by schedule end date range

#### Technical Implementation

**FilterPanel Already Supports Date Range:**
```typescript
{
  id: 'hireDateRange',
  label: 'Hire Date',
  type: 'daterange',
  placeholder: 'Select date range'
}

// Usage in component
const filterConfigs: FilterConfig[] = [
  {
    id: 'hireDateRange',
    label: 'Hire Date Range',
    type: 'daterange'
  },
  // ... other filters
];

// In filter logic
const filteredData = data.filter(item => {
  if (filters.hireDateRange?.from) {
    if (new Date(item.hireDate) < new Date(filters.hireDateRange.from)) {
      return false;
    }
  }
  if (filters.hireDateRange?.to) {
    if (new Date(item.hireDate) > new Date(filters.hireDateRange.to)) {
      return false;
    }
  }
  return true;
});
```

#### Acceptance Criteria

**AC 2.1.1: PayrollRunsPage Date Filters**
- [ ] "Period Start" date range filter added to FilterPanel
- [ ] "Period End" date range filter added to FilterPanel
- [ ] "Payment Date" date range filter added to FilterPanel
- [ ] Filters work independently (can filter by one, two, or all three)
- [ ] Date picker UI is user-friendly and accessible
- [ ] Validation: "From" date cannot be after "To" date
- [ ] Empty date range shows all records
- [ ] Date range persists when navigating away and back
- [ ] Works correctly with existing status filter

**AC 2.1.2: TimesheetsPage Date Filters**
- [ ] "Submission Date" range filter added
- [ ] "Period" date range filter added
- [ ] Filters work with existing status filter
- [ ] Date validation enforced
- [ ] Performance acceptable for large timesheet datasets

**AC 2.1.3: EmployeesList Date Filters**
- [ ] "Hire Date" range filter added
- [ ] "Termination Date" range filter added (shows only for terminated employees)
- [ ] Filters work with existing status and employment type filters
- [ ] Common presets available: "Last 30 days", "Last 90 days", "This year"
- [ ] Date validation enforced

**AC 2.1.4: SchedulesList Date Filters**
- [ ] "Schedule Start Date" range filter added
- [ ] "Schedule End Date" range filter added
- [ ] Filters work with existing status filter
- [ ] Date validation enforced
- [ ] Performance acceptable for large schedule datasets

**AC 2.1.5: Date Range Presets**
- [ ] Quick preset buttons: "Today", "Last 7 days", "Last 30 days", "This Month", "Last Month"
- [ ] Clicking preset auto-populates from/to dates
- [ ] Custom date selection still available
- [ ] Presets work consistently across all pages

**AC 2.1.6: Date Picker UI**
- [ ] Native date input for mobile
- [ ] Enhanced date picker for desktop (consider react-datepicker or similar)
- [ ] Calendar icon visible
- [ ] Clear date button available
- [ ] Min/max dates enforced where applicable
- [ ] Keyboard accessible (Tab, Enter, Escape)

**AC 2.1.7: Performance Requirements**
- [ ] Date filtering completes in <200ms for datasets up to 1000 items
- [ ] No UI lag when selecting dates
- [ ] Efficient date comparison algorithm used

#### Testing Requirements

**Unit Tests:**
```typescript
describe('Date Range Filtering', () => {
  it('should filter by single date (from only)', () => { });
  it('should filter by single date (to only)', () => { });
  it('should filter by complete date range', () => { });
  it('should handle invalid date ranges', () => { });
  it('should apply date presets correctly', () => { });
  it('should handle edge cases (same day, year boundaries)', () => { });
});
```

**E2E Tests:**
```typescript
test('should filter payroll runs by period date range', async ({ page }) => {
  await page.goto('/payroll-runs');
  await page.click('[data-testid="filter-toggle"]');
  await page.fill('#periodStartFrom', '2025-01-01');
  await page.fill('#periodStartTo', '2025-01-31');
  await page.click('button:has-text("Apply")');
  // Verify results
});
```

#### Definition of Done

- [ ] Date range filters implemented on all specified pages
- [ ] Date presets working and consistent
- [ ] Unit tests with >90% coverage
- [ ] E2E tests covering date filter scenarios
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] User documentation updated
- [ ] QA approved in staging

---

### Enhancement 2.2: Add Multi-Select Filters

#### Problem Statement
Current status filters allow selecting only one status at a time. Users often need to view multiple statuses simultaneously (e.g., "Active" and "On Leave" employees together).

#### Scope

**Pages Requiring Multi-Select:**

1. **PayLinQ - PayrollRunsPage**
   - Convert status dropdown to multiselect
   - Allow selecting multiple statuses (draft + calculating + calculated)

2. **PayLinQ - TimesheetsPage**
   - Convert status dropdown to multiselect
   - Allow selecting multiple statuses (submitted + approved)

3. **Nexus - EmployeesList**
   - Convert employment status to multiselect
   - Convert employment type to multiselect
   - Add department multiselect

4. **Nexus - LocationsList**
   - Convert location type to multiselect
   - Keep status as single select (active/inactive)

5. **ScheduleHub - SchedulesList**
   - Convert status dropdown to multiselect

#### Technical Implementation

```typescript
// FilterPanel already supports multiselect
{
  id: 'status',
  label: 'Status',
  type: 'multiselect',
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' }
  ]
}

// Filtering logic
const filteredData = data.filter(item => {
  if (filters.status && filters.status.length > 0) {
    return filters.status.includes(item.status);
  }
  return true;
});
```

#### Acceptance Criteria

**AC 2.2.1: Status Multiselect - PayrollRunsPage**
- [ ] Status filter converted from dropdown to checkbox multiselect
- [ ] All status options available: draft, calculating, calculated, approved, processing, processed, cancelled
- [ ] Can select 0, 1, or multiple statuses
- [ ] Selecting no statuses shows all records
- [ ] Selected statuses displayed as chips/badges
- [ ] Individual chip can be removed by clicking X
- [ ] Works with existing search and future date filters
- [ ] Summary cards still update based on selected filters

**AC 2.2.2: Status Multiselect - TimesheetsPage**
- [ ] Status filter converted to checkbox multiselect
- [ ] All status options available: draft, submitted, approved, rejected
- [ ] Can select multiple statuses simultaneously
- [ ] Works with search and bulk selection
- [ ] Performance acceptable with large datasets

**AC 2.2.3: Employment Filters - EmployeesList**
- [ ] Employment status converted to multiselect (active, on_leave, terminated, suspended)
- [ ] Employment type converted to multiselect (full_time, part_time, contract, temporary, intern)
- [ ] NEW: Department multiselect added (fetches from departments API)
- [ ] All three filters work together (AND logic)
- [ ] Selected values displayed as removable chips
- [ ] Filters persist on page navigation

**AC 2.2.4: Location Type Multiselect - LocationsList**
- [ ] Location type converted to multiselect (headquarters, branch, remote, warehouse, store)
- [ ] Status remains single select (active/inactive) for clarity
- [ ] Works with existing search
- [ ] Performance acceptable

**AC 2.2.5: Status Multiselect - SchedulesList**
- [ ] Status filter converted to multiselect (draft, published, archived)
- [ ] Can select multiple statuses
- [ ] Works with new search functionality
- [ ] Works with new date range filters

**AC 2.2.6: UI/UX Requirements**
- [ ] Checkbox UI is intuitive and easy to use
- [ ] "Select All" / "Deselect All" buttons available
- [ ] Selected count displayed (e.g., "3 selected")
- [ ] Checkboxes have clear visual states (checked, unchecked, indeterminate for "some selected")
- [ ] Mobile-friendly touch targets (minimum 44x44px)
- [ ] Keyboard accessible (Space to toggle, Tab to navigate)

**AC 2.2.7: Filter Display**
- [ ] Applied multiselect filters show as chips above data table
- [ ] Each chip shows filter label and value (e.g., "Status: Active")
- [ ] Each chip has X button to remove individual filter value
- [ ] "Clear All Filters" button removes all applied filters
- [ ] Chip styling consistent with design system

**AC 2.2.8: Performance Requirements**
- [ ] Multiselect rendering <100ms for up to 50 options
- [ ] Filter application completes in <200ms for datasets up to 1000 items
- [ ] No UI lag when selecting/deselecting options
- [ ] Efficient array operations (includes, filter)

#### Testing Requirements

**Unit Tests:**
```typescript
describe('Multiselect Filters', () => {
  it('should filter by single selected value', () => { });
  it('should filter by multiple selected values', () => { });
  it('should show all when no values selected', () => { });
  it('should handle select all', () => { });
  it('should handle deselect all', () => { });
  it('should remove individual selection', () => { });
  it('should work with other filter types', () => { });
});
```

**E2E Tests:**
```typescript
test('should filter employees by multiple statuses', async ({ page }) => {
  await page.goto('/employees');
  await page.click('[data-testid="filter-toggle"]');
  await page.check('input[value="active"]');
  await page.check('input[value="on_leave"]');
  await page.click('button:has-text("Apply")');
  // Verify both active and on_leave employees shown
});
```

#### Definition of Done

- [ ] All specified dropdowns converted to multiselect
- [ ] Department multiselect added to EmployeesList
- [ ] Filter chips display implemented
- [ ] Unit tests with >90% coverage
- [ ] E2E tests covering multiselect scenarios
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] QA approved in staging

---

### Enhancement 2.3: Implement Saved Filter Presets

#### Problem Statement
Power users repeatedly apply the same filter combinations. Creating saved filter presets reduces repetitive work and improves efficiency.

#### Scope

**Feature Components:**
1. Save current filter state with custom name
2. Load saved filter preset
3. Edit/rename saved preset
4. Delete saved preset
5. Set default preset (auto-applied on page load)
6. Organization-level presets (admin-created, shared across users)
7. User-level presets (personal)

#### Technical Implementation

```typescript
interface SavedFilterPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  isDefault: boolean;
  scope: 'user' | 'organization';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Component integration
function FilterPresetSelector() {
  const { data: presets } = useSavedPresets('employees');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  
  const applyPreset = (preset: SavedFilterPreset) => {
    setFilters(preset.filters);
    setSelectedPreset(preset.id);
  };
  
  return (
    <div className="flex items-center gap-2">
      <select 
        value={selectedPreset || ''} 
        onChange={(e) => applyPreset(presets.find(p => p.id === e.target.value))}
      >
        <option value="">Select a preset...</option>
        {presets.map(preset => (
          <option key={preset.id} value={preset.id}>
            {preset.name} {preset.scope === 'organization' && '(Shared)'}
          </option>
        ))}
      </select>
      <button onClick={openSaveDialog}>Save Current</button>
    </div>
  );
}
```

#### Backend API Requirements

```typescript
// API Endpoints
POST   /api/filter-presets
GET    /api/filter-presets?page={page}&scope={user|organization}
GET    /api/filter-presets/:id
PUT    /api/filter-presets/:id
DELETE /api/filter-presets/:id
POST   /api/filter-presets/:id/set-default

// Database Schema
CREATE TABLE filter_presets (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id), -- NULL for org-level presets
  page_identifier VARCHAR(100) NOT NULL, -- 'employees', 'payroll-runs', etc.
  name VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('user', 'organization')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_filter_presets_org_page ON filter_presets(organization_id, page_identifier, deleted_at);
CREATE INDEX idx_filter_presets_user ON filter_presets(user_id, deleted_at);
```

#### Acceptance Criteria

**AC 2.3.1: Save Filter Preset**
- [ ] "Save Preset" button visible when filters are applied
- [ ] Dialog prompts for preset name (required, max 100 chars)
- [ ] Option to set as default preset
- [ ] Option to set scope (user-only or organization-wide) - organization-wide requires admin role
- [ ] Validation: Name cannot be empty or duplicate for same page/user
- [ ] Success message shows "Preset saved successfully"
- [ ] New preset appears in preset selector immediately
- [ ] Preset saves all current filter values

**AC 2.3.2: Load Filter Preset**
- [ ] Preset selector dropdown visible above filters
- [ ] Lists all user presets + organization presets
- [ ] Organization presets marked with "(Shared)" badge
- [ ] Selecting preset applies all saved filters
- [ ] Visual indicator shows which preset is active
- [ ] Works across all pages with filters
- [ ] Default preset auto-applied on page load

**AC 2.3.3: Manage Presets**
- [ ] "Manage Presets" button opens management dialog
- [ ] Dialog lists all user presets with edit/delete actions
- [ ] Can rename preset (same validation as save)
- [ ] Can toggle "Set as Default"
- [ ] Can delete preset with confirmation dialog
- [ ] Deleting active preset clears filters
- [ ] Cannot delete organization presets unless admin

**AC 2.3.4: Organization Presets (Admin Only)**
- [ ] Admin users see "Save as Organization Preset" option
- [ ] Organization presets available to all users in organization
- [ ] Only admins can edit/delete organization presets
- [ ] Organization presets marked clearly in UI
- [ ] Audit log tracks who created/modified organization presets

**AC 2.3.5: Default Preset Behavior**
- [ ] User default preset auto-applied on page load
- [ ] Organization default applied if no user default set
- [ ] Can clear default preset (returns to no filters)
- [ ] Only one default preset per page per user
- [ ] Default preset indicator visible in selector

**AC 2.3.6: Preset Naming Conventions**
- [ ] Suggested names provided: "Active Employees", "Pending Payrolls", "This Month", etc.
- [ ] User can override with custom name
- [ ] Name validation: 3-100 characters, alphanumeric + spaces/hyphens
- [ ] Duplicate names prevented within same scope

**AC 2.3.7: Performance Requirements**
- [ ] Loading presets completes in <500ms
- [ ] Applying preset completes in <300ms
- [ ] No UI lag when switching presets
- [ ] Efficient JSONB querying in database

**AC 2.3.8: Cross-Page Support**
- [ ] Presets work on: EmployeesList, PayrollRunsPage, TimesheetsPage, WorkersList, LocationsList, SchedulesList
- [ ] Each page maintains separate presets (page_identifier)
- [ ] Preset format compatible with each page's filter structure

#### Testing Requirements

**Unit Tests:**
```typescript
describe('Filter Presets', () => {
  it('should save filter preset', () => { });
  it('should load filter preset', () => { });
  it('should apply default preset on load', () => { });
  it('should update preset', () => { });
  it('should delete preset', () => { });
  it('should handle organization vs user scope', () => { });
});
```

**Integration Tests:**
```typescript
describe('Filter Presets API', () => {
  it('should create user preset', () => { });
  it('should create organization preset (admin only)', () => { });
  it('should list presets for page', () => { });
  it('should prevent duplicate names', () => { });
  it('should enforce tenant isolation', () => { });
});
```

**E2E Tests:**
```typescript
test('should save and load filter preset', async ({ page }) => {
  await page.goto('/employees');
  await page.click('[data-testid="filter-toggle"]');
  await page.selectOption('#status', 'active');
  await page.click('button:has-text("Apply")');
  await page.click('button:has-text("Save Preset")');
  await page.fill('#preset-name', 'Active Only');
  await page.click('button:has-text("Save")');
  // Reload page
  await page.reload();
  await page.selectOption('[data-testid="preset-selector"]', 'Active Only');
  // Verify filters applied
});
```

#### Definition of Done

- [ ] Save/load preset functionality implemented
- [ ] Preset management UI complete
- [ ] Backend API implemented with proper authorization
- [ ] Database schema created and migrated
- [ ] Organization vs user scope working correctly
- [ ] Default preset behavior working
- [ ] Unit tests with >90% coverage
- [ ] Integration tests for API
- [ ] E2E tests covering preset workflows
- [ ] User documentation created
- [ ] Admin documentation for organization presets
- [ ] QA approved in staging

---

## 🎯 Phase 3: Search Optimization

**Timeline:** 2-3 weeks  
**Priority:** HIGH  
**Risk:** MEDIUM

### Enhancement 3.1: Implement Full-Text Search

#### Problem Statement
Current search uses basic string matching (`includes()`), which is slow for large datasets and doesn't support fuzzy matching, relevance ranking, or multi-field searches effectively.

#### Technical Approach

**Frontend: Fuse.js Integration**
```typescript
import Fuse from 'fuse.js';

const fuseOptions = {
  keys: [
    { name: 'firstName', weight: 0.3 },
    { name: 'lastName', weight: 0.3 },
    { name: 'email', weight: 0.2 },
    { name: 'employeeNumber', weight: 0.2 }
  ],
  threshold: 0.3, // 0 = exact match, 1 = match anything
  includeScore: true,
  includeMatches: true, // Highlight matching text
  minMatchCharLength: 2,
  useExtendedSearch: true // Enable operators like ^, $, !
};

const fuse = new Fuse(data, fuseOptions);
const results = fuse.search(searchQuery);
```

**Backend: PostgreSQL Full-Text Search**
```sql
-- Add search vector column
ALTER TABLE employees 
ADD COLUMN search_vector tsvector 
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(first_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(last_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(email, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(employee_number, '')), 'B')
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX idx_employees_search_vector ON employees USING gin(search_vector);

-- Query with ranking
SELECT 
  e.*,
  ts_rank(e.search_vector, query) as rank
FROM employees e,
     to_tsquery('english', 'John & Software') as query
WHERE e.search_vector @@ query
  AND e.organization_id = $1
  AND e.deleted_at IS NULL
ORDER BY rank DESC
LIMIT 20;
```

#### Acceptance Criteria

**AC 3.1.1: Frontend Fuzzy Search**
- [ ] Fuse.js integrated into all search-enabled pages
- [ ] Search matches partial words (e.g., "joh" matches "john")
- [ ] Typo tolerance: 1-2 character differences still match
- [ ] Multi-field search: searches across all relevant fields
- [ ] Results ranked by relevance score
- [ ] Highlighting: matching text highlighted in results
- [ ] Performance: <100ms for datasets up to 1000 items

**AC 3.1.2: Backend Full-Text Search**
- [ ] Search vector columns added to: employees, workers, pay_components, schedules, locations
- [ ] GIN indexes created on all search vectors
- [ ] API endpoints updated to use full-text search
- [ ] Query syntax supports: AND, OR, NOT, phrase search
- [ ] Results ranked by ts_rank
- [ ] Performance: <200ms for queries on tables with 100k+ rows

**AC 3.1.3: Search Features**
- [ ] Prefix search: "john*" matches "johnson"
- [ ] Phrase search: "john doe" matches exact phrase
- [ ] Boolean operators: "john AND developer"
- [ ] Negation: "john NOT smith"
- [ ] Field-specific search: "email:john@example.com"

**AC 3.1.4: Result Highlighting**
- [ ] Matching text highlighted in search results
- [ ] Multiple matches highlighted in same record
- [ ] Highlight styling consistent across apps
- [ ] Works with both frontend and backend search

**AC 3.1.5: Performance Requirements**
- [ ] Frontend search: <100ms for 1000 items
- [ ] Backend search: <200ms for 100k items
- [ ] No UI lag during typing
- [ ] Debounced search (300ms delay after last keystroke)

**AC 3.1.6: Fallback Behavior**
- [ ] Graceful degradation if full-text search unavailable
- [ ] Falls back to LIKE queries if search vector missing
- [ ] Error handling for malformed search queries

#### Testing Requirements

**Unit Tests:**
```typescript
describe('Full-Text Search', () => {
  it('should perform fuzzy search', () => { });
  it('should rank results by relevance', () => { });
  it('should highlight matching text', () => { });
  it('should handle special characters', () => { });
  it('should support boolean operators', () => { });
});
```

**Performance Tests:**
```typescript
describe('Search Performance', () => {
  it('should complete search in <100ms for 1000 items', () => { });
  it('should complete search in <200ms for 10k items (backend)', () => { });
  it('should handle concurrent searches', () => { });
});
```

#### Definition of Done

- [ ] Fuse.js integrated on frontend
- [ ] PostgreSQL full-text search implemented on backend
- [ ] Search vectors and indexes created
- [ ] API endpoints updated
- [ ] Result highlighting working
- [ ] Performance benchmarks met
- [ ] Unit tests with >90% coverage
- [ ] Performance tests passing
- [ ] QA approved in staging

---

### Enhancement 3.2: Add Search Suggestions/Autocomplete

#### Problem Statement
Users waste time typing full search queries. Search suggestions improve efficiency by showing relevant results as the user types.

#### Technical Implementation

```typescript
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function SearchWithSuggestions() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: () => fetchSuggestions(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60000 // Cache for 1 minute
  });
  
  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search employees..."
      />
      {suggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-b-lg">
          {suggestions.map(item => (
            <div
              key={item.id}
              onClick={() => selectSuggestion(item)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <div className="font-medium">{item.firstName} {item.lastName}</div>
              <div className="text-sm text-gray-500">{item.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Backend API

```typescript
// GET /api/employees/search-suggestions?q=john&limit=5
export async function getSearchSuggestions(req, res) {
  const { q, limit = 5 } = req.query;
  const { organizationId } = req.user;
  
  if (!q || q.length < 2) {
    return res.json({ suggestions: [] });
  }
  
  const suggestions = await query(`
    SELECT 
      id, 
      first_name, 
      last_name, 
      email, 
      employee_number,
      ts_rank(search_vector, query) as rank
    FROM employees,
         to_tsquery('english', $1 || ':*') as query
    WHERE search_vector @@ query
      AND organization_id = $2
      AND deleted_at IS NULL
    ORDER BY rank DESC, last_name ASC
    LIMIT $3
  `, [q.replace(/\s+/g, ' & '), organizationId, limit]);
  
  return res.json({ suggestions: suggestions.rows });
}
```

#### Acceptance Criteria

**AC 3.2.1: Autocomplete Functionality**
- [ ] Suggestions appear after typing 2+ characters
- [ ] Debounced to avoid excessive API calls (300ms delay)
- [ ] Shows top 5-10 most relevant results
- [ ] Displays full name, email, and employee number
- [ ] Clicking suggestion populates search field or navigates to record
- [ ] ESC key dismisses suggestions
- [ ] Arrow keys navigate suggestions
- [ ] Enter key selects highlighted suggestion

**AC 3.2.2: UI/UX Requirements**
- [ ] Dropdown appears below search input
- [ ] Matches input width or wider
- [ ] Loading indicator while fetching suggestions
- [ ] "No results" message when appropriate
- [ ] Highlighting: query text highlighted in suggestions
- [ ] Keyboard navigation with visual focus indicator
- [ ] Mobile-friendly (larger touch targets)

**AC 3.2.3: Performance Requirements**
- [ ] API response time <200ms
- [ ] Frontend rendering <50ms
- [ ] Caching: Identical queries cached for 1 minute
- [ ] No flickering or layout shift
- [ ] Smooth scroll for long suggestion lists

**AC 3.2.4: Recent Searches**
- [ ] "Recent Searches" section shows last 5 searches
- [ ] Recent searches stored in localStorage
- [ ] Can clear individual recent search
- [ ] "Clear All" button removes all recent searches
- [ ] Recent searches shown when input is focused and empty

**AC 3.2.5: Search Categories (Advanced)**
- [ ] Suggestions grouped by type: Employees, Departments, Locations
- [ ] Each category shows top 3 results
- [ ] Category headers visible in dropdown
- [ ] Can filter by category (e.g., "Search only in Employees")

**AC 3.2.6: Accessibility**
- [ ] ARIA attributes for autocomplete (aria-autocomplete, aria-expanded, aria-activedescendant)
- [ ] Screen reader announces suggestion count
- [ ] Keyboard accessible (Tab, Arrow keys, Enter, ESC)
- [ ] Focus management when selecting suggestion

#### Testing Requirements

**Unit Tests:**
```typescript
describe('Search Suggestions', () => {
  it('should fetch suggestions after debounce', () => { });
  it('should show top N results', () => { });
  it('should highlight query in suggestions', () => { });
  it('should handle keyboard navigation', () => { });
  it('should handle suggestion selection', () => { });
  it('should cache identical queries', () => { });
});
```

**E2E Tests:**
```typescript
test('should show and select suggestion', async ({ page }) => {
  await page.goto('/employees');
  await page.fill('[data-testid="search-input"]', 'joh');
  await page.waitForSelector('[data-testid="suggestions-dropdown"]');
  await page.click('[data-testid="suggestion-0"]');
  // Verify navigation or filter applied
});
```

#### Definition of Done

- [ ] Autocomplete component implemented
- [ ] Backend API endpoint created
- [ ] Recent searches feature working
- [ ] Keyboard navigation working
- [ ] Performance benchmarks met
- [ ] Accessibility requirements met
- [ ] Unit tests with >90% coverage
- [ ] E2E tests passing
- [ ] QA approved in staging

---

### Enhancement 3.3: Advanced Search Modal

#### Problem Statement
Power users need complex search capabilities beyond basic filters: field-specific searches, range queries, boolean logic, saved searches.

#### Technical Implementation

```typescript
interface AdvancedSearchQuery {
  conditions: SearchCondition[];
  logic: 'AND' | 'OR';
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

interface SearchCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 
           'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 
           'is_null' | 'is_not_null';
  value: any;
}

function AdvancedSearchModal() {
  const [conditions, setConditions] = useState<SearchCondition[]>([]);
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  
  const addCondition = () => {
    setConditions([...conditions, {
      field: 'firstName',
      operator: 'contains',
      value: ''
    }]);
  };
  
  const executeSearch = async () => {
    const results = await api.post('/advanced-search', {
      conditions,
      logic,
      entity: 'employees'
    });
    return results.data;
  };
  
  return (
    <Modal title="Advanced Search" size="large">
      {/* Logic selector */}
      <div className="mb-4">
        <label>Match:</label>
        <RadioGroup value={logic} onChange={setLogic}>
          <Radio value="AND">All conditions</Radio>
          <Radio value="OR">Any condition</Radio>
        </RadioGroup>
      </div>
      
      {/* Conditions */}
      {conditions.map((condition, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <select 
            value={condition.field}
            onChange={(e) => updateCondition(index, 'field', e.target.value)}
          >
            <option value="firstName">First Name</option>
            <option value="lastName">Last Name</option>
            <option value="email">Email</option>
            <option value="department">Department</option>
            <option value="hireDate">Hire Date</option>
          </select>
          
          <select
            value={condition.operator}
            onChange={(e) => updateCondition(index, 'operator', e.target.value)}
          >
            <option value="equals">Equals</option>
            <option value="contains">Contains</option>
            <option value="starts_with">Starts with</option>
            <option value="greater_than">Greater than</option>
            <option value="between">Between</option>
          </select>
          
          <input
            value={condition.value}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            placeholder="Value..."
          />
          
          <button onClick={() => removeCondition(index)}>Remove</button>
        </div>
      ))}
      
      <button onClick={addCondition}>+ Add Condition</button>
      
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose}>Cancel</button>
        <button onClick={executeSearch} variant="primary">Search</button>
      </div>
    </Modal>
  );
}
```

#### Backend Query Builder

```typescript
function buildAdvancedSearchQuery(query: AdvancedSearchQuery, organizationId: string) {
  const conditions = query.conditions.map(c => {
    switch (c.operator) {
      case 'equals':
        return `${c.field} = $${params.length + 1}`;
      case 'contains':
        return `${c.field} ILIKE $${params.length + 1}`;
      case 'greater_than':
        return `${c.field} > $${params.length + 1}`;
      case 'between':
        return `${c.field} BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      // ... more operators
    }
  });
  
  const whereClause = conditions.join(` ${query.logic} `);
  
  return `
    SELECT * FROM employees
    WHERE organization_id = $1
      AND deleted_at IS NULL
      AND (${whereClause})
    ORDER BY ${query.sorting.field} ${query.sorting.direction}
  `;
}
```

#### Acceptance Criteria

**AC 3.3.1: Modal UI**
- [ ] "Advanced Search" link/button visible on search-enabled pages
- [ ] Modal opens with clean, intuitive interface
- [ ] Can add multiple search conditions
- [ ] Can remove conditions
- [ ] Can choose AND/OR logic between conditions
- [ ] Can save search query with name
- [ ] Can load saved search queries
- [ ] Modal is keyboard accessible

**AC 3.3.2: Field Selection**
- [ ] All searchable fields available in dropdown
- [ ] Field types respected (text, number, date, boolean, enum)
- [ ] Field labels user-friendly (not database column names)
- [ ] Grouped fields by category (Personal Info, Employment, Contact)

**AC 3.3.3: Operator Support**
- [ ] Text fields: equals, contains, starts with, ends with, is null, is not null
- [ ] Number fields: equals, greater than, less than, between, in, not in
- [ ] Date fields: equals, before, after, between, in last X days, is null
- [ ] Boolean fields: equals (true/false/null)
- [ ] Enum fields: equals, in, not in

**AC 3.3.4: Value Input**
- [ ] Input type matches field type (text, number, date picker, dropdown)
- [ ] Date range picker for "between" operator on dates
- [ ] Multi-select for "in" operator
- [ ] Validation: Cannot submit with empty required values
- [ ] Real-time validation feedback

**AC 3.3.5: Query Execution**
- [ ] Search button executes query and closes modal
- [ ] Results shown in main data table
- [ ] Applied advanced search indicated in UI
- [ ] Can clear advanced search to return to simple search
- [ ] Loading state while searching
- [ ] Error handling for invalid queries

**AC 3.3.6: Saved Searches**
- [ ] "Save Search" button prompts for name
- [ ] Saved searches listed in sidebar or dropdown
- [ ] Can load saved search (populates all conditions)
- [ ] Can edit saved search
- [ ] Can delete saved search
- [ ] Saved searches persisted to backend

**AC 3.3.7: Performance Requirements**
- [ ] Query execution <500ms for simple queries
- [ ] Query execution <2s for complex queries (5+ conditions)
- [ ] No UI blocking during query execution
- [ ] Efficient SQL generation (proper indexing utilized)

**AC 3.3.8: Advanced Features**
- [ ] Can group conditions with parentheses: (A AND B) OR C
- [ ] Can negate conditions: NOT(A)
- [ ] Can search across related tables (e.g., employee → department name)
- [ ] Query preview shows generated SQL (for admins/power users)

#### Testing Requirements

**Unit Tests:**
```typescript
describe('Advanced Search', () => {
  it('should build query with AND logic', () => { });
  it('should build query with OR logic', () => { });
  it('should handle multiple operators', () => { });
  it('should save search query', () => { });
  it('should load saved query', () => { });
});
```

**Integration Tests:**
```typescript
describe('Advanced Search API', () => {
  it('should execute complex search query', () => { });
  it('should respect tenant isolation', () => { });
  it('should handle invalid queries', () => { });
  it('should save and retrieve searches', () => { });
});
```

**E2E Tests:**
```typescript
test('should perform advanced search', async ({ page }) => {
  await page.goto('/employees');
  await page.click('button:has-text("Advanced Search")');
  await page.selectOption('#field-0', 'department');
  await page.selectOption('#operator-0', 'equals');
  await page.selectOption('#value-0', 'Engineering');
  await page.click('button:has-text("+ Add Condition")');
  await page.selectOption('#field-1', 'hireDate');
  await page.selectOption('#operator-1', 'after');
  await page.fill('#value-1', '2024-01-01');
  await page.click('button:has-text("Search")');
  // Verify filtered results
});
```

#### Definition of Done

- [ ] Advanced search modal implemented
- [ ] All operators working correctly
- [ ] Saved searches feature complete
- [ ] Backend query builder implemented
- [ ] Performance benchmarks met
- [ ] Unit tests with >90% coverage
- [ ] Integration tests passing
- [ ] E2E tests covering complex scenarios
- [ ] User documentation created
- [ ] QA approved in staging

---

## 🚀 Phase 4: Performance & UX

**Timeline:** 2-3 weeks  
**Priority:** MEDIUM  
**Risk:** MEDIUM

### Enhancement 4.1: Server-Side Filtering & Pagination

#### Problem Statement
Current client-side filtering loads all data upfront, causing slow initial page loads and poor performance with large datasets (1000+ records).

#### Technical Implementation

**Frontend: React Query with Server-Side Params**
```typescript
function useEmployees(filters: FilterState, pagination: PaginationState) {
  return useQuery({
    queryKey: ['employees', filters, pagination],
    queryFn: () => api.get('/employees', {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status,
        employmentType: filters.employmentType,
        search: filters.search,
        sortBy: pagination.sortBy,
        sortOrder: pagination.sortOrder
      }
    }),
    keepPreviousData: true, // Smooth UX during page changes
    staleTime: 30000 // Cache for 30 seconds
  });
}

function EmployeesList() {
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 25 });
  
  const { data, isLoading } = useEmployees(filters, pagination);
  
  return (
    <div>
      <FilterPanel filters={filters} onChange={setFilters} />
      <DataTable
        data={data?.employees}
        pagination={{
          ...pagination,
          total: data?.pagination.total
        }}
        onPaginationChange={setPagination}
      />
    </div>
  );
}
```

**Backend: Paginated Filtering**
```typescript
export async function listEmployees(req, res) {
  const { organizationId } = req.user;
  const {
    page = 1,
    limit = 25,
    status,
    employmentType,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;
  
  //

 Validate and sanitize inputs
  const validatedLimit = Math.min(parseInt(limit), 100);
  const offset = (parseInt(page) - 1) * validatedLimit;
  const validatedSortBy = validateSortField(sortBy);
  const validatedSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  // Build dynamic WHERE clause
  const conditions = ['organization_id = $1', 'deleted_at IS NULL'];
  const values = [organizationId];
  let paramCount = 1;
  
  if (status) {
    paramCount++;
    conditions.push(`status = $${paramCount}`);
    values.push(status);
  }
  
  if (employmentType) {
    paramCount++;
    conditions.push(`employment_type = $${paramCount}`);
    values.push(employmentType);
  }
  
  if (search) {
    paramCount++;
    conditions.push(`(
      first_name ILIKE $${paramCount} OR
      last_name ILIKE $${paramCount} OR
      email ILIKE $${paramCount} OR
      employee_number ILIKE $${paramCount}
    )`);
    values.push(`%${search}%`);
  }
  
  const whereClause = conditions.join(' AND ');
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM employees WHERE ${whereClause}`,
    values,
    organizationId
  );
  const total = parseInt(countResult.rows[0].total);
  
  // Get paginated results
  const results = await query(
    `SELECT * FROM employees 
     WHERE ${whereClause}
     ORDER BY ${validatedSortBy} ${validatedSortOrder}
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    [...values, validatedLimit, offset],
    organizationId
  );
  
  return res.json({
    success: true,
    employees: results.rows,
    pagination: {
      page: parseInt(page),
      limit: validatedLimit,
      total,
      totalPages: Math.ceil(total / validatedLimit),
      hasNext: offset + validatedLimit < total,
      hasPrev: parseInt(page) > 1
    }
  });
}
```

#### Acceptance Criteria

**AC 4.1.1: Server-Side Filtering**
- [ ] All filter changes trigger API requests
- [ ] Query parameters include all filter values
- [ ] Backend filters data before returning
- [ ] Pagination resets to page 1 when filters change
- [ ] Loading state shown during filter application
- [ ] Filters persisted in URL query params

**AC 4.1.2: Server-Side Pagination**
- [ ] Only requested page of data fetched from backend
- [ ] Page size options: 10, 25, 50, 100
- [ ] Pagination controls show total pages and current page
- [ ] "Previous" and "Next" buttons functional
- [ ] Can jump to specific page number
- [ ] Loading state shown during page changes

**AC 4.1.3: Server-Side Sorting**
- [ ] Clicking column header triggers API request with sort params
- [ ] Backend sorts data before returning
- [ ] Sort indicator shows current column and direction
- [ ] Can sort by multiple columns (shift+click for secondary sort)
- [ ] Default sort: created_at DESC

**AC 4.1.4: Performance Requirements**
- [ ] Initial page load <500ms (25 records)
- [ ] Filter application <300ms
- [ ] Page change <200ms
- [ ] Concurrent requests handled (cancel previous request)
- [ ] Database queries optimized with proper indexes

**AC 4.1.5: Caching Strategy**
- [ ] React Query caches responses for 30 seconds
- [ ] keepPreviousData prevents loading state on page change
- [ ] Optimistic updates for filter changes
- [ ] Cache invalidation on data mutations

**AC 4.1.6: URL Sync**
- [ ] Filter state synced to URL query params
- [ ] Pagination state synced to URL
- [ ] Sort state synced to URL
- [ ] Bookmarkable URLs maintain filter/page state
- [ ] Browser back/forward buttons work correctly

**AC 4.1.7: Pages Requiring Server-Side Implementation**
- [ ] PayLinQ: PayrollRunsPage, TimesheetsPage, WorkersList, PayComponentsList, WorkerTypesList
- [ ] Nexus: EmployeesList, DepartmentsList, LocationsList
- [ ] ScheduleHub: SchedulesList

**AC 4.1.8: Backwards Compatibility**
- [ ] Client-side filtering still works for small datasets (<100 items)
- [ ] Automatic mode switching based on dataset size
- [ ] No breaking changes to existing filter UI

#### Testing Requirements

**Unit Tests:**
```typescript
describe('Server-Side Filtering', () => {
  it('should build correct query params', () => { });
  it('should reset page on filter change', () => { });
  it('should cache responses', () => { });
  it('should sync state with URL', () => { });
});
```

**Integration Tests:**
```typescript
describe('Employees API - Filtering', () => {
  it('should filter by status', () => { });
  it('should paginate results', () => { });
  it('should sort by field', () => { });
  it('should handle combined filters + pagination', () => { });
  it('should return correct pagination metadata', () => { });
});
```

**Performance Tests:**
```typescript
describe('Server-Side Performance', () => {
  it('should load 25 records in <500ms', () => { });
  it('should apply filter in <300ms', () => { });
  it('should change page in <200ms', () => { });
  it('should handle 10k records efficiently', () => { });
});
```

#### Definition of Done

- [ ] Server-side filtering implemented on all specified pages
- [ ] Server-side pagination working
- [ ] Server-side sorting working
- [ ] URL sync implemented
- [ ] Caching strategy implemented
- [ ] Performance benchmarks met
- [ ] Unit tests with >90% coverage
- [ ] Integration tests passing
- [ ] Performance tests passing
- [ ] QA approved in staging

---

### Enhancement 4.2: Filter State Persistence

#### Problem Statement
Users lose their filter selections when navigating away from a page or refreshing the browser, requiring them to reconfigure filters repeatedly.

#### Technical Implementation

**URL-Based Persistence (Primary)**
```typescript
import { useSearchParams } from 'react-router-dom';

function useFiltersFromURL() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse filters from URL
  const filters = {
    status: searchParams.get('status') || '',
    employmentType: searchParams.get('employmentType') || '',
    search: searchParams.get('search') || '',
    fromDate: searchParams.get('fromDate') || '',
    toDate: searchParams.get('toDate') || ''
  };
  
  // Update URL when filters change
  const updateFilters = (newFilters: FilterState) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    setSearchParams(params);
  };
  
  return [filters, updateFilters] as const;
}
```

**localStorage Persistence (Secondary)**
```typescript
function usePersistedFilters(pageKey: string) {
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem(`filters_${pageKey}`);
    return saved ? JSON.parse(saved) : {};
  });
  
  useEffect(() => {
    localStorage.setItem(`filters_${pageKey}`, JSON.stringify(filters));
  }, [filters, pageKey]);
  
  return [filters, setFilters];
}
```

#### Acceptance Criteria

**AC 4.2.1: URL Persistence**
- [ ] All filter values reflected in URL query params
- [ ] Pagination state (page, limit) in URL
- [ ] Sort state (sortBy, sortOrder) in URL
- [ ] URL is bookmarkable (sharing link preserves state)
- [ ] Browser back/forward buttons restore state
- [ ] URL updates without page reload

**AC 4.2.2: localStorage Persistence**
- [ ] Filters saved to localStorage as backup
- [ ] Restored on page load if URL has no params
- [ ] Cleared when user explicitly resets filters
- [ ] Separate storage keys per page
- [ ] Max 30 days retention (automatic cleanup)

**AC 4.2.3: Session Persistence**
- [ ] Filters persist across page navigation within session
- [ ] Returning to page within 30 minutes restores filters
- [ ] New browser tab/window starts fresh (no persistence)

**AC 4.2.4: User Control**
- [ ] "Reset Filters" button clears all persistence
- [ ] Settings option: "Remember my filters" (opt-in)
- [ ] Can set default filters for each page
- [ ] Clear indication when filters are applied

**AC 4.2.5: Edge Cases**
- [ ] Invalid URL params ignored gracefully
- [ ] Malformed JSON in localStorage handled
- [ ] Filters for non-existent values cleared
- [ ] Migration path for schema changes

#### Testing Requirements

**Unit Tests:**
```typescript
describe('Filter Persistence', () => {
  it('should persist filters to URL', () => { });
  it('should restore filters from URL', () => { });
  it('should persist to localStorage', () => { });
  it('should restore from localStorage', () => { });
  it('should clear persistence on reset', () => { });
});
```

**E2E Tests:**
```typescript
test('should persist filters across navigation', async ({ page }) => {
  await page.goto('/employees');
  await page.selectOption('#status-filter', 'active');
  await page.click('button:has-text("Apply")');
  const url = page.url();
  expect(url).toContain('status=active');
  
  // Navigate away and back
  await page.goto('/dashboard');
  await page.goto(url);
  
  // Filter should still be applied
  await expect(page.locator('#status-filter')).toHaveValue('active');
});
```

#### Definition of Done

- [ ] URL persistence implemented on all filter pages
- [ ] localStorage fallback implemented
- [ ] Reset functionality working
- [ ] User settings for persistence created
- [ ] Edge cases handled
- [ ] Unit tests with >90% coverage
- [ ] E2E tests passing
- [ ] User documentation updated
- [ ] QA approved

---

### Enhancement 4.3: Bulk Actions with Filtering

#### Problem Statement
Users need to perform bulk actions (delete, update, export) on filtered subsets, but current implementation requires manual row selection.

#### Acceptance Criteria

**AC 4.3.1: Select Filtered Results**
- [ ] "Select All" checkbox selects all filtered/visible records
- [ ] Indication shows X items selected out of Y total
- [ ] "Select All X Records" button selects all records matching filter (not just current page)
- [ ] Deselect all button clears selection
- [ ] Selection persists across page navigation within same filter

**AC 4.3.2: Bulk Actions Menu**
- [ ] Bulk actions toolbar appears when items selected
- [ ] Shows count: "5 items selected"
- [ ] Actions available: Export, Delete, Update Status, Assign, Send Email
- [ ] Actions respect permissions (role-based)
- [ ] Confirmation dialogs for destructive actions

**AC 4.3.3: Bulk Export**
- [ ] Export selected records to CSV/Excel
- [ ] Export ALL records matching filter (with warning if >1000)
- [ ] Column selection dialog (choose which fields to export)
- [ ] Format options (CSV, Excel, PDF)
- [ ] Progress indicator for large exports
- [ ] Download starts automatically when ready

**AC 4.3.4: Bulk Update**
- [ ] Update status for all selected records
- [ ] Update assignment/owner for selected records
- [ ] Update tags/categories for selected records
- [ ] Batch size: 100 records per API call
- [ ] Progress indicator shows X of Y processed
- [ ] Error handling: Continue on error, show summary at end

**AC 4.3.5: Bulk Delete**
- [ ] Soft delete all selected records
- [ ] Confirmation dialog shows count and irreversibility warning
- [ ] Requires password confirmation for >50 records
- [ ] Admin-only for organization-level deletes
- [ ] Success message shows count deleted

#### Testing Requirements

**Integration Tests:**
```typescript
describe('Bulk Actions API', () => {
  it('should bulk update status', () => { });
  it('should bulk delete records', () => { });
  it('should bulk export to CSV', () => { });
  it('should handle errors in batch', () => { });
  it('should respect rate limits', () => { });
});
```

**E2E Tests:**
```typescript
test('should select and bulk delete filtered records', async ({ page }) => {
  await page.goto('/employees');
  await page.selectOption('#status-filter', 'terminated');
  await page.click('button:has-text("Apply")');
  await page.check('#select-all-checkbox');
  await page.click('button:has-text("Delete Selected")');
  await page.click('button:has-text("Confirm")');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

#### Definition of Done

- [ ] Select all filtered records working
- [ ] Bulk actions menu implemented
- [ ] Export functionality complete
- [ ] Bulk update working
- [ ] Bulk delete working
- [ ] Permission checks in place
- [ ] Integration tests passing
- [ ] E2E tests covering bulk workflows
- [ ] QA approved

---

## 📱 Phase 5: Mobile & Accessibility

**Timeline:** 1-2 weeks  
**Priority:** MEDIUM  
**Risk:** LOW

### Enhancement 5.1: Mobile-Optimized Filters

#### Acceptance Criteria

**AC 5.1.1: Responsive Filter Panel**
- [ ] Filter panel renders as bottom sheet on mobile (<768px)
- [ ] Touch-friendly: Minimum 44x44px touch targets
- [ ] Swipe down to dismiss filter panel
- [ ] Native-like animations and transitions
- [ ] Sticky "Apply" button at bottom

**AC 5.1.2: Mobile Search**
- [ ] Search bar fixed at top when scrolling
- [ ] Search button shows keyboard on focus
- [ ] Clear (X) button visible when text entered
- [ ] Voice search icon (browser native speech input)
- [ ] Search suggestions optimized for touch

**AC 5.1.3: Mobile Filter UI**
- [ ] Dropdowns use native select on mobile
- [ ] Date pickers use native date input
- [ ] Checkboxes and radios larger (24x24px minimum)
- [ ] Filter chips scrollable horizontally
- [ ] Collapse/expand filter groups on mobile

#### Testing Requirements

**Responsive Tests:**
```typescript
test('should render mobile filters correctly', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/employees');
  await page.click('[data-testid="filter-toggle"]');
  await expect(page.locator('.filter-panel')).toHaveClass(/bottom-sheet/);
});
```

#### Definition of Done

- [ ] Mobile filter panel working on all devices
- [ ] Touch targets meet accessibility standards
- [ ] Native inputs used where appropriate
- [ ] Responsive tests passing
- [ ] QA tested on iOS and Android
- [ ] Performance acceptable on low-end devices

---

### Enhancement 5.2: Keyboard Navigation & Accessibility

#### Acceptance Criteria

**AC 5.2.1: Keyboard Navigation**
- [ ] Tab key navigates through filters in logical order
- [ ] Enter key applies filters
- [ ] ESC key closes filter panel
- [ ] Arrow keys navigate dropdown options
- [ ] Space key toggles checkboxes
- [ ] Ctrl/Cmd + F focuses search input
- [ ] Keyboard shortcuts documented and accessible

**AC 5.2.2: Screen Reader Support**
- [ ] ARIA labels on all interactive elements
- [ ] ARIA live regions announce filter changes
- [ ] ARIA expanded/collapsed states for filter panel
- [ ] Screen reader announces result count after filter
- [ ] Landmarks (role="search", role="region") used correctly

**AC 5.2.3: Focus Management**
- [ ] Focus visible indicator (outline) on all focusable elements
- [ ] Focus trapped in modal dialogs
- [ ] Focus restored after closing modal
- [ ] Skip links to jump to main content
- [ ] Focus order logical (matches visual order)

**AC 5.2.4: Color Contrast**
- [ ] All text meets WCAG 2.1 AA standards (4.5:1 ratio)
- [ ] Interactive elements have 3:1 contrast ratio
- [ ] Focus indicators have 3:1 contrast ratio
- [ ] Works in high contrast mode (Windows, dark mode)

**AC 5.2.5: Assistive Technology Testing**
- [ ] Tested with JAWS (Windows)
- [ ] Tested with NVDA (Windows)
- [ ] Tested with VoiceOver (Mac/iOS)
- [ ] Tested with TalkBack (Android)

#### Testing Requirements

**Accessibility Tests:**
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

describe('Filter Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<FilterPanel />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**E2E Accessibility Tests:**
```typescript
test('should be keyboard navigable', async ({ page }) => {
  await page.goto('/employees');
  await page.keyboard.press('Tab'); // Focus on first interactive element
  await page.keyboard.press('Tab'); // Focus on filter button
  await page.keyboard.press('Enter'); // Open filter panel
  await page.keyboard.press('Tab'); // Focus first filter
  await page.keyboard.press('Space'); // Select option
  await page.keyboard.press('Enter'); // Apply filters
});
```

#### Definition of Done

- [ ] Keyboard navigation working on all pages
- [ ] ARIA attributes added correctly
- [ ] Screen reader tested and working
- [ ] Focus management implemented
- [ ] Color contrast verified
- [ ] Accessibility audit passed (axe/WAVE)
- [ ] Unit tests for accessibility
- [ ] E2E keyboard navigation tests passing
- [ ] QA approved

---

## 🔥 Phase 6: Advanced Features

**Timeline:** 2-3 weeks  
**Priority:** LOW (Nice-to-Have)  
**Risk:** MEDIUM

### Enhancement 6.1: Column Customization

#### Acceptance Criteria

**AC 6.1.1: Show/Hide Columns**
- [ ] Column selector dropdown lists all available columns
- [ ] Checkboxes to show/hide columns
- [ ] Drag to reorder columns in selector
- [ ] Column preferences saved per user per page
- [ ] "Reset to Default" restores original column set

**AC 6.1.2: Column Resize**
- [ ] Drag column divider to resize
- [ ] Double-click divider to auto-fit content
- [ ] Column widths saved per user
- [ ] Minimum column width enforced (80px)

**AC 6.1.3: Column Pinning**
- [ ] Pin columns to left (freeze while scrolling)
- [ ] Pin up to 3 columns maximum
- [ ] Visual indicator for pinned columns
- [ ] Pinned columns persist across sessions

#### Definition of Done

- [ ] Column customization UI implemented
- [ ] Preferences saved to backend
- [ ] Resizing and pinning working
- [ ] Reset functionality working
- [ ] QA approved

---

### Enhancement 6.2: Smart Filters (AI-Powered)

#### Acceptance Criteria

**AC 6.2.1: Natural Language Search**
- [ ] Input accepts natural language: "employees hired last quarter"
- [ ] AI parses query and applies appropriate filters
- [ ] Shows interpretation: "Showing employees where hire_date >= 2024-10-01"
- [ ] User can confirm or refine interpretation

**AC 6.2.2: Suggested Filters**
- [ ] AI suggests filters based on current context
- [ ] Learns from user behavior (frequently used filters)
- [ ] "People also filtered by..." recommendations
- [ ] One-click to apply suggested filter

**AC 6.2.3: Smart Search History**
- [ ] AI groups similar searches
- [ ] Suggests refinements to previous searches
- [ ] "Did you mean..." for typos
- [ ] Trend analysis: "40% more searches for 'remote' this month"

#### Definition of Done

- [ ] Natural language parsing working
- [ ] AI suggestion engine implemented
- [ ] Smart history tracking
- [ ] Privacy and data usage disclosures added
- [ ] QA approved

---

### Enhancement 6.3: Advanced Export with Filtering

#### Acceptance Criteria

**AC 6.3.1: Export Options**
- [ ] Export formats: CSV, Excel, PDF, JSON
- [ ] Export filtered results or all data
- [ ] Choose columns to export
- [ ] Apply additional sorting before export

**AC 6.3.2: Scheduled Exports**
- [ ] Save export configuration with name
- [ ] Schedule recurring exports (daily, weekly, monthly)
- [ ] Email export to specified recipients
- [ ] Export history and re-download past exports

**AC 6.3.3: Export Performance**
- [ ] Async processing for exports >1000 records
- [ ] Progress indicator with ETA
- [ ] Email notification when ready
- [ ] Exports expire after 7 days

#### Definition of Done

- [ ] Export functionality complete for all formats
- [ ] Scheduled exports working
- [ ] Async processing for large exports
- [ ] Email notifications working
- [ ] Export history page created
- [ ] QA approved

---

## 📊 Implementation Priority Matrix

| Enhancement | Impact | Effort | Priority | Phase | Timeline |
|-------------|--------|--------|----------|-------|----------|
| **1.1** Missing Search | HIGH | LOW | **CRITICAL** | 1 | Week 1 |
| **1.2** Standardize FilterPanel | HIGH | LOW | **CRITICAL** | 1 | Week 1-2 |
| **2.1** Date Range Filters | HIGH | MEDIUM | **HIGH** | 2 | Week 2-3 |
| **2.2** Multi-Select Filters | HIGH | LOW | **HIGH** | 2 | Week 3 |
| **2.3** Saved Filter Presets | MEDIUM | MEDIUM | **HIGH** | 2 | Week 3-4 |
| **3.1** Full-Text Search | HIGH | MEDIUM | **HIGH** | 3 | Week 4-5 |
| **3.2** Search Suggestions | MEDIUM | MEDIUM | **MEDIUM** | 3 | Week 5 |
| **3.3** Advanced Search Modal | MEDIUM | HIGH | **MEDIUM** | 3 | Week 6-7 |
| **4.1** Server-Side Filtering | HIGH | HIGH | **MEDIUM** | 4 | Week 7-8 |
| **4.2** Filter Persistence | MEDIUM | LOW | **MEDIUM** | 4 | Week 8 |
| **4.3** Bulk Actions | MEDIUM | MEDIUM | **MEDIUM** | 4 | Week 8-9 |
| **5.1** Mobile Optimization | MEDIUM | MEDIUM | **LOW** | 5 | Week 9 |
| **5.2** Accessibility | HIGH | MEDIUM | **HIGH** | 5 | Week 9-10 |
| **6.1** Column Customization | LOW | MEDIUM | **LOW** | 6 | Week 11 |
| **6.2** Smart Filters (AI) | LOW | HIGH | **LOW** | 6 | Week 11-12 |
| **6.3** Advanced Export | LOW | MEDIUM | **LOW** | 6 | Week 12-13 |

---

## 🎨 UI/UX Best Practices from Industry Leaders

### 📌 Linear (Project Management)

**What They Do Well:**
- Instant search with `Cmd+K` shortcut
- Fuzzy matching: "prj" matches "project"
- Search across multiple entity types (issues, projects, teams)
- Keyboard navigation: Arrow keys, Enter to select
- Visual grouping by entity type

**Apply to RecruitIQ:**
- Add global search with `Ctrl/Cmd+F` shortcut
- Implement fuzzy search across employees, jobs, schedules
- Group results by entity type in suggestions dropdown

---

### 📝 Notion (Knowledge Management)

**What They Do Well:**
- Advanced filters with AND/OR logic
- Filter templates/presets saved per view
- Filter pills show active filters at a glance
- Can duplicate and modify filters quickly
- "Add a filter group" for nested conditions

**Apply to RecruitIQ:**
- Implement filter presets (Enhancement 2.3)
- Add filter pills/chips above data table
- Support nested filter groups in advanced search

---

### 📊 Airtable (Database/Spreadsheet)

**What They Do Well:**
- Column-specific filters (click column header → filter)
- Multiple filter operators per data type
- Visual filter builder (no code required)
- Filter by linked records (relational filtering)
- Hide/show columns easily

**Apply to RecruitIQ:**
- Add quick filters in column headers
- Implement column customization (Enhancement 6.1)
- Support filtering by related entities (e.g., filter employees by department name)

---

### 📧 Gmail (Email Client)

**What They Do Well:**
- Search operators: `from:`, `to:`, `subject:`, `has:attachment`
- Search suggestions appear instantly
- Filter chips removable individually
- Advanced search modal for power users
- Saved searches as labels

**Apply to RecruitIQ:**
- Support field-specific search syntax (e.g., `email:john@example.com`)
- Implement search suggestions (Enhancement 3.2)
- Add advanced search modal (Enhancement 3.3)

---

## 🧪 Testing Strategy

### Unit Tests (Jest + React Testing Library)

**Target Coverage:** 90%+

```typescript
describe('FilterPanel Component', () => {
  it('should render all filter types', () => { });
  it('should apply filters on submit', () => { });
  it('should reset filters', () => { });
  it('should persist to localStorage', () => { });
  it('should validate date ranges', () => { });
  it('should handle multi-select', () => { });
});

describe('useFilters Hook', () => {
  it('should sync filters with URL', () => { });
  it('should debounce search input', () => { });
  it('should cache API responses', () => { });
});
```

### Integration Tests (Supertest)

**Target Coverage:** 85%+

```typescript
describe('Employees API - Filtering', () => {
  it('GET /api/employees?status=active should return only active', () => { });
  it('GET /api/employees?search=john should search multiple fields', () => { });
  it('GET /api/employees with date range should filter by hire_date', () => { });
  it('GET /api/employees with pagination should return correct page', () => { });
  it('should enforce tenant isolation in filters', () => { });
});
```

### E2E Tests (Playwright)

**Critical User Journeys:**

```typescript
test('Employee Search and Filter Journey', async ({ page }) => {
  // 1. Navigate to employees
  await page.goto('/employees');
  
  // 2. Use search
  await page.fill('[data-testid="search-input"]', 'john');
  await expect(page.locator('table tbody tr')).toHaveCount(5);
  
  // 3. Apply status filter
  await page.click('[data-testid="filter-toggle"]');
  await page.check('input[value="active"]');
  await page.click('button:has-text("Apply")');
  
  // 4. Verify filtered results
  await expect(page.locator('table tbody tr')).toHaveCount(3);
  
  // 5. Save filter preset
  await page.click('button:has-text("Save Preset")');
  await page.fill('#preset-name', 'Active Johns');
  await page.click('button:has-text("Save")');
  
  // 6. Navigate away and back
  await page.goto('/dashboard');
  await page.goto('/employees');
  
  // 7. Load saved preset
  await page.selectOption('[data-testid="preset-selector"]', 'Active Johns');
  
  // 8. Verify filters restored
  await expect(page.locator('[data-testid="search-input"]')).toHaveValue('john');
});
```

### Performance Tests (Lighthouse / Custom)

**Benchmarks:**

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Initial Page Load | <1s | <2s |
| Search Response Time | <100ms (client) | <300ms |
| Filter Application | <200ms | <500ms |
| API Response Time | <300ms | <1s |
| Full-Text Search | <200ms | <500ms |
| Export Generation (1000 records) | <5s | <10s |

---

## 📈 Expected Impact

### 🎯 User Efficiency

- **50% reduction** in time spent configuring filters (with presets)
- **30% faster** search with fuzzy matching and suggestions
- **40% reduction** in page load time (server-side pagination)
- **20% increase** in feature adoption (improved discoverability)

### 📊 System Performance

- **60% reduction** in initial data transfer (pagination)
- **80% faster** search queries (full-text search with indexes)
- **70% reduction** in database load (efficient filtering)

### ♿ Accessibility

- **100% WCAG 2.1 AA compliance** for filters and search
- **Support for screen readers** (NVDA, JAWS, VoiceOver)
- **Full keyboard navigation** for all filter features

---

## 🚀 Quick Start Guide for Developers

### Phase 1 Implementation

1. **Clone FilterPanel to shared package:**
   ```bash
   cp apps/paylinq/src/components/ui/FilterPanel.tsx packages/ui/src/FilterPanel.tsx
   ```

2. **Update imports in PayLinQ:**
   ```typescript
   import { FilterPanel } from '@recruitiq/ui';
   ```

3. **Add search to SchedulesList:**
   ```typescript
   const [searchQuery, setSearchQuery] = useState('');
   const filteredSchedules = schedules.filter(s => 
     s.title.toLowerCase().includes(searchQuery.toLowerCase())
   );
   ```

4. **Test and deploy to staging.**

---

## 📚 Resources & References

- **React Query Documentation:** https://tanstack.com/query/latest/docs/react/overview
- **Fuse.js (Fuzzy Search):** https://fusejs.io/
- **PostgreSQL Full-Text Search:** https://www.postgresql.org/docs/current/textsearch.html
- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/

---

## ✅ Final Checklist

### Before Starting Implementation

- [ ] Review and approve enhancement plan with stakeholders
- [ ] Prioritize enhancements based on business needs
- [ ] Allocate development resources for each phase
- [ ] Set up testing environments
- [ ] Create project tracking board (Jira/Linear)

### During Implementation

- [ ] Follow acceptance criteria strictly
- [ ] Write tests before/during feature development (TDD)
- [ ] Conduct code reviews for all changes
- [ ] Update documentation as features are completed
- [ ] Perform accessibility audits regularly

### After Implementation

- [ ] Complete all unit, integration, and E2E tests
- [ ] Conduct performance testing and optimization
- [ ] Run full accessibility audit (WCAG 2.1 AA)
- [ ] User acceptance testing (UAT) with real users
- [ ] Create user documentation and training materials
- [ ] Deploy to production with monitoring

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-20  
**Author:** GitHub Copilot  
**Status:** Ready for Review

