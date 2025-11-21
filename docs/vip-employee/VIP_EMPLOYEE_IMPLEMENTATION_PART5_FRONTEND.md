# VIP Employee Feature - Implementation Plan Part 5: Frontend Implementation

**Part of:** [VIP Employee Implementation Plan](./VIP_EMPLOYEE_IMPLEMENTATION_OVERVIEW.md)  
**Version:** 1.0  
**Date:** November 21, 2025  
**Status:** Planning

---

## Table of Contents

1. [Frontend Architecture](#frontend-architecture)
2. [Component Structure](#component-structure)
3. [State Management](#state-management)
4. [API Integration](#api-integration)
5. [Form Implementation](#form-implementation)
6. [VIP Badge Components](#vip-badge-components)
7. [Security & Permissions](#security--permissions)
8. [Performance Optimization](#performance-optimization)

---

## Frontend Architecture

### Application Structure

```
apps/nexus/src/
├── components/
│   ├── employees/
│   │   ├── EmployeeCard.tsx
│   │   ├── EmployeeList.tsx
│   │   ├── EmployeeForm.tsx
│   │   └── VIPBadge.tsx          ← NEW
│   ├── vip/                       ← NEW FOLDER
│   │   ├── VIPEmployeeForm.tsx
│   │   ├── VIPEmployeeList.tsx
│   │   ├── VIPEmployeeCard.tsx
│   │   ├── VIPStatusToggle.tsx
│   │   └── VIPEmployeeModal.tsx
│   └── ui/
│       ├── Badge.tsx
│       └── Modal.tsx
├── services/
│   ├── employees.service.ts
│   └── vipEmployees.service.ts    ← NEW
├── hooks/
│   ├── useEmployees.ts
│   └── useVIPEmployees.ts         ← NEW
├── types/
│   └── vipEmployee.types.ts       ← NEW
└── pages/
    ├── employees/
    │   ├── EmployeesList.tsx
    │   └── EmployeeDetail.tsx
    └── vip/                        ← NEW FOLDER
        ├── VIPEmployeesPage.tsx
        └── VIPEmployeeDetailPage.tsx
```

---

## Component Structure

### 1. VIP Badge Component

**File:** `apps/nexus/src/components/employees/VIPBadge.tsx`

```tsx
import React from 'react';
import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface VIPBadgeProps {
  isVIP: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  tooltip?: string;
}

export const VIPBadge: React.FC<VIPBadgeProps> = ({
  isVIP,
  size = 'md',
  showIcon = true,
  tooltip = 'VIP Employee'
}) => {
  if (!isVIP) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  return (
    <Badge
      className={`
        bg-gradient-to-r from-amber-500 to-yellow-500 
        text-white font-semibold
        ${sizeClasses[size]}
      `}
      title={tooltip}
    >
      {showIcon && <Crown className="w-4 h-4 mr-1" />}
      VIP
    </Badge>
  );
};
```

### 2. VIP Status Toggle Component

**File:** `apps/nexus/src/components/vip/VIPStatusToggle.tsx`

```tsx
import React from 'react';
import { Switch } from '@/components/ui/Switch';
import { Crown } from 'lucide-react';

interface VIPStatusToggleProps {
  isVIP: boolean;
  onToggle: (isVIP: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
}

export const VIPStatusToggle: React.FC<VIPStatusToggleProps> = ({
  isVIP,
  onToggle,
  disabled = false,
  loading = false
}) => {
  return (
    <div className="flex items-center space-x-3">
      <Crown 
        className={`w-5 h-5 ${isVIP ? 'text-amber-500' : 'text-gray-400'}`} 
      />
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-900">
          VIP Employee Status
        </label>
        <p className="text-xs text-gray-500">
          Mark this employee as a VIP for special privileges
        </p>
      </div>
      <Switch
        checked={isVIP}
        onCheckedChange={onToggle}
        disabled={disabled || loading}
        aria-label="Toggle VIP status"
      />
    </div>
  );
};
```

### 3. VIP Employee Form Component

**File:** `apps/nexus/src/components/vip/VIPEmployeeForm.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { VIPStatusToggle } from './VIPStatusToggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { toast } from '@/hooks/useToast';

// Validation schema
const vipEmployeeSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  isVIP: z.boolean(),
  vipReason: z.string().min(10, 'Reason must be at least 10 characters').optional(),
  vipPriority: z.enum(['high', 'critical']).optional(),
  specialAccess: z.array(z.string()).optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
});

type VIPEmployeeFormData = z.infer<typeof vipEmployeeSchema>;

interface VIPEmployeeFormProps {
  employeeId: string;
  initialData?: Partial<VIPEmployeeFormData>;
  onSubmit: (data: VIPEmployeeFormData) => Promise<void>;
  onCancel: () => void;
}

export const VIPEmployeeForm: React.FC<VIPEmployeeFormProps> = ({
  employeeId,
  initialData,
  onSubmit,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<VIPEmployeeFormData>({
    resolver: zodResolver(vipEmployeeSchema),
    defaultValues: {
      employeeId,
      isVIP: initialData?.isVIP ?? false,
      vipReason: initialData?.vipReason ?? '',
      vipPriority: initialData?.vipPriority ?? 'high',
      specialAccess: initialData?.specialAccess ?? [],
      notes: initialData?.notes ?? ''
    }
  });

  const isVIP = watch('isVIP');

  const handleFormSubmit = async (data: VIPEmployeeFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast({
        title: 'Success',
        description: 'VIP status updated successfully',
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update VIP status',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* VIP Status Toggle */}
      <VIPStatusToggle
        isVIP={isVIP}
        onToggle={(value) => setValue('isVIP', value)}
        loading={isSubmitting}
      />

      {/* Conditional Fields - Only show if VIP is enabled */}
      {isVIP && (
        <>
          {/* VIP Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for VIP Status *
            </label>
            <Textarea
              {...register('vipReason')}
              placeholder="e.g., C-level executive, key stakeholder, special circumstances..."
              rows={3}
              className={errors.vipReason ? 'border-red-500' : ''}
            />
            {errors.vipReason && (
              <p className="text-red-500 text-sm mt-1">
                {errors.vipReason.message}
              </p>
            )}
          </div>

          {/* VIP Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority Level
            </label>
            <Select {...register('vipPriority')}>
              <option value="high">High Priority</option>
              <option value="critical">Critical Priority</option>
            </Select>
          </div>

          {/* Special Access (Multi-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Access Privileges
            </label>
            <div className="space-y-2">
              {[
                'premium_benefits',
                'executive_reporting',
                'priority_support',
                'confidential_data'
              ].map((access) => (
                <label key={access} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={access}
                    {...register('specialAccess')}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {access.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <Textarea
              {...register('notes')}
              placeholder="Any additional information..."
              rows={3}
              className={errors.notes ? 'border-red-500' : ''}
            />
            {errors.notes && (
              <p className="text-red-500 text-sm mt-1">{errors.notes.message}</p>
            )}
          </div>
        </>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};
```

### 4. VIP Employee List Component

**File:** `apps/nexus/src/components/vip/VIPEmployeeList.tsx`

```tsx
import React from 'react';
import { useVIPEmployees } from '@/hooks/useVIPEmployees';
import { VIPEmployeeCard } from './VIPEmployeeCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Crown } from 'lucide-react';

export const VIPEmployeeList: React.FC = () => {
  const { data: vipEmployees, isLoading, error } = useVIPEmployees();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Error loading VIP employees: {error.message}
      </div>
    );
  }

  if (!vipEmployees || vipEmployees.length === 0) {
    return (
      <EmptyState
        icon={Crown}
        title="No VIP Employees"
        description="No employees have been marked as VIP yet."
        action={{
          label: 'View All Employees',
          href: '/employees'
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vipEmployees.map((employee) => (
        <VIPEmployeeCard key={employee.id} employee={employee} />
      ))}
    </div>
  );
};
```

---

## State Management

### React Query Hooks

**File:** `apps/nexus/src/hooks/useVIPEmployees.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vipEmployeesService } from '@/services/vipEmployees.service';
import { toast } from './useToast';

// Query key factory
export const vipEmployeeKeys = {
  all: ['vipEmployees'] as const,
  lists: () => [...vipEmployeeKeys.all, 'list'] as const,
  list: (filters?: any) => [...vipEmployeeKeys.lists(), filters] as const,
  details: () => [...vipEmployeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...vipEmployeeKeys.details(), id] as const,
};

/**
 * Hook to fetch all VIP employees
 */
export function useVIPEmployees(filters?: any) {
  return useQuery({
    queryKey: vipEmployeeKeys.list(filters),
    queryFn: () => vipEmployeesService.listVIPEmployees(filters),
  });
}

/**
 * Hook to fetch a single VIP employee
 */
export function useVIPEmployee(employeeId: string) {
  return useQuery({
    queryKey: vipEmployeeKeys.detail(employeeId),
    queryFn: () => vipEmployeesService.getVIPEmployee(employeeId),
    enabled: !!employeeId,
  });
}

/**
 * Hook to set VIP status
 */
export function useSetVIPStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: any;
    }) => vipEmployeesService.setVIPStatus(employeeId, data),
    onSuccess: (_, { employeeId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: vipEmployeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vipEmployeeKeys.detail(employeeId) });
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId] });
      
      toast({
        title: 'Success',
        description: 'VIP status updated successfully',
        variant: 'success',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update VIP status',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to remove VIP status
 */
export function useRemoveVIPStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) =>
      vipEmployeesService.removeVIPStatus(employeeId),
    onSuccess: (_, employeeId) => {
      queryClient.invalidateQueries({ queryKey: vipEmployeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vipEmployeeKeys.detail(employeeId) });
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId] });
      
      toast({
        title: 'Success',
        description: 'VIP status removed successfully',
        variant: 'success',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove VIP status',
        variant: 'destructive',
      });
    },
  });
}
```

---

## API Integration

### VIP Employees Service

**File:** `apps/nexus/src/services/vipEmployees.service.ts`

```typescript
import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const vipEmployeesService = {
  /**
   * List all VIP employees
   */
  async listVIPEmployees(filters?: { search?: string; priority?: string }) {
    const response = await nexusClient.listVIPEmployees(filters);
    return response.data.vipEmployees || response.data;
  },

  /**
   * Get a single VIP employee
   */
  async getVIPEmployee(employeeId: string) {
    const response = await nexusClient.getVIPEmployee(employeeId);
    return response.data.vipEmployee || response.data;
  },

  /**
   * Set VIP status for an employee
   */
  async setVIPStatus(employeeId: string, data: any) {
    const response = await nexusClient.setVIPStatus(employeeId, data);
    return response.data.vipEmployee || response.data;
  },

  /**
   * Remove VIP status from an employee
   */
  async removeVIPStatus(employeeId: string) {
    const response = await nexusClient.removeVIPStatus(employeeId);
    return response.data;
  },

  /**
   * Get VIP statistics
   */
  async getVIPStatistics() {
    const response = await nexusClient.getVIPStatistics();
    return response.data.statistics || response.data;
  },
};
```

---

## Form Implementation

### Integration with Employee Form

**Update:** `apps/nexus/src/components/employees/EmployeeForm.tsx`

```tsx
// Add VIP section to existing employee form
import { VIPStatusToggle } from '@/components/vip/VIPStatusToggle';

// Inside the form component
<div className="border-t pt-6 mt-6">
  <h3 className="text-lg font-semibold mb-4">VIP Status</h3>
  
  <VIPStatusToggle
    isVIP={watch('isVIP')}
    onToggle={(value) => setValue('isVIP', value)}
  />
  
  {watch('isVIP') && (
    <div className="mt-4 space-y-4 pl-8 border-l-2 border-amber-500">
      {/* VIP-specific fields */}
    </div>
  )}
</div>
```

---

## VIP Badge Components

### Employee Card Integration

**Update:** `apps/nexus/src/components/employees/EmployeeCard.tsx`

```tsx
import { VIPBadge } from './VIPBadge';

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{employee.name}</h3>
        <VIPBadge isVIP={employee.isVIP} />
      </div>
      {/* Rest of card content */}
    </div>
  );
};
```

---

## Security & Permissions

### Permission-Based Rendering

```tsx
import { useAuth } from '@/contexts/AuthContext';

export const VIPControls: React.FC = () => {
  const { user, hasPermission } = useAuth();

  // Only admins and HR managers can manage VIP status
  if (!hasPermission('manage_vip_employees')) {
    return null;
  }

  return (
    <div>
      {/* VIP management controls */}
    </div>
  );
};
```

---

## Performance Optimization

### Lazy Loading

```tsx
// Lazy load VIP components
const VIPEmployeesPage = lazy(() => import('@/pages/vip/VIPEmployeesPage'));
const VIPEmployeeForm = lazy(() => import('@/components/vip/VIPEmployeeForm'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <VIPEmployeesPage />
</Suspense>
```

### Memoization

```tsx
import { memo, useMemo } from 'react';

export const VIPEmployeeCard = memo<VIPEmployeeCardProps>(({ employee }) => {
  const displayData = useMemo(() => {
    return {
      name: employee.name,
      priority: employee.vipPriority,
      // ... computed fields
    };
  }, [employee]);

  return <div>{/* Card content */}</div>;
});
```

---

## Next Steps

1. **Part 6:** Database Schema & Migration
2. **Part 7:** Testing Strategy
3. **Part 8:** Implementation Checklist & Timeline

---

**Status:** ✅ Frontend Implementation Plan Complete
