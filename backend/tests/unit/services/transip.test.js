/**
 * TransIP Service Unit Tests
 * 
 * Tests the TransIP VPS API integration service with mocked TransIP client
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the TransIP client before importing the service
const mockTransIPClient = {
  vps: {
    order: jest.fn(),
    get: jest.fn(),
    stop: jest.fn(),
    start: jest.fn(),
    cancel: jest.fn(),
    snapshots: {
      create: jest.fn()
    }
  }
};

jest.unstable_mockModule('transip-api', () => ({
  default: jest.fn(() => mockTransIPClient)
}));

// Now import the service (after mocking)
const { default: transipServiceModule } = await import('../../../src/services/transip.js');
const logger = (await import('../../../src/utils/logger.js')).default;

// Create a new instance for testing
let transipService;

describe('TransIPService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service to use mock client
    transipService = transipServiceModule;
    transipService.client = mockTransIPClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVPSSpecs', () => {
    it('should return correct specs for starter tier', () => {
      const specs = transipService.getVPSSpecs('starter');

      expect(specs).toEqual({
        productName: 'vps-bladevps-x2',
        addons: ['vps-addon-50-gb-disk']
      });
    });

    it('should return correct specs for professional tier', () => {
      const specs = transipService.getVPSSpecs('professional');

      expect(specs).toEqual({
        productName: 'vps-bladevps-x4',
        addons: ['vps-addon-100-gb-disk']
      });
    });

    it('should return correct specs for enterprise tier', () => {
      const specs = transipService.getVPSSpecs('enterprise');

      expect(specs).toEqual({
        productName: 'vps-bladevps-x8',
        addons: ['vps-addon-200-gb-disk']
      });
    });

    it('should default to professional tier for unknown tier', () => {
      const specs = transipService.getVPSSpecs('unknown');

      expect(specs).toEqual({
        productName: 'vps-bladevps-x4',
        addons: ['vps-addon-100-gb-disk']
      });
    });

    it('should default to professional tier for null tier', () => {
      const specs = transipService.getVPSSpecs(null);

      expect(specs).toEqual({
        productName: 'vps-bladevps-x4',
        addons: ['vps-addon-100-gb-disk']
      });
    });
  });

  describe('createDedicatedVPS', () => {
    it('should create VPS with correct configuration', async () => {
      const config = {
        organizationId: 'org-123',
        slug: 'testcompany',
        tier: 'professional'
      };

      // Mock the TransIP API responses
      mockTransIPClient.vps.order.mockResolvedValue({
        vps: { name: 'vps-testcompany-12345' }
      });
      
      mockTransIPClient.vps.get.mockResolvedValue({
        name: 'vps-testcompany-12345',
        ipAddress: '192.168.1.100',
        status: 'running',
        hostname: 'testcompany.recruitiq.nl',
        cpus: 2,
        memoryInMb: 4096,
        diskInGb: 100
      });

      const result = await transipService.createDedicatedVPS(config);

      // Validate response structure
      expect(result).toHaveProperty('vpsName', 'vps-testcompany-12345');
      expect(result).toHaveProperty('ipAddress', '192.168.1.100');
      expect(result).toHaveProperty('status', 'running');
      expect(result).toHaveProperty('hostname');

      // Verify API calls
      expect(mockTransIPClient.vps.order).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'vps-bladevps-x4',
          operatingSystem: 'ubuntu-22.04',
          hostname: 'testcompany.recruitiq.nl'
        })
      );
    });

    it('should create VPS with starter tier', async () => {
      const config = {
        organizationId: 'org-456',
        slug: 'startercompany',
        tier: 'starter'
      };

      mockTransIPClient.vps.order.mockResolvedValue({
        vps: { name: 'vps-startercompany-12345' }
      });
      
      mockTransIPClient.vps.get.mockResolvedValue({
        name: 'vps-startercompany-12345',
        ipAddress: '192.168.1.101',
        status: 'running',
        hostname: 'startercompany.recruitiq.nl'
      });

      const result = await transipService.createDedicatedVPS(config);

      expect(result.vpsName).toBe('vps-startercompany-12345');
      expect(result.hostname).toBe('startercompany.recruitiq.nl');
      
      // Verify starter tier specs were used
      expect(mockTransIPClient.vps.order).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'vps-bladevps-x2'
        })
      );
    });

    it('should create VPS with enterprise tier', async () => {
      const config = {
        organizationId: 'org-789',
        slug: 'enterprise',
        tier: 'enterprise'
      };

      mockTransIPClient.vps.order.mockResolvedValue({
        vps: { name: 'vps-enterprise-12345' }
      });
      
      mockTransIPClient.vps.get.mockResolvedValue({
        name: 'vps-enterprise-12345',
        ipAddress: '192.168.1.102',
        status: 'running',
        hostname: 'enterprise.recruitiq.nl'
      });

      const result = await transipService.createDedicatedVPS(config);

      expect(result.vpsName).toBe('vps-enterprise-12345');
      
      // Verify enterprise tier specs were used
      expect(mockTransIPClient.vps.order).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'vps-bladevps-x8'
        })
      );
    });

    it('should handle VPS creation errors', async () => {
      const config = {
        organizationId: 'org-error',
        slug: 'errortest',
        tier: 'professional'
      };

      mockTransIPClient.vps.order.mockRejectedValue(
        new Error('TransIP API Error: Insufficient quota')
      );

      await expect(
        transipService.createDedicatedVPS(config)
      ).rejects.toThrow('Failed to create VPS');
    });
  });

  describe('getCloudInitScript', () => {
    it('should generate valid base64 cloud-init script', () => {
      const config = {
        organizationId: 'org-123',
        slug: 'testcompany',
        tier: 'professional'
      };

      const script = transipService.getCloudInitScript(config);

      // Should be base64 encoded
      expect(typeof script).toBe('string');
      expect(script).toMatch(/^[A-Za-z0-9+/=]+$/);

      // Decode and validate content
      const decoded = Buffer.from(script, 'base64').toString('utf-8');
      expect(decoded).toContain('#!/bin/bash');
      expect(decoded).toContain('RecruitIQ VPS Auto-Setup Script');
      expect(decoded).toContain(`Organization: ${config.slug}`);
      expect(decoded).toContain('apt-get update');
      expect(decoded).toContain('curl -fsSL https://get.docker.com');
      expect(decoded).toContain('docker-compose');
    });

    it('should include organization slug in script', () => {
      const config = {
        organizationId: 'org-456',
        slug: 'acmecorp',
        tier: 'enterprise'
      };

      const script = transipService.getCloudInitScript(config);
      const decoded = Buffer.from(script, 'base64').toString('utf-8');

      expect(decoded).toContain('Organization: acmecorp');
      expect(decoded).toContain('TENANT_ID=acmecorp');
      expect(decoded).toContain('INSTANCE_ID=acmecorp-vps');
      expect(decoded).toContain('DATABASE_NAME=recruitiq_acmecorp');
    });

    it('should include SSL configuration', () => {
      const config = {
        organizationId: 'org-789',
        slug: 'ssltest',
        tier: 'professional'
      };

      const script = transipService.getCloudInitScript(config);
      const decoded = Buffer.from(script, 'base64').toString('utf-8');

      expect(decoded).toContain('certbot');
      expect(decoded).toContain('python3-certbot-nginx');
      expect(decoded).toContain('-d ssltest.recruitiq.nl');
      expect(decoded).toContain('certbot renew --quiet');
    });

    it('should include firewall configuration', () => {
      const config = {
        organizationId: 'org-999',
        slug: 'firewall',
        tier: 'starter'
      };

      const script = transipService.getCloudInitScript(config);
      const decoded = Buffer.from(script, 'base64').toString('utf-8');

      expect(decoded).toContain('ufw allow 22/tcp');
      expect(decoded).toContain('ufw allow 80/tcp');
      expect(decoded).toContain('ufw allow 443/tcp');
      expect(decoded).toContain('ufw --force enable');
    });

    it('should include environment variables with secure defaults', () => {
      const config = {
        organizationId: 'org-101',
        slug: 'envtest',
        tier: 'professional'
      };

      const script = transipService.getCloudInitScript(config);
      const decoded = Buffer.from(script, 'base64').toString('utf-8');

      expect(decoded).toContain('NODE_ENV=production');
      expect(decoded).toContain('DEPLOYMENT_TYPE=cloud');
      expect(decoded).toContain('DATABASE_PASSWORD=$(openssl rand -base64 32)');
      expect(decoded).toContain('JWT_SECRET=$(openssl rand -base64 48)');
      expect(decoded).toContain('JWT_REFRESH_SECRET=$(openssl rand -base64 48)');
      expect(decoded).toContain('REDIS_PASSWORD=$(openssl rand -base64 32)');
    });
  });

  describe('getVPSStatus', () => {
    it('should return VPS status', async () => {
      const vpsName = 'vps-testcompany-12345';

      mockTransIPClient.vps.get.mockResolvedValue({
        name: vpsName,
        status: 'running',
        ipAddress: '192.168.1.100',
        cpus: 2,
        memoryInMb: 4096,
        diskInGb: 100,
        isLocked: false,
        isBlocked: false
      });

      const status = await transipService.getVPSStatus(vpsName);

      expect(status).toHaveProperty('name', vpsName);
      expect(status).toHaveProperty('status', 'running');
      expect(status).toHaveProperty('ipAddress', '192.168.1.100');
      expect(status).toHaveProperty('cpus', 2);
      expect(status).toHaveProperty('memoryInMb', 4096);
      expect(status).toHaveProperty('diskInGb', 100);
      expect(status).toHaveProperty('isLocked', false);
      expect(status).toHaveProperty('isBlocked', false);
    });

    it('should handle VPS not found', async () => {
      const vpsName = 'vps-notfound-999';

      mockTransIPClient.vps.get.mockRejectedValue(
        new Error('VPS not found')
      );

      await expect(
        transipService.getVPSStatus(vpsName)
      ).rejects.toThrow('Failed to get VPS status');
    });
  });

  describe('waitForVPSReady', () => {
    it('should resolve when VPS is ready', async () => {
      const vpsName = 'vps-ready-123';

      mockTransIPClient.vps.get.mockResolvedValue({
        name: vpsName,
        status: 'running',
        ipAddress: '192.168.1.100',
        isLocked: false,
        isBlocked: false
      });

      const result = await transipService.waitForVPSReady(vpsName, 5000);

      expect(result).toHaveProperty('status', 'running');
      expect(result).toHaveProperty('ipAddress');
    });

    it('should wait for VPS to unlock', async () => {
      const vpsName = 'vps-locked-456';

      // First call: locked, second call: unlocked
      mockTransIPClient.vps.get
        .mockResolvedValueOnce({
          name: vpsName,
          status: 'running',
          ipAddress: '192.168.1.101',
          isLocked: true
        })
        .mockResolvedValueOnce({
          name: vpsName,
          status: 'running',
          ipAddress: '192.168.1.101',
          isLocked: false
        });

      const result = await transipService.waitForVPSReady(vpsName, 30000);

      expect(result).toHaveProperty('isLocked', false);
      expect(mockTransIPClient.vps.get).toHaveBeenCalledTimes(2);
    }, 35000);

    it('should timeout if VPS never becomes ready', async () => {
      const vpsName = 'vps-timeout-789';

      mockTransIPClient.vps.get.mockRejectedValue(
        new Error('VPS not found')
      );

      await expect(
        transipService.waitForVPSReady(vpsName, 100)
      ).rejects.toThrow('did not become ready');
    });
  });

  describe('VPS management operations', () => {
    it('should stop VPS', async () => {
      const vpsName = 'vps-stop-123';

      mockTransIPClient.vps.stop.mockResolvedValue(undefined);

      await transipService.stopVPS(vpsName);

      expect(mockTransIPClient.vps.stop).toHaveBeenCalledWith(vpsName);
    });

    it('should handle stop VPS errors', async () => {
      const vpsName = 'vps-stop-error';

      mockTransIPClient.vps.stop.mockRejectedValue(
        new Error('VPS already stopped')
      );

      await expect(
        transipService.stopVPS(vpsName)
      ).rejects.toThrow('Failed to stop VPS');
    });

    it('should start VPS', async () => {
      const vpsName = 'vps-start-456';

      mockTransIPClient.vps.start.mockResolvedValue(undefined);

      await transipService.startVPS(vpsName);

      expect(mockTransIPClient.vps.start).toHaveBeenCalledWith(vpsName);
    });

    it('should handle start VPS errors', async () => {
      const vpsName = 'vps-start-error';

      mockTransIPClient.vps.start.mockRejectedValue(
        new Error('VPS already running')
      );

      await expect(
        transipService.startVPS(vpsName)
      ).rejects.toThrow('Failed to start VPS');
    });

    it('should delete VPS', async () => {
      const vpsName = 'vps-delete-789';

      mockTransIPClient.vps.cancel.mockResolvedValue(undefined);

      await transipService.deleteVPS(vpsName);

      expect(mockTransIPClient.vps.cancel).toHaveBeenCalledWith(vpsName, 'end');
    });

    it('should handle delete VPS errors', async () => {
      const vpsName = 'vps-delete-error';

      mockTransIPClient.vps.cancel.mockRejectedValue(
        new Error('Cannot cancel active VPS')
      );

      await expect(
        transipService.deleteVPS(vpsName)
      ).rejects.toThrow('Failed to delete VPS');
    });

    it('should create snapshot', async () => {
      const vpsName = 'vps-snapshot-999';
      const description = 'Daily backup';

      mockTransIPClient.vps.snapshots.create.mockResolvedValue({
        id: 'snapshot-12345',
        description: 'Daily backup',
        dateTimeCreate: '2025-11-21T12:00:00Z'
      });

      const result = await transipService.createSnapshot(vpsName, description);

      expect(result).toHaveProperty('snapshotId', 'snapshot-12345');
      expect(result).toHaveProperty('description', 'Daily backup');
      expect(result).toHaveProperty('createdAt', '2025-11-21T12:00:00Z');
      
      expect(mockTransIPClient.vps.snapshots.create).toHaveBeenCalledWith(
        vpsName,
        expect.objectContaining({
          description: 'Daily backup',
          shouldStartVps: true
        })
      );
    });

    it('should handle snapshot creation errors', async () => {
      const vpsName = 'vps-snapshot-error';
      const description = 'Failed backup';

      mockTransIPClient.vps.snapshots.create.mockRejectedValue(
        new Error('Snapshot limit exceeded')
      );

      await expect(
        transipService.createSnapshot(vpsName, description)
      ).rejects.toThrow('Failed to create snapshot');
    });
  });
});
