# RecruitIQ Migration Roadmap
**Date:** October 24, 2025  
**Version:** 1.0  
**Purpose:** Step-by-step guide to migrate from localStorage to production-ready architecture

---

## Migration Overview

This document outlines a **phased migration strategy** that:
- ✅ Minimizes disruption to current development
- ✅ Allows parallel operation during transition
- ✅ Provides rollback points at each phase
- ✅ Maintains backward compatibility
- ✅ Enables incremental testing

**Total Timeline:** 6-9 months  
**Team Size:** 2-3 developers

---

## Phase 1: Foundation (Weeks 1-4)

### Goal
Set up backend infrastructure without changing frontend

### Tasks

#### 1.1 Backend Setup
```bash
# Create backend directory
mkdir -p backend
cd backend
npm init -y

# Install dependencies
npm install express pg redis jsonwebtoken bcryptjs cors helmet
npm install --save-dev nodemon jest supertest

# Project structure
backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── services/
│   └── utils/
├── tests/
├── migrations/
└── package.json
```

#### 1.2 Database Setup
```sql
-- Create database
CREATE DATABASE recruitiq_dev;

-- Run migrations
-- migrations/001_initial_schema.sql
-- (Use schema from ARCHITECTURE_MULTI_TENANT.md)
```

#### 1.3 Environment Configuration
```javascript
// backend/src/config/index.js
module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'recruitiq_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
    expiresIn: '7d',
  }
};
```

#### 1.4 Basic API Routes (Stub)
```javascript
// backend/src/routes/index.js
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/api/organizations/:id', (req, res) => {
  // TODO: Implement
  res.json({ id: req.params.id, name: 'Test Org' });
});

module.exports = router;
```

### Deliverables
- ✅ Backend server running on port 4000
- ✅ PostgreSQL database created
- ✅ Redis instance running
- ✅ Basic health check endpoint
- ✅ Environment variables configured

### Testing
```bash
# Start backend
cd backend
npm run dev

# Test health endpoint
curl http://localhost:4000/health
```

---

## Phase 2: Authentication Migration (Weeks 5-8)

### Goal
Move user authentication from localStorage to JWT + database

### Tasks

#### 2.1 User Model & Repository
```javascript
// backend/src/models/User.js
class User {
  constructor(db) {
    this.db = db;
  }
  
  async create({ organizationId, email, name, password, role }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await this.db.query(`
      INSERT INTO users (id, organization_id, email, name, password_hash, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [generateId('user'), organizationId, email, name, hashedPassword, role]);
    
    return result.rows[0];
  }
  
  async findByEmail(email) {
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }
  
  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }
}
```

#### 2.2 Auth Controller
```javascript
// backend/src/controllers/authController.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValid = await userModel.verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        organizationId: user.organization_id,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};
```

#### 2.3 Frontend API Client
```javascript
// src/services/api.js
const API_BASE = process.env.VITE_API_URL || 'http://localhost:4000';

class APIClient {
  constructor() {
    this.token = localStorage.getItem('recruitiq_token');
  }
  
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('recruitiq_token', token);
    } else {
      localStorage.removeItem('recruitiq_token');
    }
  }
  
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return response.json();
  }
  
  // Auth methods
  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setToken(data.token);
    return data.user;
  }
  
  async logout() {
    this.setToken(null);
  }
}

