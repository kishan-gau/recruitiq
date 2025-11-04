# Multi-Product SaaS Architecture Guide

**RecruitIQ Platform - Modular Product Architecture**  
**Date:** November 3, 2025  
**Version:** 2.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Philosophy](#architecture-philosophy)
3. [Product Structure](#product-structure)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Design](#database-design)
7. [Implementation Guide](#implementation-guide)
8. [Product Configuration](#product-configuration)
9. [Dynamic Loading System](#dynamic-loading-system)
10. [Access Control](#access-control)
11. [Cross-Product Integration](#cross-product-integration)
12. [Use Cases](#use-cases)

---

## Overview

This document describes the architecture for transforming RecruitIQ into a **multi-product SaaS platform** where customers can subscribe to individual products independently:

- **RecruitIQ** - Applicant Tracking System (ATS)
- **Paylinq** - Payroll Management System
- **Nexus** - Human Resources Information System (HRIS)

Each product can operate **completely standalone** or be combined with others for enhanced cross-product functionality.

### Key Principles

✅ **Product Independence** - Each product is a separate application that can be sold and deployed independently  
✅ **Shared Infrastructure** - Common authentication, billing, and user management via unified backend  
✅ **Data Isolation** - Separate database schemas per product  
✅ **Flexible Licensing** - Different tiers and features per product  
✅ **Cross-Product Integration** - Optional integration when customer subscribes to multiple products  
✅ **Consistent UX** - Shared component library ensures consistent experience across products

### Critical Distinctions

🔴 **Customer-Facing Applications** - Separate React apps for each product (recruitiq/, paylinq/, nexus/)  
🔵 **Platform Admin Portal** - Separate admin application (portal/) for platform owner to manage licenses, security, and monitoring  
🟢 **Unified Backend** - Single Node.js backend with modular product structure  
🟡 **Shared UI Library** - Common component library (shared-ui/) used by all frontend applications  

---

## Architecture Philosophy

### Current State
```
RecruitIQ (Monolithic)
├── recruitiq/ (frontend)
└── backend/ (monolithic)
```

### Target State
```
RecruitIQ Platform (Multi-Product)
├── Frontend Applications (Separate, Independent)
│   ├── shared-ui/           # Shared component library
│   ├── recruitiq/           # ATS frontend (standalone app)
│   ├── paylinq/             # Payroll frontend (standalone app)
│   ├── nexus/               # HRIS frontend (standalone app)
│   └── portal/              # Admin portal (platform owner only)
│
└── Backend (Unified with Product Modules)
    ├── Core Services         # Auth, Users, Organizations, Billing
    ├── RecruitIQ Module      # ATS backend
    ├── Paylinq Module        # Payroll backend
    └── Nexus Module          # HRIS backend
```

### Design Rationale

**Separate Frontend Applications:**
- Each product is an independent React application
- Customers only receive the frontends they subscribe to
- Smaller bundle sizes (no unused product code)
- Independent deployments per product
- Clear team ownership boundaries

**Unified Backend:**
- Single deployment reduces operational complexity
- Shared infrastructure (auth, monitoring, logging)
- Product isolation via modular structure
- Dynamic product loading based on subscription
- Follows industry standard (used by Shopify, Atlassian, HubSpot)
- Can be split into microservices later if needed

**Shared UI Library:**
- Ensures consistent UX across all products
- No code duplication
- Reusable components, hooks, and utilities
- Shared design system and theming
- Used by all customer-facing apps AND admin portal

---

## Product Structure

### Complete Directory Layout

```
RecruitIQ/
├── shared-ui/                         # Shared component library
│   ├── package.json                   # @recruitiq/shared-ui
│   ├── src/
│   │   ├── components/                # Reusable UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── DataTable.jsx
│   │   │   ├── Form/
│   │   │   └── Layout/
│   │   ├── hooks/                     # Shared React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useApi.js
│   │   │   └── usePermissions.js
│   │   ├── utils/                     # Utility functions
│   │   │   ├── api.js
│   │   │   ├── validation.js
│   │   │   └── formatters.js
│   │   ├── contexts/                  # Shared contexts
│   │   │   └── AuthContext.jsx
│   │   └── styles/                    # Shared styles/theme
│   │       └── tailwind-preset.js
│   └── dist/                          # Built library
│
├── recruitiq/                         # RecruitIQ Frontend (Customer-Facing)
│   ├── package.json                   # depends on: @recruitiq/shared-ui
│   ├── src/
│   │   ├── pages/                     # Recruitment-specific pages
│   │   ├── components/                # Recruitment-specific components
│   │   └── main.jsx
│   └── vite.config.js
│
├── paylinq/                           # Paylinq Frontend (Customer-Facing)
│   ├── package.json                   # depends on: @recruitiq/shared-ui
│   ├── src/
│   │   ├── pages/                     # Payroll-specific pages
│   │   ├── components/                # Payroll-specific components
│   │   └── main.jsx
│   └── vite.config.js
│
├── nexus/                             # Nexus Frontend (Customer-Facing)
│   ├── package.json                   # depends on: @recruitiq/shared-ui
│   ├── src/
│   │   ├── pages/                     # HRIS-specific pages
│   │   ├── components/                # HRIS-specific components
│   │   └── main.jsx
│   └── vite.config.js
│
├── portal/                            # Platform Admin Portal (Owner Only)
│   ├── package.json                   # depends on: @recruitiq/shared-ui
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Platform overview
│   │   │   ├── security/              # Security monitoring
│   │   │   ├── logs/                  # Log viewer
│   │   │   └── licenses/              # License management
│   │   └── main.jsx
│   └── README.md                      # "This is for platform owner only"
│
└── backend/                           # Unified Backend
    ├── src/
    │   ├── products/                  # Product modules
    │   │   ├── core/                  # Shared foundation (required)
    │   │   │   ├── auth/
    │   │   │   │   ├── controllers/
    │   │   │   │   ├── services/
    │   │   │   │   └── routes/
    │   │   │   ├── users/
    │   │   │   ├── organizations/
    │   │   │   ├── billing/
    │   │   │   └── index.js
    │   │   │
    │   │   ├── recruitiq/             # Product: ATS/Recruitment
    │   │   │   ├── config/
    │   │   │   │   └── product.config.js
    │   │   │   ├── controllers/
    │   │   │   │   ├── jobController.js
    │   │   │   │   ├── candidateController.js
    │   │   │   │   ├── applicationController.js
    │   │   │   │   └── interviewController.js
    │   │   │   ├── models/
    │   │   │   ├── routes/
    │   │   │   │   ├── jobs.js
│   │   │   ├── candidates.js
│   │   │   ├── applications.js
│   │   │   └── interviews.js
│   │   ├── services/
│   │   │   ├── jobService.js
│   │   │   ├── candidateService.js
│   │   │   └── pipelineService.js
│   │   ├── database/
│   │   │   ├── schema.sql
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   ├── permissions/
│   │   │   └── permissions.json
│   │   ├── tests/
│   │   │   └── *.test.js
│   │   └── index.js                  # Product entry point
│   │
│   ├── payroll/                      # Product: Payroll (standalone)
│   │   ├── config/
│   │   │   └── product.config.js
│   │   ├── controllers/
│   │   │   ├── payrollController.js
│   │   │   ├── timesheetController.js
│   │   │   ├── compensationController.js
│   │   │   └── taxController.js
│   │   ├── models/
│   │   │   ├── Payroll.js
│   │   │   ├── Timesheet.js
│   │   │   ├── Compensation.js
│   │   │   └── TaxDocument.js
│   │   ├── routes/
│   │   │   ├── payroll.js
│   │   │   ├── timesheets.js
│   │   │   ├── compensation.js
│   │   │   └── reports.js
│   │   ├── services/
│   │   │   ├── payrollService.js
│   │   │   ├── taxCalculationService.js
│   │   │   ├── directDepositService.js
│   │   │   └── paymentIntegrationService.js
│   │   ├── database/
│   │   │   ├── schema.sql
│   │   │   └── migrations/
│   │   ├── utils/
│   │   │   ├── taxCalculators.js
│   │   │   └── payrollHelpers.js
│   │   ├── tests/
│   │   └── index.js
│   │
│   └── hris/                         # Product: HRIS (standalone)
│       ├── config/
│       │   └── product.config.js
│       ├── controllers/
│       │   ├── employeeController.js
│       │   ├── benefitsController.js
│       │   ├── performanceController.js
│       │   ├── onboardingController.js
│       │   └── documentController.js
│       ├── models/
│       │   ├── Employee.js
│       │   ├── Benefits.js
│       │   ├── Performance.js
│       │   ├── Onboarding.js
│       │   └── Document.js
│       ├── routes/
│       │   ├── employees.js
│       │   ├── benefits.js
│       │   ├── performance.js
│       │   ├── onboarding.js
│       │   └── documents.js
│       ├── services/
│       │   ├── employeeService.js
│       │   ├── benefitsService.js
│       │   ├── performanceService.js
│       │   ├── documentService.js
│       │   └── integrationService.js
│       ├── database/
│       │   ├── schema.sql
│       │   └── migrations/
│       ├── utils/
│       │   └── hrisHelpers.js
│       ├── tests/
│       └── index.js
│
├── shared/                           # Cross-product utilities
│   ├── database/
│   │   ├── connection.js
│   │   └── queryBuilder.js
│   ├── middleware/
│   │   ├── productAccess.js
│   │   ├── featureAccess.js
│   │   └── tenantIsolation.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validators.js
│   │   └── helpers.js
│   ├── productLoader.js              # Dynamic product loader
│   └── integrationBus.js             # Cross-product events
│
└── server.js                         # Dynamic product loader & router
```

---

## Implementation Guide

### Step 1: Restructure Existing Code

#### 1.1 Move RecruitIQ to Products

```bash
# Create products directory
mkdir -p backend/src/products/recruitiq

# Move existing controllers, models, routes, services
mv backend/src/controllers/{job,candidate,application,interview}* backend/src/products/recruitiq/controllers/
mv backend/src/routes/{jobs,candidates,applications,interviews}.js backend/src/products/recruitiq/routes/
mv backend/src/services/{job,candidate,pipeline}* backend/src/products/recruitiq/services/
```

#### 1.2 Extract Core Services

```bash
# Create core product
mkdir -p backend/src/products/core

# Move shared auth and user management
mv backend/src/controllers/{auth,user,organization}* backend/src/products/core/
mv backend/src/routes/{auth,users,organizations}.js backend/src/products/core/
mv backend/src/services/{auth,user}* backend/src/products/core/
```

### Step 2: Create Product Configurations

#### 2.1 RecruitIQ Product Config

**`products/recruitiq/config/product.config.js`:**

```javascript
export default {
  // Product Identity
  id: 'recruitiq',
  name: 'RecruitIQ',
  version: '1.0.0',
  description: 'Applicant Tracking System',
  icon: 'briefcase',
  
  // Standalone capability
  standalone: true,  // Can run without other products
  
  // Dependencies
  dependencies: {
    required: ['core'],     // Must have core (auth, billing)
    optional: ['hris'],     // Enhanced if HRIS is also enabled
    conflicts: [],          // Products that conflict with this
  },
  
  // Database
  database: {
    schema: 'recruitment',  // Separate schema for data isolation
    migrations: './database/migrations',
    seeds: './database/seeds',
  },
  
  // API Routes
  routes: {
    prefix: '/recruit',     // /api/recruit/*
    version: 'v1',
  },
  
  // Features & Capabilities
  features: [
    'job_posting',
    'candidate_management',
    'interview_scheduling',
    'pipeline_management',
    'public_portal',
    'flow_templates',
    'email_notifications',
    'analytics',
  ],
  
  // Permissions
  permissions: [
    'recruit.view',
    'recruit.jobs.create',
    'recruit.jobs.edit',
    'recruit.jobs.delete',
    'recruit.candidates.view',
    'recruit.candidates.create',
    'recruit.candidates.edit',
    'recruit.interviews.schedule',
    'recruit.analytics.view',
  ],
  
  // License Tiers
  tiers: {
    starter: {
      maxJobs: 5,
      maxCandidates: 100,
      features: ['job_posting', 'candidate_management', 'public_portal'],
      price: {
        monthly: 99,
        annual: 990,
      },
    },
    professional: {
      maxJobs: 25,
      maxCandidates: 500,
      features: [
        'job_posting',
        'candidate_management',
        'interview_scheduling',
        'pipeline_management',
        'public_portal',
        'flow_templates',
      ],
      price: {
        monthly: 299,
        annual: 2990,
      },
    },
    enterprise: {
      maxJobs: -1,        // unlimited
      maxCandidates: -1,  // unlimited
      features: 'all',
      price: 'custom',
    },
  },
  
  // Integration points for cross-product features
  integrations: {
    hris: {
      description: 'Convert hired candidates to employees',
      enabled: false,  // Enabled when HRIS is subscribed
      webhooks: ['candidate.hired'],
      endpoints: ['/convert-to-employee/:candidateId'],
    },
  },
  
  // UI Configuration
  ui: {
    menuItems: [
      { label: 'Dashboard', path: '/recruit/dashboard', icon: 'home' },
      { label: 'Jobs', path: '/recruit/jobs', icon: 'briefcase' },
      { label: 'Candidates', path: '/recruit/candidates', icon: 'users' },
      { label: 'Pipeline', path: '/recruit/pipeline', icon: 'workflow' },
      { label: 'Analytics', path: '/recruit/analytics', icon: 'chart' },
    ],
    primaryColor: '#0ea5a4',
    logo: '/assets/recruitiq-logo.svg',
  },
};
```

#### 2.2 Payroll Product Config

**`products/payroll/config/product.config.js`:**

```javascript
export default {
  // Product Identity
  id: 'payroll',
  name: 'Paylinq',
  version: '1.0.0',
  description: 'Complete payroll management solution',
  icon: 'dollar-sign',
  
  // Standalone capability
  standalone: true,
  
  // Dependencies
  dependencies: {
    required: ['core'],
    optional: ['hris'],     // Enhanced if HRIS is enabled
    conflicts: [],
  },
  
  // Database
  database: {
    schema: 'payroll',
    migrations: './database/migrations',
    seeds: './database/seeds',
  },
  
  // API Routes
  routes: {
    prefix: '/payroll',
    version: 'v1',
  },
  
  // Features
  features: [
    'payroll_processing',
    'timesheet_management',
    'tax_calculation',
    'direct_deposit',
    'pay_stub_generation',
    'year_end_reports',
    'multi_state_tax',
    'contractor_payments',
  ],
  
  // Permissions
  permissions: [
    'payroll.view',
    'payroll.create',
    'payroll.edit',
    'payroll.delete',
    'payroll.process',
    'payroll.approve',
    'payroll.reports',
    'payroll.tax_filings',
  ],
  
  // License Tiers
  tiers: {
    starter: {
      maxEmployees: 10,
      features: [
        'payroll_processing',
        'timesheet_management',
        'pay_stub_generation',
      ],
      price: {
        monthly: 149,
        annual: 1490,
        perEmployee: 5,  // Additional per employee fee
      },
    },
    professional: {
      maxEmployees: 50,
      features: [
        'payroll_processing',
        'timesheet_management',
        'tax_calculation',
        'direct_deposit',
        'pay_stub_generation',
        'year_end_reports',
      ],
      price: {
        monthly: 399,
        annual: 3990,
        perEmployee: 4,
      },
    },
    enterprise: {
      maxEmployees: -1,
      features: 'all',
      price: 'custom',
    },
  },
  
  // Integrations
  integrations: {
    hris: {
      description: 'Sync employee data and compensation',
      enabled: false,
      webhooks: ['employee.created', 'employee.updated', 'employee.terminated'],
      syncData: ['employees', 'compensation', 'departments'],
    },
    recruitiq: {
      description: 'Setup payroll for new hires',
      enabled: false,
      webhooks: ['candidate.hired'],
    },
  },
  
  // UI Configuration
  ui: {
    menuItems: [
      { label: 'Dashboard', path: '/payroll/dashboard', icon: 'home' },
      { label: 'Payroll Runs', path: '/payroll/runs', icon: 'play-circle' },
      { label: 'Timesheets', path: '/payroll/timesheets', icon: 'clock' },
      { label: 'Employees', path: '/payroll/employees', icon: 'users' },
      { label: 'Reports', path: '/payroll/reports', icon: 'file-text' },
      { label: 'Settings', path: '/payroll/settings', icon: 'settings' },
    ],
    primaryColor: '#10b981',
    logo: '/assets/payroll-logo.svg',
  },
};
```

#### 2.3 HRIS Product Config

**`products/hris/config/product.config.js`:**

```javascript
export default {
  // Product Identity
  id: 'hris',
  name: 'Nexus',
  version: '1.0.0',
  description: 'Human Resources Information System',
  icon: 'users-cog',
  
  // Standalone capability
  standalone: true,
  
  // Dependencies
  dependencies: {
    required: ['core'],
    optional: ['payroll', 'recruitiq'],
    conflicts: [],
  },
  
  // Database
  database: {
    schema: 'hris',
    migrations: './database/migrations',
    seeds: './database/seeds',
  },
  
  // API Routes
  routes: {
    prefix: '/hris',
    version: 'v1',
  },
  
  // Features
  features: [
    'employee_management',
    'benefits_administration',
    'performance_reviews',
    'onboarding',
    'offboarding',
    'document_management',
    'time_off_management',
    'organizational_chart',
    'employee_self_service',
    'compliance_tracking',
  ],
  
  // Permissions
  permissions: [
    'hris.view',
    'hris.employees.create',
    'hris.employees.edit',
    'hris.employees.terminate',
    'hris.benefits.view',
    'hris.benefits.manage',
    'hris.performance.view',
    'hris.performance.manage',
    'hris.documents.view',
    'hris.documents.upload',
    'hris.analytics.view',
  ],
  
  // License Tiers
  tiers: {
    starter: {
      maxEmployees: 25,
      features: [
        'employee_management',
        'document_management',
        'employee_self_service',
      ],
      price: {
        monthly: 199,
        annual: 1990,
        perEmployee: 3,
      },
    },
    professional: {
      maxEmployees: 100,
      features: [
        'employee_management',
        'benefits_administration',
        'performance_reviews',
        'onboarding',
        'document_management',
        'time_off_management',
        'employee_self_service',
      ],
      price: {
        monthly: 499,
        annual: 4990,
        perEmployee: 2,
      },
    },
    enterprise: {
      maxEmployees: -1,
      features: 'all',
      price: 'custom',
    },
  },
  
  // Integrations
  integrations: {
    payroll: {
      description: 'Sync employee data and compensation',
      enabled: false,
      webhooks: ['employee.created', 'employee.updated', 'employee.terminated'],
      syncData: ['employees', 'compensation', 'departments'],
    },
    recruitiq: {
      description: 'Convert hired candidates to employees',
      enabled: false,
      webhooks: ['candidate.hired'],
      endpoints: ['/onboard-from-candidate/:candidateId'],
    },
  },
  
  // UI Configuration
  ui: {
    menuItems: [
      { label: 'Dashboard', path: '/hris/dashboard', icon: 'home' },
      { label: 'Employees', path: '/hris/employees', icon: 'users' },
      { label: 'Benefits', path: '/hris/benefits', icon: 'heart' },
      { label: 'Performance', path: '/hris/performance', icon: 'trending-up' },
      { label: 'Onboarding', path: '/hris/onboarding', icon: 'user-plus' },
      { label: 'Documents', path: '/hris/documents', icon: 'folder' },
      { label: 'Reports', path: '/hris/reports', icon: 'file-text' },
    ],
    primaryColor: '#6366f1',
    logo: '/assets/hris-logo.svg',
  },
};
```

---

## Database Design

### Core Schema (Required for All)

```sql
-- Core schema for shared functionality
CREATE SCHEMA IF NOT EXISTS core;

-- Organizations (tenants)
CREATE TABLE core.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  subscription_tier VARCHAR(50) DEFAULT 'starter',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE core.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Product subscriptions
CREATE TABLE core.product_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,  -- 'recruitiq', 'payroll', 'hris'
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'suspended', 'cancelled'
  tier VARCHAR(50) DEFAULT 'starter',   -- 'starter', 'professional', 'enterprise'
  features JSONB DEFAULT '[]'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb,     -- { maxEmployees: 10, maxJobs: 5 }
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, product_id)
);

CREATE INDEX idx_product_subs_org ON core.product_subscriptions(organization_id);
CREATE INDEX idx_product_subs_status ON core.product_subscriptions(status);

-- Product usage tracking
CREATE TABLE core.product_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,
  metric VARCHAR(100) NOT NULL,  -- 'employees', 'payroll_runs', 'candidates', etc.
  value INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_usage_org_product ON core.product_usage(organization_id, product_id);
CREATE INDEX idx_product_usage_recorded ON core.product_usage(recorded_at);

-- Product permissions
CREATE TABLE core.product_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(50) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  permission_name VARCHAR(255) NOT NULL,
  description TEXT,
  UNIQUE(product_id, permission_key)
);

-- User product permissions
CREATE TABLE core.user_product_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  granted_by UUID REFERENCES core.users(id),
  UNIQUE(user_id, product_id, permission_key)
);
```

### Product-Specific Schemas

Each product has its own schema for data isolation:

```sql
-- RecruitIQ Schema
CREATE SCHEMA IF NOT EXISTS recruitment;

-- Payroll Schema
CREATE SCHEMA IF NOT EXISTS payroll;

-- HRIS Schema
CREATE SCHEMA IF NOT EXISTS hris;
```

### Cross-Product Integration Tables

```sql
-- Linking tables for cross-product data
CREATE SCHEMA IF NOT EXISTS integrations;

-- Candidate to Employee mapping (RecruitIQ → HRIS)
CREATE TABLE integrations.candidate_employee_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id),
  candidate_id UUID NOT NULL,  -- From recruitment.candidates
  employee_id UUID NOT NULL,   -- From hris.employees
  converted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  converted_by UUID REFERENCES core.users(id)
);

-- Employee to Payroll mapping (HRIS → Payroll)
CREATE TABLE integrations.employee_payroll_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES core.organizations(id),
  employee_id UUID NOT NULL,      -- From hris.employees
  payroll_record_id UUID NOT NULL, -- From payroll.employees
  synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## Dynamic Loading System

### Product Loader Service

**`shared/productLoader.js`:**

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductLoader {
  constructor() {
    this.products = new Map();
    this.loadedProducts = new Set();
  }

  /**
   * Load all available products from the products directory
   */
  async loadProducts() {
    const productsDir = path.join(__dirname, '../products');
    
    try {
      const productDirs = fs.readdirSync(productsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const productDir of productDirs) {
        await this.loadProduct(productDir, productsDir);
      }

      logger.info(`✅ Loaded ${this.products.size} products`);
      return this.products;
    } catch (error) {
      logger.error('Failed to load products:', error);
      throw error;
    }
  }

  /**
   * Load a single product
   */
  async loadProduct(productDir, productsDir) {
    try {
      const configPath = path.join(productsDir, productDir, 'config', 'product.config.js');
      
      if (!fs.existsSync(configPath)) {
        logger.warn(`No product config found for ${productDir}`);
        return;
      }

      const configUrl = `file://${configPath}`;
      const { default: config } = await import(configUrl);
      
      // Validate product config
      this.validateProductConfig(config);
      
      this.products.set(config.id, {
        ...config,
        path: path.join(productsDir, productDir),
        loaded: false,
      });
      
      logger.info(`📦 Registered product: ${config.name} (${config.id})`);
    } catch (error) {
      logger.error(`Failed to load product ${productDir}:`, error);
      throw error;
    }
  }

  /**
   * Validate product configuration
   */
  validateProductConfig(config) {
    const required = ['id', 'name', 'version', 'routes', 'database'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Product config missing required field: ${field}`);
      }
    }

    if (!config.routes.prefix) {
      throw new Error(`Product ${config.id} missing routes.prefix`);
    }
  }

  /**
   * Get products enabled for a specific organization
   */
  async getEnabledProducts(organizationId, db) {
    try {
      const result = await db.query(
        `SELECT 
          ps.product_id,
          ps.status,
          ps.tier,
          ps.features,
          ps.limits,
          ps.expires_at,
          ps.trial_ends_at
        FROM core.product_subscriptions ps
        WHERE ps.organization_id = $1 
          AND ps.status = 'active'
          AND (ps.expires_at IS NULL OR ps.expires_at > NOW())`,
        [organizationId]
      );

      return result.rows.map(row => ({
        productId: row.product_id,
        status: row.status,
        tier: row.tier,
        features: row.features || [],
        limits: row.limits || {},
        expiresAt: row.expires_at,
        trialEndsAt: row.trial_ends_at,
      }));
    } catch (error) {
      logger.error('Failed to get enabled products:', error);
      return [];
    }
  }

  /**
   * Check if organization has access to a product
   */
  async hasProductAccess(organizationId, productId, db) {
    try {
      const result = await db.query(
        `SELECT 1 
        FROM core.product_subscriptions 
        WHERE organization_id = $1 
          AND product_id = $2 
          AND status = 'active'
          AND (expires_at IS NULL OR expires_at > NOW())`,
        [organizationId, productId]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Failed to check product access:', error);
      return false;
    }
  }

  /**
   * Check feature access for organization
   */
  async hasFeatureAccess(organizationId, productId, feature, db) {
    try {
      const result = await db.query(
        `SELECT features, tier
        FROM core.product_subscriptions 
        WHERE organization_id = $1 
          AND product_id = $2 
          AND status = 'active'`,
        [organizationId, productId]
      );

      if (result.rowCount === 0) return false;

      const { features, tier } = result.rows[0];
      
      // Check if feature is in enabled features list
      if (Array.isArray(features)) {
        return features.includes(feature) || features.includes('all');
      }

      // Fall back to tier-based features
      const product = this.products.get(productId);
      if (product && product.tiers && product.tiers[tier]) {
        const tierFeatures = product.tiers[tier].features;
        return tierFeatures === 'all' || tierFeatures.includes(feature);
      }

      return false;
    } catch (error) {
      logger.error('Failed to check feature access:', error);
      return false;
    }
  }

  /**
   * Check if organization is within usage limits
   */
  async checkUsageLimit(organizationId, productId, metric, db) {
    try {
      const result = await db.query(
        `SELECT limits FROM core.product_subscriptions 
        WHERE organization_id = $1 AND product_id = $2 AND status = 'active'`,
        [organizationId, productId]
      );

      if (result.rowCount === 0) return { allowed: false, reason: 'not_subscribed' };

      const limits = result.rows[0].limits || {};
      const limit = limits[metric];

      // If no limit set or -1 (unlimited), allow
      if (!limit || limit === -1) {
        return { allowed: true };
      }

      // Get current usage
      const usageResult = await db.query(
        `SELECT value FROM core.product_usage 
        WHERE organization_id = $1 AND product_id = $2 AND metric = $3
        ORDER BY recorded_at DESC LIMIT 1`,
        [organizationId, productId, metric]
      );

      const currentUsage = usageResult.rowCount > 0 ? usageResult.rows[0].value : 0;

      if (currentUsage >= limit) {
        return {
          allowed: false,
          reason: 'limit_exceeded',
          current: currentUsage,
          limit: limit,
        };
      }

      return {
        allowed: true,
        current: currentUsage,
        limit: limit,
      };
    } catch (error) {
      logger.error('Failed to check usage limit:', error);
      return { allowed: false, reason: 'error' };
    }
  }

  /**
   * Record product usage metric
   */
  async recordUsage(organizationId, productId, metric, value, db) {
    try {
      await db.query(
        `INSERT INTO core.product_usage 
        (organization_id, product_id, metric, value)
        VALUES ($1, $2, $3, $4)`,
        [organizationId, productId, metric, value]
      );
    } catch (error) {
      logger.error('Failed to record usage:', error);
    }
  }

  /**
   * Get product configuration
   */
  getProduct(productId) {
    return this.products.get(productId);
  }

  /**
   * Get all available products
   */
  getAllProducts() {
    return Array.from(this.products.values());
  }

  /**
   * Check if product is loaded
   */
  isLoaded(productId) {
    return this.loadedProducts.has(productId);
  }

  /**
   * Mark product as loaded
   */
  markAsLoaded(productId) {
    this.loadedProducts.add(productId);
  }
}

export default new ProductLoader();
```

---

## Access Control

### Product Access Middleware

**`shared/middleware/productAccess.js`:**

```javascript
import productLoader from '../productLoader.js';
import logger from '../utils/logger.js';

/**
 * Middleware to check if organization has access to requested product
 */
export const productAccessMiddleware = async (req, res, next) => {
  // Skip for public routes or health checks
  if (!req.user || req.path.startsWith('/health')) {
    return next();
  }

  // Extract product from route
  const productId = extractProductFromRoute(req.path);
  
  // If no product identified, allow (might be core route)
  if (!productId) {
    return next();
  }

  try {
    // Check if organization has access to this product
    const hasAccess = await productLoader.hasProductAccess(
      req.user.organization_id,
      productId,
      req.db
    );

    if (!hasAccess) {
      const product = productLoader.getProduct(productId);
      
      logger.warn(`Access denied to product ${productId} for org ${req.user.organization_id}`);
      
      return res.status(403).json({
        error: 'access_denied',
        message: `Your organization doesn't have access to ${product?.name || productId}`,
        code: 'PRODUCT_NOT_SUBSCRIBED',
        productId: productId,
        productName: product?.name,
      });
    }

    // Attach product info to request for later use
    req.product = productLoader.getProduct(productId);
    req.productId = productId;
    
    next();
  } catch (error) {
    logger.error('Product access check failed:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to verify product access',
    });
  }
};

/**
 * Middleware to check specific feature access
 */
export const requireFeature = (productId, feature) => {
  return async (req, res, next) => {
    try {
      const hasAccess = await productLoader.hasFeatureAccess(
        req.user.organization_id,
        productId,
        feature,
        req.db
      );

      if (!hasAccess) {
        const product = productLoader.getProduct(productId);
        
        return res.status(403).json({
          error: 'feature_not_available',
          message: `This feature requires an upgrade to access`,
          feature: feature,
          productId: productId,
          productName: product?.name,
          upgradeUrl: `/billing/upgrade?product=${productId}&feature=${feature}`,
        });
      }

      next();
    } catch (error) {
      logger.error('Feature access check failed:', error);
      res.status(500).json({
        error: 'internal_error',
        message: 'Failed to verify feature access',
      });
    }
  };
};

/**
 * Middleware to check usage limits
 */
export const checkUsageLimit = (productId, metric) => {
  return async (req, res, next) => {
    try {
      const limitCheck = await productLoader.checkUsageLimit(
        req.user.organization_id,
        productId,
        metric,
        req.db
      );

      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: 'limit_exceeded',
          message: `You've reached your ${metric} limit`,
          metric: metric,
          current: limitCheck.current,
          limit: limitCheck.limit,
          upgradeUrl: `/billing/upgrade?product=${productId}`,
        });
      }

      // Attach limit info to request
      req.usageLimit = limitCheck;
      
      next();
    } catch (error) {
      logger.error('Usage limit check failed:', error);
      res.status(500).json({
        error: 'internal_error',
        message: 'Failed to verify usage limits',
      });
    }
  };
};

