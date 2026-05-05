import { check } from "k6";
import exec from "k6/execution";
import http from "k6/http";

/**
 * Client services find all services endpoint.
 */
export const clientServicesFindAllServices = () => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/v1/services?page=1&limit=1&local=en`,
  );
  if (response.error) {
    exec.test.abort(
      `clientServicesFindAllServices failed to load: ${response.error}`,
    );
  }
  check(response, {
    "clientServicesFindAllServices returns status 200": (res) =>
      res.status === 200,
  });
};

/**
 * Client services find one service endpoint.
 * @param {string} serviceId - Service ID in uuid.
 */
export const clientServicesFindOneService = (serviceId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/v1/services/${serviceId}`,
  );
  if (response.error) {
    exec.test.abort(
      `clientServicesFindOneService failed to load: ${response.error}`,
    );
  }
  check(response, {
    "clientServicesFindOneService returns status 404": (res) =>
      res.status === 404,
  });
};

/**
 * Client services find one version endpoint.
 * @param {string} serviceId - Service ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const clientServicesFindOneVersion = (
  serviceId: string,
  versionId: string,
) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/v1/services/${serviceId}/versions/${versionId}?local=en`,
  );
  if (response.error) {
    exec.test.abort(
      `clientServicesFindOneVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "clientServicesFindOneVersion returns status 404": (res) =>
      res.status === 404,
  });
};

/**
 * Client services get application process endpoint.
 * @param {string} serviceId - Service ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 * @param {string} applicationId - Application ID in uuid.
 */
export const clientServicesGetApplicationProcess = (
  serviceId: string,
  versionId: string,
  applicationId: string,
) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/v1/services/${serviceId}/versions/${versionId}/application-process?applicationId=${applicationId}&local=en`,
  );
  if (response.error) {
    exec.test.abort(
      `clientServicesGetApplicationProcess failed to load: ${response.error}`,
    );
  }
  check(response, {
    "clientServicesGetApplicationProcess returns status 404": (res) =>
      res.status === 404,
  });
};
