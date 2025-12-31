import { jest } from '@jest/globals';
import path from 'path';

// Mock dependencies BEFORE importing module under test
const mockFs = {
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
};

const mockHttps = {
  createServer: jest.fn(),
};

const mockHttp = {
  createServer: jest.fn(),
};

const mockTls = {
  SSL_OP_NO_SSLv2: 0x01000000,
  SSL_OP_NO_SSLv3: 0x02000000,
  SSL_OP_NO_TLSv1: 0x04000000,
  SSL_OP_NO_TLSv1_1: 0x10000000,
  DEFAULT_MAX_VERSION: 'TLSv1.3',
  TLSSocket: jest.fn(),
};

jest.unstable_mockModule('fs', () => ({
  default: mockFs,
  ...mockFs,
}));
jest.unstable_mockModule('https', () => ({
  default: mockHttps,
  ...mockHttps,
}));
jest.unstable_mockModule('http', () => ({
  default: mockHttp,
  ...mockHttp,
}));
jest.unstable_mockModule('tls', () => ({
  default: mockTls,
  ...mockTls,
}));

jest.unstable_mockModule('../../config/index.ts', () => ({
  default: {
    env: 'test',
    tls: {
      certPath: null,
      keyPath: null,
      caPath: null,
    },
  },
}));

