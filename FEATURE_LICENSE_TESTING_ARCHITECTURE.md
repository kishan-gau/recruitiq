# Feature & License Testing Architecture Plan

**Date:** November 9, 2025  
**Status:** Draft  
**Priority:** Critical  

---

## Executive Summary

This document provides a comprehensive architectural plan to establish complete test coverage for feature and license management across the RecruitIQ platform. The analysis reveals significant gaps: while backend infrastructure exists and has good test coverage, **frontend applications have ZERO tests** for feature gating despite having the infrastructure in place.

### Critical Findings

**What Exists:**
- ✅ Backend: Comprehensive feature management system (FeatureAccessService, repositories, middleware)
- ✅ Backend: Unit tests for repositories and services (3 test suites)
- ✅ Backend: Integration tests for license restrictions
- ✅ Shared UI Package: Feature hooks (useFeatureAccess, useFeatureGate, FeatureGate component)
- ✅ Portal: Feature management UI
- ⚠️ Frontend Apps: Feature infrastructure present but **completely untested**

**What's Missing:**
- ❌ Frontend: Zero tests for feature gating in Nexus, PayLinq, RecruitIQ, Portal
- ❌ Frontend: No tests for useFeatureAccess or useFeatureGate hooks
- ❌ Frontend: No tests for FeatureGate component
- ❌ E2E: No tests for feature access flows
- ❌ Integration: No tests for frontend-backend feature coordination

### Impact Assessment

| Risk Level | Area | Impact |
|------------|------|--------|
| **CRITICAL** | Production Feature Bugs | Features may be incorrectly gated, allowing unauthorized access |
| **HIGH** | User Experience | Users may see features they can't access or miss features they have |
| **HIGH** | Security | Potential unauthorized feature access if frontend checks fail |
| **MEDIUM** | Sales/Support | Cannot confidently demo or troubleshoot feature access issues |
| **MEDIUM** | Development Velocity | Fear of breaking feature gates slows development |

---

## Current State Analysis

### Backend Layer (Strong ✅)

**Infrastructure:**
```
backend/src/
├── repositories/
│   ├── FeatureRepository.js              ✅ Tested (62 test cases)
│   └── FeatureGrantRepository.js         ✅ Tested (58 test cases)
├── services/
│   ├── FeatureAccessService.js           ✅ Tested (45 test cases)
│   └── FeatureTierService.js             ✅ Tested (integration)
└── middleware/
    ├── requireFeature.js                 ✅ Used, needs more tests
    └── checkFeature.js                   ⚠️ Legacy, needs migration
```

**Test Coverage:**
- ✅ Unit Tests: `FeatureRepository.test.js`, `FeatureGrantRepository.test.js`, `FeatureAccessService.test.js`
- ✅ Integration Tests: `license-restrictions.test.js` (comprehensive license limit enforcement)
- ✅ Test Quality: Mocks database, tests edge cases, validates error messages
- ⚠️ Gap: Middleware integration tests missing

**Database Schema:**
```sql
-- Products (app registry)
products (id, name, slug, status)

-- Features (catalog)
features (
  id, product_id, feature_key, feature_name,
  status, min_tier, is_add_on, pricing,
  config_schema, default_config, rollout_percentage
)

-- Grants (access control)
organization_feature_grants (
  id, organization_id, feature_id,
  granted_via, is_active, config,
  usage_limit, current_usage, expires_at
)
```

### Shared Packages Layer (Untested ❌)

**Infrastructure:**
```
packages/ui/src/
├── hooks/
│   ├── useFeatureAccess.ts               ❌ Zero tests
│   └── useFeatureGate.tsx                ❌ Zero tests
└── components/
    └── FeatureGate/
        └── FeatureGate.tsx               ❌ Zero tests
```

**Code Quality:**
- ✅ TypeScript with full type definitions
- ✅ Comprehensive JSDoc documentation
- ✅ Multi-layer caching (memory + API)
- ✅ Error handling and loading states
- ❌ **NO TESTS WHATSOEVER**

### Frontend Applications Layer (Untested ❌)