/**
 * Extract product ID from route path
 * Examples:
 *   /api/payroll/runs -> 'payroll'
 *   /api/hris/employees -> 'hris'
 *   /api/recruit/jobs -> 'recruitiq'
 */
function extractProductFromRoute(path) {
  // Remove /api prefix if present
  const cleanPath = path.replace(/^\/api/, '');
  
  // Match product routes
  const match = cleanPath.match(/^\/(payroll|hris|recruit)/);
  
  if (!match) return null;
  
  // Map route prefix to product ID
  const routeToProduct = {
    'payroll': 'payroll',
    'hris': 'hris',
    'recruit': 'recruitiq',
  };
  
  return routeToProduct[match[1]];
}
```

---

## Cross-Product Integration

### Integration Bus for Cross-Product Events

**`shared/integrationBus.js`:**

```javascript
import EventEmitter from 'events';
import logger from './utils/logger.js';
import productLoader from './productLoader.js';

class IntegrationBus extends EventEmitter {
  constructor() {
    super();
    this.integrations = new Map();
  }

  /**
   * Register integration handlers
   */
  registerIntegration(sourceProduct, targetProduct, config) {
    const key = `${sourceProduct}:${targetProduct}`;
    this.integrations.set(key, config);
    
    logger.info(`✅ Registered integration: ${key}`);
  }

