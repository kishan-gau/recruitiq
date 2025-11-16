# HATEOAS Implementation Plan

**Priority:** Low  
**Effort:** 5 days  
**Impact:** Self-documenting API, easier client integration, API discoverability  
**Phase:** 3 (Advanced)

---

## Overview

Implement HATEOAS (Hypermedia as the Engine of Application State) by adding hypermedia links to API responses, making the API self-documenting and easier to navigate without hardcoded URLs in clients.

### Business Value

- **Self-Documenting:** Clients discover available actions from response
- **Client Simplification:** No need to construct URLs manually
- **API Evolution:** Add new endpoints without breaking clients
- **Developer Experience:** Easier API exploration and integration
- **Standards Compliance:** REST Level 3 maturity

---

## Current State

**Status:** Not implemented  
**Gap:** Responses contain data but no navigation links

**Current Problem:**
```javascript
// Client must hardcode all URLs
GET /api/v1/jobs/123

{
  "success": true,
  "job": {
    "id": "123",
    "title": "Senior Developer",
    "status": "open",
    "applicationCount": 45
  }
}

// Client hardcodes next actions:
// PUT /api/v1/jobs/123 - for updates
// DELETE /api/v1/jobs/123 - for deletion
// GET /api/v1/jobs/123/applications - for applications
// POST /api/v1/jobs/123/applications - to apply
// POST /api/v1/jobs/123/publish - to publish
```

**Desired with HATEOAS:**
```javascript
GET /api/v1/jobs/123

{
  "success": true,
  "job": {
    "id": "123",
    "title": "Senior Developer",
    "status": "open",
    "applicationCount": 45
  },
  "_links": {
    "self": { "href": "/api/v1/jobs/123" },
    "update": { "href": "/api/v1/jobs/123", "method": "PUT" },
    "delete": { "href": "/api/v1/jobs/123", "method": "DELETE" },
    "applications": { 
      "href": "/api/v1/jobs/123/applications",
      "title": "View applications"
    },
    "apply": { 
      "href": "/api/v1/jobs/123/applications", 
      "method": "POST",
      "title": "Apply to this job"
    },
    "publish": { 
      "href": "/api/v1/jobs/123/publish", 
      "method": "POST",
      "title": "Publish this job",
      "condition": "status === 'draft'"
    },
    "close": { 
      "href": "/api/v1/jobs/123/close", 
      "method": "POST",
      "condition": "status === 'open'"
    }
  }
}
```

---

## Technical Implementation

### 1. Create HATEOAS Link Builder

**File:** `backend/src/utils/hateoas.js`

