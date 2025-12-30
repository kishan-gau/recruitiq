import React, { useState, useMemo, useEffect } from 'react';

import { ApplicationSourceBadge } from '../components/shared';
import { useJobs, useCandidates } from '../hooks';

// Mock for now - we'll need to implement these properly
interface FlowTemplate {
  id: string;
  name: string;
  stages: { name: string; type: string; order: number }[];
}

interface Application {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  currentStageName: string;
  source?: string;
}

// For now, we'll use mock data - these would need to come from TanStack Query hooks
const mockFlowTemplates: FlowTemplate[] = [
  {
    id: '1',
    name: 'Standard Recruitment',
    stages: [
      { name: 'Application', type: 'screening', order: 0 },
      { name: 'Phone Screen', type: 'interview', order: 1 },
      { name: 'Technical Assessment', type: 'assessment', order: 2 },
      { name: 'Final Interview', type: 'interview', order: 3 },
      { name: 'Offer', type: 'offer', order: 4 },
    ],
  },
];

const mockApplications: Application[] = [
  {
    id: '1',
    candidateId: '1',
    candidateName: 'John Doe',
    jobId: '1',
    jobTitle: 'Software Engineer',
    currentStageName: 'Application',
    source: 'linkedin',
  },
  {
    id: '2',
    candidateId: '2',
    candidateName: 'Jane Smith',
    jobId: '1',
    jobTitle: 'Software Engineer',
    currentStageName: 'Phone Screen',
    source: 'website',
  },
];

// Helper to get all unique stages from flow templates
const getAllStagesFromTemplates = (jobs: any[], flowTemplates: FlowTemplate[]) => {
  if (!flowTemplates || flowTemplates.length === 0) return [];
  
  try {
    // Get all unique stages from all templates used by jobs
    const stagesSet = new Set<string>();
    const stageData: Record<string, { name: string; type: string; order: number }> = {};
    
    jobs.forEach(job => {
      if (job.flowTemplateId) {
        const template = flowTemplates.find(t => t.id === job.flowTemplateId);
        if (template?.stages) {
          template.stages.forEach((stage, index) => {
            stagesSet.add(stage.name);
            // Store additional stage info (type, order)
            if (!stageData[stage.name]) {
              stageData[stage.name] = {
                name: stage.name,
                type: stage.type,
                order: index,
              };
            }
          });
        }
      }
    });
    
    // Convert to array and sort by typical order
    return Array.from(stagesSet).map(name => stageData[name]).sort((a, b) => a.order - b.order);
  } catch (e) {
    console.error('Failed to load stages from templates:', e);
    return [];
  }
};

// Dynamic color mapping based on stage type
const getStageColor = (stageType: string) => {
  switch (stageType) {
    case 'screening':
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    case 'interview':
      return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
    case 'assessment':
      return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    case 'offer':
      return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
    default:
      return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  }
};

// Temporary component for candidate flow progress
const CandidateFlowProgress: React.FC<{ candidateId: string; jobId: string; compact?: boolean }> = ({
  candidateId,
  jobId,
  compact = false,
}) => (
    <div className={`${compact ? 'text-xs' : 'text-sm'} text-slate-500 dark:text-slate-400`}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
        <span>In Progress</span>
      </div>
    </div>
  );

