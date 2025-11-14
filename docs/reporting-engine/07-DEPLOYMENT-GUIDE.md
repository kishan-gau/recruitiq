# Deployment Guide - Production Setup

**Document:** 07-DEPLOYMENT-GUIDE.md  
**Project:** Multi-Tenant Consolidated Reporting System  
**Created:** November 13, 2025  

---

## Overview

This guide covers deploying the complete reporting engine to a production environment, including infrastructure setup, security hardening, monitoring, and maintenance procedures.

---

## 1. Infrastructure Requirements

### Minimum Hardware Specifications

**Reporting Database Server:**
- CPU: 4 cores (8 recommended)
- RAM: 16 GB (32 GB recommended)
- Storage: 500 GB SSD (1 TB recommended)
- Network: 1 Gbps

**Backend API Server:**
- CPU: 2 cores (4 recommended)
- RAM: 8 GB (16 GB recommended)
- Storage: 100 GB SSD
- Network: 1 Gbps

**Metabase Server:**
- CPU: 2 cores
- RAM: 4 GB (8 GB recommended)
- Storage: 50 GB SSD
- Network: 1 Gbps

**ETL Service:**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 50 GB SSD
- Network: 1 Gbps

### Cloud Provider Options

**AWS:**
- Database: RDS PostgreSQL (db.m5.xlarge)
- Backend: ECS Fargate (2 vCPU, 4 GB)
- Load Balancer: Application Load Balancer
- Cost: ~$500-700/month

**Azure:**
- Database: Azure Database for PostgreSQL (Standard_D4s_v3)
- Backend: Container Instances
- Load Balancer: Azure Load Balancer
- Cost: ~$450-650/month

**Google Cloud:**
- Database: Cloud SQL PostgreSQL (db-n1-standard-4)
- Backend: Cloud Run
- Load Balancer: Cloud Load Balancing
- Cost: ~$500-700/month

**Self-Hosted (Recommended for cost):**
- 3x VPS servers (Hetzner, DigitalOcean, Linode)
- Total: ~$150-200/month

---

## 2. Complete Docker Compose Setup

