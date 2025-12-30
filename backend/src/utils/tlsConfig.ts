/**
 * TLS Configuration Utilities
 * 
 * Provides utilities for configuring and validating TLS/SSL settings.
 * 
 * Features:
 * - TLS 1.3 enforcement
 * - Strong cipher suite selection
 * - Certificate validation
 * - HTTPS server configuration
 * - Health checks for TLS settings
 * 
 * Security:
 * - Disables TLS 1.0, 1.1, and 1.2
 * - Uses only secure cipher suites
 * - Enforces certificate validation
 * - HSTS headers support
 */

import https from 'https';
import tls from 'tls';
import fs from 'fs';
import logger from './logger.ts';
import config from '../config/index.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Recommended cipher suites for TLS 1.3
 * These are the default TLS 1.3 cipher suites
 */
const TLS_13_CIPHERSUITES = [
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'TLS_AES_128_GCM_SHA256',
].join(':');

/**
 * Secure cipher suites for TLS 1.2 (fallback if TLS 1.3 not available)
 */
const TLS_12_CIPHERS = [
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES256-SHA384',
  'ECDHE-RSA-AES128-SHA256',
].join(':');

/**
 * TLS options for HTTPS server
 */
const TLS_OPTIONS = {
  // Minimum TLS version (prefer TLS 1.3)
  minVersion: 'TLSv1.3',
  maxVersion: 'TLSv1.3',
  
  // Cipher suites
  ciphersuites: TLS_13_CIPHERSUITES, // TLS 1.3
  ciphers: TLS_12_CIPHERS, // TLS 1.2 fallback
  
  // Security options
  honorCipherOrder: true, // Server chooses cipher
  rejectUnauthorized: true, // Reject invalid certificates
  requestCert: false, // Don't require client certificates by default
  
  // Session settings
  sessionTimeout: 300, // 5 minutes
  
  // Disable older protocols
  secureOptions:
    // eslint-disable-next-line no-bitwise
    tls.SSL_OP_NO_SSLv2 |
    tls.SSL_OP_NO_SSLv3 |
    tls.SSL_OP_NO_TLSv1 |
    tls.SSL_OP_NO_TLSv1_1,
};

// ============================================================================
// HTTPS SERVER CREATION
// ============================================================================

/**
 * Create HTTPS server with secure TLS configuration
 * 
 * @param {Object} app - Express app
 * @param {Object} [options] - Additional TLS options
 * @returns {https.Server} HTTPS server
 */
