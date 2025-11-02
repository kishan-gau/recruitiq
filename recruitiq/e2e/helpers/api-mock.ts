import { Page, Route } from '@playwright/test';

/**
 * API Mocking Helper
 * Provides utilities for mocking API responses in tests
 */

export interface MockJob {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  status: 'draft' | 'published' | 'closed';
  flowTemplateId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MockFlowTemplate {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
    order: number;
    color?: string;
  }>;
  workspaceId: string;
}

/**
 * Mock flow templates data
 */
export const MOCK_FLOW_TEMPLATES: MockFlowTemplate[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174100',
    name: 'Standard Interview Process',
    workspaceId: '123e4567-e89b-12d3-a456-426614174002',
    stages: [
      { id: '1', name: 'Application Review', order: 1, color: '#3B82F6' },
      { id: '2', name: 'Phone Screen', order: 2, color: '#8B5CF6' },
      { id: '3', name: 'Technical Interview', order: 3, color: '#EC4899' },
      { id: '4', name: 'Final Interview', order: 4, color: '#F59E0B' },
      { id: '5', name: 'Offer', order: 5, color: '#10B981' }
    ]
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174101',
    name: 'Quick Hire Process',
    workspaceId: '123e4567-e89b-12d3-a456-426614174002',
    stages: [
      { id: '1', name: 'Screen', order: 1, color: '#3B82F6' },
      { id: '2', name: 'Interview', order: 2, color: '#EC4899' },
      { id: '3', name: 'Offer', order: 3, color: '#10B981' }
    ]
  }
];

/**
 * Mock jobs data
 */
export const MOCK_JOBS: MockJob[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174200',
    title: 'Senior Software Engineer',
    department: 'Engineering',
    location: 'San Francisco',
    employmentType: 'full-time',
    status: 'published',
    flowTemplateId: MOCK_FLOW_TEMPLATES[0].id,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * Setup API mocks for authentication
 */
export async function mockAuthAPI(page: Page) {
  await page.route('**/api/auth/**', async (route: Route) => {
    const url = route.request().url();
    
    if (url.includes('/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-jwt-token',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'test@recruitiq.com',
            name: 'Test User',
            role: 'admin'
          }
        })
      });
    } else if (url.includes('/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@recruitiq.com',
          name: 'Test User',
          role: 'admin'
        })
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Setup API mocks for flow templates
 */
export async function mockFlowTemplateAPI(page: Page, templates: MockFlowTemplate[] = MOCK_FLOW_TEMPLATES) {
  await page.route('**/api/flow-templates**', async (route: Route) => {
    const method = route.request().method();
    const url = route.request().url();
    
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ flowTemplates: templates })
      });
    } else if (method === 'POST') {
      const postData = route.request().postDataJSON();
      const newTemplate: MockFlowTemplate = {
        id: `new-${Date.now()}`,
        name: postData.name,
        stages: postData.stages,
        workspaceId: '123e4567-e89b-12d3-a456-426614174002'
      };
      
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ flowTemplate: newTemplate })
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Setup API mocks for jobs
 */
export async function mockJobsAPI(page: Page, jobs: MockJob[] = MOCK_JOBS) {
  let jobsList = [...jobs];
  
  await page.route('**/api/jobs**', async (route: Route) => {
    const method = route.request().method();
    const url = route.request().url();
    
    if (method === 'GET' && !url.match(/\/jobs\/[a-f0-9-]+$/)) {
      // List jobs
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobs: jobsList })
      });
    } else if (method === 'GET' && url.match(/\/jobs\/[a-f0-9-]+$/)) {
      // Get single job
      const jobId = url.split('/').pop();
      const job = jobsList.find(j => j.id === jobId);
      
      if (job) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            job: {
              ...job,
              description: 'Test job description',
              requirements: 'Test job requirements',
              benefits: 'Test benefits',
              salaryMin: 100000,
              salaryMax: 150000,
              salaryCurrency: 'USD'
            }
          })
        });
      } else {
        await route.fulfill({ status: 404 });
      }
    } else if (method === 'POST') {
      const postData = route.request().postDataJSON();
      const newJob: MockJob = {
        id: `new-${Date.now()}`,
        title: postData.title,
        department: postData.department,
        location: postData.location,
        employmentType: postData.employmentType || 'full-time',
        status: postData.status || 'draft',
        flowTemplateId: postData.flowTemplateId,
        isPublic: postData.isPublic || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      jobsList.push(newJob);
      
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ job: newJob })
      });
    } else if (method === 'PUT' || method === 'PATCH') {
      const jobId = url.split('/').pop()?.replace('?', '');
      const jobIndex = jobsList.findIndex(j => j.id === jobId);
      
      if (jobIndex !== -1) {
        const updateData = route.request().postDataJSON();
        jobsList[jobIndex] = {
          ...jobsList[jobIndex],
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ job: jobsList[jobIndex] })
        });
      } else {
        await route.fulfill({ status: 404 });
      }
    } else if (method === 'DELETE') {
      const jobId = url.split('/').pop();
      jobsList = jobsList.filter(j => j.id !== jobId);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Job deleted successfully' })
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock workspace data
 */
export const MOCK_WORKSPACES = [
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Test Workspace',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    users: []
  }
];

/**
 * Setup API mocks for workspaces
 */
export async function mockWorkspaceAPI(page: Page) {
  await page.route('**/api/workspaces**', async (route: Route) => {
    const method = route.request().method();
    
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ workspaces: MOCK_WORKSPACES })
      });
    } else if (method === 'POST') {
      const postData = route.request().postDataJSON();
      const newWorkspace = {
        id: `new-${Date.now()}`,
        name: postData.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        users: []
      };
      
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ workspace: newWorkspace })
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Setup API mocks for organizations
 */
export async function mockOrganizationAPI(page: Page) {
  // Mock main organization endpoint
  await page.route('**/api/organizations', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        organization: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Test Organization',
          plan: 'professional',
          maxWorkspaces: 10,
          maxUsers: 50
        }
      })
    });
  });
  
  // Mock organization stats endpoint
  await page.route('**/api/organizations/stats', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workspaceCount: 1,
        userCount: 1,
        jobCount: 1,
        candidateCount: 0
      })
    });
  });
}

/**
 * Setup API mocks for candidates
 */
export async function mockCandidatesAPI(page: Page) {
  await page.route('**/api/candidates**', async (route: Route) => {
    const method = route.request().method();
    
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          candidates: [],
          total: 0
        })
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Setup all API mocks
 */
export async function mockAllAPIs(page: Page) {
  await mockAuthAPI(page);
  await mockWorkspaceAPI(page);
  await mockOrganizationAPI(page);
  await mockFlowTemplateAPI(page);
  await mockJobsAPI(page);
  await mockCandidatesAPI(page);
}

/**
 * Mock API error responses
 */
export async function mockAPIError(page: Page, endpoint: string, status: number = 500) {
  await page.route(`**${endpoint}**`, async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: 'Something went wrong'
      })
    });
  });
}

/**
 * Clear all route mocks
 */
export async function clearAPIMocks(page: Page) {
  await page.unroute('**/api/**');
}
