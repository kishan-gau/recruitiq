# Authentication Fix - Quick Testing Guide

**Status:** Implementation Complete  
**Date:** January 18, 2025

---

## What Was Fixed

### The Problem
- Browser rejected `Domain=.ngrok.app` cookies due to security policies
- Cookies stored with exact domain (e.g., `recruitiq-be-dev.ngrok.app`)
- API calls from `nexus-dev.ngrok.app` didn't include cookies
- All authenticated requests returned 401 Unauthorized

### The Solution
- **Use relative API paths** (`/api/*`) instead of absolute URLs
- **Vite proxy** forwards requests to backend ngrok tunnel
- **Cookies set from same origin** (e.g., `nexus-dev.ngrok.app`)
- **Browser accepts and sends cookies** (same-origin principle)

---

## Testing Instructions

### Prerequisites

1. **Stop All Servers**
   ```powershell
   # Stop all running dev servers and backend
   ```

2. **Start All Servers**
   ```powershell
   # In RecruitIQ root
   .\start-dev.ps1
   
   # This starts:
   # - Backend (port 4000, ngrok: recruitiq-be-dev.ngrok.app)
   # - Nexus (port 5175, ngrok: nexus-dev.ngrok.app)
   # - PayLinQ (port 5174, ngrok: paylinq-dev.ngrok.app)
   # - Portal (port 5176, ngrok: portal-dev.ngrok.app)
   # - RecruitIQ (port 5173, ngrok: recruitiq-dev.ngrok.app)
   ```

3. **Clear Browser Data**
   ```javascript
   // Open browser console on any ngrok app
   // Run this to clear everything:
   document.cookie.split(";").forEach(c => {
     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

---

## Test Sequence

### Test 1: Nexus (HRIS)

**URL:** `https://nexus-dev.ngrok.app/login`

**Steps:**
1. Navigate to login page
2. Login with:
   - Email: `tenant@testcompany.com`
   - Password: `Admin123!`
3. **Check Cookies** (DevTools → Application → Cookies):
   - Should see `token` cookie
   - **Domain:** `nexus-dev.ngrok.app` (NOT `.ngrok.app`) ✓
   - **HttpOnly:** ✓
   - **Secure:** ✓
   - **SameSite:** `lax` or `none`
4. Navigate to **Dashboard**
5. **Check Network Tab**:
   - Request: `https://nexus-dev.ngrok.app/api/products/nexus/employees`
   - Status: **200 OK** ✓
   - Response: Employee data loads ✓
6. **Check Console**: No auth errors ✓

**Expected Result:** ✅ Login works, cookies accepted, API calls succeed

---

### Test 2: PayLinQ (Payroll)

**URL:** `https://paylinq-dev.ngrok.app/login`

**Steps:**
1. Navigate to login page
2. Login with:
   - Email: `tenant@testcompany.com`
   - Password: `Admin123!`
3. **Check Cookies**:
   - Should see `token` cookie
   - **Domain:** `paylinq-dev.ngrok.app` ✓
4. Navigate to **Dashboard** or **Worker Types**
5. **Check Network Tab**:
   - Request: `https://paylinq-dev.ngrok.app/api/products/paylinq/worker-types`
   - Status: **200 OK** ✓
   - Response: Worker type data loads ✓

**Expected Result:** ✅ Login works, cookies accepted, API calls succeed

---

### Test 3: Portal (Admin)

**URL:** `https://portal-dev.ngrok.app/login`

**Steps:**
1. Navigate to login page
2. Login with:
   - Email: `admin@testcompany.com` (admin user)
   - Password: `Admin123!`
3. **Check Cookies**:
   - Should see `token` cookie
   - **Domain:** `portal-dev.ngrok.app` ✓
4. Navigate to **Admin Dashboard** or **Products**
5. **Check Network Tab**:
   - Request: `https://portal-dev.ngrok.app/api/admin/products`
   - Status: **200 OK** ✓
   - Response: Admin data loads ✓

**Expected Result:** ✅ Login works, cookies accepted, API calls succeed

---

### Test 4: RecruitIQ (ATS)

**URL:** `https://recruitiq-dev.ngrok.app/login`

**Steps:**
1. Navigate to login page
2. Login with:
   - Email: `tenant@testcompany.com`
   - Password: `Admin123!`
3. **Check Cookies**:
   - Should see `token` cookie
   - **Domain:** `recruitiq-dev.ngrok.app` ✓
4. Navigate to **Jobs** or **Candidates**
5. **Check Network Tab**:
   - Request: `https://recruitiq-dev.ngrok.app/api/products/recruitiq/jobs`
   - Status: **200 OK** ✓
   - Response: Jobs data loads ✓

**Expected Result:** ✅ Login works, cookies accepted, API calls succeed

---

## Verification Checklist

### Critical Success Criteria

- [ ] **Nexus:** Login works, dashboard loads data
- [ ] **PayLinQ:** Login works, worker types load
- [ ] **Portal:** Login works, admin data loads
- [ ] **RecruitIQ:** Login works, jobs load
- [ ] **Cookies:** All have correct domain (app-specific, not `.ngrok.app`)
- [ ] **API Calls:** All return 200 (not 401)
- [ ] **Console:** No authentication errors
- [ ] **HMR:** Hot module reload works (edit a file, see instant update)

