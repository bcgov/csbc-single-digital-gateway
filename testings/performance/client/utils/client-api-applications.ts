import { check } from "k6";
import exec from "k6/execution";
import http from "k6/http";

/**
 * Client applications submit one endpoint.
 * @param {string} serviceId - Service ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 * @param {string} applicationId - Application ID in uuid.
 */
export const clientApplicationsSubmitApplication = (
  serviceId: string,
  versionId: string,
  applicationId: string,
) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/${serviceId}/versions/${versionId}/apply/${applicationId}?page=1&limit=1&local=en`,
  );
  if (response.error) {
    exec.test.abort(
      `clientApplicationsSubmitApplication failed to load: ${response.error}`,
    );
  }
  check(response, {
    "clientApplicationsSubmitApplication returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Client applications get one application endpoint.
 * @param {string} serviceId - Service ID in uuid.
 */
export const clientApplicationsGetApplication = (serviceId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/${serviceId}/applications?page=1&limit=1&local=en`,
  );
  if (response.error) {
    exec.test.abort(
      `clientApplicationsGetApplication failed to load: ${response.error}`,
    );
  }
  check(response, {
    "clientApplicationsGetApplication returns status 404": (res) =>
      res.status === 404,
  });
};
