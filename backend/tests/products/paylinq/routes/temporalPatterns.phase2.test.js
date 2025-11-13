/**
 * Phase 2 API Integration Tests
 * Tests for GET /patterns/stations and GET /patterns/roles endpoints
 */

import request from 'supertest';
import app from '../../../../src/app.js';
import { generateAuthToken } from '../../../helpers/auth.js';

// Mock database
jest.mock('../../../../src/config/database.js', () => ({
  query: jest.fn(),
}));

import { query } from '../../../../src/config/database.js';

describe('Temporal Pattern API - Phase 2 Endpoints', () => {
  let authToken;
  const mockUser = {
    userId: 'user-123',
    organizationId: 'org-456',
    role: 'admin',
  };

  beforeAll(() => {
    authToken = generateAuthToken(mockUser);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/paylinq/patterns/stations', () => {
    test('should return paginated list of stations', async () => {
      // Mock count query
      query.mockResolvedValueOnce({
        rows: [{ count: '15' }],
      });

      // Mock stations query
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 'station-1',
            station_name: 'Main Warehouse',
            station_code: 'WH01',
            location_id: 'loc-1',
          },
          {
            id: 'station-2',
            station_name: 'Store #123',
            station_code: 'ST123',
            location_id: 'loc-2',
          },
          {
            id: 'station-3',
            station_name: 'Distribution Center',
            station_code: 'DC01',
            location_id: 'loc-3',
          },
        ],
      });

      const response = await request(app)
        .get('/api/paylinq/patterns/stations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stations).toHaveLength(3);
      expect(response.body.stations[0]).toMatchObject({
        id: 'station-1',
        stationName: 'Main Warehouse', // camelCase (API standards)
        stationCode: 'WH01',
        locationId: 'loc-1',
      });
      expect(response.body.total).toBe(15);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.hasNext).toBe(false);
      expect(response.body.hasPrev).toBe(false);
    });

    test('should handle pagination correctly', async () => {
      query.mockResolvedValueOnce({
        rows: [{ count: '45' }],
      });

      query.mockResolvedValueOnce({
        rows: Array.from({ length: 20 }, (_, i) => ({
          id: `station-${i + 21}`,
          station_name: `Station ${i + 21}`,
          station_code: `ST${i + 21}`,
          location_id: `loc-${i + 21}`,
        })),
      });

      const response = await request(app)
        .get('/api/paylinq/patterns/stations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 2, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(2);
      expect(response.body.total).toBe(45);
      expect(response.body.totalPages).toBe(3);
      expect(response.body.hasNext).toBe(true);
      expect(response.body.hasPrev).toBe(true);
    });

    test('should return empty array when no stations exist', async () => {
      query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      query.mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app)
        .get('/api/paylinq/patterns/stations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stations).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    test('should require authentication', async () => {
      const response = await request(app).get('/api/paylinq/patterns/stations');

      expect(response.status).toBe(401);
    });

    test('should handle database errors gracefully', async () => {
      query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/paylinq/patterns/stations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/paylinq/patterns/roles', () => {
    test('should return paginated list of roles', async () => {
      query.mockResolvedValueOnce({
        rows: [{ count: '8' }],
      });

      query.mockResolvedValueOnce({
        rows: [
          {
            id: 'role-1',
            role_name: 'Supervisor',
            role_code: 'SUP',
            skill_level: 'senior',
          },
          {
            id: 'role-2',
            role_name: 'Cashier',
            role_code: 'CASH',
            skill_level: 'entry',
          },
          {
            id: 'role-3',
            role_name: 'Manager',
            role_code: 'MGR',
            skill_level: 'senior',
          },
        ],
      });

      const response = await request(app)
        .get('/api/paylinq/patterns/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.roles).toHaveLength(3);
      expect(response.body.roles[0]).toMatchObject({
        id: 'role-1',
        roleName: 'Supervisor', // camelCase (API standards)
        roleCode: 'SUP',
        skillLevel: 'senior',
      });
      expect(response.body.total).toBe(8);
      expect(response.body.page).toBe(1);
    });

    test('should handle pagination correctly', async () => {
      query.mockResolvedValueOnce({
        rows: [{ count: '50' }],
      });

      query.mockResolvedValueOnce({
        rows: Array.from({ length: 20 }, (_, i) => ({
          id: `role-${i + 1}`,
          role_name: `Role ${i + 1}`,
          role_code: `R${i + 1}`,
          skill_level: 'mid',
        })),
      });

      const response = await request(app)
        .get('/api/paylinq/patterns/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.totalPages).toBe(3);
      expect(response.body.hasNext).toBe(true);
    });

    test('should return empty array when no roles exist', async () => {
      query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      query.mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app)
        .get('/api/paylinq/patterns/roles')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.roles).toHaveLength(0);
    });

    test('should require authentication', async () => {
      const response = await request(app).get('/api/paylinq/patterns/roles');

      expect(response.status).toBe(401);
    });
  });

  describe('Integration: Pattern Evaluation with Phase 2 Types', () => {
    test('should evaluate shift type pattern via API', async () => {
      const pattern = {
        patternType: 'shift_type',
        shiftTypeId: 'shift-night-001',
        consecutiveCount: 5,
        lookbackPeriodDays: 30,
      };

      // Mock time entries
      query.mockResolvedValueOnce({
        rows: Array.from({ length: 7 }, (_, i) => ({
          entry_date: `2024-03-0${i + 1}`,
        })),
      });

      query.mockResolvedValueOnce({
        rows: [{ shift_name: 'Night Shift' }],
      });

      const response = await request(app)
        .post('/api/paylinq/patterns/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pattern,
          employeeId: 'emp-123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.evaluation.qualified).toBe(true);
      expect(response.body.evaluation.patternType).toBe('shift_type');
      expect(response.body.evaluation.metadata.shiftTypeName).toBe('Night Shift');
    });

    test('should evaluate station pattern via API', async () => {
      const pattern = {
        patternType: 'station',
        stationId: 'station-warehouse-001',
        consecutiveCount: 10,
        lookbackPeriodDays: 60,
      };

      query.mockResolvedValueOnce({
        rows: Array.from({ length: 12 }, (_, i) => {
          const date = new Date('2024-02-01');
          date.setDate(date.getDate() + i);
          return { shift_date: date.toISOString().split('T')[0] };
        }),
      });

      query.mockResolvedValueOnce({
        rows: [{ station_name: 'Main Warehouse' }],
      });

      const response = await request(app)
        .post('/api/paylinq/patterns/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pattern,
          employeeId: 'emp-456',
        });

      expect(response.status).toBe(200);
      expect(response.body.evaluation.qualified).toBe(true);
      expect(response.body.evaluation.patternType).toBe('station');
      expect(response.body.evaluation.metadata.stationName).toBe('Main Warehouse');
    });

    test('should evaluate role pattern via API', async () => {
      const pattern = {
        patternType: 'role',
        roleId: 'role-supervisor-001',
        consecutiveCount: 7,
        lookbackPeriodDays: 30,
      };

      query.mockResolvedValueOnce({
        rows: Array.from({ length: 8 }, (_, i) => ({
          shift_date: `2024-03-0${i + 1}`,
        })),
      });

      query.mockResolvedValueOnce({
        rows: [{ role_name: 'Supervisor' }],
      });

      const response = await request(app)
        .post('/api/paylinq/patterns/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pattern,
          employeeId: 'emp-789',
        });

      expect(response.status).toBe(200);
      expect(response.body.evaluation.qualified).toBe(true);
      expect(response.body.evaluation.patternType).toBe('role');
      expect(response.body.evaluation.metadata.roleName).toBe('Supervisor');
    });
  });

  describe('API Standards Compliance - Phase 2', () => {
    test('stations endpoint should use resource-specific key', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 'station-1',
            station_name: 'Test Station',
            station_code: 'TS1',
            location_id: 'loc-1',
          },
        ],
      });

      const response = await request(app)
        .get('/api/paylinq/patterns/stations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body).toHaveProperty('stations'); // NOT "data"
      expect(response.body).not.toHaveProperty('data');
    });

    test('roles endpoint should use resource-specific key', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 'role-1',
            role_name: 'Test Role',
            role_code: 'TR1',
            skill_level: 'mid',
          },
        ],
      });

      const response = await request(app)
        .get('/api/paylinq/patterns/roles')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body).toHaveProperty('roles'); // NOT "data"
      expect(response.body).not.toHaveProperty('data');
    });

    test('should return camelCase field names', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 'station-1',
            station_name: 'Test',
            station_code: 'T1',
            location_id: 'loc-1',
          },
        ],
      });

      const response = await request(app)
        .get('/api/paylinq/patterns/stations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.stations[0]).toHaveProperty('stationName'); // camelCase
      expect(response.body.stations[0]).not.toHaveProperty('station_name'); // not snake_case
    });
  });
});