  /**
   * Emit cross-product event
   * Example: candidateHired(candidateData, organizationId)
   */
  async emitProductEvent(sourceProduct, eventName, data, organizationId, db) {
    try {
      // Get enabled products for this organization
      const enabledProducts = await productLoader.getEnabledProducts(organizationId, db);
      const enabledProductIds = enabledProducts.map(p => p.productId);

      // Find registered integrations for this source product
      for (const [key, config] of this.integrations.entries()) {
        const [source, target] = key.split(':');
        
        if (source !== sourceProduct) continue;
        if (!enabledProductIds.includes(target)) continue;
        
        // Check if this event is configured for this integration
        if (!config.webhooks || !config.webhooks.includes(eventName)) continue;

        logger.info(`🔗 Triggering integration: ${key} for event ${eventName}`);
        
        // Emit event for handlers to process
        this.emit(`${key}:${eventName}`, {
          organizationId,
          sourceProduct,
          targetProduct: target,
          eventName,
          data,
          db,
        });
      }
    } catch (error) {
      logger.error(`Failed to emit product event ${eventName}:`, error);
    }
  }

  /**
   * Handle candidate hired event
   * Converts candidate to employee in HRIS
   */
  async handleCandidateHired(eventData) {
    const { organizationId, data, db } = eventData;
    
    try {
      // Import HRIS employee service
      const { employeeService } = await import('../products/hris/services/employeeService.js');
      
      // Convert candidate to employee
      const employee = await employeeService.createFromCandidate(
        data.candidate,
        data.jobDetails,
        organizationId,
        db
      );
      
      // Store mapping
      await db.query(
        `INSERT INTO integrations.candidate_employee_map 
        (organization_id, candidate_id, employee_id, converted_by)
        VALUES ($1, $2, $3, $4)`,
        [organizationId, data.candidate.id, employee.id, data.hiredBy]
      );
      
      logger.info(`✅ Converted candidate ${data.candidate.id} to employee ${employee.id}`);
      
      return employee;
    } catch (error) {
      logger.error('Failed to convert candidate to employee:', error);
      throw error;
    }
  }

