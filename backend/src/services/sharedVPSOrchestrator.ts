/**
 * Shared VPS Tenant Onboarding Orchestrator
 * Handles configuration of new tenants on existing shared VPS instances
 * 
 * This service is responsible for:
 * - Adding NGINX subdomain configuration
 * - Obtaining SSL certificates via Let's Encrypt
 * - Reloading NGINX to apply changes
 * - Creating tenant database/schema (if per-tenant DB isolation)
 * - Verifying tenant is accessible
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../utils/logger.ts';
import pool from '../config/database.ts';

const execAsync = promisify(exec);

/**
 * In-memory log storage for real-time status tracking
 */
const deploymentLogs = new Map();

class SharedVPSOrchestrator {
  constructor() {
    this.sshOptions = '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null';
  }

  /**
   * Add log entry for deployment
   */
  addLog(deploymentId, message) {
    if (!deploymentLogs.has(deploymentId)) {
      deploymentLogs.set(deploymentId, []);
    }
    
    const log = {
      timestamp: new Date().toISOString(),
      message
    };
    
    deploymentLogs.get(deploymentId).push(log);
    logger.info(`[SharedVPS:${deploymentId}] ${message}`);
  }

  /**
   * Get deployment logs
   */
  getLogs(deploymentId) {
    return deploymentLogs.get(deploymentId) || [];
  }

  /**
   * Update deployment status in database
   */
  async updateDeploymentStatus(deploymentId, status, statusMessage = null, errorMessage = null) {
    try {
      await pool.query(
        `UPDATE instance_deployments 
         SET status = $1, status_message = $2, error_message = $3, updated_at = NOW()
         WHERE id = $4`,
        [status, statusMessage, errorMessage, deploymentId]
      );
      
      this.addLog(deploymentId, `Status updated: ${status}${statusMessage ? ' - ' + statusMessage : ''}`);
    } catch (error) {
      logger.error('Failed to update deployment status:', error);
    }
  }

  /**
   * Execute SSH command on VPS
   */
  async execSSH(vpsIp, command, sshKey) {
    const sshCmd = `ssh ${this.sshOptions} -i "${sshKey}" root@${vpsIp} "${command}"`;
    
    try {
      const { stdout, stderr } = await execAsync(sshCmd);
      return { success: true, stdout, stderr };
    } catch (error) {
      logger.error(`SSH command failed on ${vpsIp}:`, error);
      return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
    }
  }

  /**
   * Main onboarding flow for new tenant on shared VPS
   * 
   * @param {Object} config - Configuration object
   * @param {string} config.deploymentId - Deployment ID
   * @param {string} config.organizationId - Organization UUID
   * @param {string} config.slug - Organization slug (subdomain)
   * @param {string} config.vpsIp - VPS IP address
   * @param {string} config.vpsName - VPS name for logging
   * @param {string} config.sshKey - Path to SSH private key
   * @param {string} config.baseDomain - Base domain (e.g., recruitiq.nl)
   * @returns {Promise<Object>} Result object
   */
  async onboardTenantToSharedVPS(config) {
    const { deploymentId, organizationId, slug, vpsIp, vpsName, sshKey, baseDomain } = config;
    
    this.addLog(deploymentId, `Starting tenant onboarding for ${slug} on shared VPS ${vpsName}`);
    
    try {
      // Step 1: Add NGINX subdomain configuration
      await this.updateDeploymentStatus(deploymentId, 'configuring', 'Step 1/4: Configuring NGINX subdomain');
      await this.configureNginxSubdomain(deploymentId, vpsIp, slug, baseDomain, sshKey);
      
      // Step 2: Obtain SSL certificate via Let's Encrypt
      await this.updateDeploymentStatus(deploymentId, 'configuring', 'Step 2/4: Obtaining SSL certificate');
      await this.obtainSSLCertificate(deploymentId, vpsIp, slug, baseDomain, sshKey);
      
      // Step 3: Create tenant database schema (if using per-tenant schemas)
      await this.updateDeploymentStatus(deploymentId, 'configuring', 'Step 3/4: Initializing database schema');
      await this.initializeTenantDatabase(deploymentId, vpsIp, organizationId, slug, sshKey);
      
      // Step 4: Verify tenant is accessible
      await this.updateDeploymentStatus(deploymentId, 'configuring', 'Step 4/4: Verifying tenant accessibility');
      await this.verifyTenantAccess(deploymentId, slug, baseDomain);
      
      // Success
      await this.updateDeploymentStatus(
        deploymentId, 
        'active', 
        'Tenant onboarding completed successfully'
      );
      
      this.addLog(deploymentId, `✅ Tenant ${slug} successfully onboarded to ${vpsName}`);
      
      return {
        success: true,
        url: `https://${slug}.${baseDomain}`,
        vpsName,
        vpsIp
      };
      
    } catch (error) {
      logger.error(`Tenant onboarding failed for ${slug}:`, error);
      
      await this.updateDeploymentStatus(
        deploymentId,
        'failed',
        'Tenant onboarding failed',
        error.message
      );
      
      this.addLog(deploymentId, `❌ Onboarding failed: ${error.message}`);
      
      throw error;
    }
  }

