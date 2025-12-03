/**
 * Port Management Service
 * 
 * Manages port allocation for tenant containers on shared VPS instances.
 * Tracks used ports and allocates available ports from predefined ranges.
 * 
 * Port ranges:
 * - Backend: 3001-3100
 * - Frontend: 5173-5273  
 * - Database: 5432-5532
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class PortManagementService {
  constructor() {
    this.usedPorts = new Set();
    this.portRanges = {
      backend: { start: 3001, end: 3100 },
      frontend: { start: 5173, end: 5273 },
      database: { start: 5432, end: 5532 }
    };
    this.allocations = new Map(); // tenantId -> { backend, frontend, database }
  }

  /**
   * Initialize used ports by scanning existing Docker containers
   * @param {Object} dockerService - Docker service instance for listing containers
   * @returns {Promise<void>}
   */
  async initializeUsedPorts(dockerService = null) {
    try {
      // Try to get ports from Docker if available
      if (dockerService) {
        const containers = await dockerService.listContainers();
        containers.forEach(container => {
          if (container.ports && Array.isArray(container.ports)) {
            container.ports.forEach(port => {
              if (port.PublicPort) {
                this.usedPorts.add(port.PublicPort);
              }
            });
          }
        });
      } else {
        // Fallback: use netstat/ss to find used ports
        await this.scanUsedPorts();
      }
      
      console.log(`[PortManagement] Initialized with ${this.usedPorts.size} used ports`);
    } catch (error) {
      console.error('[PortManagement] Failed to initialize used ports:', error.message);
      // Continue with empty set - will rely on availability checks
    }
  }

  /**
   * Scan for currently used ports using system tools
   * @returns {Promise<void>}
   */
  async scanUsedPorts() {
    try {
      // Try ss first (faster), fall back to netstat
      const { stdout } = await execAsync('ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null');
      
      const lines = stdout.split('\n');
      lines.forEach(line => {
        // Match port numbers in listen state
        const match = line.match(/:(\d+)\s/);
        if (match) {
          const port = parseInt(match[1], 10);
          if (port >= 3000 && port <= 6000) { // Only track ports in our range
            this.usedPorts.add(port);
          }
        }
      });
    } catch (error) {
      // Ignore errors - this is a best-effort scan
      console.log('[PortManagement] Could not scan system ports:', error.message);
    }
  }

  /**
   * Allocate a set of ports for a new tenant
   * @param {string} tenantId - Unique tenant identifier
   * @returns {Object} Allocated ports { backend, frontend, database }
   * @throws {Error} If no ports available in any range
   */
  allocatePortSet(tenantId) {
    // Check if tenant already has allocated ports
    if (this.allocations.has(tenantId)) {
      console.log(`[PortManagement] Returning existing allocation for tenant ${tenantId}`);
      return this.allocations.get(tenantId);
    }

    const backend = this.findAvailablePort('backend');
    const frontend = this.findAvailablePort('frontend');
    const database = this.findAvailablePort('database');

    // Mark as used
    this.usedPorts.add(backend);
    this.usedPorts.add(frontend);
    this.usedPorts.add(database);

    // Save allocation
    const allocation = { backend, frontend, database };
    this.allocations.set(tenantId, allocation);

    console.log(`[PortManagement] Allocated ports for tenant ${tenantId}:`, allocation);

    return allocation;
  }

  /**
   * Find an available port in the specified range
   * @param {string} type - Port type ('backend', 'frontend', 'database')
   * @returns {number} Available port number
   * @throws {Error} If no ports available in range
   */
  findAvailablePort(type) {
    const range = this.portRanges[type];
    if (!range) {
      throw new Error(`Unknown port type: ${type}`);
    }

    for (let port = range.start; port <= range.end; port++) {
      if (!this.usedPorts.has(port)) {
        return port;
      }
    }

    throw new Error(`No available ports in range for ${type} (${range.start}-${range.end})`);
  }

  /**
   * Release ports allocated to a tenant
   * @param {Object} ports - Port allocation { backend, frontend, database }
   */
  releasePorts(ports) {
    if (ports) {
      if (ports.backend) this.usedPorts.delete(ports.backend);
      if (ports.frontend) this.usedPorts.delete(ports.frontend);
      if (ports.database) this.usedPorts.delete(ports.database);
      
      console.log('[PortManagement] Released ports:', ports);
    }
  }

  /**
   * Release ports for a specific tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {boolean} True if ports were released
   */
  releasePortsForTenant(tenantId) {
    const allocation = this.allocations.get(tenantId);
    if (allocation) {
      this.releasePorts(allocation);
      this.allocations.delete(tenantId);
      return true;
    }
    return false;
  }

  /**
   * Get port allocation for a tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Object|null} Port allocation or null if not found
   */
  getAllocation(tenantId) {
    return this.allocations.get(tenantId) || null;
  }

  /**
   * Check if a specific port is available
   * @param {number} port - Port number to check
   * @returns {boolean} True if port is available
   */
  isPortAvailable(port) {
    return !this.usedPorts.has(port);
  }

  /**
   * Reserve a specific port (for manual allocation)
   * @param {number} port - Port number to reserve
   * @returns {boolean} True if port was reserved, false if already in use
   */
  reservePort(port) {
    if (this.usedPorts.has(port)) {
      return false;
    }
    this.usedPorts.add(port);
    return true;
  }

  /**
   * Get statistics about port usage
   * @returns {Object} Port usage statistics
   */
  getStatistics() {
    const stats = {
      totalAllocations: this.allocations.size,
      usedPorts: this.usedPorts.size,
      availability: {}
    };

    for (const [type, range] of Object.entries(this.portRanges)) {
      const total = range.end - range.start + 1;
      let used = 0;
      for (let port = range.start; port <= range.end; port++) {
        if (this.usedPorts.has(port)) used++;
      }
      stats.availability[type] = {
        total,
        used,
        available: total - used,
        percentUsed: Math.round((used / total) * 100)
      };
    }

    return stats;
  }

  /**
   * Get all current allocations
   * @returns {Map} Map of tenantId to port allocations
   */
  getAllAllocations() {
    return new Map(this.allocations);
  }

  /**
   * Load allocations from persistent storage (database or file)
   * @param {Array} allocations - Array of { tenantId, backend, frontend, database }
   */
  loadAllocations(allocations) {
    for (const alloc of allocations) {
      this.allocations.set(alloc.tenantId, {
        backend: alloc.backend,
        frontend: alloc.frontend,
        database: alloc.database
      });
      this.usedPorts.add(alloc.backend);
      this.usedPorts.add(alloc.frontend);
      this.usedPorts.add(alloc.database);
    }
    console.log(`[PortManagement] Loaded ${allocations.length} port allocations`);
  }
}

export default PortManagementService;
