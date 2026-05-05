import clientApiTest from "./tests/client-api-test.ts";

export const options = {
  vus: 1,
  duration: "5s",
  thresholds: {
    http_req_duration: ["p(95)<100"], // 95% of requests should be below 100ms
    http_req_failed: ["rate<0.85"], // Less than 85% of requests should fail
    "group_duration{group:::Client API - Me Applications}": ["avg < 200"],
    "group_duration{group:::Client API - Applications}": ["avg < 200"],
    "group_duration{group:::Client API - Services}": ["avg < 200"],
  },
};

/**
 * This is the main entry point for the client API smoke tests. The purpose of these
 * smoke tests is to simulate real-world usage scenarios and measure the performance
 * of the application under smoke.
 */
export default function clientApiSmokeTest() {
  const testMeApplications = true;
  const testApplications = true;
  const testServices = true;

  clientApiTest(testMeApplications, testApplications, testServices);
}
