import React, { useState, useRef, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { useFlow } from '../context/FlowContext'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal'

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const TIMES = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm']

// Helper to get calendar days for a month
function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()
  
  const days = []
  
  // Previous month days (grayed out)
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLastDay - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthLastDay - i)
    })
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      isCurrentMonth: true,
      date: new Date(year, month, day)
    })
  }
  
  // Next month days to fill the grid
  const remainingDays = 7 - (days.length % 7)
  if (remainingDays < 7) {
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day)
      })
    }
  }
  
  return days
}

// Sample interview data structure
const SAMPLE_INTERVIEWS = [
  {
    id: 1,
    candidateId: 1,
    candidateName: 'Antonio Moris',
    interviewerName: 'Shannon Grant',
    date: new Date(2024, 2, 27, 10, 30), // March 27, 2024, 10:30am
    duration: 60,
    timezone: 'PDT',
    status: 'scheduled'
  },
  {
    id: 2,
    candidateId: 1,
    candidateName: 'Antonio Moris',
    interviewerName: 'Shannon Grant',
    date: new Date(2024, 2, 27, 13, 0), // March 27, 2024, 1:00pm
    duration: 60,
    timezone: 'PDT',
    status: 'scheduled'
  },
  {
    id: 3,
    candidateId: 2,
    candidateName: 'Bob Smith',
    interviewerName: 'Diane Schrader',
    date: new Date(2024, 2, 28, 13, 0), // March 28, 2024, 1:00pm
    duration: 60,
    timezone: 'PDT',
    status: 'scheduled'
  }
]

// Sample audit trail data
const AUDIT_TRAIL = [
  {
    id: 1,
    candidateName: 'Antonio Moris',
    action: 'Shannon granted data processing consent',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    avatar: 'AM'
  },
  {
    id: 2,
    candidateName: 'Antonio Moris',
    action: 'Accessed data processing consent record',
    timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    avatar: 'AM'
  },
  {
    id: 3,
    candidateName: 'Diane Schrader',
    action: 'Accessed data processing consent record',
    timestamp: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
    avatar: 'DS'
  }
]

