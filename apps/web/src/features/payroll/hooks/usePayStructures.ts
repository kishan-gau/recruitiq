/**
 * Pay Structures Hooks
 * 
 * Custom React Query hooks for pay structure template management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/contexts/ToastContext';

import { usePaylinqAPI } from './usePaylinqAPI';

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
  templateId?: string;
  componentCode: string;
  componentName: string;
  description?: string;
  componentCategory: 'earning' | 'deduction' | 'tax' | 'benefit' | 'employer_cost' | 'reimbursement';
  componentType?: 'earnings' | 'deductions' | 'taxes' | 'benefits'; // Legacy field
  calculationType: 'fixed' | 'percentage' | 'formula' | 'hourly_rate' | 'tiered' | 'external';
  sequenceOrder: number;
  isOptional?: boolean;
  isVisible?: boolean;
  
  // Worker override configuration
  allowWorkerOverride?: boolean;
  overrideAllowedFields?: string[];
  hasOverrides?: boolean;
  isMandatory?: boolean;
  isTaxable?: boolean;
  
  // Pay impact configuration
  affectsGrossPay?: boolean;
  affectsNetPay?: boolean;
  
  // Calculation-specific fields
  defaultAmount?: number; // For fixed and base for hourly_rate
  fixedAmount?: number; // Legacy
  percentageRate?: number; // 0.05 = 5%
  percentageValue?: number; // Legacy
  percentageOf?: string; // What to calculate percentage of
  percentageBase?: string; // Legacy
  formulaExpression?: string;
  formula?: string; // Legacy
  rateMultiplier?: number; // For hourly_rate (1.0 = regular, 1.5 = overtime)
  hourlyRate?: number; // Legacy
  tieredRates?: TieredRate[];
  
  // Constraint fields
  minAmount?: number;
  maxAmount?: number;
  minPercentage?: number;
  maxPercentage?: number;
  maxAnnual?: number;
  maxPerPeriod?: number;
  
  // Display and approval configuration
  displayOnPayslip?: boolean;
  requiresApproval?: boolean;
  taxCategory?: string;
  accountingCode?: string;
  
  // Temporal and proration
  temporalPatternId?: string;
  prorationMethod?: string;
  
  // Conditions and rules
  applicabilityRules?: any;
  conditionExpression?: string;
  conditions?: any;
  
  // Calculation settings
  roundingMethod?: string;
  roundingPrecision?: number;
  currency?: string;
  payFrequency?: string;
  compoundingFrequency?: string;
  
  // Additional metadata
  notes?: string;
  tags?: string[] | string;
  metadata?: any;
  
  createdAt?: string;
  updatedAt?: string;
  
  // Additional properties used in components
  defaultCurrency?: string;
  allowCurrencyOverride?: boolean;
  forfaitRuleId?: string;
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
  templateVersionId: string; // FK to specific template version
  baseSalary?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  assignmentReason?: string;
  createdAt: string;
  createdBy: string;
  // Runtime-resolved from template JOIN
  template?: PayStructureTemplate;
  components?: PayStructureComponent[];
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

export interface TemplateInclusion {
  id: string;
  parentTemplateId: string;
  includedTemplateCode: string;
  includedTemplateId?: string;
  includedTemplateName?: string;
  includedTemplateVersion?: string;
  versionConstraint?: string;
  inclusionPriority: number;
  inclusionMode: 'merge' | 'override' | 'append';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  // Additional properties used in components
  minVersion?: string;
  maxVersion?: string;
  priority?: number; // Alias for inclusionPriority
  conditionExpression?: string;
}

export interface ResolvedPayStructureTemplate extends PayStructureTemplate {
  resolvedComponents: PayStructureComponent[];
  inclusionHierarchy: Array<{
    templateCode: string;
    templateName: string;
    version: string;
    depth: number;
  }>;
  resolutionMetadata: {
    resolvedAt: string;
    totalInclusions: number;
    mergeStrategy: string;
  };
  // Additional properties used in components
  appliedInclusions?: TemplateInclusion[];
  template?: any; // Legacy field for nested template data
}

export type InclusionMode = 'merge' | 'override' | 'append';

export type CreateTemplateInclusionInput = {
  includedTemplateCode: string;
  versionConstraint?: string;
  inclusionPriority: number;
  inclusionMode?: InclusionMode;
  isActive?: boolean;
};

export type UpdateTemplateInclusionInput = Partial<CreateTemplateInclusionInput>;

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
export function usePayStructureTemplates(options?: { params?: Record<string, any>; enabled?: boolean }) {
  const { paylinq } = usePaylinqAPI();
  const params = options?.params;
  const enabled = options?.enabled !== undefined ? options.enabled : true;

  return useQuery({
    queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, params],
    queryFn: async () => {
      const response = await paylinq.getPayStructureTemplates(params);
      return response.templates || [];
    },
    enabled,
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
      return response.template;
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
      return response.template;
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
  const { success } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemplateInput }) => {
      const response = await paylinq.updatePayStructureTemplate(id, data);
      return response.template;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAY_STRUCTURE_TEMPLATES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, data.id] });
      success(`Template "${data.templateName}" updated successfully`);
    },
    // Error handling is done in the component for better UX
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
      return response.template;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAY_STRUCTURE_TEMPLATES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, data.id] });
      // Invalidate version history to reflect status change
      if (data.templateCode) {
        queryClient.invalidateQueries({ queryKey: ['templateVersions', data.templateCode] });
      }
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
      return response.template;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAY_STRUCTURE_TEMPLATES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, data.id] });
      // Invalidate version history to reflect status change
      if (data.templateCode) {
        queryClient.invalidateQueries({ queryKey: ['templateVersions', data.templateCode] });
      }
      success(`Template "${data.templateName}" deprecated successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to deprecate template');
    },
  });
}

/**
 * Hook to delete pay structure template (draft versions only)
 */
