/**
 * PortManagementService Unit Tests
 * 
 * Tests for port allocation and management functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock exec for SSH commands
jest.unstable_mockModule('child_process', () => ({
  exec: jest.fn()
}));

// Import service after mocks
const { default: PortManagementService } = await import('../../../src/services/PortManagementService.js');

describe('PortManagementService', () => {
  let service;

  beforeEach(() => {
    // Create fresh service instance for each test
    service = new PortManagementService();
  });

  describe('Constructor', () => {
    it('should initialize with empty used ports set', () => {
      expect(service.usedPorts).toBeInstanceOf(Set);
      expect(service.usedPorts.size).toBe(0);
    });

    it('should have default port ranges', () => {
      expect(service.portRanges.backend).toEqual({ start: 3001, end: 3100 });
      expect(service.portRanges.frontend).toEqual({ start: 5177, end: 5277 });
      expect(service.portRanges.database).toEqual({ start: 5432, end: 5532 });
    });

    it('should initialize with empty allocations map', () => {
      expect(service.allocations).toBeInstanceOf(Map);
      expect(service.allocations.size).toBe(0);
    });
  });

  describe('allocatePortSet', () => {
    it('should allocate unique ports for backend, frontend, and database', () => {
      const allocation = service.allocatePortSet('tenant-1');

      expect(allocation).toHaveProperty('backend');
      expect(allocation).toHaveProperty('frontend');
      expect(allocation).toHaveProperty('database');
      expect(allocation.backend).toBeGreaterThanOrEqual(3001);
      expect(allocation.backend).toBeLessThanOrEqual(3100);
      expect(allocation.frontend).toBeGreaterThanOrEqual(5173);
      expect(allocation.frontend).toBeLessThanOrEqual(5273);
      expect(allocation.database).toBeGreaterThanOrEqual(5432);
      expect(allocation.database).toBeLessThanOrEqual(5532);
    });

    it('should mark allocated ports as used', () => {
      const allocation = service.allocatePortSet('tenant-1');

      expect(service.usedPorts.has(allocation.backend)).toBe(true);
      expect(service.usedPorts.has(allocation.frontend)).toBe(true);
      expect(service.usedPorts.has(allocation.database)).toBe(true);
    });

    it('should save allocation for tenant', () => {
      const allocation = service.allocatePortSet('tenant-1');

      expect(service.allocations.has('tenant-1')).toBe(true);
      expect(service.allocations.get('tenant-1')).toEqual(allocation);
    });

    it('should return existing allocation for same tenant', () => {
      const allocation1 = service.allocatePortSet('tenant-1');
      const allocation2 = service.allocatePortSet('tenant-1');

      expect(allocation1).toEqual(allocation2);
      expect(service.usedPorts.size).toBe(3); // Only 3 ports used, not 6
    });

    it('should allocate different ports for different tenants', () => {
      const allocation1 = service.allocatePortSet('tenant-1');
      const allocation2 = service.allocatePortSet('tenant-2');

      expect(allocation1.backend).not.toBe(allocation2.backend);
      expect(allocation1.frontend).not.toBe(allocation2.frontend);
      expect(allocation1.database).not.toBe(allocation2.database);
    });

    it('should allocate sequential ports within ranges', () => {
      // Allocate multiple tenants
      const allocations = [];
      for (let i = 1; i <= 5; i++) {
        allocations.push(service.allocatePortSet(`tenant-${i}`));
      }

      // Check that backend ports are sequential
      for (let i = 0; i < allocations.length; i++) {
        expect(allocations[i].backend).toBe(3001 + i);
        expect(allocations[i].frontend).toBe(5173 + i);
        expect(allocations[i].database).toBe(5432 + i);
      }
    });
  });

  describe('findAvailablePort', () => {
    it('should return first available port in range', () => {
      const port = service.findAvailablePort('backend');
      expect(port).toBe(3001);
    });

    it('should skip used ports', () => {
      service.usedPorts.add(3001);
      service.usedPorts.add(3002);
      
      const port = service.findAvailablePort('backend');
      expect(port).toBe(3003);
    });

    it('should throw error for unknown port type', () => {
      expect(() => service.findAvailablePort('unknown'))
        .toThrow('Unknown port type: unknown');
    });

    it('should throw error when range is exhausted', () => {
      // Fill all backend ports
      for (let port = 3001; port <= 3100; port++) {
        service.usedPorts.add(port);
      }

      expect(() => service.findAvailablePort('backend'))
        .toThrow('No available ports in range for backend (3001-3100)');
    });
  });

  describe('releasePorts', () => {
    it('should remove ports from used set', () => {
      const allocation = service.allocatePortSet('tenant-1');
      expect(service.usedPorts.size).toBe(3);

      service.releasePorts(allocation);
      expect(service.usedPorts.size).toBe(0);
    });

    it('should handle null ports gracefully', () => {
      expect(() => service.releasePorts(null)).not.toThrow();
    });

    it('should handle partial ports', () => {
      service.usedPorts.add(3001);
      service.releasePorts({ backend: 3001 });
      expect(service.usedPorts.has(3001)).toBe(false);
    });
  });

  describe('releasePortsForTenant', () => {
    it('should release ports and remove allocation', () => {
      service.allocatePortSet('tenant-1');
      expect(service.allocations.has('tenant-1')).toBe(true);
      expect(service.usedPorts.size).toBe(3);

      const result = service.releasePortsForTenant('tenant-1');
      
      expect(result).toBe(true);
      expect(service.allocations.has('tenant-1')).toBe(false);
      expect(service.usedPorts.size).toBe(0);
    });

    it('should return false for unknown tenant', () => {
      const result = service.releasePortsForTenant('unknown');
      expect(result).toBe(false);
    });
  });

  describe('getAllocation', () => {
    it('should return allocation for existing tenant', () => {
      const allocation = service.allocatePortSet('tenant-1');
      expect(service.getAllocation('tenant-1')).toEqual(allocation);
    });

    it('should return null for unknown tenant', () => {
      expect(service.getAllocation('unknown')).toBeNull();
    });
  });

  describe('isPortAvailable', () => {
    it('should return true for available port', () => {
      expect(service.isPortAvailable(3001)).toBe(true);
    });

    it('should return false for used port', () => {
      service.usedPorts.add(3001);
      expect(service.isPortAvailable(3001)).toBe(false);
    });
  });

  describe('reservePort', () => {
    it('should reserve available port', () => {
      const result = service.reservePort(8080);
      
      expect(result).toBe(true);
      expect(service.usedPorts.has(8080)).toBe(true);
    });

    it('should reject already used port', () => {
      service.usedPorts.add(8080);
      const result = service.reservePort(8080);
      
      expect(result).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics with no allocations', () => {
      const stats = service.getStatistics();

      expect(stats.totalAllocations).toBe(0);
      expect(stats.usedPorts).toBe(0);
      expect(stats.availability.backend.available).toBe(100);
      expect(stats.availability.frontend.available).toBe(101);
      expect(stats.availability.database.available).toBe(101);
    });

    it('should update statistics after allocations', () => {
      service.allocatePortSet('tenant-1');
      service.allocatePortSet('tenant-2');
      
      const stats = service.getStatistics();

      expect(stats.totalAllocations).toBe(2);
      expect(stats.usedPorts).toBe(6);
      expect(stats.availability.backend.used).toBe(2);
      expect(stats.availability.backend.available).toBe(98);
    });
  });

  describe('loadAllocations', () => {
    it('should load allocations from array', () => {
      const existingAllocations = [
        { tenantId: 'tenant-1', backend: 3001, frontend: 5173, database: 5432 },
        { tenantId: 'tenant-2', backend: 3002, frontend: 5174, database: 5433 }
      ];

      service.loadAllocations(existingAllocations);

      expect(service.allocations.size).toBe(2);
      expect(service.usedPorts.size).toBe(6);
      expect(service.getAllocation('tenant-1').backend).toBe(3001);
      expect(service.getAllocation('tenant-2').backend).toBe(3002);
    });
  });

  describe('getAllAllocations', () => {
    it('should return copy of allocations map', () => {
      service.allocatePortSet('tenant-1');
      service.allocatePortSet('tenant-2');

      const allAllocations = service.getAllAllocations();

      expect(allAllocations.size).toBe(2);
      expect(allAllocations).not.toBe(service.allocations); // Should be a copy
    });
  });
});
