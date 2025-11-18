# SSO Testing Guide

**Version:** 1.0  
**Last Updated:** January 2025

---

## Overview

This guide explains how to test Single Sign-On (SSO) functionality across RecruitIQ tenant applications using mock domains that simulate production behavior.

### What is SSO?

**Single Sign-On (SSO)** allows users to log in once and access multiple related applications without re-authenticating. In RecruitIQ:
- **Tenant Apps (SSO-enabled):** PayLinQ, Nexus, RecruitIQ, ScheduleHub
- **Platform App (NO SSO):** Portal (separate admin system)

### Why Mock Domains?

Browsers isolate cookies by **port** even on the same domain:
- `localhost:5174` and `localhost:5175` = **Different cookie contexts** ❌
- `paylinq.local:5174` and `nexus.local:5175` = **Shared `.local` domain** ✅

Mock domains with a shared parent domain (`.local`) enable SSO testing that mirrors production behavior (`.recruitiq.com`).

---

## Setup

### Prerequisites

- Windows 10/11 (requires Administrator privileges)
- Backend running on port 4000
- Frontend apps configured for development

### Step 1: Configure Hosts File

**Run setup script as Administrator:**

```powershell
# Open PowerShell as Administrator
cd C:\RecruitIQ
.\scripts\setup-local-domains.ps1
```

**What this does:**
- Backs up your hosts file
- Adds 127.0.0.1 mappings for:
  - `paylinq.local`
  - `nexus.local`
  - `recruitiq.local`
  - `portal.local`

**Verify setup:**
```powershell
ping paylinq.local
# Should respond from 127.0.0.1
```

### Step 2: Restart Backend Server

**Required to apply cookie configuration changes:**

```bash
# Stop current backend (Ctrl+C if running)
cd C:\RecruitIQ\backend
npm run dev
```

**Backend will use `.local` cookie domain in development.**

### Step 3: Start Frontend Apps

```bash
# Terminal 1: RecruitIQ (port 5173)
cd C:\RecruitIQ\apps\recruitiq
npm run dev

# Terminal 2: PayLinQ (port 5174)
cd C:\RecruitIQ\apps\paylinq
npm run dev

# Terminal 3: Nexus (port 5175)
cd C:\RecruitIQ\apps\nexus
npm run dev

# Terminal 4: Portal (port 5176)
cd C:\RecruitIQ\apps\portal
npm run dev
```

---

## Test Scenarios

### Test 1: Cross-App SSO (Core Functionality)

**Objective:** Verify users can navigate between tenant apps without re-authenticating.

**Steps:**

1. **Login to PayLinQ:**
   ```
   Open browser: http://paylinq.local:5174
   Email: tenant@testcompany.com
   Password: Admin123!
   ```
   ✅ **Expected:** Successfully logged in, dashboard visible

2. **Navigate to Nexus (SSO Test):**
   ```
   Open NEW TAB: http://nexus.local:5175
   ```
   ✅ **Expected:** Automatically logged in (no login screen)
   ❌ **Failure:** Login screen appears = SSO not working

3. **Navigate to RecruitIQ:**
   ```
   Open NEW TAB: http://recruitiq.local:5173
   ```
   ✅ **Expected:** Automatically logged in

**Success Criteria:**
- ✅ All tenant apps auto-login after first authentication
- ✅ Same user info displayed in all apps
- ✅ No additional login prompts

**Troubleshooting:**
- If login screen appears on second app, check:
  - Backend running with latest code?
  - Cookies showing `domain: .local` in DevTools?
  - Hosts file configured correctly? (`ping paylinq.local`)

---

### Test 2: Logout Propagation

**Objective:** Verify single logout clears session across all apps.

**Setup:**
- Have 3 tabs open and logged in via SSO:
  - PayLinQ: `http://paylinq.local:5174`
  - Nexus: `http://nexus.local:5175`
  - RecruitIQ: `http://recruitiq.local:5173`

**Steps:**

1. **Logout from PayLinQ:**
   - Click "Logout" button in PayLinQ
   - ✅ **Expected:** Redirected to login screen

2. **Check Nexus tab:**
   - Switch to Nexus tab
   - Refresh page (F5)
   - ✅ **Expected:** Redirected to login screen (session cleared)

