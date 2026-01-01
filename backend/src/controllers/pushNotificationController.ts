/**
 * Push Notification Controller
 * HTTP handlers for push notification management
 */

import PushNotificationService from '../services/pushNotificationService.js';
import logger from '../utils/logger.js';

const pushNotificationService = new PushNotificationService();

/**
 * Get VAPID public key
 * GET /api/notifications/vapid-public-key
 */
async function getVapidPublicKey(req: any, res: any) {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();
    
    if (!publicKey) {
      return res.status(503).json({
        success: false,
        error: 'Push notifications not configured'
      });
    }

    res.json({
      success: true,
      publicKey
    });
  } catch (error: any) {
    logger.error('Error getting VAPID public key', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get VAPID public key'
    });
  }
}

/**
 * Subscribe to push notifications
 * POST /api/notifications/subscribe
 */
async function subscribe(req: any, res: any) {
  try {
    const { organizationId, userId, employeeId } = req.user;
    const { subscription, deviceInfo } = req.body;

    if (!subscription) {
      return res.status(400).json({
        success: false,
        error: 'Subscription object is required'
      });
    }

    const result = await pushNotificationService.subscribe(
      employeeId,
      subscription,
      deviceInfo,
      organizationId,
      userId
    );

    res.status(201).json({
      success: true,
      subscription: result
    });
  } catch (error: any) {
    logger.error('Error subscribing to notifications', {
      error: error.message,
      user: req.user?.userId
    });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Unsubscribe from push notifications
 * DELETE /api/notifications/subscriptions/:id
 */
async function unsubscribe(req: any, res: any) {
  try {
    const { organizationId, userId } = req.user;
    const { id } = req.params;

    await pushNotificationService.unsubscribe(id, organizationId, userId);

    res.json({
      success: true,
      message: 'Unsubscribed successfully'
    });
  } catch (error: any) {
    logger.error('Error unsubscribing', {
      error: error.message,
      subscriptionId: req.params.id
    });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get employee subscriptions
 * GET /api/notifications/subscriptions
 */
async function getSubscriptions(req: any, res: any) {
  try {
    const { organizationId, employeeId } = req.user;

    const subscriptions = await pushNotificationService.getEmployeeSubscriptions(
      employeeId,
      organizationId
    );

    res.json({
      success: true,
      subscriptions
    });
  } catch (error: any) {
    logger.error('Error getting subscriptions', {
      error: error.message,
      user: req.user?.userId
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get subscriptions'
    });
  }
}

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
async function getPreferences(req: any, res: any) {
  try {
    const { organizationId, employeeId } = req.user;

    const preferences = await pushNotificationService.getPreferences(
      employeeId,
      organizationId
    );

    res.json({
      success: true,
      preferences
    });
  } catch (error: any) {
    logger.error('Error getting preferences', {
      error: error.message,
      user: req.user?.userId
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences'
    });
  }
}

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
async function updatePreferences(req: any, res: any) {
  try {
    const { organizationId, userId, employeeId } = req.user;
    const preferences = req.body;

    const result = await pushNotificationService.updatePreferences(
      employeeId,
      preferences,
      organizationId,
      userId
    );

    res.json({
      success: true,
      preferences: result
    });
  } catch (error: any) {
    logger.error('Error updating preferences', {
      error: error.message,
      user: req.user?.userId
    });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Send test notification
 * POST /api/notifications/test
 */
async function sendTestNotification(req: any, res: any) {
  try {
    const { organizationId, employeeId } = req.user;

    const result = await pushNotificationService.sendNotification(
      employeeId,
      {
        type: 'hr_announcement',
        title: 'Test Notification',
        body: 'This is a test notification from RecruitIQ',
        icon: '/logo192.png',
        clickUrl: '/employee'
      },
      organizationId
    );

    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    logger.error('Error sending test notification', {
      error: error.message,
      user: req.user?.userId
    });
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
}

export default {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  getSubscriptions,
  getPreferences,
  updatePreferences,
  sendTestNotification
};
