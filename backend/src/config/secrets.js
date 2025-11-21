/**
 * Centralized Secrets Configuration
 * 
 * ALL secrets must be defined here.
 * NO defaults for production secrets.
 * Clear error messages if secrets are missing.
 * 
 * Supports two providers:
 * - 'environment': Load from process.env (development, CI/CD)
 * - 'barbican': Load from Barbican API (production)
 */

import logger from '../utils/logger.js';

/**
 * Secret definitions with validation rules
 */
const SECRET_DEFINITIONS = {
  // JWT Secrets (256-bit minimum)
  JWT_SECRET: {
    envVar: 'JWT_SECRET',
    required: true,
    minLength: 43, // 256 bits in base64
    production: true,
    description: 'JWT access token signing secret',
    forbiddenValues: ['test', 'dev', 'demo', 'example', 'secret', 'password'],
  },
  JWT_REFRESH_SECRET: {
    envVar: 'JWT_REFRESH_SECRET',
    required: true,
    minLength: 43,
    production: true,
    description: 'JWT refresh token signing secret',
    forbiddenValues: ['test', 'dev', 'demo', 'example', 'secret', 'password'],
  },
  
  // Database Secrets
  DATABASE_PASSWORD: {
    envVar: 'DATABASE_PASSWORD',
    required: true,
    minLength: 12,
    production: true,
    description: 'Primary database password',
    forbiddenValues: ['postgres', 'password', 'admin', 'root', 'test'],
  },
  
  // Encryption Keys (512-bit minimum for production)
  ENCRYPTION_MASTER_KEY: {
    envVar: 'ENCRYPTION_KEY',
    required: true,
    minLength: 64, // 512 bits in hex
    production: true,
    description: 'Master encryption key for data at rest',
    forbiddenValues: ['default-encryption-key', 'change-this'],
  },
  
  // Session Secret (512-bit minimum)
  SESSION_SECRET: {
    envVar: 'SESSION_SECRET',
    required: true,
    minLength: 64,
    production: true,
    description: 'Session cookie encryption secret',
  },
  
  // Redis Password (optional in dev, required in production)
  REDIS_PASSWORD: {
    envVar: 'REDIS_PASSWORD',
    required: false, // Optional for development
    minLength: 12,
    production: true,
    description: 'Redis authentication password',
  },
  
  // SMTP Password (optional)
  SMTP_PASSWORD: {
    envVar: 'SMTP_PASSWORD',
    required: false,
    minLength: 8,
    production: false,
    description: 'SMTP server password',
  },
  
  // AWS Secrets (optional)
  AWS_SECRET_ACCESS_KEY: {
    envVar: 'AWS_SECRET_ACCESS_KEY',
    required: false,
    minLength: 20,
    production: false,
    description: 'AWS secret access key',
  },
  
  // License Manager Database
  LICENSE_MANAGER_DB_PASSWORD: {
    envVar: 'LICENSE_MANAGER_DB_PASSWORD',
    required: true,
    minLength: 12,
    production: true,
    description: 'License manager database password',
    forbiddenValues: ['postgres', 'password', 'admin', 'root'],
  },
};

/**
 * Validate a secret value
 */
function validateSecret(secretName, value, definition, environment) {
  // Check if required
  if (definition.required && !value) {
    if (environment === 'production' || definition.production) {
      throw new Error(
        `CRITICAL: Missing required secret: ${secretName}\n` +
        `Environment variable: ${definition.envVar}\n` +
        `Description: ${definition.description}\n` +
        `This is required for ${environment} environment.`
      );
    }
    
    return null; // Optional secret not set
  }
  
  // Skip validation for non-production if not set
  if (!value) {
    return null;
  }
  
  // Validate minimum length (strict in production, warning in dev)
  if (definition.minLength && value.length < definition.minLength) {
    const message = 
      `Secret ${secretName} is too short!\n` +
      `Current length: ${value.length} characters\n` +
      `Required minimum: ${definition.minLength} characters\n` +
      `Description: ${definition.description}`;
    
    if (environment === 'production') {
      throw new Error(`CRITICAL: ${message}`);
    } else {
      logger.warn(`WARNING: ${message} (OK for ${environment})`);
    }
  }
  
  // Check forbidden values (weak/default passwords)
  if (definition.forbiddenValues) {
    const lowerValue = value.toLowerCase();
    const forbidden = definition.forbiddenValues.find(f => 
      lowerValue.includes(f.toLowerCase())
    );
    
    if (forbidden) {
      const message = 
        `Secret ${secretName} contains forbidden value: "${forbidden}"\n` +
        `This is a weak/default password that MUST be changed!\n` +
        `Generate a strong random secret instead.`;
      
      if (environment === 'production') {
        throw new Error(`CRITICAL: ${message}`);
      } else {
        logger.warn(`WARNING: ${message} (OK for ${environment})`);
      }
    }
  }
  
  // Check for weak patterns (warning only, even in production)
  const weakPatterns = [
    { pattern: /^(test|dev|demo|example|secret|admin|default)/i, name: 'weak prefix' },
    { pattern: /^(.)\1{10,}$/, name: 'repeated characters' },
    { pattern: /^(123|abc|qwerty)/i, name: 'sequential pattern' },
  ];
  
  const weakMatch = weakPatterns.find(({ pattern }) => pattern.test(value));
  if (weakMatch && environment !== 'development') {
    logger.warn(
      `WARNING: Secret ${secretName} matches weak pattern: ${weakMatch.name}\n` +
      `Consider using a stronger, randomly generated secret.`
    );
  }
  
  return value;
}

