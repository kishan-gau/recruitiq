# Phase 1: Foundation & Infrastructure

**Phase Duration:** Weeks 1-2 (80-120 hours)  
**Team Size:** 3-4 developers  
**Focus:** Setup unified application structure and shared infrastructure  

---

## Phase Objectives

### Primary Goals
1. **Create unified frontend application structure**
2. **Establish shared infrastructure and build system**
3. **Implement product-aware routing foundation**
4. **Setup authentication and authorization framework**
5. **Create development workflow and tooling**

### Success Criteria
- [ ] Unified app structure created and building successfully
- [ ] All existing shared packages integrated
- [ ] Basic product routing working with authentication
- [ ] Development environment fully functional
- [ ] Initial CI/CD pipeline operational

## Week 1: Application Foundation

### Day 1-2: Project Structure Setup

#### Task 1.1: Create Unified Application
**Owner:** Technical Lead  
**Duration:** 8 hours  
**Priority:** Critical

```bash
# Create new unified frontend app
mkdir -p apps/unified-frontend
cd apps/unified-frontend

# Initialize new Vite + React + TypeScript project
pnpm create vite . --template react-ts
```

**Directory Structure:**
```
apps/unified-frontend/
├── public/
├── src/
│   ├── modules/           # Product modules
│   │   ├── nexus/         # HRIS modules (empty initially)
│   │   ├── paylinq/       # Payroll modules (empty initially)  
│   │   ├── recruitiq/     # ATS modules (empty initially)
│   │   └── shared/        # Cross-product modules
│   ├── layouts/           # Product-specific layouts
│   │   ├── NexusLayout.tsx
│   │   ├── PaylinqLayout.tsx
│   │   ├── RecruitiqLayout.tsx
│   │   └── SharedLayout.tsx
│   ├── routing/           # Routing configuration
│   │   ├── index.tsx      # Main router
│   │   ├── ProtectedRoute.tsx
│   │   ├── ProductRoute.tsx
│   │   └── routes.ts      # Route definitions
│   ├── shared/            # App-wide utilities
│   │   ├── components/    # Shared components
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
│   ├── App.tsx           # Main application
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

#### Task 1.2: Package Configuration
**Owner:** Senior Developer 1  
**Duration:** 4 hours  
**Priority:** Critical

```json
// package.json
{
  "name": "@recruitiq/unified-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "@recruitiq/auth": "workspace:*",
    "@recruitiq/api-client": "workspace:*", 
    "@recruitiq/types": "workspace:*",
    "@recruitiq/ui": "workspace:*",
    "@recruitiq/utils": "workspace:*",
    "@tanstack/react-query": "^5.0.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.445.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

#### Task 1.3: Build Configuration  
**Owner:** Senior Developer 1  
**Duration:** 6 hours  
**Priority:** High

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@modules': resolve(__dirname, './src/modules'),
      '@layouts': resolve(__dirname, './src/layouts'),
      '@routing': resolve(__dirname, './src/routing'),
      '@shared': resolve(__dirname, './src/shared'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          auth: ['@recruitiq/auth'],
          ui: ['@recruitiq/ui'],
          nexus: ['./src/modules/nexus'],
          paylinq: ['./src/modules/paylinq'], 
          recruitiq: ['./src/modules/recruitiq'],
        },
      },
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

### Day 3-4: Core Infrastructure

#### Task 1.4: Authentication Integration
**Owner:** Senior Developer 2  
**Duration:** 8 hours  
**Priority:** Critical

**src/App.tsx:**
```typescript
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@recruitiq/auth'
import { Router } from '@routing/index'
import { ToastProvider } from '@shared/components/ToastProvider'
import ErrorBoundary from '@shared/components/ErrorBoundary'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <Router />
            </ToastProvider>
          </QueryClientProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
```

#### Task 1.5: Product-Aware Routing
**Owner:** Senior Developer 2  
**Duration:** 12 hours  
**Priority:** Critical

**src/routing/ProductRoute.tsx:**
```typescript
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@recruitiq/auth'
import { ProtectedRoute } from '@recruitiq/auth'

interface ProductRouteProps {
  children: React.ReactNode
  requiredProduct: string
  fallbackPath?: string
}

export function ProductRoute({ 
  children, 
  requiredProduct, 
  fallbackPath = '/' 
}: ProductRouteProps) {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <ProtectedRoute>
      {user?.enabledProducts?.includes(requiredProduct) ? (
        children
      ) : (
        <Navigate 
          to={fallbackPath} 
          state={{ from: location, missingProduct: requiredProduct }} 
          replace 
        />
      )}
    </ProtectedRoute>
  )
}
```

