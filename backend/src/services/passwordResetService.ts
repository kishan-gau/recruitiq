/**
 * Password Reset Service
 * Handles secure password reset functionality
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, getClient } from '../config/database.js';
import logger from '../utils/logger.js';
import tokenBlacklist from './tokenBlacklist.js';

class PasswordResetService {
  /**
   * Generate a secure password reset token
   * @returns {Object} { token: string, hashedToken: string, expiresAt: Date }
   */
  generateResetToken() {
    try {
      // Generate 32 random bytes (256 bits)
      const token = crypto.randomBytes(32).toString('hex');
      
      // Hash the token for storage (prevents token theft from database breach)
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      
      // Token expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      return {
        token, // Send this to user via email
        hashedToken, // Store this in database
        expiresAt,
      };
    } catch (error) {
      logger.error('Error generating reset token:', error);
      throw new Error('Failed to generate reset token');
    }
  }

  /**
   * Hash a token for lookup
   * @param {string} token - Plain text token
   * @returns {string} Hashed token
   */
  hashToken(token) {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  /**
   * Request password reset (store token in database)
   * @param {string} email - User's email
   * @returns {Promise<Object>} { token: string, expiresAt: Date, userId: string }
   */
  async requestPasswordReset(email) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Find user by email
      const userResult = await client.query(
        'SELECT id, email, name FROM users WHERE email = $1 AND deleted_at IS NULL',
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        // Don't reveal if email exists (security best practice)
        // Still return success but don't send email
        logger.info(`Password reset requested for non-existent email: ${email}`);
        await client.query('COMMIT');
        return { success: true, emailFound: false };
      }

      const user = userResult.rows[0];

      // Generate reset token
      const { token, hashedToken, expiresAt } = this.generateResetToken();

      // Invalidate any existing reset tokens for this user
      await client.query(
        `UPDATE users 
         SET password_reset_token = NULL,
             password_reset_expires_at = NULL
         WHERE id = $1`,
        [user.id]
      );

      // Store new reset token
      await client.query(
        `UPDATE users 
         SET password_reset_token = $1,
             password_reset_expires_at = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [hashedToken, expiresAt, user.id]
      );

      await client.query('COMMIT');

      logger.info(`Password reset token generated for user: ${user.id}`);

      return {
        success: true,
        emailFound: true,
        token, // Plain token to send via email
        expiresAt,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error requesting password reset:', error);
      throw new Error('Failed to request password reset');
    } finally {
      client.release();
    }
  }

  /**
   * Verify password reset token
   * @param {string} token - Reset token from email
   * @returns {Promise<Object>} User data if token is valid
   */
  async verifyResetToken(token) {
    try {
      // Hash the provided token
      const hashedToken = this.hashToken(token);

      // Find user with this token
      const result = await query(
        `SELECT id, email, name, password_reset_token, password_reset_expires_at
         FROM users
         WHERE password_reset_token = $1
         AND deleted_at IS NULL`,
        [hashedToken],
        null,
        { operation: 'SELECT', table: 'users' }
      );

      if (result.rows.length === 0) {
        logger.warn('Invalid password reset token used');
        return { valid: false, error: 'Invalid or expired reset token' };
      }

      const user = result.rows[0];

      // Check if token has expired
      if (new Date() > new Date(user.password_reset_expires_at)) {
        logger.warn(`Expired password reset token used for user: ${user.id}`);
        
        // Clean up expired token
        await query(
          `UPDATE users 
           SET password_reset_token = NULL,
               password_reset_expires_at = NULL
           WHERE id = $1`,
          [user.id],
          null,
          { operation: 'UPDATE', table: 'users' }
        );
        
        return { valid: false, error: 'Reset token has expired. Please request a new one.' };
      }

      return {
        valid: true,
        userId: user.id,
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      logger.error('Error verifying reset token:', error);
      throw new Error('Failed to verify reset token');
    }
  }

  /**
   * Reset password using valid token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async resetPassword(token, newPassword) {
    const client = await getClient();
    
    try {
      // Verify token first
      const verification = await this.verifyResetToken(token);
      
      if (!verification.valid) {
        return {
          success: false,
          error: verification.error,
        };
      }

      const userId = verification.userId;

      await client.query('BEGIN');

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await client.query(
        `UPDATE users 
         SET password_hash = $1,
             password_reset_token = NULL,
             password_reset_expires_at = NULL,
             updated_at = NOW()
         WHERE id = $2`,
        [passwordHash, userId]
      );

      // Invalidate all existing sessions for security
      await tokenBlacklist.blacklistAllUserTokens(userId);

      // Reset failed login attempts
      await client.query(
        `UPDATE users
         SET failed_login_attempts = 0,
             locked_until = NULL
         WHERE id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      logger.info(`Password reset successful for user: ${userId}`);

      return {
        success: true,
        userId,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error resetting password:', error);
      throw new Error('Failed to reset password');
    } finally {
      client.release();
    }
  }

  /**
   * Clean up expired reset tokens (run periodically)
   * @returns {Promise<number>} Number of tokens cleaned up
   */
  async cleanupExpiredTokens() {
    try {
      const result = await query(
        `UPDATE users
         SET password_reset_token = NULL,
             password_reset_expires_at = NULL
         WHERE password_reset_expires_at < NOW()
         AND password_reset_token IS NOT NULL
         RETURNING id`,
        [],
        null,
        { operation: 'UPDATE', table: 'users' }
      );

      const count = result.rowCount;
      if (count > 0) {
        logger.info(`Cleaned up ${count} expired password reset tokens`);
      }

      return count;
    } catch (error) {
      logger.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }

  /**
   * Check if user has recent reset request (rate limiting)
   * @param {string} email - User's email
   * @returns {Promise<Object>} { canRequest: boolean, waitTime: number }
   */
  async canRequestReset(email) {
    try {
      const result = await query(
        `SELECT password_reset_expires_at
         FROM users
         WHERE email = $1
         AND password_reset_expires_at > NOW()
         AND deleted_at IS NULL`,
        [email.toLowerCase()],
        null,
        { operation: 'SELECT', table: 'users' }
      );

      if (result.rows.length > 0) {
        const expiresAt = new Date(result.rows[0].password_reset_expires_at);
        const waitTime = Math.ceil((expiresAt - new Date()) / 1000 / 60); // minutes
        
        return {
          canRequest: false,
          waitTime,
          message: `A reset token was recently sent. Please wait ${waitTime} minutes before requesting again.`,
        };
      }

      return {
        canRequest: true,
      };
    } catch (error) {
      logger.error('Error checking reset request eligibility:', error);
      // Fail open - allow request if check fails
      return { canRequest: true };
    }
  }
}

export default new PasswordResetService();
