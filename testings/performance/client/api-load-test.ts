import clientApiTest from "./tests/client-api-test.ts";

export const options = {
  stages: [
    {
      duration: "10s",
      target: 10,
    },
    {
      duration: "30s",
      target: 10,
    },
    {
      duration: "10s",
      target: 0,
    },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests should be below 500ms
    http_req_failed: ["rate<0.85"], // Less than 85% of requests should fail
    "group_duration{group:::Client API - Me Applications}": ["avg < 800"],
    "group_duration{group:::Client API - Applications}": ["avg < 800"],
    "group_duration{group:::Client API - Services}": ["avg < 800"],
  },
};

/**
 * This is the main entry point for the client API load tests. The purpose of these
 * load tests is to simulate real-world usage scenarios and measure the performance
 * of the application under load.
 */
export default function clientApiLoadTest() {
  const testMeApplications = false;
  const testApplications = false;
  const testServices = false;

  clientApiTest(testMeApplications, testApplications, testServices);
}