  /**
   * Handle employee created event
   * Setup payroll for new employee
   */
  async handleEmployeeCreated(eventData) {
    const { organizationId, data, db } = eventData;
    
    try {
      // Import payroll service
      const { payrollService } = await import('../products/payroll/services/payrollService.js');
      
      // Create payroll record for employee
      const payrollRecord = await payrollService.createEmployeeRecord(
        data.employee,
        organizationId,
        db
      );
      
      // Store mapping
      await db.query(
        `INSERT INTO integrations.employee_payroll_map 
        (organization_id, employee_id, payroll_record_id)
        VALUES ($1, $2, $3)`,
        [organizationId, data.employee.id, payrollRecord.id]
      );
      
      logger.info(`✅ Created payroll record for employee ${data.employee.id}`);
      
      return payrollRecord;
    } catch (error) {
      logger.error('Failed to create payroll record:', error);
      throw error;
    }
  }
}

export default new IntegrationBus();
```

### Setup Integration Handlers

**`shared/setupIntegrations.js`:**

```javascript
import integrationBus from './integrationBus.js';
import logger from './utils/logger.js';

export async function setupIntegrations() {
  try {
    // RecruitIQ → HRIS Integration
    integrationBus.registerIntegration('recruitiq', 'hris', {
      webhooks: ['candidate.hired'],
      syncData: ['candidates'],
    });

    integrationBus.on('recruitiq:hris:candidate.hired', async (eventData) => {
      await integrationBus.handleCandidateHired(eventData);
    });

    // HRIS → Payroll Integration
    integrationBus.registerIntegration('hris', 'payroll', {
      webhooks: ['employee.created', 'employee.updated', 'employee.terminated'],
      syncData: ['employees', 'compensation'],
    });

    integrationBus.on('hris:payroll:employee.created', async (eventData) => {
      await integrationBus.handleEmployeeCreated(eventData);
    });

    // RecruitIQ → Payroll Integration (direct)
    integrationBus.registerIntegration('recruitiq', 'payroll', {
      webhooks: ['candidate.hired'],
    });

    logger.info('✅ Product integrations configured');
  } catch (error) {
    logger.error('Failed to setup integrations:', error);
  }
}
```

---

## Frontend Architecture

### Overview

The frontend consists of **four separate React applications** plus a **shared component library**:

1. **shared-ui/** - Shared component library (npm package)
2. **recruitiq/** - RecruitIQ ATS application (customer-facing)
3. **paylinq/** - Paylinq Payroll application (customer-facing)
4. **nexus/** - Nexus HRIS application (customer-facing)
5. **portal/** - Platform admin portal (owner-only)

### Key Characteristics

✅ **Complete Independence** - Each product is a separate React application  
✅ **Standalone Deployment** - Each app can be deployed independently  
✅ **Selective Distribution** - Customers only receive apps they subscribe to  
✅ **Smaller Bundles** - No unused product code shipped  
✅ **Consistent UX** - Shared library ensures consistency  
✅ **No Duplication** - Common code lives in shared-ui library

### Application Purposes

| Application | Purpose | Users | Deployment |
|------------|---------|-------|-----------|
| **recruitiq/** | ATS features | Customers with RecruitIQ subscription | recruit.customer.com |
| **paylinq/** | Payroll features | Customers with Paylinq subscription | payroll.customer.com |
| **nexus/** | HRIS features | Customers with Nexus subscription | hris.customer.com |
| **portal/** | Platform administration | Platform owner only | portal.recruitiq.com |
| **shared-ui/** | Component library | Used by all above apps | npm package |

### Shared UI Library Structure

**`shared-ui/package.json`:**

```json
{
  "name": "@recruitiq/shared-ui",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": "./dist/index.js",
    "./components": "./dist/components/index.js",
    "./hooks": "./dist/hooks/index.js",
    "./utils": "./dist/utils/index.js",
    "./contexts": "./dist/contexts/index.js"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^7.1.12",
    "tailwindcss": "^3.4.18",
    "@vitejs/plugin-react": "^5.0.1"
  }
}
```

**Usage in product applications:**

```javascript
// In recruitiq/src/pages/Jobs.jsx
import { Button, DataTable, Modal } from '@recruitiq/shared-ui/components';
import { useAuth, useApi } from '@recruitiq/shared-ui/hooks';
import { formatDate, validateEmail } from '@recruitiq/shared-ui/utils';

