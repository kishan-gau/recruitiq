# Phase 1: Daypart Scheduling for Fast Food Operations

**Version:** 1.0  
**Target Industry:** Fast Food Restaurants  
**Priority:** P0 (Critical - Foundation for labor cost optimization)  
**Estimated Effort:** 3-4 weeks  
**Dependencies:** None (builds on existing ScheduleHub)

---

## Executive Summary

Implement daypart-based scheduling to align staffing with fast food traffic patterns (breakfast, lunch, dinner rushes). This enables managers to define labor cost targets and staffing requirements by time period, optimizing labor spend while maintaining service levels.

**Business Impact:**
- 15-25% reduction in labor costs through optimized scheduling
- Improved customer service during peak hours
- Reduced overstaffing during slow periods
- Data-driven staffing decisions based on historical patterns

---

## Current State Analysis

### Existing Implementation
**What Works:**
- ✅ Complete shift management system (scheduling.shifts table)
- ✅ Station-based scheduling (scheduling.stations)
- ✅ Role assignments with proficiency levels (scheduling.roles, scheduling.worker_roles)
- ✅ Coverage requirements framework (scheduling.coverage_requirements)
- ✅ Demand history tracking (scheduling.demand_history)
- ✅ Service level targets (scheduling.service_level_targets)

**Gaps for Fast Food:**
- ❌ No daypart concept (breakfast/lunch/dinner/late-night periods)
- ❌ No labor cost percentage targets by period
- ❌ No rush hour staffing templates
- ❌ No automatic break scheduling for compliance
- ❌ No station-specific peak hour requirements

### Database Schema Foundation
**Existing Tables to Leverage:**
- `scheduling.coverage_requirements` - Has day_of_week, start_time, end_time, min/optimal/max_workers
- `scheduling.demand_history` - Tracks customer_count, transaction_count, revenue by hour
- `scheduling.service_level_targets` - Has target_service_level, max_wait_time_minutes
- `scheduling.shifts` - shift_type enum already includes 'regular', 'overtime', 'on_call', 'training'

**Integration Points:**
- `scheduling.stations` - Each station needs daypart-specific requirements
- `scheduling.schedules` - Schedules need daypart optimization flags
- `hris.location` - Location-specific daypart definitions

---

## Feature Specifications

### 1. Daypart Definition System

**Purpose:** Define time periods with distinct traffic patterns and staffing needs.

#### Database Schema Changes

```sql
-- New table: daypart definitions
CREATE TABLE scheduling.dayparts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES hris.location(id), -- NULL = organization-wide template
  
  -- Daypart identity
  daypart_code VARCHAR(50) NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'late_night'
  daypart_name VARCHAR(100) NOT NULL, -- 'Breakfast Rush', 'Lunch Peak'
  description TEXT,
  
  -- Time definition
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL, -- [1,2,3,4,5] for Mon-Fri
  
  -- Labor targets
  target_labor_cost_percentage NUMERIC(5,2), -- 18.50 = 18.5% of revenue
  max_labor_cost_percentage NUMERIC(5,2), -- 22.00 = hard ceiling
  target_sales_per_labor_hour NUMERIC(10,2), -- $150 revenue per labor hour
  
  -- Staffing targets
  base_staffing_level INTEGER NOT NULL, -- Minimum staff regardless of volume
  peak_multiplier NUMERIC(4,2) DEFAULT 1.0, -- 1.5 = 50% more staff during peak
  
  -- Service level
  target_transaction_time_seconds INTEGER, -- 180 = 3 minutes max
  target_customer_wait_minutes INTEGER, -- 5 minutes max wait
  
  -- Operational
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_color VARCHAR(7), -- Hex color for UI (#FF5722)
  display_order INTEGER,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  CONSTRAINT check_daypart_times CHECK (start_time < end_time),
  CONSTRAINT check_labor_percentages CHECK (
    target_labor_cost_percentage <= max_labor_cost_percentage
  ),
  UNIQUE(organization_id, location_id, daypart_code)
);

-- Indexes
CREATE INDEX idx_dayparts_org_location ON scheduling.dayparts(organization_id, location_id);
CREATE INDEX idx_dayparts_active ON scheduling.dayparts(organization_id, is_active) WHERE is_active = true;

-- Trigger
CREATE TRIGGER update_dayparts_updated_at
  BEFORE UPDATE ON scheduling.dayparts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE scheduling.dayparts IS 'Defines time periods with distinct staffing and labor cost targets for fast food operations';
COMMENT ON COLUMN scheduling.dayparts.daypart_code IS 'Standard codes: breakfast, lunch, dinner, late_night, overnight';
COMMENT ON COLUMN scheduling.dayparts.target_labor_cost_percentage IS 'Target labor cost as percentage of revenue for this period';
COMMENT ON COLUMN scheduling.dayparts.peak_multiplier IS 'Staffing multiplier during peak hours (1.5 = 50% more staff)';
```