```javascript
import logger from './logger.js';

/**
 * HATEOAS link builder utility
 * Implements HAL (Hypertext Application Language) format
 */

/**
 * Link object structure
 * @typedef {Object} Link
 * @property {string} href - URL of the link
 * @property {string} [method] - HTTP method (defaults to GET)
 * @property {string} [title] - Human-readable description
 * @property {string} [type] - Media type
 * @property {boolean} [templated] - Whether href is a URI template
 */

/**
 * Builds a link object
 * @param {string} href - URL
 * @param {Object} options - Link options
 * @returns {Object} Link object
 */
export function buildLink(href, options = {}) {
  const link = { href };

  if (options.method && options.method !== 'GET') {
    link.method = options.method;
  }

  if (options.title) {
    link.title = options.title;
  }

  if (options.type) {
    link.type = options.type;
  }

  if (options.templated) {
    link.templated = true;
  }

  if (options.condition) {
    link.condition = options.condition;
  }

  return link;
}

/**
 * Link builder class for fluent API
 */
export class LinkBuilder {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.links = {};
  }

  /**
   * Add a link
   * @param {string} rel - Relation name
   * @param {string} href - URL
   * @param {Object} options - Link options
   * @returns {LinkBuilder} this
   */
  add(rel, href, options = {}) {
    const fullHref = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
    this.links[rel] = buildLink(fullHref, options);
    return this;
  }

  /**
   * Add self link
   */
  self(href) {
    return this.add('self', href, { title: 'Self reference' });
  }

  /**
   * Add collection link
   */
  collection(href, title = 'Collection') {
    return this.add('collection', href, { title });
  }

  /**
   * Add create link
   */
  create(href, title = 'Create new resource') {
    return this.add('create', href, { method: 'POST', title });
  }

  /**
   * Add update link
   */
  update(href, title = 'Update resource') {
    return this.add('update', href, { method: 'PUT', title });
  }

  /**
   * Add patch link
   */
  patch(href, title = 'Partially update resource') {
    return this.add('patch', href, { method: 'PATCH', title });
  }

  /**
   * Add delete link
   */
  delete(href, title = 'Delete resource') {
    return this.add('delete', href, { method: 'DELETE', title });
  }

  /**
   * Add conditional link (only if condition is true)
   */
  when(condition, callback) {
    if (condition) {
      callback(this);
    }
    return this;
  }

  /**
   * Build final links object
   */
  build() {
    return this.links;
  }
}

/**
 * Creates link builder with base URL
 */
export function createLinkBuilder(baseUrl = '') {
  return new LinkBuilder(baseUrl);
}

/**
 * Pre-defined link templates for common resources
 */
export const linkTemplates = {
  /**
   * Job resource links
   */
  job: (job, baseUrl = '/api/v1') => {
    const builder = createLinkBuilder(baseUrl);

    builder
      .self(`/jobs/${job.id}`)
      .collection('/jobs', 'All jobs')
      .update(`/jobs/${job.id}`)
      .delete(`/jobs/${job.id}`)
      .add('applications', `/jobs/${job.id}/applications`, {
        title: 'Job applications'
      })
      .add('apply', `/jobs/${job.id}/applications`, {
        method: 'POST',
        title: 'Apply to this job'
      });

    // Conditional links based on job status
    if (job.status === 'draft') {
      builder.add('publish', `/jobs/${job.id}/publish`, {
        method: 'POST',
        title: 'Publish job'
      });
    }

    if (job.status === 'open') {
      builder.add('close', `/jobs/${job.id}/close`, {
        method: 'POST',
        title: 'Close job'
      });
    }

    if (job.status === 'closed') {
      builder.add('reopen', `/jobs/${job.id}/reopen`, {
        method: 'POST',
        title: 'Reopen job'
      });
    }

    // Workspace link
    if (job.workspaceId) {
      builder.add('workspace', `/workspaces/${job.workspaceId}`, {
        title: 'Parent workspace'
      });
    }

    return builder.build();
  },

  /**
   * Candidate resource links
   */
  candidate: (candidate, baseUrl = '/api/v1') => {
    const builder = createLinkBuilder(baseUrl);

    builder
      .self(`/candidates/${candidate.id}`)
      .collection('/candidates', 'All candidates')
      .update(`/candidates/${candidate.id}`)
      .delete(`/candidates/${candidate.id}`)
      .add('applications', `/candidates/${candidate.id}/applications`, {
        title: 'Candidate applications'
      })
      .add('interviews', `/candidates/${candidate.id}/interviews`, {
        title: 'Scheduled interviews'
      });

    // Resume link
    if (candidate.resumeUrl) {
      builder.add('resume', candidate.resumeUrl, {
        title: 'Resume document',
        type: 'application/pdf'
      });
    }

    // Profile links
    if (candidate.linkedinUrl) {
      builder.add('linkedin', candidate.linkedinUrl, {
        title: 'LinkedIn profile'
      });
    }

    if (candidate.githubUrl) {
      builder.add('github', candidate.githubUrl, {
        title: 'GitHub profile'
      });
    }

    return builder.build();
  },

  /**
   * Application resource links
   */
  application: (application, baseUrl = '/api/v1') => {
    const builder = createLinkBuilder(baseUrl);

    builder
      .self(`/applications/${application.id}`)
      .update(`/applications/${application.id}`)
      .add('job', `/jobs/${application.jobId}`, {
        title: 'Applied job'
      })
      .add('candidate', `/candidates/${application.candidateId}`, {
        title: 'Applicant details'
      });

    // Status-based actions
    if (application.status === 'pending') {
      builder
        .add('review', `/applications/${application.id}/review`, {
          method: 'POST',
          title: 'Mark as reviewed'
        })
        .add('reject', `/applications/${application.id}/reject`, {
          method: 'POST',
          title: 'Reject application'
        });
    }

    if (application.status === 'reviewing') {
      builder
        .add('schedule-interview', `/applications/${application.id}/interviews`, {
          method: 'POST',
          title: 'Schedule interview'
        })
        .add('advance', `/applications/${application.id}/advance`, {
          method: 'POST',
          title: 'Advance to next stage'
        })
        .add('reject', `/applications/${application.id}/reject`, {
          method: 'POST',
          title: 'Reject application'
        });
    }

    if (application.status === 'interviewing') {
      builder
        .add('interviews', `/applications/${application.id}/interviews`, {
          title: 'View interviews'
        })
        .add('offer', `/applications/${application.id}/offer`, {
          method: 'POST',
          title: 'Make offer'
        });
    }

    return builder.build();
  },

  /**
   * Pagination links
   */
  pagination: (currentPage, totalPages, baseUrl, queryParams = {}) => {
    const builder = createLinkBuilder(baseUrl);
    
    const buildUrl = (page) => {
      const params = new URLSearchParams({ ...queryParams, page });
      return `?${params.toString()}`;
    };

    builder.self(buildUrl(currentPage));

    if (currentPage > 1) {
      builder
        .add('first', buildUrl(1), { title: 'First page' })
        .add('prev', buildUrl(currentPage - 1), { title: 'Previous page' });
    }

    if (currentPage < totalPages) {
      builder
        .add('next', buildUrl(currentPage + 1), { title: 'Next page' })
        .add('last', buildUrl(totalPages), { title: 'Last page' });
    }

    return builder.build();
  }
};

/**
 * Adds links to a response object
 * @param {Object} response - Response object
 * @param {Object} links - Links object
 * @returns {Object} Response with links
 */
export function addLinks(response, links) {
  return {
    ...response,
    _links: links
  };
}

/**
 * Adds links to array of resources
 * @param {Array} resources - Array of resources
 * @param {Function} linkBuilder - Function to build links for each resource
 * @returns {Array} Resources with links
 */
export function addLinksToCollection(resources, linkBuilder) {
  return resources.map(resource => ({
    ...resource,
    _links: linkBuilder(resource)
  }));
}

export default {
  buildLink,
  createLinkBuilder,
  LinkBuilder,
  linkTemplates,
  addLinks,
  addLinksToCollection
};
```

