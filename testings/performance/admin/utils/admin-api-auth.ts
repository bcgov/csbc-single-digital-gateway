import { check } from "k6";
import exec from "k6/execution";
import http from "k6/http";

/**
 * Admin auth IDIR me endpoint.
 */
export const adminAuthIdirMe = () => {
  const response = http.get(`${__ENV.WEB_APP_URL}/api/auth/idir/me`);
  if (response.error) {
    exec.test.abort(`IDIR/Me endpoint failed to load: ${response.error}`);
  }
  check(response, {
    "IDIR/Me endpoint returns status 200": (res) => res.status === 200,
  });
};
