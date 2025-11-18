# Enterprise Development Setup with ngrok

## Overview

This setup provides a production-like development environment using ngrok tunnels with reserved domains. This eliminates all localhost limitations and provides:

✅ **Real HTTPS** with valid SSL certificates  
✅ **Stable domains** that persist across restarts  
✅ **Proper subdomain cookie sharing** for SSO  
✅ **Industry-standard development workflow**  
✅ **Works from any network** (no VPN issues)

## Prerequisites

### 1. ngrok Account Setup

1. **Sign up** for ngrok: https://dashboard.ngrok.com/signup
2. **Upgrade to paid plan** ($8/month): https://dashboard.ngrok.com/billing/subscription
   - Required for reserved domains
   - Worth it for professional development environment
3. **Reserve 4 domains** in dashboard: https://dashboard.ngrok.com/cloud-edge/domains
   - Click "New Domain" for each:
   - `nexus-dev` (or your preferred prefix)
   - `paylinq-dev`
   - `recruitiq-dev`
   - `portal-dev`
   - All will be under `.ngrok.app` (e.g., `nexus-dev.ngrok.app`)

### 2. Configure ngrok

1. **Get your authtoken**: https://dashboard.ngrok.com/get-started/your-authtoken

2. **Add authtoken to ngrok**:
   ```powershell
   ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
   ```

3. **Update `ngrok.yml`** in project root:
   ```yaml
   authtoken: YOUR_ACTUAL_TOKEN  # Replace this line
   ```

4. **Update domain names** in `ngrok.yml` if you reserved different names:
   ```yaml
   tunnels:
     nexus:
       hostname: your-nexus-name.ngrok.app  # Update this
     # ... repeat for other tunnels
   ```

## Configuration

### 1. Update Backend Environment

Copy the ngrok environment template:
```powershell
cd C:\RecruitIQ\backend
cp .env.ngrok .env
```

Edit `.env` and update these lines with your actual reserved domains:
```env
ALLOWED_ORIGINS=https://nexus-dev.ngrok.app,https://paylinq-dev.ngrok.app,https://recruitiq-dev.ngrok.app,https://portal-dev.ngrok.app
COOKIE_DOMAIN=.ngrok.app
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

**Important**: If your domains are under a custom subdomain (e.g., `xyz.ngrok.app`), update `COOKIE_DOMAIN` to `.xyz.ngrok.app`

### 2. Update Frontend API Clients

The frontend apps should already be configured to use Vite proxy, which will work with ngrok tunnels.

Verify each app's Vite config has:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:4000',
      changeOrigin: true,
    },
  },
}
```

## Starting the Environment

### Option 1: Automated Startup (Recommended)

```powershell
cd C:\RecruitIQ
.\start-dev.ps1
```

This script will:
1. Start backend API (port 4000)
2. Start all 4 frontend apps (ports 5173-5176)
3. Start ngrok tunnels with reserved domains
4. Display all URLs

### Option 2: Manual Startup

**Terminal 1 - Backend:**
```powershell
cd C:\RecruitIQ\backend
npm start
```

**Terminal 2 - Nexus:**
```powershell
cd C:\RecruitIQ\apps\nexus
npm run dev
```

**Terminal 3 - PayLinQ:**
```powershell
cd C:\RecruitIQ\apps\paylinq
npm run dev
```

**Terminal 4 - RecruitIQ:**
```powershell
cd C:\RecruitIQ\apps\recruitiq
npm run dev
```

**Terminal 5 - Portal:**
```powershell
cd C:\RecruitIQ\apps\portal
npm run dev
```

**Terminal 6 - ngrok:**
```powershell
cd C:\RecruitIQ
ngrok start --all --config ngrok.yml
```

## Accessing Your Applications

Once everything is running, access your applications via the reserved domains:

| Application | URL | Purpose |
|------------|-----|---------|
| **Nexus HRIS** | `https://nexus-dev.ngrok.app` | Human Resources |
| **PayLinQ** | `https://paylinq-dev.ngrok.app` | Payroll |
| **RecruitIQ** | `https://recruitiq-dev.ngrok.app` | Applicant Tracking |
| **Portal** | `https://portal-dev.ngrok.app` | Admin Platform |
| **ngrok Inspector** | `http://127.0.0.1:4040` | Debug requests |