3. **Check RecruitIQ tab:**
   - Switch to RecruitIQ tab
   - Refresh page (F5)
   - ✅ **Expected:** Redirected to login screen

**Success Criteria:**
- ✅ Single logout clears cookies for all tenant apps
- ✅ All apps redirect to login after logout + refresh
- ✅ Cannot access protected routes without re-login

**Troubleshooting:**
- If still logged in after logout:
  - Check logout cookies using `domain: .local` (backend code)
  - Verify `clearCookie` calls in `tenantAuthController.js`

---

### Test 3: Platform Isolation (Portal)

**Objective:** Verify Portal uses separate authentication (NO SSO with tenant apps).

**Steps:**

1. **Login to PayLinQ:**
   ```
   http://paylinq.local:5174
   Email: tenant@testcompany.com
   Password: Admin123!
   ```
   ✅ Logged in

2. **Navigate to Portal:**
   ```
   Open NEW TAB: http://portal.local:5176
   ```
   ✅ **Expected:** Login screen appears (NOT auto-login)

3. **Login to Portal with admin credentials:**
   ```
   Email: admin@platform.com
   Password: Admin123!
   ```
   ✅ **Expected:** Successfully logged in to Portal

4. **Verify separate cookies:**
   - Open DevTools → Application → Cookies
   - PayLinQ shows: `tenant_access_token` / `tenant_refresh_token`
   - Portal shows: `platform_access_token` / `platform_refresh_token`

**Success Criteria:**
- ✅ Portal requires separate login (NO SSO)
- ✅ Tenant cookies and Platform cookies are separate
- ✅ Both sessions can coexist (logged into both simultaneously)

**Why?**
- Portal is an admin system for **super admins** (platform operators)
- Tenant apps are for **organization users** (customers)
- Different user tables: `platform.user_account` vs `hris.user_account`
- Security: Platform admins need separate authentication

---

### Test 4: Cookie Configuration Verification

**Objective:** Verify cookies have correct security attributes.

**Steps:**

1. **Login to any tenant app** (e.g., PayLinQ)

2. **Open DevTools:**
   - Press F12
   - Go to: **Application** → **Cookies** → `http://paylinq.local:5174`

3. **Inspect `tenant_access_token` cookie:**
   ```
   Domain:   .local             ✅ (enables SSO)
   Path:     /                  ✅
   HttpOnly: true               ✅ (prevents XSS)
   Secure:   false (dev)        ✅ (true in prod)
   SameSite: Lax                ✅ (allows navigation)
   Expires:  ~15 minutes        ✅
   ```

4. **Inspect `tenant_refresh_token` cookie:**
   ```
   Domain:   .local             ✅
   Path:     /                  ✅
   HttpOnly: true               ✅
   Secure:   false (dev)        ✅
   SameSite: Lax                ✅
   Expires:  7-30 days          ✅
   ```

**Success Criteria:**
- ✅ Both cookies use `.local` domain
- ✅ HttpOnly enabled (security)
- ✅ SameSite: Lax (allows SSO navigation)
- ✅ Access token short-lived (~15 min)
- ✅ Refresh token long-lived (7-30 days)

---

### Test 5: Token Refresh Flow

**Objective:** Verify access tokens refresh automatically when expired.

**Setup:**
- Modify backend to use **1-minute access token** for testing:
  ```javascript
  // backend/src/controllers/auth/tenantAuthController.js (temporary change)
  expiresIn: '1m', // Change from '15m' to '1m'
  ```

**Steps:**

1. **Login to PayLinQ:**
   ```
   http://paylinq.local:5174
   ```

2. **Wait 2 minutes** (access token expires)

3. **Make an authenticated request:**
   - Click any navigation link
   - Or refresh page

4. **Verify in Network tab (DevTools):**
   - Original request → 401 Unauthorized
   - Automatic retry → 200 OK (token refreshed)
   - No login screen appears

**Success Criteria:**
- ✅ Access token expires after 1 minute
- ✅ Refresh token used to get new access token
- ✅ User stays logged in (no login prompt)
- ✅ New access token cookie set

**Restore after test:**
- Change `expiresIn` back to `'15m'`
- Restart backend

