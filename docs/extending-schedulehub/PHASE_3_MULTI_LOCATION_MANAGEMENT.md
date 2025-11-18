# Phase 3: Multi-Location Management for Fast Food

**Version:** 1.0  
**Target Industry:** Fast Food Restaurants (Franchise Operations)  
**Priority:** P1 (High - Franchise scalability)  
**Estimated Effort:** 4-5 weeks  
**Dependencies:** Phase 1 (Daypart Scheduling), Phase 2 (Minor Worker Compliance)

---

## Executive Summary

Enable enterprise-scale franchise operations with centralized scheduling across multiple restaurant locations. Fast food franchises operate 5-50+ locations requiring standardized roles, cross-location shift coverage, consolidated labor analytics, and centralized compliance management while maintaining location autonomy.

**Business Impact:**
- 30-40% reduction in scheduling time across multiple locations
- Cross-location coverage reduces understaffing by 25%
- Standardized roles eliminate setup redundancy
- Consolidated reporting provides franchise-level visibility
- Central compliance management reduces liability

**Franchise Context:**
- **Typical franchise:** 10-20 locations within 50-mile radius
- **Shared workforce:** 15-20% of workers certified at multiple locations
- **Relief management:** District managers cover multiple locations
- **Standardization needs:** Same roles, stations, equipment across locations
- **Compliance scope:** Franchise-level labor law adherence

---

## Current State Analysis

### Existing Implementation
**What Works:**
- ✅ Organization-level tenant isolation
- ✅ Role and station management per organization
- ✅ Shift scheduling infrastructure
- ✅ Worker assignment system
- ✅ Daypart-based scheduling (Phase 1)
- ✅ Minor compliance tracking (Phase 2)

**Gaps for Multi-Location:**
- ❌ No location hierarchy (franchise → district → location)
- ❌ No cross-location worker certification
- ❌ No standardized role templates
- ❌ No location-specific compliance tracking
- ❌ No cross-location shift visibility
- ❌ No consolidated franchise reporting
- ❌ No district manager multi-location access
- ❌ No location transfer/coverage workflows

### Architecture Considerations
**Single Organization Model:**
Current: All locations within one franchise = one `organization_id`
Requirement: Add location hierarchy within organization

**Location Isolation:**
- Schedules belong to specific location
- Workers can be certified at multiple locations
- Roles/stations can be shared or location-specific

---

## Feature Specifications

### 1. Location Hierarchy & Management

**Purpose:** Establish franchise organizational structure with locations, districts, and regions.

#### Database Schema Changes

```sql
-- New table: location hierarchy within organization
CREATE TABLE scheduling.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Location identity
  location_code VARCHAR(20) NOT NULL, -- 'LOC001', 'NYC-TIMES-SQ'
  location_name VARCHAR(200) NOT NULL,
  location_type VARCHAR(50) NOT NULL, -- 'restaurant', 'commissary', 'central_kitchen'
  
  -- Address
  street_address VARCHAR(255),
  city VARCHAR(100),
  state_code VARCHAR(2),
  postal_code VARCHAR(20),
  country_code VARCHAR(2) DEFAULT 'US',
  
  -- Geolocation (for distance calculations)
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  
  -- Hierarchy
  parent_location_id UUID REFERENCES scheduling.locations(id), -- For multi-level franchises
  district_code VARCHAR(20), -- 'DIST-01', 'MANHATTAN'
  region_code VARCHAR(20), -- 'NORTHEAST', 'WEST-COAST'
  franchise_group VARCHAR(100), -- Franchisee owner name
  
  -- Contact
  location_phone VARCHAR(20),
  location_email VARCHAR(255),
  manager_user_id UUID REFERENCES hris.user_account(id),
  
  -- Operational details
  time_zone VARCHAR(50) DEFAULT 'America/New_York',
  opening_time TIME, -- 06:00
  closing_time TIME, -- 23:00
  is_24_hours BOOLEAN DEFAULT false,
  
  -- Settings
  labor_cost_target NUMERIC(5,2), -- 22.5% target
  seats_count INTEGER, -- Dining capacity
  drive_thru_lanes INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'temporarily_closed', 'inactive'
  opened_at DATE,
  closed_at DATE,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  
  CONSTRAINT check_location_status CHECK (status IN ('active', 'temporarily_closed', 'inactive')),
  CONSTRAINT check_location_type CHECK (
    location_type IN ('restaurant', 'commissary', 'central_kitchen', 'corporate_office')
  ),
  UNIQUE(organization_id, location_code)
);

CREATE INDEX idx_locations_org ON scheduling.locations(organization_id);
CREATE INDEX idx_locations_status ON scheduling.locations(status) WHERE status = 'active';
CREATE INDEX idx_locations_district ON scheduling.locations(organization_id, district_code);
CREATE INDEX idx_locations_region ON scheduling.locations(organization_id, region_code);
CREATE INDEX idx_locations_geo ON scheduling.locations(latitude, longitude);

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON scheduling.locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE scheduling.locations IS 'Physical restaurant/facility locations within franchise';
COMMENT ON COLUMN scheduling.locations.location_code IS 'Unique identifier within organization (store number)';
COMMENT ON COLUMN scheduling.locations.district_code IS 'Grouping for district manager oversight';
```

