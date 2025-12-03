/**
 * Docker Service
 * 
 * Manages Docker containers for tenant deployments.
 * Handles container creation, management, and cleanup.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class DockerService {
  constructor(options = {}) {
    this.sshOptions = options.sshOptions || '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null';
    this.basePath = options.basePath || '/opt/recruitiq';
    this.networkName = options.networkName || 'recruitiq-network';
    this.registryUrl = options.registryUrl || 'recruitiq';
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
   * List all running containers
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Array>} List of containers
   */
  async listContainers(vpsIp, sshKey) {
    const result = await this.execSSH(vpsIp,
      "docker ps --format '{{json .}}'", sshKey);
    
    if (!result.success || !result.stdout) {
      return [];
    }

    const containers = [];
    const lines = result.stdout.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const container = JSON.parse(line);
        containers.push({
          id: container.ID,
          name: container.Names,
          image: container.Image,
          status: container.Status,
          ports: this.parsePorts(container.Ports)
        });
      } catch (e) {
        // Skip invalid JSON lines
      }
    }
    
    return containers;
  }

  /**
   * Parse Docker port string to structured format
   * @param {string} portsStr - Docker ports string
   * @returns {Array} Parsed ports
   */
  parsePorts(portsStr) {
    const ports = [];
    if (!portsStr) return ports;
    
    const portMappings = portsStr.split(',').map(p => p.trim());
    for (const mapping of portMappings) {
      const match = mapping.match(/(\d+)->(\d+)/);
      if (match) {
        ports.push({
          PublicPort: parseInt(match[1], 10),
          PrivatePort: parseInt(match[2], 10)
        });
      }
    }
    
    return ports;
  }

  /**
   * Generate Docker Compose configuration for a tenant
   * @param {Object} config - Tenant configuration
   * @returns {string} Docker Compose YAML content
   */
  generateComposeConfig(config) {
    const { 
      tenantId, 
      organizationSlug, 
      ports, 
      tier,
      databasePassword,
      licenseKey,
      domain
    } = config;

    // Resource limits based on tier
    const resources = this.getResourceLimits(tier);

    return `version: '3.8'

services:
  backend-${organizationSlug}:
    image: ${this.registryUrl}/backend:latest
    container_name: backend-${organizationSlug}
    restart: unless-stopped
    ports:
      - "${ports.backend}:3001"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://tenant_${organizationSlug}:${databasePassword}@postgres-${organizationSlug}:5432/tenant_${organizationSlug}
      ORGANIZATION_ID: ${tenantId}
      ORGANIZATION_SLUG: ${organizationSlug}
      LICENSE_KEY: ${licenseKey}
      JWT_SECRET: \${JWT_SECRET}
      PORTAL_API_URL: https://portal.recruitiq.nl
    networks:
      - ${this.networkName}
      - ${organizationSlug}-private
    depends_on:
      postgres-${organizationSlug}:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '${resources.cpuLimit}'
          memory: ${resources.memoryLimit}
        reservations:
          cpus: '${resources.cpuReservation}'
          memory: ${resources.memoryReservation}

  frontend-${organizationSlug}:
    image: ${this.registryUrl}/frontend:latest
    container_name: frontend-${organizationSlug}
    restart: unless-stopped
    ports:
      - "${ports.frontend}:80"
    environment:
      VITE_API_URL: https://${domain}/api
      VITE_ORGANIZATION_SLUG: ${organizationSlug}
    networks:
      - ${this.networkName}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres-${organizationSlug}:
    image: postgres:15-alpine
    container_name: postgres-${organizationSlug}
    restart: unless-stopped
    ports:
      - "${ports.database}:5432"
    environment:
      POSTGRES_DB: tenant_${organizationSlug}
      POSTGRES_USER: tenant_${organizationSlug}
      POSTGRES_PASSWORD: ${databasePassword}
    volumes:
      - ${organizationSlug}-postgres-data:/var/lib/postgresql/data
    networks:
      - ${organizationSlug}-private
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tenant_${organizationSlug}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M

networks:
  ${this.networkName}:
    external: true
  ${organizationSlug}-private:
    driver: bridge
    internal: true

volumes:
  ${organizationSlug}-postgres-data:
`;
  }

  /**
   * Get resource limits based on tier
   * @param {string} tier - Subscription tier
   * @returns {Object} Resource limits
   */
  getResourceLimits(tier) {
    const limits = {
      starter: {
        cpuLimit: '1',
        cpuReservation: '0.25',
        memoryLimit: '2G',
        memoryReservation: '512M'
      },
      professional: {
        cpuLimit: '2',
        cpuReservation: '0.5',
        memoryLimit: '4G',
        memoryReservation: '1G'
      },
      enterprise: {
        cpuLimit: '4',
        cpuReservation: '1',
        memoryLimit: '8G',
        memoryReservation: '2G'
      }
    };
    
    return limits[tier] || limits.starter;
  }

  /**
   * Create Docker Compose file on VPS
   * @param {Object} config - Tenant configuration
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Result
   */
  async createComposeFile(config, vpsIp, sshKey) {
    const { organizationSlug } = config;
    const tenantPath = `${this.basePath}/${organizationSlug}`;
    const composePath = `${tenantPath}/docker-compose.yml`;
    
    // Generate compose content
    const composeContent = this.generateComposeConfig(config);
    
    // Create tenant directory
    const mkdirResult = await this.execSSH(vpsIp, `mkdir -p ${tenantPath}`, sshKey);
    if (!mkdirResult.success) {
      throw new Error(`Failed to create tenant directory: ${mkdirResult.error}`);
    }
    
    // Write compose file (escape for shell)
    const escapedContent = composeContent.replace(/'/g, "'\\''");
    const writeResult = await this.execSSH(vpsIp, 
      `cat > ${composePath} << 'EOF'
${composeContent}
EOF`, sshKey);
    
    if (!writeResult.success) {
      throw new Error(`Failed to create compose file: ${writeResult.error}`);
    }
    
    console.log(`[DockerService] Created compose file: ${composePath}`);
    
    return { 
      success: true, 
      path: composePath,
      tenantPath 
    };
  }

  /**
   * Delete Docker Compose file for a tenant
   * @param {string} tenantId - Tenant identifier (slug)
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<void>}
   */
  async deleteComposeFile(tenantId, vpsIp, sshKey) {
    const tenantPath = `${this.basePath}/${tenantId}`;
    await this.execSSH(vpsIp, `rm -rf ${tenantPath}`, sshKey);
    console.log(`[DockerService] Deleted compose file for tenant: ${tenantId}`);
  }

  /**
   * Start containers for a tenant
   * @param {string} tenantId - Tenant identifier (slug)
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Result
   */
  async startContainers(tenantId, vpsIp, sshKey) {
    const tenantPath = `${this.basePath}/${tenantId}`;
    
    // Ensure Docker network exists
    await this.execSSH(vpsIp, 
      `docker network create ${this.networkName} 2>/dev/null || true`, sshKey);
    
    // Pull latest images
    const pullResult = await this.execSSH(vpsIp,
      `cd ${tenantPath} && docker compose pull`, sshKey);
    
    if (!pullResult.success) {
      console.warn(`[DockerService] Image pull warning: ${pullResult.stderr}`);
    }
    
    // Start containers
    const startResult = await this.execSSH(vpsIp,
      `cd ${tenantPath} && docker compose up -d`, sshKey);
    
    if (!startResult.success) {
      throw new Error(`Failed to start containers: ${startResult.stderr || startResult.error}`);
    }
    
    console.log(`[DockerService] Started containers for tenant: ${tenantId}`);
    
    return { success: true, output: startResult.stdout };
  }

  /**
   * Stop and remove containers for a tenant
   * @param {string} tenantId - Tenant identifier (slug)
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Result
   */
  async stopAndRemoveContainers(tenantId, vpsIp, sshKey) {
    const tenantPath = `${this.basePath}/${tenantId}`;
    
    // Stop and remove containers
    const stopResult = await this.execSSH(vpsIp,
      `cd ${tenantPath} && docker compose down -v 2>/dev/null || true`, sshKey);
    
    console.log(`[DockerService] Stopped containers for tenant: ${tenantId}`);
    
    return { success: true, output: stopResult.stdout };
  }

  /**
   * Check container health status
   * @param {string} containerName - Container name
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Health status
   */
  async checkContainerHealth(containerName, vpsIp, sshKey) {
    const result = await this.execSSH(vpsIp,
      `docker inspect --format='{{.State.Health.Status}}' ${containerName} 2>/dev/null || echo 'unknown'`,
      sshKey);
    
    return {
      containerName,
      status: result.stdout || 'unknown',
      isHealthy: result.stdout === 'healthy'
    };
  }

  /**
   * Wait for container to be healthy
   * @param {string} containerName - Container name
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<boolean>} True if healthy
   */
  async waitForContainerHealthy(containerName, vpsIp, sshKey, timeoutMs = 120000) {
    const startTime = Date.now();
    const checkInterval = 5000; // 5 seconds
    
    while (Date.now() - startTime < timeoutMs) {
      const health = await this.checkContainerHealth(containerName, vpsIp, sshKey);
      
      if (health.isHealthy) {
        return true;
      }
      
      if (health.status === 'unhealthy') {
        console.error(`[DockerService] Container ${containerName} is unhealthy`);
        return false;
      }
      
      await this.sleep(checkInterval);
    }
    
    console.error(`[DockerService] Timeout waiting for container ${containerName}`);
    return false;
  }

  /**
   * Get container logs
   * @param {string} containerName - Container name
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @param {number} tail - Number of lines to return
   * @returns {Promise<string>} Container logs
   */
  async getContainerLogs(containerName, vpsIp, sshKey, tail = 100) {
    const result = await this.execSSH(vpsIp,
      `docker logs --tail ${tail} ${containerName} 2>&1`,
      sshKey);
    
    return result.stdout || result.stderr || '';
  }

  /**
   * Execute command in container
   * @param {string} containerName - Container name
   * @param {string} command - Command to execute
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Execution result
   */
  async execInContainer(containerName, command, vpsIp, sshKey) {
    const result = await this.execSSH(vpsIp,
      `docker exec ${containerName} ${command}`,
      sshKey);
    
    return result;
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

export default DockerService;
