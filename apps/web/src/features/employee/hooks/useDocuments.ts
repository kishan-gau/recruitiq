/**
 * React Query hooks for Documents feature
 * Uses the centralized documents service from @/services/employee
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { documentsService } from '@/services/employee/documents.service';

/**
 * Hook to fetch documents list for authenticated employee
 */
export const useDocumentsList = (filters?: {
  category?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => documentsService.listDocuments(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch documents grouped by category
 */
export const useDocumentsByCategory = () => {
  return useQuery({
    queryKey: ['documents', 'by-category'],
    queryFn: () => documentsService.getDocumentsByCategory(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single document
 */
export const useDocument = (documentId: string) => {
  return useQuery({
    queryKey: ['documents', documentId],
    queryFn: () => documentsService.getDocument(documentId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!documentId,
  });
};

/**
 * Hook to download a document
 */
export const useDocumentDownload = () => {
  return useMutation({
    mutationFn: (documentId: string) => documentsService.downloadDocument(documentId),
  });
};

/**
 * Get document preview URL (not a hook, just a helper)
 */
export const getDocumentPreviewUrl = (documentId: string): string => {
  return documentsService.getPreviewUrl(documentId);
};
