/**
 * Enhanced Worker Exclusion Analysis
 * 
 * This enhancement modifies the existing exclusion handling in generateShiftsFromDedicatedTemplate
 * to provide detailed explanations about WHY workers are excluded from auto-generation.
 * 
 * Integration Point: Lines 2092-2124 in scheduleService.js
 * When availableWorkers.length === 0, this analysis provides specific exclusion reasons.
 */

/**
 * Analyzes why workers are excluded from auto-generation
 * 
 * @param {Object} params - Analysis parameters
 * @param {string} params.roleId - Required role ID
 * @param {string} params.stationId - Station ID
 * @param {Date} params.shiftDate - Target date
 * @param {number} params.dayOfWeek - Day of week (0=Sunday, 1=Monday, etc.)
 * @param {string} params.startTime - Shift start time (HH:mm format)
 * @param {string} params.endTime - Shift end time (HH:mm format)
 * @param {string} params.organizationId - Organization ID
 * @param {string} params.templateName - Template name for context
 * @param {Object} query - Database query function
 * @returns {Object} Detailed exclusion analysis
 */
export async function analyzeWorkerExclusions(params, query) {
  const { roleId, stationId, shiftDate, dayOfWeek, startTime, endTime, organizationId, templateName } = params;
  const dateString = shiftDate.toISOString().split('T')[0];
  
  console.log('🔍 ENHANCED EXCLUSION ANALYSIS: Starting detailed analysis for:', {
    templateName,
    roleId,
    stationId,
    date: dateString,
    timeRange: `${startTime}-${endTime}`
  });

  const exclusionAnalysis = {
    totalWorkersChecked: 0,
    exclusionReasons: {
      noRole: { count: 0, workers: [] },
      inactiveRole: { count: 0, workers: [] },
      noSchedulingConfig: { count: 0, workers: [] },
      schedulingDisabled: { count: 0, workers: [] },
      inactiveScheduling: { count: 0, workers: [] },
      inactiveEmployee: { count: 0, workers: [] },
      noAvailability: { count: 0, workers: [] },
      timeConflict: { count: 0, workers: [] },
      existingShift: { count: 0, workers: [] },
      unavailable: { count: 0, workers: [] }
    },
    warnings: [],
    summary: ''
  };

  // Step 1: Get all employees in organization with basic info
  const allEmployeesQuery = `
    SELECT e.id, e.first_name, e.last_name, e.employee_number, e.employment_status,
           wr.role_id, wr.removed_date as role_removed_date,
           wsc.is_schedulable, wsc.scheduling_status
    FROM hris.employee e
    LEFT JOIN scheduling.worker_roles wr ON e.id = wr.employee_id AND wr.role_id = $2
    LEFT JOIN scheduling.worker_scheduling_config wsc ON e.id = wsc.employee_id AND wsc.organization_id = e.organization_id
    WHERE e.organization_id = $1
      AND e.employment_status = 'active'
    ORDER BY e.last_name, e.first_name
  `;

  const allEmployees = await query(allEmployeesQuery, [organizationId, roleId], organizationId, {
    operation: 'SELECT',
    table: 'hris.employee'
  });

  console.log('📊 EXCLUSION ANALYSIS: Found', allEmployees.rows.length, 'active employees');
  exclusionAnalysis.totalWorkersChecked = allEmployees.rows.length;

  for (const employee of allEmployees.rows) {
    const workerName = `${employee.first_name} ${employee.last_name}`;
    
    // Check exclusion reasons in order of SQL query logic
    
    // 1. No role assigned
    if (!employee.role_id) {
      exclusionAnalysis.exclusionReasons.noRole.count++;
      exclusionAnalysis.exclusionReasons.noRole.workers.push({
        id: employee.id,
        name: workerName,
        employeeNumber: employee.employee_number
      });
      continue;
    }

    // 2. Role is removed/inactive
    if (employee.role_removed_date) {
      exclusionAnalysis.exclusionReasons.inactiveRole.count++;
      exclusionAnalysis.exclusionReasons.inactiveRole.workers.push({
        id: employee.id,
        name: workerName,
        employeeNumber: employee.employee_number,
        removedDate: employee.role_removed_date
      });
      continue;
    }

    // 3. No scheduling configuration record (MAIN ISSUE)
    if (employee.is_schedulable === null && employee.scheduling_status === null) {
      exclusionAnalysis.exclusionReasons.noSchedulingConfig.count++;
      exclusionAnalysis.exclusionReasons.noSchedulingConfig.workers.push({
        id: employee.id,
        name: workerName,
        employeeNumber: employee.employee_number,
        action: 'Create scheduling configuration in Worker Settings'
      });
      continue;
    }

    // 4. Scheduling explicitly disabled
    if (employee.is_schedulable === false) {
      exclusionAnalysis.exclusionReasons.schedulingDisabled.count++;
      exclusionAnalysis.exclusionReasons.schedulingDisabled.workers.push({
        id: employee.id,
        name: workerName,
        employeeNumber: employee.employee_number,
        action: 'Enable scheduling in Worker Settings'
      });
      continue;
    }

    // 5. Scheduling status inactive
    if (employee.scheduling_status && employee.scheduling_status !== 'active') {
      exclusionAnalysis.exclusionReasons.inactiveScheduling.count++;
      exclusionAnalysis.exclusionReasons.inactiveScheduling.workers.push({
        id: employee.id,
        name: workerName,
        employeeNumber: employee.employee_number,
        status: employee.scheduling_status,
        action: 'Set scheduling status to active in Worker Settings'
      });
      continue;
    }

    // Now check availability and conflicts for workers with proper config
    await checkAvailabilityAndConflicts(employee, params, exclusionAnalysis, query);
  }

  // Generate summary and warnings
  generateExclusionSummary(exclusionAnalysis, params);
  
  return exclusionAnalysis;
}

