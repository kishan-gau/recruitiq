# Error Fix Guide - Quick Start

**Project:** RecruitIQ Multi-Product SaaS Platform  
**Purpose:** Step-by-step guide to fix codebase errors  
**Related:** See [CODEBASE_ERROR_ANALYSIS.md](./CODEBASE_ERROR_ANALYSIS.md) for detailed analysis

---

## Quick Start - Fix Critical Blockers First

### Step 1: Fix Import Extensions (Automated - 5 minutes)

**Problem:** 1,119 TypeScript errors due to `.ts` extensions in imports.

**Solution:** Run this script to fix all import extensions:

```bash
# Navigate to backend directory
cd /home/runner/work/recruitiq/recruitiq/backend

# Fix all .ts imports to .js (ES modules requirement)
find src -type f -name "*.ts" -exec sed -i "s/from '\([^']*\)\.ts'/from '\1.js'/g" {} \;
find src -type f -name "*.ts" -exec sed -i 's/from "\([^"]*\)\.ts"/from "\1.js"/g' {} \;

# Verify changes
git diff src/ | grep "from.*\.ts'" | wc -l  # Should show all changes
```

**Expected Result:** ~1,119 TypeScript errors will be resolved.

---

### Step 2: Fix Type Definitions (Manual - 2 hours)

**Problem:** 5,831 TS2339 errors - properties don't exist on types.

#### 2.1 Fix Config Type Definition

**File:** `backend/src/config/index.ts` (or wherever config types are defined)

**Add missing properties:**

```typescript
// Find the config interface and add:
export interface Config {
  env: string;
  port: number;
  nodeEnv: string;  // ✅ ADD THIS
  apiVersion: string;
  appName: string;
  appUrl: string;
  database: {
    url: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    pool: {
      min: number;
      max: number;
      idleTimeoutMillis: number;  // ✅ ADD THIS
      connectionTimeoutMillis: number;  // ✅ ADD THIS
    };
  };
  // ... rest of config
}
```

#### 2.2 Fix Express App Type Extensions

**File:** Create `backend/src/types/express.d.ts`

```typescript
import { Router } from 'express';

declare global {
  namespace Express {
    interface Application {
      apiRouter?: Router;
      dynamicProductMiddleware?: any;
    }
    
    interface Request {
      user?: any;  // Define proper user type
      organizationId?: string;
    }
    
    interface Error {
      status?: number;
    }
  }
}

export {};
```

#### 2.3 Fix Organization Type

**File:** Find organization type definition and add:

```typescript
interface Organization {
  // ... existing properties
  max_sessions_per_user?: number;  // ✅ ADD THIS
  session_policy?: {
    concurrent_login_detection?: boolean;
    // ... other session policy properties
  };
}
```

---

### Step 3: Fix Function Signatures (Manual - 1 hour)

**Problem:** 41 TS2554 errors - wrong number of function arguments.

#### 3.1 Review Service Method Signatures

**File:** `backend/src/controllers/jobController.ts`

**Common Issue:**
```typescript
// ❌ Current - calling with wrong number of args
await jobService.create(data, organizationId, userId);

// Option 1: Fix the call to match service signature
await jobService.create(data, organizationId);

// Option 2: Update service to accept userId
// In JobService.ts:
async create(data, organizationId, userId) {
  // implementation
}
```

**Files to Review:**
- `backend/src/controllers/jobController.ts` (7 occurrences)
- Check each function call against service definitions
- Ensure consistency across all controllers

---

### Step 4: Fix Unresolved Imports (Manual - 30 minutes)

**Problem:** 192 import errors - can't resolve modules.

#### 4.1 Fix @recruitiq/auth Import

**Check package build:**
```bash
cd packages/auth
pnpm build  # or npm run build

# Verify dist folder exists
ls -la dist/
```

**Update tsconfig.json paths (if needed):**
```json
{
  "compilerOptions": {
    "paths": {
      "@recruitiq/auth": ["./packages/auth/src"],
      "@recruitiq/types": ["./packages/types/src"],
      "@recruitiq/utils": ["./packages/utils/src"],
      "@recruitiq/ui": ["./packages/ui/src"],
      "@recruitiq/api-client": ["./packages/api-client/src"]
    }
  }
}
```

#### 4.2 Build All Packages

```bash
cd /home/runner/work/recruitiq/recruitiq

# Build all shared packages first
pnpm --filter "./packages/*" build

# Verify packages are built
ls -la packages/*/dist/
```

---

### Step 5: Fix JWT Type Errors (Manual - 30 minutes)

**Problem:** JWT sign() calls have type errors.

**File:** `backend/src/controllers/mfaController.ts`

**Fix:**
```typescript
// ❌ Current (wrong)
const token = jwt.sign({ userId, type }, secret, {
  expiresIn: config.jwt.accessTokenExpiry  // Type error
});

// ✅ Fixed
const token = jwt.sign(
  { userId, type },
  secret,
  {
    expiresIn: '15m'  // Use string literal or ensure type is StringValue
  }
);

// Or fix the config type:
interface JWTConfig {
  accessTokenExpiry: string | number;  // Was just string
  secret: string;
  // ...
}
```