---

### Test 6: Session Persistence Across Browser Restart

**Objective:** Verify users stay logged in after closing browser (if configured).

**Current Behavior:** Sessions do NOT persist after browser close (session cookies).

**To enable persistent sessions:**
```javascript
// backend/src/controllers/auth/tenantAuthController.js
// Add maxAge to access token cookie
maxAge: 15 * 60 * 1000, // 15 minutes
```

**Test:**
1. Login to PayLinQ
2. Close ALL browser windows
3. Reopen browser
4. Navigate to `http://paylinq.local:5174`
5. **Expected (if maxAge set):** Still logged in
6. **Expected (no maxAge):** Login screen (session expired)

---

## Troubleshooting

### Issue: Login screen appears on second app (SSO not working)

**Diagnosis:**

1. **Check cookie domain:**
   ```
   DevTools → Application → Cookies → Check "Domain" column
   Should be: .local
   ```

2. **Check backend logs:**
   ```
   Look for: "User authenticated" logs
   If missing: Authentication middleware not receiving cookies
   ```

3. **Check CORS configuration:**
   ```bash
   # backend/.env
   ALLOWED_ORIGINS should include:
   http://paylinq.local:5174,http://nexus.local:5175,...
   ```

4. **Verify hosts file:**
   ```powershell
   ping paylinq.local
   # Should resolve to 127.0.0.1
   ```

**Solution:**
- Restart backend after config changes
- Clear browser cookies and retry
- Re-run setup script if hosts file not configured

---

### Issue: 401 Unauthorized errors

**Diagnosis:**

1. **Check if logged in:**
   - DevTools → Application → Cookies
   - Should see: `tenant_access_token` and `tenant_refresh_token`

2. **Check token expiration:**
   - Look at "Expires" column in cookies
   - If expired: Login again

3. **Check backend authentication middleware:**
   ```
   Backend logs should show: "User authenticated"
   If not: Token verification failing
   ```

**Solution:**
- Login again if tokens expired
- Check JWT_SECRET matches between frontend and backend
- Verify backend `/api/auth/tenant/me` endpoint works

---

### Issue: Cookies not being sent with requests

**Diagnosis:**

1. **Check Network tab:**
   - DevTools → Network → Select request
   - Check "Request Headers" → Should include "Cookie:"

2. **Check CORS credentials:**
   ```javascript
   // Frontend API client should have:
   axios.defaults.withCredentials = true;
   ```

3. **Check backend CORS:**
   ```javascript
   // backend/src/server.js
   credentials: true  // Must be enabled
   ```

**Solution:**
- Ensure `withCredentials: true` in API client
- Ensure backend CORS allows credentials
- Verify origin matches ALLOWED_ORIGINS exactly

---

### Issue: Platform (Portal) showing 404 errors

**Diagnosis:**

1. **Check endpoint:**
   ```javascript
   // Should be:
   /api/auth/platform/me  ✅
   
   // NOT:
   /api/auth/me  ❌
   ```

2. **Check backend routes:**
   ```bash
   Backend should have:
   /api/auth/platform/login
   /api/auth/platform/logout
   /api/auth/platform/me
   ```

**Solution:**
- Verify Portal Login.jsx uses `/api/auth/platform/*` endpoints
- Check backend platform auth routes registered

---

## Cleanup

### Remove Mock Domains

**When finished testing:**

```powershell
# Run as Administrator
cd C:\RecruitIQ
.\scripts\remove-local-domains.ps1
```

**What this does:**
- Backs up hosts file
- Removes .local domain mappings
- Restores localhost-only testing

**Switch back to localhost:**
```javascript
// backend/src/controllers/auth/tenantAuthController.js
domain: process.env.NODE_ENV === 'production' ? '.recruitiq.com' : 'localhost'
```

Then restart backend.

---

## Architecture Reference

### Authentication Types

| Type | Apps | User Table | Endpoints | Cookies | SSO |
|------|------|------------|-----------|---------|-----|
| **Tenant** | PayLinQ, Nexus, RecruitIQ, ScheduleHub | `hris.user_account` | `/api/auth/tenant/*` | `tenant_access_token`, `tenant_refresh_token` | ✅ YES |
| **Platform** | Portal | `platform.user_account` | `/api/auth/platform/*` | `platform_access_token`, `platform_refresh_token` | ❌ NO |