export function useDeletePayStructureTemplate() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await paylinq.deletePayStructureTemplate(id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAY_STRUCTURE_TEMPLATES_QUERY_KEY });
      success('Template deleted successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to delete template');
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
      return response.template;
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
      return response.templates || [];
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
      return response.changelog || [];
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
      return response.components || [];
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
      return response.component;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_COMPONENTS_QUERY_KEY, data.templateId] });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, data.templateId] });
      success(`Component "${data.componentName}" added successfully`);
    },
    onError: (err: any) => {
      console.error('Failed to add component:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to add component';
      error(errorMessage);
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
    mutationFn: async ({ componentId, templateId, data }: { componentId: string; templateId: string; data: UpdateComponentInput }) => {
      const response = await paylinq.updatePayStructureComponent(componentId, data);
      return { component: response.component, templateId };
    },
    onSuccess: ({ component, templateId }) => {
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_COMPONENTS_QUERY_KEY, templateId] });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, templateId] });
      success(component?.componentName ? `Component "${component.componentName}" updated successfully` : 'Component updated successfully');
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
      return { templateId, data: response.components || [] };
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
export function useCurrentWorkerPayStructure(_employeeId: string, asOfDate?: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_PAY_STRUCTURES_QUERY_KEY, employeeId, 'current', asOfDate],
    queryFn: async () => {
      try {
        // Only pass asOfDate if it's defined to avoid sending "undefined" string
        const params = asOfDate ? { asOfDate } : undefined;
        const response = await paylinq.getCurrentWorkerPayStructure(_employeeId, params);
        // Return null if no structure exists (React Query v5 doesn't allow undefined)
        return response?.workerPayStructure ?? null;
      } catch (error: any) {
        // 404 is expected when worker has no pay structure - return null instead of throwing
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to get worker pay structure history
 */
export function useWorkerPayStructureHistory(_employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...WORKER_PAY_STRUCTURES_QUERY_KEY, employeeId, 'history'],
    queryFn: async () => {
      const response = await paylinq.getWorkerPayStructureHistory(_employeeId);
      return response.workerPayStructures || [];
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
    mutationFn: async ({ employeeId, data }: { _employeeId: string; data: any }) => {
      const response = await paylinq.assignPayStructureToWorker(_employeeId, data);
      // Backend returns { success, assignment, message }
      return { assignment: response.assignment, employeeId };
    },
    onSuccess: ({ _employeeId }) => {
      queryClient.invalidateQueries({ queryKey: [...WORKER_PAY_STRUCTURES_QUERY_KEY, _employeeId] });
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
    mutationFn: async ({ employeeId, newTemplateId, effectiveFrom }: { _employeeId: string; newTemplateId: string; effectiveFrom: string }) => {
      const response = await paylinq.upgradeWorkerPayStructure(_employeeId, { newTemplateId, effectiveFrom });
      return response.workerPayStructure;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...WORKER_PAY_STRUCTURES_QUERY_KEY, data._employeeId] });
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
      return response.overrides || [];
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
    mutationFn: async ({ employeeId, data }: { _employeeId: string; data: any }) => {
      const response = await paylinq.addPayStructureOverride(_employeeId, data);
      return response.override;
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
      return { workerStructureId, data: response.override };
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
      return response.employees || [];
    },
  });
}

