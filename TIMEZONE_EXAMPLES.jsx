/**
 * Example: Clock-In Component with Timezone Support
 * 
 * Demonstrates how to use timezone utilities in a React component
 */

import { useState } from 'react';
import { useTimezone } from '@recruitiq/utils/hooks/useTimezone';
import { apiClient } from '@recruitiq/api-client';

export function ClockInButton({ user, organization, employeeRecordId }) {
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [lastClockIn, setLastClockIn] = useState(null);
  const { timezone, format, toUTC } = useTimezone(user, organization);

  const handleClockIn = async () => {
    try {
      setIsClockingIn(true);
      
      // Get current local time
      const localTime = new Date();
      
      // Convert to UTC for API
      const utcTime = toUTC(localTime);
      
      // Send to API
      const response = await apiClient.post('/api/paylinq/time-attendance/clock-in', {
        employeeRecordId,
        clockInTime: utcTime,
        timezone: timezone // Send timezone for backend context
      }, {
        headers: {
          'X-Timezone': timezone // Include timezone in header
        }
      });
      
      setLastClockIn(response.data.clockInTime);
      alert('Clocked in successfully!');
      
    } catch (error) {
      console.error('Clock-in failed:', error);
      alert('Failed to clock in. Please try again.');
    } finally {
      setIsClockingIn(false);
    }
  };

  return (
    <div className="clock-in-panel">
      <div className="timezone-info">
        <span className="text-sm text-gray-500">
          Your timezone: {timezone}
        </span>
      </div>
      
      <button
        onClick={handleClockIn}
        disabled={isClockingIn}
        className="btn btn-primary"
      >
        {isClockingIn ? 'Clocking In...' : 'Clock In'}
      </button>
      
      {lastClockIn && (
        <div className="last-clock-in">
          <p className="text-sm">
            Last clocked in: {format.dateTime(lastClockIn)}
          </p>
          <p className="text-xs text-gray-500">
            {format.relative(lastClockIn)}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Time Entry List with Timezone Formatting
 */
export function TimeEntryList({ entries, user, organization }) {
  const { format, timezone } = useTimezone(user, organization);

  return (
    <div className="time-entries">
      <div className="header">
        <h2>Time Entries</h2>
        <span className="text-sm text-gray-500">Showing times in {timezone}</span>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id}>
              <td>{format.dateOnly(entry.entryDate)}</td>
              <td>{format.time(entry.clockIn)}</td>
              <td>{format.time(entry.clockOut)}</td>
              <td>{entry.workedHours.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Example: Employee Form with Date Fields
 */
export function EmployeeForm({ onSubmit, user, organization }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    hireDate: new Date(),
  });
  
  const { toDateString, format } = useTimezone(user, organization);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert hire date to YYYY-MM-DD format for API
    const employeeData = {
      ...formData,
      hireDate: toDateString(formData.hireDate)
    };
    
    onSubmit(employeeData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>First Name</label>
        <input
          type="text"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          required
        />
      </div>
      
      <div className="form-group">
        <label>Last Name</label>
        <input
          type="text"
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          required
        />
      </div>
      
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      
      <div className="form-group">
        <label>Hire Date</label>
        <input
          type="date"
          value={toDateString(formData.hireDate)}
          onChange={(e) => setFormData({ ...formData, hireDate: new Date(e.target.value) })}
          required
        />
        <span className="help-text">
          Selected: {format.dateOnly(toDateString(formData.hireDate))}
        </span>
      </div>
      
      <button type="submit" className="btn btn-primary">
        Create Employee
      </button>
    </form>
  );
}

/**
 * Example: Payroll Period Display
 */
export function PayrollPeriodCard({ payrollRun, user, organization }) {
  const { format } = useTimezone(user, organization);

  return (
    <div className="payroll-card">
      <h3>Payroll Run #{payrollRun.runNumber}</h3>
      
      <div className="period-info">
        <div>
          <label>Pay Period:</label>
          <span>
            {format.dateOnly(payrollRun.payPeriodStart)} - {format.dateOnly(payrollRun.payPeriodEnd)}
          </span>
        </div>
        
        <div>
          <label>Payment Date:</label>
          <span>{format.dateOnly(payrollRun.paymentDate)}</span>
        </div>
        
        {payrollRun.calculatedAt && (
          <div>
            <label>Calculated:</label>
            <span>
              {format.dateTime(payrollRun.calculatedAt)}
              <span className="text-sm text-gray-500 ml-2">
                ({format.relative(payrollRun.calculatedAt)})
              </span>
            </span>
          </div>
        )}
      </div>
      
      <div className="totals">
        <div>
          <label>Total Employees:</label>
          <span>{payrollRun.totalEmployees}</span>
        </div>
        <div>
          <label>Total Gross Pay:</label>
          <span>${payrollRun.totalGrossPay.toFixed(2)}</span>
        </div>
        <div>
          <label>Total Net Pay:</label>
          <span>${payrollRun.totalNetPay.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