**src/routing/routes.ts:**
```typescript
export interface RouteDefinition {
  path: string
  component: React.LazyExoticComponent<() => JSX.Element>
  requiredProduct?: string
  layout?: string
  title?: string
}

export const routes: RouteDefinition[] = [
  // Public routes
  {
    path: '/login',
    component: React.lazy(() => import('@shared/pages/Login')),
    title: 'Login'
  },
  
  // Dashboard
  {
    path: '/',
    component: React.lazy(() => import('@shared/pages/Dashboard')),
    title: 'Dashboard'
  },
  
  // Nexus HRIS routes (to be populated in Phase 2)
  {
    path: '/nexus/*',
    component: React.lazy(() => import('@modules/nexus/NexusModule')),
    requiredProduct: 'nexus',
    layout: 'nexus',
    title: 'HRIS'
  },
  
  // PayLinQ Payroll routes (to be populated in Phase 2)
  {
    path: '/paylinq/*',
    component: React.lazy(() => import('@modules/paylinq/PaylinqModule')),
    requiredProduct: 'paylinq',
    layout: 'paylinq', 
    title: 'Payroll'
  },
  
  // RecruitIQ ATS routes (to be populated in Phase 2)
  {
    path: '/recruitiq/*',
    component: React.lazy(() => import('@modules/recruitiq/RecruitiqModule')),
    requiredProduct: 'recruitiq',
    layout: 'recruitiq',
    title: 'Recruitment'
  },
]
```

#### Task 1.6: Layout System
**Owner:** Frontend Developer  
**Duration:** 10 hours  
**Priority:** High

**src/layouts/SharedLayout.tsx:**
```typescript
import React from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@recruitiq/auth'
import Navigation from '@shared/components/Navigation'
import Header from '@shared/components/Header'
import Sidebar from '@shared/components/Sidebar'

export default function SharedLayout() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <div className="flex">
        <Sidebar enabledProducts={user?.enabledProducts || []} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

### Day 5: Development Tooling

#### Task 1.7: Testing Setup
**Owner:** QA Engineer  
**Duration:** 6 hours  
**Priority:** Medium

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@modules': resolve(__dirname, './src/modules'),
      '@layouts': resolve(__dirname, './src/layouts'),
      '@routing': resolve(__dirname, './src/routing'),
      '@shared': resolve(__dirname, './src/shared'),
    },
  },
})
```

## Week 2: Infrastructure Completion

### Day 6-7: Shared Components Integration

#### Task 1.8: Core Shared Components
**Owner:** Frontend Developer  
**Duration:** 12 hours  
**Priority:** High

**src/shared/components/Navigation.tsx:**
```typescript
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Building2, Users, Calculator, Briefcase } from 'lucide-react'
import { clsx } from 'clsx'

interface NavigationProps {
  enabledProducts: string[]
}

export default function Navigation({ enabledProducts }: NavigationProps) {
  const location = useLocation()

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Building2,
      current: location.pathname === '/'
    },
    {
      name: 'HRIS',
      href: '/nexus',
      icon: Users,
      current: location.pathname.startsWith('/nexus'),
      enabled: enabledProducts.includes('nexus')
    },
    {
      name: 'Payroll',
      href: '/paylinq',
      icon: Calculator,
      current: location.pathname.startsWith('/paylinq'),
      enabled: enabledProducts.includes('paylinq')
    },
    {
      name: 'Recruitment',
      href: '/recruitiq',
      icon: Briefcase,
      current: location.pathname.startsWith('/recruitiq'),
      enabled: enabledProducts.includes('recruitiq')
    },
  ].filter(item => item.enabled !== false)

  return (
    <nav className="space-y-1">
      {navigationItems.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className={clsx(
            item.current
              ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
              : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            'group border-l-4 px-3 py-2 flex items-center text-sm font-medium'
          )}
        >
          <item.icon
            className={clsx(
              item.current ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500',
              'mr-3 flex-shrink-0 h-6 w-6'
            )}
            aria-hidden="true"
          />
          {item.name}
        </Link>
      ))}
    </nav>
  )
}
```

#### Task 1.9: Error Handling & Loading States
**Owner:** Frontend Developer  
**Duration:** 8 hours  
**Priority:** Medium

**src/shared/components/ErrorBoundary.tsx:**
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@recruitiq/ui'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
            <h1 className="mt-4 text-lg font-medium text-gray-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Day 8-9: CI/CD Pipeline

#### Task 1.10: Build Pipeline Setup
**Owner:** DevOps Engineer  
**Duration:** 8 hours  
**Priority:** High

