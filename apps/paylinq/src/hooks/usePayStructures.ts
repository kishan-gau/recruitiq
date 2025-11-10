/**
 * Pay Structures Hooks
 * 
 * Custom React Query hooks for pay structure template management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';

// ============================================================================
// Types
// ============================================================================

export interface PayStructureTemplate {
  id: string;
  organizationId: string;
  templateCode: string;
  templateName: string;
  description?: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  version: string;
  status: 'draft' | 'published' | 'deprecated';
  isOrganizationDefault: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  components?: PayStructureComponent[];
}

export interface PayStructureComponent {
  id: string;
  templateId: string;
  componentCode: string;
  componentName: string;
  componentType: 'earnings' | 'deductions' | 'taxes' | 'benefits';
  calculationType: 'fixed' | 'percentage' | 'formula' | 'hourly_rate' | 'tiered';
  sequenceOrder: number;
  isOptional: boolean;
  isVisible: boolean;
  
  // Calculation-specific fields
  fixedAmount?: number;
  percentageValue?: number;
  percentageBase?: string;
  formula?: string;
  hourlyRate?: number;
  tieredRates?: TieredRate[];
  
  conditions?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TieredRate {
  tierName: string;
  minValue: number;
  maxValue?: number;
  rate: number;
  rateType: 'fixed' | 'percentage';
}

export interface WorkerPayStructure {
  id: string;
  employeeId: string;
  templateId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  assignmentReason?: string;
  templateSnapshot: any;
  createdAt: string;
  createdBy: string;
  template?: PayStructureTemplate;
  overrides?: ComponentOverride[];
}

export interface ComponentOverride {
  id: string;
  workerStructureId: string;
  componentCode: string;
  overrideReason: string;
  effectiveFrom: string;
  effectiveTo?: string;
  
  // Override values
  fixedAmount?: number;
  percentageValue?: number;
  formula?: string;
  hourlyRate?: number;
  tieredRates?: TieredRate[];
  isDisabled?: boolean;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type CreateTemplateInput = Pick<PayStructureTemplate, 'templateCode' | 'templateName' | 'description' | 'isOrganizationDefault' | 'effectiveFrom' | 'effectiveTo'>;
export type UpdateTemplateInput = Partial<CreateTemplateInput>;
export type CreateComponentInput = Omit<PayStructureComponent, 'id' | 'templateId' | 'createdAt' | 'updatedAt'>;
export type UpdateComponentInput = Partial<CreateComponentInput>;

// ============================================================================
// Query Keys
// ============================================================================

const PAY_STRUCTURE_TEMPLATES_QUERY_KEY = ['payStructureTemplates'];
const PAY_STRUCTURE_COMPONENTS_QUERY_KEY = ['payStructureComponents'];
const WORKER_PAY_STRUCTURES_QUERY_KEY = ['workerPayStructures'];
const PAY_STRUCTURE_OVERRIDES_QUERY_KEY = ['payStructureOverrides'];

// ============================================================================
// Template Hooks
// ============================================================================

/**
 * Hook to fetch all pay structure templates
 */
export function usePayStructureTemplates(params?: Record<string, any>) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, params],
    queryFn: async () => {
      const response = await paylinq.getPayStructureTemplates(params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single pay structure template by ID
 */
export function usePayStructureTemplate(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getPayStructureTemplate(id);
      return response.data as PayStructureTemplate;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a new pay structure template
 */
export function useCreatePayStructureTemplate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTemplateInput) => {
      const response = await paylinq.createPayStructureTemplate(data);
      return response.data as PayStructureTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAY_STRUCTURE_TEMPLATES_QUERY_KEY });
      success(`Template "${data.templateName}" created successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to create pay structure template');
    },
  });
}

/**
 * Hook to update an existing pay structure template
 */
export function useUpdatePayStructureTemplate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemplateInput }) => {
      const response = await paylinq.updatePayStructureTemplate(id, data);
      return response.data as PayStructureTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAY_STRUCTURE_TEMPLATES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, data.id] });
      success(`Template "${data.templateName}" updated successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to update pay structure template');
    },
  });
}