### What Changed

**Browser Requests:**
```
BEFORE: Browser → https://recruitiq-be-dev.ngrok.app/api/* (cross-origin, no cookies)
AFTER:  Browser → https://nexus-dev.ngrok.app/api/* (same-origin, cookies sent) ✓
```

**Cookie Storage:**
```
BEFORE: Domain=recruitiq-be-dev.ngrok.app (rejected by browser)
AFTER:  Domain=nexus-dev.ngrok.app (accepted, same-origin) ✓
```

**Proxy Flow:**
```
Browser → /api/products/nexus/employees (relative path)
  ↓ Vite Proxy
Backend ← https://recruitiq-be-dev.ngrok.app/api/products/nexus/employees
  ↓ Response
Browser ← Cookie: token (Domain=nexus-dev.ngrok.app) ✓
```

---

## Troubleshooting

### Issue: Still Getting 401 Errors

**Check:**
1. Did you restart ALL servers?
2. Did you clear browser cookies/storage?
3. Are cookies being set? (Check DevTools → Application → Cookies)
4. What is the cookie domain? (Should be app-specific, e.g., `nexus-dev.ngrok.app`)
5. Check Network tab: Are cookies being sent with requests?

**Debug:**
```javascript
// In browser console
console.log('Cookies:', document.cookie);
```

### Issue: WebSocket Errors (HMR)

**Symptoms:** `WebSocket connection failed` in console

**Check:**
1. Vite config has HMR configured for ngrok
2. Protocol is `wss://` (not `ws://`)
3. Port is 443
4. Host matches ngrok domain (e.g., `nexus-dev.ngrok.app`)

**Expected in DevTools:**
```
[vite] connected.
[vite] connecting to wss://nexus-dev.ngrok.app:443/__vite_hmr
```

### Issue: Cookies Not Being Sent

**Check:**
1. Cookie domain matches current page domain
2. `withCredentials: true` in API client (already set)
3. Cookie is not expired
4. Cookie SameSite attribute is compatible

**Verify in Network Tab:**
```
Request Headers:
  Cookie: token=eyJhbGc...
```

If missing, check cookie settings in Application tab.

---

## Known Trade-offs

### ✅ What Works Now
- Cookie-based authentication in each app
- Same-origin cookies (secure and reliable)
- API calls succeed with authentication
- WebSocket (HMR) works via ngrok

### ⚠️ What Doesn't Work (By Design)
- **No Cross-App SSO:** Each app requires separate login
  - Login to Nexus → NOT authenticated in PayLinQ
  - Must login separately to each app
- **Sessions Are Per-App:** Separate session per domain
  - Nexus session: `nexus-dev.ngrok.app`
  - PayLinQ session: `paylinq-dev.ngrok.app`

### Future Enhancement
To enable true SSO across apps, consider:
- **Shared Authentication Domain:** Use single domain with subpaths
- **OAuth 2.0 / OIDC:** Centralized auth server
- **Token-Based Auth:** With refresh tokens in httpOnly cookies

For now, per-app authentication is acceptable for development.

---

## Quick Reference

### Test Credentials

**Tenant User:**
- Email: `tenant@testcompany.com`
- Password: `Admin123!`
- Apps: Nexus, PayLinQ, RecruitIQ

**Admin User:**
- Email: `admin@testcompany.com`
- Password: `Admin123!`
- Apps: Portal (admin only)

### URLs

| App | URL | Port |
|-----|-----|------|
| Nexus | https://nexus-dev.ngrok.app | 5175 |
| PayLinQ | https://paylinq-dev.ngrok.app | 5174 |
| Portal | https://portal-dev.ngrok.app | 5176 |
| RecruitIQ | https://recruitiq-dev.ngrok.app | 5173 |
| Backend | https://recruitiq-be-dev.ngrok.app | 4000 |

### Expected Cookie Format

```
Name:     token
Value:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Domain:   nexus-dev.ngrok.app (app-specific)
Path:     /
HttpOnly: true
Secure:   true
SameSite: lax or none
```

---

## Success Metrics

### All Tests Pass ✅
- 4 apps × Login = 4 successes
- 4 apps × Data Load = 4 successes
- 4 apps × Cookie Storage = 4 successes
- 4 apps × API Calls = 4 successes

**Total:** 16/16 tests passing

### If Any Test Fails
1. Check this guide's troubleshooting section
2. Review `AUTH_FIX_IMPLEMENTATION.md` for detailed architecture
3. Verify all 8 files were updated correctly
4. Check server logs for errors

---

## Report Results

After testing, document results:

**✅ WORKING:**
- [ ] Nexus: Login + Data
- [ ] PayLinQ: Login + Data
- [ ] Portal: Login + Data
- [ ] RecruitIQ: Login + Data

**❌ ISSUES:**
- [ ] Describe any problems encountered

**🔧 RESOLUTION:**
- [ ] Document how issues were resolved

---

**Ready to test!** Follow the sequence above and report results.