---

## Phase 2: Code Quality Fixes

### Step 6: Auto-Fix ESLint Issues (Automated - 2 minutes)

```bash
cd /home/runner/work/recruitiq/recruitiq

# Auto-fix what can be fixed automatically
pnpm lint --fix

# Check results
pnpm lint 2>&1 | tail -20
```

**Expected:** ~6 errors will be auto-fixed.

---

### Step 7: Fix Naming Conventions (Semi-Automated - 3 hours)

#### 7.1 Auto-Fix Object Property Names

**File:** `apps/web/src/shared/hooks/recruitiq/useSearchFilters.ts`

```typescript
// ❌ Current (wrong)
const typeMapping = {
  'full-time': 'Full-time',  // kebab-case not allowed
  'part-time': 'Part-time',
};

// ✅ Fixed
const typeMapping = {
  fullTime: 'Full-time',  // camelCase
  partTime: 'Part-time',
};
```

#### 7.2 Fix Import Names

```typescript
// ❌ Current
import ProfileMenu from '@shared/components/ProfileMenu';
import React from 'react';

// ✅ Fixed (if convention requires camelCase)
import profileMenu from '@shared/components/ProfileMenu';
import react from 'react';

// OR (more common - keep PascalCase for components)
// Update ESLint config to allow PascalCase for components
```

---

### Step 8: Remove Unused Variables (Semi-Automated - 2 hours)

**Files to review:**
1. `apps/web/src/validation/ScheduleHubMigrationValidation.tsx`
2. Various backend middleware files

**Process:**
```typescript
// ❌ Remove unused imports
import { Calendar, BarChart3, Shield, Template, Coffee, useEffect } from 'lucide-react';
// If these are never used in the file

// ✅ Keep only what's used
import { CheckCircle, XCircle } from 'lucide-react';

// ❌ Remove unused variables
const [isRunning, setIsRunning] = useState(false);
// If isRunning is never referenced

// ✅ Use underscore prefix if required by API but not used
const [_isRunning, setIsRunning] = useState(false);
```

---

### Step 9: Replace Console Statements (Semi-Automated - 3 hours)

**File:** `backend/src/controllers/licenseController.ts` (275+ console statements)

**Script to help:**
```bash
cd backend/src

# Find all console.log statements
grep -r "console\.log" . | wc -l

# Review and replace with logger
# Manual review required to determine appropriate log level
```

**Example fix:**
```typescript
// ❌ Current
console.log('User logged in:', userId);
console.error('Error occurred:', error);

// ✅ Fixed
import logger from '../utils/logger.js';

logger.info('User logged in', { userId });
logger.error('Error occurred', { error: error.message, stack: error.stack });
```

---

### Step 10: Fix Explicit `any` Types (Manual - 8 hours)

**Priority files:** Most-used types first

#### 10.1 Create Proper Types

**File:** `apps/web/src/types/api.types.ts`

```typescript
// ❌ Current
export interface ApiResponse {
  data: any;
}

// ✅ Fixed - Create generic type
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
}

// Usage:
const response: ApiResponse<Job> = await api.getJob(id);
```

#### 10.2 Fix Error Handler Types

**File:** `apps/web/src/utils/errorHandler.ts`

```typescript
// ❌ Current
export function handleError(error: any): string {
  // ...
}

// ✅ Fixed
interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

export function handleError(error: unknown): string {
  const apiError = error as ApiError;
  // ...
}
```

---

## Phase 3: Testing & Coverage

### Step 11: Fix Test Infrastructure (Manual - 30 minutes)

**Problem:** Database teardown error.

**File:** `backend/tests/teardown.js`

```javascript
// ❌ Current (wrong path)
import { closePool } from '../src/config/database.js';

// ✅ Fixed - verify correct path
// Check if file exists at this path
// If not, find correct path:
import { closePool } from '../src/config/db.js';
// OR
import { closePool } from '../src/database/pool.js';
```

---

### Step 12: Add Tests for Uncovered Code (Manual - 40+ hours)

**Priority:** Product services (0% coverage)

**Example:** Test PayLinQ worker type service

**File:** `backend/tests/products/paylinq/services/workerTypeService.test.js`

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import WorkerTypeService from '../../../../src/products/paylinq/services/workerTypeService.js';

describe('WorkerTypeService', () => {
  let service;
  let mockRepository;
  
  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      // ... mock all methods
    };
    
    service = new WorkerTypeService(mockRepository);
  });
  
  describe('create', () => {
    it('should create a worker type', async () => {
      const data = { name: 'Full-time', ... };
      mockRepository.create.mockResolvedValue({ id: '123', ...data });
      
      const result = await service.create(data, 'org-123', 'user-123');
      
      expect(result).toHaveProperty('id');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(data),
        'org-123'
      );
    });
  });
  
  // Add more tests...
});
```

**Coverage Target:** 70% for all metrics

---

## Phase 4: Dependencies & Polish

### Step 13: Update Dependencies (Manual - 1 hour)

```bash
cd /home/runner/work/recruitiq/recruitiq