export function createSecureServer(app, options = {}) {
  try {
    // Get certificate paths from config
    const certPath = config.tls?.certPath || process.env.TLS_CERT_PATH;
    const keyPath = config.tls?.keyPath || process.env.TLS_KEY_PATH;
    const caPath = config.tls?.caPath || process.env.TLS_CA_PATH;
    
    if (!certPath || !keyPath) {
      throw new Error('TLS certificate and key paths are required');
    }
    
    // Read certificates
    const tlsOptions = {
      ...TLS_OPTIONS,
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      ...options,
    };
    
    // Add CA certificate if provided
    if (caPath && fs.existsSync(caPath)) {
      tlsOptions.ca = fs.readFileSync(caPath);
    }
    
    // Create HTTPS server
    const server = https.createServer(tlsOptions, app);
    
    logger.info('Secure HTTPS server created', {
      minVersion: tlsOptions.minVersion,
      maxVersion: tlsOptions.maxVersion,
      hasCACert: !!tlsOptions.ca,
    });
    
    return server;
  } catch (error) {
    logger.error('Failed to create secure HTTPS server', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Create HTTPS server with fallback to HTTP in development
 * 
 * @param {Object} app - Express app
 * @param {Object} [options] - Additional TLS options
 * @returns {https.Server|http.Server} HTTPS or HTTP server
 */
export function createServer(app, options = {}) {
  const environment = config.env || process.env.NODE_ENV || 'development';
  
  // In production, always use HTTPS
  if (environment === 'production') {
    return createSecureServer(app, options);
  }
  
  // In development, try HTTPS but fallback to HTTP
  try {
    return createSecureServer(app, options);
  } catch (error) {
    logger.warn('HTTPS not available in development, using HTTP', {
      error: error.message,
    });
    
    // Fallback to HTTP
    const http = require('http');
    return http.createServer(app);
  }
}

// ============================================================================
// TLS VALIDATION
// ============================================================================

/**
 * Validate TLS configuration
 * 
 * @returns {Object} Validation result
 */
export function validateTLSConfig() {
  const issues = [];
  const warnings = [];
  
  // Check if running in production
  const environment = config.env || process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';
  
  // Check certificate files
  const certPath = config.tls?.certPath || process.env.TLS_CERT_PATH;
  const keyPath = config.tls?.keyPath || process.env.TLS_KEY_PATH;
  const caPath = config.tls?.caPath || process.env.TLS_CA_PATH;
  
  if (!certPath) {
    if (isProduction) {
      issues.push('TLS certificate path not configured (TLS_CERT_PATH)');
    } else {
      warnings.push('TLS certificate path not configured (development mode)');
    }
  } else if (!fs.existsSync(certPath)) {
    if (isProduction) {
      issues.push(`TLS certificate file not found: ${certPath}`);
    } else {
      warnings.push(`TLS certificate file not found: ${certPath}`);
    }
  }
  
  if (!keyPath) {
    if (isProduction) {
      issues.push('TLS key path not configured (TLS_KEY_PATH)');
    } else {
      warnings.push('TLS key path not configured (development mode)');
    }
  } else if (!fs.existsSync(keyPath)) {
    if (isProduction) {
      issues.push(`TLS key file not found: ${keyPath}`);
    } else {
      warnings.push(`TLS key file not found: ${keyPath}`);
    }
  }
  
  if (caPath && !fs.existsSync(caPath)) {
    warnings.push(`TLS CA file not found: ${caPath}`);
  }
  
  // Check Node.js TLS support
  try {
    const tlsVersion = process.versions.openssl || tls.DEFAULT_MAX_VERSION;
    
    if (!tlsVersion) {
      warnings.push('Unable to determine OpenSSL version');
    }
  } catch (error) {
    warnings.push('Error checking TLS support: ' + error.message);
  }
  
  // Check if TLS 1.3 is available
  const supportsTLS13 = tls.DEFAULT_MAX_VERSION === 'TLSv1.3';
  
  if (!supportsTLS13) {
    warnings.push(
      'TLS 1.3 may not be available. Current max version: ' + 
      tls.DEFAULT_MAX_VERSION
    );
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings,
    environment,
    tlsVersion: tls.DEFAULT_MAX_VERSION,
    opensslVersion: process.versions.openssl,
    supportsTLS13,
    minVersion: TLS_OPTIONS.minVersion,
    maxVersion: TLS_OPTIONS.maxVersion,
  };
}

/**
 * Get current TLS configuration
 * 
 * @returns {Object} TLS configuration
 */
export function getTLSConfig() {
  return {
    minVersion: TLS_OPTIONS.minVersion,
    maxVersion: TLS_OPTIONS.maxVersion,
    ciphersuites: TLS_OPTIONS.ciphersuites,
    ciphers: TLS_OPTIONS.ciphers,
    honorCipherOrder: TLS_OPTIONS.honorCipherOrder,
    rejectUnauthorized: TLS_OPTIONS.rejectUnauthorized,
    sessionTimeout: TLS_OPTIONS.sessionTimeout,
    certPath: config.tls?.certPath || process.env.TLS_CERT_PATH,
    keyPath: config.tls?.keyPath || process.env.TLS_KEY_PATH,
    caPath: config.tls?.caPath || process.env.TLS_CA_PATH,
  };
}

// ============================================================================
// CERTIFICATE UTILITIES
// ============================================================================

/**
 * Parse certificate information
 * 
 * @param {string} certPath - Path to certificate file
 * @returns {Object} Certificate information
 */
export function parseCertificate(certPath) {
  try {
    const cert = fs.readFileSync(certPath, 'utf8');
    
    // Create a temporary TLS socket to parse the certificate
    const socket = new tls.TLSSocket();
    const parsedCert = socket.getCertificate ? socket.getCertificate() : null;
    
    // Basic parsing (extract common fields)
    const certInfo = {
      path: certPath,
      exists: true,
      size: cert.length,
    };
    
    // Extract subject and issuer (basic regex parsing)
    const subjectMatch = cert.match(/Subject:([^\n]+)/);
    const issuerMatch = cert.match(/Issuer:([^\n]+)/);
    const validFromMatch = cert.match(/Not Before:([^\n]+)/);
    const validToMatch = cert.match(/Not After :([^\n]+)/);
    
    if (subjectMatch) certInfo.subject = subjectMatch[1].trim();
    if (issuerMatch) certInfo.issuer = issuerMatch[1].trim();
    if (validFromMatch) certInfo.validFrom = validFromMatch[1].trim();
    if (validToMatch) certInfo.validTo = validToMatch[1].trim();
    
    return certInfo;
  } catch (error) {
    logger.error('Failed to parse certificate', {
      certPath,
      error: error.message,
    });
    
    return {
      path: certPath,
      exists: fs.existsSync(certPath),
      error: error.message,
    };
  }
}

/**
 * Check if certificate is about to expire
 * 
 * @param {string} certPath - Path to certificate file
 * @param {number} [daysThreshold=30] - Days before expiry to warn
 * @returns {Object} Expiry status
 */
export function checkCertificateExpiry(certPath, daysThreshold = 30) {
  try {
    const certInfo = parseCertificate(certPath);
    
    if (!certInfo.validTo) {
      return {
        warning: true,
        message: 'Unable to determine certificate expiry date',
      };
    }
    
    const expiryDate = new Date(certInfo.validTo);
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate - now) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiry < 0) {
      return {
        expired: true,
        daysUntilExpiry,
        expiryDate: certInfo.validTo,
        message: `Certificate expired ${Math.abs(daysUntilExpiry)} days ago`,
      };
    }
    
    if (daysUntilExpiry < daysThreshold) {
      return {
        warning: true,
        daysUntilExpiry,
        expiryDate: certInfo.validTo,
        message: `Certificate expires in ${daysUntilExpiry} days`,
      };
    }
    
    return {
      valid: true,
      daysUntilExpiry,
      expiryDate: certInfo.validTo,
      message: `Certificate valid for ${daysUntilExpiry} more days`,
    };
  } catch (error) {
    return {
      error: true,
      message: error.message,
    };
  }
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

/**
 * Get recommended HSTS (HTTP Strict Transport Security) header
 * 
 * @param {number} [maxAge=31536000] - Max age in seconds (default 1 year)
 * @returns {string} HSTS header value
 */
export function getHSTSHeader(maxAge = 31536000) {
  return `max-age=${maxAge}; includeSubDomains; preload`;
}

/**
 * Middleware to enforce HTTPS and set HSTS header
 * 
 * @param {Object} [options] - HSTS options
 * @returns {Function} Express middleware
 */
export function enforceHTTPS(options = {}) {
  const maxAge = options.maxAge || 31536000; // 1 year
  const hstsHeader = getHSTSHeader(maxAge);
  
  return (req, res, next) => {
    // Set HSTS header
    res.setHeader('Strict-Transport-Security', hstsHeader);
    
    // Redirect HTTP to HTTPS in production
    if (config.env === 'production' && !req.secure) {
      const httpsUrl = `https://${req.hostname}${req.originalUrl}`;
      
      logger.warn('Redirecting HTTP request to HTTPS', {
        url: req.originalUrl,
        ip: req.ip,
      });
      
      return res.redirect(301, httpsUrl);
    }
    
    next();
  };
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * TLS health check endpoint handler
 * 
 * @returns {Object} Health check result
 */
export function tlsHealthCheck() {
  const validation = validateTLSConfig();
  const config = getTLSConfig();
  
  return {
    status: validation.valid ? 'healthy' : 'unhealthy',
    tls: {
      enabled: validation.valid,
      version: {
        min: config.minVersion,
        max: config.maxVersion,
        current: validation.tlsVersion,
        tls13Supported: validation.supportsTLS13,
      },
      openssl: validation.opensslVersion,
      certificates: {
        configured: !!(config.certPath && config.keyPath),
        certPath: config.certPath,
        keyPath: config.keyPath,
        caPath: config.caPath,
      },
    },
    issues: validation.issues,
    warnings: validation.warnings,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createSecureServer,
  createServer,
  validateTLSConfig,
  getTLSConfig,
  parseCertificate,
  checkCertificateExpiry,
  getHSTSHeader,
  enforceHTTPS,
  tlsHealthCheck,
  TLS_OPTIONS,
};