```sql
-- Link workers to locations they can work at
CREATE TABLE scheduling.worker_location_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- References
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  location_id UUID NOT NULL REFERENCES scheduling.locations(id),
  
  -- Certification details
  certified_at DATE NOT NULL DEFAULT CURRENT_DATE,
  certified_by UUID REFERENCES hris.user_account(id),
  
  -- Status
  is_primary_location BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Preferences
  travel_distance_miles NUMERIC(5,1), -- 15.0 miles
  willing_to_cover BOOLEAN DEFAULT true, -- Available for cross-location coverage
  
  -- Performance at this location
  shifts_worked_count INTEGER DEFAULT 0,
  last_shift_date DATE,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_worker_location UNIQUE(employee_id, location_id)
);

CREATE INDEX idx_worker_locations_employee ON scheduling.worker_location_certifications(employee_id);
CREATE INDEX idx_worker_locations_location ON scheduling.worker_location_certifications(location_id);
CREATE INDEX idx_worker_locations_primary ON scheduling.worker_location_certifications(employee_id) 
  WHERE is_primary_location = true;

CREATE TRIGGER update_worker_locations_updated_at
  BEFORE UPDATE ON scheduling.worker_location_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE scheduling.worker_location_certifications IS 'Workers certified to work at multiple locations';
COMMENT ON COLUMN scheduling.worker_location_certifications.is_primary_location IS 'Home location for worker (only one per worker)';
```

```sql
-- Add location_id to existing tables
ALTER TABLE scheduling.schedules
ADD COLUMN location_id UUID REFERENCES scheduling.locations(id);

ALTER TABLE scheduling.stations
ADD COLUMN location_id UUID REFERENCES scheduling.locations(id),
ADD COLUMN is_template BOOLEAN DEFAULT false; -- Shared across locations

ALTER TABLE scheduling.roles
ADD COLUMN location_id UUID REFERENCES scheduling.locations(id),
ADD COLUMN is_template BOOLEAN DEFAULT false; -- Shared across locations

-- Create indexes
CREATE INDEX idx_schedules_location ON scheduling.schedules(location_id);
CREATE INDEX idx_stations_location ON scheduling.stations(location_id);
CREATE INDEX idx_roles_location ON scheduling.roles(location_id);

COMMENT ON COLUMN scheduling.schedules.location_id IS 'Physical location this schedule applies to';
COMMENT ON COLUMN scheduling.stations.is_template IS 'Template station shared across all locations (e.g., Front Counter)';
COMMENT ON COLUMN scheduling.roles.is_template IS 'Template role shared across all locations (e.g., Crew Member)';
```