/**
 * Hook to publish a pay structure template
 */
export function usePublishPayStructureTemplate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await paylinq.publishPayStructureTemplate(id);
      return response.data as PayStructureTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAY_STRUCTURE_TEMPLATES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, data.id] });
      success(`Template "${data.templateName}" published successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to publish template');
    },
  });
}

/**
 * Hook to deprecate a pay structure template
 */
export function useDeprecatePayStructureTemplate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await paylinq.deprecatePayStructureTemplate(id, { reason });
      return response.data as PayStructureTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAY_STRUCTURE_TEMPLATES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, data.id] });
      success(`Template "${data.templateName}" deprecated successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to deprecate template');
    },
  });
}

/**
 * Hook to create new version of template
 */
export function useCreatePayStructureTemplateVersion() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, versionType, changeSummary }: { id: string; versionType: string; changeSummary: string }) => {
      const response = await paylinq.createPayStructureTemplateVersion(id, { versionType, changeSummary });
      return response.data as PayStructureTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAY_STRUCTURE_TEMPLATES_QUERY_KEY });
      success(`New version ${data.version} created successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to create new version');
    },
  });
}

/**
 * Hook to get template version history
 */
export function usePayStructureTemplateVersions(templateCode: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, 'versions', templateCode],
    queryFn: async () => {
      const response = await paylinq.getPayStructureTemplateVersions(templateCode);
      return response.data as PayStructureTemplate[];
    },
    enabled: !!templateCode,
  });
}

/**
 * Hook to get template changelog
 */
export function usePayStructureTemplateChangelog(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, id, 'changelog'],
    queryFn: async () => {
      const response = await paylinq.getPayStructureTemplateChangelog(id);
      return response.data;
    },
    enabled: !!id,
  });
}

// ============================================================================
// Component Hooks
// ============================================================================

/**
 * Hook to get template components
 */
export function usePayStructureComponents(templateId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAY_STRUCTURE_COMPONENTS_QUERY_KEY, templateId],
    queryFn: async () => {
      const response = await paylinq.getPayStructureComponents(templateId);
      return response.data as PayStructureComponent[];
    },
    enabled: !!templateId,
  });
}

/**
 * Hook to add component to template
 */
export function useAddPayStructureComponent() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: CreateComponentInput }) => {
      const response = await paylinq.addPayStructureComponent(templateId, data);
      return response.data as PayStructureComponent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_COMPONENTS_QUERY_KEY, data.templateId] });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, data.templateId] });
      success(`Component "${data.componentName}" added successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to add component');
    },
  });
}

/**
 * Hook to update component
 */
