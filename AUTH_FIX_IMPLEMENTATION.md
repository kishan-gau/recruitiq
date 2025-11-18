# Authentication Fix - Comprehensive Implementation

**Date:** January 18, 2025  
**Issue:** 401 Unauthorized errors across all apps due to cookie domain restrictions  
**Root Cause:** Browser security policies reject `Domain=.ngrok.app` cookies, preventing cross-subdomain authentication

---

## Root Cause Analysis

### Problem Chain

```
1. Backend sends: Set-Cookie: token=...; Domain=.ngrok.app; HttpOnly; Secure; SameSite=none
2. Browser REJECTS Domain=.ngrok.app attribute (security policy)
3. Cookie stored with Domain=recruitiq-be-dev.ngrok.app (exact domain)
4. User navigates to: https://nexus-dev.ngrok.app/
5. API call to: https://recruitiq-be-dev.ngrok.app/api/...
6. Browser DOES NOT send cookie (different subdomain)
7. Backend: 401 Unauthorized (no cookie, no auth)
```

### Why Cross-Subdomain Cookies Fail

- **Browser Security:** Modern browsers reject wildcard domain cookies for security
- **Affects All Browsers:** Chrome, Edge, Firefox, Safari all enforce this
- **Cannot Be Disabled:** This is a browser-level security feature
- **Not Configurable:** No amount of backend configuration can override this

---

## Strategic Solution

### Architecture Change

**BEFORE (Broken):**
```
Browser at https://nexus-dev.ngrok.app
    ↓ Direct API call
Backend at https://recruitiq-be-dev.ngrok.app/api
    ↓ Sets cookie Domain=.ngrok.app
Browser REJECTS → Cookie stored with Domain=recruitiq-be-dev.ngrok.app
    ↓ Different subdomains
Browser DOES NOT send cookie on subsequent requests ❌
```

**AFTER (Fixed):**
```
Browser at https://nexus-dev.ngrok.app
    ↓ Relative API call to /api/*
Vite Proxy (same origin)
    ↓ Forwards to
Backend at https://recruitiq-be-dev.ngrok.app/api
    ↓ Sets cookie (no Domain attribute = same-origin)
Browser ACCEPTS → Cookie stored with Domain=nexus-dev.ngrok.app
    ↓ Same origin
Browser SENDS cookie on subsequent requests ✓
```

### Key Insight

**By using relative API paths and Vite proxy, cookies are set from the SAME ORIGIN (e.g., nexus-dev.ngrok.app), eliminating cross-subdomain issues entirely.**

---

## Implementation Plan

### Phase 1: Update Vite Configurations

#### 1.1 Nexus (apps/nexus/vite.config.ts)
- ✅ Already has proxy configured
- ✅ Update HMR for ngrok WebSocket
- Change proxy target from absolute URL to use environment variable

#### 1.2 PayLinQ (apps/paylinq/vite.config.ts)
- Add proxy configuration for `/api` paths
- Configure HMR for ngrok WebSocket
- Keep existing optimizeDeps configuration

#### 1.3 Portal (apps/portal/vite.config.js)
- ✅ Already has proxy configured
- Update proxy target to use ngrok backend
- Add HMR configuration for ngrok WebSocket

#### 1.4 RecruitIQ (apps/recruitiq/vite.config.js)
- ✅ Already has proxy configured
- Update proxy target to use ngrok backend
- Add HMR configuration for ngrok WebSocket

### Phase 2: Update Environment Variables

Remove `VITE_API_URL` from all apps, use relative paths instead:

#### 2.1 apps/nexus/.env
```env
# REMOVE: VITE_API_URL=https://recruitiq-be-dev.ngrok.app/api
# API calls will use relative paths (/api/*) proxied by Vite
```

#### 2.2 apps/paylinq/.env
```env
# REMOVE: VITE_API_URL=https://recruitiq-be-dev.ngrok.app/api
# API calls will use relative paths (/api/*) proxied by Vite
```

#### 2.3 apps/portal/.env
```env
# REMOVE: VITE_API_URL=https://recruitiq-be-dev.ngrok.app/api
# API calls will use relative paths (/api/*) proxied by Vite
```

#### 2.4 apps/recruitiq/.env
```env
# No VITE_API_URL - uses relative paths
```

### Phase 3: Update API Client Base URLs