export default function Jobs() {
  const { user } = useAuth();
  const { data, loading } = useApi('/api/recruit/jobs');
  
  return (
    <div>
      <h1>Jobs</h1>
      <DataTable data={data} loading={loading} />
      <Button variant="primary">Add Job</Button>
    </div>
  );
}
```

### Product Application Structure

Each product application follows the same structure:

```
{product}/
├── package.json           # depends on @recruitiq/shared-ui
├── vite.config.js
├── tailwind.config.js     # extends shared-ui preset
├── src/
│   ├── main.jsx           # Entry point
│   ├── App.jsx            # Routes
│   ├── pages/             # Product-specific pages
│   │   ├── Dashboard.jsx
│   │   ├── {Feature}List.jsx
│   │   └── {Feature}Details.jsx
│   ├── components/        # Product-specific components
│   │   └── {Feature}Card.jsx
│   ├── services/          # API calls
│   │   └── api.js
│   └── utils/             # Product-specific utilities
└── public/
```

### Customer Experience Examples

**Example 1: Customer with only Paylinq**
```
Deployment:
- payroll.acmecorp.com  ← paylinq/ app deployed

Customer access:
- ✅ Payroll features only
- ✅ Fast, focused app
- ✅ Small bundle size
- ❌ No recruitment or HRIS features visible
```

**Example 2: Customer with RecruitIQ + Nexus**
```
Deployment:
- recruit.acmecorp.com  ← recruitiq/ app deployed
- hris.acmecorp.com     ← nexus/ app deployed

