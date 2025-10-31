# RecruitIQ Backend - Comprehensive Security Audit & Implementation Plan
**Date**: October 31, 2025  
**Branch**: feature/security-hardening-mfa  
**Auditor**: Security Review Team

---

## 🔍 EXECUTIVE SUMMARY

This document outlines vulnerabilities discovered, security enhancements needed, and implementation plan for:
1. **Security Hardening** - Fix critical vulnerabilities
2. **MFA Implementation** - Add Two-Factor Authentication  
3. **Comprehensive Testing** - 95%+ code coverage

---

## 🚨 CRITICAL VULNERABILITIES FOUND

### 1. **MFA Implementation Incomplete** (CRITICAL)
**Severity**: HIGH  
**Status**: 🔴 INCOMPLETE

**Issue**:
- Database has `mfa_enabled` and `mfa_secret` fields
- No MFA generation, verification, or recovery endpoints
- No TOTP library installed
- No backup codes mechanism
- No rate limiting on MFA attempts

**Impact**: Users cannot enable 2FA, accounts vulnerable to credential theft

**Required Actions**:
- Install `speakeasy` and `qrcode` packages
- Create MFA setup/verify/disable endpoints
- Implement backup codes with encryption
- Add rate limiting for MFA verification attempts
- Create recovery flow for lost MFA devices

---

### 2. **SQL Injection Risk in RLS Context Setting** (HIGH)
**Severity**: HIGH  
**Status**: 🟡 PARTIALLY MITIGATED

**Location**: `middleware/auth.js:134`

```javascript
// CURRENT CODE - UUID validated but still using string interpolation
await pool.query(`SET LOCAL app.current_organization_id = '${user.organization_id}'`);
```

**Issue**: While UUID format is validated, using string interpolation for SQL is dangerous practice

**Fix**: Use parameterized queries with `current_setting()`
```javascript
// BETTER APPROACH
await pool.query(
  "SELECT set_config('app.current_organization_id', $1, true)",
  [user.organization_id]
);
```

---

### 3. **JWT Secret in Config** (MEDIUM)
**Severity**: MEDIUM  
**Status**: 🟡 NEEDS VERIFICATION

**Issue**: JWT secrets must be cryptographically secure

**Required Check**:
```javascript
// In config/index.js - verify these are properly set
config.jwt.accessSecret  // Must be 32+ random bytes
config.jwt.refreshSecret // Must be 32+ random bytes, different from access
```

**Required Actions**:
- Validate JWT secrets are 256+ bits (32+ bytes)
- Ensure they're different for access and refresh
- Add rotation mechanism
- Document secret generation in deployment docs

---

### 4. **Password Reset Token Not Implemented** (MEDIUM)
**Severity**: MEDIUM  
**Status**: 🔴 MISSING

**Issue**: No password reset flow exists

**Required Implementation**:
- Generate secure reset tokens (crypto.randomBytes(32))
- Store hashed tokens in database with expiry
- Email token link to user
- Verify token and update password
- Invalidate all user sessions on password reset
- Rate limit reset requests per email

---

### 5. **No Account Lockout on Failed Login** (MEDIUM)
**Severity**: MEDIUM  
**Status**: 🟡 SERVICE EXISTS BUT NOT INTEGRATED

**Location**: `services/accountLockout.js` exists but not used in login

**Issue**: 
- Service created but not called in `authController.js`
- No progressive delays for failed attempts
- No CAPTCHA trigger after multiple failures

**Required Actions**:
- Integrate accountLockout in login endpoint
- Implement progressive delays (1s, 2s, 5s, 10s, 30s)
- Add CAPTCHA requirement after 3 failed attempts
- Add email notification on account lockout

---

### 6. **Missing Input Sanitization** (MEDIUM)
**Severity**: MEDIUM  
**Status**: 🟡 PARTIAL

**Issue**: 
- Joi validation exists for auth endpoints
- Many other endpoints missing validation
- No XSS protection on user-generated content
- No SQL injection protection documentation

**Required Actions**:
- Add Joi schemas for ALL endpoints
- Implement DOMPurify for HTML content
- Document parameterized query usage
- Create input sanitization utility
- Add validation middleware to all routes

---

### 7. **Session Management Gaps** (MEDIUM)
**Severity**: MEDIUM  
**Status**: 🟡 PARTIAL

**Issues**:
- Token blacklist exists but no automatic cleanup
- No session limit per user
- No device fingerprinting
- No "logout all devices" functionality
- Refresh tokens stored but no rotation

**Required Actions**:
- Implement refresh token rotation
- Add session limit (max 5 devices per user)
- Add device/browser fingerprinting
- Create "active sessions" management UI
- Automatic cleanup of expired tokens

---

### 8. **No Rate Limiting on Critical Endpoints** (LOW)
**Severity**: LOW  
**Status**: 🟡 PARTIAL

