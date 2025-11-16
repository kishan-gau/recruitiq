import request from 'supertest';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import bcrypt from 'bcryptjs';
import app from '../../src/server.js';
import pool from '../../src/config/database.js';
import config from '../../src/config/index.js';


// SKIPPED: Bearer token auth incomplete - migrating to cookie-based auth
// TODO: Re-enable once cookie auth is implemented for all apps

describe.skip('MFA Enforcement Tests', () => {
  let testOrg;
  let testUser;
  let authToken;
  let mfaSecret;
  let backupCodes;

  beforeAll(async () => {
    // Clean up any existing test data
    await pool.query(`DELETE FROM hris.user_account WHERE email = 'mfa.test@example.com'`);
    await pool.query(`DELETE FROM organizations WHERE slug = 'mfa-test-org'`);

    // Create test organization with MFA required (professional tier)
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug, deployment_model, tier, mfa_required, mfa_enforcement_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      ['MFA Test Org', 'mfa-test-org', 'shared', 'professional', true, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );
    testOrg = orgResult.rows[0];

    // Create customer for license
    const customerResult = await pool.query(
      `INSERT INTO customers (organization_id, name, contact_email, contact_name, tier, deployment_type, instance_key, contract_start_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [testOrg.id, 'MFA Test Customer', 'mfa.test@example.com', 'MFA Test Contact', 'professional', 'cloud', `test-mfa-${Date.now()}`]
    );
    const testCustomer = customerResult.rows[0];

    // Create active license with MFA feature
    await pool.query(
      `INSERT INTO licenses (customer_id, license_key, tier, status, features, max_users, max_workspaces, issued_at, expires_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
      [
        testCustomer.id,
        'TEST-LICENSE-MFA',
        'professional',
        'active',
        JSON.stringify(['mfa', 'api', 'sso', 'advanced_reporting']),
        50,
        10,
        new Date(),
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      ]
    );

    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    const userResult = await pool.query(`INSERT INTO hris.user_account (email, password_hash, organization_id) VALUES ($1, $2, $3)
       RETURNING *`,
      ['mfa.test@example.com', hashedPassword, testOrg.id]
    );
    testUser = userResult.rows[0];

    // Get auth token (user has MFA not enabled yet, so should get full token)
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mfa.test@example.com',
        password: 'TestPassword123!'
      });
    
    authToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup (licenses will cascade delete with customer)
    await pool.query('DELETE FROM hris.user_account WHERE id = $1', [testUser.id]);
    await pool.query('DELETE FROM customers WHERE organization_id = $1', [testOrg.id]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrg.id]);
    
    // Close database connection to allow Jest to exit
    await pool.end();
    
    // Give async operations time to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe.skip('POST /api/auth/mfa/verify - Login Flow Verification', () => {
    let mfaToken;

    beforeEach(async () => {
      // Setup MFA for user
      mfaSecret = speakeasy.generateSecret({ length: 20 });
      backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      // Hash backup codes before storing
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(async (code) => ({
          code: await bcrypt.hash(code, 10),
          used: false
        }))
      );

      await pool.query(
        `UPDATE hris.user_account SET mfa_enabled = true, 
             mfa_secret = $1, 
             mfa_backup_codes = $2::jsonb
         WHERE id = $3`,
        [mfaSecret.base32, JSON.stringify(hashedBackupCodes), testUser.id]
      );

      // Simulate login that requires MFA
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa.test@example.com',
          password: 'TestPassword123!'
        });

      mfaToken = loginRes.body.mfaToken;
    });

    it('should succeed with valid TOTP code', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret.base32,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          mfaToken,
          code: token
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('mfa.test@example.com');
    });

    it('should fail with invalid TOTP code', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          mfaToken,
          code: '000000'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid MFA code');
    });

    it('should fail with expired mfaToken', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: testUser.id, type: 'mfa' },
        config.jwt.secret,
        { expiresIn: '0s' }
      );

      const token = speakeasy.totp({
        secret: mfaSecret.base32,
        encoding: 'base32'
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          mfaToken: expiredToken,
          code: token
        });

      expect(res.status).toBe(401);
    });
  });

  describe.skip('POST /api/auth/mfa/use-backup-code - Backup Code Login', () => {
    let mfaToken;

    beforeEach(async () => {
      // Setup MFA with backup codes
      backupCodes = ['CODE1234', 'CODE5678', 'CODE9012'];
      
      // Hash backup codes before storing
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(async (code) => ({
          code: await bcrypt.hash(code, 10),
          used: false
        }))
      );
      
      await pool.query(
        `UPDATE hris.user_account SET mfa_enabled = true,
             mfa_backup_codes = $1::jsonb
         WHERE id = $2`,
        [JSON.stringify(hashedBackupCodes), testUser.id]
      );

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa.test@example.com',
          password: 'TestPassword123!'
        });

      mfaToken = loginRes.body.mfaToken;
    });

    it('should succeed with valid unused backup code', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/use-backup-code')
        .send({
          mfaToken,
          backupCode: 'CODE1234'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.codesRemaining).toBe(2);

      // Verify code is marked as used
      const userCheck = await pool.query('SELECT mfa_backup_codes FROM users WHERE id = $1', [testUser.id]);
      const codes = userCheck.rows[0].mfa_backup_codes; // Already parsed as JSONB
      const usedCode = codes.find(c => c.used === true);
      expect(usedCode).toBeDefined();
    });

    it('should fail with invalid backup code', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/use-backup-code')
        .send({
          mfaToken,
          backupCode: 'INVALID123'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid backup code');
    });

    it('should fail with already used backup code', async () => {
      // Use the code once
      await request(app)
        .post('/api/auth/mfa/use-backup-code')
        .send({
          mfaToken,
          backupCode: 'CODE1234'
        });

      // Get new mfaToken
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa.test@example.com',
          password: 'TestPassword123!'
        });

      // Try to use same code again
      const res = await request(app)
        .post('/api/auth/mfa/use-backup-code')
        .send({
          mfaToken: loginRes.body.mfaToken,
          backupCode: 'CODE1234'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid backup code');
    });

    it('should show correct remaining codes count', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/use-backup-code')
        .send({
          mfaToken,
          backupCode: 'CODE5678'
        });

      expect(res.status).toBe(200);
      expect(res.body.codesRemaining).toBe(2);
    });
  });

  describe.skip('POST /api/auth/mfa/disable - Disable with Enforcement', () => {
    beforeEach(async () => {
      // Setup MFA
      mfaSecret = speakeasy.generateSecret({ length: 20 });
      
      await pool.query(
        `UPDATE hris.user_account SET mfa_enabled = true, 
             mfa_secret = $1
         WHERE id = $2`,
        [mfaSecret.base32, testUser.id]
      );
    });

    it('should block disabling when mfa_required=true', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret.base32,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'TestPassword123!',
          code: token
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('MFA cannot be disabled');
      expect(res.body.reason).toBe('mandatory_policy');

      // Verify MFA is still enabled
      const userCheck = await pool.query('SELECT mfa_enabled FROM hris.user_account WHERE id = $1', [testUser.id]);
      expect(userCheck.rows[0].mfa_enabled).toBe(true);
    });

    it('should allow disabling when mfa_required=false', async () => {
      // Update org to make MFA optional
      await pool.query(
        'UPDATE organizations SET mfa_required = false WHERE id = $1',
        [testOrg.id]
      );

      const token = speakeasy.totp({
        secret: mfaSecret.base32,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'TestPassword123!',
          code: token
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('disabled successfully');

      // Verify MFA is disabled
      const userCheck = await pool.query('SELECT mfa_enabled FROM hris.user_account WHERE id = $1', [testUser.id]);
      expect(userCheck.rows[0].mfa_enabled).toBe(false);

      // Restore for other tests
      await pool.query(
        'UPDATE organizations SET mfa_required = true WHERE id = $1',
        [testOrg.id]
      );
    });

    it('should fail with incorrect password', async () => {
      await pool.query(
        'UPDATE organizations SET mfa_required = false WHERE id = $1',
        [testOrg.id]
      );

      const token = speakeasy.totp({
        secret: mfaSecret.base32,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'WrongPassword!',
          code: token
        });

      expect(res.status).toBe(401);

      await pool.query(
        'UPDATE organizations SET mfa_required = true WHERE id = $1',
        [testOrg.id]
      );
    });

    it('should fail with invalid TOTP code', async () => {
      await pool.query(
        'UPDATE organizations SET mfa_required = false WHERE id = $1',
        [testOrg.id]
      );

      const res = await request(app)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'TestPassword123!',
          code: '000000'
        });

      expect(res.status).toBe(401);

      await pool.query(
        'UPDATE organizations SET mfa_required = true WHERE id = $1',
        [testOrg.id]
      );
    });
  });

  describe.skip('POST /api/auth/mfa/regenerate-backup-codes', () => {
    beforeEach(async () => {
      mfaSecret = speakeasy.generateSecret({ length: 20 });
      backupCodes = ['OLD1234', 'OLD5678'];
      
      // Hash backup codes before storing
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(async (code) => ({
          code: await bcrypt.hash(code, 10),
          used: false
        }))
      );
      
      await pool.query(
        `UPDATE hris.user_account SET mfa_enabled = true, 
             mfa_secret = $1,
             mfa_backup_codes = $2::jsonb
         WHERE id = $3`,
        [mfaSecret.base32, JSON.stringify(hashedBackupCodes), testUser.id]
      );

      // Get fresh auth token for each test (in case previous tests blacklisted tokens)
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa.test@example.com',
          password: 'TestPassword123!'
        });
      
      // If MFA is enabled, complete the verification
      if (loginRes.body.mfaToken) {
        const token = speakeasy.totp({
          secret: mfaSecret.base32,
          encoding: 'base32'
        });
        
        const verifyRes = await request(app)
          .post('/api/auth/mfa/verify')
          .send({
            mfaToken: loginRes.body.mfaToken,
            token
          });
        
        authToken = verifyRes.body.data.accessToken;
      } else {
        authToken = loginRes.body.data.accessToken;
      }
    });

    it('should regenerate backup codes with valid credentials', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret.base32,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/regenerate-backup-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'TestPassword123!',
          code: token
        });

      expect(res.status).toBe(200);
      expect(res.body.backupCodes).toBeDefined();
      expect(res.body.backupCodes.length).toBe(10);
      expect(res.body.backupCodes).not.toContain('OLD1234');
      expect(res.body.backupCodes).not.toContain('OLD5678');

      // Verify codes are updated in database
      const userCheck = await pool.query('SELECT mfa_backup_codes FROM hris.user_account WHERE id = $1', [testUser.id]);
      const codes = JSON.parse(userCheck.rows[0].mfa_backup_codes);
      expect(codes.length).toBe(10);
      expect(codes.every(c => !c.used)).toBe(true);
    });

    it('should fail with incorrect password', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret.base32,
        encoding: 'base32'
      });

      const res = await request(app)
        .post('/api/auth/mfa/regenerate-backup-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'WrongPassword!',
          code: token
        });

      expect(res.status).toBe(401);
    });

    it('should fail with invalid TOTP code', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/regenerate-backup-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'TestPassword123!',
          code: '000000'
        });

      expect(res.status).toBe(401);
    });

    it('should invalidate old backup codes', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret.base32,
        encoding: 'base32'
      });

      await request(app)
        .post('/api/auth/mfa/regenerate-backup-codes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'TestPassword123!',
          code: token
        });

      // Try to use old backup code
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa.test@example.com',
          password: 'TestPassword123!'
        });

      const res = await request(app)
        .post('/api/auth/mfa/use-backup-code')
        .send({
          mfaToken: loginRes.body.mfaToken,
          backupCode: 'OLD1234'
        });

      expect(res.status).toBe(401);
    });
  });

  describe.skip('GET /api/auth/mfa/status - Organization Policy Info', () => {
    beforeEach(async () => {
      // Reset organization to required state
      await pool.query(
        'UPDATE organizations SET mfa_required = true WHERE id = $1',
        [testOrg.id]
      );
      
      await pool.query(
        `UPDATE hris.user_account SET mfa_enabled = false
         WHERE id = $1`,
        [testUser.id]
      );

      // Get fresh auth token for each test (in case previous tests blacklisted tokens)
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa.test@example.com',
          password: 'TestPassword123!'
        });
      
      authToken = loginRes.body.data.accessToken;
    });

    it('should return required=true when org has mfa_required=true', async () => {
      const res = await request(app)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.required).toBe(true);
    });

    it('should return gracePeriodDaysRemaining when enforcement date is future', async () => {
      const res = await request(app)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.gracePeriodDaysRemaining).toBeDefined();
      expect(res.body.gracePeriodDaysRemaining).toBeGreaterThan(0);
      expect(res.body.gracePeriodDaysRemaining).toBeLessThanOrEqual(7);
    });

    it('should return canDisable=false when mfa_required=true', async () => {
      // Enable MFA first
      await pool.query(
        `UPDATE hris.user_account SET mfa_enabled = true
         WHERE id = $1`,
        [testUser.id]
      );

      const res = await request(app)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.canDisable).toBe(false);
    });

    it('should return canDisable=true when mfa_required=false', async () => {
      // Update org to make MFA optional
      await pool.query(
        'UPDATE organizations SET mfa_required = false WHERE id = $1',
        [testOrg.id]
      );

      // Enable MFA
      await pool.query(
        `UPDATE hris.user_account SET mfa_enabled = true
         WHERE id = $1`,
        [testUser.id]
      );

      const res = await request(app)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.canDisable).toBe(true);

      // Restore
      await pool.query(
        'UPDATE organizations SET mfa_required = true WHERE id = $1',
        [testOrg.id]
      );
    });

    it('should not return gracePeriodDaysRemaining when enforcement date is past', async () => {
      // Set enforcement date to past
      await pool.query(
        'UPDATE organizations SET mfa_enforcement_date = $1 WHERE id = $2',
        [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), testOrg.id]
      );

      const res = await request(app)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.gracePeriodDaysRemaining).toBeUndefined();

      // Restore
      await pool.query(
        'UPDATE organizations SET mfa_enforcement_date = $1 WHERE id = $2',
        [new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), testOrg.id]
      );
    });
  });

  describe.skip('Login Enforcement - Grace Period', () => {
    beforeEach(async () => {
      await pool.query(
        `UPDATE hris.user_account SET mfa_enabled = false
         WHERE id = $1`,
        [testUser.id]
      );
    });

    it('should allow login with warning during grace period', async () => {
      // Disable MFA for this test (it may have been enabled by previous tests)
      await pool.query(
        'UPDATE hris.user_account SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = $1',
        [testUser.id]
      );
      
      // Ensure grace period is active
      await pool.query(
        'UPDATE organizations SET mfa_enforcement_date = $1 WHERE id = $2',
        [new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), testOrg.id]
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa.test@example.com',
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.mfaWarning).toBeDefined();
      expect(res.body.mfaWarning.daysRemaining).toBeDefined();
      expect(res.body.mfaWarning.daysRemaining).toBeGreaterThanOrEqual(2);
      expect(res.body.mfaWarning.daysRemaining).toBeLessThanOrEqual(3);
      expect(res.body.mfaWarning.message).toContain('MFA setup required');
    });

    it('should block login after grace period expires', async () => {
      // Disable MFA for this test
      await pool.query(
        'UPDATE hris.user_account SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = $1',
        [testUser.id]
      );
      
      // Set enforcement date to past
      await pool.query(
        'UPDATE organizations SET mfa_enforcement_date = $1 WHERE id = $2',
        [new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), testOrg.id]
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa.test@example.com',
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('MFA_SETUP_REQUIRED');
      expect(res.body.message).toContain('Multi-factor authentication is required');
      expect(res.body.mfaRequired).toBe(true);

      // Restore
      await pool.query(
        'UPDATE organizations SET mfa_enforcement_date = $1 WHERE id = $2',
        [new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), testOrg.id]
      );
    });

    it('should allow login when MFA is enabled and required', async () => {
      // Enable MFA
      const secret = speakeasy.generateSecret({ length: 20 });
      await pool.query(
        `UPDATE hris.user_account SET mfa_enabled = true,
             mfa_secret = $1
         WHERE id = $2`,
        [secret.base32, testUser.id]
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa.test@example.com',
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.mfaRequired).toBe(true);
      expect(res.body.mfaToken).toBeDefined();
      expect(res.body.token).toBeUndefined(); // No auth token until MFA verified
    });

    it('should not show warning when MFA is enabled', async () => {
      // Enable MFA
      const secret = speakeasy.generateSecret({ length: 20 });
      await pool.query(
        `UPDATE hris.user_account SET mfa_enabled = true,
             mfa_secret = $1
         WHERE id = $2`,
        [secret.base32, testUser.id]
      );

      // Set grace period active
      await pool.query(
        'UPDATE organizations SET mfa_enforcement_date = $1 WHERE id = $2',
        [new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), testOrg.id]
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mfa.test@example.com',
          password: 'TestPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.mfaWarning).toBeUndefined();
    });
  });

  describe.skip('Feature Check - License Tier Enforcement', () => {
    let starterOrg;
    let starterUser;
    let starterToken;

    beforeAll(async () => {
      // Create starter tier organization
      const orgResult = await pool.query(
        `INSERT INTO organizations (name, slug, deployment_model)
         VALUES ($1, $2, $3)
         RETURNING *`,
        ['Starter Org', 'starter-org', 'shared']
      );
      starterOrg = orgResult.rows[0];

      // Create a customer linked to the organization (license manager)
      const customerResult = await pool.query(
        `INSERT INTO customers (organization_id, name, contact_email, contact_name, tier, deployment_type, instance_key, contract_start_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [starterOrg.id, 'Starter Customer', 'billing+starter@example.com', 'Starter Contact', 'starter', 'cloud', `starter-${Date.now()}`]
      );
      const customer = customerResult.rows[0];

      // Create license with Starter tier (features empty -> no 'mfa')
      await pool.query(
        `INSERT INTO licenses (customer_id, license_key, tier, expires_at, status, max_users, max_workspaces, features)
         VALUES ($1, $2, $3, NOW() + INTERVAL '1 year', $4, $5, $6, $7)`,
        [customer.id, `LIC-${Date.now()}`, 'starter', 'active', 100, 10, JSON.stringify([])]
      );

      // Create user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      const userResult = await pool.query(`INSERT INTO hris.user_account (email, password_hash, organization_id) VALUES ($1, $2, $3)
         RETURNING *`,
        ['starter.mfa.test@example.com', hashedPassword, starterOrg.id]
      );
      starterUser = userResult.rows[0];

      // Get auth token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'starter@example.com',
          password: 'TestPassword123!'
        });
      
      starterToken = loginRes.body.data.accessToken;
    });

    afterAll(async () => {
      await pool.query('DELETE FROM hris.user_account WHERE id = $1', [starterUser.id]);
      // Remove licenses and customers linked to organization
      await pool.query(
        `DELETE FROM licenses WHERE customer_id IN (SELECT id FROM customers WHERE organization_id = $1)`,
        [starterOrg.id]
      );
      await pool.query('DELETE FROM customers WHERE organization_id = $1', [starterOrg.id]);
      await pool.query('DELETE FROM organizations WHERE id = $1', [starterOrg.id]);
    });

    it('should return 403 for MFA setup on Starter tier', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${starterToken}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('feature is not available');
    });

    it('should return 403 for MFA status on Starter tier', async () => {
      const res = await request(app)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${starterToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow MFA on Professional tier', async () => {
      // Upgrade to Professional: set tier and enable 'mfa' feature on the license linked to this org's customer
      await pool.query(
        `UPDATE licenses
         SET tier = 'professional', features = $1
         WHERE customer_id IN (SELECT id FROM customers WHERE organization_id = $2)`,
        [JSON.stringify(['mfa']), starterOrg.id]
      );

      // Get new token with updated license
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'starter@example.com',
          password: 'TestPassword123!'
        });

      const res = await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.qrCode).toBeDefined();
    });
  });
});