export default new APIClient();
```

#### 2.4 Update AuthContext
```javascript
// src/context/AuthContext.jsx (updated)
import api from '../services/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verify token is still valid
        const userData = await api.request('/api/auth/me');
        setUser(userData);
      } catch (error) {
        // Token invalid or expired
        api.setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (api.token) {
      checkAuth();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const userData = await api.login(email, password);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  // ... rest of context
};
```

### Deliverables
- ✅ JWT-based authentication
- ✅ User registration/login APIs
- ✅ Frontend API client
- ✅ Token storage and refresh
- ✅ AuthContext using API

### Testing
```bash
# Test login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Should return JWT token
```

---

## Phase 3: Organization & Workspace Migration (Weeks 9-12)

### Goal
Add organization layer and migrate workspace data

### Tasks

#### 3.1 Create OrganizationContext
(See ARCHITECTURE_MULTI_TENANT.md for full implementation)

#### 3.2 Data Migration Script
```javascript
// scripts/migrate-local-to-db.js
const { Pool } = require('pg');
const pool = new Pool(/* config */);

async function migrateLocalStorageData() {
  // 1. Read localStorage backup (exported from browser)
  const localData = JSON.parse(fs.readFileSync('./localStorage-export.json'));
  
  // 2. Create organization
  const orgResult = await pool.query(`
    INSERT INTO organizations (id, name, type, license, usage, settings)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    'org_migrated_001',
    'Migrated Organization',
    'cloud-shared',
    defaultLicense,
    defaultUsage,
    defaultSettings
  ]);
  
  const organizationId = orgResult.rows[0].id;
  
  // 3. Migrate workspaces
  const workspaces = parseWorkspaces(localData);
  for (const workspace of workspaces) {
    await pool.query(`
      INSERT INTO workspaces (id, organization_id, name, color, settings)
      VALUES ($1, $2, $3, $4, $5)
    `, [workspace.id, organizationId, workspace.name, workspace.color, {}]);
    
    // 4. Migrate jobs for this workspace
    const jobs = parseJobs(localData, workspace.id);
    for (const job of jobs) {
      await pool.query(`
        INSERT INTO jobs (workspace_id, title, location, type, openings, description, department)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [workspace.id, job.title, job.location, job.type, job.openings, job.description, job.department]);
    }
    
    // 5. Migrate candidates
    const candidates = parseCandidates(localData, workspace.id);
    for (const candidate of candidates) {
      await pool.query(`
        INSERT INTO candidates (workspace_id, name, email, phone, job_id, stage, tracking_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [/* candidate data */]);
    }
  }
  
  console.log('Migration completed successfully');
}
```

#### 3.3 Dual-Write Period
```javascript
// src/context/DataContext.jsx (temporary dual-write)
async function addJob(job) {
  // Write to API
  const created = await api.request('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(job)
  });
  
  // Also write to localStorage (during transition)
  const localData = JSON.parse(localStorage.getItem(getStorageKey('data')) || '{}');
  localData.jobs = [created, ...(localData.jobs || [])];
  localStorage.setItem(getStorageKey('data'), JSON.stringify(localData));
  
  setState(s => ({ ...s, jobs: [created, ...s.jobs] }));
  return created;
}
```

### Deliverables
- ✅ OrganizationContext implemented
- ✅ Workspace APIs working
- ✅ Data migration script
- ✅ Dual-write mode active

---

## Phase 4: Data Layer Migration (Weeks 13-16)

### Goal
Migrate all CRUD operations to API

### Tasks

#### 4.1 Jobs API
```javascript
// backend/src/controllers/jobController.js
exports.list = async (req, res) => {
  const { workspaceId } = req.query;
  
  const result = await db.query(`
    SELECT * FROM jobs 
    WHERE workspace_id = $1 
    AND archived_at IS NULL
    ORDER BY created_at DESC
  `, [workspaceId]);
  
  res.json(result.rows);
};

exports.create = async (req, res) => {
  const job = await jobModel.create({
    workspaceId: req.body.workspaceId,
    ...req.body
  });
  
  // Track usage
  await trackUsage(req.organizationId, 'job_created');
  
  res.status(201).json(job);
};
```

#### 4.2 Candidates API
```javascript
// Similar pattern for candidates
exports.list = async (req, res) => { /* ... */ };
exports.create = async (req, res) => { /* ... */ };
exports.update = async (req, res) => { /* ... */ };
exports.delete = async (req, res) => { /* ... */ };
```

#### 4.3 Update DataContext
```javascript
// src/context/DataContext.jsx (API-only mode)
export function DataProvider({ children }) {
  const { currentWorkspaceId } = useWorkspace();
  const [state, setState] = useState({ jobs: [], candidates: [] });
  const [loading, setLoading] = useState(true);

  // Load data from API
  useEffect(() => {
    if (!currentWorkspaceId) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const [jobs, candidates] = await Promise.all([
          api.request(`/api/jobs?workspaceId=${currentWorkspaceId}`),
          api.request(`/api/candidates?workspaceId=${currentWorkspaceId}`)
        ]);
        
        setState({ jobs, candidates });
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentWorkspaceId]);

  async function addJob(job) {
    const created = await api.request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ ...job, workspaceId: currentWorkspaceId })
    });
    
    setState(s => ({ ...s, jobs: [created, ...s.jobs] }));
    return created;
  }

  // ... similar for other operations
}
```

### Deliverables
- ✅ All CRUD operations through API
- ✅ localStorage removed (except caching)
- ✅ Loading states handled
- ✅ Error handling implemented

---

## Phase 5: Advanced Features (Weeks 17-20)

### Goal
Add caching, real-time updates, and optimizations

### Tasks

#### 5.1 React Query Integration
```bash
npm install @tanstack/react-query
```

```javascript
// src/App.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... */}
    </QueryClientProvider>
  );
}
```

#### 5.2 Optimistic Updates
```javascript
// src/hooks/useJobs.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useJobs(workspaceId) {
  const queryClient = useQueryClient();
  
  const { data: jobs, isLoading } = useQuery(
    ['jobs', workspaceId],
    () => api.request(`/api/jobs?workspaceId=${workspaceId}`)
  );
  
  const createJob = useMutation(
    (newJob) => api.request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(newJob)
    }),
    {
      // Optimistic update
      onMutate: async (newJob) => {
        await queryClient.cancelQueries(['jobs', workspaceId]);
        
        const previousJobs = queryClient.getQueryData(['jobs', workspaceId]);
        
        queryClient.setQueryData(['jobs', workspaceId], old => [
          { ...newJob, id: 'temp-' + Date.now() },
          ...old
        ]);
        
        return { previousJobs };
      },
      
      // Rollback on error
      onError: (err, newJob, context) => {
        queryClient.setQueryData(
          ['jobs', workspaceId],
          context.previousJobs
        );
      },
      
      // Refetch on success
      onSuccess: () => {
        queryClient.invalidateQueries(['jobs', workspaceId]);
      }
    }
  );
  
  return { jobs, isLoading, createJob };
}
```

#### 5.3 WebSocket for Real-Time Updates
```javascript
// backend/src/websocket.js
const WebSocket = require('ws');

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws, req) => {
    const token = req.url.split('token=')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    ws.organizationId = decoded.organizationId;
    ws.userId = decoded.userId;
    
    ws.on('message', (message) => {
      // Handle client messages
    });
  });
  
  // Broadcast to organization
  function broadcastToOrg(organizationId, event, data) {
    wss.clients.forEach(client => {
      if (client.organizationId === organizationId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event, data }));
      }
    });
  }
  
  return { broadcastToOrg };
}
```

### Deliverables
- ✅ React Query integrated
- ✅ Optimistic updates working
- ✅ WebSocket server setup
- ✅ Real-time notifications

---

## Phase 6: Production Readiness (Weeks 21-24)

### Goal
Security, monitoring, and deployment

### Tasks

#### 6.1 Security Hardening
- ✅ Rate limiting (express-rate-limit)
- ✅ Helmet.js for HTTP headers
- ✅ Input validation (joi/yup)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (Content Security Policy)
- ✅ CORS configuration

#### 6.2 Monitoring & Logging
```javascript
// backend/src/middleware/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log all requests
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    organizationId: req.organizationId,
    userId: req.userId,
    timestamp: new Date().toISOString()
  });
  next();
});
```

#### 6.3 Error Tracking (Sentry)
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

#### 6.4 Health Checks
```javascript
// /health endpoint
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok',
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      disk: await checkDiskSpace()
    }
  };
  
  const status = Object.values(health.checks).every(c => c.ok) ? 200 : 503;
  res.status(status).json(health);
});
```

### Deliverables
- ✅ Security best practices applied
- ✅ Logging configured
- ✅ Error tracking setup
- ✅ Health checks implemented
- ✅ Performance monitoring

---

## Rollback Plan

Each phase has a rollback strategy:

**Phase 1-2:** No rollback needed (backend runs independently)

**Phase 3-4:** 
```javascript
// Feature flag to switch between localStorage and API
const USE_API = process.env.VITE_USE_API === 'true';

function DataProvider({ children }) {
  if (USE_API) {
    return <APIDataProvider>{children}</APIDataProvider>;
  } else {
    return <LocalStorageDataProvider>{children}</LocalStorageDataProvider>;
  }
}
```

**Phase 5-6:** Database backups before each deployment

---

## Testing Strategy (Each Phase)

### Phase-by-Phase Testing Requirements

**Phase 1: Backend Foundation**
- ✅ Unit tests for all models, services, middleware
- ✅ Integration tests for database connections
- ✅ Health check endpoint test
- ✅ API documentation (Swagger/OpenAPI)
- **Coverage Target:** 80%+

**Phase 2: Authentication**
- ✅ Unit tests: Password hashing, JWT generation, token validation
- ✅ Integration tests: Login, register, refresh token, logout flows
- ✅ Security tests: SQL injection, rate limiting, password strength
- ✅ E2E tests: Complete auth flow in browser
- **Coverage Target:** 90%+ (critical security code)

**Phase 3: Data Layer Migration**
- ✅ Unit tests: Repository methods, data transformations
- ✅ Integration tests: CRUD operations with multi-tenant isolation
- ✅ Migration tests: Dual-write verification, data consistency
- ✅ Regression tests: Ensure existing features still work
- **Coverage Target:** 85%+

**Phase 4: Organization Layer**
- ✅ Unit tests: License validation, tier limits, organization logic
- ✅ Integration tests: Multi-org scenarios, data segregation
- ✅ E2E tests: Organization signup, user invitations
- **Coverage Target:** 85%+

**Phase 5: Advanced Features**
- ✅ Unit tests: Real-time events, file uploads, background jobs
- ✅ Integration tests: WebSocket connections, file storage
- ✅ Performance tests: Load testing, stress testing
- **Coverage Target:** 80%+

**Phase 6: Production Readiness**
- ✅ Security testing: SAST, DAST, penetration test
- ✅ Performance testing: Load tests, endurance tests
- ✅ Accessibility testing: WCAG 2.1 AA compliance
- ✅ Browser compatibility: Cross-browser, mobile
- ✅ Chaos engineering: Failure injection tests
- **Coverage Target:** 80%+ (full system)

### Comprehensive Test Suite

**Unit Tests (70% of tests)**
```javascript
// tests/unit/models/job.test.js
describe('Job Model', () => {
  describe('validation', () => {
    it('should validate required fields', () => {
      const job = new Job({ title: '', workspaceId: 'ws_1' });
      expect(job.validate()).toHaveProperty('errors.title');
    });
    
    it('should validate salary range', () => {
      const job = new Job({ 
        title: 'Engineer',
        salaryMin: 100000,
        salaryMax: 80000
      });
      expect(job.validate()).toHaveProperty('errors.salary');
    });
  });
  
  describe('business logic', () => {
    it('should calculate days open', () => {
      const job = new Job({ 
        createdAt: new Date('2025-01-01'),
        status: 'open'
      });
      expect(job.getDaysOpen()).toBe(
        Math.floor((Date.now() - job.createdAt) / (1000 * 60 * 60 * 24))
      );
    });
  });
});

// tests/unit/services/licenseService.test.js
describe('License Service', () => {
  it('should enforce user limits by tier', () => {
    const org = { tier: 'starter', userCount: 11 };
    expect(licenseService.canAddUser(org)).toBe(false);
    
    const proOrg = { tier: 'professional', userCount: 11 };
    expect(licenseService.canAddUser(proOrg)).toBe(true);
  });
  
  it('should handle expired licenses', () => {
    const org = { 
      tier: 'professional',
      licenseExpiresAt: new Date('2024-01-01')
    };
    expect(licenseService.isLicenseValid(org)).toBe(false);
    expect(licenseService.getGracePeriodDays(org)).toBe(0);
  });
});
```

**Integration Tests (20% of tests)**
```javascript
// tests/integration/multitenancy.test.js
describe('Multi-Tenancy Isolation', () => {
  let org1, org2, user1, user2, token1, token2;
  
  beforeAll(async () => {
    // Create two separate organizations
    org1 = await createTestOrganization({ name: 'Company A' });
    org2 = await createTestOrganization({ name: 'Company B' });
    
    user1 = await createTestUser({ organizationId: org1.id });
    user2 = await createTestUser({ organizationId: org2.id });
    
    token1 = generateToken(user1);
    token2 = generateToken(user2);
  });
  
  it('should isolate jobs between organizations', async () => {
    // User 1 creates job
    const job = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'Secret Job', workspaceId: org1.workspaces[0].id });
    
    expect(job.status).toBe(201);
    const jobId = job.body.id;
    
    // User 1 can see job
    const getJob1 = await request(app)
      .get(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(getJob1.status).toBe(200);
    
    // User 2 CANNOT see job
    const getJob2 = await request(app)
      .get(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(getJob2.status).toBe(404);
    
    // Verify database-level isolation (RLS)
    const dbResult = await db.query(
      'SELECT * FROM jobs WHERE organization_id = $1',
      [org2.id]
    );
    expect(dbResult.rows.find(j => j.id === jobId)).toBeUndefined();
  });
  
  it('should prevent cross-org data manipulation', async () => {
    const job = await createTestJob({ organizationId: org1.id });
    
    // User 2 tries to update User 1's job
    const update = await request(app)
      .put(`/api/jobs/${job.id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ title: 'Hacked Job' });
    
    expect(update.status).toBe(404); // Not found (not 403 to avoid leaking info)
    
    // Verify job unchanged
    const original = await db.query(
      'SELECT * FROM jobs WHERE id = $1',
      [job.id]
    );
    expect(original.rows[0].title).toBe(job.title);
  });
});