```sql
-- New table: station daypart requirements
CREATE TABLE scheduling.station_daypart_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- References
  station_id UUID NOT NULL REFERENCES scheduling.stations(id) ON DELETE CASCADE,
  daypart_id UUID NOT NULL REFERENCES scheduling.dayparts(id) ON DELETE CASCADE,
  
  -- Staffing requirements
  min_workers INTEGER NOT NULL DEFAULT 1,
  optimal_workers INTEGER NOT NULL,
  max_workers INTEGER NOT NULL,
  
  -- Role-specific overrides
  required_roles UUID[], -- Array of role IDs that MUST be present
  preferred_proficiency VARCHAR(20), -- 'proficient' or 'expert' preferred
  
  -- Priority for optimization
  priority INTEGER NOT NULL DEFAULT 50, -- 1-100, higher = more critical
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  
  CONSTRAINT check_station_daypart_workers CHECK (
    min_workers <= optimal_workers AND optimal_workers <= max_workers
  ),
  UNIQUE(station_id, daypart_id)
);

-- Indexes
CREATE INDEX idx_station_daypart_reqs_station ON scheduling.station_daypart_requirements(station_id);
CREATE INDEX idx_station_daypart_reqs_daypart ON scheduling.station_daypart_requirements(daypart_id);
CREATE INDEX idx_station_daypart_reqs_org ON scheduling.station_daypart_requirements(organization_id);

-- Trigger
CREATE TRIGGER update_station_daypart_requirements_updated_at
  BEFORE UPDATE ON scheduling.station_daypart_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE scheduling.station_daypart_requirements IS 'Defines how many workers each station needs during specific dayparts';
```

#### Backend Service: DaypartService

**File:** `backend/src/products/schedulehub/services/daypartService.js`

