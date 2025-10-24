# RecruitIQ Multi-Tenant Architecture Design
**Date:** October 24, 2025  
**Version:** 1.0  
**Purpose:** Blueprint for adding organization-level multi-tenancy

---

## Overview

This document details how to evolve RecruitIQ from a **workspace-centric** application to a **organization-centric multi-tenant** application, enabling support for:

1. Multiple organizations (tenants)
2. Multiple workspaces per organization
3. License-based feature access
4. Usage tracking and enforcement
5. Shared or dedicated infrastructure

---

## Current vs Target Architecture

### Current: Workspace-Centric
```
┌─────────────────────────────────────────┐
│            RecruitIQ App                │
├─────────────────────────────────────────┤
│  User (email: john@acme.com)            │
│    ├── Workspace: HR Department         │
│    │    ├── Jobs                         │
│    │    ├── Candidates                   │
│    │    └── Templates                    │
│    └── Workspace: Engineering           │
│         ├── Jobs                         │
│         ├── Candidates                   │
│         └── Templates                    │
└─────────────────────────────────────────┘

Problems:
❌ No organizational grouping
❌ Can't apply license limits
❌ Can't track usage per customer
❌ No billing entity
```

### Target: Organization-Centric
```
┌─────────────────────────────────────────────────────────┐
│               RecruitIQ Platform                        │
├─────────────────────────────────────────────────────────┤
│  Organization: Acme Corp (org_acme_123)                 │
│    ├── License: Professional Tier                       │
│    │    ├── Max Users: 50                               │
│    │    ├── Max Workspaces: 5                           │
│    │    └── Features: [analytics, api, branding]        │
│    ├── Subscription: Active ($4,950/mo)                 │
│    ├── Users (45/50)                                     │
│    │    ├── john@acme.com (Admin)                       │
│    │    ├── sarah@acme.com (Recruiter)                  │
│    │    └── ... (43 more)                               │
│    └── Workspaces (3/5)                                  │
│         ├── Workspace: HR Department                    │
│         │    ├── Jobs (123)                             │
│         │    ├── Candidates (1,234)                     │
│         │    └── Templates (8)                          │
│         ├── Workspace: Engineering                      │
│         └── Workspace: Sales                            │
├─────────────────────────────────────────────────────────┤
│  Organization: TechStart Inc (org_techstart_456)        │
│    ├── License: Starter Tier                            │
│    ├── Users (5/10)                                      │
│    └── Workspaces (1/1)                                  │
└─────────────────────────────────────────────────────────┘

Benefits:
✅ Clear tenant boundaries
✅ License enforcement per org
✅ Usage tracking per customer
✅ Billing per organization
✅ Admin can manage all users
```

---

## Data Model Design

### 1. Organization Entity (NEW)

```typescript
interface Organization {
  id: string;                    // org_acme_123
  name: string;                  // "Acme Corp"
  domain: string;                // "acmecorp.com"
  type: 'cloud-shared' | 'cloud-dedicated' | 'on-premise';
  
  // License info
  license: {
    id: string;                  // lic_abc123
    tier: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'trial' | 'expired' | 'suspended';
    issuedAt: string;            // ISO date
    validUntil: string;          // ISO date
    
    // Feature limits
    features: {
      maxUsers: number | null;           // null = unlimited
      maxWorkspaces: number | null;
      maxJobs: number | null;
      maxCandidates: number | null;
      maxFlowTemplates: number | null;
      maxStorageGB: number | null;
      maxApiCallsPerMonth: number | null;
      
      // Feature flags
      analytics: boolean;
      api: boolean;
      sso: boolean;
      customBranding: boolean;
      whiteLabel: boolean;
      integrations: string[];      // ['slack', 'email', 'linkedin']
    };
  };
  
  // Subscription (SaaS only)
  subscription?: {
    provider: 'stripe' | 'paddle' | 'chargebee';
    customerId: string;
    subscriptionId: string;
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    plan: string;
    interval: 'monthly' | 'yearly';
    amount: number;              // in cents
    currency: string;            // 'USD'
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  
  // Usage tracking
  usage: {
    users: number;               // current count
    workspaces: number;
    jobs: number;
    candidates: number;
    flowTemplates: number;
    storageGB: number;
    apiCallsThisMonth: number;
    lastCalculatedAt: string;
  };
  
  // Settings
  settings: {
    branding?: {
      logo: string;              // URL
      primaryColor: string;      // hex
      customDomain?: string;     // recruit.acmecorp.com
    };
    features: {
      allowWorkspaceCreation: boolean;
      requireEmailVerification: boolean;
      allowPublicSignup: boolean;
    };
    security: {
      enforceSSO: boolean;
      ssoProvider?: 'okta' | 'auth0' | 'azure-ad';
      ssoConfig?: any;
      mfaRequired: boolean;
      passwordPolicy: {
        minLength: number;
        requireSpecialChar: boolean;
        requireNumber: boolean;
      };
    };
  };
  
  // Metadata
  createdAt: string;
  createdBy: string;             // user_id
  updatedAt: string;
  metadata: Record<string, any>; // flexible key-value
}
```

