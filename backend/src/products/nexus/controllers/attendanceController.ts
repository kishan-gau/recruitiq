/**
 * AttendanceController
 * HTTP request handlers for attendance tracking
 */

import AttendanceService from '../services/attendanceService.js';
import logger from '../../../utils/logger.js';

class AttendanceController {
  constructor() {
    this.service = new AttendanceService();
    this.logger = logger;
  }

  /**
   * Clock in
   * POST /api/nexus/attendance/clock-in
   */
  clockIn = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const attendance = await this.service.clockIn(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: attendance });
    } catch (_error) {
      this.logger.error('Error in clockIn controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Clock out
   * POST /api/nexus/attendance/clock-out
   */
  clockOut = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const { employeeId, ...clockOutData } = req.body;
      
      if (!employeeId) {
        return res.status(400).json({ success: false, error: 'employeeId is required' });
      }

      const attendance = await this.service.clockOut(employeeId, clockOutData, organizationId, userId);
      res.json({ success: true, data: attendance });
    } catch (_error) {
      this.logger.error('Error in clockOut controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get attendance record
   * GET /api/nexus/attendance/:id
   */
  getAttendance = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      const attendance = await this.service.getAttendanceRecord(id, organizationId);
      res.json({ success: true, data: attendance });
    } catch (_error) {
      this.logger.error('Error in getAttendance controller', { error: error.message });
      const status = error.message === 'Attendance record not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get employee attendance
   * GET /api/nexus/attendance/employee/:employeeId
   */
  getEmployeeAttendance = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { employeeId } = req.params;
      const { startDate, endDate, limit = 50, offset = 0 } = req.query;

      const filters = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const attendance = await this.service.getEmployeeAttendance(
        employeeId, 
        organizationId, 
        { ...filters, limit: parseInt(limit), offset: parseInt(offset) }
      );
      res.json({ success: true, data: attendance });
    } catch (_error) {
      this.logger.error('Error in getEmployeeAttendance controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Create manual attendance record
   * POST /api/nexus/attendance/manual
   */
  createManualAttendance = async (req, res) => {
    try {
      const { organizationId, userId } = req.user;
      const attendance = await this.service.createManualAttendance(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: attendance });
    } catch (_error) {
      this.logger.error('Error in createManualAttendance controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get attendance summary
   * GET /api/nexus/attendance/employee/:employeeId/summary
   */
  getAttendanceSummary = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          error: 'startDate and endDate are required' 
        });
      }

      const summary = await this.service.getAttendanceSummary(
        employeeId,
        startDate,
        endDate,
        organizationId
      );
      res.json({ success: true, data: summary });
    } catch (_error) {
      this.logger.error('Error in getAttendanceSummary controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get today's attendance records
   * GET /api/nexus/attendance/records/today
   */
  getTodayAttendance = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const records = await this.service.getTodayAttendance(organizationId);
      res.json({ success: true, data: records });
    } catch (_error) {
      this.logger.error('Error in getTodayAttendance controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get attendance statistics
   * GET /api/nexus/attendance/statistics
   */
  getAttendanceStatistics = async (req, res) => {
    try {
      const { organizationId } = req.user;
      const statistics = await this.service.getAttendanceStatistics(organizationId);
      res.json({ success: true, data: statistics });
    } catch (_error) {
      this.logger.error('Error in getAttendanceStatistics controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export default AttendanceController;
