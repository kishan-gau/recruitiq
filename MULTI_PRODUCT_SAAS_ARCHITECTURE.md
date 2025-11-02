# Multi-Product SaaS Architecture Guide

**RecruitIQ Platform - Modular Product Architecture**  
**Date:** October 31, 2025  
**Version:** 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Philosophy](#architecture-philosophy)
3. [Product Structure](#product-structure)
4. [Implementation Guide](#implementation-guide)
5. [Database Design](#database-design)
6. [Product Configuration](#product-configuration)
7. [Dynamic Loading System](#dynamic-loading-system)
8. [Access Control](#access-control)
9. [Cross-Product Integration](#cross-product-integration)
10. [Frontend Architecture](#frontend-architecture)
11. [Migration Strategy](#migration-strategy)
12. [Use Cases](#use-cases)

---

## Overview

This document describes the architecture for transforming RecruitIQ into a **multi-product SaaS platform** where customers can subscribe to individual products independently:

- **RecruitIQ** - Applicant Tracking System (ATS)
- **PayrollPro** - Payroll Management System
- **HRIS Suite** - Human Resources Information System

Each product can operate **standalone** or be combined with others for enhanced cross-product functionality.

### Key Principles

✅ **Product Independence** - Each product can be sold and used independently  
✅ **Shared Infrastructure** - Common authentication, billing, and user management  
✅ **Data Isolation** - Separate database schemas per product  
✅ **Flexible Licensing** - Different tiers and features per product  
✅ **Cross-Product Integration** - Optional integration when multiple products are active  
✅ **Unified Experience** - Single sign-on and unified portal  

---

## Architecture Philosophy

### Current State
```
RecruitIQ (Monolithic)
└── Single product with all features
```

### Target State
```
Platform (Multi-Product)
├── Core (Shared Services)
│   ├── Authentication
│   ├── User Management
│   ├── Organizations
│   └── Billing
├── RecruitIQ (Product)
├── PayrollPro (Product)
└── HRIS Suite (Product)
```

---

## Product Structure

### Directory Layout

```
backend/src/
├── products/                          # Standalone products
│   ├── core/                         # Shared foundation (required)
│   │   ├── auth/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── routes/
│   │   ├── users/
│   │   ├── organizations/
│   │   ├── billing/
│   │   └── index.js
│   │
│   ├── recruitiq/                    # Product: ATS/Recruitment
│   │   ├── config/
│   │   │   └── product.config.js     # Product metadata
│   │   ├── controllers/
│   │   │   ├── jobController.js
│   │   │   ├── candidateController.js
│   │   │   ├── applicationController.js
│   │   │   └── interviewController.js
│   │   ├── models/
│   │   │   ├── Job.js
│   │   │   ├── Candidate.js
│   │   │   ├── Application.js
│   │   │   └── Interview.js
│   │   ├── routes/
│   │   │   ├── jobs.js
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
  name: 'PayrollPro',
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
  name: 'HRIS Suite',
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

### Multi-Product Portal Structure

```
portal/src/
├── apps/                              # Product-specific apps
│   ├── payroll/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PayrollRuns.jsx
│   │   │   ├── Timesheets.jsx
│   │   │   └── Reports.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── PayrollApp.jsx
│   │
│   ├── hris/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Employees.jsx
│   │   │   ├── Benefits.jsx
│   │   │   └── Performance.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── HRISApp.jsx
│   │
│   └── recruitiq/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Jobs.jsx
│       │   ├── Candidates.jsx
│       │   └── Pipeline.jsx
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── RecruitIQApp.jsx
│
├── shared/
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── ProductSwitcher.jsx      # Switch between products
│   │   ├── Sidebar.jsx
│   │   └── Header.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   ├── ProductContext.jsx       # Current product state
│   │   └── SubscriptionContext.jsx   # Subscribed products
│   ├── hooks/
│   │   ├── useProducts.js
│   │   ├── useProductAccess.js
│   │   └── useFeatureAccess.js
│   └── services/
│       ├── api.js
│       └── productApi.js
│
├── App.jsx                            # Main app router
├── main.jsx
└── routes.jsx
```

### Product Context Provider

**`shared/contexts/ProductContext.jsx`:**

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const ProductContext = createContext();

export function ProductProvider({ children }) {
  const { user } = useAuth();
  const [subscribedProducts, setSubscribedProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubscribedProducts();
    }
  }, [user]);

  async function loadSubscribedProducts() {
    try {
      const response = await api.get('/api/products');
      setSubscribedProducts(response.products);
      
      // Set default product if none selected
      if (!currentProduct && response.products.length > 0) {
        setCurrentProduct(response.products[0].id);
      }
    } catch (error) {
      console.error('Failed to load subscribed products:', error);
    } finally {
      setLoading(false);
    }
  }

  function getProduct(productId) {
    return subscribedProducts.find(p => p.id === productId);
  }

  function hasProduct(productId) {
    return subscribedProducts.some(p => p.id === productId);
  }

  function hasFeature(productId, feature) {
    const product = getProduct(productId);
    if (!product) return false;
    
    return product.features === 'all' || 
           (Array.isArray(product.features) && product.features.includes(feature));
  }

  const value = {
    subscribedProducts,
    currentProduct,
    setCurrentProduct,
    getProduct,
    hasProduct,
    hasFeature,
    loading,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within ProductProvider');
  }
  return context;
}
```

### Product Switcher Component

**`shared/components/ProductSwitcher.jsx`:**

```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProduct } from '../contexts/ProductContext';

export default function ProductSwitcher() {
  const { subscribedProducts, currentProduct, setCurrentProduct } = useProduct();
  const navigate = useNavigate();

  const handleProductSwitch = (productId) => {
    setCurrentProduct(productId);
    
    // Navigate to product dashboard
    const routes = {
      'recruitiq': '/recruit/dashboard',
      'payroll': '/payroll/dashboard',
      'hris': '/hris/dashboard',
    };
    
    navigate(routes[productId] || '/');
  };

  if (subscribedProducts.length <= 1) {
    return null; // Don't show switcher if only one product
  }

  return (
    <div className="product-switcher">
      <select
        value={currentProduct}
        onChange={(e) => handleProductSwitch(e.target.value)}
        className="form-select"
      >
        {subscribedProducts.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

## Migration Strategy

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
2. **Create detailed technical specs** for each product
3. **Set up development environment** with new structure
4. **Begin Phase 1** of migration strategy
5. **Establish testing protocols** for multi-product scenarios
6. **Design UI/UX** for product switcher and unified portal

---

## Conclusion

This multi-product SaaS architecture provides **maximum flexibility** for both the business and customers. Each product can operate independently while benefiting from shared infrastructure and optional cross-product integrations.

The modular approach ensures that:
- Clients can subscribe to **any combination** of products
- Products remain **maintainable** and **testable**
- The platform can **scale** to add more products in the future
- Data remains **isolated** and **secure** per product
- The system is ready for **microservices migration** when needed

This architecture positions RecruitIQ as a true **enterprise HR platform** rather than just an ATS.

---

**Document Version:** 1.0  
**Last Updated:** October 31, 2025  
**Status:** Proposal - Awaiting Approval
