# Timezone Architecture Implementation Guide

## Overview

This document describes the comprehensive timezone handling system implemented across the RecruitIQ application. The system ensures all dates and times are stored in UTC in the database and properly converted to user timezones for display.

## Architecture Principles

1. **Database**: All `TIMESTAMPTZ` columns store dates in UTC
2. **Backend**: All date operations use UTC; conversion happens at API boundaries
3. **Frontend**: Dates displayed in user's timezone using `date-fns-tz`
4. **Timezone Precedence**: Header → User Preference → Organization → UTC (default)

## Database Changes

### Schema Updates

All schema files have been updated to use `TIMESTAMPTZ` instead of `TIMESTAMP`:
- ✅ `schema.sql` - 80 occurrences updated
- ✅ `nexus-hris-schema.sql` - 68 occurrences updated
- ✅ `paylinq-schema.sql` - 91 occurrences updated
- ✅ `schedulehub-schema.sql` - 37 occurrences updated

### New Columns Added

**organizations table:**
```sql
timezone VARCHAR(100) NOT NULL DEFAULT 'UTC'
```

**users table:**
```sql
timezone VARCHAR(100) DEFAULT 'UTC'
```

### To Apply Changes

Run the database setup script:
```powershell
cd backend\src\database
.\setup-database.ps1
```

## Backend Implementation

### 1. Timezone Utility Module

**Location**: `backend/src/utils/timezone.js`

**Key Functions**:

```javascript
import { 
  nowUTC,           // Get current UTC time
  toUTC,            // Convert any date to UTC
  fromUTC,          // Convert UTC to specific timezone
  toUTCDateString,  // Get YYYY-MM-DD in UTC
  formatForDatabase,// Format for database storage
  formatInTimezone, // Format for display
  calculateHours,   // Calculate hours between dates
  startOfDayInTimezone, // Get start of day in timezone
  endOfDayInTimezone    // Get end of day in timezone
} from '../utils/timezone.js';
```

**Usage Examples**:

```javascript
// Get current UTC time (always use this instead of new Date())
const now = nowUTC();

// Convert user input to UTC before saving
const utcDate = toUTC(userDate, req.timezone);

// Format UTC date for user display
const displayDate = formatInTimezone(
  dbDate, 
  req.timezone, 
  'MMM dd, yyyy h:mm a'
);

// Get date range for a day in user's timezone
const { start, end } = getDayRangeInTimezone(date, req.timezone);
```

### 2. Timezone Middleware

**Location**: `backend/src/middleware/timezone.js`

**Integration**:

```javascript
// In your main app.js or server.js
import { timezoneMiddleware, timezoneHeaderMiddleware } from './middleware/timezone.js';

// Add after authentication middleware
app.use(timezoneMiddleware);
app.use(timezoneHeaderMiddleware);

// In route handlers
app.get('/api/data', (req, res) => {
  const timezone = req.timezone; // Available in all routes
  // Process with timezone context
});
```

**What it does**:
- Extracts timezone from headers, user preferences, or organization settings
- Makes `req.timezone` available to all route handlers
- Adds timezone headers to responses

### 3. Service Layer Updates

**Before**:
```javascript
// ❌ OLD: Timezone-naive
clockInTime: new Date()
entryDate: new Date().toISOString().split('T')[0]
```

**After**:
```javascript
// ✅ NEW: Timezone-aware
import { nowUTC, toUTCDateString } from '../../../utils/timezone.js';

clockInTime: nowUTC()
entryDate: toUTCDateString(nowUTC(), req.timezone)
```

### 4. API Response Formatting

**For Timestamps** (with time component):
```javascript
// Return full timezone-aware timestamp
{
  clockInTime: '2025-11-07T10:30:00.000Z',  // Always UTC
  clockInLocal: formatInTimezone(clockInTime, req.timezone),
  timezone: req.timezone
}
```

**For Date Fields** (hire_date, birth_date):
```javascript
// Date-only fields remain as YYYY-MM-DD
{
  hireDate: '2025-11-07',  // No timezone conversion needed
  hireDateFormatted: formatDateOnly(hireDate)
}
```

## Frontend Implementation

### 1. Timezone Utility Package

**Location**: `packages/utils/src/timezone.ts`

