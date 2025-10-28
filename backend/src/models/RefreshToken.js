import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class RefreshToken {
  /**
   * Create a new refresh token
   */
  static async create(userId, token, expiresAt) {
    const id = uuidv4();

    const query = `
      INSERT INTO refresh_tokens (id, user_id, token, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, token, expires_at, created_at
    `;

    const result = await db.query(query, [id, userId, token, expiresAt]);
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
   * Delete expired tokens (cleanup)
   */
  static async deleteExpired() {
    const query = `
      DELETE FROM refresh_tokens 
      WHERE expires_at < NOW() - INTERVAL '30 days'
    `;
    await db.query(query);
  }
}

export default RefreshToken;
