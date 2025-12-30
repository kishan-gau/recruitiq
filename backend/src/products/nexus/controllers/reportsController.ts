/**
 * ReportsController
 * HTTP request handlers for reporting and analytics
 */

import ReportsService from '../services/reportsService.ts';
import logger from '../../../utils/logger.ts';

class ReportsController {
  constructor() {
    this.service = new ReportsService();
    this.logger = logger;
  }

  /**
   * Get headcount report
   * GET /api/nexus/reports/headcount
   */
  getHeadcountReport = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const report = await this.service.getHeadcountReport(organizationId, req.query);
      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error in getHeadcountReport controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get turnover report
   * GET /api/nexus/reports/turnover
   */
  getTurnoverReport = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
      }

      const report = await this.service.getTurnoverReport(organizationId, startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error in getTurnoverReport controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get time-off report
   * GET /api/nexus/reports/time-off
   */
  getTimeOffReport = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
      }

      const report = await this.service.getTimeOffReport(organizationId, startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error in getTimeOffReport controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get attendance report
   * GET /api/nexus/reports/attendance
   */
  getAttendanceReport = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
      }

      const report = await this.service.getAttendanceReport(organizationId, startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error in getAttendanceReport controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get performance report
   * GET /api/nexus/reports/performance
   */
  getPerformanceReport = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
      }

      const report = await this.service.getPerformanceReport(organizationId, startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error in getPerformanceReport controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get benefits enrollment report
   * GET /api/nexus/reports/benefits
   */
  getBenefitsReport = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const report = await this.service.getBenefitsReport(organizationId);
      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error in getBenefitsReport controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get dashboard report
   * GET /api/nexus/reports/dashboard
   */
  getDashboardReport = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const report = await this.service.getDashboardReport(organizationId);
      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('Error in getDashboardReport controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export default ReportsController;
