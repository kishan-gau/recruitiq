# Frontend Session Management Implementation Guide

**Status**: ✅ Complete  
**Date**: January 2025  
**Branch**: feature/security-hardening-mfa  
**Related**: docs/SESSION_MANAGEMENT.md, docs/SECURITY_AUDIT_2025.md

---

## Overview

This document describes the frontend implementation for the Session Management Enhancement feature across both the **License Manager Portal** (admin) and **RecruitIQ Application** (end-user).

## Features Implemented

### 1. License Manager Portal Enhancements

**Purpose**: Allow platform administrators to configure session policies when creating/managing customer organizations.

#### Files Modified

1. **portal/src/constants/licenseConstants.js**
   - Added `SESSION_POLICY_OPTIONS` - Single vs Multiple session modes
   - Added `MAX_SESSIONS_OPTIONS` - 1-10 sessions per user
   - Updated `FORM_STEPS` - Added "Security & Sessions" step (step 5)
   - Updated `INITIAL_FORM_DATA` - Added session policy defaults

2. **portal/src/components/licenses/steps/SessionPolicyStep.jsx** (NEW)
   - Visual session policy selector (Single 🔐 vs Multiple 📱)
   - Max sessions per user dropdown (for multiple mode)
   - Concurrent login detection toggle
   - Informational banner with best practices

3. **portal/src/components/licenses/steps/ReviewStep.jsx**
   - Added "Security Settings" section
   - Displays selected session policy, max sessions, and detection settings
   - Visual indicators (emojis) for quick recognition

4. **portal/src/pages/licenses/LicenseCreate.jsx**
   - Imported `SessionPolicyStep` component
   - Added step 5 to render sequence (between Limits and Review)
   - Updated `createCustomer()` API call to include session policy fields

5. **portal/src/services/api.js**
   - Added `getSessionPolicy()` - Get organization's current policy
   - Added `updateSessionPolicy(policyData, enforceImmediately)` - Update policy
   - Added `getActiveSessions()` - List user's active sessions
   - Added `revokeSession(sessionId)` - Revoke specific session
   - Added `revokeAllSessions()` - Logout from all other devices
   - Updated `transformCustomerForBackend()` - Include session policy fields

#### User Flow

1. Admin creates new customer license
2. Fills customer info, deployment, tier, limits (steps 1-4)
3. **Step 5 - Security & Sessions**:
   - Choose session policy: Single (license enforcement) or Multiple (standard)
   - If Multiple: Select max sessions (1-10, default 5)
   - Toggle concurrent login detection (on by default)
   - Review best practices
4. Review all settings (step 6)
5. Submit → Organization created with session policy

#### Configuration Options

| Option | Description | Use Case |
|--------|-------------|----------|
| **Single Session** | Only 1 active session per user. New login revokes all others. | License enforcement - prevent credential sharing for paid licenses |
| **Multiple Sessions** | Allow N sessions (1-10). Oldest auto-revoked when limit exceeded. | Standard SaaS - legitimate multi-device usage |
| **Concurrent Detection** | Alert on simultaneous logins from different IPs | Security monitoring - detect account compromises |

---

### 2. RecruitIQ Application Enhancements

**Purpose**: Allow end-users to view and manage their active sessions across devices.

#### Files Modified

1. **recruitiq/src/services/api.js**
   - Added `getActiveSessions()` - Returns array of active sessions
   - Added `revokeSession(sessionId)` - Logout from specific device
   - Added `revokeAllSessions()` - Logout from all other devices
   - Enhanced 401 error handling - Redirect to login with session_expired reason

2. **recruitiq/src/components/SessionManagement.jsx** (NEW)
   - Displays all active sessions in card format
   - Shows device icon (📱 mobile, 💻 desktop, 🖥️ Mac, 🐧 Linux)
   - Shows device name, IP address, last active time
   - Highlights current session with badge
   - Individual "Logout" button per session
   - "Logout All Other Devices" button (if >1 session)
   - Loading states and error handling
   - Security tip banner

3. **recruitiq/src/pages/Profile.jsx**
   - Imported `SessionManagement` component
   - Added between Appearance and About sections
   - Automatically loads sessions on page visit

4. **recruitiq/src/pages/Login.jsx**
   - Added `useSearchParams` hook to detect query parameters
   - Added `sessionMessage` state for forced logout warnings
   - Added `useEffect` to check for `?reason=session_expired`
   - Added amber alert banner for session expiration message
   - Clears URL parameter after displaying message

#### User Flow

1. User navigates to Profile page
2. **Active Sessions** section displays:
   - Current device (highlighted in teal)
   - Other logged-in devices (if any)
   - Device details: name, IP, last active time
3. User can:
   - **Logout individual device**: Click "Logout" button
   - **Logout all others**: Click "Logout All Other Devices"
   - See confirmation dialog before revoking
