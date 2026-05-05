import { check } from "k6";
import exec from "k6/execution";
import http from "k6/http";

// consent-documents-admin-v1.controller

/**
 * Admin consent document types find all types endpoint.
 */
export const adminConsentDocumentTypessFindAllTypes = () => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/consent/document-types?page=1&limit=1`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentTypessFindAllTypes failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentTypessFindAllTypes returns status 200": (res) =>
      res.status === 200,
  });
};

/**
 * Admin consent document types create type endpoint.
 */
export const adminConsentDocumentTypesCreateType = (body: {
  name: string;
  description: string;
}) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/consent/document-types`,
    body,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentTypesCreateType failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentTypesCreateType returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent document types get published types endpoint.
 * @param {string} typeId - Document ID in uuid.
 */
export const adminConsentDocumentTypesGetPublishedTypes = (typeId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/consent/document-types/${typeId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentTypesGetPublishedTypes failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentTypesGetPublishedTypes returns status 404": (res) =>
      res.status === 404,
  });
};

/**
 * Admin consent document types find one type endpoint.
 * @param {string} typeId - Document ID in uuid.
 */
export const adminConsentDocumentTypesFindOneType = (typeId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/consent/document-types/${typeId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentTypesFindOneType failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentTypesFindOneType returns status 404": (res) =>
      res.status === 404,
  });
};

/**
 * Admin consent document types delete type endpoint.
 * @param {string} typeId - Document ID in uuid.
 */
export const adminConsentDocumentTypesDeleteType = (typeId: string) => {
  const response = http.del(
    `${__ENV.WEB_APP_URL}/api/admin/consent/document-types/${typeId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentTypesDeleteType failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentTypesDeleteType returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent document types create document versions endpoint.
 * @param {string} typeId - Document ID in uuid.
 */
export const adminConsentDocumentTypesCreateVersions = (typeId: string) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/consent/document-types/${typeId}/versions`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentTypesCreateVersions failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentTypesCreateVersions returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent document types find one version endpoint.
 * @param {string} typeId - Document ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const adminConsentDocumentTypesFindOneVersion = (
  typeId: string,
  versionId: string,
) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/consent/document-types/${typeId}/versions/${versionId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentTypesFindOneVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentTypesFindOneVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent document types upsert translation endpoint.
 * @param {string} typeId - Document ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 * @param {string} locale - Translation language abbreviation.
 * @param {object} body - Request body object.
 */
export const adminConsentDocumentTypesUpsertTranslation = (
  typeId: string,
  versionId: string,
  locale: string,
  body: {
    name: string;
    description: string;
  },
) => {
  const response = http.put(
    `${__ENV.WEB_APP_URL}/api/admin/consent/document-types/${typeId}/versions/${versionId}/translations/${locale}`,
    body,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentTypesUpsertTranslation failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentTypesUpsertTranslation returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent document types publish version endpoint.
 * @param {string} typeId - Document ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const adminConsentDocumentTypesPublishVersion = (
  typeId: string,
  versionId: string,
) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/consent/document-types/${typeId}/versions/${versionId}/publish`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentTypesPublishVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentTypesPublishVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent document types archive version endpoint.
 * @param {string} typeId - Document ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const adminConsentDocumentTypesArchiveVersion = (
  typeId: string,
  versionId: string,
) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/consent/document-types/${typeId}/versions/${versionId}/archive`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentTypesArchiveVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentTypesArchiveVersion returns status 403": (res) =>
      res.status === 403,
  });
};
