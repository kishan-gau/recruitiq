/**
 * Integration Test: RecruitIQ → Nexus → ScheduleHub
 * Tests the complete new hire onboarding flow
 * 
 * Flow:
 * 1. Candidate accepts offer in RecruitIQ
 * 2. Employee created in Nexus (HRIS)
 * 3. Worker synced to ScheduleHub workforce
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import pool from '../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';

describe('Integration: RecruitIQ → Nexus → ScheduleHub', () => {
  let organizationId;
  let testUserId;
  let authToken;
  let candidateId;
  let positionId;
  let offerId;
  let employeeId;
  let workerId;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(
      `INSERT INTO public.organization (name, created_at) 
       VALUES ('Test Org - Integration', NOW()) 
       RETURNING id`
    );
    organizationId = orgResult.rows[0].id;

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO public.users (organization_id, email, password_hash, first_name, last_name, role, created_at)
       VALUES ($1, 'test@integration.com', 'hash', 'Test', 'User', 'admin', NOW())
       RETURNING id`,
      [organizationId]
    );
    testUserId = userResult.rows[0].id;

    // Mock auth token (in real tests, use proper authentication)
    authToken = 'mock-token';
  });

  afterAll(async () => {
    // Cleanup test data
    if (organizationId) {
      await pool.query('DELETE FROM scheduling.worker WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM hris.employee WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM recruitment.candidate WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM recruitment.position WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM public.users WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM public.organization WHERE id = $1', [organizationId]);
    }
    await pool.end();
  });

  beforeEach(() => {
    // Reset IDs for each test
    candidateId = null;
    positionId = null;
    offerId = null;
    employeeId = null;
    workerId = null;
  });

  describe('Complete New Hire Flow', () => {
    it('should create candidate, position, and offer in RecruitIQ', async () => {
      // 1. Create Position
      const positionData = {
        title: 'Software Engineer',
        department: 'Engineering',
        location: 'San Francisco',
        employmentType: 'full_time',
        status: 'open',
        description: 'Test position for integration testing'
      };

      const positionResult = await pool.query(
        `INSERT INTO recruitment.position (
          organization_id, title, department, location, 
          employment_type, status, description, created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
        RETURNING id`,
        [
          organizationId,
          positionData.title,
          positionData.department,
          positionData.location,
          positionData.employmentType,
          positionData.status,
          positionData.description,
          testUserId
        ]
      );
      positionId = positionResult.rows[0].id;

      expect(positionId).toBeTruthy();

      // 2. Create Candidate
      const candidateData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-0100',
        dateOfBirth: '1990-01-15',
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        country: 'USA'
      };

      const candidateResult = await pool.query(
        `INSERT INTO recruitment.candidate (
          organization_id, first_name, last_name, email, phone,
          date_of_birth, address, city, state, postal_code, country,
          created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
        RETURNING id`,
        [
          organizationId,
          candidateData.firstName,
          candidateData.lastName,
          candidateData.email,
          candidateData.phone,
          candidateData.dateOfBirth,
          candidateData.address,
          candidateData.city,
          candidateData.state,
          candidateData.zipCode,
          candidateData.country,
          testUserId
        ]
      );
      candidateId = candidateResult.rows[0].id;

      expect(candidateId).toBeTruthy();

      // 3. Create Offer
      const offerData = {
        salary: 100000,
        currency: 'USD',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        offerExpiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
      };

      const offerResult = await pool.query(
        `INSERT INTO recruitment.offer (
          organization_id, candidate_id, position_id, salary_amount,
          currency, start_date, offer_date, offer_expiry_date,
          status, created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, 'pending', NOW(), $8)
        RETURNING id`,
        [
          organizationId,
          candidateId,
          positionId,
          offerData.salary,
          offerData.currency,
          offerData.startDate,
          offerData.offerExpiryDate,
          testUserId
        ]
      );
      offerId = offerResult.rows[0].id;

      expect(offerId).toBeTruthy();
    });

    it('should create employee in Nexus when offer is accepted', async () => {
      // Accept the offer (this should trigger createFromRecruitIQOffer)
      const acceptResult = await pool.query(
        `UPDATE recruitment.offer 
         SET status = 'accepted', accepted_date = NOW(), updated_at = NOW()
         WHERE id = $1 AND organization_id = $2
         RETURNING id`,
        [offerId, organizationId]
      );

      expect(acceptResult.rows.length).toBe(1);

      // Get candidate and position data
      const candidateResult = await pool.query(
        'SELECT * FROM recruitment.candidate WHERE id = $1',
        [candidateId]
      );
      const candidate = candidateResult.rows[0];

      const positionResult = await pool.query(
        'SELECT * FROM recruitment.position WHERE id = $1',
        [positionId]
      );
      const position = positionResult.rows[0];

      const offerResult = await pool.query(
        'SELECT * FROM recruitment.offer WHERE id = $1',
        [offerId]
      );
      const offer = offerResult.rows[0];

      // Import and call the integration method
      const { default: EmployeeService } = await import('../../src/products/nexus/services/employeeService.js');
      const employeeService = new EmployeeService();

      const result = await employeeService.createFromRecruitIQOffer({
        candidate,
        position,
        offerId: offer.id,
        startDate: offer.start_date,
        salary: offer.salary_amount,
        currency: offer.currency
      }, organizationId, testUserId);

      expect(result.employee).toBeDefined();
      expect(result.contract).toBeDefined();
      expect(result.employee.first_name).toBe('John');
      expect(result.employee.last_name).toBe('Doe');
      expect(result.employee.email).toBe('john.doe@example.com');
      expect(result.employee.employee_number).toMatch(/^EMP\d{4}$/);

      employeeId = result.employee.id;

      // Verify employee exists in database
      const employeeCheck = await pool.query(
        'SELECT * FROM hris.employee WHERE id = $1 AND organization_id = $2',
        [employeeId, organizationId]
      );

      expect(employeeCheck.rows.length).toBe(1);
      expect(employeeCheck.rows[0].employment_status).toBe('active');
    });

    it('should sync employee to ScheduleHub workforce', async () => {
      // Wait a bit for async integration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if worker was created in ScheduleHub
      const workerResult = await pool.query(
        `SELECT * FROM scheduling.worker 
         WHERE organization_id = $1 AND employee_id = $2 AND deleted_at IS NULL`,
        [organizationId, employeeId]
      );

      expect(workerResult.rows.length).toBe(1);

      const worker = workerResult.rows[0];
      workerId = worker.id;

      expect(worker.first_name).toBe('John');
      expect(worker.last_name).toBe('Doe');
      expect(worker.email).toBe('john.doe@example.com');
      expect(worker.employment_type).toBe('full_time');
      expect(worker.status).toBe('active');

      // Check if default availability was created (Mon-Fri 9am-5pm)
      const availabilityResult = await pool.query(
        `SELECT * FROM scheduling.worker_availability 
         WHERE worker_id = $1 AND organization_id = $2`,
        [workerId, organizationId]
      );

      expect(availabilityResult.rows.length).toBe(5); // Monday through Friday
      
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      availabilityResult.rows.forEach(row => {
        expect(weekdays).toContain(row.day_of_week);
        expect(row.start_time).toBe('09:00:00');
        expect(row.end_time).toBe('17:00:00');
        expect(row.is_available).toBe(true);
      });
    });

    it('should have complete end-to-end data consistency', async () => {
      // Verify all entities exist and are linked
      const candidate = await pool.query(
        'SELECT * FROM recruitment.candidate WHERE id = $1',
        [candidateId]
      );
      expect(candidate.rows.length).toBe(1);

      const position = await pool.query(
        'SELECT * FROM recruitment.position WHERE id = $1',
        [positionId]
      );
      expect(position.rows.length).toBe(1);

      const offer = await pool.query(
        'SELECT * FROM recruitment.offer WHERE id = $1 AND status = $2',
        [offerId, 'accepted']
      );
      expect(offer.rows.length).toBe(1);

      const employee = await pool.query(
        'SELECT * FROM hris.employee WHERE id = $1',
        [employeeId]
      );
      expect(employee.rows.length).toBe(1);
      expect(employee.rows[0].employment_status).toBe('active');

      const worker = await pool.query(
        'SELECT * FROM scheduling.worker WHERE employee_id = $1',
        [employeeId]
      );
      expect(worker.rows.length).toBe(1);
      expect(worker.rows[0].status).toBe('active');

      // Verify data consistency across systems
      expect(candidate.rows[0].first_name).toBe(employee.rows[0].first_name);
      expect(candidate.rows[0].last_name).toBe(employee.rows[0].last_name);
      expect(candidate.rows[0].email).toBe(employee.rows[0].email);
      expect(employee.rows[0].first_name).toBe(worker.rows[0].first_name);
      expect(employee.rows[0].last_name).toBe(worker.rows[0].last_name);
      expect(employee.rows[0].email).toBe(worker.rows[0].email);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing candidate data gracefully', async () => {
      const invalidOfferId = uuidv4();
      
      const { default: EmployeeService } = await import('../../src/products/nexus/services/employeeService.js');
      const employeeService = new EmployeeService();

      await expect(
        employeeService.createFromRecruitIQOffer({
          candidate: null,
          position: { title: 'Test' },
          offerId: invalidOfferId,
          startDate: new Date(),
          salary: 50000,
          currency: 'USD'
        }, organizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should rollback on database error', async () => {
      const { default: EmployeeService } = await import('../../src/products/nexus/services/employeeService.js');
      const employeeService = new EmployeeService();

      // Try to create with invalid organization ID
      await expect(
        employeeService.createFromRecruitIQOffer({
          candidate: { firstName: 'Test', lastName: 'User', email: 'test@test.com' },
          position: { title: 'Test', employmentType: 'full_time' },
          offerId: uuidv4(),
          startDate: new Date(),
          salary: 50000,
          currency: 'USD'
        }, '00000000-0000-0000-0000-000000000000', testUserId)
      ).rejects.toThrow();

      // Verify no partial data was created
      const employeeCount = await pool.query(
        'SELECT COUNT(*) FROM hris.employee WHERE organization_id = $1',
        ['00000000-0000-0000-0000-000000000000']
      );
      expect(parseInt(employeeCount.rows[0].count)).toBe(0);
    });
  });
});
