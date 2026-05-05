import { check } from "k6";
import exec from "k6/execution";
import http from "k6/http";

/**
 * Admin service types find all types endpoint.
 */
export const adminServiceTypesFindAllTypes = () => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/service-types?page=1&limit=1`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServiceTypesFindAllTypes failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServiceTypesFindAllTypes returns status 200": (res) =>
      res.status === 200,
  });
};

/**
 * Admin service types create type endpoint.
 * @param {object} body - Request body object.
 */
export const adminServiceTypesCreateType = (body: {
  name: string;
  description: string;
}) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/service-types?page=1&limit=1`,
    body,
  );
  if (response.error) {
    exec.test.abort(
      `adminServiceTypesCreateType failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServiceTypesCreateType returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin service types find all published endpoint.
 */
export const adminServiceTypesFindAllPublished = () => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/service-types/published?page=1&limit=1`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServiceTypesFindAllPublished failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServiceTypesFindAllPublished returns status 200": (res) =>
      res.status === 200,
  });
};

/**
 * Admin service types find one type endpoint.
 * @param {string} typeId - Type ID in uuid.
 */
export const adminServiceTypesFindOneType = (typeId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/service-types/${typeId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServiceTypesFindOneType failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServiceTypesFindOneType returns status 404": (res) =>
      res.status === 404,
  });
};

/**
 * Admin service types delete one type endpoint.
 * @param {string} typeId - Type ID in uuid.
 */
export const adminServiceTypesDeleteOneType = (typeId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/service-types/${typeId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServiceTypesDeleteOneType failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServiceTypesDeleteOneType returns status 404": (res) =>
      res.status === 404,
  });
};

/**
 * Admin service types upsert translation endpoint.
 * @param {string} typeId - Type ID in uuid.
 * @param {string} locale - Translation language abbreviation.
 * @param {object} body - Request body object.
 */
export const adminServiceTypesUpsertTranslation = (
  typeId: string,
  locale: string,
  body: {
    name: string;
    description: string;
  },
) => {
  const response = http.put(
    `${__ENV.WEB_APP_URL}/api/admin/service-types/${typeId}/versions/translations/${locale}`,
    body,
  );
  if (response.error) {
    exec.test.abort(
      `adminServiceTypesUpsertTranslation failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServiceTypesUpsertTranslation returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin service types get version endpoint.
 * @param {string} typeId - Type ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const adminServiceTypesGetVersion = (
  typeId: string,
  versionId: string,
) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/service-types/${typeId}/versions/${versionId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServiceTypesGetVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServiceTypesGetVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin service types create version endpoint.
 * @param {string} typeId - Type ID in uuid.
 */
export const adminServiceTypesCreateVersion = (typeId: string) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/service-types/${typeId}/versions`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServiceTypesCreateVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServiceTypesCreateVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin service types publish version endpoint.
 * @param {string} typeId - Type ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const adminServiceTypesPublishVersion = (
  typeId: string,
  versionId: string,
) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/service-types/${typeId}/versions/${versionId}/publish`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServiceTypesPublishVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServiceTypesPublishVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin service types archive version endpoint.
 * @param {string} typeId - Type ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const adminServiceTypesArchiveVersion = (
  typeId: string,
  versionId: string,
) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/service-types/${typeId}/versions/${versionId}/archive`,
  );
  if (response.error) {
    exec.test.abort(
      `adminServiceTypesArchiveVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminServiceTypesArchiveVersion returns status 403": (res) =>
      res.status === 403,
  });
};