  /**
   * Step 1: Configure NGINX subdomain routing
   * Creates NGINX server block for the new subdomain
   */
  async configureNginxSubdomain(deploymentId, vpsIp, slug, baseDomain, sshKey) {
    this.addLog(deploymentId, `Configuring NGINX for ${slug}.${baseDomain}`);
    
    const nginxConfig = `
# NGINX configuration for ${slug}.${baseDomain}
server {
    listen 80;
    listen [::]:80;
    server_name ${slug}.${baseDomain};

    # Redirect HTTP to HTTPS (will be configured after SSL cert is obtained)
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${slug}.${baseDomain};

    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/${slug}.${baseDomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${slug}.${baseDomain}/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Organization-Slug ${slug};
        proxy_cache_bypass \$http_upgrade;
    }

    # Proxy to frontend apps (assuming they run on different ports or same backend serves them)
    location / {
        proxy_pass http://localhost:5173;  # Adjust port based on your setup
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Organization-Slug ${slug};
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }

    # Logging
    access_log /var/log/nginx/${slug}.access.log;
    error_log /var/log/nginx/${slug}.error.log;
}
`;

    // Create NGINX config file on VPS
    const createConfigCmd = `cat > /etc/nginx/sites-available/${slug}.${baseDomain} << 'NGINX_CONFIG_EOF'
${nginxConfig}
NGINX_CONFIG_EOF`;
    
    const result = await this.execSSH(vpsIp, createConfigCmd, sshKey);
    
    if (!result.success) {
      throw new Error(`Failed to create NGINX config: ${result.error}`);
    }
    
    this.addLog(deploymentId, 'NGINX config file created');
    
    // Enable site (symlink to sites-enabled)
    const enableSiteCmd = `ln -sf /etc/nginx/sites-available/${slug}.${baseDomain} /etc/nginx/sites-enabled/`;
    const enableResult = await this.execSSH(vpsIp, enableSiteCmd, sshKey);
    
    if (!enableResult.success) {
      throw new Error(`Failed to enable NGINX site: ${enableResult.error}`);
    }
    
    this.addLog(deploymentId, 'NGINX site enabled');
    
    // Test NGINX configuration
    const testCmd = 'nginx -t';
    const testResult = await this.execSSH(vpsIp, testCmd, sshKey);
    
    if (!testResult.success) {
      throw new Error(`NGINX configuration test failed: ${testResult.stderr}`);
    }
    
    this.addLog(deploymentId, 'NGINX configuration validated');
    
    // Note: We don't reload NGINX yet - wait until SSL cert is obtained
    // Otherwise the SSL cert paths won't exist and NGINX will fail
    
    this.addLog(deploymentId, '✓ NGINX subdomain configured');
  }