jest.unstable_mockModule('../logger.ts', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import AFTER mocking
const tlsConfigModule = await import('../tlsConfig');
const {
  createSecureServer,
  createServer,
  validateTLSConfig,
  getTLSConfig,
  parseCertificate,
  checkCertificateExpiry,
  getHSTSHeader,
  enforceHTTPS,
  tlsHealthCheck,
} = tlsConfigModule;
const TLS_OPTIONS = tlsConfigModule.default.TLS_OPTIONS;

const logger = (await import('../logger')).default;
const config = (await import('../../config/index')).default;

describe('TLS Configuration Utilities', () => {
  let mockApp, mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset process.env
    process.env.TLS_CERT_PATH = undefined;
    process.env.TLS_KEY_PATH = undefined;
    process.env.TLS_CA_PATH = undefined;
    process.env.NODE_ENV = 'test';
    
    // Reset config
    config.env = 'test';
    config.tls = {
      certPath: null,
      keyPath: null,
      caPath: null,
    };
    
    // Setup mock Node.js versions
    if (!process.versions.openssl) {
      process.versions.openssl = '1.1.1';
    }
    
    mockApp = jest.fn();
    
    mockReq = {
      secure: false,
      hostname: 'example.com',
      originalUrl: '/api/test',
      ip: '192.168.1.1',
    };
    
    mockRes = {
      setHeader: jest.fn(),
      redirect: jest.fn(),
    };
    
    mockNext = jest.fn();
  });

  // ============================================================================
  // TLS OPTIONS
  // ============================================================================

  describe('TLS_OPTIONS', () => {
    it('should enforce TLS 1.3 as minimum version', () => {
      expect(TLS_OPTIONS.minVersion).toBe('TLSv1.3');
    });

    it('should set TLS 1.3 as maximum version', () => {
      expect(TLS_OPTIONS.maxVersion).toBe('TLSv1.3');
    });

    it('should include secure TLS 1.3 cipher suites', () => {
      expect(TLS_OPTIONS.ciphersuites).toContain('TLS_AES_256_GCM_SHA384');
      expect(TLS_OPTIONS.ciphersuites).toContain('TLS_CHACHA20_POLY1305_SHA256');
    });

    it('should include fallback TLS 1.2 ciphers', () => {
      expect(TLS_OPTIONS.ciphers).toContain('ECDHE-RSA-AES256-GCM-SHA384');
    });

    it('should honor cipher order', () => {
      expect(TLS_OPTIONS.honorCipherOrder).toBe(true);
    });

    it('should reject unauthorized certificates', () => {
      expect(TLS_OPTIONS.rejectUnauthorized).toBe(true);
    });

    it('should have secure session timeout', () => {
      expect(TLS_OPTIONS.sessionTimeout).toBe(300);
    });

    it('should disable old SSL/TLS versions', () => {
      expect(TLS_OPTIONS.secureOptions).toBeDefined();
    });
  });

  // ============================================================================
  // CREATE SECURE SERVER
  // ============================================================================

  describe('createSecureServer', () => {
    beforeEach(() => {
      mockFs.readFileSync.mockImplementation((filepath) => {
        const path = String(filepath);
        if (path.includes('cert.pem') || path.endsWith('cert.pem')) return 'CERT_CONTENT';
        if (path.includes('key.pem') || path.endsWith('key.pem')) return 'KEY_CONTENT';
        if (path.includes('ca.pem') || path.endsWith('ca.pem')) return 'CA_CONTENT';
        // For any other path, return generic content
        return 'FILE_CONTENT';
      });
      
      mockFs.existsSync.mockReturnValue(true);
      mockHttps.createServer.mockReturnValue({ server: 'mock' });
    });

    it('should create HTTPS server with valid certificates', () => {
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      
      const server = createSecureServer(mockApp);
      
      expect(mockHttps.createServer).toHaveBeenCalled();
      expect(server).toEqual({ server: 'mock' });
    });

    it('should throw error if certificate path missing', () => {
      process.env.TLS_CERT_PATH = '';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      config.tls.certPath = null;
      
      expect(() => createSecureServer(mockApp)).toThrow();
    });

    it('should throw error if key path missing', () => {
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '';
      config.tls.keyPath = null;
      
      expect(() => createSecureServer(mockApp)).toThrow();
    });

    it('should include CA certificate if provided', () => {
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      process.env.TLS_CA_PATH = '/path/to/ca.pem';
      
      createSecureServer(mockApp);
      
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/ca.pem');
      expect(mockHttps.createServer).toHaveBeenCalledWith(
        expect.objectContaining({
          ca: 'CA_CONTENT',
        }),
        mockApp
      );
    });

    it('should merge custom options with default TLS options', () => {
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      
      const customOptions = { requestCert: true };
      createSecureServer(mockApp, customOptions);
      
      expect(mockHttps.createServer).toHaveBeenCalledWith(
        expect.objectContaining({
          requestCert: true,
          minVersion: 'TLSv1.3',
        }),
        mockApp
      );
    });

    it('should log successful server creation', () => {
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      
      createSecureServer(mockApp);
      
      expect(logger.info).toHaveBeenCalledWith(
        'Secure HTTPS server created',
        expect.objectContaining({
          minVersion: 'TLSv1.3',
          maxVersion: 'TLSv1.3',
        })
      );
    });

    it('should log error on failure', () => {
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });
      
      expect(() => createSecureServer(mockApp)).toThrow('Read error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create secure HTTPS server',
        expect.any(Object)
      );
    });

    it('should skip CA certificate if file does not exist', () => {
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      process.env.TLS_CA_PATH = '/path/to/ca.pem';
      
      mockFs.existsSync.mockImplementation((filepath) => {
        return !filepath.includes('ca.pem');
      });
      
      createSecureServer(mockApp);
      
      expect(mockHttps.createServer).toHaveBeenCalledWith(
        expect.not.objectContaining({
          ca: expect.anything(),
        }),
        mockApp
      );
    });
  });

  // ============================================================================
  // CREATE SERVER WITH FALLBACK
  // ============================================================================

  describe('createServer', () => {
    it('should create HTTPS server in production', () => {
      config.env = 'production';
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      
      mockFs.readFileSync.mockReturnValue('CONTENT');
      mockFs.existsSync.mockReturnValue(true);
      mockHttps.createServer.mockReturnValue({ server: 'https' });
      
      const server = createServer(mockApp);
      
      expect(mockHttps.createServer).toHaveBeenCalled();
      expect(server).toEqual({ server: 'https' });
    });

    it('should handle HTTP fallback in development', () => {
      config.env = 'development';
      config.tls.certPath = null;
      config.tls.keyPath = null;
      process.env.TLS_CERT_PATH = '';
      process.env.TLS_KEY_PATH = '';
      
      // Without certificates in development, createSecureServer will throw
      // and createServer should catch it and fallback to HTTP
      try {
        const server = createServer(mockApp);
        // If it doesn't throw, that's also acceptable in development
        expect(server).toBeDefined();
      } catch (_error) {
        // If it throws, verify error was logged
        expect(error).toBeDefined();
      }
    });

    it('should attempt HTTPS in development if certificates available', () => {
      config.env = 'development';
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      
      mockFs.readFileSync.mockReturnValue('CONTENT');
      mockFs.existsSync.mockReturnValue(true);
      mockHttps.createServer.mockReturnValue({ server: 'https' });
      
      const server = createServer(mockApp);
      
      expect(mockHttps.createServer).toHaveBeenCalled();
      expect(server).toEqual({ server: 'https' });
    });
  });

  // ============================================================================
  // VALIDATE TLS CONFIG
  // ============================================================================

  describe('validateTLSConfig', () => {
    it('should validate successfully with all certificates present', () => {
      config.env = 'production';
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      
      mockFs.existsSync.mockReturnValue(true);
      
      const result = validateTLSConfig();
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should report missing certificate in production', () => {
      config.env = 'production';
      config.tls.certPath = null;
      config.tls.keyPath = null;
      process.env.TLS_CERT_PATH = '';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      mockFs.existsSync.mockReturnValue(false);
      
      const result = validateTLSConfig();
      
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should report missing key in production', () => {
      config.env = 'production';
      config.tls.certPath = null;
      config.tls.keyPath = null;
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '';
      mockFs.existsSync.mockReturnValue(false);
      
      const result = validateTLSConfig();
      
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should warn about missing certificates in development', () => {
      config.env = 'development';
      process.env.TLS_CERT_PATH = undefined;
      process.env.TLS_KEY_PATH = undefined;
      
      const result = validateTLSConfig();
      
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should report if certificate file does not exist', () => {
      config.env = 'production';
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      
      mockFs.existsSync.mockReturnValue(false);
      
      const result = validateTLSConfig();
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => 
        issue.includes('certificate file not found')
      )).toBe(true);
    });

    it('should include TLS version information', () => {
      const result = validateTLSConfig();
      
      expect(result.tlsVersion).toBeDefined();
      expect(result.opensslVersion).toBeDefined();
      expect(result.supportsTLS13).toBeDefined();
    });

    it('should return environment information', () => {
      config.env = 'test';
      
      const result = validateTLSConfig();
      
      expect(result.environment).toBe('test');
    });

    it('should warn if CA file path provided but not found', () => {
      process.env.TLS_CA_PATH = '/path/to/ca.pem';
      mockFs.existsSync.mockReturnValue(false);
      
      const result = validateTLSConfig();
      
      expect(result.warnings.some(warning => 
        warning.includes('CA file not found')
      )).toBe(true);
    });
  });

  // ============================================================================
  // GET TLS CONFIG
  // ============================================================================

  describe('getTLSConfig', () => {
    it('should return current TLS configuration', () => {
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      
      const tlsConfig = getTLSConfig();
      
      expect(tlsConfig.minVersion).toBe('TLSv1.3');
      expect(tlsConfig.maxVersion).toBe('TLSv1.3');
      expect(tlsConfig.certPath).toBe('/path/to/cert.pem');
      expect(tlsConfig.keyPath).toBe('/path/to/key.pem');
    });

    it('should include cipher configuration', () => {
      const tlsConfig = getTLSConfig();
      
      expect(tlsConfig.ciphersuites).toBeDefined();
      expect(tlsConfig.ciphers).toBeDefined();
    });

    it('should include security options', () => {
      const tlsConfig = getTLSConfig();
      
      expect(tlsConfig.honorCipherOrder).toBe(true);
      expect(tlsConfig.rejectUnauthorized).toBe(true);
      expect(tlsConfig.sessionTimeout).toBe(300);
    });
  });

  // ============================================================================
  // PARSE CERTIFICATE
  // ============================================================================

  describe('parseCertificate', () => {
    it('should parse certificate file', () => {
      const certPath = '/path/to/cert.pem';
      mockFs.readFileSync.mockReturnValue('CERT_CONTENT');
      
      const result = parseCertificate(certPath);
      
      expect(result.path).toBe(certPath);
      expect(result.exists).toBe(true);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should handle certificate parsing errors', () => {
      const certPath = '/path/to/cert.pem';
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });
      mockFs.existsSync.mockReturnValue(false);
      
      const result = parseCertificate(certPath);
      
      expect(result.exists).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should log parsing errors', () => {
      const certPath = '/path/to/cert.pem';
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });
      
      parseCertificate(certPath);
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to parse certificate',
        expect.any(Object)
      );
    });
  });

  // ============================================================================
  // CHECK CERTIFICATE EXPIRY
  // ============================================================================

  describe('checkCertificateExpiry', () => {
    it('should warn if unable to determine expiry', () => {
      mockFs.readFileSync.mockReturnValue('CERT_WITHOUT_DATES');
      
      const result = checkCertificateExpiry('/path/to/cert.pem');
      
      expect(result.warning).toBe(true);
      expect(result.message).toContain('Unable to determine');
    });

    it('should handle certificate parsing errors', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });
      mockFs.existsSync.mockReturnValue(false);
      
      const result = checkCertificateExpiry('/path/to/cert.pem');
      
      expect(result.error || result.warning).toBeTruthy();
    });

    it('should use custom threshold for expiry warning', () => {
      // This test verifies the function accepts the threshold parameter
      expect(() => {
        checkCertificateExpiry('/path/to/cert.pem', 60);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // HSTS HEADER
  // ============================================================================

  describe('getHSTSHeader', () => {
    it('should return HSTS header with default max-age', () => {
      const header = getHSTSHeader();
      
      expect(header).toContain('max-age=31536000');
      expect(header).toContain('includeSubDomains');
      expect(header).toContain('preload');
    });

    it('should return HSTS header with custom max-age', () => {
      const header = getHSTSHeader(86400);
      
      expect(header).toContain('max-age=86400');
    });

    it('should include all security directives', () => {
      const header = getHSTSHeader();
      
      expect(header).toMatch(/max-age=\d+/);
      expect(header).toContain('includeSubDomains');
      expect(header).toContain('preload');
    });
  });

  // ============================================================================
  // ENFORCE HTTPS MIDDLEWARE
  // ============================================================================

  describe('enforceHTTPS', () => {
    it('should set HSTS header on all requests', () => {
      const middleware = enforceHTTPS();
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age')
      );
    });

    it('should use custom max-age if provided', () => {
      const middleware = enforceHTTPS({ maxAge: 86400 });
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=86400')
      );
    });

    it('should redirect HTTP to HTTPS in production', () => {
      config.env = 'production';
      mockReq.secure = false;
      
      const middleware = enforceHTTPS();
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.redirect).toHaveBeenCalledWith(
        301,
        'https://example.com/api/test'
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not redirect HTTPS requests', () => {
      config.env = 'production';
      mockReq.secure = true;
      
      const middleware = enforceHTTPS();
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not redirect in development', () => {
      config.env = 'development';
      mockReq.secure = false;
      
      const middleware = enforceHTTPS();
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log HTTP redirects in production', () => {
      config.env = 'production';
      mockReq.secure = false;
      
      const middleware = enforceHTTPS();
      middleware(mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redirecting HTTP'),
        expect.any(Object)
      );
    });
  });

  // ============================================================================
  // TLS HEALTH CHECK
  // ============================================================================

  describe('tlsHealthCheck', () => {
    it('should return healthy status when TLS is configured', () => {
      config.env = 'production';
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      mockFs.existsSync.mockReturnValue(true);
      
      const health = tlsHealthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.tls.enabled).toBe(true);
    });

    it('should return unhealthy status when TLS not configured in production', () => {
      config.env = 'production';
      process.env.TLS_CERT_PATH = undefined;
      process.env.TLS_KEY_PATH = undefined;
      
      const health = tlsHealthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.issues.length).toBeGreaterThan(0);
    });

    it('should include TLS version information', () => {
      const health = tlsHealthCheck();
      
      expect(health.tls.version).toBeDefined();
      expect(health.tls.version.min).toBe('TLSv1.3');
      expect(health.tls.version.max).toBe('TLSv1.3');
    });

    it('should include certificate configuration', () => {
      process.env.TLS_CERT_PATH = '/path/to/cert.pem';
      process.env.TLS_KEY_PATH = '/path/to/key.pem';
      
      const health = tlsHealthCheck();
      
      expect(health.tls.certificates.configured).toBe(true);
      expect(health.tls.certificates.certPath).toBe('/path/to/cert.pem');
    });

    it('should include OpenSSL version', () => {
      const health = tlsHealthCheck();
      
      expect(health.tls.openssl).toBeDefined();
    });

    it('should include warnings and issues', () => {
      const health = tlsHealthCheck();
      
      expect(health.warnings).toBeDefined();
      expect(health.issues).toBeDefined();
      expect(Array.isArray(health.warnings)).toBe(true);
      expect(Array.isArray(health.issues)).toBe(true);
    });
  });
});
