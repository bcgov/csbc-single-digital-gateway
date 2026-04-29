import { check } from "k6";
import exec from "k6/execution";
import http from "k6/http";

/**
 * Utility function for BCSC/Me endpoint that checks if the endpoint
 * responds successfully and returns a 200 status code.
 */
export const bcscMeEndpoint = () => {
  const response = http.get(`${__ENV.WEB_URL}/api/auth/bcsc/me`);
  if (response.error) {
    exec.test.abort(`BCSC/Me endpoint failed to load: ${response.error}`);
  }
  check(response, {
    "BCSC/Me endpoint returns status 200": (res) => res.status === 200,
  });
};
