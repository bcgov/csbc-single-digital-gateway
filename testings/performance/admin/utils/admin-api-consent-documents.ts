import { check } from "k6";
import exec from "k6/execution";
import http from "k6/http";

// consent-documents-admin-v1.controller

/**
 * Admin consent documents find all documents endpoint.
 */
export const adminConsentDocumentsFindAllDocuments = () => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents?page=1&limit=1`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsFindAllDocuments failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsFindAllDocuments returns status 200": (res) =>
      res.status === 200,
  });
};

/**
 * Admin consent documents create document endpoint.
 * @param {object} body - Request body object.
 */
export const adminConsentDocumentsCreateDocument = (body: {
  name: string;
  description: string;
}) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents`,
    body,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsCreateDocument failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsCreateDocument returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent documents find one document endpoint.
 * @param {string} docId - Document ID in uuid.
 */
export const adminConsentDocumentsFindOneDocument = (docId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents/${docId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsFindOneDocument failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsFindOneDocument returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent documents create document versions endpoint.
 * @param {string} docId - Document ID in uuid.
 */
export const adminConsentDocumentsCreateVersions = (docId: string) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents/${docId}/versions`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsCreateVersions failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsCreateVersions returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent documents find one version endpoint.
 * @param {string} docId - Document ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const adminConsentDocumentsFindOneVersion = (
  docId: string,
  versionId: string,
) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents/${docId}/versions/${versionId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsFindOneVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsFindOneVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent documents upsert translation endpoint.
 * @param {string} docId - Document ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 * @param {string} locale - Translation language abbreviation.
 * @param {object} body - Request body object.
 */
export const adminConsentDocumentsUpsertTranslation = (
  docId: string,
  versionId: string,
  locale: string,
  body: {
    name: string;
    description: string;
  },
) => {
  const response = http.put(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents/${docId}/versions/${versionId}/translations/${locale}`,
    body,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsUpsertTranslation failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsUpsertTranslation returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent documents publish version endpoint.
 * @param {string} docId - Document ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const adminConsentDocumentsPublishVersion = (
  docId: string,
  versionId: string,
) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents/${docId}/versions/${versionId}/publish`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsPublishVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsPublishVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent documents archive version endpoint.
 * @param {string} docId - Document ID in uuid.
 * @param {string} versionId - Version ID in uuid.
 */
export const adminConsentDocumentsArchiveVersion = (
  docId: string,
  versionId: string,
) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents/${docId}/versions/${versionId}/archive`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsArchiveVersion failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsArchiveVersion returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent documents get contributors endpoint.
 * @param {string} docId - Document ID in uuid.
 */
export const adminConsentDocumentsGetContributors = (docId: string) => {
  const response = http.get(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents/${docId}/contributors`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsGetContributors failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsGetContributors returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent documents add contributors endpoint.
 * @param {string} docId - Document ID in uuid.
 */
export const adminConsentDocumentsAddContributors = (docId: string) => {
  const response = http.post(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents/${docId}/contributors`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsAddContributors failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsAddContributors returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent documents delete document endpoint.
 * @param {string} docId - Document ID in uuid.
 */
export const adminConsentDocumentsDeleteDocument = (docId: string) => {
  const response = http.del(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents/${docId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsDeleteDocument failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsDeleteDocument returns status 403": (res) =>
      res.status === 403,
  });
};

/**
 * Admin consent documents remove contributor endpoint.
 * @param {string} docId - Document ID in uuid.
 * @param {string} userId - User ID in uuid.
 */
export const adminConsentDocumentsRemoveContributor = (
  docId: string,
  userId: string,
) => {
  const response = http.del(
    `${__ENV.WEB_APP_URL}/api/admin/consent/documents/${docId}/contributors/${userId}`,
  );
  if (response.error) {
    exec.test.abort(
      `adminConsentDocumentsRemoveContributor failed to load: ${response.error}`,
    );
  }
  check(response, {
    "adminConsentDocumentsRemoveContributor returns status 403": (res) =>
      res.status === 403,
  });
};
