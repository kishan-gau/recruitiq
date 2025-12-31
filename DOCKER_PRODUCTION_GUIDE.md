# Docker Production Deployment Guide

## Overview

This guide explains how to deploy the RecruitIQ web application in Docker for production use.

## ✅ Prerequisites

1. **Docker & Docker Compose** installed (v20.10+ and v2.0+ respectively)
2. **Built web application** - Run `pnpm build:web` first
3. **Production environment file** - Copy and configure `.env.production.template`

## 🚀 Quick Start

### 1. Build the Web Application

```bash
# Install dependencies
pnpm install

# Build the web app
pnpm build:web

# Verify dist folder was created
ls -la apps/web/dist/
```

### 2. Configure Environment

```bash
# Copy the production environment template
cp .env.production.template .env.production

# Edit the file and update all values marked with "CHANGE_ME"
nano .env.production  # or your preferred editor
```

**Required changes in `.env.production`:**
- `POSTGRES_PASSWORD` - Strong password (16+ characters)
- `REDIS_PASSWORD` - Strong password (16+ characters)
- `JWT_SECRET` - Generate with: `openssl rand -hex 32`
- `REFRESH_TOKEN_SECRET` - Generate with: `openssl rand -hex 32`
- `SESSION_SECRET` - Generate with: `openssl rand -hex 32`
- `CORS_ORIGINS` - Your production domain(s)
- `DEFAULT_CUSTOMER_EMAIL` - Admin email for initial setup

### 3. Build Docker Images

```bash
# Build all production images
docker-compose -f docker-compose.production.yml build

# Or build individually
docker build -f Dockerfile.web -t recruitiq-web:production .
docker build -f Dockerfile.backend -t recruitiq-backend:production --target production .
```

### 4. Start Services

```bash
# Start all services in production mode
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Check service status
docker-compose -f docker-compose.production.yml ps
```

### 5. Verify Deployment

```bash
# Check web app health
curl http://localhost/health

# Check backend health
curl http://localhost:3001/health

# Check database connection
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -d recruitiq_prod -c "SELECT COUNT(*) FROM organizations;"
```

## 📊 Service Architecture

The production deployment includes:

1. **PostgreSQL Database** (port 5432)
   - Persistent storage for application data
   - Automatic schema initialization on first run
   - Health checks enabled

2. **Redis Cache** (port 6379)
   - Session storage and caching
   - AOF persistence enabled
   - Password protected

3. **Backend API** (port 3001)
   - Node.js/Express application
   - Automatic database migrations on startup
   - Health check endpoint: `/health`

4. **Web Frontend** (port 80)
   - Nginx serving static built files
   - Gzip compression enabled
   - Security headers configured
   - Health check endpoint: `/health`

## 🔧 Management Commands

### View Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f web
docker-compose -f docker-compose.production.yml logs -f backend
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart web
```

### Stop Services

```bash
# Stop all services (data preserved)
docker-compose -f docker-compose.production.yml down

# Stop and remove volumes (⚠️ DATA LOSS!)
docker-compose -f docker-compose.production.yml down -v
```

### Update Application

```bash
# 1. Build new web app
pnpm build:web

# 2. Rebuild Docker image
docker-compose -f docker-compose.production.yml build web

# 3. Recreate container with new image
docker-compose -f docker-compose.production.yml up -d web
```

## 🔒 Security Considerations

1. **Environment Variables**
   - Never commit `.env.production` to version control
   - Use strong, unique passwords (16+ characters)
   - Rotate secrets regularly

2. **Database**
   - Use strong PostgreSQL password
   - Restrict network access to trusted IPs only
   - Regular backups recommended

3. **CORS**
   - Configure `CORS_ORIGINS` to only allow your production domains
   - Do not use wildcards (*) in production

4. **Secrets Management**
   - Consider using Docker secrets or external secret management
   - Rotate JWT secrets periodically

## 💾 Backup & Restore

### Database Backup

```bash
# Create backup
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U postgres recruitiq_prod | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Restore backup
gunzip < backup-20241231-120000.sql.gz | docker-compose -f docker-compose.production.yml exec -T postgres psql -U postgres recruitiq_prod
```

### Redis Backup

```bash
# Trigger backup
docker-compose -f docker-compose.production.yml exec redis redis-cli --no-auth-warning -a "$REDIS_PASSWORD" BGSAVE

# Copy backup file
docker cp recruitiq_redis_prod:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

## 🐛 Troubleshooting

### Web App Not Accessible

1. Check if container is running:
   ```bash
   docker ps | grep recruitiq_web
   ```

2. Check logs:
   ```bash
   docker logs recruitiq_web_prod
   ```

3. Verify health check:
   ```bash
   curl -v http://localhost/health
   ```

### Backend API Errors

1. Check backend logs:
   ```bash
   docker-compose -f docker-compose.production.yml logs backend
   ```

2. Verify database connection:
   ```bash
   docker-compose -f docker-compose.production.yml exec backend node -e "console.log(process.env.DATABASE_URL)"
   ```

3. Check migrations:
   ```bash
   docker-compose -f docker-compose.production.yml exec backend ls -la migrations/
   ```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   docker-compose -f docker-compose.production.yml ps postgres
   ```

2. Check database logs:
   ```bash
   docker-compose -f docker-compose.production.yml logs postgres
   ```

3. Test connection:
   ```bash
   docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -c "SELECT version();"
   ```

## 📈 Performance Tuning

### PostgreSQL

Edit `docker-compose.production.yml` to add performance settings:

```yaml
postgres:
  command:
    - postgres
    - -c listen_addresses=*
    - -c shared_buffers=256MB
    - -c effective_cache_size=1GB
    - -c maintenance_work_mem=64MB
    - -c max_connections=100
```

### Redis

Adjust memory settings in `docker-compose.production.yml`:

```yaml
redis:
  command: >
    sh -c '
    redis-server 
    --requirepass "${REDIS_PASSWORD}"
    --maxmemory 1gb
    --maxmemory-policy allkeys-lru
    '
```

### Nginx (Web)

For high traffic, consider:
- Adding nginx worker processes
- Enabling HTTP/2
- Implementing caching headers
- Using a CDN for static assets

## 🌐 Domain & SSL Setup

For production with a custom domain:

1. Point your domain DNS to the server IP
2. Use a reverse proxy like Traefik or nginx for SSL termination
3. Configure Let's Encrypt for automatic SSL certificates

Example with Traefik (add to `docker-compose.production.yml`):

```yaml
web:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.web.rule=Host(`yourdomain.com`)"
    - "traefik.http.routers.web.entrypoints=websecure"
    - "traefik.http.routers.web.tls.certresolver=letsencrypt"
```

## 📝 Production Checklist

Before going live:

- [ ] Updated all secrets in `.env.production`
- [ ] Configured CORS_ORIGINS with production domain
- [ ] Set up database backups
- [ ] Configured monitoring and alerts
- [ ] Tested application thoroughly
- [ ] Documented runbooks for common issues
- [ ] Set up log aggregation
- [ ] Configured firewall rules
- [ ] SSL/TLS certificates configured
- [ ] Health checks responding correctly

## 🆘 Support

For issues or questions:
1. Check the [DOCKER_STATUS.md](./DOCKER_STATUS.md) file for known issues
2. Review logs using commands above
3. Check GitHub issues for similar problems
4. Contact the development team

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Docker Documentation](https://hub.docker.com/_/postgres)
- [Nginx Docker Documentation](https://hub.docker.com/_/nginx)
- [Redis Docker Documentation](https://hub.docker.com/_/redis)