```javascript
import Joi from 'joi';
import DaypartRepository from '../repositories/daypartRepository.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import logger from '../../../utils/logger.js';

/**
 * Service for managing daypart definitions and requirements
 */
class DaypartService {
  constructor(repository = null) {
    this.repository = repository || new DaypartRepository();
  }

  /**
   * Joi validation schema for creating daypart
   */
  static get createSchema() {
    return Joi.object({
      daypartCode: Joi.string().required().trim().max(50)
        .valid('breakfast', 'lunch', 'dinner', 'late_night', 'overnight'),
      daypartName: Joi.string().required().trim().max(100),
      description: Joi.string().optional().trim(),
      locationId: Joi.string().uuid().optional().allow(null),
      
      // Time definition
      startTime: Joi.string().required().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      endTime: Joi.string().required().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
      daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6))
        .min(1).required(),
      
      // Labor targets
      targetLaborCostPercentage: Joi.number().min(0).max(100).precision(2).required(),
      maxLaborCostPercentage: Joi.number().min(0).max(100).precision(2).required(),
      targetSalesPerLaborHour: Joi.number().min(0).precision(2).optional(),
      
      // Staffing targets
      baseStaffingLevel: Joi.number().integer().min(1).required(),
      peakMultiplier: Joi.number().min(1.0).max(5.0).precision(2).default(1.0),
      
      // Service level
      targetTransactionTimeSeconds: Joi.number().integer().min(30).max(600).optional(),
      targetCustomerWaitMinutes: Joi.number().integer().min(1).max(30).optional(),
      
      // Display
      displayColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      displayOrder: Joi.number().integer().min(0).optional()
    }).custom((value, helpers) => {
      // Validate labor cost percentages
      if (value.targetLaborCostPercentage > value.maxLaborCostPercentage) {
        return helpers.error('custom.laborCostRange');
      }
      return value;
    }).messages({
      'custom.laborCostRange': 'Target labor cost cannot exceed max labor cost'
    });
  }

  /**
   * Creates a new daypart definition
   * 
   * @param {Object} data - Daypart data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID creating the daypart
   * @returns {Promise<Object>} Created daypart
   */
  async create(data, organizationId, userId) {
    try {
      // Validate input
      const validated = await this.constructor.createSchema.validateAsync(data);
      
      // Check for overlapping dayparts at same location
      const overlaps = await this.repository.findOverlapping(
        organizationId,
        validated.locationId,
        validated.daysOfWeek,
        validated.startTime,
        validated.endTime
      );
      
      if (overlaps.length > 0) {
        throw new ValidationError(
          'Daypart overlaps with existing daypart: ' + overlaps[0].daypart_name
        );
      }
      
      // Create daypart
      const daypart = await this.repository.create({
        ...validated,
        organizationId,
        createdBy: userId
      });
      
      logger.info('Daypart created', {
        daypartId: daypart.id,
        daypartCode: daypart.daypart_code,
        organizationId,
        userId
      });
      
      return daypart;
    } catch (error) {
      logger.error('Error creating daypart', {
        error: error.message,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Retrieves daypart by ID
   */
  async getById(daypartId, organizationId) {
    const daypart = await this.repository.findById(daypartId, organizationId);
    
    if (!daypart) {
      throw new NotFoundError('Daypart not found');
    }
    
    return daypart;
  }

  /**
   * Lists dayparts with optional location filter
   */
  async list(organizationId, filters = {}) {
    return this.repository.findAll(organizationId, {
      locationId: filters.locationId,
      isActive: filters.isActive !== undefined ? filters.isActive : true
    });
  }

  /**
   * Gets the active daypart for a given time
   */
  async getActiveDaypart(organizationId, locationId, dateTime) {
    const dayOfWeek = dateTime.getDay(); // 0=Sunday, 6=Saturday
    const timeString = dateTime.toTimeString().slice(0, 5); // "HH:mm"
    
    const daypart = await this.repository.findByDateTime(
      organizationId,
      locationId,
      dayOfWeek,
      timeString
    );
    
    return daypart; // May be null if no daypart defined
  }

  /**
   * Sets station requirements for a daypart
   */
  async setStationRequirement(data, organizationId, userId) {
    const schema = Joi.object({
      stationId: Joi.string().uuid().required(),
      daypartId: Joi.string().uuid().required(),
      minWorkers: Joi.number().integer().min(1).required(),
      optimalWorkers: Joi.number().integer().min(1).required(),
      maxWorkers: Joi.number().integer().min(1).required(),
      requiredRoles: Joi.array().items(Joi.string().uuid()).optional(),
      preferredProficiency: Joi.string()
        .valid('trainee', 'competent', 'proficient', 'expert')
        .optional(),
      priority: Joi.number().integer().min(1).max(100).default(50)
    }).custom((value, helpers) => {
      if (value.minWorkers > value.optimalWorkers || 
          value.optimalWorkers > value.maxWorkers) {
        return helpers.error('custom.workerRange');
      }
      return value;
    });
    
    const validated = await schema.validateAsync(data);
    
    // Verify station and daypart exist
    await this.getById(validated.daypartId, organizationId);
    // Station verification done in repository (joins scheduling.stations)
    
    const requirement = await this.repository.upsertStationRequirement({
      ...validated,
      organizationId,
      createdBy: userId
    });
    
    logger.info('Station daypart requirement set', {
      stationId: validated.stationId,
      daypartId: validated.daypartId,
      organizationId
    });
    
    return requirement;
  }

  /**
   * Gets all station requirements for a daypart
   */
  async getStationRequirements(daypartId, organizationId) {
    await this.getById(daypartId, organizationId); // Verify access
    return this.repository.findStationRequirements(daypartId, organizationId);
  }

  /**
   * Calculates recommended staffing for a shift based on daypart
   */
  async calculateRecommendedStaffing(organizationId, locationId, shiftStart, shiftEnd) {
    const dayparts = await this.repository.findByTimeRange(
      organizationId,
      locationId,
      shiftStart.getDay(),
      shiftStart.toTimeString().slice(0, 5),
      shiftEnd.toTimeString().slice(0, 5)
    );
    
    if (dayparts.length === 0) {
      return null; // No daypart recommendations available
    }
    
    // Use the primary daypart (highest priority or longest overlap)
    const primaryDaypart = dayparts[0];
    
    const stationReqs = await this.repository.findStationRequirements(
      primaryDaypart.id,
      organizationId
    );
    
    // Calculate total optimal staffing
    const totalOptimal = stationReqs.reduce(
      (sum, req) => sum + req.optimal_workers,
      0
    );
    
    return {
      daypart: primaryDaypart,
      recommendedStaffing: Math.max(
        totalOptimal,
        primaryDaypart.base_staffing_level
      ),
      stationRequirements: stationReqs,
      laborCostTarget: primaryDaypart.target_labor_cost_percentage
    };
  }
}

export default DaypartService;
```