Customer access:
- ✅ Can use both apps
- ✅ Single sign-on via shared auth
- ✅ Cross-product links (convert candidate → employee)
- ✅ Each app focused on its domain
- ❌ No payroll features
```

**Example 3: Customer with all three products**
```
Deployment:
- recruit.acmecorp.com  ← recruitiq/ app deployed
- payroll.acmecorp.com  ← paylinq/ app deployed
- hris.acmecorp.com     ← nexus/ app deployed

Customer access:
- ✅ All three apps available
- ✅ Full integration: candidate → employee → payroll
- ✅ Unified navigation/menu
- ✅ Single sign-on across all apps
```

### Development Workflow

#### Option A: NPM Workspaces (Recommended)

**Root `package.json`:**

```json
{
  "name": "recruitiq-platform",
  "private": true,
  "workspaces": [
    "shared-ui",
    "recruitiq",
    "paylinq",
    "nexus",
    "portal"
  ],
  "scripts": {
    "dev:shared": "cd shared-ui && npm run dev",
    "dev:recruit": "cd recruitiq && npm run dev",
    "dev:payroll": "cd paylinq && npm run dev",
    "dev:hris": "cd nexus && npm run dev",
    "dev:portal": "cd portal && npm run dev",
    "build:all": "npm run build --workspaces",
    "test:all": "npm run test --workspaces"
  }
}
```

**Benefits:**
- Single `npm install` at root
- Automatic linking of shared-ui
- Changes to shared-ui immediately available
- No need to publish during development

#### Development Commands

```bash
# Install all dependencies
npm install

# Run specific product in dev mode
npm run dev:recruit   # Starts recruitiq on localhost:5173
npm run dev:payroll   # Starts paylinq on localhost:5174
npm run dev:hris      # Starts nexus on localhost:5175
npm run dev:portal    # Starts portal on localhost:5176

# Build all products
npm run build:all

# Test all products
npm run test:all
```

### Cross-Product Navigation

```javascript
// shared-ui/src/utils/navigation.js
export function getProductUrl(productId) {
  const domain = import.meta.env.VITE_CUSTOMER_DOMAIN;
  
  const urls = {
    recruitiq: `https://recruit.${domain}`,
    paylinq: `https://payroll.${domain}`,
    nexus: `https://hris.${domain}`,
  };
  
  return urls[productId] || '/';
}

export function createCrossProductLink(productId, path = '/') {
  return `${getProductUrl(productId)}${path}`;
}

// Usage in any product app
import { createCrossProductLink } from '@recruitiq/shared-ui/utils';

