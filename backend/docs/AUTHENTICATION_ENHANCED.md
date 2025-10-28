# Enhanced Authentication System

## Overview

The RecruitIQ backend now includes a comprehensive enhanced authentication system with advanced security features to protect against common attack vectors and unauthorized access.

## Features Implemented

### 1. JWT Token Blacklist Service (`tokenBlacklist.js`)

**Purpose**: Revoke JWT tokens before their natural expiration, enabling secure logout and token invalidation.

**Key Features**:
- Individual token blacklisting
- User-level token revocation (invalidate all tokens for a user)
- Redis-based storage for fast lookups
- Automatic TTL management
- Fail-safe mechanism (fails open if Redis is down)
- Statistics tracking

**Methods**:
- `blacklistToken(token, expiresIn)` - Add a token to the blacklist
- `isBlacklisted(token)` - Check if a token is blacklisted
- `blacklistUserTokens(userId, expiresIn)` - Revoke all tokens for a user
- `areUserTokensBlacklisted(userId, tokenIssuedAt)` - Check user-level blacklist
- `removeFromBlacklist(token)` - Remove token from blacklist (admin)
- `getStats()` - Get blacklist statistics

**Use Cases**:
- Secure logout
- Password change (invalidate all existing sessions)
- Account compromise (admin revokes all user tokens)
- Suspicious activity detection

### 2. Account Lockout Service (`accountLockout.js`)

**Purpose**: Prevent brute force attacks by temporarily locking accounts after repeated failed login attempts.

**Key Features**:
- Tracks failed login attempts per email AND per IP
- Progressive delays on failed attempts (2s, 5s, 10s, 30s)
- Automatic lockout after 5 failed attempts
- 15-minute lockout duration
- 30-minute attempt tracking window
- Manual lock capability for administrators
- In-memory fallback if Redis unavailable

**Methods**:
- `recordFailedAttempt(identifier, type)` - Record a failed login
- `checkLockout(identifier, type)` - Check if account/IP is locked
- `clearFailedAttempts(identifier, type)` - Clear on successful login
- `manualLock(identifier, type, durationMs)` - Admin manual lock
- `isManuallyLocked(identifier, type)` - Check manual lock status
- `getProgressiveDelay(failedAttempts)` - Get delay for attempt count
- `getStats()` - Get lockout statistics

**Configuration**:
```javascript
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MS = 15 minutes
ATTEMPT_WINDOW_MS = 30 minutes
PROGRESSIVE_DELAYS = [0ms, 2s, 5s, 10s, 30s]
```

### 3. IP Tracking Service (`ipTracking.js`)

**Purpose**: Track user login IP addresses and detect suspicious login patterns.

**Key Features**:
- Records IP history for each user (last 10 IPs)
- Detects new/unknown IP addresses
- Identifies IPs not seen recently (30+ days)
- Detects frequent IP changes (more than 3 in 24 hours)
- Flags private/internal IP addresses
- 90-day IP history retention
- Suspicious activity logging

**Methods**:
- `recordIP(userId, ip, metadata)` - Record and analyze IP
- `getIPHistory(userId)` - Get user's IP history
- `isKnownIP(userId, ip)` - Check if IP is known
- `clearIPHistory(userId)` - Clear IP history (admin)
- `getStats()` - Get tracking statistics

**Anomaly Detection**:
The service flags logins as suspicious when:
- IP address is completely new
- IP hasn't been seen in 30+ days
- More than 3 IP changes in 24 hours
- Login from private/internal IP ranges

**Response**: 
- Non-blocking (login proceeds)
- Security notice included in login response
- Logs warning for security review
- TODO: Email notification to user

### 4. Refresh Token Rotation

**Purpose**: Enhance security by issuing a new refresh token on each use, invalidating the old one.

**Implementation**:
- Each `/auth/refresh` call generates a new refresh token
- Old refresh token is immediately blacklisted
- Old token in database is revoked
- Prevents token replay attacks
- Mitigates token theft impact

**Flow**:
1. Client sends refresh token
2. Server verifies token validity
3. Server checks if token is blacklisted
4. Server generates new access + refresh tokens
5. Server blacklists old refresh token
6. Server revokes old token in database
7. Server stores new refresh token
8. Server returns new tokens to client

### 5. Enhanced Logout

**Purpose**: Properly invalidate tokens on logout to prevent reuse.

**Implementation**:
- Blacklists both access and refresh tokens
- Revokes refresh token from database
- Calculates remaining token lifetime for TTL
- Gracefully handles blacklisting failures

**Flow**:
1. Client sends logout request with refresh token
2. Server extracts access token from Authorization header
3. Server blacklists access token (with remaining TTL)
4. Server blacklists refresh token (with remaining TTL)
5. Server revokes refresh token from database
6. Server confirms successful logout

## Integration Points

### Authentication Middleware (`auth.js`)

**Enhanced Checks**:
1. Token format validation
2. **Token blacklist check** (NEW)
3. JWT signature verification
4. **User-level blacklist check** (NEW)
5. User database lookup
6. Organization subscription status
7. User object attachment to request