# Upgrade pnpm
npm install -g pnpm@latest

# Update package manager version
pnpm --version

# Update package.json
# "packageManager": "pnpm@9.x.x"

# Check for outdated packages
pnpm outdated

# Update AWS SDK (requires code changes)
# See AWS SDK v3 migration guide
```

---

## Verification Checklist

After completing fixes, verify:

### Build Verification
- [ ] `pnpm build` completes without errors
- [ ] Web app builds successfully
- [ ] Backend builds successfully
- [ ] All packages build successfully

### Lint Verification
- [ ] `pnpm lint` shows < 100 errors (from 3,303)
- [ ] No critical security warnings
- [ ] Naming conventions consistent

### Test Verification
- [ ] `npm test` passes all tests
- [ ] Test coverage > 70% (all metrics)
- [ ] Test teardown works correctly

### Runtime Verification
- [ ] Backend starts without errors
- [ ] Web app starts without errors
- [ ] Can log in and navigate
- [ ] API endpoints respond correctly

---

## Tracking Progress

### Create Issues

For each major fix category, create a GitHub issue:

1. **Issue: Fix TypeScript Import Extensions**
   - [ ] Run automated fix script
   - [ ] Verify compilation
   - [ ] Commit changes

2. **Issue: Fix Type Definitions**
   - [ ] Add missing config properties
   - [ ] Add Express type extensions
   - [ ] Add organization properties
   - [ ] Verify compilation

3. **Issue: Fix Function Signatures**
   - [ ] Review all TS2554 errors
   - [ ] Update service signatures
   - [ ] Update controller calls
   - [ ] Verify compilation

... (continue for each category)

### Use Project Board

Track progress on a project board:
- **Backlog:** All identified errors
- **In Progress:** Currently being fixed
- **Review:** Awaiting code review
- **Done:** Fixed and verified

---

## Automation Scripts

### Script 1: Fix Import Extensions

```bash
#!/bin/bash
# fix_imports.sh

cd backend/src

# Fix single-quoted imports
find . -type f -name "*.ts" -exec sed -i "s/from '\([^']*\)\.ts'/from '\1.js'/g" {} \;

# Fix double-quoted imports
find . -type f -name "*.ts" -exec sed -i 's/from "\([^"]*\)\.ts"/from "\1.js"/g' {} \;

echo "Import extensions fixed"
```

### Script 2: Count Errors

```bash
#!/bin/bash
# count_errors.sh

echo "=== Error Count Summary ==="
echo ""

echo "TypeScript Compilation Errors:"
pnpm build 2>&1 | grep -E "error TS[0-9]+" | wc -l

echo ""
echo "Web App Linting Issues:"
cd apps/web && pnpm lint 2>&1 | tail -1

echo ""
echo "Backend Linting Issues:"
cd ../../backend && npm run lint 2>&1 | tail -1

echo ""
echo "Test Results:"
npm test 2>&1 | grep "Test Suites:"
```

### Script 3: Replace Console Logs

```bash
#!/bin/bash
# replace_console.sh

# This is a TEMPLATE - requires manual review
# DO NOT run automatically without reviewing each change

cd backend/src

# Find files with console statements
grep -r "console\." . --include="*.ts" | cut -d':' -f1 | sort | uniq

echo "Review each file and replace with appropriate logger calls"
```

---

## Getting Help

### Resources

- **Documentation:** See [CODING_STANDARDS.md](./CODING_STANDARDS.md)
- **TypeScript:** [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- **ESLint:** [ESLint Rules](https://eslint.org/docs/rules/)
- **Testing:** [Jest Documentation](https://jestjs.io/docs/getting-started)

### Common Issues & Solutions

**Q: Import still not resolved after building package**
A: Clear node_modules and rebuild: `pnpm clean && pnpm install && pnpm build`

**Q: Type definition not recognized**
A: Ensure TypeScript can find .d.ts files - check tsconfig.json `include` array

**Q: Test coverage not improving**
A: Ensure test files are in correct location and imported modules are not mocked globally

**Q: ESLint fix doesn't work**
A: Some errors require manual fixes. Check specific rule documentation.

---

## Summary

**Estimated Time to Complete:**
- Phase 1 (Critical): 8-16 hours (1-2 days)
- Phase 2 (Quality): 16-24 hours (2-3 days)  
- Phase 3 (Testing): 40-60 hours (5-7 days)
- Phase 4 (Polish): 4-8 hours (0.5-1 day)

**Total:** 68-108 hours (9-14 working days)

**Team Approach:**
- 1 developer: 3-4 weeks
- 2 developers: 1.5-2 weeks
- 4 developers: 1 week

**Priority:** Fix Phase 1 (Critical) ASAP to unblock development, then proceed systematically through remaining phases.

---

**Good luck with the fixes! 🚀**
