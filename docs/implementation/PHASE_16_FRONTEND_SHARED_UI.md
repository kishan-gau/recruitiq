# Phase 16: Frontend - Shared UI Component Library

**Duration:** 4 days  
**Dependencies:** None (can run in parallel)  
**Team:** Frontend Team (2 developers) + UX Designer  
**Status:** Not Started

---

## 📋 Overview

This phase creates the `@recruitiq/shared-ui` component library containing reusable UI components, hooks, utilities, and styling that will be shared across all three product frontends (RecruitIQ, Paylinq, Nexus) and the admin portal.

**CRITICAL:** All components MUST follow the unified RecruitIQ Design System documented in `/docs/DESIGN_SYSTEM.md`.

### Design System Requirements

The shared UI library enforces design consistency across all products:

- **Brand Colors:** Emerald (#10b981) as primary, with product-specific accent colors (Teal/Blue/Purple) used sparingly
- **Typography:** Inter font family with weights 300, 400, 600, 700
- **Dark Mode:** Class-based toggling with `.dark` prefix for all component styles
- **Spacing:** Tailwind spacing scale (0, 1, 2, 3, 4, 6, 8, 12, 16) - 4px increments
- **Transitions:** 220ms cubic-bezier(.2,.9,.2,1) for standard interactions
- **Interactive States:** Consistent focus rings, hover effects, active states
- **Accessibility:** WCAG 2.1 Level AA compliance (keyboard navigation, ARIA labels, screen reader support)
- **Animations:** Shake (validation errors), fadeIn (tooltips/dropdowns)

See `/docs/DESIGN_SYSTEM.md` for complete specifications including component patterns, color values, animation keyframes, and implementation guidelines.

---

## 🎯 Objectives

1. Create shared-ui package structure
2. Implement core UI components
3. Create shared hooks and utilities
4. Set up Tailwind CSS configuration
5. Create Storybook documentation
6. Publish as npm package
7. Set up automated testing

---

## 📊 Deliverables

### 1. Package Structure

```
shared-ui/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.js
├── .storybook/
│   └── main.js
├── src/
│   ├── index.ts
│   ├── components/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Table/
│   │   ├── Modal/
│   │   ├── Card/
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   └── ...
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── ...
│   └── styles/
│       ├── theme.ts
│       └── globals.css
└── tests/
```

### 2. Core Components

**File:** `shared-ui/src/components/Button/Button.tsx`

```typescript
/**
 * Button Component
 * Reusable button with multiple variants
 */
import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    disabled,
    icon,
    children,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent hover:bg-gray-100 focus:ring-gray-500'
    };
    
    const sizes = {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-base px-4 py-2',
      lg: 'text-lg px-6 py-3'
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          (disabled || loading) && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### 3. Shared Hooks

**File:** `shared-ui/src/hooks/useApi.ts`

```typescript
/**
 * useApi Hook
 * Generic API call hook with loading/error states
 */
import { useState, useCallback } from 'react';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showNotification?: boolean;
}

export interface UseApiReturn<T, P = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (params?: P, config?: AxiosRequestConfig) => Promise<T | undefined>;
  reset: () => void;
}

