/**
 * MFA Service
 * Handles Multi-Factor Authentication (TOTP-based 2FA)
 * 
 * Features:
 * - TOTP secret generation and verification
 * - QR code generation for authenticator apps
 * - Backup codes generation and validation
 * - Rate limiting integration
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

class MFAService {
  /**
   * Generate a new TOTP secret for a user
   * @param {string} userEmail - User's email for QR code label
   * @param {string} issuer - Application name (default: RecruitIQ)
   * @returns {Object} { secret: string, qrCodeUrl: string, manualEntryKey: string }
   */
  async generateSecret(userEmail, issuer = 'RecruitIQ') {
    try {
      // Generate secret using speakeasy
      const secret = speakeasy.generateSecret({
        name: `${issuer} (${userEmail})`,
        issuer: issuer,
        length: 32, // 256-bit secret for better security
      });

      // Generate QR code as data URL
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32, // Base32 encoded secret for storage
        qrCodeUrl: qrCodeUrl, // Data URL for displaying QR code
        manualEntryKey: secret.base32, // For manual entry in authenticator app
        otpauthUrl: secret.otpauth_url, // Full otpauth URL
      };
    } catch (_error) {
      logger.error('Error generating MFA secret:', error);
      throw new Error('Failed to generate MFA secret');
    }
  }

  /**
   * Verify a TOTP token against a secret
   * @param {string} token - 6-digit TOTP token from user
   * @param {string} secret - Base32 encoded secret
   * @param {number} window - Time step window for validation (default: 1 = ±30 seconds)
   * @returns {boolean} True if token is valid
   */
  verifyToken(token, secret, window = 1) {
    try {
      // Remove spaces and validate format
      const cleanToken = token.replace(/\s/g, '');
      
      if (!/^\d{6}$/.test(cleanToken)) {
        logger.warn('Invalid TOTP token format');
        return false;
      }

      // Verify token using speakeasy
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: cleanToken,
        window: window, // Allow ±30 seconds time drift
      });

      return verified;
    } catch (_error) {
      logger.error('Error verifying MFA token:', error);
      return false;
    }
  }

  /**
   * Generate backup codes for account recovery
   * @param {number} count - Number of backup codes to generate (default: 8)
   * @returns {Promise<Object>} { codes: string[], hashedCodes: string[] }
   */
  async generateBackupCodes(count = 8) {
    try {
      const codes = [];
      const hashedCodes = [];

      for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric code
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);

        // Hash the code for secure storage
        const hashedCode = await bcrypt.hash(code, 10);
        // Store as JSONB object with code and used status
        hashedCodes.push({ code: hashedCode, used: false });
      }

      return {
        codes, // Plain codes to show user once
        hashedCodes, // JSONB array of {code, used} objects to store in database
      };
    } catch (_error) {
      logger.error('Error generating backup codes:', error);
      throw new Error('Failed to generate backup codes');
    }
  }

  /**
   * Verify a backup code against stored hashed codes
   * @param {string} code - Backup code provided by user
   * @param {Array} hashedCodes - Array of backup code objects from database: [{code: string, used: boolean}, ...]
   * @returns {Promise<number>} Index of matched code, or -1 if not found
   */
  async verifyBackupCode(code, hashedCodes) {
    try {
      const cleanCode = code.replace(/\s/g, '').toUpperCase();

      // Check against each hashed code
      for (let i = 0; i < hashedCodes.length; i++) {
        const codeObj = hashedCodes[i];
        
        // Skip if code is already used
        if (codeObj.used) {
          continue;
        }
        
        // Extract the hashed code string from the object
        const hashedCode = typeof codeObj === 'string' ? codeObj : codeObj.code;
        const isMatch = await bcrypt.compare(cleanCode, hashedCode);
        if (isMatch) {
          return i; // Return index of matched code
        }
      }

      return -1; // No match found
    } catch (_error) {
      logger.error('Error verifying backup code:', error);
      return -1;
    }
  }

  /**
   * Enable MFA for a user
   * @param {string} userId - User ID
   * @param {string} secret - Base32 encoded TOTP secret
   * @param {string[]} hashedBackupCodes - Array of hashed backup codes
   * @returns {Promise<void>}
   */
  async enableMFA(userId, secret, hashedBackupCodes) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE users 
         SET mfa_enabled = true,
             mfa_secret = $1,
             mfa_backup_codes = $2,
             mfa_backup_codes_used = 0,
             mfa_enabled_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [secret, hashedBackupCodes, userId]
      );

      await client.query('COMMIT');
      
      logger.info(`MFA enabled for user: ${userId}`);
    } catch (_error) {
      await client.query('ROLLBACK');
      logger.error('Error enabling MFA:', error);
      throw new Error('Failed to enable MFA');
    } finally {
      client.release();
    }
  }

  /**
   * Disable MFA for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async disableMFA(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE users 
         SET mfa_enabled = false,
             mfa_secret = NULL,
             mfa_backup_codes = NULL,
             mfa_backup_codes_used = 0,
             mfa_enabled_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      await client.query('COMMIT');
      
      logger.info(`MFA disabled for user: ${userId}`);
    } catch (_error) {
      await client.query('ROLLBACK');
      logger.error('Error disabling MFA:', error);
      throw new Error('Failed to disable MFA');
    } finally {
      client.release();
    }
  }

  /**
   * Mark a backup code as used
   * @param {string} userId - User ID
   * @param {number} codeIndex - Index of the backup code that was used
   * @returns {Promise<void>}
   */
  async markBackupCodeUsed(userId, codeIndex) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Mark the backup code as used in JSONB array
      await client.query(
        `UPDATE users 
         SET mfa_backup_codes = jsonb_set(
           mfa_backup_codes,
           ARRAY[$1::text, 'used'],
           'true'::jsonb
         ),
         mfa_backup_codes_used = mfa_backup_codes_used + 1,
         updated_at = NOW()
         WHERE id = $2`,
        [codeIndex.toString(), userId]
      );

      await client.query('COMMIT');
      
      logger.info(`Backup code used for user: ${userId}`);
    } catch (_error) {
      await client.query('ROLLBACK');
      logger.error('Error marking backup code as used:', error);
      throw new Error('Failed to mark backup code as used');
    } finally {
      client.release();
    }
  }

  /**
   * Regenerate backup codes for a user
   * @param {string} userId - User ID
   * @returns {Promise<string[]>} New backup codes (plain text)
   */
  async regenerateBackupCodes(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Generate new backup codes
      const { codes, hashedCodes } = await this.generateBackupCodes();

      // Update user with new backup codes
      await client.query(
        `UPDATE users 
         SET mfa_backup_codes = $1::jsonb,
             mfa_backup_codes_used = 0,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(hashedCodes), userId]
      );

      await client.query('COMMIT');
      
      logger.info(`Backup codes regenerated for user: ${userId}`);
      
      return codes; // Return plain codes to show user
    } catch (_error) {
      await client.query('ROLLBACK');
      logger.error('Error regenerating backup codes:', error);
      throw new Error('Failed to regenerate backup codes');
    } finally {
      client.release();
    }
  }

  /**
   * Get MFA status for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { enabled: boolean, backupCodesRemaining: number }
   */
  async getMFAStatus(userId) {
    try {
      const result = await pool.query(
        `SELECT mfa_enabled, 
                mfa_backup_codes,
                mfa_backup_codes_used,
                mfa_enabled_at
         FROM users 
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      const backupCodesRemaining = user.mfa_backup_codes 
        ? user.mfa_backup_codes.length 
        : 0;

      return {
        enabled: user.mfa_enabled,
        backupCodesRemaining,
        backupCodesUsed: user.mfa_backup_codes_used || 0,
        enabledAt: user.mfa_enabled_at,
      };
    } catch (_error) {
      logger.error('Error getting MFA status:', error);
      throw new Error('Failed to get MFA status');
    }
  }

  /**
   * Check if user has MFA enabled (used in authentication flow)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { mfaEnabled: boolean, mfaSecret: string|null }
   */
  async checkMFARequired(userId) {
    try {
      const result = await pool.query(
        `SELECT mfa_enabled, mfa_secret 
         FROM users 
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return { mfaEnabled: false, mfaSecret: null };
      }

      return {
        mfaEnabled: result.rows[0].mfa_enabled,
        mfaSecret: result.rows[0].mfa_secret,
      };
    } catch (_error) {
      logger.error('Error checking MFA requirement:', error);
      return { mfaEnabled: false, mfaSecret: null };
    }
  }
}

export default new MFAService();
