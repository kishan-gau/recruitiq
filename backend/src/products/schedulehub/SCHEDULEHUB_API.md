# ScheduleHub API Documentation

Complete REST API reference for ScheduleHub workforce scheduling system.

**Base URL:** `/api/schedulehub`  
**Authentication:** All endpoints require JWT token in Authorization header

---

## Workers

### Create Worker
Sync employee from Nexus HRIS to ScheduleHub.

**POST** `/workers`

```json
{
  "employeeId": "uuid",
  "status": "active|inactive|on_leave",
  "hireDate": "2024-01-01",
  "terminationDate": "2024-12-31",
  "primaryDepartmentId": "uuid",
  "primaryLocationId": "uuid",
  "defaultHourlyRate": 25.00,
  "maxHoursPerWeek": 40,
  "employmentType": "full_time|part_time|contract|seasonal"
}
```

### List Workers
Get workers with filters and pagination.

**GET** `/workers?status=active&departmentId=uuid&page=1&limit=50`

### Get Worker
**GET** `/workers/:id`

### Get Worker by Employee ID
**GET** `/workers/employee/:employeeId`

### Update Worker
**PATCH** `/workers/:id`

### Terminate Worker
Soft delete with automatic shift cancellation.

**POST** `/workers/:id/terminate`
```json
{
  "terminationDate": "2024-12-31"
}
```

### Get Worker Availability Summary
**GET** `/workers/:id/availability?startDate=2024-01-01&endDate=2024-01-31`

### Get Worker Shift History
**GET** `/workers/:id/shifts?startDate=2024-01-01&endDate=2024-01-31&status=completed`

---

## Schedules

### Create Schedule
Create a new draft schedule.

**POST** `/schedules`

```json
{
  "name": "Week of Jan 1-7",
  "startDate": "2024-01-01",
  "endDate": "2024-01-07",
  "status": "draft",
  "notes": "Holiday week schedule"
}
```

### List Schedules
**GET** `/schedules?status=published&startDate=2024-01-01&page=1&limit=20`

### Get Schedule
**GET** `/schedules/:id?includeShifts=true`

### Publish Schedule
Make schedule visible to workers.

**POST** `/schedules/:id/publish`

---

## Shifts

### Create Shift
Add shift to schedule.

**POST** `/schedules/:scheduleId/shifts`

```json
{
  "shiftDate": "2024-01-01",
  "startTime": "09:00",
  "endTime": "17:00",
  "roleId": "uuid",
  "stationId": "uuid",
  "workerId": "uuid",
  "breakMinutes": 60,
  "notes": "Morning shift"
}
```

### Update Shift
**PATCH** `/shifts/:id`

### Cancel Shift
**POST** `/shifts/:id/cancel`
```json
{
  "cancellationReason": "Employee called in sick"
}
```

### Assign Worker to Shift
**POST** `/shifts/:id/assign`
```json
{
  "workerId": "uuid"
}
```

### Unassign Worker from Shift
**POST** `/shifts/:id/unassign`

### Clock In
Start time tracking for shift.

**POST** `/shifts/:id/clock-in`

### Get Worker Shifts
**GET** `/workers/:workerId/shifts?startDate=2024-01-01&endDate=2024-01-31`

---

## Availability

### Create Availability
Define when worker is available.

**POST** `/availability`

```json
{
  "workerId": "uuid",
  "type": "recurring|one_time|unavailable",
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "priority": "required|preferred|available|unavailable",
  "reason": "Regular availability"
}
```

### Update Availability
**PATCH** `/availability/:id`

### Delete Availability
**DELETE** `/availability/:id`

### Get Worker Availability
**GET** `/workers/:workerId/availability?startDate=2024-01-01&type=recurring`

### Check Worker Availability
Check if worker is available for specific time.

**GET** `/workers/:workerId/check-availability?date=2024-01-01&startTime=09:00&endTime=17:00`

### Get Available Workers
Find all available workers for a shift.

**GET** `/available-workers?date=2024-01-01&startTime=09:00&endTime=17:00&roleId=uuid`

### Create Default Availability
Auto-create Mon-Fri 9am-5pm availability.

**POST** `/workers/:workerId/default-availability`

---

## Time Off

### Create Time Off Request
**POST** `/time-off`

```json
{
  "workerId": "uuid",
  "startDate": "2024-06-01",
  "endDate": "2024-06-07",
  "requestType": "vacation|sick|personal|unpaid",
  "reason": "Family vacation",
  "notes": "Pre-approved by manager"
}
```

### Review Time Off Request
Approve or deny request.

**POST** `/time-off/:id/review`
```json
{
  "status": "approved|denied",
  "reviewNotes": "Approved - sufficient coverage"
}
```

### Get Worker Requests
**GET** `/workers/:workerId/time-off?status=pending&startDate=2024-01-01`

### Get Pending Requests
Manager view of all pending requests.

**GET** `/time-off/pending`

### Cancel Time Off Request
**POST** `/time-off/:id/cancel`

### Get Request by ID
**GET** `/time-off/:id`

---

## Shift Swaps

### Create Swap Offer
Offer shift for trade.

**POST** `/shift-swaps`

```json
{
  "offeredShiftId": "uuid",
  "offeringWorkerId": "uuid",
  "swapType": "direct|open|trade",
  "targetWorkerId": "uuid",
  "requestedShiftId": "uuid",
  "reason": "Personal commitment",
  "notes": "Can trade for any morning shift"
}
```

**Swap Types:**
- `direct`: Specific worker swap
- `open`: Anyone can take it
- `trade`: Must offer shift in return

