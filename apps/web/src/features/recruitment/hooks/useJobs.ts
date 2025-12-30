import { useQuery } from '@tanstack/react-query';

import { jobsService } from '../services/jobs.service';

export function useJobs(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => jobsService.listJobs(params || {}),
    // Keep light defaults; provider sets global options
  });
}

export function useJob(id?: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => jobsService.getJob(id!),
    enabled: !!id,
  });
}
