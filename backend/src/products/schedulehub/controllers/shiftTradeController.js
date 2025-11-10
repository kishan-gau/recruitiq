/**
 * ScheduleHub Shift Trade Controller
 * HTTP request handlers for shift swapping and trade management
 */

import ShiftTradeService from '../services/shiftTradeService.js';
import logger from '../../../utils/logger.js';

class ShiftTradeController {
  constructor() {
    this.shiftTradeService = new ShiftTradeService();
  }

  /**
   * Create shift swap offer
   * POST /api/schedulehub/shift-swaps
   */
  createSwapOffer = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      const result = await this.shiftTradeService.createSwapOffer(
        req.body,
        organizationId,
        userId
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createSwapOffer controller:', error);
      next(error);
    }
  };

  /**
   * Request to take a swap offer
   * POST /api/schedulehub/shift-swaps/:offerId/request
   */
  requestSwap = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { offerId } = req.params;
      const { requestingWorkerId, offeredShiftId } = req.body;

      const result = await this.shiftTradeService.requestSwap(
        offerId,
        requestingWorkerId,
        organizationId,
        offeredShiftId,
        userId
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in requestSwap controller:', error);
      next(error);
    }
  };

  /**
   * Accept swap request
   * POST /api/schedulehub/shift-swap-requests/:requestId/accept
   */
  acceptSwapRequest = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { requestId } = req.params;
      const { requiresApproval } = req.body;

      const result = await this.shiftTradeService.acceptSwapRequest(
        requestId,
        organizationId,
        requiresApproval,
        userId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in acceptSwapRequest controller:', error);
      next(error);
    }
  };

  /**
   * Approve swap (manager approval)
   * POST /api/schedulehub/shift-swaps/:offerId/approve
   */
  approveSwap = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { offerId } = req.params;
      const { requestId } = req.body;

      const result = await this.shiftTradeService.approveSwap(
        offerId,
        requestId,
        organizationId,
        userId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in approveSwap controller:', error);
      next(error);
    }
  };

  /**
   * Get open swap offers (marketplace)
   * GET /api/schedulehub/shift-swaps/marketplace
   */
  getOpenOffers = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { startDate, endDate, roleId } = req.query;

      const result = await this.shiftTradeService.getOpenOffers(
        organizationId,
        startDate,
        endDate,
        roleId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in getOpenOffers controller:', error);
      next(error);
    }
  };

  /**
   * Get worker's swap offers
   * GET /api/schedulehub/workers/:workerId/swap-offers
   */
  getWorkerOffers = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { workerId } = req.params;
      const { status } = req.query;

      const result = await this.shiftTradeService.getWorkerOffers(
        workerId,
        organizationId,
        status
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in getWorkerOffers controller:', error);
      next(error);
    }
  };

  /**
   * Get swap requests for an offer
   * GET /api/schedulehub/shift-swaps/:offerId/requests
   */
  getOfferRequests = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { offerId } = req.params;

      const result = await this.shiftTradeService.getOfferRequests(
        offerId,
        organizationId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in getOfferRequests controller:', error);
      next(error);
    }
  };

  /**
   * Cancel swap offer
   * POST /api/schedulehub/shift-swaps/:offerId/cancel
   */
  cancelOffer = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { offerId } = req.params;

      const result = await this.shiftTradeService.cancelOffer(
        offerId,
        organizationId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in cancelOffer controller:', error);
      next(error);
    }
  };

  /**
   * Get swap offer by ID
   * GET /api/schedulehub/shift-swaps/:id
   */
  getOfferById = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const result = await this.shiftTradeService.getOfferById(id, organizationId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getOfferById controller:', error);
      next(error);
    }
  };
}

export default ShiftTradeController;
