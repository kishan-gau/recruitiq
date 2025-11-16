# Single Sign-On (SSO) Implementation Guide

## Overview

RecruitIQ platform now supports **Single Sign-On (SSO)** for tenant-facing applications, allowing users to log in once and access all enabled products without re-authenticating.

**SSO-Enabled Apps (Tenant Users):**
- PayLinQ (payroll management)
- Nexus (HRIS)
- RecruitIQ (recruitment)
- ScheduleHub (scheduling - when implemented)

**Non-SSO Apps (Platform Users):**
- Portal (platform administration - isolated for security)

## Architecture

### Cookie-Based SSO

SSO is implemented using **shared httpOnly cookies** across subdomains:

```
Production Environment:
┌─────────────────────────────────────────────────────────────────┐
│ Tenant Apps (SSO Enabled - Shared Domain)                       │
├─────────────────────────────────────────────────────────────────┤
│ paylinq.recruitiq.com    → tenant_access_token (.recruitiq.com) │
│ nexus.recruitiq.com      → tenant_access_token (.recruitiq.com) │
│ recruitiq.recruitiq.com  → tenant_access_token (.recruitiq.com) │
│ schedulehub.recruitiq.com→ tenant_access_token (.recruitiq.com) │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Platform App (No SSO - Isolated Domain)                         │
├─────────────────────────────────────────────────────────────────┤
│ portal.recruitiq.com → platform_access_token (portal.recruitiq) │
└─────────────────────────────────────────────────────────────────┘
```

### Cookie Configuration

**Tenant Cookies (SSO Enabled):**
```javascript
{
  name: 'tenant_access_token',
  domain: '.recruitiq.com',  // Leading dot = all subdomains
  sameSite: 'lax',           // Allows cross-subdomain navigation
  httpOnly: true,            // JavaScript cannot access (XSS protection)
  secure: true,              // HTTPS only in production
  maxAge: '15m'              // 15 minutes
}
```

**Platform Cookies (Isolated):**
```javascript
{
  name: 'platform_access_token',
  domain: 'portal.recruitiq.com',  // Specific domain only
  sameSite: 'strict',              // No cross-site requests
  httpOnly: true,
  secure: true,
  maxAge: '15m'
}
```

## SSO User Flow

### Login Flow

```
1. User visits nexus.recruitiq.com
2. Not authenticated → Redirect to /login
3. User enters credentials
4. Backend validates and sets cookies:
   - tenant_access_token (domain: .recruitiq.com)
   - tenant_refresh_token (domain: .recruitiq.com)
5. User sees Nexus dashboard

6. User clicks link to paylinq.recruitiq.com
7. Browser automatically sends tenant_access_token cookie
8. PayLinQ backend validates cookie → User is logged in!
9. User sees PayLinQ dashboard (NO LOGIN REQUIRED)
```

### Logout Flow

```
1. User clicks logout in PayLinQ
2. Backend clears cookies:
   - tenant_access_token (domain: .recruitiq.com)
   - tenant_refresh_token (domain: .recruitiq.com)
3. User redirected to PayLinQ login page

4. User tries to visit nexus.recruitiq.com
5. No valid cookie → Redirect to /login
6. SSO logout is complete across all apps
```

## Development Environment Setup

### Problem: Localhost SSO

**Challenge:** Different ports cannot share cookies:
- `localhost:5174` (PayLinQ) ≠ `localhost:5175` (Nexus)
- Browser treats these as different origins

**Solution:** Use nginx reverse proxy or hosts file

### Option 1: Nginx Reverse Proxy (Recommended)

1. **Install nginx:**
   ```bash
   # macOS
   brew install nginx
   
   # Ubuntu/Debian
   sudo apt install nginx
   
   # Windows (use WSL or download from nginx.org)
   ```

2. **Create nginx config:**
   ```nginx
   # /etc/nginx/sites-available/recruitiq-dev
   
   server {
       listen 80;
       server_name app.local;
   
       # PayLinQ
       location /paylinq/ {
           proxy_pass http://localhost:5174/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_cookie_domain localhost app.local;
           proxy_cookie_path / /;
       }
   
       # Nexus
       location /nexus/ {
           proxy_pass http://localhost:5175/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_cookie_domain localhost app.local;
           proxy_cookie_path / /;
       }
   
       # RecruitIQ
       location /recruitiq/ {
           proxy_pass http://localhost:5176/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_cookie_domain localhost app.local;
           proxy_cookie_path / /;
       }
   
       # Backend API
       location /api/ {
           proxy_pass http://localhost:3001/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Add to /etc/hosts:**
   ```bash
   127.0.0.1 app.local
   ```

4. **Enable and reload nginx:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/recruitiq-dev /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo nginx -s reload
   ```

