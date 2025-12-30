import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

import { useToast } from '@/hooks/useToast';

import { candidatesService } from '../services/candidates.service';
import { interviewsService } from '../services/interviews.service';


// ================================================================================
// TYPES
// ================================================================================

interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  interviewerName: string;
  date: Date;
  duration: number;
  timezone: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  feedback?: string;
  rating?: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  status: string;
}

interface AuditActivity {
  id: string;
  candidateName: string;
  avatar: string;
  action: string;
  timestamp: Date;
}

interface CalendarDay {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
}

// ================================================================================
// CONSTANTS
// ================================================================================

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIMES = [
  '8am', '9am', '10am', '11am', '12pm',
  '1pm', '2pm', '3pm', '4pm', '5pm', '6pm'
];

const SAMPLE_AUDIT_TRAIL: AuditActivity[] = [
  {
    id: '1',
    candidateName: 'Sarah Chen',
    avatar: 'SC',
    action: 'Completed phone screening',
    timestamp: new Date(Date.now() - 3600000)
  },
  {
    id: '2',
    candidateName: 'Michael Rodriguez',
    avatar: 'MR',
    action: 'Scheduled technical interview',
    timestamp: new Date(Date.now() - 7200000)
  },
  {
    id: '3',
    candidateName: 'Emma Thompson',
    avatar: 'ET',
    action: 'Updated availability',
    timestamp: new Date(Date.now() - 10800000)
  }
];

// ================================================================================
// HELPER FUNCTIONS
// ================================================================================

function getCalendarDays(year: number, month: number): CalendarDay[] {
  const days: CalendarDay[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevMonthLastDay = new Date(year, month, 0);
  
  const startDayOfWeek = firstDay.getDay();
  const totalDaysInMonth = lastDay.getDate();
  const totalDaysInPrevMonth = prevMonthLastDay.getDate();
  
  // Previous month days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: totalDaysInPrevMonth - i,
      date: new Date(year, month - 1, totalDaysInPrevMonth - i),
      isCurrentMonth: false
    });
  }
  
  // Current month days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    days.push({
      day: i,
      date: new Date(year, month, i),
      isCurrentMonth: true
    });
  }
  
  // Next month days
  const remainingDays = 35 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      date: new Date(year, month + 1, i),
      isCurrentMonth: false
    });
  }
  
  return days;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

// ================================================================================
// MAIN COMPONENT
// ================================================================================