// tests/integration/auth-flow.test.js
describe('Authentication Flow', () => {
  it('should complete full auth lifecycle', async () => {
    // 1. Register
    const register = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        organizationName: 'Test Org'
      });
    
    expect(register.status).toBe(201);
    expect(register.body).toHaveProperty('user');
    expect(register.body).toHaveProperty('token');
    
    const { token, refreshToken } = register.body;
    
    // 2. Verify email (simulate)
    await db.query(
      'UPDATE users SET email_verified = true WHERE email = $1',
      ['test@example.com']
    );
    
    // 3. Access protected route
    const profile = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    
    expect(profile.status).toBe(200);
    expect(profile.body.email).toBe('test@example.com');
    
    // 4. Refresh token
    const refresh = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    
    expect(refresh.status).toBe(200);
    expect(refresh.body).toHaveProperty('token');
    expect(refresh.body.token).not.toBe(token);
    
    // 5. Logout
    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    
    expect(logout.status).toBe(200);
    
    // 6. Verify token invalidated
    const afterLogout = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    
    expect(afterLogout.status).toBe(401);
  });
});
```

**E2E Tests (10% of tests)**
```javascript
// e2e/tests/recruitment-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Recruitment Workflow', () => {
  test('recruiter posts job, candidate applies, gets hired', async ({ page, context }) => {
    // PART 1: Recruiter posts job
    await page.goto('/login');
    await page.fill('[name="email"]', 'recruiter@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Create job
    await page.click('text=Post New Job');
    await page.fill('[name="title"]', 'Senior React Developer');
    await page.fill('[name="department"]', 'Engineering');
    await page.fill('[name="location"]', 'San Francisco, CA');
    await page.fill('[name="salaryMin"]', '150000');
    await page.fill('[name="salaryMax"]', '200000');
    await page.check('[name="isPublic"]');
    await page.fill('[name="description"]', 'We are looking for...');
    await page.click('button:has-text("Publish Job")');
    
    await expect(page.locator('.success-toast')).toContainText('Job posted');
    
    const jobUrl = await page.getAttribute('[data-public-url]', 'href');
    
    // PART 2: Candidate applies
    const candidatePage = await context.newPage();
    await candidatePage.goto(jobUrl);
    
    await candidatePage.click('button:has-text("Apply Now")');
    await candidatePage.fill('[name="name"]', 'Jane Doe');
    await candidatePage.fill('[name="email"]', 'jane@example.com');
    await candidatePage.fill('[name="phone"]', '555-0123');
    await candidatePage.fill('[name="location"]', 'San Francisco, CA');
    await candidatePage.fill('[name="linkedin"]', 'linkedin.com/in/janedoe');
    await candidatePage.fill('[name="coverLetter"]', 'I am excited to apply...');
    
    // Upload resume (simulate)
    await candidatePage.setInputFiles('[name="resume"]', 'tests/fixtures/resume.pdf');
    
    await candidatePage.click('button:has-text("Submit Application")');
    
    await expect(candidatePage.locator('h1')).toContainText('Application Submitted');
    
    const trackingCode = await candidatePage.textContent('[data-tracking-code]');
    expect(trackingCode).toMatch(/TRACK-[A-Z0-9]{8}/);
    
    // PART 3: Recruiter reviews and hires
    await page.reload();
    await page.click('text=Candidates');
    await page.click('text=Jane Doe');
    
    // Verify application details
    await expect(page.locator('.candidate-email')).toContainText('jane@example.com');
    await expect(page.locator('.candidate-phone')).toContainText('555-0123');
    
    // Move through pipeline
    await page.click('button:has-text("Schedule Phone Screen")');
    await page.fill('[name="scheduledDate"]', '2025-11-01');
    await page.click('button:has-text("Confirm")');
    
    await expect(page.locator('.candidate-stage')).toContainText('Phone Screen');
    
    // Advance to interview
    await page.click('button:has-text("Pass to Interview")');
    await page.click('button:has-text("Schedule Onsite")');
    await page.fill('[name="scheduledDate"]', '2025-11-08');
    await page.click('button:has-text("Confirm")');
    
    // Make offer
    await page.click('button:has-text("Make Offer")');
    await page.fill('[name="salary"]', '175000');
    await page.fill('[name="startDate"]', '2025-12-01');
    await page.click('button:has-text("Send Offer")');
    
    await expect(page.locator('.candidate-stage')).toContainText('Offer Sent');
    
    // Mark as hired
    await page.click('button:has-text("Mark as Hired")');
    await page.fill('[name="actualStartDate"]', '2025-12-01');
    await page.click('button:has-text("Confirm Hire")');
    
    await expect(page.locator('.success-message')).toContainText('Candidate hired');
    await expect(page.locator('.candidate-status')).toContainText('Hired');
    
    // PART 4: Verify job status changed
    await page.goto('/jobs');
    await page.click('text=Senior React Developer');
    await expect(page.locator('.job-status')).toContainText('Filled');
  });
  
  test('should maintain data isolation between organizations', async ({ browser }) => {
    // Create two browser contexts (two separate orgs)
    const org1Context = await browser.newContext();
    const org2Context = await browser.newContext();
    
    const org1Page = await org1Context.newPage();
    const org2Page = await org2Context.newPage();
    
    // Org 1: Create job
    await org1Page.goto('/login');
    await org1Page.fill('[name="email"]', 'org1@test.com');
    await org1Page.fill('[name="password"]', 'password123');
    await org1Page.click('button[type="submit"]');
    
    await org1Page.click('text=Post Job');
    await org1Page.fill('[name="title"]', 'Confidential Position');
    await org1Page.click('button:has-text("Publish")');
    
    // Org 2: Try to access jobs
    await org2Page.goto('/login');
    await org2Page.fill('[name="email"]', 'org2@test.com');
    await org2Page.fill('[name="password"]', 'password123');
    await org2Page.click('button[type="submit"]');
    
    await org2Page.goto('/jobs');
    
    // Verify Org 2 CANNOT see Org 1's job
    await expect(org2Page.locator('text=Confidential Position')).not.toBeVisible();
  });
});
```

**Performance Tests**
```javascript
// load-tests/scenarios/typical-usage.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% < 200ms, 99% < 500ms
    http_req_failed: ['rate<0.01'],                // Error rate < 1%
  },
};