export function useUpdatePayStructureComponent() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ componentId, data }: { componentId: string; data: UpdateComponentInput }) => {
      const response = await paylinq.updatePayStructureComponent(componentId, data);
      return response.data as PayStructureComponent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_COMPONENTS_QUERY_KEY, data.templateId] });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, data.templateId] });
      success(`Component "${data.componentName}" updated successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to update component');
    },
  });
}

/**
 * Hook to delete component
 */
export function useDeletePayStructureComponent() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ componentId, templateId }: { componentId: string; templateId: string }) => {
      await paylinq.deletePayStructureComponent(componentId);
      return { componentId, templateId };
    },
    onSuccess: ({ templateId }) => {
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_COMPONENTS_QUERY_KEY, templateId] });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, templateId] });
      success('Component deleted successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to delete component');
    },
  });
}

/**
 * Hook to reorder components
 */
export function useReorderPayStructureComponents() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ templateId, componentOrders }: { templateId: string; componentOrders: Array<{ componentId: string; sequenceOrder: number }> }) => {
      const response = await paylinq.reorderPayStructureComponents(templateId, { componentOrders });
      return { templateId, data: response.data };
    },
    onSuccess: ({ templateId }) => {
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_COMPONENTS_QUERY_KEY, templateId] });
      success('Components reordered successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to reorder components');
    },
  });
}

// ============================================================================
// Worker Assignment Hooks
// ============================================================================

/**
 * Hook to get current worker pay structure
 */
export function useCurrentWorkerPayStructure(employeeId: string, asOfDate?: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_PAY_STRUCTURES_QUERY_KEY, employeeId, 'current', asOfDate],
    queryFn: async () => {
      // Only pass asOfDate if it's defined to avoid sending "undefined" string
      const params = asOfDate ? { asOfDate } : undefined;
      const response = await paylinq.getCurrentWorkerPayStructure(employeeId, params);
      return response.data as WorkerPayStructure;
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to get worker pay structure history
 */
export function useWorkerPayStructureHistory(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_PAY_STRUCTURES_QUERY_KEY, employeeId, 'history'],
    queryFn: async () => {
      const response = await paylinq.getWorkerPayStructureHistory(employeeId);
      return response.data as WorkerPayStructure[];
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to assign template to worker
 */
export function useAssignPayStructureToWorker() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ employeeId, data }: { employeeId: string; data: any }) => {
      const response = await paylinq.assignPayStructureToWorker(employeeId, data);
      return response.data as WorkerPayStructure;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...WORKER_PAY_STRUCTURES_QUERY_KEY, data.employeeId] });
      success('Pay structure assigned successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to assign pay structure');
    },
  });
}

/**
 * Hook to upgrade worker to new template version
 */
export function useUpgradeWorkerPayStructure() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ employeeId, newTemplateId, effectiveFrom }: { employeeId: string; newTemplateId: string; effectiveFrom: string }) => {
      const response = await paylinq.upgradeWorkerPayStructure(employeeId, { newTemplateId, effectiveFrom });
      return response.data as WorkerPayStructure;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...WORKER_PAY_STRUCTURES_QUERY_KEY, data.employeeId] });
      success('Worker upgraded to new template version successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to upgrade worker pay structure');
    },
  });
}

// ============================================================================
// Override Hooks
// ============================================================================

/**
 * Hook to get worker component overrides
 */
export function usePayStructureOverrides(workerStructureId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAY_STRUCTURE_OVERRIDES_QUERY_KEY, workerStructureId],
    queryFn: async () => {
      const response = await paylinq.getPayStructureOverrides(workerStructureId);
      return response.data as ComponentOverride[];
    },
    enabled: !!workerStructureId,
  });
}

/**
 * Hook to add component override
 */
export function useAddPayStructureOverride() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ employeeId, data }: { employeeId: string; data: any }) => {
      const response = await paylinq.addPayStructureOverride(employeeId, data);
      return response.data as ComponentOverride;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_OVERRIDES_QUERY_KEY, data.workerStructureId] });
      success('Component override added successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to add component override');
    },
  });
}

/**
 * Hook to update component override
 */
export function useUpdatePayStructureOverride() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ overrideId, workerStructureId, data }: { overrideId: string; workerStructureId: string; data: any }) => {
      const response = await paylinq.updatePayStructureOverride(overrideId, data);
      return { workerStructureId, data: response.data as ComponentOverride };
    },
    onSuccess: ({ workerStructureId }) => {
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_OVERRIDES_QUERY_KEY, workerStructureId] });
      success('Component override updated successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to update component override');
    },
  });
}

/**
 * Hook to delete component override
 */
export function useDeletePayStructureOverride() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ overrideId, workerStructureId }: { overrideId: string; workerStructureId: string }) => {
      await paylinq.deletePayStructureOverride(overrideId);
      return { overrideId, workerStructureId };
    },
    onSuccess: ({ workerStructureId }) => {
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_OVERRIDES_QUERY_KEY, workerStructureId] });
      success('Component override deleted successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to delete component override');
    },
  });
}

/**
 * Hook to fetch all workers
 */
export function useWorkers() {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await paylinq.getWorkers();
      return response.data || response.employees || [];
    },
  });
}
