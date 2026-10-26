import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class ClientAuthAPIs {
  /**
   * Utility function for client auth login endpoint that checks if the endpoint
   * responds successfully and returns a 200 status code.
   */
  loginEndpoint = () => {
    const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/auth/login`);
    if (response.error) {
      exec.test.abort(`clientAuthLoginEndpoint failed to load: ${response.error}`);
    }
    check(response, {
      'clientAuthLoginEndpoint returns status 200': (res) => res.status === 200,
    });
  };

  /**
   * Utility function for BCSC/Me endpoint that checks if the endpoint
   * responds successfully and returns a 200 status code.
   */
  meEndpoint = () => {
    const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/auth/me`);
    if (response.error) {
      exec.test.abort(`clientAuthMeEndpoint failed to load: ${response.error}`);
    }
    check(response, {
      'clientAuthMeEndpoint returns status 200': (res) => res.status === 200,
    });
  };
}