**Error Responses**:
- `401 Unauthorized` - Token revoked
- `401 Unauthorized` - Session invalidated (user-level)
- `401 Unauthorized` - Token expired
- `401 Unauthorized` - Invalid token
- `403 Forbidden` - Subscription inactive

### Login Controller (`authController.login`)

**Enhanced Flow**:
1. Input validation
2. **Email lockout check** (NEW)
3. **IP lockout check** (NEW)
4. **Manual lock check** (NEW)
5. User lookup
6. Password verification
7. **Failed attempt recording** (NEW) OR **Clear attempts** (NEW)
8. **Progressive delay** (NEW)
9. **IP tracking** (NEW)
10. Token generation
11. **Security notice** (NEW - if suspicious)
12. Response with tokens

**Security Features**:
- Prevents account enumeration (records attempts for non-existent users)
- Progressive delays slow down brute force attempts
- Dual lockout (email + IP) prevents distributed attacks
- IP anomaly detection alerts on suspicious logins

## Testing

### Test Script: `test-auth-enhanced.js`

Run with: `npm run test:auth`

**Tests Included**:
1. ✓ User registration
2. ✓ Authentication with valid token
3. ✓ Account lockout after failed attempts
4. ✓ Progressive delay on failed attempts
5. ✓ Token rotation on refresh
6. ✓ Token blacklist on logout
7. ✓ IP tracking and anomaly detection
8. ✓ Authentication after lockout cleared

**Expected Results**: 8/8 tests passing

## Security Benefits

### Attack Prevention

1. **Brute Force Protection**
   - Progressive delays slow down attacks
   - Account lockout after 5 attempts
   - IP-based lockout prevents distributed attacks

2. **Token Theft Mitigation**
   - Token blacklisting enables immediate revocation
   - Refresh token rotation limits exposure window
   - User-level revocation for compromised accounts

3. **Session Hijacking Detection**
   - IP tracking detects suspicious logins
   - Security notices alert legitimate users
   - Rapid IP changes flagged as suspicious

4. **Replay Attack Prevention**
   - Refresh token rotation prevents reuse
   - Token blacklist blocks revoked tokens
   - Database revocation provides persistence

### Compliance Benefits

- **GDPR**: User can revoke all sessions
- **HIPAA**: Enhanced access controls
- **SOC 2**: Audit trail for authentication events
- **PCI DSS**: Strong authentication mechanisms

## Configuration

### Environment Variables

```env
# Redis (required for token blacklist, lockout, IP tracking)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# JWT Configuration
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```

### Redis Setup

All three services (token blacklist, account lockout, IP tracking) share the same Redis connection. Redis is **required** for production deployment.

**Installation**:
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

**Start Redis**:
```bash
redis-server
```

### Tuning Parameters

**Account Lockout**:
```javascript
// backend/src/services/accountLockout.js
const MAX_FAILED_ATTEMPTS = 5;           // Adjust based on security needs
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 30 * 60 * 1000;   // 30 minutes
const PROGRESSIVE_DELAYS = [0, 2000, 5000, 10000, 30000]; // ms
```

**IP Tracking**:
```javascript
// backend/src/services/ipTracking.js
const IP_HISTORY_MAX_COUNT = 10;         // IPs to remember
const IP_HISTORY_TTL_DAYS = 90;          // History retention
const NEW_IP_THRESHOLD_DAYS = 30;        // "New" IP definition
```

## Monitoring & Logging

### Log Events

All services log security events with Winston:

**INFO Level**:
- Successful logins
- Token refreshes
- Session logouts
- IP tracking initialized

**WARN Level**:
- Failed login attempts
- Account lockouts triggered
- Suspicious IP activity
- Blacklisted token usage attempts

**ERROR Level**:
- Redis connection failures
- Blacklist operation failures
- Service initialization errors

### Metrics to Monitor

1. **Failed Login Rate**: Spike may indicate attack
2. **Lockout Rate**: High rate may indicate attack or UX issue
3. **Token Refresh Rate**: Unusual patterns may indicate automation
4. **IP Anomaly Rate**: Baseline vs. anomalous activity
5. **Redis Performance**: Latency and error rates

### Alerting Recommendations

- **Critical**: Redis connection lost
- **High**: Lockout rate > 10/minute
- **High**: Multiple lockouts from same IP block
- **Medium**: Suspicious login activity for admin accounts
- **Low**: IP anomaly detected

## API Usage Examples

### Login with Enhanced Security

```javascript
// Request
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

// Success Response (Normal)
{
  "message": "Login successful",
  "user": { /* user object */ },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}

// Success Response (Suspicious IP)
{
  "message": "Login successful",
  "user": { /* user object */ },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "securityNotice": {
    "message": "Login from new location detected",
    "reasons": ["New IP address detected"],
    "isNewIP": true
  }
}

// Error Response (Account Locked)
{
  "error": "Unauthorized",
  "message": "Account temporarily locked due to multiple failed login attempts. Try again in 12 minutes."
}

// Error Response (IP Locked)
{
  "error": "Unauthorized",
  "message": "Too many failed login attempts from this location. Try again in 14 minutes."
}
```

