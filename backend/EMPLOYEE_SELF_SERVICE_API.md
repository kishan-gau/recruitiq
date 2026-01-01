# Employee Self-Service API Endpoints

## Overview

This document describes the backend API endpoints implemented to support the Phase 2 & 3 employee mobile features.

## Authentication

All endpoints require authentication via JWT token in cookie or Authorization header.
The employee ID is extracted from the authenticated user context.

## Endpoints

### ScheduleHub - Employee Time & Attendance

#### Clock In
```
POST /api/products/schedulehub/clock-in
```

**Request Body:**
```json
{
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
```

**Response:**
```json
{
  "success": true,
  "attendance": {
    "id": "uuid",
    "employee_id": "uuid",
    "event_type": "clock_in",
    "event_timestamp": "2026-01-01T09:00:00Z",
    "location_latitude": 37.7749,
    "location_longitude": -122.4194
  }
}
```

**Errors:**
- `400` - Employee already has an active clock-in for today

#### Clock Out
```
POST /api/products/schedulehub/clock-out
```

**Request Body:**
```json
{
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
```

**Response:**
```json
{
  "success": true,
  "attendance": {
    "clockOut": { ... },
    "timeEntry": { ... },
    "workedHours": 8.5
  }
}
```

**Errors:**
- `400` - No active clock-in found

#### Get Clock Status
```
GET /api/products/schedulehub/clock-status
```

**Response:**
```json
{
  "success": true,
  "status": {
    "isClockedIn": true,
    "lastClockIn": {
      "id": "uuid",
      "event_timestamp": "2026-01-01T09:00:00Z",
      "location_latitude": 37.7749,
      "location_longitude": -122.4194
    },
    "lastClockOut": null
  }
}
```

#### Get Employee Shifts
```
GET /api/products/schedulehub/employee-shifts?date=2026-01-01
GET /api/products/schedulehub/employee-shifts?startDate=2026-01-01&endDate=2026-01-07
```

**Query Parameters:**
- `date` - Single date (YYYY-MM-DD)
- `startDate` - Range start date (YYYY-MM-DD)
- `endDate` - Range end date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "shifts": [
    {
      "id": "uuid",
      "start_time": "2026-01-01T09:00:00Z",
      "end_time": "2026-01-01T17:00:00Z",
      "break_duration": 60,
      "status": "scheduled",
      "station_name": "Main Office",
      "station_location": "123 Main St",
      "role_name": "Customer Service",
      "schedule_title": "Week 1 Schedule",
      "clock_in_time": null,
      "clock_out_time": null
    }
  ]
}
```

### PayLinQ - Payroll

#### Get Employee YTD Summary
```
GET /api/products/paylinq/employees/:employeeId/ytd-summary?year=2026
```

**Query Parameters:**
- `year` - (Optional) Year for YTD calculation (defaults to current year)

**Response:**
```json
{
  "success": true,
  "ytdSummary": {
    "year": 2026,
    "paycheckCount": 12,
    "ytdGrossPay": 75000.00,
    "ytdNetPay": 58500.00,
    "ytdTaxes": 15000.00,
    "ytdDeductions": 1500.00,
    "firstPayPeriod": "2026-01-01",
    "lastPayPeriod": "2026-12-31"
  }
}
```

#### Get Employee Paychecks
```
GET /api/products/paylinq/employees/:employeeId/paychecks?limit=12
```

**Query Parameters:**
- `startDate` - (Optional) Filter paychecks from this date
- `endDate` - (Optional) Filter paychecks until this date
- `limit` - (Optional) Limit number of results (default: 12)

**Response:**
```json
{
  "success": true,
  "paychecks": [
    {
      "id": "uuid",
      "payPeriodStartDate": "2026-01-01",
      "payPeriodEndDate": "2026-01-15",
      "payDate": "2026-01-20",
      "grossPay": 6250.00,
      "netPay": 4875.00,
      "totalTaxes": 1250.00,
      "totalDeductions": 125.00,
      "status": "paid"
    }
  ],
  "count": 12
}
```

### Nexus - Time Off & Profile

#### Get Time Off Requests
```
GET /api/products/nexus/time-off/requests
```

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": "uuid",
      "employeeId": "uuid",
      "typeId": "uuid",
      "startDate": "2026-02-01",
      "endDate": "2026-02-07",
      "daysRequested": 5,
      "status": "approved",
      "notes": "Family vacation",
      "reviewedBy": "uuid",
      "reviewedAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### Create Time Off Request
```
POST /api/products/nexus/time-off/requests
```

**Request Body:**
```json
{
  "typeId": "uuid",
  "startDate": "2026-02-01",
  "endDate": "2026-02-07",
  "notes": "Family vacation"
}
```

#### Get Employee Profile
```
GET /api/products/nexus/employees/:id
```

**Response:**
```json
{
  "success": true,
  "employee": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "departmentId": "uuid",
    "jobTitle": "Software Engineer",
    "hireDate": "2020-01-15",
    "status": "active"
  }
}
```

### Push Notifications

#### Get VAPID Public Key
```
GET /api/notifications/vapid-public-key
```

**Response:**
```json
{
  "success": true,
  "publicKey": "BKCxD6URxNDjkU866Nvxqb5b3gwl0MHupD5Uko6NpIZDC7U9mgZNtTFq7zLE_e4-PiDGcF4upJO7K6AI-z3gTo0"
}
```

**Errors:**
- `503` - Push notifications not configured

#### Subscribe to Push Notifications
```
POST /api/notifications/subscribe
```

**Request Body:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "base64-encoded-key",
      "auth": "base64-encoded-auth"
    }
  },
  "deviceInfo": {
    "deviceType": "mobile",
    "browser": "Chrome",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "employee_id": "uuid",
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "is_active": true,
    "created_at": "2026-01-01T10:00:00Z"
  }
}
```