### 2. Create HATEOAS Middleware

**File:** `backend/src/middleware/hateoas.js`

```javascript
import { linkTemplates, addLinks, addLinksToCollection } from '../utils/hateoas.js';
import logger from '../utils/logger.js';

/**
 * HATEOAS middleware
 * Automatically adds hypermedia links to responses
 */

/**
 * Determines resource type from path
 */
function getResourceType(path) {
  if (path.includes('/jobs')) return 'job';
  if (path.includes('/candidates')) return 'candidate';
  if (path.includes('/applications')) return 'application';
  if (path.includes('/interviews')) return 'interview';
  return null;
}

/**
 * HATEOAS middleware factory
 * @param {Object} config - Configuration
 * @param {string} config.baseUrl - Base URL for links
 * @param {boolean} config.enabled - Enable HATEOAS
 */
export function hateoasMiddleware(config = {}) {
  const {
    baseUrl = '/api/v1',
    enabled = true
  } = config;

  return (req, res, next) => {
    if (!enabled) {
      return next();
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to add links
    res.json = function(body) {
      if (!body || typeof body !== 'object') {
        return originalJson.call(this, body);
      }

      // Skip if already has links
      if (body._links) {
        return originalJson.call(this, body);
      }

      try {
        const resourceType = getResourceType(req.path);

        if (!resourceType || !linkTemplates[resourceType]) {
          return originalJson.call(this, body);
        }

        // Add links to single resource
        if (body.success && body[resourceType]) {
          const resource = body[resourceType];
          const links = linkTemplates[resourceType](resource, baseUrl);
          body[resourceType] = { ...resource, _links: links };
        }

        // Add links to collection
        const pluralType = `${resourceType}s`;
        if (body.success && body[pluralType]) {
          body[pluralType] = addLinksToCollection(
            body[pluralType],
            (resource) => linkTemplates[resourceType](resource, baseUrl)
          );

          // Add pagination links
          if (body.pagination) {
            body._links = linkTemplates.pagination(
              body.pagination.page,
              body.pagination.totalPages,
              req.path,
              req.query
            );
          }
        }

        return originalJson.call(this, body);
      } catch (error) {
        logger.error('HATEOAS middleware error', {
          error: error.message,
          path: req.path
        });

        // Don't break on error, just return original response
        return originalJson.call(this, body);
      }
    };

    next();
  };
}

/**
 * Manual link addition helper for controllers
 */
export function withLinks(resource, linkBuilder) {
  return {
    ...resource,
    _links: linkBuilder(resource)
  };
}

export default hateoasMiddleware;
```