export default function Pipeline() {
  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = useJobs({});
  const { data: candidates = [], isLoading: candidatesLoading } = useCandidates({});
  
  // For now using mock data - these would be replaced with actual hooks
  const [applications] = useState<Application[]>(mockApplications);
  const [flowTemplates] = useState<FlowTemplate[]>(mockFlowTemplates);
  const [dragging, setDragging] = useState<string | null>(null);
  
  const isLoading = jobsLoading || candidatesLoading;
  const error = jobsError;
  
  // Debug: Log all the data we're receiving
  useEffect(() => {
    console.log('[Pipeline] Component state:', {
      jobsCount: jobs?.length,
      jobs,
      flowTemplatesCount: flowTemplates?.length,
      flowTemplates,
      applicationsCount: applications?.length,
      applications,
      isLoading: { jobs: jobsLoading, candidates: candidatesLoading },
    });
  }, [jobs, flowTemplates, applications, jobsLoading, candidatesLoading]);
  
  // Get stages dynamically from templates
  const stages = useMemo(() => {
    console.log('[Pipeline] Computing stages from:', {
      jobsCount: jobs?.length,
      flowTemplatesCount: flowTemplates?.length,
      jobs: jobs?.map(j => ({ id: j.id, title: j.title, flowTemplateId: j.flowTemplateId })),
      flowTemplates: flowTemplates?.map(ft => ({ id: ft.id, name: ft.name, stagesCount: ft.stages?.length })),
    });
    const stageData = getAllStagesFromTemplates(jobs, flowTemplates);
    console.log('[Pipeline] Computed stage data:', stageData);
    return stageData.map(s => s.name);
  }, [jobs, flowTemplates]);
  
  const stageData = useMemo(() => getAllStagesFromTemplates(jobs, flowTemplates), [jobs, flowTemplates]);

  function move(id: string, dir: number) {
    const application = applications.find(a => a.id === id);
    if (!application) return;
    
    const currentIndex = stages.indexOf(application.currentStageName);
    const newIndex = Math.max(0, Math.min(stages.length - 1, currentIndex + dir));
    const newStage = stages[newIndex];
    
    if (newStage && newStage !== application.currentStageName) {
      // TODO: Update the application's stage
      console.log(`Would move application ${id} to ${newStage}`);
    }
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
    setDragging(id);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent, stage: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const application = applications.find(a => a.id === id);
    if (application && application.currentStageName !== stage) {
      // TODO: Update the application's stage
      console.log(`Would move application ${id} to ${stage}`);
    }
    setDragging(null);
  }

  // Show loading state
  if (isLoading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pipeline</h1>
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading...</div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading pipeline...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state with retry
  if (error) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pipeline</h1>
            <div className="text-sm text-red-500 dark:text-red-400">Error loading pipeline</div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Failed to load pipeline</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{error.message}</div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pipeline</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">Drag & drop candidates between stages</div>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Drag cards to move candidates</span>
        </div>
      </div>

      <div className="pb-4">
        {stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No stages available</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Create flow templates in Workspace Settings to define recruitment stages.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
            {stageData.map(stage => {
              const stageApplications = applications.filter(a => a.currentStageName === stage.name);
              
              return (
                <div 
                  key={stage.name} 
                  className={`${getStageColor(stage.type)} p-4 rounded-lg border transition-all duration-200 min-h-[400px]`}
                  onDragOver={handleDragOver} 
                  onDrop={(e) => handleDrop(e, stage.name)}
                >
                  <div className="font-semibold mb-4 flex items-center justify-between text-slate-900 dark:text-slate-100 text-base">
                    <span>{stage.name}</span>
                    <span className="text-sm font-normal px-2.5 py-1 bg-white/50 dark:bg-slate-900/30 rounded-full">
                      {stageApplications.length}
                    </span>
                  </div>
                  <div className="space-y-3 min-h-[120px]">
                    {stageApplications.map(app => (
                      <div 
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        className="group p-4 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-emerald-500/10 cursor-grab active:cursor-grabbing transition-all duration-200"
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base">
                              {app.candidateName || 'Unknown'}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1 flex items-center gap-2">
                              <span>{app.jobTitle || 'No job'}</span>
                              {app.source && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-600">•</span>
                                  <ApplicationSourceBadge source={app.source} size="xs" />
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                            {(app.candidateName || 'U').split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                        </div>
                        
                        {/* Flow Progress */}
                        {app.jobId && (
                          <div className="mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                            <CandidateFlowProgress candidateId={app.candidateId} jobId={app.jobId} compact={true} />
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => move(app.id, -1)} 
                            disabled={stages.indexOf(app.currentStageName) === 0}
                            className="flex-1 text-sm px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                          >
                            ← Prev
                          </button>
                          <button 
                            onClick={() => move(app.id, 1)} 
                            disabled={stages.indexOf(app.currentStageName) === stages.length - 1}
                            className="flex-1 text-sm px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    ))}
                    {stageApplications.length === 0 && (
                      <div className="text-center py-12 text-sm text-slate-400 dark:text-slate-500">
                        No applications
                      </div>
                    )}
                    {dragging && !applications.find(x => x.id === dragging)?.currentStageName && (
                      <div className="p-3 bg-white/30 dark:bg-slate-900/30 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">&nbsp;</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
