/**
 * ScheduleHub Stats Controller
 * HTTP request handlers for dashboard statistics
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class StatsController {
  /**
   * Get dashboard statistics
   * GET /api/schedulehub/stats
   */
  getStats = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;

      // Initialize default stats
      const stats = {
        activeWorkers: 0,
        publishedSchedules: 0,
        pendingTimeOff: 0,
        openShifts: 0,
        upcomingShifts: [],
        pendingApprovals: [],
      };

      try {
        // Get active workers count
        const workersResult = await query(
          `SELECT COUNT(DISTINCT e.id) as count 
           FROM hris.employee e
           WHERE e.organization_id = $1 
             AND e.employment_status = 'active' 
             AND e.deleted_at IS NULL`,
          [organizationId],
          organizationId,
          { operation: 'SELECT', table: 'hris.employee' }
        );
        stats.activeWorkers = parseInt(workersResult.rows[0]?.count || 0);
      } catch (_err) {
        logger.warn('Error getting active workers count:', err.message);
      }

      try {
        // Get published schedules count (current and future)
        const schedulesResult = await query(
          `SELECT COUNT(*) as count 
           FROM scheduling.schedules 
           WHERE organization_id = $1 
             AND status = 'published' 
             AND end_date >= CURRENT_DATE`,
          [organizationId],
          organizationId,
          { operation: 'SELECT', table: 'scheduling.schedules' }
        );
        stats.publishedSchedules = parseInt(schedulesResult.rows[0]?.count || 0);
      } catch (_err) {
        logger.warn('Error getting published schedules count:', err.message);
      }

      try {
        // Get pending time off requests count
        const timeOffResult = await query(
          `SELECT COUNT(*) as count 
           FROM scheduling.time_off_requests 
           WHERE organization_id = $1 
             AND status = 'pending'`,
          [organizationId],
          organizationId,
          { operation: 'SELECT', table: 'scheduling.time_off_requests' }
        );
        stats.pendingTimeOff = parseInt(timeOffResult.rows[0]?.count || 0);
      } catch (_err) {
        logger.warn('Error getting pending time off count:', err.message);
      }

      try {
        // Get open shifts count (unassigned shifts in future schedules)
        const openShiftsResult = await query(
          `SELECT COUNT(*) as count 
           FROM scheduling.shifts sh
           WHERE sh.organization_id = $1 
             AND sh.employee_id IS NULL 
             AND sh.status = 'scheduled'
             AND sh.start_timestamp >= NOW()`,
          [organizationId],
          organizationId,
          { operation: 'SELECT', table: 'scheduling.shifts' }
        );
        stats.openShifts = parseInt(openShiftsResult.rows[0]?.count || 0);
      } catch (_err) {
        logger.warn('Error getting open shifts count:', err.message);
      }

      try {
        // Get upcoming shifts (next 7 days)
        const upcomingShiftsResult = await query(
          `SELECT sh.id, sh.shift_date, sh.start_time, sh.end_time, 
                  sh.start_timestamp, sh.end_timestamp, sh.employee_id
           FROM scheduling.shifts sh
           WHERE sh.organization_id = $1 
             AND sh.start_timestamp >= NOW()
             AND sh.start_timestamp <= NOW() + INTERVAL '7 days'
           ORDER BY sh.start_timestamp
           LIMIT 10`,
          [organizationId],
          organizationId,
          { operation: 'SELECT', table: 'scheduling.shifts' }
        );
        stats.upcomingShifts = upcomingShiftsResult.rows || [];
      } catch (_err) {
        logger.warn('Error getting upcoming shifts:', err.message);
      }

      try {
        // Get pending approvals (time off only for now)
        const pendingApprovalsResult = await query(
          `SELECT 'time_off' as type, id, created_at 
           FROM scheduling.time_off_requests 
           WHERE organization_id = $1 
             AND status = 'pending'
           ORDER BY created_at DESC
           LIMIT 10`,
          [organizationId],
          organizationId,
          { operation: 'SELECT', table: 'scheduling.time_off_requests' }
        );
        stats.pendingApprovals = pendingApprovalsResult.rows || [];
      } catch (_err) {
        logger.warn('Error getting pending approvals:', err.message);
      }

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getStats controller:', error);
      next(error);
    }
  };
}

export default StatsController;
