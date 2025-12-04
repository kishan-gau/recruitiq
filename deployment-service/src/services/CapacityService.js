/**
 * Capacity Service
 * 
 * Checks VPS capacity before deploying new tenants.
 * Monitors CPU, RAM, and disk usage to ensure sufficient resources.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class CapacityService {
  constructor(options = {}) {
    this.sshOptions = options.sshOptions || '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null';
    
    // Resource requirements per tenant (defaults)
    this.tenantRequirements = options.tenantRequirements || {
      ram: 4, // GB
      cpu: 1, // cores
      disk: 20 // GB
    };
    
    // Maximum usage thresholds
    this.thresholds = options.thresholds || {
      ram: 0.80, // 80% max usage
      cpu: 0.90, // 90% max usage
      disk: 0.85 // 85% max usage
    };
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
      const { stdout, stderr } = await execAsync(sshCmd);
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
   * Check VPS capacity for a new tenant
   * @param {Object} options - Options
   * @param {string} options.vpsIp - VPS IP address
   * @param {string} options.sshKey - Path to SSH private key
   * @param {Object} [options.vpsSpecs] - VPS specifications (memory, cpuCores, diskSize)
   * @returns {Promise<Object>} Capacity check result
   */
  async checkVPSCapacity(options) {
    const { vpsIp, sshKey, vpsSpecs } = options;

    try {
      // Get current resource usage
      const usage = await this.getResourceUsage(vpsIp, sshKey);
      
      // Get VPS specs from options or try to detect
      const specs = vpsSpecs || await this.getVPSSpecs(vpsIp, sshKey);
      
      // Calculate available resources
      const available = {
        ram: specs.memory - usage.ram,
        cpu: specs.cpuCores - usage.cpu,
        disk: specs.diskSize - usage.disk
      };
      
      // Check if we have enough capacity for a new tenant
      const required = this.tenantRequirements;
      
      const hasCapacity = 
        (usage.ram + required.ram) < (specs.memory * this.thresholds.ram) &&
        (usage.cpu + required.cpu) < (specs.cpuCores * this.thresholds.cpu) &&
        (usage.disk + required.disk) < (specs.diskSize * this.thresholds.disk);
      
      return {
        hasCapacity,
        specs: {
          ram: specs.memory,
          cpu: specs.cpuCores,
          disk: specs.diskSize
        },
        current: {
          ram: usage.ram,
          cpu: usage.cpu,
          disk: usage.disk,
          containerCount: usage.containerCount
        },
        available: {
          ram: Math.round(available.ram * 100) / 100,
          cpu: Math.round(available.cpu * 100) / 100,
          disk: Math.round(available.disk * 100) / 100
        },
        required,
        thresholds: this.thresholds,
        maxNewTenants: this.calculateMaxTenants(available)
      };
    } catch (error) {
      console.error('[CapacityService] Failed to check capacity:', error.message);
      throw new Error(`Capacity check failed: ${error.message}`);
    }
  }

  /**
   * Get current resource usage from VPS
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Resource usage { ram, cpu, disk, containerCount }
   */
  async getResourceUsage(vpsIp, sshKey) {
    // Get memory usage (in GB)
    const memResult = await this.execSSH(vpsIp, 
      "free -g | awk '/^Mem:/ {print $3}'", sshKey);
    
    // Get CPU usage (average load)
    const cpuResult = await this.execSSH(vpsIp,
      "uptime | awk -F'load average:' '{ print $2 }' | awk -F, '{ print $1 }' | tr -d ' '", sshKey);
    
    // Get disk usage (in GB)
    const diskResult = await this.execSSH(vpsIp,
      "df -BG / | tail -1 | awk '{print $3}' | tr -d 'G'", sshKey);
    
    // Get Docker container count
    const containerResult = await this.execSSH(vpsIp,
      "docker ps -q 2>/dev/null | wc -l", sshKey);

    return {
      ram: parseFloat(memResult.stdout) || 0,
      cpu: parseFloat(cpuResult.stdout) || 0,
      disk: parseFloat(diskResult.stdout) || 0,
      containerCount: parseInt(containerResult.stdout, 10) || 0
    };
  }

  /**
   * Get VPS specifications
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} VPS specs { memory, cpuCores, diskSize }
   */
  async getVPSSpecs(vpsIp, sshKey) {
    // Get total memory (in GB)
    const memResult = await this.execSSH(vpsIp,
      "free -g | awk '/^Mem:/ {print $2}'", sshKey);
    
    // Get CPU cores
    const cpuResult = await this.execSSH(vpsIp,
      "nproc", sshKey);
    
    // Get total disk size (in GB)
    const diskResult = await this.execSSH(vpsIp,
      "df -BG / | tail -1 | awk '{print $2}' | tr -d 'G'", sshKey);

    return {
      memory: parseFloat(memResult.stdout) || 8, // Default 8GB
      cpuCores: parseInt(cpuResult.stdout, 10) || 2, // Default 2 cores
      diskSize: parseFloat(diskResult.stdout) || 100 // Default 100GB
    };
  }

  /**
   * Calculate maximum number of new tenants that can be added
   * @param {Object} available - Available resources { ram, cpu, disk }
   * @returns {number} Maximum new tenants
   */
  calculateMaxTenants(available) {
    const req = this.tenantRequirements;
    
    const byRam = Math.floor(available.ram / req.ram);
    const byCpu = Math.floor(available.cpu / req.cpu);
    const byDisk = Math.floor(available.disk / req.disk);
    
    return Math.max(Math.min(byRam, byCpu, byDisk), 0);
  }

  /**
   * Get container resource usage
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Array>} Array of container resource usage
   */
  async getContainerResourceUsage(vpsIp, sshKey) {
    const result = await this.execSSH(vpsIp,
      "docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}' 2>/dev/null", 
      sshKey);
    
    if (!result.success || !result.stdout) {
      return [];
    }

    const containers = [];
    const lines = result.stdout.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const [name, cpu, mem, net] = line.split('\t');
      containers.push({
        name,
        cpuPercent: parseFloat(cpu) || 0,
        memoryUsage: mem,
        networkIO: net
      });
    }
    
    return containers;
  }

  /**
   * Sum container memory usage for tenant capacity planning
   * @param {Array} containers - Array of containers from Docker API
   * @returns {number} Total memory in GB
   */
  sumContainerMemory(containers) {
    let totalMB = 0;
    
    for (const container of containers) {
      // Parse memory usage (e.g., "512MiB / 4GiB" or "1.5GiB / 8GiB")
      if (container.memoryUsage) {
        const match = container.memoryUsage.match(/^([\d.]+)([MGK]i?B)/i);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2].toUpperCase();
          
          if (unit.startsWith('G')) {
            totalMB += value * 1024;
          } else if (unit.startsWith('M')) {
            totalMB += value;
          } else if (unit.startsWith('K')) {
            totalMB += value / 1024;
          }
        }
      }
    }
    
    return totalMB / 1024; // Return in GB
  }

  /**
   * Sum container CPU usage
   * @param {Array} containers - Array of containers with cpuPercent
   * @returns {number} Total CPU cores equivalent
   */
  sumContainerCPU(containers) {
    let totalPercent = 0;
    
    for (const container of containers) {
      totalPercent += container.cpuPercent || 0;
    }
    
    // Convert percentage to cores (100% = 1 core)
    return totalPercent / 100;
  }

  /**
   * Check if VPS has healthy resource levels
   * @param {string} vpsIp - VPS IP address
   * @param {string} sshKey - Path to SSH private key
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck(vpsIp, sshKey) {
    try {
      const usage = await this.getResourceUsage(vpsIp, sshKey);
      const specs = await this.getVPSSpecs(vpsIp, sshKey);
      
      const ramPercent = (usage.ram / specs.memory) * 100;
      const diskPercent = (usage.disk / specs.diskSize) * 100;
      
      const isHealthy = 
        ramPercent < 90 &&
        usage.cpu < specs.cpuCores &&
        diskPercent < 90;
      
      const issues = [];
      if (ramPercent >= 90) issues.push('High memory usage');
      if (usage.cpu >= specs.cpuCores) issues.push('High CPU usage');
      if (diskPercent >= 90) issues.push('High disk usage');
      
      return {
        isHealthy,
        issues,
        usage: {
          ram: `${Math.round(ramPercent)}%`,
          cpu: `${Math.round((usage.cpu / specs.cpuCores) * 100)}%`,
          disk: `${Math.round(diskPercent)}%`
        },
        specs,
        containerCount: usage.containerCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        isHealthy: false,
        issues: [error.message],
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Set tenant resource requirements
   * @param {Object} requirements - Resource requirements { ram, cpu, disk }
   */
  setTenantRequirements(requirements) {
    this.tenantRequirements = {
      ...this.tenantRequirements,
      ...requirements
    };
  }

  /**
   * Set usage thresholds
   * @param {Object} thresholds - Thresholds { ram, cpu, disk }
   */
  setThresholds(thresholds) {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds
    };
  }
}

export default CapacityService;
