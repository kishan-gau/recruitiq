# Deployment Pre-Flight Checklist

Use this checklist before deploying to production.

## Pre-Deployment Checklist

### 1. Code Quality ✅

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code coverage meets requirements (80%+)
- [ ] No critical security vulnerabilities
- [ ] Linting passes with no errors
- [ ] Code reviewed and approved
- [ ] Breaking changes documented

### 2. Environment Configuration ✅

- [ ] All GitHub Secrets configured
- [ ] `.env.production` created from template
- [ ] Database credentials secured
- [ ] JWT secrets are strong (32+ chars)
- [ ] Encryption keys generated
- [ ] CORS origins correctly set
- [ ] SSL email configured

### 3. DNS Configuration ✅

- [ ] A records created for all subdomains:
  - [ ] @ (root domain)
  - [ ] www
  - [ ] api
  - [ ] nexus
  - [ ] paylinq
  - [ ] portal
  - [ ] traefik
- [ ] DNS propagation verified
- [ ] TTL set appropriately (300-3600)

### 4. VPS Setup ✅

- [ ] VPS provisioned at TransIP
- [ ] `setup-vps.sh` script executed
- [ ] Docker installed and running
- [ ] Deployment user created
- [ ] SSH key added to deployment user
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] Fail2ban configured
- [ ] Swap space configured
- [ ] Monitoring script setup
- [ ] Backup script configured

### 5. Database ✅

- [ ] PostgreSQL container configured
- [ ] Database migrations ready
- [ ] Backup strategy tested
- [ ] Connection pooling configured
- [ ] Database credentials rotated from defaults

### 6. Security ✅

- [ ] HTTPS/TLS certificates configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] CSRF protection enabled
- [ ] Input validation in place
- [ ] Secrets not in codebase
- [ ] API authentication working
- [ ] CORS properly configured
- [ ] No exposed sensitive endpoints

### 7. Monitoring & Logging ✅

- [ ] Health check endpoints working
- [ ] Log rotation configured
- [ ] Monitoring script running
- [ ] Backup verification working
- [ ] Alert system configured (optional)
- [ ] Error tracking setup (Sentry - optional)

### 8. Performance ✅

- [ ] Frontend assets optimized
- [ ] Images compressed
- [ ] Gzip compression enabled
- [ ] Static assets cached
- [ ] Database indexes created
- [ ] Query performance tested
- [ ] Load testing completed (optional)

### 9. Documentation ✅

- [ ] API documentation up to date
- [ ] Deployment guide reviewed
- [ ] Rollback procedure documented
- [ ] Environment variables documented
- [ ] Architecture diagrams current

### 10. Deployment Plan ✅

- [ ] Deployment window scheduled
- [ ] Team notified
- [ ] Rollback plan prepared
- [ ] Database migration plan ready
- [ ] Communication plan for users (if needed)
- [ ] Post-deployment checklist prepared

## Deployment Steps

### Step 1: Pre-Deploy Verification

```bash
# Run local tests
pnpm test

# Check for security issues
cd backend && npm audit

# Verify environment files
cat .env.production
```

### Step 2: Create Database Backup

```bash
# SSH to VPS and create backup
ssh deployuser@your-vps-ip "/opt/recruitiq/backup.sh"
```

### Step 3: Deploy

```bash
# Option A: GitHub Actions (recommended)
# Go to Actions → Deploy to TransIP VPS → Run workflow

# Option B: Manual deployment
./scripts/deploy.sh production all
```

### Step 4: Post-Deploy Verification

```bash
# Run health checks
./scripts/health-check.sh your-domain.com

# Check service status
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose ps"

# Check logs for errors
ssh deployuser@your-vps-ip "cd /opt/recruitiq && docker-compose logs --tail=100"
```

### Step 5: Monitor

Monitor for 30 minutes:
- [ ] No error spikes in logs
- [ ] Response times normal
- [ ] No increase in 5xx errors
- [ ] Users can access all apps
- [ ] Authentication working
- [ ] Critical workflows functional

## Post-Deployment Verification

### Smoke Tests

1. **Backend API**
   ```bash
   curl https://api.your-domain.com/health
   curl https://api.your-domain.com/api/status
   ```

2. **Frontend Apps**
   - [ ] RecruitIQ: https://your-domain.com
   - [ ] Nexus: https://nexus.your-domain.com
   - [ ] PayLinQ: https://paylinq.your-domain.com
   - [ ] Portal: https://portal.your-domain.com

3. **Authentication**
   - [ ] Login works
   - [ ] JWT tokens generated
   - [ ] Session persistence
   - [ ] Logout works

4. **Core Workflows**
   - [ ] User registration
   - [ ] Password reset
   - [ ] Data CRUD operations
   - [ ] File uploads (if applicable)

5. **Security**
   - [ ] HTTPS enforced
   - [ ] Mixed content resolved
   - [ ] CORS working correctly
   - [ ] Rate limiting active

## Rollback Criteria

Rollback immediately if:
- 🔴 Service availability < 95%
- 🔴 Critical functionality broken
- 🔴 Database corruption detected
- 🔴 Security vulnerability exposed
- 🔴 Data loss detected
- 🔴 5xx error rate > 5%

Rollback process:
```bash
# Option A: GitHub Actions
# Go to Actions → Rollback Deployment → Run workflow

# Option B: Manual rollback
ssh deployuser@your-vps-ip
cd /opt/recruitiq
docker-compose down
# Restore from backup
docker-compose up -d
```

## Post-Deployment Tasks

- [ ] Update changelog
- [ ] Notify stakeholders
- [ ] Document any issues
- [ ] Update runbooks if needed
- [ ] Schedule retrospective (if major deployment)

## Emergency Contacts

**On-Call Engineer**: [Your contact]  
**DevOps Lead**: [Your contact]  
**TransIP Support**: support@transip.nl  

## Notes

Add deployment-specific notes here:
- [ ] 
- [ ] 
- [ ] 

---

**Deployment Date**: ___________  
**Deployed By**: ___________  
**Deployment ID**: ___________  
**Commit SHA**: ___________
