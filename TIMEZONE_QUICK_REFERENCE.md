# Timezone Quick Reference Guide

Quick reference for working with timezones in RecruitIQ.

## Table of Contents
- [Quick Start](#quick-start)
- [Common Patterns](#common-patterns)
- [API Endpoints](#api-endpoints)
- [Frontend Components](#frontend-components)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Backend

```javascript
import { 
  nowUTC, 
  toUTC, 
  fromUTC,
  formatInTimezone,
  calculateHours,
  startOfDayInTimezone,
  endOfDayInTimezone
} from '../utils/timezone.js';

// Get current UTC time
const now = nowUTC();

// Convert user input to UTC (from their timezone)
const utcDate = toUTC(userInput, req.timezone);

// Store in database
await db.query('INSERT INTO table (timestamp_field) VALUES ($1)', [utcDate]);

// Retrieve and format for display
const result = await db.query('SELECT timestamp_field FROM table');
const formatted = formatInTimezone(result.rows[0].timestamp_field, req.timezone, 'PPpp');
```

### Frontend

```javascript
import { formatDate, formatDateTime, toUTC } from '@recruitiq/utils';

// Format timestamp for display
const displayTime = formatDateTime(utcTimestamp, userTimezone);

// Format date-only for display
const displayDate = formatDate(dateString, userTimezone);

// Convert user input to UTC before sending to API
const utcDate = toUTC(localDate, userTimezone);
```

## Common Patterns

### Pattern 1: Clock In/Out

```javascript
// Backend Service
async clockIn(employeeId, timezone) {
  const clockInTime = nowUTC(); // Always use UTC for "now"
  
  await db.query(
    'INSERT INTO time_entries (employee_id, clock_in) VALUES ($1, $2)',
    [employeeId, clockInTime]
  );
  
  return { clock_in: clockInTime };
}

async clockOut(timeEntryId, timezone) {
  const clockOutTime = nowUTC();
  
  const result = await db.query(
    'UPDATE time_entries SET clock_out = $1 WHERE id = $2 RETURNING *',
    [clockOutTime, timeEntryId]
  );
  
  const entry = result.rows[0];
  const hours = calculateHours(entry.clock_in, entry.clock_out);
  
  await db.query(
    'UPDATE time_entries SET hours_worked = $1 WHERE id = $2',
    [hours, timeEntryId]
  );
  
  return { clock_out: clockOutTime, hours_worked: hours };
}
```

```javascript
// Frontend Component
function ClockInButton() {
  const timezone = getUserTimezone();
  
  const handleClockIn = async () => {
    const response = await api.post('/time-entries/clock-in', {}, {
      headers: { 'X-Timezone': timezone }
    });
    
    // Display in user's timezone
    const displayTime = formatDateTime(response.data.clock_in, timezone);
    alert(`Clocked in at ${displayTime}`);
  };
  
  return <button onClick={handleClockIn}>Clock In</button>;
}
```

### Pattern 2: Date Range Queries

```javascript
// Backend Service
async getTimeEntriesForDate(date, timezone) {
  // Get start and end of day in the specified timezone
  const startOfDay = startOfDayInTimezone(date, timezone);
  const endOfDay = endOfDayInTimezone(date, timezone);
  
  const result = await db.query(
    `SELECT * FROM time_entries 
     WHERE clock_in >= $1 AND clock_in < $2
     ORDER BY clock_in`,
    [startOfDay, endOfDay]
  );
  
  return result.rows;
}

async getTimeEntriesForPayrollPeriod(startDate, endDate, timezone) {
  const periodStart = parseDateInTimezone(startDate, timezone);
  const periodEnd = endOfDayInTimezone(endDate, timezone);
  
  const result = await db.query(
    `SELECT * FROM time_entries 
     WHERE clock_in >= $1 AND clock_in <= $2`,
    [periodStart, periodEnd]
  );
  
  return result.rows;
}
```

```javascript
// Frontend Component
function TimeEntryList({ date }) {
  const timezone = getUserTimezone();
  const [entries, setEntries] = useState([]);
  
  useEffect(() => {
    fetch(`/api/time-entries?date=${date}`, {
      headers: { 'X-Timezone': timezone }
    })
      .then(res => res.json())
      .then(data => setEntries(data));
  }, [date, timezone]);
  
  return (
    <div>
      {entries.map(entry => (
        <div key={entry.id}>
          {formatDateTime(entry.clock_in, timezone)} - 
          {entry.clock_out && formatDateTime(entry.clock_out, timezone)}
          ({entry.hours_worked} hours)
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: Date-Only Fields (Hire Date, Birth Date)

```javascript
// Backend Service
async createEmployee(data, timezone) {
  // Date-only fields: store as-is, no timezone conversion
  const hireDate = data.hire_date; // '2025-11-07'
  const birthDate = data.birth_date; // '1990-05-15'
  
  await db.query(
    'INSERT INTO employees (name, hire_date, birth_date) VALUES ($1, $2, $3)',
    [data.name, hireDate, birthDate]
  );
}
```

```javascript
// Frontend Component
function EmployeeForm() {
  const [formData, setFormData] = useState({
    name: '',
    hire_date: '', // YYYY-MM-DD
    birth_date: ''
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Send date-only fields as-is, no timezone conversion
    await api.post('/employees', formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="date" 
        value={formData.hire_date}
        onChange={e => setFormData({...formData, hire_date: e.target.value})}
      />
    </form>
  );
}
```

### Pattern 4: Scheduling/Shifts

```javascript
// Backend Service
async createShift(shiftData, timezone) {
  // Convert shift times from organization timezone to UTC
  const startTime = toUTC(shiftData.start_time, timezone);
  const endTime = toUTC(shiftData.end_time, timezone);
  
  const duration = calculateHours(startTime, endTime);
  
  await db.query(
    `INSERT INTO shifts (employee_id, start_time, end_time, duration_hours)
     VALUES ($1, $2, $3, $4)`,
    [shiftData.employee_id, startTime, endTime, duration]
  );
}

async getShiftsForWeek(startDate, timezone) {
  // Get week boundaries in organization timezone
  const weekStart = startOfDayInTimezone(startDate, timezone);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const result = await db.query(
    `SELECT * FROM shifts 
     WHERE start_time >= $1 AND start_time < $2
     ORDER BY start_time`,
    [weekStart, weekEnd]
  );
  
  return result.rows;
}
```

## API Endpoints

### Request Headers

Always include timezone in requests:

```
X-Timezone: America/New_York
```

Precedence: Header > User Setting > Organization Setting > UTC

### Response Headers

Server returns timezone context:

```
X-Timezone: America/New_York
X-Timezone-Source: header
```

Sources: `header`, `user`, `organization`, `default`

### Common Endpoints

#### Time Entries

```
POST   /api/time-entries/clock-in
POST   /api/time-entries/clock-out
GET    /api/time-entries?date=2025-11-07
GET    /api/time-entries?start_date=2025-11-01&end_date=2025-11-15
```

#### Schedules

```
POST   /api/schedules
GET    /api/schedules?start_date=2025-11-07&end_date=2025-11-14
PUT    /api/schedules/:id
```

#### Settings

```
PUT    /api/users/:id/timezone
PUT    /api/organizations/:id/timezone
```

## Frontend Components

### Using the Timezone Hook

```javascript
import { useTimezone } from '@recruitiq/utils';

function MyComponent() {
  const { timezone, formatDate, formatDateTime, toUTC } = useTimezone();
  
  // timezone is automatically set from context
  // formatDate, formatDateTime are memoized with current timezone
  
  return <div>Current timezone: {timezone}</div>;
}
```

### Timezone Selector

```javascript
import { TimezoneSelector } from '@recruitiq/ui';

function SettingsPage() {
  const [timezone, setTimezone] = useState('America/New_York');
  
  const handleSave = async () => {
    await api.put(`/users/${userId}/timezone`, { timezone });
  };
  
  return (
    <div>
      <TimezoneSelector 
        value={timezone}
        onChange={setTimezone}
      />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### Displaying Timestamps

```javascript
import { formatDateTime, formatDate, getRelativeTime } from '@recruitiq/utils';

function ActivityFeed({ activities }) {
  const timezone = getUserTimezone();
  
  return (
    <div>
      {activities.map(activity => (
        <div key={activity.id}>
          <span>{activity.description}</span>
          <span>{getRelativeTime(activity.created_at)}</span>
          <span className="text-sm text-gray-500">
            {formatDateTime(activity.created_at, timezone)}
          </span>
        </div>
      ))}
    </div>
  );
}
```

## Troubleshooting

### Issue: Times are off by several hours

**Cause**: Not converting to/from UTC properly

**Solution**: 
- Always use `toUTC()` when receiving user input
- Always use `fromUTC()` or `formatInTimezone()` when displaying
- Verify database columns are TIMESTAMPTZ not TIMESTAMP

### Issue: Date boundaries are wrong

**Cause**: Using UTC date boundaries instead of timezone-aware boundaries

**Solution**:
```javascript
// ❌ Wrong
const start = new Date(date + 'T00:00:00Z');

// ✅ Correct
const start = startOfDayInTimezone(date, timezone);
```

### Issue: Daylight saving time causing issues

**Cause**: Not accounting for DST transitions

**Solution**: Use timezone utilities which handle DST automatically:
```javascript
// date-fns-tz handles DST automatically
const formatted = formatInTimezone(date, timezone, 'PPpp');
```

### Issue: Multi-timezone organizations

**Cause**: Using single timezone for all locations

**Solution**:
- Store location timezone in locations table
- Use appropriate timezone for each location's operations
- Use organization timezone for organization-wide reports

### Issue: Frontend shows wrong time

**Cause**: Not sending timezone header

**Solution**:
```javascript
// Set up axios defaults
axios.defaults.headers.common['X-Timezone'] = getUserTimezone();

// Or per request
fetch('/api/endpoint', {
  headers: { 'X-Timezone': getUserTimezone() }
});
```

### Issue: Tests failing with timezone issues

**Cause**: Tests running in different timezones

**Solution**:
```javascript
// Mock timezone utilities in tests
jest.mock('../utils/timezone', () => ({
  nowUTC: jest.fn(() => new Date('2025-11-07T15:00:00Z')),
  // ... other mocks
}));

// Or set timezone for tests
process.env.TZ = 'UTC';
```

## Decision Flow Chart

```
User Input Date/Time
       ↓
Is it date-only? (hire_date, birth_date)
       ↓
  Yes → Store as-is (no conversion)
       ↓
  No → Convert to UTC using toUTC(input, timezone)
       ↓
Store in database (TIMESTAMPTZ column)
       ↓
Retrieve from database (already in UTC)
       ↓
Display to user? 
       ↓
  Yes → formatInTimezone(date, timezone, format)
       ↓
  No → Use as-is for calculations in UTC
```

## Cheat Sheet

| Operation | Function | Example |
|-----------|----------|---------|
| Get current time | `nowUTC()` | `const now = nowUTC();` |
| User input → UTC | `toUTC(date, tz)` | `const utc = toUTC(input, req.timezone);` |
| UTC → Display | `formatInTimezone(date, tz, fmt)` | `formatInTimezone(utc, 'America/New_York', 'PPpp')` |
| Date-only string | `toUTCDateString(date)` | `const str = toUTCDateString(now);` |
| Calculate duration | `calculateHours(start, end)` | `const hours = calculateHours(clockIn, clockOut);` |
| Start of day | `startOfDayInTimezone(date, tz)` | `const start = startOfDayInTimezone('2025-11-07', tz);` |
| End of day | `endOfDayInTimezone(date, tz)` | `const end = endOfDayInTimezone('2025-11-07', tz);` |
| Validate timezone | `isValidTimezone(tz)` | `if (isValidTimezone(input)) { ... }` |

## Additional Resources

- Full documentation: [TIMEZONE_ARCHITECTURE.md](./TIMEZONE_ARCHITECTURE.md)
- Example components: [TIMEZONE_EXAMPLES.jsx](./TIMEZONE_EXAMPLES.jsx)
- IANA Timezone Database: https://www.iana.org/time-zones
- date-fns-tz docs: https://github.com/marnusw/date-fns-tz

## Support

For questions or issues:
1. Check [TIMEZONE_ARCHITECTURE.md](./TIMEZONE_ARCHITECTURE.md) for detailed explanations
2. Review [TIMEZONE_EXAMPLES.jsx](./TIMEZONE_EXAMPLES.jsx) for working examples
3. Check the troubleshooting section above
4. Contact the engineering team
