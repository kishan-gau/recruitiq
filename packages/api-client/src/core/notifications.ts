import { APIClient } from './client';
import type { ApiResponse } from '@recruitiq/types';

/**
 * Push Notification Subscription
 */
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Device Information
 */
export interface DeviceInfo {
  deviceType: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
}

/**
 * Notification Subscription Record
 */
export interface NotificationSubscription {
  id: string;
  organizationId: string;
  employeeId: string;
  endpoint: string;
  deviceType: string;
  browser: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

/**
 * Notification Preferences
 */
export interface NotificationPreferences {
  id?: string;
  employeeId: string;
  organizationId: string;
  enabled: boolean;
  scheduleReminders: boolean;
  payrollUpdates: boolean;
  hrAnnouncements: boolean;
  actionRequired: boolean;
  shiftTrades: boolean;
  timeOffUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

/**
 * Test Notification Request
 */
export interface TestNotificationRequest {
  title?: string;
  body?: string;
}

/**
 * Notifications API Client
 * Handles push notification subscription and preferences
 * 
 * ARCHITECTURE: Core API (not product-specific)
 * Base path: /api/notifications (not /api/products/*)
 */
export class NotificationsAPI {
  private readonly basePath = 'notifications';

  constructor(private client: APIClient) {}

  /**
   * Get VAPID public key for push subscriptions
   */
  async getVapidPublicKey() {
    return this.client.get<ApiResponse<{ publicKey: string }>>(
      `${this.basePath}/vapid-public-key`
    );
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(subscription: PushSubscription, deviceInfo: DeviceInfo) {
    return this.client.post<ApiResponse<NotificationSubscription>>(
      `${this.basePath}/subscribe`,
      { subscription, deviceInfo }
    );
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(subscriptionId: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/subscriptions/${subscriptionId}`
    );
  }

  /**
   * Get all subscriptions for authenticated employee
   */
  async getSubscriptions() {
    return this.client.get<ApiResponse<NotificationSubscription[]>>(
      `${this.basePath}/subscriptions`
    );
  }

  /**
   * Get notification preferences for authenticated employee
   */
  async getPreferences() {
    return this.client.get<ApiResponse<NotificationPreferences>>(
      `${this.basePath}/preferences`
    );
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>) {
    return this.client.put<ApiResponse<NotificationPreferences>>(
      `${this.basePath}/preferences`,
      preferences
    );
  }

  /**
   * Send test notification
   */
  async sendTestNotification(data?: TestNotificationRequest) {
    return this.client.post<ApiResponse<{ message: string; sentCount: number }>>(
      `${this.basePath}/test`,
      data || {}
    );
  }
}