**Issue**:
- Global and auth rate limiting exist
- Missing rate limiting on:
  - Password reset
  - Email verification
  - MFA verification
  - API key generation
  - File uploads per user

**Required Actions**:
- Add endpoint-specific rate limits
- Implement per-user rate limiting
- Add sliding window algorithm
- Create rate limit bypass for testing

---

### 9. **Insufficient Logging & Monitoring** (LOW)
**Severity**: LOW  
**Status**: 🟡 PARTIAL

**Issues**:
- Security events logged but no alerting
- No anomaly detection
- No audit trail for permission changes
- No login notification emails

**Required Actions**:
- Implement email notifications for:
  - New device login
  - Password change
  - MFA enabled/disabled
  - Permission changes
- Add anomaly detection (unusual location, time)
- Create audit log for all security events
- Integrate with Datadog/CloudWatch alerts

---

### 10. **Missing Security Headers** (LOW)
**Severity**: LOW  
**Status**: ✅ IMPLEMENTED (needs verification)

**Status**: Helmet middleware configured

**Verification Needed**:
- CSP headers properly configured
- HSTS enabled in production
- X-Frame-Options set correctly
- Referrer-Policy configured

---

## 🛡️ MFA IMPLEMENTATION PLAN

### Phase 1: Setup & Configuration (2 days)

#### 1.1 Install Dependencies
```bash
npm install speakeasy qrcode
npm install --save-dev @types/speakeasy @types/qrcode
```

#### 1.2 Database Migration
```sql
-- Add MFA fields (already exist, verify structure)
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled_at TIMESTAMP;
```

#### 1.3 Create MFA Service
Location: `src/services/mfaService.js`

Features:
- Generate TOTP secret
- Generate QR code for authenticator apps
- Verify TOTP token
- Generate backup codes (8 codes, 8 characters each)
- Validate backup codes
- Rate limiting (5 attempts per 5 minutes)

---

### Phase 2: API Endpoints (3 days)

#### 2.1 MFA Setup Flow

**POST** `/api/auth/mfa/setup`
- Authenticated users only
- Generate secret and QR code
- Return QR code data URL and secret (for manual entry)
- Don't enable MFA yet (pending verification)

**POST** `/api/auth/mfa/verify-setup`
- Verify TOTP code from authenticator
- Enable MFA on user account
- Generate and return backup codes
- Send confirmation email

**POST** `/api/auth/mfa/disable`
- Require current password
- Require TOTP code or backup code
- Disable MFA
- Invalidate all sessions
- Send security notification email

#### 2.2 MFA Login Flow

**POST** `/api/auth/login` (Modified)
- If user has MFA enabled:
  - Don't issue full access token
  - Return `mfa_required: true` with temporary MFA token
- If no MFA, proceed as normal

**POST** `/api/auth/mfa/verify`
- Accept temporary MFA token + TOTP code
- Verify TOTP
- Issue full access token
- Update last MFA verification timestamp

#### 2.3 MFA Recovery Flow

**POST** `/api/auth/mfa/use-backup-code`
- Accept backup code
- Mark code as used
- Issue access token
- Send security alert email
- Show warning about remaining codes

**POST** `/api/auth/mfa/regenerate-backup-codes`
- Require password + TOTP code
- Invalidate old codes
- Generate new backup codes
- Return new codes

---

### Phase 3: Frontend Integration (Not in scope, but document)

Required Portal Changes:
- MFA setup page in user settings
- QR code display
- TOTP code verification input
- Backup codes display and download
- MFA login challenge screen

---

## 🧪 COMPREHENSIVE TESTING PLAN

### Test Categories & Target Coverage

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| Unit Tests | 45% | 85% | HIGH |
| Integration Tests | 20% | 80% | HIGH |
| Security Tests | 30% | 95% | CRITICAL |
| E2E Tests | 0% | 60% | MEDIUM |
| **Overall** | **35%** | **80%**+ | **HIGH** |

---

### Unit Tests Required

#### 1. Authentication & Authorization (Priority: CRITICAL)
Location: `tests/unit/auth/`

**Files to Create**:
- `authController.test.js`
  - [ ] Registration validation
  - [ ] Email uniqueness check
  - [ ] Password hashing
  - [ ] Token generation
  - [ ] Login success/failure cases
  - [ ] Rate limiting on login
  - [ ] Account lockout integration
  - [ ] MFA flow

- `auth.middleware.test.js`
  - [ ] Token validation
  - [ ] Expired token handling
  - [ ] Blacklisted token rejection
  - [ ] Permission checking (OR logic)
  - [ ] Permission checking (AND logic)
  - [ ] Platform user validation
  - [ ] Organization context setting
  - [ ] Optional auth behavior

