/**
 * Temporal Pattern Service
 * 
 * Business logic for evaluating temporal patterns in pay component conditions.
 * Supports pattern-based eligibility rules like "3 consecutive Sundays worked".
 * 
 * Phase 1: Day-of-week consecutive patterns
 * Phase 2: Shift type, station, role, hours patterns with AND/OR operators
 * Phase 3: Pattern templates, analytics, versioning
 * 
 * @module products/paylinq/services/temporalPatternService
 */

import Joi from 'joi';
import TimeAttendanceRepository from '../repositories/timeAttendanceRepository.ts';
import logger from '../../../utils/logger.ts';
import { ValidationError, NotFoundError } from '../../../middleware/errorHandler.ts';
import { query as defaultQuery } from '../../../config/database.ts';

class TemporalPatternService {
  constructor(timeAttendanceRepository = null, queryFn = null) {
    this.timeAttendanceRepository = timeAttendanceRepository || new TimeAttendanceRepository();
    this.query = queryFn || defaultQuery;
  }

  /**
   * Joi schema for pattern validation
   */
  get patternSchema() {
    return Joi.object({
      patternType: Joi.string()
        .valid('day_of_week', 'shift_type', 'station', 'role', 'hours_threshold', 'combined')
        .required(),
      dayOfWeek: Joi.string()
        .valid('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
        .when('patternType', { is: 'day_of_week', then: Joi.required() }),
      consecutiveCount: Joi.number()
        .integer()
        .min(1)
        .max(365)
        .required(),
      lookbackPeriodDays: Joi.number()
        .integer()
        .min(1)
        .max(730)
        .default(90),
      shiftTypeId: Joi.string()
        .uuid()
        .when('patternType', { is: 'shift_type', then: Joi.required() }),
      stationId: Joi.string()
        .uuid()
        .when('patternType', { is: 'station', then: Joi.required() }),
      roleId: Joi.string()
        .uuid()
        .when('patternType', { is: 'role', then: Joi.required() }),
      hoursThreshold: Joi.number()
        .min(0)
        .when('patternType', { is: 'hours_threshold', then: Joi.required() }),
      comparisonOperator: Joi.string()
        .valid('greater_than', 'less_than', 'equals', 'greater_or_equal', 'less_or_equal')
        .when('patternType', { is: 'hours_threshold', then: Joi.required() }),
      combinedPatterns: Joi.array()
        .items(Joi.object())
        .when('patternType', { is: 'combined', then: Joi.required() }),
      logicalOperator: Joi.string()
        .valid('AND', 'OR')
        .when('patternType', { is: 'combined', then: Joi.required() }),
    });
  }

  /**
   * Evaluate if a worker meets a temporal pattern condition
   * @param {string} employeeId - Employee UUID
   * @param {Object} pattern - Pattern configuration
   * @param {string} organizationId - Organization UUID
   * @param {Date} asOfDate - Date to evaluate pattern (default: today)
   * @returns {Promise<Object>} Evaluation result with qualified status and metadata
   */
  async evaluatePattern(employeeId, pattern, organizationId, asOfDate = new Date()) {
    // Validate pattern configuration
    const { error, value } = this.patternSchema.validate(pattern);
    if (error) {
      throw new ValidationError(`Invalid pattern configuration: ${error.details[0].message}`);
    }

    const validatedPattern = value;
    const startTime = Date.now();

    logger.debug('Evaluating temporal pattern', {
      employeeId,
      patternType: validatedPattern.patternType,
      asOfDate: asOfDate.toISOString(),
      organizationId,
    });

    let result;

    switch (validatedPattern.patternType) {
      case 'day_of_week':
        result = await this.evaluateDayOfWeekPattern(employeeId, validatedPattern, organizationId, asOfDate);
        break;

      case 'shift_type':
        result = await this.evaluateShiftTypePattern(employeeId, validatedPattern, organizationId, asOfDate);
        break;

      case 'station':
        result = await this.evaluateStationPattern(employeeId, validatedPattern, organizationId, asOfDate);
        break;

      case 'role':
        result = await this.evaluateRolePattern(employeeId, validatedPattern, organizationId, asOfDate);
        break;

      case 'hours_threshold':
        result = await this.evaluateHoursThresholdPattern(employeeId, validatedPattern, organizationId, asOfDate);
        break;

      case 'combined':
        result = await this.evaluateCombinedPattern(employeeId, validatedPattern, organizationId, asOfDate);
        break;

      default:
        throw new ValidationError(`Unsupported pattern type: ${validatedPattern.patternType}`);
    }

    const executionTime = Date.now() - startTime;

    logger.info('Pattern evaluation completed', {
      employeeId,
      patternType: validatedPattern.patternType,
      qualified: result.qualified,
      executionTime,
    });

    return {
      ...result,
      executionTime,
      evaluatedAt: asOfDate.toISOString(),
    };
  }

  /**
   * Evaluate day-of-week consecutive pattern (Phase 1 MVP)
   * Example: "Worker must work 3 consecutive Sundays"
   */
  async evaluateDayOfWeekPattern(employeeId, pattern, organizationId, asOfDate) {
    const { dayOfWeek, consecutiveCount, lookbackPeriodDays } = pattern;

    // Calculate lookback period
    const lookbackStart = new Date(asOfDate);
    lookbackStart.setDate(lookbackStart.getDate() - lookbackPeriodDays);

    // Fetch approved time entries for the period
    const timeEntries = await this.timeAttendanceRepository.findTimeEntries(
      {
        employeeId,
        startDate: lookbackStart.toISOString().split('T')[0],
        endDate: asOfDate.toISOString().split('T')[0],
        status: 'approved',
      },
      organizationId
    );

    // Map day names to JavaScript day numbers (0=Sunday, 1=Monday, etc.)
    const dayMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const targetDayNum = dayMap[dayOfWeek.toLowerCase()];

    // Filter entries for target day of week and sort by date
    // Parse dates as local noon to avoid timezone shifts from UTC midnight
    const targetDayEntries = timeEntries
      .filter((entry) => {
        // For date-only strings (YYYY-MM-DD), parse as local noon to avoid timezone issues
        const entryDate = new Date(entry.entry_date + 'T12:00:00');
        return entryDate.getDay() === targetDayNum;
      })
      .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));

