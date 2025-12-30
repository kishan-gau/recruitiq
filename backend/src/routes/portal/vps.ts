import express from 'express';
import vpsService from '../../services/transip/VPSService.ts';
import { authenticate, requireRole } from '../../middleware/auth.ts';

const router = express.Router();

// All routes require admin role
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * Get test mode status
 */
router.get('/test-mode', async (req, res, next) => {
  try {
    const status = vpsService.getTestModeStatus();
    
    res.json({
      success: true,
      testMode: status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * List all VPS instances
 */
router.get('/', async (req, res, next) => {
  try {
    const vpsList = await vpsService.listVPS();
    
    res.json({
      success: true,
      vpsList,
      testMode: vpsService.getTestModeStatus().enabled
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get VPS details
 */
router.get('/:vpsName', async (req, res, next) => {
  try {
    const vps = await vpsService.getVPSStatus(req.params.vpsName);
    
    res.json({
      success: true,
      vps
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new VPS
 */
router.post('/', async (req, res, next) => {
  try {
    const { organizationId, slug, tier } = req.body;
    
    const vps = await vpsService.createVPS(organizationId, slug, tier);
    
    res.status(201).json({
      success: true,
      vps,
      message: vps.testMode 
        ? 'VPS created in TEST MODE - no real resources created'
        : 'VPS created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * VPS operations
 */
router.post('/:vpsName/start', async (req, res, next) => {
  try {
    await vpsService.startVPS(req.params.vpsName);
    
    res.json({
      success: true,
      message: 'VPS start command sent'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:vpsName/stop', async (req, res, next) => {
  try {
    await vpsService.stopVPS(req.params.vpsName);
    
    res.json({
      success: true,
      message: 'VPS stop command sent'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:vpsName/reboot', async (req, res, next) => {
  try {
    await vpsService.rebootVPS(req.params.vpsName);
    
    res.json({
      success: true,
      message: 'VPS reboot command sent'
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:vpsName', async (req, res, next) => {
  try {
    await vpsService.deleteVPS(req.params.vpsName);
    
    res.json({
      success: true,
      message: 'VPS deletion scheduled'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Snapshot management
 */
router.get('/:vpsName/snapshots', async (req, res, next) => {
  try {
    const snapshots = await vpsService.listSnapshots(req.params.vpsName);
    
    res.json({
      success: true,
      snapshots
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:vpsName/snapshots', async (req, res, next) => {
  try {
    const { description } = req.body;
    const snapshot = await vpsService.createSnapshot(req.params.vpsName, description);
    
    res.status(201).json({
      success: true,
      snapshot,
      message: vpsService.getTestModeStatus().enabled
        ? 'Snapshot created in TEST MODE - no real snapshot created'
        : 'Snapshot created successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:vpsName/snapshots/:snapshotId', async (req, res, next) => {
  try {
    const { vpsName, snapshotId } = req.params;
    await vpsService.deleteSnapshot(vpsName, snapshotId);
    
    res.json({
      success: true,
      message: 'Snapshot deleted'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:vpsName/snapshots/:snapshotId/revert', async (req, res, next) => {
  try {
    const { vpsName, snapshotId } = req.params;
    await vpsService.revertToSnapshot(vpsName, snapshotId);
    
    res.json({
      success: true,
      message: 'Reverting to snapshot'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Firewall management
 */
router.get('/:vpsName/firewall', async (req, res, next) => {
  try {
    const firewall = await vpsService.getFirewall(req.params.vpsName);
    
    res.json({
      success: true,
      firewall
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:vpsName/firewall', async (req, res, next) => {
  try {
    const { rules } = req.body;
    await vpsService.updateFirewall(req.params.vpsName, rules);
    
    res.json({
      success: true,
      message: 'Firewall rules updated'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Usage statistics
 */
router.get('/:vpsName/usage', async (req, res, next) => {
  try {
    const usage = await vpsService.getUsageStats(req.params.vpsName);
    
    res.json({
      success: true,
      usage
    });
  } catch (error) {
    next(error);
  }
});

export default router;