### Production docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL Reporting Database
  reporting-db:
    image: postgres:15-alpine
    container_name: reporting-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: recruitiq_reporting
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - reporting-db-data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d:ro
      - ./database/backups:/backups
    ports:
      - "5433:5432"  # External port (5433 to avoid conflict with operational DB)
    networks:
      - reporting-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: >
      postgres
      -c shared_buffers=4GB
      -c effective_cache_size=12GB
      -c maintenance_work_mem=1GB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c work_mem=16MB
      -c max_worker_processes=8
      -c max_parallel_workers_per_gather=4
      -c max_parallel_workers=8
      -c max_connections=100

  # Redis for rate limiting and caching
  redis:
    image: redis:7-alpine
    container_name: reporting-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - reporting-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: reporting-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4000
      
      # Database
      DB_HOST: reporting-db
      DB_PORT: 5432
      DB_NAME: recruitiq_reporting
      DB_USER: reporting_reader
      DB_PASSWORD: ${REPORTING_READER_PASSWORD}
      DB_POOL_SIZE: 20
      
      # Redis
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      
      # JWT
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_ACCESS_EXPIRY: 1h
      JWT_REFRESH_EXPIRY: 30d
      
      # Security
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      
      # Logging
      LOG_LEVEL: info
      
    volumes:
      - ./backend:/app
      - /app/node_modules
      - backend-logs:/app/logs
    ports:
      - "4000:4000"
    networks:
      - reporting-network
    depends_on:
      - reporting-db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ETL Service
  etl:
    build:
      context: ./etl-service
      dockerfile: Dockerfile
    container_name: reporting-etl
    restart: unless-stopped
    environment:
      NODE_ENV: production
      TZ: America/New_York
      
      # Reporting Database
      REPORTING_DB_HOST: reporting-db
      REPORTING_DB_PORT: 5432
      REPORTING_DB_NAME: recruitiq_reporting
      REPORTING_DB_USER: etl_writer
      REPORTING_DB_PASSWORD: ${ETL_WRITER_PASSWORD}
      
      # Operational Databases
      NEXUS_DB_HOST: ${NEXUS_DB_HOST}
      NEXUS_DB_PORT: 5432
      NEXUS_DB_NAME: nexus_hris
      NEXUS_DB_USER: etl_reader
      NEXUS_DB_PASSWORD: ${NEXUS_DB_PASSWORD}
      
      PAYLINQ_DB_HOST: ${PAYLINQ_DB_HOST}
      PAYLINQ_DB_PORT: 5432
      PAYLINQ_DB_NAME: paylinq
      PAYLINQ_DB_USER: etl_reader
      PAYLINQ_DB_PASSWORD: ${PAYLINQ_DB_PASSWORD}
      
      # Email notifications
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      ALERT_EMAIL: ${ALERT_EMAIL}
      
    volumes:
      - ./etl-service:/app
      - /app/node_modules
      - etl-logs:/app/logs
    networks:
      - reporting-network
    depends_on:
      - reporting-db

  # Metabase
  metabase:
    image: metabase/metabase:v0.48.0
    container_name: reporting-metabase
    restart: unless-stopped
    environment:
      MB_DB_TYPE: postgres
      MB_DB_DBNAME: metabase
      MB_DB_PORT: 5432
      MB_DB_USER: metabase
      MB_DB_PASS: ${METABASE_DB_PASSWORD}
      MB_DB_HOST: metabase-db
      
      JAVA_TIMEZONE: America/New_York
      MB_JETTY_PORT: 3000
      
      MB_PASSWORD_COMPLEXITY: strong
      MB_PASSWORD_LENGTH: 12
      MB_SESSION_TIMEOUT: 480
      
      MB_EMAIL_SMTP_HOST: ${SMTP_HOST}
      MB_EMAIL_SMTP_PORT: ${SMTP_PORT}
      MB_EMAIL_SMTP_USERNAME: ${SMTP_USER}
      MB_EMAIL_SMTP_PASSWORD: ${SMTP_PASSWORD}
      MB_EMAIL_SMTP_SECURITY: tls
      
      MB_JWT_SHARED_SECRET: ${JWT_SHARED_SECRET}
      
    volumes:
      - metabase-data:/metabase-data
    ports:
      - "3001:3000"
    networks:
      - reporting-network
    depends_on:
      - metabase-db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Metabase Database
  metabase-db:
    image: postgres:15-alpine
    container_name: metabase-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: metabase
      POSTGRES_USER: metabase
      POSTGRES_PASSWORD: ${METABASE_DB_PASSWORD}
    volumes:
      - metabase-db-data:/var/lib/postgresql/data
    networks:
      - reporting-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: reporting-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx-logs:/var/log/nginx
    networks:
      - reporting-network
    depends_on:
      - backend
      - metabase

volumes:
  reporting-db-data:
  redis-data:
  backend-logs:
  etl-logs:
  metabase-data:
  metabase-db-data:
  nginx-logs:

networks:
  reporting-network:
    driver: bridge
```

---

## 3. Environment Configuration

### .env.production

```bash
# PostgreSQL
POSTGRES_PASSWORD=<GENERATE_STRONG_PASSWORD>
REPORTING_READER_PASSWORD=<GENERATE_STRONG_PASSWORD>
ETL_WRITER_PASSWORD=<GENERATE_STRONG_PASSWORD>

# Redis
REDIS_PASSWORD=<GENERATE_STRONG_PASSWORD>

# JWT Secrets (use `openssl rand -base64 64`)
JWT_ACCESS_SECRET=<GENERATE_SECRET>
JWT_REFRESH_SECRET=<GENERATE_SECRET>
JWT_SHARED_SECRET=<GENERATE_SECRET>  # For Metabase SSO

# Operational Database Connections
NEXUS_DB_HOST=operational-db-host.example.com
NEXUS_DB_PASSWORD=<NEXUS_DB_PASSWORD>

PAYLINQ_DB_HOST=operational-db-host.example.com
PAYLINQ_DB_PASSWORD=<PAYLINQ_DB_PASSWORD>

