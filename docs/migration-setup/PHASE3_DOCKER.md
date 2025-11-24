# Phase 3: Docker Integration

**Status:** Ready for Implementation  
**Duration:** Week 4 (5 working days)  
**Prerequisites:** Phase 2 completed

---

## Overview

Phase 3 integrates Knex.js migrations into the Docker deployment pipeline, ensuring migrations run automatically when containers start.

---

## Architecture: Migration Init Container

```
┌─────────────────────────────────────────────┐
│          Docker Compose Stack               │
├─────────────────────────────────────────────┤
│                                             │
│  1. postgres (starts first)                 │
│      └─> health check: pg_isready          │
│                                             │
│  2. migrations (init container)             │
│      └─> depends_on: postgres healthy      │
│      └─> runs: npx knex migrate:latest     │
│      └─> exits after completion             │
│                                             │
│  3. backend (main app)                      │
│      └─> depends_on: migrations completed  │
│      └─> starts: node src/server.js        │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Day 1: Update Dockerfile

### Step 1: Update Dockerfile.backend

Replace `c:\RecruitIQ\Dockerfile.backend` with:

```dockerfile
# Multi-stage build for production backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY backend/package*.json ./
COPY backend/pnpm-lock.yaml* ./

# Install dependencies (use pnpm if lockfile exists, else npm)
RUN if [ -f pnpm-lock.yaml ]; then \
      npm install -g pnpm && pnpm install --frozen-lockfile --prod; \
    else \
      npm ci --only=production; \
    fi && \
    npm cache clean --force

# Copy application source
COPY backend/src ./src
COPY backend/migrations ./migrations
COPY backend/knexfile.js ./

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init postgresql-client

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs backend/src ./src
COPY --chown=nodejs:nodejs backend/migrations ./migrations
COPY --chown=nodejs:nodejs backend/knexfile.js ./
COPY --chown=nodejs:nodejs backend/package*.json ./

