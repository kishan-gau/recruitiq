/**
 * TLS Configuration Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import tlsConfig from '../../utils/tlsConfig.js';
import fs from 'fs';
import path from 'path';

describe('TLS Configuration', () => {
  describe('validateTLSConfig', () => {
    it('should validate TLS configuration', () => {
      const result = tlsConfig.validateTLSConfig();
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('tlsVersion');
      expect(result).toHaveProperty('opensslVersion');
      expect(result).toHaveProperty('supportsTLS13');
    });
    
    it('should detect missing certificate paths', () => {
      delete process.env.TLS_CERT_PATH;
      delete process.env.TLS_KEY_PATH;
      
      const result = tlsConfig.validateTLSConfig();
      
      // In development, should be warnings
      if (result.environment !== 'production') {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });
    
    it('should report TLS version support', () => {
      const result = tlsConfig.validateTLSConfig();
      
      expect(result.tlsVersion).toBeTruthy();
      expect(result.opensslVersion).toBeTruthy();
    });
  });
  
  describe('getTLSConfig', () => {
    it('should return TLS configuration', () => {
      const config = tlsConfig.getTLSConfig();
      
      expect(config).toHaveProperty('minVersion');
      expect(config).toHaveProperty('maxVersion');
      expect(config).toHaveProperty('ciphersuites');
      expect(config).toHaveProperty('ciphers');
      expect(config).toHaveProperty('honorCipherOrder');
      expect(config).toHaveProperty('rejectUnauthorized');
      expect(config).toHaveProperty('sessionTimeout');
    });
    
    it('should use TLS 1.3 by default', () => {
      const config = tlsConfig.getTLSConfig();
      
      expect(config.minVersion).toBe('TLSv1.3');
      expect(config.maxVersion).toBe('TLSv1.3');
    });
    
    it('should include secure cipher suites', () => {
      const config = tlsConfig.getTLSConfig();
      
      expect(config.ciphersuites).toContain('TLS_AES_256_GCM_SHA384');
      expect(config.ciphers).toContain('ECDHE-RSA-AES256-GCM-SHA384');
    });
  });
  
  describe('getHSTSHeader', () => {
    it('should generate HSTS header with default max-age', () => {
      const header = tlsConfig.getHSTSHeader();
      
      expect(header).toContain('max-age=31536000'); // 1 year
      expect(header).toContain('includeSubDomains');
      expect(header).toContain('preload');
    });
    
    it('should generate HSTS header with custom max-age', () => {
      const header = tlsConfig.getHSTSHeader(86400); // 1 day
      
      expect(header).toContain('max-age=86400');
    });
  });
  
  describe('enforceHTTPS', () => {
    it('should create middleware function', () => {
      const middleware = tlsConfig.enforceHTTPS();
      
      expect(typeof middleware).toBe('function');
    });
    
    it('should set HSTS header', () => {
      const middleware = tlsConfig.enforceHTTPS();
      
      const req = {
        secure: true,
        hostname: 'example.com',
        originalUrl: '/test',
      };
      
      const res = {
        setHeader: vi.fn(),
      };
      
      const next = vi.fn();
      
      middleware(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=')
      );
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('tlsHealthCheck', () => {
    it('should return health check status', () => {
      const health = tlsConfig.tlsHealthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('tls');
      expect(health.tls).toHaveProperty('enabled');
      expect(health.tls).toHaveProperty('version');
      expect(health.tls).toHaveProperty('openssl');
      expect(health.tls).toHaveProperty('certificates');
    });
    
    it('should report TLS version information', () => {
      const health = tlsConfig.tlsHealthCheck();
      
      expect(health.tls.version).toHaveProperty('min');
      expect(health.tls.version).toHaveProperty('max');
      expect(health.tls.version).toHaveProperty('current');
      expect(health.tls.version).toHaveProperty('tls13Supported');
    });
  });
  
  describe('TLS_OPTIONS', () => {
    it('should export TLS options', () => {
      expect(tlsConfig.TLS_OPTIONS).toBeTruthy();
      expect(tlsConfig.TLS_OPTIONS.minVersion).toBe('TLSv1.3');
      expect(tlsConfig.TLS_OPTIONS.maxVersion).toBe('TLSv1.3');
      expect(tlsConfig.TLS_OPTIONS.honorCipherOrder).toBe(true);
      expect(tlsConfig.TLS_OPTIONS.rejectUnauthorized).toBe(true);
    });
    
    it('should have session timeout configured', () => {
      expect(tlsConfig.TLS_OPTIONS.sessionTimeout).toBe(300); // 5 minutes
    });
    
    it('should have secure options to disable old protocols', () => {
      expect(tlsConfig.TLS_OPTIONS.secureOptions).toBeTruthy();
    });
  });
});