# Metabase
METABASE_DB_PASSWORD=<GENERATE_STRONG_PASSWORD>
METABASE_ADMIN_EMAIL=admin@recruitiq.com
METABASE_ADMIN_PASSWORD=<GENERATE_STRONG_PASSWORD>

# Email (for notifications and scheduled reports)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@recruitiq.com
SMTP_PASSWORD=<EMAIL_PASSWORD>
ALERT_EMAIL=admin@recruitiq.com

# Security
ALLOWED_ORIGINS=https://reporting.recruitiq.com,https://app.recruitiq.com

# URLs
BACKEND_URL=https://api-reporting.recruitiq.com
METABASE_URL=https://bi.recruitiq.com
```

### Generate Strong Passwords

```bash
# Generate random passwords
openssl rand -base64 32

# Generate JWT secrets
openssl rand -base64 64
```

---

## 4. Nginx Configuration

### nginx.conf

```nginx
events {
    worker_connections 1024;
}

http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

    # Upstream backends
    upstream backend {
        server backend:4000;
    }

    upstream metabase {
        server metabase:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name api-reporting.recruitiq.com bi.recruitiq.com;
        return 301 https://$server_name$request_uri;
    }

    # Backend API
    server {
        listen 443 ssl http2;
        server_name api-reporting.recruitiq.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Logging
        access_log /var/log/nginx/backend-access.log;
        error_log /var/log/nginx/backend-error.log;

        # Health check (no rate limit)
        location /health {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Auth endpoints (strict rate limit)
        location /api/auth {
            limit_req zone=auth_limit burst=5 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API endpoints (normal rate limit)
        location /api {
            limit_req zone=api_limit burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts for long-running reports
            proxy_read_timeout 300s;
            proxy_connect_timeout 10s;
        }
    }

    # Metabase
    server {
        listen 443 ssl http2;
        server_name bi.recruitiq.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;

        # Logging
        access_log /var/log/nginx/metabase-access.log;
        error_log /var/log/nginx/metabase-error.log;

        location / {
            proxy_pass http://metabase;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support for Metabase
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Increase buffer size for large dashboards
            proxy_buffer_size 128k;
            proxy_buffers 4 256k;
            proxy_busy_buffers_size 256k;
        }
    }
}
```

---

## 5. SSL Certificate Setup

### Using Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx -d api-reporting.recruitiq.com -d bi.recruitiq.com

# Auto-renewal (certbot installs cron job automatically)
sudo certbot renew --dry-run

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/api-reporting.recruitiq.com/fullchain.pem ./nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/api-reporting.recruitiq.com/privkey.pem ./nginx/ssl/key.pem
```

---

## 6. Database Initialization

### Run Schema Scripts

```bash
# 1. Connect to reporting database
docker exec -it reporting-db psql -U postgres -d recruitiq_reporting

# 2. Run schema creation scripts in order
\i /docker-entrypoint-initdb.d/01-create-schemas.sql
\i /docker-entrypoint-initdb.d/02-security-tables.sql
\i /docker-entrypoint-initdb.d/03-operational-tables.sql
\i /docker-entrypoint-initdb.d/04-reporting-views.sql
\i /docker-entrypoint-initdb.d/05-functions.sql
\i /docker-entrypoint-initdb.d/06-users.sql
\i /docker-entrypoint-initdb.d/07-seed-data.sql

# 3. Verify installation
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname IN ('operational', 'reporting', 'security', 'audit', 'etl');
```

---

## 7. Deployment Steps

### Step 1: Prepare Server

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Clone Repository

```bash
# Clone project
git clone https://github.com/your-org/reporting-engine.git
cd reporting-engine

# Copy environment file
cp .env.example .env.production
nano .env.production  # Edit with production values
```

### Step 3: Build and Start Services

```bash
# Build images
docker-compose -f docker-compose.yml --env-file .env.production build

# Start services
docker-compose -f docker-compose.yml --env-file .env.production up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### Step 4: Initialize Database

```bash
# Run migrations
docker exec reporting-backend npm run migrate

# Seed initial data
docker exec reporting-backend npm run seed
```

### Step 5: Setup Metabase

```bash
# Wait for Metabase to start (takes 2-3 minutes)
docker logs -f reporting-metabase

# Configure Metabase connection
node scripts/setup-metabase-connection.js

# Create initial dashboards
node scripts/create-dashboards.js
```

### Step 6: Run Initial ETL

```bash
# Run first ETL sync manually
docker exec reporting-etl node scripts/run-etl.js

# Verify data loaded
docker exec reporting-db psql -U postgres -d recruitiq_reporting -c "SELECT COUNT(*) FROM operational.employees;"
```

### Step 7: Verify Deployment

```bash
# Test backend health
curl https://api-reporting.recruitiq.com/health

# Test authentication
curl -X POST https://api-reporting.recruitiq.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@recruitiq.com","password":"YOUR_PASSWORD"}'

# Access Metabase
# Open browser: https://bi.recruitiq.com
```

---

## 8. Monitoring Setup

### Prometheus + Grafana (Optional but Recommended)

```yaml
# Add to docker-compose.yml

  prometheus:
    image: prom/prometheus
    container_name: reporting-prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - reporting-network

  grafana:
    image: grafana/grafana
    container_name: reporting-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3002:3000"
    networks:
      - reporting-network
```

### Log Aggregation

```bash
# Install Loki for log aggregation
docker run -d --name=loki \
  -p 3100:3100 \
  -v loki-data:/loki \
  grafana/loki:latest
```

---

## 9. Backup Procedures

### Automated Daily Backups

```bash
#!/bin/bash
# /opt/reporting-backups/backup.sh

BACKUP_DIR="/opt/reporting-backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Backup reporting database
docker exec reporting-db pg_dump -U postgres recruitiq_reporting | \
  gzip > "$BACKUP_DIR/reporting_${DATE}.sql.gz"

# Backup metabase database
docker exec metabase-db pg_dump -U metabase metabase | \
  gzip > "$BACKUP_DIR/metabase_${DATE}.sql.gz"

# Delete old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Upload to S3 (optional)
aws s3 sync $BACKUP_DIR s3://recruitiq-reporting-backups/

echo "Backup completed: ${DATE}"
```

### Cron Job for Backups

```bash
# Add to crontab
crontab -e

# Run daily at 4 AM (after ETL completes)
0 4 * * * /opt/reporting-backups/backup.sh >> /var/log/reporting-backup.log 2>&1
```

---

## 10. Maintenance Tasks

### Weekly Tasks

```bash
# Reindex databases
docker exec reporting-db psql -U postgres -d recruitiq_reporting -c "SELECT reporting.reindex_all();"

# Vacuum analyze
docker exec reporting-db psql -U postgres -d recruitiq_reporting -c "VACUUM ANALYZE;"

# Check disk usage
docker exec reporting-db du -sh /var/lib/postgresql/data
```

### Monthly Tasks

```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Review audit logs
docker exec reporting-db psql -U postgres -d recruitiq_reporting -c "SELECT * FROM audit.security_alerts WHERE created_at > NOW() - INTERVAL '30 days' ORDER BY created_at DESC;"

# Check slow queries
docker exec reporting-db psql -U postgres -d recruitiq_reporting -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;"
```

---

## Summary

### Deployment Checklist

- ✅ Provision infrastructure (servers, network, storage)
- ✅ Install Docker and Docker Compose
- ✅ Configure environment variables
- ✅ Set up SSL certificates
- ✅ Deploy containers via docker-compose
- ✅ Initialize reporting database schema
- ✅ Configure Metabase connection
- ✅ Run initial ETL sync
- ✅ Create reporting users
- ✅ Set up automated backups
- ✅ Configure monitoring and alerts
- ✅ Document access URLs and credentials

### Production URLs

- **Backend API:** https://api-reporting.recruitiq.com
- **Metabase:** https://bi.recruitiq.com
- **Grafana:** https://monitoring.recruitiq.com:3002

---

**Status:** ✅ Deployment Guide Complete  
**Next:** 08-SECURITY-TESTING.md (Final Document)
