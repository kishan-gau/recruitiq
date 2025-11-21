import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadSecrets } from './secrets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// Use .env.test for E2E tests to ensure test database isolation
const envFile = process.env.NODE_ENV === 'e2e' ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, '../../', envFile) });

// Load and validate all secrets (will be loaded during server startup)
let secrets = {};

const config = {
  // Application
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  apiVersion: process.env.API_VERSION || 'v1',
  appName: process.env.APP_NAME || 'RecruitIQ',
  appUrl: process.env.APP_URL || 'http://localhost:4000',
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    name: process.env.DATABASE_NAME || 'recruitiq_dev',
    user: process.env.DATABASE_USER || 'postgres',
    password: secrets.DATABASE_PASSWORD || process.env.DATABASE_PASSWORD, // Validated secret
    ssl: process.env.DATABASE_SSL === 'true',
    pool: {
      // Increased for load testing and production scalability
      // min: 20 keeps warm connections ready, reducing connection overhead
      // max: 100 allows handling up to ~100 concurrent requests
      min: parseInt(process.env.DATABASE_POOL_MIN, 10) || 20,
      max: parseInt(process.env.DATABASE_POOL_MAX, 10) || 100,
    },
  },
  
  // JWT - Industry standard: short-lived access tokens, longer refresh tokens
  jwt: {
    secret: secrets.JWT_SECRET || process.env.JWT_SECRET, // Validated secret (fallback for init)
    accessSecret: secrets.JWT_SECRET || process.env.JWT_SECRET, // Alias for compatibility
    refreshSecret: secrets.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET, // Validated secret
    // Access tokens: 15 minutes (industry standard for security)
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    accessExpiresIn: process.env.JWT_EXPIRES_IN || '15m', // Alias
    // Refresh tokens: 7 days with rotation
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Redis
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  
  // Secrets Management
  secrets: {
    provider: process.env.SECRETS_PROVIDER || 'environment', // 'aws', 'azure', 'vault', 'barbican', 'environment'
    cacheTTL: parseInt(process.env.SECRETS_CACHE_TTL, 10) || 300, // 5 minutes in seconds
    
    // AWS Secrets Manager
    aws: {
      region: process.env.AWS_SECRETS_REGION || process.env.AWS_REGION || 'us-east-1',
    },
    
    // Azure Key Vault
    azure: {
      vaultUrl: process.env.AZURE_KEY_VAULT_URL,
    },
    
    // HashiCorp Vault
    vault: {
      endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
      token: process.env.VAULT_TOKEN,
      namespace: process.env.VAULT_NAMESPACE || 'secret',
    },
    
    // TransIP/OpenStack Barbican
    barbican: {
      endpoint: process.env.BARBICAN_ENDPOINT,
      token: process.env.BARBICAN_TOKEN,
      projectId: process.env.BARBICAN_PROJECT_ID,
      authUrl: process.env.OPENSTACK_AUTH_URL,
      username: process.env.OPENSTACK_USERNAME,
      password: process.env.OPENSTACK_PASSWORD,
    },
  },
  
  // Email
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    from: process.env.EMAIL_FROM || 'noreply@recruitiq.com',
    fromName: process.env.EMAIL_FROM_NAME || 'RecruitIQ',
  },
  
  // AWS
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY, // Validated
    s3: {
      bucket: process.env.AWS_S3_BUCKET || 'recruitiq-uploads',
      region: process.env.AWS_S3_BUCKET_REGION || 'us-east-1',
    },
  },
  
  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  },
  
  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 min
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    requireHttps: process.env.REQUIRE_HTTPS === 'true' || process.env.NODE_ENV === 'production',
    trustProxy: process.env.TRUST_PROXY === 'true',
    sessionSecret: secrets.SESSION_SECRET || process.env.SESSION_SECRET, // Validated secret
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE, 10) || 900000, // 15 minutes (aligned with JWT)
  },
  
  // Cookie Configuration (centralized for consistency)
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'none'),
    domain: process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.recruitiq.com' : undefined),
  },
  
  // Encryption
  encryption: {
    masterKey: secrets.ENCRYPTION_MASTER_KEY || process.env.ENCRYPTION_KEY, // Validated secret
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
  },
  
  // TLS/SSL
  tls: {
    enabled: process.env.TLS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
    certPath: process.env.TLS_CERT_PATH,
    keyPath: process.env.TLS_KEY_PATH,
    caPath: process.env.TLS_CA_PATH,
    minVersion: process.env.TLS_MIN_VERSION || 'TLSv1.3',
    maxVersion: process.env.TLS_MAX_VERSION || 'TLSv1.3',
  },
  
  // Redis (for rate limiting and caching)
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: (secrets.REDIS_PASSWORD || process.env.REDIS_PASSWORD)?.trim() || undefined, // Only set if not empty
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
  },
  
  // Security Monitoring
  monitoring: {
    enabled: process.env.SECURITY_MONITORING_ENABLED !== 'false',
    alertChannels: (process.env.ALERT_CHANNELS || 'log').split(','),
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    
    // CloudWatch
    cloudwatch: {
      enabled: process.env.CLOUDWATCH_ENABLED === 'true',
      namespace: process.env.CLOUDWATCH_NAMESPACE || 'RecruitIQ/Security',
      region: process.env.CLOUDWATCH_REGION || process.env.AWS_REGION || 'us-east-1',
    },
    
    // Datadog
    datadog: {
      enabled: process.env.DATADOG_ENABLED === 'true',
      apiKey: process.env.DATADOG_API_KEY,
      appKey: process.env.DATADOG_APP_KEY,
      site: process.env.DATADOG_SITE || 'datadoghq.com',
      service: process.env.DATADOG_SERVICE || 'recruitiq',
    },
  },
  
  // Deployment Configuration
  deployment: {
    type: process.env.DEPLOYMENT_TYPE || 'onpremise', // 'cloud' or 'onpremise'
    tenantId: process.env.TENANT_ID, // Required for cloud multi-tenant SaaS
    instanceId: process.env.INSTANCE_ID || process.env.HOSTNAME || 'unknown',
  },
  
  // Central Logging (for cloud instances only)
  centralLogging: {
    enabled: process.env.CENTRAL_LOGGING_ENABLED === 'true',
    host: process.env.CENTRAL_LOG_DB_HOST,
    port: parseInt(process.env.CENTRAL_LOG_DB_PORT, 10) || 5432,
    database: process.env.CENTRAL_LOG_DB_NAME || 'platform_logs',
    user: process.env.CENTRAL_LOG_DB_USER,
    password: process.env.CENTRAL_LOG_DB_PASSWORD,
    ssl: process.env.CENTRAL_LOG_DB_SSL !== 'false',
  },
  
  // Central Monitoring (for cloud instances only)
  centralMonitoring: {
    enabled: process.env.CENTRAL_MONITORING_ENABLED === 'true',
    host: process.env.CENTRAL_MONITOR_DB_HOST,
    port: parseInt(process.env.CENTRAL_MONITOR_DB_PORT, 10) || 5432,
    database: process.env.CENTRAL_MONITOR_DB_NAME || 'platform_logs',
    user: process.env.CENTRAL_MONITOR_DB_USER,
    password: process.env.CENTRAL_MONITOR_DB_PASSWORD,
    ssl: process.env.CENTRAL_MONITOR_DB_SSL !== 'false',
  },
  
  // Feature Flags
  features: {
    websockets: process.env.ENABLE_WEBSOCKETS === 'true',
    fileUploads: process.env.ENABLE_FILE_UPLOADS === 'true',
    emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
    auditLogs: process.env.ENABLE_AUDIT_LOGS === 'true',
  },
  
  // License
  license: {
    apiUrl: process.env.LICENSE_API_URL || 'https://license.recruitiq.com',
    checkIntervalHours: parseInt(process.env.LICENSE_CHECK_INTERVAL_HOURS, 10) || 24,
  },
};

// ============================================================================
// VALIDATION NOW HANDLED BY secrets.js
// ============================================================================
// JWT validation, weak password detection, and production security checks
// are now centralized in config/secrets.js with fail-fast behavior.
// This removes ~150 lines of duplicate validation code.

// Basic config validation (non-secret)
if (!config.database.url && !config.database.host) {
  console.error('❌ Database configuration is missing');
  process.exit(1);
}

// Helper function to reload secrets after initialization
export async function reloadSecrets() {
  secrets = await loadSecrets(process.env.NODE_ENV);
  
  // Update config with validated secrets
  config.jwt.secret = secrets.JWT_SECRET;
  config.jwt.accessSecret = secrets.JWT_SECRET;
  config.jwt.refreshSecret = secrets.JWT_REFRESH_SECRET;
  config.database.password = secrets.DATABASE_PASSWORD;
  config.redis.password = secrets.REDIS_PASSWORD;
  config.security.sessionSecret = secrets.SESSION_SECRET;
  config.encryption.masterKey = secrets.ENCRYPTION_MASTER_KEY;
  config.aws.secretAccessKey = secrets.AWS_SECRET_ACCESS_KEY;
  
  return secrets;
}

export default config;
