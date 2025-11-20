# One-Click Deployment Setup Guide

This guide will help you set up one-click deployment to your TransIP VPS.

## Prerequisites

- TransIP VPS with Ubuntu 20.04+ or Debian 11+
- Root access to the VPS
- Domain name configured in TransIP DNS
- GitHub repository access
- Docker Hub or GitHub Container Registry account (optional)

## Step 1: Prepare Your VPS

### 1.1 Initial VPS Setup

SSH into your VPS as root:
```bash
ssh root@your-vps-ip
```

### 1.2 Run Setup Script

Upload and run the VPS setup script:
```bash
# Copy setup script to VPS
scp scripts/setup-vps.sh root@your-vps-ip:/root/

# SSH into VPS and run setup
ssh root@your-vps-ip
chmod +x /root/setup-vps.sh
./setup-vps.sh
```

This script will:
- Install Docker and Docker Compose
- Create deployment user
- Configure firewall
- Setup monitoring and backups
- Configure automatic security updates

### 1.3 Add Deployment SSH Key

Generate SSH key on your local machine (if you don't have one):
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy"
```

Add the public key to the VPS:
```bash
cat ~/.ssh/id_ed25519.pub | ssh deployuser@your-vps-ip 'cat >> ~/.ssh/authorized_keys'
```

## Step 2: Configure DNS

Add the following DNS records in TransIP DNS panel:

| Type  | Name       | Value            | TTL  |
|-------|------------|------------------|------|
| A     | @          | YOUR_VPS_IP      | 300  |
| A     | www        | YOUR_VPS_IP      | 300  |
| A     | nexus      | YOUR_VPS_IP      | 300  |
| A     | paylinq    | YOUR_VPS_IP      | 300  |
| A     | portal     | YOUR_VPS_IP      | 300  |
| A     | api        | YOUR_VPS_IP      | 300  |
| A     | traefik    | YOUR_VPS_IP      | 300  |

## Step 3: Configure GitHub Secrets

Go to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

### Required Secrets

```
VPS_HOST=your-vps-ip-or-hostname
VPS_USER=deployuser
VPS_SSH_PRIVATE_KEY=<content of ~/.ssh/id_ed25519>
DOMAIN=your-domain.com

# Database
POSTGRES_USER=recruitiq_prod
POSTGRES_PASSWORD=<generate strong password>
POSTGRES_DB=recruitiq_production

# Redis
REDIS_PASSWORD=<generate strong password>

# JWT and Security (generate with: openssl rand -base64 32)
JWT_SECRET=<32+ character random string>
JWT_REFRESH_SECRET=<32+ character random string>
COOKIE_SECRET=<32+ character random string>
SESSION_SECRET=<32+ character random string>

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=<64 character hex string>

# CORS
CORS_ORIGINS=https://your-domain.com,https://nexus.your-domain.com,https://paylinq.your-domain.com,https://portal.your-domain.com,https://api.your-domain.com

# SSL
LETSENCRYPT_EMAIL=admin@your-domain.com

# Traefik Dashboard (generate with: htpasswd -nb admin password)
TRAEFIK_AUTH=admin:$apr1$hash$here
```

### Optional Secrets

```
# Email
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASSWORD=<smtp password>

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=<your key>
AWS_SECRET_ACCESS_KEY=<your secret>
AWS_S3_BUCKET=recruitiq-uploads
```

### Generate Secrets Script

Use this script to generate secure secrets:

```bash
# Generate JWT secrets
openssl rand -base64 32

# Generate encryption key
openssl rand -hex 32

# Generate Traefik auth (requires apache2-utils)
htpasswd -nb admin yourpassword
```

## Step 4: Deploy Applications

### Method 1: One-Click Deployment (GitHub Actions)

1. Go to **Actions** tab in your GitHub repository
2. Select **Deploy to TransIP VPS** workflow
3. Click **Run workflow**
4. Choose:
   - Environment: `production` or `staging`
   - Apps: `all` or specific apps (e.g., `backend,nexus,paylinq`)
5. Click **Run workflow**

The deployment will:
- ✅ Build Docker images for all selected apps
- ✅ Push images to GitHub Container Registry
- ✅ Deploy to VPS via SSH
- ✅ Run database migrations
- ✅ Start services with zero-downtime
- ✅ Perform health checks
- ✅ Clean up old images

### Method 2: Manual Deployment

If you prefer manual deployment:

```bash
# Make sure you're in the project root
cd /path/to/recruitiq

# Create production environment file
cp .env.production.template .env.production
# Edit .env.production with your values

# Run deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh production all
```

## Step 5: Verify Deployment

### Check Service Status

```bash
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose ps"
```

All services should show "Up" status.

### Test Endpoints

```bash
# Backend API
curl https://api.your-domain.com/health

# Frontend Apps
curl https://your-domain.com
curl https://nexus.your-domain.com
curl https://paylinq.your-domain.com
curl https://portal.your-domain.com
```

### Check Logs

```bash
# All services
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose logs -f"

# Specific service
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose logs -f backend"
```

### Access Traefik Dashboard

Visit `https://traefik.your-domain.com` and login with credentials from `TRAEFIK_AUTH` secret.

## Step 6: Post-Deployment Tasks

### 6.1 Setup Monitoring

Consider adding:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry
- **Performance monitoring**: New Relic, DataDog
- **Log aggregation**: Logtail, Papertrail

### 6.2 Configure Backups

Backups are automatically configured by the setup script:
- Database backups: Daily at 2 AM
- Volume backups: Daily at 2 AM
- Retention: 7 days

To manually trigger backup:
```bash
ssh deployuser@your-vps-ip "/opt/recruitiq/backup.sh"
```

To restore from backup:
```bash
# List backups
ssh deployuser@your-vps-ip "ls -lh /opt/recruitiq/backups/"

# Restore database
ssh deployuser@your-vps-ip "cd /opt/recruitiq && \
  gunzip < backups/db_YYYYMMDD_HHMMSS.sql.gz | \
  docker-compose exec -T postgres psql -U \$POSTGRES_USER \$POSTGRES_DB"
```

### 6.3 Setup Alerts

Configure email alerts for:
- Service downtime
- High resource usage
- Failed backups
- SSL certificate expiry

## Troubleshooting

### Deployment Failed

Check GitHub Actions logs:
1. Go to **Actions** tab
2. Click on failed workflow run
3. Check each step for errors

Common issues:
- SSH connection failed: Check `VPS_SSH_PRIVATE_KEY` secret
- Permission denied: Verify deployment user permissions
- Port conflicts: Ensure ports 80/443 are not in use

### Service Not Starting

```bash
# Check logs
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose logs backend"

# Restart service
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose restart backend"

# Full restart
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose down && docker-compose up -d"
```

### SSL Certificate Issues

```bash
# Check Traefik logs
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose logs traefik"

# Verify DNS records
dig +short your-domain.com
dig +short api.your-domain.com

# Wait for Let's Encrypt (can take a few minutes)
```

### Database Connection Errors

```bash
# Check PostgreSQL logs
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose logs postgres"

# Test database connection
ssh deployuser@your-vps-ip "cd /opt/recruitiq && \
  docker-compose exec postgres psql -U \$POSTGRES_USER -d \$POSTGRES_DB -c 'SELECT 1;'"
```

## Rollback Procedure

If a deployment fails and you need to rollback:

```bash
# SSH to VPS
ssh deployuser@your-vps-ip

cd /opt/recruitiq

# Pull previous image version
docker pull ghcr.io/your-org/recruitiq/backend:production-previous-sha

# Update docker-compose.yml to use previous image
# Then restart
docker-compose up -d

# Or restore from backup
```

## Security Checklist

- [ ] Changed all default passwords
- [ ] Configured firewall (UFW)
- [ ] Enabled fail2ban
- [ ] Setup SSL certificates
- [ ] Configured secure cookies
- [ ] Enabled rate limiting
- [ ] Setup monitoring and alerts
- [ ] Configured automated backups
- [ ] Restricted SSH to key-based auth only
- [ ] Setup security updates
- [ ] Configured log rotation

## Maintenance

### Update Dependencies

```bash
# Update Docker images
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose pull && docker-compose up -d"
```

### Scale Services

To scale services (e.g., multiple backend instances):

```bash
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose up -d --scale backend=3"
```

### Monitor Resources

```bash
# Check resource usage
ssh deployuser@your-vps-ip "docker stats"

# Check disk space
ssh deployuser@your-vps-ip "df -h"

# Check logs size
ssh deployuser@your-vps-ip "du -sh /opt/recruitiq/logs"
```

## Support

For deployment issues:
1. Check this guide
2. Review GitHub Actions logs
3. Check VPS logs: `/opt/recruitiq/logs/`
4. Contact DevOps team

## Summary

You now have:
- ✅ Automated one-click deployment from GitHub
- ✅ SSL certificates with auto-renewal
- ✅ Monitoring and health checks
- ✅ Automated backups
- ✅ Zero-downtime deployments
- ✅ Multi-app deployment support
- ✅ Production-ready infrastructure

Happy deploying! 🚀