### Request Swap
Request to take offered shift.

**POST** `/shift-swaps/:offerId/request`
```json
{
  "requestingWorkerId": "uuid",
  "offeredShiftId": "uuid"
}
```

### Accept Swap Request
**POST** `/shift-swap-requests/:requestId/accept`
```json
{
  "requiresApproval": true
}
```

### Approve Swap
Manager approval.

**POST** `/shift-swaps/:offerId/approve`
```json
{
  "requestId": "uuid"
}
```

### Get Open Offers
Marketplace of available shifts.

**GET** `/shift-swaps/marketplace?startDate=2024-01-01&roleId=uuid`

### Get Worker Offers
**GET** `/workers/:workerId/swap-offers?status=pending`

### Get Offer Requests
**GET** `/shift-swaps/:offerId/requests`

### Cancel Offer
**POST** `/shift-swaps/:offerId/cancel`

### Get Offer by ID
**GET** `/shift-swaps/:id`

---

## Roles

### Create Role
Define job role.

**POST** `/roles`

```json
{
  "name": "Cashier",
  "code": "CASH-01",
  "description": "Front-end cashier role",
  "departmentId": "uuid",
  "requiredCertifications": ["Food Handler", "POS Training"],
  "defaultHourlyRate": 18.50,
  "isActive": true
}
```

### List Roles
**GET** `/roles?isActive=true&departmentId=uuid`

### Get Role
**GET** `/roles/:id`

### Update Role
**PATCH** `/roles/:id`

### Get Role Workers
**GET** `/roles/:id/workers?includeInactive=false`

### Assign Worker to Role
**POST** `/roles/:roleId/workers`
```json
{
  "workerId": "uuid",
  "proficiencyLevel": "trainee|competent|proficient|expert",
  "certificationDate": "2024-01-01",
  "notes": "Completed all training modules"
}
```

### Remove Worker from Role
**DELETE** `/roles/:roleId/workers/:workerId`

### Update Worker Role Assignment
**PATCH** `/roles/:roleId/workers/:workerId`

### Get Worker Roles
**GET** `/workers/:workerId/roles?includeInactive=false`

---

## Stations

### Create Station
Define work location.

**POST** `/stations`

```json
{
  "name": "Checkout Lane 1",
  "code": "LANE-01",
  "description": "Front checkout lane",
  "locationId": "uuid",
  "capacity": 1,
  "requiresSupervision": false,
  "floor": "Ground",
  "zone": "Front End",
  "isActive": true
}
```

### List Stations
**GET** `/stations?isActive=true&locationId=uuid`

### Get Station
**GET** `/stations/:id`

### Update Station
**PATCH** `/stations/:id`

### Get Station Requirements
Get role requirements for station.

**GET** `/stations/:id/requirements`

### Add Role Requirement
Define min/max workers per role.

**POST** `/stations/:stationId/requirements`
```json
{
  "roleId": "uuid",
  "minWorkers": 1,
  "maxWorkers": 2,
  "priority": "required|preferred|optional"
}
```

### Update Role Requirement
**PATCH** `/stations/:stationId/requirements/:roleId`

### Remove Role Requirement
**DELETE** `/stations/:stationId/requirements/:roleId`

---

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": {}
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

---

## Authentication

Include JWT token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

All endpoints require valid authentication. The token must include:
- `user.id` - User ID
- `user.organization_id` - Organization ID

---

## Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (business rule violation)
- `500` - Internal Server Error

---

## Rate Limiting

- **Global**: 100 requests per 15 minutes
- **Auth endpoints**: 5 requests per 15 minutes

---

## Cross-Product Integration

### Nexus HRIS Integration
- Workers sync from Nexus employees
- Employee data (name, department, location) pulled from `hris.employees`
- User references linked via `public.users`

### Paylinq Integration
- Clock-out creates time entries in Paylinq
- Hours tracked in `payroll.time_entry`
- Regular vs. overtime hours calculated automatically
- Time entries link to shifts via `source_reference`

---

## Best Practices

1. **Always check worker availability** before assigning shifts
2. **Publish schedules** to make them visible to workers
3. **Use swap credits** to incentivize shift coverage
4. **Set station requirements** for optimal scheduling
5. **Create default availability** for new workers
6. **Review time off requests** promptly to enable planning
7. **Use role proficiency levels** for skill-based scheduling
8. **Track certifications** for compliance
9. **Monitor coverage requirements** for optimization
10. **Clock in/out accurately** for payroll integration

---

## Workflow Examples

### Creating a Schedule
1. POST `/schedules` - Create draft schedule
2. POST `/schedules/:id/shifts` - Add shifts
3. POST `/shifts/:id/assign` - Assign workers
4. POST `/schedules/:id/publish` - Publish to workers

### Processing Time Off
1. POST `/time-off` - Worker creates request
2. GET `/time-off/pending` - Manager reviews
3. POST `/time-off/:id/review` - Approve/deny
4. Auto-creates unavailability if approved

### Shift Swap
1. POST `/shift-swaps` - Worker offers shift
2. GET `/shift-swaps/marketplace` - Others browse
3. POST `/shift-swaps/:id/request` - Request swap
4. POST `/shift-swap-requests/:id/accept` - Accept
5. POST `/shift-swaps/:id/approve` - Manager approves

### Time Tracking
1. POST `/shifts/:id/clock-in` - Worker clocks in
2. Worker completes shift
3. Shift service `clockOut()` called
4. Time entry created in Paylinq
5. Hours available for payroll processing
