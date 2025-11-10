/**
 * Documents Hooks
 * React Query hooks for document management
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { documentsService } from '@/services/documents.service';
import type {
  Document,
  CreateDocumentDTO,
  UpdateDocumentDTO,
  DocumentFilters,
  DocumentFolder,
  CreateFolderDTO,
  UpdateFolderDTO,
  DocumentSignature,
  RequestSignatureDTO,
  SubmitSignatureDTO,
  DocumentTemplate,
  CreateTemplateDTO,
  UpdateTemplateDTO,
  DocumentStatistics,
  DocumentActivityReport,
  UserDocumentActivity,
} from '@/types/documents.types';

// ============ Query Keys ============
export const documentsKeys = {
  all: ['documents'] as const,
  lists: () => [...documentsKeys.all, 'list'] as const,
  list: (filters?: DocumentFilters) => [...documentsKeys.lists(), filters] as const,
  details: () => [...documentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentsKeys.details(), id] as const,
  folders: () => [...documentsKeys.all, 'folders'] as const,
  folder: (id: string) => [...documentsKeys.folders(), id] as const,
  foldersList: (parentId?: string) => [...documentsKeys.folders(), 'list', parentId] as const,
  folderDocuments: (folderId: string) => [...documentsKeys.folder(folderId), 'documents'] as const,
  signatures: () => [...documentsKeys.all, 'signatures'] as const,
  signature: (id: string) => [...documentsKeys.signatures(), id] as const,
  templates: () => [...documentsKeys.all, 'templates'] as const,
  template: (id: string) => [...documentsKeys.templates(), id] as const,
  templatesList: (category?: string) => [...documentsKeys.templates(), 'list', category] as const,
  statistics: () => [...documentsKeys.all, 'statistics'] as const,
  activity: (documentId: string) => [...documentsKeys.detail(documentId), 'activity'] as const,
  userActivity: (userId: string, startDate: string, endDate: string) => 
    [...documentsKeys.all, 'user-activity', userId, startDate, endDate] as const,
  expiring: (days: number) => [...documentsKeys.all, 'expiring', days] as const,
};

// ============ Documents Hooks ============

export function useDocuments(filters?: DocumentFilters): UseQueryResult<Document[]> {
  return useQuery({
    queryKey: documentsKeys.list(filters),
    queryFn: () => documentsService.listDocuments(filters),
  });
}

export function useDocument(id: string): UseQueryResult<Document> {
  return useQuery({
    queryKey: documentsKeys.detail(id),
    queryFn: () => documentsService.getDocument(id),
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateDocumentDTO) => documentsService.createDocument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentsKeys.statistics() });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateDocumentDTO }) =>
      documentsService.updateDocument(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => documentsService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentsKeys.statistics() });
    },
  });
}

export function useArchiveDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => documentsService.archiveDocument(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentsKeys.statistics() });
    },
  });
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => documentsService.restoreDocument(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentsKeys.statistics() });
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata: Partial<CreateDocumentDTO> }) =>
      documentsService.uploadFile(file, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentsKeys.statistics() });
    },
  });
}

// ============ Folders Hooks ============

export function useFolders(parentId?: string): UseQueryResult<DocumentFolder[]> {
  return useQuery({
    queryKey: documentsKeys.foldersList(parentId),
    queryFn: () => documentsService.listFolders(parentId),
  });
}

export function useFolder(id: string): UseQueryResult<DocumentFolder> {
  return useQuery({
    queryKey: documentsKeys.folder(id),
    queryFn: () => documentsService.getFolder(id),
    enabled: !!id,
  });
}

export function useFolderDocuments(folderId: string): UseQueryResult<Document[]> {
  return useQuery({
    queryKey: documentsKeys.folderDocuments(folderId),
    queryFn: () => documentsService.getFolderDocuments(folderId),
    enabled: !!folderId,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateFolderDTO) => documentsService.createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.folders() });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateFolderDTO }) =>
      documentsService.updateFolder(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.folder(id) });
      queryClient.invalidateQueries({ queryKey: documentsKeys.folders() });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => documentsService.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.folders() });
    },
  });
}

// ============ Signatures Hooks ============

export function useSignatureRequests(): UseQueryResult<DocumentSignature[]> {
  return useQuery({
    queryKey: documentsKeys.signatures(),
    queryFn: () => documentsService.listSignatureRequests(),
  });
}

export function useSignatureRequest(id: string): UseQueryResult<DocumentSignature> {
  return useQuery({
    queryKey: documentsKeys.signature(id),
    queryFn: () => documentsService.getSignatureRequest(id),
    enabled: !!id,
  });
}

export function useRequestSignature() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: RequestSignatureDTO) => documentsService.requestSignature(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.signatures() });
    },
  });
}

export function useSubmitSignature() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubmitSignatureDTO }) =>
      documentsService.submitSignature(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.signature(id) });
      queryClient.invalidateQueries({ queryKey: documentsKeys.signatures() });
    },
  });
}

export function useDeclineSignature() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      documentsService.declineSignature(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.signature(id) });
      queryClient.invalidateQueries({ queryKey: documentsKeys.signatures() });
    },
  });
}

// ============ Templates Hooks ============

export function useTemplates(category?: string): UseQueryResult<DocumentTemplate[]> {
  return useQuery({
    queryKey: documentsKeys.templatesList(category),
    queryFn: () => documentsService.listTemplates(category),
  });
}

export function useTemplate(id: string): UseQueryResult<DocumentTemplate> {
  return useQuery({
    queryKey: documentsKeys.template(id),
    queryFn: () => documentsService.getTemplate(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateTemplateDTO) => documentsService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.templates() });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTemplateDTO }) =>
      documentsService.updateTemplate(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.template(id) });
      queryClient.invalidateQueries({ queryKey: documentsKeys.templates() });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => documentsService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.templates() });
    },
  });
}

export function useGenerateFromTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: Record<string, any> }) =>
      documentsService.generateFromTemplate(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentsKeys.statistics() });
    },
  });
}

// ============ Statistics & Reports Hooks ============

export function useDocumentStatistics(): UseQueryResult<DocumentStatistics> {
  return useQuery({
    queryKey: documentsKeys.statistics(),
    queryFn: () => documentsService.getStatistics(),
  });
}

export function useDocumentActivity(documentId: string): UseQueryResult<DocumentActivityReport> {
  return useQuery({
    queryKey: documentsKeys.activity(documentId),
    queryFn: () => documentsService.getDocumentActivity(documentId),
    enabled: !!documentId,
  });
}

export function useUserDocumentActivity(
  userId: string,
  startDate: string,
  endDate: string
): UseQueryResult<UserDocumentActivity> {
  return useQuery({
    queryKey: documentsKeys.userActivity(userId, startDate, endDate),
    queryFn: () => documentsService.getUserActivity(userId, startDate, endDate),
    enabled: !!userId && !!startDate && !!endDate,
  });
}

export function useExpiringDocuments(days: number = 30): UseQueryResult<Document[]> {
  return useQuery({
    queryKey: documentsKeys.expiring(days),
    queryFn: () => documentsService.getExpiringDocuments(days),
  });
}