### 2. Enhanced User Entity

```typescript
interface User {
  id: string;                    // user_123
  organizationId: string;        // org_acme_123
  email: string;
  name: string;
  avatar?: string;
  
  // Organization-level role
  role: 'owner' | 'admin' | 'recruiter' | 'viewer' | 'applicant';
  
  // Workspace memberships
  workspaces: Array<{
    workspaceId: string;
    role: 'admin' | 'member' | 'viewer';
    joinedAt: string;
  }>;
  
  // Authentication
  passwordHash?: string;         // bcrypt hash (if using password auth)
  ssoId?: string;                // SSO provider user ID
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  
  // Session management
  lastLoginAt: string;
  lastActiveAt: string;
  loginCount: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  invitedBy?: string;            // user_id
}
```

### 3. Enhanced Workspace Entity

```typescript
interface Workspace {
  id: string;                    // workspace_hr_123
  organizationId: string;        // org_acme_123 (PARENT)
  name: string;
  color: string;
  description?: string;
  
  // Workspace-specific settings
  settings: {
    allowMemberInvites: boolean;
    defaultFlowTemplateId?: string;
    timezone: string;
  };
  
  // Metadata
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  archivedAt?: string;
}
```

### 4. Database Schema (PostgreSQL)

```sql
-- Organizations table
CREATE TABLE organizations (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  type VARCHAR(20) NOT NULL CHECK (type IN ('cloud-shared', 'cloud-dedicated', 'on-premise')),
  license JSONB NOT NULL,
  subscription JSONB,
  usage JSONB NOT NULL,
  settings JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_organizations_domain ON organizations(domain);
CREATE INDEX idx_organizations_type ON organizations(type);

-- Users table
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar TEXT,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'recruiter', 'viewer', 'applicant')),
  password_hash TEXT,
  sso_id VARCHAR(255),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret TEXT,
  last_login_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by VARCHAR(50) REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_users_org_email ON users(organization_id, email);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- Workspaces table
CREATE TABLE workspaces (
  id VARCHAR(50) PRIMARY KEY,
  organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(20),
  description TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_workspaces_organization ON workspaces(organization_id);
CREATE INDEX idx_workspaces_archived ON workspaces(archived_at) WHERE archived_at IS NULL;

-- User-Workspace membership
CREATE TABLE user_workspaces (
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id VARCHAR(50) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, workspace_id)
);

CREATE INDEX idx_user_workspaces_user ON user_workspaces(user_id);
CREATE INDEX idx_user_workspaces_workspace ON user_workspaces(workspace_id);

-- Jobs table (scoped to workspace)
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  workspace_id VARCHAR(50) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  type VARCHAR(50),
  openings INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  department VARCHAR(255),
  flow_template_id VARCHAR(50),
  public_portal JSONB,
  posted_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_workspace ON jobs(workspace_id);
CREATE INDEX idx_jobs_archived ON jobs(archived_at) WHERE archived_at IS NULL;

-- Candidates table (scoped to workspace)
CREATE TABLE candidates (
  id SERIAL PRIMARY KEY,
  workspace_id VARCHAR(50) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  location VARCHAR(255),
  job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  applicant_id INTEGER,  -- Links to applicant account
  application_source VARCHAR(50),  -- 'public-portal' or 'applicant-portal'
  stage VARCHAR(100),
  tracking_code VARCHAR(50) UNIQUE,
  resume_url TEXT,
  linkedin TEXT,
  portfolio TEXT,
  cover_letter TEXT,
  experience TEXT,
  application_data JSONB,
  communications JSONB DEFAULT '[]',
  notes TEXT,
  rating INTEGER,
  applied_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidates_workspace ON candidates(workspace_id);
CREATE INDEX idx_candidates_job ON candidates(job_id);
CREATE INDEX idx_candidates_tracking_code ON candidates(tracking_code);
CREATE INDEX idx_candidates_applicant ON candidates(applicant_id);

-- Flow templates (scoped to workspace)
CREATE TABLE flow_templates (
  id VARCHAR(50) PRIMARY KEY,
  workspace_id VARCHAR(50) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  is_default BOOLEAN DEFAULT FALSE,
  stages JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(50) REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_flow_templates_workspace ON flow_templates(workspace_id);

-- Applicants (public portal users)
CREATE TABLE applicants (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(50),
  location VARCHAR(255),
  linkedin TEXT,
  portfolio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applicants_email ON applicants(email);

-- Usage telemetry
CREATE TABLE usage_events (
  id SERIAL PRIMARY KEY,
  organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,  -- 'user_login', 'job_created', 'api_call', etc.
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
  workspace_id VARCHAR(50) REFERENCES workspaces(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_events_org ON usage_events(organization_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_created ON usage_events(created_at);

-- Row-level security policies
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access workspaces in their organization
CREATE POLICY workspace_isolation ON workspaces
  USING (organization_id = current_setting('app.current_organization_id')::VARCHAR);

CREATE POLICY job_isolation ON jobs
  USING (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE organization_id = current_setting('app.current_organization_id')::VARCHAR
  ));

CREATE POLICY candidate_isolation ON candidates
  USING (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE organization_id = current_setting('app.current_organization_id')::VARCHAR
  ));
```

