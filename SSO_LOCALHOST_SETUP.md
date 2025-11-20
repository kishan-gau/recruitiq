# SSO with Localhost Subdomains - Setup Guide

## ✅ **Industry Standard Solution** - No Hosts File Required!

Modern browsers **natively support** `localhost` subdomains, making them the **industry-standard choice** for local development with SSO.

### Why Localhost Subdomains?

- ✅ **No configuration needed** - Works out of the box
- ✅ **No hosts file** - Browsers resolve `*.localhost` to `127.0.0.1` automatically
- ✅ **Cross-browser compatible** - Chrome, Firefox, Edge, Safari
- ✅ **Proper cookie sharing** - `domain: '.localhost'` enables SSO
- ✅ **Industry standard** - Used by frameworks like Rails, Laravel, Docker

---

## Access Your Apps

### Tenant Applications (SSO Enabled)
- **PayLinQ:** http://paylinq.localhost:5174
- **Nexus:** http://nexus.localhost:5175
- **RecruitIQ:** http://recruitiq.localhost:5173

### Platform Application (Separate Auth)
- **Portal:** http://portal.localhost:5176

---

## Test SSO Flow

### 1. Login to Any Tenant App
```
URL: http://nexus.localhost:5175
User: tenant@testcompany.com
Password: Admin123!
```

### 2. Navigate to Another Tenant App
- Click link to: http://paylinq.localhost:5174
- **Expected:** Automatic login (no login page)
- **Why:** Cookies shared via `domain: '.localhost'`

### 3. Verify Cookie Configuration
**Open DevTools → Application → Cookies:**
```
Name: tenant_access_token
Domain: .localhost
HttpOnly: ✓
SameSite: Lax
Secure: (✓ in production only)
Path: /
```

### 4. Test Logout Propagation
1. Open 3 tabs: nexus.localhost, paylinq.localhost, recruitiq.localhost
2. Logout from ONE app
3. Refresh other tabs
4. **Expected:** All apps show login screen (logout propagated)

---

## Backend Configuration

**File:** `backend/src/controllers/auth/tenantAuthController.js`

```javascript
res.cookie('tenant_access_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  domain: process.env.NODE_ENV === 'production' 
    ? '.recruitiq.com'    // Production: your actual domain
    : '.localhost',       // Development: localhost subdomains
  maxAge: 15 * 60 * 1000,
  path: '/'
});
```

**Key Points:**
- ✅ Leading dot (`.localhost`) enables subdomain sharing
- ✅ Same config for all 5 cookie locations (login, refresh, logout)
- ✅ No `allowedHosts` needed in Vite - browsers handle it natively

---

## Troubleshooting

### Issue: "This site can't be reached"
**Solution:** Check your app is running on the correct port:
```powershell
# Check if app is listening
netstat -ano | findstr "5174"  # PayLinQ
netstat -ano | findstr "5175"  # Nexus
netstat -ano | findstr "5173"  # RecruitIQ
```

### Issue: Login works but refresh logs me out
**Check:** Cookie domain configuration
```javascript
// ❌ WRONG - Won't persist
domain: 'localhost'  // No leading dot

// ✅ CORRECT - Persists across subdomains
domain: '.localhost'  // With leading dot
```

### Issue: SSO not working between apps
**Verify:** All apps use same cookie domain
```bash
# Backend should show .localhost in all cookies
grep -n "domain.*localhost" backend/src/controllers/auth/tenantAuthController.js
```

---

## Platform Isolation (Portal)

Portal uses **separate authentication** with different cookies:

**Portal Cookies:**
- `platform_access_token` (domain: `.localhost`)
- `platform_refresh_token` (domain: `.localhost`)

**Tenant Cookies:**
- `tenant_access_token` (domain: `.localhost`)
- `tenant_refresh_token` (domain: `.localhost`)

**Test:** Navigate to `portal.localhost:5176` while logged into tenant apps:
- ✅ Should show login screen (no SSO)
- ✅ Login with: `platform_admin@recruitiq.com`
- ✅ Verify separate cookies exist

---

## Benefits Over .local TLD

| Feature | `.local` | `.localhost` |
|---------|----------|--------------|
| Hosts file needed | ✅ Yes | ❌ No |
| Browser support | ⚠️ Limited | ✅ Universal |
| Cookie sharing | ❌ Problematic | ✅ Works perfectly |
| mDNS conflicts | ⚠️ Yes | ❌ No |
| Setup time | 🕐 Minutes | ⚡ Instant |
| Industry standard | ❌ No | ✅ Yes |

---

## Production Deployment

When deploying to production, change cookie domain:

```javascript
domain: process.env.NODE_ENV === 'production' 
  ? '.recruitiq.com'     // Your actual domain
  : '.localhost'         // Development only
```

**Production URLs:**
- https://paylinq.recruitiq.com
- https://nexus.recruitiq.com
- https://recruitiq.com (main app)
- https://portal.recruitiq.com (admin)

Cookies with `domain: '.recruitiq.com'` will be shared across all subdomains in production.

---

## References

- [MDN: localhost](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Host)
- [Chrome: localhost subdomains](https://chromestatus.com/feature/6544204546138112)
- [IETF: Special Use Top Level Domain 'localhost'](https://datatracker.ietf.org/doc/html/rfc6761#section-6.3)

