# Phase 4: Production Deployment

**Status:** Ready for Implementation  
**Duration:** Week 5 (5 working days)  
**Prerequisites:** Phase 3 completed

---

## Overview

Phase 4 establishes production deployment procedures with zero-downtime migrations, automated backups, and rollback strategies.

---

## Pre-Deployment Checklist

Before deploying migrations to production:

- [ ] All migrations tested in dev environment
- [ ] All migrations tested in staging environment
- [ ] Database backup strategy confirmed
- [ ] Rollback plan documented
- [ ] Downtime window scheduled (if needed)
- [ ] Stakeholders notified
- [ ] Health checks configured
- [ ] Monitoring alerts set up
- [ ] Emergency contacts available
- [ ] Rollback scripts tested

---

## Production Environment Setup

### Step 1: Configure Production Database

```bash
# SSH to VPS
ssh root@your-vps-ip

# Create production database (if not exists)
psql -U postgres << 'EOSQL'
CREATE DATABASE recruitiq_production;
CREATE USER recruitiq_app WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE recruitiq_production TO recruitiq_app;
\c recruitiq_production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE SCHEMA IF NOT EXISTS hris;
GRANT ALL ON SCHEMA hris TO recruitiq_app;
EOSQL
```

### Step 2: Set Production Environment Variables

Create `/opt/recruitiq/.env.production`:

```bash
# Database
DATABASE_URL=postgresql://recruitiq_app:secure_password@postgres:5432/recruitiq_production
POSTGRES_USER=recruitiq_app
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=recruitiq_production

# Application
NODE_ENV=production
PORT=3001
API_URL=https://api.yourdomain.com

# Security (use strong secrets!)
JWT_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>
COOKIE_SECRET=<generate-strong-secret>
ENCRYPTION_KEY=<32-byte-hex-key>
SESSION_SECRET=<generate-strong-secret>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<secure-redis-password>

# CORS
CORS_ORIGINS=https://yourdomain.com,https://nexus.yourdomain.com,https://paylinq.yourdomain.com

# SSL
LETSENCRYPT_EMAIL=admin@yourdomain.com
DOMAIN=yourdomain.com

# Traefik Auth (generate with: htpasswd -n admin)
TRAEFIK_AUTH=admin:$apr1$...hashed_password...
```

### Step 3: Configure Automated Backups

Create backup script `/opt/recruitiq/scripts/backup-database.sh`:

```bash
#!/bin/bash
set -e

# Configuration
DB_NAME="recruitiq_production"
DB_USER="recruitiq_app"
BACKUP_DIR="/opt/recruitiq/backups"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/recruitiq_$TIMESTAMP.sql.gz"

echo "🗄️  Starting database backup..."
echo "Database: $DB_NAME"
echo "File: $BACKUP_FILE"

# Create backup
docker exec recruitiq_postgres pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_FILE"

# Verify backup created
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completed: $SIZE"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Delete old backups
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "recruitiq_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "recruitiq_*.sql.gz" | wc -l)
echo "📊 Total backups: $BACKUP_COUNT"

echo "✅ Backup complete!"
```

Make executable and schedule:

```bash
chmod +x /opt/recruitiq/scripts/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add:
0 2 * * * /opt/recruitiq/scripts/backup-database.sh >> /opt/recruitiq/logs/backup.log 2>&1
```

---

## Deployment Strategy

### Strategy 1: Blue-Green Deployment (Zero Downtime)

**Architecture:**

```
┌─────────────────────────────────────────┐
│  Load Balancer (Traefik)               │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐    ┌─────────────┐   │
│  │   Blue      │    │   Green     │   │
│  │  (Current)  │    │   (New)     │   │
│  │             │    │             │   │
│  │ backend_v1  │    │ backend_v2  │   │
│  └─────────────┘    └─────────────┘   │
│         │                   │          │
│         └───────┬───────────┘          │
│                 │                      │
│         ┌───────▼───────┐              │
│         │   Database    │              │
│         │  (Migrated)   │              │
│         └───────────────┘              │
└─────────────────────────────────────────┘
```

**Deployment Steps:**

