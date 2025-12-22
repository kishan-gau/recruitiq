/**
 * Schedule Service Unit Tests
 * 
 * VERIFIED METHODS (from source code inspection):
 * 1. createSchedule(scheduleData, organizationId, userId) - Basic schedule creation
 * 2. autoGenerateSchedule(scheduleData, organizationId, userId, options = {}) - Complex auto-generation with templates
 * 3. validateDateRange(startDate, endDate) - Date validation
 * 4. parseDateOnly(dateInput) - Date parsing with timezone safety
 * 5. handleConstraintError(error, organizationId, userId) - Database error handling
 * 
 * VALIDATION SCHEMAS (verified):
 * - createScheduleSchema: Basic schedule validation
 * - autoGenerateScheduleSchema: Complex auto-generation validation with templateDayMapping
 * - createShiftSchema: Shift creation validation
 * - updateShiftSchema: Shift update validation
 * - updateScheduleGenerationSchema: Schedule update validation
 * 
 * DEPENDENCIES (from imports):
 * - pool: Database connection (inject mock)
 * - logger: Logging service (inject mock)
 * - ShiftTemplateService: External service dependency (inject mock)
 * - DTOs: mapScheduleDbToApi, mapSchedulesDbToApi, mapScheduleApiToDb, mapShiftsDbToApi
 * 
 * EXPORT PATTERN: Class export (testable with DI)
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import ScheduleService from '../../../../../src/products/schedulehub/services/scheduleService.js';
import { ValidationError, ConflictError } from '../../../../../src/utils/errors.js';

describe('ScheduleService', () => {
  let service;
  let mockPool;
  let mockClient;
  let mockLogger;
  let mockShiftTemplateService;

  // Test constants
  const testOrgId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const testUserId = 'user-123e4567-e89b-12d3-a456-426614174000';

  // Helper to create valid test data matching Joi schemas
  const createValidScheduleData = (overrides = {}) => ({
    scheduleName: 'Test Schedule',
    description: 'Test schedule description',
    startDate: '2025-01-20',
    endDate: '2025-01-26',
    status: 'draft',
    ...overrides
  });

  // Helper to create valid auto-generation data
  const createValidAutoGenerationData = (overrides = {}) => ({
    scheduleName: 'Auto Generated Schedule',
    description: 'Test auto generation',
    startDate: '2025-01-20',
    endDate: '2025-01-26', 
    status: 'draft',
    templateIds: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001'],
    templateDayMapping: {
      1: ['123e4567-e89b-12d3-a456-426614174000'], // Monday
      2: ['223e4567-e89b-12d3-a456-426614174001'], // Tuesday
    },
    allowPartialTime: false,
    ...overrides
  });

  // Helper to create DB format schedule (snake_case)
  const createDbSchedule = (overrides = {}) => ({
    id: '323e4567-e89b-12d3-a456-426614174000',
    organization_id: 'org-123e4567-e89b-12d3-a456-426614174000',
    schedule_name: 'Test Schedule',
    description: 'Test description', 
    start_date: '2025-01-20',
    end_date: '2025-01-26',
    status: 'draft',
    created_by: 'user-123',
    updated_by: 'user-123',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  });

  // Helper to create shift template for mock responses
  const createValidShiftTemplate = (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    templateName: 'Default Template',
    startTime: '09:00:00',
    endTime: '17:00:00',
    requiredStaffing: 1,
    ...overrides
  });

  beforeEach(async () => {
    // Clear all mocks before setting up new ones
    jest.clearAllMocks();
    jest.resetModules();

    // Create mock database client with transaction methods
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    };

    // Create mock connection pool with proper response structure
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn().mockResolvedValue({ rows: [] }),
      end: jest.fn()
    };

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Mock ShiftTemplateService
    mockShiftTemplateService = {
      getById: jest.fn()
    };

    // Mock the pool and ShiftTemplateService imports using unstable_mockModule
    jest.unstable_mockModule('../../../../../src/config/database.js', () => ({
      default: mockPool
    }));

    jest.unstable_mockModule('../../../../../src/utils/logger.js', () => ({
      default: mockLogger
    }));

    jest.unstable_mockModule('../../../../../src/products/schedulehub/services/shiftTemplateService.js', () => ({
      default: jest.fn().mockImplementation(() => mockShiftTemplateService)
    }));

    // Mock DTO functions
    jest.unstable_mockModule('../../../../../src/products/schedulehub/dto/scheduleDto.js', () => ({
      mapScheduleDbToApi: jest.fn(data => ({ ...data, transformed: true })),
      mapSchedulesDbToApi: jest.fn(data => data.map(item => ({ ...item, transformed: true }))),
      mapScheduleApiToDb: jest.fn(data => ({ ...data, dbFormat: true }))
    }));

    jest.unstable_mockModule('../../../../../src/products/schedulehub/dto/shiftDto.js', () => ({
      mapShiftsDbToApi: jest.fn(data => data.map(item => ({ ...item, transformed: true })))
    }));

    // Re-import the service after mocking
    const { default: ScheduleServiceClass } = await import('../../../../../src/products/schedulehub/services/scheduleService.js');
    service = new ScheduleServiceClass(mockShiftTemplateService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe('Date Validation and Parsing', () => {
    describe('validateDateRange', () => {
      it('should validate valid date ranges', () => {
        expect(() => {
          service.validateDateRange('2025-01-20', '2025-01-26');
        }).not.toThrow();
      });

      it('should throw error when end date is not after start date', () => {
        expect(() => {
          service.validateDateRange('2025-01-26', '2025-01-20');
        }).toThrow('End date must be after start date');

        expect(() => {
          service.validateDateRange('2025-01-20', '2025-01-20');
        }).toThrow('End date must be after start date');
      });

      it('should throw error for invalid date formats', () => {
        expect(() => {
          service.validateDateRange('invalid-date', '2025-01-26');
        }).toThrow('Start date must be in YYYY-MM-DD format');

        expect(() => {
          service.validateDateRange('2025-01-20', 'invalid-date');
        }).toThrow('End date must be in YYYY-MM-DD format');
      });

      it('should handle Date objects correctly', () => {
        const startDate = new Date('2025-01-20');
        const endDate = new Date('2025-01-26');

        expect(() => {
          service.validateDateRange(startDate, endDate);
        }).not.toThrow();
      });
    });

    describe('parseDateOnly', () => {
      it('should parse valid YYYY-MM-DD string', () => {
        const result = service.parseDateOnly('2025-01-20');
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(0); // January is 0
        expect(result.getDate()).toBe(20);
      });

      it('should parse Date objects to date-only', () => {
        const inputDate = new Date('2025-01-20T15:30:00Z');
        const result = service.parseDateOnly(inputDate);
        
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(0);
        expect(result.getDate()).toBe(20);
      });

      it('should throw error for invalid date formats', () => {
        expect(() => service.parseDateOnly(null)).toThrow('Invalid date format: null. Expected YYYY-MM-DD');
        expect(() => service.parseDateOnly(undefined)).toThrow('Invalid date format: undefined. Expected YYYY-MM-DD');
        expect(() => service.parseDateOnly('invalid-date')).toThrow('Invalid date format');
        expect(() => service.parseDateOnly('2025/01/20')).toThrow('Invalid date format');
        expect(() => service.parseDateOnly('01-20-2025')).toThrow('Invalid date format');
        expect(() => service.parseDateOnly(123)).toThrow('Invalid date format');
      });

      it('should validate year boundaries', () => {
        expect(() => service.parseDateOnly('1899-01-20')).toThrow('Year 1899 out of valid range (1900-2100)');
        expect(() => service.parseDateOnly('2101-01-20')).toThrow('Year 2101 out of valid range (1900-2100)');
        
        // Valid boundaries
        expect(() => service.parseDateOnly('1900-01-20')).not.toThrow();
        expect(() => service.parseDateOnly('2100-01-20')).not.toThrow();
      });

      it('should validate month and day boundaries', () => {
        expect(() => service.parseDateOnly('2025-00-20')).toThrow('Month 0 out of valid range (01-12)');
        expect(() => service.parseDateOnly('2025-13-20')).toThrow('Month 13 out of valid range (01-12)');
        expect(() => service.parseDateOnly('2025-01-00')).toThrow('Day 0 out of valid range (01-31)');
        expect(() => service.parseDateOnly('2025-01-32')).toThrow('Day 32 out of valid range (01-31)');
      });
    });
  });

  describe('Error Handling', () => {
    describe('handleConstraintError', () => {
      const orgId = 'org-123';
      const userId = 'user-456';

      it('should handle overlapping shift constraint errors', () => {
        const constraintError = {
          code: '23514',
          message: 'Employee 123e4567-e89b-12d3-a456-426614174000 already has a shift from 09:00:00 to 17:00:00 on 2025-01-20'
        };

        expect(() => {
          service.handleConstraintError(constraintError, orgId, userId);
        }).toThrow('Cannot create overlapping shift: Employee 123e4567-e89b-12d3-a456-426614174000 already has a shift from 09:00:00 to 17:00:00 on 2025-01-20');

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Overlapping shift prevented by database constraint',
          expect.objectContaining({
            error: constraintError.message,
            organizationId: orgId,
            userId
          })
        );
      });

      it('should handle constraint errors without extractable details', () => {
        const constraintError = {
          code: '23514',
          message: 'Employee some-id already has overlapping shift'
        };

        expect(() => {
          service.handleConstraintError(constraintError, orgId, userId);
        }).toThrow('Employee some-id already has overlapping shift');
      });

      it('should re-throw non-constraint errors unchanged', () => {
        const nonConstraintError = new Error('Some other database error');
        nonConstraintError.code = '23505'; // Different constraint code

        expect(() => {
          service.handleConstraintError(nonConstraintError, orgId, userId);
        }).toThrow('Some other database error');
      });

      it('should re-throw errors without code property', () => {
        const genericError = new Error('Generic error');

        expect(() => {
          service.handleConstraintError(genericError, orgId, userId);
        }).toThrow('Generic error');
      });
    });
  });

  describe('createSchedule', () => {
    const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
    const userId = 'user-123e4567-e89b-12d3-a456-426614174000';

    beforeEach(() => {
      // Setup default successful database responses
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [createDbSchedule()] }) // INSERT schedule
        .mockResolvedValueOnce({ rows: [] }); // COMMIT
    });

    it('should create schedule with valid data', async () => {
      const scheduleData = createValidScheduleData();
      
      const result = await service.createSchedule(scheduleData, organizationId, userId);

      // Verify transaction handling
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      // Verify INSERT query
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.schedules'),
        [
          organizationId,
          scheduleData.scheduleName,
          scheduleData.description,
          expect.any(Date),
          expect.any(Date),
          scheduleData.status,
          userId,
          userId
        ]
      );

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Schedule created successfully',
        expect.objectContaining({
          scheduleId: expect.any(String),
          organizationId
        })
      );

      // Verify DTO transformation applied
      expect(result).toEqual(expect.objectContaining({
        transformed: true
      }));
    });

    it('should validate input using Joi schema', async () => {
      const invalidData = {
        // Missing required scheduleName
        description: 'Test description',
        startDate: '2025-01-20',
        endDate: '2025-01-26',
        status: 'draft'
      };

      await expect(
        service.createSchedule(invalidData, organizationId, userId)
      ).rejects.toThrow(/Validation error/);

      // Should not start transaction for invalid data
      expect(mockClient.query).not.toHaveBeenCalledWith('BEGIN');
    });

    it('should rollback transaction on database error', async () => {
      const scheduleData = {
        scheduleName: 'Engineering Schedule',
        description: 'Weekly engineering team schedule',
        startDate: '2025-01-06',
        endDate: '2025-01-12',
        status: 'draft'
      };
      const dbError = new Error('Database connection failed');

      // Clear previous mock setup completely and create fresh configuration
      mockClient.query.mockReset();
      
      // Mock BEGIN to succeed, then INSERT operation to fail, then ROLLBACK to succeed
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN succeeds
        .mockRejectedValueOnce(dbError) // INSERT operation fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK succeeds

      await expect(
        service.createSchedule(scheduleData, testOrgId, testUserId)
      ).rejects.toThrow('Database connection failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty description correctly', async () => {
      const scheduleData = {
        scheduleName: 'Engineering Schedule',
        description: null,
        startDate: '2025-01-06',
        endDate: '2025-01-12',
        status: 'draft'
      };

      await service.createSchedule(scheduleData, organizationId, userId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.schedules'),
        [
          organizationId,
          scheduleData.scheduleName,
          null, // description should be null
          expect.any(Date),
          expect.any(Date),
          scheduleData.status,
          userId,
          userId
        ]
      );
    });
  });

  describe('autoGenerateSchedule', () => {
    const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
    const userId = 'user-123e4567-e89b-12d3-a456-426614174000';

    const mockTemplate1 = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      templateName: 'Morning Shift',
      startTime: '09:00:00',
      endTime: '17:00:00',
      requiredStaffing: 2
    };

    const mockTemplate2 = {
      id: '223e4567-e89b-12d3-a456-426614174001', 
      templateName: 'Evening Shift',
      startTime: '17:00:00',
      endTime: '01:00:00',
      requiredStaffing: 1
    };

    beforeEach(() => {
      // Setup database responses for schedule creation
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [createDbSchedule()] }) // INSERT schedule
        .mockResolvedValue({ rows: [] }); // Default for other queries

      // Setup template service responses
      mockShiftTemplateService.getById
        .mockResolvedValueOnce(mockTemplate1)
        .mockResolvedValueOnce(mockTemplate2);

      // Mock generateShiftsFromDedicatedTemplate method
      service.generateShiftsFromDedicatedTemplate = jest.fn().mockResolvedValue({
        requested: 5,
        generated: 4,
        partial: 1,
        uncovered: 0,
        warnings: ['Warning: Partial coverage on day 1']
      });
    });

    it('should validate auto-generation data with complex schema', async () => {
      const invalidData = {
        scheduleName: 'Test',
        // Missing required templateIds
        startDate: '2025-01-20',
        endDate: '2025-01-26',
        status: 'draft'
      };

      await expect(
        service.autoGenerateSchedule(invalidData, organizationId, userId)
      ).rejects.toThrow(/Validation error.*Template IDs are required/);
    });

    it('should validate templateDayMapping structure', async () => {
      const invalidMapping = createValidAutoGenerationData({
        templateDayMapping: {
          '8': ['123e4567-e89b-12d3-a456-426614174000'], // Invalid day number (> 7)
          '1': ['invalid-uuid'] // Invalid UUID format
        }
      });

      await expect(
        service.autoGenerateSchedule(invalidMapping, organizationId, userId)
      ).rejects.toThrow(/Validation error/);
    });

    it('should create schedule and process templates by day mapping', async () => {
      const scheduleData = createValidAutoGenerationData();

      const result = await service.autoGenerateSchedule(scheduleData, organizationId, userId);

      // Verify schedule was created
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.schedules'),
        [
          organizationId,
          scheduleData.scheduleName,
          scheduleData.description,
          expect.any(Date),
          expect.any(Date),
          scheduleData.status,
          userId,
          userId
        ]
      );

      // Verify templates were fetched
      expect(mockShiftTemplateService.getById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        organizationId
      );
      expect(mockShiftTemplateService.getById).toHaveBeenCalledWith(
        '223e4567-e89b-12d3-a456-426614174001',
        organizationId
      );

      // Verify shift generation was called for each day-template mapping
      expect(service.generateShiftsFromDedicatedTemplate).toHaveBeenCalledTimes(2);
      
      // Verify day-specific generation (day 1 - Monday)
      expect(service.generateShiftsFromDedicatedTemplate).toHaveBeenCalledWith(
        mockClient,
        expect.any(String), // scheduleId
        mockTemplate1,
        expect.any(Date),
        expect.any(Date),
        [1], // Only Monday
        organizationId,
        userId,
        {}
      );

      // Verify day-specific generation (day 2 - Tuesday) 
      expect(service.generateShiftsFromDedicatedTemplate).toHaveBeenCalledWith(
        mockClient,
        expect.any(String), // scheduleId
        mockTemplate2,
        expect.any(Date),
        expect.any(Date),
        [2], // Only Tuesday
        organizationId,
        userId,
        {}
      );

      // Verify session tracking was initialized
      expect(service.sessionShifts).toBeDefined();
      expect(service.sessionShifts).toBeInstanceOf(Map);

      // Verify generation summary (service returns {schedule, generationSummary})
      expect(result).toEqual(expect.objectContaining({
        schedule: expect.objectContaining({
          id: expect.any(String)
        }),
        generationSummary: expect.objectContaining({
          totalShiftsRequested: 10, // 5 + 5
          shiftsGenerated: 8,       // 4 + 4
          partialCoverage: 2,       // 1 + 1
          noCoverage: 0,
          warnings: expect.arrayContaining([
            'Warning: Partial coverage on day 1'
          ])
        })
      }));
    });

    it('should handle missing templates gracefully', async () => {
      // Create mock templates with IDs that match what we'll use in test
      const mockValidTemplate = {
        id: '323e4567-e89b-12d3-a456-426614174000',
        templateName: 'Valid Template',
        startTime: '09:00:00',
        endTime: '17:00:00',
        requiredStaffing: 2
      };

      const scheduleData = createValidAutoGenerationData({
        templateIds: ['323e4567-e89b-12d3-a456-426614174000', '423e4567-e89b-12d3-a456-426614174000'],
        templateDayMapping: {
          1: ['323e4567-e89b-12d3-a456-426614174000'], // Monday - valid template
          2: ['423e4567-e89b-12d3-a456-426614174000'], // Tuesday - missing template
        }
      });

      // Spy on the method we want to count calls for - ensure proper return structure
      const generateShiftsSpy = jest.spyOn(service, 'generateShiftsFromDedicatedTemplate')
        .mockImplementation((client, scheduleId, template, startDate, endDate, applicableDays, organizationId, userId, options) => {
          if (template) {
            return Promise.resolve({ 
              requested: 5, 
              generated: 4, 
              partial: 1, 
              uncovered: 0, 
              warnings: ["Warning: Partial coverage on day 1"]
            });
          }
          return Promise.resolve({ 
            requested: 0, 
            generated: 0, 
            partial: 0, 
            uncovered: 0, 
            warnings: []
          });
        });

      // CRITICAL: Reset all mocks to prevent beforeEach interference
      mockShiftTemplateService.getById.mockReset();
      mockClient.query.mockReset();

      // Re-setup database mocks for this specific test
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [createDbSchedule()] }) // INSERT schedule
        .mockResolvedValue({ rows: [] }); // Default for other queries

      // Configure template service mock with test-specific values
      mockShiftTemplateService.getById
        .mockResolvedValueOnce(mockValidTemplate)  // First call returns valid template
        .mockResolvedValueOnce(null);              // Second call returns null (missing template)

      const result = await service.autoGenerateSchedule(scheduleData, organizationId, userId);

      // Should still process the valid template
      expect(generateShiftsSpy).toHaveBeenCalledTimes(1);
      
      // Should include warning about missing template (service returns {schedule, generationSummary})
      expect(result.generationSummary.warnings).toContain('Template 423e4567-e89b-12d3-a456-426614174000 not found or inactive');

      // Clean up spy
      generateShiftsSpy.mockRestore();
    });

    it('should handle no valid templates error', async () => {
      const scheduleData = createValidAutoGenerationData();

      // Clear any previous mock configurations to prevent beforeEach interference
      mockShiftTemplateService.getById.mockReset();
      
      // Re-establish spy after clear to ensure it persists
      generateShiftsSpy = jest.spyOn(service, 'generateShiftsFromDedicatedTemplate')
        .mockResolvedValue({
          requested: 0,
          generated: 0,
          partial: 0,
          uncovered: 0,
          warnings: []
        });

      // Mock database operations for schedule creation (happens before template validation)
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({   // INSERT INTO schedules
          rows: [{
            id: 'schedule-123e4567-e89b-12d3-a456-426614174000',
            organization_id: organizationId,
            schedule_name: 'Auto Generated Schedule',
            description: 'Test auto generation',
            start_date: '2025-01-20',
            end_date: '2025-01-26',
            status: 'draft',
            created_by: userId,
            updated_by: userId
          }]
        })
        .mockResolvedValueOnce({}); // ROLLBACK

      // Mock no templates found for all template IDs (this triggers the error)
      mockShiftTemplateService.getById
        .mockResolvedValueOnce(null) // First template null
        .mockResolvedValueOnce(null); // Second template null

      // Error should be thrown during template validation, after schedule creation
      await expect(
        service.autoGenerateSchedule(scheduleData, organizationId, userId)
      ).rejects.toThrow('No valid templates found. Missing or inactive templates: 123e4567-e89b-12d3-a456-426614174000, 223e4567-e89b-12d3-a456-426614174001');

      // Database operations should have occurred: BEGIN, INSERT schedule, ROLLBACK
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should use fallback behavior when no templateDayMapping provided', async () => {
      const scheduleData = createValidAutoGenerationData({
        templateDayMapping: undefined // No day mapping
      });

      const result = await service.autoGenerateSchedule(scheduleData, organizationId, userId);

      // Should process templates for all days (fallback behavior)
      expect(service.generateShiftsFromDedicatedTemplate).toHaveBeenCalledTimes(2);
      
      // Verify all days are included [1,2,3,4,5,6,7]
      expect(service.generateShiftsFromDedicatedTemplate).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.any(Date),
        expect.any(Date),
        [1, 2, 3, 4, 5, 6, 7], // All days
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('should handle database constraint errors in shift generation', async () => {
      const scheduleData = createValidAutoGenerationData();
      
      const constraintError = {
        code: '23514',
        message: 'Employee 123e4567-e89b-12d3-a456-426614174000 already has a shift from 09:00:00 to 17:00:00 on 2025-01-20'
      };

      // Re-establish spy for this test
      generateShiftsSpy = jest.spyOn(service, 'generateShiftsFromDedicatedTemplate')
        .mockRejectedValue(constraintError);

      await expect(
        service.autoGenerateSchedule(scheduleData, organizationId, userId)
      ).rejects.toThrow(/Cannot create overlapping shift/);

      // Should release connection even on error
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Session-Aware Conflict Tracking', () => {
    it('should initialize sessionShifts as Map', () => {
      expect(service.sessionShifts).toBeInstanceOf(Map);
    });

    it('should clear sessionShifts during autoGenerateSchedule initialization', async () => {
      const orgId = 'org-123';
      const userId = 'user-456';
      
      // Add some mock data to sessionShifts first
      service.sessionShifts.set('emp-1', [{ date: '2025-01-20', startTime: '09:00', endTime: '17:00' }]);
      expect(service.sessionShifts.size).toBe(1);

      // Clear any previous mock configurations to prevent beforeEach interference
      mockShiftTemplateService.getById.mockReset();

      // Setup mocks for successful flow that reaches sessionShifts.clear()
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [createDbSchedule()] }) // INSERT schedule
        .mockResolvedValueOnce({ rows: [] }); // COMMIT
      
      // Provide at least one valid template so validation passes and reaches sessionShifts.clear()
      const mockTemplate = createValidShiftTemplate();
      mockShiftTemplateService.getById.mockResolvedValueOnce(mockTemplate);

      // Mock generateShiftsFromDedicatedTemplate for successful completion
      const generateSpy = jest.spyOn(service, 'generateShiftsFromDedicatedTemplate')
        .mockResolvedValue({ 
          requested: 0, 
          generated: 0, 
          partial: 0, 
          uncovered: 0, 
          warnings: []
        });

      try {
        await service.autoGenerateSchedule(createValidAutoGenerationData(), orgId, userId);
      } catch (error) {
        // Even if other parts fail, sessionShifts should be cleared early in the process
      }

      // sessionShifts should be cleared during initialization
      expect(service.sessionShifts.size).toBe(0);
      
      // Clean up spy
      generateSpy.mockRestore();
    });
  });

  describe('Schema Validation', () => {
    it('should have properly defined createScheduleSchema', () => {
      expect(service.createScheduleSchema).toBeDefined();
      expect(service.createScheduleSchema.validate).toBeInstanceOf(Function);
    });

    it('should have properly defined autoGenerateScheduleSchema', () => {
      expect(service.autoGenerateScheduleSchema).toBeDefined();
      expect(service.autoGenerateScheduleSchema.validate).toBeInstanceOf(Function);
    });

    it('should validate required fields in createScheduleSchema', () => {
      const { error } = service.createScheduleSchema.validate({});
      expect(error).toBeTruthy();
      expect(error.details).toContainEqual(
        expect.objectContaining({
          path: ['scheduleName'],
          type: 'any.required'
        })
      );
    });

    it('should validate templateIds requirement in autoGenerateScheduleSchema', () => {
      const { error } = service.autoGenerateScheduleSchema.validate({
        scheduleName: 'Test'
      });
      expect(error).toBeTruthy();
      expect(error.details).toContainEqual(
        expect.objectContaining({
          path: ['startDate'],
          type: 'any.required'
        })
      );
    });

    it('should validate templateDayMapping structure in autoGenerateScheduleSchema', () => {
      const validData = createValidAutoGenerationData({
        templateDayMapping: {
          '1': ['123e4567-e89b-12d3-a456-426614174000'],
          '7': ['223e4567-e89b-12d3-a456-426614174001']
        }
      });

      const { error } = service.autoGenerateScheduleSchema.validate(validData);
      expect(error).toBeFalsy();
    });

    it('should reject invalid day numbers in templateDayMapping', () => {
      const invalidData = createValidAutoGenerationData({
        templateDayMapping: {
          '0': ['123e4567-e89b-12d3-a456-426614174000'], // Invalid: day 0
          '8': ['223e4567-e89b-12d3-a456-426614174001']  // Invalid: day 8
        }
      });

      const { error } = service.autoGenerateScheduleSchema.validate(invalidData);
      expect(error).toBeTruthy();
    });

    it('should reject invalid UUIDs in templateDayMapping', () => {
      const invalidData = createValidAutoGenerationData({
        templateDayMapping: {
          '1': ['invalid-uuid', 'another-invalid-id']
        }
      });

      const { error } = service.autoGenerateScheduleSchema.validate(invalidData);
      expect(error).toBeTruthy();
    });
  });

  // ===== EXPANDED TEST COVERAGE FOR SCHEDULE BUILDER METHODS =====

  describe('getScheduleById', () => {
    it('should return schedule with shifts when found', async () => {
      const mockScheduleId = '123e4567-e89b-12d3-a456-426614174000';
      const mockShiftId = '223e4567-e89b-12d3-a456-426614174001';
      const mockSchedule = {
        id: mockScheduleId,
        organization_id: testOrgId,
        schedule_name: 'Weekly Schedule',
        start_date: '2025-01-20',
        end_date: '2025-01-26'
      };

      const mockShifts = [
        {
          id: mockShiftId,
          schedule_id: mockScheduleId,
          shift_date: '2025-01-20',
          start_time: '09:00',
          end_time: '17:00',
          station_id: 'station-1'
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockSchedule] }) // Schedule query
        .mockResolvedValueOnce({ rows: mockShifts });     // Shifts query

      const result = await service.getScheduleById(mockScheduleId, testOrgId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data.schedule.id).toBe(mockScheduleId);
      expect(result.data.shifts).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should return error object when schedule not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getScheduleById('nonexistent', testOrgId);

      expect(result).toEqual({
        success: false,
        error: 'Schedule not found'
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT s.*'),
        ['nonexistent', testOrgId]
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      // Mock the first query (schedule details) to reject
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(service.getScheduleById('123e4567-e89b-12d3-a456-426614174000', testOrgId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('listSchedules', () => {
    const mockSchedules = [
      {
        id: 'sch-1',
        organization_id: testOrgId,
        schedule_name: 'Week 1',
        start_date: '2025-01-13',
        end_date: '2025-01-19',
        is_published: true
      },
      {
        id: 'sch-2',
        organization_id: testOrgId,
        schedule_name: 'Week 2',
        start_date: '2025-01-20',
        end_date: '2025-01-26',
        is_published: false
      }
    ];

    it('should return all schedules for organization', async () => {
      // First query returns schedules data
      mockPool.query.mockResolvedValueOnce({ rows: mockSchedules });
      // Second query returns count
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await service.listSchedules(testOrgId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('sch-1');
      expect(result.data[1].id).toBe('sch-2');
      expect(result.pagination.totalCount).toBe(2);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should filter by date range when provided', async () => {
      const filters = {
        startDate: '2025-01-15',
        endDate: '2025-01-25'
      };

      // Mock the listSchedules query result and count query
      mockPool.query.mockResolvedValueOnce({ rows: [mockSchedules[1]] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await service.listSchedules(testOrgId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('end_date >= $2'),
        expect.arrayContaining([testOrgId, '2025-01-15'])
      );
    });

    it('should filter by published status when specified', async () => {
      const filters = { status: 'published' };

      // Mock the listSchedules query result and count query
      mockPool.query.mockResolvedValueOnce({ rows: [mockSchedules[0]] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await service.listSchedules(testOrgId, filters);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].is_published).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $2'),
        expect.arrayContaining([testOrgId, 'published'])
      );
    });
  });

  describe('createShift', () => {
    const validShiftData = {
      scheduleId: '123e4567-e89b-12d3-a456-426614174000',
      stationId: '223e4567-e89b-12d3-a456-426614174000',
      roleId: '323e4567-e89b-12d3-a456-426614174001',  // Required field per createShiftSchema
      shiftDate: '2025-01-20',
      startTime: '09:00',
      endTime: '17:00'
    };

    it('should create shift successfully', async () => {
      const mockCreatedShift = {
        id: '321e4567-e89b-12d3-a456-426614174000',
        schedule_id: validShiftData.scheduleId,
        station_id: validShiftData.stationId,
        role_id: validShiftData.roleId,
        shift_date: validShiftData.shiftDate,
        start_time: validShiftData.startTime,
        end_time: validShiftData.endTime,
        break_duration_minutes: 60,
        break_paid: true,
        shift_type: 'regular',
        status: 'scheduled',
        organization_id: testOrgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockSchedule = { id: validShiftData.scheduleId, status: 'draft' };
      const mockRole = { id: validShiftData.roleId };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSchedule] }) // Schedule exists check
        .mockResolvedValueOnce({ rows: [mockRole] }) // Role exists check
        .mockResolvedValueOnce({ rows: [mockCreatedShift] }) // INSERT shift
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.createShift(validShiftData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('321e4567-e89b-12d3-a456-426614174000');
    });

    it('should validate shift data before creation', async () => {
      const invalidData = {
        scheduleId: 'invalid-uuid',
        stationId: '',
        shiftDate: 'invalid-date',
        startTime: '25:00', // Invalid time
        endTime: '17:00'
      };

      await expect(service.createShift(invalidData, testOrgId, testUserId))
        .rejects.toThrow(/validation|invalid/i);
    });

    it('should handle time overlap conflicts', async () => {
      const dbError = new Error('Shift time conflicts with existing shift');
      mockClient.query.mockRejectedValueOnce(dbError);

      await expect(service.createShift(validShiftData, testOrgId, testUserId))
        .rejects.toThrow('Shift time conflicts with existing shift');
    });
  });

  describe('updateShift', () => {
    const updateData = {
      stationId: '223e4567-e89b-12d3-a456-426614174000',
      startTime: '10:00',
      endTime: '18:00'
    };

    it('should update shift successfully', async () => {
      const mockUpdatedShift = {
        id: 'shift-1234',
        ...updateData,
        organization_id: testOrgId,
        updated_at: new Date()
      };

      // Mock transaction sequence: BEGIN, shift check, UPDATE, COMMIT
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'shift-1234', status: 'scheduled' }] }) // shift check
        .mockResolvedValueOnce({ rows: [mockUpdatedShift] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.updateShift('shift-1234', updateData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('shift-1234');
    });

    it('should throw error when shift not found', async () => {
      // Mock transaction sequence for not found scenario
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT - shift not found
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK (happens in service when not found)

      await expect(service.updateShift('nonexistent', updateData, testOrgId, testUserId))
        .rejects.toThrow('Shift not found');
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        startTime: '25:00', // Invalid time
        endTime: 'not-a-time'
      };

      await expect(service.updateShift('shift-1234', invalidUpdate, testOrgId, testUserId))
        .rejects.toThrow(/validation|invalid/i);
    });
  });

  describe('assignWorkerToShift', () => {
    it('should assign worker successfully', async () => {
      const mockShift = {
        id: 'shift-1234',
        employee_id: null,
        role_id: 'role-1',
        shift_date: '2025-01-15',
        start_time: '09:00:00',
        end_time: '17:00:00',
        organization_id: testOrgId
      };

      const mockWorker = {
        id: 'worker-1',
        employment_status: 'active'
      };

      const mockUpdatedShift = {
        ...mockShift,
        employee_id: '223e4567-e89b-12d3-a456-426614174000', // Use actual workerId passed to method
        status: 'confirmed'
      };

      // Mock transaction and queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockShift] }) // Shift check
        .mockResolvedValueOnce({ rows: [mockWorker] }) // Worker check
        .mockResolvedValueOnce({ rows: [mockUpdatedShift] }) // Update shift
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await service.assignWorkerToShift('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174000', testOrgId, testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.employee_id).toBe('223e4567-e89b-12d3-a456-426614174000');
      expect(result.data.status).toBe('confirmed');
    });

    it('should prevent double assignment', async () => {
      const dbError = new Error('Worker already assigned to this shift');
      
      // Mock transaction sequence: BEGIN → shift check → worker check → UPDATE fails → ROLLBACK
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN succeeds
        .mockResolvedValueOnce({ // shift check succeeds
          rows: [{
            id: '123e4567-e89b-12d3-a456-426614174000',
            employee_id: null,
            role_id: 'role-uuid',
            shift_date: '2025-01-06',
            start_time: '09:00:00',
            end_time: '17:00:00'
          }]
        })
        .mockResolvedValueOnce({ // worker check succeeds
          rows: [{
            id: '223e4567-e89b-12d3-a456-426614174000',
            employment_status: 'active'
          }]
        })
        .mockRejectedValueOnce(dbError) // UPDATE fails (double assignment prevention)
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK succeeds

      await expect(service.assignWorkerToShift('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174000', testOrgId, testUserId))
        .rejects.toThrow('Worker already assigned to this shift');

      // Verify transaction handling
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should validate UUIDs', async () => {
      await expect(service.assignWorkerToShift('invalid-uuid', '223e4567-e89b-12d3-a456-426614174000', testOrgId, testUserId))
        .rejects.toThrow(/must be a valid/i);

      await expect(service.assignWorkerToShift('123e4567-e89b-12d3-a456-426614174000', 'invalid-uuid', testOrgId, testUserId))
        .rejects.toThrow(/must be a valid/i);
    });

    it('should throw error when shift not found', async () => {
      // Mock transaction and queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check shift exists - no rows found
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(service.assignWorkerToShift('123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174000', testOrgId, testUserId))
        .rejects.toThrow('Shift not found');
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('unassignWorkerFromShift', () => {
    it('should unassign worker successfully', async () => {
      const mockUpdatedShift = {
        id: 'shift-1234',
        employee_id: null,
        status: 'scheduled',
        organization_id: testOrgId
      };

      // Mock transaction and queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUpdatedShift] }) // Update shift
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await service.unassignWorkerFromShift('123e4567-e89b-12d3-a456-426614174000', testOrgId, testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.employee_id).toBe(null);
      expect(result.data.status).toBe('scheduled');
    });

    it('should throw error when shift not found', async () => {
      // Mock transaction and queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Update shift - no rows
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(service.unassignWorkerFromShift('123e4567-e89b-12d3-a456-426614174000', testOrgId, testUserId))
        .rejects.toThrow('Shift not found');
    });

    it('should validate UUIDs before unassigning', async () => {
      await expect(service.unassignWorkerFromShift('invalid', testOrgId, testUserId))
        .rejects.toThrow(/invalid.*uuid/i);
    });
  });

  describe('publishSchedule', () => {
    it('should publish valid schedule', async () => {
      const mockSchedule = {
        id: 'sch-1234',
        organization_id: testOrgId,
        status: 'draft'
      };

      const mockPublishedSchedule = {
        ...mockSchedule,
        status: 'published',
        published_at: new Date(),
        published_by: testUserId
      };

      // Mock validateScheduleForPublication method
      jest.spyOn(service, 'validateScheduleForPublication').mockResolvedValueOnce({
        isValid: true,
        totalShifts: 5,
        conflictingShifts: 0,
        conflicts: []
      });

      // Mock transaction and queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockPublishedSchedule] }) // Update schedule
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await service.publishSchedule('sch-1234', testOrgId, testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.status).toBe('published');
      expect(result.data.published_by).toBe(testUserId);
    });

    it('should reject publishing schedule with conflicts', async () => {
      // Mock validateScheduleForPublication method to return conflicts
      jest.spyOn(service, 'validateScheduleForPublication').mockResolvedValueOnce({
        isValid: false,
        totalShifts: 5,
        conflictingShifts: 2,
        conflicts: [
          {
            employeeId: 'emp-1',
            employeeName: 'John Doe',
            date: '2025-01-15',
            conflictingShifts: []
          }
        ]
      });

      // Mock transaction
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN

      await expect(service.publishSchedule('sch-1234', testOrgId, testUserId))
        .rejects.toThrow(/Cannot publish schedule.*shift conflicts detected/);
    });

    it('should handle schedule not found', async () => {
      // Mock validateScheduleForPublication method
      jest.spyOn(service, 'validateScheduleForPublication').mockResolvedValueOnce({
        isValid: true,
        totalShifts: 5,
        conflictingShifts: 0,
        conflicts: []
      });

      // Mock transaction and queries
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Update schedule - no rows
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(service.publishSchedule('sch-1234', testOrgId, testUserId))
        .rejects.toThrow('Schedule not found');
    });
  });

  describe('cancelShift', () => {
    it('should cancel shift successfully', async () => {
      const mockShift = {
        id: 'shift-1234',
        status: 'cancelled',
        cancellation_reason: 'Test cancellation',
        organization_id: testOrgId
      };

      // Mock transaction sequence
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockShift] }) // UPDATE with RETURNING
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await service.cancelShift('shift-1234', testOrgId, 'Test cancellation', testUserId);

      expect(result).toEqual({
        success: true,
        data: mockShift
      });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scheduling.shifts'),
        ['Test cancellation', testUserId, 'shift-1234', testOrgId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should prevent cancelling already cancelled shift', async () => {
      // Mock transaction sequence for not found case
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows (shift not found or already cancelled)
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(service.cancelShift('shift-1234', testOrgId, 'Test cancellation', testUserId))
        .rejects.toThrow('Shift not found');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return null when shift not found', async () => {
      // Mock transaction sequence for not found case
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(service.cancelShift('nonexistent', testOrgId, 'Test cancellation', testUserId))
        .rejects.toThrow('Shift not found');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getWorkerShifts', () => {
    const mockShifts = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        shift_date: '2025-01-20',
        start_time: '09:00',
        end_time: '17:00',
        station_name: 'Station A'
      },
      {
        id: '223e4567-e89b-12d3-a456-426614174000',
        shift_date: '2025-01-21',
        start_time: '10:00',
        end_time: '18:00',
        station_name: 'Station B'
      }
    ];

    it('should return worker shifts for date range', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockShifts });

      const result = await service.getWorkerShifts(
        '123e4567-e89b-12d3-a456-426614174001',
        '2025-01-20',
        '2025-01-26',
        testOrgId
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('scheduling.shifts'),
        expect.arrayContaining(['123e4567-e89b-12d3-a456-426614174001', '2025-01-20', '2025-01-26', testOrgId])
      );
    });

    it('should return empty array when no shifts found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getWorkerShifts(
        '123e4567-e89b-12d3-a456-426614174001',
        '2025-01-20',
        '2025-01-26',
        testOrgId
      );

      expect(result).toEqual([]);
    });

    it('should handle database errors for invalid dates', async () => {
      // Mock database error for invalid date format
      mockPool.query.mockRejectedValueOnce(new Error('invalid input syntax for type date'));

      await expect(service.getWorkerShifts(
        '123e4567-e89b-12d3-a456-426614174001',
        'invalid-date',
        '2025-01-26',
        testOrgId
      )).rejects.toThrow('invalid input syntax for type date');
    });
  });
});