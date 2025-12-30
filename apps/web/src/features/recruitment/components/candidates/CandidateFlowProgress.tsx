import React from 'react';

import { useFlow } from '../context/FlowContext';

const STAGE_TYPE_COLORS = {
  'phone-screen': 'bg-blue-500',
  'technical': 'bg-purple-500',
  'behavioral': 'bg-indigo-500',
  'assessment': 'bg-amber-500',
  'panel': 'bg-pink-500',
  'presentation': 'bg-cyan-500',
  'practical': 'bg-teal-500',
  'review': 'bg-slate-500',
  'reference-check': 'bg-gray-500',
  'client-interview': 'bg-orange-500',
  'compliance': 'bg-red-500'
};

const STATUS_ICONS = {
  completed: (
    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  'in-progress': (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  scheduled: (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  pending: (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  skipped: (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  )
};

export default function CandidateFlowProgress({ candidateId, jobId, compact = false }) {
  const { getJobFlowWithMergedStages, getCandidateProgress, initializeCandidateProgress } = useFlow();
  
  const jobFlow = getJobFlowWithMergedStages(jobId);
  let progress = getCandidateProgress(candidateId, jobId);
  
  // Initialize progress if it doesn't exist
  React.useEffect(() => {
    if (jobFlow && !progress) {
      initializeCandidateProgress(candidateId, jobId);
    }
  }, [jobFlow, progress, candidateId, jobId, initializeCandidateProgress]);
  
  // Reload progress after initialization
  if (jobFlow && !progress) {
    progress = getCandidateProgress(candidateId, jobId);
  }
  
  if (!jobFlow || !progress) {
    return null;
  }
  
  const stages = jobFlow.allStages || [];
  const currentStageIndex = stages.findIndex(s => s.id === progress.currentStage?.stageId);
  
  // Compact view for cards
  if (compact) {
    const completedCount = progress.stageProgress.filter(sp => sp.status === 'completed').length;
    const totalCount = stages.length;
    const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>Progress</span>
          <span>{completedCount} of {totalCount} stages</span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {progress.currentStage && (
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Current: <span className="font-medium text-slate-900 dark:text-slate-100">
              {stages[currentStageIndex]?.name}
            </span>
          </div>
        )}
      </div>
    );
  }
  
  // Full timeline view
  return (
    <div className="space-y-1">
      {stages.map((stage, idx) => {
        const stageProgress = progress.stageProgress.find(sp => sp.stageId === stage.id) || { status: 'pending' };
        const isActive = idx === currentStageIndex;
        const isCompleted = stageProgress.status === 'completed';
        const isSkipped = stageProgress.status === 'skipped';
        const isScheduled = stageProgress.status === 'scheduled';
        
        const statusColor = isCompleted 
          ? 'bg-emerald-500' 
          : isActive 
          ? 'bg-blue-500 animate-pulse' 
          : isScheduled
          ? 'bg-amber-500'
          : isSkipped
          ? 'bg-slate-300 dark:bg-slate-600'
          : 'bg-slate-200 dark:bg-slate-700';
        
        return (
          <div key={stage.id} className="flex gap-3">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusColor} transition-all duration-300`}>
                {STATUS_ICONS[stageProgress.status] || STATUS_ICONS.pending}
              </div>
              {idx < stages.length - 1 && (
                <div className={`w-0.5 h-12 my-1 ${
                  isCompleted ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-slate-700'
                } transition-colors duration-300`} />
              )}
            </div>
            
            {/* Stage Details */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {stage.name}
                    </h4>
                    {stage.isCustom && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">
                        Custom
                      </span>
                    )}
                    {stage.required && !isCompleted && !isSkipped && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                        Required
                      </span>
                    )}
                  </div>
                  
                  {/* Status Text */}
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {isCompleted && stageProgress.completedAt && (
                      <span>
                        Completed {new Date(stageProgress.completedAt).toLocaleDateString()} 
                        {stageProgress.outcome && ` • ${stageProgress.outcome}`}
                      </span>
                    )}
                    {isScheduled && stageProgress.scheduledDate && (
                      <span>
                        Scheduled for {new Date(stageProgress.scheduledDate).toLocaleDateString()}
                      </span>
                    )}
                    {isActive && !isScheduled && (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">In Progress</span>
                    )}
                    {isSkipped && (
                      <span className="line-through">Skipped</span>
                    )}
                    {stageProgress.status === 'pending' && !isActive && (
                      <span>Pending</span>
                    )}
                  </div>
                </div>
                
                {/* Duration */}
                {stage.estimatedDuration > 0 && (
                  <span className="text-xs text-slate-500 dark:text-slate-500 ml-2 flex-shrink-0">
                    {stage.estimatedDuration} min
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
