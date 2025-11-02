# 🚀 RecruitIQ Docker & VPS Deployment Guide

**Complete guide for dockerizing and deploying RecruitIQ to production VPS**

**Version**: 1.0  
**Date**: November 1, 2025  
**Status**: Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Part 1: Dockerization](#part-1-dockerization)
5. [Part 2: Production Configuration](#part-2-production-configuration)
6. [Part 3: VPS Deployment](#part-3-vps-deployment)
7. [Part 4: Post-Deployment](#part-4-post-deployment)
8. [Part 5: Maintenance & Operations](#part-5-maintenance--operations)
9. [Troubleshooting](#troubleshooting)
10. [Security Checklist](#security-checklist)

---

## 🎯 Overview

RecruitIQ is a multi-component SaaS application that requires:

### Application Components
- **Backend API** (Node.js/Express) - Port 4000
- **Portal Frontend** (React/Vite) - Admin portal
- **RecruitIQ Frontend** (React/Vite) - Main ATS application
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **Nginx** - Reverse proxy and SSL termination

### Deployment Models

#### Single Server (Recommended for Start)
- **Users**: 1-200
- **Cost**: $40-80/month
- **Setup**: All services on one VPS
- **Complexity**: Low

#### Multi-Server (For Scale)
- **Users**: 200-500+
- **Cost**: $300-600/month
- **Setup**: Separate servers for app, database, cache
- **Complexity**: Medium-High

---

## 🏗️ Architecture

### Development Architecture
```
┌─────────────────────────────────────────┐
│         Local Development               │
│                                         │
│  ┌──────────┐  ┌──────────┐           │
│  │ Portal   │  │RecruitIQ │           │
│  │ :5173    │  │ :5174    │           │
│  └──────────┘  └──────────┘           │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Backend API :4000              │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌───────────┐  ┌──────────┐          │
│  │PostgreSQL │  │  Redis   │          │
│  │  :5432    │  │  :6379   │          │
│  └───────────┘  └──────────┘          │
└─────────────────────────────────────────┘
```

### Production Architecture (Single Server)
```
┌─────────────────────────────────────────────────────┐
│              VPS (4 vCPU, 8 GB RAM)                 │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │   Nginx :80/:443 (Reverse Proxy + SSL)       │ │
│  │   ├─ / → RecruitIQ Frontend                  │ │
│  │   ├─ /portal → Portal Frontend               │ │
│  │   └─ /api → Backend API                      │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────┐  ┌───────────────┐            │
│  │   Portal      │  │  RecruitIQ    │            │
│  │  (Nginx:80)   │  │  (Nginx:80)   │            │
│  │  Container    │  │  Container    │            │
│  └───────────────┘  └───────────────┘            │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │   Backend API :4000 (Node.js Container)      │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────┐  ┌───────────────┐            │
│  │ PostgreSQL    │  │    Redis      │            │
│  │   :5432       │  │    :6379      │            │
│  │  Container    │  │  Container    │            │
│  └───────────────┘  └───────────────┘            │
│                                                     │
│  Persistent Volumes:                                │
│  ├─ postgres_data (Database)                       │
│  ├─ redis_data (Cache)                             │
│  └─ uploads (File storage)                         │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Prerequisites

### Required Tools (Development)
- [x] Node.js >= 18.0.0
- [x] npm >= 9.0.0
- [x] Docker Desktop >= 20.10
- [x] Git
- [x] Text editor (VS Code recommended)

### Required Accounts
- [x] Domain registrar account (for DNS)
- [x] VPS provider account (Hetzner, DigitalOcean, Vultr, etc.)
- [x] SMTP provider (for emails)
- [x] AWS S3 (optional, for file uploads)
- [x] Stripe account (optional, for billing)

### Knowledge Requirements
- Basic Docker concepts
- Linux command line basics
- SSH and server administration
- DNS configuration
- Basic networking

---

## 📦 Part 1: Dockerization

### 1.1 Backend API Dockerfile

**File**: `backend/Dockerfile`

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:18-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================
# Stage 2: Build (if needed for TypeScript)
# ============================================
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# If you have a build step, uncomment:
# RUN npm run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user (non-root for security)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from dependencies stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
```

**Create file**: `backend/.dockerignore`

```
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.*
!.env.example

# Testing
tests/
coverage/
*.test.js
*.spec.js

# Documentation
*.md
!README.md
docs/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Git
.git/
.gitignore
.gitattributes

# Logs
logs/
*.log

# Build artifacts
dist/
build/

# OS
.DS_Store
Thumbs.db

# Misc
.editorconfig
.eslintrc*
.prettierrc*
```

---

### 1.2 Portal Frontend Dockerfile

**File**: `portal/Dockerfile`

```dockerfile
# ============================================
# Stage 1: Build
# ============================================
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# ============================================
# Stage 2: Production (Nginx)
# ============================================
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S nginx-app -u 1001 && \
    chown -R nginx-app:nginx-app /usr/share/nginx/html && \
    chown -R nginx-app:nginx-app /var/cache/nginx && \
    chown -R nginx-app:nginx-app /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-app:nginx-app /var/run/nginx.pid

# Switch to non-root user
USER nginx-app

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

**Create file**: `portal/nginx.conf`

```nginx
user nginx-app;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;

    include /etc/nginx/conf.d/*.conf;
}
```

**Create file**: `portal/default.conf`

```nginx
server {
    listen 8080;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SPA routing - fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No cache for index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires 0;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
```

**Create file**: `portal/.dockerignore`

```
node_modules/
dist/
.env
.env.*
*.md
tests/
e2e/
.git/
.vscode/
.idea/
coverage/
.DS_Store
Thumbs.db
npm-debug.log*
```

---

### 1.3 RecruitIQ Frontend Dockerfile

**File**: `recruitiq/Dockerfile`

```dockerfile
# Same as portal/Dockerfile - just adjust paths
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production

RUN apk add --no-cache curl

COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN addgroup -g 1001 -S nginx-app && \
    adduser -S nginx-app -u 1001 && \
    chown -R nginx-app:nginx-app /usr/share/nginx/html && \
    chown -R nginx-app:nginx-app /var/cache/nginx && \
    chown -R nginx-app:nginx-app /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-app:nginx-app /var/run/nginx.pid

USER nginx-app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**Copy the same nginx configuration files from portal to recruitiq**

---

### 1.4 Production Docker Compose

**File**: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: recruitiq_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DATABASE_USER:-recruitiq}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
      POSTGRES_DB: ${DATABASE_NAME:-recruitiq_production}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/database/migrations/001_initial_schema.sql:/docker-entrypoint-initdb.d/001_initial_schema.sql:ro
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USER:-recruitiq}"]
      interval: 10s
      timeout: 5s
      retries: 5
    # Security: Don't expose port to host in production
    # ports:
    #   - "5432:5432"

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: recruitiq_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    # Security: Don't expose port to host in production
    # ports:
    #   - "6379:6379"

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: recruitiq_backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: ${DATABASE_NAME:-recruitiq_production}
      DATABASE_USER: ${DATABASE_USER:-recruitiq}
      DATABASE_PASSWORD: ${DATABASE_PASSWORD}
      DATABASE_SSL: "false"
      DATABASE_POOL_MIN: ${DATABASE_POOL_MIN:-5}
      DATABASE_POOL_MAX: ${DATABASE_POOL_MAX:-20}
      REDIS_ENABLED: "true"
      REDIS_URL: redis://redis:6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-7d}
      JWT_REFRESH_EXPIRES_IN: ${JWT_REFRESH_EXPIRES_IN:-30d}
      SESSION_SECRET: ${SESSION_SECRET}
      ENCRYPTION_MASTER_KEY: ${ENCRYPTION_MASTER_KEY}
      FRONTEND_URL: ${FRONTEND_URL:-https://yourdomain.com}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      EMAIL_FROM: ${EMAIL_FROM}
      EMAIL_FROM_NAME: ${EMAIL_FROM_NAME:-RecruitIQ}
      AWS_REGION: ${AWS_REGION}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      AWS_S3_BUCKET: ${AWS_S3_BUCKET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      REQUIRE_HTTPS: "true"
      TRUST_PROXY: "true"
      BCRYPT_ROUNDS: ${BCRYPT_ROUNDS:-12}
      RATE_LIMIT_WINDOW_MS: ${RATE_LIMIT_WINDOW_MS:-900000}
      RATE_LIMIT_MAX_REQUESTS: ${RATE_LIMIT_MAX_REQUESTS:-100}
      ENABLE_WEBSOCKETS: ${ENABLE_WEBSOCKETS:-true}
      ENABLE_FILE_UPLOADS: ${ENABLE_FILE_UPLOADS:-true}
      ENABLE_EMAIL_NOTIFICATIONS: ${ENABLE_EMAIL_NOTIFICATIONS:-true}
      ENABLE_AUDIT_LOGS: ${ENABLE_AUDIT_LOGS:-true}
      SECURITY_MONITORING_ENABLED: "true"
      LICENSE_API_URL: ${LICENSE_API_URL}
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    networks:
      - backend
      - frontend
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Portal Frontend
  portal:
    build:
      context: ./portal
      dockerfile: Dockerfile
    container_name: recruitiq_portal
    restart: unless-stopped
    networks:
      - frontend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  # RecruitIQ Frontend
  recruitiq:
    build:
      context: ./recruitiq
      dockerfile: Dockerfile
    container_name: recruitiq_frontend
    restart: unless-stopped
    networks:
      - frontend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: recruitiq_nginx
    restart: unless-stopped
    depends_on:
      - backend
      - portal
      - recruitiq
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    networks:
      - frontend
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  uploads:
    driver: local
  logs:
    driver: local
```

---

## ⚙️ Part 2: Production Configuration

### 2.1 Nginx Reverse Proxy Configuration

**File**: `nginx/nginx.conf`

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1000;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Security headers (base)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

    # Include virtual host configs
    include /etc/nginx/conf.d/*.conf;
}
```

**File**: `nginx/conf.d/default.conf`

```nginx
# Upstream backend API
upstream backend_api {
    server backend:4000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Upstream portal
upstream portal_app {
    server portal:8080 max_fails=3 fail_timeout=30s;
}

# Upstream recruitiq
upstream recruitiq_app {
    server recruitiq:8080 max_fails=3 fail_timeout=30s;
}

# HTTP redirect to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern TLS configuration
    ssl_protocols TLSv1.3;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Backend API
    location /api/ {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://backend_api;
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

    # Auth endpoints (stricter rate limiting)
    location ~ ^/api/(auth|login|register) {
        limit_req zone=auth_limit burst=5 nodelay;

        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Portal Admin
    location /portal/ {
        proxy_pass http://portal_app/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # RecruitIQ App (default)
    location / {
        proxy_pass http://recruitiq_app/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
```

---

### 2.2 Environment Variables Template

**File**: `.env.production.example`

```bash
# ============================================
# RecruitIQ Production Environment Variables
# ============================================
# Copy this file to .env.production and fill in your values
# NEVER commit .env.production to git!

# ============================================
# APPLICATION
# ============================================
NODE_ENV=production
PORT=4000
APP_NAME=RecruitIQ
APP_URL=https://yourdomain.com

# ============================================
# DATABASE (PostgreSQL)
# ============================================
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=recruitiq_production
DATABASE_USER=recruitiq
DATABASE_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
DATABASE_SSL=false
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# ============================================
# REDIS
# ============================================
REDIS_ENABLED=true
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD
REDIS_DB=0

# ============================================
# JWT & AUTHENTICATION
# ============================================
# Generate with: openssl rand -base64 48
JWT_SECRET=CHANGE_ME_64_CHAR_SECRET_HERE
JWT_REFRESH_SECRET=CHANGE_ME_DIFFERENT_64_CHAR_SECRET_HERE
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ============================================
# SESSION & ENCRYPTION
# ============================================
# Generate with: openssl rand -base64 48
SESSION_SECRET=CHANGE_ME_SESSION_SECRET_HERE

# Generate with: openssl rand -hex 32
ENCRYPTION_MASTER_KEY=CHANGE_ME_32_BYTE_HEX_KEY_HERE

# ============================================
# FRONTEND
# ============================================
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# ============================================
# EMAIL (SMTP)
# ============================================
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=CHANGE_ME_SMTP_PASSWORD
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=RecruitIQ

# ============================================
# AWS S3 (File Uploads)
# ============================================
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY
AWS_S3_BUCKET=recruitiq-uploads

# ============================================
# STRIPE (Payments)
# ============================================
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY

# ============================================
# SECURITY
# ============================================
REQUIRE_HTTPS=true
TRUST_PROXY=true
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# FEATURES
# ============================================
ENABLE_WEBSOCKETS=true
ENABLE_FILE_UPLOADS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_AUDIT_LOGS=true

# ============================================
# MONITORING & LOGGING
# ============================================
LOG_LEVEL=info
SECURITY_MONITORING_ENABLED=true
ALERT_CHANNELS=log,webhook
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# ============================================
# LICENSE MANAGER (Optional)
# ============================================
LICENSE_API_URL=https://license.yourdomain.com

# ============================================
# DEPLOYMENT INFO
# ============================================
DEPLOYMENT_TYPE=onpremise
INSTANCE_ID=prod-001
```

---

## 🚀 Part 3: VPS Deployment

### 3.1 VPS Requirements

**Minimum Specifications**:
- **OS**: Ubuntu 22.04 LTS (recommended)
- **CPU**: 4 vCPU
- **RAM**: 8 GB
- **Storage**: 80 GB SSD
- **Bandwidth**: 2 TB/month
- **Cost**: $40-80/month

**Recommended Providers**:
1. **Hetzner Cloud** - Best value (~$11/month for CPX21)
2. **DigitalOcean** - Developer friendly ($48/month)
3. **Vultr** - Good balance ($36/month)
4. **Linode** - Reliable ($48/month)

---

### 3.2 Initial Server Setup

#### Step 1: Create VPS and Access

```bash
# SSH into your new VPS
ssh root@YOUR_VPS_IP

# Update system packages
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone UTC

# Set hostname
hostnamectl set-hostname recruitiq-prod
```

#### Step 2: Create Application User

```bash
# Create user
adduser recruitiq

# Add to sudo group
usermod -aG sudo recruitiq

# Setup SSH for new user
mkdir -p /home/recruitiq/.ssh
cp /root/.ssh/authorized_keys /home/recruitiq/.ssh/
chown -R recruitiq:recruitiq /home/recruitiq/.ssh
chmod 700 /home/recruitiq/.ssh
chmod 600 /home/recruitiq/.ssh/authorized_keys
```

#### Step 3: Configure Firewall

```bash
# Install and configure UFW
apt install ufw -y

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status verbose
```

#### Step 4: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add user to docker group
usermod -aG docker recruitiq

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### Step 5: Install Additional Tools

```bash
# Install useful tools
apt install -y git curl wget vim htop

# Install Certbot for SSL
apt install -y certbot
```

---

### 3.3 Deploy Application

#### Step 1: Clone Repository

```bash
# Switch to application user
su - recruitiq

# Create directory structure
mkdir -p /home/recruitiq/apps
cd /home/recruitiq/apps

# Clone repository
git clone https://github.com/YOUR_USERNAME/recruitiq.git
cd recruitiq

# Checkout production branch
git checkout main  # or production branch
```

#### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.production.example .env.production

# Edit environment variables
nano .env.production

# Generate secrets
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48)"
echo "SESSION_SECRET=$(openssl rand -base64 48)"
echo "ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)"

# Set proper permissions
chmod 600 .env.production
```

#### Step 3: Update Nginx Configuration

```bash
# Update domain in nginx config
nano nginx/conf.d/default.conf

# Replace 'yourdomain.com' with your actual domain
```

#### Step 4: Build Docker Images

```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# This may take 5-10 minutes
```

#### Step 5: Initialize Database

```bash
# Start only PostgreSQL
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for PostgreSQL to be ready (check logs)
docker-compose -f docker-compose.prod.yml logs -f postgres

# Once ready (Ctrl+C to exit logs), run migrations
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate

# Seed initial data (admin user, permissions)
docker-compose -f docker-compose.prod.yml run --rm backend npm run seed
```

#### Step 6: Obtain SSL Certificate

```bash
# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be saved to: /etc/letsencrypt/live/yourdomain.com/

# Start nginx
docker-compose -f docker-compose.prod.yml start nginx
```

#### Step 7: Start All Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check individual service
docker-compose -f docker-compose.prod.yml logs backend
```

#### Step 8: Verify Deployment

```bash
# Test health endpoint
curl http://localhost/health

# Test API
curl http://localhost/api/health

# Test frontend (should redirect to HTTPS)
curl -I http://yourdomain.com

# Test HTTPS
curl -I https://yourdomain.com
```

---

### 3.4 DNS Configuration

**Add these DNS records at your domain registrar**:

```
Type    Name    Value               TTL
A       @       YOUR_VPS_IP         3600
A       www     YOUR_VPS_IP         3600
CNAME   api     yourdomain.com      3600
```

**Wait for DNS propagation** (can take up to 48 hours, usually much faster).

---

## 🔧 Part 4: Post-Deployment

### 4.1 Setup Automatic Backups

**Create backup script**: `scripts/backup.sh`

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/home/recruitiq/backups"
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_FILE="/home/recruitiq/apps/recruitiq/docker-compose.prod.yml"
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
  -U recruitiq recruitiq_production | \
  gzip > "$BACKUP_DIR/postgres_$DATE.sql.gz"

# Backup uploads volume
echo "Backing up uploads..."
docker run --rm \
  -v recruitiq_uploads:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/uploads_$DATE.tar.gz -C /data .

# Backup environment file
echo "Backing up environment..."
cp /home/recruitiq/apps/recruitiq/.env.production \
   "$BACKUP_DIR/env_$DATE.backup"

# Remove old backups
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.backup" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

**Make executable and add to cron**:

```bash
chmod +x /home/recruitiq/scripts/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/recruitiq/scripts/backup.sh >> /home/recruitiq/logs/backup.log 2>&1
```

---

### 4.2 Setup Log Rotation

**Create log rotation config**: `/etc/logrotate.d/recruitiq`

```
/home/recruitiq/apps/recruitiq/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 recruitiq recruitiq
    sharedscripts
    postrotate
        docker-compose -f /home/recruitiq/apps/recruitiq/docker-compose.prod.yml restart backend
    endscript
}
```

---

### 4.3 Setup SSL Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab (check daily)
sudo crontab -e

# Add this line:
0 3 * * * certbot renew --quiet --deploy-hook "docker-compose -f /home/recruitiq/apps/recruitiq/docker-compose.prod.yml restart nginx"
```

---

### 4.4 Setup Monitoring

**Install monitoring tools**:

```bash
# Install htop for resource monitoring
sudo apt install htop

# Install netdata (optional, comprehensive monitoring)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Access netdata at http://YOUR_VPS_IP:19999
```

**Setup uptime monitoring** (external):
- Sign up for [UptimeRobot](https://uptimerobot.com) (free)
- Add monitor for `https://yourdomain.com/health`
- Configure email alerts

---

## 🔄 Part 5: Maintenance & Operations

### 5.1 Update Application

```bash
# SSH into server
ssh recruitiq@YOUR_VPS_IP

# Navigate to app directory
cd /home/recruitiq/apps/recruitiq

# Backup database first
/home/recruitiq/scripts/backup.sh

# Pull latest code
git pull origin main

# Rebuild images
docker-compose -f docker-compose.prod.yml build

# Run migrations (if any)
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate

# Rolling restart (zero downtime)
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend
sleep 10
docker-compose -f docker-compose.prod.yml up -d --no-deps --build portal
docker-compose -f docker-compose.prod.yml up -d --no-deps --build recruitiq

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

---

### 5.2 Rollback Procedure

```bash
# If update fails, rollback

# 1. Switch to previous version
git log --oneline  # Find previous commit
git checkout PREVIOUS_COMMIT_HASH

# 2. Rebuild images
docker-compose -f docker-compose.prod.yml build

# 3. Restore database (if needed)
gunzip < /home/recruitiq/backups/postgres_20251101_020000.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U recruitiq recruitiq_production

# 4. Restart services
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify
curl https://yourdomain.com/api/health
```

---

### 5.3 Monitoring Commands

```bash
# View all container status
docker-compose -f docker-compose.prod.yml ps

# View resource usage
docker stats

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f nginx

# Check disk usage
df -h

# Check memory usage
free -h

# Check system load
htop

# View recent errors in logs
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR

# Check database connections
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U recruitiq -d recruitiq_production \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

---

### 5.4 Database Operations

```bash
# Access PostgreSQL CLI
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U recruitiq recruitiq_production

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U recruitiq recruitiq_production > backup.sql

# Restore database
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U recruitiq recruitiq_production

# Vacuum database (optimize)
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U recruitiq -d recruitiq_production -c "VACUUM ANALYZE;"

# Check database size
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U recruitiq -d recruitiq_production \
  -c "SELECT pg_size_pretty(pg_database_size('recruitiq_production'));"
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Backend Not Starting

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Port already in use

# Verify environment
docker-compose -f docker-compose.prod.yml run --rm backend env | grep DATABASE

# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U recruitiq -d recruitiq_production -c "SELECT 1;"
```

#### 2. Cannot Connect to Application

```bash
# Check if services are running
docker-compose -f docker-compose.prod.yml ps

# Check nginx logs
docker-compose -f docker-compose.prod.yml logs nginx

# Check firewall
sudo ufw status

# Test locally
curl http://localhost/health

# Check DNS
dig yourdomain.com
```

#### 3. SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

#### 4. Out of Memory

```bash
# Check memory usage
free -h
docker stats

# Restart services to free memory
docker-compose -f docker-compose.prod.yml restart

# Check for memory leaks in logs
docker-compose -f docker-compose.prod.yml logs backend | grep "memory"
```

#### 5. Database Connection Pool Exhausted

```bash
# Check active connections
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U recruitiq -d recruitiq_production \
  -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Increase pool size in .env.production
DATABASE_POOL_MAX=30

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

---

## 🔒 Security Checklist

### Pre-Deployment Security

- [ ] Strong passwords generated for all services
- [ ] JWT secrets are at least 64 characters
- [ ] Encryption keys properly generated
- [ ] Environment file permissions set to 600
- [ ] No secrets committed to git
- [ ] `.env.production` in `.gitignore`

### Server Security

- [ ] SSH key authentication enabled
- [ ] Password authentication disabled
- [ ] Root login disabled
- [ ] Firewall (UFW) enabled
- [ ] Only ports 22, 80, 443 open
- [ ] Fail2ban installed and configured
- [ ] Automatic security updates enabled

### Application Security

- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] SSL/TLS certificate valid and auto-renewing
- [ ] TLS 1.3 only
- [ ] HSTS header enabled
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation active (Joi)
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (Helmet middleware)

### Database Security

- [ ] Database not exposed to public internet
- [ ] Strong database password
- [ ] Database user has minimal permissions
- [ ] SSL/TLS for database connections (if remote)
- [ ] Regular backups configured
- [ ] Backup restoration tested

### Container Security

- [ ] Containers run as non-root users
- [ ] Read-only file systems where possible
- [ ] Resource limits set (CPU, memory)
- [ ] Network isolation (separate networks)
- [ ] No unnecessary ports exposed

### Monitoring & Auditing

- [ ] Health check endpoints configured
- [ ] External uptime monitoring active
- [ ] Log aggregation configured
- [ ] Security alerts configured
- [ ] Audit logs enabled
- [ ] Regular security scans scheduled

---

## 📚 Additional Resources

### Documentation
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

### Tools
- [Docker Hub](https://hub.docker.com/)
- [GitHub Container Registry](https://ghcr.io)
- [UptimeRobot](https://uptimerobot.com)
- [Netdata](https://www.netdata.cloud/)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)

---

## 📞 Support

For issues or questions:
- Review logs: `docker-compose -f docker-compose.prod.yml logs`
- Check health: `curl https://yourdomain.com/api/health`
- Review this documentation
- Check the troubleshooting section

---

**Document Version**: 1.0  
**Last Updated**: November 1, 2025  
**Maintained By**: RecruitIQ Development Team

**Next Steps**:
1. ✅ Review this guide completely
2. ✅ Set up staging environment first
3. ✅ Test deployment workflow
4. ✅ Run security audit
5. ✅ Deploy to production
6. ✅ Configure monitoring
7. ✅ Test backup/restore procedures

---

**Good luck with your deployment! 🚀**
