/**
 * Employee Self-Service Controller for ScheduleHub
 * Handles employee-centric operations for mobile app
 */

import logger from '../../../utils/logger.js';
import EmployeeScheduleService from '../services/employeeScheduleService.js';

class EmployeeController {
  private service: EmployeeScheduleService;
  private logger: typeof logger;

  constructor() {
    this.service = new EmployeeScheduleService();
    this.logger = logger;
  }

  /**
   * Clock in employee
   * POST /api/products/schedulehub/clock-in
   */
  clockIn = async (req: any, res: any, next: any) => {
    try {
      const { organizationId, userId, employeeId } = req.user;
      const { location } = req.body;

      const result = await this.service.clockIn(
        employeeId,
        location,
        organizationId,
        userId
      );

      res.status(201).json({
        success: true,
        attendance: result
      });
    } catch (error: any) {
      this.logger.error('Error in clockIn controller:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Clock out employee
   * POST /api/products/schedulehub/clock-out
   */
  clockOut = async (req: any, res: any, next: any) => {
    try {
      const { organizationId, userId, employeeId } = req.user;
      const { location } = req.body;

      const result = await this.service.clockOut(
        employeeId,
        location,
        organizationId,
        userId
      );

      res.json({
        success: true,
        attendance: result
      });
    } catch (error: any) {
      this.logger.error('Error in clockOut controller:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get employee's shifts with date filtering
   * GET /api/products/schedulehub/shifts?employee_id=X&date=Y
   */
  getEmployeeShifts = async (req: any, res: any, next: any) => {
    try {
      const { organizationId, employeeId } = req.user;
      const { date, startDate, endDate } = req.query;

      const result = await this.service.getEmployeeShifts(
        employeeId,
        { date, startDate, endDate },
        organizationId
      );

      res.json({
        success: true,
        shifts: result
      });
    } catch (error: any) {
      this.logger.error('Error in getEmployeeShifts controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get employee's current clock-in status
   * GET /api/products/schedulehub/clock-status
   */
  getClockStatus = async (req: any, res: any, next: any) => {
    try {
      const { organizationId, employeeId } = req.user;

      const result = await this.service.getClockStatus(
        employeeId,
        organizationId
      );

      res.json({
        success: true,
        status: result
      });
    } catch (error: any) {
      this.logger.error('Error in getClockStatus controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
}

export default EmployeeController;
