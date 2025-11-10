/**
 * LocationRepository Tests
 * Unit tests for location repository
 */

import LocationRepository from '../../../../src/products/nexus/repositories/locationRepository.js';
import pool from '../../../../src/config/database.js';

describe('LocationRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new LocationRepository();
  });

  describe('create', () => {
    it('should create a new location', async () => {
      const mockLocation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Headquarters',
        code: 'HQ',
        type: 'headquarters',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          country: 'USA'
        },
        timezone: 'America/Los_Angeles',
        phone_number: '+1-415-555-0100',
        email: 'hq@example.com',
        capacity: 200,
        is_active: true,
        organization_id: '123e4567-e89b-12d3-a456-426614174001',
        created_at: '2024-01-15T10:00:00Z'
      };

      db.query.mockResolvedValue({ rows: [mockLocation] });

      const data = {
        name: 'Headquarters',
        code: 'HQ',
        type: 'headquarters',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          country: 'USA'
        },
        timezone: 'America/Los_Angeles',
        phoneNumber: '+1-415-555-0100',
        email: 'hq@example.com',
        capacity: 200,
        isActive: true,
        organizationId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = await repository.create(data);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hris.locations'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'Headquarters');
      expect(result).toHaveProperty('code', 'HQ');
      expect(result).toHaveProperty('type', 'headquarters');
    });

    it('should handle minimal location data', async () => {
      const mockLocation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Branch Office',
        code: 'BR01',
        type: 'branch',
        is_active: true,
        organization_id: '123e4567-e89b-12d3-a456-426614174001',
        created_at: '2024-01-15T10:00:00Z'
      };

      db.query.mockResolvedValue({ rows: [mockLocation] });

      const data = {
        name: 'Branch Office',
        code: 'BR01',
        type: 'branch',
        organizationId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = await repository.create(data);

      expect(result).toHaveProperty('name', 'Branch Office');
      expect(result.address).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find location by ID with employee count', async () => {
      const mockLocation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Headquarters',
        code: 'HQ',
        type: 'headquarters',
        employee_count: 45,
        department_count: 8,
        organization_id: '123e4567-e89b-12d3-a456-426614174001'
      };

      db.query.mockResolvedValue({ rows: [mockLocation] });

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const result = await repository.findById(id, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([id, organizationId])
      );
      expect(result).toHaveProperty('id', id);
      expect(result).toHaveProperty('employeeCount', 45);
      expect(result).toHaveProperty('departmentCount', 8);
    });

    it('should return null if location not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const result = await repository.findById(id, organizationId);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all locations', async () => {
      const mockLocations = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Headquarters',
          code: 'HQ',
          type: 'headquarters',
          is_active: true,
          employee_count: 45,
          organization_id: '123e4567-e89b-12d3-a456-426614174001'
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          name: 'Branch Office',
          code: 'BR01',
          type: 'branch',
          is_active: true,
          employee_count: 12,
          organization_id: '123e4567-e89b-12d3-a456-426614174001'
        }
      ];

      db.query.mockResolvedValue({ rows: mockLocations });

      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const result = await repository.findAll(organizationId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('name', 'Headquarters');
      expect(result[1]).toHaveProperty('name', 'Branch Office');
    });

    it('should filter by type', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const filters = { type: 'headquarters' };

      await repository.findAll(organizationId, filters);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('type ='),
        expect.any(Array)
      );
    });

    it('should filter by active status', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const filters = { isActive: true };

      await repository.findAll(organizationId, filters);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active ='),
        expect.any(Array)
      );
    });

    it('should support pagination', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const filters = { limit: 10, offset: 0 };

      await repository.findAll(organizationId, filters);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([10, 0])
      );
    });
  });

  describe('findByCode', () => {
    it('should find location by code', async () => {
      const mockLocation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Headquarters',
        code: 'HQ',
        type: 'headquarters',
        organization_id: '123e4567-e89b-12d3-a456-426614174001'
      };

      db.query.mockResolvedValue({ rows: [mockLocation] });

      const code = 'HQ';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const result = await repository.findByCode(code, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('code ='),
        expect.arrayContaining([code, organizationId])
      );
      expect(result).toHaveProperty('code', 'HQ');
    });

    it('should return null if code not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const code = 'NOTFOUND';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const result = await repository.findByCode(code, organizationId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update location', async () => {
      const mockUpdated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Main Headquarters',
        code: 'HQ',
        type: 'headquarters',
        capacity: 250,
        is_active: true,
        organization_id: '123e4567-e89b-12d3-a456-426614174001',
        updated_at: '2024-01-15T11:00:00Z'
      };

      db.query.mockResolvedValue({ rows: [mockUpdated] });

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const data = {
        name: 'Main Headquarters',
        capacity: 250
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const result = await repository.update(id, data, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE hris.locations'),
        expect.any(Array)
      );
      expect(result).toHaveProperty('name', 'Main Headquarters');
      expect(result).toHaveProperty('capacity', 250);
    });

    it('should update address', async () => {
      const mockUpdated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Headquarters',
        address: {
          street: '456 New St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          country: 'USA'
        },
        organization_id: '123e4567-e89b-12d3-a456-426614174001'
      };

      db.query.mockResolvedValue({ rows: [mockUpdated] });

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const data = {
        address: {
          street: '456 New St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          country: 'USA'
        }
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const result = await repository.update(id, data, organizationId);

      expect(result).toHaveProperty('address');
      expect(result.address).toHaveProperty('street', '456 New St');
    });
  });

  describe('delete', () => {
    it('should soft delete location', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      await repository.delete(id, organizationId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = NOW()'),
        expect.arrayContaining([id, organizationId])
      );
    });
  });

  describe('getLocationStats', () => {
    it('should get location statistics', async () => {
      const mockStats = {
        location_id: '123e4567-e89b-12d3-a456-426614174000',
        employee_count: 45,
        department_count: 8,
        active_employee_count: 42,
        capacity: 200,
        utilization_rate: 0.21
      };

      db.query.mockResolvedValue({ rows: [mockStats] });

      const locationId = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const result = await repository.getLocationStats(locationId, organizationId);

      expect(result).toHaveProperty('employeeCount', 45);
      expect(result).toHaveProperty('departmentCount', 8);
      expect(result).toHaveProperty('utilizationRate', 0.21);
    });
  });

  describe('getAllLocationStats', () => {
    it('should get statistics for all locations', async () => {
      const mockStats = [
        {
          location_id: '123e4567-e89b-12d3-a456-426614174000',
          location_name: 'Headquarters',
          employee_count: 45,
          department_count: 8,
          capacity: 200
        },
        {
          location_id: '123e4567-e89b-12d3-a456-426614174002',
          location_name: 'Branch Office',
          employee_count: 12,
          department_count: 3,
          capacity: 50
        }
      ];

      db.query.mockResolvedValue({ rows: mockStats });

      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const result = await repository.getAllLocationStats(organizationId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('locationName', 'Headquarters');
      expect(result[0]).toHaveProperty('employeeCount', 45);
      expect(result[1]).toHaveProperty('locationName', 'Branch Office');
    });
  });
});
