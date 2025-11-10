/**
 * User Account Repository Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import userAccountRepository from '../../../src/repositories/userAccountRepository.js';
import { query } from '../../../src/config/database.js';

jest.mock('../../../src/config/database.js');
jest.mock('../../../src/utils/logger.js');

describe('UserAccountRepository', () => {
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';
  const mockUserAccountId = '123e4567-e89b-12d3-a456-426614174002';
  const mockEmployeeId = '123e4567-e89b-12d3-a456-426614174003';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user account', async () => {
      const userData = {
        organizationId: mockOrganizationId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        accountStatus: 'active',
        isActive: true,
        preferences: { theme: 'dark' }
      };

      const mockResult = {
        rows: [{
          id: mockUserAccountId,
          organization_id: mockOrganizationId,
          email: 'test@example.com',
          password_hash: 'hashed_password',
          account_status: 'active',
          is_active: true,
          preferences: { theme: 'dark' },
          created_at: new Date(),
          created_by: mockUserId
        }]
      };

      query.mockResolvedValue(mockResult);

      const result = await userAccountRepository.create(userData, mockUserId);

      expect(result).toEqual(mockResult.rows[0]);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hris.user_account'),
        expect.arrayContaining([
          mockOrganizationId,
          'test@example.com',
          'hashed_password',
          'active',
          true,
          JSON.stringify({ theme: 'dark' }),
          mockUserId
        ]),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should lowercase email when creating', async () => {
      const userData = {
        organizationId: mockOrganizationId,
        email: 'TEST@EXAMPLE.COM',
        passwordHash: 'hashed_password'
      };

      const mockResult = {
        rows: [{
          id: mockUserAccountId,
          email: 'test@example.com'
        }]
      };

      query.mockResolvedValue(mockResult);

      await userAccountRepository.create(userData, mockUserId);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test@example.com']),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should use default values when not provided', async () => {
      const userData = {
        organizationId: mockOrganizationId,
        email: 'test@example.com',
        passwordHash: 'hashed_password'
      };

      const mockResult = { rows: [{ id: mockUserAccountId }] };
      query.mockResolvedValue(mockResult);

      await userAccountRepository.create(userData, mockUserId);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'pending_activation', // default account_status
          true,                 // default is_active
          '{}'                  // default preferences
        ]),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('findById', () => {
    it('should find user account by ID', async () => {
      const mockAccount = {
        id: mockUserAccountId,
        organization_id: mockOrganizationId,
        email: 'test@example.com'
      };

      const mockResult = { rows: [mockAccount] };
      query.mockResolvedValue(mockResult);

      const result = await userAccountRepository.findById(mockUserAccountId, mockOrganizationId);

      expect(result).toEqual(mockAccount);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM hris.user_account'),
        [mockUserAccountId, mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should return null when user account not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await userAccountRepository.findById(mockUserAccountId, mockOrganizationId);

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user account by email', async () => {
      const mockAccount = {
        id: mockUserAccountId,
        email: 'test@example.com'
      };

      const mockResult = { rows: [mockAccount] };
      query.mockResolvedValue(mockResult);

      const result = await userAccountRepository.findByEmail('test@example.com', mockOrganizationId);

      expect(result).toEqual(mockAccount);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        ['test@example.com', mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should lowercase email when searching', async () => {
      query.mockResolvedValue({ rows: [] });

      await userAccountRepository.findByEmail('TEST@EXAMPLE.COM', mockOrganizationId);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['test@example.com', mockOrganizationId],
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return null when email not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await userAccountRepository.findByEmail('notfound@example.com', mockOrganizationId);

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should find user account linked to employee', async () => {
      const mockEmployeeId = '123e4567-e89b-12d3-a456-426614174003';
      const mockAccount = {
        id: mockUserAccountId,
        email: 'employee@example.com'
      };

      const mockResult = { rows: [mockAccount] };
      query.mockResolvedValue(mockResult);

      const result = await userAccountRepository.findByEmployeeId(mockEmployeeId, mockOrganizationId);

      expect(result).toEqual(mockAccount);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN hris.employee'),
        [mockEmployeeId, mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should return null when employee has no user account', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await userAccountRepository.findByEmployeeId('non-existent', mockOrganizationId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user account fields', async () => {
      const updates = {
        email: 'newemail@example.com',
        account_status: 'active',
        is_active: true
      };

      const mockUpdated = {
        id: mockUserAccountId,
        ...updates,
        updated_at: new Date()
      };

      query.mockResolvedValue({ rows: [mockUpdated] });

      const result = await userAccountRepository.update(
        mockUserAccountId,
        updates,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toEqual(mockUpdated);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE hris.user_account'),
        expect.arrayContaining([
          'newemail@example.com',
          'active',
          true,
          mockUserId,
          mockUserAccountId,
          mockOrganizationId
        ]),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should handle JSONB preferences', async () => {
      const updates = {
        preferences: { theme: 'light', language: 'en' }
      };

      query.mockResolvedValue({ rows: [{ id: mockUserAccountId }] });

      await userAccountRepository.update(mockUserAccountId, updates, mockOrganizationId, mockUserId);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          JSON.stringify({ theme: 'light', language: 'en' })
        ]),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should ignore invalid fields', async () => {
      const updates = {
        email: 'valid@example.com',
        invalidField: 'should be ignored',
        created_at: new Date() // should also be ignored
      };

      const mockAccount = { id: mockUserAccountId, email: 'valid@example.com' };
      query.mockResolvedValue({ rows: [mockAccount] });

      const result = await userAccountRepository.update(
        mockUserAccountId,
        updates,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toEqual(mockAccount);
      const call = query.mock.calls[0];
      expect(call[0]).not.toContain('invalidField');
      expect(call[0]).not.toContain('created_at');
    });

    it('should return existing account when no valid updates', async () => {
      const updates = { invalidField: 'value' };

      const mockAccount = { id: mockUserAccountId };
      query.mockResolvedValue({ rows: [mockAccount] });

      const result = await userAccountRepository.update(
        mockUserAccountId,
        updates,
        mockOrganizationId,
        mockUserId
      );

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM hris.user_account'),
        expect.any(Array),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('deactivate', () => {
    it('should soft delete user account', async () => {
      const mockDeactivated = {
        id: mockUserAccountId,
        is_active: false,
        account_status: 'inactive',
        deleted_at: new Date(),
        deleted_by: mockUserId
      };

      query.mockResolvedValue({ rows: [mockDeactivated] });

      const result = await userAccountRepository.deactivate(
        mockUserAccountId,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toEqual(mockDeactivated);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE hris.user_account'),
        [mockUserId, mockUserAccountId, mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should return null when user account not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await userAccountRepository.deactivate(
        'non-existent',
        mockOrganizationId,
        mockUserId
      );

      expect(result).toBeNull();
    });
  });

  describe('reactivate', () => {
    it('should reactivate user account', async () => {
      const mockReactivated = {
        id: mockUserAccountId,
        is_active: true,
        account_status: 'active',
        deleted_at: null,
        deleted_by: null
      };

      query.mockResolvedValue({ rows: [mockReactivated] });

      const result = await userAccountRepository.reactivate(
        mockUserAccountId,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toEqual(mockReactivated);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE hris.user_account'),
        [mockUserId, mockUserAccountId, mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      query.mockResolvedValue({ rows: [{ count: '1' }] });

      const result = await userAccountRepository.emailExists('test@example.com', mockOrganizationId);

      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await userAccountRepository.emailExists('notfound@example.com', mockOrganizationId);

      expect(result).toBe(false);
    });

    it('should exclude specified user account ID', async () => {
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      await userAccountRepository.emailExists(
        'test@example.com',
        mockOrganizationId,
        mockUserAccountId
      );

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND id != $3'),
        ['test@example.com', mockOrganizationId, mockUserAccountId],
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('findAll', () => {
    it('should return all user accounts for organization', async () => {
      const mockAccounts = [
        { id: '1', email: 'user1@example.com' },
        { id: '2', email: 'user2@example.com' }
      ];

      query.mockResolvedValue({ rows: mockAccounts });

      const result = await userAccountRepository.findAll(mockOrganizationId);

      expect(result).toEqual(mockAccounts);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FROM hris.user_account ua'),
        [mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by account status', async () => {
      query.mockResolvedValue({ rows: [] });

      await userAccountRepository.findAll(mockOrganizationId, {
        accountStatus: 'active'
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('account_status = $2'),
        [mockOrganizationId, 'active'],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by isActive', async () => {
      query.mockResolvedValue({ rows: [] });

      await userAccountRepository.findAll(mockOrganizationId, {
        isActive: true
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = $2'),
        [mockOrganizationId, true],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by search term', async () => {
      query.mockResolvedValue({ rows: [] });

      await userAccountRepository.findAll(mockOrganizationId, {
        search: 'john'
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('email ILIKE'),
        [mockOrganizationId, '%john%'],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should apply custom ordering', async () => {
      query.mockResolvedValue({ rows: [] });

      await userAccountRepository.findAll(mockOrganizationId, {
        orderBy: 'email',
        orderDir: 'asc'
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY ua.email ASC'),
        [mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });
});
