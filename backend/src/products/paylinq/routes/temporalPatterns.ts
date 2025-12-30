/**
 * Temporal Pattern Routes
 * Defines REST endpoints for temporal pattern evaluation and testing
 * 
 * @module products/paylinq/routes/temporalPatterns
 */

import express, { Router } from 'express';
import Joi from 'joi';
import temporalPatternService from '../services/temporalPatternService.ts';
import { ValidationError } from '../../../middleware/errorHandler.ts';
import logger from '../../../utils/logger.ts';

const router: Router = express.Router();

// Rate limiting configurations (for future implementation)
// Pattern testing is resource-intensive, limit to 10 requests per minute per user
const RATE_LIMIT_CONFIG = {
  test: { maxRequests: 10, windowMinutes: 1 },
  evaluate: { maxRequests: 50, windowMinutes: 1 },
};

/**
 * POST /api/paylinq/patterns/test
 * Test a temporal pattern against workers
 * 
 * Request Body:
 * {
 *   "pattern": {
 *     "patternType": "day_of_week",
 *     "dayOfWeek": "sunday",
 *     "consecutiveCount": 3,
 *     "lookbackPeriodDays": 90
 *   },
 *   "employeeIds": ["uuid1", "uuid2"],
 *   "asOfDate": "2024-03-15" (optional, defaults to today)
 * }
 * 
 * Response (API Standards Compliant):
 * {
 *   "success": true,
 *   "testResults": {
 *     "totalTested": 2,
 *     "qualifiedCount": 1,
 *     "notQualifiedCount": 1,
 *     "qualifiedWorkers": [...],
 *     "notQualifiedWorkers": [...],
 *     "allResults": [...]
 *   }
 * }
 */
