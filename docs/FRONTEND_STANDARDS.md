# Frontend Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** November 3, 2025

---

## Table of Contents

1. [React Component Standards](#react-component-standards)
2. [Component Structure](#component-structure)
3. [Hooks Guidelines](#hooks-guidelines)
4. [State Management](#state-management)
5. [Styling Standards](#styling-standards)
6. [Performance Optimization](#performance-optimization)
7. [Accessibility](#accessibility)
8. [Form Handling](#form-handling)

---

## React Component Standards

### Component Types

```jsx
// ✅ CORRECT: Functional components (preferred)
import React from 'react';
import PropTypes from 'prop-types';

function JobCard({ job, onEdit, onDelete }) {
  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      <p>{job.description}</p>
      <button onClick={() => onEdit(job.id)}>Edit</button>
      <button onClick={() => onDelete(job.id)}>Delete</button>
    </div>
  );
}

JobCard.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default JobCard;

// ❌ WRONG: Class components (avoid unless necessary)
class JobCard extends React.Component {
  render() {
    return <div>...</div>;
  }
}
```

### Component Naming

```jsx
// ✅ CORRECT: PascalCase for components
JobCard.jsx
JobList.jsx
ApplicationForm.jsx
CandidateProfile.jsx

// ✅ CORRECT: Component file structure
src/components/
  jobs/
    JobCard.jsx
    JobList.jsx
    JobForm.jsx
    index.js  // Export all job components
  candidates/
    CandidateCard.jsx
    CandidateList.jsx
    index.js
  common/
    Button.jsx
    Modal.jsx
    LoadingSpinner.jsx

// ❌ WRONG: Inconsistent naming
jobCard.jsx      // Should be PascalCase
job-card.jsx     // Should be PascalCase
JobCardComponent.jsx  // Redundant "Component" suffix
```

---

## Component Structure

### Component File Template

```jsx
/**
 * JobCard Component
 * 
 * Displays a job posting card with title, description, and actions
 * 
 * @component
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

// Local imports
import Button from '../common/Button';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import './JobCard.css';

/**
 * JobCard component
 */
function JobCard({ job, onEdit, onDelete, showActions = true }) {
  // 1. Hooks (order matters)
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // 2. Computed values (useMemo)
  const formattedDate = useMemo(
    () => formatDate(job.createdAt),
    [job.createdAt]
  );

  const canEdit = useMemo(
    () => user.role === 'admin' || job.createdBy === user.id,
    [user.role, user.id, job.createdBy]
  );

  // 3. Effects
  useEffect(() => {
    // Component mount/unmount logic
    console.log('JobCard mounted for job:', job.id);
    
    return () => {
      console.log('JobCard unmounted');
    };
  }, [job.id]);

  // 4. Event handlers (useCallback for performance)
  const handleEdit = useCallback(() => {
    onEdit(job.id);
  }, [job.id, onEdit]);

  const handleDelete = useCallback(() => {
    if (confirm(`Are you sure you want to delete "${job.title}"?`)) {
      onDelete(job.id);
    }
  }, [job.id, job.title, onDelete]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // 5. Render helpers
  const renderActions = () => {
    if (!showActions || !canEdit) return null;

    return (
      <div className="job-card-actions">
        <Button variant="secondary" onClick={handleEdit}>
          Edit
        </Button>
        <Button variant="danger" onClick={handleDelete}>
          Delete
        </Button>
      </div>
    );
  };

  // 6. Main render
  return (
    <div className="job-card" data-testid="job-card">
      <div className="job-card-header">
        <h3 className="job-card-title">{job.title}</h3>
        <span className="job-card-date">{formattedDate}</span>
      </div>

      <p className={`job-card-description ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {job.description}
      </p>

      <button 
        className="job-card-expand" 
        onClick={handleToggleExpand}
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Show Less' : 'Show More'}
      </button>

      {renderActions()}
    </div>
  );
}

// 7. PropTypes
JobCard.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
    createdBy: PropTypes.string
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  showActions: PropTypes.bool
};

// 8. Default props
JobCard.defaultProps = {
  showActions: true
};

export default JobCard;
```

### Component Organization Rules

```jsx
// ✅ CORRECT: Organized structure
// 1. Imports (external first, then local)
// 2. Component definition
// 3. Hooks (in consistent order)
// 4. Event handlers
// 5. Render helpers
// 6. Main render
// 7. PropTypes
// 8. Export

// Hook order (MANDATORY):
// 1. useContext
// 2. useState
// 3. useReducer
// 4. useRef
// 5. useMemo
// 6. useCallback
// 7. useEffect

// ❌ WRONG: Random order
function BadComponent() {
  const handleClick = () => {};  // Event handler before hooks
  useEffect(() => {});           // Effect before state
  const [value, setValue] = useState();  // State after effect
  const data = useMemo(() => {});  // Memo after effect
}
```

---

## Hooks Guidelines

### useState

```jsx
// ✅ CORRECT: Descriptive state names
const [isLoading, setIsLoading] = useState(false);
const [jobs, setJobs] = useState([]);
const [selectedJobId, setSelectedJobId] = useState(null);
const [formData, setFormData] = useState({
  title: '',
  description: '',
  status: 'draft'
});

// ✅ CORRECT: Update state immutably
const addJob = (newJob) => {
  setJobs(prevJobs => [...prevJobs, newJob]);
};

const updateJob = (jobId, updates) => {
  setJobs(prevJobs =>
    prevJobs.map(job =>
      job.id === jobId ? { ...job, ...updates } : job
    )
  );
};

const updateFormData = (field, value) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));
};

// ❌ WRONG: Mutating state
const addJob = (newJob) => {
  jobs.push(newJob);  // ❌ Mutating array
  setJobs(jobs);
};
```

### useEffect

```jsx
// ✅ CORRECT: Clear dependencies
useEffect(() => {
  fetchJobs(organizationId);
}, [organizationId]);  // Only re-run when organizationId changes

// ✅ CORRECT: Cleanup function
useEffect(() => {
  const subscription = api.subscribe('jobs', handleJobUpdate);
  
  return () => {
    subscription.unsubscribe();  // Cleanup
  };
}, []);

// ✅ CORRECT: Separate concerns
useEffect(() => {
  fetchJobs();
}, []);

useEffect(() => {
  document.title = `${jobs.length} Jobs`;
}, [jobs.length]);

// ❌ WRONG: Missing dependencies
useEffect(() => {
  fetchJobs(organizationId);  // Uses organizationId
}, []);  // ❌ Missing dependency!

// ❌ WRONG: Too many responsibilities
useEffect(() => {
  fetchJobs();
  fetchCandidates();
  updateTitle();
  subscribeToEvents();
  // Too much in one effect!
}, []);
```

### useCallback

```jsx
// ✅ CORRECT: Memoize callbacks passed to child components
const JobList = ({ jobs }) => {
  const handleEdit = useCallback((jobId) => {
    // Edit logic
  }, []);  // No dependencies if logic is self-contained

  const handleDelete = useCallback((jobId) => {
    deleteJob(jobId, organizationId);
  }, [organizationId]);  // Include dependencies

  return (
    <div>
      {jobs.map(job => (
        <JobCard
          key={job.id}
          job={job}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};

// ❌ WRONG: Creating new functions on every render
const JobList = ({ jobs }) => {
  return (
    <div>
      {jobs.map(job => (
        <JobCard
          key={job.id}
          job={job}
          onEdit={(id) => {}}  // ❌ New function every render
          onDelete={(id) => {}}  // ❌ New function every render
        />
      ))}
    </div>
  );
};
```

### useMemo

```jsx
// ✅ CORRECT: Expensive computations
const JobDashboard = ({ jobs }) => {
  const statistics = useMemo(() => {
    return {
      total: jobs.length,
      open: jobs.filter(j => j.status === 'open').length,
      closed: jobs.filter(j => j.status === 'closed').length,
      avgApplications: calculateAverage(jobs.map(j => j.applicationCount))
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs
      .filter(job => job.status === 'open')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [jobs]);

  return <div>...</div>;
};

// ❌ WRONG: Overusing useMemo for simple values
const value = useMemo(() => a + b, [a, b]);  // ❌ Too simple, no benefit
```

### Custom Hooks

```jsx
// ✅ CORRECT: Custom hook for reusable logic
/**
 * Custom hook for fetching jobs
 */
function useJobs(organizationId) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchJobs() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get(`/jobs`, {
          params: { organizationId }
        });

        if (isMounted) {
          setJobs(response.data.jobs);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchJobs();

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const refetch = useCallback(() => {
    // Refetch logic
  }, [organizationId]);

  return { jobs, isLoading, error, refetch };
}

// Usage
function JobList() {
  const { user } = useAuth();
  const { jobs, isLoading, error, refetch } = useJobs(user.organizationId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{jobs.map(job => <JobCard key={job.id} job={job} />)}</div>;
}
```

---

## State Management

### Context API

```jsx
// ✅ CORRECT: Context for global state
// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from token
    const token = localStorage.getItem('token');
    if (token) {
      loadUserFromToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}
```

---

## Styling Standards

### TailwindCSS Guidelines

```jsx
// ✅ CORRECT: Semantic class grouping
<div className="
  flex items-center justify-between
  px-4 py-3
  bg-white rounded-lg shadow-md
  hover:shadow-lg transition-shadow
">
  <h3 className="text-lg font-semibold text-gray-900">
    {job.title}
  </h3>
</div>

// ✅ CORRECT: Conditional classes
<button 
  className={`
    px-4 py-2 rounded font-medium
    ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
  `}
  disabled={isLoading}
>
  {isLoading ? 'Loading...' : 'Submit'}
</button>

// ✅ CORRECT: Use clsx for complex conditionals
import clsx from 'clsx';

<div className={clsx(
  'px-4 py-2 rounded',
  {
    'bg-green-100 text-green-800': status === 'open',
    'bg-gray-100 text-gray-800': status === 'closed',
    'bg-yellow-100 text-yellow-800': status === 'draft'
  }
)}>
  {status}
</div>
```

---

## Performance Optimization

### React.memo

```jsx
// ✅ CORRECT: Memoize components that receive same props often
const JobCard = React.memo(function JobCard({ job, onEdit, onDelete }) {
  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      {/* ... */}
    </div>
  );
});

// Custom comparison function
const JobCard = React.memo(
  function JobCard({ job }) {
    return <div>{job.title}</div>;
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    return prevProps.job.id === nextProps.job.id &&
           prevProps.job.title === nextProps.job.title;
  }
);
```

### Code Splitting

```jsx
// ✅ CORRECT: Lazy load routes
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/common/LoadingSpinner';

const JobList = lazy(() => import('./pages/jobs/JobList'));
const JobDetail = lazy(() => import('./pages/jobs/JobDetail'));
const CandidateList = lazy(() => import('./pages/candidates/CandidateList'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/jobs" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/candidates" element={<CandidateList />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

---

## Accessibility

### ARIA Attributes

```jsx
// ✅ CORRECT: Accessible components
<button
  onClick={handleDelete}
  aria-label="Delete job posting"
  aria-describedby="delete-description"
>
  <TrashIcon />
</button>

<input
  type="text"
  id="job-title"
  aria-label="Job title"
  aria-required="true"
  aria-invalid={errors.title ? 'true' : 'false'}
  aria-describedby={errors.title ? 'title-error' : undefined}
/>

{errors.title && (
  <span id="title-error" role="alert" className="error-message">
    {errors.title}
  </span>
)}
```

---

## Form Handling

### Controlled Components

```jsx
// ✅ CORRECT: Controlled form
function JobForm({ initialData = {}, onSubmit }) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    status: initialData.status || 'draft'
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          aria-invalid={errors.title ? 'true' : 'false'}
        />
        {errors.title && <span role="alert">{errors.title}</span>}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
```

---

**Next:** [Git Standards](./GIT_STANDARDS.md)
