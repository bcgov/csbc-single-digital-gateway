import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class StaffDocumentTypesAPIs {
  /**
   * Staff document types find all document types endpoint.
   */
  findAllTypes = () => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/document-types`);
    if (response.error) {
      exec.test.abort(`staffDocumentTypesFindAllTypes failed to load: ${response.error}`);
    }
    check(response, {
      'staffDocumentTypesFindAllTypes returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff document types find one document type endpoint.
   * @param {string} documentTypeId - Document type ID.
   */
  findOneType = (documentTypeId: string) => {
    const response = http.get(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/document-types/${documentTypeId}`,
    );
    if (response.error) {
      exec.test.abort(`staffDocumentTypesFindOneType failed to load: ${response.error}`);
    }
    check(response, {
      'staffDocumentTypesFindOneType returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff document types find one document type endpoint.
   * @param {string} documentTypeId - Document type ID.
   * @param {string} versionId - Document type version ID.
   */
  findOneTypeVersion = (documentTypeId: string, versionId: string) => {
    const response = http.get(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/document-types/${documentTypeId}/versions/${versionId}`,
    );
    if (response.error) {
      exec.test.abort(`staffDocumentTypesFindOneTypeVersion failed to load: ${response.error}`);
    }
    check(response, {
      'staffDocumentTypesFindOneTypeVersion returns status 403': (res) => res.status === 403,
    });
  };
}
