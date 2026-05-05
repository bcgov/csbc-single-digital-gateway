import adminApiTest from "./tests/admin-api-test";

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
    http_req_failed: ["rate<0.95"], // Less than 95% of requests should fail
    "group_duration{group:::Admin API - Services}": ["avg < 1000"],
    "group_duration{group:::Admin API - Organization Units}": ["avg < 1000"],
    "group_duration{group:::Admin API - Service Types}": ["avg < 1000"],
    "group_duration{group:::Admin API - Consent Documents}": ["avg < 1000"],
    "group_duration{group:::Admin API - Consent Document Types}": [
      "avg < 1000",
    ],
  },
};

/**
 * This is the main entry point for the admin API stress tests. The purpose of these
 * stress tests is to simulate real-world usage scenarios and measure the performance
 * of the application under stress.
 */
export default function adminApiStressTest() {
  const testServices = false;
  const testOrgUnits = false;
  const testServiceTypes = false;
  const testConsentDocuments = false;
  const testConsentDocumentTypes = false;

  adminApiTest(
    testServices,
    testOrgUnits,
    testServiceTypes,
    testConsentDocuments,
    testConsentDocumentTypes,
  );
}
