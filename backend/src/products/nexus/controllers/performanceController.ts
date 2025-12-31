/**
 * PerformanceController
 * HTTP request handlers for performance management
 */

import PerformanceService from '../services/performanceService.js';
import logger from '../../../utils/logger.js';

class PerformanceController {
  constructor() {
    this.service = new PerformanceService();
    this.logger = logger;
  }

  // ========== REVIEWS ==========

  /**
   * Create performance review
   * POST /api/nexus/performance/reviews
   */
  createReview = async (req, res) => {
    try {
      const { organization_id: organizationId, id: userId } = req.user;
      const review = await this.service.createReview(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: review });
    } catch (_error) {
      this.logger.error('Error in createReview controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get review by ID
   * GET /api/nexus/performance/reviews/:id
   */
  getReview = async (req, res) => {
    try {
      const { organization_id: organizationId } = req.user;
      const { id } = req.params;
      const review = await this.service.getReview(id, organizationId);
      res.json({ success: true, data: review });
    } catch (_error) {
      this.logger.error('Error in getReview controller', { error: error.message });
      const status = error.message === 'Review not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * List reviews with filters
   * GET /api/nexus/performance/reviews
   */
  listReviews = async (req, res) => {
    try {
      const { organization_id: organizationId } = req.user;
      const { employeeId, status, limit = 50, offset = 0 } = req.query;

      const filters = {};
      if (employeeId) filters.employeeId = employeeId;
      if (status) filters.status = status;

      const options = { limit: parseInt(limit), offset: parseInt(offset) };

      const reviews = await this.service.listReviews(filters, organizationId, options);
      res.json({ success: true, data: reviews });
    } catch (_error) {
      this.logger.error('Error in listReviews controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Update review
   * PATCH /api/nexus/performance/reviews/:id
   */
  updateReview = async (req, res) => {
    try {
      const { organization_id: organizationId, id: userId } = req.user;
      const { id } = req.params;
      const review = await this.service.updateReview(id, req.body, organizationId, userId);
      res.json({ success: true, data: review });
    } catch (_error) {
      this.logger.error('Error in updateReview controller', { error: error.message });
      const status = error.message === 'Review not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get reviews statistics
   * GET /api/nexus/performance/reviews/statistics
   */
  getReviewsStatistics = async (req, res) => {
    try {
      const { organization_id: organizationId } = req.user;
      const statistics = await this.service.getReviewsStatistics(organizationId);
      res.json({ success: true, data: statistics });
    } catch (_error) {
      this.logger.error('Error in getReviewsStatistics controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // ========== GOALS ==========

  /**
   * Create performance goal
   * POST /api/nexus/performance/goals
   */
  createGoal = async (req, res) => {
    try {
      const { organization_id: organizationId, id: userId } = req.user;
      const goal = await this.service.createGoal(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: goal });
    } catch (_error) {
      this.logger.error('Error in createGoal controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Update goal
   * PATCH /api/nexus/performance/goals/:id
   */
  updateGoal = async (req, res) => {
    try {
      const { organization_id: organizationId, id: userId } = req.user;
      const { id } = req.params;
      const goal = await this.service.updateGoal(id, req.body, organizationId, userId);
      res.json({ success: true, data: goal });
    } catch (_error) {
      this.logger.error('Error in updateGoal controller', { error: error.message });
      const status = error.message === 'Goal not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * List goals with filters
   * GET /api/nexus/performance/goals
   */
  listGoals = async (req, res) => {
    try {
      const { organization_id: organizationId } = req.user;
      const { employeeId, status, limit = 50, offset = 0 } = req.query;

      const filters = {};
      if (employeeId) filters.employeeId = employeeId;
      if (status) filters.status = status;

      const options = { limit: parseInt(limit), offset: parseInt(offset) };

      const goals = await this.service.listGoals(filters, organizationId, options);
      res.json({ success: true, data: goals });
    } catch (_error) {
      this.logger.error('Error in listGoals controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get goals statistics
   * GET /api/nexus/performance/goals/statistics
   */
  getGoalsStatistics = async (req, res) => {
    try {
      const { organization_id: organizationId } = req.user;
      const statistics = await this.service.getGoalsStatistics(organizationId);
      res.json({ success: true, data: statistics });
    } catch (_error) {
      this.logger.error('Error in getGoalsStatistics controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // ========== FEEDBACK ==========

  /**
   * Create feedback
   * POST /api/nexus/performance/feedback
   */
  createFeedback = async (req, res) => {
    try {
      const { organization_id: organizationId, id: userId } = req.user;
      const feedback = await this.service.createFeedback(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: feedback });
    } catch (_error) {
      this.logger.error('Error in createFeedback controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get employee feedback
   * GET /api/nexus/performance/feedback/employee/:employeeId
   */
  getEmployeeFeedback = async (req, res) => {
    try {
      const { organization_id: organizationId } = req.user;
      const { employeeId } = req.params;
      const { limit = 50 } = req.query;

      const feedback = await this.service.getEmployeeFeedback(
        employeeId, 
        organizationId, 
        parseInt(limit)
      );
      res.json({ success: true, data: feedback });
    } catch (_error) {
      this.logger.error('Error in getEmployeeFeedback controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export default PerformanceController;
