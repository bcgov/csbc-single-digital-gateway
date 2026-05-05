import clientWebTest from "./tests/client-web-test.ts";

export const options = {
  scenarios: {
    web_smoke_test: {
      executor: "constant-vus",
      vus: 1,
      duration: "5s",
      options: {
        browser: { type: "chromium" },
      },
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<100"], // 95% of requests should be below 100ms
    http_req_failed: ["rate<0.01"], // Less than 1% of requests should fail
    browser_http_req_duration: ["p(95)<1000"], // 95% of requests should be below 1000ms
    browser_http_req_failed: ["rate<0.01"], // Less than 1% of requests should fail
  },
};

/**
 * This is the main entry point for the client web smoke tests. The purpose of these
 * smoke tests is to quickly verify that the most important features of the application
 * are working as expected before running more comprehensive test suites.
 */
export default async function clientWebSmokeTest() {
  const testHomePage = true;
  const testAppPage = true;

  clientWebTest(testHomePage, testAppPage);
}
