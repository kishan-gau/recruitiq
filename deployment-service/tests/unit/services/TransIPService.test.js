/**
 * TransIPService Unit Tests
 * 
 * Comprehensive test suite for TransIP VPS management service
 * Following RecruitIQ testing standards with proper mocking and DI
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Create mock implementations
const mockVPSClient = {
  list: jest.fn(),
  get: jest.fn(),
  order: jest.fn(),
  cancel: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
  getUsage: jest.fn(),
  getFirewall: jest.fn(),
  addFirewallRule: jest.fn(),
  createSnapshot: jest.fn(),
  listSnapshots: jest.fn(),
  revertToSnapshot: jest.fn()
};

const mockSSHKeysClient = {
  list: jest.fn(),
  create: jest.fn(),
  delete: jest.fn()
};

const mockCreateClient = jest.fn(() => ({
  vps: mockVPSClient,
  sshKeys: mockSSHKeysClient
}));

// Mock @transip/node module
jest.unstable_mockModule('@transip/node', () => ({
  default: { createClient: mockCreateClient },
  createClient: mockCreateClient
}));

// Mock config
jest.unstable_mockModule('../../../src/config/index.js', () => ({
  config: {
    transip: {
      username: 'test-account',
      privateKey: 'test-private-key',
      whitelistOnlyMode: false
    }
  }
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import TransIPService after mocks are set up
const { default: TransIPService } = await import('../../../src/services/TransIPService.js');

describe('TransIPService', () => {
  let service;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create fresh service instance
    service = new TransIPService();
  });

  describe('Constructor', () => {
    it('should initialize TransIP client with config credentials', () => {
      expect(mockCreateClient).toHaveBeenCalledWith({
        username: 'test-account',
        privateKey: 'test-private-key',
        whitelistOnlyMode: false
      });
    });

    it('should log initialization', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        'TransIP client initialized',
        expect.objectContaining({
          username: 'test-account',
          whitelistMode: false
        })
      );
    });
  });

  describe('listVPS', () => {
    it('should return list of VPS instances', async () => {
      // Arrange
      const mockVPSList = [
        { name: 'vps-001', status: 'running', ipAddress: '185.3.211.100' },
        { name: 'vps-002', status: 'stopped', ipAddress: '185.3.211.101' }
      ];
      mockVPSClient.list.mockResolvedValue(mockVPSList);

      // Act
      const result = await service.listVPS();

      // Assert
      expect(result).toEqual(mockVPSList);
      expect(mockVPSClient.list).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching VPS list from TransIP'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'VPS list retrieved',
        { count: 2 }
      );
    });

    it('should throw error when API call fails', async () => {
      // Arrange
      const apiError = new Error('API connection failed');
      mockVPSClient.list.mockRejectedValue(apiError);

      // Act & Assert
      await expect(service.listVPS()).rejects.toThrow(
        'Failed to list VPS: API connection failed'
      );
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to list VPS instances',
        expect.objectContaining({
          error: 'API connection failed'
        })
      );
    });

    it('should return empty array when no VPS instances exist', async () => {
      // Arrange
      mockVPSClient.list.mockResolvedValue([]);

      // Act
      const result = await service.listVPS();

      // Assert
      expect(result).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'VPS list retrieved',
        { count: 0 }
      );
    });
  });

  describe('getVPS', () => {
    it('should return VPS details for valid VPS name', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const mockVPS = {
        name: vpsName,
        status: 'running',
        ipAddress: '185.3.211.100',
        description: 'Test VPS'
      };
      mockVPSClient.get.mockResolvedValue(mockVPS);

      // Act
      const result = await service.getVPS(vpsName);

      // Assert
      expect(result).toEqual(mockVPS);
      expect(mockVPSClient.get).toHaveBeenCalledWith(vpsName);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching VPS details',
        { vpsName }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'VPS details retrieved',
        expect.objectContaining({
          vpsName,
          status: 'running',
          ipAddress: '185.3.211.100'
        })
      );
    });

    it('should throw error when VPS not found', async () => {
      // Arrange
      const vpsName = 'non-existent';
      const notFoundError = new Error('VPS not found');
      mockVPSClient.get.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(service.getVPS(vpsName)).rejects.toThrow(
        'Failed to get VPS non-existent: VPS not found'
      );
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get VPS details',
        expect.objectContaining({
          vpsName,
          error: 'VPS not found'
        })
      );
    });
  });

  describe('createVPS', () => {
    it('should create VPS with valid configuration', async () => {
      // Arrange
      const vpsConfig = {
        productName: 'vps-bladevps-x4',
        operatingSystem: 'ubuntu-22.04',
        hostname: 'test-vps',
        description: 'Test VPS Instance',
        sshKeys: ['ssh-key-fingerprint'],
        availabilityZone: 'ams0'
      };

      const mockCreatedVPS = {
        name: 'vps-test-123',
        ipAddress: '185.3.211.100',
        status: 'installing',
        ...vpsConfig
      };

      mockVPSClient.order.mockResolvedValue(mockCreatedVPS);

      // Act
      const result = await service.createVPS(vpsConfig);

      // Assert
      expect(result).toEqual(mockCreatedVPS);
      expect(mockVPSClient.order).toHaveBeenCalledWith(vpsConfig);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating VPS',
        { config: vpsConfig }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'VPS created successfully',
        expect.objectContaining({
          vpsName: 'vps-test-123',
          ipAddress: '185.3.211.100',
          status: 'installing'
        })
      );
    });

    it('should throw error when VPS creation fails', async () => {
      // Arrange
      const vpsConfig = {
        productName: 'vps-bladevps-x4',
        operatingSystem: 'ubuntu-22.04'
      };
      
      const creationError = new Error('Insufficient resources');
      mockVPSClient.order.mockRejectedValue(creationError);

      // Act & Assert
      await expect(service.createVPS(vpsConfig)).rejects.toThrow(
        'Failed to create VPS: Insufficient resources'
      );
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create VPS',
        expect.objectContaining({
          config: vpsConfig,
          error: 'Insufficient resources'
        })
      );
    });

    it('should create VPS with minimal configuration', async () => {
      // Arrange
      const minimalConfig = {
        productName: 'vps-bladevps-x1',
        operatingSystem: 'ubuntu-22.04'
      };

      const mockCreatedVPS = {
        name: 'vps-minimal-456',
        ipAddress: '185.3.211.102',
        status: 'installing'
      };

      mockVPSClient.order.mockResolvedValue(mockCreatedVPS);

      // Act
      const result = await service.createVPS(minimalConfig);

      // Assert
      expect(result).toEqual(mockCreatedVPS);
      expect(mockVPSClient.order).toHaveBeenCalledWith(minimalConfig);
    });
  });

  describe('cancelVPS', () => {
    it('should cancel VPS immediately', async () => {
      // Arrange
      const vpsName = 'vps-001';
      mockVPSClient.cancel.mockResolvedValue();

      // Act
      await service.cancelVPS(vpsName, 'immediately');

      // Assert
      expect(mockVPSClient.cancel).toHaveBeenCalledWith(vpsName, 'immediately');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cancelling VPS',
        { vpsName, endTime: 'immediately' }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'VPS cancelled successfully',
        { vpsName }
      );
    });

    it('should cancel VPS at end of billing period', async () => {
      // Arrange
      const vpsName = 'vps-002';
      mockVPSClient.cancel.mockResolvedValue();

      // Act
      await service.cancelVPS(vpsName, 'end');

      // Assert
      expect(mockVPSClient.cancel).toHaveBeenCalledWith(vpsName, 'end');
    });

    it('should use default endTime of immediately', async () => {
      // Arrange
      const vpsName = 'vps-003';
      mockVPSClient.cancel.mockResolvedValue();

      // Act
      await service.cancelVPS(vpsName);

      // Assert
      expect(mockVPSClient.cancel).toHaveBeenCalledWith(vpsName, 'immediately');
    });

    it('should throw error when cancellation fails', async () => {
      // Arrange
      const vpsName = 'vps-004';
      const cancelError = new Error('VPS is locked');
      mockVPSClient.cancel.mockRejectedValue(cancelError);

      // Act & Assert
      await expect(service.cancelVPS(vpsName)).rejects.toThrow(
        'Failed to cancel VPS vps-004: VPS is locked'
      );
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to cancel VPS',
        expect.objectContaining({
          vpsName,
          error: 'VPS is locked'
        })
      );
    });
  });

  describe('startVPS', () => {
    it('should start stopped VPS', async () => {
      // Arrange
      const vpsName = 'vps-001';
      mockVPSClient.start.mockResolvedValue();

      // Act
      await service.startVPS(vpsName);

      // Assert
      expect(mockVPSClient.start).toHaveBeenCalledWith(vpsName);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting VPS',
        { vpsName }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'VPS start command sent',
        { vpsName }
      );
    });

    it('should throw error when start operation fails', async () => {
      // Arrange
      const vpsName = 'vps-002';
      const startError = new Error('VPS is already running');
      mockVPSClient.start.mockRejectedValue(startError);

      // Act & Assert
      await expect(service.startVPS(vpsName)).rejects.toThrow(
        'Failed to start VPS vps-002: VPS is already running'
      );
    });
  });

  describe('stopVPS', () => {
    it('should stop running VPS', async () => {
      // Arrange
      const vpsName = 'vps-001';
      mockVPSClient.stop.mockResolvedValue();

      // Act
      await service.stopVPS(vpsName);

      // Assert
      expect(mockVPSClient.stop).toHaveBeenCalledWith(vpsName);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Stopping VPS',
        { vpsName }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'VPS stop command sent',
        { vpsName }
      );
    });

    it('should throw error when stop operation fails', async () => {
      // Arrange
      const vpsName = 'vps-002';
      const stopError = new Error('VPS is already stopped');
      mockVPSClient.stop.mockRejectedValue(stopError);

      // Act & Assert
      await expect(service.stopVPS(vpsName)).rejects.toThrow(
        'Failed to stop VPS vps-002: VPS is already stopped'
      );
    });
  });

  describe('resetVPS', () => {
    it('should reset VPS successfully', async () => {
      // Arrange
      const vpsName = 'vps-001';
      mockVPSClient.reset.mockResolvedValue();

      // Act
      await service.resetVPS(vpsName);

      // Assert
      expect(mockVPSClient.reset).toHaveBeenCalledWith(vpsName);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Resetting VPS',
        { vpsName }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'VPS reset command sent',
        { vpsName }
      );
    });

    it('should throw error when reset fails', async () => {
      // Arrange
      const vpsName = 'vps-002';
      const resetError = new Error('VPS is locked');
      mockVPSClient.reset.mockRejectedValue(resetError);

      // Act & Assert
      await expect(service.resetVPS(vpsName)).rejects.toThrow(
        'Failed to reset VPS vps-002: VPS is locked'
      );
    });
  });

  describe('getVPSUsage', () => {
    it('should return usage statistics', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const mockUsage = {
        cpu: 45,
        memory: 60,
        disk: 70,
        network: {
          incoming: 1024,
          outgoing: 2048
        }
      };
      mockVPSClient.getUsage.mockResolvedValue(mockUsage);

      // Act
      const result = await service.getVPSUsage(vpsName);

      // Assert
      expect(result).toEqual(mockUsage);
      expect(mockVPSClient.getUsage).toHaveBeenCalledWith(vpsName);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'VPS usage retrieved',
        expect.objectContaining({
          vpsName,
          cpu: 45,
          memory: 60
        })
      );
    });

    it('should throw error when usage retrieval fails', async () => {
      // Arrange
      const vpsName = 'vps-002';
      const usageError = new Error('Metrics unavailable');
      mockVPSClient.getUsage.mockRejectedValue(usageError);

      // Act & Assert
      await expect(service.getVPSUsage(vpsName)).rejects.toThrow(
        'Failed to get VPS usage for vps-002: Metrics unavailable'
      );
    });
  });

  describe('SSH Key Management', () => {
    describe('listSSHKeys', () => {
      it('should return list of SSH keys', async () => {
        // Arrange
        const mockKeys = [
          { id: 1, description: 'dev-key', fingerprint: 'aa:bb:cc' },
          { id: 2, description: 'prod-key', fingerprint: 'dd:ee:ff' }
        ];
        mockSSHKeysClient.list.mockResolvedValue(mockKeys);

        // Act
        const result = await service.listSSHKeys();

        // Assert
        expect(result).toEqual(mockKeys);
        expect(mockSSHKeysClient.list).toHaveBeenCalledTimes(1);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'SSH keys retrieved',
          { count: 2 }
        );
      });

      it('should throw error when listing fails', async () => {
        // Arrange
        const listError = new Error('API error');
        mockSSHKeysClient.list.mockRejectedValue(listError);

        // Act & Assert
        await expect(service.listSSHKeys()).rejects.toThrow(
          'Failed to list SSH keys: API error'
        );
      });
    });

    describe('addSSHKey', () => {
      it('should add SSH key successfully', async () => {
        // Arrange
        const keyData = {
          description: 'new-key',
          sshKey: 'ssh-rsa AAAAB3NzaC1yc2E...'
        };
        
        const mockCreatedKey = {
          id: 3,
          description: 'new-key',
          fingerprint: 'ff:ee:dd:cc'
        };
        
        mockSSHKeysClient.create.mockResolvedValue(mockCreatedKey);

        // Act
        const result = await service.addSSHKey(keyData);

        // Assert
        expect(result).toEqual(mockCreatedKey);
        expect(mockSSHKeysClient.create).toHaveBeenCalledWith(keyData);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'SSH key added successfully',
          expect.objectContaining({
            description: 'new-key',
            fingerprint: 'ff:ee:dd:cc'
          })
        );
      });

      it('should throw error when key creation fails', async () => {
        // Arrange
        const keyData = {
          description: 'invalid-key',
          sshKey: 'invalid-key-format'
        };
        
        const createError = new Error('Invalid SSH key format');
        mockSSHKeysClient.create.mockRejectedValue(createError);

        // Act & Assert
        await expect(service.addSSHKey(keyData)).rejects.toThrow(
          'Failed to add SSH key: Invalid SSH key format'
        );
      });
    });

    describe('removeSSHKey', () => {
      it('should remove SSH key successfully', async () => {
        // Arrange
        const keyId = 1;
        mockSSHKeysClient.delete.mockResolvedValue();

        // Act
        await service.removeSSHKey(keyId);

        // Assert
        expect(mockSSHKeysClient.delete).toHaveBeenCalledWith(keyId);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'SSH key removed successfully',
          { keyId }
        );
      });

      it('should throw error when removal fails', async () => {
        // Arrange
        const keyId = 999;
        const deleteError = new Error('Key not found');
        mockSSHKeysClient.delete.mockRejectedValue(deleteError);

        // Act & Assert
        await expect(service.removeSSHKey(keyId)).rejects.toThrow(
          'Failed to remove SSH key 999: Key not found'
        );
      });
    });
  });

  describe('Firewall Management', () => {
    describe('listFirewallRules', () => {
      it('should return firewall rules', async () => {
        // Arrange
        const vpsName = 'vps-001';
        const mockRules = [
          { protocol: 'tcp', port: 22, description: 'SSH' },
          { protocol: 'tcp', port: 443, description: 'HTTPS' }
        ];
        mockVPSClient.getFirewall.mockResolvedValue(mockRules);

        // Act
        const result = await service.listFirewallRules(vpsName);

        // Assert
        expect(result).toEqual(mockRules);
        expect(mockVPSClient.getFirewall).toHaveBeenCalledWith(vpsName);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Firewall rules retrieved',
          { vpsName, count: 2 }
        );
      });
    });

    describe('addFirewallRule', () => {
      it('should add firewall rule successfully', async () => {
        // Arrange
        const vpsName = 'vps-001';
        const rule = {
          protocol: 'tcp',
          port: 8080,
          whitelist: '0.0.0.0/0',
          description: 'Web server'
        };
        mockVPSClient.addFirewallRule.mockResolvedValue();

        // Act
        await service.addFirewallRule(vpsName, rule);

        // Assert
        expect(mockVPSClient.addFirewallRule).toHaveBeenCalledWith(vpsName, rule);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Firewall rule added',
          { vpsName, rule }
        );
      });
    });
  });

  describe('Snapshot Management', () => {
    describe('createSnapshot', () => {
      it('should create snapshot successfully', async () => {
        // Arrange
        const vpsName = 'vps-001';
        const description = 'Pre-upgrade backup';
        const mockSnapshot = {
          id: 'snap-123',
          description,
          createdAt: new Date().toISOString()
        };
        mockVPSClient.createSnapshot.mockResolvedValue(mockSnapshot);

        // Act
        const result = await service.createSnapshot(vpsName, description);

        // Assert
        expect(result).toEqual(mockSnapshot);
        expect(mockVPSClient.createSnapshot).toHaveBeenCalledWith(vpsName, description);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Snapshot created',
          expect.objectContaining({
            vpsName,
            snapshotId: 'snap-123',
            description
          })
        );
      });
    });

    describe('listSnapshots', () => {
      it('should return list of snapshots', async () => {
        // Arrange
        const vpsName = 'vps-001';
        const mockSnapshots = [
          { id: 'snap-1', description: 'Backup 1' },
          { id: 'snap-2', description: 'Backup 2' }
        ];
        mockVPSClient.listSnapshots.mockResolvedValue(mockSnapshots);

        // Act
        const result = await service.listSnapshots(vpsName);

        // Assert
        expect(result).toEqual(mockSnapshots);
        expect(mockVPSClient.listSnapshots).toHaveBeenCalledWith(vpsName);
      });
    });

    describe('revertToSnapshot', () => {
      it('should revert to snapshot successfully', async () => {
        // Arrange
        const vpsName = 'vps-001';
        const snapshotId = 'snap-123';
        mockVPSClient.revertToSnapshot.mockResolvedValue();

        // Act
        await service.revertToSnapshot(vpsName, snapshotId);

        // Assert
        expect(mockVPSClient.revertToSnapshot).toHaveBeenCalledWith(vpsName, snapshotId);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'VPS reverted to snapshot',
          { vpsName, snapshotId }
        );
      });
    });
  });

  describe('waitForVPSReady', () => {
    it('should return when VPS reaches running status', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const mockVPS = {
        name: vpsName,
        status: 'running',
        ipAddress: '185.3.211.100',
        isBlocked: false,
        isLocked: false
      };
      mockVPSClient.get.mockResolvedValue(mockVPS);

      // Act
      const result = await service.waitForVPSReady(vpsName, 30000, 1000);

      // Assert
      expect(result).toEqual(mockVPS);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'VPS is ready',
        expect.objectContaining({
          vpsName,
          ipAddress: '185.3.211.100'
        })
      );
    });

    it('should wait and retry until VPS is running', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const installingVPS = {
        name: vpsName,
        status: 'installing',
        isBlocked: false,
        isLocked: false
      };
      const runningVPS = {
        ...installingVPS,
        status: 'running',
        ipAddress: '185.3.211.100'
      };

      mockVPSClient.get
        .mockResolvedValueOnce(installingVPS)
        .mockResolvedValueOnce(installingVPS)
        .mockResolvedValueOnce(runningVPS);

      // Act
      const result = await service.waitForVPSReady(vpsName, 30000, 100);

      // Assert
      expect(result).toEqual(runningVPS);
      expect(mockVPSClient.get).toHaveBeenCalledTimes(3);
    });

    it('should throw error when VPS is blocked', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const blockedVPS = {
        name: vpsName,
        status: 'stopped',
        isBlocked: true,
        isLocked: false
      };
      mockVPSClient.get.mockResolvedValue(blockedVPS);

      // Act & Assert
      await expect(
        service.waitForVPSReady(vpsName, 5000, 100)
      ).rejects.toThrow('VPS vps-001 is blocked');
    });

    it('should wait when VPS is locked', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const lockedVPS = {
        name: vpsName,
        status: 'running',
        isBlocked: false,
        isLocked: true
      };
      const unlockedVPS = {
        ...lockedVPS,
        isLocked: false
      };

      mockVPSClient.get
        .mockResolvedValueOnce(lockedVPS)
        .mockResolvedValueOnce(unlockedVPS);

      // Act
      const result = await service.waitForVPSReady(vpsName, 30000, 100);

      // Assert
      expect(result).toEqual(unlockedVPS);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'VPS is locked, waiting...',
        { vpsName }
      );
    });

    it('should timeout if VPS never becomes ready', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const installingVPS = {
        name: vpsName,
        status: 'installing',
        isBlocked: false,
        isLocked: false
      };
      mockVPSClient.get.mockResolvedValue(installingVPS);

      // Act & Assert
      await expect(
        service.waitForVPSReady(vpsName, 500, 100)
      ).rejects.toThrow('Timeout waiting for VPS vps-001 to be ready after 500ms');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status for running VPS with low usage', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const mockVPS = {
        name: vpsName,
        status: 'running',
        isBlocked: false,
        isLocked: false
      };
      const mockUsage = {
        cpu: 45,
        memory: 60
      };

      mockVPSClient.get.mockResolvedValue(mockVPS);
      mockVPSClient.getUsage.mockResolvedValue(mockUsage);

      // Act
      const result = await service.healthCheck(vpsName);

      // Assert
      expect(result.isHealthy).toBe(true);
      expect(result.vps).toEqual(mockVPS);
      expect(result.usage).toEqual(mockUsage);
      expect(result.timestamp).toBeDefined();
    });

    it('should return unhealthy status for blocked VPS', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const mockVPS = {
        name: vpsName,
        status: 'running',
        isBlocked: true,
        isLocked: false
      };
      const mockUsage = {
        cpu: 10,
        memory: 20
      };

      mockVPSClient.get.mockResolvedValue(mockVPS);
      mockVPSClient.getUsage.mockResolvedValue(mockUsage);

      // Act
      const result = await service.healthCheck(vpsName);

      // Assert
      expect(result.isHealthy).toBe(false);
    });

    it('should return unhealthy status for high CPU usage', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const mockVPS = {
        name: vpsName,
        status: 'running',
        isBlocked: false,
        isLocked: false
      };
      const mockUsage = {
        cpu: 95,
        memory: 60
      };

      mockVPSClient.get.mockResolvedValue(mockVPS);
      mockVPSClient.getUsage.mockResolvedValue(mockUsage);

      // Act
      const result = await service.healthCheck(vpsName);

      // Assert
      expect(result.isHealthy).toBe(false);
    });

    it('should return unhealthy status for high memory usage', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const mockVPS = {
        name: vpsName,
        status: 'running',
        isBlocked: false,
        isLocked: false
      };
      const mockUsage = {
        cpu: 45,
        memory: 95
      };

      mockVPSClient.get.mockResolvedValue(mockVPS);
      mockVPSClient.getUsage.mockResolvedValue(mockUsage);

      // Act
      const result = await service.healthCheck(vpsName);

      // Assert
      expect(result.isHealthy).toBe(false);
    });

    it('should return unhealthy status on error', async () => {
      // Arrange
      const vpsName = 'vps-001';
      const healthError = new Error('Connection timeout');
      mockVPSClient.get.mockRejectedValue(healthError);

      // Act
      const result = await service.healthCheck(vpsName);

      // Assert
      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Connection timeout');
      expect(result.timestamp).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.objectContaining({
          vpsName,
          error: 'Connection timeout'
        })
      );
    });
  });

  describe('sleep helper', () => {
    it('should delay execution for specified milliseconds', async () => {
      // Arrange
      const startTime = Date.now();
      const delayMs = 100;

      // Act
      await service.sleep(delayMs);

      // Assert
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(delayMs);
      expect(elapsed).toBeLessThan(delayMs + 50); // Allow 50ms tolerance
    });
  });
});
