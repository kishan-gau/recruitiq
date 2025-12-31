# RecruitIQ Docker Deployment - README

## Overview

This document provides a quick reference for deploying the RecruitIQ web application using Docker in production.

## Status: ✅ Production Ready

The web application has been successfully configured for Docker deployment and is ready for production use.

## Quick Links

- **[Production Deployment Guide](./DOCKER_PRODUCTION_GUIDE.md)** - Complete deployment instructions
- **[Completion Summary](./DOCKER_COMPLETION_SUMMARY.md)** - What was accomplished
- **[Docker Setup](./DOCKER_SETUP.md)** - General Docker information
- **[Docker Status](./DOCKER_STATUS.md)** - Current configuration status

## Quick Start (3 Steps)

### 1. Build the Web App

```bash
pnpm install
pnpm build:web
```

### 2. Configure Environment

```bash
cp .env.production.template .env.production
# Edit .env.production with your production values
```

**Required settings:**
- Database passwords
- JWT secrets (generate with `openssl rand -hex 32`)
- CORS origins (your domain)
- Admin email

### 3. Deploy with Docker

```bash
# Deploy all services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## Verify Deployment

```bash
# Run automated checks
bash scripts/verify-docker-production.sh

# Manual health checks
curl http://localhost/health          # Web app (should return "healthy")
curl http://localhost:3001/health     # Backend API (should return JSON)
```

## Production Stack

The deployment includes 4 services:

| Service | Port | Description |
|---------|------|-------------|
| **Web** | 80 | Nginx serving React app |
| **Backend** | 3001 | Node.js/Express API |
| **PostgreSQL** | 5432 | Primary database |
| **Redis** | 6379 | Cache & sessions |

All services include:
- ✅ Health checks
- ✅ Auto-restart
- ✅ Persistent volumes
- ✅ Security configuration

## Common Commands

```bash
# Start services
docker-compose -f docker-compose.production.yml up -d

# Stop services (data preserved)
docker-compose -f docker-compose.production.yml down

# View logs
docker-compose -f docker-compose.production.yml logs -f [service]

# Restart a service
docker-compose -f docker-compose.production.yml restart [service]

# Check health
docker-compose -f docker-compose.production.yml ps
```

## Update Application

```bash
# 1. Pull latest code
git pull

# 2. Rebuild web app
pnpm build:web

# 3. Rebuild and redeploy
docker-compose -f docker-compose.production.yml build web
docker-compose -f docker-compose.production.yml up -d web
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.production.yml logs [service]

# Check environment
docker-compose -f docker-compose.production.yml config
```

### Can't Connect to Database

```bash
# Verify database is running
docker-compose -f docker-compose.production.yml ps postgres

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres

# Test connection
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -c "SELECT 1"
```

### Web App Not Loading

```bash
# Check if container is running
docker ps | grep web

# Check nginx logs
docker logs recruitiq_web_prod

# Verify build artifacts
docker-compose -f docker-compose.production.yml exec web ls -la /usr/share/nginx/html/
```

## Backup & Restore

### Database Backup

```bash
# Create backup
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U postgres recruitiq_prod | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Restore Database

```bash
# Restore from backup
gunzip < backup-20241231.sql.gz | \
  docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres recruitiq_prod
```

## Security Checklist

Before deploying to production:

- [ ] Changed all default passwords in `.env.production`
- [ ] Generated strong JWT secrets (`openssl rand -hex 32`)
- [ ] Configured CORS to allow only your domain(s)
- [ ] Set up SSL/TLS certificates
- [ ] Configured firewall rules
- [ ] Enabled database backups
- [ ] Set up monitoring and alerts
- [ ] Tested disaster recovery procedures

## Support

For detailed information, see:
- **Production Guide:** [DOCKER_PRODUCTION_GUIDE.md](./DOCKER_PRODUCTION_GUIDE.md)
- **GitHub Issues:** Report problems on GitHub
- **Development Team:** Contact for urgent issues

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│         Production Docker Stack             │
│                                             │
│  ┌──────────────┐      ┌─────────────────┐│
│  │   Nginx      │      │   Node.js API   ││
│  │   Web App    │─────▶│   Backend       ││
│  │   Port 80    │      │   Port 3001     ││
│  └──────────────┘      └─────────────────┘│
│                              │             │
│                  ┌───────────┴──────────┐  │
│                  │                      │  │
│           ┌──────▼──────┐      ┌────▼─────┐│
│           │  PostgreSQL │      │  Redis   ││
│           │  Port 5432  │      │ Port 6379││
│           └─────────────┘      └──────────┘│
│                                             │
│  All services: Health checks + Auto-restart│
└─────────────────────────────────────────────┘
```

## What's Included

- ✅ Production-ready Docker configuration
- ✅ Automated deployment scripts
- ✅ Health checks for all services
- ✅ Persistent data storage
- ✅ Security best practices
- ✅ Comprehensive documentation
- ✅ Verification tools

## Next Steps

1. **Read the Guide:** [DOCKER_PRODUCTION_GUIDE.md](./DOCKER_PRODUCTION_GUIDE.md)
2. **Verify Setup:** Run `bash scripts/verify-docker-production.sh`
3. **Configure Environment:** Copy and edit `.env.production`
4. **Deploy:** Follow the quick start above
5. **Monitor:** Set up logging and monitoring

---

**Ready to deploy? The web app is production-ready! 🚀**

For questions or issues, refer to the [Production Guide](./DOCKER_PRODUCTION_GUIDE.md) or contact the development team.