export function useApi<T = any, P = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  options?: UseApiOptions<T>
): UseApiReturn<T, P> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (params?: P, config?: AxiosRequestConfig) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios({
        url,
        method,
        data: method !== 'GET' ? params : undefined,
        params: method === 'GET' ? params : undefined,
        ...config
      });

      setData(response.data.data || response.data);
      options?.onSuccess?.(response.data.data || response.data);
      
      return response.data.data || response.data;
    } catch (err) {
      const error = err as AxiosError;
      const errorMessage = error.response?.data?.message || error.message;
      const errorObj = new Error(errorMessage);
      
      setError(errorObj);
      options?.onError?.(errorObj);
      
      if (options?.showNotification !== false) {
        // Show error notification (implementation depends on notification system)
        console.error('API Error:', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [url, method, options]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, execute, reset };
}
```

### 4. Package Configuration

**File:** `shared-ui/package.json`

```json
{
  "name": "@recruitiq/shared-ui",
  "version": "1.0.0",
  "description": "Shared UI components for RecruitIQ platform",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "lint": "eslint src --ext ts,tsx",
    "publish:local": "npm pack && npm install -g $(npm pack | tail -1)"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "dependencies": {
    "clsx": "^2.0.0",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@storybook/react": "^7.6.0",
    "@storybook/react-vite": "^7.6.0",
    "@testing-library/react": "^14.1.0",
    "@types/react": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### 5. Component Library Index

**File:** `shared-ui/src/index.ts`

```typescript
/**
 * Shared UI Library - Main Export
 */

// Components
export { Button } from './components/Button/Button';
export { Input } from './components/Input/Input';
export { Table } from './components/Table/Table';
export { Modal } from './components/Modal/Modal';
export { Card } from './components/Card/Card';
export { Badge } from './components/Badge/Badge';
export { Dropdown } from './components/Dropdown/Dropdown';
export { Tabs } from './components/Tabs/Tabs';
export { Alert } from './components/Alert/Alert';
export { Spinner } from './components/Spinner/Spinner';

// Hooks
export { useApi } from './hooks/useApi';
export { useAuth } from './hooks/useAuth';
export { useDebounce } from './hooks/useDebounce';
export { usePagination } from './hooks/usePagination';

// Utils
export { cn } from './utils/cn';
export { formatDate, formatCurrency, formatPhone } from './utils/formatters';
export { validateEmail, validatePhone } from './utils/validators';

// Types
export type { ButtonProps } from './components/Button/Button';
export type { InputProps } from './components/Input/Input';
export type { TableProps, TableColumn } from './components/Table/Table';
export type { ModalProps } from './components/Modal/Modal';
export type { UseApiReturn } from './hooks/useApi';

// Theme
export { theme } from './styles/theme';
```

---

## 🔍 Detailed Tasks

### Task 16.1: Setup Package Structure (0.5 days)

**Assignee:** Frontend Developer 1

**Actions:**
1. Create shared-ui directory
2. Initialize npm package
3. Configure TypeScript
4. Configure Tailwind CSS
5. Set up build system (Vite)

**Standards:** Follow FRONTEND_STANDARDS.md

### Task 16.2: Create Core Components (2 days)

**Assignee:** Frontend Developer 1 + 2

**Actions:**
1. Button, Input, Select components
2. Table, Card, Modal components
3. Badge, Alert, Spinner components
4. Tabs, Dropdown components
5. Write unit tests for each

**Standards:** Follow FRONTEND_STANDARDS.md

### Task 16.3: Create Shared Hooks (0.5 days)

**Assignee:** Frontend Developer 2

**Actions:**
1. useApi hook
2. useAuth hook
3. usePagination hook
4. useDebounce hook
5. Test all hooks

**Standards:** Follow FRONTEND_STANDARDS.md

### Task 16.4: Create Utilities (0.5 days)

**Assignee:** Frontend Developer 1

**Actions:**
1. Formatters (date, currency, phone)
2. Validators (email, phone, etc.)
3. Class name utility (cn)
4. Test all utilities

**Standards:** Follow FRONTEND_STANDARDS.md

### Task 16.5: Setup Storybook (0.5 days)

**Assignee:** Frontend Developer 2

**Actions:**
1. Configure Storybook
2. Create stories for all components
3. Add interaction tests
4. Deploy Storybook docs

**Standards:** Follow DOCUMENTATION_STANDARDS.md

### Task 16.6: Testing & Publishing (0.5 days)

**Assignee:** Frontend Team

**Actions:**
1. Write comprehensive tests
2. Achieve 80%+ coverage
3. Build library
4. Publish to npm (or local registry)
5. Test installation in product apps

**Standards:** Follow TESTING_STANDARDS.md

---

## 📋 Standards Compliance Checklist

- [ ] TypeScript for all code
- [ ] Component props fully typed
- [ ] Accessibility standards met (WCAG 2.1)
- [ ] Tests achieve 80%+ coverage
- [ ] Storybook documentation complete
- [ ] Code follows FRONTEND_STANDARDS.md
- [ ] All components responsive
- [ ] Theme tokens used consistently

---

## 🎯 Success Criteria

Phase 16 is complete when:

1. ✅ All core components implemented
2. ✅ All shared hooks implemented
3. ✅ Utility functions complete
4. ✅ Storybook documentation deployed
5. ✅ Tests pass (80%+ coverage)
6. ✅ Package published and installable
7. ✅ Successfully imported in one product app
8. ✅ Code review approved

---

## 📤 Outputs

### Code Created
- [ ] shared-ui/ package with all components
- [ ] Storybook documentation
- [ ] Unit tests for all components
- [ ] Published npm package

### Documentation Created
- [ ] Component API documentation
- [ ] Usage examples in Storybook
- [ ] Integration guide

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Component API changes break products | High | Semantic versioning; changelog; migration guides |
| Performance issues with large tables | Medium | Virtual scrolling; pagination |
| Accessibility gaps | Medium | Automated testing; manual audit |
| Theme inconsistencies | Low | Design tokens; style guide |

---

## 🔗 Related Phases

- **Previous:** [Phase 15: Nexus to Paylinq Integration](./PHASE_15_INTEGRATION_HRIS_PAYROLL.md)
- **Next:** [Phase 17: Frontend - Paylinq Application](./PHASE_17_FRONTEND_PAYLINQ.md)
- **Related:** All frontend phases (17-19)

---

**Phase Owner:** Frontend Team Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start
