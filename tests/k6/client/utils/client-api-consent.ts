import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class ClientConsentAPIs {
  /**
   * Client consent find service agreements endpoint.
   */
  findServiceAgreements = (serviceId: string) => {
    const response = http.get(
      `${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/services/${serviceId}/agreements`,
    );
    if (response.error) {
      exec.test.abort(`clientConsentFindServiceAgreements failed to load: ${response.error}`);
    }
    check(response, {
      'clientConsentFindServiceAgreements returns status 404': (res) => res.status === 404,
    });
  };

  /**
   * Client consent submit agreement consent endpoint.
   */
  submitAgreementConsent = () => {
    const response = http.post(`${__ENV.K6_CLIENT_DEV_URL}/api/v1/me/agreement-consents`);
    if (response.error) {
      exec.test.abort(`clientConsentSubmitAgreementConsent failed to load: ${response.error}`);
    }
    check(response, {
      'clientConsentSubmitAgreementConsent returns status 403': (res) => res.status === 403,
    });
  };
}