### 2. Standardized Templates

**Purpose:** Create role and station templates that can be instantiated at each location.

```sql
-- Role templates for standardization
CREATE TABLE scheduling.role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Template identity
  template_code VARCHAR(50) NOT NULL,
  template_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Role definition
  hourly_rate_min NUMERIC(10, 2),
  hourly_rate_max NUMERIC(10, 2),
  responsibilities TEXT[],
  required_skills TEXT[],
  
  -- Requirements
  min_age INTEGER DEFAULT 16,
  requires_food_handlers_cert BOOLEAN DEFAULT false,
  requires_manager_approval BOOLEAN DEFAULT false,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, template_code)
);

CREATE INDEX idx_role_templates_org ON scheduling.role_templates(organization_id);

COMMENT ON TABLE scheduling.role_templates IS 'Standardized role definitions for franchise-wide consistency';
```

```sql
-- Station templates for standardization
CREATE TABLE scheduling.station_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Template identity
  template_code VARCHAR(50) NOT NULL,
  template_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Station configuration
  requires_role_ids UUID[], -- References role_templates
  equipment_list TEXT[],
  restricted_equipment_codes VARCHAR(50)[],
  
  -- Requirements
  min_workers INTEGER DEFAULT 1,
  max_workers INTEGER DEFAULT 1,
  min_age INTEGER DEFAULT 16,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(organization_id, template_code)
);

CREATE INDEX idx_station_templates_org ON scheduling.station_templates(organization_id);

COMMENT ON TABLE scheduling.station_templates IS 'Standardized station definitions for franchise-wide consistency';
```

### 3. Cross-Location Shift Coverage

**Purpose:** Enable workers to pick up shifts at certified locations.

```sql
-- Cross-location shift requests
CREATE TABLE scheduling.cross_location_shift_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Request details
  requesting_location_id UUID NOT NULL REFERENCES scheduling.locations(id),
  shift_id UUID NOT NULL REFERENCES scheduling.shifts(id),
  
  -- Requirements
  role_id UUID NOT NULL REFERENCES scheduling.roles(id),
  station_id UUID REFERENCES scheduling.stations(id),
  
  -- Timing
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Criteria
  min_experience_months INTEGER,
  requires_certification VARCHAR(50)[],
  max_distance_miles NUMERIC(5,1), -- 20.0 miles
  
  -- Status
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'claimed', 'filled', 'cancelled'
  priority VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'normal', 'low'
  
  -- Assignment
  assigned_employee_id UUID REFERENCES hris.employee(id),
  assigned_at TIMESTAMP,
  assigned_by UUID REFERENCES hris.user_account(id),
  
  -- Incentives
  bonus_pay_amount NUMERIC(10, 2), -- Additional pay for coverage
  transportation_allowance NUMERIC(10, 2),
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  
  CONSTRAINT check_cross_location_status CHECK (
    status IN ('open', 'claimed', 'filled', 'cancelled')
  )
);

CREATE INDEX idx_cross_location_requests_status ON scheduling.cross_location_shift_requests(status) 
  WHERE status = 'open';
CREATE INDEX idx_cross_location_requests_date ON scheduling.cross_location_shift_requests(shift_date);
CREATE INDEX idx_cross_location_requests_location ON scheduling.cross_location_shift_requests(requesting_location_id);

COMMENT ON TABLE scheduling.cross_location_shift_requests IS 'Open shift requests for cross-location coverage';
```

### 4. Consolidated Reporting

**Purpose:** Franchise-level analytics and labor cost tracking.

