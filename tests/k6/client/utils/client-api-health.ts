import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export default class ClientHealthAPIs {
  /**
   * Utility function for client health live endpoint that checks if the endpoint
   * responds successfully and returns a 200 status code.
   */
  liveEndpoint = () => {
    const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/health/live`);
    if (response.error) {
      exec.test.abort(`clientHealthLiveEndpoint failed to load: ${response.error}`);
    }
    check(response, {
      'clientHealthLiveEndpoint returns status 200': (res) => res.status === 200,
    });
  };

  /**
   * Utility function for client health ready endpoint that checks if the endpoint
   * responds successfully and returns a 200 status code.
   */
  readyEndpoint = () => {
    const response = http.get(`${__ENV.K6_CLIENT_DEV_URL}/api/health/ready`);
    if (response.error) {
      exec.test.abort(`clientHealthReadyEndpoint failed to load: ${response.error}`);
    }
    check(response, {
      'clientHealthReadyEndpoint returns status 200': (res) => res.status === 200,
    });
  };
}