/**
 * Checks availability and shift conflicts for properly configured workers
 */
async function checkAvailabilityAndConflicts(employee, params, exclusionAnalysis, query) {
  const { shiftDate, dayOfWeek, startTime, endTime, organizationId } = params;
  const dateString = shiftDate.toISOString().split('T')[0];
  const workerName = `${employee.first_name} ${employee.last_name}`;

  // Check for availability records
  const availabilityQuery = `
    SELECT wa.availability_type, wa.day_of_week, wa.specific_date, 
           wa.start_time, wa.end_time, wa.priority,
           wa.effective_from, wa.effective_to
    FROM scheduling.worker_availability wa
    WHERE wa.employee_id = $1 
      AND wa.organization_id = $2
      AND (
        -- Recurring availability for this day of week
        (wa.availability_type = 'recurring' 
         AND wa.day_of_week = $3
         AND wa.start_time <= $4::time AND wa.end_time >= $5::time)
        OR
        -- Specific date availability
        (wa.availability_type = 'one_time'
         AND wa.specific_date = $6
         AND wa.start_time <= $4::time AND wa.end_time >= $5::time)
      )
      AND (wa.effective_from IS NULL OR wa.effective_from <= $6)
      AND (wa.effective_to IS NULL OR wa.effective_to >= $6)
  `;

  const availability = await query(availabilityQuery, 
    [employee.id, organizationId, dayOfWeek, startTime, endTime, dateString], 
    organizationId,
    { operation: 'SELECT', table: 'scheduling.worker_availability' }
  );

  if (availability.rows.length === 0) {
    exclusionAnalysis.exclusionReasons.noAvailability.count++;
    exclusionAnalysis.exclusionReasons.noAvailability.workers.push({
      id: employee.id,
      name: workerName,
      employeeNumber: employee.employee_number,
      timeRange: `${startTime}-${endTime}`,
      action: 'Add availability in Worker Calendar'
    });
    return;
  }

  // Check for unavailable priority
  const unavailableAvailability = availability.rows.find(a => a.priority === 'unavailable');
  if (unavailableAvailability) {
    exclusionAnalysis.exclusionReasons.unavailable.count++;
    exclusionAnalysis.exclusionReasons.unavailable.workers.push({
      id: employee.id,
      name: workerName,
      employeeNumber: employee.employee_number,
      timeRange: `${startTime}-${endTime}`,
      reason: 'Marked as unavailable',
      action: 'Remove unavailability or change priority in Worker Calendar'
    });
    return;
  }

  // Check for time conflicts (partial coverage)
  const partialCoverageAvailability = availability.rows.filter(a => 
    a.start_time > startTime || a.end_time < endTime
  );
  
  if (partialCoverageAvailability.length > 0 && availability.rows.every(a => 
    a.start_time > startTime || a.end_time < endTime
  )) {
    exclusionAnalysis.exclusionReasons.timeConflict.count++;
    exclusionAnalysis.exclusionReasons.timeConflict.workers.push({
      id: employee.id,
      name: workerName,
      employeeNumber: employee.employee_number,
      requiredTime: `${startTime}-${endTime}`,
      availableTime: availability.rows.map(a => `${a.start_time}-${a.end_time}`).join(', '),
      action: 'Extend availability time range in Worker Calendar'
    });
    return;
  }

  // Check for existing shifts
  const existingShiftQuery = `
    SELECT s.start_time, s.end_time, s.status
    FROM scheduling.shifts s
    WHERE s.employee_id = $1
      AND s.shift_date = $2
      AND s.status != 'cancelled'
      AND (
        (s.start_time <= $3::time AND s.end_time > $3::time) OR
        (s.start_time < $4::time AND s.end_time >= $4::time) OR
        (s.start_time >= $3::time AND s.end_time <= $4::time)
      )
  `;

  const existingShifts = await query(existingShiftQuery,
    [employee.id, dateString, startTime, endTime],
    organizationId,
    { operation: 'SELECT', table: 'scheduling.shifts' }
  );

  if (existingShifts.rows.length > 0) {
    exclusionAnalysis.exclusionReasons.existingShift.count++;
    exclusionAnalysis.exclusionReasons.existingShift.workers.push({
      id: employee.id,
      name: workerName,
      employeeNumber: employee.employee_number,
      conflictingShifts: existingShifts.rows.map(s => 
        `${s.start_time}-${s.end_time} (${s.status})`
      ),
      action: 'Resolve conflicting shift or adjust template timing'
    });
    return;
  }

  // If we get here, the worker should have been available - this is unexpected
  console.log('⚠️  UNEXPECTED: Worker should be available but was excluded:', workerName);
}

