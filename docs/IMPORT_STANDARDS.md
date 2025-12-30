# Import Standards

**Part of:** [RecruitIQ Coding Standards](./CODING_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** December 29, 2025

---

## Table of Contents

1. [Import Hierarchy](#import-hierarchy)
2. [Import Rules](#import-rules)
3. [Examples by Category](#examples-by-category)
4. [Anti-patterns](#anti-patterns)
5. [Feature-Specific Guidance](#feature-specific-guidance)
6. [ESLint Enforcement](#eslint-enforcement)

---

## Import Hierarchy

**All imports MUST follow this 4-tier hierarchy in order of appearance:**

### Tier 1: External Packages (React, routing, third-party)
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, AlertCircle, Check } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
```

### Tier 2: Monorepo Packages (@recruitiq/*)
```typescript
import { useAuth } from '@recruitiq/auth';
import { APIClient, PaylinqClient } from '@recruitiq/api-client';
import type { TaxRule, PayComponent, User } from '@recruitiq/types';
import { handleFormError } from '@recruitiq/utils';
import { Modal, Button, Input, Card } from '@recruitiq/ui';
```

### Tier 3: Absolute Application Imports (@/*)
```typescript
// Contexts (always absolute)
import { useToast } from '@/contexts/ToastContext';
import { useAuth as useAppAuth } from '@/contexts/AuthContext';

// Services
import { employeesService } from '@/services/employees.service';
import { apiClient } from '@/services/api';

// Utils & Hooks (always absolute for cross-feature access)
import { handleApiError, getErrorMessage } from '@/utils/errorHandler';
import { useEmployees, useDepartments } from '@/hooks';

// Components (always absolute for cross-feature access)
import { Modal } from '@/shared/components/ui/Modal';
import { UserAccessAuditLog } from '@/components/employee/UserAccessAuditLog';

// Types (always absolute)
import type { Employee, Department } from '@/types/employee.types';
```

### Tier 4: Relative Imports (same directory ONLY)
```typescript
// ✅ OK: Same directory sibling
import { ChildComponent } from './ChildComponent';
import { FormHelper } from './FormHelper';

// ❌ NOT OK: Different directory
import { Component } from '../sibling/Component';  // Use absolute path
import { Util } from '../../utils/Util';         // Use absolute path
```

---

## Import Rules

### MANDATORY Rules (Enforced by ESLint)

1. **No cross-directory relative imports**
   - ❌ `import X from '../other/Component'`
   - ❌ `import X from '../../utils/helper'`
   - ✅ `import X from '@/features/other/components'`

2. **Same-directory imports are relative ONLY**
   - ❌ `import { ChildComponent } from '@/features/hris/components/ChildComponent'`
   - ✅ `import { ChildComponent } from './ChildComponent'`

3. **Tier ordering is strict**
   - External packages first
   - Monorepo packages second
   - Absolute @/ imports third
   - Relative imports last
   - ✅ Use blank lines between tiers

4. **Component imports use named exports**
   - ✅ `import { Modal } from '@/shared/components/ui/Modal'`
   - ❌ `import Modal from '@/shared/components/ui/Modal'`

5. **Type imports use `type` keyword**
   - ✅ `import type { User } from '@recruitiq/types'`
   - ❌ `import { User } from '@recruitiq/types'`

---

## Examples by Category

### Form Components
```typescript
import React, { useState, useCallback } from 'react';
import { AlertCircle, Check } from 'lucide-react';

import { useAuth } from '@recruitiq/auth';
import type { CreateUserRequest } from '@recruitiq/types';

import { useToast } from '@/contexts/ToastContext';
import { employeesService } from '@/services/employees.service';
import { handleApiError, validateEmail } from '@/utils/errorHandler';
import { useEmployees } from '@/hooks';

import { FormField } from './FormField';
import { ValidationHelper } from './ValidationHelper';

export default function MyForm() {
  // Component code...
}
```

### Page Components
```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@recruitiq/auth';
import type { Employee } from '@recruitiq/types';

import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import { useEmployees } from '@/hooks';

import { EmployeeCard } from '@/features/hris/components';
import { Layout } from '@/shared/layouts/Layout';

import { EmployeeForm } from './EmployeeForm';
import { EmployeeDetails } from './EmployeeDetails';

export default function EmployeePage() {
  // Page code...
}
```

### Standalone Utilities
```typescript
import type { ValidationError } from '@recruitiq/types';

export function validateInput(data: any): ValidationError[] {
  // Utility code...
}
```

---

## Anti-patterns

### ❌ Avoid These

**1. Deep relative paths**
```typescript
// ❌ WRONG
import { Component } from '../../components/Component';
import { Helper } from '../../../utils/helper';

// ✅ CORRECT
import { Component } from '@/features/other/components';
import { Helper } from '@/utils/helper';
```

**2. Mixed import styles for same type**
```typescript
// ❌ WRONG - Inconsistent
import { Modal } from './Modal';
import { Button } from '@/components/ui/Button';

// ✅ CORRECT - Consistent (if cross-directory, use absolute)
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
```

**3. Importing from index files across directories**
```typescript
// ❌ WRONG - Hides complexity
import { Modal } from '@/components';

// ✅ CORRECT - Explicit path
import { Modal } from '@/shared/components/ui/Modal';
```

**4. Default exports for components in cross-directory imports**
```typescript
// ❌ WRONG
import Modal from '@/shared/components/ui/Modal';

// ✅ CORRECT
import { Modal } from '@/shared/components/ui/Modal';
```

**5. Mixing relative and absolute for same directory**
```typescript
// ❌ WRONG
import { ComponentA } from './ComponentA';
import { ComponentB } from '@/features/hris/components/ComponentB';
// ^ Both in same directory but different import styles

// ✅ CORRECT
import { ComponentA } from './ComponentA';
import { ComponentB } from './ComponentB';
```

---

## Feature-Specific Guidance

### HRIS Feature
- ✅ **Status**: Mostly compliant
- **Pattern**: Primarily absolute @/ imports
- **Rule**: Use absolute @/ for all cross-component imports
- **Sibling imports**: Use relative (`./ComponentName`)
- **Example**:
  ```typescript
  import { useEmployees } from '@/hooks';  // ✅
  import { EmployeeCard } from './EmployeeCard';  // ✅
  ```

### Payroll Feature
- ✅ **Status**: Mostly compliant
- **Pattern**: Mix of service imports and hook imports
- **Rule**: Keep services as `@/services/name.service`
- **Rule**: Keep hooks as `@/hooks`
- **Example**:
  ```typescript
  import { usePayComponents } from '@/hooks';
  import { paylinqService } from '@/services/paylinq.service';
  ```

### Recruitment Feature
- 🟡 **Status**: Needs standardization
- **Current issue**: Heavy use of relative imports for components
- **Target pattern**: Absolute @/ for cross-directory, relative for same-directory
- **Needed changes**: Replace `./Modal`, `../icons` with `@/` paths
- **Example**:
  ```typescript
  // BEFORE ❌
  import Modal from './Modal';
  import { Icon } from '../icons';
  
  // AFTER ✅
  import { Modal } from '@/shared/components/ui/Modal';
  import { Icon } from '@/components/icons';
  ```

### Scheduling Feature
- 🟡 **Status**: Needs standardization
- **Current issue**: Mixed relative and absolute imports
- **Target pattern**: Absolute @/ for cross-directory, relative for same-directory
- **Needed changes**: Consolidate relative imports to absolute for cross-directory
- **Example**:
  ```typescript
  // BEFORE ❌
  import RoleForm from './RoleForm';        // ✅ OK
  import Modal from '../modals/Modal';      // ❌ Should be absolute
  
  // AFTER ✅
  import RoleForm from './RoleForm';        // ✅ OK
  import { Modal } from '@/shared/components/ui/Modal';
  ```

---

## ESLint Enforcement

**ESLint rules are configured to enforce these standards automatically.**

### Configuration
See `.eslintrc.json` for:
- `no-restricted-imports` - Prevents cross-directory relative imports
- `import/order` - Enforces tier hierarchy
- `import/no-named-as-default` - Enforces named exports for components

### Running ESLint
```bash
# Check all imports
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix

# Check specific file
pnpm lint apps/web/src/features/recruitment/components/JobForm.tsx
```

### Bypassing ESLint (Not Recommended)
```typescript
// eslint-disable-next-line no-restricted-imports
import Component from '../other/Component';  // Don't do this!
```

---

## Migration Path

### Phase 1: Recruitment Components (High Priority)
- **Files affected**: 15-18 files
- **Timeline**: 1-2 days
- **Focus**: Replace relative imports with absolute @/ paths
- **Files to update**:
  - PublishJobToggle.tsx
  - JobForm.tsx
  - CandidateForm.tsx
  - CandidateEditForm.tsx
  - FlowDesigner.tsx
  - ApplicationSourceBadge.tsx
  - All other recruitment components

### Phase 2: Scheduling Components (Medium Priority)
- **Files affected**: 12-15 files
- **Timeline**: 1 day
- **Focus**: Consolidate mixed import patterns
- **Files to update**:
  - CalendarView.tsx
  - RolesList.tsx
  - RoleDetails.tsx
  - All scheduling components with relative imports

### Phase 3: HRIS & Payroll Cleanup (Low Priority)
- **Files affected**: 8-10 files
- **Timeline**: 0.5-1 day
- **Focus**: Minor consistency fixes

---

## Validation Checklist

Before committing code, verify:

- [ ] Imports follow 4-tier hierarchy
- [ ] No cross-directory relative imports
- [ ] Components use named exports
- [ ] Types use `import type` keyword
- [ ] No deep paths like `../../`
- [ ] Blank lines between import tiers
- [ ] ESLint passes with no warnings
- [ ] All @recruitiq/* imports at top
- [ ] All @/ imports absolute paths
- [ ] Same-directory imports are relative only

---

## References

- [CODING_STANDARDS.md](./CODING_STANDARDS.md) - Overall project standards
- [FRONTEND_STANDARDS.md](./FRONTEND_STANDARDS.md) - Frontend-specific patterns
- [ESLint Configuration](../.eslintrc.json) - Enforcement rules