    // Count consecutive occurrences
    const { maxConsecutive, consecutiveRuns, matchingDates } = this.countConsecutiveDays(
      targetDayEntries,
      dayOfWeek,
      consecutiveCount
    );

    const qualified = maxConsecutive >= consecutiveCount;

    return {
      qualified,
      patternType: 'day_of_week',
      metadata: {
        dayOfWeek,
        requiredConsecutive: consecutiveCount,
        actualMaxConsecutive: maxConsecutive,
        totalMatchingDays: targetDayEntries.length,
        lookbackPeriodDays,
        lookbackStart: lookbackStart.toISOString().split('T')[0],
        consecutiveRuns,
        matchingDates,
      },
    };
  }

  /**
   * Count consecutive occurrences of a specific day of week
   * @param {Array} entries - Sorted time entries for target day
   * @param {string} dayOfWeek - Day name
   * @param {number} requiredCount - Required consecutive count
   * @returns {Object} Consecutive count details
   */
  countConsecutiveDays(entries, dayOfWeek, requiredCount) {
    if (entries.length === 0) {
      return { maxConsecutive: 0, consecutiveRuns: [], matchingDates: [] };
    }

    const matchingDates = entries.map((e) => e.entry_date);
    const consecutiveRuns = [];
    let currentRun = [entries[0].entry_date];
    let maxConsecutive = 1;

    // Days between occurrences should be 7 for consecutive weeks
    const expectedGapDays = 7;

    for (let i = 1; i < entries.length; i++) {
      const prevDate = new Date(entries[i - 1].entry_date);
      const currDate = new Date(entries[i].entry_date);
      const daysBetween = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

      if (daysBetween === expectedGapDays) {
        // Consecutive occurrence (same day of week, next week)
        currentRun.push(entries[i].entry_date);
        maxConsecutive = Math.max(maxConsecutive, currentRun.length);
      } else {
        // Run broken, save current run if it meets minimum length
        if (currentRun.length >= 2) {
          consecutiveRuns.push({
            startDate: currentRun[0],
            endDate: currentRun[currentRun.length - 1],
            count: currentRun.length,
            dates: [...currentRun],
          });
        }
        // Start new run
        currentRun = [entries[i].entry_date];
      }
    }

    // Save final run
    if (currentRun.length >= 2) {
      consecutiveRuns.push({
        startDate: currentRun[0],
        endDate: currentRun[currentRun.length - 1],
        count: currentRun.length,
        dates: [...currentRun],
      });
    }

    return {
      maxConsecutive,
      consecutiveRuns: consecutiveRuns.sort((a, b) => b.count - a.count), // Sort by count descending
      matchingDates,
    };
  }

  /**
   * Evaluate shift type pattern (Phase 2)
   * Example: "Worker must work 5 consecutive night shifts"
   */
  async evaluateShiftTypePattern(employeeId, pattern, organizationId, asOfDate) {
    const { shiftTypeId, consecutiveCount, lookbackPeriodDays } = pattern;

    const lookbackStart = new Date(asOfDate);
    lookbackStart.setDate(lookbackStart.getDate() - lookbackPeriodDays);

    // Fetch time entries with specific shift type
    const timeEntries = await this.timeAttendanceRepository.findTimeEntries(
      {
        employeeId,
        startDate: lookbackStart.toISOString().split('T')[0],
        endDate: asOfDate.toISOString().split('T')[0],
        status: 'approved',
      },
      organizationId
    );

    // Filter for specific shift type
    const shiftTypeEntries = timeEntries.filter((e) => e.shift_type_id === shiftTypeId);

    // Count consecutive calendar days (not just same shift type on same day of week)
    const { maxConsecutive, consecutiveRuns, matchingDates } = this.countConsecutiveDates(
      shiftTypeEntries.map((e) => e.entry_date)
    );

    const qualified = maxConsecutive >= consecutiveCount;

    // Get shift type details for metadata
    let shiftTypeName = null;
    if (shiftTypeEntries.length > 0) {
      const shiftType = await this.timeAttendanceRepository.findShiftTypeById(shiftTypeId, organizationId);
      shiftTypeName = shiftType?.shift_name || null;
    }

    return {
      qualified,
      patternType: 'shift_type',
      metadata: {
        shiftTypeId,
        shiftTypeName,
        requiredConsecutive: consecutiveCount,
        actualMaxConsecutive: maxConsecutive,
        totalMatchingDays: shiftTypeEntries.length,
        lookbackPeriodDays,
        lookbackStart: lookbackStart.toISOString().split('T')[0],
        consecutiveRuns,
        matchingDates,
      },
    };
  }

  /**
   * Evaluate station pattern (Phase 2)
   * Example: "Worker must work 10 consecutive days at main warehouse"
   */
  async evaluateStationPattern(employeeId, pattern, organizationId, asOfDate) {
    const { stationId, consecutiveCount, lookbackPeriodDays } = pattern;

    const lookbackStart = new Date(asOfDate);
    lookbackStart.setDate(lookbackStart.getDate() - lookbackPeriodDays);

    // Query ScheduleHub shifts table for this employee and station
    const shiftsResult = await this.query(
      `SELECT DISTINCT shift_date
       FROM scheduling.shifts
       WHERE employee_id = $1
         AND station_id = $2
         AND organization_id = $3
         AND shift_date >= $4
         AND shift_date <= $5
         AND status IN ('completed', 'confirmed')
         AND deleted_at IS NULL
       ORDER BY shift_date`,
      [
        employeeId,
        stationId,
        organizationId,
        lookbackStart.toISOString().split('T')[0],
        asOfDate.toISOString().split('T')[0],
      ],
      organizationId
    );

    const stationDates = shiftsResult.rows.map((r) => r.shift_date);

    // Count consecutive days at this station
    const { maxConsecutive, consecutiveRuns, matchingDates } = this.countConsecutiveDates(stationDates);

    const qualified = maxConsecutive >= consecutiveCount;

    // Get station details for metadata
    let stationName = null;
    if (stationDates.length > 0) {
      const stationResult = await this.query(
        `SELECT station_name FROM scheduling.stations WHERE id = $1 AND organization_id = $2`,
        [stationId, organizationId],
        organizationId
      );
      stationName = stationResult.rows[0]?.station_name || null;
    }

    return {
      qualified,
      patternType: 'station',
      metadata: {
        stationId,
        stationName,
        requiredConsecutive: consecutiveCount,
        actualMaxConsecutive: maxConsecutive,
        totalMatchingDays: stationDates.length,
        lookbackPeriodDays,
        lookbackStart: lookbackStart.toISOString().split('T')[0],
        consecutiveRuns,
        matchingDates,
      },
    };
  }

  /**
   * Evaluate role pattern (Phase 2)
   * Example: "Worker must work 7 consecutive days as supervisor"
   */
  async evaluateRolePattern(employeeId, pattern, organizationId, asOfDate) {
    const { roleId, consecutiveCount, lookbackPeriodDays } = pattern;

    const lookbackStart = new Date(asOfDate);
    lookbackStart.setDate(lookbackStart.getDate() - lookbackPeriodDays);

    // Query ScheduleHub shifts table for this employee and role
    const shiftsResult = await this.query(
      `SELECT DISTINCT shift_date
       FROM scheduling.shifts
       WHERE employee_id = $1
         AND role_id = $2
         AND organization_id = $3
         AND shift_date >= $4
         AND shift_date <= $5
         AND status IN ('completed', 'confirmed')
         AND deleted_at IS NULL
       ORDER BY shift_date`,
      [
        employeeId,
        roleId,
        organizationId,
        lookbackStart.toISOString().split('T')[0],
        asOfDate.toISOString().split('T')[0],
      ],
      organizationId
    );

    const roleDates = shiftsResult.rows.map((r) => r.shift_date);

    // Count consecutive days in this role
    const { maxConsecutive, consecutiveRuns, matchingDates } = this.countConsecutiveDates(roleDates);

    const qualified = maxConsecutive >= consecutiveCount;

    // Get role details for metadata
    let roleName = null;
    if (roleDates.length > 0) {
      const roleResult = await this.query(
        `SELECT role_name FROM scheduling.roles WHERE id = $1 AND organization_id = $2`,
        [roleId, organizationId],
        organizationId
      );
      roleName = roleResult.rows[0]?.role_name || null;
    }

    return {
      qualified,
      patternType: 'role',
      metadata: {
        roleId,
        roleName,
        requiredConsecutive: consecutiveCount,
        actualMaxConsecutive: maxConsecutive,
        totalMatchingDays: roleDates.length,
        lookbackPeriodDays,
        lookbackStart: lookbackStart.toISOString().split('T')[0],
        consecutiveRuns,
        matchingDates,
      },
    };
  }

  /**
   * Evaluate hours threshold pattern (Phase 2)
   * Example: "Worker must work >40 hours in any consecutive 7-day period"
   */
  async evaluateHoursThresholdPattern(employeeId, pattern, organizationId, asOfDate) {
    const { hoursThreshold, comparisonOperator, consecutiveCount, lookbackPeriodDays } = pattern;

    const lookbackStart = new Date(asOfDate);
    lookbackStart.setDate(lookbackStart.getDate() - lookbackPeriodDays);

    const timeEntries = await this.timeAttendanceRepository.findTimeEntries(
      {
        employeeId,
        startDate: lookbackStart.toISOString().split('T')[0],
        endDate: asOfDate.toISOString().split('T')[0],
        status: 'approved',
      },
      organizationId
    );

    // Sort by date
    const sortedEntries = timeEntries.sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));

    // Find rolling window of N consecutive days that meets threshold
    let qualified = false;
    const qualifyingPeriods = [];

    for (let i = 0; i <= sortedEntries.length - consecutiveCount; i++) {
      const windowEntries = sortedEntries.slice(i, i + consecutiveCount);
      const totalHours = windowEntries.reduce((sum, e) => sum + parseFloat(e.worked_hours || 0), 0);

      const meetsThreshold = this.compareValue(totalHours, comparisonOperator, hoursThreshold);

      if (meetsThreshold) {
        qualified = true;
        qualifyingPeriods.push({
          startDate: windowEntries[0].entry_date,
          endDate: windowEntries[windowEntries.length - 1].entry_date,
          totalHours: Math.round(totalHours * 100) / 100,
          daysInPeriod: windowEntries.length,
        });
      }
    }

    return {
      qualified,
      patternType: 'hours_threshold',
      metadata: {
        hoursThreshold,
        comparisonOperator,
        consecutiveDays: consecutiveCount,
        lookbackPeriodDays,
        lookbackStart: lookbackStart.toISOString().split('T')[0],
        qualifyingPeriods,
      },
    };
  }

  /**
   * Evaluate combined pattern with AND/OR logic (Phase 2)
   * Example: "Worker must work 3 consecutive Sundays AND 5 night shifts"
   */
  async evaluateCombinedPattern(employeeId, pattern, organizationId, asOfDate) {
    const { combinedPatterns, logicalOperator } = pattern;

    const results = [];

    for (const subPattern of combinedPatterns) {
      const result = await this.evaluatePattern(employeeId, subPattern, organizationId, asOfDate);
      results.push(result);
    }

    let qualified;
    if (logicalOperator === 'AND') {
      qualified = results.every((r) => r.qualified);
    } else if (logicalOperator === 'OR') {
      qualified = results.some((r) => r.qualified);
    } else {
      throw new ValidationError(`Invalid logical operator: ${logicalOperator}`);
    }

    return {
      qualified,
      patternType: 'combined',
      metadata: {
        logicalOperator,
        subPatternResults: results.map((r) => ({
          patternType: r.patternType,
          qualified: r.qualified,
          metadata: r.metadata,
        })),
      },
    };
  }

  /**
   * Count consecutive calendar dates (any consecutive days)
   * @param {Array<string>} dates - Array of date strings (YYYY-MM-DD)
   * @returns {Object} Consecutive count details
   */
  countConsecutiveDates(dates) {
    if (dates.length === 0) {
      return { maxConsecutive: 0, consecutiveRuns: [], matchingDates: [] };
    }

    const sortedDates = [...dates].sort();
    const matchingDates = sortedDates;
    const consecutiveRuns = [];
    let currentRun = [sortedDates[0]];
    let maxConsecutive = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const daysBetween = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

      if (daysBetween === 1) {
        // Consecutive day
        currentRun.push(sortedDates[i]);
        maxConsecutive = Math.max(maxConsecutive, currentRun.length);
      } else if (daysBetween === 0) {
        // Same day (duplicate), continue run but don't increment count
        continue;
      } else {
        // Run broken
        if (currentRun.length >= 2) {
          consecutiveRuns.push({
            startDate: currentRun[0],
            endDate: currentRun[currentRun.length - 1],
            count: currentRun.length,
            dates: [...currentRun],
          });
        }
        currentRun = [sortedDates[i]];
      }
    }

    // Save final run
    if (currentRun.length >= 2) {
      consecutiveRuns.push({
        startDate: currentRun[0],
        endDate: currentRun[currentRun.length - 1],
        count: currentRun.length,
        dates: [...currentRun],
      });
    }

    return {
      maxConsecutive,
      consecutiveRuns: consecutiveRuns.sort((a, b) => b.count - a.count),
      matchingDates,
    };
  }

  /**
   * Compare a value against threshold with operator
   */
  compareValue(value, operator, threshold) {
    switch (operator) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return Math.abs(value - threshold) < 0.01; // Float comparison tolerance
      case 'greater_or_equal':
        return value >= threshold;
      case 'less_or_equal':
        return value <= threshold;
      default:
        throw new ValidationError(`Invalid comparison operator: ${operator}`);
    }
  }

  /**
   * Test pattern against multiple workers (for pattern builder UI preview)
   * @param {Object} pattern - Pattern configuration to test
   * @param {Array<string>} employeeIds - Array of employee UUIDs to test
   * @param {string} organizationId - Organization UUID
   * @param {Date} asOfDate - Date to evaluate pattern
   * @returns {Promise<Object>} Test results for all workers
   */
  async testPattern(pattern, employeeIds, organizationId, asOfDate = new Date()) {
    const results = [];

    // Fetch employee details for display
    const employeeDetailsQuery = `
      SELECT id, employee_number, first_name, last_name, job_title, department_id
      FROM hris.employee
      WHERE id = ANY($1) AND organization_id = $2
    `;
    const employeeDetails = await this.query(employeeDetailsQuery, [employeeIds, organizationId], organizationId);
    const employeeMap = new Map(employeeDetails.rows.map(e => [e.id, e]));

    for (const employeeId of employeeIds) {
      try {
        const result = await this.evaluatePattern(employeeId, pattern, organizationId, asOfDate);
        const employee = employeeMap.get(employeeId);
        
        results.push({
          employeeId,
          employeeNumber: employee?.employee_number,
          firstName: employee?.first_name,
          lastName: employee?.last_name,
          fullName: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
          jobTitle: employee?.job_title,
          ...result,
        });
      } catch (error) {
        logger.error('Error testing pattern for employee', {
          employeeId,
          error: error.message,
        });
        const employee = employeeMap.get(employeeId);
        results.push({
          employeeId,
          employeeNumber: employee?.employee_number,
          firstName: employee?.first_name,
          lastName: employee?.last_name,
          fullName: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
          jobTitle: employee?.job_title,
          qualified: false,
          error: error.message,
        });
      }
    }

    const qualifiedCount = results.filter((r) => r.qualified).length;

    return {
      totalTested: employeeIds.length,
      qualifiedCount,
      notQualifiedCount: employeeIds.length - qualifiedCount,
      qualifiedWorkers: results.filter((r) => r.qualified),
      notQualifiedWorkers: results.filter((r) => !r.qualified),
      allResults: results,
    };
  }
}

export default new TemporalPatternService();