#### Nexus (HR Management)
```
Status: Infrastructure NOT USED, Zero Tests
- No feature checks implemented
- No imports of useFeatureAccess or FeatureGate
- Missing opportunity for premium feature gating:
  * Performance reviews
  * Advanced scheduling
  * Custom workflows
```

#### PayLinq (Payroll)
```
Status: Infrastructure NOT USED, Zero Tests
- No feature checks implemented
- Has tier calculations (payroll tiers) but NOT license tiers
- Missing opportunity for premium feature gating:
  * Advanced formula engine
  * Multi-currency support
  * Custom pay structures
```

#### RecruitIQ (ATS)
```
Status: Infrastructure EXISTS but MOCKED, Zero Tests
- OrganizationContext.jsx has hasFeature() method
- testSetup.jsx MOCKS hasFeature() to ALWAYS return true
- This means all tests pass regardless of feature status!
- Missing opportunity for premium feature gating:
  * AI candidate matching
  * Advanced workflows
  * API access
```

#### Portal (Admin)
```
Status: UI EXISTS, Zero Tests
- Feature management UI fully implemented
- API integration present
- ZERO tests for:
  * Feature catalog display
  * Feature grants management
  * Feature creation/editing
  * Organization feature access
```

---

## Testing Architecture Plan

### Phase 1: Foundation - Shared Package Tests (Week 1)

**Objective:** Test core feature access hooks and components

#### 1.1 Test Setup

**File:** `packages/ui/tests/setup.ts`
```typescript
import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock API client
export const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
};

// Mock feature data
export const mockFeatures = {
  advanced_analytics: {
    hasAccess: true,
    config: { reportLimit: 100 },
    usage: { current: 5, limit: 100, remaining: 95 }
  },
  premium_support: {
    hasAccess: false,
    reason: 'no_grant',
    config: null,
    usage: null
  }
};

// Helper to create test wrapper with providers
export function createTestWrapper(options = {}) {
  return function Wrapper({ children }) {
    return <>{children}</>;
  };
}
```

#### 1.2 Hook Tests

