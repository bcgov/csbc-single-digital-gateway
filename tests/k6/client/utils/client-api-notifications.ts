import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

/**
 * Client notifications find notifications endpoint.
 */
export const clientNotificationsFindNotifications = () => {
  const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/notifications`);
  if (response.error) {
    exec.test.abort(`clientNotificationsFindNotifications failed to load: ${response.error}`);
  }
  check(response, {
    'clientNotificationsFindNotifications returns status 200': (res) => res.status === 200,
  });
};

/**
 * Client notifications find notifications stream endpoint.
 */
export const clientNotificationsFindNotificationsStream = () => {
  const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/notifications/stream`);
  if (response.error) {
    exec.test.abort(`clientNotificationsFindNotificationsStream failed to load: ${response.error}`);
  }
  check(response, {
    'clientNotificationsFindNotificationsStream returns status 404': (res) => res.status === 404,
  });
};

/**
 * Client notifications find notifications unread count endpoint.
 */
export const clientNotificationsFindNotificationsUnreadCount = () => {
  const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/notifications/unread-count`);
  if (response.error) {
    exec.test.abort(
      `clientNotificationsFindNotificationsUnreadCount failed to load: ${response.error}`,
    );
  }
  check(response, {
    'clientNotificationsFindNotificationsUnreadCount returns status 200': (res) =>
      res.status === 200,
  });
};

/**
 * Client notifications find notifications read all endpoint.
 */
export const clientNotificationsFindNotificationsReadAll = () => {
  const response = http.post(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/notifications/read-all`);
  if (response.error) {
    exec.test.abort(
      `clientNotificationsFindNotificationsReadAll failed to load: ${response.error}`,
    );
  }
  check(response, {
    'clientNotificationsFindNotificationsReadAll returns status 403': (res) => res.status === 403,
  });
};

/**
 * Client notifications read by delivery ID endpoint.
 * @param {string} deliveryId - Delivery ID in uuid.
 */
export const clientNotificationsReadByDeliveryId = (deliveryId: string) => {
  const response = http.post(
    `${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/notifications/${deliveryId}/read`,
  );
  if (response.error) {
    exec.test.abort(`clientNotificationsReadByDeliveryId failed to load: ${response.error}`);
  }
  check(response, {
    'clientNotificationsReadByDeliveryId returns status 403': (res) => res.status === 403,
  });
};

/**
 * Client notifications get preferences endpoint.
 */
export const clientNotificationsGetPreferences = () => {
  const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/notification-preferences`);
  if (response.error) {
    exec.test.abort(`clientNotificationsGetPreferences failed to load: ${response.error}`);
  }
  check(response, {
    'clientNotificationsGetPreferences returns status 200': (res) => res.status === 200,
  });
};

/**
 * Client notifications update preferences endpoint.
 */
export const clientNotificationsUpdatePreferences = () => {
  const response = http.put(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/notification-preferences`);
  if (response.error) {
    exec.test.abort(`clientNotificationsUpdatePreferences failed to load: ${response.error}`);
  }
  check(response, {
    'clientNotificationsUpdatePreferences returns status 403': (res) => res.status === 403,
  });
};
