import config from '../../config/index.js';
import crypto from 'crypto';

/**
 * Generate cloud-init configuration for RecruitIQ deployment
 * @param {object} options - Deployment options
 * @param {string} options.instanceId - Instance ID from license manager
 * @param {string} options.customerId - Customer ID
 * @param {string} options.licenseKey - License key
 * @param {string} options.hostname - Hostname for the instance
 * @param {string} options.domain - Domain name (optional)
 * @param {string} options.email - Email for Let's Encrypt
 * @param {object} options.dbConfig - Database configuration
 * @returns {string} Base64 encoded cloud-init YAML
 */
function generateCloudInitConfig(options) {
  const {
    instanceId,
    customerId,
    licenseKey,
    hostname,
    domain,
    email,
    dbConfig = {},
  } = options;

  const fqdn = domain ? `${hostname}.${domain}` : hostname;
  const dbPassword = dbConfig.password || generateRandomPassword();
  const callbackUrl = `${config.licenseManager.baseUrl}/api/deployments/callback`;

  const cloudInitYaml = `#cloud-config

# RecruitIQ Deployment
# Instance: ${instanceId}
# Customer: ${customerId}

# Set hostname
hostname: ${hostname}
fqdn: ${fqdn}

# Package updates
package_update: true
package_upgrade: true

# Install required packages
packages:
  - docker.io
  - docker-compose
  - nginx
  - certbot
  - python3-certbot-nginx
  - curl
  - git
  - ufw

# Create directories
runcmd:
  # Setup firewall
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow ssh
  - ufw allow http
  - ufw allow https
  - ufw --force enable

  # Create application directory
  - mkdir -p /opt/recruitiq
  - cd /opt/recruitiq

  # Create docker-compose.yml
  - |
    cat > docker-compose.yml << 'DOCKER_COMPOSE_EOF'
${getDockerComposeContent(dbPassword)}
DOCKER_COMPOSE_EOF

  # Create .env file
  - |
    cat > .env << 'ENV_EOF'
${getEnvFileContent(instanceId, customerId, licenseKey, dbPassword)}
ENV_EOF

  # Create nginx configuration
  - |
    cat > /etc/nginx/sites-available/recruitiq << 'NGINX_EOF'
${getNginxConfig(fqdn)}
NGINX_EOF

  # Enable nginx site
  - ln -sf /etc/nginx/sites-available/recruitiq /etc/nginx/sites-enabled/
  - rm -f /etc/nginx/sites-enabled/default
  - nginx -t && systemctl reload nginx

  # Start Docker containers
  - docker-compose up -d

  # Wait for application to be ready
  - sleep 30

  # Setup SSL with Let's Encrypt (if domain provided)
${domain ? `  - certbot --nginx -d ${fqdn} --non-interactive --agree-tos --email ${email} --redirect` : '  # Skipping SSL setup (no domain provided)'}

  # Send deployment success callback
  - |
    curl -X POST "${callbackUrl}" \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer ${config.licenseManager.apiKey}" \\
      -d "{\\"instanceId\\": \\"${instanceId}\\", \\"status\\": \\"success\\", \\"hostname\\": \\"${fqdn}\\"}"

# Handle errors
power_state:
  mode: reboot
  timeout: 300
  condition: true

# Final message
final_message: "RecruitIQ deployment completed after $UPTIME seconds"
`;

  // Encode to base64
  return Buffer.from(cloudInitYaml).toString('base64');
}

/**
 * Generate Docker Compose configuration
 * @param {string} dbPassword - Database password
 * @returns {string} Docker Compose YAML content
 */
function getDockerComposeContent(dbPassword) {
  return `version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: recruitiq-postgres
    restart: always
    environment:
      POSTGRES_USER: recruitiq
      POSTGRES_PASSWORD: ${dbPassword}
      POSTGRES_DB: recruitiq
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - recruitiq-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U recruitiq"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: recruitiq-redis
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - recruitiq-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  backend:
    image: recruitiq/backend:latest
    container_name: recruitiq-backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://recruitiq:${dbPassword}@postgres:5432/recruitiq
      REDIS_URL: redis://redis:6379
    env_file:
      - .env
    networks:
      - recruitiq-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: recruitiq/frontend:latest
    container_name: recruitiq-frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "3000:80"
    networks:
      - recruitiq-network

volumes:
  postgres-data:
  redis-data:

networks:
  recruitiq-network:
    driver: bridge
`;
}

/**
 * Generate environment file content
 * @param {string} instanceId - Instance ID
 * @param {string} customerId - Customer ID
 * @param {string} licenseKey - License key
 * @param {string} dbPassword - Database password
 * @returns {string} Environment file content
 */
function getEnvFileContent(instanceId, customerId, licenseKey, dbPassword) {
  return `# RecruitIQ Instance Configuration
INSTANCE_ID=${instanceId}
CUSTOMER_ID=${customerId}
LICENSE_KEY=${licenseKey}

# Database
DB_PASSWORD=${dbPassword}

# License Manager
LICENSE_MANAGER_URL=${config.licenseManager.baseUrl}
LICENSE_MANAGER_API_KEY=${config.licenseManager.apiKey}

# Security (generate secure secrets in production)
JWT_SECRET=${generateRandomPassword(32)}
SESSION_SECRET=${generateRandomPassword(32)}

# Application
NODE_ENV=production
LOG_LEVEL=info

# Features
ENABLE_TELEMETRY=true
ENABLE_AUTO_UPDATES=true
`;
}

/**
 * Generate Nginx configuration
 * @param {string} fqdn - Fully qualified domain name
 * @returns {string} Nginx configuration
 */
function getNginxConfig(fqdn) {
  return `server {
    listen 80;
    listen [::]:80;
    server_name ${fqdn};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
`;
}

/**
 * Generate a random password
 * @param {number} length - Password length (default: 24)
 * @returns {string} Random password
 */
function generateRandomPassword(length = 24) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomBytesBuffer = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytesBuffer[i] % charset.length];
  }
  
  return password;
}

export {
  generateCloudInitConfig,
  getDockerComposeContent,
  getEnvFileContent,
  getNginxConfig,
  generateRandomPassword,
};

export default {
  generateCloudInitConfig,
  getDockerComposeContent,
  getEnvFileContent,
  getNginxConfig,
  generateRandomPassword,
};
