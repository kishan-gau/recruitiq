import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the transip-api module
const mockVpsApi = {
  list: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
  remove: jest.fn(),
  listSnapshots: jest.fn(),
  createSnapshot: jest.fn(),
  revertSnapshot: jest.fn(),
  removeSnapshot: jest.fn(),
  reinstall: jest.fn()
};

const mockTransIPClient = jest.fn(() => ({
  vps: mockVpsApi
}));

jest.unstable_mockModule('transip-api', () => ({
  default: mockTransIPClient
}));

// Import TransIPService after mocking
const { default: TransIPService } = await import('../../../src/services/TransIPService.js');

describe('TransIPService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransIPService({
      login: 'test-user',
      privateKey: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----'
    });
  });

  describe('listVPS', () => {
    it('should return list of VPS instances', async () => {
      const mockVpsList = [
        {
          name: 'vps-test-1',
          productName: 'vps-bladevps-x4',
          operatingSystem: 'ubuntu-20.04',
          diskSize: 157286400,
          memorySize: 4194304,
          cpus: 2,
          status: 'running',
          ipAddress: '37.97.254.1',
          ipv6Address: '2a01:7c8:3:1337::1',
          isLocked: false,
          isBlocked: false,
          isCustomerLocked: false
        }
      ];

      mockVpsApi.list.mockResolvedValue({ vpss: mockVpsList });

      const result = await service.listVPS();

      expect(result).toEqual(mockVpsList);
      expect(mockVpsApi.list).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockVpsApi.list.mockRejectedValue(new Error('API Error'));

      await expect(service.listVPS()).rejects.toThrow('Failed to list VPS instances');
    });
  });

  describe('getVPS', () => {
    it('should return VPS details', async () => {
      const mockVps = {
        name: 'vps-test-1',
        status: 'running',
        ipAddress: '37.97.254.1'
      };

      mockVpsApi.get.mockResolvedValue({ vps: mockVps });

      const result = await service.getVPS('vps-test-1');

      expect(result).toEqual(mockVps);
      expect(mockVpsApi.get).toHaveBeenCalledWith('vps-test-1');
    });

    it('should throw error when VPS not found', async () => {
      mockVpsApi.get.mockRejectedValue(new Error('VPS not found'));

      await expect(service.getVPS('non-existent')).rejects.toThrow('Failed to get VPS details');
    });
  });

  describe('createVPS', () => {
    it('should create a new VPS instance', async () => {
      const config = {
        productName: 'vps-bladevps-x4',
        operatingSystem: 'ubuntu-20.04',
        hostname: 'test-server',
        description: 'Test Server'
      };

      const mockVps = {
        name: 'vps-test-1',
        ...config,
        status: 'installing',
        ipAddress: '37.97.254.1'
      };

      mockVpsApi.create.mockResolvedValue({ vps: mockVps });

      const result = await service.createVPS(config);

      expect(result).toEqual(mockVps);
      expect(mockVpsApi.create).toHaveBeenCalledWith(expect.objectContaining({
        productName: config.productName,
        operatingSystem: config.operatingSystem,
        hostname: config.hostname,
        description: config.description
      }));
    });

    it('should validate required fields', async () => {
      await expect(service.createVPS({})).rejects.toThrow('productName is required');
      await expect(service.createVPS({ productName: 'test' })).rejects.toThrow('operatingSystem is required');
    });
  });

  describe('startVPS', () => {
    it('should start a stopped VPS', async () => {
      mockVpsApi.start.mockResolvedValue({ status: 'success' });

      const result = await service.startVPS('vps-test-1');

      expect(result).toBe(true);
      expect(mockVpsApi.start).toHaveBeenCalledWith('vps-test-1');
    });

    it('should handle start errors', async () => {
      mockVpsApi.start.mockRejectedValue(new Error('Cannot start VPS'));

      await expect(service.startVPS('vps-test-1')).rejects.toThrow('Failed to start VPS');
    });
  });

  describe('stopVPS', () => {
    it('should stop a running VPS', async () => {
      mockVpsApi.stop.mockResolvedValue({ status: 'success' });

      const result = await service.stopVPS('vps-test-1');

      expect(result).toBe(true);
      expect(mockVpsApi.stop).toHaveBeenCalledWith('vps-test-1');
    });
  });

  describe('resetVPS', () => {
    it('should reset a VPS', async () => {
      mockVpsApi.reset.mockResolvedValue({ status: 'success' });

      const result = await service.resetVPS('vps-test-1');

      expect(result).toBe(true);
      expect(mockVpsApi.reset).toHaveBeenCalledWith('vps-test-1');
    });
  });

  describe('deleteVPS', () => {
    it('should delete a VPS', async () => {
      mockVpsApi.remove.mockResolvedValue({ status: 'success' });

      const result = await service.deleteVPS('vps-test-1');

      expect(result).toBe(true);
      expect(mockVpsApi.remove).toHaveBeenCalledWith('vps-test-1', 'end');
    });
  });

  describe('Snapshot Management', () => {
    it('should list snapshots', async () => {
      const mockSnapshots = [
        { name: 'snap-1', description: 'Backup 1', creationDate: '2025-11-20' }
      ];

      mockVpsApi.listSnapshots.mockResolvedValue({ snapshots: mockSnapshots });

      const result = await service.listSnapshots('vps-test-1');

      expect(result).toEqual(mockSnapshots);
      expect(mockVpsApi.listSnapshots).toHaveBeenCalledWith('vps-test-1');
    });

    it('should create a snapshot', async () => {
      const mockSnapshot = { name: 'snap-1', description: 'Backup' };
      mockVpsApi.createSnapshot.mockResolvedValue({ snapshot: mockSnapshot });

      const result = await service.createSnapshot('vps-test-1', 'Backup');

      expect(result).toEqual(mockSnapshot);
      expect(mockVpsApi.createSnapshot).toHaveBeenCalledWith('vps-test-1', 'Backup');
    });

    it('should revert to snapshot', async () => {
      mockVpsApi.revertSnapshot.mockResolvedValue({ status: 'success' });

      const result = await service.revertSnapshot('vps-test-1', 'snap-1');

      expect(result).toBe(true);
      expect(mockVpsApi.revertSnapshot).toHaveBeenCalledWith('vps-test-1', 'snap-1');
    });

    it('should delete a snapshot', async () => {
      mockVpsApi.removeSnapshot.mockResolvedValue({ status: 'success' });

      const result = await service.deleteSnapshot('vps-test-1', 'snap-1');

      expect(result).toBe(true);
      expect(mockVpsApi.removeSnapshot).toHaveBeenCalledWith('vps-test-1', 'snap-1');
    });
  });

  describe('reinstallVPS', () => {
    it('should reinstall VPS with new OS', async () => {
      const mockVps = { name: 'vps-test-1', status: 'installing' };
      mockVpsApi.reinstall.mockResolvedValue({ vps: mockVps });

      const result = await service.reinstallVPS('vps-test-1', 'ubuntu-22.04');

      expect(result).toEqual(mockVps);
      expect(mockVpsApi.reinstall).toHaveBeenCalledWith('vps-test-1', {
        operatingSystem: 'ubuntu-22.04'
      });
    });
  });

  describe('waitForVPSReady', () => {
    it('should wait until VPS is running', async () => {
      mockVpsApi.get
        .mockResolvedValueOnce({ vps: { name: 'vps-test-1', status: 'installing', isLocked: true } })
        .mockResolvedValueOnce({ vps: { name: 'vps-test-1', status: 'running', isLocked: false } });

      const result = await service.waitForVPSReady('vps-test-1', 5000, 1000);

      expect(result).toBe(true);
      expect(mockVpsApi.get).toHaveBeenCalledTimes(2);
    });

    it('should timeout if VPS not ready', async () => {
      mockVpsApi.get.mockResolvedValue({ 
        vps: { name: 'vps-test-1', status: 'installing', isLocked: true } 
      });

      await expect(service.waitForVPSReady('vps-test-1', 2000, 1000))
        .rejects.toThrow('VPS did not become ready within timeout period');
    });

    it('should throw error if VPS is blocked', async () => {
      mockVpsApi.get.mockResolvedValue({ 
        vps: { name: 'vps-test-1', status: 'stopped', isBlocked: true } 
      });

      await expect(service.waitForVPSReady('vps-test-1', 5000, 1000))
        .rejects.toThrow('VPS is blocked');
    });
  });
});
