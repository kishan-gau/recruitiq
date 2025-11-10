# Paylinq Event System

## Overview

The Paylinq event system enables event-driven communication between Paylinq and other products in the platform (primarily Nexus HRIS). It uses Node.js `EventEmitter` for in-process event handling with support for event history tracking and statistics.

## Architecture

```
events/
├── eventEmitter.js          # Core event emitter with history tracking
├── eventTypes.js            # Event type definitions and validation
├── eventRegistry.js         # Handler registration system
├── index.js                 # Main exports
├── handlers/
│   └── hrisHandlers.js      # HRIS integration event handlers
└── emitters/
    └── payrollEmitters.js   # Payroll event emission functions
```

## Event Categories

### Consumed Events (from Nexus HRIS)
Events that Paylinq listens to and processes:

| Event Type | Description | Handler |
|------------|-------------|---------|
| `employee.created` | New employee added in HRIS | Creates payroll record |
| `employee.updated` | Employee data updated | Updates payroll status |
| `employee.terminated` | Employee terminated | Marks employee as terminated |
| `employee.rehired` | Employee rehired | Reactivates payroll record |
| `department.changed` | Department assignment changed | Informational (for cost centers) |
| `position.changed` | Position title changed | Informational |
| `compensation.changed` | Compensation updated | Creates new compensation record |
| `salary.adjusted` | Salary adjustment | Updates pay rate |
| `bonus.awarded` | Bonus granted | Creates bonus record |

### Emitted Events (to other systems)
Events that Paylinq emits during payroll operations:

#### Payroll Run Events
- `payroll.run.created` - New payroll run created
- `payroll.run.calculated` - Payroll calculations completed
- `payroll.run.approved` - Payroll run approved
- `payroll.run.processed` - Payroll run processed
- `payroll.run.completed` - Payroll run fully completed
- `payroll.run.cancelled` - Payroll run cancelled

#### Paycheck Events
- `paycheck.generated` - Paycheck created
- `paycheck.paid` - Payment issued to employee
- `paycheck.voided` - Paycheck voided
- `paycheck.reissued` - Paycheck reissued

#### Timesheet Events
- `timesheet.submitted` - Timesheet submitted for approval
- `timesheet.approved` - Timesheet approved
- `timesheet.rejected` - Timesheet rejected

#### Schedule Events
- `schedule.created` - Work schedule created
- `schedule.changed` - Schedule modified
- `schedule.cancelled` - Schedule cancelled

#### Reconciliation Events
- `reconciliation.completed` - Reconciliation finished
- `reconciliation.discrepancy` - Discrepancy found

#### Payment Events
- `payment.initiated` - Payment process started
- `payment.processed` - Payment successfully processed
- `payment.failed` - Payment failed

## Usage

### 1. Initialize Event System (Application Startup)

```javascript
const { registerEventHandlers } = require('./products/paylinq/events');

// Register all event handlers on app startup
registerEventHandlers();
```

### 2. Emit Events (from Services)

```javascript
const { emitPayrollRunCreated } = require('../events/emitters/payrollEmitters');

async function createPayrollRun(runData, organizationId, userId) {
  const payrollRun = await payrollRepository.createPayrollRun(runData, organizationId, userId);
  
  // Emit event for other systems
  emitPayrollRunCreated(payrollRun, organizationId);
  
  return payrollRun;
}
```

### 3. Consume Events (from Other Products)

Events from other products (like Nexus HRIS) should be emitted using the Paylinq event emitter:

```javascript
const paylinqEvents = require('./products/paylinq/events/eventEmitter');
const { CONSUMED_EVENTS } = require('./products/paylinq/events/eventTypes');

// When employee is created in HRIS
paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED, {
  organizationId: 'org-uuid',
  employeeId: 'emp-uuid',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  startDate: '2024-01-15',
  departmentId: 'dept-uuid',
  departmentName: 'Engineering',
  positionId: 'pos-uuid',
  positionTitle: 'Software Engineer',
  employmentType: 'full_time',
  status: 'active'
});
```

### 4. Event Monitoring

```javascript
const { getEventStats } = require('./products/paylinq/events');

// Get event statistics
const stats = getEventStats();
console.log(stats);
// Output:
// {
//   emitter: {
//     totalEventsEmitted: 150,
//     eventHistorySize: 100
//   },
//   listeners: {
//     'employee.created': 1,
//     'employee.updated': 1,
//     'compensation.changed': 1
//   }
// }
```

## Event Data Schemas

### employee.created
```javascript
{
  organizationId: 'uuid',
  employeeId: 'uuid',
  firstName: 'string',
  lastName: 'string',
  email: 'string',
  startDate: 'date',
  departmentId: 'uuid',
  departmentName: 'string',
  positionId: 'uuid',
  positionTitle: 'string',
  employmentType: 'full_time|part_time|contract|intern',
  status: 'active|inactive'
}
```

### employee.updated
```javascript
{
  organizationId: 'uuid',
  employeeId: 'uuid',
  changes: {
    status?: 'active|inactive|terminated|on_leave',
    departmentId?: 'uuid',
    positionId?: 'uuid',
    email?: 'string'
  },
  updatedBy: 'uuid',
  updatedAt: 'timestamp'
}
```

