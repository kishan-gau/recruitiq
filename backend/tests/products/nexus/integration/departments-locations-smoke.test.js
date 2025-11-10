/**
 * Departments & Locations Smoke Tests
 * Quick validation that critical endpoints work with proper auth
 */

import { jest } from '@jest/globals';

// Mock database before any imports
const mockQuery = jest.fn();
jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  default: { query: mockQuery },
  query: mockQuery
}));

// Import after mocks
const { default: request } = await import('supertest');
const { default: express } = await import('express');

// Mock auth middleware - matches actual behavior
const mockAuthMiddleware = (req, res, next) => {
  req.user = {
    id: 'user-test-456',
    organization_id: 'org-test-123',
    role: 'hr_admin',
    email: 'test@example.com',
    name: 'Test User',
    user_type: 'tenant',
    permissions: []
  };
  next();
};

// Mock auth adapter for Nexus
const mockAuthAdapter = (req, res, next) => {
  if (req.user) {
    req.auth = {
      userId: req.user.id,
      organizationId: req.user.organization_id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      permissions: req.user.permissions,
      userType: req.user.user_type
    };
  }
  next();
};

// Setup test app
const createTestApp = async () => {
  const app = express();
  app.use(express.json());
  app.use(mockAuthMiddleware);
  app.use(mockAuthAdapter);
  
  // Import routes
  const nexusRoutes = (await import('../../../../src/products/nexus/routes/index.js')).default;
  app.use('/api/nexus', nexusRoutes);

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Test error:', err);
    res.status(500).json({ success: false, error: err.message });
  });

  return app;
};

describe('Departments & Locations Smoke Tests', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('GET /api/nexus/departments', () => {
    it('should list departments with proper auth', async () => {
      const mockDepartments = [
        {
          id: '1',
          department_name: 'Engineering',
          department_code: 'ENG',
          organization_id: 'org-test-123',
          employee_count: 10
        },
        {
          id: '2',
          department_name: 'Sales',
          department_code: 'SALES',
          organization_id: 'org-test-123',
          employee_count: 5
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockDepartments });

      const response = await request(app)
        .get('/api/nexus/departments')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify correct parameters were passed to repository
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[1]).toContain('org-test-123'); // organizationId
    });

    it('should handle pagination parameters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/nexus/departments')
        .query({ limit: 10, offset: 20 })
        .expect(200);

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[1]).toContain(10);
      expect(queryCall[1]).toContain(20);
    });

    it('should handle filter parameters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/nexus/departments')
        .query({ locationId: 'loc-123' })
        .expect(200);

      // Query should have been called
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('GET /api/nexus/locations', () => {
    it('should list locations with proper auth', async () => {
      const mockLocations = [
        {
          id: '1',
          location_name: 'Headquarters',
          location_code: 'HQ',
          location_type: 'headquarters',
          organization_id: 'org-test-123',
          is_active: true,
          employee_count: 45
        },
        {
          id: '2',
          location_name: 'Branch Office',
          location_code: 'BR01',
          location_type: 'branch',
          organization_id: 'org-test-123',
          is_active: true,
          employee_count: 12
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockLocations });

      const response = await request(app)
        .get('/api/nexus/locations')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify correct parameters were passed
      expect(mockQuery).toHaveBeenCalled();
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[1]).toContain('org-test-123'); // organizationId
    });

    it('should handle type filter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/nexus/locations')
        .query({ type: 'headquarters' })
        .expect(200);

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should handle isActive filter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/nexus/locations')
        .query({ isActive: 'true' })
        .expect(200);

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('Auth Integration', () => {
    it('should have req.auth available in Nexus controllers', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/nexus/departments')
        .expect(200);

      // If auth wasn't properly set, this would fail with 500
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should pass organizationId from req.auth to services', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/nexus/departments')
        .expect(200);

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[1]).toContain('org-test-123');
    });
  });

  describe('Response Format', () => {
    it('should return wrapped response with success and data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/nexus/departments')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });
    });

    it('should return error response on failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/nexus/departments')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});
