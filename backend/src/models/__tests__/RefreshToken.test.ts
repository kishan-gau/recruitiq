/**
 * @jest-environment node
 */

import RefreshToken from '../RefreshToken.ts';

describe('RefreshToken Model - Utility Functions', () => {
  describe('generateDeviceFingerprint', () => {
    it('should generate a consistent fingerprint from user agent and IP', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const ipAddress = '192.168.1.1';

      const fingerprint1 = RefreshToken.generateDeviceFingerprint(userAgent, ipAddress);
      const fingerprint2 = RefreshToken.generateDeviceFingerprint(userAgent, ipAddress);

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(32);
      expect(typeof fingerprint1).toBe('string');
    });

    it('should generate different fingerprints for different inputs', () => {
      const fp1 = RefreshToken.generateDeviceFingerprint(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
        '192.168.1.1'
      );
      const fp2 = RefreshToken.generateDeviceFingerprint(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/14.0',
        '192.168.1.2'
      );

      expect(fp1).not.toBe(fp2);
    });
  });

  describe('parseDeviceName', () => {
    it('should detect iPhone', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      expect(RefreshToken.parseDeviceName(ua)).toBe('iPhone');
    });

    it('should detect iPad', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)';
      expect(RefreshToken.parseDeviceName(ua)).toBe('iPad');
    });

    it('should detect Android Device', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 10; SM-G973F)';
      expect(RefreshToken.parseDeviceName(ua)).toBe('Android Device');
    });

    it('should detect Windows PC', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      expect(RefreshToken.parseDeviceName(ua)).toBe('Windows PC');
    });

    it('should detect Mac', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
      expect(RefreshToken.parseDeviceName(ua)).toBe('Mac');
    });

    it('should detect Linux PC', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64)';
      expect(RefreshToken.parseDeviceName(ua)).toBe('Linux PC');
    });

    it('should return Unknown Device for unrecognized user agent', () => {
      expect(RefreshToken.parseDeviceName('SomethingWeird/1.0')).toBe('Unknown Device');
    });

    it('should return Unknown Device for null or undefined', () => {
      expect(RefreshToken.parseDeviceName(null)).toBe('Unknown Device');
      expect(RefreshToken.parseDeviceName(undefined)).toBe('Unknown Device');
    });
  });
});