#### 3.1 Nexus (apps/nexus/src/services/api.ts)
```typescript
// BEFORE: baseURL: import.meta.env.VITE_API_URL
// AFTER:  baseURL: '/api'
```

#### 3.2 PayLinQ (apps/paylinq/src/hooks/usePaylinqAPI.ts)
```typescript
// BEFORE: baseURL: import.meta.env.VITE_API_URL || '/api'
// AFTER:  baseURL: '/api'
```

#### 3.3 Portal (apps/portal/src/services/api.js)
```javascript
// BEFORE: baseURL: import.meta.env.VITE_API_URL
// AFTER:  baseURL: '/api'
```

#### 3.4 RecruitIQ (apps/recruitiq/src/services/api.js)
```javascript
// BEFORE: baseURL: import.meta.env.VITE_API_URL
// AFTER:  baseURL: '/api'
```

### Phase 4: Backend Cookie Configuration

Update backend to set cookies WITHOUT Domain attribute (same-origin):

#### 4.1 backend/src/middleware/auth.js
```javascript
// Set cookie without Domain attribute
// Browser will default to same-origin (e.g., nexus-dev.ngrok.app)
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax', // Changed from 'none' since same-origin
  maxAge: 24 * 60 * 60 * 1000,
  // NO Domain attribute - defaults to same origin
});
```

---

## Testing Protocol

### Test Sequence

1. **Clear All Data**
   ```javascript
   // In browser console
   document.cookie.split(";").forEach(c => {
     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Test Nexus**
   - Navigate to `https://nexus-dev.ngrok.app/login`
   - Login with `tenant@testcompany.com` / `Admin123!`
   - Check cookies: Should see `Domain=nexus-dev.ngrok.app` ✓
   - Navigate to dashboard
   - Check Network tab: `/api/products/nexus/employees` should return 200 ✓

3. **Test PayLinQ**
   - Navigate to `https://paylinq-dev.ngrok.app/login`
   - Login with `tenant@testcompany.com` / `Admin123!`
   - Check cookies: Should see `Domain=paylinq-dev.ngrok.app` ✓
   - Navigate to dashboard
   - Check Network tab: `/api/products/paylinq/worker-types` should return 200 ✓

4. **Test Portal**
   - Navigate to `https://portal-dev.ngrok.app/login`
   - Login with `admin@testcompany.com` / `Admin123!`
   - Check cookies: Should see `Domain=portal-dev.ngrok.app` ✓
   - Navigate to admin dashboard
   - Check Network tab: `/api/admin/products` should return 200 ✓

5. **Test RecruitIQ**
   - Navigate to `https://recruitiq-dev.ngrok.app/login`
   - Login with `tenant@testcompany.com` / `Admin123!`
   - Check cookies: Should see `Domain=recruitiq-dev.ngrok.app` ✓
   - Navigate to jobs page
   - Check Network tab: `/api/products/recruitiq/jobs` should return 200 ✓

### Expected Results

#### Cookie Storage
```
https://nexus-dev.ngrok.app
  ✓ Cookies: token (Domain=nexus-dev.ngrok.app; HttpOnly; Secure; SameSite=lax)

https://paylinq-dev.ngrok.app
  ✓ Cookies: token (Domain=paylinq-dev.ngrok.app; HttpOnly; Secure; SameSite=lax)

https://portal-dev.ngrok.app
  ✓ Cookies: token (Domain=portal-dev.ngrok.app; HttpOnly; Secure; SameSite=lax)

https://recruitiq-dev.ngrok.app
  ✓ Cookies: token (Domain=recruitiq-dev.ngrok.app; HttpOnly; Secure; SameSite=lax)
```

#### API Call Flow
```
Browser → https://nexus-dev.ngrok.app/api/products/nexus/employees
  ↓ Vite Proxy
Backend ← https://recruitiq-be-dev.ngrok.app/api/products/nexus/employees
  ↓ Response with Set-Cookie
Browser ← Cookie accepted (same origin)
  ↓ Subsequent requests
Browser → /api/* (Cookie sent automatically)
```

---

## Trade-offs and Considerations

### What We Gain
✅ **Cookie Authentication Works:** Cookies sent on same-origin requests  
✅ **Browser Security Compliance:** No domain attribute issues  
✅ **Simpler Configuration:** No complex CORS/domain setup  
✅ **Better Security:** Same-origin cookies are more secure  
✅ **Works in All Browsers:** No browser-specific issues