4. If session revoked elsewhere:
   - User sees 401 error
   - Redirected to `/login?reason=session_expired`
   - Amber warning shown: "Your session has expired or was ended from another device"

#### Session Card Example

```
┌────────────────────────────────────────────┐
│ 💻  Windows Desktop          [Current]    │
│ 📍 192.168.1.100                           │
│ 🕒 Last active: 2 minutes ago              │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 📱  iPhone                    [Logout]     │
│ 📍 192.168.1.50                            │
│ 🕒 Last active: 1 hour ago                 │
└────────────────────────────────────────────┘
```

---

## API Integration

### Backend Endpoints Used

| Endpoint | Method | Purpose | Frontend Usage |
|----------|--------|---------|----------------|
| `/api/auth/sessions` | GET | Get active sessions | SessionManagement component |
| `/api/auth/sessions/:sessionId` | DELETE | Revoke specific session | Individual logout button |
| `/api/auth/sessions` | DELETE | Revoke all other sessions | Logout all devices button |
| `/api/organizations/session-policy` | GET | Get org session policy | License Manager view |
| `/api/organizations/session-policy` | PUT | Update session policy | License Manager update |

### Request/Response Examples

#### Get Active Sessions
```javascript
// Request
GET /api/auth/sessions
Authorization: Bearer <token>

// Response
{
  "sessions": [
    {
      "id": "uuid-1234",
      "deviceName": "Windows Desktop",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "lastUsedAt": "2025-01-20T10:30:00Z",
      "createdAt": "2025-01-20T08:00:00Z",
      "isCurrent": true
    },
    {
      "id": "uuid-5678",
      "deviceName": "iPhone",
      "ipAddress": "192.168.1.50",
      "userAgent": "Mozilla/5.0 (iPhone)...",
      "lastUsedAt": "2025-01-20T09:15:00Z",
      "createdAt": "2025-01-19T14:00:00Z",
      "isCurrent": false
    }
  ],
  "totalSessions": 2
}
```

#### Revoke Session
```javascript
// Request
DELETE /api/auth/sessions/uuid-5678
Authorization: Bearer <token>

// Response
{
  "message": "Session revoked successfully"
}
```

#### Update Session Policy (License Manager)
```javascript
// Request
PUT /api/organizations/session-policy
Authorization: Bearer <token>
{
  "sessionPolicy": "single",
  "maxSessionsPerUser": 1,
  "concurrentLoginDetection": true,
  "enforceImmediately": true
}

// Response
{
  "message": "Session policy updated successfully",
  "sessionsRevoked": 15
}
```

---

## Security Features

### 1. Device Fingerprinting
- SHA-256 hash of User-Agent + IP Address
- Stored with each session
- Used to detect concurrent logins from different devices

### 2. Forced Logout Handling
- 401 errors caught by API client
- Tokens cleared automatically
- User redirected to login with reason parameter
- Friendly warning message displayed

### 3. CSRF Protection
- Tokens sent with all session management requests
- Prevents session hijacking attacks

### 4. Token Rotation
- On each login, old refresh tokens are invalidated
- `replaced_by_token` field tracks rotation chain

### 5. Session Limit Enforcement
- Backend enforces max sessions per user
- Oldest sessions auto-revoked when limit exceeded
- User notified if their session was revoked

---

## Visual Design

### License Manager (Admin Portal)

**Session Policy Step**:
- Large card-based selector (Single vs Multiple)
- Visual icons (🔐 vs 📱)
- Dropdown for max sessions (Multiple mode only)
- Toggle switch for concurrent detection
- Blue info banner with best practices

**Review Step**:
- Dedicated "Security Settings" section
- Shows policy with emoji indicators
- Displays all configured values
- Consistent with other review sections

### RecruitIQ App (End-User)

**Session Cards**:
- Teal highlight for current session
- Gray background for other sessions
- Device emoji based on user agent
- Clean, modern card design
- Responsive layout (mobile-friendly)

**Profile Page**:
- Integrated between Appearance and About
- Matches existing profile section styling
- Dark mode support (using Tailwind classes)

**Login Page**:
- Amber warning banner for session expiration
- Warning icon (⚠️) with message
- Dismisses automatically after user interaction
- Matches error message styling

---

## Testing Checklist

### License Manager Portal

- [ ] Create new customer with Single session policy
- [ ] Create new customer with Multiple session policy (5 sessions)
- [ ] Verify session policy shows in Review step
- [ ] Verify session policy saved to database
- [ ] Update existing customer's session policy
- [ ] Test "Enforce Immediately" option (revokes existing sessions)

### RecruitIQ Application

- [ ] View active sessions on Profile page
- [ ] Verify current session is highlighted
- [ ] Revoke individual session
  - Confirm dialog appears
  - Session removed from list
  - Other device is logged out
- [ ] Logout all other devices
  - Confirm dialog appears
  - Only current session remains