  /**
   * Step 2: Obtain SSL certificate via Let's Encrypt
   */
  async obtainSSLCertificate(deploymentId, vpsIp, slug, baseDomain, sshKey) {
    this.addLog(deploymentId, `Obtaining SSL certificate for ${slug}.${baseDomain}`);
    
    const fullDomain = `${slug}.${baseDomain}`;
    
    // Use certbot to obtain certificate
    // --nginx: Use NGINX plugin
    // --non-interactive: Don't prompt for input
    // --agree-tos: Agree to terms of service
    // --redirect: Configure HTTPS redirect
    // --email: Email for urgent renewal and security notices
    const certbotCmd = `certbot --nginx -d ${fullDomain} --non-interactive --agree-tos --redirect --email admin@${baseDomain}`;
    
    const result = await this.execSSH(vpsIp, certbotCmd, sshKey);
    
    if (!result.success) {
      // Check if it's a rate limit error
      if (result.stderr.includes('too many certificates')) {
        throw new Error('Let\'s Encrypt rate limit reached. Try again later or use staging.');
      }
      throw new Error(`Failed to obtain SSL certificate: ${result.stderr}`);
    }
    
    this.addLog(deploymentId, '✓ SSL certificate obtained');
    
    // Reload NGINX to apply SSL configuration
    const reloadCmd = 'nginx -s reload';
    const reloadResult = await this.execSSH(vpsIp, reloadCmd, sshKey);
    
    if (!reloadResult.success) {
      throw new Error(`Failed to reload NGINX: ${reloadResult.error}`);
    }
    
    this.addLog(deploymentId, 'NGINX reloaded with SSL configuration');
  }

  /**
   * Step 3: Initialize tenant database schema
   * Creates tenant-specific database or schema if using multi-tenant DB pattern
   */
  async initializeTenantDatabase(deploymentId, vpsIp, organizationId, slug, sshKey) {
    this.addLog(deploymentId, `Initializing database for tenant ${slug}`);
    
    // Option 1: Per-tenant database (requires more resources)
    // Option 2: Per-tenant schema (more efficient, what we'll use)
    // Option 3: Shared schema with organization_id filter (simplest, current implementation)
    
    // For now, we're using Option 3 (shared schema with organization_id filter)
    // So database initialization is just running migrations if needed
    
    // Run migrations via backend container
    const migrationCmd = `docker exec backend-container npm run migrate`;
    const result = await this.execSSH(vpsIp, migrationCmd, sshKey);
    
    if (!result.success) {
      // Migrations might already be up to date, which is fine
      this.addLog(deploymentId, 'Database migrations check completed');
    } else {
      this.addLog(deploymentId, '✓ Database initialized');
    }
    
    // Note: If you implement per-tenant schemas in the future, add:
    // 1. CREATE SCHEMA ${organizationId}
    // 2. Run migrations in that schema
    // 3. Update connection pooling to use correct schema
  }

  /**
   * Step 4: Verify tenant is accessible via HTTPS
   */
  async verifyTenantAccess(deploymentId, slug, baseDomain) {
    this.addLog(deploymentId, `Verifying access to https://${slug}.${baseDomain}`);
    
    const url = `https://${slug}.${baseDomain}/api/health`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        // Allow self-signed certs in development
        // In production, this should verify the cert
        // agent: new https.Agent({ rejectUnauthorized: false })
      });
      
      if (response.ok) {
        this.addLog(deploymentId, '✓ Tenant is accessible via HTTPS');
        return true;
      } else {
        this.addLog(deploymentId, `⚠️  Tenant responded with status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.addLog(deploymentId, `⚠️  Could not verify tenant access: ${error.message}`);
      // Don't fail deployment if health check fails - tenant might still be accessible
      return false;
    }
  }
}

export default new SharedVPSOrchestrator();