**File:** `packages/ui/tests/hooks/useFeatureAccess.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeatureAccess } from '../../src/hooks/useFeatureAccess';
import { mockApiClient, mockFeatures } from '../setup';

describe('useFeatureAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature Access Checks', () => {
    it('should check if feature is available', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          available: [mockFeatures.advanced_analytics],
          unavailable: []
        }
      });

      const { result } = renderHook(() => 
        useFeatureAccess({ 
          productSlug: 'paylinq',
          apiClient: mockApiClient as any
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasFeature('advanced_analytics')).toBe(true);
      expect(result.current.hasFeature('premium_support')).toBe(false);
    });

    it('should return detailed feature result', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          available: [mockFeatures.advanced_analytics],
          unavailable: []
        }
      });

      const { result } = renderHook(() => 
        useFeatureAccess({ 
          productSlug: 'paylinq',
          apiClient: mockApiClient as any
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const featureResult = await result.current.checkFeature('advanced_analytics');
      
      expect(featureResult.hasAccess).toBe(true);
      expect(featureResult.config).toEqual({ reportLimit: 100 });
      expect(featureResult.usage?.current).toBe(5);
      expect(featureResult.usage?.remaining).toBe(95);
    });

    it('should handle denied feature access', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          available: [],
          unavailable: [mockFeatures.premium_support]
        }
      });

      const { result } = renderHook(() => 
        useFeatureAccess({ 
          productSlug: 'paylinq',
          apiClient: mockApiClient as any
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const featureResult = await result.current.checkFeature('premium_support');
      
      expect(featureResult.hasAccess).toBe(false);
      expect(featureResult.reason).toBe('no_grant');
    });
  });

  describe('Caching', () => {
    it('should cache feature results', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          available: [mockFeatures.advanced_analytics],
          unavailable: []
        }
      });

      const { result } = renderHook(() => 
        useFeatureAccess({ 
          productSlug: 'paylinq',
          apiClient: mockApiClient as any,
          cacheDuration: 60000
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // First call
      result.current.hasFeature('advanced_analytics');
      
      // Second call should use cache
      result.current.hasFeature('advanced_analytics');

      // API should only be called once
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache when requested', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          available: [mockFeatures.advanced_analytics],
          unavailable: []
        }
      });

      const { result } = renderHook(() => 
        useFeatureAccess({ 
          productSlug: 'paylinq',
          apiClient: mockApiClient as any
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Call once
      result.current.hasFeature('advanced_analytics');

      // Invalidate cache
      result.current.invalidate();

      // Refetch
      await result.current.refetch();

      // Should have called API twice
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiClient.get.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => 
        useFeatureAccess({ 
          productSlug: 'paylinq',
          apiClient: mockApiClient as any
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('API Error');
      expect(result.current.hasFeature('advanced_analytics')).toBe(false);
    });

    it('should handle network timeout', async () => {
      mockApiClient.get.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const { result } = renderHook(() => 
        useFeatureAccess({ 
          productSlug: 'paylinq',
          apiClient: mockApiClient as any
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 200 });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Usage Tracking', () => {
    it('should track feature usage when enabled', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          available: [mockFeatures.advanced_analytics],
          unavailable: []
        }
      });

      const { result } = renderHook(() => 
        useFeatureAccess({ 
          productSlug: 'paylinq',
          apiClient: mockApiClient as any
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const feature = result.current.features['advanced_analytics'];
      
      expect(feature.usage).toBeDefined();
      expect(feature.usage?.current).toBe(5);
      expect(feature.usage?.limit).toBe(100);
      expect(feature.usage?.remaining).toBe(95);
    });

    it('should handle unlimited usage limits', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          available: [{
            hasAccess: true,
            config: {},
            usage: { current: 50, limit: null, remaining: null }
          }],
          unavailable: []
        }
      });

      const { result } = renderHook(() => 
        useFeatureAccess({ 
          productSlug: 'paylinq',
          apiClient: mockApiClient as any
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const features = Object.values(result.current.features);
      expect(features[0].usage?.limit).toBeNull();
      expect(features[0].usage?.remaining).toBeNull();
    });
  });
});
```

**Test Count:** 10 tests  
**Coverage Target:** 90%+ for useFeatureAccess  
**Duration:** 2 days

#### 1.3 Component Tests

**File:** `packages/ui/tests/components/FeatureGate.test.tsx`
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FeatureGate } from '../../src/components/FeatureGate';
import * as useFeatureAccessHook from '../../src/hooks/useFeatureAccess';