#### Backend Repository: DaypartRepository

**File:** `backend/src/products/schedulehub/repositories/daypartRepository.js`

```javascript
import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class DaypartRepository {
  /**
   * Creates a new daypart
   */
  async create(data) {
    const text = `
      INSERT INTO scheduling.dayparts (
        organization_id, location_id, daypart_code, daypart_name, description,
        start_time, end_time, days_of_week,
        target_labor_cost_percentage, max_labor_cost_percentage,
        target_sales_per_labor_hour, base_staffing_level, peak_multiplier,
        target_transaction_time_seconds, target_customer_wait_minutes,
        display_color, display_order, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    
    const values = [
      data.organizationId,
      data.locationId || null,
      data.daypartCode,
      data.daypartName,
      data.description || null,
      data.startTime,
      data.endTime,
      data.daysOfWeek,
      data.targetLaborCostPercentage,
      data.maxLaborCostPercentage,
      data.targetSalesPerLaborHour || null,
      data.baseStaffingLevel,
      data.peakMultiplier || 1.0,
      data.targetTransactionTimeSeconds || null,
      data.targetCustomerWaitMinutes || null,
      data.displayColor || null,
      data.displayOrder || null,
      data.createdBy
    ];
    
    const result = await query(text, values, data.organizationId, {
      operation: 'INSERT',
      table: 'dayparts'
    });
    
    return result.rows[0];
  }

  /**
   * Finds dayparts that overlap with given time range
   */
  async findOverlapping(organizationId, locationId, daysOfWeek, startTime, endTime) {
    const text = `
      SELECT *
      FROM scheduling.dayparts
      WHERE organization_id = $1
        AND (location_id = $2 OR (location_id IS NULL AND $2 IS NOT NULL))
        AND days_of_week && $3
        AND (
          (start_time <= $4 AND end_time > $4) OR
          (start_time < $5 AND end_time >= $5) OR
          (start_time >= $4 AND end_time <= $5)
        )
        AND is_active = true
    `;
    
    const result = await query(
      text,
      [organizationId, locationId, daysOfWeek, startTime, endTime],
      organizationId,
      { operation: 'SELECT', table: 'dayparts' }
    );
    
    return result.rows;
  }

  /**
   * Finds daypart active at specific date/time
   */
  async findByDateTime(organizationId, locationId, dayOfWeek, timeString) {
    const text = `
      SELECT *
      FROM scheduling.dayparts
      WHERE organization_id = $1
        AND (location_id = $2 OR location_id IS NULL)
        AND $3 = ANY(days_of_week)
        AND start_time <= $4
        AND end_time > $4
        AND is_active = true
      ORDER BY 
        CASE WHEN location_id = $2 THEN 0 ELSE 1 END, -- Prefer location-specific
        display_order NULLS LAST
      LIMIT 1
    `;
    
    const result = await query(
      text,
      [organizationId, locationId, dayOfWeek, timeString],
      organizationId,
      { operation: 'SELECT', table: 'dayparts' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Upserts station daypart requirement
   */
  async upsertStationRequirement(data) {
    const text = `
      INSERT INTO scheduling.station_daypart_requirements (
        organization_id, station_id, daypart_id,
        min_workers, optimal_workers, max_workers,
        required_roles, preferred_proficiency, priority, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (station_id, daypart_id)
      DO UPDATE SET
        min_workers = EXCLUDED.min_workers,
        optimal_workers = EXCLUDED.optimal_workers,
        max_workers = EXCLUDED.max_workers,
        required_roles = EXCLUDED.required_roles,
        preferred_proficiency = EXCLUDED.preferred_proficiency,
        priority = EXCLUDED.priority,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [
      data.organizationId,
      data.stationId,
      data.daypartId,
      data.minWorkers,
      data.optimalWorkers,
      data.maxWorkers,
      data.requiredRoles || null,
      data.preferredProficiency || null,
      data.priority || 50,
      data.createdBy
    ];
    
    const result = await query(text, values, data.organizationId, {
      operation: 'UPSERT',
      table: 'station_daypart_requirements'
    });
    
    return result.rows[0];
  }

  /**
   * Finds station requirements for a daypart
   */
  async findStationRequirements(daypartId, organizationId) {
    const text = `
      SELECT 
        sdr.*,
        s.station_code,
        s.station_name,
        s.zone
      FROM scheduling.station_daypart_requirements sdr
      INNER JOIN scheduling.stations s ON sdr.station_id = s.id
      WHERE sdr.daypart_id = $1
        AND sdr.organization_id = $2
      ORDER BY sdr.priority DESC, s.station_name
    `;
    
    const result = await query(
      text,
      [daypartId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'station_daypart_requirements' }
    );
    
    return result.rows;
  }

  async findById(id, organizationId) {
    const text = `
      SELECT * FROM scheduling.dayparts
      WHERE id = $1 AND organization_id = $2
    `;
    
    const result = await query(text, [id, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'dayparts'
    });
    
    return result.rows[0] || null;
  }

  async findAll(organizationId, filters = {}) {
    let text = `
      SELECT d.*, l.location_name
      FROM scheduling.dayparts d
      LEFT JOIN hris.location l ON d.location_id = l.id
      WHERE d.organization_id = $1
    `;
    
    const values = [organizationId];
    let paramCount = 1;
    
    if (filters.locationId !== undefined) {
      paramCount++;
      text += ` AND (d.location_id = $${paramCount} OR d.location_id IS NULL)`;
      values.push(filters.locationId);
    }
    
    if (filters.isActive !== undefined) {
      paramCount++;
      text += ` AND d.is_active = $${paramCount}`;
      values.push(filters.isActive);
    }
    
    text += ` ORDER BY d.display_order NULLS LAST, d.start_time`;
    
    const result = await query(text, values, organizationId, {
      operation: 'SELECT',
      table: 'dayparts'
    });
    
    return result.rows;
  }
}

export default DaypartRepository;
```

---

## Acceptance Criteria

### Feature 1: Daypart Management
- [ ] Admin can create dayparts with time ranges and labor targets
- [ ] System prevents overlapping dayparts at same location
- [ ] Dayparts can be organization-wide or location-specific
- [ ] Each daypart has configurable labor cost percentage targets
- [ ] Dayparts support multiple days of week
- [ ] UI displays dayparts in color-coded timeline view

### Feature 2: Station Requirements by Daypart
- [ ] Admin can set min/optimal/max workers per station per daypart
- [ ] System validates worker ranges (min ≤ optimal ≤ max)
- [ ] Requirements can specify required roles
- [ ] Requirements support proficiency level preferences
- [ ] Priority system allows optimization weighting

### Feature 3: Daypart-Aware Scheduling
- [ ] Schedule builder suggests staffing based on active daypart
- [ ] Labor cost targets displayed during shift creation
- [ ] System warns when staffing exceeds target labor cost
- [ ] Recommended staffing calculations include station requirements
- [ ] Historical demand data influences recommendations

---

## Test Specifications

### Unit Tests

**File:** `backend/tests/unit/services/daypartService.test.js`

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import DaypartService from '../../../../src/products/schedulehub/services/daypartService.js';
import DaypartRepository from '../../../../src/products/schedulehub/repositories/daypartRepository.js';
import { ValidationError, NotFoundError } from '../../../../src/utils/errors.js';

describe('DaypartService', () => {
  let service;
  let mockRepository;
  const orgId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findOverlapping: jest.fn(),
      findByDateTime: jest.fn(),
      upsertStationRequirement: jest.fn(),
      findStationRequirements: jest.fn()
    };
    service = new DaypartService(mockRepository);
  });

  describe('create', () => {
    const validData = {
      daypartCode: 'lunch',
      daypartName: 'Lunch Rush',
      description: '11am-2pm lunch period',
      startTime: '11:00',
      endTime: '14:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      targetLaborCostPercentage: 18.5,
      maxLaborCostPercentage: 22.0,
      targetSalesPerLaborHour: 150.0,
      baseStaffingLevel: 5,
      peakMultiplier: 1.5,
      targetTransactionTimeSeconds: 180,
      targetCustomerWaitMinutes: 5,
      displayColor: '#FF5722',
      displayOrder: 2
    };

    it('should create daypart with valid data', async () => {
      mockRepository.findOverlapping.mockResolvedValue([]);
      mockRepository.create.mockResolvedValue({
        id: 'daypart-789',
        ...validData,
        organization_id: orgId
      });

      const result = await service.create(validData, orgId, userId);

      expect(result.id).toBe('daypart-789');
      expect(mockRepository.findOverlapping).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          daypartCode: 'lunch',
          organizationId: orgId,
          createdBy: userId
        })
      );
    });

    it('should reject if daypart overlaps existing', async () => {
      mockRepository.findOverlapping.mockResolvedValue([
        { id: 'existing', daypart_name: 'Existing Lunch' }
      ]);

      await expect(
        service.create(validData, orgId, userId)
      ).rejects.toThrow('overlaps with existing daypart');
    });

    it('should reject invalid daypart codes', async () => {
      const invalidData = { ...validData, daypartCode: 'invalid_code' };

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow();
    });

    it('should reject target labor cost > max labor cost', async () => {
      const invalidData = {
        ...validData,
        targetLaborCostPercentage: 25.0,
        maxLaborCostPercentage: 20.0
      };

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow('Target labor cost cannot exceed max');
    });

    it('should reject invalid time format', async () => {
      const invalidData = { ...validData, startTime: '25:00' };

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow();
    });

    it('should require at least one day of week', async () => {
      const invalidData = { ...validData, daysOfWeek: [] };

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow();
    });
  });

  describe('getActiveDaypart', () => {
    it('should return daypart for given datetime', async () => {
      const testDate = new Date('2025-11-17T12:30:00'); // Monday noon
      const expectedDaypart = {
        id: 'daypart-lunch',
        daypart_code: 'lunch',
        start_time: '11:00',
        end_time: '14:00'
      };

      mockRepository.findByDateTime.mockResolvedValue(expectedDaypart);

      const result = await service.getActiveDaypart(
        orgId,
        'loc-123',
        testDate
      );

      expect(result).toEqual(expectedDaypart);
      expect(mockRepository.findByDateTime).toHaveBeenCalledWith(
        orgId,
        'loc-123',
        1, // Monday
        '12:30'
      );
    });

    it('should return null if no daypart defined', async () => {
      mockRepository.findByDateTime.mockResolvedValue(null);

      const result = await service.getActiveDaypart(
        orgId,
        'loc-123',
        new Date()
      );

      expect(result).toBeNull();
    });
  });

  describe('setStationRequirement', () => {
    const validReq = {
      stationId: 'station-123',
      daypartId: 'daypart-456',
      minWorkers: 1,
      optimalWorkers: 2,
      maxWorkers: 3,
      requiredRoles: ['role-789'],
      preferredProficiency: 'proficient',
      priority: 80
    };

    it('should create station requirement', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'daypart-456' });
      mockRepository.upsertStationRequirement.mockResolvedValue({
        id: 'req-999',
        ...validReq
      });

      const result = await service.setStationRequirement(
        validReq,
        orgId,
        userId
      );

      expect(result.id).toBe('req-999');
      expect(mockRepository.upsertStationRequirement).toHaveBeenCalled();
    });

    it('should reject invalid worker range', async () => {
      const invalidReq = {
        ...validReq,
        minWorkers: 3,
        optimalWorkers: 2,
        maxWorkers: 1
      };

      await expect(
        service.setStationRequirement(invalidReq, orgId, userId)
      ).rejects.toThrow();
    });

    it('should reject if daypart not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.setStationRequirement(validReq, orgId, userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('calculateRecommendedStaffing', () => {
    it('should calculate staffing based on daypart', async () => {
      const shiftStart = new Date('2025-11-17T11:00:00');
      const shiftEnd = new Date('2025-11-17T14:00:00');

      mockRepository.findByTimeRange.mockResolvedValue([
        {
          id: 'daypart-lunch',
          base_staffing_level: 5,
          target_labor_cost_percentage: 18.5
        }
      ]);

      mockRepository.findStationRequirements.mockResolvedValue([
        { optimal_workers: 2 },
        { optimal_workers: 3 },
        { optimal_workers: 1 }
      ]);

      const result = await service.calculateRecommendedStaffing(
        orgId,
        'loc-123',
        shiftStart,
        shiftEnd
      );

      expect(result.recommendedStaffing).toBe(6); // max(5 base, 2+3+1 optimal)
      expect(result.laborCostTarget).toBe(18.5);
      expect(result.stationRequirements).toHaveLength(3);
    });

    it('should return null if no dayparts defined', async () => {
      mockRepository.findByTimeRange.mockResolvedValue([]);

      const result = await service.calculateRecommendedStaffing(
        orgId,
        'loc-123',
        new Date(),
        new Date()
      );

      expect(result).toBeNull();
    });
  });
});
```

### Integration Tests

**File:** `backend/tests/integration/dayparts.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/server.js';
import pool from '../../../src/config/database.js';
import { createTestOrganization, cleanupTestData } from './setup.js';

