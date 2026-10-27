import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class StaffServicesAPIs {
  /**
   * Staff services find all services endpoint.
   * @param {string} [workspaceId] - Workspace ID in uuid.
   */
  findAllServices = (workspaceId?: string) => {
    const url = workspaceId
      ? `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services?workspaceId=${workspaceId}`
      : `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services`;
    const response = http.get(url);
    if (response.error) {
      exec.test.abort(`staffServicesFindAllServices failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesFindAllServices returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services create service endpoint.
   * @param {object} body - Request body object.
   */
  createService = (body: {
    workspaceId: string;
    title?: string;
    data: Record<string, unknown>;
    applications?: string[];
  }) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services`,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`staffServicesCreateService failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesCreateService returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services get definition endpoint.
   */
  getDefinition = () => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/definition`);
    if (response.error) {
      exec.test.abort(`staffServicesGetDefinition failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesGetDefinition returns status 200': (res) => res.status === 200,
    });
  };

  /**
   * Staff services list forms endpoint.
   * @param {string} workspaceId - Workspace ID in uuid.
   */
  listForms = (workspaceId: string) => {
    const response = http.get(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/forms?workspaceId=${workspaceId}`,
    );
    if (response.error) {
      exec.test.abort(`staffServicesListForms failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesListForms returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services find one service endpoint.
   * @param {string} id - Service ID in uuid.
   */
  findOneService = (id: string) => {
    const response = http.get(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}`);
    if (response.error) {
      exec.test.abort(`staffServicesFindOneService failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesFindOneService returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Staff services delete service endpoint.
   * @param {string} id - Service ID in uuid.
   */
  deleteService = (id: string) => {
    const response = http.del(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}`);
    if (response.error) {
      exec.test.abort(`staffServicesDeleteService failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesDeleteService returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services archive service endpoint.
   * @param {string} id - Service ID in uuid.
   */
  archiveService = (id: string) => {
    const response = http.post(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/archive`);
    if (response.error) {
      exec.test.abort(`staffServicesArchiveService failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesArchiveService returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services reactivate service endpoint.
   * @param {string} id - Service ID in uuid.
   */
  reactivateService = (id: string) => {
    const response = http.post(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/reactivate`);
    if (response.error) {
      exec.test.abort(`staffServicesReactivateService failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesReactivateService returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services update draft version endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   * @param {object} body - Request body object.
   */
  updateDraftVersion = (
    id: string,
    versionId: string,
    body: {
      data?: Record<string, unknown>;
      title?: string;
      applications?: string[];
      applicationOrder?: string[];
    },
  ) => {
    const response = http.patch(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}`,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`staffServicesUpdateDraftVersion failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesUpdateDraftVersion returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services discard version endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   */
  discardVersion = (id: string, versionId: string) => {
    const response = http.del(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}`,
    );
    if (response.error) {
      exec.test.abort(`staffServicesDiscardVersion failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesDiscardVersion returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services publish version endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   */
  publishVersion = (id: string, versionId: string) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/publish`,
    );
    if (response.error) {
      exec.test.abort(`staffServicesPublishVersion failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesPublishVersion returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services archive version endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   */
  archiveVersion = (id: string, versionId: string) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/archive`,
    );
    if (response.error) {
      exec.test.abort(`staffServicesArchiveVersion failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesArchiveVersion returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services add version endpoint.
   * @param {string} id - Service ID in uuid.
   */
  addVersion = (id: string) => {
    const response = http.post(`${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions`);
    if (response.error) {
      exec.test.abort(`staffServicesAddVersion failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesAddVersion returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services list references endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   */
  listReferences = (id: string, versionId: string) => {
    const response = http.get(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/references`,
    );
    if (response.error) {
      exec.test.abort(`staffServicesListReferences failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesListReferences returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services add reference endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   * @param {object} body - Request body object.
   */
  addReference = (
    id: string,
    versionId: string,
    body: {
      targetVersionId: string;
      relation: 'form' | 'external' | string;
      label?: string;
    },
  ) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/references`,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`staffServicesAddReference failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesAddReference returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services remove reference endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   * @param {string} referenceId - Reference ID in uuid.
   */
  removeReference = (id: string, versionId: string, referenceId: string) => {
    const response = http.del(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/references/${referenceId}`,
    );
    if (response.error) {
      exec.test.abort(`staffServicesRemoveReference failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesRemoveReference returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services archive reference endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   * @param {string} referenceId - Reference ID in uuid.
   */
  archiveReference = (id: string, versionId: string, referenceId: string) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/references/${referenceId}/archive`,
    );
    if (response.error) {
      exec.test.abort(`staffServicesArchiveReference failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesArchiveReference returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services create referenced form endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   * @param {object} body - Request body object.
   */
  createReferencedForm = (
    id: string,
    versionId: string,
    body: {
      typeId: string;
      title: string;
      label?: string;
      definition: Record<string, unknown>;
    },
  ) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/forms`,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`staffServicesCreateReferencedForm failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesCreateReferencedForm returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services create external application endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   * @param {object} body - Request body object.
   */
  createExternalApplication = (
    id: string,
    versionId: string,
    body: {
      label: string;
      url: string;
    },
  ) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/external-applications`,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`staffServicesCreateExternalApplication failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesCreateExternalApplication returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services update external application endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   * @param {string} referenceId - Reference ID in uuid.
   * @param {object} body - Request body object.
   */
  updateExternalApplication = (
    id: string,
    versionId: string,
    referenceId: string,
    body: {
      label?: string;
      url?: string;
    },
  ) => {
    const response = http.patch(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/external-applications/${referenceId}`,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`staffServicesUpdateExternalApplication failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesUpdateExternalApplication returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services list agreements endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   */
  listAgreements = (id: string, versionId: string) => {
    const response = http.get(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/agreements`,
    );
    if (response.error) {
      exec.test.abort(`staffServicesListAgreements failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesListAgreements returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services attach agreement endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   * @param {object} body - Request body object.
   */
  attachAgreement = (
    id: string,
    versionId: string,
    body: {
      agreementDocumentId: string;
    },
  ) => {
    const response = http.post(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/agreements`,
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (response.error) {
      exec.test.abort(`staffServicesAttachAgreement failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesAttachAgreement returns status 403': (res) => res.status === 403,
    });
  };

  /**
   * Staff services detach agreement endpoint.
   * @param {string} id - Service ID in uuid.
   * @param {string} versionId - Version ID in uuid.
   * @param {string} referenceId - Reference ID in uuid.
   */
  detachAgreement = (id: string, versionId: string, referenceId: string) => {
    const response = http.del(
      `${__ENV.K6_PLATFORM_DEV_URL}/api/v1/services/${id}/versions/${versionId}/agreements/${referenceId}`,
    );
    if (response.error) {
      exec.test.abort(`staffServicesDetachAgreement failed to load: ${response.error}`);
    }
    check(response, {
      'staffServicesDetachAgreement returns status 403': (res) => res.status === 403,
    });
  };
}
