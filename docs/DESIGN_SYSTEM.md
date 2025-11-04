# RecruitIQ Multi-Product Design System

**Version:** 1.0  
**Last Updated:** November 3, 2025  
**Status:** Active

---

## 📋 Overview

This document defines the unified design system for all RecruitIQ products (RecruitIQ ATS, Paylinq Payroll, Nexus HRIS). All applications share the same visual language, components, and interaction patterns to provide a consistent user experience across the platform.

---

## 🎨 Brand Colors & Product Theming

### Core Brand Color
**Primary Brand:** Emerald/Teal
- Used across all products for consistency
- Primary action buttons, links, active states

### Product-Specific Accent Colors
While the primary brand color remains emerald, each product has a subtle accent color for differentiation:

#### RecruitIQ (ATS)
- **Primary:** `emerald-500` (#10b981)
- **Accent:** `teal-500` (#14b8a6)
- **Logo:** Green "RI" in emerald gradient
- **Theme Color:** `#0ea5a4`

#### Paylinq (Payroll)
- **Primary:** `emerald-500` (#10b981) - Keep brand consistency
- **Accent:** `blue-500` (#3b82f6) - For financial/data emphasis
- **Logo:** "PL" in emerald gradient with blue accent
- **Theme Color:** `#0ea5a4`

#### Nexus (HRIS)
- **Primary:** `emerald-500` (#10b981) - Keep brand consistency
- **Accent:** `purple-500` (#a855f7) - For people/HR focus
- **Logo:** "NX" in emerald gradient with purple accent
- **Theme Color:** `#0ea5a4`

### Color Palette

```javascript
// Tailwind color classes used across all products
colors: {
  // Primary Brand (all products)
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',
    600: '#059669',
    700: '#047857'
  },
  
  // Neutrals (all products)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a'
  },
  
  // Product Accents
  teal: { 500: '#14b8a6' },    // RecruitIQ
  blue: { 500: '#3b82f6' },     // Paylinq
  purple: { 500: '#a855f7' },   // Nexus
  
  // Status Colors
  red: { 500: '#ef4444' },      // Error/Danger
  yellow: { 500: '#eab308' },   // Warning
  green: { 500: '#22c55e' }     // Success
}
```

---

## 🔤 Typography

### Font Family
**Primary:** `Inter` (Google Fonts)
- Fallback: `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial`

### Font Weights
- Light: `300`
- Regular: `400`
- Semibold: `600`
- Bold: `700`

### Typography Scale
```css
/* Headings */
.text-3xl  /* 1.875rem / 30px - Page titles */
.text-2xl  /* 1.5rem / 24px - Section headers */
.text-xl   /* 1.25rem / 20px - Card headers */
.text-lg   /* 1.125rem / 18px - Subheaders */

/* Body */
.text-base /* 1rem / 16px - Body text */
.text-sm   /* 0.875rem / 14px - Secondary text */
.text-xs   /* 0.75rem / 12px - Labels, captions */
```

---

## 🎭 Dark Mode

All products support dark mode via class-based toggling.

### Implementation
```html
<html class="dark">
  <!-- Dark mode active -->
</html>
```

### Dark Mode Color Overrides
```css
/* Background */
.dark body { background: #0f172a }
.dark .bg-white { background: #1e293b }
.dark .bg-slate-50 { background: #1e293b }
.dark .bg-slate-100 { background: #334155 }

/* Text */
.dark .text-slate-800 { color: #e2e8f0 }
.dark .text-slate-500 { color: #94a3b8 }
.dark .text-slate-600 { color: #cbd5e1 }

/* Brand Colors in Dark Mode */
.dark .bg-emerald-50 { background: rgba(16,185,129,0.1) }
.dark .bg-emerald-100 { background: rgba(16,185,129,0.15) }
.dark .bg-emerald-500 { background: linear-gradient(180deg,#059669,#10b981) }

/* Borders */
.dark .border { border-color: rgba(255,255,255,0.1) }

/* Shadows */
.dark .shadow { box-shadow: 0 4px 12px rgba(0,0,0,0.3) }
.dark .shadow-sm { box-shadow: 0 1px 3px rgba(0,0,0,0.3) }
.dark .shadow-md { box-shadow: 0 4px 16px rgba(0,0,0,0.4) }
```

---

## 📦 Component Library

All products use components from `@recruitiq/shared-ui` package with consistent styling.

### Core Components

#### Card
```jsx
<Card className="p-4 bg-white rounded shadow-sm">
  {children}
</Card>
```

#### Button
```jsx
// Primary (emerald)
<Button variant="primary">Save</Button>

// Secondary (slate)
<Button variant="secondary">Cancel</Button>

// Danger (red)
<Button variant="danger">Delete</Button>

// Success (green)
<Button variant="success">Approve</Button>

// Product accent (use sparingly for product-specific actions)
<Button variant="accent">Product Action</Button>
```

#### Badge
```jsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Rejected</Badge>
<Badge variant="info">Draft</Badge>
```

#### Modal
```jsx
<Modal
  open={isOpen}
  onClose={onClose}
  title="Modal Title"
  size="md" // sm, md, lg, xl, full
  zIndex="z-50"
>
  {content}
</Modal>
```

#### Table
```jsx
<Table
  columns={columns}
  data={data}
  loading={loading}
  onRowClick={handleRowClick}
/>
```

---

## 🏗️ Layout Structure

### Application Shell
All products follow the same layout structure:

```
┌─────────────────────────────────────────────┐
│  Header (72px fixed)                        │
│  - Logo, Product Name, Search, User Menu   │
├──────────┬──────────────────────────────────┤
│          │                                  │
│  Sidebar │  Main Content Area               │
│  (256px  │  - Page Header                   │
│   or     │  - Page Content                  │
│   72px)  │  - Cards, Tables, Forms          │
│          │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

### Header
- Height: `72px`
- Background: `bg-white dark:bg-slate-800`
- Border: `border-b border-slate-200 dark:border-slate-700`
- Content: Logo, Product Name, Quick Search, Avatar Menu

### Sidebar
- Width: `256px` (expanded) / `72px` (collapsed)
- Background: `bg-white dark:bg-slate-800`
- Shadow: `shadow-sm`
- Collapsible with localStorage persistence

### Main Content
- Background: `bg-slate-50 dark:bg-slate-900`
- Padding: `p-6` or `p-8` for desktop
- Max width: `max-w-7xl` for centered content (optional)

---

## 🎯 Interactive States

### Focus States
```css
.focus-ring:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(6,95,70,0.12);
  border-radius: 6px;
}
```

### Hover States
- Buttons: Slight darkening of background
- Cards: Subtle shadow increase
- Links: Underline or color change

### Active States
- Navigation: Animated pill background with emerald tint
- Buttons: Pressed appearance with scale transform
- Checkboxes/Radio: Emerald fill

### Loading States
```jsx
<div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
```

---

## ✨ Animations & Transitions

### Standard Transitions
```css
/* Smooth easing for most interactions */
transition: all 220ms cubic-bezier(.2,.9,.2,1);

/* Quick interactions (hover, focus) */
transition: all 160ms ease;

/* Layout changes (sidebar collapse) */
transition: width 180ms cubic-bezier(.2,.9,.2,1);
```

### Custom Animations
```css
/* Shake (validation errors) */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

/* Fade In (tooltips, dropdowns) */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Framer Motion
Used for complex animations (sidebar pills, modals, page transitions)

---

## 📱 Responsive Design

### Breakpoints
```javascript
// Tailwind default breakpoints
{
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px'
}
```

### Mobile Considerations
- Sidebar collapses to drawer on `< md`
- Tables become scrollable or stack on mobile
- Forms use full-width inputs on mobile
- Touch-friendly tap targets (min 44x44px)

---

## ♿ Accessibility

### Standards
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader friendly
- Focus indicators on all interactive elements
- Proper ARIA labels and roles

### Implementation
- Use semantic HTML
- Include `aria-label` on icon-only buttons
- Focus trap in modals
- Escape key closes modals
- Focus management on route changes

---

## 📐 Spacing Scale

Consistent spacing using Tailwind's scale:
```
0   - 0px
1   - 0.25rem / 4px
2   - 0.5rem / 8px
3   - 0.75rem / 12px
4   - 1rem / 16px
6   - 1.5rem / 24px
8   - 2rem / 32px
12  - 3rem / 48px
16  - 4rem / 64px
```

### Common Patterns
- Card padding: `p-4` or `p-6`
- Section spacing: `mb-6` or `mb-8`
- Form field spacing: `space-y-4`
- Button padding: `px-4 py-2` or `px-6 py-3`

---

## 🎨 Product-Specific Customizations

### Logo Rendering
Each product displays its logo in the sidebar and header:

```jsx
// RecruitIQ
<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow">
  RI
</div>

// Paylinq
<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold shadow">
  PL
</div>

// Nexus
<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-purple-500 flex items-center justify-center text-white font-bold shadow">
  NX
</div>
```

### Navigation Accent Colors
Use product accent colors sparingly:
- Active navigation pill: Keep emerald for consistency
- Subtle product branding: Use in small badges, icons, or decorative elements
- Data visualization: Use accent colors for charts and graphs

---

## 🔧 Implementation Guidelines

### Tailwind Configuration
All products share the same `tailwind.config.js`:

```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      }
    },
  },
  plugins: [],
}
```

### CSS Base
All products import the same base styles from shared-ui or duplicate:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  background: #f8fafc;
  font-family: Inter, ui-sans-serif, system-ui;
}
```

### Component Imports
```javascript
// Shared components
import { Button, Card, Table, Modal, Badge } from '@recruitiq/shared-ui';

// Product-specific components
import WorkerTypeCard from '../components/WorkerTypeCard';
```

---

## 📝 Best Practices

1. **Consistency First:** Always use shared components before creating custom ones
2. **Emerald for Actions:** Use emerald-500 for all primary CTAs across products
3. **Dark Mode:** Test all UI in both light and dark modes
4. **Accessibility:** Include proper labels, focus states, and keyboard navigation
5. **Performance:** Use lazy loading, code splitting, and optimized images
6. **Responsive:** Mobile-first approach with progressive enhancement
7. **Animation:** Keep animations subtle and purposeful (220ms standard)
8. **Spacing:** Use consistent spacing scale (4px increments)
9. **Typography:** Limit font sizes to defined scale
10. **Product Branding:** Use accent colors sparingly for subtle differentiation

---

## 🚀 Getting Started

### For New Products
1. Copy `tailwind.config.js` from RecruitIQ
2. Import base styles from shared-ui or create matching `index.css`
3. Use `@recruitiq/shared-ui` components
4. Follow layout structure (Header + Sidebar + Main)
5. Implement dark mode support
6. Add product logo with appropriate gradient

### For Component Development
1. Start with shared-ui components
2. Extend with Tailwind classes
3. Follow naming conventions
4. Support dark mode
5. Include accessibility features
6. Document props and usage

---

**Maintained by:** Frontend Team  
**Questions?** Contact: frontend-team@recruitiq.com