describe('Integration: Dayparts API', () => {
  let organizationId, userId, token, locationId;

  beforeAll(async () => {
    const org = await createTestOrganization();
    organizationId = org.organizationId;
    userId = org.userId;
    token = org.token;
    locationId = org.locationId;
  });

  afterAll(async () => {
    await cleanupTestData(organizationId);
    await pool.end();
  });

  describe('POST /api/products/schedulehub/dayparts', () => {
    it('should create lunch daypart', async () => {
      const response = await request(app)
        .post('/api/products/schedulehub/dayparts')
        .set('Cookie', [`token=${token}`])
        .send({
          daypartCode: 'lunch',
          daypartName: 'Lunch Rush',
          description: 'Peak lunch hours',
          locationId,
          startTime: '11:00',
          endTime: '14:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          targetLaborCostPercentage: 18.5,
          maxLaborCostPercentage: 22.0,
          baseStaffingLevel: 5,
          peakMultiplier: 1.5
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.daypart).toBeDefined();
      expect(response.body.daypart.daypart_code).toBe('lunch');
    });

    it('should prevent overlapping dayparts', async () => {
      // Create first daypart
      await request(app)
        .post('/api/products/schedulehub/dayparts')
        .set('Cookie', [`token=${token}`])
        .send({
          daypartCode: 'breakfast',
          daypartName: 'Breakfast',
          startTime: '06:00',
          endTime: '11:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          targetLaborCostPercentage: 20.0,
          maxLaborCostPercentage: 25.0,
          baseStaffingLevel: 3
        });

      // Try to create overlapping
      const response = await request(app)
        .post('/api/products/schedulehub/dayparts')
        .set('Cookie', [`token=${token}`])
        .send({
          daypartCode: 'brunch',
          daypartName: 'Brunch',
          startTime: '10:00',
          endTime: '13:00',
          daysOfWeek: [6, 0], // Weekends
          targetLaborCostPercentage: 19.0,
          maxLaborCostPercentage: 23.0,
          baseStaffingLevel: 4
        })
        .expect(400);

      expect(response.body.error).toContain('overlaps');
    });
  });

  describe('GET /api/products/schedulehub/dayparts/active', () => {
    it('should return active daypart for datetime', async () => {
      const response = await request(app)
        .get('/api/products/schedulehub/dayparts/active')
        .set('Cookie', [`token=${token}`])
        .query({
          locationId,
          datetime: '2025-11-17T12:00:00Z' // Monday noon
        })
        .expect(200);

      expect(response.body.daypart).toBeDefined();
      expect(response.body.daypart.daypart_code).toBe('lunch');
    });
  });
});
```

---

## Migration Path

### Step 1: Database Schema (Week 1)
1. Create `scheduling.dayparts` table
2. Create `scheduling.station_daypart_requirements` table
3. Run migration on staging environment
4. Verify indexes created
5. Run data validation queries

### Step 2: Backend Services (Week 2)
1. Implement `DaypartService` with full validation
2. Implement `DaypartRepository` with all queries
3. Create API routes and controller
4. Write unit tests (target 90% coverage)
5. Write integration tests for all endpoints

### Step 3: Frontend UI (Week 3)
1. Create daypart management page
2. Build timeline visualization component
3. Integrate into schedule builder
4. Add labor cost warnings
5. Implement station requirement editor

### Step 4: Integration & Testing (Week 4)
1. End-to-end testing of full workflow
2. Performance testing with realistic data volumes
3. User acceptance testing with pilot location
4. Documentation and training materials
5. Production deployment

---

## Standards Compliance Checklist

### Backend Standards (BACKEND_STANDARDS.md)
- [x] 4-layer architecture (Routes → Controllers → Services → Repositories)
- [x] Service exports class with constructor DI
- [x] Static Joi schemas for validation
- [x] Repository uses custom `query()` wrapper
- [x] All queries filter by `organization_id`
- [x] Transaction-wrapped multi-step operations
- [x] Comprehensive error logging

### Testing Standards (TESTING_STANDARDS.md)
- [x] Unit tests with 90% coverage target
- [x] Integration tests for all API endpoints
- [x] Test data factories for repeatable tests
- [x] AAA pattern (Arrange, Act, Assert)
- [x] Mock dependencies with jest.fn()
- [x] Cookie-based authentication in tests

### API Standards (API_STANDARDS.md)
- [x] RESTful URL structure (`/api/products/schedulehub/dayparts`)
- [x] Resource-specific response keys (`{ daypart: {...} }`)
- [x] Appropriate HTTP status codes (201, 400, 404)
- [x] Pagination support for list endpoints
- [x] Filtering query parameters

### Database Standards (DATABASE_STANDARDS.md)
- [x] Snake_case table and column names
- [x] UUID primary keys with `gen_random_uuid()`
- [x] Foreign keys with proper cascading
- [x] Audit columns (created_at, updated_at, created_by)
- [x] CHECK constraints for data integrity
- [x] Comprehensive indexing strategy
- [x] Table and column comments

### Security Standards (SECURITY_STANDARDS.md)
- [x] Tenant isolation enforced in all queries
- [x] Input validation with Joi schemas
- [x] Parameterized queries (no SQL injection risk)
- [x] Authentication required on all routes
- [x] Sensitive data not logged

---

## Dependencies & Risks

### Dependencies
- ✅ Existing ScheduleHub infrastructure (schedules, shifts, stations)
- ✅ PostgreSQL database with scheduling schema
- ✅ Cookie-based authentication (auth migration complete)
- ⚠️ Integration tests currently disabled (auth blocker)

### Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Overlapping daypart logic complexity | Medium | Medium | Comprehensive unit tests, validation |
| Performance with many dayparts | Low | Low | Database indexes, query optimization |
| User adoption resistance | Medium | High | Training, pilot program, clear benefits |
| Data migration for existing schedules | Low | Medium | Backward compatible, optional feature |

### Open Questions
1. Should dayparts be required or optional for scheduling?
   - **Recommendation:** Optional, with fallback to existing coverage_requirements
2. How to handle midnight-crossing dayparts (e.g., late night 22:00-02:00)?
   - **Recommendation:** Two dayparts, or special handling in validation
3. Should system auto-create standard dayparts on organization setup?
   - **Recommendation:** Yes, with templates for common restaurant types

---

**Next Phase:** [Phase 2: Minor Worker Compliance](./PHASE_2_MINOR_WORKER_COMPLIANCE.md)