# Copy migration scripts
COPY --chown=nodejs:nodejs backend/scripts/migrations ./scripts/migrations
RUN chmod +x ./scripts/migrations/*.sh

# Create logs directory
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command (can be overridden for migrations)
CMD ["node", "src/server.js"]
```

### Step 2: Create Migration Entrypoint Script

Create `backend/scripts/docker-entrypoint.sh`:

```bash
#!/bin/sh
# Docker entrypoint for backend container
# Handles migrations before starting the application

set -e

echo "🚀 RecruitIQ Backend Starting..."
echo ""

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for PostgreSQL..."
    
    max_attempts=30
    attempt=0
    
    until pg_isready -h ${DB_HOST:-postgres} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} > /dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            echo "❌ PostgreSQL did not become ready in time"
            exit 1
        fi
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
    done
    
    echo "✅ PostgreSQL is ready"
    echo ""
}

# Function to run migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    
    if npx knex migrate:latest --knexfile knexfile.js; then
        echo "✅ Migrations completed successfully"
        echo ""
        
        # Show migration status
        echo "📊 Migration Status:"
        npx knex migrate:status --knexfile knexfile.js || true
        echo ""
    else
        echo "❌ Migration failed"
        exit 1
    fi
}

# Main execution
case "$1" in
    migrate)
        # Migration-only mode (for init container)
        wait_for_db
        run_migrations
        echo "✅ Migration container completed"
        ;;
    
    migrate-and-start)
        # Migrate then start app (for single container mode)
        wait_for_db
        run_migrations
        echo "🚀 Starting application..."
        exec node src/server.js
        ;;
    
    *)
        # Default: just start the app (migrations run separately)
        echo "🚀 Starting application (migrations handled externally)..."
        exec "$@"
        ;;
esac
```

Make it executable:
```bash
chmod +x backend/scripts/docker-entrypoint.sh
```

---

## Day 2: Update docker-compose Files

### Step 1: Update docker-compose.production.yml

Update `c:\RecruitIQ\docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: recruitiq_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - recruitiq_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: recruitiq_redis
    restart: unless-stopped
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - recruitiq_network
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Database Migrations (Init Container)
  migrations:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: recruitiq_migrations
    command: ["./scripts/docker-entrypoint.sh", "migrate"]
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: ${POSTGRES_DB}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - recruitiq_network
    restart: "no"  # Run once and exit

  # Backend API
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: recruitiq_backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      migrations:
        condition: service_completed_successfully
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      COOKIE_SECRET: ${COOKIE_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      CORS_ORIGINS: ${CORS_ORIGINS}
      SESSION_SECRET: ${SESSION_SECRET}
    volumes:
      - backend_logs:/app/logs
      - backend_uploads:/app/uploads
    networks:
      - recruitiq_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`api.${DOMAIN}`)"
      - "traefik.http.routers.backend.entrypoints=websecure"
      - "traefik.http.routers.backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.backend.loadbalancer.server.port=3001"

  # Frontend services (unchanged)
  nexus:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        APP_NAME: nexus
    container_name: recruitiq_nexus
    restart: unless-stopped
    networks:
      - recruitiq_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nexus.rule=Host(`nexus.${DOMAIN}`)"
      - "traefik.http.routers.nexus.entrypoints=websecure"
      - "traefik.http.routers.nexus.tls.certresolver=letsencrypt"

  paylinq:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        APP_NAME: paylinq
    container_name: recruitiq_paylinq
    restart: unless-stopped
    networks:
      - recruitiq_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.paylinq.rule=Host(`paylinq.${DOMAIN}`)"
      - "traefik.http.routers.paylinq.entrypoints=websecure"
      - "traefik.http.routers.paylinq.tls.certresolver=letsencrypt"

  portal:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        APP_NAME: portal
    container_name: recruitiq_portal
    restart: unless-stopped
    networks:
      - recruitiq_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portal.rule=Host(`portal.${DOMAIN}`)"
      - "traefik.http.routers.portal.entrypoints=websecure"
      - "traefik.http.routers.portal.tls.certresolver=letsencrypt"

  recruitiq:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        APP_NAME: recruitiq
    container_name: recruitiq_app
    restart: unless-stopped
    networks:
      - recruitiq_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.recruitiq.rule=Host(`${DOMAIN}`, `www.${DOMAIN}`)"
      - "traefik.http.routers.recruitiq.entrypoints=websecure"
      - "traefik.http.routers.recruitiq.tls.certresolver=letsencrypt"

  # Traefik Reverse Proxy (unchanged)
  traefik:
    image: traefik:v2.10
    container_name: recruitiq_traefik
    restart: unless-stopped
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=${LETSENCRYPT_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--log.level=INFO"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/letsencrypt
    networks:
      - recruitiq_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.${DOMAIN}`)"
      - "traefik.http.routers.traefik.service=api@internal"
      - "traefik.http.routers.traefik.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=${TRAEFIK_AUTH}"

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  backend_logs:
    driver: local
  backend_uploads:
    driver: local
  traefik_certs:
    driver: local

networks:
  recruitiq_network:
    driver: bridge
```

### Step 2: Create docker-compose.dev.yml

Create `c:\RecruitIQ\docker-compose.dev.yml` for local development:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: recruitiq_postgres_dev
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: recruitiq_dev
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: recruitiq_redis_dev
    ports:
      - "6379:6379"
    command: redis-server --requirepass devpassword

  # Migration service for dev
  migrations:
    build:
      context: .
      dockerfile: Dockerfile.backend
    command: ["./scripts/docker-entrypoint.sh", "migrate"]
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/recruitiq_dev
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"

volumes:
  postgres_dev_data:
```

---

## Day 3: Test Docker Integration Locally

### Step 1: Build Images

```bash
cd c:\RecruitIQ

# Build backend image
docker-compose -f docker-compose.dev.yml build migrations

# Verify image exists
docker images | Select-String "recruitiq"
```

### Step 2: Test Migration Container

```bash
# Start PostgreSQL
docker-compose -f docker-compose.dev.yml up -d postgres

# Wait for PostgreSQL
Start-Sleep -Seconds 10

# Run migrations
docker-compose -f docker-compose.dev.yml up migrations

# Check logs
docker-compose -f docker-compose.dev.yml logs migrations

# Verify migrations ran
docker exec recruitiq_postgres_dev psql -U postgres -d recruitiq_dev -c "SELECT * FROM knex_migrations;"
```

### Step 3: Test Full Stack

```bash
# Start everything
docker-compose -f docker-compose.dev.yml up -d

# Check migration container completed
docker-compose -f docker-compose.dev.yml ps

# migrations should show "Exit 0"

# Clean up
docker-compose -f docker-compose.dev.yml down
```

---

## Day 4: CI/CD Integration

### Step 1: Update Deployment Script

Update `c:\RecruitIQ\scripts\deploy.sh`:

```bash
#!/bin/bash
set -e

ENVIRONMENT=${1:-production}
APPS=${2:-all}

echo "🚀 Deploying RecruitIQ to $ENVIRONMENT"
echo "📦 Apps: $APPS"

# Load environment
if [ -f ".env.$ENVIRONMENT" ]; then
    source ".env.$ENVIRONMENT"
else
    echo "❌ Environment file .env.$ENVIRONMENT not found"
    exit 1
fi

# Build images
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.production.yml build

# Transfer to VPS
echo "📤 Transferring to VPS..."
scp docker-compose.production.yml $VPS_USER@$VPS_HOST:/opt/recruitiq/docker-compose.yml

# Deploy on VPS
echo "🚀 Deploying on VPS..."
ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
cd /opt/recruitiq

# Pull images
docker-compose pull postgres redis traefik

# Start database
docker-compose up -d postgres redis

# Wait for database
sleep 10

# Run migrations (separate step for visibility)
echo "🔄 Running database migrations..."
docker-compose up migrations

# Check migration status
if [ $? -ne 0 ]; then
    echo "❌ Migrations failed!"
    exit 1
fi

echo "✅ Migrations completed successfully"

# Deploy application
docker-compose up -d backend nexus paylinq portal recruitiq traefik

# Health check
sleep 30
curl -f http://localhost:3001/health || exit 1

# Cleanup old images
docker image prune -f

echo "✅ Deployment complete!"
ENDSSH

echo "✅ RecruitIQ deployed successfully to $ENVIRONMENT!"
```

### Step 2: Create Health Check Script

Create `backend/scripts/health-check.js`:

```javascript
/**
 * Health check script
 * Verifies database migrations are up to date
 */

