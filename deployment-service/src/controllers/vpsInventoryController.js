import { TransipVpsInventory } from '../models/index.js';
import vpsClient from '../services/transip/vpsClient.js';

/**
 * VPS Inventory Controller
 * Manages VPS inventory and operations
 */
class VpsInventoryController {
  /**
   * List VPS inventory
   * GET /api/vps-inventory
   */
  async listInventory(req, res) {
    try {
      const { status, customerId, organizationId, region, limit, offset } = req.query;

      const filters = {
        status,
        customerId,
        organizationId,
        region,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      };

      const inventory = await TransipVpsInventory.list(filters);

      res.json({
        success: true,
        count: inventory.length,
        inventory,
      });
    } catch (error) {
      console.error('[VPS Inventory] Error listing inventory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list inventory',
        message: error.message,
      });
    }
  }

  /**
   * Get active VPS summary
   * GET /api/vps-inventory/summary
   */
  async getSummary(req, res) {
    try {
      const summary = await TransipVpsInventory.getActiveSummary();

      res.json({
        success: true,
        count: summary.length,
        summary,
      });
    } catch (error) {
      console.error('[VPS Inventory] Error fetching summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch summary',
        message: error.message,
      });
    }
  }

  /**
   * Get VPS by name
   * GET /api/vps-inventory/:vpsName
   */
  async getVps(req, res) {
    try {
      const { vpsName } = req.params;

      const vps = await TransipVpsInventory.findByName(vpsName);

      if (!vps) {
        return res.status(404).json({
          success: false,
          error: 'VPS not found in inventory',
        });
      }

      res.json({
        success: true,
        vps,
      });
    } catch (error) {
      console.error('[VPS Inventory] Error fetching VPS:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch VPS',
        message: error.message,
      });
    }
  }

  /**
   * Sync VPS from TransIP API
   * POST /api/vps-inventory/:vpsName/sync
   */
  async syncVps(req, res) {
    try {
      const { vpsName } = req.params;

      // Fetch VPS details from TransIP
      const transipVps = await vpsClient.getVps(vpsName);

      // Sync to inventory
      const vps = await TransipVpsInventory.syncFromTransip(transipVps);

      res.json({
        success: true,
        message: 'VPS synced successfully',
        vps,
      });
    } catch (error) {
      console.error('[VPS Inventory] Error syncing VPS:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync VPS',
        message: error.message,
      });
    }
  }

  /**
   * Sync all VPS from TransIP
   * POST /api/vps-inventory/sync-all
   */
  async syncAll(req, res) {
    try {
      // Fetch all VPS from TransIP
      const transipVpsList = await vpsClient.listVps();

      const syncResults = [];
      for (const transipVps of transipVpsList) {
        try {
          const vps = await TransipVpsInventory.syncFromTransip(transipVps);
          syncResults.push({ success: true, vpsName: vps.vps_name });
        } catch (error) {
          syncResults.push({
            success: false,
            vpsName: transipVps.name,
            error: error.message,
          });
        }
      }

      const successCount = syncResults.filter((r) => r.success).length;

      res.json({
        success: true,
        message: `Synced ${successCount} of ${transipVpsList.length} VPS instances`,
        results: syncResults,
      });
    } catch (error) {
      console.error('[VPS Inventory] Error syncing all VPS:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync VPS inventory',
        message: error.message,
      });
    }
  }

  /**
   * Get VPS statistics
   * GET /api/vps-inventory/statistics
   */
  async getStatistics(req, res) {
    try {
      const statistics = await TransipVpsInventory.getStatistics();

      res.json({
        success: true,
        statistics,
      });
    } catch (error) {
      console.error('[VPS Inventory] Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
        message: error.message,
      });
    }
  }

  /**
   * Get VPS by customer
   * GET /api/vps-inventory/customer/:customerId
   */
  async getByCustomer(req, res) {
    try {
      const { customerId } = req.params;

      const vpsList = await TransipVpsInventory.getByCustomer(customerId);

      res.json({
        success: true,
        count: vpsList.length,
        vpsList,
      });
    } catch (error) {
      console.error('[VPS Inventory] Error fetching customer VPS:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer VPS',
        message: error.message,
      });
    }
  }

  /**
   * Soft delete VPS from inventory
   * DELETE /api/vps-inventory/:vpsName
   */
  async deleteVps(req, res) {
    try {
      const { vpsName } = req.params;

      const vps = await TransipVpsInventory.softDelete(vpsName);

      if (!vps) {
        return res.status(404).json({
          success: false,
          error: 'VPS not found',
        });
      }

      res.json({
        success: true,
        message: 'VPS removed from inventory',
        vps,
      });
    } catch (error) {
      console.error('[VPS Inventory] Error deleting VPS:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete VPS',
        message: error.message,
      });
    }
  }
}

export default new VpsInventoryController();