export default function InterviewsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedInterviewer, setSelectedInterviewer] = useState('Antonio, Morris');
  const [duration, setDuration] = useState('60');
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  
  // Queries
  const { data: interviewsData = [], isLoading: loadingInterviews } = useQuery({
    queryKey: ['interviews'],
    queryFn: () => interviewsService.listInterviews(),
  });
  
  const { data: candidatesData = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => candidatesService.listCandidates(),
  });
  
  // Mutations
  const createInterviewMutation = useMutation({
    mutationFn: (data: any) => interviewsService.createInterview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Interview scheduled successfully');
      setShowCreateModal(false);
      setSelectedSlot(null);
    },
    onError: () => {
      toast.error('Failed to schedule interview');
    },
  });
  
  const updateInterviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      interviewsService.updateInterview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Interview updated successfully');
    },
    onError: () => {
      toast.error('Failed to update interview');
    },
  });
  
  const cancelInterviewMutation = useMutation({
    mutationFn: (id: string) => interviewsService.cancelInterview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Interview cancelled');
      setSelectedInterview(null);
    },
    onError: () => {
      toast.error('Failed to cancel interview');
    },
  });
  
  const submitFeedbackMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: any }) =>
      interviewsService.submitFeedback(id, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Interview documentation saved');
      setShowDocumentModal(false);
    },
    onError: () => {
      toast.error('Failed to save documentation');
    },
  });
  
  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const calendarDays = getCalendarDays(year, month);
  
  // Organize interviews by date/time
  const interviewsByDateTime: Record<string, Record<string, Interview[]>> = {};
  interviewsData.forEach((interview: Interview) => {
    const dateKey = interview.date.getDate().toString();
    const timeKey = interview.date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    if (!interviewsByDateTime[dateKey]) {
      interviewsByDateTime[dateKey] = {};
    }
    if (!interviewsByDateTime[dateKey][timeKey]) {
      interviewsByDateTime[dateKey][timeKey] = [];
    }
    interviewsByDateTime[dateKey][timeKey].push(interview);
  });
  
  // Event handlers
  const handleCopyLink = () => {
    const link = `${window.location.origin}/interviews/schedule/${selectedInterviewer}`;
    navigator.clipboard.writeText(link);
    toast.success('Interview link copied to clipboard');
  };
  
  const handleInterviewClick = (interview: Interview) => {
    setSelectedInterview(interview);
  };
  
  const handleSlotClick = (date: Date, hour: number, minute: number) => {
    const slotDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
    setSelectedSlot(slotDate);
    setShowCreateModal(true);
  };
  
  const handleCreateInterview = (interviewData: any) => {
    createInterviewMutation.mutate({
      ...interviewData,
      date: selectedSlot,
      status: 'scheduled'
    });
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      toast.success(`${files.length} file(s) uploaded`);
    }
  };
  
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      toast.success(`${files.length} file(s) uploaded`);
    }
  };
  
  const selectedCandidate = selectedInterview
    ? candidatesData.find((c: Candidate) => c.id === selectedInterview.candidateId)
    : null;
  
  if (loadingInterviews || loadingCandidates) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Interview Scheduling
        </h1>
      </div>
      
      {/* Info Banner */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            De kandidaat zal een tijd selecteren die het beste past bij hun beschikbaarheid (tijdzone gedetecteerd).
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Calendar Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700/50 p-6 space-y-6">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedInterviewer}
                onChange={(e) => setSelectedInterviewer(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              >
                <option>Antonio, Morris</option>
                <option>Shannon Grant</option>
                <option>Diane Schrader</option>
              </select>
              
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              >
                <option value="30">30 Min</option>
                <option value="60">60 Min</option>
                <option value="90">90 Min</option>
                <option value="120">120 Min</option>
              </select>
              
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
              >
                Kopieer Link
              </button>
            </div>
            
            {/* Calendar */}
            <div className="space-y-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {monthName}
                  </h2>
                  <span className="text-sm text-slate-500 dark:text-slate-400">CET</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    aria-label="Previous month"
                  >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    aria-label="Next month"
                  >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Calendar Grid */}
              <div className="space-y-4">
                {/* Day Headers */}
                <div className="grid grid-cols-8 gap-2">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400" />
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
                      {day}
                    </div>
                  ))}
                </div>
              
                {/* Time Slots and Days */}
                {TIMES.map((time, timeIndex) => (
                    <div key={time} className="grid grid-cols-8 gap-2">
                      {/* Time Label */}
                      <div className="text-xs text-slate-500 dark:text-slate-400 py-2">
                        {time}
                      </div>
                      
                      {/* Day Cells */}
                      {calendarDays.slice(0, 7).map((dayInfo, dayIndex) => {
                        const dateKey = dayInfo.day.toString();
                        const hour = parseInt(time.replace(/[^\d]/g, ''));
                        const isPM = time.includes('pm');
                        const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                        
                        // Find interviews for this time slot
                        const timeKey = `${hour24.toString().padStart(2, '0')}:00`;
                        const timeKey30 = `${hour24.toString().padStart(2, '0')}:30`;
                        const dayInterviews = [
                          ...(interviewsByDateTime[dateKey]?.[timeKey] || []),
                          ...(interviewsByDateTime[dateKey]?.[timeKey30] || [])
                        ];
                        
                        return (
                          <div
                            key={`${time}-${dayIndex}`}
                            onClick={() => dayInfo.isCurrentMonth && handleSlotClick(dayInfo.date, hour24, 0)}
                            className={`min-h-[60px] border rounded p-1 transition-colors ${
                              dayInfo.isCurrentMonth
                                ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer'
                                : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                            }`}
                          >
                            {/* Show date number in first row */}
                            {timeIndex === 0 && (
                              <div className={`text-xs font-medium mb-1 ${
                                dayInfo.isCurrentMonth
                                  ? 'text-slate-700 dark:text-slate-300'
                                  : 'text-slate-400 dark:text-slate-600'
                              }`}>
                                {dayInfo.day}
                              </div>
                            )}
                            
                            {/* Show interviews */}
                            {dayInterviews.map(interview => (
                              <button
                                key={interview.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInterviewClick(interview);
                                }}
                                className={`w-full text-left text-xs px-2 py-1 rounded mb-1 transition-colors ${
                                  selectedInterview?.id === interview.id
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                                }`}
                              >
                                <div className="font-medium truncate">
                                  {new Date(interview.date).toLocaleTimeString('nl-NL', { 
                                    hour: 'numeric', 
                                    minute: '2-digit',
                                    hour12: false
                                  })}
                                </div>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>
            </div>
            
            {/* File Upload Area */}
            <div
              className={`mt-6 p-6 border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500/50 dark:hover:border-emerald-500/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleFileClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sleep bestanden hier of klik om te uploaden
              </p>
            </div>
          </div>
        </div>
        
        {/* Audit Trail Panel */}
        {selectedInterview && (
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700/50 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">
                Audittrail
              </h2>
              
              {/* Candidate Info */}
              {selectedCandidate && (
                <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-medium text-sm shadow-lg">
                      {selectedCandidate.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/recruitment/candidates/${selectedCandidate.id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        {selectedCandidate.name}
                      </Link>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {selectedCandidate.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {new Date(selectedInterview.date).toLocaleDateString('nl-NL', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Activity Log */}
              <div className="space-y-4 mb-6">
                {SAMPLE_AUDIT_TRAIL.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-medium text-xs shadow">
                      {activity.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {activity.candidateName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-500 whitespace-nowrap">
                          {formatTimeAgo(activity.timestamp)}
                        </div>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {activity.action}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Snelle Acties
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowDocumentModal(true)}
                    className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documenteer Interview
                  </button>
                  <button
                    onClick={() => {
                      // Reschedule logic
                      toast.info('Herplannen functionaliteit komt binnenkort');
                    }}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Herplannen
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Weet u zeker dat u dit interview wilt annuleren?')) {
                        cancelInterviewMutation.mutate(selectedInterview.id);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Annuleer Interview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      {showCreateModal && selectedSlot && (
        <CreateInterviewModal
          selectedSlot={selectedSlot}
          candidates={candidatesData}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedSlot(null);
          }}
          onSave={handleCreateInterview}
        />
      )}

      {showDocumentModal && selectedInterview && selectedCandidate && (
        <DocumentInterviewModal
          interview={selectedInterview}
          candidate={selectedCandidate}
          onClose={() => setShowDocumentModal(false)}
          onSave={(feedback) => {
            submitFeedbackMutation.mutate({
              id: selectedInterview.id,
              feedback
            });
          }}
        />
      )}
    </div>
  );
}

// ================================================================================
// CREATE INTERVIEW MODAL
// ================================================================================

interface CreateInterviewModalProps {
  selectedSlot: Date;
  candidates: Candidate[];
  onClose: () => void;
  onSave: (data: any) => void;
}

function CreateInterviewModal({ 
  selectedSlot, 
  candidates, 
  onClose, 
  onSave 
}: CreateInterviewModalProps) {
  const [candidateId, setCandidateId] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!candidateId || !interviewerName) {
      return;
    }
    
    const selectedCandidate = candidates.find(c => c.id === candidateId);
    
    onSave({
      candidateId,
      candidateName: selectedCandidate?.name || '',
      interviewerName,
      duration: parseInt(duration),
      timezone: 'CET',
      notes
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Plan Interview
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Datum & Tijd
              </label>
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100">
                {selectedSlot.toLocaleString('nl-NL', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            </div>
            
            <div>
              <label htmlFor="candidate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Kandidaat <span className="text-red-500">*</span>
              </label>
              <select
                id="candidate"
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecteer kandidaat...</option>
                {candidates.map((candidate: Candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} - {candidate.title}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="interviewer" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Interviewer <span className="text-red-500">*</span>
              </label>
              <input
                id="interviewer"
                type="text"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                required
                placeholder="Naam van de interviewer"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Duur
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="30">30 minuten</option>
                <option value="60">60 minuten</option>
                <option value="90">90 minuten</option>
                <option value="120">120 minuten</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notities
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optionele notities..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
            
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
              >
                Plan Interview
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ================================================================================
// DOCUMENT INTERVIEW MODAL
// ================================================================================

interface DocumentInterviewModalProps {
  interview: Interview;
  candidate: Candidate;
  onClose: () => void;
  onSave: (feedback: any) => void;
}

function DocumentInterviewModal({ 
  interview, 
  candidate, 
  onClose, 
  onSave 
}: DocumentInterviewModalProps) {
  const [overallRating, setOverallRating] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [technicalSkills, setTechnicalSkills] = useState('');
  const [communication, setCommunication] = useState('');
  const [cultureFit, setCultureFit] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!overallRating || !recommendation) {
      return;
    }
    
    onSave({
      overallRating,
      recommendation,
      nextSteps,
      additionalNotes,
      evaluations: {
        technicalSkills,
        communication,
        cultureFit
      },
      completedAt: new Date().toISOString()
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Documenteer Interview
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Candidate Info */}
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-medium">
                {candidate.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {candidate.name}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {candidate.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {new Date(interview.date).toLocaleString('nl-NL')}
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Evaluation Criteria */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Evaluatiecriteria
              </h3>
              
              <div>
                <label htmlFor="technical" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Technische Vaardigheden
                </label>
                <select
                  id="technical"
                  value={technicalSkills}
                  onChange={(e) => setTechnicalSkills(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecteer...</option>
                  <option value="5">⭐⭐⭐⭐⭐ Uitstekend</option>
                  <option value="4">⭐⭐⭐⭐ Goed</option>
                  <option value="3">⭐⭐⭐ Voldoende</option>
                  <option value="2">⭐⭐ Matig</option>
                  <option value="1">⭐ Onvoldoende</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="communication" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Communicatieve Vaardigheden
                </label>
                <select
                  id="communication"
                  value={communication}
                  onChange={(e) => setCommunication(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecteer...</option>
                  <option value="5">⭐⭐⭐⭐⭐ Uitstekend</option>
                  <option value="4">⭐⭐⭐⭐ Goed</option>
                  <option value="3">⭐⭐⭐ Voldoende</option>
                  <option value="2">⭐⭐ Matig</option>
                  <option value="1">⭐ Onvoldoende</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="culture" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Culturele Fit
                </label>
                <select
                  id="culture"
                  value={cultureFit}
                  onChange={(e) => setCultureFit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecteer...</option>
                  <option value="5">⭐⭐⭐⭐⭐ Uitstekend</option>
                  <option value="4">⭐⭐⭐⭐ Goed</option>
                  <option value="3">⭐⭐⭐ Voldoende</option>
                  <option value="2">⭐⭐ Matig</option>
                  <option value="1">⭐ Onvoldoende</option>
                </select>
              </div>
            </div>
            
            {/* Overall Rating */}
            <div>
              <label htmlFor="overall" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Algemene Beoordeling <span className="text-red-500">*</span>
              </label>
              <select
                id="overall"
                value={overallRating}
                onChange={(e) => setOverallRating(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecteer beoordeling...</option>
                <option value="strong-hire">⭐⭐⭐⭐⭐ Zeker Aannemen</option>
                <option value="hire">⭐⭐⭐⭐ Aannemen</option>
                <option value="maybe">⭐⭐⭐ Misschien</option>
                <option value="no-hire">⭐⭐ Niet Aannemen</option>
                <option value="strong-no-hire">⭐ Zeker Niet Aannemen</option>
              </select>
            </div>

            {/* Recommendation */}
            <div>
              <label htmlFor="recommendation" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Aanbeveling <span className="text-red-500">*</span>
              </label>
              <select
                id="recommendation"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecteer aanbeveling...</option>
                <option value="move-forward">✅ Doorgaan naar Volgende Fase</option>
                <option value="second-round">🔄 Plan Tweede Interview</option>
                <option value="hold">⏸️ In Afwachting</option>
                <option value="reject">❌ Niet Verder Gaan</option>
              </select>
            </div>

            {/* Next Steps */}
            <div>
              <label htmlFor="next-steps" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Volgende Stappen
              </label>
              <textarea
                id="next-steps"
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                rows={2}
                placeholder="Wat zijn de volgende stappen met deze kandidaat..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Aanvullende Opmerkingen
              </label>
              <textarea
                id="notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                placeholder="Eventuele andere observaties of opmerkingen..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
              >
                Bewaar Documentatie
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
