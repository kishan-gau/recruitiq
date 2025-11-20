# Quick Deployment Reference

## Prerequisites Check
```bash
✅ VPS setup complete
✅ GitHub secrets configured
✅ DNS records created
✅ SSH access working
```

## One-Click Deployment

### GitHub UI Method (Recommended)
1. Go to: **GitHub → Actions → Deploy to TransIP VPS**
2. Click: **Run workflow**
3. Select:
   - Environment: `production` or `staging`
   - Apps: `all` or specific apps
4. Click: **Run workflow** button

### Command Line Method
```bash
# Using GitHub CLI
gh workflow run deploy-vps.yml \
  -f environment=production \
  -f apps=all
```

## Quick Commands

### Deploy Everything
```bash
# GitHub Actions
Actions → Deploy to TransIP VPS → Run workflow → Select "all"

# Manual
./scripts/deploy.sh production all
```

### Deploy Single App
```bash
# GitHub Actions
Actions → Deploy to TransIP VPS → Run workflow → Enter "backend"

# Manual
./scripts/deploy.sh production backend
```

### Deploy Multiple Apps
```bash
# GitHub Actions
Actions → Deploy to TransIP VPS → Run workflow → Enter "backend,nexus,paylinq"
```

## Health Check
```bash
# Quick check
curl https://api.your-domain.com/health

# Full check
./scripts/health-check.sh your-domain.com

# Check service status
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose ps"
```

## View Logs
```bash
# All services
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose logs -f"

# Specific service
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose logs -f backend"

# Last 100 lines
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose logs --tail=100"
```

## Restart Services
```bash
# All services
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose restart"

# Specific service
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose restart backend"

# Full restart (down + up)
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose down && docker-compose up -d"
```

## Rollback
```bash
# Via GitHub Actions
Actions → Rollback Deployment → Run workflow → Enter commit SHA (optional)

# Manual
ssh deployuser@your-vps
cd /opt/recruitiq
docker-compose down
# Pull previous images
docker-compose up -d
```

## Backup & Restore

### Create Backup
```bash
ssh deployuser@your-vps "/opt/recruitiq/backup.sh"
```

### List Backups
```bash
ssh deployuser@your-vps "ls -lh /opt/recruitiq/backups/"
```

### Restore Database
```bash
ssh deployuser@your-vps
cd /opt/recruitiq
gunzip < backups/db_YYYYMMDD_HHMMSS.sql.gz | \
  docker-compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB
```

## Common Issues

### Services Not Starting
```bash
# Check logs
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose logs"

# Check resources
ssh deployuser@your-vps "docker stats"

# Restart
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose restart"
```

### SSL Certificate Issues
```bash
# Check Traefik logs
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose logs traefik"

# Verify DNS
dig +short your-domain.com

# Wait (certificates can take a few minutes)
```

### Database Connection Issues
```bash
# Check Postgres logs
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose logs postgres"

# Test connection
ssh deployuser@your-vps "cd /opt/recruitiq && \
  docker-compose exec postgres psql -U \$POSTGRES_USER -d \$POSTGRES_DB -c 'SELECT 1;'"
```

### Out of Disk Space
```bash
# Check space
ssh deployuser@your-vps "df -h"

# Clean Docker
ssh deployuser@your-vps "docker system prune -a -f"

# Clean old backups
ssh deployuser@your-vps "find /opt/recruitiq/backups -mtime +7 -delete"
```

## Monitoring

### Check Service Status
```bash
ssh deployuser@your-vps "cd /opt/recruitiq && docker-compose ps"
```

### Check Resource Usage
```bash
ssh deployuser@your-vps "docker stats --no-stream"
```

### Check Disk Space
```bash
ssh deployuser@your-vps "df -h /"
```

### Check Logs Size
```bash
ssh deployuser@your-vps "du -sh /opt/recruitiq/logs"
```

## URLs

- **RecruitIQ**: https://your-domain.com
- **Nexus HRIS**: https://nexus.your-domain.com
- **PayLinQ**: https://paylinq.your-domain.com
- **Portal**: https://portal.your-domain.com
- **API**: https://api.your-domain.com
- **Traefik Dashboard**: https://traefik.your-domain.com

## GitHub Secrets Required

```
VPS_HOST                  # VPS IP or hostname
VPS_USER                  # Deployment user (deployuser)
VPS_SSH_PRIVATE_KEY      # SSH private key
DOMAIN                    # your-domain.com
POSTGRES_USER            
POSTGRES_PASSWORD        
POSTGRES_DB              
REDIS_PASSWORD           
JWT_SECRET               # 32+ characters
JWT_REFRESH_SECRET       # 32+ characters
COOKIE_SECRET            # 32+ characters
SESSION_SECRET           # 32+ characters
ENCRYPTION_KEY           # 64 hex characters
CORS_ORIGINS             # Comma-separated URLs
LETSENCRYPT_EMAIL        # admin@your-domain.com
TRAEFIK_AUTH             # htpasswd hash
```

## Emergency Contacts

- **TransIP Support**: support@transip.nl
- **On-Call Engineer**: [Your contact]

---

**For detailed information**, see:
- Full setup: `DEPLOYMENT_SETUP_GUIDE.md`
- Pre-flight checks: `DEPLOYMENT_CHECKLIST.md`