**Installation**: Already added to:
- ✅ `@recruitiq/utils`
- ✅ `nexus` app
- ✅ `paylinq` app

**Key Functions**:

```typescript
import { 
  formatDate,          // Format date in user's timezone
  formatDateTime,      // Format datetime in user's timezone
  formatDateOnly,      // Format date-only fields
  toUTC,               // Convert local to UTC for API
  getBrowserTimezone,  // Get user's browser timezone
  getUserTimezone,     // Get timezone from user/org context
  getRelativeTime      // "2 hours ago"
} from '@recruitiq/utils/timezone';
```

### 2. Usage in React Components

**Displaying Timestamps**:
```typescript
import { formatDateTime, formatDate } from '@recruitiq/utils/timezone';

function TimeDisplay({ utcTimestamp, timezone }) {
  return (
    <div>
      <p>{formatDateTime(utcTimestamp, timezone)}</p>
      {/* Output: Nov 07, 2025 10:30 AM */}
    </div>
  );
}
```

**Submitting Forms**:
```typescript
import { toUTC, getBrowserTimezone } from '@recruitiq/utils/timezone';

function ClockInButton() {
  const handleClockIn = async () => {
    const localTime = new Date();
    const timezone = getBrowserTimezone();
    
    await api.post('/clock-in', {
      clockInTime: toUTC(localTime, timezone)
    });
  };
}
```

**Date-Only Fields**:
```typescript
import { formatDateOnly, toDateString } from '@recruitiq/utils/timezone';

function HireDateDisplay({ hireDate }) {
  // hireDate is already YYYY-MM-DD from database
  return <p>{formatDateOnly(hireDate)}</p>;
  // Output: Nov 07, 2025
}

function HireDateInput() {
  const [date, setDate] = useState(new Date());
  
  const handleSubmit = () => {
    api.post('/employees', {
      hireDate: toDateString(date) // Converts to YYYY-MM-DD
    });
  };
}
```

### 3. Timezone Context Provider (Recommended)

Create a React context for timezone management:

```typescript
// contexts/TimezoneContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { getBrowserTimezone, getUserTimezone } from '@recruitiq/utils/timezone';

const TimezoneContext = createContext();

export function TimezoneProvider({ children, user, organization }) {
  const [timezone, setTimezone] = useState(() => 
    getUserTimezone(user, organization)
  );
  
  useEffect(() => {
    setTimezone(getUserTimezone(user, organization));
  }, [user, organization]);
  
  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  return useContext(TimezoneContext);
}

// Usage in components
function MyComponent() {
  const { timezone } = useTimezone();
  
  return <p>{formatDateTime(date, timezone)}</p>;
}
```

## API Integration

### Request Headers

Frontend should send timezone in requests:

```typescript
axios.defaults.headers.common['X-Timezone'] = getBrowserTimezone();

// Or per request
axios.get('/api/data', {
  headers: {
    'X-Timezone': timezone
  }
});
```

### Response Headers

Backend responds with timezone information:

```
X-Timezone: America/New_York
X-Timezone-Source: user
```

## Migration Strategy

### For Existing Services

1. **Import timezone utilities**:
```javascript
import { nowUTC, toUTC, formatInTimezone, toUTCDateString } from '../../../utils/timezone.js';
```

2. **Replace `new Date()` with `nowUTC()`**:
```javascript
// Before
const now = new Date();

// After
const now = nowUTC();
```

3. **Update date-only conversions**:
```javascript
// Before
entryDate: new Date().toISOString().split('T')[0]

// After
entryDate: toUTCDateString(nowUTC(), req.timezone)
```

4. **Add timezone context to responses**:
```javascript
res.json({
  success: true,
  data: {
    ...result,
    timezone: req.timezone
  }
});
```

### For New Features

- Always use UTC in database operations
- Use timezone utilities for all date operations
- Test with different timezones
- Document timezone handling in API docs

## Common Patterns

### Clock In/Out

```javascript
// Service
async clockIn(clockData, organizationId, userId, timezone) {
  const clockInTime = nowUTC();
  
  const event = await this.repository.createEvent({
    eventTimestamp: clockInTime,
    eventType: 'clock_in',
    // ... other fields
  });
  
  return {
    event,
    clockInTime: clockInTime.toISOString(),
    clockInLocal: formatInTimezone(clockInTime, timezone)
  };
}
```