/**
 * Generates human-readable summary and actionable warnings
 */
function generateExclusionSummary(analysis, params) {
  const { templateName, stationId, startTime, endTime } = params;
  const dateString = params.shiftDate.toISOString().split('T')[0];

  // Generate detailed warnings for each exclusion reason
  const reasons = analysis.exclusionReasons;

  if (reasons.noSchedulingConfig.count > 0) {
    const workerNames = reasons.noSchedulingConfig.workers.map(w => w.name).join(', ');
    analysis.warnings.push({
      type: 'missing_scheduling_config',
      severity: 'high',
      message: `${reasons.noSchedulingConfig.count} workers need scheduling configuration: ${workerNames}`,
      action: 'Configure workers in Worker Settings → Scheduling Configuration',
      workers: reasons.noSchedulingConfig.workers,
      template: templateName,
      timeSlot: `${dateString} ${startTime}-${endTime}`
    });
  }

  if (reasons.schedulingDisabled.count > 0) {
    const workerNames = reasons.schedulingDisabled.workers.map(w => w.name).join(', ');
    analysis.warnings.push({
      type: 'scheduling_disabled',
      severity: 'medium',
      message: `${reasons.schedulingDisabled.count} workers have scheduling disabled: ${workerNames}`,
      action: 'Enable scheduling in Worker Settings',
      workers: reasons.schedulingDisabled.workers,
      template: templateName
    });
  }

  if (reasons.noAvailability.count > 0) {
    const workerNames = reasons.noAvailability.workers.map(w => w.name).join(', ');
    analysis.warnings.push({
      type: 'no_availability',
      severity: 'medium',
      message: `${reasons.noAvailability.count} workers have no availability for ${startTime}-${endTime}: ${workerNames}`,
      action: 'Add availability in Worker Calendar',
      workers: reasons.noAvailability.workers,
      template: templateName
    });
  }

  if (reasons.noRole.count > 0) {
    const workerNames = reasons.noRole.workers.map(w => w.name).join(', ');
    analysis.warnings.push({
      type: 'missing_role',
      severity: 'low',
      message: `${reasons.noRole.count} workers don't have required role: ${workerNames}`,
      action: 'Assign role in Worker Settings → Roles',
      workers: reasons.noRole.workers,
      template: templateName
    });
  }

  // Generate summary
  const totalExcluded = Object.values(reasons).reduce((sum, reason) => sum + reason.count, 0);
  const mainIssues = [];
  
  if (reasons.noSchedulingConfig.count > 0) {
    mainIssues.push(`${reasons.noSchedulingConfig.count} need scheduling configuration`);
  }
  if (reasons.noAvailability.count > 0) {
    mainIssues.push(`${reasons.noAvailability.count} lack availability`);
  }
  if (reasons.schedulingDisabled.count > 0) {
    mainIssues.push(`${reasons.schedulingDisabled.count} have scheduling disabled`);
  }

  analysis.summary = totalExcluded > 0 
    ? `${totalExcluded}/${analysis.totalWorkersChecked} workers excluded: ${mainIssues.join(', ')}`
    : `All ${analysis.totalWorkersChecked} workers are available`;
}

/**
 * Integration function for existing scheduleService.js
 * Call this at line 2095 when availableWorkers.length === 0
 */
export async function enhanceExclusionWarnings(params, query) {
  const analysis = await analyzeWorkerExclusions(params, query);
  
  // Return enhanced warnings in the format expected by existing code
  return analysis.warnings.map(warning => ({
    message: warning.message,
    action: warning.action,
    workers: warning.workers,
    type: warning.type,
    severity: warning.severity,
    details: {
      template: params.templateName,
      station: params.stationId,
      date: params.shiftDate.toISOString().split('T')[0],
      timeRange: `${params.startTime}-${params.endTime}`
    }
  }));
}