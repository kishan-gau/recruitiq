# Docker Setup Guide

This guide explains how to set up and run the RecruitIQ application using Docker for both development and production environments.

## Prerequisites

- **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **Node.js** 20+ (for development outside Docker)
- **PNPM** 8+ (for package management)

## Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd RecruitIQ
   ```

2. **Set up environment variables**
   ```bash
   cp .env.development.template .env.development
   # Edit .env.development with your settings (defaults work for development)
   ```

3. **Start development environment**
   ```bash
   npm run docker:dev
   ```

4. **Access the applications**
   - **API Backend**: http://localhost:3001
   - **Unified Web App**: http://localhost:5177
     - Recruitment Module: http://localhost:5177/recruitment
     - HRIS (Nexus): http://localhost:5177/hris
     - Payroll (PayLinQ): http://localhost:5177/payroll
     - Scheduling: http://localhost:5177/scheduling

## Development Environment

### Architecture

The development environment includes:

- **PostgreSQL 15** (port 5432) - Main database
- **Redis 7** (port 6379) - Caching and sessions
- **Backend API** (port 3001) - Node.js/Express API with hot reload
- **Deployment Service** (port 3002) - Deployment management
- **Web App** (port 5177) - Unified frontend with Vite dev server and hot reload

### Available Commands

```bash
# Start entire development stack
npm run docker:dev

# Build development images
npm run docker:dev:build

# Start services (after building)
npm run docker:dev:up

# Stop all services
npm run docker:dev:down

# View logs from all services
npm run docker:dev:logs

# View logs from specific service
docker compose logs -f backend
docker compose logs -f web

# Clean up everything (containers, networks, volumes)
npm run docker:dev:clean

# Rebuild specific service
docker compose build backend
docker compose up -d backend
```

### Development Workflow

1. **Make code changes** - Files are mounted as volumes for hot reloading
2. **Backend changes** - Automatically restarted via nodemon
3. **Frontend changes** - Hot reloaded via Vite
4. **Database changes** - Persist in Docker volumes
5. **Package changes** - Rebuild the affected service

### Environment Configuration

Create `.env.development` from the template:

```bash
cp .env.development.template .env.development
```

Key development settings:
- Database runs on `postgres-dev:5432` 
- Redis runs on `redis-dev:6379`
- CORS allows localhost origins
- Debug logging enabled
- Development-friendly JWT expiration (24h)

### Database Management

```bash
# Access PostgreSQL
docker compose exec postgres-dev psql -U recruitiq_user -d recruitiq_dev

# Access Redis
docker compose exec redis-dev redis-cli

# Reset database (will lose data!)
docker compose down -v
docker compose up -d postgres-dev

# Backup database
docker compose exec postgres-dev pg_dump -U recruitiq_user recruitiq_dev > backup.sql

# Restore database
docker compose exec -T postgres-dev psql -U recruitiq_user recruitiq_dev < backup.sql
```

### Troubleshooting Development

**Port conflicts:**
```bash
# Check what's using ports
netstat -an | findstr "3001 5177 5432 6379"

# Kill processes on Windows
taskkill /f /pid <PID>
```

**Build issues:**
```bash
# Clean rebuild
npm run docker:dev:clean
npm run docker:dev:build

# Check build context
docker compose build --no-cache backend
```

**Volume issues:**
```bash
# Remove all volumes (will lose data!)
docker compose down -v
docker volume prune
```

## Production Environment

### Architecture

The production environment uses:
- **Traefik** - Reverse proxy with automatic SSL
- **PostgreSQL 15** - Production database with backups
- **Redis 7** - Production caching with persistence  
- **Nginx** - Frontend serving with compression
- **Docker Networks** - Isolated services

### Production Deployment

1. **Prepare environment**
   ```bash
   cp .env.production.template .env.production
   # Edit .env.production with secure values
   ```

2. **Build production images**
   ```bash
   npm run docker:build:all
   ```

3. **Deploy to production**
   ```bash
   docker compose -f docker-compose.production.yml up -d
   ```

### Environment Variables

Critical production settings in `.env.production`:

```env
# REQUIRED: Change these values
DOMAIN=yourdomain.com
POSTGRES_PASSWORD=secure-database-password
REDIS_PASSWORD=secure-redis-password
JWT_SECRET=secure-jwt-secret-minimum-32-chars
ENCRYPTION_KEY=secure-encryption-key-64-hex-chars

