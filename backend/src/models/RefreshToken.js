import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

class RefreshToken {
  /**
   * Create a new refresh token with optional device/session metadata
   */
  static async create(userId, token, expiresAt, metadata = {}) {
    const id = uuidv4();
    
    // Extract device info from metadata
    const { 
      userAgent = null, 
      ipAddress = null,
      deviceFingerprint = null,
      deviceName = null 
    } = metadata;

    const query = `
      INSERT INTO refresh_tokens (
        id, user_id, token, expires_at, 
        user_agent, ip_address, device_fingerprint, device_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, token, expires_at, created_at, 
                user_agent, ip_address, device_fingerprint, device_name
    `;

    const result = await db.query(query, [
      id, userId, token, expiresAt,
      userAgent, ipAddress, deviceFingerprint, deviceName
    ]);
    return result.rows[0];
  }

  /**
   * Find token by value
   */
  static async findByToken(token) {
    const query = `
      SELECT rt.*, u.organization_id
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token = $1 
        AND rt.revoked_at IS NULL 
        AND rt.expires_at > NOW()
        AND u.deleted_at IS NULL
    `;
    
    const result = await db.query(query, [token]);
    return result.rows[0];
  }

  /**
   * Revoke a token
   */
  static async revoke(token) {
    const query = `
      UPDATE refresh_tokens 
      SET revoked_at = NOW()
      WHERE token = $1
    `;
    await db.query(query, [token]);
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllForUser(userId) {
    const query = `
      UPDATE refresh_tokens 
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
    `;
    await db.query(query, [userId]);
  }

  /**
   * Rotate a refresh token (revoke old, create new)
   * Implements token rotation security pattern
   */
  static async rotate(oldToken, userId, newToken, expiresAt, metadata = {}) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Revoke the old token
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by_token = $1 WHERE token = $2',
        [newToken, oldToken]
      );

      // Create new token with same session metadata
      const id = uuidv4();
      const { userAgent, ipAddress, deviceFingerprint, deviceName } = metadata;
      
      const insertResult = await client.query(
        `INSERT INTO refresh_tokens (
          id, user_id, token, expires_at,
          user_agent, ip_address, device_fingerprint, device_name
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [id, userId, newToken, expiresAt, userAgent, ipAddress, deviceFingerprint, deviceName]
      );

      await client.query('COMMIT');
      return insertResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getActiveSessions(userId) {
    const query = `
      SELECT 
        id,
        token,
        created_at,
        expires_at,
        last_used_at,
        user_agent,
        ip_address,
        device_name,
        device_fingerprint,
        CASE 
          WHEN last_used_at > NOW() - INTERVAL '5 minutes' THEN true
          ELSE false
        END as is_current
      FROM refresh_tokens
      WHERE user_id = $1 
        AND revoked_at IS NULL 
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Count active sessions for a user
   */
  static async countActiveSessions(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM refresh_tokens
      WHERE user_id = $1 
        AND revoked_at IS NULL 
        AND expires_at > NOW()
    `;
    
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Revoke a specific session by token ID
   */
  static async revokeSession(userId, tokenId) {
    const query = `
      UPDATE refresh_tokens 
      SET revoked_at = NOW()
      WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
      RETURNING id
    `;
    const result = await db.query(query, [tokenId, userId]);
    return result.rows[0];
  }

  /**
   * Update last used timestamp for a token
   */
  static async updateLastUsed(token) {
    const query = `
      UPDATE refresh_tokens 
      SET last_used_at = NOW()
      WHERE token = $1
    `;
    await db.query(query, [token]);
  }

  /**
   * Delete expired tokens (cleanup)
   */
  static async deleteExpired() {
    const query = `
      DELETE FROM refresh_tokens 
      WHERE expires_at < NOW() - INTERVAL '30 days'
    `;
    await db.query(query);
  }

  /**
   * Enforce session limit per user (keep only N most recent sessions)
   */
  static async enforceSessionLimit(userId, maxSessions = 5) {
    const query = `
      WITH ranked_sessions AS (
        SELECT id, 
               ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
        FROM refresh_tokens
        WHERE user_id = $1 
          AND revoked_at IS NULL 
          AND expires_at > NOW()
      )
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE id IN (
        SELECT id FROM ranked_sessions WHERE rn > $2
      )
      RETURNING id
    `;
    
    const result = await db.query(query, [userId, maxSessions]);
    return result.rows.length; // Return count of revoked sessions
  }

  /**
   * Generate device fingerprint from request metadata
   */
  static generateDeviceFingerprint(userAgent, ipAddress) {
    const data = `${userAgent}:${ipAddress}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  /**
   * Parse user agent to get device name
   */
  static parseDeviceName(userAgent) {
    if (!userAgent) return 'Unknown Device';
    
    // Simple device detection
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    
    return 'Unknown Device';
  }
}

export default RefreshToken;
