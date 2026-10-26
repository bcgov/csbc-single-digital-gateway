import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class StaffServiceAgreementsAPIs {
  /**
   * Staff service agreements create agreement endpoint.
   * @param {object} body - Request body object.
   */
  createAgreement = (body: { workspaceId?: string; data: Record<string, unknown> }) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/service-agreements`,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`staffServiceAgreementsCreateAgreement failed to load: ${response.error}`);
    }
    check(response, {
      'staffServiceAgreementsCreateAgreement returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff service agreements find all agreements endpoint.
   * @param {string} [workspaceId] - Workspace ID in uuid.
   */
  findAllAgreements = (workspaceId?: string) => {
    const url = workspaceId
      ? `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/service-agreements?workspaceId=${workspaceId}`
      : `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/service-agreements`;
    const response = http.get(url);
    if (response.error) {
      exec.test.abort(`staffServiceAgreementsFindAllAgreements failed to load: ${response.error}`);
    }
    check(response, {
      'staffServiceAgreementsFindAllAgreements returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff service agreements list page endpoint.
   * @param {string} [workspaceId] - Workspace ID in uuid.
   */
  listPage = (workspaceId?: string) => {
    const url = workspaceId
      ? `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/service-agreements/page?workspaceId=${workspaceId}&limit=20&offset=0`
      : `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/service-agreements/page?limit=20&offset=0`;
    const response = http.get(url);
    if (response.error) {
      exec.test.abort(`staffServiceAgreementsListPage failed to load: ${response.error}`);
    }
    check(response, {
      'staffServiceAgreementsListPage returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff service agreements find one agreement endpoint.
   * @param {string} id - Agreement ID in uuid.
   */
  findOneAgreement = (id: string) => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/service-agreements/${id}`);
    if (response.error) {
      exec.test.abort(`staffServiceAgreementsFindOneAgreement failed to load: ${response.error}`);
    }
    check(response, {
      'staffServiceAgreementsFindOneAgreement returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Staff service agreements update draft version endpoint.
   * @param {string} id - Agreement ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   * @param {object} body - Request body object.
   */
  updateDraftVersion = (
    id: string,
    versionId: string,
    body: {
      data: Record<string, unknown>;
      title?: string;
    },
  ) => {
    const response = http.patch(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/service-agreements/${id}/versions/${versionId}`,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`staffServiceAgreementsUpdateDraftVersion failed to load: ${response.error}`);
    }
    check(response, {
      'staffServiceAgreementsUpdateDraftVersion returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff service agreements create version endpoint.
   * @param {string} id - Agreement ID in uuid.
   */
  createVersion = (id: string) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/service-agreements/${id}/versions`,
    );
    if (response.error) {
      exec.test.abort(`staffServiceAgreementsCreateVersion failed to load: ${response.error}`);
    }
    check(response, {
      'staffServiceAgreementsCreateVersion returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff service agreements publish version endpoint.
   * @param {string} id - Agreement ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   */
  publishVersion = (id: string, versionId: string) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/service-agreements/${id}/versions/${versionId}/publish`,
    );
    if (response.error) {
      exec.test.abort(`staffServiceAgreementsPublishVersion failed to load: ${response.error}`);
    }
    check(response, {
      'staffServiceAgreementsPublishVersion returns status 403': (res) => res.status === 403,
    });
  };
}