### compensation.changed
```javascript
{
  organizationId: 'uuid',
  employeeId: 'uuid',
  compensationType: 'salary|hourly|commission|contract',
  amount: 'number',
  currency: 'SRD|USD',
  effectiveDate: 'date',
  reason: 'string',
  changedBy: 'uuid'
}
```

### payroll.run.created
```javascript
{
  organizationId: 'uuid',
  payrollRunId: 'uuid',
  runNumber: 'string',
  payPeriodStart: 'date',
  payPeriodEnd: 'date',
  paymentDate: 'date',
  status: 'draft'
}
```

### paycheck.generated
```javascript
{
  organizationId: 'uuid',
  paycheckId: 'uuid',
  employeeId: 'uuid',
  payrollRunId: 'uuid',
  checkNumber: 'string',
  payPeriodStart: 'date',
  payPeriodEnd: 'date',
  payDate: 'date',
  grossPay: 'number',
  netPay: 'number',
  status: 'pending|paid|voided'
}
```

## Handler Implementation

Event handlers follow a consistent pattern:

```javascript
async function handleEmployeeCreated(eventData) {
  try {
    // 1. Validate event data
    const { organizationId, employeeId, firstName, lastName } = eventData;
    
    // 2. Check if already exists
    const existing = await payrollRepository.findByEmployeeId(employeeId, organizationId);
    if (existing) {
      return { success: true, action: 'skipped', reason: 'Record already exists' };
    }
    
    // 3. Create payroll record
    const employeeRecord = await payrollRepository.createEmployeeRecord({
      employeeId,
      employeeNumber: `EMP-${Date.now()}`,
      payFrequency: 'monthly',
      paymentMethod: 'ach',
      currency: 'SRD',
      status: 'active',
      startDate: eventData.startDate
    }, organizationId, 'system');
    
    // 4. Log success
    logger.info('Employee payroll record created', {
      employeeId,
      employeeRecordId: employeeRecord.id
    });
    
    // 5. Return result
    return {
      success: true,
      action: 'created',
      employeeRecordId: employeeRecord.id
    };
  } catch (error) {
    logger.error('Error handling employee.created event', { error: error.message });
    throw error;
  }
}
```

## Error Handling

- All event handlers have try-catch blocks
- Errors are logged but don't stop other handlers
- Failed events should be logged for manual review
- Critical failures should alert operations team

## Testing

### Unit Tests
```javascript
describe('Employee Created Handler', () => {
  it('should create payroll record for new employee', async () => {
    const eventData = {
      organizationId: 'org-123',
      employeeId: 'emp-456',
      firstName: 'John',
      lastName: 'Doe',
      startDate: '2024-01-15'
    };
    
    const result = await handleEmployeeCreated(eventData);
    
    expect(result.success).toBe(true);
    expect(result.action).toBe('created');
    expect(result.employeeRecordId).toBeDefined();
  });
});
```

### Integration Tests
```javascript
describe('Event Flow', () => {
  it('should emit and handle employee.created event', async () => {
    // Emit event
    paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED, eventData);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify payroll record created
    const record = await payrollRepository.findByEmployeeId(eventData.employeeId);
    expect(record).toBeDefined();
  });
});
```

## Graceful Shutdown

```javascript
const { unregisterEventHandlers } = require('./products/paylinq/events');

process.on('SIGTERM', () => {
  unregisterEventHandlers();
  // ... other cleanup
  process.exit(0);
});
```

## Monitoring & Observability

### Event History
```javascript
const paylinqEvents = require('./events/eventEmitter');

// Get last 50 events
const history = paylinqEvents.getEventHistory(50);
```

### Event Statistics
```javascript
const stats = paylinqEvents.getStats();
// { totalEventsEmitted: 1234, eventHistorySize: 100 }
```

## Best Practices

1. **Always emit events after database transactions complete**
2. **Include organizationId in all event data for multi-tenancy**
3. **Use descriptive event names following the pattern: `resource.action`**
4. **Log all event emissions and handler executions**
5. **Handle errors gracefully - don't crash on event failures**
6. **Keep event payloads small - include IDs, not full objects**
7. **Document all event schemas in this README**
8. **Test event handlers independently**
9. **Monitor event processing performance**
10. **Use semantic versioning for event schema changes**

## Future Enhancements

1. **Redis Streams**: Migrate to Redis-based event bus for distributed systems
2. **Event Replay**: Add ability to replay events for recovery
3. **Dead Letter Queue**: Handle consistently failing events
4. **Event Versioning**: Support multiple event schema versions
5. **Event Filtering**: Allow handlers to filter events by attributes
6. **Metrics Dashboard**: Real-time event processing dashboard
7. **Event Sourcing**: Store all events for audit trail
8. **Async Processing**: Queue long-running handlers

## Troubleshooting

### Events Not Being Processed
1. Check that `registerEventHandlers()` was called on startup
2. Verify event type matches exactly (check for typos)
3. Check logs for handler errors
4. Verify organizationId matches

### Duplicate Event Processing
1. Check for multiple handler registrations
2. Verify idempotency in handlers (check for existing records)

### Performance Issues
1. Monitor event history size (max 100 events)
2. Check for blocking operations in handlers
3. Consider async processing for heavy operations

## Support

For issues or questions about the event system:
- Check logs in `logs/paylinq-events.log`
- Review event history: `paylinqEvents.getEventHistory()`
- Contact Platform Team for event bus issues
