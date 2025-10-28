# Recruiter UI Components - Integration Guide

This guide shows how to integrate the three new recruiter-side components into your RecruitIQ application.

## Components Created

### 1. PublishJobToggle.jsx
A toggle switch with URL display for publishing jobs to the career portal.

### 2. ApplicationSourceBadge.jsx
A badge that displays where an application came from (career portal, LinkedIn, referral, etc.)

### 3. PortalSettingsModal.jsx
A modal for configuring public portal settings (company name, logo, salary visibility, custom fields)

---

## Integration Examples

### A. JobDetail Page Integration

Add the PublishJobToggle and PortalSettingsModal to your job detail page:

```jsx
// src/pages/JobDetail.jsx
import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import PublishJobToggle from '../components/PublishJobToggle'
import PortalSettingsModal from '../components/PortalSettingsModal'
import { Icon } from '../components/icons'

export default function JobDetail() {
  const { id } = useParams()
  const { jobs, updateJob } = useData()
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  
  const job = jobs.find(j => String(j.id) === id)

  const handleJobUpdate = (updatedJob) => {
    // Refresh the job data
    updateJob(updatedJob.id, updatedJob)
  }

  if (!job) return <div>Job not found</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Existing job details... */}
      
      {/* Add this section after job description */}
      <div className="mt-8 space-y-6">
        {/* Public Portal Toggle */}
        <PublishJobToggle 
          job={job} 
          onUpdate={handleJobUpdate}
        />

        {/* Portal Settings Button (only show if published) */}
        {job.is_public && (
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
          >
            <Icon name="settings" className="w-4 h-4" />
            Configure Portal Settings
          </button>
        )}
      </div>

      {/* Portal Settings Modal */}
      <PortalSettingsModal
        job={job}
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onUpdate={handleJobUpdate}
      />
    </div>
  )
}
```

### B. Candidates List Integration

Add ApplicationSourceBadge to show where each candidate applied from:

```jsx
// src/pages/Candidates.jsx
import React from 'react'
import { useData } from '../context/DataContext'
import ApplicationSourceBadge from '../components/ApplicationSourceBadge'
import { Link } from 'react-router-dom'

export default function Candidates() {
  const { candidates } = useData()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Candidates</h1>
      
      <div className="space-y-4">
        {candidates.map(candidate => (
          <div 
            key={candidate.id}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Link 
                  to={`/candidates/${candidate.id}`}
                  className="font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-600"
                >
                  {candidate.firstName} {candidate.lastName}
                </Link>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {candidate.email}
                </p>
              </div>

              {/* Application Source Badge */}
              <ApplicationSourceBadge source={candidate.application_source} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### C. CandidateDetail Page Integration

Show the application source badge on the candidate detail page:

```jsx
// src/pages/CandidateDetail.jsx
import React from 'react'
import { useParams } from 'react-router-dom'
import { useData } from '../context/DataContext'
import ApplicationSourceBadge from '../components/ApplicationSourceBadge'

export default function CandidateDetail() {
  const { id } = useParams()
  const { candidates } = useData()
  
  const candidate = candidates.find(c => String(c.id) === id)

  if (!candidate) return <div>Candidate not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header with source badge */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {candidate.firstName} {candidate.lastName}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {candidate.email}
          </p>
        </div>
        
        <ApplicationSourceBadge source={candidate.application_source} />
      </div>

      {/* Tracking Code (if from public portal) */}
      {candidate.application_source === 'public-portal' && candidate.tracking_code && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Tracking Code
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 font-mono">
                {candidate.tracking_code}
              </p>
            </div>
            <a
              href={`${window.location.origin}/track/${candidate.tracking_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View Candidate Portal →
            </a>
          </div>
        </div>
      )}

      {/* Rest of candidate details... */}
    </div>
  )
}
```

### D. Pipeline View Integration

Add source badges to the pipeline board:

```jsx
// src/pages/Pipeline.jsx
import React from 'react'
import { useData } from '../context/DataContext'
import ApplicationSourceBadge from '../components/ApplicationSourceBadge'

export default function Pipeline() {
  const { candidates, jobs } = useData()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Pipeline</h1>
      
      {/* Stage columns */}
      <div className="grid grid-cols-4 gap-4">
        {['Applied', 'Screening', 'Interview', 'Offer'].map(stage => (
          <div key={stage} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            <h2 className="font-semibold mb-4">{stage}</h2>
            
            <div className="space-y-3">
              {candidates
                .filter(c => c.stage === stage)
                .map(candidate => (
                  <div 
                    key={candidate.id}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <p className="font-medium text-sm mb-2">
                      {candidate.firstName} {candidate.lastName}
                    </p>
                    
                    <ApplicationSourceBadge source={candidate.application_source} />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Component Props Reference

### PublishJobToggle

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `job` | Object | Yes | Job object with id, is_public, public_slug, view_count, application_count |
| `onUpdate` | Function | No | Callback when job is published/unpublished. Receives updated job object |

**Job object fields used:**
- `id` - Job ID
- `is_public` - Whether job is published
- `public_slug` - URL-friendly slug for the job
- `view_count` - Number of views on public portal
- `application_count` - Number of applications received

### ApplicationSourceBadge

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `source` | String | No | Application source. Defaults to 'manual' |

**Supported sources:**
- `public-portal` - Applied via career portal (emerald)
- `referral` - Referred by employee (blue)
- `linkedin` - Applied via LinkedIn (purple)
- `indeed` - Applied via Indeed (orange)
- `email` - Applied via email (cyan)
- `manual` - Manually added (slate)
- `api` - API integration (indigo)

### PortalSettingsModal

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `job` | Object | Yes | Job object with id and public_portal_settings |
| `isOpen` | Boolean | Yes | Whether modal is visible |
| `onClose` | Function | Yes | Callback to close modal |
| `onUpdate` | Function | No | Callback when settings saved. Receives updated job object |

**Settings object structure:**
```javascript
{
  companyName: "Acme Corp",
  companyLogo: "https://...",
  salaryPublic: true,
  customFields: [
    {
      id: "custom_123",
      label: "Portfolio URL",
      type: "url",
      required: false,
      options: []
    }
  ]
}
```

---

## API Endpoints Used

These components make the following API calls:

1. **PublishJobToggle**
   - `PUT /api/jobs/:id/publish` - Toggle job public visibility
   - Requires JWT token in Authorization header

2. **PortalSettingsModal**
   - `PUT /api/jobs/:id/portal-settings` - Update portal settings
   - Requires JWT token in Authorization header

3. **ApplicationSourceBadge**
   - No API calls (display-only component)

---

## Styling Notes

All components use:
- Tailwind CSS for styling
- Dark mode support
- Responsive design
- Icon component from `./icons`
- Toast notifications from `ToastContext`

Colors match the existing RecruitIQ design system:
- Primary: Emerald (600/700)
- Error: Red (600/700)
- Info: Blue (600/700)
- Background: Slate (50/800/900)

---

## Testing Checklist

- [ ] PublishJobToggle switches between published/unpublished states
- [ ] Public URL displays correctly when published
- [ ] Copy URL button works
- [ ] View count and application count display
- [ ] PortalSettingsModal saves settings correctly
- [ ] Custom fields can be added/removed
- [ ] Salary visibility toggle works
- [ ] ApplicationSourceBadge displays all source types correctly
- [ ] All components work in dark mode
- [ ] Mobile responsive on all components