describe('FeatureGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when feature is available', async () => {
    vi.spyOn(useFeatureAccessHook, 'useFeatureAccess').mockReturnValue({
      hasFeature: () => true,
      checkFeature: vi.fn(),
      features: {},
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      invalidate: vi.fn()
    });

    render(
      <FeatureGate 
        productSlug="paylinq" 
        featureKey="advanced_analytics"
      >
        <div data-testid="protected-content">Premium Feature</div>
      </FeatureGate>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should render fallback when feature is unavailable', () => {
    vi.spyOn(useFeatureAccessHook, 'useFeatureAccess').mockReturnValue({
      hasFeature: () => false,
      checkFeature: vi.fn(),
      features: {},
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      invalidate: vi.fn()
    });

    render(
      <FeatureGate 
        productSlug="paylinq" 
        featureKey="advanced_analytics"
        fallback={<div data-testid="upgrade-prompt">Upgrade Required</div>}
      >
        <div data-testid="protected-content">Premium Feature</div>
      </FeatureGate>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('upgrade-prompt')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.spyOn(useFeatureAccessHook, 'useFeatureAccess').mockReturnValue({
      hasFeature: () => false,
      checkFeature: vi.fn(),
      features: {},
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      invalidate: vi.fn()
    });

    render(
      <FeatureGate 
        productSlug="paylinq" 
        featureKey="advanced_analytics"
        loadingComponent={<div data-testid="loading">Loading...</div>}
      >
        <div data-testid="protected-content">Premium Feature</div>
      </FeatureGate>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should call onBlocked callback when access denied', () => {
    const onBlocked = vi.fn();

    vi.spyOn(useFeatureAccessHook, 'useFeatureAccess').mockReturnValue({
      hasFeature: () => false,
      checkFeature: vi.fn(),
      features: {},
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      invalidate: vi.fn()
    });

    render(
      <FeatureGate 
        productSlug="paylinq" 
        featureKey="advanced_analytics"
        onBlocked={onBlocked}
      >
        <div>Premium Feature</div>
      </FeatureGate>
    );

    expect(onBlocked).toHaveBeenCalledWith('no_grant', undefined);
  });
});
```

**Test Count:** 5 tests  
**Coverage Target:** 85%+ for FeatureGate component  
**Duration:** 1 day

### Phase 2: Frontend Application Tests (Week 2-3)

#### 2.1 RecruitIQ Feature Tests

**Priority:** HIGH (has infrastructure but mocked)

**File:** `apps/recruitiq/tests/context/OrganizationContext.test.jsx`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { OrganizationProvider, useOrganization } from '../../src/context/OrganizationContext';
import * as authModule from '@recruitiq/auth';
import api from '../../src/services/api';

vi.mock('@recruitiq/auth');
vi.mock('../../src/services/api');

describe('OrganizationContext - Feature Access', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    organizationId: 'org-1'
  };

  const mockOrganization = {
    id: 'org-1',
    name: 'Test Org',
    tier: 'professional',
    license: {
      features: ['basic_search', 'advanced_workflows', 'api_access'],
      expiresAt: '2026-12-31'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false
    });
  });

  describe('hasFeature', () => {
    it('should return true for features in license', async () => {
      api.getOrganization.mockResolvedValue({
        organization: mockOrganization
      });

      const wrapper = ({ children }) => (
        <OrganizationProvider>{children}</OrganizationProvider>
      );

      const { result } = renderHook(() => useOrganization(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasFeature('advanced_workflows')).toBe(true);
      expect(result.current.hasFeature('api_access')).toBe(true);
    });

    it('should return false for features not in license', async () => {
      api.getOrganization.mockResolvedValue({
        organization: mockOrganization
      });

      const wrapper = ({ children }) => (
        <OrganizationProvider>{children}</OrganizationProvider>
      );

      const { result } = renderHook(() => useOrganization(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasFeature('premium_analytics')).toBe(false);
      expect(result.current.hasFeature('white_labeling')).toBe(false);
    });

    it('should return false when no license data', async () => {
      api.getOrganization.mockResolvedValue({
        organization: { ...mockOrganization, license: null }
      });

      const wrapper = ({ children }) => (
        <OrganizationProvider>{children}</OrganizationProvider>
      );

      const { result } = renderHook(() => useOrganization(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.hasFeature('any_feature')).toBe(false);
    });

    it('should handle expired license', async () => {
      api.getOrganization.mockResolvedValue({
        organization: {
          ...mockOrganization,
          license: {
            ...mockOrganization.license,
            expiresAt: '2020-01-01' // Expired
          }
        }
      });

      const wrapper = ({ children }) => (
        <OrganizationProvider>{children}</OrganizationProvider>
      );

      const { result } = renderHook(() => useOrganization(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Should still check features even if expired (backend enforces)
      expect(result.current.hasFeature('basic_search')).toBe(true);
    });
  });

  describe('tier property', () => {
    it('should expose organization tier', async () => {
      api.getOrganization.mockResolvedValue({
        organization: mockOrganization
      });

      const wrapper = ({ children }) => (
        <OrganizationProvider>{children}</OrganizationProvider>
      );

      const { result } = renderHook(() => useOrganization(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.tier).toBe('professional');
    });

    it('should default to "free" when no tier', async () => {
      api.getOrganization.mockResolvedValue({
        organization: { ...mockOrganization, tier: null }
      });

      const wrapper = ({ children }) => (
        <OrganizationProvider>{children}</OrganizationProvider>
      );

      const { result } = renderHook(() => useOrganization(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.tier).toBe('free');
    });
  });
});
```

**Test Count:** 7 tests  
**Duration:** 1 day

#### 2.2 Portal Feature Management UI Tests

**File:** `apps/portal/tests/pages/features/FeatureCatalog.test.jsx`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureCatalog } from '../../../src/pages/features/FeatureCatalog';
import api from '../../../src/services/api';