### Refresh Token with Rotation

```javascript
// Request
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGc..."
}

// Success Response
{
  "accessToken": "eyJhbGc...",  // New access token
  "refreshToken": "eyJhbGc..."  // New refresh token (different from request)
}

// Error Response (Blacklisted)
{
  "error": "Unauthorized",
  "message": "Refresh token has been revoked"
}
```

### Secure Logout

```javascript
// Request
POST /api/auth/logout
Authorization: Bearer eyJhbGc...
{
  "refreshToken": "eyJhbGc..."
}

// Success Response
{
  "message": "Logout successful"
}
```

## Future Enhancements (MFA Preparation)

The authentication system is designed to support Multi-Factor Authentication (MFA) in the future:

### Database Schema (TODO)
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN mfa_backup_codes TEXT[];

-- MFA sessions table
CREATE TABLE mfa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  session_token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### MFA Flow (TODO)
1. User logs in with password
2. Server validates password
3. If MFA enabled, return `mfaRequired: true` with session token
4. Client requests MFA code from user
5. Client submits MFA code with session token
6. Server validates MFA code
7. Server issues access/refresh tokens

### MFA Service (TODO)
- TOTP (Time-based One-Time Password) generation
- Backup code generation and validation
- QR code generation for authenticator apps
- SMS/Email fallback options

## Troubleshooting

### Redis Connection Issues

**Symptom**: Services fail to connect to Redis

**Solution**:
1. Check Redis is running: `redis-cli ping` (should return "PONG")
2. Verify environment variables are set correctly
3. Check firewall rules if Redis is on a separate server
4. Services will fall back to in-memory storage (not recommended for production)

### Account Locked After Testing

**Symptom**: Cannot login after running tests

**Solution**:
1. Wait 15 minutes for automatic unlock
2. Or clear Redis: `redis-cli FLUSHDB`
3. Or use different test email addresses

### Token Blacklist Growing Large

**Symptom**: Redis memory usage increasing

**Solution**:
- Token blacklist uses TTL, entries expire automatically
- Monitor with: `redis-cli INFO memory`
- Check blacklist stats via service API endpoint
- Consider Redis memory eviction policies if needed

### IP Tracking False Positives

**Symptom**: Security notices on every login

**Solution**:
- Mobile users may have changing IPs (cellular networks)
- VPN users will trigger new IP detection
- Adjust `NEW_IP_THRESHOLD_DAYS` if needed
- IP tracking is informational, doesn't block logins

## Performance Considerations

### Redis Performance

All three services use Redis for fast lookups:

- **Token Blacklist**: O(1) lookup, minimal memory (stores tokens until expiry)
- **Account Lockout**: O(1) lookup, small payloads (arrays of timestamps)
- **IP Tracking**: O(1) lookup, medium payloads (arrays of IP objects)

**Expected Load** (1000 active users):
- Token blacklist: ~2000 entries (logout + refresh rotation)
- Account lockout: ~50-100 entries (only locked/failed accounts)
- IP tracking: ~1000 entries (one per user)

**Memory Estimate**: ~5-10 MB for 1000 users

### Database Performance

- Refresh token table grows linearly with active sessions
- Revoked tokens are marked, not deleted (for audit trail)
- Consider periodic cleanup of old revoked tokens
- Index on `user_id` and `token` columns is essential

### Progressive Delay Impact

- Delays only apply to failed login attempts
- Successful logins have no added latency
- Maximum delay is 30 seconds (5th attempt)
- Delays run asynchronously, don't block server

## Security Audit Checklist

- [ ] Redis secured with password
- [ ] Redis not exposed to public internet
- [ ] JWT secrets are strong and unique
- [ ] Token expiry times are reasonable
- [ ] Rate limiting configured on auth endpoints
- [ ] HTTPS enforced in production
- [ ] Security logs monitored
- [ ] Alert system configured
- [ ] Backup strategy for Redis data
- [ ] Regular security dependency updates

## Support & Maintenance

### Regular Tasks

1. **Weekly**: Review security logs for patterns
2. **Monthly**: Check Redis memory usage and performance
3. **Quarterly**: Review and tune lockout parameters
4. **Annually**: Rotate JWT secrets (requires all users to re-login)

### Upgrade Path

When upgrading the authentication system:

1. Test in staging environment first
2. Announce maintenance window to users
3. Deploy during low-traffic period
4. Monitor error rates closely
5. Have rollback plan ready

---

## Summary

The enhanced authentication system provides enterprise-grade security with:

- ✅ Token revocation (blacklist)
- ✅ Brute force protection (account lockout)
- ✅ Anomaly detection (IP tracking)
- ✅ Token rotation (refresh tokens)
- ✅ Comprehensive logging
- ✅ Performance optimized
- ✅ Production ready

**Status**: Implemented and tested (Todo #3 complete)
