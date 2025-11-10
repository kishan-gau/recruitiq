const express = require('express');
const router = express.Router();

const vpsProvisionController = require('../controllers/vpsProvisionController');
const vpsApproverController = require('../controllers/vpsApproverController');
const vpsInventoryController = require('../controllers/vpsInventoryController');

// Middleware (to be implemented - placeholder for now)
const authenticate = (req, res, next) => {
  // TODO: Implement JWT authentication
  // For now, add mock user data for development
  req.user = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    organizationId: 'test-org-id',
  };
  next();
};

const requireApprover = async (req, res, next) => {
  // TODO: Implement approver check
  // For now, pass through
  next();
};

// =============================================================================
// VPS Provision Request Routes
// =============================================================================

// Create new provision request
router.post('/vps-provision/requests', authenticate, vpsProvisionController.createRequest);

// List requests
router.get('/vps-provision/requests', authenticate, vpsProvisionController.listRequests);

// Get pending requests (for approvers)
router.get('/vps-provision/requests/pending', authenticate, requireApprover, vpsProvisionController.getPendingRequests);

// Get request statistics
router.get('/vps-provision/statistics', authenticate, requireApprover, vpsProvisionController.getStatistics);

// Get specific request
router.get('/vps-provision/requests/:id', authenticate, vpsProvisionController.getRequest);

// Approve request
router.post('/vps-provision/requests/:id/approve', authenticate, requireApprover, vpsProvisionController.approveRequest);

// Reject request
router.post('/vps-provision/requests/:id/reject', authenticate, requireApprover, vpsProvisionController.rejectRequest);

// Cancel request
router.post('/vps-provision/requests/:id/cancel', authenticate, vpsProvisionController.cancelRequest);

// Add comment to request
router.post('/vps-provision/requests/:id/comments', authenticate, vpsProvisionController.addComment);

// =============================================================================
// VPS Approver Routes
// =============================================================================

// List approvers
router.get('/vps-provision/approvers', authenticate, requireApprover, vpsApproverController.listApprovers);

// Create approver (admin only)
router.post('/vps-provision/approvers', authenticate, requireApprover, vpsApproverController.createApprover);

// Check if user can approve a specific request
router.post('/vps-provision/approvers/check-approval', authenticate, vpsApproverController.checkApproval);

// Get approver details
router.get('/vps-provision/approvers/:id', authenticate, requireApprover, vpsApproverController.getApprover);

// Update approver (admin only)
router.patch('/vps-provision/approvers/:id', authenticate, requireApprover, vpsApproverController.updateApprover);

// Delete approver (admin only)
router.delete('/vps-provision/approvers/:id', authenticate, requireApprover, vpsApproverController.deleteApprover);

// Deactivate approver
router.post('/vps-provision/approvers/:id/deactivate', authenticate, requireApprover, vpsApproverController.deactivateApprover);

// Activate approver
router.post('/vps-provision/approvers/:id/activate', authenticate, requireApprover, vpsApproverController.activateApprover);

// =============================================================================
// VPS Inventory Routes
// =============================================================================

// List inventory
router.get('/vps-inventory', authenticate, vpsInventoryController.listInventory);

// Get active VPS summary
router.get('/vps-inventory/summary', authenticate, vpsInventoryController.getSummary);

// Get inventory statistics
router.get('/vps-inventory/statistics', authenticate, vpsInventoryController.getStatistics);

// Get VPS by customer
router.get('/vps-inventory/customer/:customerId', authenticate, vpsInventoryController.getByCustomer);

// Sync all VPS from TransIP
router.post('/vps-inventory/sync-all', authenticate, requireApprover, vpsInventoryController.syncAll);

// Get VPS details
router.get('/vps-inventory/:vpsName', authenticate, vpsInventoryController.getVps);

// Sync specific VPS from TransIP
router.post('/vps-inventory/:vpsName/sync', authenticate, vpsInventoryController.syncVps);

// Remove VPS from inventory (soft delete)
router.delete('/vps-inventory/:vpsName', authenticate, requireApprover, vpsInventoryController.deleteVps);

module.exports = router;
