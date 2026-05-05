import { check } from "k6";
import exec from "k6/execution";
import http from "k6/http";

/**
 * Client me applications list for user endpoint.
 */
export const clientMeApplicationsListForUser = () => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/me/applications?page=1&limit=1`,
  );
  if (response.error) {
    exec.test.abort(
      `clientMeApplicationsListForUser failed to load: ${response.error}`,
    );
  }
  check(response, {
    "clientMeApplicationsListForUser returns status 404": (res) =>
      res.status === 404,
  });
};

/**
 * Client me applications get one application endpoint.
 * @param {string} applicationId - Application ID in uuid.
 */
export const clientMeApplicationsGetOneApplication = (
  applicationId: string,
) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/me/applications/${applicationId}`,
  );
  if (response.error) {
    exec.test.abort(
      `clientMeApplicationsGetOneApplication failed to load: ${response.error}`,
    );
  }
  check(response, {
    "clientMeApplicationsGetOneApplication returns status 404": (res) =>
      res.status === 404,
  });
};

/**
 * Client me applications get actions endpoint.
 * @param {string} applicationId - Application ID in uuid.
 */
export const clientMeApplicationsGetActions = (applicationId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/me/applications/${applicationId}/applications/actions`,
  );
  if (response.error) {
    exec.test.abort(
      `clientMeApplicationsGetActions failed to load: ${response.error}`,
    );
  }
  check(response, {
    "clientMeApplicationsGetActions returns status 404": (res) =>
      res.status === 404,
  });
};

/**
 * Client me applications get messages endpoint.
 * @param {string} applicationId - Application ID in uuid.
 */
export const clientMeApplicationsGetMessages = (applicationId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/me/applications/${applicationId}/messages`,
  );
  if (response.error) {
    exec.test.abort(
      `clientMeApplicationsGetMessages failed to load: ${response.error}`,
    );
  }
  check(response, {
    "clientMeApplicationsGetMessages returns status 404": (res) =>
      res.status === 404,
  });
};