export default function () {
  // Login
  const loginRes = http.post('https://api.recruitiq.com/auth/login', {
    email: 'test@example.com',
    password: 'password123',
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== '',
  });
  
  const token = loginRes.json('token');
  const headers = { Authorization: `Bearer ${token}` };
  
  sleep(1);
  
  // Fetch jobs
  const jobsRes = http.get('https://api.recruitiq.com/api/jobs', { headers });
  check(jobsRes, {
    'jobs fetched': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 200,
  });
  
  sleep(2);
  
  // Create candidate
  const candidateRes = http.post(
    'https://api.recruitiq.com/api/candidates',
    JSON.stringify({
      name: 'Test Candidate',
      email: `candidate${Date.now()}@test.com`,
    }),
    { headers }
  );
  
  check(candidateRes, {
    'candidate created': (r) => r.status === 201,
  });
  
  sleep(3);
}
```

### Test Coverage Requirements

**Minimum Coverage by Module:**
- Authentication: 90%+
- Authorization: 90%+
- Multi-tenancy: 95%+
- License Management: 90%+
- Core Business Logic: 85%+
- API Controllers: 80%+
- Database Repositories: 85%+
- Utilities: 80%+

**Overall Target:** 80% code coverage minimum

### CI/CD Test Gates

**Pull Request Checks:**
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ No security vulnerabilities (high/critical)
- ✅ Code coverage doesn't decrease
- ✅ Lint checks pass
- ✅ TypeScript compilation succeeds

**Pre-Deployment Checks:**
- ✅ Full regression suite passes
- ✅ E2E tests pass in staging
- ✅ Performance tests meet thresholds
- ✅ Security scans clean
- ✅ Database migrations tested

**Post-Deployment Validation:**
- ✅ Smoke tests pass in production
- ✅ Health checks return 200
- ✅ Error rate < 0.1%
- ✅ Response times within SLA

> **Note:** See ARCHITECTURE_SUMMARY.md for complete testing strategy including security testing, accessibility testing, chaos engineering, and more.
```javascript
// e2e/migration.spec.js
test('should work with API backend', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  await page.waitForURL('/');
  
  // Verify data loads from API
  await expect(page.locator('.job-card')).toBeVisible();
});
```

---

## Success Metrics

Track these metrics during migration:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| API Response Time (p95) | < 200ms | - | - |
| Database Query Time (p95) | < 50ms | - | - |
| Frontend Load Time | < 2s | - | - |
| Error Rate | < 0.1% | - | - |
| Test Coverage | > 80% | - | - |
| Zero Data Loss | 100% | - | - |

---

## Completion Checklist

### Phase 1: Foundation
- [ ] Backend server running
- [ ] Database created and migrated
- [ ] Redis configured
- [ ] Environment variables set
- [ ] Health check passing

### Phase 2: Authentication
- [ ] JWT auth implemented
- [ ] User registration working
- [ ] Login/logout working
- [ ] Token refresh implemented
- [ ] Frontend using API for auth

### Phase 3: Organizations
- [ ] OrganizationContext created
- [ ] Workspace APIs working
- [ ] Data migration completed
- [ ] Dual-write mode active

### Phase 4: Data Layer
- [ ] Jobs API complete
- [ ] Candidates API complete
- [ ] Flow templates API complete
- [ ] localStorage removed
- [ ] All CRUD through API

### Phase 5: Advanced
- [ ] React Query integrated
- [ ] Optimistic updates working
- [ ] WebSocket implemented
- [ ] Real-time updates active

### Phase 6: Production
- [ ] Security hardened
- [ ] Logging configured
- [ ] Monitoring setup
- [ ] Performance optimized
- [ ] Documentation complete

---

**Status:** 📋 Ready for Implementation  
**Next Action:** Begin Phase 1 - Foundation Setup