// ============================================================================
// Template Inclusion Hooks (Nested Templates)
// ============================================================================

const TEMPLATE_INCLUSIONS_QUERY_KEY = ['templateInclusions'];

/**
 * Hook to fetch template inclusions for a template
 */
export function useTemplateInclusions(templateId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...TEMPLATE_INCLUSIONS_QUERY_KEY, templateId],
    queryFn: async () => {
      const response = await paylinq.getTemplateInclusions(templateId);
      return response.inclusions || [];
    },
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch resolved template with all inclusions merged
 */
export function useResolvedPayStructureTemplate(templateId: string, asOfDate?: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, 'resolved', templateId, asOfDate],
    queryFn: async () => {
      const response = await paylinq.getResolvedPayStructureTemplate(templateId, asOfDate);
      return response.resolvedTemplate as ResolvedPayStructureTemplate;
    },
    enabled: !!templateId,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter because it's computed)
  });
}

/**
 * Hook to add template inclusion
 */
export function useAddTemplateInclusion() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ 
      parentTemplateId, 
      data 
    }: { 
      parentTemplateId: string; 
      data: CreateTemplateInclusionInput 
    }) => {
      const response = await paylinq.addTemplateInclusion(parentTemplateId, data);
      return response.inclusion;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...TEMPLATE_INCLUSIONS_QUERY_KEY, variables.parentTemplateId] });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, 'resolved', variables.parentTemplateId] });
      success(`Template inclusion for "${data.includedTemplateCode}" added successfully`);
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to add template inclusion');
    },
  });
}

/**
 * Hook to update template inclusion
 */
export function useUpdateTemplateInclusion() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ 
      parentTemplateId, 
      inclusionId, 
      data 
    }: { 
      parentTemplateId: string; 
      inclusionId: string; 
      data: UpdateTemplateInclusionInput 
    }) => {
      const response = await paylinq.updateTemplateInclusion(parentTemplateId, inclusionId, data);
      return response.inclusion;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...TEMPLATE_INCLUSIONS_QUERY_KEY, variables.parentTemplateId] });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, 'resolved', variables.parentTemplateId] });
      success('Template inclusion updated successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to update template inclusion');
    },
  });
}

/**
 * Hook to delete template inclusion
 */
export function useDeleteTemplateInclusion() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ 
      parentTemplateId, 
      inclusionId 
    }: { 
      parentTemplateId: string; 
      inclusionId: string 
    }) => {
      await paylinq.deleteTemplateInclusion(parentTemplateId, inclusionId);
      return { parentTemplateId, inclusionId };
    },
    onSuccess: ({ parentTemplateId }) => {
      queryClient.invalidateQueries({ queryKey: [...TEMPLATE_INCLUSIONS_QUERY_KEY, parentTemplateId] });
      queryClient.invalidateQueries({ queryKey: [...PAY_STRUCTURE_TEMPLATES_QUERY_KEY, 'resolved', parentTemplateId] });
      success('Template inclusion deleted successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to delete template inclusion');
    },
  });
}

// Worker Override Management Types
export interface WorkerOverride {
  id: string;
  workerId: string;
  componentId: string;
  overrideType: 'amount' | 'rate' | 'disable';
  overrideValue?: number;
  effectiveDate: string;
  expiryDate?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to get worker overrides
 */
export function useWorkerOverrides(workerId: string) {
  return useQuery({
    queryKey: ['worker-overrides', workerId],
    queryFn: async () => 
      // TODO: Implement worker overrides API
       [] as WorkerOverride[]
    ,
    enabled: !!workerId,
  });
}

/**
 * Hook to create worker override
 */
export function useCreateWorkerOverride() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<WorkerOverride>) => {
      // TODO: Implement create worker override API
      throw new Error('Create worker override not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-overrides'] });
      success('Worker override created successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to create worker override');
    },
  });
}

/**
 * Hook to update worker override
 */
export function useUpdateWorkerOverride() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkerOverride> }) => {
      // TODO: Implement update worker override API
      throw new Error('Update worker override not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-overrides'] });
      success('Worker override updated successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to update worker override');
    },
  });
}

/**
 * Hook to delete worker override
 */
export function useDeleteWorkerOverride() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // TODO: Implement delete worker override API
      throw new Error('Delete worker override not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-overrides'] });
      success('Worker override deleted successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to delete worker override');
    },
  });
}
