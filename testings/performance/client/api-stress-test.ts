import clientApiTest from "./tests/client-api-test.ts";

export const options = {
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
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests should be below 1000ms
    http_req_failed: ["rate<0.85"], // Less than 85% of requests should fail
    "group_duration{group:::Client API - Me Applications}": ["avg < 2000"],
    "group_duration{group:::Client API - Applications}": ["avg < 2000"],
    "group_duration{group:::Client API - Services}": ["avg < 2000"],
  },
};

/**
 * This is the main entry point for the client API stress tests. The purpose of these
 * stress tests is to simulate real-world usage scenarios and measure the performance
 * of the application under stress.
 */
export default function clientApiStressTest() {
  const testMeApplications = false;
  const testApplications = false;
  const testServices = false;

  clientApiTest(testMeApplications, testApplications, testServices);
}