function formatTimeAgo(date) {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default function Interviews() {
  const { state } = useData()
  const toast = useToast()
  const { currentWorkspace } = useWorkspace()
  const [currentDate, setCurrentDate] = useState(new Date(2024, 2, 1)) // March 2024 for demo
  const [selectedInterviewer, setSelectedInterviewer] = useState('Antonio, Morris')
  const [duration, setDuration] = useState('60 Min')
  const [selectedInterview, setSelectedInterview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [interviews, setInterviews] = useState(SAMPLE_INTERVIEWS)
  const fileInputRef = useRef(null)
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  
  const calendarDays = getCalendarDays(year, month)
  
  // Get interviews for the current month
  const currentMonthInterviews = interviews.filter(interview => {
    const interviewDate = interview.date
    return interviewDate.getMonth() === month && interviewDate.getFullYear() === year
  })
  
  // Group interviews by date and time
  const interviewsByDateTime = {}
  currentMonthInterviews.forEach(interview => {
    const dateKey = interview.date.getDate()
    const timeKey = `${interview.date.getHours()}:${interview.date.getMinutes().toString().padStart(2, '0')}`
    
    if (!interviewsByDateTime[dateKey]) {
      interviewsByDateTime[dateKey] = {}
    }
    if (!interviewsByDateTime[dateKey][timeKey]) {
      interviewsByDateTime[dateKey][timeKey] = []
    }
    interviewsByDateTime[dateKey][timeKey].push(interview)
  })
  
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const handleDragLeave = () => {
    setIsDragging(false)
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      toast.show(`Uploaded ${files.length} file(s)`)
    }
  }
  
  const handleFileClick = () => {
    fileInputRef.current?.click()
  }
  
  const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      toast.show(`Uploaded ${files.length} file(s)`)
    }
  }
  
  const handleCopyLink = () => {
    toast.show('Link copied to clipboard')
  }
  
  const handleInterviewClick = (interview) => {
    setSelectedInterview(interview)
  }
  
  const handleSlotClick = (date, hour, minute) => {
    const slotDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute)
    setSelectedSlot(slotDate)
    setShowCreateModal(true)
  }
  
  const handleCreateInterview = (interviewData) => {
    const newInterview = {
      id: interviews.length + 1,
      ...interviewData,
      date: selectedSlot,
      status: 'scheduled'
    }
    setInterviews([...interviews, newInterview])
    setShowCreateModal(false)
    setSelectedSlot(null)
    toast.show('Interview scheduled successfully')
  }
  
  const selectedCandidate = selectedInterview 
    ? state.candidates.find(c => c.id === selectedInterview.candidateId)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Interview Scheduling</h1>
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
            The candidate will select a time that works best for their availability (timezone detected).
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
                <option>30 Min</option>
                <option>60 Min</option>
                <option>90 Min</option>
                <option>120 Min</option>
              </select>
              
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
              >
                Copy Link
              </button>
            </div>
            
            {/* Calendar */}
            <div className="space-y-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{monthName}</h2>
                  <span className="text-sm text-slate-500 dark:text-slate-400">PDT</span>
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
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400"></div>
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
                      {day}
                    </div>
                  ))}
                </div>
              
              {/* Time Slots and Days */}
              {TIMES.map((time, timeIndex) => {
                const startOfWeek = timeIndex * 7
                const weekDays = calendarDays.slice(startOfWeek, startOfWeek + 7)
                
                return (
                  <div key={time} className="grid grid-cols-8 gap-2">
                    {/* Time Label */}
                    <div className="text-xs text-slate-500 dark:text-slate-400 py-2">
                      {time}
                    </div>
                    
                    {/* Day Cells */}
                    {calendarDays.slice(0, 7).map((dayInfo, dayIndex) => {
                      const dateKey = dayInfo.day
                      const hour = parseInt(time.replace(/[^\d]/g, ''))
                      const isPM = time.includes('pm')
                      const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour)
                      
                      // Find interviews for this time slot
                      const timeKey = `${hour24}:00`
                      const timeKey30 = `${hour24}:30`
                      const dayInterviews = [
                        ...(interviewsByDateTime[dateKey]?.[timeKey] || []),
                        ...(interviewsByDateTime[dateKey]?.[timeKey30] || [])
                      ]
                      
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
                                e.stopPropagation()
                                handleInterviewClick(interview)
                              }}
                              className={`w-full text-left text-xs px-2 py-1 rounded mb-1 transition-colors ${
                                selectedInterview?.id === interview.id
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                              }`}
                            >
                              <div className="font-medium truncate">
                                {interview.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
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
                Drop files here or click to upload
              </p>
            </div>
          </div>
        </div>
        
        {/* Audit Trail Panel */}
        {selectedInterview && (
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border dark:border-slate-700/50 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Audit Trail</h2>
              
              {/* Candidate Info */}
              {selectedCandidate && (
                <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-medium text-sm shadow-lg">
                      {selectedCandidate.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/candidates/${selectedCandidate.id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        {selectedCandidate.name}
                      </Link>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{selectedCandidate.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {selectedInterview.date.toLocaleDateString('en-US', { 
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
                {AUDIT_TRAIL.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-medium text-xs shadow">
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
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowDocumentModal(true)}
                    className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Document Interview
                  </button>
                  <button
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Reschedule
                  </button>
                  <button
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel Interview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Create Interview Modal */}
      {showCreateModal && (
        <CreateInterviewModal
          selectedSlot={selectedSlot}
          candidates={state.candidates}
          workspaceUsers={currentWorkspace?.users || []}
          onClose={() => {
            setShowCreateModal(false)
            setSelectedSlot(null)
          }}
          onSave={handleCreateInterview}
        />
      )}

      {/* Document Interview Modal */}
      {showDocumentModal && selectedInterview && (
        <DocumentInterviewModal
          interview={selectedInterview}
          candidate={selectedCandidate}
          onClose={() => setShowDocumentModal(false)}
          onSave={(documentation) => {
            // Save documentation
            toast.show('Interview documentation saved')
            setShowDocumentModal(false)
          }}
        />
      )}
    </div>
  )
}

// Create Interview Modal Component
function CreateInterviewModal({ selectedSlot, candidates, workspaceUsers, onClose, onSave }) {
  const [candidateId, setCandidateId] = useState('')
  const [interviewerName, setInterviewerName] = useState('')
  const [duration, setDuration] = useState('60')
  const [notes, setNotes] = useState('')
  
  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!candidateId || !interviewerName) {
      return
    }
    
    const selectedCandidate = candidates.find(c => c.id === parseInt(candidateId))
    
    onSave({
      candidateId: parseInt(candidateId),
      candidateName: selectedCandidate?.name || '',
      interviewerName,
      duration: parseInt(duration),
      timezone: 'PDT',
      notes
    })
  }
  
  return (
    <Modal open={true} onClose={onClose} title="Schedule Interview">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Date & Time
          </label>
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100">
            {selectedSlot?.toLocaleString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>
        
        <div>
          <label htmlFor="candidate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Candidate <span className="text-red-500">*</span>
          </label>
          <select
            id="candidate"
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select a candidate</option>
            {candidates.map(candidate => (
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
          {workspaceUsers.length > 0 ? (
            <select
              id="interviewer"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select an interviewer</option>
              {workspaceUsers.map(user => (
                <option key={user.id} value={user.name}>
                  {user.name} {user.role && `(${user.role.charAt(0).toUpperCase() + user.role.slice(1)})`}
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                id="interviewer"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                required
                placeholder="Enter interviewer name"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                No team members found. Add team members in workspace settings to select from a list.
              </p>
            </div>
          )}
        </div>
        
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Duration (minutes)
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
            <option value="120">120 minutes</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any notes or special instructions..."
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            Schedule Interview
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Document Interview Modal Component
function DocumentInterviewModal({ interview, candidate, onClose, onSave }) {
  const { state } = useData()
  const { flowTemplates, ensureLoaded } = useFlow()
  
  // Ensure flow templates are loaded
  useEffect(() => {
    ensureLoaded()
  }, [ensureLoaded])
  
  // Get job and flow template
  const job = state.jobs.find(j => j.id === candidate?.jobId)
  const flowTemplateId = job?.flowTemplateId
  
  // Get flow template from API-based context
  const [flowTemplate, setFlowTemplate] = useState(null)
  const [currentStage, setCurrentStage] = useState(null)
  
  useEffect(() => {
    if (flowTemplateId && flowTemplates) {
      try {
        const template = flowTemplates.find(t => t.id === flowTemplateId)
        setFlowTemplate(template)
        
        // Find the stage that matches candidate's current stage
        if (template && candidate?.stage) {
          const stage = template.stages?.find(s => s.name === candidate.stage)
          setCurrentStage(stage)
        }
      } catch (e) {
        console.error('Failed to load flow template:', e)
      }
    }
  }, [flowTemplateId, flowTemplates, candidate?.stage, job?.flowTemplateId])
  
  // Dynamic answers state based on questions
  const [answers, setAnswers] = useState({})
  const [overallRating, setOverallRating] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  
  // Handle answer changes for different question types
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }
  
  // Calculate score if scoring is enabled
  const calculateScore = () => {
    if (!currentStage?.requirements?.scoring?.enabled) return null
    
    const questions = currentStage.requirements.questions || []
    let totalWeight = 0
    let earnedScore = 0
    
    questions.forEach(q => {
      const weight = q.weight || 0
      totalWeight += weight
      
      const answer = answers[q.id]
      if (!answer) return
      
      // Calculate score based on question type
      if (q.type === 'rating') {
        // Rating: 1-5 scale, normalize to percentage
        const rating = parseInt(answer) || 0
        earnedScore += (rating / 5) * weight
      } else if (q.type === 'yes-no') {
        // Yes/No: yes = 100%, no = 0%
        earnedScore += (answer === 'yes' ? weight : 0)
      }
      // For text and multiple-choice, we'll need manual scoring later
    })
    
    return totalWeight > 0 ? Math.round((earnedScore / totalWeight) * 100) : 0
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    
    const score = calculateScore()
    const scoringEnabled = currentStage?.requirements?.scoring?.enabled
    const passingScore = currentStage?.requirements?.scoring?.passingScore || 0
    const passed = scoringEnabled ? (score >= passingScore) : null
    
    onSave({
      interviewId: interview.id,
      candidateId: interview.candidateId,
      stageId: currentStage?.id,
      stageName: currentStage?.name || candidate?.stage,
      flowTemplateId,
      answers,
      score: scoringEnabled ? score : null,
      passed,
      overallRating,
      recommendation,
      nextSteps,
      additionalNotes,
      documentedAt: new Date().toISOString(),
      documentedBy: interview.interviewerName
    })
  }
  
  return (
    <Modal open={true} onClose={onClose} title="Document Interview" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Interview Header Info */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-medium text-sm shadow-lg">
              {candidate?.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100">{candidate?.name}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{candidate?.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {interview.date.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
              {currentStage && (
                <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-xs font-medium">
                  <span>Stage: {currentStage.name}</span>
                  {currentStage.type && <span className="text-emerald-600 dark:text-emerald-400">• {currentStage.type}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Questions from Template */}
        {currentStage?.requirements?.questions?.length > 0 ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Evaluation Questions
              <span className="text-xs font-normal px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                {currentStage.requirements.questions.length}
              </span>
            </h3>
            
            {currentStage.requirements.questions.map((question, index) => (
              <div key={question.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {index + 1}. {question.text}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                  {question.weight > 0 && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      ({question.weight}% weight)
                    </span>
                  )}
                </label>
                
                {/* Rating Question */}
                {question.type === 'rating' && (
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleAnswerChange(question.id, rating.toString())}
                        className={`px-4 py-2 rounded-lg border transition-all ${
                          answers[question.id] === rating.toString()
                            ? 'bg-emerald-500 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
                        }`}
                      >
                        {'⭐'.repeat(rating)}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Multiple Choice Question */}
                {question.type === 'multiple-choice' && question.options && (
                  <div className="space-y-2 mt-2">
                    {question.options.map((option, optIndex) => (
                      <label key={optIndex} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                
                {/* Text Question */}
                {question.type === 'text' && (
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    rows={3}
                    required={question.required}
                    placeholder="Enter your response..."
                    className="w-full mt-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                )}
                
                {/* Yes/No Question */}
                {question.type === 'yes-no' && (
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(question.id, 'yes')}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                        answers[question.id] === 'yes'
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
                      }`}
                    >
                      ✓ Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(question.id, 'no')}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                        answers[question.id] === 'no'
                          ? 'bg-red-500 text-white border-red-600'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-red-500'
                      }`}
                    >
                      ✗ No
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              No evaluation questions defined for this stage. Please add questions to the flow template or use the additional notes section below.
            </p>
          </div>
        )}

        {/* Required Documents Checklist */}
        {currentStage?.requirements?.documents?.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Required Documents
              <span className="text-xs font-normal px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                {currentStage.requirements.documents.length}
              </span>
            </h3>
            <div className="space-y-2">
              {currentStage.requirements.documents.map(doc => (
                <div key={doc.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {doc.name}
                      {doc.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    {doc.description && (
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{doc.description}</div>
                    )}
                    {doc.fileTypes && (
                      <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        Accepted: {doc.fileTypes}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                  >
                    Upload
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scoring Display */}
        {currentStage?.requirements?.scoring?.enabled && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Scoring Enabled</div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Passing score: {currentStage.requirements.scoring.passingScore}%
                  {currentStage.requirements.scoring.autoAdvance && (
                    <span className="ml-2 text-emerald-600 dark:text-emerald-400">• Auto-advance on pass</span>
                  )}
                </div>
              </div>
              {Object.keys(answers).length > 0 && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {calculateScore()}%
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Current Score</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overall Rating */}
        <div>
          <label htmlFor="overall-rating" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Overall Rating <span className="text-red-500">*</span>
          </label>
          <select
            id="overall-rating"
            value={overallRating}
            onChange={(e) => setOverallRating(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select rating...</option>
            <option value="strong-hire">⭐⭐⭐⭐⭐ Strong Hire</option>
            <option value="hire">⭐⭐⭐⭐ Hire</option>
            <option value="maybe">⭐⭐⭐ Maybe</option>
            <option value="no-hire">⭐⭐ No Hire</option>
            <option value="strong-no-hire">⭐ Strong No Hire</option>
          </select>
        </div>

        {/* Recommendation */}
        <div>
          <label htmlFor="recommendation" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Recommendation <span className="text-red-500">*</span>
          </label>
          <select
            id="recommendation"
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select recommendation...</option>
            <option value="move-forward">✅ Move to Next Stage</option>
            <option value="second-round">🔄 Schedule Second Interview</option>
            <option value="hold">⏸️ Hold for Now</option>
            <option value="reject">❌ Do Not Move Forward</option>
          </select>
        </div>

        {/* Next Steps */}
        <div>
          <label htmlFor="next-steps" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Next Steps
          </label>
          <textarea
            id="next-steps"
            value={nextSteps}
            onChange={(e) => setNextSteps(e.target.value)}
            rows={2}
            placeholder="What should happen next with this candidate..."
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label htmlFor="additional-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Additional Notes
          </label>
          <textarea
            id="additional-notes"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            rows={3}
            placeholder="Any other observations or comments..."
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            Save Documentation
          </button>
        </div>
      </form>
    </Modal>
  )
}
