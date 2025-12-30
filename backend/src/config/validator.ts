/**
 * Configuration Validator
 * Validates critical configuration at startup to catch mismatches early
 * Prevents runtime issues from misconfiguration
 */

import config from './index.ts';
import logger from '../utils/logger.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate required environment variables
 */
function validateRequiredEnvVars() {
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'DATABASE_NAME',
    'DATABASE_USER',
    'DATABASE_PASSWORD'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secrets are strong enough
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
  }

  logger.info('✓ Required environment variables validated');
}

/**
 * Validate CORS configuration
 */
function validateCorsConfig() {
  const allowedOrigins = config.frontend.allowedOrigins;

  if (!allowedOrigins || allowedOrigins.length === 0) {
    throw new Error('No allowed origins configured for CORS');
  }

  // Warn if using wildcard in production
  if (config.env === 'production' && allowedOrigins.some(origin => origin.includes('*'))) {
    logger.warn('⚠ Wildcard CORS origin detected in production - security risk!');
  }

  logger.info(`✓ CORS configured with ${allowedOrigins.length} allowed origin(s)`);
}

/**
 * Validate cookie configuration
 */
function validateCookieConfig() {
  const { secure, sameSite, domain } = config.cookie;

  // DEBUG: Log raw env values
  logger.info('🔍 DEBUG Cookie ENV values:', {
    COOKIE_SECURE: process.env.COOKIE_SECURE,
    COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    NODE_ENV: process.env.NODE_ENV
  });
  
  // DEBUG: Log parsed config values
  logger.info('🔍 DEBUG Cookie config.cookie values:', {
    secure,
    sameSite,
    domain
  });

  // In production, cookies MUST be secure
  if (config.env === 'production' && !secure) {
    throw new Error('Cookies must be secure (HTTPS) in production');
  }

  // If sameSite is 'none', secure MUST be true
  if (sameSite === 'none' && !secure) {
    throw new Error('SameSite=None requires Secure=true (HTTPS)');
  }

  // Validate domain format
  if (domain && !domain.startsWith('.')) {
    logger.warn(`⚠ Cookie domain "${domain}" should start with "." for subdomain support`);
  }

  logger.info(`✓ Cookie config: secure=${secure}, sameSite=${sameSite}, domain=${domain || 'none'}`);
}

/**
 * Validate database configuration
 */
function validateDatabaseConfig() {
  const { host, port, name, user } = config.database;

  if (!host || !port || !name || !user) {
    throw new Error('Incomplete database configuration');
  }

  // Validate pool settings
  const { min, max } = config.database.pool;
  if (min > max) {
    throw new Error(`Database pool min (${min}) cannot be greater than max (${max})`);
  }

  logger.info(`✓ Database configured: ${user}@${host}:${port}/${name} (pool: ${min}-${max})`);
}

/**
 * Validate frontend app environment files exist
 * NOTE: Portal is excluded - it runs on separate infrastructure
 */
function validateFrontendEnvFiles() {
  const apps = ['nexus', 'paylinq', 'recruitiq']; // Portal excluded - separate deployment
  
  // Try Docker path first (/app/apps), then fall back to local development path
  let appsDir;
  if (fs.existsSync('/app/apps')) {
    appsDir = '/app/apps'; // Docker container path
  } else {
    appsDir = path.join(__dirname, '../../../apps'); // Local development path
  }
  
  const missingEnvFiles = [];

  for (const app of apps) {
    const envPath = path.join(appsDir, app, '.env');
    if (!fs.existsSync(envPath)) {
      missingEnvFiles.push(`apps/${app}/.env`);
    }
  }

  if (missingEnvFiles.length > 0) {
    logger.warn(`⚠ Missing frontend .env files: ${missingEnvFiles.join(', ')}`);
    logger.warn('  Apps may not be configured to connect to backend');
  } else {
    logger.info('✓ All tenant app .env files exist');
  }
}

/**
 * Validate frontend API URLs point to correct backend
 * NOTE: Portal is excluded - it has its own backend
 */
function validateFrontendApiUrls() {
  const apps = ['nexus', 'paylinq', 'recruitiq']; // Portal excluded - separate backend
  const rootDir = path.join(__dirname, '../../../');
  const expectedBackendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
  const mismatches = [];

  for (const app of apps) {
    const envPath = path.join(rootDir, 'apps', app, '.env');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/VITE_API_URL=(.+)/);
      
      if (match) {
        const apiUrl = match[1].trim();
        // Remove /api suffix for comparison
        const baseUrl = apiUrl.replace(/\/api$/, '');
        
        if (baseUrl !== expectedBackendUrl) {
          mismatches.push({
            app,
            configured: apiUrl,
            expected: `${expectedBackendUrl}/api`
          });
        }
      }
    }
  }

  if (mismatches.length > 0) {
    logger.warn('⚠ Frontend API URL mismatches detected:');
    mismatches.forEach(({ app, configured, expected }) => {
      logger.warn(`  ${app}: configured=${configured}, expected=${expected}`);
    });
    logger.warn('  This may cause CORS or connectivity issues');
  } else {
    logger.info('✓ All tenant apps configured with correct backend URL');
  }
}

/**
 * Validate Redis configuration (if enabled)
 */
function validateRedisConfig() {
  if (config.redis.enabled) {
    if (!config.redis.url) {
      throw new Error('Redis enabled but no URL configured');
    }
    logger.info(`✓ Redis enabled: ${config.redis.url}`);
  } else {
    logger.info('ℹ Redis disabled (rate limiting will use in-memory store)');
  }
}

/**
 * Run all configuration validations
 * Throws error if any critical validation fails
 * Logs warnings for non-critical issues
 */
export function validateConfiguration() {
  logger.info('=== Configuration Validation ===');

  try {
    validateRequiredEnvVars();
    validateDatabaseConfig();
    validateCorsConfig();
    validateCookieConfig();
    validateRedisConfig();
    validateFrontendEnvFiles();
    validateFrontendApiUrls();

    logger.info('=== Configuration Validation Complete ===\n');
    return true;
  } catch (error) {
    logger.error('❌ Configuration validation failed:', error.message);
    throw error;
  }
}

/**
 * Validate configuration and exit if critical errors found
 * Use this at application startup
 */
export function validateConfigurationOrExit() {
  try {
    validateConfiguration();
  } catch (error) {
    logger.error('Fatal configuration error. Exiting...');
    process.exit(1);
  }
}

export default {
  validateConfiguration,
  validateConfigurationOrExit
};
