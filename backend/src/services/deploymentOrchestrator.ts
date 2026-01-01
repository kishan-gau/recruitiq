/**
 * Deployment Orchestrator Service
 * Orchestrates VPS provisioning and application deployment
 * Integrates with TransIP API and Docker deployment
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import transipService from './transip/TransIPService.js';
import { query as dbQuery } from '../config/database.js';

const execAsync = promisify(exec);

class DeploymentOrchestrator {
  
  deploymentLogs: Map<string, any>;

  deploymentQueue: Map<string, any>;

constructor() {
    this.deploymentQueue = new Map();
    this.deploymentLogs = new Map();
  }

  /**
   * Deploy full stack to a VPS
   * @param {Object} config - Deployment configuration
   */
  async deployToVPS(config) {
    const { deploymentId, organizationId, slug, tier, vpsIp, vpsName, sshKey } = config;

    try {
      this.updateDeploymentStatus(deploymentId, 'deploying', 'Starting deployment...');

      // Step 1: Setup VPS with Docker
      await this.setupVPS(deploymentId, vpsIp, sshKey);

      // Step 2: Transfer deployment files
      await this.transferDeploymentFiles(deploymentId, vpsIp, slug, sshKey);

      // Step 3: Generate environment configuration
      await this.generateEnvFile(deploymentId, vpsIp, slug, organizationId, sshKey);

      // Step 4: Pull and start Docker containers
      await this.startDockerServices(deploymentId, vpsIp, sshKey);

      // Step 5: Configure domain and SSL
      await this.configureDomainSSL(deploymentId, vpsIp, slug, sshKey);

      // Step 6: Run database migrations
      await this.runMigrations(deploymentId, vpsIp, sshKey);

      // Step 7: Health check
      const isHealthy = await this.performHealthCheck(deploymentId, slug);

      if (isHealthy) {
        await this.updateDeploymentStatus(deploymentId, 'active', 'Deployment completed successfully');
        return { success: true, url: `https://${slug}.recruitiq.nl` };
      } else {
        throw new Error('Health check failed');
      }

    } catch (error) {
      logger.error('Deployment failed:', error);
      await this.updateDeploymentStatus(deploymentId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Step 1: Setup VPS with Docker and dependencies
   */
  async setupVPS(deploymentId, vpsIp, sshKey) {
    this.log(deploymentId, '📦 Setting up VPS with Docker...');

    const setupScript = `
      # Update system
      sudo apt-get update
      sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

      # Install Docker
      if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
      fi

      # Install Docker Compose
      if ! command -v docker-compose &> /dev/null; then
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
      fi

      # Create application directory
      sudo mkdir -p /opt/recruitiq
      sudo chown -R $USER:$USER /opt/recruitiq

      # Install additional tools
      sudo apt-get install -y nginx certbot python3-certbot-nginx ufw fail2ban

      # Configure firewall
      sudo ufw allow 22/tcp
      sudo ufw allow 80/tcp
      sudo ufw allow 443/tcp
      sudo ufw --force enable

      echo "✅ VPS setup complete"
    `;

    await this.executeRemoteCommand(vpsIp, setupScript, sshKey);
    this.log(deploymentId, '✅ VPS setup completed');
  }

  /**
   * Step 2: Transfer deployment files to VPS
   */
  async transferDeploymentFiles(deploymentId, vpsIp, slug, sshKey) {
    this.log(deploymentId, '📤 Transferring deployment files...');

    // Copy docker-compose and config files
    const files = [
      'docker-compose.production.yml',
      'Dockerfile.backend',
      'Dockerfile.frontend',
      'nginx/frontend.conf'
    ];

    for (const file of files) {
      const localPath = path.join(process.cwd(), '..', '..', file);
      const remotePath = `/opt/recruitiq/${path.basename(file)}`;

      await this.scpFile(localPath, `root@${vpsIp}:${remotePath}`, sshKey);
    }

    this.log(deploymentId, '✅ Files transferred');
  }

  /**
   * Step 3: Generate .env file on VPS
   */
  async generateEnvFile(deploymentId, vpsIp, slug, organizationId, sshKey) {
    this.log(deploymentId, '🔐 Generating environment configuration...');

    const envContent = `
# RecruitIQ Production Environment
# Auto-generated on ${new Date().toISOString()}

# Node Environment
NODE_ENV=production
PORT=3001

# Tenant Configuration
TENANT_ID=${slug}
ORGANIZATION_ID=${organizationId}
INSTANCE_ID=${slug}-vps
DEPLOYMENT_TYPE=cloud

# Database Configuration
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=recruitiq_${slug}
DATABASE_USER=recruitiq
DATABASE_PASSWORD=${this.generateSecret(32)}

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${this.generateSecret(32)}

# JWT Secrets
JWT_SECRET=${this.generateSecret(48)}
JWT_REFRESH_SECRET=${this.generateSecret(48)}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=${this.generateSecret(32)}
CSRF_SECRET=${this.generateSecret(32)}
COOKIE_SECRET=${this.generateSecret(32)}

# Application URLs
FRONTEND_URL=https://${slug}.recruitiq.nl
BACKEND_URL=https://api.${slug}.recruitiq.nl
CORS_ORIGIN=https://${slug}.recruitiq.nl

# SSL Configuration
SSL_EMAIL=devops@recruitiq.nl
ACME_EMAIL=devops@recruitiq.nl

# Domain Configuration
DOMAIN=${slug}.recruitiq.nl
    `.trim();

    // Write env file to VPS
    const writeEnvCmd = `cat > /opt/recruitiq/.env << 'EOF'\n${envContent}\nEOF`;
    await this.executeRemoteCommand(vpsIp, writeEnvCmd, sshKey);

    this.log(deploymentId, '✅ Environment configured');
  }

  /**
   * Step 4: Start Docker services
   */
  async startDockerServices(deploymentId, vpsIp, sshKey) {
    this.log(deploymentId, '🐳 Starting Docker services...');

    const startCmd = `
      cd /opt/recruitiq
      
      # Pull images from GitHub Container Registry
      echo "Pulling Docker images..."
      docker-compose -f docker-compose.production.yml pull
      
      # Start services
      echo "Starting services..."
      docker-compose -f docker-compose.production.yml up -d
      
      # Wait for services to be ready
      echo "Waiting for services to start..."
      sleep 30
      
      # Check service status
      docker-compose -f docker-compose.production.yml ps
    `;

    await this.executeRemoteCommand(vpsIp, startCmd, sshKey);
    this.log(deploymentId, '✅ Docker services started');
  }

  /**
   * Step 5: Configure domain and SSL
   */
  async configureDomainSSL(deploymentId, vpsIp, slug, sshKey) {
    this.log(deploymentId, '🔒 Configuring SSL certificates...');

    const sslCmd = `
      # Wait for services to be fully ready
      sleep 10
      
      # Obtain SSL certificate
      sudo certbot --nginx \
        -d ${slug}.recruitiq.nl \
        -d api.${slug}.recruitiq.nl \
        -d nexus.${slug}.recruitiq.nl \
        -d paylinq.${slug}.recruitiq.nl \
        -d portal.${slug}.recruitiq.nl \
        --non-interactive \
        --agree-tos \
        --email devops@recruitiq.nl
      
      # Setup auto-renewal
      echo "0 3 * * * certbot renew --quiet" | sudo crontab -
    `;

    await this.executeRemoteCommand(vpsIp, sslCmd, sshKey);
    this.log(deploymentId, '✅ SSL configured');
  }

  /**
   * Step 6: Run database migrations
   */
  async runMigrations(deploymentId, vpsIp, sshKey) {
    this.log(deploymentId, '📊 Running database migrations...');

    const migrateCmd = `
      cd /opt/recruitiq
      
      # Run migrations in backend container
      docker-compose -f docker-compose.production.yml exec -T backend npm run migrate
    `;

    await this.executeRemoteCommand(vpsIp, migrateCmd, sshKey);
    this.log(deploymentId, '✅ Migrations completed');
  }

  /**
   * Step 7: Perform health check
   */
  async performHealthCheck(deploymentId, slug) {
    this.log(deploymentId, '🏥 Performing health check...');

    try {
      // Check backend API
      const backendResponse = await fetch(`https://api.${slug}.recruitiq.nl/health`, {
        timeout: 10000
      });

      if (!backendResponse.ok) {
        throw new Error('Backend health check failed');
      }

      // Check frontend apps
      const frontendApps = ['nexus', 'paylinq', 'portal', 'recruitiq'];
      for (const app of frontendApps) {
        const response = await fetch(`https://${app}.${slug}.recruitiq.nl/health`, {
          timeout: 10000
        });
        if (!response.ok) {
          logger.warn(`Frontend ${app} health check failed, but continuing...`);
        }
      }

      this.log(deploymentId, '✅ Health check passed');
      return true;
    } catch (error) {
      this.log(deploymentId, `❌ Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute command on remote server via SSH
   */
  async executeRemoteCommand(host, command, sshKey) {
    const sshKeyPath = await this.writeTempSSHKey(sshKey);

    try {
      const sshCommand = `ssh -i ${sshKeyPath} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@${host} "${command.replace(/"/g, '\\"')}"`;

      const { stdout, stderr } = await execAsync(sshCommand);

      if (stderr && !stderr.includes('Warning')) {
        logger.warn('SSH stderr:', stderr);
      }

      return stdout;
    } finally {
      // Clean up temp SSH key
      await fs.unlink(sshKeyPath).catch(() => {});
    }
  }

  /**
   * Copy file to remote server via SCP
   */
  async scpFile(localPath, remotePath, sshKey) {
    const sshKeyPath = await this.writeTempSSHKey(sshKey);

    try {
      const scpCommand = `scp -i ${sshKeyPath} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${localPath} ${remotePath}`;

      await execAsync(scpCommand);
    } finally {
      await fs.unlink(sshKeyPath).catch(() => {});
    }
  }

  /**
   * Write SSH key to temporary file
   */
  async writeTempSSHKey(keyContent) {
    const tmpDir = '/tmp';
    const keyPath = path.join(tmpDir, `ssh-key-${Date.now()}`);

    await fs.writeFile(keyPath, keyContent, { mode: 0o600 });

    return keyPath;
  }

  /**
   * Generate secure random secret
   */
  generateSecret(length) {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('base64');
  }

  /**
   * Update deployment status in database
   */
  async updateDeploymentStatus(deploymentId, status, message) {
    await dbQuery(
      `UPDATE instance_deployments 
       SET status = $1, status_message = $2, updated_at = NOW()
       WHERE id = $3`,
      [status, message, deploymentId]
    );

    logger.info(`Deployment ${deploymentId}: ${status} - ${message}`);
  }

  /**
   * Log deployment progress
   */
  log(deploymentId, message) {
    if (!this.deploymentLogs.has(deploymentId)) {
      this.deploymentLogs.set(deploymentId, []);
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      message
    };

    this.deploymentLogs.get(deploymentId).push(logEntry);
    logger.info(`[Deployment ${deploymentId}] ${message}`);
  }

  /**
   * Get deployment logs
   */
  getDeploymentLogs(deploymentId) {
    return this.deploymentLogs.get(deploymentId) || [];
  }

  /**
   * Clear deployment logs (after completion)
   */
  clearDeploymentLogs(deploymentId) {
    this.deploymentLogs.delete(deploymentId);
  }
}

export default new DeploymentOrchestrator();