### 3. Apply to Routes

**File:** `backend/src/routes/jobs.js`

```javascript
import { hateoasMiddleware } from '../middleware/hateoas.js';

// Apply HATEOAS to all job routes
router.use(hateoasMiddleware({ baseUrl: '/api/v1' }));

// Routes automatically get links
router.get('/', authenticate, jobController.listJobs);
router.get('/:id', authenticate, jobController.getJob);
router.post('/', authenticate, jobController.createJob);
router.put('/:id', authenticate, jobController.updateJob);
router.delete('/:id', authenticate, jobController.deleteJob);

// Custom action endpoints
router.post('/:id/publish', authenticate, jobController.publishJob);
router.post('/:id/close', authenticate, jobController.closeJob);
router.post('/:id/reopen', authenticate, jobController.reopenJob);
```

### 4. Update Controllers (Optional Enhancement)

**File:** `backend/src/controllers/jobController.js`

```javascript
import { linkTemplates } from '../utils/hateoas.js';

export async function getJob(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    
    const job = await JobService.getById(id, organizationId);
    
    // Middleware will add links automatically
    // But can add custom links here if needed
    return res.status(200).json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Custom action with links
 */
export async function publishJob(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user;
    
    const job = await JobService.publish(id, organizationId, userId);
    
    // Add custom links for published state
    const links = {
      ...linkTemplates.job(job),
      analytics: {
        href: `/api/v1/jobs/${job.id}/analytics`,
        title: 'View analytics'
      },
      share: {
        href: `/api/v1/jobs/${job.id}/share`,
        method: 'POST',
        title: 'Share job'
      }
    };
    
    return res.status(200).json({
      success: true,
      job: { ...job, _links: links }
    });
  } catch (error) {
    next(error);
  }
}
```

### 5. Add API Root Endpoint

**File:** `backend/src/routes/index.js`

```javascript
import { createLinkBuilder } from '../utils/hateoas.js';

/**
 * API root endpoint - entry point for HATEOAS navigation
 */
router.get('/api/v1', (req, res) => {
  const builder = createLinkBuilder('/api/v1');

  builder
    .self('')
    .add('jobs', '/jobs', { title: 'Job postings' })
    .add('candidates', '/candidates', { title: 'Candidates' })
    .add('applications', '/applications', { title: 'Applications' })
    .add('interviews', '/interviews', { title: 'Interviews' })
    .add('users', '/users', { title: 'Users' })
    .add('workspaces', '/workspaces', { title: 'Workspaces' });

  // Add authenticated user links
  if (req.user) {
    builder
      .add('profile', `/users/${req.user.id}`, { title: 'My profile' })
      .add('organization', `/organizations/${req.user.organizationId}`, {
        title: 'My organization'
      });
  }

  res.json({
    success: true,
    message: 'RecruitIQ API v1',
    _links: builder.build()
  });
});
```

---

## Testing Strategy

### 1. Unit Tests

