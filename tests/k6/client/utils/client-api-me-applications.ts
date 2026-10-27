import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class ClientMeApplicationsAPIs {
  /**
   * Client me applications list for user endpoint.
   */
  list = () => {
    const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/applications?page=1&limit=1`);
    if (response.error) {
      exec.test.abort(`clientMeApplicationsList failed to load: ${response.error}`);
    }
    check(response, {
      'clientMeApplicationsList returns status 200': (res) => res.status === 200,
    });
  };

  /**
   * Client me applications create one application endpoint.
   */
  createOneApplication = () => {
    const response = http.post(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/applications`);
    if (response.error) {
      exec.test.abort(`clientMeApplicationsCreateOneApplication failed to load: ${response.error}`);
    }
    check(response, {
      'clientMeApplicationsCreateOneApplication returns status 400': (res) => res.status === 400,
    });
  };

  /**
   * Client me applications get one application endpoint.
   * @param {string} applicationId - Application ID in uuid.
   */
  getOneApplication = (applicationId: string) => {
    const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/applications/${applicationId}`);
    if (response.error) {
      exec.test.abort(`clientMeApplicationsGetOneApplication failed to load: ${response.error}`);
    }
    check(response, {
      'clientMeApplicationsGetOneApplication returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Client me applications update one application endpoint.
   * @param {string} applicationId - Application ID in uuid.
   */
  updateOneApplication = (applicationId: string) => {
    const response = http.patch(
      `${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/applications/${applicationId}`,
    );
    if (response.error) {
      exec.test.abort(`clientMeApplicationsGetOneApplication failed to load: ${response.error}`);
    }
    check(response, {
      'clientMeApplicationsGetOneApplication returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Client me applications submit one application endpoint.
   * @param {string} applicationId - Application ID in uuid.
   */
  submitOneApplication = (applicationId: string) => {
    const response = http.patch(
      `${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/applications/${applicationId}/submit`,
    );
    if (response.error) {
      exec.test.abort(`clientMeApplicationsSubmitOneApplication failed to load: ${response.error}`);
    }
    check(response, {
      'clientMeApplicationsSubmitOneApplication returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Client me applications revise one application endpoint.
   * @param {string} applicationId - Application ID in uuid.
   */
  reviseOneApplication = (applicationId: string) => {
    const response = http.patch(
      `${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/applications/${applicationId}/revise`,
    );
    if (response.error) {
      exec.test.abort(`clientMeApplicationsReviseOneApplication failed to load: ${response.error}`);
    }
    check(response, {
      'clientMeApplicationsReviseOneApplication returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Client me applications get actions endpoint.
   * @param {string} applicationId - Application ID in uuid.
   */
  getActions = (applicationId: string) => {
    const response = http.get(
      `${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/applications/${applicationId}/applications/actions`,
    );
    if (response.error) {
      exec.test.abort(`clientMeApplicationsGetActions failed to load: ${response.error}`);
    }
    check(response, {
      'clientMeApplicationsGetActions returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Client me applications get messages endpoint.
   * @param {string} applicationId - Application ID in uuid.
   */
  getMessages = (applicationId: string) => {
    const response = http.get(
      `${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/applications/${applicationId}/messages`,
    );
    if (response.error) {
      exec.test.abort(`clientMeApplicationsGetMessages failed to load: ${response.error}`);
    }
    check(response, {
      'clientMeApplicationsGetMessages returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Client me applications get service agreements endpoint.
   */
  getServiceAgreements = () => {
    const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/service-agreements`);
    if (response.error) {
      exec.test.abort(`clientMeApplicationsGetServiceAgreements failed to load: ${response.error}`);
    }
    check(response, {
      'clientMeApplicationsGetServiceAgreements returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Client me applications get one service agreement endpoint.
   * @param {string} serviceAgreementId - Service Agreement ID in uuid.
   */
  getOneServiceAgreement = (serviceAgreementId: string) => {
    const response = http.get(
      `${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/service-agreements/${serviceAgreementId}`,
    );
    if (response.error) {
      exec.test.abort(
        `clientMeApplicationsGetOneServiceAgreement failed to load: ${response.error}`,
      );
    }
    check(response, {
      'clientMeApplicationsGetOneServiceAgreement returns status 404': (res) => res.status === 404,
    });
  };
}