### Cookie Configuration

**Tenant Auth (SSO-enabled):**
```javascript
{
  domain: '.local',        // Development (SSO domain)
  httpOnly: true,          // XSS protection
  secure: false,           // Development (true in prod)
  sameSite: 'lax',         // Allows navigation between apps
  path: '/',
  maxAge: 900000           // 15 minutes (access token)
}
```

**Platform Auth (NO SSO):**
```javascript
{
  domain: undefined,       // Port-specific (no SSO)
  httpOnly: true,
  secure: false,
  sameSite: 'strict',      // Stricter security
  path: '/',
  maxAge: 900000
}
```

### Port Assignments

- **Backend:** 4000
- **RecruitIQ:** 5173 → `recruitiq.local:5173`
- **PayLinQ:** 5174 → `paylinq.local:5174`
- **Nexus:** 5175 → `nexus.local:5175`
- **Portal:** 5176 → `portal.local:5176`

---

## Success Checklist

**Setup Complete:**
- [ ] Hosts file configured (setup script executed)
- [ ] Backend restarted with `.local` cookie domain
- [ ] All frontend apps running
- [ ] Can ping `paylinq.local` successfully

**SSO Working:**
- [ ] Login to PayLinQ → auto-login to Nexus
- [ ] Login to PayLinQ → auto-login to RecruitIQ
- [ ] Logout from PayLinQ → logout propagates to all apps
- [ ] Cookies show `domain: .local` in DevTools

**Platform Isolation Working:**
- [ ] Portal requires separate login (NO SSO)
- [ ] Separate cookies: `tenant_*` vs `platform_*`
- [ ] Can be logged into both simultaneously

**Security:**
- [ ] Cookies are HttpOnly (prevents XSS)
- [ ] Access tokens short-lived (15 min)
- [ ] Refresh tokens long-lived (7-30 days)
- [ ] SameSite: Lax (tenant) / Strict (platform)

---

## Next Steps

**After SSO Testing:**

1. **Document Test Results:**
   - Which scenarios passed/failed
   - Any issues encountered
   - Performance observations

2. **Production Readiness:**
   - Verify cookie domain in production: `.recruitiq.com`
   - Verify secure flag enabled in production
   - Test SSO on staging environment

3. **Commit Changes:**
   ```bash
   git add -A
   git commit -m "feat(sso): enable local SSO testing with mock domains"
   git push
   ```

4. **Clean Up (Optional):**
   - Remove .local domains if not needed: `.\scripts\remove-local-domains.ps1`
   - Switch back to localhost cookie domain

---

## FAQ

**Q: Why not use dev-gateway instead of mock domains?**  
A: Dev-gateway can proxy one app at a time. Mock domains allow testing all apps simultaneously with production-like SSO behavior.

**Q: Do mock domains work on Mac/Linux?**  
A: Yes! Edit `/etc/hosts` instead of `C:\Windows\System32\drivers\etc\hosts`. Same concept, different path.

**Q: Can I use a different TLD like .test or .dev?**  
A: `.local` is recommended for local testing. `.dev` requires HTTPS (browsers force it). `.test` works but `.local` is conventional.

**Q: Why does Platform (Portal) not have SSO?**  
A: Platform is for super admins who manage the entire system. Tenant apps are for organization users. Separate concerns require separate authentication for security.

**Q: Will SSO work in production?**  
A: Yes! Same mechanism, different domain. Production uses `.recruitiq.com` instead of `.local`. Cookie domain configured via environment detection.

**Q: What happens if I forget to remove mock domains?**  
A: No harm! They only map to localhost. Won't affect internet connectivity. Run cleanup script when ready.

---

## References

- [Backend Standards](./BACKEND_STANDARDS.md)
- [Security Standards](./SECURITY_STANDARDS.md)
- [Testing Standards](./TESTING_STANDARDS.md)
- [Cookie RFC 6265](https://tools.ietf.org/html/rfc6265)
- [SameSite Cookie Explanation](https://web.dev/samesite-cookies-explained/)
