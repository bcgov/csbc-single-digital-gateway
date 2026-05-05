import adminApiTest from "./tests/admin-api-test.ts";

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
    http_req_failed: ["rate<0.95"], // Less than 81% of requests should fail
    "group_duration{group:::Admin API - Services}": ["avg < 500"],
    "group_duration{group:::Admin API - Organization Units}": ["avg < 500"],
    "group_duration{group:::Admin API - Service Types}": ["avg < 500"],
    "group_duration{group:::Admin API - Consent Documents}": ["avg < 500"],
    "group_duration{group:::Admin API - Consent Document Types}": ["avg < 500"],
  },
};

/**
 * This is the main entry point for the admin API load tests. The purpose of these
 * load tests is to simulate real-world usage scenarios and measure the performance
 * of the application under load.
 */
export default function adminApiLoadTest() {
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
