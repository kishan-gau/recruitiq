# Backend ngrok Setup - Complete! ✅

## What Changed

Your backend is now accessible via **`https://recruitiq-be-dev.ngrok.app`** instead of `http://localhost:4000`.

This solves your cookie authentication problem by making everything same-domain (ngrok → ngrok).

## Changes Made

### 1. **ngrok Configuration** (`ngrok.yml`)
✅ Added `backend` tunnel pointing to port 4000
- Domain: `recruitiq-be-dev.ngrok.app`
- Protocol: HTTPS
- Inspect: Enabled

### 2. **Backend Configuration** (`backend/.env`)
✅ Updated CORS allowed origins
✅ Set cookie configuration for ngrok:
- `COOKIE_DOMAIN=.ngrok.app` (enables SSO across all ngrok subdomains)
- `COOKIE_SECURE=true` (required for HTTPS)
- `COOKIE_SAME_SITE=none` (allows cross-subdomain cookies)

### 3. **Backend Controllers**
✅ Updated `tenantAuthController.js`:
- Access token cookie: uses `COOKIE_DOMAIN`, `COOKIE_SECURE`, `COOKIE_SAME_SITE` env vars
- Refresh token cookie: uses same env vars for consistency

✅ Updated `platformAuthController.js`:
- Access token cookie: uses env vars
- Refresh token cookie: uses env vars

### 4. **Frontend Configuration**
✅ Updated all frontend `.env` files:
- **Nexus:** `VITE_API_URL=https://recruitiq-be-dev.ngrok.app/api`
- **PayLinQ:** `VITE_API_URL=https://recruitiq-be-dev.ngrok.app/api`
- **RecruitIQ:** `VITE_API_URL=https://recruitiq-be-dev.ngrok.app/api`
- **Portal:** `VITE_API_URL=https://recruitiq-be-dev.ngrok.app/api`

### 5. **Startup Script** (`start-dev.ps1`)
✅ Updated to show backend ngrok URL in startup message

## Next Steps

### 1. Reserve the ngrok Domain
Go to https://dashboard.ngrok.com/domains and reserve:
```
recruitiq-be-dev.ngrok.app
```

### 2. Restart Everything
```powershell
# Stop all running services (if any)
Get-Process | Where-Object {$_.ProcessName -eq "node" -or $_.ProcessName -eq "ngrok"} | Stop-Process -Force

# Start everything
.\start-dev.ps1
```

### 3. Verify Setup
After startup, you should see:
```
Your applications will be available at:
   Backend:   https://recruitiq-be-dev.ngrok.app  ✅
   Nexus:     https://nexus-dev.ngrok.app
   PayLinQ:   https://paylinq-dev.ngrok.app
   RecruitIQ: https://recruitiq-dev.ngrok.app
   Portal:    https://portal-dev.ngrok.app
```

### 4. Test Authentication
1. Open Nexus: `https://nexus-dev.ngrok.app`
2. Log in with your credentials
3. **Expected:** You should stay logged in (no redirect to login)
4. Check browser DevTools → Application → Cookies:
   - Should see `tenant_access_token` cookie
   - Domain should be `.ngrok.app`
   - Secure should be `true`
   - SameSite should be `None`

## Why This Works

### Before (Not Working) ❌
```
Frontend: https://nexus-dev.ngrok.app
Backend:  http://localhost:4000
          ^^^^^ Different domain = cookies blocked
```

### After (Working) ✅
```
Frontend: https://nexus-dev.ngrok.app
Backend:  https://recruitiq-be-dev.ngrok.app
          ^^^^^ Same domain (.ngrok.app) = cookies work!
```

## Cookie Configuration Explained

```javascript
res.cookie('tenant_access_token', token, {
  httpOnly: true,              // ✅ Prevents XSS attacks
  secure: true,                // ✅ HTTPS only (required for SameSite=None)
  sameSite: 'none',            // ✅ Allows cross-subdomain cookies
  domain: '.ngrok.app',        // ✅ Shared across *.ngrok.app subdomains
  maxAge: 15 * 60 * 1000,     // ✅ 15 minutes
  path: '/'                    // ✅ Available for all routes
});
```

## Troubleshooting

### Issue: "404 on backend ngrok URL"
**Solution:** Make sure you reserved `recruitiq-be-dev.ngrok.app` in ngrok dashboard

### Issue: "Cookies still not working"
**Check:**
1. Browser DevTools → Network → Check request has `Cookie` header
2. Backend logs should show: `"cookies": { "tenant_access_token": "..." }`
3. Verify `COOKIE_DOMAIN=.ngrok.app` in `backend/.env`
4. Verify `COOKIE_SECURE=true` in `backend/.env`

### Issue: "CORS errors"
**Check:**
1. `ALLOWED_ORIGINS` in `backend/.env` includes all ngrok URLs
2. Frontend is using `https://recruitiq-be-dev.ngrok.app/api`

## Production Notes

When deploying to production:
1. Change `COOKIE_DOMAIN=.recruitiq.com`
2. Change `COOKIE_SAME_SITE=lax` (or `strict` for platform)
3. Ensure `COOKIE_SECURE=true` (already set)
4. Update `ALLOWED_ORIGINS` with production domains

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   ngrok Cloud (.ngrok.app)              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────┐      ┌──────────────────┐         │
│  │ nexus-dev       │      │ recruitiq-be-dev │         │
│  │ :5175           │─────▶│ :4000            │         │
│  └─────────────────┘      └──────────────────┘         │
│                                     ▲                     │
│  ┌─────────────────┐               │                     │
│  │ paylinq-dev     │───────────────┘                     │
│  │ :5174           │                                     │
│  └─────────────────┘                                     │
│                                                           │
│  Cookies: Domain=.ngrok.app, Secure=true, SameSite=None │
└─────────────────────────────────────────────────────────┘
```

All traffic flows through ngrok with shared cookie domain = SSO works! 🎉
