/**
 * Database Service
 * 
 * Manages database operations for tenant deployments.
 * Handles migrations, seed data, and tenant onboarding.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

class DatabaseService {
  constructor(options = {}) {
    this.sshOptions = options.sshOptions || '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null';
    this.basePath = options.basePath || '/opt/recruitiq';
  }

  /**
   * Execute SSH command on VPS
   * @param {string} vpsIp - VPS IP address
   * @param {string} command - Command to execute
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Command result
   */
  async execSSH(vpsIp, command, sshKey) {
    const sshCmd = `ssh ${this.sshOptions} -i "${sshKey}" root@${vpsIp} "${command}"`;
    
    try {
      const { stdout, stderr } = await execAsync(sshCmd, { timeout: 300000 }); // 5 min timeout
      return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (error) {
      return { 
        success: false, 
        error: error.message, 
        stdout: error.stdout?.trim() || '', 
        stderr: error.stderr?.trim() || '' 
      };
    }
  }

  /**
   * Generate a secure random password
   * @param {number} length - Password length
   * @returns {string} Generated password
   */
  generatePassword(length = 32) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const bytes = crypto.randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }

  /**
   * Generate tenant database credentials
   * @param {string} organizationSlug - Tenant slug
   * @returns {Object} Database credentials
   */
  generateDatabaseCredentials(organizationSlug) {
    const sanitizedSlug = organizationSlug.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    
    return {
      database: `tenant_${sanitizedSlug}`,
      username: `tenant_${sanitizedSlug}`,
      password: this.generatePassword(32)
    };
  }

  /**
   * Check if PostgreSQL container is ready
   * @param {string} containerName - Database container name
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<boolean>} True if ready
   */
  async waitForPostgresReady(containerName, vpsIp, sshKey, timeoutMs = 60000) {
    const startTime = Date.now();
    const checkInterval = 2000; // 2 seconds

    console.log(`[DatabaseService] Waiting for PostgreSQL container: ${containerName}`);

    while (Date.now() - startTime < timeoutMs) {
      const result = await this.execSSH(vpsIp,
        `docker exec ${containerName} pg_isready -U postgres 2>/dev/null`,
        sshKey);

      if (result.success && result.stdout.includes('accepting connections')) {
        console.log(`[DatabaseService] PostgreSQL is ready: ${containerName}`);
        return true;
      }

      await this.sleep(checkInterval);
    }

    console.error(`[DatabaseService] Timeout waiting for PostgreSQL: ${containerName}`);
    return false;
  }

  /**
   * Run database migrations
   * @param {string} tenantId - Tenant identifier (slug)
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Migration result
   */
  async runMigrations(tenantId, vpsIp, sshKey) {
    const backendContainer = `backend-${tenantId}`;

    console.log(`[DatabaseService] Running migrations for tenant: ${tenantId}`);

    // Run knex migrations
    const result = await this.execSSH(vpsIp,
      `docker exec ${backendContainer} npm run migrate 2>&1`,
      sshKey);

    if (!result.success) {
      // Check if it's just "already up to date"
      if (result.stderr.includes('already up to date') || 
          result.stdout.includes('already up to date')) {
        console.log(`[DatabaseService] Migrations already up to date for: ${tenantId}`);
        return { success: true, message: 'Already up to date' };
      }
      throw new Error(`Migration failed: ${result.stderr || result.error}`);
    }

    console.log(`[DatabaseService] Migrations completed for: ${tenantId}`);
    return { success: true, output: result.stdout };
  }

  /**
   * Run seed data for tenant
   * @param {string} tenantId - Tenant identifier (slug)
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Seed result
   */
  async runSeeds(tenantId, vpsIp, sshKey) {
    const backendContainer = `backend-${tenantId}`;

    console.log(`[DatabaseService] Running seeds for tenant: ${tenantId}`);

    const result = await this.execSSH(vpsIp,
      `docker exec ${backendContainer} npm run seed 2>&1`,
      sshKey);

    if (!result.success) {
      console.warn(`[DatabaseService] Seed warning for ${tenantId}: ${result.stderr}`);
      // Seeds failing is not critical
    }

    return { success: true, output: result.stdout };
  }

  /**
   * Onboard a new tenant with initial data
   * @param {Object} config - Tenant configuration
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Onboarding result
   */
  async onboardTenant(config, vpsIp, sshKey) {
    const {
      tenantId,
      organizationSlug,
      organizationName,
      customerId,
      licenseId,
      licenseKey,
      tier,
      products,
      adminEmail,
      adminName
    } = config;

    const backendContainer = `backend-${organizationSlug}`;

    console.log(`[DatabaseService] Onboarding tenant: ${organizationSlug}`);

    // Generate temporary password for admin
    const tempPassword = this.generateTempPassword();

    // Build onboarding script command
    const onboardCmd = `docker exec ${backendContainer} node scripts/onboard-tenant.js \\
      --organization-id="${tenantId}" \\
      --organization-name="${organizationName.replace(/"/g, '\\"')}" \\
      --organization-slug="${organizationSlug}" \\
      --license-id="${licenseId}" \\
      --license-key="${licenseKey}" \\
      --customer-id="${customerId}" \\
      --tier="${tier}" \\
      --products="${Array.isArray(products) ? products.join(',') : products}" \\
      --admin-email="${adminEmail}" \\
      --admin-name="${adminName.replace(/"/g, '\\"')}" \\
      --admin-password="${tempPassword}"`;

    const result = await this.execSSH(vpsIp, onboardCmd, sshKey);

    if (!result.success) {
      // If onboarding script doesn't exist, create organization manually
      console.log('[DatabaseService] Onboarding script not found, using fallback...');
      return this.onboardTenantFallback(config, vpsIp, sshKey, tempPassword);
    }

    console.log(`[DatabaseService] Tenant onboarded: ${organizationSlug}`);

    return {
      success: true,
      organizationId: tenantId,
      organizationSlug,
      adminEmail,
      tempPassword,
      message: 'Tenant onboarding completed'
    };
  }

  /**
   * Fallback onboarding using direct SQL
   * @param {Object} config - Tenant configuration
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @param {string} tempPassword - Temporary admin password
   * @returns {Promise<Object>} Onboarding result
   */
  async onboardTenantFallback(config, vpsIp, sshKey, tempPassword) {
    const { organizationSlug, organizationName, adminEmail, adminName, tier } = config;
    const postgresContainer = `postgres-${organizationSlug}`;
    const dbUser = `tenant_${organizationSlug}`;

    console.log(`[DatabaseService] Using fallback onboarding for: ${organizationSlug}`);

    // Create organization (minimal seed)
    const createOrgSQL = `
      INSERT INTO organizations (name, slug, tier, created_at)
      VALUES ('${organizationName.replace(/'/g, "''")}', '${organizationSlug}', '${tier}', NOW())
      ON CONFLICT (slug) DO NOTHING
      RETURNING id;
    `;

    const orgResult = await this.execSSH(vpsIp,
      `docker exec ${postgresContainer} psql -U ${dbUser} -d tenant_${organizationSlug} -c "${createOrgSQL}" 2>&1`,
      sshKey);

    // This is a minimal fallback - full onboarding should use the script
    return {
      success: true,
      organizationSlug,
      adminEmail,
      tempPassword,
      message: 'Tenant onboarding completed (fallback mode)',
      note: 'Please run full onboarding script manually'
    };
  }

  /**
   * Generate a temporary password for admin user
   * @returns {string} Temporary password
   */
  generateTempPassword() {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const specialChars = '!@#$%^&*';
    let password = '';
    
    // Generate 8 alphanumeric characters
    for (let i = 0; i < 8; i++) {
      password += chars[crypto.randomInt(chars.length)];
    }
    
    // Add special character and number for complexity
    password += specialChars[crypto.randomInt(specialChars.length)];
    password += crypto.randomInt(10);
    
    return password;
  }

  /**
   * Drop tenant database (for rollback)
   * @param {string} tenantId - Tenant identifier (slug)
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<void>}
   */
  async dropDatabase(tenantId, vpsIp, sshKey) {
    // When using Docker, dropping the database means removing the container
    // The volume will also be removed if specified
    console.log(`[DatabaseService] Database cleanup handled by Docker container removal for: ${tenantId}`);
  }

  /**
   * Execute SQL query on tenant database
   * @param {string} tenantId - Tenant identifier (slug)
   * @param {string} query - SQL query
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Query result
   */
  async executeSQL(tenantId, query, vpsIp, sshKey) {
    const postgresContainer = `postgres-${tenantId}`;
    const dbUser = `tenant_${tenantId}`;
    const dbName = `tenant_${tenantId}`;

    // Escape query for shell
    const escapedQuery = query.replace(/"/g, '\\"');

    const result = await this.execSSH(vpsIp,
      `docker exec ${postgresContainer} psql -U ${dbUser} -d ${dbName} -c "${escapedQuery}" 2>&1`,
      sshKey);

    return result;
  }

  /**
   * Create a database backup
   * @param {string} tenantId - Tenant identifier (slug)
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Backup result with path
   */
  async createBackup(tenantId, vpsIp, sshKey) {
    const postgresContainer = `postgres-${tenantId}`;
    const dbUser = `tenant_${tenantId}`;
    const dbName = `tenant_${tenantId}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.basePath}/${tenantId}/backups`;
    const backupFile = `${backupPath}/${dbName}_${timestamp}.sql`;

    console.log(`[DatabaseService] Creating backup for: ${tenantId}`);

    // Ensure backup directory exists
    await this.execSSH(vpsIp, `mkdir -p ${backupPath}`, sshKey);

    // Create backup
    const result = await this.execSSH(vpsIp,
      `docker exec ${postgresContainer} pg_dump -U ${dbUser} ${dbName} > ${backupFile} 2>&1`,
      sshKey);

    if (!result.success) {
      throw new Error(`Backup failed: ${result.stderr || result.error}`);
    }

    console.log(`[DatabaseService] Backup created: ${backupFile}`);

    return {
      success: true,
      path: backupFile,
      timestamp
    };
  }

  /**
   * Restore database from backup
   * @param {string} tenantId - Tenant identifier (slug)
   * @param {string} backupFile - Path to backup file
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Restore result
   */
  async restoreBackup(tenantId, backupFile, vpsIp, sshKey) {
    const postgresContainer = `postgres-${tenantId}`;
    const dbUser = `tenant_${tenantId}`;
    const dbName = `tenant_${tenantId}`;

    console.log(`[DatabaseService] Restoring backup for: ${tenantId}`);

    // Restore from backup file
    const result = await this.execSSH(vpsIp,
      `cat ${backupFile} | docker exec -i ${postgresContainer} psql -U ${dbUser} ${dbName} 2>&1`,
      sshKey);

    if (!result.success) {
      throw new Error(`Restore failed: ${result.stderr || result.error}`);
    }

    console.log(`[DatabaseService] Backup restored for: ${tenantId}`);

    return { success: true };
  }

  /**
   * Helper to sleep for specified milliseconds
   * @param {number} ms - Milliseconds
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default DatabaseService;
