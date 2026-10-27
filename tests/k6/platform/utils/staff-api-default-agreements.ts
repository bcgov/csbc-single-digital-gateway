import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class StaffDefaultAgreementsAPIs {
  /**
   * Staff workspaces find all default agreements endpoint.
   * @param {string} workspaceId - Workspace ID.
   */
  findAllDefaultAgreements = (workspaceId: string) => {
    const response = http.get(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${workspaceId}/default-agreements`,
    );
    if (response.error) {
      exec.test.abort(`staffWorkspacesFindAllDefaultAgreements failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesFindAllDefaultAgreements returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff workspaces add default agreement endpoint.
   * @param {string} workspaceId - Workspace ID.
   * @param {object} body - Request body object.
   */
  addDefaultAgreement = (workspaceId: string, body: { agreementDocumentId: string }) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${workspaceId}/default-agreements`,
      body,
    );
    if (response.error) {
      exec.test.abort(`staffWorkspacesAddDefaultAgreement failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesAddDefaultAgreement returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff workspaces remove default agreement endpoint.
   * @param {string} workspaceId - Workspace ID.
   * @param {string} id - Default agreement ID.
   */
  removeDefaultAgreement = (workspaceId: string, id: string) => {
    const response = http.del(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${workspaceId}/default-agreements/${id}`,
    );
    if (response.error) {
      exec.test.abort(`staffWorkspacesRemoveDefaultAgreement failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesRemoveDefaultAgreement returns status 403': (res) => res.status === 403,
    });
  };
}
