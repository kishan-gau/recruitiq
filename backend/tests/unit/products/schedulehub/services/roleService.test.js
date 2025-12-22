import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import RoleService from '../../../../../src/products/schedulehub/services/roleService.js';
import RoleRepository from '../../../../../src/products/schedulehub/repositories/RoleRepository.js';
import { ValidationError, NotFoundError } from '../../../../../src/utils/errors.js';

describe('RoleService', () => {
  let service;
  let mockRepository;

  // Helper function to generate DB format data (snake_case)
  const createDbRole = (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    organization_id: 'org-123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Role',
    description: 'Test role description',
    hourly_rate: 25.50,
    required_certifications: ['Safety', 'First Aid'],
    required_skills: ['Communication', 'Problem Solving'],
    color: '#FF5733',
    is_active: true,
    created_at: new Date('2025-01-01T10:00:00Z'),
    updated_at: new Date('2025-01-01T10:00:00Z'),
    created_by: 'user-123e4567-e89b-12d3-a456-426614174000',
    updated_by: null,
    ...overrides
  });

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findByName: jest.fn()
    };
    service = new RoleService(mockRepository);
  });

  describe('create', () => {
    it('should create role with valid data', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const validData = {
        name: 'Security Guard',
        description: 'Provides security services',
        hourlyRate: 28.00,
        requiredCertifications: ['Security License'],
        requiredSkills: ['Vigilance', 'Communication'],
        color: '#3498DB'
      };

      const dbRole = createDbRole({
        name: validData.name,
        description: validData.description,
        hourly_rate: validData.hourlyRate,
        required_certifications: validData.requiredCertifications,
        required_skills: validData.requiredSkills,
        color: validData.color
      });

      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(dbRole);

      const result = await service.create(validData, orgId, userId);

      expect(mockRepository.findByName).toHaveBeenCalledWith(validData.name, orgId);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validData.name,
          description: validData.description,
          hourly_rate: validData.hourlyRate,
          required_certifications: validData.requiredCertifications,
          required_skills: validData.requiredSkills,
          color: validData.color,
          organization_id: orgId,
          is_active: true
        }),
        orgId,
        userId
      );
      expect(result).toBeDefined();
      expect(result.name).toBe(validData.name);
      expect(result.hourlyRate).toBe(validData.hourlyRate);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const invalidData = {};

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for duplicate role name', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const validData = {
        name: 'Existing Role',
        description: 'Role description',
        hourlyRate: 25.00
      };

      const existingRole = createDbRole({ name: validData.name });
      mockRepository.findByName.mockResolvedValue(existingRole);

      await expect(
        service.create(validData, orgId, userId)
      ).rejects.toThrow(ValidationError);
      expect(mockRepository.findByName).toHaveBeenCalledWith(validData.name, orgId);
    });

    it('should throw ValidationError for negative hourly rate', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const invalidData = {
        name: 'Test Role',
        description: 'Description',
        hourlyRate: -10.00
      };

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid color format', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const invalidData = {
        name: 'Test Role',
        description: 'Description',
        hourlyRate: 25.00,
        color: 'invalid-color'
      };

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('should return role when found', async () => {
      const roleId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const dbRole = createDbRole();

      mockRepository.findById.mockResolvedValue(dbRole);

      const result = await service.getById(roleId, orgId);

      expect(mockRepository.findById).toHaveBeenCalledWith(roleId, orgId);
      expect(result).toBeDefined();
      expect(result.name).toBe(dbRole.name);
      expect(result.hourlyRate).toBe(dbRole.hourly_rate);
      expect(result.requiredCertifications).toEqual(dbRole.required_certifications);
    });

    it('should throw NotFoundError when role not found', async () => {
      const roleId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.getById(roleId, orgId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should return all roles for organization', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const dbRoles = [
        createDbRole({ name: 'Security Guard', hourly_rate: 28.00 }),
        createDbRole({ name: 'Cleaner', hourly_rate: 22.50 })
      ];

      mockRepository.findAll.mockResolvedValue(dbRoles);

      const result = await service.list(orgId);

      expect(mockRepository.findAll).toHaveBeenCalledWith(orgId);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Security Guard');
      expect(result[0].hourlyRate).toBe(28.00);
      expect(result[1].name).toBe('Cleaner');
      expect(result[1].hourlyRate).toBe(22.50);
    });

    it('should return empty array when no roles found', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.list(orgId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update role with valid data', async () => {
      const roleId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Updated Role',
        hourlyRate: 30.00,
        color: '#E74C3C'
      };

      const existingRole = createDbRole();
      const updatedRole = {
        ...existingRole,
        name: updateData.name,
        hourly_rate: updateData.hourlyRate,
        color: updateData.color
      };

      mockRepository.findById.mockResolvedValue(existingRole);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(updatedRole);

      const result = await service.update(roleId, updateData, orgId, userId);

      expect(mockRepository.findById).toHaveBeenCalledWith(roleId, orgId);
      expect(mockRepository.findByName).toHaveBeenCalledWith(updateData.name, orgId);
      expect(mockRepository.update).toHaveBeenCalledWith(
        roleId,
        expect.objectContaining({
          name: updateData.name,
          hourly_rate: updateData.hourlyRate,
          color: updateData.color
        }),
        orgId,
        userId
      );
      expect(result.name).toBe(updateData.name);
      expect(result.hourlyRate).toBe(updateData.hourlyRate);
    });

    it('should throw NotFoundError when role not found', async () => {
      const roleId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(roleId, { name: 'Updated Role' }, orgId, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when name conflicts with existing role', async () => {
      const roleId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const updateData = { name: 'Existing Role' };

      const existingRole = createDbRole();
      const conflictingRole = createDbRole({
        id: 'different-id',
        name: 'Existing Role'
      });

      mockRepository.findById.mockResolvedValue(existingRole);
      mockRepository.findByName.mockResolvedValue(conflictingRole);

      await expect(
        service.update(roleId, updateData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should allow updating role with same name', async () => {
      const roleId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const updateData = { hourlyRate: 30.00 };

      const existingRole = createDbRole();
      const updatedRole = { ...existingRole, hourly_rate: updateData.hourlyRate };

      mockRepository.findById.mockResolvedValue(existingRole);
      mockRepository.update.mockResolvedValue(updatedRole);

      const result = await service.update(roleId, updateData, orgId, userId);

      expect(result.hourlyRate).toBe(updateData.hourlyRate);
    });
  });

  describe('delete', () => {
    it('should soft delete role when found', async () => {
      const roleId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const existingRole = createDbRole();

      mockRepository.findById.mockResolvedValue(existingRole);
      mockRepository.softDelete.mockResolvedValue();

      await service.delete(roleId, orgId, userId);

      expect(mockRepository.findById).toHaveBeenCalledWith(roleId, orgId);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(roleId, orgId, userId);
    });

    it('should throw NotFoundError when role not found', async () => {
      const roleId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.delete(roleId, orgId, userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getByName', () => {
    it('should return role when found by name', async () => {
      const roleName = 'Security Guard';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const dbRole = createDbRole({ name: roleName });

      mockRepository.findByName.mockResolvedValue(dbRole);

      const result = await service.getByName(roleName, orgId);

      expect(mockRepository.findByName).toHaveBeenCalledWith(roleName, orgId);
      expect(result).toBeDefined();
      expect(result.name).toBe(roleName);
    });

    it('should return null when role not found by name', async () => {
      const roleName = 'Non-existent Role';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findByName.mockResolvedValue(null);

      const result = await service.getByName(roleName, orgId);

      expect(result).toBeNull();
    });
  });
});