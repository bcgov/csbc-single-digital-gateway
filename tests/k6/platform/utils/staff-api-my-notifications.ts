import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class StaffMyNotificationsAPIs {
  /**
   * Staff my-notifications find notifications endpoint.
   */
  findNotifications = () => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/me/notifications`);
    if (response.error) {
      exec.test.abort(`staffMyNotificationsFindNotifications failed to load: ${response.error}`);
    }
    check(response, {
      'staffMyNotificationsFindNotifications returns status 200': (res) => res.status === 200,
    });
  };

  /**
   * Staff my-notifications find notifications stream endpoint.
   */
  findNotificationsStream = () => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/me/notifications/stream`);
    if (response.error) {
      exec.test.abort(
        `staffMyNotificationsFindNotificationsStream failed to load: ${response.error}`,
      );
    }
    check(response, {
      'staffMyNotificationsFindNotificationsStream returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Staff my-notifications find notifications unread count endpoint.
   */
  findNotificationsUnreadCount = () => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/me/notifications/unread-count`);
    if (response.error) {
      exec.test.abort(
        `staffMyNotificationsFindNotificationsUnreadCount failed to load: ${response.error}`,
      );
    }
    check(response, {
      'staffMyNotificationsFindNotificationsUnreadCount returns status 200': (res) =>
        res.status === 200,
    });
  };

  /**
   * Staff my-notifications find notifications read all endpoint.
   */
  findNotificationsReadAll = () => {
    const response = http.post(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/me/notifications/read-all`);
    if (response.error) {
      exec.test.abort(
        `staffMyNotificationsFindNotificationsReadAll failed to load: ${response.error}`,
      );
    }
    check(response, {
      'staffMyNotificationsFindNotificationsReadAll returns status 403': (res) =>
        res.status === 403,
    });
  };

  /**
   * Staff my-notifications read by delivery ID endpoint.
   * @param {string} deliveryId - Delivery ID in uuid.
   */
  readByDeliveryId = (deliveryId: string) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/me/notifications/${deliveryId}/read`,
    );
    if (response.error) {
      exec.test.abort(`staffMyNotificationsReadByDeliveryId failed to load: ${response.error}`);
    }
    check(response, {
      'staffMyNotificationsReadByDeliveryId returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff my-notifications get preferences endpoint.
   */
  getPreferences = () => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/me/notification-preferences`);
    if (response.error) {
      exec.test.abort(`staffMyNotificationsGetPreferences failed to load: ${response.error}`);
    }
    check(response, {
      'staffMyNotificationsGetPreferences returns status 200': (res) => res.status === 200,
    });
  };

  /**
   * Staff my-notifications update preferences endpoint.
   * @param {object} [body] - Request body object.
   */
  updatePreferences = (body?: { email?: string; channels?: Record<string, unknown> }) => {
    const response = http.put(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/me/notification-preferences`,
      body ? JSON.stringify(body) : '{}',
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`staffMyNotificationsUpdatePreferences failed to load: ${response.error}`);
    }
    check(response, {
      'staffMyNotificationsUpdatePreferences returns status 403': (res) => res.status === 403,
    });
  };
}
