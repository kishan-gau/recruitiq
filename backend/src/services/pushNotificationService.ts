/**
 * Push Notification Service
 * Handles web push notifications for employee mobile app
 * Uses web-push library for VAPID authentication
 */

import { query } from '../../config/database.js';
import logger from '../../utils/logger.js';
import webpush from 'web-push';
import * as Joi from 'joi';

class PushNotificationService {
  private logger: typeof logger;
  private vapidPublicKey: string;
  private vapidPrivateKey: string;

  constructor() {
    this.logger = logger;
    
    // Load VAPID keys from environment
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
    
    if (this.vapidPublicKey && this.vapidPrivateKey) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@recruitiq.com',
        this.vapidPublicKey,
        this.vapidPrivateKey
      );
      this.logger.info('Web push VAPID keys configured');
    } else {
      this.logger.warn('VAPID keys not configured. Push notifications will not work.');
    }
  }

  /**
   * Get VAPID public key for client subscription
   */
  getVapidPublicKey() {
    return this.vapidPublicKey;
  }

  /**
   * Subscribe employee to push notifications
   */
  async subscribe(employeeId: string, subscription: any, deviceInfo: any, organizationId: string, userId: string) {
    try {
      // Validate subscription object
      const subscriptionSchema = Joi.object({
        endpoint: Joi.string().uri().required(),
        keys: Joi.object({
          p256dh: Joi.string().required(),
          auth: Joi.string().required()
        }).required()
      });

      const { error, value } = subscriptionSchema.validate(subscription);
      if (error) {
        throw new Error(`Invalid subscription: ${error.message}`);
      }

      // Check if subscription already exists
      const checkSql = `
        SELECT id FROM hris.push_notification_subscription
        WHERE endpoint = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;
      
      const existing = await query(checkSql, [value.endpoint, organizationId], organizationId);

      if (existing.rows.length > 0) {
        // Update existing subscription
        const updateSql = `
          UPDATE hris.push_notification_subscription
          SET 
            employee_id = $1,
            p256dh_key = $2,
            auth_key = $3,
            device_type = $4,
            browser = $5,
            user_agent = $6,
            is_active = true,
            updated_at = NOW(),
            updated_by = $7
          WHERE id = $8
            AND organization_id = $9
          RETURNING *
        `;

        const result = await query(
          updateSql,
          [
            employeeId,
            value.keys.p256dh,
            value.keys.auth,
            deviceInfo?.deviceType || null,
            deviceInfo?.browser || null,
            deviceInfo?.userAgent || null,
            userId,
            existing.rows[0].id,
            organizationId
          ],
          organizationId,
          { operation: 'UPDATE', table: 'hris.push_notification_subscription' }
        );

        return result.rows[0];
      }

      // Create new subscription
      const insertSql = `
        INSERT INTO hris.push_notification_subscription (
          organization_id,
          employee_id,
          endpoint,
          p256dh_key,
          auth_key,
          device_type,
          browser,
          user_agent,
          is_active,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
        RETURNING *
      `;

      const result = await query(
        insertSql,
        [
          organizationId,
          employeeId,
          value.endpoint,
          value.keys.p256dh,
          value.keys.auth,
          deviceInfo?.deviceType || null,
          deviceInfo?.browser || null,
          deviceInfo?.userAgent || null,
          userId
        ],
        organizationId,
        { operation: 'INSERT', table: 'hris.push_notification_subscription' }
      );

      this.logger.info('Push notification subscription created', {
        employeeId,
        organizationId,
        subscriptionId: result.rows[0].id
      });

      return result.rows[0];
    } catch (error: any) {
      this.logger.error('Error subscribing to push notifications', {
        error: error.message,
        employeeId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(subscriptionId: string, organizationId: string, userId: string) {
    try {
      const sql = `
        UPDATE hris.push_notification_subscription
        SET 
          is_active = false,
          updated_at = NOW(),
          updated_by = $1,
          deleted_at = NOW(),
          deleted_by = $1
        WHERE id = $2
          AND organization_id = $3
        RETURNING *
      `;

      const result = await query(
        sql,
        [userId, subscriptionId, organizationId],
        organizationId,
        { operation: 'UPDATE', table: 'hris.push_notification_subscription' }
      );

      return result.rows[0];
    } catch (error: any) {
      this.logger.error('Error unsubscribing from push notifications', {
        error: error.message,
        subscriptionId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Get employee subscriptions
   */
  async getEmployeeSubscriptions(employeeId: string, organizationId: string) {
    try {
      const sql = `
        SELECT * FROM hris.push_notification_subscription
        WHERE employee_id = $1
          AND organization_id = $2
          AND is_active = true
          AND deleted_at IS NULL
        ORDER BY created_at DESC
      `;

      const result = await query(sql, [employeeId, organizationId], organizationId);
      return result.rows;
    } catch (error: any) {
      this.logger.error('Error fetching employee subscriptions', {
        error: error.message,
        employeeId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Get or create notification preferences
   */
  async getPreferences(employeeId: string, organizationId: string) {
    try {
      // Try to get existing preferences
      let sql = `
        SELECT * FROM hris.push_notification_preference
        WHERE employee_id = $1
          AND organization_id = $2
      `;

      let result = await query(sql, [employeeId, organizationId], organizationId);

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Create default preferences
      sql = `
        INSERT INTO hris.push_notification_preference (
          organization_id,
          employee_id,
          schedule_reminders,
          payroll_updates,
          hr_announcements,
          action_required,
          shift_trades,
          time_off_updates,
          enabled
        ) VALUES ($1, $2, true, true, true, true, true, true, true)
        RETURNING *
      `;

      result = await query(
        sql,
        [organizationId, employeeId],
        organizationId,
        { operation: 'INSERT', table: 'hris.push_notification_preference' }
      );

      return result.rows[0];
    } catch (error: any) {
      this.logger.error('Error fetching notification preferences', {
        error: error.message,
        employeeId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(employeeId: string, preferences: any, organizationId: string, userId: string) {
    try {
      // First ensure preferences exist
      await this.getPreferences(employeeId, organizationId);

      const sql = `
        UPDATE hris.push_notification_preference
        SET 
          schedule_reminders = COALESCE($1, schedule_reminders),
          payroll_updates = COALESCE($2, payroll_updates),
          hr_announcements = COALESCE($3, hr_announcements),
          action_required = COALESCE($4, action_required),
          shift_trades = COALESCE($5, shift_trades),
          time_off_updates = COALESCE($6, time_off_updates),
          enabled = COALESCE($7, enabled),
          quiet_hours_enabled = COALESCE($8, quiet_hours_enabled),
          quiet_hours_start = COALESCE($9, quiet_hours_start),
          quiet_hours_end = COALESCE($10, quiet_hours_end),
          updated_at = NOW(),
          updated_by = $11
        WHERE employee_id = $12
          AND organization_id = $13
        RETURNING *
      `;

      const result = await query(
        sql,
        [
          preferences.schedule_reminders,
          preferences.payroll_updates,
          preferences.hr_announcements,
          preferences.action_required,
          preferences.shift_trades,
          preferences.time_off_updates,
          preferences.enabled,
          preferences.quiet_hours_enabled,
          preferences.quiet_hours_start,
          preferences.quiet_hours_end,
          userId,
          employeeId,
          organizationId
        ],
        organizationId,
        { operation: 'UPDATE', table: 'hris.push_notification_preference' }
      );

      return result.rows[0];
    } catch (error: any) {
      this.logger.error('Error updating notification preferences', {
        error: error.message,
        employeeId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Send notification to employee
   */
  async sendNotification(
    employeeId: string,
    notification: {
      type: string;
      title: string;
      body: string;
      icon?: string;
      clickUrl?: string;
      data?: any;
    },
    organizationId: string
  ) {
    try {
      // Get employee preferences
      const preferences = await this.getPreferences(employeeId, organizationId);

      if (!preferences.enabled) {
        this.logger.info('Notifications disabled for employee', { employeeId });
        return { sent: 0, failed: 0 };
      }

      // Check type-specific preference
      const typePreferenceMap: any = {
        schedule_reminder: 'schedule_reminders',
        payroll_update: 'payroll_updates',
        hr_announcement: 'hr_announcements',
        action_required: 'action_required',
        shift_trade: 'shift_trades',
        time_off_update: 'time_off_updates'
      };

      const preferenceKey = typePreferenceMap[notification.type];
      if (preferenceKey && !preferences[preferenceKey]) {
        this.logger.info('Notification type disabled for employee', {
          employeeId,
          type: notification.type
        });
        return { sent: 0, failed: 0 };
      }

      // Get active subscriptions
      const subscriptions = await this.getEmployeeSubscriptions(employeeId, organizationId);

      if (subscriptions.length === 0) {
        this.logger.info('No active subscriptions for employee', { employeeId });
        return { sent: 0, failed: 0 };
      }

      // Send to all subscriptions
      let sent = 0;
      let failed = 0;

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/logo192.png',
        badge: '/badge-72x72.png',
        tag: notification.type,
        requireInteraction: notification.type === 'action_required',
        data: {
          url: notification.clickUrl,
          ...notification.data
        }
      });

      for (const sub of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key
            }
          };

          await webpush.sendNotification(pushSubscription, payload);

          // Log successful send
          await this.logNotification(
            employeeId,
            sub.id,
            notification,
            'sent',
            null,
            organizationId
          );

          sent++;
        } catch (error: any) {
          this.logger.error('Error sending to subscription', {
            error: error.message,
            subscriptionId: sub.id
          });

          // Log failed send
          await this.logNotification(
            employeeId,
            sub.id,
            notification,
            'failed',
            error.message,
            organizationId
          );

          // If subscription is gone (410), deactivate it
          if (error.statusCode === 410) {
            await query(
              `UPDATE hris.push_notification_subscription 
               SET is_active = false, deleted_at = NOW()
               WHERE id = $1`,
              [sub.id],
              organizationId
            );
          }

          failed++;
        }
      }

      return { sent, failed };
    } catch (error: any) {
      this.logger.error('Error sending notification', {
        error: error.message,
        employeeId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Log notification send attempt
   */
  private async logNotification(
    employeeId: string,
    subscriptionId: string,
    notification: any,
    status: string,
    errorMessage: string | null,
    organizationId: string
  ) {
    try {
      const sql = `
        INSERT INTO hris.push_notification_log (
          organization_id,
          employee_id,
          subscription_id,
          notification_type,
          title,
          body,
          icon,
          click_url,
          data,
          status,
          error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      await query(
        sql,
        [
          organizationId,
          employeeId,
          subscriptionId,
          notification.type,
          notification.title,
          notification.body,
          notification.icon,
          notification.clickUrl,
          notification.data ? JSON.stringify(notification.data) : null,
          status,
          errorMessage
        ],
        organizationId,
        { operation: 'INSERT', table: 'hris.push_notification_log' }
      );
    } catch (error: any) {
      this.logger.error('Error logging notification', {
        error: error.message
      });
    }
  }
}

export default PushNotificationService;
