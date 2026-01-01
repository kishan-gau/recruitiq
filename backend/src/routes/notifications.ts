/**
 * Push Notification Routes
 * API routes for web push notifications
 */

import express, { Router } from 'express';
import { authenticateTenant } from '../middleware/auth.js';
import pushNotificationController from '../controllers/pushNotificationController.js';

const router: Router = express.Router();

// All notification routes require authentication
router.use(authenticateTenant);

// Get VAPID public key (no special permissions needed)
router.get('/vapid-public-key', pushNotificationController.getVapidPublicKey);

// Subscription management
router.post('/subscribe', pushNotificationController.subscribe);
router.delete('/subscriptions/:id', pushNotificationController.unsubscribe);
router.get('/subscriptions', pushNotificationController.getSubscriptions);

// Preference management
router.get('/preferences', pushNotificationController.getPreferences);
router.put('/preferences', pushNotificationController.updatePreferences);

// Test notification (for debugging)
router.post('/test', pushNotificationController.sendTestNotification);

export default router;