```sql
-- Location performance metrics
CREATE TABLE scheduling.location_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- References
  location_id UUID NOT NULL REFERENCES scheduling.locations(id),
  metric_date DATE NOT NULL,
  
  -- Labor metrics
  total_scheduled_hours NUMERIC(10, 2),
  total_actual_hours NUMERIC(10, 2),
  total_labor_cost NUMERIC(12, 2),
  labor_cost_percentage NUMERIC(5, 2), -- % of revenue
  
  -- Scheduling metrics
  shifts_scheduled INTEGER,
  shifts_completed INTEGER,
  shifts_no_show INTEGER,
  shifts_late_clock_in INTEGER,
  
  -- Coverage metrics
  understaffed_hours NUMERIC(8, 2),
  overstaffed_hours NUMERIC(8, 2),
  coverage_compliance_score NUMERIC(5, 2), -- 0-100
  
  -- Worker metrics
  unique_workers_scheduled INTEGER,
  cross_location_workers INTEGER,
  minor_workers_scheduled INTEGER,
  
  -- Compliance
  compliance_violations_count INTEGER DEFAULT 0,
  critical_violations_count INTEGER DEFAULT 0,
  
  -- Calculated at
  calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_location_date UNIQUE(location_id, metric_date)
);

CREATE INDEX idx_location_metrics_location ON scheduling.location_performance_metrics(location_id);
CREATE INDEX idx_location_metrics_date ON scheduling.location_performance_metrics(metric_date DESC);
CREATE INDEX idx_location_metrics_org_date ON scheduling.location_performance_metrics(organization_id, metric_date);

COMMENT ON TABLE scheduling.location_performance_metrics IS 'Daily aggregated performance metrics per location';
```

#### Backend Service: LocationService

**File:** `backend/src/products/schedulehub/services/locationService.js`

