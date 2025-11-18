# ngrok Quick Reference

## Setup (One-Time)

```powershell
# 1. Sign up & upgrade to paid ($8/month)
#    https://dashboard.ngrok.com/signup
#    https://dashboard.ngrok.com/billing/subscription

# 2. Reserve domains
#    https://dashboard.ngrok.com/cloud-edge/domains
#    Reserve: nexus-dev, paylinq-dev, recruitiq-dev, portal-dev

# 3. Configure ngrok
ngrok config add-authtoken YOUR_TOKEN  # Get from dashboard

# 4. Update project files
cd C:\RecruitIQ
# Edit ngrok.yml - add your authtoken
# Edit backend/.env - copy from .env.ngrok and update domains
```

## Daily Usage

```powershell
# Start everything (automated)
cd C:\RecruitIQ
.\start-dev.ps1

# OR start manually in separate terminals:
cd C:\RecruitIQ\backend && npm start                    # Terminal 1
cd C:\RecruitIQ\apps\nexus && npm run dev               # Terminal 2
cd C:\RecruitIQ\apps\paylinq && npm run dev             # Terminal 3
cd C:\RecruitIQ\apps\recruitiq && npm run dev           # Terminal 4
cd C:\RecruitIQ\apps\portal && npm run dev              # Terminal 5
cd C:\RecruitIQ && ngrok start --all --config ngrok.yml # Terminal 6
```

## URLs

| App | URL | Port |
|-----|-----|------|
| Nexus | https://nexus-dev.ngrok.app | 5175 |
| PayLinQ | https://paylinq-dev.ngrok.app | 5174 |
| RecruitIQ | https://recruitiq-dev.ngrok.app | 5173 |
| Portal | https://portal-dev.ngrok.app | 5176 |
| Backend | http://localhost:4000 | 4000 |
| ngrok UI | http://127.0.0.1:4040 | 4040 |

## Test Credentials

**Tenant User:**
- Email: `tenant@testcompany.com`
- Password: `Admin123!`

**Platform Admin:**
- Email: `platform_admin@recruitiq.com`
- Password: `Admin123!`

## Common Commands

```powershell
# View ngrok status
ngrok status

# Stop all ngrok tunnels
taskkill /F /IM ngrok.exe

# View running Node processes
Get-Process node

# Stop all Node processes
Get-Process node | Stop-Process -Force

# Check what's running on port 4000
netstat -ano | findstr :4000

# Restart backend only
cd C:\RecruitIQ\backend
npm start
```

## Troubleshooting

**Tunnel not starting?**
```powershell
# Check if domain is reserved in dashboard
# Verify ngrok.yml has correct domain names
# Ensure authtoken is set correctly
```

**CORS errors?**
```powershell
# Update backend/.env ALLOWED_ORIGINS with exact ngrok URLs
# Restart backend
```

**Cookies not working?**
```powershell
# Check COOKIE_DOMAIN in backend/.env
# Should be: .ngrok.app (or .your-subdomain.ngrok.app)
# Check DevTools → Application → Cookies
```

## Cost Breakdown

- ngrok Pro: $8/month (3 domains included)
- 4th domain: +$1/month
- **Total: $9/month**

Worth it for:
- ✅ Proper SSO testing
- ✅ HTTPS with valid certs
- ✅ Team collaboration
- ✅ Mobile testing
- ✅ No localhost limitations
