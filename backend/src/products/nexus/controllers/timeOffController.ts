/**
 * TimeOffController
 * HTTP request handlers for time-off management
 */

import TimeOffService from '../services/timeOffService.js';
import logger from '../../../utils/logger.js';

class TimeOffController {
  constructor() {
    this.service = new TimeOffService();
    this.logger = logger;
  }

  /**
   * Create time-off request
   * POST /api/nexus/time-off/requests
   */
  createRequest = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const request = await this.service.createTimeOffRequest(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: request });
    } catch (error) {
      this.logger.error('Error in createRequest controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Review time-off request (approve/deny)
   * POST /api/nexus/time-off/requests/:id/review
   */
  reviewRequest = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      const request = await this.service.reviewTimeOffRequest(id, req.body, organizationId, userId);
      res.json({ success: true, data: request });
    } catch (error) {
      this.logger.error('Error in reviewRequest controller', { error: error.message });
      const status = error.message === 'Request not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Cancel time-off request
   * POST /api/nexus/time-off/requests/:id/cancel
   */
  cancelRequest = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { id } = req.params;
      const request = await this.service.cancelTimeOffRequest(id, organizationId, userId);
      res.json({ success: true, data: request });
    } catch (error) {
      this.logger.error('Error in cancelRequest controller', { error: error.message });
      const status = error.message === 'Request not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get time-off requests with filters
   * GET /api/nexus/time-off/requests
   */
  getRequests = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { employeeId, status, startDate, endDate, limit = 50, offset = 0 } = req.query;

      const filters = {};
      if (employeeId) filters.employeeId = employeeId;
      if (status) filters.status = status;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const options = { 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      };

      const requests = await this.service.getTimeOffRequests(filters, organizationId, options);
      res.json({ success: true, data: requests });
    } catch (error) {
      this.logger.error('Error in getRequests controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get employee time-off balances
   * GET /api/nexus/time-off/balances/:employeeId
   */
  getBalances = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { employeeId } = req.params;
      const balances = await this.service.getEmployeeTimeOffBalance(employeeId, organizationId);
      res.json({ success: true, data: balances });
    } catch (error) {
      this.logger.error('Error in getBalances controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Create time-off type
   * POST /api/nexus/time-off/types
   */
  createType = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const type = await this.service.createTimeOffType(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: type });
    } catch (error) {
      this.logger.error('Error in createType controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Accrue time-off for employee
   * POST /api/nexus/time-off/accrue
   */
  accrueTimeOff = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { employeeId, timeOffTypeId, daysAccrued, accrualPeriod } = req.body;

      if (!employeeId || !timeOffTypeId || !daysAccrued) {
        return res.status(400).json({ 
          success: false, 
          error: 'employeeId, timeOffTypeId, and daysAccrued are required' 
        });
      }

      const balance = await this.service.accrueTimeOff(
        employeeId,
        timeOffTypeId,
        daysAccrued,
        accrualPeriod,
        organizationId,
        userId
      );

      res.json({ success: true, data: balance });
    } catch (error) {
      this.logger.error('Error in accrueTimeOff controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };
}

export default TimeOffController;
