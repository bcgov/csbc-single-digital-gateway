import { check } from "k6";
import exec from "k6/execution";
import http from "k6/http";

/**
 * Admin services find all services endpoint.
 */
export const adminServicesFindAllServices = () => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/services?page=1&limit=1&local=en`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesFindAllServices failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesFindAllServices returns status 200": (res) =>
      res.status === 200,
  });
};

/**
 * Admin services find one service endpoint.
 * @param {string} serviceId - Service ID in uuid.
 */
export const adminServicesFindOneService = (serviceId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/services/${serviceId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesFindOneService failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesFindOneService returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin services publish version endpoint.
 * @param {string} serviceTypeId - Service type ID in uuid.
 * @param {string} orgUnitId - Organization unit ID in uuid.
 * @param {object} body - Request body object.
 */
export const adminServicesCreateService = (
  serviceTypeId: string,
  orgUnitId: string,
  body: {
    name: string;
    description: string;
  },
) => {
  const requestBody = {
    serviceTypeId,
    orgUnitId,
    name: body.name,
    description: body.description,
  };
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/services`,
    requestBody,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesCreateService failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesCreateService returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin services find one version endpoint.
 * @param {string} serviceId - Service ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const adminServicesFindOneVersion = (
  serviceId: string,
  versionId: string,
) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/services/${serviceId}/versions/${versionId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesFindOneVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesFindOneVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin services create service endpoint.
 * @param {string} serviceId - Service ID in uuid.
 */
export const adminServicesCreateVersion = (serviceId: string) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/services/${serviceId}/versions`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesCreateVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesCreateVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin services upsert translation endpoint.
 * @param {string} serviceId - Service ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 * @param {string} locale - Translation language abbreviation.
 */
export const adminServicesUpsertTranslation = (
  serviceId: string,
  versionId: string,
  locale: string,
) => {
  const body = {
    name: "",
    description: "",
    content: "",
  };
  const response = http.put(
    `${__ENV.WEB_APP_URL}/api/admin/services/${serviceId}/versions/${versionId}/translations/${locale}`,
    body,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesUpsertTranslation failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesUpsertTranslation returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin services publish version endpoint.
 * @param serviceId - Service ID in uuid.
 * @param versionId - Version ID in uuid.
 */
export const adminServicesPublishVersion = (
  serviceId: string,
  versionId: string,
) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/services/${serviceId}/versions/${versionId}/publish`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesPublishVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesPublishVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin services archive version endpoint.
 * @param {string} serviceId - Service ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const adminServicesArchiveVersion = (
  serviceId: string,
  versionId: string,
) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/services/${serviceId}/versions/${versionId}/archive`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesArchiveVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesArchiveVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin services get contributors endpoint.
 * @param {string} serviceId - Service ID in uuid.
 */
export const adminServicesGetContributors = (serviceId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/services/${serviceId}/contributors`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesGetContributors failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesGetContributors returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin services add contributor endpoint.
 * @param {string} serviceId - Service ID in uuid.
 */
export const adminServicesAddContributor = (serviceId: string) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/services/${serviceId}/contributors`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesAddContributor failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesAddContributor returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin services delete service endpoint.
 * @param {string} serviceId - Service ID in uuid.
 */
export const adminServicesDeleteService = (serviceId: string) => {
  const response = http.del(
    `${__ENV.WEB_APP_URL}/api/admin/services/${serviceId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesDeleteService failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesDeleteService returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin services remove contributor endpoint.
 * @param {string} serviceId - Service ID in uuid.
 * @param {string} userId - User ID in uuid.
 */
export const adminServicesRemoveContributor = (
  serviceId: string,
  userId: string,
) => {
  const response = http.del(
    `${__ENV.WEB_APP_URL}/api/admin/services/${serviceId}/contributors/${userId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServicesRemoveContributor failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServicesRemoveContributor returns status 403": (res) =>
      res.status === 403,
  });
};