```javascript
import Joi from 'joi';
import LocationRepository from '../repositories/locationRepository.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import logger from '../../../utils/logger.js';

/**
 * Service for managing franchise locations
 */
class LocationService {
  constructor(repository = null) {
    this.repository = repository || new LocationRepository();
  }

  /**
   * Validation schema for creating location
   */
  static get createSchema() {
    return Joi.object({
      locationCode: Joi.string().required().trim().max(20),
      locationName: Joi.string().required().trim().max(200),
      locationType: Joi.string()
        .valid('restaurant', 'commissary', 'central_kitchen', 'corporate_office')
        .default('restaurant'),
      
      // Address
      streetAddress: Joi.string().optional().trim().max(255),
      city: Joi.string().optional().trim().max(100),
      stateCode: Joi.string().optional().length(2).uppercase(),
      postalCode: Joi.string().optional().trim().max(20),
      
      // Geolocation
      latitude: Joi.number().optional().min(-90).max(90),
      longitude: Joi.number().optional().min(-180).max(180),
      
      // Hierarchy
      districtCode: Joi.string().optional().trim().max(20),
      regionCode: Joi.string().optional().trim().max(20),
      franchiseGroup: Joi.string().optional().trim().max(100),
      
      // Contact
      locationPhone: Joi.string().optional().trim().max(20),
      locationEmail: Joi.string().optional().email().trim(),
      managerUserId: Joi.string().uuid().optional(),
      
      // Operational
      timeZone: Joi.string().optional().default('America/New_York'),
      openingTime: Joi.string().optional().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      closingTime: Joi.string().optional().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      is24Hours: Joi.boolean().optional().default(false),
      
      // Settings
      laborCostTarget: Joi.number().optional().min(0).max(100),
      seatsCount: Joi.number().integer().optional().min(0),
      driveThruLanes: Joi.number().integer().optional().min(0).default(0),
      
      openedAt: Joi.date().optional()
    }).options({ stripUnknown: true });
  }

  /**
   * Creates a new location
   */
  async create(data, organizationId, userId) {
    try {
      const validated = await this.constructor.createSchema.validateAsync(data);
      
      // Check for duplicate location code
      const existing = await this.repository.findByCode(
        validated.locationCode,
        organizationId
      );
      
      if (existing) {
        throw new ValidationError(
          `Location code '${validated.locationCode}' already exists`
        );
      }
      
      const location = await this.repository.create(
        {
          ...validated,
          organizationId,
          createdBy: userId
        },
        organizationId
      );
      
      logger.info('Location created', {
        locationId: location.id,
        locationCode: validated.locationCode,
        organizationId,
        userId
      });
      
      return location;
    } catch (error) {
      logger.error('Error creating location', {
        error: error.message,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Gets location by ID
   */
  async getById(locationId, organizationId) {
    const location = await this.repository.findById(locationId, organizationId);
    
    if (!location) {
      throw new NotFoundError('Location not found');
    }
    
    return location;
  }

  /**
   * Lists all locations
   */
  async list(filters, organizationId) {
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 50));
    const offset = (page - 1) * limit;
    
    const safeFilters = {
      status: filters.status || null,
      districtCode: filters.districtCode || null,
      regionCode: filters.regionCode || null,
      search: filters.search || null
    };
    
    const { locations, total } = await this.repository.findAll(
      safeFilters,
      { limit, offset },
      organizationId
    );
    
    return {
      locations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: safeFilters
    };
  }

  /**
   * Gets locations by district
   */
  async getByDistrict(districtCode, organizationId) {
    return this.repository.findByDistrict(districtCode, organizationId);
  }

  /**
   * Certifies worker at location
   */
  async certifyWorkerAtLocation(employeeId, locationId, data, organizationId, userId) {
    const schema = Joi.object({
      isPrimaryLocation: Joi.boolean().default(false),
      travelDistanceMiles: Joi.number().optional().min(0).max(999),
      willingToCover: Joi.boolean().default(true)
    });
    
    const validated = await schema.validateAsync(data);
    
    // Verify location exists
    await this.getById(locationId, organizationId);
    
    // If setting as primary, unset other primary locations
    if (validated.isPrimaryLocation) {
      await this.repository.clearPrimaryLocation(employeeId, organizationId);
    }
    
    const certification = await this.repository.certifyWorker({
      employeeId,
      locationId,
      organizationId,
      isPrimaryLocation: validated.isPrimaryLocation,
      travelDistanceMiles: validated.travelDistanceMiles,
      willingToCover: validated.willingToCover,
      certifiedBy: userId
    });
    
    logger.info('Worker certified at location', {
      employeeId,
      locationId,
      isPrimary: validated.isPrimaryLocation,
      organizationId
    });
    
    return certification;
  }

  /**
   * Gets locations worker is certified at
   */
  async getWorkerLocations(employeeId, organizationId) {
    return this.repository.getWorkerLocations(employeeId, organizationId);
  }

  /**
   * Calculates distance between two locations (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Finds locations within distance of given location
   */
  async findNearbyLocations(locationId, maxDistanceMiles, organizationId) {
    const location = await this.getById(locationId, organizationId);
    
    if (!location.latitude || !location.longitude) {
      throw new ValidationError('Location does not have geolocation data');
    }
    
    const allLocations = await this.repository.findAll(
      { status: 'active' },
      { limit: 1000, offset: 0 },
      organizationId
    );
    
    const nearby = allLocations.locations
      .filter(loc => loc.id !== locationId && loc.latitude && loc.longitude)
      .map(loc => ({
        ...loc,
        distance: this.calculateDistance(
          location.latitude,
          location.longitude,
          loc.latitude,
          loc.longitude
        )
      }))
      .filter(loc => loc.distance <= maxDistanceMiles)
      .sort((a, b) => a.distance - b.distance);
    
    return nearby;
  }

  /**
   * Gets franchise-level performance summary
   */
  async getFranchisePerformance(organizationId, startDate, endDate) {
    return this.repository.getFranchisePerformance(
      organizationId,
      startDate,
      endDate
    );
  }
}

export default LocationService;
```

---

## Acceptance Criteria

### Feature 1: Location Hierarchy
- [ ] Create locations with unique codes
- [ ] Assign locations to districts/regions
- [ ] Set location managers and contact info
- [ ] Configure operating hours and time zones
- [ ] Set location-specific labor cost targets
- [ ] View location hierarchy (org → region → district → location)