**File:** `backend/tests/utils/hateoas.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import { 
  buildLink, 
  createLinkBuilder, 
  linkTemplates 
} from '../../src/utils/hateoas.js';

describe('HATEOAS Utilities', () => {
  describe('buildLink', () => {
    it('should build basic link', () => {
      const link = buildLink('/api/jobs/123');
      
      expect(link).toEqual({
        href: '/api/jobs/123'
      });
    });

    it('should include method for non-GET', () => {
      const link = buildLink('/api/jobs/123', { method: 'PUT' });
      
      expect(link).toEqual({
        href: '/api/jobs/123',
        method: 'PUT'
      });
    });

    it('should include title', () => {
      const link = buildLink('/api/jobs/123', { title: 'Update job' });
      
      expect(link).toEqual({
        href: '/api/jobs/123',
        title: 'Update job'
      });
    });
  });

  describe('LinkBuilder', () => {
    it('should build links fluently', () => {
      const builder = createLinkBuilder('/api/v1');
      
      const links = builder
        .self('/jobs/123')
        .update('/jobs/123')
        .delete('/jobs/123')
        .build();

      expect(links).toHaveProperty('self');
      expect(links).toHaveProperty('update');
      expect(links).toHaveProperty('delete');
      expect(links.self.href).toBe('/api/v1/jobs/123');
    });

    it('should support conditional links', () => {
      const builder = createLinkBuilder('/api/v1');
      
      const links = builder
        .self('/jobs/123')
        .when(true, (b) => b.add('action1', '/action1'))
        .when(false, (b) => b.add('action2', '/action2'))
        .build();

      expect(links).toHaveProperty('action1');
      expect(links).not.toHaveProperty('action2');
    });
  });

  describe('linkTemplates.job', () => {
    it('should generate links for draft job', () => {
      const job = {
        id: '123',
        title: 'Test Job',
        status: 'draft',
        workspaceId: 'ws-123'
      };

      const links = linkTemplates.job(job);

      expect(links).toHaveProperty('self');
      expect(links).toHaveProperty('update');
      expect(links).toHaveProperty('delete');
      expect(links).toHaveProperty('publish');
      expect(links).not.toHaveProperty('close');
    });

    it('should generate links for open job', () => {
      const job = {
        id: '123',
        title: 'Test Job',
        status: 'open',
        workspaceId: 'ws-123'
      };

      const links = linkTemplates.job(job);

      expect(links).toHaveProperty('close');
      expect(links).not.toHaveProperty('publish');
      expect(links).not.toHaveProperty('reopen');
    });

    it('should include workspace link', () => {
      const job = {
        id: '123',
        title: 'Test Job',
        status: 'open',
        workspaceId: 'ws-123'
      };

      const links = linkTemplates.job(job);

      expect(links).toHaveProperty('workspace');
      expect(links.workspace.href).toBe('/api/v1/workspaces/ws-123');
    });
  });
});
```

### 2. Integration Tests

**File:** `backend/tests/integration/hateoas.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';

describe('HATEOAS Integration', () => {
  let authToken;

  beforeAll(async () => {
    authToken = await getTestAuthToken();
  });

  it('should include links in job response', async () => {
    const response = await request(app)
      .get('/api/v1/jobs/123')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.job).toHaveProperty('_links');
    expect(response.body.job._links).toHaveProperty('self');
    expect(response.body.job._links).toHaveProperty('update');
    expect(response.body.job._links).toHaveProperty('delete');
  });

  it('should include pagination links', async () => {
    const response = await request(app)
      .get('/api/v1/jobs?page=2&limit=20')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('_links');
    expect(response.body._links).toHaveProperty('self');
    expect(response.body._links).toHaveProperty('prev');
    expect(response.body._links).toHaveProperty('first');
  });

  it('should provide API root with links', async () => {
    const response = await request(app)
      .get('/api/v1')
      .expect(200);

    expect(response.body).toHaveProperty('_links');
    expect(response.body._links).toHaveProperty('jobs');
    expect(response.body._links).toHaveProperty('candidates');
  });
});
```

---

## Client SDK Support

**File:** `packages/api-client/src/client.js`

