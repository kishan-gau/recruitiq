/**
 * ScheduleHub Shift Trade Service
 * Business logic for shift swapping and marketplace
 */

import pool from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import Joi from 'joi';

class ShiftTradeService {
  constructor() {
    this.logger = logger;
  }

  createOfferSchema = Joi.object({
    shiftId: Joi.string().uuid().required(),
    swapType: Joi.string().valid('direct', 'open', 'trade').default('open'),
    targetWorkerId: Joi.string().uuid().when('swapType', { is: 'direct', then: Joi.required() }),
    requiresApproval: Joi.boolean().default(true),
    expiresAt: Joi.date().greater('now'),
    reason: Joi.string().allow(null, '')
  });

  async createSwapOffer(offerData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const { error, value } = this.createOfferSchema.validate(offerData);
      if (error) throw new Error(`Validation error: ${error.details[0].message}`);

      // Get shift details and verify ownership
      const shiftCheck = await client.query(
        `SELECT id, employee_id, shift_date FROM scheduling.shifts 
         WHERE id = $1 AND organization_id = $2 AND status IN ('scheduled', 'confirmed')`,
        [value.shiftId, organizationId]
      );

      if (shiftCheck.rows.length === 0) throw new Error('Shift not found or not available for swap');
      const shift = shiftCheck.rows[0];

      // Check if shift is in the future
      if (new Date(shift.shift_date) < new Date()) {
        throw new Error('Cannot offer past shifts for swap');
      }

      const result = await client.query(
        `INSERT INTO scheduling.shift_swap_offers (
          organization_id, shift_id, offering_employee_id, swap_type,
          target_employee_id, requires_approval, expires_at, reason, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [organizationId, value.shiftId, shift.employee_id, value.swapType,
         value.targetWorkerId || null, value.requiresApproval,
         value.expiresAt || null, value.reason || null, 'open']
      );

      await client.query('COMMIT');
      this.logger.info('Swap offer created', { offerId: result.rows[0].id, organizationId });
      return { success: true, data: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating swap offer:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async requestSwap(offerId, requestingWorkerId, organizationId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify offer exists and is open
      const offerCheck = await client.query(
        `SELECT o.*, s.role_id FROM scheduling.shift_swap_offers o
         JOIN scheduling.shifts s ON o.shift_id = s.id
         WHERE o.id = $1 AND o.organization_id = $2 AND o.status = 'open'
         AND (o.expires_at IS NULL OR o.expires_at > NOW())`,
        [offerId, organizationId]
      );

      if (offerCheck.rows.length === 0) throw new Error('Swap offer not found or expired');
      const offer = offerCheck.rows[0];

      // Verify requesting worker has the required role
      const roleCheck = await client.query(
        `SELECT 1 FROM scheduling.worker_roles
         WHERE employee_id = $1 AND role_id = $2 AND removed_date IS NULL`,
        [requestingWorkerId, offer.role_id]
      );

      if (roleCheck.rows.length === 0) {
        throw new Error('Worker does not have required role for this shift');
      }

      const result = await client.query(
        `INSERT INTO scheduling.shift_swap_requests (
          organization_id, swap_offer_id, requesting_employee_id, status
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [organizationId, offerId, requestingWorkerId, 'pending']
      );

      await client.query('COMMIT');
      this.logger.info('Swap request created', { requestId: result.rows[0].id, organizationId });
      return { success: true, data: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating swap request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async acceptSwapRequest(requestId, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get request and offer details
      const requestCheck = await client.query(
        `SELECT r.*, o.shift_id, o.offering_employee_id, o.requires_approval
         FROM scheduling.shift_swap_requests r
         JOIN scheduling.shift_swap_offers o ON r.swap_offer_id = o.id
         WHERE r.id = $1 AND r.organization_id = $2 AND r.status = 'pending'`,
        [requestId, organizationId]
      );

      if (requestCheck.rows.length === 0) throw new Error('Swap request not found');
      const request = requestCheck.rows[0];

      if (request.requires_approval) {
        // Update to pending approval
        await client.query(
          `UPDATE scheduling.shift_swap_offers
           SET status = 'pending_approval'
           WHERE id = $1`,
          [request.swap_offer_id]
        );
        await client.query(
          `UPDATE scheduling.shift_swap_requests
           SET status = 'accepted'
           WHERE id = $1`,
          [requestId]
        );
      } else {
        // Complete the swap immediately
        await client.query(
          `UPDATE scheduling.shifts
           SET employee_id = $1, updated_by = $2
           WHERE id = $3`,
          [request.requesting_employee_id, userId, request.shift_id]
        );
        await client.query(
          `UPDATE scheduling.shift_swap_offers
           SET status = 'completed'
           WHERE id = $1`,
          [request.swap_offer_id]
        );
        await client.query(
          `UPDATE scheduling.shift_swap_requests
           SET status = 'accepted', responded_at = NOW()
           WHERE id = $1`,
          [requestId]
        );
      }

      await client.query('COMMIT');
      return { success: true, message: request.requires_approval ? 'Pending manager approval' : 'Swap completed' };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error accepting swap request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async approveSwap(offerId, organizationId, approverId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const offerCheck = await client.query(
        `SELECT o.*, r.requesting_employee_id
         FROM scheduling.shift_swap_offers o
         JOIN scheduling.shift_swap_requests r ON o.id = r.swap_offer_id
         WHERE o.id = $1 AND o.organization_id = $2 AND o.status = 'pending_approval'
         AND r.status = 'accepted'`,
        [offerId, organizationId]
      );

      if (offerCheck.rows.length === 0) throw new Error('Swap offer not found or not pending approval');
      const offer = offerCheck.rows[0];

      // Execute the swap
      await client.query(
        `UPDATE scheduling.shifts
         SET employee_id = $1
         WHERE id = $2`,
        [offer.requesting_employee_id, offer.shift_id]
      );

      await client.query(
        `UPDATE scheduling.shift_swap_offers
         SET status = 'completed', approved_by = $1, approved_at = NOW()
         WHERE id = $2`,
        [approverId, offerId]
      );

      await client.query('COMMIT');
      this.logger.info('Swap approved and completed', { offerId, organizationId });
      return { success: true, message: 'Swap approved and completed' };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error approving swap:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getOpenOffers(organizationId, workerId = null) {
    try {
      let query = `
        SELECT o.*, s.shift_date, s.start_time, s.end_time, r.role_name,
               e.first_name || ' ' || e.last_name as offering_worker_name
        FROM scheduling.shift_swap_offers o
        JOIN scheduling.shifts s ON o.shift_id = s.id
        JOIN scheduling.roles r ON s.role_id = r.id
        JOIN hris.employee e ON o.offering_employee_id = e.id
        WHERE o.organization_id = $1 AND o.status = 'open'
        AND (o.expires_at IS NULL OR o.expires_at > NOW())
      `;
      const params = [organizationId];

      if (workerId) {
        query += ` AND o.offering_employee_id != $2`;
        params.push(workerId);
      }

      query += ` ORDER BY s.shift_date, s.start_time`;
      const result = await pool.query(query, params);
      return { success: true, data: result.rows };
    } catch (error) {
      this.logger.error('Error fetching open offers:', error);
      throw error;
    }
  }

  async cancelOffer(offerId, organizationId, userId) {
    try {
      const result = await pool.query(
        `UPDATE scheduling.shift_swap_offers
         SET status = 'cancelled'
         WHERE id = $1 AND organization_id = $2 AND status IN ('open', 'pending_approval')
         RETURNING *`,
        [offerId, organizationId]
      );

      if (result.rows.length === 0) throw new Error('Offer not found or cannot be cancelled');
      return { success: true, data: result.rows[0] };
    } catch (error) {
      this.logger.error('Error cancelling offer:', error);
      throw error;
    }
  }
}

export default ShiftTradeService;
