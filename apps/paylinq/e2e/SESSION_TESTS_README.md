# Session Management E2E Tests

## Overview

Comprehensive end-to-end tests that verify the application correctly handles session invalidation and automatic redirect to login page, with preservation of the return URL for seamless user experience after re-authentication.

## Test Coverage

### 1. **Basic Redirect Tests**
- ✅ Redirect to login when accessing protected route without session
- ✅ Preserve return URL and redirect back after successful login
- ✅ Handle deeply nested routes with preserved full path
- ✅ Preserve query parameters in return URL

### 2. **Session Expiration During Runtime**
- ✅ Redirect when session expires during API call
- ✅ Handle page refresh without session
- ✅ CSRF token fetch failure due to invalid session
- ✅ Show appropriate "session expired" message

### 3. **CSRF Token Management**
- ✅ Fetch CSRF token after successful login
- ✅ Automatically retry request with new CSRF token on 403 error
- ✅ Clear CSRF token when session is invalidated
- ✅ Refetch CSRF token after re-authentication

### 4. **Token Refresh Flow**
- ✅ Attempt token refresh on 401 before redirecting
- ✅ Handle refresh token expiration gracefully
- ✅ Clear tokens and redirect when refresh fails

### 5. **Edge Cases**
- ✅ Handle multiple tabs with session invalidation
- ✅ Handle rapid API calls during session expiration
- ✅ Prevent infinite redirect loops

## Running the Tests

### Run All Session Management Tests
```bash
cd apps/paylinq
npm run test:e2e -- session-management.spec.ts
```

### Run Specific Test Suite
```bash
# Run only redirect tests
npm run test:e2e -- session-management.spec.ts -g "Session Management & Auto-Redirect"

# Run only CSRF tests
npm run test:e2e -- session-management.spec.ts -g "CSRF Token Management"

# Run only refresh flow tests
npm run test:e2e -- session-management.spec.ts -g "Session Refresh Flow"
```

### Run in UI Mode (Interactive)
```bash
npm run test:e2e -- session-management.spec.ts --ui
```

### Run in Debug Mode
```bash
npm run test:e2e -- session-management.spec.ts --debug
```

## Test Scenarios Explained

### Scenario 1: Hard Reset / Backend Restart
**What happens:**
1. User is authenticated and on a protected page
2. Backend server restarts (clears all sessions)
3. User tries to interact with the app or refreshes page

**Expected behavior:**
- API call returns 401 (no valid session)
- App attempts token refresh → fails (no session)
- App redirects to `/login?reason=session_expired&returnTo=/current-page`
- User sees "Your session has expired" message
- After re-login, user is redirected back to original page

**Test:** `should redirect to login when session expires during API call`

### Scenario 2: CSRF Token Expiration
**What happens:**
1. User is authenticated
2. CSRF token expires or becomes invalid
3. User tries to perform a mutation (POST/PUT/DELETE)

**Expected behavior:**
- Mutation returns 403 CSRF error
- App automatically fetches new CSRF token
- If session is valid, request is retried with new token ✓
- If session is invalid (401), app redirects to login ✓

**Test:** `should automatically retry request with new CSRF token on 403`

### Scenario 3: Access Token Expiration
**What happens:**
1. User is authenticated
2. Access token expires (but refresh token is still valid)
3. User makes an API call

**Expected behavior:**
- API returns 401
- App automatically calls refresh endpoint
- If refresh succeeds, original request is retried ✓
- If refresh fails, app redirects to login ✓

**Test:** `should attempt token refresh on 401 before redirecting`

### Scenario 4: Initial Page Load Without Session
**What happens:**
1. User navigates directly to a protected route (e.g., via bookmark)
2. No valid session exists

**Expected behavior:**
- AuthContext checks session → 401
- ProtectedRoute component sees `!isAuthenticated`
- Immediately redirects to `/login?returnTo=/protected-route`
- No flash of protected content

**Test:** `should redirect to login when accessing protected route without session`

### Scenario 5: Multiple Tabs
**What happens:**
1. User has multiple tabs open
2. Session expires or user logs out in one tab
3. User interacts with another tab

**Expected behavior:**
- All tabs should eventually detect invalid session
- All tabs should redirect to login
- No state synchronization issues

**Test:** `should handle multiple tabs with session invalidation`

## Architecture Components Tested

### Frontend Components:
- **AuthContext** - Session validation on app load
- **ProtectedRoute** - Guards routes requiring authentication
- **API Client** - Handles 401/403 errors and automatic token management

### API Endpoints:
- `GET /api/auth/tenant/me` - Session validation
- `POST /api/auth/tenant/refresh` - Token refresh
- `GET /api/csrf-token` - CSRF token generation
- Protected endpoints (workers, payroll, etc.)

## Mock Scenarios

The tests use various mocking strategies:

1. **Clear Cookies** - Simulates session invalidation
   ```typescript
   await clearAuthCookies(page);
   ```

2. **Route Interception** - Simulates specific API errors
   ```typescript
   await page.route('**/api/**', async (route) => {
     await route.fulfill({ status: 403, body: '...' });
   });
   ```

3. **Console Monitoring** - Verifies internal state changes
   ```typescript
   page.on('console', msg => consoleLogs.push(msg.text()));
   ```

## Test Data Requirements

### Test User Credentials:
- **Email:** `paylinq@test.com`
- **Password:** `Test123!@#`

These credentials must exist in your test database or be mocked by your auth service.

## Debugging Failed Tests

### Check Browser Console:
```bash
npm run test:e2e -- session-management.spec.ts --debug
```

### View Test Report:
```bash
npx playwright show-report
```

### Common Issues:

1. **Test times out waiting for redirect**
   - Check if auth cookies are actually being cleared
   - Verify API is returning correct status codes
   - Check network tab for redirect chain

2. **Return URL not preserved**
   - Check APIClient `handleSessionExpired()` method
   - Verify URL encoding is working correctly

3. **CSRF tests failing**
   - Ensure CSRF middleware is properly configured
   - Check if CSRF token endpoint is accessible
   - Verify interceptor is adding X-CSRF-Token header

## CI/CD Integration

These tests should run:
- ✅ On every PR to main branch
- ✅ Before deployment to staging
- ✅ After backend updates
- ✅ Nightly regression suite

## Success Criteria

All tests should pass with:
- ✅ No timeout errors
- ✅ Console logs show expected flow
- ✅ Network requests show proper error handling
- ✅ User is always redirected to login when session is invalid
- ✅ Return URL is preserved and used after re-login

## Future Enhancements

- [ ] Test session timeout warnings (show countdown before expiration)
- [ ] Test "Remember Me" functionality
- [ ] Test session extension on user activity
- [ ] Test concurrent session handling (logout all sessions)
- [ ] Test SSO/OAuth flows