### What We Lose
❌ **No Cross-App SSO:** Each app requires separate login  
❌ **Session Per App:** Login to Nexus doesn't auth PayLinQ  
❌ **More User Friction:** Users must login to each product

### Future Enhancement: True SSO

To implement proper SSO across apps in the future:

**Option A: Shared Authentication Domain**
- Use single domain: `app.recruitiq.com`
- Subpaths for products: `/nexus`, `/paylinq`, `/portal`, `/recruitiq`
- Backend as reverse proxy
- Cookies work across all paths (same domain)

**Option B: OAuth 2.0 / OIDC**
- Implement OAuth 2.0 authorization server
- Each app redirects to auth server for login
- Auth server sets tokens in its domain
- Apps use authorization codes to get access tokens
- Standard enterprise SSO pattern

**Option C: Token-Based Auth (with XSS protection)**
- Use short-lived access tokens in memory
- Long-lived refresh tokens in httpOnly cookies
- Token refresh endpoint for each app domain
- More complex but enables SSO-like experience

**For now:** Per-app authentication is acceptable for development phase.

---

## Success Criteria

### Critical (Must Pass)
- ✅ All 4 apps login successfully
- ✅ Cookies accepted and stored by browser
- ✅ API calls return 200 (not 401)
- ✅ Dashboard data loads correctly
- ✅ Token refresh works
- ✅ Logout clears cookies
- ✅ No console errors related to auth

### Nice to Have
- ⚠️ CSRF token handling (if needed)
- ⚠️ Session timeout warnings
- ⚠️ Remember me functionality
- ⚠️ Auto-refresh before token expiry

---

## Rollback Plan

If this solution doesn't work:

1. **Revert Vite Configs:** Restore original proxy configurations
2. **Restore Environment Variables:** Re-add VITE_API_URL to all apps
3. **Revert API Client Base URLs:** Use environment variables again
4. **Backend Cookie Config:** Restore Domain=.ngrok.app (if reverted)
5. **Alternative:** Implement Option B or C from Future Enhancement section

---

## Implementation Checklist

- [ ] Update apps/nexus/vite.config.ts
- [ ] Update apps/paylinq/vite.config.ts
- [ ] Update apps/portal/vite.config.js
- [ ] Update apps/recruitiq/vite.config.js
- [ ] Update apps/nexus/.env
- [ ] Update apps/paylinq/.env
- [ ] Update apps/portal/.env
- [ ] Update apps/recruitiq/.env (verify)
- [ ] Update apps/nexus/src/services/api.ts
- [ ] Update apps/paylinq/src/hooks/usePaylinqAPI.ts
- [ ] Update apps/portal/src/services/api.js
- [ ] Update apps/recruitiq/src/services/api.js
- [ ] Update backend cookie configuration
- [ ] Restart all servers
- [ ] Clear browser data
- [ ] Test Nexus login and API calls
- [ ] Test PayLinQ login and API calls
- [ ] Test Portal login and API calls
- [ ] Test RecruitIQ login and API calls
- [ ] Verify WebSocket (HMR) works
- [ ] Document any issues encountered
- [ ] Update team on changes

---

## Files Changed

### Vite Configurations (4 files)
1. `apps/nexus/vite.config.ts`
2. `apps/paylinq/vite.config.ts`
3. `apps/portal/vite.config.js`
4. `apps/recruitiq/vite.config.js`

### Environment Files (4 files)
5. `apps/nexus/.env`
6. `apps/paylinq/.env`
7. `apps/portal/.env`
8. `apps/recruitiq/.env`

### API Clients (4 files)
9. `apps/nexus/src/services/api.ts`
10. `apps/paylinq/src/hooks/usePaylinqAPI.ts`
11. `apps/portal/src/services/api.js`
12. `apps/recruitiq/src/services/api.js`

### Backend (1 file)
13. `backend/src/middleware/auth.js` (cookie configuration)

**Total:** 13 files

---

## Next Steps

1. Review this document
2. Approve implementation plan
3. Execute Phase 1 (Vite configs)
4. Execute Phase 2 (Environment vars)
5. Execute Phase 3 (API clients)
6. Execute Phase 4 (Backend cookies)
7. Test systematically
8. Document results
9. Plan future SSO implementation if needed