vi.mock('../../../src/services/api');

describe('FeatureCatalog', () => {
  const mockFeatures = [
    {
      id: 'feature-1',
      featureKey: 'advanced_analytics',
      featureName: 'Advanced Analytics',
      description: 'Advanced reporting and analytics',
      category: 'analytics',
      status: 'stable',
      minTier: 'professional',
      isAddOn: false,
      organizationsUsing: 150
    },
    {
      id: 'feature-2',
      featureKey: 'api_access',
      featureName: 'API Access',
      description: 'REST API access for integrations',
      category: 'integration',
      status: 'stable',
      minTier: 'enterprise',
      isAddOn: true,
      organizationsUsing: 45
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.getFeatures.mockResolvedValue({
      features: mockFeatures,
      total: 2,
      pages: 1
    });
  });

  it('should load and display features', async () => {
    render(<FeatureCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
      expect(screen.getByText('API Access')).toBeInTheDocument();
    });

    expect(api.getFeatures).toHaveBeenCalledTimes(1);
  });

  it('should filter by status', async () => {
    const user = userEvent.setup();
    render(<FeatureCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
    });

    // Click status filter
    const statusFilter = screen.getByLabelText('Status');
    await user.selectOptions(statusFilter, 'stable');

    await waitFor(() => {
      expect(api.getFeatures).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'stable' })
      );
    });
  });

  it('should search features', async () => {
    const user = userEvent.setup();
    render(<FeatureCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search features...');
    await user.type(searchInput, 'analytics');

    await waitFor(() => {
      expect(api.getFeatures).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'analytics' })
      );
    });
  });

  it('should show feature details on click', async () => {
    const user = userEvent.setup();
    render(<FeatureCatalog />);

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Advanced Analytics'));

    expect(screen.getByText('Advanced reporting and analytics')).toBeInTheDocument();
    expect(screen.getByText('150 organizations using')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    api.getFeatures.mockImplementation(() => new Promise(() => {}));

    render(<FeatureCatalog />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    api.getFeatures.mockRejectedValue(new Error('Failed to load features'));

    render(<FeatureCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });
});
```

**Test Count:** 6 tests  
**Duration:** 1 day

### Phase 3: Integration Tests (Week 4)

#### 3.1 Frontend-Backend Integration

**File:** `tests/integration/feature-access-integration.test.js`
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../backend/src/server.js';
import pool from '../../backend/src/config/database.js';

describe('Feature Access Integration', () => {
  let testOrg;
  let testUser;
  let testToken;
  let testFeature;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug, tier)
       VALUES ($1, $2, $3) RETURNING *`,
      ['Feature Test Org', 'feature-test', 'professional']
    );
    testOrg = orgResult.rows[0];

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, name, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [testOrg.id, 'feature-test@example.com', '$2b$10$dummy', 'Test User', true]
    );
    testUser = userResult.rows[0];

    // Get product ID
    const productResult = await pool.query(
      `SELECT id FROM products WHERE slug = 'recruitiq' LIMIT 1`
    );
    const productId = productResult.rows[0].id;

    // Create test feature
    const featureResult = await pool.query(
      `INSERT INTO features (
        product_id, feature_key, feature_name, description,
        status, min_tier, is_add_on
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [productId, 'test_feature', 'Test Feature', 'Integration test feature', 
       'stable', 'professional', false]
    );
    testFeature = featureResult.rows[0];

    // Grant feature to organization
    await pool.query(
      `INSERT INTO organization_feature_grants (
        organization_id, feature_id, granted_via, is_active
      ) VALUES ($1, $2, $3, $4)`,
      [testOrg.id, testFeature.id, 'tier', true]
    );

    // Generate token (simplified for test)
    testToken = 'test-jwt-token'; // In real tests, generate proper JWT
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM organization_feature_grants WHERE organization_id = $1', [testOrg.id]);
    await pool.query('DELETE FROM features WHERE id = $1', [testFeature.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrg.id]);
    await pool.end();
  });

  it('should allow access to granted feature via API', async () => {
    const response = await request(app)
      .get(`/api/features/check/${testFeature.feature_key}`)
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.hasAccess).toBe(true);
  });

  it('should deny access to non-granted feature', async () => {
    const response = await request(app)
      .get('/api/features/check/non_existent_feature')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(403);
    expect(response.body.hasAccess).toBe(false);
  });

  it('should enforce feature requirement on protected endpoints', async () => {
    // Assuming an endpoint protected by requireFeature middleware
    const response = await request(app)
      .get('/api/protected/premium-endpoint')
      .set('Authorization', `Bearer ${testToken}`);

    // Should check feature and either allow or deny
    expect([200, 403]).toContain(response.status);
  });
});
```

**Test Count:** 3 tests  
**Duration:** 2 days

### Phase 4: E2E Tests (Week 5)

#### 4.1 Playwright E2E Tests

**File:** `apps/recruitiq/e2e/feature-access.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Access E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as professional tier user
    await page.goto('/login');
    await page.fill('[name="email"]', 'professional@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show available features', async ({ page }) => {
    await page.goto('/settings/features');

    // Should see features for professional tier
    await expect(page.locator('text=Advanced Workflows')).toBeVisible();
    await expect(page.locator('text=API Access')).toBeVisible();
  });

  test('should block access to unavailable features', async ({ page }) => {
    // Try to access enterprise-only feature
    await page.goto('/features/enterprise-analytics');

    // Should see upgrade prompt
    await expect(page.locator('text=Upgrade Required')).toBeVisible();
    await expect(page.locator('text=This feature requires Enterprise tier')).toBeVisible();
  });

  test('should allow feature usage within limits', async ({ page }) => {
    await page.goto('/reports');

    // Create reports up to limit
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("New Report")');
      await page.fill('[name="reportName"]', `Test Report ${i}`);
      await page.click('button:has-text("Save")');
      await expect(page.locator(`text=Test Report ${i}`)).toBeVisible();
    }
  });

  test('should block when usage limit reached', async ({ page }) => {
    // Assume limit is 100 API calls
    await page.goto('/settings/api');

    // Make API calls until limit reached
    const limitStatus = page.locator('[data-testid="usage-limit-status"]');
    await expect(limitStatus).toContainText(/\d+ \/ 100/);

    // If at limit, should show warning
    const usageText = await limitStatus.textContent();
    if (usageText?.includes('100 / 100')) {
      await expect(page.locator('text=Usage limit reached')).toBeVisible();
    }
  });

  test('should track feature usage in real-time', async ({ page }) => {
    await page.goto('/settings/features');

    const usageIndicator = page.locator('[data-testid="api-usage"]');
    const beforeUsage = await usageIndicator.textContent();

    // Trigger API call
    await page.goto('/api-playground');
    await page.click('button:has-text("Test API Call")');
    await page.waitForResponse(resp => resp.url().includes('/api/') && resp.status() === 200);

    // Check usage increased
    await page.goto('/settings/features');
    const afterUsage = await usageIndicator.textContent();

    expect(afterUsage).not.toBe(beforeUsage);
  });
});

test.describe('Feature Upgrade Flow', () => {
  test('should show upgrade options when feature blocked', async ({ page }) => {
    await page.goto('/features/premium-analytics');

    await expect(page.locator('text=Upgrade to access this feature')).toBeVisible();
    
    const upgradeButton = page.locator('button:has-text("Upgrade Plan")');
    await expect(upgradeButton).toBeVisible();
    
    await upgradeButton.click();
    await expect(page).toHaveURL(/pricing|upgrade/);
  });
});
```

**Test Count:** 6 tests  
**Duration:** 2 days

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Day 1-2: Setup test infrastructure for packages/ui
- [ ] Day 3-4: Write useFeatureAccess tests (10 tests)
- [ ] Day 5: Write FeatureGate component tests (5 tests)

### Week 2: RecruitIQ
- [ ] Day 1: OrganizationContext feature tests (7 tests)
- [ ] Day 2-3: Fix testSetup.jsx mocking (remove always-true mock)
- [ ] Day 4-5: Component tests using real feature checks

### Week 3: Portal
- [ ] Day 1-2: FeatureCatalog tests (6 tests)
- [ ] Day 3: FeatureForm tests
- [ ] Day 4: FeatureGrants tests
- [ ] Day 5: FeatureDetail tests

### Week 4: Integration
- [ ] Day 1-2: Frontend-backend integration tests (3 tests)
- [ ] Day 3-4: API middleware integration tests
- [ ] Day 5: Performance and load testing

### Week 5: E2E
- [ ] Day 1-2: RecruitIQ E2E tests (6 tests)
- [ ] Day 3: PayLinq E2E tests (if features implemented)
- [ ] Day 4: Nexus E2E tests (if features implemented)
- [ ] Day 5: Cross-product feature tests

---

## Success Metrics

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Backend Test Coverage | 85% | 95% | High |
| Frontend Hook Coverage | 0% | 90% | Critical |
| Frontend Component Coverage | 0% | 85% | Critical |
| Portal UI Test Coverage | 0% | 80% | High |
| E2E Test Coverage | 0% | 70% | Medium |
| Integration Test Coverage | 60% | 85% | High |

### Quality Gates

**Must Pass Before Production:**
1. ✅ All backend feature tests passing
2. ✅ All frontend hook tests passing (>90% coverage)
3. ✅ All critical E2E paths tested
4. ✅ Feature access audit completed
5. ✅ Security review passed

---

## Risk Mitigation

### Risk: Breaking Existing Functionality
**Mitigation:**
- Run full regression suite before each phase
- Use feature flags for new test infrastructure
- Parallel testing environment

### Risk: False Positives in Tests
**Mitigation:**
- Use real API mocking (MSW)
- Integration tests with test database
- E2E tests on staging environment

### Risk: Test Maintenance Burden
**Mitigation:**
- Shared test utilities
- Test data factories
- Automated test generation where possible

---

## Appendix

### Test File Locations

```
Backend Tests:
backend/tests/
├── unit/features/
│   ├── FeatureRepository.test.js         ✅ Exists
│   ├── FeatureGrantRepository.test.js     ✅ Exists
│   └── FeatureAccessService.test.js       ✅ Exists
└── integration/
    ├── license-restrictions.test.js       ✅ Exists
    └── feature-access-integration.test.js ❌ To Create

Shared Package Tests:
packages/ui/tests/
├── hooks/
│   ├── useFeatureAccess.test.ts           ❌ To Create
│   └── useFeatureGate.test.tsx            ❌ To Create
└── components/
    └── FeatureGate.test.tsx               ❌ To Create

Frontend App Tests:
apps/recruitiq/tests/
├── context/
│   └── OrganizationContext.test.jsx       ❌ To Create
└── integration/
    └── feature-gating.test.jsx            ❌ To Create

apps/portal/tests/
└── pages/features/
    ├── FeatureCatalog.test.jsx            ❌ To Create
    ├── FeatureForm.test.jsx               ❌ To Create
    ├── FeatureGrants.test.jsx             ❌ To Create
    └── FeatureDetail.test.jsx             ❌ To Create

E2E Tests:
apps/recruitiq/e2e/
└── feature-access.spec.ts                 ❌ To Create
```

### Test Commands

```bash
# Run all feature tests
npm test -- --grep "feature|license"

# Run backend tests only
cd backend && npm test

# Run frontend hook tests
cd packages/ui && npm test

# Run RecruitIQ tests
cd apps/recruitiq && npm test

# Run Portal tests
cd apps/portal && npm test

# Run E2E tests
cd apps/recruitiq && npm run test:e2e

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

---

**Document End**

*Next Steps: Review plan with team, prioritize implementation, start Week 1*