import knex from 'knex';
import config from '../knexfile.js';

async function healthCheck() {
  const db = knex(config);
  
  try {
    // Check database connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection OK');
    
    // Check migrations
    const [latest] = await db.migrate.currentVersion();
    console.log(`✅ Migration version: ${latest}`);
    
    // Check pending migrations
    const [, pending] = await db.migrate.list();
    
    if (pending.length > 0) {
      console.log('⚠️  WARNING: Pending migrations detected:');
      pending.forEach(m => console.log(`  - ${m}`));
      process.exit(1);
    }
    
    console.log('✅ All migrations applied');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

healthCheck();
```

---

## Day 5: Documentation & Testing

### Step 1: Update README

Update `backend/README.md`:

```markdown
# RecruitIQ Backend

## Docker Deployment

### Production Deployment

```bash
# Deploy full stack with automated migrations
docker-compose -f docker-compose.production.yml up -d
```

The deployment process:
1. PostgreSQL starts and becomes healthy
2. Migration init container runs all pending migrations
3. Backend API starts after migrations complete
4. Frontend apps start

### Development with Docker

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Migrations run automatically on first start
```

### Manual Migration Management

```bash
# Run migrations manually
docker-compose run --rm migrations

# Check migration status
docker-compose run --rm backend npx knex migrate:status --knexfile knexfile.js

# Rollback (emergency)
docker-compose run --rm backend npx knex migrate:rollback --knexfile knexfile.js
```

## See Also

- [Migration Setup Guide](../docs/migration-setup/OVERVIEW.md)
- [Docker Integration](../docs/migration-setup/PHASE3_DOCKER.md)
```

### Step 2: Test Scenarios

Create test scenarios document:

```markdown
# Docker Migration Test Scenarios

## Scenario 1: Fresh Deployment
- Empty database
- All migrations should run
- Application starts successfully

## Scenario 2: Update Deployment
- Existing database with data
- Only new migrations run
- Data preserved
- Application starts successfully

## Scenario 3: Rollback Deployment
- Migrations rolled back
- Previous version deployed
- Application works with old schema

## Scenario 4: Migration Failure
- Migration has error
- Migration container exits with error
- Backend does NOT start
- Previous state preserved
```

---

## Success Criteria

Phase 3 is complete when:

- [ ] Dockerfile includes migrations
- [ ] docker-compose.production.yml has migration init container
- [ ] Migration container runs before backend
- [ ] Backend depends on migration completion
- [ ] Migrations run automatically on deploy
- [ ] Health checks verify migration status
- [ ] Deployment script updated
- [ ] Documentation updated
- [ ] Local Docker testing successful
- [ ] CI/CD pipeline updated

**Estimated Time:** 1 week (5 working days)  
**Actual Time:** _________  
**Blockers:** _________  
**Notes:** _________

---

## Next Steps

Once Phase 3 is complete:

1. ✅ **Phase 3 Complete**: Docker integration functional
2. ➡️ **Start Phase 4**: Production deployment procedures
3. 📚 **Read Next**: [PHASE4_PRODUCTION.md](./PHASE4_PRODUCTION.md)