### Date Range Queries

```javascript
import { startOfDayInTimezone, endOfDayInTimezone } from '../../../utils/timezone.js';

// Get records for a specific day in user's timezone
async getRecordsForDay(date, organizationId, timezone) {
  const dayStart = startOfDayInTimezone(date, timezone);
  const dayEnd = endOfDayInTimezone(date, timezone);
  
  return await db.query(`
    SELECT * FROM records
    WHERE organization_id = $1
    AND created_at >= $2
    AND created_at <= $3
  `, [organizationId, dayStart, dayEnd]);
}
```

### Payroll Period Calculations

```javascript
import { parseDateInTimezone, toUTCDateString } from '../../../utils/timezone.js';

// Pay period dates are date-only (no time component)
const periodStart = '2025-11-01'; // Already in YYYY-MM-DD format
const periodEnd = '2025-11-15';

// When querying time entries within period
const startUTC = parseDateInTimezone(periodStart, timezone); // Start of day in timezone
const endUTC = parseDateInTimezone(periodEnd, timezone);     // Start of day in timezone
```

## Testing

### Unit Tests

```javascript
import { nowUTC, toUTC, formatInTimezone } from '../utils/timezone.js';

describe('Timezone handling', () => {
  it('should store timestamps in UTC', () => {
    const time = nowUTC();
    expect(time.toISOString()).toMatch(/Z$/);
  });
  
  it('should convert local time to UTC', () => {
    const local = new Date('2025-11-07T10:00:00');
    const utc = toUTC(local, 'America/New_York');
    expect(utc).toBeInstanceOf(Date);
  });
  
  it('should format in specific timezone', () => {
    const utc = new Date('2025-11-07T15:00:00Z');
    const formatted = formatInTimezone(utc, 'America/New_York', 'h:mm a');
    expect(formatted).toBe('10:00 AM');
  });
});
```

### Integration Tests

```javascript
it('should handle clock-in across timezones', async () => {
  const response = await request(app)
    .post('/api/paylinq/time-attendance/clock-in')
    .set('X-Timezone', 'America/Los_Angeles')
    .send({ employeeRecordId: '...' });
    
  expect(response.body.clockInTime).toMatch(/Z$/); // UTC format
  expect(response.headers['x-timezone']).toBe('America/Los_Angeles');
});
```

## Troubleshooting

### Issue: Dates showing wrong day

**Cause**: Using `split('T')[0]` on UTC timestamp without timezone conversion

**Solution**: Use `toUTCDateString` or `toDateStringInTimezone`

### Issue: Payroll period boundaries incorrect

**Cause**: Not considering timezone when defining day boundaries

**Solution**: Use `startOfDayInTimezone` and `endOfDayInTimezone`

### Issue: Time calculations incorrect

**Cause**: Mixing local and UTC times

**Solution**: Always work in UTC internally, convert at boundaries

## Reference

### Supported Timezones

All IANA timezone identifiers are supported. Common ones:
- UTC
- America/New_York (EST/EDT)
- America/Chicago (CST/CDT)
- America/Denver (MST/MDT)
- America/Los_Angeles (PST/PDT)
- Europe/London (GMT/BST)
- Asia/Tokyo (JST)

### Date Format Reference

```javascript
TIMEZONE_FORMATS = {
  ISO8601: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",  // 2025-11-07T10:30:00.000-05:00
  ISO8601_DATE: 'yyyy-MM-dd',                // 2025-11-07
  DISPLAY_DATETIME: 'MMM dd, yyyy h:mm a',   // Nov 07, 2025 10:30 AM
  DISPLAY_DATE: 'MMM dd, yyyy',              // Nov 07, 2025
  DISPLAY_TIME: 'h:mm a',                    // 10:30 AM
}
```

## Next Steps

1. ✅ Review this guide
2. ⏳ Update remaining services (timeAttendanceService, payrollService, etc.)
3. ⏳ Add timezone selectors to user settings and organization settings
4. ⏳ Test with different timezones
5. ⏳ Update API documentation
6. ⏳ Add timezone information to UI (show user's timezone)

## Questions?

Contact the development team for assistance with timezone implementation.