## Testing SSO

### Test Cross-App Authentication

1. **Login to Nexus**: Navigate to `https://nexus-dev.ngrok.app/login`
   - Email: `tenant@testcompany.com`
   - Password: `Admin123!`

2. **Verify SSO**: Open new tabs for:
   - `https://paylinq-dev.ngrok.app` - Should auto-login
   - `https://recruitiq-dev.ngrok.app` - Should auto-login

3. **Test Logout**: Logout from any app
   - Verify other apps require login after refresh

4. **Verify Platform Isolation**: Navigate to `https://portal-dev.ngrok.app`
   - Should show login screen (NO SSO with tenant apps)
   - Login with: `platform_admin@recruitiq.com` / `Admin123!`

### Inspect Cookies

1. Open DevTools (F12) on any tenant app
2. Go to **Application → Cookies**
3. Look for `https://[app]-dev.ngrok.app`
4. Verify cookie attributes:
   - `tenant_access_token` - Domain: `.ngrok.app`, HttpOnly: ✓, Secure: ✓, SameSite: None
   - `tenant_refresh_token` - Domain: `.ngrok.app`, HttpOnly: ✓, Secure: ✓, SameSite: None

## Troubleshooting

### ngrok tunnel not starting

**Error**: `ERR_NGROK_108`
- **Solution**: Reserved domain not found. Check dashboard: https://dashboard.ngrok.com/cloud-edge/domains
- Verify domain names in `ngrok.yml` match reserved domains exactly

### CORS errors

**Error**: "Blocked by CORS policy"
- **Solution**: Update `ALLOWED_ORIGINS` in `backend/.env` with exact ngrok URLs (including `https://`)
- Restart backend server after changing `.env`

### Cookies not shared across apps

**Problem**: Login works but SSO fails
- **Check**: Cookie domain in DevTools
- **Solution**: Verify `COOKIE_DOMAIN=.ngrok.app` in `backend/.env`
- If using custom subdomain (e.g., `xyz.ngrok.app`), use `COOKIE_DOMAIN=.xyz.ngrok.app`

### "Invalid Host header" error

**Error**: Vite rejects ngrok hostname
- **Solution**: Update Vite config's `allowedHosts` to include your ngrok domain
- Example: `allowedHosts: ['nexus-dev.ngrok.app', 'localhost']`

### Backend not accessible

**Error**: 502 Bad Gateway
- **Check**: Is backend running on port 4000?
- **Check**: Run `curl http://localhost:4000/health` to verify
- **Solution**: Start backend first, then ngrok

## Production Considerations

This setup is for **development/staging only**. For production:

1. **Use your own domain** (e.g., `nexus.yourcompany.com`)
2. **Set up proper SSL certificates** (Let's Encrypt)
3. **Use a reverse proxy** (nginx, Cloudflare)
4. **Enable rate limiting** and security headers
5. **Use secure JWT secrets** (generate with `openssl rand -base64 64`)
6. **Set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=strict`**
7. **Enable database SSL** connections
8. **Use environment-specific configs** (not `.env` files)

## Cost

- **ngrok Pro Plan**: $8/month
  - 3 reserved domains included
  - Add 4th domain: +$1/month
  - **Total**: ~$9/month

**Alternative**: For production or long-term development, consider:
- **Cloudflare Tunnel**: Free with custom domain
- **AWS Route53 + EC2**: Full control, scales with usage
- **Local DNS + Self-signed certs**: Free but requires more setup

## Benefits of This Setup

✅ **Realistic Testing**: Exactly like production (HTTPS, proper domains)  
✅ **SSO Testing**: Subdomain cookies work correctly  
✅ **Team Collaboration**: Share URLs with team members  
✅ **Mobile Testing**: Test on phones/tablets on any network  
✅ **No Network Issues**: Works behind corporate firewalls/VPNs  
✅ **Professional**: Industry-standard development environment  

## Next Steps

1. Complete SSO testing
2. Test CSRF protection
3. Test rate limiting
4. Document any issues
5. Commit final configuration
6. Prepare for staging/production deployment