function ConvertToEmployee({ candidateId }) {
  const handleConvert = async () => {
    const employee = await api.post('/api/integrations/convert-candidate', {
      candidateId
    });
    
    // Open HRIS app with new employee
    const hrisUrl = createCrossProductLink('nexus', `/employees/${employee.id}`);
    window.open(hrisUrl, '_blank');
  };
  
  return <Button onClick={handleConvert}>Convert to Employee</Button>;
}
```

---

## Backend Architecture

### Overview: Unified Modular Monolith

The backend uses a **unified modular monolith** architecture - a single Node.js/Express application with clear product boundaries. This is the industry-standard approach used by Shopify, Atlassian, HubSpot, and other successful multi-product SaaS platforms.

### Key Characteristics

✅ **Single Application** - One Express server, one deployment  
✅ **Product Modules** - Clear separation via directory structure  
✅ **Dynamic Loading** - Products loaded based on subscriptions  
✅ **Shared Infrastructure** - Auth, database, monitoring shared  
✅ **Independent Schemas** - Each product has its own database schema  
✅ **Future-Proof** - Can split into microservices later if needed

### Backend Structure

```
backend/
├── src/
│   ├── server.js                      # Main server with dynamic product loading
│   │
│   ├── products/                      # Product modules
│   │   ├── core/                      # Core/shared (always loaded)
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── organizations/
│   │   │   ├── billing/
│   │   │   └── subscriptions/
│   │   │
│   │   ├── recruitiq/                 # RecruitIQ product module
│   │   │   ├── config/
│   │   │   │   └── product.config.js
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── routes/
│   │   │   └── models/
│   │   │
│   │   ├── paylinq/                   # Paylinq product module
│   │   │   ├── config/
│   │   │   │   └── product.config.js
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── routes/
│   │   │   └── models/
│   │   │
│   │   └── nexus/                     # Nexus product module
│   │       ├── config/
│   │       │   └── product.config.js
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── repositories/
│   │       ├── routes/
│   │       └── models/
│   │
│   ├── shared/                        # Shared utilities
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── productAccess.js       # Check subscription
│   │   │   ├── rateLimit.js
│   │   │   └── errorHandler.js
│   │   ├── database/
│   │   │   ├── pool.js
│   │   │   ├── query.js               # Enhanced query wrapper
│   │   │   └── migrations/
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   ├── validator.js
│   │   │   └── encryption.js
│   │   └── productLoader.js           # Dynamic product loading
│   │
│   └── integrations/                  # Cross-product integrations
│       ├── integrationBus.js
│       └── handlers/
│
└── database/
    ├── schemas/
    │   ├── 001_core.sql               # Core schema
    │   ├── 002_recruitment.sql        # RecruitIQ schema
    │   ├── 003_payroll.sql            # Paylinq schema
    │   ├── 004_hris.sql               # Nexus schema
    │   └── 005_integrations.sql       # Cross-product tables
    └── migrations/
```

### Dynamic Product Loading

**`src/server.js`:**

```javascript
import express from 'express';
import productLoader from './shared/productLoader.js';
import { productAccessMiddleware } from './shared/middleware/productAccess.js';
import logger from './shared/utils/logger.js';

const app = express();

// Standard middleware
app.use(express.json());
app.use(cors());

// Load products dynamically
const products = ['core', 'recruitiq', 'paylinq', 'nexus'];

for (const productId of products) {
  await productLoader.loadProduct(productId);
}

// Register routes with access control
for (const [productId, product] of productLoader.getAllProducts()) {
  if (product.routes) {
    logger.info(`📍 Mounting ${productId} routes at ${product.routes.prefix}`);
    
    // Apply product access middleware (except for core)
    if (productId !== 'core') {
      app.use(product.routes.prefix, productAccessMiddleware(productId));
    }
    
    app.use(product.routes.prefix, product.routes.router);
  }
}

app.listen(4000, () => {
  logger.info('🚀 Backend server running on port 4000');
});
```

### Product Access Middleware

**`src/shared/middleware/productAccess.js`:**

```javascript
import productLoader from '../productLoader.js';
import logger from '../utils/logger.js';

/**
 * Middleware to check if organization has access to a product
 */
export function productAccessMiddleware(productId) {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Check if organization has active subscription
      const hasAccess = await productLoader.hasProductAccess(
        organizationId,
        productId,
        req.db
      );

      if (!hasAccess) {
        logger.warn(`Access denied: org ${organizationId} to product ${productId}`);
        
        return res.status(403).json({
          success: false,
          error: `Access denied. Your organization does not have an active subscription to ${productId}.`,
          code: 'PRODUCT_ACCESS_DENIED',
          productId
        });
      }

      // Attach product info to request
      req.product = {
        id: productId,
        info: productLoader.getProduct(productId)
      };

      next();
    } catch (error) {
      logger.error('Product access check failed:', error);
      next(error);
    }
  };
}
```

### Database: Schema Isolation

```sql
-- Single PostgreSQL database with multiple schemas

-- Core schema (always accessible)
CREATE SCHEMA IF NOT EXISTS core;

-- Product schemas (access controlled by subscriptions)
CREATE SCHEMA IF NOT EXISTS recruitment;
CREATE SCHEMA IF NOT EXISTS payroll;
CREATE SCHEMA IF NOT EXISTS hris;

-- Cross-product integration schema
CREATE SCHEMA IF NOT EXISTS integrations;
```

**Benefits of this approach:**
- ✅ Strong isolation between products
- ✅ Can't accidentally query wrong product tables
- ✅ Easy cross-product queries when needed (for integrations)
- ✅ Single backup/restore
- ✅ Can extract to separate databases later
- ✅ Follows principle of least privilege

### Request Flow Example

```
Customer Request:
GET https://recruit.customer.com/api/recruit/jobs
              ↓
1. Frontend (recruitiq/) makes API call
              ↓
2. Backend receives request at /api/recruit/jobs
              ↓
3. Auth middleware verifies JWT token
              ↓
4. Product access middleware checks:
   - Does org have 'recruitiq' subscription?
   - Is subscription active?
   - Is within usage limits?
              ↓
5. If authorized, route to recruitiq/routes/jobs.js
              ↓
6. Controller → Service → Repository
              ↓
7. Repository uses schema: recruitment.jobs
              ↓
8. Response sent back to frontend
```

### Why Modular Monolith vs Microservices?

**Current Choice: Modular Monolith**

✅ Simpler deployment and operations  
✅ Lower infrastructure cost  
✅ Easier debugging and testing  
✅ No distributed systems complexity  
✅ Can still achieve product isolation  
✅ Used successfully by billion-dollar companies  

**Future: Can Migrate to Microservices**

```javascript
// Current: All products in one server
await productLoader.loadProduct('recruitiq');
await productLoader.loadProduct('paylinq');
await productLoader.loadProduct('nexus');

