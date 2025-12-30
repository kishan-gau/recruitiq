/**
 * useDocuments Hook
 * React Query hooks for document management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

import { documentsService, type Document, type DocumentFolder, type DocumentFilters } from '../services/documents.service';

/**
 * Query keys for documents
 */
export const documentsKeys = {
  all: ['documents'] as const,
  lists: () => [...documentsKeys.all, 'list'] as const,
  list: (filters?: DocumentFilters) => [...documentsKeys.lists(), filters] as const,
  details: () => [...documentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentsKeys.details(), id] as const,
  folders: ['document-folders'] as const,
  foldersList: () => [...documentsKeys.folders, 'list'] as const,
  folderDetail: (id: string) => [...documentsKeys.folders, 'detail', id] as const,
  folderDocuments: (id: string) => [...documentsKeys.folders, 'documents', id] as const,
  accessLogs: (id: string) => [...documentsKeys.all, 'access-logs', id] as const,
};

/**
 * Hook to fetch documents list with filters
 */
export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: documentsKeys.list(filters),
    queryFn: () => documentsService.list(filters),
  });
}

/**
 * Hook to fetch a single document
 */
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentsKeys.detail(id),
    queryFn: () => documentsService.get(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a document
 */
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Document>) => documentsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
      toast.success('Document uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to upload document');
    },
  });
}

/**
 * Hook to update a document
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Document> }) =>
      documentsService.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
      toast.success('Document updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update document');
    },
  });
}

/**
 * Hook to delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
      toast.success('Document deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete document');
    },
  });
}

/**
 * Hook to download a document
 */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (id: string) => {
      const blob = await documentsService.download(id);
      return blob;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to download document');
    },
  });
}

/**
 * Hook to archive a document
 */
export function useArchiveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsService.archive(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
      toast.success('Document archived successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to archive document');
    },
  });
}

/**
 * Hook to restore an archived document
 */
export function useRestoreDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsService.restore(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentsKeys.lists() });
      toast.success('Document restored successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to restore document');
    },
  });
}

/**
 * Hook to fetch document folders
 */
export function useDocumentFolders(parentId?: string) {
  return useQuery({
    queryKey: documentsKeys.foldersList(),
    queryFn: () => documentsService.listFolders(parentId),
  });
}

/**
 * Hook to fetch a single folder
 */
export function useDocumentFolder(id: string) {
  return useQuery({
    queryKey: documentsKeys.folderDetail(id),
    queryFn: () => documentsService.getFolder(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch documents in a folder
 */
export function useFolderDocuments(folderId: string) {
  return useQuery({
    queryKey: documentsKeys.folderDocuments(folderId),
    queryFn: () => documentsService.getFolderDocuments(folderId),
    enabled: !!folderId,
  });
}

/**
 * Hook to create a folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string; parentId?: string }) =>
      documentsService.createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.foldersList() });
      toast.success('Folder created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create folder');
    },
  });
}

/**
 * Hook to update a folder
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; description?: string } }) =>
      documentsService.updateFolder(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.folderDetail(id) });
      queryClient.invalidateQueries({ queryKey: documentsKeys.foldersList() });
      toast.success('Folder updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update folder');
    },
  });
}

/**
 * Hook to delete a folder
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsService.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKeys.foldersList() });
      toast.success('Folder deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete folder');
    },
  });
}

/**
 * Hook to fetch document access logs
 */
export function useDocumentAccessLogs(documentId: string) {
  return useQuery({
    queryKey: documentsKeys.accessLogs(documentId),
    queryFn: () => documentsService.getAccessLogs(documentId),
    enabled: !!documentId,
  });
}
