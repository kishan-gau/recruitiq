/**
 * MFA Integration Tests
 * Tests for complete MFA authentication flows
 */

const request = require('supertest');
const app = require('../../server');
const pool = require('../../config/database');
const mfaService = require('../../services/mfaService');
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');
const config = require('../../config');

describe('MFA Integration Tests', () => {
  let testUser;
  let accessToken;
  let mfaSecret;

  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, user_type, mfa_enabled)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        'mfa-test@example.com',
        '$2a$10$test.hash',
        'MFA Test User',
        'platform',
        false
      ]
    );
    testUser = userResult.rows[0];

    // Generate access token for authenticated requests
    accessToken = jwt.sign(
      {
        userId: testUser.id,
        email: testUser.email,
        userType: testUser.user_type,
      },
      config.jwt.accessSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    await pool.end();
  });

  describe('POST /api/auth/mfa/setup', () => {
    it('should generate MFA secret and QR code', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('qrCodeUrl');
      expect(res.body.data).toHaveProperty('manualEntryKey');
      expect(res.body).toHaveProperty('tempSecret');

      // Store secret for next tests
      mfaSecret = res.body.tempSecret;
    });

    it('should reject if MFA already enabled', async () => {
      // Enable MFA for user
      await pool.query(
        'UPDATE users SET mfa_enabled = true WHERE id = $1',
        [testUser.id]
      );

      const res = await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already enabled');

      // Reset for other tests
      await pool.query(
        'UPDATE users SET mfa_enabled = false WHERE id = $1',
        [testUser.id]
      );
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/auth/mfa/setup')
        .expect(401);
    });
  });

  describe('POST /api/auth/mfa/verify-setup', () => {
    beforeEach(async () => {
      // Generate new secret
      const setup = await mfaService.generateSecret(testUser.email);
      mfaSecret = setup.secret;
    });

    it('should enable MFA with valid TOTP token', async () => {
      // Generate valid token
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token,
          secret: mfaSecret
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('successfully enabled');
      expect(res.body.data).toHaveProperty('backupCodes');
      expect(res.body.data.backupCodes).toHaveLength(8);

      // Verify database update
      const userCheck = await pool.query(
        'SELECT mfa_enabled, mfa_secret FROM users WHERE id = $1',
        [testUser.id]
      );
      expect(userCheck.rows[0].mfa_enabled).toBe(true);
      expect(userCheck.rows[0].mfa_secret).toBe(mfaSecret);
    });

    it('should reject invalid TOTP token', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          token: '000000',
          secret: mfaSecret
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid verification code');
    });

    it('should require token and secret', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(res.body.message).toContain('required');
    });
  });

  describe('MFA Login Flow', () => {
    let loginMfaToken;

    beforeEach(async () => {
      // Setup: Enable MFA for user
      const { codes, hashedCodes } = await mfaService.generateBackupCodes();
      const secret = speakeasy.generateSecret({ length: 32 });
      mfaSecret = secret.base32;

      await pool.query(
        `UPDATE users 
         SET mfa_enabled = true,
             mfa_secret = $1,
             mfa_backup_codes = $2,
             password_hash = $3
         WHERE id = $4`,
        [mfaSecret, hashedCodes, '$2a$10$' + 'X'.repeat(53), testUser.id]
      );
    });

    afterEach(async () => {
      // Cleanup: Disable MFA
      await pool.query(
        'UPDATE users SET mfa_enabled = false, mfa_secret = NULL WHERE id = $1',
        [testUser.id]
      );
    });

    it('should return mfaRequired flag on login with MFA enabled', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'test-password'
        })
        .expect(200);

      expect(res.body.mfaRequired).toBe(true);
      expect(res.body).toHaveProperty('mfaToken');
      expect(res.body).not.toHaveProperty('accessToken');

      loginMfaToken = res.body.mfaToken;
    });

    it('should complete login with valid TOTP token', async () => {
      // First, get MFA token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'test-password'
        });

      loginMfaToken = loginRes.body.mfaToken;

      // Generate valid TOTP
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      // Verify MFA
      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          mfaToken: loginMfaToken,
          token
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('successful');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data).toHaveProperty('user');
    });

    it('should reject invalid TOTP during login', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'test-password'
        });

      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          mfaToken: loginRes.body.mfaToken,
          token: '000000'
        })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid verification code');
    });

    it('should reject expired MFA token', async () => {
      // Create expired MFA token
      const expiredToken = jwt.sign(
        { userId: testUser.id, type: 'mfa_pending' },
        config.jwt.accessSecret,
        { expiresIn: '-1m' }
      );

      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          mfaToken: expiredToken,
          token: '123456'
        })
        .expect(401);

      expect(res.body.message).toContain('expired');
    });
  });

  describe('POST /api/auth/mfa/use-backup-code', () => {
    let backupCodes;
    let mfaToken;

    beforeEach(async () => {
      // Enable MFA with backup codes
      const { codes, hashedCodes } = await mfaService.generateBackupCodes();
      backupCodes = codes;

      await pool.query(
        `UPDATE users 
         SET mfa_enabled = true,
             mfa_backup_codes = $1
         WHERE id = $2`,
        [hashedCodes, testUser.id]
      );

      // Get MFA token
      mfaToken = jwt.sign(
        { userId: testUser.id, type: 'mfa_pending' },
        config.jwt.accessSecret,
        { expiresIn: '5m' }
      );
    });

    it('should complete login with valid backup code', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/use-backup-code')
        .send({
          mfaToken,
          backupCode: backupCodes[0]
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('accepted');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.warning).toContain('backup codes remaining');
    });

    it('should reject invalid backup code', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/use-backup-code')
        .send({
          mfaToken,
          backupCode: 'FFFFFFFF'
        })
        .expect(401);

      expect(res.body.message).toContain('Invalid backup code');
    });

    it('should reject already used backup code', async () => {
      // Use first code
      await request(app)
        .post('/api/auth/mfa/use-backup-code')
        .send({
          mfaToken,
          backupCode: backupCodes[0]
        })
        .expect(200);

      // Try to use same code again
      const newMfaToken = jwt.sign(
        { userId: testUser.id, type: 'mfa_pending' },
        config.jwt.accessSecret,
        { expiresIn: '5m' }
      );

      const res = await request(app)
        .post('/api/auth/mfa/use-backup-code')
        .send({
          mfaToken: newMfaToken,
          backupCode: backupCodes[0]
        })
        .expect(401);

      expect(res.body.message).toContain('Invalid backup code');
    });
  });

  describe('POST /api/auth/mfa/disable', () => {
    beforeEach(async () => {
      // Enable MFA
      const secret = speakeasy.generateSecret({ length: 32 });
      mfaSecret = secret.base32;

      await pool.query(
        `UPDATE users 
         SET mfa_enabled = true,
             mfa_secret = $1,
             password_hash = $2
         WHERE id = $3`,
        [mfaSecret, '$2a$10$' + 'X'.repeat(53), testUser.id]
      );
    });

    it('should disable MFA with valid password and token', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'test-password',
          token
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('disabled');

      // Verify database update
      const userCheck = await pool.query(
        'SELECT mfa_enabled FROM users WHERE id = $1',
        [testUser.id]
      );
      expect(userCheck.rows[0].mfa_enabled).toBe(false);
    });

    it('should reject with invalid password', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'wrong-password',
          token
        })
        .expect(401);

      expect(res.body.message).toContain('Invalid password');
    });

    it('should reject with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'test-password',
          token: '000000'
        })
        .expect(401);

      expect(res.body.message).toContain('Invalid verification code');
    });
  });

  describe('GET /api/auth/mfa/status', () => {
    it('should return MFA status for authenticated user', async () => {
      const res = await request(app)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('enabled');
      expect(res.body.data).toHaveProperty('backupCodesRemaining');
      expect(res.body.data).toHaveProperty('backupCodesUsed');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/auth/mfa/status')
        .expect(401);
    });
  });
});