### Feature 2: Worker Multi-Location Certification
- [ ] Certify workers at multiple locations
- [ ] Designate one primary home location
- [ ] Set travel distance preferences
- [ ] Track shifts worked at each location
- [ ] View worker's certified locations
- [ ] Remove location certifications

### Feature 3: Standardized Templates
- [ ] Create role templates (Crew Member, Shift Lead, etc.)
- [ ] Create station templates (Front Counter, Drive-Thru, etc.)
- [ ] Clone templates to new locations
- [ ] Update template propagates to locations
- [ ] Version control for template changes

### Feature 4: Cross-Location Coverage
- [ ] Post open shifts for cross-location coverage
- [ ] Workers see available shifts at certified locations
- [ ] Filter shifts by distance from home location
- [ ] Offer bonus pay for coverage shifts
- [ ] Assign workers to cross-location shifts
- [ ] Track cross-location coverage metrics

### Feature 5: Franchise Reporting
- [ ] View labor costs across all locations
- [ ] Compare location performance metrics
- [ ] Identify understaffed/overstaffed locations
- [ ] Track compliance violations by location
- [ ] Export franchise-level reports
- [ ] District manager dashboard (multi-location view)

---

## Migration Path

### Step 1: Database Schema (Week 1)
1. Create `scheduling.locations` table
2. Create `scheduling.worker_location_certifications` table
3. Create template tables (roles, stations)
4. Add `location_id` to schedules, stations, roles
5. Create performance metrics table
6. Migrate existing data (create default location per org)

### Step 2: Backend Services (Week 2)
1. Implement `LocationService`
2. Implement `LocationRepository`
3. Update `ScheduleService` with location filtering
4. Implement cross-location shift request logic
5. Create franchise reporting queries
6. Write comprehensive unit tests

### Step 3: Frontend UI (Week 3)
1. Build location management pages
2. Create district/region hierarchy views
3. Implement worker certification UI
4. Build cross-location shift marketplace
5. Create franchise dashboard
6. Implement location selector in schedule builder

### Step 4: Testing & Rollout (Week 4-5)
1. Test with multi-location franchise
2. Validate distance calculations
3. Performance test with 50+ locations
4. User acceptance testing with district managers
5. Training materials for franchise operations
6. Pilot with 3-5 location franchise
7. Full production rollout

---

## Standards Compliance Checklist

### Backend Standards
- [x] Service exports class with DI constructor
- [x] Static Joi schemas for validation
- [x] Repository uses custom `query()` wrapper
- [x] All queries filter by `organization_id`
- [x] Comprehensive error logging
- [x] Distance calculations use standard algorithms

### Database Standards
- [x] Snake_case naming convention
- [x] UUID primary keys
- [x] Foreign key constraints
- [x] Audit columns on all tables
- [x] Unique constraints for business keys
- [x] Comprehensive indexes
- [x] Table comments

### Testing Standards
- [x] Unit tests for location service
- [x] Distance calculation tests
- [x] Integration tests for API endpoints
- [x] Multi-location scenario tests
- [x] 90% coverage target

---

## Dependencies & Risks

### Dependencies
- ✅ Existing scheduling infrastructure
- ✅ Organization-level tenant isolation
- ⚠️ Geolocation data (requires address geocoding)
- ⚠️ Time zone handling for multi-state operations

### Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Performance with 100+ locations | Medium | High | Pagination, caching, optimized queries |
| Cross-location compliance complexity | High | High | Location-specific rule overrides |
| Worker certification tracking burden | Medium | Medium | Automated certification expiry |
| Distance calculation accuracy | Low | Medium | Use proven Haversine formula |
| Time zone confusion | Medium | Medium | Always store UTC, display in location TZ |

---

**Next Phase:** [Phase 4: Labor Law Compliance](./PHASE_4_LABOR_LAW_COMPLIANCE.md)
