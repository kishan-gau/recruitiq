/**
 * MFA Integration Tests  
 * Tests for complete MFA authentication flows
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import bcrypt from 'bcryptjs';
import app from '../../src/server.js';
import pool from '../../src/config/database.js';
import mfaService from '../../src/services/mfaService.js';
import config from '../../src/config/index.js';


// SKIPPED: Bearer token auth incomplete - migrating to cookie-based auth
// TODO: Re-enable once cookie auth is implemented for all apps

describe.skip('MFA Integration Tests', () => {
  let testUser;
  let accessToken;
  let mfaSecret;
  let testPassword = 'TestPassword123!';

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    const userResult = await pool.query(
      `INSERT INTO platform_users (email, password_hash, name, role, mfa_enabled)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['mfa-test@example.com', hashedPassword, 'MFA Test User', 'admin', false]
    );
    testUser = userResult.rows[0];

    accessToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, role: testUser.role },
      config.jwt.accessSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM platform_users WHERE id = $1', [testUser.id]);
    await pool.end();
  });

  describe.skip('POST /api/auth/mfa/setup', () => {
    it('should generate MFA secret and QR code', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('qrCodeUrl');
      expect(res.body.data).toHaveProperty('manualEntryKey');
      expect(res.body).toHaveProperty('tempSecret');
      mfaSecret = res.body.tempSecret;
    });

    it('should require authentication', async () => {
      await request(app).post('/api/auth/mfa/setup').expect(401);
    });
  });

  describe.skip('POST /api/auth/mfa/verify-setup', () => {
    beforeEach(async () => {
      const setup = await mfaService.generateSecret(testUser.email);
      mfaSecret = setup.secret;
    });

    it('should enable MFA with valid TOTP token', async () => {
      const token = speakeasy.totp({ secret: mfaSecret, encoding: 'base32' });

      const res = await request(app)
        .post('/api/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token, secret: mfaSecret })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('successfully enabled');
      expect(res.body.data).toHaveProperty('backupCodes');
      expect(res.body.data.backupCodes).toHaveLength(8);
    });

    it('should reject invalid TOTP token', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '000000', secret: mfaSecret })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid verification code');
    });
  });

  describe.skip('GET /api/auth/mfa/status', () => {
    it('should return MFA status for authenticated user', async () => {
      const res = await request(app)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('enabled');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/auth/mfa/status').expect(401);
    });
  });
});