- [ ] Test forced logout scenario:
  - Login from Device A
  - Login from Device B (single session mode)
  - Device A shows session expired warning
  - Device A redirected to login

### End-to-End Flows

- [ ] **Single Session Mode**:
  - Admin sets customer to Single session policy
  - User logs in from Device A
  - User logs in from Device B
  - Device A immediately logged out
  - Device A shows "session expired" message
  
- [ ] **Multiple Session Mode**:
  - Admin sets customer to Multiple (3 sessions)
  - User logs in from 3 devices
  - All 3 sessions visible in Profile
  - User logs in from 4th device
  - Oldest session auto-revoked
  - Only 3 sessions remain

- [ ] **Session Management**:
  - User views sessions on Profile
  - User revokes one session
  - Verify session removed from database
  - User logouts all other devices
  - Verify only current session remains

- [ ] **Concurrent Login Detection**:
  - Admin enables detection
  - User logs in from IP A
  - User logs in from IP B (same time)
  - Alert generated in security logs
  - User notified (future enhancement)

---

## Known Limitations & Future Enhancements

### Current Limitations

1. **No Real-Time Updates**: Session list doesn't auto-refresh. User must reload page.
   - **Solution**: Add WebSocket or polling for live updates

2. **No Session Naming**: Users can't name devices (e.g., "Home Laptop", "Work iPhone")
   - **Solution**: Add editable device names

3. **No Location Detection**: Only shows IP address, not city/country
   - **Solution**: Integrate IP geolocation service

4. **No Device Approval**: Can't mark devices as "trusted" to skip MFA
   - **Solution**: Add trusted device management

### Future Enhancements

1. **Push Notifications**: Alert user when new device logs in
2. **Email Alerts**: Send email on suspicious login patterns
3. **Session History**: View past sessions (last 30 days)
4. **Device Management**: Approve/block specific devices
5. **Biometric Authentication**: Face ID, Touch ID support
6. **Hardware Security Keys**: WebAuthn/FIDO2 support

---

## Deployment Notes

### Prerequisites

1. Backend session management APIs deployed
2. Database schema updated (refresh_tokens + organizations tables)
3. Backend tests passing (699/699)

### Frontend Deployment Steps

1. **Install Dependencies** (if needed):
   ```bash
   cd portal && npm install
   cd ../recruitiq && npm install
   ```

2. **Build Frontend Assets**:
   ```bash
   # License Manager Portal
   cd portal
   npm run build
   
   # RecruitIQ Application
   cd ../recruitiq
   npm run build
   ```

3. **Environment Variables** (verify):
   ```
   VITE_API_URL=https://api.recruitiq.com/api
   ```

4. **Deploy Static Assets**:
   - Upload `portal/dist` to CDN/static hosting
   - Upload `recruitiq/dist` to CDN/static hosting
   - Update DNS/routing if needed

5. **Verify Deployment**:
   - Test License Manager: Create customer with session policy
   - Test RecruitIQ: View sessions on Profile page
   - Test forced logout: Login from 2 devices (single mode)

### Rollback Plan

If issues occur:
1. Revert frontend assets to previous version
2. Backend remains compatible (graceful degradation)
3. Users see default session policy (multiple sessions)

---

## Support & Troubleshooting

### Common Issues

**Issue**: Session list shows "Failed to load sessions"  
**Solution**: Check network tab for API errors. Verify backend is running and `/api/auth/sessions` endpoint is accessible.

**Issue**: Logout button doesn't work  
**Solution**: Check console for errors. Verify user has valid auth token. Check backend logs for authorization errors.

**Issue**: Session expired warning doesn't show  
**Solution**: Check URL for `?reason=session_expired` parameter. Verify API client 401 handling redirects with parameter.

**Issue**: Multiple sessions not working (always single)  
**Solution**: Check organization's session policy in database. Verify admin set policy correctly in License Manager.

### Debug Mode

Enable verbose logging:
```javascript
// In browser console
localStorage.setItem('debug', 'recruitiq:*')
// Reload page
```

View all sessions (developer):
```sql
-- In PostgreSQL
SELECT 
  rt.id,
  u.email,
  rt.device_name,
  rt.ip_address,
  rt.last_used_at,
  rt.created_at
FROM refresh_tokens rt
JOIN users u ON u.id = rt.user_id
WHERE rt.revoked = false
  AND rt.expires_at > NOW()
ORDER BY rt.last_used_at DESC;
```

---

## Conclusion

The frontend session management implementation is complete and ready for testing. Both the License Manager Portal and RecruitIQ Application now support:

✅ Configurable session policies (single vs multiple)  
✅ Active session viewing and management  
✅ Individual and bulk session revocation  
✅ Graceful forced logout handling  
✅ User-friendly warnings and notifications  

Next step: End-to-end testing with real user scenarios.

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Author**: GitHub Copilot  
**Review Status**: Ready for QA Testing
