import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { AddMemberBodyRole } from './enums';

export default class StaffWorkspacesAPIs {
  /**
   * Staff workspaces find all workspaces endpoint.
   */
  findAllWorkspaces = () => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces`);
    if (response.error) {
      exec.test.abort(`staffWorkspacesFindAllWorkspaces failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesFindAllWorkspaces returns status 200': (res) => res.status === 200,
    });
  };

  /**
   * Staff workspaces create workspace endpoint.
   * @param {object} body - Request body object.
   */
  createWorkspace = (body: { name: string; description?: string }) => {
    const response = http.post(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces`, body);
    if (response.error) {
      exec.test.abort(`staffWorkspacesCreateWorkspace failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesCreateWorkspace returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff workspaces get workspace by slug endpoint.
   * @param {string} slug - Workspace slug.
   */
  getWorkspaceBySlug = (slug: string) => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/by-slug/${slug}`);
    if (response.error) {
      exec.test.abort(`staffWorkspacesGetWorkspaceBySlug failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesGetWorkspaceBySlug returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Staff workspaces find one workspace endpoint.
   * @param {string} id - Workspace ID.
   */
  findOneWorkspace = (id: string) => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${id}`);
    if (response.error) {
      exec.test.abort(`staffWorkspacesFindOneWorkspace failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesFindOneWorkspace returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Staff workspaces update workspace endpoint.
   * @param {string} id - Workspace ID.
   * @param {object} body - Request body object.
   */
  updateWorkspace = (id: string, body: { name: string }) => {
    const response = http.patch(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${id}`, body);
    if (response.error) {
      exec.test.abort(`staffWorkspacesUpdateWorkspace failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesUpdateWorkspace returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff workspaces delete workspace endpoint.
   * @param {string} id - Workspace ID.
   */
  deleteWorkspace = (id: string) => {
    const response = http.del(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${id}`);
    if (response.error) {
      exec.test.abort(`staffWorkspacesDeleteWorkspace failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesDeleteWorkspace returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff workspaces get members endpoint.
   * @param {string} id - Workspace ID.
   */
  getMembers = (id: string) => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${id}/members`);
    if (response.error) {
      exec.test.abort(`staffWorkspacesGetMembers failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesGetMembers returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff workspaces list members page endpoint.
   * @param {string} id - Workspace ID.
   */
  listMembersPage = (id: string) => {
    const response = http.get(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${id}/members/page?limit=20&offset=0`,
    );
    if (response.error) {
      exec.test.abort(`staffWorkspacesListMembersPage failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesListMembersPage returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff workspaces list addable staff endpoint.
   * @param {string} id - Workspace ID.
   */
  listAddableStaff = (id: string) => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${id}/addable-staff`);
    if (response.error) {
      exec.test.abort(`staffWorkspacesListAddableStaff failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesListAddableStaff returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff workspaces add member endpoint.
   * @param {string} id - Workspace ID.
   * @param {object} body - Request body object.
   */
  addMember = (
    id: string,
    body: {
      userId: string;
      role: AddMemberBodyRole;
    },
  ) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${id}/members`,
      body,
    );
    if (response.error) {
      exec.test.abort(`staffWorkspacesAddMember failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesAddMember returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff workspaces update member endpoint.
   * @param {string} id - Workspace ID.
   * @param {string} memberId - Member ID.
   * @param {object} body - Request body object.
   */
  updateMember = (
    id: string,
    memberId: string,
    body: {
      role?: AddMemberBodyRole;
      status?: string;
    },
  ) => {
    const response = http.patch(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${id}/members/${memberId}`,
      body,
    );
    if (response.error) {
      exec.test.abort(`staffWorkspacesUpdateMember failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesUpdateMember returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff workspaces transfer ownership endpoint.
   * @param {string} id - Workspace ID.
   * @param {object} body - Request body object.
   */
  transferOwnership = (
    id: string,
    body: {
      userId: string;
    },
  ) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/workspaces/${id}/transfer-ownership`,
      body,
    );
    if (response.error) {
      exec.test.abort(`staffWorkspacesTransferOwnership failed to load: ${response.error}`);
    }
    check(response, {
      'staffWorkspacesTransferOwnership returns status 403': (res) => res.status === 403,
    });
  };

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