/**
 * Load secrets from environment variables
 */
function loadFromEnvironment(environment) {
  logger.info('Loading secrets from environment variables (.env file)');
  
  const secrets = {};
  const errors = [];
  
  for (const [secretName, definition] of Object.entries(SECRET_DEFINITIONS)) {
    try {
      const value = process.env[definition.envVar];
      const validated = validateSecret(secretName, value, definition, environment);
      secrets[secretName] = validated;
    } catch (error) {
      errors.push({
        secret: secretName,
        error: error.message,
      });
    }
  }
  
  if (errors.length > 0) {
    logger.error('CRITICAL: Failed to load required secrets', { errors });
    
    console.error('\n' + '='.repeat(80));
    console.error('🚨 CRITICAL: SECRETS CONFIGURATION ERRORS');
    console.error('='.repeat(80));
    
    errors.forEach(({ secret, error }) => {
      console.error(`\n❌ ${secret}:`);
      console.error(error);
    });
    
    console.error('\n' + '='.repeat(80));
    console.error('Fix these errors before starting the application!');
    console.error('='.repeat(80) + '\n');
    
    throw new Error(`Failed to load ${errors.length} required secret(s)`);
  }
  
  const loadedCount = Object.values(secrets).filter(v => v !== null).length;
  logger.info(`Loaded ${loadedCount} secrets from environment variables`);
  
  return secrets;
}

/**
 * Load secrets from Barbican API
 */
async function loadFromBarbican(environment) {
  logger.info('Loading secrets from Barbican API');
  
  try {
    // Import Barbican provider
    const { default: BarbicanProvider } = await import('./providers/barbicanProvider.js');
    
    // Initialize Barbican client with configuration from environment
    const barbicanClient = new BarbicanProvider({
      endpoint: process.env.BARBICAN_ENDPOINT,
      authEndpoint: process.env.OPENSTACK_AUTH_URL,
      username: process.env.OPENSTACK_USERNAME,
      password: process.env.OPENSTACK_PASSWORD,
      projectName: process.env.OPENSTACK_PROJECT_NAME,
      projectDomain: process.env.OPENSTACK_PROJECT_DOMAIN,
      userDomain: process.env.OPENSTACK_USER_DOMAIN,
      cacheTTL: parseInt(process.env.BARBICAN_CACHE_TTL || '300000'), // 5 minutes default
    });
    
    // Verify Barbican is accessible
    const healthCheck = await barbicanClient.healthCheck();
    if (healthCheck.status !== 'healthy') {
      throw new Error(`Barbican health check failed: ${healthCheck.error}`);
    }
    
    logger.info('Barbican client initialized successfully');
    
    const secrets = {};
    const errors = [];
    
    for (const [secretName, definition] of Object.entries(SECRET_DEFINITIONS)) {
      try {
        // Fetch from Barbican (with automatic caching)
        const value = await barbicanClient.getSecret(secretName);
        
        // Validate secret (strict in production)
        const validated = validateSecret(secretName, value, definition, environment);
        
        if (validated) {
          secrets[secretName] = validated;
          logger.debug(`Loaded secret from Barbican: ${secretName} (length: ${validated.length})`);
        }
        
      } catch (error) {
        if (definition.required || environment === 'production') {
          errors.push({
            secret: secretName,
            error: `Failed to load from Barbican: ${error.message}`,
          });
        } else {
          logger.warn(`Optional secret not available in Barbican: ${secretName}`);
          secrets[secretName] = null;
        }
      }
    }
    
    // Store Barbican client for future use (secret rotation, etc.)
    secrets._barbicanClient = barbicanClient;
    
    if (errors.length > 0) {
      throw new Error(`Failed to load ${errors.length} secrets from Barbican`);
    }
    
    const loadedCount = Object.values(secrets).filter(v => v !== null && v !== barbicanClient).length;
    logger.info(`Loaded ${loadedCount} secrets from Barbican (cached for ${barbicanClient.config.cacheTTL / 1000}s)`);
    
    return secrets;
    
  } catch (error) {
    logger.error('Failed to initialize Barbican provider', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Load all secrets with validation
 */
export async function loadSecrets(environment = process.env.NODE_ENV || 'development') {
  const provider = process.env.SECRETS_PROVIDER || 'environment';
  
  logger.info('Loading secrets...', { environment, provider });
  
  // Load based on provider
  if (provider === 'environment') {
    return loadFromEnvironment(environment);
  }
  
  if (provider === 'barbican') {
    return await loadFromBarbican(environment);
  }
  
  throw new Error(
    `Unknown secrets provider: ${provider}\n` +
    `Valid options: 'environment' (default), 'barbican'`
  );
}

/**
 * Get a single secret (with caching)
 */
let secretsCache = null;

export async function getSecret(secretName) {
  if (!secretsCache) {
    secretsCache = await loadSecrets();
  }
  
  if (!(secretName in secretsCache)) {
    throw new Error(`Unknown secret: ${secretName}`);
  }
  
  return secretsCache[secretName];
}

/**
 * Clear secrets cache (for testing)
 */
export function clearSecretsCache() {
  secretsCache = null;
}

export default {
  loadSecrets,
  getSecret,
  clearSecretsCache,
  SECRET_DEFINITIONS,
};
