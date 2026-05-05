import { check } from "k6";
import exec from "k6/execution";
import http from "k6/http";

/**
 * Utility function for BCSC/Me endpoint that checks if the endpoint
 * responds successfully and returns a 200 status code.
 */
export const bcscMeEndpoint = () => {
  const response = http.get(`${__ENV.WEB_APP_URL}/api/auth/bcsc/me`);
  if (response.error) {
    exec.test.abort(`bcscMeEndpoint failed to load: ${response.error}`);
  }
  check(response, {
    "bcscMeEndpoint returns status 200": (res) => res.status === 200,
  });
};
