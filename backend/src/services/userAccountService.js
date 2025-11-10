/**
 * User Account Service
 * 
 * Business logic for managing hris.user_account
 * Handles employee user accounts across all products (Nexus, Paylinq, etc.)
 * 
 * @module services/userAccountService
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import userAccountRepository from '../repositories/userAccountRepository.js';
import logger from '../utils/logger.js';

class UserAccountService {
  /**
   * Create a new user account for an employee
   * @param {Object} data - User account data
   * @param {string} data.organizationId - Organization UUID
   * @param {string} data.email - User email
   * @param {string} [data.password] - Optional password (if not provided, generates temp password)
   * @param {Object} [data.preferences] - User preferences
   * @param {string} createdBy - User ID creating this account
   * @returns {Promise<Object>} Created user account with temporary password if generated
   */
  async createUserAccount(data, createdBy) {
    // Validate email
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Invalid email address');
    }

    // Check if email already exists
    const existingAccount = await userAccountRepository.findByEmail(
      data.email,
      data.organizationId
    );

    if (existingAccount) {
      throw new Error(`User account with email ${data.email} already exists`);
    }

    // Generate or validate password
    let password = data.password;
    let isTemporaryPassword = false;

    if (!password) {
      password = this.generateTemporaryPassword();
      isTemporaryPassword = true;
    } else {
      this.validatePassword(password);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user account
    const accountData = {
      organizationId: data.organizationId,
      email: data.email,
      passwordHash,
      accountStatus: isTemporaryPassword ? 'pending_activation' : 'active',
      isActive: true,
      preferences: data.preferences || {}
    };

    const userAccount = await userAccountRepository.create(accountData, createdBy);

    logger.info('User account created', {
      userAccountId: userAccount.id,
      email: userAccount.email,
      organizationId: data.organizationId,
      isTemporaryPassword
    });

    // Return account with temporary password if generated
    if (isTemporaryPassword) {
      return {
        ...userAccount,
        temporaryPassword: password,
        requiresPasswordChange: true
      };
    }

    return userAccount;
  }

  /**
   * Link user account to employee
   * @param {string} userAccountId - User account UUID
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} updatedBy - User ID performing the update
   * @returns {Promise<boolean>} Success status
   */
  async linkUserAccountToEmployee(userAccountId, employeeId, organizationId, updatedBy) {
    const { query } = await import('../config/database.js');

    try {
      await query(
        `UPDATE hris.employee 
         SET user_account_id = $1,
             updated_by = $2,
             updated_at = NOW()
         WHERE id = $3 
           AND organization_id = $4 
           AND deleted_at IS NULL`,
        [userAccountId, updatedBy, employeeId, organizationId],
        organizationId,
        { operation: 'UPDATE', table: 'hris.employee', userId: updatedBy }
      );

      logger.info('User account linked to employee', {
        userAccountId,
        employeeId,
        organizationId
      });

      return true;
    } catch (error) {
      logger.error('Error linking user account to employee', {
        error: error.message,
        userAccountId,
        employeeId
      });
      throw error;
    }
  }

  /**
   * Unlink user account from employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} updatedBy - User ID performing the update
   * @returns {Promise<boolean>} Success status
   */
  async unlinkUserAccountFromEmployee(employeeId, organizationId, updatedBy) {
    const { query } = await import('../config/database.js');

    try {
      await query(
        `UPDATE hris.employee 
         SET user_account_id = NULL,
             updated_by = $1,
             updated_at = NOW()
         WHERE id = $2 
           AND organization_id = $3 
           AND deleted_at IS NULL`,
        [updatedBy, employeeId, organizationId],
        organizationId,
        { operation: 'UPDATE', table: 'hris.employee', userId: updatedBy }
      );

      logger.info('User account unlinked from employee', {
        employeeId,
        organizationId
      });

      return true;
    } catch (error) {
      logger.error('Error unlinking user account from employee', {
        error: error.message,
        employeeId
      });
      throw error;
    }
  }

  /**
   * Get user account by ID
   * @param {string} id - User account UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} User account or null
   */
  async getUserAccountById(id, organizationId) {
    return userAccountRepository.findById(id, organizationId);
  }

  /**
   * Get user account by email
   * @param {string} email - Email address
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} User account or null
   */
  async getUserAccountByEmail(email, organizationId) {
    return userAccountRepository.findByEmail(email, organizationId);
  }

  /**
   * Get user account for employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} User account or null
   */
  async getUserAccountByEmployeeId(employeeId, organizationId) {
    return userAccountRepository.findByEmployeeId(employeeId, organizationId);
  }

  /**
   * Update user account
   * @param {string} id - User account UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} updatedBy - User ID performing update
   * @returns {Promise<Object|null>} Updated user account or null
   */
  async updateUserAccount(id, updates, organizationId, updatedBy) {
    // Validate email if being updated
    if (updates.email) {
      if (!this.isValidEmail(updates.email)) {
        throw new Error('Invalid email address');
      }

      // Check if email already exists (excluding current account)
      const emailExists = await userAccountRepository.emailExists(
        updates.email,
        organizationId,
        id
      );

      if (emailExists) {
        throw new Error(`Email ${updates.email} is already in use`);
      }
    }

    // Hash password if being updated
    if (updates.password) {
      this.validatePassword(updates.password);
      updates.password_hash = await bcrypt.hash(updates.password, 12);
      updates.password_changed_at = new Date();
      delete updates.password;
    }

    return userAccountRepository.update(id, updates, organizationId, updatedBy);
  }

  /**
   * Deactivate user account
   * @param {string} id - User account UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} deletedBy - User ID performing deletion
   * @returns {Promise<Object|null>} Deactivated user account or null
   */
  async deactivateUserAccount(id, organizationId, deletedBy) {
    return userAccountRepository.deactivate(id, organizationId, deletedBy);
  }

  /**
   * Reactivate user account
   * @param {string} id - User account UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} updatedBy - User ID performing reactivation
   * @returns {Promise<Object|null>} Reactivated user account or null
   */
  async reactivateUserAccount(id, organizationId, updatedBy) {
    return userAccountRepository.reactivate(id, organizationId, updatedBy);
  }

  /**
   * Check if email exists
   * @param {string} email - Email address
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<boolean>} True if email exists
   */
  async emailExists(email, organizationId) {
    return userAccountRepository.emailExists(email, organizationId);
  }

  /**
   * Generate a secure temporary password
   * @returns {string} Temporary password
   */
  generateTemporaryPassword() {
    // Generate a 16-character password with mixed case, numbers, and symbols
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }
    
    // Ensure password meets complexity requirements
    if (!this.meetsComplexityRequirements(password)) {
      // Recursively generate until we get a valid password
      return this.generateTemporaryPassword();
    }
    
    return password;
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @throws {Error} If password doesn't meet requirements
   */
  validatePassword(password) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!this.meetsComplexityRequirements(password)) {
      throw new Error(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
    }
  }

  /**
   * Check if password meets complexity requirements
   * @param {string} password - Password to check
   * @returns {boolean} True if password meets requirements
   */
  meetsComplexityRequirements(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if email is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Password hash
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
}

export default new UserAccountService();
