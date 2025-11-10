/**
 * User Account Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import userAccountService from '../../../src/services/userAccountService.js';
import userAccountRepository from '../../../src/repositories/userAccountRepository.js';
import bcrypt from 'bcryptjs';

jest.mock('../../../src/repositories/userAccountRepository.js');
jest.mock('../../../src/config/database.js');
jest.mock('../../../src/utils/logger.js');
jest.mock('bcryptjs');

describe('UserAccountService', () => {
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';
  const mockUserAccountId = '123e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createUserAccount', () => {
    it('should create user account with provided password', async () => {
      const data = {
        organizationId: mockOrganizationId,
        email: 'test@example.com',
        password: 'StrongPass123!',
        preferences: { theme: 'dark' }
      };

      jest.spyOn(userAccountRepository.findByEmail, "mockName").mockResolvedValue(null);
      jest.spyOn(bcrypt.hash, "mockName").mockResolvedValue('hashed_password');
      jest.spyOn(userAccountRepository.create, "mockName").mockResolvedValue({
        id: mockUserAccountId,
        email: 'test@example.com',
        account_status: 'active'
      });

      const result = await userAccountService.createUserAccount(data, mockUserId);

      expect(result.id).toBe(mockUserAccountId);
      expect(result.temporaryPassword).toBeUndefined();
      expect(userAccountRepository.findByEmail).toHaveBeenCalledWith('test@example.com', mockOrganizationId);
      expect(bcrypt.hash).toHaveBeenCalledWith('StrongPass123!', 12);
      expect(userAccountRepository.create).toHaveBeenCalled();
    });

    it('should generate temporary password if not provided', async () => {
      const data = {
        organizationId: mockOrganizationId,
        email: 'test@example.com'
      };

      jest.spyOn(userAccountRepository.findByEmail, "mockName").mockResolvedValue(null);
      jest.spyOn(bcrypt.hash, "mockName").mockResolvedValue('hashed_password');
      jest.spyOn(userAccountRepository.create, "mockName").mockResolvedValue({
        id: mockUserAccountId,
        email: 'test@example.com',
        account_status: 'pending_activation'
      });

      const result = await userAccountService.createUserAccount(data, mockUserId);

      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword).toHaveLength(16);
      expect(result.requiresPasswordChange).toBe(true);
      expect(result.account_status).toBe('pending_activation');
    });

    it('should throw error if email is invalid', async () => {
      const data = {
        organizationId: mockOrganizationId,
        email: 'invalid-email'
      };

      await expect(
        userAccountService.createUserAccount(data, mockUserId)
      ).rejects.toThrow('Invalid email address');
    });

    it('should throw error if email already exists', async () => {
      const data = {
        organizationId: mockOrganizationId,
        email: 'existing@example.com',
        password: 'StrongPass123!'
      };

      jest.spyOn(userAccountRepository.findByEmail, "mockName").mockResolvedValue({
        id: 'existing-id',
        email: 'existing@example.com'
      });

      await expect(
        userAccountService.createUserAccount(data, mockUserId)
      ).rejects.toThrow('User account with email existing@example.com already exists');
    });

    it('should throw error if password is weak', async () => {
      const data = {
        organizationId: mockOrganizationId,
        email: 'test@example.com',
        password: 'weak'
      };

      jest.spyOn(userAccountRepository.findByEmail, "mockName").mockResolvedValue(null);

      await expect(
        userAccountService.createUserAccount(data, mockUserId)
      ).rejects.toThrow('Password must be at least 8 characters long');
    });
  });

  describe('linkUserAccountToEmployee', () => {
    it('should link user account to employee', async () => {
      const mockEmployeeId = '123e4567-e89b-12d3-a456-426614174003';
      
      const mockQuery = jest.fn(, "mockName").mockResolvedValue({ rows: [] });
      jest.doMock('../../../src/config/database.js', () => ({
        query: mockQuery
      }));

      const result = await userAccountService.linkUserAccountToEmployee(
        mockUserAccountId,
        mockEmployeeId,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toBe(true);
    });
  });

  describe('unlinkUserAccountFromEmployee', () => {
    it('should unlink user account from employee', async () => {
      const mockEmployeeId = '123e4567-e89b-12d3-a456-426614174003';
      
      const result = await userAccountService.unlinkUserAccountFromEmployee(
        mockEmployeeId,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toBe(true);
    });
  });

  describe('getUserAccountById', () => {
    it('should get user account by ID', async () => {
      const mockAccount = { id: mockUserAccountId, email: 'test@example.com' };
      jest.spyOn(userAccountRepository.findById, "mockName").mockResolvedValue(mockAccount);

      const result = await userAccountService.getUserAccountById(mockUserAccountId, mockOrganizationId);

      expect(result).toEqual(mockAccount);
      expect(userAccountRepository.findById).toHaveBeenCalledWith(mockUserAccountId, mockOrganizationId);
    });
  });

  describe('getUserAccountByEmail', () => {
    it('should get user account by email', async () => {
      const mockAccount = { id: mockUserAccountId, email: 'test@example.com' };
      jest.spyOn(userAccountRepository.findByEmail, "mockName").mockResolvedValue(mockAccount);

      const result = await userAccountService.getUserAccountByEmail('test@example.com', mockOrganizationId);

      expect(result).toEqual(mockAccount);
      expect(userAccountRepository.findByEmail).toHaveBeenCalledWith('test@example.com', mockOrganizationId);
    });
  });

  describe('getUserAccountByEmployeeId', () => {
    it('should get user account for employee', async () => {
      const mockEmployeeId = '123e4567-e89b-12d3-a456-426614174003';
      const mockAccount = { id: mockUserAccountId, email: 'employee@example.com' };
      jest.spyOn(userAccountRepository.findByEmployeeId, "mockName").mockResolvedValue(mockAccount);

      const result = await userAccountService.getUserAccountByEmployeeId(mockEmployeeId, mockOrganizationId);

      expect(result).toEqual(mockAccount);
      expect(userAccountRepository.findByEmployeeId).toHaveBeenCalledWith(mockEmployeeId, mockOrganizationId);
    });
  });

  describe('updateUserAccount', () => {
    it('should update user account', async () => {
      const updates = { account_status: 'active' };
      const mockUpdated = { id: mockUserAccountId, account_status: 'active' };
      
      jest.spyOn(userAccountRepository.update, "mockName").mockResolvedValue(mockUpdated);

      const result = await userAccountService.updateUserAccount(
        mockUserAccountId,
        updates,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toEqual(mockUpdated);
      expect(userAccountRepository.update).toHaveBeenCalledWith(
        mockUserAccountId,
        updates,
        mockOrganizationId,
        mockUserId
      );
    });

    it('should validate and hash password when updating', async () => {
      const updates = { password: 'NewStrong123!' };
      
      jest.spyOn(bcrypt.hash, "mockName").mockResolvedValue('new_hashed_password');
      jest.spyOn(userAccountRepository.update, "mockName").mockResolvedValue({ id: mockUserAccountId });

      await userAccountService.updateUserAccount(
        mockUserAccountId,
        updates,
        mockOrganizationId,
        mockUserId
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('NewStrong123!', 12);
      expect(userAccountRepository.update).toHaveBeenCalledWith(
        mockUserAccountId,
        expect.objectContaining({
          password_hash: 'new_hashed_password',
          password_changed_at: expect.any(Date)
        }),
        mockOrganizationId,
        mockUserId
      );
    });

    it('should throw error if new email is invalid', async () => {
      const updates = { email: 'invalid-email' };

      await expect(
        userAccountService.updateUserAccount(mockUserAccountId, updates, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Invalid email address');
    });

    it('should throw error if new email already exists', async () => {
      const updates = { email: 'existing@example.com' };
      
      jest.spyOn(userAccountRepository.emailExists, "mockName").mockResolvedValue(true);

      await expect(
        userAccountService.updateUserAccount(mockUserAccountId, updates, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Email existing@example.com is already in use');
    });
  });

  describe('deactivateUserAccount', () => {
    it('should deactivate user account', async () => {
      const mockDeactivated = { id: mockUserAccountId, is_active: false };
      jest.spyOn(userAccountRepository.deactivate, "mockName").mockResolvedValue(mockDeactivated);

      const result = await userAccountService.deactivateUserAccount(
        mockUserAccountId,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toEqual(mockDeactivated);
      expect(userAccountRepository.deactivate).toHaveBeenCalledWith(
        mockUserAccountId,
        mockOrganizationId,
        mockUserId
      );
    });
  });

  describe('reactivateUserAccount', () => {
    it('should reactivate user account', async () => {
      const mockReactivated = { id: mockUserAccountId, is_active: true };
      jest.spyOn(userAccountRepository.reactivate, "mockName").mockResolvedValue(mockReactivated);

      const result = await userAccountService.reactivateUserAccount(
        mockUserAccountId,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toEqual(mockReactivated);
      expect(userAccountRepository.reactivate).toHaveBeenCalledWith(
        mockUserAccountId,
        mockOrganizationId,
        mockUserId
      );
    });
  });

  describe('generateTemporaryPassword', () => {
    it('should generate a 16-character password', () => {
      const password = userAccountService.generateTemporaryPassword();
      expect(password).toHaveLength(16);
    });

    it('should generate password with mixed case, numbers, and symbols', () => {
      const password = userAccountService.generateTemporaryPassword();
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*]/.test(password)).toBe(true);
    });

    it('should generate unique passwords', () => {
      const password1 = userAccountService.generateTemporaryPassword();
      const password2 = userAccountService.generateTemporaryPassword();
      expect(password1).not.toBe(password2);
    });
  });

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      expect(() => {
        userAccountService.validatePassword('StrongPass123!');
      }).not.toThrow();
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(() => {
        userAccountService.validatePassword('Short1!');
      }).toThrow('Password must be at least 8 characters long');
    });

    it('should reject passwords without uppercase', () => {
      expect(() => {
        userAccountService.validatePassword('lowercase123!');
      }).toThrow('Password must contain');
    });

    it('should reject passwords without lowercase', () => {
      expect(() => {
        userAccountService.validatePassword('UPPERCASE123!');
      }).toThrow('Password must contain');
    });

    it('should reject passwords without numbers', () => {
      expect(() => {
        userAccountService.validatePassword('NoNumbers!');
      }).toThrow('Password must contain');
    });

    it('should reject passwords without special characters', () => {
      expect(() => {
        userAccountService.validatePassword('NoSpecial123');
      }).toThrow('Password must contain');
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(userAccountService.isValidEmail('test@example.com')).toBe(true);
      expect(userAccountService.isValidEmail('user.name@company.co.uk')).toBe(true);
      expect(userAccountService.isValidEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(userAccountService.isValidEmail('invalid')).toBe(false);
      expect(userAccountService.isValidEmail('invalid@')).toBe(false);
      expect(userAccountService.isValidEmail('@example.com')).toBe(false);
      expect(userAccountService.isValidEmail('invalid@domain')).toBe(false);
      expect(userAccountService.isValidEmail('invalid @example.com')).toBe(false);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      jest.spyOn(bcrypt.compare, "mockName").mockResolvedValue(true);

      const result = await userAccountService.verifyPassword('password123', 'hashed_password');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
    });

    it('should reject incorrect password', async () => {
      jest.spyOn(bcrypt.compare, "mockName").mockResolvedValue(false);

      const result = await userAccountService.verifyPassword('wrong', 'hashed_password');

      expect(result).toBe(false);
    });
  });
});
