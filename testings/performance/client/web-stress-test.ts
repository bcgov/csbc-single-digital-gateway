import clientWebTest from "./tests/client-web-test.ts";

export const options = {
  scenarios: {
    web_stress_test: {
      executor: "ramping-vus",
      options: {
        browser: { type: "chromium" },
      },
      stages: [
        {
          duration: "20s",
          target: 30,
        },
        {
          duration: "30s",
          target: 30,
        },
        {
          duration: "20s",
          target: 0,
        },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests should be below 2000ms
    http_req_failed: ["rate<0.01"], // Less than 1% of requests should fail
    browser_http_req_duration: ["p(95)<7000"], // 95% of requests should be below 7000ms
    browser_http_req_failed: ["rate<0.05"], // Less than 5% of requests should fail
  },
};

/**
 * This is the main entry point for the client web stress tests. The purpose of these stress
 * tests is to simulate high-load scenarios and measure the performance of the application
 * under stress.
 */
export default async function clientWebStressTest() {
  const testHomePage = false;
  const testAppPage = false;

  clientWebTest(testHomePage, testAppPage);
}
