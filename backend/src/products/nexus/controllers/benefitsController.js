/**
 * BenefitsController
 * HTTP request handlers for benefits management
 */

import BenefitsService from '../services/benefitsService.js';
import logger from '../../../utils/logger.js';

class BenefitsController {
  constructor() {
    this.service = new BenefitsService();
    this.logger = logger;
  }

  // ========== PLANS ==========

  /**
   * Create benefit plan
   * POST /api/nexus/benefits/plans
   */
  createPlan = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const plan = await this.service.createPlan(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      this.logger.error('Error in createPlan controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get plan by ID
   * GET /api/nexus/benefits/plans/:id
   */
  getPlan = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      const plan = await this.service.getPlan(id, organizationId);
      res.json({ success: true, data: plan });
    } catch (error) {
      this.logger.error('Error in getPlan controller', { error: error.message });
      const status = error.message === 'Benefit plan not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * List benefit plans
   * GET /api/nexus/benefits/plans
   */
  listPlans = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { planType, isActive, limit = 50, offset = 0 } = req.query;

      const filters = {};
      if (planType) filters.planType = planType;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const options = { limit: parseInt(limit), offset: parseInt(offset) };

      const plans = await this.service.listPlans(filters, organizationId, options);
      res.json({ success: true, data: plans });
    } catch (error) {
      this.logger.error('Error in listPlans controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Update benefit plan
   * PATCH /api/nexus/benefits/plans/:id
   */
  updatePlan = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      const plan = await this.service.updatePlan(id, req.body, organizationId, userId);
      res.json({ success: true, data: plan });
    } catch (error) {
      this.logger.error('Error in updatePlan controller', { error: error.message });
      const status = error.message === 'Benefit plan not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  // ========== ENROLLMENTS ==========

  /**
   * Enroll employee in benefit plan
   * POST /api/nexus/benefits/enrollments
   */
  enrollEmployee = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const enrollment = await this.service.enrollEmployee(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: enrollment });
    } catch (error) {
      this.logger.error('Error in enrollEmployee controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Update enrollment
   * PATCH /api/nexus/benefits/enrollments/:id
   */
  updateEnrollment = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      const enrollment = await this.service.updateEnrollment(id, req.body, organizationId, userId);
      res.json({ success: true, data: enrollment });
    } catch (error) {
      this.logger.error('Error in updateEnrollment controller', { error: error.message });
      const status = error.message === 'Enrollment not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Terminate enrollment
   * POST /api/nexus/benefits/enrollments/:id/terminate
   */
  terminateEnrollment = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      const { endDate, reason } = req.body;
      
      const enrollment = await this.service.terminateEnrollment(
        id, 
        endDate, 
        reason, 
        organizationId, 
        userId
      );
      res.json({ success: true, data: enrollment });
    } catch (error) {
      this.logger.error('Error in terminateEnrollment controller', { error: error.message });
      const status = error.message === 'Enrollment not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get enrollment by ID
   * GET /api/nexus/benefits/enrollments/:id
   */
  getEnrollment = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      const enrollment = await this.service.getEnrollment(id, organizationId);
      res.json({ success: true, data: enrollment });
    } catch (error) {
      this.logger.error('Error in getEnrollment controller', { error: error.message });
      const status = error.message === 'Enrollment not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get employee enrollments
   * GET /api/nexus/benefits/enrollments/employee/:employeeId
   */
  getEmployeeEnrollments = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { employeeId } = req.params;
      const enrollments = await this.service.getEmployeeEnrollments(employeeId, organizationId);
      res.json({ success: true, data: enrollments });
    } catch (error) {
      this.logger.error('Error in getEmployeeEnrollments controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get active enrollments
   * GET /api/nexus/benefits/enrollments/active
   */
  getActiveEnrollments = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { planId } = req.query;
      const enrollments = await this.service.getActiveEnrollments(organizationId, planId);
      res.json({ success: true, data: enrollments });
    } catch (error) {
      this.logger.error('Error in getActiveEnrollments controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export default BenefitsController;