# Email configuration
SMTP_HOST=smtp.provider.com
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=email-password

# SSL certificate email
LETSENCRYPT_EMAIL=admin@yourdomain.com
```

### SSL and Domain Setup

1. **DNS Configuration**
   Point these domains to your server:
   - `yourdomain.com` → Main site
   - `portal.yourdomain.com` → Admin portal  
   - `nexus.yourdomain.com` → HRIS
   - `paylinq.yourdomain.com` → Payroll
   - `api.yourdomain.com` → API

2. **Automatic SSL**
   Traefik automatically obtains Let's Encrypt certificates

3. **Custom SSL (optional)**
   Place certificates in `./certs/` directory

### Production Monitoring

```bash
# Check service status
docker compose -f docker-compose.production.yml ps

# View logs
docker compose -f docker-compose.production.yml logs

# Monitor resources
docker stats

# Health checks
curl https://api.yourdomain.com/health
curl https://yourdomain.com/health
```

### Production Maintenance

**Updates:**
```bash
# Pull latest images
docker compose -f docker-compose.production.yml pull

# Restart with new images
docker compose -f docker-compose.production.yml up -d
```

**Backups:**
```bash
# Database backup
docker compose -f docker-compose.production.yml exec postgres \
  pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backup-$(date +%Y%m%d).sql.gz

# Redis backup
docker compose -f docker-compose.production.yml exec redis redis-cli BGSAVE
```

## Dockerfile Architecture

### Multi-Stage Builds

All Dockerfiles use multi-stage builds:

1. **Base Stage** - Common dependencies
2. **Development Stage** - Development tools (nodemon, etc.)
3. **Builder Stage** - Production build
4. **Production Stage** - Minimal runtime

### Build Optimization

- **Layer caching** - Dependencies installed before code copy
- **Multi-stage** - Minimal production images
- **dockerignore** - Optimized build contexts
- **Health checks** - Container health monitoring

## Security Considerations

### Development
- Default passwords (change in production)
- Debug features enabled
- Relaxed CORS and rate limiting

### Production  
- Strong passwords required
- Security headers enabled
- Strict CORS origins
- Rate limiting enforced
- SSL/TLS encryption
- Non-root containers

## Performance Tips

### Development
- **Volume mounts** for fast code changes
- **Named volumes** for database persistence
- **Build cache** for faster rebuilds

### Production
- **Multi-stage builds** for smaller images
- **Resource limits** to prevent resource exhaustion
- **Health checks** for automatic recovery
- **Restart policies** for high availability

## Common Issues

### "Port already in use"
```bash
# Windows
netstat -ano | findstr :3001
taskkill /f /pid <PID>

# Linux/macOS
lsof -ti:3001 | xargs kill -9
```

### "Cannot connect to database"
```bash
# Check if database is running
docker compose ps

# Check database logs
docker compose logs postgres-dev

# Reset database
docker compose down -v postgres-dev
docker compose up -d postgres-dev
```

### "Module not found" errors
```bash
# Rebuild with clean cache
docker compose build --no-cache backend
```

### "Permission denied" (Linux)
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
```

## VS Code Development

For VS Code development with Docker:

1. **Install Extensions**
   - Docker (ms-azuretools.vscode-docker)
   - Dev Containers (ms-vscode-remote.remote-containers)

2. **Attach to Running Container**
   ```bash
   # Start services
   npm run docker:dev

   # In VS Code: Command Palette > "Remote-Containers: Attach to Running Container"
   # Select the backend container
   ```

3. **Remote Development**
   The backend container includes development tools for remote coding

## Support

For issues and questions:
1. Check this guide first
2. Review container logs: `docker compose logs <service>`
3. Check GitHub issues
4. Contact development team