**.github/workflows/unified-frontend.yml:**
```yaml
name: Unified Frontend CI/CD

on:
  push:
    paths:
      - 'apps/unified-frontend/**'
      - 'packages/**'
  pull_request:
    paths:
      - 'apps/unified-frontend/**'
      - 'packages/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm --filter @recruitiq/unified-frontend test
      
      - name: Run linting
        run: pnpm --filter @recruitiq/unified-frontend lint
      
      - name: Build
        run: pnpm --filter @recruitiq/unified-frontend build

  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Install Playwright
        run: pnpm --filter @recruitiq/unified-frontend exec playwright install
      
      - name: Start backend
        run: pnpm --filter @recruitiq/backend dev &
        
      - name: Start frontend
        run: pnpm --filter @recruitiq/unified-frontend dev &
      
      - name: Wait for services
        run: |
          npx wait-on http://localhost:3001/api/health
          npx wait-on http://localhost:5175
      
      - name: Run E2E tests
        run: pnpm --filter @recruitiq/unified-frontend test:e2e
```

#### Task 1.11: Development Environment
**Owner:** Technical Lead  
**Duration:** 4 hours  
**Priority:** Medium

**Update root package.json scripts:**
```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter @recruitiq/backend dev\" \"pnpm --filter @recruitiq/unified-frontend dev\"",
    "dev:frontend": "pnpm --filter @recruitiq/unified-frontend dev",
    "build": "pnpm --filter @recruitiq/unified-frontend build",
    "test:frontend": "pnpm --filter @recruitiq/unified-frontend test"
  }
}
```

### Day 10: Integration Testing

#### Task 1.12: Basic Integration Tests
**Owner:** QA Engineer  
**Duration:** 8 hours  
**Priority:** Medium

**src/test/integration/auth.test.tsx:**
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    </BrowserRouter>
  )
}

describe('App Authentication', () => {
  it('should redirect to login when not authenticated', () => {
    renderWithProviders(<App />)
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  it('should show loading state during authentication check', async () => {
    renderWithProviders(<App />)
    expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
  })
})
```

## Phase 1 Deliverables

### Code Deliverables
- [ ] ✅ Unified frontend application structure
- [ ] ✅ Package.json with all dependencies configured
- [ ] ✅ Vite build configuration with code splitting
- [ ] ✅ TypeScript configuration with path aliases
- [ ] ✅ TailwindCSS setup with shared design tokens
- [ ] ✅ Product-aware routing system
- [ ] ✅ Authentication integration with @recruitiq/auth
- [ ] ✅ Shared layout system
- [ ] ✅ Error boundary implementation
- [ ] ✅ Loading states and fallbacks

### Infrastructure Deliverables
- [ ] ✅ CI/CD pipeline for unified frontend
- [ ] ✅ Development environment configuration
- [ ] ✅ Testing setup (Vitest + Playwright)
- [ ] ✅ ESLint and Prettier configuration
- [ ] ✅ Development proxy configuration

### Documentation Deliverables
- [ ] ✅ Application architecture documentation
- [ ] ✅ Development setup instructions
- [ ] ✅ Routing system documentation
- [ ] ✅ Component structure guidelines
- [ ] ✅ Testing strategy documentation

## Risk Assessment

### Identified Risks
1. **Authentication Integration Issues**
   - *Risk Level:* Medium
   - *Impact:* Delayed Phase 1 completion
   - *Mitigation:* Early integration testing with existing auth system

2. **Build Performance Degradation**
   - *Risk Level:* Low
   - *Impact:* Slower development experience
   - *Mitigation:* Aggressive code splitting and lazy loading

3. **Shared Package Conflicts**
   - *Risk Level:* Low  
   - *Impact:* Compatibility issues
   - *Mitigation:* Version alignment and testing

### Contingency Plans
- **Authentication Fallback:** Temporary simplified auth for development
- **Build Issues:** Rollback to simpler Vite configuration
- **Testing Delays:** Focus on critical path testing first

## Definition of Done

### Technical Requirements
- [ ] Application builds without errors
- [ ] All TypeScript types properly defined
- [ ] Authentication flow working end-to-end
- [ ] Basic routing functional for all product areas
- [ ] CI/CD pipeline green
- [ ] Code coverage ≥ 70% for new code

### Quality Requirements  
- [ ] ESLint passes with zero errors
- [ ] Prettier formatting applied
- [ ] Accessibility audit passes
- [ ] Performance baseline established
- [ ] Error handling tested

### Documentation Requirements
- [ ] README updated with setup instructions
- [ ] Architecture decisions documented
- [ ] API integration documented  
- [ ] Testing approach documented
- [ ] Development workflow documented

## Handoff to Phase 2

### Prerequisites for Phase 2
1. ✅ Unified application foundation operational
2. ✅ Authentication and routing systems tested
3. ✅ Development environment validated
4. ✅ CI/CD pipeline functional
5. ✅ Team familiar with new structure

### Phase 2 Setup Requirements
- Individual product module structures defined
- Migration strategy for existing components identified
- Component inventory completed per product
- Integration points with shared packages confirmed

---

**Phase Owner:** Technical Lead  
**Next Phase:** [Phase 2: Core Module Migration](./PHASE_2_CORE_MIGRATION.md)  
**Estimated Completion:** End of Week 2