5. **Update .env files:**
   ```bash
   # Backend .env
   TENANT_COOKIE_DOMAIN=app.local
   
   # Frontend .env (each app)
   VITE_API_URL=http://app.local/api
   ```

6. **Access apps:**
   - http://app.local/paylinq
   - http://app.local/nexus
   - http://app.local/recruitiq

### Option 2: Subdomain Development (Alternative)

1. **Add subdomains to /etc/hosts:**
   ```bash
   127.0.0.1 paylinq.local
   127.0.0.1 nexus.local
   127.0.0.1 recruitiq.local
   ```

2. **Update Vite config for each app:**
   ```javascript
   // apps/paylinq/vite.config.ts
   export default defineConfig({
     server: {
       port: 5174,
       host: 'paylinq.local'
     }
   });
   ```

3. **Update .env:**
   ```bash
   # Backend .env
   TENANT_COOKIE_DOMAIN=.local
   ```

4. **Access apps:**
   - http://paylinq.local:5174
   - http://nexus.local:5175
   - http://recruitiq.local:5176

## Production Deployment

### DNS Configuration

```
A     paylinq.recruitiq.com     → Load Balancer IP
A     nexus.recruitiq.com       → Load Balancer IP
A     recruitiq.recruitiq.com   → Load Balancer IP
A     schedulehub.recruitiq.com → Load Balancer IP
A     portal.recruitiq.com      → Load Balancer IP
A     api.recruitiq.com         → Backend API IP
```

### Environment Variables

```bash
# Backend Production .env
NODE_ENV=production
TENANT_COOKIE_DOMAIN=.recruitiq.com
PLATFORM_COOKIE_DOMAIN=portal.recruitiq.com
```

### SSL/TLS Configuration

**Required:** SSL certificates for:
- `*.recruitiq.com` (wildcard for all subdomains)
- Or individual certs for each subdomain

**Let's Encrypt Example:**
```bash
certbot certonly --nginx \
  -d paylinq.recruitiq.com \
  -d nexus.recruitiq.com \
  -d recruitiq.recruitiq.com \
  -d portal.recruitiq.com
```

### Nginx Production Config

```nginx
# Production nginx configuration
server {
    listen 443 ssl http2;
    server_name *.recruitiq.com;
    
    ssl_certificate /etc/letsencrypt/live/recruitiq.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/recruitiq.com/privkey.pem;
    
    # Tenant apps routing
    location / {
        proxy_pass http://tenant_apps_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cookie domain rewriting
        proxy_cookie_domain tenant_apps .recruitiq.com;
    }
}

# Separate config for platform app (no SSO)
server {
    listen 443 ssl http2;
    server_name portal.recruitiq.com;
    
    ssl_certificate /etc/letsencrypt/live/recruitiq.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/recruitiq.com/privkey.pem;
    
    location / {
        proxy_pass http://portal_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Isolated cookie domain
        proxy_cookie_domain portal_backend portal.recruitiq.com;
    }
}
```

## Security Considerations

### Cookie Security

✅ **Implemented:**
- `httpOnly: true` - JavaScript cannot access (XSS protection)
- `secure: true` - HTTPS only in production
- `sameSite: 'lax'` - Protects against CSRF while allowing SSO
- Short-lived access tokens (15 minutes)
- Refresh token rotation

### Domain Isolation

- **Tenant apps** share `.recruitiq.com` domain → SSO enabled
- **Platform app** uses `portal.recruitiq.com` → Isolated, no SSO
- Different cookie names prevent conflicts

### Session Management

- Session timeout: 15 minutes of inactivity
- Absolute timeout: 24 hours
- Refresh tokens: 7 days (30 days with "Remember Me")
- Manual session revocation on logout
- Database-backed refresh tokens (can be revoked server-side)

### CSRF Protection

- CSRF tokens required for all state-changing operations
- Tokens synchronized across SSO apps
- Token validation in backend middleware

## Testing SSO

### Manual Testing Checklist

1. **Login to PayLinQ:**
   - [ ] Navigate to PayLinQ
   - [ ] Enter valid credentials
   - [ ] Verify successful login and dashboard display

2. **Navigate to Nexus (SSO Test):**
   - [ ] Click link or navigate to Nexus
   - [ ] Should be **automatically logged in** (no login screen)
   - [ ] Verify user data is correct
   - [ ] Check enabled products include 'nexus'