// Future: Separate services
// recruitiq-service: only loads 'recruitiq'
// paylinq-service: only loads 'paylinq'
// nexus-service: only loads 'nexus'
// api-gateway: routes requests to services
```

The modular structure allows this transition when/if needed:
- **Now:** Deploy as single application
- **Growth:** Add more server instances (horizontal scaling)
- **Massive Scale:** Split into microservices with API gateway

---

## Database Design

### Phase 1: Preparation (Week 1-2)

1. **Backup everything**
   ```bash
   pg_dump recruitiq_production > backup_before_migration.sql
   git checkout -b feature/multi-product-architecture
   ```

2. **Create new directory structure**
   ```bash
   mkdir -p backend/src/products/{core,recruitiq,payroll,hris}
   mkdir -p backend/src/shared/{middleware,utils}
   ```

3. **Create core schema**
   ```sql
   CREATE SCHEMA IF NOT EXISTS core;
   -- Run core schema migrations
   ```

### Phase 2: Restructure RecruitIQ (Week 3-4)

1. **Move RecruitIQ code to product directory**
   - Move controllers, models, routes, services
   - Update imports
   - Create product.config.js

2. **Create recruitment schema**
   ```sql
   CREATE SCHEMA recruitment;
   ALTER TABLE jobs SET SCHEMA recruitment;
   ALTER TABLE candidates SET SCHEMA recruitment;
   -- etc.
   ```

3. **Test RecruitIQ in new structure**
   ```bash
   npm test
   npm run dev
   ```

### Phase 3: Implement Product Loader (Week 5)

1. **Create productLoader.js**
2. **Create productAccess.js middleware**
3. **Update server.js for dynamic loading**
4. **Add product subscription tables**

### Phase 4: Build Payroll Product (Week 6-10)

1. **Create payroll product structure**
2. **Implement payroll schema**
3. **Build payroll controllers and services**
4. **Create payroll UI**
5. **Test standalone payroll**

### Phase 5: Build HRIS Product (Week 11-15)

1. **Create HRIS product structure**
2. **Implement HRIS schema**
3. **Build HRIS controllers and services**
4. **Create HRIS UI**
5. **Test standalone HRIS**

### Phase 6: Cross-Product Integration (Week 16-18)

1. **Implement integrationBus**
2. **Create integration mappings**
3. **Test RecruitIQ → HRIS conversion**
4. **Test HRIS → Payroll sync**
5. **Test all three products together**

### Phase 7: Testing & Launch (Week 19-20)

1. **Full integration testing**
2. **Performance testing**
3. **Security audit**
4. **Documentation**
5. **Gradual rollout**

---

## Use Cases

### Use Case 1: Client Wants Only Payroll

**Subscription:**
```json
{
  "organization_id": "org-123",
  "subscribed_products": ["core", "payroll"],
  "product_subscriptions": [
    {
      "product_id": "payroll",
      "tier": "professional",
      "limits": { "maxEmployees": 50 }
    }
  ]
}
```

**Available Routes:**
- ✅ `/api/auth/*` (Core)
- ✅ `/api/organizations/*` (Core)
- ✅ `/api/users/*` (Core)
- ✅ `/api/payroll/*` (Payroll)
- ✅ `/api/payroll/timesheets/*` (Payroll)
- ✅ `/api/payroll/reports/*` (Payroll)
- ❌ `/api/recruit/*` (Not subscribed - 403)
- ❌ `/api/hris/*` (Not subscribed - 403)

**Frontend:**
- Shows only Payroll app
- No product switcher (only one product)
- Payroll branding and colors

### Use Case 2: Client Wants RecruitIQ + HRIS

**Subscription:**
```json
{
  "organization_id": "org-456",
  "subscribed_products": ["core", "recruitiq", "hris"],
  "product_subscriptions": [
    {
      "product_id": "recruitiq",
      "tier": "professional",
      "limits": { "maxJobs": 25, "maxCandidates": 500 }
    },
    {
      "product_id": "hris",
      "tier": "starter",
      "limits": { "maxEmployees": 25 }
    }
  ]
}
```

**Available Routes:**
- ✅ `/api/auth/*`
- ✅ `/api/recruit/*`
- ✅ `/api/hris/*`
- ❌ `/api/payroll/*` (Not subscribed)

**Enhanced Features:**
- Candidate to Employee conversion
- When candidate is hired in RecruitIQ, automatically create employee record in HRIS
- Unified reporting across recruitment and HR

### Use Case 3: Full Suite (All Products)

**Subscription:**
```json
{
  "organization_id": "org-789",
  "subscribed_products": ["core", "recruitiq", "hris", "payroll"],
  "product_subscriptions": [
    {
      "product_id": "recruitiq",
      "tier": "enterprise"
    },
    {
      "product_id": "hris",
      "tier": "enterprise"
    },
    {
      "product_id": "payroll",
      "tier": "enterprise"
    }
  ]
}
```

**Available Routes:**
- ✅ All routes from all products

**Enhanced Features:**
- **RecruitIQ → HRIS:** Convert candidates to employees
- **HRIS → Payroll:** Sync employee data and compensation
- **RecruitIQ → Payroll:** Setup payroll for new hires
- Unified dashboard showing metrics from all products
- Cross-product reporting and analytics

---

## Benefits Summary

### Business Benefits
- ✅ **Flexible Pricing:** Sell products individually or as bundles
- ✅ **Market Expansion:** Target different customer segments
- ✅ **Revenue Growth:** Upsell additional products to existing customers
- ✅ **Competitive Advantage:** Offer standalone or integrated solutions

### Technical Benefits
- ✅ **Scalability:** Add new products without affecting existing ones
- ✅ **Maintainability:** Clear separation of concerns
- ✅ **Testing:** Test products independently
- ✅ **Deployment:** Deploy products independently (future microservices)
- ✅ **Team Organization:** Different teams can own different products

### Customer Benefits
- ✅ **Choice:** Buy only what they need
- ✅ **Cost-Effective:** No paying for unused features
- ✅ **Growth Path:** Easy to add products as they grow
- ✅ **Integration:** Products work better together when needed

---

## Next Steps

1. **Review and Approve** this architecture document
2. **Set up shared-ui** component library with npm workspaces
3. **Create Paylinq and Nexus** frontend applications (copy structure from recruitiq/)
4. **Restructure backend** into products/ directory with modular structure
5. **Implement product loader** and dynamic routing in backend
6. **Create database schemas** for each product (core, recruitment, payroll, hris)
7. **Begin Phase 1** of implementation plan (see MULTI_PRODUCT_IMPLEMENTATION_PLAN.md)

---

## Conclusion

This multi-product SaaS architecture provides **maximum flexibility** for both the business and customers. Each product operates as a **completely independent application** while benefiting from shared infrastructure and optional cross-product integrations.

### Architecture Summary

**Frontend:**
- ✅ **4 separate React applications** (recruitiq, paylinq, nexus, portal)
- ✅ **1 shared component library** (@recruitiq/shared-ui)
- ✅ Customers receive **only the apps they subscribe to**
- ✅ Each app can be deployed independently
- ✅ Consistent UX via shared components

**Backend:**
- ✅ **Unified modular monolith** (single Express server)
- ✅ **Product modules** with clear boundaries
- ✅ **Dynamic product loading** based on subscriptions
- ✅ **Schema isolation** per product
- ✅ Can scale to microservices when needed

**Database:**
- ✅ **Single PostgreSQL database** with multiple schemas
- ✅ **Schema-level isolation** (core, recruitment, payroll, hris)
- ✅ Shared infrastructure, isolated data
- ✅ Easy cross-product integration when needed

### Key Benefits

**For the Business:**
- Sell products individually or as bundles
- Target different market segments
- Upsell additional products to existing customers
- Flexible pricing models per product

**For Customers:**
- Buy only what they need
- No paying for unused features
- Easy to add more products as they grow
- Seamless integration when using multiple products

**For Development:**
- Clear team ownership per product
- Independent testing and deployment
- Maintainable and scalable
- Follows industry best practices

This architecture positions RecruitIQ as a true **enterprise HR platform** offering flexible, standalone products that can work independently or as an integrated suite.

---

**Document Version:** 2.0  
**Last Updated:** November 3, 2025  
**Status:** Approved - Ready for Implementation

**Key Clarifications in v2.0:**
- Separated customer-facing apps (recruitiq, paylinq, nexus) from admin portal
- Added shared-ui component library approach
- Clarified unified modular monolith backend architecture
- Emphasized product independence and standalone capabilities