---

## Context Layer Refactoring

### 1. New OrganizationContext

```typescript
// src/context/OrganizationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext();

export function OrganizationProvider({ children }) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.organizationId) {
      fetchOrganization(user.organizationId);
    }
  }, [user]);

  const fetchOrganization = async (orgId) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const org = await response.json();
      setOrganization(org);
    } catch (error) {
      console.error('Failed to load organization:', error);
    } finally {
      setLoading(false);
    }
  };

  // License validation
  const hasFeature = (featureName) => {
    if (!organization?.license?.features) return false;
    return organization.license.features[featureName] === true;
  };

  const checkLimit = (limitName) => {
    if (!organization?.license?.features) return { allowed: false, limit: 0, current: 0 };
    
    const limit = organization.license.features[limitName];
    const current = organization.usage[limitName.replace('max', '').toLowerCase()];
    
    return {
      allowed: limit === null || current < limit,
      limit: limit,
      current: current,
      remaining: limit === null ? null : Math.max(0, limit - current)
    };
  };

  const isLicenseValid = () => {
    if (!organization?.license) return false;
    if (organization.license.status !== 'active') return false;
    
    const validUntil = new Date(organization.license.validUntil);
    return validUntil > new Date();
  };

  const canCreateWorkspace = () => {
    const workspaceLimits = checkLimit('maxWorkspaces');
    return workspaceLimits.allowed && hasFeature('allowWorkspaceCreation');
  };

  const canAddUser = () => {
    const userLimits = checkLimit('maxUsers');
    return userLimits.allowed;
  };

  const value = {
    organization,
    loading,
    hasFeature,
    checkLimit,
    isLicenseValid,
    canCreateWorkspace,
    canAddUser,
    refreshOrganization: () => fetchOrganization(user.organizationId)
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
```

### 2. Updated WorkspaceContext

```typescript
// src/context/WorkspaceContext.jsx (enhanced)
import { useOrganization } from './OrganizationContext';

export const WorkspaceProvider = ({ children }) => {
  const { organization, canCreateWorkspace } = useOrganization();
  // ... existing code ...

  const createWorkspace = async (name, color = 'emerald') => {
    // Check license limits
    if (!canCreateWorkspace()) {
      throw new Error('Workspace limit reached. Please upgrade your plan.');
    }

    const newWorkspace = {
      name,
      color,
      organizationId: organization.id
    };

    // Call API instead of localStorage
    const response = await fetch('/api/workspaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify(newWorkspace)
    });

    const created = await response.json();
    setWorkspaces(prev => [...prev, created]);
    return created;
  };

  // ... rest of implementation
};
```

---

## Migration Strategy

### Phase 1: Add Organization Layer (Without Breaking Changes)

1. **Create OrganizationContext**
   - Load organization data from API
   - Provide license checking methods
   - Don't enforce limits yet (logging only)

2. **Update User Model**
   - Add organizationId field
   - Keep existing auth flow working
   - Auto-create organization for existing users

3. **Update Storage Keys**
   - Keep old format: `recruitiq_{workspaceId}_{key}`
   - Add new format: `recruitiq_{orgId}_{workspaceId}_{key}`
   - Read from old, write to new (dual-write pattern)

### Phase 2: License Validation (Soft Enforcement)

1. **Add License Checks**
   - Check limits before creating resources
   - Show warnings when approaching limits
   - Allow exceeding limits (grace period)

2. **Add Usage Tracking**
   - Track user logins
   - Track resource creation
   - Send telemetry to backend

### Phase 3: Database Migration

1. **Parallel Running**
   - API writes to both localStorage AND database
   - UI reads from database
   - Keep localStorage as fallback

2. **Data Migration Script**
   - Export all localStorage data
   - Transform to organization structure
   - Import into database

### Phase 4: Hard Enforcement

1. **Enforce License Limits**
   - Block actions when limit reached
   - Show upgrade prompts
   - Lock features based on tier

2. **Remove localStorage**
   - All operations through API
   - Remove dual-write logic
   - Clean up migration code

---

## Next Documents

- **ARCHITECTURE_DEPLOYMENT_MODELS.md** - Deployment-specific configurations
- **ARCHITECTURE_API_DESIGN.md** - Complete API specification
- **ARCHITECTURE_SECURITY_PLAN.md** - Security implementation

---

**Status:** ✅ Design Complete  
**Next:** Implementation Planning