router.post('/test', async (req, res, next) => {
  try {
    const { organizationId, userId } = req.user;

    // Validation schema
    const schema = Joi.object({
      pattern: Joi.object().required(),
      employeeIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
      asOfDate: Joi.date().iso().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { pattern, employeeIds, asOfDate } = value;
    const evaluationDate = asOfDate ? new Date(asOfDate) : new Date();

    logger.info('Testing temporal pattern', {
      organizationId,
      userId,
      patternType: pattern.patternType,
      employeeCount: employeeIds.length,
    });

    const testResults = await temporalPatternService.testPattern(
      pattern,
      employeeIds,
      organizationId,
      evaluationDate
    );

    // API Standards: Return test results directly at root level
    res.status(200).json({
      success: true,
      totalTested: testResults.totalTested,
      qualifiedCount: testResults.qualifiedCount,
      notQualifiedCount: testResults.notQualifiedCount,
      qualifiedWorkers: testResults.qualifiedWorkers,
      notQualifiedWorkers: testResults.notQualifiedWorkers,
      allResults: testResults.allResults,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/paylinq/patterns/evaluate
 * Evaluate a temporal pattern for a single worker
 * 
 * Request Body:
 * {
 *   "pattern": {
 *     "patternType": "day_of_week",
 *     "dayOfWeek": "sunday",
 *     "consecutiveCount": 3,
 *     "lookbackPeriodDays": 90
 *   },
 *   "employeeId": "uuid",
 *   "asOfDate": "2024-03-15" (optional)
 * }
 * 
 * Response (API Standards Compliant):
 * {
 *   "success": true,
 *   "evaluation": {
 *     "qualified": true,
 *     "patternType": "day_of_week",
 *     "metadata": {...},
 *     "executionTime": 45,
 *     "evaluatedAt": "2024-03-15T10:00:00.000Z"
 *   }
 * }
 */
router.post('/evaluate', async (req, res, next) => {
  try {
    const { organizationId, userId } = req.user;

    const schema = Joi.object({
      pattern: Joi.object().required(),
      employeeId: Joi.string().uuid().required(),
      asOfDate: Joi.date().iso().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { pattern, employeeId, asOfDate } = value;
    const evaluationDate = asOfDate ? new Date(asOfDate) : new Date();

    logger.info('Evaluating temporal pattern', {
      organizationId,
      userId,
      employeeId,
      patternType: pattern.patternType,
    });

    const evaluation = await temporalPatternService.evaluatePattern(
      employeeId,
      pattern,
      organizationId,
      evaluationDate
    );

    // API Standards: Resource-specific key (evaluation, not "data")
    res.status(200).json({
      success: true,
      evaluation,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/paylinq/patterns/shift-types
 * Get available shift types for pattern configuration
 * 
 * Response (API Standards Compliant):
 * {
 *   "success": true,
 *   "shiftTypes": [
 *     {
 *       "id": "uuid",
 *       "shiftName": "Night Shift",
 *       "shiftCode": "NIGHT",
 *       "startTime": "22:00",
 *       "endTime": "06:00"
 *     }
 *   ],
 *   "page": 1,
 *   "limit": 20,
 *   "total": 5,
 *   "totalPages": 1,
 *   "hasNext": false,
 *   "hasPrev": false
 * }
 */
router.get('/shift-types', async (req, res, next) => {
  try {
    const { organizationId } = req.user;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { query } = await import('../../../config/database');
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM payroll.shift_type 
       WHERE organization_id = $1 
         AND deleted_at IS NULL 
         AND status = 'active'`,
      [organizationId],
      organizationId
    );
    const total = parseInt(countResult.rows[0].count);

    // Get shift types with pagination
    const shiftTypesResult = await query(
      `SELECT id, shift_name, shift_code, start_time, end_time, 
              duration_hours, is_overnight, shift_differential_rate
       FROM payroll.shift_type
       WHERE organization_id = $1
         AND deleted_at IS NULL
         AND status = 'active'
       ORDER BY shift_name
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset],
      organizationId
    );

    // Convert to camelCase (API standards)
    const shiftTypes = shiftTypesResult.rows.map(row => ({
      id: row.id,
      shiftName: row.shift_name,
      shiftCode: row.shift_code,
      startTime: row.start_time,
      endTime: row.end_time,
      durationHours: row.duration_hours,
      isOvernight: row.is_overnight,
      shiftDifferentialRate: row.shift_differential_rate,
    }));

    // API Standards: Resource-specific key with pagination
    res.status(200).json({
      success: true,
      shiftTypes,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/paylinq/patterns/stations
 * Get available stations for pattern configuration
 * 
 * Response (API Standards Compliant):
 * {
 *   "success": true,
 *   "stations": [
 *     {
 *       "id": "uuid",
 *       "stationName": "Main Warehouse",
 *       "stationCode": "WH01",
 *       "locationId": "uuid"
 *     }
 *   ],
 *   "page": 1,
 *   "limit": 20,
 *   "total": 15,
 *   "totalPages": 1,
 *   "hasNext": false,
 *   "hasPrev": false
 * }
 */
router.get('/stations', async (req, res, next) => {
  try {
    const { organizationId } = req.user;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { query } = await import('../../../config/database');
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM scheduling.stations WHERE organization_id = $1`,
      [organizationId],
      organizationId
    );
    const total = parseInt(countResult.rows[0].count);

    // Get stations with pagination
    const stationsResult = await query(
      `SELECT id, station_name, station_code, location_id
       FROM scheduling.stations
       WHERE organization_id = $1
       ORDER BY station_name
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset],
      organizationId
    );

    // Convert to camelCase (API standards)
    const stations = stationsResult.rows.map(row => ({
      id: row.id,
      stationName: row.station_name,
      stationCode: row.station_code,
      locationId: row.location_id,
    }));

    res.status(200).json({
      success: true,
      stations,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/paylinq/patterns/roles
 * Get available roles for pattern configuration
 * 
 * Response (API Standards Compliant):
 * {
 *   "success": true,
 *   "roles": [
 *     {
 *       "id": "uuid",
 *       "roleName": "Supervisor",
 *       "roleCode": "SUP",
 *       "skillLevel": "senior"
 *     }
 *   ],
 *   "page": 1,
 *   "limit": 20,
 *   "total": 8,
 *   "totalPages": 1,
 *   "hasNext": false,
 *   "hasPrev": false
 * }
 */
router.get('/roles', async (req, res, next) => {
  try {
    const { organizationId } = req.user;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { query } = await import('../../../config/database');
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM scheduling.roles WHERE organization_id = $1`,
      [organizationId],
      organizationId
    );
    const total = parseInt(countResult.rows[0].count);

    // Get roles with pagination
    const rolesResult = await query(
      `SELECT id, role_name, role_code, skill_level
       FROM scheduling.roles
       WHERE organization_id = $1
       ORDER BY role_name
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset],
      organizationId
    );

    // Convert to camelCase (API standards)
    const roles = rolesResult.rows.map(row => ({
      id: row.id,
      roleName: row.role_name,
      roleCode: row.role_code,
      skillLevel: row.skill_level,
    }));

    res.status(200).json({
      success: true,
      roles,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/paylinq/patterns/validation-schema
 * Get the Joi validation schema for pattern configuration
 * Useful for frontend validation
 * 
 * Response:
 * {
 *   "success": true,
 *   "schema": {
 *     "patternType": {
 *       "type": "string",
 *       "validValues": ["day_of_week", "shift_type", "station", "role", "hours_threshold", "combined"],
 *       "required": true
 *     },
 *     ...
 *   }
 * }
 */
router.get('/validation-schema', async (req, res, next) => {
  try {
    // Return a simplified schema definition for frontend use
    const schemaDefinition = {
      patternType: {
        type: 'string',
        validValues: ['day_of_week', 'shift_type', 'station', 'role', 'hours_threshold', 'combined'],
        required: true,
      },
      dayOfWeek: {
        type: 'string',
        validValues: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        requiredWhen: { patternType: 'day_of_week' },
      },
      consecutiveCount: {
        type: 'number',
        min: 1,
        max: 365,
        required: true,
      },
      lookbackPeriodDays: {
        type: 'number',
        min: 1,
        max: 730,
        default: 90,
      },
      shiftTypeId: {
        type: 'string',
        format: 'uuid',
        requiredWhen: { patternType: 'shift_type' },
      },
      stationId: {
        type: 'string',
        format: 'uuid',
        requiredWhen: { patternType: 'station' },
      },
      roleId: {
        type: 'string',
        format: 'uuid',
        requiredWhen: { patternType: 'role' },
      },
      hoursThreshold: {
        type: 'number',
        min: 0,
        requiredWhen: { patternType: 'hours_threshold' },
      },
      comparisonOperator: {
        type: 'string',
        validValues: ['greater_than', 'less_than', 'equals', 'greater_or_equal', 'less_or_equal'],
        requiredWhen: { patternType: 'hours_threshold' },
      },
    };

    res.status(200).json({
      success: true,
      schema: schemaDefinition,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