- `mfaService.test.js` (NEW)
  - [ ] Secret generation
  - [ ] QR code generation
  - [ ] TOTP validation (valid codes)
  - [ ] TOTP validation (expired codes)
  - [ ] TOTP validation (wrong codes)
  - [ ] Backup code generation
  - [ ] Backup code usage
  - [ ] Rate limiting enforcement

#### 2. User Management (Priority: HIGH)
Location: `tests/unit/users/`

**Files to Create**:
- `User.model.test.js`
  - [ ] Create user with validation
  - [ ] Find by email
  - [ ] Find by ID with permissions
  - [ ] Update user
  - [ ] Soft delete
  - [ ] Password comparison
  - [ ] Permission aggregation

- `userController.test.js`
  - [ ] Get user profile
  - [ ] Update profile
  - [ ] Change password
  - [ ] Upload avatar
  - [ ] Email verification

#### 3. Role & Permission Management (Priority: HIGH)
Location: `tests/unit/rbac/`

**Files to Create**:
- `rolesPermissions.routes.test.js`
  - [ ] Create role
  - [ ] Update role permissions
  - [ ] Delete role (with users check)
  - [ ] List roles with permissions
  - [ ] Create permission
  - [ ] Update permission
  - [ ] Delete permission (cascade check)

#### 4. Security Services (Priority: CRITICAL)
Location: `tests/unit/security/`

**Files to Create**:
- `tokenBlacklist.test.js`
  - [ ] Add token to blacklist
  - [ ] Check blacklisted token
  - [ ] Blacklist all user tokens
  - [ ] TTL expiration

- `accountLockout.test.js`
  - [ ] Track failed login
  - [ ] Check if locked
  - [ ] Progressive delays
  - [ ] Reset on success
  - [ ] Automatic unlock after time

- `ipTracking.test.js`
  - [ ] Record login IP
  - [ ] Detect new location
  - [ ] Detect suspicious IPs
  - [ ] Rate limiting by IP

#### 5. Validation & Input Sanitization (Priority: HIGH)
Location: `tests/unit/validation/`

**Files to Create**:
- `inputSanitization.test.js` (NEW)
  - [ ] XSS prevention
  - [ ] SQL injection prevention
  - [ ] Path traversal prevention
  - [ ] Command injection prevention
  - [ ] LDAP injection prevention

- `joi.schemas.test.js`
  - [ ] All Joi schemas validation
  - [ ] Edge cases (null, undefined, empty)
  - [ ] Type coercion
  - [ ] Custom validators

---

### Integration Tests Required

#### 1. Authentication Flows (Priority: CRITICAL)
Location: `tests/integration/auth/`

**Files to Create**:
- `auth.flow.test.js`
  - [ ] Complete registration → login → logout flow
  - [ ] Registration with existing email (409)
  - [ ] Login with wrong password (401)
  - [ ] Login with locked account (403)
  - [ ] Token refresh flow
  - [ ] Logout invalidates tokens
  - [ ] Multiple concurrent sessions

- `mfa.flow.test.js` (NEW)
  - [ ] Enable MFA flow
  - [ ] Login with MFA
  - [ ] Login with backup code
  - [ ] Disable MFA flow
  - [ ] MFA recovery flow
  - [ ] MFA bypass attempt (should fail)

#### 2. Password Reset Flow (Priority: HIGH)
Location: `tests/integration/auth/`

**Files to Create**:
- `passwordReset.flow.test.js` (NEW)
  - [ ] Request reset email
  - [ ] Verify reset token
  - [ ] Reset password
  - [ ] Use expired token (should fail)
  - [ ] Use token twice (should fail)
  - [ ] Rate limiting on requests

#### 3. RBAC Integration (Priority: HIGH)
Location: `tests/integration/rbac/`

**Files to Create**:
- `permissions.flow.test.js`
  - [ ] User with role permissions can access
  - [ ] User with additional permissions can access
  - [ ] User without permissions gets 403
  - [ ] Permission changes take effect immediately
  - [ ] Role permission changes affect all users

#### 4. API Rate Limiting (Priority: MEDIUM)
Location: `tests/integration/rateLimit/`

**Files to Create**:
- `rateLimit.test.js`
  - [ ] Global rate limit enforcement
  - [ ] Auth endpoint rate limiting
  - [ ] Per-endpoint rate limits
  - [ ] Rate limit headers present
  - [ ] Redis-backed rate limiting

---

### Security Tests Required

#### 1. Penetration Testing (Priority: CRITICAL)
Location: `tests/security/`

**Files to Create**:
- `sqlInjection.test.js`
  - [ ] Test all parameterized queries
  - [ ] Attempt SQL injection in all inputs
  - [ ] Verify RLS protection
  - [ ] Test UNION attacks
  - [ ] Test blind SQL injection