3. **Navigate to RecruitIQ (SSO Test):**
   - [ ] Navigate to RecruitIQ
   - [ ] Should be **automatically logged in**
   - [ ] Verify correct user session

4. **Logout from Nexus:**
   - [ ] Click logout in Nexus
   - [ ] Redirected to login page

5. **Verify Logout Propagated:**
   - [ ] Navigate to PayLinQ
   - [ ] Should be **logged out** (redirect to login)
   - [ ] Navigate to RecruitIQ
   - [ ] Should be **logged out** (redirect to login)

6. **Platform Isolation Test:**
   - [ ] Login to Portal (platform user)
   - [ ] Navigate to Nexus
   - [ ] Should **NOT** be logged in (different cookies)
   - [ ] Verify tenant apps remain isolated from platform auth

### Automated Testing

```javascript
// E2E test example (Playwright/Cypress)
describe('SSO Flow', () => {
  it('should maintain session across tenant apps', async () => {
    // Login to PayLinQ
    await page.goto('http://app.local/paylinq/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Navigate to Nexus - should be auto-logged in
    await page.goto('http://app.local/nexus');
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Verify same user session
    const nexusEmail = await page.locator('[data-testid="user-email"]').textContent();
    expect(nexusEmail).toBe('test@example.com');
  });
  
  it('should logout from all apps simultaneously', async () => {
    // Login and navigate to Nexus
    // ... (login code)
    
    // Logout from Nexus
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL(/.*\/login/);
    
    // Verify PayLinQ also logged out
    await page.goto('http://app.local/paylinq/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
```

## Troubleshooting

### SSO Not Working

**Symptom:** User has to login separately to each app

**Possible Causes:**

1. **Different domains in development:**
   - Check if using localhost with different ports
   - Solution: Set up nginx reverse proxy or use subdomains

2. **Cookie domain not set:**
   - Check `TENANT_COOKIE_DOMAIN` environment variable
   - Should be `.recruitiq.com` in production, `app.local` or `.local` in dev

3. **SameSite too restrictive:**
   - Check `sameSite` setting in AUTH_CONFIG
   - Should be `'lax'` for tenant cookies (not `'strict'`)

4. **Cookies not being sent:**
   - Check Network tab in browser DevTools
   - Verify `withCredentials: true` in API client
   - Check for CORS issues

### Logout Not Propagating

**Symptom:** Logging out of one app doesn't logout others

**Possible Causes:**

1. **Cookie not cleared properly:**
   - Check backend logout endpoint clears cookies with correct domain
   - Verify `getCookieClearOptions()` uses same domain as set

2. **Frontend not clearing local state:**
   - Each app's AuthContext should clear user state on 401 errors
   - Check if API interceptor handles 401 globally

### Platform-Tenant Isolation Issues

**Symptom:** Portal users can access tenant apps or vice versa

**Possible Causes:**

1. **Cookie names not separated:**
   - Verify `platform_access_token` vs `tenant_access_token`
   - Check AUTH_CONFIG has correct cookie names

2. **Token type not validated:**
   - Backend middleware should check `decoded.type === 'tenant'`
   - Should reject tokens with wrong type

## Migration Notes

### Backward Compatibility

**⚠️ Breaking Change:** This migration changes cookie names from `accessToken`/`refreshToken` to `tenant_access_token`/`platform_access_token`.

**Impact:**
- All existing sessions will be invalidated
- Users will need to login again
- No data loss, just session reset

**Migration Steps:**
1. Deploy backend changes first
2. Deploy frontend changes
3. Notify users of required re-login
4. Monitor for issues in first 24 hours

### Rollback Plan

If issues arise:

1. **Revert backend changes:**
   ```bash
   git revert <commit-hash>
   ```

2. **Redeploy previous version:**
   ```bash
   git checkout pre-sso-migration-tag
   kubectl rollout undo deployment/backend
   ```

3. **Clear cookies on client:**
   ```javascript
   // Emergency cookie cleanup
   document.cookie = 'tenant_access_token=; Max-Age=0';
   document.cookie = 'tenant_refresh_token=; Max-Age=0';
   ```

## References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [IETF RFC 6265: HTTP State Management](https://datatracker.ietf.org/doc/html/rfc6265)

## Support

For issues or questions:
- Check [AUTH_MIGRATION_PLAN.md](./AUTH_MIGRATION_PLAN.md) for detailed migration information
- Review [SECURITY_STANDARDS.md](./docs/SECURITY_STANDARDS.md) for security best practices
- Contact platform team for production issues