#### Get Subscriptions
```
GET /api/notifications/subscriptions
```

**Response:**
```json
{
  "success": true,
  "subscriptions": [
    {
      "id": "uuid",
      "device_type": "mobile",
      "browser": "Chrome",
      "is_active": true,
      "created_at": "2026-01-01T10:00:00Z",
      "last_used_at": "2026-01-01T12:00:00Z"
    }
  ]
}
```

#### Unsubscribe
```
DELETE /api/notifications/subscriptions/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Unsubscribed successfully"
}
```

#### Get Notification Preferences
```
GET /api/notifications/preferences
```

**Response:**
```json
{
  "success": true,
  "preferences": {
    "enabled": true,
    "schedule_reminders": true,
    "payroll_updates": true,
    "hr_announcements": true,
    "action_required": true,
    "shift_trades": true,
    "time_off_updates": true,
    "quiet_hours_enabled": false,
    "quiet_hours_start": null,
    "quiet_hours_end": null
  }
}
```

#### Update Notification Preferences
```
PUT /api/notifications/preferences
```

**Request Body:**
```json
{
  "schedule_reminders": false,
  "payroll_updates": true,
  "quiet_hours_enabled": true,
  "quiet_hours_start": "22:00:00",
  "quiet_hours_end": "08:00:00"
}
```

**Response:**
```json
{
  "success": true,
  "preferences": {
    "enabled": true,
    "schedule_reminders": false,
    "payroll_updates": true,
    ...
  }
}
```

#### Send Test Notification
```
POST /api/notifications/test
```

**Response:**
```json
{
  "success": true,
  "result": {
    "sent": 2,
    "failed": 0
  }
}
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors, business logic errors)
- `401` - Unauthorized (missing or invalid authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (push notifications not configured)

## Setup Requirements

### Environment Variables

Add to `.env`:

```bash
# Push Notifications
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

Generate VAPID keys:
```bash
node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log('Public:', keys.publicKey); console.log('Private:', keys.privateKey);"
```

### Database Migration

Run the push notification tables migration:

```bash
npm run migrate:latest
```

This creates:
- `hris.push_notification_subscription`
- `hris.push_notification_preference`
- `hris.push_notification_log`

## Testing

Run integration tests:

```bash
npm test -- tests/integration/push-notifications.test.js
```

## Security Considerations

1. **Employee Data Isolation**: All endpoints filter data by the authenticated employee's ID from the JWT token
2. **VAPID Keys**: Keep private key secret, rotate periodically
3. **Subscription Validation**: Subscription endpoints validate the subscription object format
4. **Rate Limiting**: All endpoints are subject to rate limiting middleware
5. **Geolocation**: Location data is optional and not required for clock-in/out
6. **Notification Preferences**: Employees control their notification preferences

## Future Enhancements

- [ ] Biometric authentication integration
- [ ] Geofencing for location-based clock-in restrictions
- [ ] Real-time notification delivery status tracking
- [ ] Notification delivery analytics
- [ ] Advanced notification scheduling
- [ ] Rich notification content with images and actions