- `xss.test.js` (NEW)
  - [ ] Test XSS in all user inputs
  - [ ] Test stored XSS
  - [ ] Test reflected XSS
  - [ ] Test DOM-based XSS
  - [ ] Verify CSP headers block inline scripts

- `csrf.test.js` (NEW)
  - [ ] Test CSRF token validation
  - [ ] Test SameSite cookie attribute
  - [ ] Test Origin header validation

- `authentication.security.test.js`
  - [ ] JWT signature verification
  - [ ] JWT expiration enforcement
  - [ ] Token tampering detection
  - [ ] Refresh token rotation
  - [ ] Session hijacking prevention

#### 2. Authorization Testing (Priority: CRITICAL)
Location: `tests/security/`

**Files to Create**:
- `authorization.test.js`
  - [ ] Horizontal privilege escalation
  - [ ] Vertical privilege escalation
  - [ ] IDOR vulnerabilities
  - [ ] Organization context bypass attempts
  - [ ] Role-based access enforcement

#### 3. API Security (Priority: HIGH)
Location: `tests/security/`

**Files to Create**:
- `headers.security.test.js`
  - [ ] Helmet headers present
  - [ ] CSP configured correctly
  - [ ] HSTS enabled (production)
  - [ ] X-Content-Type-Options present
  - [ ] X-Frame-Options configured

- `fileUpload.security.test.js`
  - [ ] File type validation
  - [ ] File size limits
  - [ ] Malicious file detection
  - [ ] Path traversal prevention
  - [ ] Executable file rejection

---

### E2E Tests (Priority: MEDIUM)
Location: `tests/e2e/`

**Test Scenarios**:
1. Complete user journey (signup → login → use app → logout)
2. Admin user management flow
3. Job posting and application workflow
4. MFA enrollment and login
5. Password reset and recovery
6. Multi-device session management

---

## 📋 IMPLEMENTATION ROADMAP

### Week 1: Critical Security Fixes
**Days 1-2**: MFA Implementation
- Install dependencies
- Create MFA service
- Add database migrations
- Create API endpoints

**Days 3-4**: Authentication Hardening
- Implement password reset flow
- Integrate account lockout service
- Add session management improvements
- Fix SQL injection risk in RLS

**Day 5**: Security Testing
- Write security unit tests
- Run penetration tests
- Document findings

---

### Week 2: Testing & Validation
**Days 1-3**: Unit Tests
- Write auth controller tests
- Write middleware tests
- Write model tests
- Write service tests

**Days 4-5**: Integration Tests
- Write authentication flow tests
- Write MFA flow tests
- Write RBAC tests
- Achieve 80%+ coverage

---

### Week 3: Advanced Features
**Days 1-2**: Input Sanitization
- Create sanitization utilities
- Add Joi schemas to all endpoints
- Implement XSS protection

**Days 3-4**: Monitoring & Alerting
- Add security event notifications
- Implement anomaly detection
- Create audit logs

**Day 5**: Documentation & Review
- Update security documentation
- Create deployment checklist
- Security review meeting

---

## 🎯 SUCCESS CRITERIA

### Must Have (P0)
- [ ] MFA fully implemented and tested
- [ ] All critical vulnerabilities fixed
- [ ] 80%+ test coverage
- [ ] No HIGH or CRITICAL security issues
- [ ] Password reset flow working
- [ ] Account lockout integrated

### Should Have (P1)
- [ ] 85%+ test coverage
- [ ] All security tests passing
- [ ] Input sanitization on all endpoints
- [ ] Session management improvements
- [ ] Security monitoring alerts

### Nice to Have (P2)
- [ ] 90%+ test coverage
- [ ] E2E tests implemented
- [ ] Anomaly detection
- [ ] Advanced audit logging
- [ ] Performance testing

---

## 📊 METRICS TO TRACK

1. **Test Coverage**: Target 80%+
2. **Security Issues**: 0 critical, 0 high
3. **Failed Login Attempts**: Monitor trends
4. **MFA Adoption Rate**: Track after launch
5. **Session Length**: Average and maximum
6. **API Response Times**: Maintain < 200ms p95
7. **Rate Limit Hits**: Monitor abuse patterns

---

## 🔒 SECURITY BEST PRACTICES TO ENFORCE

1. **Never trust user input** - Validate and sanitize everything
2. **Use parameterized queries** - Always, no exceptions
3. **Encrypt sensitive data** - At rest and in transit
4. **Implement defense in depth** - Multiple layers of security
5. **Log security events** - But never log sensitive data
6. **Principle of least privilege** - Minimal permissions by default
7. **Fail securely** - Errors should not reveal sensitive info
8. **Keep dependencies updated** - Regular security audits
9. **Rate limit everything** - Prevent abuse
10. **Monitor and alert** - Know when attacks happen

---

**Next Steps**: Begin with Week 1 implementation - MFA and critical fixes
