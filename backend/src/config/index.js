import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

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
    password: process.env.DATABASE_PASSWORD || 'password',
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
    secret: process.env.JWT_SECRET,
    accessSecret: process.env.JWT_SECRET, // Alias for compatibility
    refreshSecret: process.env.JWT_REFRESH_SECRET,
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
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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
    sessionSecret: process.env.SESSION_SECRET,
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE, 10) || 900000, // 15 minutes (aligned with JWT)
  },
  
  // Encryption
  encryption: {
    masterKey: process.env.ENCRYPTION_MASTER_KEY,
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
    password: process.env.REDIS_PASSWORD,
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

// JWT Security Validation
// For 256-bit security, we need at least 32 bytes (256 bits / 8 bits per byte)
// Base64 encoding: 32 bytes = 44 characters (32 * 4/3 = 42.67, rounded up)
const MIN_JWT_SECRET_LENGTH = 43; // 256 bits minimum for production security

if (!config.jwt.secret) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}

if (config.jwt.secret.length < MIN_JWT_SECRET_LENGTH) {
  console.error(`❌ JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long (256+ bits)`);
  console.error(`   Current length: ${config.jwt.secret.length} characters`);
  console.error(`   Generate a secure secret with: openssl rand -base64 48`);
  process.exit(1);
}

if (!config.jwt.refreshSecret) {
  console.error('❌ JWT_REFRESH_SECRET environment variable is required');
  process.exit(1);
}

if (config.jwt.refreshSecret.length < MIN_JWT_SECRET_LENGTH) {
  console.error(`❌ JWT_REFRESH_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long (256+ bits)`);
  console.error(`   Current length: ${config.jwt.refreshSecret.length} characters`);
  console.error(`   Generate a secure secret with: openssl rand -base64 48`);
  process.exit(1);
}

// Ensure JWT secrets are different for better security
if (config.jwt.secret === config.jwt.refreshSecret) {
  console.error('❌ JWT_SECRET and JWT_REFRESH_SECRET must be different');
  console.error('   Using the same secret for access and refresh tokens is a security risk');
  process.exit(1);
}

// Warn about weak secrets (not truly random)
const weakPatterns = [
  /^(test|dev|demo|example|secret|password|admin|default)/i,
  /^(.)\1{10,}$/, // Repeated characters
  /^(123|abc|qwerty)/i,
];

weakPatterns.forEach(pattern => {
  if (pattern.test(config.jwt.secret)) {
    console.warn('⚠️  WARNING: JWT_SECRET appears to be weak or test data');
    console.warn('   Use cryptographically random secrets in production');
  }
  if (pattern.test(config.jwt.refreshSecret)) {
    console.warn('⚠️  WARNING: JWT_REFRESH_SECRET appears to be weak or test data');
    console.warn('   Use cryptographically random secrets in production');
  }
});

if (!config.database.url && !config.database.host) {
  console.error('❌ Database configuration is missing');
  process.exit(1);
}

// ============================================================================
// PRODUCTION SECURITY VALIDATIONS
// ============================================================================

if (config.env === 'production') {
  // Validate encryption key strength
  if (!config.encryption?.masterKey || config.encryption.masterKey.length < 128) {
    console.error('❌ ENCRYPTION_MASTER_KEY must be at least 128 characters in production');
    console.error('   Generate with: openssl rand -hex 64');
    process.exit(1);
  }
  
  // Check for weak/development encryption keys
  const weakKeyPatterns = [/^dev-/i, /^test-/i, /^demo-/i, /change.*production/i];
  if (weakKeyPatterns.some(pattern => pattern.test(config.encryption.masterKey))) {
    console.error('❌ ENCRYPTION_MASTER_KEY appears to be a development key');
    console.error('   Generate production key with: openssl rand -hex 64');
    process.exit(1);
  }
  
  // Validate session secret strength
  if (!config.security.sessionSecret || config.security.sessionSecret.length < 64) {
    console.error('❌ SESSION_SECRET must be at least 64 characters in production');
    console.error('   Generate with: openssl rand -base64 64');
    process.exit(1);
  }
  
  // Check for weak session secrets
  if (weakKeyPatterns.some(pattern => pattern.test(config.security.sessionSecret))) {
    console.error('❌ SESSION_SECRET appears to be a development secret');
    console.error('   Generate production secret with: openssl rand -base64 64');
    process.exit(1);
  }
  
  // Validate Redis authentication in production
  if (config.redis.enabled && !config.redis.password) {
    console.error('❌ REDIS_PASSWORD is required when Redis is enabled in production');
    console.error('   Set a strong Redis password to prevent unauthorized access');
    process.exit(1);
  }
  
  // Warn about weak database passwords
  const weakDbPasswords = ['postgres', 'password', 'admin', 'root', '123456'];
  if (weakDbPasswords.some(weak => config.database.password?.toLowerCase().includes(weak))) {
    console.error('❌ Database password appears to be weak or default');
    console.error('   Use a strong, randomly generated password in production');
    process.exit(1);
  }
  
  // Ensure HTTPS is required in production
  if (!config.security.requireHttps) {
    console.warn('⚠️  WARNING: HTTPS is not required. Set REQUIRE_HTTPS=true in production');
  }
  
  // Ensure trust proxy is configured correctly
  if (!config.security.trustProxy) {
    console.warn('⚠️  WARNING: Trust proxy not enabled. Set TRUST_PROXY=true if behind a proxy');
  }
}

export default config;
