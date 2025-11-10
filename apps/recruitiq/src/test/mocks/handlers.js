import { http, HttpResponse } from 'msw'

const API_URL = 'http://localhost:4000'

/**
 * MSW Request Handlers
 * 
 * These handlers intercept HTTP requests during tests and return mock responses.
 * This allows tests to run without a real backend server.
 */

export const handlers = [
  // ==================== AUTH ENDPOINTS ====================
  
  http.post(`${API_URL}/api/auth/login`, async ({ request }) => {
    const body = await request.json()
    const { email, password } = body
    
    if (email === 'test@recruitiq.com' && password === 'TestPassword123!') {
      return HttpResponse.json({
        success: true,
        accessToken: 'mock-jwt-token-12345',
        refreshToken: 'mock-refresh-token-67890',
        user: {
          id: 'test-user-id',
          email: 'test@recruitiq.com',
          name: 'Test User',
          role: 'admin',
          organizationId: 'test-org-id'
        }
      })
    }
    
    return HttpResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  http.post(`${API_URL}/api/auth/refresh`, () => {
    return HttpResponse.json({
      success: true,
      accessToken: 'mock-refreshed-token'
    })
  }),

  http.post(`${API_URL}/api/auth/logout`, () => {
    return HttpResponse.json({ success: true })
  }),

  http.get(`${API_URL}/api/auth/me`, () => {
    return HttpResponse.json({
      success: true,
      user: {
        id: 'test-user-id',
        email: 'test@recruitiq.com',
        name: 'Test User',
        role: 'admin',
        organizationId: 'test-org-id'
      }
    })
  }),

  // ==================== ORGANIZATION ENDPOINTS ====================

  http.get(`${API_URL}/api/organization`, () => {
    return HttpResponse.json({
      success: true,
      organization: {
        id: 'test-org-id',
        name: 'Test Organization',
        tier: 'professional',
        isActive: true,
        maxWorkspaces: 10,
        maxUsers: 50,
        license: {
          features: ['advanced-analytics', 'custom-branding', 'api-access']
        }
      }
    })
  }),

  http.get(`${API_URL}/api/organization/stats`, () => {
    return HttpResponse.json({
      success: true,
      workspaceCount: 3,
      userCount: 15
    })
  }),

  // ==================== WORKSPACE ENDPOINTS ====================

  http.get(`${API_URL}/api/workspaces`, () => {
    return HttpResponse.json({
      success: true,
      workspaces: [
        {
          id: 'test-workspace-id',
          name: 'Test Workspace',
          organizationId: 'test-org-id',
          isActive: true
        },
        {
          id: 'workspace-2',
          name: 'Engineering Team',
          organizationId: 'test-org-id',
          isActive: true
        }
      ]
    })
  }),

  // ==================== JOBS ENDPOINTS ====================
  
  http.get(`${API_URL}/api/jobs`, ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    
    // Mock jobs data
    let jobs = [
      {
        id: 'job-1',
        title: 'Senior QA Engineer',
        department: 'Engineering',
        location: 'San Francisco',
        employmentType: 'full-time',
        description: 'Looking for an experienced QA engineer',
        requirements: ['5+ years experience', 'Test automation'],
        status: 'published',
        flowTemplateId: 'template-1',
        createdAt: new Date('2024-11-01').toISOString(),
        updatedAt: new Date('2024-11-05').toISOString()
      },
      {
        id: 'job-2',
        title: 'Frontend Developer',
        department: 'Engineering',
        location: 'Remote',
        employmentType: 'full-time',
        description: 'React developer needed',
        requirements: ['React', 'TypeScript', '3+ years'],
        status: 'draft',
        flowTemplateId: 'template-1',
        createdAt: new Date('2024-11-02').toISOString(),
        updatedAt: new Date('2024-11-04').toISOString()
      }
    ]
    
    // Apply filters
    if (status) {
      jobs = jobs.filter(job => job.status === status)
    }
    if (search) {
      jobs = jobs.filter(job => 
        job.title.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    // Apply pagination
    const total = jobs.length
    const start = (page - 1) * limit
    const end = start + limit
    const paginatedJobs = jobs.slice(start, end)
    
    return HttpResponse.json({
      success: true,
      jobs: paginatedJobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  }),

  http.get(`${API_URL}/api/jobs/:id`, ({ params }) => {
    const { id } = params
    
    const job = {
      id,
      title: 'Senior QA Engineer',
      department: 'Engineering',
      location: 'San Francisco',
      employmentType: 'full-time',
      description: 'Looking for an experienced QA engineer to join our team',
      requirements: ['5+ years of QA experience', 'Test automation frameworks', 'CI/CD pipelines'],
      status: 'published',
      flowTemplateId: 'template-1',
      experienceLevel: 'senior',
      salary: '$120,000 - $160,000',
      openings: 2,
      createdAt: new Date('2024-11-01').toISOString(),
      updatedAt: new Date('2024-11-05').toISOString()
    }
    
    return HttpResponse.json({
      success: true,
      job
    })
  }),

  http.post(`${API_URL}/api/jobs`, async ({ request }) => {
    const body = await request.json()
    
    // Simulate validation
    if (!body.title || body.title.length < 2) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Job title must be at least 2 characters',
          errorCode: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }
    
    const newJob = {
      id: `job-${Date.now()}`,
      ...body,
      status: body.status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    return HttpResponse.json({
      success: true,
      job: newJob
    }, { status: 201 })
  }),

  http.put(`${API_URL}/api/jobs/:id`, async ({ params, request }) => {
    const { id } = params
    const body = await request.json()
    
    const updatedJob = {
      id,
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    return HttpResponse.json({
      success: true,
      job: updatedJob
    })
  }),

  http.delete(`${API_URL}/api/jobs/:id`, ({ params }) => {
    const { id } = params
    
    return HttpResponse.json({
      success: true,
      message: `Job ${id} deleted`
    })
  }),

  // ==================== CANDIDATES ENDPOINTS ====================
  
  http.get(`${API_URL}/api/candidates`, ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    
    const candidates = [
      {
        id: 'candidate-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-0100',
        stage: 'Interview',
        jobId: 'job-1',
        appliedDate: new Date('2024-11-01').toISOString(),
        resume: 'https://example.com/resume1.pdf'
      },
      {
        id: 'candidate-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-0101',
        stage: 'Phone Screen',
        jobId: 'job-1',
        appliedDate: new Date('2024-11-02').toISOString(),
        resume: 'https://example.com/resume2.pdf'
      }
    ]
    
    const total = candidates.length
    const start = (page - 1) * limit
    const end = start + limit
    const paginatedCandidates = candidates.slice(start, end)
    
    return HttpResponse.json({
      success: true,
      candidates: paginatedCandidates,
      total,
      page,
      limit
    })
  }),

  http.get(`${API_URL}/api/candidates/:id`, ({ params }) => {
    const { id } = params
    
    const candidate = {
      id,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-0100',
      stage: 'Interview',
      jobId: 'job-1',
      appliedDate: new Date('2024-11-01').toISOString(),
      resume: 'https://example.com/resume1.pdf',
      notes: 'Strong technical background'
    }
    
    return HttpResponse.json({
      success: true,
      candidate
    })
  }),

  // ==================== FLOW TEMPLATES ENDPOINTS ====================
  
  http.get(`${API_URL}/api/flow-templates`, () => {
    const templates = [
      {
        id: 'template-1',
        name: 'Standard Interview Process',
        description: 'Standard 5-stage interview process for technical roles',
        stages: [
          { id: 'stage-1', name: 'Applied', order: 0, required: true, color: '#3B82F6' },
          { id: 'stage-2', name: 'Phone Screen', order: 1, required: false, color: '#8B5CF6' },
          { id: 'stage-3', name: 'Technical Interview', order: 2, required: true, color: '#EC4899' },
          { id: 'stage-4', name: 'Final Interview', order: 3, required: true, color: '#F59E0B' },
          { id: 'stage-5', name: 'Offer', order: 4, required: false, color: '#10B981' }
        ],
        isDefault: true,
        createdAt: new Date('2024-10-01').toISOString()
      },
      {
        id: 'template-2',
        name: 'Quick Hire Process',
        description: 'Streamlined 3-stage process for urgent hires',
        stages: [
          { id: 'stage-1', name: 'Applied', order: 0, required: true, color: '#3B82F6' },
          { id: 'stage-2', name: 'Interview', order: 1, required: true, color: '#EC4899' },
          { id: 'stage-3', name: 'Offer', order: 2, required: false, color: '#10B981' }
        ],
        isDefault: false,
        createdAt: new Date('2024-10-15').toISOString()
      }
    ]
    
    return HttpResponse.json({
      success: true,
      flowTemplates: templates
    })
  }),

  http.get(`${API_URL}/api/flow-templates/:id`, ({ params }) => {
    const { id } = params
    
    const template = {
      id,
      name: 'Standard Interview Process',
      description: 'Standard 5-stage interview process',
      stages: [
        { id: 'stage-1', name: 'Applied', order: 0, required: true, color: '#3B82F6' },
        { id: 'stage-2', name: 'Phone Screen', order: 1, required: false, color: '#8B5CF6' },
        { id: 'stage-3', name: 'Technical Interview', order: 2, required: true, color: '#EC4899' },
        { id: 'stage-4', name: 'Final Interview', order: 3, required: true, color: '#F59E0B' },
        { id: 'stage-5', name: 'Offer', order: 4, required: false, color: '#10B981' }
      ],
      isDefault: true
    }
    
    return HttpResponse.json({
      success: true,
      template
    })
  }),

  http.post(`${API_URL}/api/flow-templates`, async ({ request }) => {
    const body = await request.json()
    
    const newTemplate = {
      id: `template-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString()
    }
    
    return HttpResponse.json({
      success: true,
      template: newTemplate
    }, { status: 201 })
  }),

  // ==================== WORKSPACES ENDPOINTS ====================
  
  http.get(`${API_URL}/api/workspaces`, () => {
    const workspaces = [
      {
        id: 'workspace-1',
        name: 'Engineering Team',
        organizationId: 'test-org-id',
        createdAt: new Date('2024-01-01').toISOString()
      },
      {
        id: 'workspace-2',
        name: 'Product Team',
        organizationId: 'test-org-id',
        createdAt: new Date('2024-01-15').toISOString()
      }
    ]
    
    return HttpResponse.json({
      success: true,
      workspaces
    })
  }),

  // ==================== APPLICATIONS ENDPOINTS ====================
  
  http.get(`${API_URL}/api/applications`, ({ request }) => {
    const url = new URL(request.url)
    const jobId = url.searchParams.get('jobId')
    
    let applications = [
      {
        id: 'app-1',
        jobId: 'job-1',
        candidateId: 'candidate-1',
        status: 'under_review',
        appliedDate: new Date('2024-11-01').toISOString()
      },
      {
        id: 'app-2',
        jobId: 'job-1',
        candidateId: 'candidate-2',
        status: 'interview_scheduled',
        appliedDate: new Date('2024-11-02').toISOString()
      }
    ]
    
    if (jobId) {
      applications = applications.filter(app => app.jobId === jobId)
    }
    
    return HttpResponse.json({
      success: true,
      applications,
      total: applications.length
    })
  }),

  // ==================== HEALTH CHECK ====================
  
  http.get(`${API_URL}/health`, () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    })
  })
]
