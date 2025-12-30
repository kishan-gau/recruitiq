import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { 
  FilterChips, 
  Pagination, 
  SearchInput, 
  ApplicationSourceBadge,
  type Filter 
} from '@recruitiq/ui';

import { useCandidates, useCreateCandidate, useUpdateCandidate, useDeleteCandidate } from '../hooks/useCandidates';
import { useJobs } from '../hooks/useJobs';

/**
 * Candidates Page - Unified Frontend Migration
 * 
 * Migrated from: /apps/recruitiq/src/pages/Candidates.jsx (416 lines)
 * Migration date: December 27, 2025
 * 
 * Key Changes:
 * - Context API (useData, useFlow) → TanStack Query (useCandidates, useJobs)
 * - JSX → TypeScript with full type safety
 * - Shared components from @recruitiq/ui package
 * - React Query mutations for create/update/delete operations
 */

// Helper functions
function getAllStagesFromJobs(jobs: any[]) {
  if (!jobs || jobs.length === 0) return [];
  
  try {
    const stageMap = new Map();
    
    jobs.forEach(job => {
      if (job.flowTemplate?.stages) {
        job.flowTemplate.stages.forEach((stage: any, index: number) => {
          if (!stageMap.has(stage.name)) {
            stageMap.set(stage.name, {
              name: stage.name,
              type: stage.type || 'screening',
              order: index
            });
          }
        });
      }
    });
    
    return Array.from(stageMap.values()).sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error loading stages:', error);
    return [];
  }
}

function getStageColor(stageType: string) {
  const colorMap: Record<string, string> = {
    'screening': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    'interview': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'assessment': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'offer': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'default': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  };
  return colorMap[stageType] || colorMap['default'];
}

export default function CandidatesPage() {
  // State management
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Filters state
  const [filters, setFilters] = useState<{
    search: string;
    stage: string;
    jobId: string;
  }>({
    search: '',
    stage: '',
    jobId: ''
  });
  
  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
      setPage(1); // Reset to page 1 on new search
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchInput]);
  
  // API queries
  const { data: candidatesData, isLoading: candidatesLoading } = useCandidates({
    page,
    limit: pageSize,
    search: filters.search,
    stage: filters.stage,
    jobId: filters.jobId
  });
  
  const { data: jobsData, isLoading: jobsLoading } = useJobs();
  
  // Mutations
  const createMutation = useCreateCandidate();
  const updateMutation = useUpdateCandidate();
  const deleteMutation = useDeleteCandidate();
  
  // Computed values
  const candidates = candidatesData?.candidates || [];
  const pagination = candidatesData?.pagination;
  const jobs = jobsData?.jobs || [];
  const isLoading = candidatesLoading || jobsLoading;
  
  const stages = useMemo(() => {
    const stageData = getAllStagesFromJobs(jobs);
    return stageData.map((s: any) => s.name);
  }, [jobs]);
  
  const stageData = useMemo(() => getAllStagesFromJobs(jobs), [jobs]);
  
  // Active filters for chips
  const activeFilters = useMemo(() => {
    const active: Filter[] = [];
    
    if (filters.stage) {
      active.push({ key: 'stage', label: 'Stage', value: filters.stage });
    }
    
    if (filters.jobId) {
      const job = jobs.find(j => String(j.id) === filters.jobId);
      if (job) {
        active.push({ key: 'jobId', label: 'Job', value: job.title });
      }
    }
    
    return active;
  }, [filters, jobs]);
  
  // Handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to page 1 when filter changes
  };
  
  const handleRemoveFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
  };
  
  const handleClearAllFilters = () => {
    setFilters({ search: '', stage: '', jobId: '' });
    setSearchInput('');
  };
  
  const handleCreateCandidate = () => {
    setSelectedCandidate(null);
    setIsFormOpen(true);
  };
  
  const handleEditCandidate = (candidate: any) => {
    setSelectedCandidate(candidate);
    setIsFormOpen(true);
  };
  
  const handleDeleteCandidate = async (candidateId: string) => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      try {
        await deleteMutation.mutateAsync(candidateId);
      } catch (error) {
        console.error('Failed to delete candidate:', error);
      }
    }
  };
  
  const handleFormSubmit = async (data: any) => {
    try {
      if (selectedCandidate) {
        await updateMutation.mutateAsync({ id: selectedCandidate.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsFormOpen(false);
      setSelectedCandidate(null);
    } catch (error) {
      console.error('Failed to save candidate:', error);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading candidates...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Candidates</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your candidate pipeline
          </p>
        </div>
        <button
          onClick={handleCreateCandidate}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
        >
          + Add Candidate
        </button>
      </div>
      
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          {/* Search */}
          <div className="flex-1">
            <SearchInput
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search candidates by name or email..."
              isSearching={candidatesLoading}
              onClear={() => setSearchInput('')}
            />
          </div>
          
          {/* Stage Filter */}
          <select
            value={filters.stage}
            onChange={(e) => handleFilterChange('stage', e.target.value)}
            className="border dark:border-slate-700 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Stages</option>
            {stages.map((stage) => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
          
          {/* Job Filter */}
          <select
            value={filters.jobId}
            onChange={(e) => handleFilterChange('jobId', e.target.value)}
            className="border dark:border-slate-700 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Jobs</option>
            {jobs.map((job: any) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>
        
        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <FilterChips
            filters={activeFilters}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearAllFilters}
          />
        )}
      </div>
      
      {/* Results Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Job
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">No candidates found</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters</div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                candidates.map((candidate: any) => {
                  const job = jobs.find((j: any) => j.id === candidate.jobId);
                  const currentStage = stageData.find((s: any) => s.name === candidate.currentStageName);
                  
                  return (
                    <tr key={candidate.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          to={`/recruitment/candidates/${candidate.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-full flex items-center justify-center font-semibold">
                            {candidate.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {candidate.name}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{candidate.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {job?.title || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStageColor(currentStage?.type || 'default')}`}>
                          {candidate.currentStageName || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidate.applicationSource && (
                          <ApplicationSourceBadge source={candidate.applicationSource} />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {new Date(candidate.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditCandidate(candidate)}
                            className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
                            title="Edit candidate"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(candidate.id)}
                            className="text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                            title="Delete candidate"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination && candidates.length > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            showPageSize
          />
        )}
      </div>
      
      {/* TODO: CandidateForm Modal - Will be migrated next */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {selectedCandidate ? 'Edit Candidate' : 'Add Candidate'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Form component will be migrated next
            </p>
            <button
              onClick={() => {
                setIsFormOpen(false);
                setSelectedCandidate(null);
              }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
