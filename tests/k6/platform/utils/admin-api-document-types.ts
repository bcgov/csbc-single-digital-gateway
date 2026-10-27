import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class AdminDocumentTypesAPIs {
  /**
   * Admin document types find all document types endpoint.
   */
  findAllTypes() {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/admin/document-types`);
    if (response.error) {
      exec.test.abort(`adminDocumentTypesFindAllTypes failed to load: ${response.error}`);
    }
    check(response, {
      'adminDocumentTypesFindAllTypes returns status 200': (res) => res.status === 200,
    });
  }

  /**
   * Admin document types find one document type endpoint.
   * @param {string} id - Document ID in uuid.
   */
  createType = (id: string) => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/admin/document-types/${id}`);
    if (response.error) {
      exec.test.abort(`adminDocumentTypesCreateType failed to load: ${response.error}`);
    }
    check(response, {
      'adminDocumentTypesCreateType returns status 200': (res) => res.status === 200,
    });
  };

  /**
   * Admin document types create version endpoint.
   * @param {string} id - Document type ID.
   * @param {object} body - Request body object.
   */
  createVersion = (
    id: string,
    body: {
      definition: Record<string, unknown>;
    },
  ) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/admin/document-types/${id}/versions`,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`adminDocumentTypesCreateVersion failed to load: ${response.error}`);
    }
    check(response, {
      'adminDocumentTypesCreateVersion returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Admin document types update version endpoint.
   * @param {string} id - Document type ID.
   * @param {string} versionId - Document version ID in uuid.
   * @param {object} body - Request body object.
   */
  updateVersion = (
    id: string,
    versionId: string,
    body: {
      definition: Record<string, unknown>;
    },
  ) => {
    const response = http.patch(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/admin/document-types/${id}/versions/${versionId}`,
      JSON.stringify(body),
    );
    if (response.error) {
      exec.test.abort(`adminDocumentTypesUpdateVersion failed to load: ${response.error}`);
    }
    check(response, {
      'adminDocumentTypesUpdateVersion returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Admin document types delete version endpoint.
   * @param {string} id - Document type ID.
   * @param {string} versionId - Document version ID in uuid.
   */
  deleteVersion = (id: string, versionId: string) => {
    const response = http.del(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/admin/document-types/${id}/versions/${versionId}`,
    );
    if (response.error) {
      exec.test.abort(`adminDocumentTypesDeleteVersion failed to load: ${response.error}`);
    }
    check(response, {
      'adminDocumentTypesDeleteVersion returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Admin document types publish version endpoint.
   * @param {string} id - Document type ID.
   * @param {string} versionId - Document version ID in uuid.
   */
  publishVersion = (id: string, versionId: string) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/admin/document-types/${id}/versions/${versionId}/publish`,
    );
    if (response.error) {
      exec.test.abort(`adminDocumentTypesPublishVersion failed to load: ${response.error}`);
    }
    check(response, {
      'adminDocumentTypesPublishVersion returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Admin document types archive version endpoint.
   * @param {string} id - Document type ID.
   * @param {string} versionId - Document version ID in uuid.
   */
  archiveVersion = (id: string, versionId: string) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/admin/document-types/${id}/versions/${versionId}/archive`,
    );
    if (response.error) {
      exec.test.abort(`adminDocumentTypesArchiveVersion failed to load: ${response.error}`);
    }
    check(response, {
      'adminDocumentTypesArchiveVersion returns status 403': (res) => res.status === 403,
    });
  };
}