```javascript
class APIClient {
  /**
   * Follows a HATEOAS link
   */
  async followLink(link) {
    const method = (link.method || 'GET').toLowerCase();
    
    return this[method](link.href);
  }

  /**
   * Gets available actions from resource
   */
  getActions(resource) {
    if (!resource._links) return [];
    
    return Object.entries(resource._links)
      .filter(([rel, link]) => link.method && link.method !== 'GET')
      .map(([rel, link]) => ({
        name: rel,
        title: link.title,
        method: link.method,
        href: link.href
      }));
  }
}

// Usage
const { job } = await client.get('/jobs/123');

// Get available actions
const actions = client.getActions(job);
// [
//   { name: 'update', title: 'Update job', method: 'PUT', href: '/jobs/123' },
//   { name: 'delete', title: 'Delete job', method: 'DELETE', href: '/jobs/123' },
//   { name: 'publish', title: 'Publish job', method: 'POST', href: '/jobs/123/publish' }
// ]

// Follow a link
const applications = await client.followLink(job._links.applications);
```

---

## Frontend Integration

**File:** `apps/portal/src/components/ResourceActions.jsx`

```jsx
import React from 'react';
import { Button } from '@recruitiq/ui';

/**
 * Dynamic action buttons from HATEOAS links
 */
function ResourceActions({ resource, onAction }) {
  if (!resource._links) return null;

  const actions = Object.entries(resource._links)
    .filter(([rel, link]) => 
      link.method && 
      link.method !== 'GET' && 
      rel !== 'self'
    )
    .map(([rel, link]) => ({
      id: rel,
      label: link.title || rel,
      method: link.method,
      href: link.href
    }));

  if (actions.length === 0) return null;

  return (
    <div className="flex gap-2">
      {actions.map(action => (
        <Button
          key={action.id}
          onClick={() => onAction(action)}
          variant={action.method === 'DELETE' ? 'danger' : 'primary'}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

// Usage
function JobDetails({ job }) {
  const handleAction = async (action) => {
    const confirmed = action.method === 'DELETE' 
      ? confirm(`Are you sure?`)
      : true;

    if (!confirmed) return;

    await apiClient[action.method.toLowerCase()](action.href);
    // Reload job
  };

  return (
    <div>
      <h1>{job.title}</h1>
      <ResourceActions resource={job} onAction={handleAction} />
    </div>
  );
}
```

---

## Rollout Plan

### Day 1-2: Core Infrastructure
- [x] Create HATEOAS utilities
- [x] Create link builder
- [x] Define link templates
- [x] Write unit tests

### Day 3-4: Middleware & Integration
- [ ] Create HATEOAS middleware
- [ ] Apply to job endpoints
- [ ] Apply to candidate endpoints
- [ ] Add API root endpoint
- [ ] Test in staging

### Day 5: Client & Documentation
- [ ] Update client SDK
- [ ] Add frontend components
- [ ] Update API documentation
- [ ] Deploy to production

---

## Success Criteria

- ✅ All resources include `_links` in responses
- ✅ Links are conditional based on resource state
- ✅ Pagination links work correctly
- ✅ API root provides navigation entry point
- ✅ Client SDK can follow links
- ✅ Frontend uses dynamic actions from links

---

## Documentation

Add to `docs/API_STANDARDS.md`:

````markdown
## HATEOAS (Hypermedia)

API responses include hypermedia links for navigation and available actions.

### Link Format (HAL)

```json
{
  "success": true,
  "job": {
    "id": "123",
    "title": "Senior Developer",
    "_links": {
      "self": { "href": "/api/v1/jobs/123" },
      "update": { 
        "href": "/api/v1/jobs/123", 
        "method": "PUT",
        "title": "Update job"
      },
      "delete": { 
        "href": "/api/v1/jobs/123", 
        "method": "DELETE",
        "title": "Delete job"
      }
    }
  }
}
```

### API Root

Start navigation from API root:

```http
GET /api/v1

{
  "success": true,
  "_links": {
    "self": { "href": "/api/v1" },
    "jobs": { "href": "/api/v1/jobs" },
    "candidates": { "href": "/api/v1/candidates" }
  }
}
```

### Following Links

Clients should follow links instead of constructing URLs:

```javascript
// ❌ Don't construct URLs
const url = `/api/v1/jobs/${jobId}/applications`;

// ✅ Follow links
const applications = await client.followLink(job._links.applications);
```
````

---

## References

- [HAL - Hypertext Application Language](http://stateless.co/hal_specification.html)
- [Richardson Maturity Model](https://martinfowler.com/articles/richardsonMaturityModel.html)
- [REST API Design - Level 3](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)