```bash
#!/bin/bash
# Blue-Green deployment script

set -e

echo "🚀 Starting Blue-Green Deployment"

# 1. Backup database BEFORE migration
echo "📦 Creating pre-migration backup..."
./scripts/backup-database.sh

# 2. Run migrations on shared database
echo "🔄 Running database migrations..."
docker-compose run --rm migrations

# Verify migrations succeeded
if [ $? -ne 0 ]; then
    echo "❌ Migrations failed! Aborting deployment."
    exit 1
fi

# 3. Deploy green (new) version
echo "🟢 Deploying green version..."
docker-compose -f docker-compose.production.yml up -d backend_green

# Wait for green to be healthy
echo "⏳ Waiting for green version health check..."
sleep 30

HEALTH_CHECK=$(curl -f http://localhost:3002/health || echo "failed")
if [ "$HEALTH_CHECK" = "failed" ]; then
    echo "❌ Green version health check failed!"
    echo "🔵 Rolling back to blue version..."
    docker-compose stop backend_green
    exit 1
fi

# 4. Switch traffic from blue to green
echo "🔀 Switching traffic to green..."
docker-compose -f docker-compose.production.yml exec traefik \
    traefik config update

# 5. Monitor for errors (5 minutes)
echo "👀 Monitoring for errors (5 minutes)..."
sleep 300

# Check error rate
ERROR_COUNT=$(docker logs backend_green 2>&1 | grep -c "ERROR" || echo "0")
if [ "$ERROR_COUNT" -gt 10 ]; then
    echo "⚠️  High error rate detected ($ERROR_COUNT errors)"
    echo "🔵 Rolling back to blue version..."
    # Rollback traffic
    # ... rollback logic ...
    exit 1
fi

# 6. Stop blue version
echo "🛑 Stopping blue version..."
docker-compose stop backend_blue

# 7. Cleanup
echo "🧹 Cleaning up..."
docker image prune -f

echo "✅ Blue-Green deployment complete!"
```

### Strategy 2: Rolling Deployment (Low-Risk Changes)

For non-breaking migrations (adding columns, indexes):

```bash
#!/bin/bash
# Rolling deployment (zero downtime)

set -e

echo "🔄 Starting Rolling Deployment"

# 1. Backup
./scripts/backup-database.sh

# 2. Run backward-compatible migrations
docker-compose run --rm migrations

# 3. Update backend (one at a time)
docker-compose up -d --scale backend=2 backend

# 4. Wait and verify
sleep 30

# 5. Scale down old instances
docker-compose up -d --scale backend=1 backend

echo "✅ Rolling deployment complete!"
```

### Strategy 3: Maintenance Window (Breaking Changes)

For breaking migrations that require downtime:

```bash
#!/bin/bash
# Maintenance window deployment

set -e

echo "🚧 Starting Maintenance Window Deployment"

# 1. Enable maintenance mode
docker-compose up -d maintenance-page

# 2. Stop backend
docker-compose stop backend

# 3. Backup
./scripts/backup-database.sh

# 4. Run migrations
docker-compose run --rm migrations

# 5. Start new backend
docker-compose up -d backend

# 6. Wait for health check
sleep 60

# 7. Disable maintenance mode
docker-compose stop maintenance-page

echo "✅ Maintenance deployment complete!"
```

---

## Migration Verification

### Post-Deployment Checks

Create `scripts/verify-deployment.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 Verifying Production Deployment"

# 1. Check database connection
echo "📊 Checking database connection..."
docker exec recruitiq_postgres psql -U recruitiq_app -d recruitiq_production -c "SELECT 1;" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Database connection OK"
else
    echo "❌ Database connection failed!"
    exit 1
fi

# 2. Check migration status
echo "📋 Checking migration status..."
PENDING=$(docker-compose run --rm backend npx knex migrate:status --knexfile knexfile.js | grep "pending" | wc -l)
if [ "$PENDING" -gt 0 ]; then
    echo "⚠️  WARNING: Pending migrations detected!"
    docker-compose run --rm backend npx knex migrate:status --knexfile knexfile.js
    exit 1
else
    echo "✅ All migrations applied"
fi

# 3. Check table counts
echo "📊 Verifying table counts..."
TABLE_COUNT=$(docker exec recruitiq_postgres psql -U recruitiq_app -d recruitiq_production -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "   Public schema tables: $TABLE_COUNT"

HRIS_COUNT=$(docker exec recruitiq_postgres psql -U recruitiq_app -d recruitiq_production -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'hris';")
echo "   HRIS schema tables: $HRIS_COUNT"

# 4. API health check
echo "🏥 Checking API health..."
HEALTH=$(curl -f http://localhost:3001/health || echo "failed")
if [ "$HEALTH" != "failed" ]; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed!"
    exit 1
fi

# 5. Check for errors in logs
echo "📝 Checking recent logs..."
ERROR_COUNT=$(docker logs --since 10m backend 2>&1 | grep -c "ERROR" || echo "0")
echo "   Recent errors: $ERROR_COUNT"

if [ "$ERROR_COUNT" -gt 5 ]; then
    echo "⚠️  High error count in logs!"
    docker logs --since 10m --tail 20 backend
fi

echo ""
echo "✅ Deployment verification complete!"
```

---

## Monitoring & Alerts

### Step 1: Set Up Health Monitoring

Create `scripts/health-monitor.sh`:

```bash
#!/bin/bash
# Continuous health monitoring

WEBHOOK_URL="https://your-slack-webhook-url"

while true; do
    # Check API health
    if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
        # Alert to Slack
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"🚨 RecruitIQ API is DOWN!"}' \
            $WEBHOOK_URL
    fi
    
    # Check database
    if ! docker exec recruitiq_postgres pg_isready -U recruitiq_app > /dev/null 2>&1; then
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"🚨 Database is DOWN!"}' \
            $WEBHOOK_URL
    fi
    
    # Check migration state
    PENDING=$(docker-compose run --rm -T backend npx knex migrate:status --knexfile knexfile.js | grep -c "pending" || echo "0")
    if [ "$PENDING" -gt 0 ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data '{"text":"⚠️  Pending migrations detected in production!"}' \
            $WEBHOOK_URL
    fi
    
    sleep 60
done
```

### Step 2: Configure Alerts

Add to `docker-compose.production.yml`:

```yaml
# Add Prometheus for metrics
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus_data:/prometheus
  ports:
    - "9090:9090"

# Add Grafana for visualization
grafana:
  image: grafana/grafana:latest
  volumes:
    - grafana_data:/var/lib/grafana
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
```

---

## Rollback Procedures

### Automatic Rollback Script

Create `scripts/rollback.sh`:

```bash
#!/bin/bash
set -e

STEPS=${1:-1}  # Number of migrations to rollback (default: 1)

echo "⏪ Starting Migration Rollback"
echo "Steps to rollback: $STEPS"

# Confirmation
read -p "This will rollback $STEPS migrations. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Rollback cancelled"
    exit 0
fi

# 1. Backup current state BEFORE rollback
echo "📦 Creating pre-rollback backup..."
./scripts/backup-database.sh

# 2. Stop backend (prevent data corruption)
echo "🛑 Stopping backend..."
docker-compose stop backend

# 3. Run rollback
echo "⏪ Rolling back $STEPS migrations..."
docker-compose run --rm backend npx knex migrate:rollback --knexfile knexfile.js --all

# Verify rollback
if [ $? -ne 0 ]; then
    echo "❌ Rollback failed!"
    exit 1
fi

# 4. Show current migration status
echo "📊 Current migration status:"
docker-compose run --rm backend npx knex migrate:status --knexfile knexfile.js

# 5. Start backend with old version
echo "🚀 Starting backend..."
docker-compose up -d backend

# 6. Wait for health check
sleep 30

# 7. Verify
echo "🔍 Verifying rollback..."
./scripts/verify-deployment.sh

echo "✅ Rollback complete!"
```

### Emergency Rollback from Backup

```bash
#!/bin/bash
# Emergency restore from backup

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore-backup.sh <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh /opt/recruitiq/backups/
    exit 1
fi

echo "🚨 EMERGENCY DATABASE RESTORE"
echo "Backup file: $BACKUP_FILE"
echo ""

read -p "This will COMPLETELY REPLACE the database. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# 1. Stop backend
echo "🛑 Stopping backend..."
docker-compose stop backend

# 2. Create backup of current state (just in case)
echo "📦 Backing up current state..."
./scripts/backup-database.sh

# 3. Drop and recreate database
echo "🗑️  Dropping current database..."
docker exec recruitiq_postgres psql -U postgres -c "DROP DATABASE recruitiq_production;"
docker exec recruitiq_postgres psql -U postgres -c "CREATE DATABASE recruitiq_production;"
docker exec recruitiq_postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE recruitiq_production TO recruitiq_app;"

# 4. Restore from backup
echo "📥 Restoring from backup..."
gunzip -c "$BACKUP_FILE" | docker exec -i recruitiq_postgres psql -U recruitiq_app -d recruitiq_production

# 5. Verify restore
echo "🔍 Verifying restore..."
TABLE_COUNT=$(docker exec recruitiq_postgres psql -U recruitiq_app -d recruitiq_production -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tables restored: $TABLE_COUNT"

# 6. Start backend
echo "🚀 Starting backend..."
docker-compose up -d backend

echo "✅ Emergency restore complete!"
```

---

## Success Criteria

Phase 4 is complete when:

- [ ] Production environment configured
- [ ] Automated backup system operational
- [ ] Blue-green deployment tested
- [ ] Rolling deployment tested
- [ ] Maintenance window process documented
- [ ] Verification scripts working
- [ ] Monitoring and alerts configured
- [ ] Rollback procedures tested
- [ ] Emergency restore tested
- [ ] Documentation updated

**Estimated Time:** 1 week (5 working days)  
**Actual Time:** _________  
**Blockers:** _________  
**Notes:** _________

---

## Next Steps

Once Phase 4 is complete:

1. ✅ **Phase 4 Complete**: Production deployment procedures in place
2. ➡️ **Start Phase 5**: Comprehensive testing
3. 📚 **Read Next**: [PHASE5_TESTING.md](./PHASE5_TESTING.md)
